import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("==================================================");
  console.log("🚀 CONTINUING REFLUX MAINNET DEPLOYMENT (CHAIN ID: 196)");
  console.log("==================================================");

  const pk = process.env.ORACLE_PRIVATE_KEY;
  if (!pk) throw new Error("Missing ORACLE_PRIVATE_KEY in .env");
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  
  const rpc = "https://rpc.xlayer.tech";
  const client = createPublicClient({ transport: http(rpc, { timeout: 30_000, retryCount: 5 }) });
  const wallet = createWalletClient({ account, transport: http(rpc, { timeout: 30_000, retryCount: 5 }) });

  console.log("Deployer Address:", account.address);
  const bal = await client.getBalance({ address: account.address });
  console.log("Deployer Balance:", Number(bal) / 1e18, "OKB");

  const mainnetUsdcAddress = "0x74b7f16337b8972027f6196a17a631ac6de26d22";
  const userAdminWallet = "0x9BEA067A3Aa1f1Cd309eDa2fE87747a998a4cf80";

  // Already successfully deployed on Mainnet:
  const mainnetAssetRegistry = "0xd84509d311700d7946439e66dd6573138d79bbcb";
  const mainnetRiskOracle = "0xdebf3e5a598e27d28c912a3cac88df81c253730a";

  console.log("✓ Existing AssetRegistry:", mainnetAssetRegistry);
  console.log("✓ Existing RiskOracle:   ", mainnetRiskOracle);

  const vaultArtifact = JSON.parse(fs.readFileSync("contracts/out/TrancheVault.sol/TrancheVault.json", "utf8"));
  const regArtifact = JSON.parse(fs.readFileSync("contracts/out/AssetRegistry.sol/AssetRegistry.json", "utf8"));
  const oracleArtifact = JSON.parse(fs.readFileSync("contracts/out/RiskOracle.sol/RiskOracle.json", "utf8"));

  // 1. Deploy TrancheVault with explicit nonce
  console.log("\n[3/5] Deploying TrancheVault on Mainnet...");
  let nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
  console.log("Current nonce:", nonce);

  const vaultDeployHash = await wallet.deployContract({
    abi: vaultArtifact.abi,
    bytecode: vaultArtifact.bytecode.object,
    args: [account.address, mainnetUsdcAddress, mainnetAssetRegistry, mainnetRiskOracle],
    nonce: nonce++,
  });
  console.log("TrancheVault deploy tx:", vaultDeployHash);
  const vaultReceipt = await client.waitForTransactionReceipt({ hash: vaultDeployHash });
  const mainnetTrancheVault = vaultReceipt.contractAddress;
  console.log("✓ Mainnet TrancheVault deployed at:", mainnetTrancheVault);

  // 2. Wire Roles & Authorizations
  console.log("\n[4/5] Configuring Onchain Roles & Authorizations...");
  
  nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
  const tx1 = await wallet.writeContract({
    address: mainnetAssetRegistry,
    abi: regArtifact.abi,
    functionName: "setOracle",
    args: [account.address],
    nonce: nonce++,
  });
  await client.waitForTransactionReceipt({ hash: tx1 });
  console.log("✓ AssetRegistry setOracle completed (tx: " + tx1 + ")");

  nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
  const tx2 = await wallet.writeContract({
    address: mainnetAssetRegistry,
    abi: regArtifact.abi,
    functionName: "setAuthorizedUpdater",
    args: [mainnetTrancheVault, true],
    nonce: nonce++,
  });
  await client.waitForTransactionReceipt({ hash: tx2 });
  console.log("✓ AssetRegistry setAuthorizedUpdater(TrancheVault) completed (tx: " + tx2 + ")");

  nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
  const tx3 = await wallet.writeContract({
    address: mainnetRiskOracle,
    abi: oracleArtifact.abi,
    functionName: "setOracle",
    args: [account.address],
    nonce: nonce++,
  });
  await client.waitForTransactionReceipt({ hash: tx3 });
  console.log("✓ RiskOracle setOracle completed (tx: " + tx3 + ")");

  nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
  const tx4 = await wallet.writeContract({
    address: mainnetTrancheVault,
    abi: vaultArtifact.abi,
    functionName: "setAdmin",
    args: [userAdminWallet],
    nonce: nonce++,
  });
  await client.waitForTransactionReceipt({ hash: tx4 });
  console.log("✓ TrancheVault setAdmin to user wallet completed (tx: " + tx4 + ")");

  // 3. Update lib/contracts/addresses.ts
  console.log("\n[5/5] Updating lib/contracts/addresses.ts...");
  const testnetRegistry = "0xaf248c5474f40945ed41664125350a890782cad0";
  const testnetOracle = "0x37e1Bf4Ac7e80507c22f6710B205b696068F1127";
  const testnetVault = "0x452857e278fe68376e264662ff944cc88cf65fb7";
  const testnetMockUsdc = "0xD84509d311700d7946439E66DD6573138d79bBCb";

  const updatedConfig = `export interface NetworkAddresses {
  assetRegistry: \`0x\${string}\`;
  riskOracle: \`0x\${string}\`;
  trancheVault: \`0x\${string}\`;
  mockUsdc?: \`0x\${string}\`;
  usdc?: \`0x\${string}\`;
}

export const CONTRACT_ADDRESSES = {
  xlayerTestnet: {
    assetRegistry: "${testnetRegistry}",
    riskOracle: "${testnetOracle}",
    trancheVault: "${testnetVault}",
    mockUsdc: "${testnetMockUsdc}",
  },
  xlayerMainnet: {
    assetRegistry: "${mainnetAssetRegistry}",
    riskOracle: "${mainnetRiskOracle}",
    trancheVault: "${mainnetTrancheVault}",
    usdc: "${mainnetUsdcAddress}",
  },
} as const;
`;

  fs.writeFileSync("lib/contracts/addresses.ts", updatedConfig);
  console.log("✓ lib/contracts/addresses.ts updated with Mainnet configuration!");

  console.log("\n==================================================");
  console.log("🎉 REFLUX MAINNET LAUNCH COMPLETE!");
  console.log("Network:       OKX X Layer Mainnet (Chain ID 196)");
  console.log("AssetRegistry: ", mainnetAssetRegistry);
  console.log("RiskOracle:    ", mainnetRiskOracle);
  console.log("TrancheVault:  ", mainnetTrancheVault);
  console.log("USDC Token:    ", mainnetUsdcAddress);
  console.log("==================================================");
}

main().catch(console.error).finally(() => process.exit(0));
