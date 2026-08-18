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

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

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

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}

// src/TrancheVault.sol

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
        if (msg.sender != admin && msg.sender != owner()) revert NotAdmin();
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
