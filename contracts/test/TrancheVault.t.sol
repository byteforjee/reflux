// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {RiskOracle} from "../src/RiskOracle.sol";
import {TrancheVault} from "../src/TrancheVault.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract TrancheVaultTest is Test {
    AssetRegistry public registry;
    RiskOracle public riskOracle;
    TrancheVault public vault;
    MockUSDC public usdc;

    address public owner = address(1);
    address public oracleSigner = address(2);
    address public admin = address(3);
    address public issuer = address(4);
    address public investor1 = address(5);
    address public investor2 = address(6);

    uint256 public assetId;

    function setUp() public {
        vm.startPrank(owner);
        registry = new AssetRegistry(owner);
        riskOracle = new RiskOracle(owner);
        usdc = new MockUSDC(owner);

        vault = new TrancheVault(
            owner,
            address(usdc),
            address(registry),
            address(riskOracle)
        );

        registry.setOracle(oracleSigner);
        registry.setAuthorizedUpdater(address(vault), true);
        riskOracle.setOracle(oracleSigner);
        vault.setAdmin(admin);
        vm.stopPrank();

        // Submit an asset
        vm.prank(issuer);
        assetId = registry.submitAsset(
            10_000 * 10**6, // $10,000 USDC
            block.timestamp + 30 days,
            "TechCorp LLC",
            "QmTest123",
            keccak256("doc")
        );

        // Mint USDC to investors and admin for testing
        usdc.mint(investor1, 100_000 * 10**6);
        usdc.mint(investor2, 100_000 * 10**6);
        usdc.mint(admin, 100_000 * 10**6);
    }

    function test_createListing_requiresScore() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(TrancheVault.NoScoreExists.selector, assetId));
        vault.createListing(assetId);
    }

    function test_createListing_approvedScore_succeeds() public {
        // Set score in RiskOracle
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");

        vm.prank(admin);
        vault.createListing(assetId);

        TrancheVault.Listing memory listing = vault.getListing(assetId);
        assertEq(listing.assetId, assetId);
        assertEq(listing.targetAmount, 10_000 * 10**6);
        assertEq(listing.raisedAmount, 0);
        assertEq(listing.aprBps, 1200);
        assertTrue(listing.fundingDeadline > block.timestamp);
        assertTrue(listing.fundingDeadline < listing.dueDateTimestamp);

        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertTrue(asset.status == AssetRegistry.AssetStatus.Listed);
    }

    function test_createListing_rejectedScore_reverts() public {
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "C", 30, 2500, "High default risk", "rejected");

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(TrancheVault.AssetNotApproved.selector, assetId));
        vault.createListing(assetId);
    }

    function test_invest_updatesPositionAndFullFundingSetsStatusFunded() public {
        // Approve & Create Listing
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        // Investor 1 invests $6,000 into escrow
        vm.startPrank(investor1);
        usdc.approve(address(vault), 6_000 * 10**6);
        vault.invest(assetId, 6_000 * 10**6);
        vm.stopPrank();

        assertEq(vault.getPosition(assetId, investor1), 6_000 * 10**6);
        assertEq(vault.getListing(assetId).raisedAmount, 6_000 * 10**6);

        // Investor 2 invests $4,000 -> completes funding
        vm.startPrank(investor2);
        usdc.approve(address(vault), 4_000 * 10**6);
        vault.invest(assetId, 4_000 * 10**6);
        vm.stopPrank();

        assertEq(vault.getPosition(assetId, investor2), 4_000 * 10**6);
        assertEq(vault.getListing(assetId).raisedAmount, 10_000 * 10**6);

        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertTrue(asset.status == AssetRegistry.AssetStatus.Funded);
    }

    function test_invest_afterFundingDeadline_reverts() public {
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        TrancheVault.Listing memory listing = vault.getListing(assetId);

        // Warp time past funding deadline
        vm.warp(listing.fundingDeadline + 1);

        vm.startPrank(investor1);
        usdc.approve(address(vault), 1_000 * 10**6);
        vm.expectRevert(abi.encodeWithSelector(TrancheVault.FundingDeadlinePassed.selector, assetId));
        vault.invest(assetId, 1_000 * 10**6);
        vm.stopPrank();
    }

    function test_checkAndExpireListing_transitionsStatus() public {
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        // Partially fund: $3,000 out of $10,000
        vm.startPrank(investor1);
        usdc.approve(address(vault), 3_000 * 10**6);
        vault.invest(assetId, 3_000 * 10**6);
        vm.stopPrank();

        TrancheVault.Listing memory listing = vault.getListing(assetId);
        vm.warp(listing.fundingDeadline + 1);

        // Auto-expire
        bool expired = vault.checkAndExpireListing(assetId);
        assertTrue(expired);

        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertTrue(asset.status == AssetRegistry.AssetStatus.ExpiredUnfunded);
        assertTrue(vault.getListing(assetId).expiredUnfunded);
    }

    function test_claimRefund_100PercentEscrow_succeeds() public {
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        // Investor 1 contributes $3,000, Investor 2 contributes $2,000 (total $5,000 / $10,000)
        vm.startPrank(investor1);
        usdc.approve(address(vault), 3_000 * 10**6);
        vault.invest(assetId, 3_000 * 10**6);
        vm.stopPrank();

        vm.startPrank(investor2);
        usdc.approve(address(vault), 2_000 * 10**6);
        vault.invest(assetId, 2_000 * 10**6);
        vm.stopPrank();

        // Warp past deadline
        TrancheVault.Listing memory listing = vault.getListing(assetId);
        vm.warp(listing.fundingDeadline + 1);

        // Investor 1 claims 100% refund
        uint256 preBal1 = usdc.balanceOf(investor1);
        vm.prank(investor1);
        vault.claimRefund(assetId);
        uint256 postBal1 = usdc.balanceOf(investor1);
        assertEq(postBal1 - preBal1, 3_000 * 10**6);
        assertEq(vault.getPosition(assetId, investor1), 0);

        // Investor 2 claims 100% refund
        uint256 preBal2 = usdc.balanceOf(investor2);
        vm.prank(investor2);
        vault.claimRefund(assetId);
        uint256 postBal2 = usdc.balanceOf(investor2);
        assertEq(postBal2 - preBal2, 2_000 * 10**6);
        assertEq(vault.getPosition(assetId, investor2), 0);
    }

    function test_claimRefund_revertsIfListingNotExpired() public {
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        vm.startPrank(investor1);
        usdc.approve(address(vault), 3_000 * 10**6);
        vault.invest(assetId, 3_000 * 10**6);

        // Still active before deadline
        vm.expectRevert(abi.encodeWithSelector(TrancheVault.ListingNotExpired.selector, assetId));
        vault.claimRefund(assetId);
        vm.stopPrank();
    }

    function test_claimRefund_revertsIfNoPosition() public {
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        TrancheVault.Listing memory listing = vault.getListing(assetId);
        vm.warp(listing.fundingDeadline + 1);

        vm.prank(investor1);
        vm.expectRevert(abi.encodeWithSelector(TrancheVault.NoPositionToRefund.selector, assetId));
        vault.claimRefund(assetId);
    }

    function test_simulateRepayment_and_claimPayout_proRata_correct() public {
        // Setup listing and full funding ($6k inv1, $4k inv2)
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        vm.startPrank(investor1);
        usdc.approve(address(vault), 6_000 * 10**6);
        vault.invest(assetId, 6_000 * 10**6);
        vm.stopPrank();

        vm.startPrank(investor2);
        usdc.approve(address(vault), 4_000 * 10**6);
        vault.invest(assetId, 4_000 * 10**6);
        vm.stopPrank();

        // Repayment simulation: principal ($10,000) + 12% yield ($1,200) = $11,200
        uint256 repaymentTotal = 11_200 * 10**6;

        vm.startPrank(admin);
        usdc.approve(address(vault), repaymentTotal);
        vault.simulateRepayment(assetId, repaymentTotal);
        vm.stopPrank();

        assertTrue(vault.getListing(assetId).repaid);
        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertTrue(asset.status == AssetRegistry.AssetStatus.Repaid);

        // Investor 1 claims payout: 60% of $11,200 = $6,720
        uint256 preBal1 = usdc.balanceOf(investor1);
        vm.prank(investor1);
        vault.claimPayout(assetId);
        uint256 postBal1 = usdc.balanceOf(investor1);
        assertEq(postBal1 - preBal1, 6_720 * 10**6);

        // Investor 2 claims payout: 40% of $11,200 = $4,480
        uint256 preBal2 = usdc.balanceOf(investor2);
        vm.prank(investor2);
        vault.claimPayout(assetId);
        uint256 postBal2 = usdc.balanceOf(investor2);
        assertEq(postBal2 - preBal2, 4_480 * 10**6);
    }

    function test_claimPayout_twice_reverts() public {
        vm.prank(oracleSigner);
        riskOracle.setScore(assetId, "A", 90, 1200, "Excellent credit", "approved");
        vm.prank(admin);
        vault.createListing(assetId);

        vm.startPrank(investor1);
        usdc.approve(address(vault), 10_000 * 10**6);
        vault.invest(assetId, 10_000 * 10**6);
        vm.stopPrank();

        vm.startPrank(admin);
        usdc.approve(address(vault), 11_000 * 10**6);
        vault.simulateRepayment(assetId, 11_000 * 10**6);
        vm.stopPrank();

        vm.startPrank(investor1);
        vault.claimPayout(assetId);

        vm.expectRevert(abi.encodeWithSelector(TrancheVault.AlreadyClaimed.selector, assetId));
        vault.claimPayout(assetId);
        vm.stopPrank();
    }
}
