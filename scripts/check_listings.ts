import { createPublicClient, http } from "viem";
import { CONTRACT_ADDRESSES } from "../lib/contracts/addresses";
import { trancheVaultAbi } from "../lib/contracts/abis/trancheVaultAbi";
import { assetRegistryAbi } from "../lib/contracts/abis/assetRegistryAbi";
import { db } from "../lib/db/client";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = createPublicClient({ transport: http("https://testrpc.xlayer.tech") });
  const vaultAddress = CONTRACT_ADDRESSES.xlayerTestnet.trancheVault;
  const regAddress = CONTRACT_ADDRESSES.xlayerTestnet.assetRegistry;

  console.log("TrancheVault address:", vaultAddress);
  console.log("AssetRegistry address:", regAddress);

  const invoices = await db.invoiceSubmission.findMany();
  console.log(`Found ${invoices.length} invoices in database:`);

  for (const inv of invoices) {
    console.log(`\n--- Invoice: ${inv.id} (${inv.debtorName}) ---`);
    console.log(`Status in DB: ${inv.status}, onchainAssetId: ${inv.onchainAssetId}`);
    
    if (inv.onchainAssetId) {
      const assetIdNum = BigInt(inv.onchainAssetId);
      try {
        const asset = await client.readContract({
          address: regAddress,
          abi: assetRegistryAbi,
          functionName: "getAsset",
          args: [assetIdNum],
        });
        console.log(`Onchain Asset in AssetRegistry: status=${asset.status}, amount=${Number(asset.amount) / 1e6} USDC`);
      } catch (e: any) {
        console.log(`Asset ${assetIdNum} in AssetRegistry reverted:`, e.shortMessage || e.message);
      }

      try {
        const listing = await client.readContract({
          address: vaultAddress,
          abi: trancheVaultAbi,
          functionName: "getListing",
          args: [assetIdNum],
        });
        console.log(`Onchain Listing in TrancheVault: targetAmount=${Number(listing.targetAmount) / 1e6}, raised=${Number(listing.raisedAmount) / 1e6}, deadline=${Number(listing.fundingDeadline)}`);
      } catch (e: any) {
        console.log(`Listing ${assetIdNum} in TrancheVault reverted:`, e.shortMessage || e.message);
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
