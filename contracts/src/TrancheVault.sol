// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {AssetRegistry} from "./AssetRegistry.sol";
import {RiskOracle} from "./RiskOracle.sol";

/**
 * @title TrancheVault
 * @notice Manages investor funding of approved invoice listings with an All-or-Nothing
 *         funding window, escrow accounting, 100% refund guarantees, and pro-rata
 *         payout distribution upon debtor settlement.
 *
 * @dev Enforces architecture.md Invariant 10:
 *      1. Every listing has a fundingDeadline set safely before the invoice due date.
 *      2. Investor capital is held in escrow in TrancheVault.
 *      3. Funds are only finalized/released if 100% of the tranche sells before fundingDeadline.
 *      4. If fundingDeadline passes with <100% sold, the listing transitions to ExpiredUnfunded
 *         and all contributors can claim a 100% full refund from escrow via claimRefund().
 */
contract TrancheVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Types ────────────────────────────────────────────────────────────────

    struct Listing {
        uint256 assetId;
        uint256 targetAmount;    // total to raise (from AssetRegistry)
        uint256 raisedAmount;    // amount raised so far in escrow
        uint256 aprBps;          // from RiskOracle, in basis points
        uint256 listedAt;
        uint256 dueDateTimestamp;
        uint256 fundingDeadline;  // timestamp after which un-finalized listings expire
        bool    repaid;
        bool    defaulted;
        bool    expiredUnfunded;  // true if funding window expired with <100% raised
        uint256 repaymentAmount; // total deposited by admin on simulated repayment
    }

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice The stablecoin used for all funding, escrow, and payouts (MockUSDC on testnet).
    IERC20 public immutable fundingToken;

    AssetRegistry public immutable registry;
    RiskOracle    public immutable riskOracle;

    /// @notice Admin address — can create listings and trigger simulated repayment.
    address public admin;

    /// @notice assetId → listing
    mapping(uint256 => Listing) public listings;

    /// @notice assetId → investor → invested amount in escrow
    mapping(uint256 => mapping(address => uint256)) public positions;

    /// @notice assetId → investor → has claimed repayment payout
    mapping(uint256 => mapping(address => bool)) public claimed;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ListingCreated(uint256 indexed assetId, uint256 targetAmount, uint256 aprBps, uint256 fundingDeadline);
    event InvestmentMade(uint256 indexed assetId, address indexed investor, uint256 amount);
    event ListingExpiredUnfunded(uint256 indexed assetId, uint256 raisedAmount, uint256 targetAmount);
    event RefundClaimed(uint256 indexed assetId, address indexed investor, uint256 amount);
    event RepaymentReceived(uint256 indexed assetId, uint256 repaymentAmount);
    event PayoutClaimed(uint256 indexed assetId, address indexed investor, uint256 payout);
    event AdminUpdated(address indexed newAdmin);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotAdmin();
    error ListingAlreadyExists(uint256 assetId);
    error ListingDoesNotExist(uint256 assetId);
    error NoScoreExists(uint256 assetId);
    error AssetNotApproved(uint256 assetId);
    error ListingFullyFunded(uint256 assetId);
    error InvestmentExceedsTarget(uint256 assetId);
    error FundingDeadlinePassed(uint256 assetId);
    error ListingExpired(uint256 assetId);
    error ListingNotExpired(uint256 assetId);
    error NotYetRepaid(uint256 assetId);
    error AlreadyRepaid(uint256 assetId);
    error AlreadyClaimed(uint256 assetId);
    error NoPositionToClaim(uint256 assetId);
    error NoPositionToRefund(uint256 assetId);
    error InvalidFundingDeadline();
    error ZeroAmount();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier listingExists(uint256 assetId) {
        if (listings[assetId].targetAmount == 0) revert ListingDoesNotExist(assetId);
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address initialOwner,
        address _fundingToken,
        address _registry,
        address _riskOracle
    ) Ownable(initialOwner) {
        fundingToken = IERC20(_fundingToken);
        registry     = AssetRegistry(_registry);
        riskOracle   = RiskOracle(_riskOracle);
        admin        = initialOwner;
    }

    // ─── External: admin-gated ────────────────────────────────────────────────

    /**
     * @notice Create a funding listing with a custom funding deadline.
     * @param assetId          The AssetRegistry asset ID.
     * @param fundingDeadline  Unix timestamp after which funding closes if not 100% raised.
     */
    function createListingWithDeadline(uint256 assetId, uint256 fundingDeadline)
        public
        onlyAdmin
    {
        if (listings[assetId].targetAmount != 0) revert ListingAlreadyExists(assetId);
        if (!riskOracle.hasScore(assetId)) revert NoScoreExists(assetId);

        RiskOracle.RiskScore memory score = riskOracle.getScore(assetId);
        if (keccak256(bytes(score.decision)) != keccak256(bytes("approved"))) {
            revert AssetNotApproved(assetId);
        }

        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        if (fundingDeadline <= block.timestamp || fundingDeadline >= asset.dueDateTimestamp) {
            revert InvalidFundingDeadline();
        }

        listings[assetId] = Listing({
            assetId:          assetId,
            targetAmount:     asset.amount,
            raisedAmount:     0,
            aprBps:           score.apr,
            listedAt:         block.timestamp,
            dueDateTimestamp: asset.dueDateTimestamp,
            fundingDeadline:  fundingDeadline,
            repaid:           false,
            defaulted:        false,
            expiredUnfunded:  false,
            repaymentAmount:  0
        });

        registry.updateStatus(assetId, AssetRegistry.AssetStatus.Listed);
        emit ListingCreated(assetId, asset.amount, score.apr, fundingDeadline);
    }

    /**
     * @notice Create a funding listing using an automated safe runway deadline.
     *         Defaults to 14 days or halfway to invoice due date.
     * @param assetId  The AssetRegistry asset ID.
     */
    function createListing(uint256 assetId) external onlyAdmin {
        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        uint256 runway = asset.dueDateTimestamp > block.timestamp ? (asset.dueDateTimestamp - block.timestamp) : 0;
        
        // 14 days default, or 50% of available tenor if tenor is shorter than 28 days
        uint256 windowSeconds = runway >= 28 days ? 14 days : (runway / 2);
        if (windowSeconds == 0) windowSeconds = 1 days;
        uint256 deadline = block.timestamp + windowSeconds;
        if (deadline >= asset.dueDateTimestamp) {
            deadline = asset.dueDateTimestamp - 1 hours;
        }

        createListingWithDeadline(assetId, deadline);
    }

    /**
     * @notice Simulate repayment for a fully funded listing.
     *         Admin must approve `repaymentAmount` of fundingToken to this contract first.
     * @param assetId          The listing's asset ID.
     * @param repaymentAmount  Total repayment amount (principal + yield) in funding-token units.
     */
    function simulateRepayment(uint256 assetId, uint256 repaymentAmount)
        external
        onlyAdmin
        nonReentrant
        listingExists(assetId)
    {
        Listing storage listing = listings[assetId];
        if (listing.repaid) revert AlreadyRepaid(assetId);
        if (listing.expiredUnfunded) revert ListingExpired(assetId);
        if (repaymentAmount == 0) revert ZeroAmount();

        listing.repaid          = true;
        listing.repaymentAmount = repaymentAmount;

        fundingToken.safeTransferFrom(msg.sender, address(this), repaymentAmount);
        registry.updateStatus(assetId, AssetRegistry.AssetStatus.Repaid);

        emit RepaymentReceived(assetId, repaymentAmount);
    }

    /**
     * @notice Update the admin address.
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
        emit AdminUpdated(newAdmin);
    }

    // ─── External: investor & escrow ──────────────────────────────────────────

    /**
     * @notice Invest in a listed invoice. Contributed capital is held in escrow.
     *         If the investment completes 100% of target before fundingDeadline, status updates to Funded.
     * @param assetId  The listing's asset ID.
     * @param amount   Amount of fundingToken to deposit into escrow.
     */
    function invest(uint256 assetId, uint256 amount)
        external
        nonReentrant
        listingExists(assetId)
    {
        if (amount == 0) revert ZeroAmount();
        Listing storage listing = listings[assetId];

        // All-or-Nothing check: must be before funding deadline and not expired
        if (block.timestamp > listing.fundingDeadline) revert FundingDeadlinePassed(assetId);
        if (listing.expiredUnfunded) revert ListingExpired(assetId);
        if (listing.raisedAmount >= listing.targetAmount) revert ListingFullyFunded(assetId);
        if (listing.raisedAmount + amount > listing.targetAmount) {
            revert InvestmentExceedsTarget(assetId);
        }

        positions[assetId][msg.sender] += amount;
        listing.raisedAmount           += amount;

        fundingToken.safeTransferFrom(msg.sender, address(this), amount);

        // 100% Release rule: only finalize to Funded status when completely sold
        if (listing.raisedAmount == listing.targetAmount) {
            registry.updateStatus(assetId, AssetRegistry.AssetStatus.Funded);
        }

        emit InvestmentMade(assetId, msg.sender, amount);
    }

    /**
     * @notice Check and transition an expired listing to ExpiredUnfunded.
     *         Publicly callable by anyone or auto-triggered.
     * @param assetId  The listing's asset ID.
     */
    function checkAndExpireListing(uint256 assetId)
        public
        listingExists(assetId)
        returns (bool)
    {
        Listing storage listing = listings[assetId];
        if (
            block.timestamp > listing.fundingDeadline &&
            listing.raisedAmount < listing.targetAmount &&
            !listing.expiredUnfunded &&
            !listing.repaid
        ) {
            listing.expiredUnfunded = true;
            registry.updateStatus(assetId, AssetRegistry.AssetStatus.ExpiredUnfunded);
            emit ListingExpiredUnfunded(assetId, listing.raisedAmount, listing.targetAmount);
            return true;
        }
        return listing.expiredUnfunded;
    }

    /**
     * @notice Claim a 100% full refund from escrow if a listing expired without reaching 100% funding.
     * @param assetId  The listing's asset ID.
     */
    function claimRefund(uint256 assetId)
        external
        nonReentrant
        listingExists(assetId)
    {
        Listing storage listing = listings[assetId];

        // Trigger expiration flag if deadline passed
        if (!listing.expiredUnfunded) {
            if (block.timestamp > listing.fundingDeadline && listing.raisedAmount < listing.targetAmount) {
                checkAndExpireListing(assetId);
            } else {
                revert ListingNotExpired(assetId);
            }
        }

        uint256 position = positions[assetId][msg.sender];
        if (position == 0) revert NoPositionToRefund(assetId);

        // Zero position and refund exact 100% escrowed amount
        positions[assetId][msg.sender] = 0;
        fundingToken.safeTransfer(msg.sender, position);

        emit RefundClaimed(assetId, msg.sender, position);
    }

    /**
     * @notice Claim pro-rata payout after a fully funded listing has been repaid.
     *         payout = position * repaymentAmount / targetAmount
     * @param assetId  The listing's asset ID.
     */
    function claimPayout(uint256 assetId)
        external
        nonReentrant
        listingExists(assetId)
    {
        Listing storage listing = listings[assetId];
        if (!listing.repaid) revert NotYetRepaid(assetId);
        if (claimed[assetId][msg.sender]) revert AlreadyClaimed(assetId);

        uint256 position = positions[assetId][msg.sender];
        if (position == 0) revert NoPositionToClaim(assetId);

        claimed[assetId][msg.sender]    = true;
        positions[assetId][msg.sender]  = 0;

        // Pro-rata payout: position / targetAmount * repaymentAmount
        uint256 payout = (position * listing.repaymentAmount) / listing.targetAmount;

        fundingToken.safeTransfer(msg.sender, payout);
        emit PayoutClaimed(assetId, msg.sender, payout);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getListing(uint256 assetId) external view returns (Listing memory) {
        return listings[assetId];
    }

    function getPosition(uint256 assetId, address investor) external view returns (uint256) {
        return positions[assetId][investor];
    }
}
