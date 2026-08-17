export const riskOracleAbi = [
  {
    inputs: [{ internalType: "address", name: "initialOwner", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "assetId", type: "uint256" },
      { indexed: false, internalType: "string", name: "tier", type: "string" },
      { indexed: false, internalType: "string", name: "decision", type: "string" },
    ],
    name: "ScoreRecorded",
    type: "event",
  },
  {
    inputs: [
      { internalType: "uint256", name: "assetId", type: "uint256" },
      { internalType: "string", name: "tier", type: "string" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint256", name: "apr", type: "uint256" },
      { internalType: "string", name: "rationale", type: "string" },
      { internalType: "string", name: "decision", type: "string" },
    ],
    name: "setScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "assetId", type: "uint256" }],
    name: "getScore",
    outputs: [
      {
        components: [
          { internalType: "string", name: "tier", type: "string" },
          { internalType: "uint256", name: "score", type: "uint256" },
          { internalType: "uint256", name: "apr", type: "uint256" },
          { internalType: "string", name: "rationale", type: "string" },
          { internalType: "string", name: "decision", type: "string" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        internalType: "struct RiskOracle.RiskScore",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "assetId", type: "uint256" }],
    name: "hasScore",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
