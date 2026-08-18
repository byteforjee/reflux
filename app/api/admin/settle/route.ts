import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xlayerTestnet, xlayerMainnet } from "@/lib/chain/config";
import { CONTRACT_ADDRESSES, trancheVaultAbi, mockUsdcAbi } from "@/lib/contracts";

const erc20Abi = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * POST /api/admin/settle
 * Server-side fallback endpoint to execute simulated repayment with the authorized admin key.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, repaymentAmountUsd, network } = body;

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

    const isMainnet = network === "xlayerMainnet";
    const targetChain = isMainnet ? xlayerMainnet : xlayerTestnet;

    const publicClient = createPublicClient({
      chain: targetChain,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: targetChain,
      transport: http(),
    });

    const usdcAddress = isMainnet
      ? CONTRACT_ADDRESSES.xlayerMainnet.usdc
      : CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc;
    const vaultAddress = isMainnet
      ? CONTRACT_ADDRESSES.xlayerMainnet.trancheVault
      : CONTRACT_ADDRESSES.xlayerTestnet.trancheVault;

    const amountUnits = BigInt(Math.round((Number(repaymentAmountUsd) || 10137.49) * 10 ** 6));

    // 1. Ensure admin account has enough USDC
    const balance = await publicClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });

    if (balance < amountUnits) {
      if (!isMainnet) {
        console.log("Minting test mUSDC to admin key for testnet settlement...");
        const mintTx = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc,
          abi: mockUsdcAbi,
          functionName: "mint",
          args: [account.address, amountUnits * BigInt(2)],
        });
        await publicClient.waitForTransactionReceipt({ hash: mintTx });
      } else {
        return NextResponse.json(
          { error: `Insufficient Mainnet USDC balance in admin wallet. Required: $${Number(amountUnits) / 1e6} USDC` },
          { status: 400 }
        );
      }
    }

    // 2. Approve TrancheVault
    const approveTx = await walletClient.writeContract({
      address: usdcAddress,
      abi: erc20Abi,
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
      txHash: settleTx,
      repaymentAmountUsd,
      assetId,
      network: isMainnet ? "xlayerMainnet" : "xlayerTestnet",
    });
  } catch (error: any) {
    console.error("Admin settle error:", error);
    return NextResponse.json(
      { error: error?.shortMessage || error?.message || "Failed to execute repayment settlement" },
      { status: 500 }
    );
  }
}
