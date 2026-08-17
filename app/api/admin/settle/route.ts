import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xlayerTestnet } from "@/lib/chain/config";
import { CONTRACT_ADDRESSES, trancheVaultAbi, mockUsdcAbi } from "@/lib/contracts";

/**
 * POST /api/admin/settle
 * Server-side fallback endpoint to execute simulated repayment with the authorized admin key.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, repaymentAmountUsd } = body;

    if (!assetId) {
      return NextResponse.json({ error: "Missing assetId" }, { status: 400 });
    }

    const privateKey = process.env.ORACLE_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "ORACLE_PRIVATE_KEY not configured" }, { status: 500 });
    }

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

    const mockUsdcAddress = CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc;
    const vaultAddress = CONTRACT_ADDRESSES.xlayerTestnet.trancheVault;

    const amountUnits = BigInt(Math.round((Number(repaymentAmountUsd) || 10137.49) * 10 ** 6));

    // 1. Ensure admin account has enough mUSDC
    const balance = await publicClient.readContract({
      address: mockUsdcAddress,
      abi: mockUsdcAbi,
      functionName: "balanceOf",
      args: [account.address],
    });

    if (balance < amountUnits) {
      console.log("Minting mUSDC to admin key for settlement...");
      const mintTx = await walletClient.writeContract({
        address: mockUsdcAddress,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [account.address, amountUnits * BigInt(2)],
      });
      await publicClient.waitForTransactionReceipt({ hash: mintTx });
    }

    // 2. Approve TrancheVault
    const approveTx = await walletClient.writeContract({
      address: mockUsdcAddress,
      abi: mockUsdcAbi,
      functionName: "approve",
      args: [vaultAddress, amountUnits],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // 3. Execute simulateRepayment
    const settleTx = await walletClient.writeContract({
      address: vaultAddress,
      abi: trancheVaultAbi,
      functionName: "simulateRepayment",
      args: [BigInt(assetId), amountUnits],
    });
    await publicClient.waitForTransactionReceipt({ hash: settleTx });

    return NextResponse.json({
      success: true,
      data: {
        txHash: settleTx,
        assetId: String(assetId),
        repaymentAmountUsd,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/admin/settle error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
