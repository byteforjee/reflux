// SPDX-License-Identifier: MIT
pragma solidity =0.8.24 ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// src/AssetRegistry.sol

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
