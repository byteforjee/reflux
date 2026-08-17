// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";

contract AssetRegistryTest is Test {
    AssetRegistry public registry;
    address public owner = address(1);
    address public oracle = address(2);
    address public user = address(3);

    function setUp() public {
        registry = new AssetRegistry(owner);
        vm.prank(owner);
        registry.setOracle(oracle);
    }

    function test_submitAsset_succeeds() public {
        vm.prank(user);
        uint256 dueDate = block.timestamp + 30 days;
        bytes32 docHash = keccak256("document");

        uint256 id = registry.submitAsset(
            1000 * 10**6,
            dueDate,
            "Acme Corp",
            "Qm123...",
            docHash
        );

        assertEq(id, 1);
        assertEq(registry.totalAssets(), 1);

        AssetRegistry.Asset memory asset = registry.getAsset(id);
        assertEq(asset.id, 1);
        assertEq(asset.submitter, user);
        assertEq(asset.amount, 1000 * 10**6);
        assertEq(asset.dueDateTimestamp, dueDate);
        assertEq(asset.debtorName, "Acme Corp");
        assertEq(asset.ipfsCid, "Qm123...");
        assertEq(asset.documentHash, docHash);
        assertTrue(asset.status == AssetRegistry.AssetStatus.Submitted);
    }

    function test_submitAsset_incrementsId() public {
        uint256 dueDate = block.timestamp + 30 days;
        bytes32 docHash = keccak256("document");

        vm.prank(user);
        uint256 id1 = registry.submitAsset(500 * 10**6, dueDate, "Company A", "CID1", docHash);

        vm.prank(user);
        uint256 id2 = registry.submitAsset(750 * 10**6, dueDate, "Company B", "CID2", docHash);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.totalAssets(), 2);
    }

    function test_updateStatus_byOracle_succeeds() public {
        uint256 dueDate = block.timestamp + 30 days;
        bytes32 docHash = keccak256("document");

        vm.prank(user);
        uint256 id = registry.submitAsset(1000 * 10**6, dueDate, "Acme Corp", "Qm123...", docHash);

        vm.prank(oracle);
        registry.updateStatus(id, AssetRegistry.AssetStatus.Scoring);

        AssetRegistry.Asset memory asset = registry.getAsset(id);
        assertTrue(asset.status == AssetRegistry.AssetStatus.Scoring);
    }

    function test_updateStatus_byNonOracle_reverts() public {
        uint256 dueDate = block.timestamp + 30 days;
        bytes32 docHash = keccak256("document");

        vm.prank(user);
        uint256 id = registry.submitAsset(1000 * 10**6, dueDate, "Acme Corp", "Qm123...", docHash);

        vm.prank(user);
        vm.expectRevert(AssetRegistry.NotAuthorized.selector);
        registry.updateStatus(id, AssetRegistry.AssetStatus.Scoring);
    }

    function test_submitAsset_zeroAmount_reverts() public {
        uint256 dueDate = block.timestamp + 30 days;
        bytes32 docHash = keccak256("document");

        vm.prank(user);
        vm.expectRevert(AssetRegistry.InvalidAmount.selector);
        registry.submitAsset(0, dueDate, "Acme Corp", "Qm123...", docHash);
    }

    function test_submitAsset_pastDueDate_reverts() public {
        uint256 dueDate = block.timestamp - 1;
        bytes32 docHash = keccak256("document");

        vm.prank(user);
        vm.expectRevert(AssetRegistry.InvalidDueDate.selector);
        registry.submitAsset(1000 * 10**6, dueDate, "Acme Corp", "Qm123...", docHash);
    }
}
