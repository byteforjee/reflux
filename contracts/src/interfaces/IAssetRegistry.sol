// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IAssetRegistry {
    enum AssetStatus {
        Submitted,  // 0
        Scoring,    // 1
        Listed,     // 2
        Funded,     // 3
        Repaid,     // 4
        Defaulted,  // 5
        Rejected,   // 6
        Flagged     // 7
    }

    struct Asset {
        uint256     id;
        address     submitter;
        uint256     amount;
        uint256     dueDateTimestamp;
        string      debtorName;
        string      ipfsCid;
        bytes32     documentHash;
        AssetStatus status;
        uint256     createdAt;
    }

    function submitAsset(
        uint256 amount,
        uint256 dueDateTimestamp,
        string calldata debtorName,
        string calldata ipfsCid,
        bytes32 documentHash
    ) external returns (uint256 id);

    function updateStatus(uint256 id, AssetStatus newStatus) external;

    function getAsset(uint256 id) external view returns (Asset memory);

    function getSubmitterAssets(address submitter) external view returns (uint256[] memory);

    function totalAssets() external view returns (uint256);
}
