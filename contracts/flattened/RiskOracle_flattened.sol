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

// src/RiskOracle.sol

/**
 * @title RiskOracle
 * @notice Stores AI scoring results onchain.
 *         Only the authorized oracle address (the backend's signing key) may write scores.
 *         Scores are immutable once set — they cannot be overwritten.
 *
 * @dev architecture.md invariant 3: AI scoring output is always structured
 *      (tier, score, apr, rationale, decision). Invariant 5: a listing never
 *      shows tokens as investable without a RiskOracle score existing first.
 */
contract RiskOracle is Ownable {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct RiskScore {
        string  tier;       // "A", "B", or "C"
        uint256 score;      // 0–100 risk score
        uint256 apr;        // annualized yield in basis points (e.g. 1200 = 12.00%)
        string  rationale;  // plain-language AI rationale stored onchain for transparency
        string  decision;   // "approved" | "rejected" | "flagged"
        uint256 timestamp;  // block.timestamp when score was recorded
    }

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Authorized backend oracle signer — only this address may call setScore.
    address public oracle;

    mapping(uint256 => RiskScore) private _scores;

    /// @notice True if a score exists for this assetId.
    mapping(uint256 => bool) public hasScore;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ScoreRecorded(uint256 indexed assetId, string tier, string decision);
    event OracleUpdated(address indexed newOracle);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOracle();
    error ScoreAlreadyExists(uint256 assetId);
    error NoScoreExists(uint256 assetId);
    error InvalidTier();
    error InvalidDecision();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── External: oracle-gated ───────────────────────────────────────────────

    /**
     * @notice Record an AI risk score for an asset. Immutable once set.
     * @param assetId  The AssetRegistry asset ID.
     * @param tier     Risk tier: "A", "B", or "C".
     * @param score    Risk score 0–100.
     * @param apr      Annualized yield in basis points (e.g. 1200 = 12.00%).
     * @param rationale Plain-language AI rationale.
     * @param decision  "approved", "rejected", or "flagged".
     */
    function setScore(
        uint256 assetId,
        string calldata tier,
        uint256 score,
        uint256 apr,
        string calldata rationale,
        string calldata decision
    ) external onlyOracle {
        if (hasScore[assetId]) revert ScoreAlreadyExists(assetId);

        // Validate tier
        bytes32 tierHash = keccak256(bytes(tier));
        if (
            tierHash != keccak256(bytes("A")) &&
            tierHash != keccak256(bytes("B")) &&
            tierHash != keccak256(bytes("C"))
        ) revert InvalidTier();

        // Validate decision
        bytes32 decisionHash = keccak256(bytes(decision));
        if (
            decisionHash != keccak256(bytes("approved")) &&
            decisionHash != keccak256(bytes("rejected")) &&
            decisionHash != keccak256(bytes("flagged"))
        ) revert InvalidDecision();

        _scores[assetId] = RiskScore({
            tier:      tier,
            score:     score,
            apr:       apr,
            rationale: rationale,
            decision:  decision,
            timestamp: block.timestamp
        });
        hasScore[assetId] = true;

        emit ScoreRecorded(assetId, tier, decision);
    }

    // ─── External: owner-gated ────────────────────────────────────────────────

    /**
     * @notice Set the authorized oracle address. Only owner.
     */
    function setOracle(address newOracle) external onlyOwner {
        oracle = newOracle;
        emit OracleUpdated(newOracle);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Get the risk score for an asset. Reverts if no score exists.
     * @dev    Check hasScore[assetId] before calling to avoid reverts.
     */
    function getScore(uint256 assetId) external view returns (RiskScore memory) {
        if (!hasScore[assetId]) revert NoScoreExists(assetId);
        return _scores[assetId];
    }
}
