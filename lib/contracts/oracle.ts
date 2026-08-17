import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xlayerTestnet } from "@/lib/chain/config";
import { CONTRACT_ADDRESSES } from "./addresses";
import { riskOracleAbi } from "./abis/riskOracleAbi";
import { trancheVaultAbi } from "./abis/trancheVaultAbi";

/**
 * Server-side helper to write an AI risk score onchain to RiskOracle and
 * automatically initialize the TrancheVault listing if approved.
 *
 * Invariant 1: ORACLE_PRIVATE_KEY is ONLY used in app/api/ route handlers on the server side.
 * Invariant 3: Score data written matches the structured AI output.
 * Invariant 5: A score must exist onchain before a listing can be investable.
 */
export async function writeScoreOnchain(params: {
  assetId: bigint;
  tier: string;
  score: number;
  aprBps: number;
  rationale: string;
  decision: string;
}): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> {
  const privateKey = process.env.ORACLE_PRIVATE_KEY;

  if (!privateKey) {
    console.warn("ORACLE_PRIVATE_KEY not set. Onchain write skipped.");
    return { success: false, error: "ORACLE_PRIVATE_KEY not set in environment" };
  }

  try {
    const formattedPrivateKey = privateKey.startsWith("0x")
      ? (privateKey as `0x${string}`)
      : (`0x${privateKey}` as `0x${string}`);

    const account = privateKeyToAccount(formattedPrivateKey);

    const publicClient = createPublicClient({
      chain: xlayerTestnet,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: xlayerTestnet,
      transport: http(),
    });

    const oracleAddress = CONTRACT_ADDRESSES.xlayerTestnet.riskOracle;
    const vaultAddress = CONTRACT_ADDRESSES.xlayerTestnet.trancheVault;

    // 1. Call setScore(assetId, tier, score, apr, rationale, decision) on RiskOracle
    const hash = await walletClient.writeContract({
      address: oracleAddress,
      abi: riskOracleAbi,
      functionName: "setScore",
      args: [
        params.assetId,
        params.tier,
        BigInt(params.score),
        BigInt(params.aprBps),
        params.rationale,
        params.decision,
      ],
    });

    console.log(`RiskOracle setScore transaction submitted: ${hash}`);

    // Wait for receipt
    await publicClient.waitForTransactionReceipt({ hash });

    // 2. If approved, automatically create listing in TrancheVault
    if (params.decision.toLowerCase() === "approved") {
      try {
        const vaultHash = await walletClient.writeContract({
          address: vaultAddress,
          abi: trancheVaultAbi,
          functionName: "createListing",
          args: [params.assetId],
        });
        console.log(`TrancheVault createListing transaction submitted: ${vaultHash}`);
        await publicClient.waitForTransactionReceipt({ hash: vaultHash });
      } catch (vaultErr) {
        console.warn("TrancheVault createListing notice (might already exist):", vaultErr);
      }
    }

    return { success: true, txHash: hash };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Failed to write score onchain:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
