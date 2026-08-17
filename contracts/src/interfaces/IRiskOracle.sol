// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IRiskOracle {
    struct RiskScore {
        string  tier;
        uint256 score;
        uint256 apr;
        string  rationale;
        string  decision;
        uint256 timestamp;
    }

    function setScore(
        uint256 assetId,
        string calldata tier,
        uint256 score,
        uint256 apr,
        string calldata rationale,
        string calldata decision
    ) external;

    function getScore(uint256 assetId) external view returns (RiskScore memory);

    function hasScore(uint256 assetId) external view returns (bool);
}
