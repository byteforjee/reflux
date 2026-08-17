// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AssetRegistry
 * @notice Tracks every Reflux invoice submission lifecycle onchain.
 *         This is the source of truth for invoice status — the database
 *         is a cache only (architecture.md Storage Model).
 *
 * @dev Status enum matches architecture.md invariant 4 exactly.
 *      Only the authorized oracle address can update status.
 */
contract AssetRegistry is Ownable {
    // ─── Types ────────────────────────────────────────────────────────────────

    /**
     * @notice Invoice lifecycle status — matching architecture.md invariant 4 exactly.
     */
    enum AssetStatus {
        Submitted,       // 0 — received, not yet scored
        Scoring,         // 1 — AI pipeline running
        Listed,          // 2 — approved and open for investment
        Funded,          // 3 — fully funded by investors before deadline
        Repaid,          // 4 — debtor paid; payout distributed
        Defaulted,       // 5 — past due, unpaid
        Rejected,        // 6 — AI or admin rejected
        Flagged,         // 7 — flagged for review (AI error, anomaly)
        Cancelled,       // 8 — cancelled by issuer before any funding
        ExpiredUnfunded  // 9 — funding deadline passed without 100% funding
    }

    struct Asset {
        uint256    id;
        address    submitter;
        uint256    amount;            // invoice amount in funding-token decimals (6 for USDC)
        uint256    dueDateTimestamp;  // unix timestamp of the invoice due date
        string     debtorName;
        string     ipfsCid;          // IPFS CID of the uploaded invoice document
        bytes32    documentHash;     // SHA-256 hash of the document; mirrored onchain
        AssetStatus status;
        uint256    createdAt;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    uint256 private _nextId = 1;

    /// @notice The authorized backend oracle address.
    address public oracle;

    /// @notice Authorized status updaters (oracle and TrancheVault).
    mapping(address => bool) public isAuthorizedUpdater;

    mapping(uint256 => Asset) private _assets;
    mapping(address => uint256[]) private _submitterAssets;

    // ─── Events ───────────────────────────────────────────────────────────────

    event AssetSubmitted(uint256 indexed id, address indexed submitter, uint256 amount);
    event StatusUpdated(uint256 indexed id, AssetStatus newStatus);
    event OracleUpdated(address indexed newOracle);
    event AuthorizedUpdaterSet(address indexed updater, bool authorized);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotAuthorized();
    error AssetDoesNotExist(uint256 id);
    error InvalidAmount();
    error InvalidDueDate();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAuthorized() {
        if (!isAuthorizedUpdater[msg.sender]) revert NotAuthorized();
        _;
    }

    modifier assetExists(uint256 id) {
        if (_assets[id].id == 0) revert AssetDoesNotExist(id);
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── External: submission ─────────────────────────────────────────────────

    /**
     * @notice Submit an invoice. Any wallet can submit.
     * @param amount           Invoice amount in funding-token smallest units.
     * @param dueDateTimestamp Unix timestamp of the invoice due date.
     * @param debtorName       Name of the debtor company.
     * @param ipfsCid          IPFS CID of the uploaded invoice document.
     * @param documentHash     SHA-256 hash of the document (bytes32).
     * @return id              The assigned asset ID.
     */
    function submitAsset(
        uint256 amount,
        uint256 dueDateTimestamp,
        string calldata debtorName,
        string calldata ipfsCid,
        bytes32 documentHash
    ) external returns (uint256 id) {
        if (amount == 0) revert InvalidAmount();
        if (dueDateTimestamp <= block.timestamp) revert InvalidDueDate();

        id = _nextId++;
        _assets[id] = Asset({
            id:                id,
            submitter:         msg.sender,
            amount:            amount,
            dueDateTimestamp:  dueDateTimestamp,
            debtorName:        debtorName,
            ipfsCid:           ipfsCid,
            documentHash:      documentHash,
            status:            AssetStatus.Submitted,
            createdAt:         block.timestamp
        });
        _submitterAssets[msg.sender].push(id);

        emit AssetSubmitted(id, msg.sender, amount);
    }

    // ─── External: oracle-gated ───────────────────────────────────────────────

    /**
     * @notice Update the status of an asset. Only callable by authorized updaters (oracle or TrancheVault).
     * @dev    Enforces architecture.md invariant 4 — status must be one of the 8 valid values.
     */
    function updateStatus(uint256 id, AssetStatus newStatus)
        external
        onlyAuthorized
        assetExists(id)
    {
        _assets[id].status = newStatus;
        emit StatusUpdated(id, newStatus);
    }

    // ─── External: owner-gated ────────────────────────────────────────────────

    /**
     * @notice Set the authorized oracle address and grant it updater permission. Only owner.
     */
    function setOracle(address newOracle) external onlyOwner {
        if (oracle != address(0)) {
            isAuthorizedUpdater[oracle] = false;
        }
        oracle = newOracle;
        if (newOracle != address(0)) {
            isAuthorizedUpdater[newOracle] = true;
        }
        emit OracleUpdated(newOracle);
    }

    /**
     * @notice Grant or revoke updater authorization for an address (e.g. TrancheVault). Only owner.
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        isAuthorizedUpdater[updater] = authorized;
        emit AuthorizedUpdaterSet(updater, authorized);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getAsset(uint256 id) external view assetExists(id) returns (Asset memory) {
        return _assets[id];
    }

    function getSubmitterAssets(address submitter) external view returns (uint256[] memory) {
        return _submitterAssets[submitter];
    }

    function totalAssets() external view returns (uint256) {
        return _nextId - 1;
    }
}
