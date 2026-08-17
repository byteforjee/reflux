// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

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
