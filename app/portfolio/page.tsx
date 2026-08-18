"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useChainId } from "wagmi";
import { CONTRACT_ADDRESSES, trancheVaultAbi, mockUsdcAbi } from "@/lib/contracts";
import { xlayerTestnet, xlayerMainnet } from "@/lib/chain/config";

const erc20Abi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface InvoiceRecord {
  id: string;
  walletAddress: string;
  amount: number | string;
  dueDateIso: string;
  debtorName: string;
  ipfsCid: string | null;
  status: string;
  aiRationale: string | null;
  aiTier: string | null;
  aiApr: string | null;
  aiDecision: string | null;
  onchainAssetId: string | null;
  fundingDeadline?: number | null;
  fundingDeadlineIso?: string | null;
  isExpiredUnfunded?: boolean;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const isMainnet = chainId === xlayerMainnet.id;
  const currentChain = isMainnet ? xlayerMainnet : xlayerTestnet;

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingAssetId, setClaimingAssetId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"PAYOUT" | "REFUND">("PAYOUT");
  const [isMintingFaucet, setIsMintingFaucet] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  // Wagmi contract hooks
  const { writeContract, writeContractAsync, data: txHash, isPending: isTxPending, error: contractError } = useWriteContract();
  const { isLoading: isWaitingReceipt, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const trancheVaultAddress = isMainnet
    ? (CONTRACT_ADDRESSES.xlayerMainnet.trancheVault as `0x${string}`)
    : (CONTRACT_ADDRESSES.xlayerTestnet.trancheVault as `0x${string}`);
  const usdcAddress = isMainnet
    ? (CONTRACT_ADDRESSES.xlayerMainnet.usdc as `0x${string}`)
    : (CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc as `0x${string}`);

  // Read USDC wallet balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const userBalanceUsd = balanceData ? Number(BigInt(balanceData.toString())) / 10 ** 6 : 0;

  // 1-Click Faucet Handler (Testnet only)
  const handleClaimFaucet = async () => {
    if (!address || isMainnet) return;
    setIsMintingFaucet(true);
    setFaucetSuccess(false);
    try {
      const tx = await writeContractAsync({
        address: usdcAddress,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [address, BigInt(10_000 * 10 ** 6)], // 10,000 mUSDC
        chainId: xlayerTestnet.id,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
      await refetchBalance();
      setFaucetSuccess(true);
    } catch (err) {
      console.error("Faucet claim error:", err);
    } finally {
      setIsMintingFaucet(false);
    }
  };

  const activeNetworkKey = isMainnet ? "xlayerMainnet" : "xlayerTestnet";

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch(`/api/invoices?network=${activeNetworkKey}`);
        const json = await res.json();
        if (json.data) {
          setInvoices(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch portfolio invoices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, [activeNetworkKey]);

  // Filter listings that are active or terminal in market
  const marketplaceInvoices = invoices.filter((inv) =>
    ["listed", "funded", "repaid", "expired_unfunded"].includes(inv.status)
  );

  // Read investor position for Asset 1
  const { data: positionData, refetch: refetchPosition } = useReadContract({
    address: trancheVaultAddress,
    abi: trancheVaultAbi,
    functionName: "getPosition",
    args: address ? [BigInt(1), address] : undefined,
  });

  // Read listing details from TrancheVault for Asset 1
  const { data: listingData, refetch: refetchListing } = useReadContract({
    address: trancheVaultAddress,
    abi: trancheVaultAbi,
    functionName: "getListing",
    args: [BigInt(1)],
  });

  // Position & Payout calculation
  const rawPositionUnits = positionData ? BigInt(positionData.toString()) : BigInt(0);
  const positionUsd = Number(rawPositionUnits) / 10 ** 6;

  const isListingRepaid = listingData ? listingData.repaid : false;
  const isExpiredUnfunded = listingData ? listingData.expiredUnfunded : false;
  const repaymentAmountUnits = listingData ? BigInt(listingData.repaymentAmount.toString()) : BigInt(0);
  const targetAmountUnits = listingData ? BigInt(listingData.targetAmount.toString()) : BigInt(1);

  let claimableUsd = 0;
  if (isListingRepaid && targetAmountUnits > BigInt(0) && rawPositionUnits > BigInt(0)) {
    const payoutUnits = (rawPositionUnits * repaymentAmountUnits) / targetAmountUnits;
    claimableUsd = Number(payoutUnits) / 10 ** 6;
  }

  // Handle Claim Payout
  const handleClaimPayout = (assetIdStr: string) => {
    setClaimingAssetId(assetIdStr);
    setActionType("PAYOUT");
    const assetId = BigInt(assetIdStr || "1");

    writeContract({
      address: trancheVaultAddress,
      abi: trancheVaultAbi,
      functionName: "claimPayout",
      args: [assetId],
      chainId: currentChain.id,
    });
  };

  // Handle Claim 100% Escrow Refund
  const handleClaimRefund = (assetIdStr: string) => {
    setClaimingAssetId(assetIdStr);
    setActionType("REFUND");
    const assetId = BigInt(assetIdStr || "1");

    writeContract({
      address: trancheVaultAddress,
      abi: trancheVaultAbi,
      functionName: "claimRefund",
      args: [assetId],
      chainId: currentChain.id,
    });
  };

  useEffect(() => {
    if (isTxSuccess) {
      refetchBalance();
      refetchPosition();
      refetchListing();
    }
  }, [isTxSuccess, refetchBalance, refetchPosition, refetchListing]);

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E3E0D6]/10">
        <div>
          <span className="text-xs font-semibold text-[#98FFE8] uppercase tracking-wider block mb-1">
            Investor Terminal
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Portfolio Holdings & Yields
          </h1>
          <p className="text-xs text-[#5B6479] mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Non-custodial escrow holdings, pro-rata payouts, and 100% refund claims on X Layer.
          </p>
        </div>

        <Link
          href="/browse"
          className="text-xs font-bold text-[#5B6479] hover:text-[#98FFE8] transition-colors"
        >
          ← Browse Open Marketplace
        </Link>
      </div>

      {/* DISCONNECTED WARNING */}
      {!isConnected ? (
        <div className="p-12 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mx-auto text-[#98FFE8] text-xl">
            💼
          </div>
          <h2 className="text-lg font-bold text-[#F2FBF9]">Connect Your Wallet</h2>
          <p className="text-xs text-[#5B6479] leading-relaxed">
            Connect your Web3 wallet to review active credit positions, claim settlement payouts, and access the testnet faucet.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-1">
              <span className="text-xs text-[#5B6479]">Active Escrow Capital</span>
              <span className="text-2xl font-bold text-[#F2FBF9] block" style={{ fontFamily: "var(--font-display)" }}>
                ${positionUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-[#5B6479]">mUSDC</span>
              </span>
            </div>

            <div className="p-6 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/5 space-y-1">
              <span className="text-xs text-[#98FFE8] font-semibold">Claimable Settlement Payout</span>
              <span className="text-2xl font-bold text-[#98FFE8] block" style={{ fontFamily: "var(--font-display)" }}>
                ${claimableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-[#98FFE8]/70">mUSDC</span>
              </span>
            </div>

            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-1">
              <span className="text-xs text-[#5B6479]">Settled Payout Yield</span>
              <span className="text-2xl font-bold text-[#F2FBF9] block" style={{ fontFamily: "var(--font-display)" }}>
                ${(claimableUsd > 0 ? claimableUsd - positionUsd : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-[#5B6479]">mUSDC</span>
              </span>
            </div>

            <div className="p-6 rounded-xl border border-[#98FFE8]/20 bg-[#161A1D] space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs text-[#5B6479] block">Wallet mUSDC Balance</span>
                <span className="text-xl font-bold text-[#F2FBF9] block font-mono" style={{ fontFamily: "var(--font-display)" }}>
                  ${userBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={handleClaimFaucet}
                disabled={isMintingFaucet}
                className="w-full py-1.5 rounded-lg bg-[#98FFE8]/15 border border-[#98FFE8]/30 hover:bg-[#98FFE8]/25 text-[#98FFE8] text-[11px] font-bold transition-all disabled:opacity-50"
              >
                {isMintingFaucet ? "Minting 10k..." : "+ Faucet: Claim 10k mUSDC"}
              </button>
            </div>
          </div>

          {faucetSuccess && (
            <div className="p-3 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/10 text-xs text-[#98FFE8] flex items-center justify-between">
              <span>✓ 10,000 test mUSDC minted to your connected wallet!</span>
              <button onClick={() => setFaucetSuccess(false)} className="font-bold">✕</button>
            </div>
          )}

          {/* Active Holdings & Payout Claims Table */}
          <div className="p-6 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
                Active Tranche Holdings & Settlement Status
              </h3>
              <span className="text-xs text-[#5B6479]">All-or-Nothing Escrow Accounting</span>
            </div>

            {loading ? (
              <p className="text-xs text-[#98FFE8] animate-pulse">Loading holdings from X Layer...</p>
            ) : marketplaceInvoices.length === 0 ? (
              <div className="py-16 text-center space-y-4 border border-dashed border-[#E3E0D6]/10 rounded-xl">
                <p className="text-xs text-[#5B6479] max-w-sm mx-auto">
                  You do not have any active invoice credit positions. Browse open listings to fund your first tranche.
                </p>
                <Link
                  href="/browse"
                  className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-[#161A1D]"
                  style={{ background: "var(--gradient-surge)" }}
                >
                  Browse Listings
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E3E0D6]/10 text-[#5B6479]">
                      <th className="py-3 px-4">Debtor Company</th>
                      <th className="py-3 px-4">Assigned APR</th>
                      <th className="py-3 px-4">Facility Status</th>
                      <th className="py-3 px-4">My Position</th>
                      <th className="py-3 px-4">Claimable Return</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E0D6]/10">
                    {marketplaceInvoices.map((inv) => {
                      const onchainAssetId = inv.onchainAssetId || "1";
                      const isRepaid = inv.status === "repaid";
                      const isExpired = inv.status === "expired_unfunded" || isExpiredUnfunded;
                      const apr = inv.aiApr ? `${inv.aiApr}%` : "12.0%";

                      return (
                        <tr key={inv.id} className="hover:bg-[#E3E0D6]/5 transition-colors">
                          <td className="py-4 px-4 font-bold text-[#F2FBF9]">
                            {inv.debtorName}
                            <span className="text-[10px] text-[#5B6479] font-mono block">
                              #INV-{inv.id.slice(0, 6)}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-[#98FFE8]">{apr}</td>
                          <td className="py-4 px-4 uppercase text-[11px] font-semibold">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isRepaid
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : isExpired
                                  ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30"
                                  : "bg-[#98FFE8]/10 text-[#98FFE8] border border-[#98FFE8]/30"
                              }`}
                            >
                              {isExpired ? "Expired Unfunded" : inv.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-medium">
                            ${positionUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-[#98FFE8]">
                            {isExpired
                              ? `$${positionUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} (100% Refund)`
                              : `$${claimableUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {isRepaid && claimableUsd > 0 ? (
                              <button
                                onClick={() => handleClaimPayout(onchainAssetId)}
                                disabled={isTxPending || isWaitingReceipt}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:scale-105 shadow-md"
                                style={{ background: "var(--gradient-surge)" }}
                              >
                                {isTxPending && claimingAssetId === onchainAssetId && actionType === "PAYOUT"
                                  ? "Claiming..."
                                  : "Claim Payout"}
                              </button>
                            ) : isExpired && positionUsd > 0 ? (
                              <button
                                onClick={() => handleClaimRefund(onchainAssetId)}
                                disabled={isTxPending || isWaitingReceipt}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:scale-105 shadow-md bg-amber-400 hover:bg-amber-300"
                              >
                                {isTxPending && claimingAssetId === onchainAssetId && actionType === "REFUND"
                                  ? "Refunding..."
                                  : "Claim 100% Refund"}
                              </button>
                            ) : isRepaid ? (
                              <span className="px-3 py-1 rounded bg-[#E3E0D6]/10 text-[11px] text-[#5B6479]">
                                Claimed
                              </span>
                            ) : isExpired ? (
                              <span className="px-3 py-1 rounded bg-zinc-500/10 text-[11px] text-zinc-400">
                                Refunded / Closed
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded bg-[#98FFE8]/10 text-[11px] text-[#98FFE8]">
                                Active Listing
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Success Feedback */}
            {isTxSuccess && (
              <div className="p-4 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/10 text-xs text-[#98FFE8] space-y-1">
                <span className="font-bold block">
                  {actionType === "REFUND" ? "✓ Full Escrow Refund Confirmed!" : "✓ Payout Transaction Confirmed!"}
                </span>
                <p className="text-[11px] text-[#F2FBF9]/80">
                  {actionType === "REFUND"
                    ? "Your 100% principal deposit has been returned from escrow directly to your wallet."
                    : "Your pro-rata payout has been transferred to your connected wallet. View transaction on OKLink explorer."}
                </p>
              </div>
            )}

            {contractError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {contractError.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
