import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pk = process.env.ORACLE_PRIVATE_KEY;
  if (!pk) throw new Error("Missing ORACLE_PRIVATE_KEY");
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  
  const rpc = "https://testrpc.xlayer.tech";
  const client = createPublicClient({ transport: http(rpc, { timeout: 30_000, retryCount: 5 }) });
  const wallet = createWalletClient({ account, transport: http(rpc, { timeout: 30_000, retryCount: 5 }) });

  console.log("Deploying from owner/oracle:", account.address);

  const mockUsdcAddress = "0xD84509d311700d7946439E66DD6573138d79bBCb";
  const riskOracleAddress = "0x37e1Bf4Ac7e80507c22f6710B205b696068F1127";
  const assetRegistryAddress = "0xaf248c5474f40945ed41664125350a890782cad0";

  // 1. Deploy TrancheVault with multi-admin permission (owner + admin)
  console.log("Deploying upgraded TrancheVault...");
  const vaultArtifact = JSON.parse(fs.readFileSync("contracts/out/TrancheVault.sol/TrancheVault.json", "utf8"));
  const regArtifact = JSON.parse(fs.readFileSync("contracts/out/AssetRegistry.sol/AssetRegistry.json", "utf8"));

  const vaultHash = await wallet.deployContract({
    abi: vaultArtifact.abi,
    bytecode: vaultArtifact.bytecode.object,
    args: [account.address, mockUsdcAddress, assetRegistryAddress, riskOracleAddress],
  });
  console.log("TrancheVault deploy tx:", vaultHash);
  const vaultReceipt = await client.waitForTransactionReceipt({ hash: vaultHash });
  const newTrancheVaultAddress = vaultReceipt.contractAddress;
  console.log("✓ New TrancheVault deployed at:", newTrancheVaultAddress);

  // 2. Authorize new TrancheVault on AssetRegistry
  console.log("Authorizing TrancheVault on AssetRegistry...");
  const tx1 = await wallet.writeContract({
    address: assetRegistryAddress,
    abi: regArtifact.abi,
    functionName: "setAuthorizedUpdater",
    args: [newTrancheVaultAddress, true],
  });
  await client.waitForTransactionReceipt({ hash: tx1 });
  console.log("✓ AssetRegistry updater role authorized!");

  // 3. Set admin to user's wallet (0x9BEA...)
  const userWallet = "0x9BEA067A3Aa1f1Cd309eDa2fE87747a998a4cf80";
  console.log("Setting TrancheVault admin to user wallet:", userWallet);
  const tx2 = await wallet.writeContract({
    address: newTrancheVaultAddress,
    abi: vaultArtifact.abi,
    functionName: "setAdmin",
    args: [userWallet],
  });
  await client.waitForTransactionReceipt({ hash: tx2 });
  console.log("✓ Admin role set to user wallet!");

  // 4. Create listing for Asset 1 (since Asset 1 is already in AssetRegistry and RiskOracle)
  console.log("Initializing onchain listing for Asset 1...");
  try {
    const tx3 = await wallet.writeContract({
      address: newTrancheVaultAddress,
      abi: vaultArtifact.abi,
      functionName: "createListing",
      args: [BigInt(1)],
    });
    await client.waitForTransactionReceipt({ hash: tx3 });
    console.log("✓ Listing 1 initialized and ready for investments! tx:", tx3);
  } catch (err) {
    console.warn("createListing(1) notice:", err);
  }

  // 5. Update lib/contracts/addresses.ts
  const addressesContent = `export interface NetworkAddresses {
  assetRegistry: \`0x\${string}\`;
  riskOracle: \`0x\${string}\`;
  trancheVault: \`0x\${string}\`;
  mockUsdc?: \`0x\${string}\`;
  usdc?: \`0x\${string}\`;
}

export const CONTRACT_ADDRESSES = {
  xlayerTestnet: {
    assetRegistry: "${assetRegistryAddress}",
    riskOracle: "${riskOracleAddress}",
    trancheVault: "${newTrancheVaultAddress}",
    mockUsdc: "${mockUsdcAddress}",
  },
  xlayerMainnet: {
    assetRegistry: "0x0000000000000000000000000000000000000000",
    riskOracle: "0x0000000000000000000000000000000000000000",
    trancheVault: "0x0000000000000000000000000000000000000000",
    usdc: "0x0000000000000000000000000000000000000000",
  },
} as const;
`;
  fs.writeFileSync("lib/contracts/addresses.ts", addressesContent);
  console.log("✓ lib/contracts/addresses.ts updated!");

  console.log("\n=================================");
  console.log("🎉 UPGRADE & LISTING 1 COMPLETE!");
  console.log("AssetRegistry: ", assetRegistryAddress);
  console.log("RiskOracle:    ", riskOracleAddress);
  console.log("TrancheVault:  ", newTrancheVaultAddress);
  console.log("MockUSDC:      ", mockUsdcAddress);
  console.log("=================================");
}

main().catch(console.error).finally(() => process.exit(0));
