/**
 * lib/contracts/index.ts
 *
 * Central export hub for all smart contract ABIs, addresses, and server helpers.
 * Components and route handlers call functions from here rather than
 * inlining contract addresses or ABIs (code-standards.md).
 */

export { CONTRACT_ADDRESSES, type NetworkAddresses } from "./addresses";
export { assetRegistryAbi } from "./abis/assetRegistryAbi";
export { riskOracleAbi } from "./abis/riskOracleAbi";
export { trancheVaultAbi } from "./abis/trancheVaultAbi";
export { mockUsdcAbi } from "./abis/mockUsdcAbi";
export { writeScoreOnchain } from "./oracle";
