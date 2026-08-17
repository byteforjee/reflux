"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES, trancheVaultAbi, mockUsdcAbi } from "@/lib/contracts";
import { xlayerTestnet } from "@/lib/chain/config";

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
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
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
  fundedAmount?: number | string;
  fundingDeadline?: number | null;
  fundingDeadlineIso?: string | null;
  isExpiredUnfunded?: boolean;
  documentHash?: string | null;
  createdAt: string;
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [investAmount, setInvestAmount] = useState<string>("100");
  const [txStep, setTxStep] = useState<"IDLE" | "APPROVING" | "INVESTING" | "REFUNDING" | "SUCCESS" | "REFUND_SUCCESS" | "ERROR">("IDLE");
  const [isMintingFaucet, setIsMintingFaucet] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  // Wagmi contract hooks
  const { writeContract, writeContractAsync, data: txHash, isPending: isTxPending, error: contractError } = useWriteContract();
  const { isLoading: isWaitingReceipt, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const mockUsdcAddress = CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc;
  const trancheVaultAddress = CONTRACT_ADDRESSES.xlayerTestnet.trancheVault;

  // Read allowance for MockUSDC
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: mockUsdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && trancheVaultAddress ? [address, trancheVaultAddress] : undefined,
  });

  // Read mUSDC wallet balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: mockUsdcAddress,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const userBalanceUsd = balanceData ? Number(BigInt(balanceData.toString())) / 10 ** 6 : 0;

  // Read live onchain listing status from TrancheVault
  const onchainAssetIdNum = invoice?.onchainAssetId ? BigInt(invoice.onchainAssetId) : BigInt(1);
  const { data: onchainListingData, refetch: refetchListing } = useReadContract({
    address: trancheVaultAddress,
    abi: trancheVaultAbi,
    functionName: "getListing",
    args: [onchainAssetIdNum],
  });

  // Read user's active escrow position
  const { data: userPositionData, refetch: refetchPosition } = useReadContract({
    address: trancheVaultAddress,
    abi: trancheVaultAbi,
    functionName: "getPosition",
    args: address ? [onchainAssetIdNum, address] : undefined,
  });

  const userPositionUsd = userPositionData ? Number(BigInt(userPositionData.toString())) / 10 ** 6 : 0;
  const onchainRaisedUnits = onchainListingData ? BigInt(onchainListingData.raisedAmount.toString()) : BigInt(0);
  const onchainRaisedUsd = Number(onchainRaisedUnits) / 10 ** 6;
  const targetUsd = invoice ? Number(invoice.amount) : (onchainListingData ? Number(onchainListingData.targetAmount) / 10 ** 6 : 1);
  const progressPct = targetUsd > 0 ? Math.min(100, Math.round((onchainRaisedUsd / targetUsd) * 100)) : 0;
  const isFullyFunded = onchainListingData?.repaid || (targetUsd > 0 && onchainRaisedUsd >= targetUsd);

  // Funding Deadline calculations
  const fundingDeadlineSec = onchainListingData ? Number(onchainListingData.fundingDeadline) : 0;
  const isDeadlinePassed = fundingDeadlineSec > 0 && fundingDeadlineSec * 1000 < Date.now();
  const isExpiredUnfunded = onchainListingData?.expiredUnfunded || (isDeadlinePassed && onchainRaisedUsd < targetUsd && !onchainListingData?.repaid);

  const getFundingCountdown = () => {
    if (fundingDeadlineSec === 0) return null;
    const diffMs = fundingDeadlineSec * 1000 - Date.now();
    if (diffMs <= 0) return "Funding Window Closed";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${mins}m remaining`;
  };

  // 1-Click Faucet Handler
  const handleClaimFaucet = async () => {
    if (!address) return;
    setIsMintingFaucet(true);
    setFaucetSuccess(false);
    try {
      const tx = await writeContractAsync({
        address: mockUsdcAddress,
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

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch("/api/invoices");
        const json = await res.json();
        if (json.data) {
          const found = json.data.find((inv: InvoiceRecord) => inv.id === id);
          if (found) setInvoice(found);
        }
      } catch (err) {
        console.error("Failed to fetch listing:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [id]);

  const rawAmount = invoice ? Number(invoice.amount) : 0;
  const apr = invoice?.aiApr ? `${invoice.aiApr}%` : "12.0%";
  const tier = invoice?.aiTier || "A";

  const parsedInvestAmount = Number(investAmount) || 0;
  const investUnits = BigInt(Math.round(parsedInvestAmount * 10 ** 6));
  const currentAllowance = allowanceData ? BigInt(allowanceData.toString()) : BigInt(0);
  const needsApproval = currentAllowance < investUnits;

  // Handle Approve Tx
  const handleApprove = () => {
    setTxStep("APPROVING");
    writeContract({
      address: mockUsdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [trancheVaultAddress, investUnits],
      chainId: xlayerTestnet.id,
    });
  };

  // Handle Invest Tx
  const handleInvest = () => {
    if (!invoice?.onchainAssetId && !invoice?.id) return;
    setTxStep("INVESTING");
    const assetId = BigInt(invoice?.onchainAssetId || "1");

    writeContract({
      address: trancheVaultAddress,
      abi: trancheVaultAbi,
      functionName: "invest",
      args: [assetId, investUnits],
      chainId: xlayerTestnet.id,
    });
  };

  // Handle 100% Escrow Refund Tx
  const handleClaimRefund = () => {
    if (!invoice?.onchainAssetId && !invoice?.id) return;
    setTxStep("REFUNDING");
    const assetId = BigInt(invoice?.onchainAssetId || "1");

    writeContract({
      address: trancheVaultAddress,
      abi: trancheVaultAbi,
      functionName: "claimRefund",
      args: [assetId],
      chainId: xlayerTestnet.id,
    });
  };

  useEffect(() => {
    if (isTxSuccess) {
      if (txStep === "APPROVING") {
        setTxStep("IDLE");
        refetchAllowance();
      } else if (txStep === "INVESTING") {
        setTxStep("SUCCESS");
        refetchBalance();
        refetchAllowance();
        refetchListing();
        refetchPosition();
        if (invoice?.id && parsedInvestAmount > 0) {
          fetch(`/api/invoices/${invoice.id}/invest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amountInvested: parsedInvestAmount }),
          }).catch(console.error);
        }
      } else if (txStep === "REFUNDING") {
        setTxStep("REFUND_SUCCESS");
        refetchBalance();
        refetchListing();
        refetchPosition();
      }
    }
  }, [isTxSuccess, txStep, invoice?.id, parsedInvestAmount, refetchAllowance, refetchBalance, refetchListing, refetchPosition]);

  if (loading) {
    return (
      <div className="min-h-screen py-20 text-center text-xs text-[#98FFE8] animate-pulse">
        Loading listing details from X Layer...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#F2FBF9]">Listing Not Found</h2>
        <p className="text-xs text-[#5B6479]">This invoice listing could not be found or has been removed.</p>
        <Link href="/browse" className="inline-block text-xs text-[#98FFE8] underline font-bold">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Back Link & Header */}
      <div className="space-y-4 pb-6 border-b border-[#E3E0D6]/10">
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6479] hover:text-[#98FFE8] transition-colors"
        >
          <span>← Back to Marketplace Listings</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {invoice.debtorName}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  tier === "A"
                    ? "bg-[#98FFE8]/10 text-[#98FFE8] border border-[#98FFE8]/30"
                    : tier === "B"
                    ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                    : "bg-rose-400/10 text-rose-400 border border-rose-400/30"
                }`}
              >
                Tier {tier} Verified
              </span>
              {isExpiredUnfunded ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
                  Expired Unfunded
                </span>
              ) : (
                fundingDeadlineSec > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                    ⚡ {getFundingCountdown()}
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-[#5B6479] mt-1" style={{ fontFamily: "var(--font-body)" }}>
              Commercial Trade Receivable Facility • Tokenized 100% on X Layer
            </p>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-xs text-[#5B6479] block">Underwritten APR</span>
              <span className="text-2xl font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
                {apr}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#5B6479] block">Maturity Date</span>
              <span className="text-sm font-bold text-[#F2FBF9]">{invoice.dueDateIso}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Credit Profile & AI Rationale (Cols 1-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI Underwriting Analysis */}
          <div className="p-6 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#98FFE8] animate-ping" />
              <h3 className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider">
                Automated Credit Risk Assessment
              </h3>
            </div>
            <p className="text-xs text-[#F2FBF9]/90 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
              {invoice.aiRationale || "AI credit assessment completed. Debtor verified on institutional criteria."}
            </p>
          </div>

          {/* Collateral & Verification Proofs */}
          <div className="p-6 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-4">
            <h3 className="text-xs font-bold text-[#5B6479] uppercase tracking-wider">
              Onchain Collateral Verification
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-[#E3E0D6]/10">
                <span className="text-[#5B6479]">Decentralized IPFS Storage Proof</span>
                {invoice.ipfsCid ? (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${invoice.ipfsCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[#98FFE8] underline hover:opacity-80"
                  >
                    {invoice.ipfsCid.slice(0, 14)}... ↗
                  </a>
                ) : (
                  <span className="text-[#5B6479]">None</span>
                )}
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E3E0D6]/10">
                <span className="text-[#5B6479]">Document SHA-256 Fingerprint</span>
                <span className="font-mono text-[#F2FBF9] text-[11px]">
                  {invoice.documentHash ? `${invoice.documentHash.slice(0, 16)}...` : "Verified"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E3E0D6]/10">
                <span className="text-[#5B6479]">All-or-Nothing Escrow Model</span>
                <span className="text-[#98FFE8] font-bold">100% Escrow Protected</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#5B6479]">Submitter Wallet</span>
                <span className="font-mono text-[#F2FBF9] text-[11px]">
                  {invoice.walletAddress.slice(0, 6)}...{invoice.walletAddress.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Investment / Escrow Refund Action (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl border border-[#E3E0D6]/15 bg-[#161A1D] space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#5B6479] block">Total Facility Target</span>
              <div className="text-3xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                ${rawAmount.toLocaleString()} <span className="text-xs font-normal text-[#5B6479]">mUSDC</span>
              </div>
            </div>

            {/* Live Onchain Funding Progress */}
            <div className="p-4 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5B6479]">Escrow Funding Progress</span>
                <span className="font-bold text-[#98FFE8]">
                  {isFullyFunded ? "100% Funded" : `${progressPct}% Funded`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#161A1D] border border-[#E3E0D6]/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1F8F84] to-[#98FFE8] transition-all duration-500"
                  style={{
                    width: `${isFullyFunded ? 100 : Math.max(progressPct, onchainRaisedUsd > 0 ? 3 : 0)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#5B6479]">
                <span>Escrowed: ${onchainRaisedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDC</span>
                <span>Remaining: ${Math.max(0, targetUsd - onchainRaisedUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDC</span>
              </div>
            </div>

            {/* EXPIRED UNFUNDED ESCROW REFUND PANEL */}
            {isExpiredUnfunded ? (
              <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-4 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <span>⚡ Funding Window Closed (All-or-Nothing)</span>
                </div>
                <p className="text-[#F2FBF9]/90 leading-relaxed text-[11px]">
                  This facility did not reach 100% target before the funding deadline. Contributed funds were held safely in escrow and are now 100% refundable.
                </p>
                {userPositionUsd > 0 ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#161A1D] border border-amber-500/30 text-xs">
                      <span className="text-[#5B6479]">Your Escrow Deposit</span>
                      <span className="font-mono text-[#98FFE8] font-bold">
                        ${userPositionUsd.toFixed(2)} mUSDC
                      </span>
                    </div>
                    <button
                      onClick={handleClaimRefund}
                      disabled={isTxPending || isWaitingReceipt}
                      className="w-full py-3.5 rounded-xl text-xs font-bold text-[#161A1D] transition-all shadow-md"
                      style={{ background: "var(--gradient-surge)" }}
                    >
                      {isTxPending && txStep === "REFUNDING"
                        ? "Claiming 100% Refund..."
                        : `Claim 100% Escrow Refund ($${userPositionUsd.toFixed(2)} mUSDC)`}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#5B6479]">
                    You have no active escrow contribution in this facility.
                  </p>
                )}

                {txStep === "REFUND_SUCCESS" && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px]">
                    ✓ Full 100% escrow refund returned directly to your wallet!
                  </div>
                )}
              </div>
            ) : (
              /* Standard Investment Form */
              <div className="space-y-4 pt-2">
                {/* Wallet Balance & Faucet Banner */}
                {isConnected && (
                  <div className="p-3.5 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#5B6479] block text-[11px]">Your Wallet Balance</span>
                      <span className="font-mono font-bold text-[#F2FBF9]">
                        ${userBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDC
                      </span>
                    </div>
                    <button
                      onClick={handleClaimFaucet}
                      disabled={isMintingFaucet}
                      className="px-3 py-1.5 rounded-lg bg-[#98FFE8]/15 border border-[#98FFE8]/40 hover:bg-[#98FFE8]/25 text-[#98FFE8] font-bold text-[11px] transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isMintingFaucet ? (
                        <span>Minting 10k...</span>
                      ) : (
                        <span>+ Faucet: Claim 10,000 mUSDC</span>
                      )}
                    </button>
                  </div>
                )}

                {faucetSuccess && (
                  <p className="text-[11px] text-[#98FFE8] font-semibold bg-[#98FFE8]/10 p-2 rounded border border-[#98FFE8]/20">
                    ✓ 10,000 test mUSDC minted to your wallet on X Layer Testnet!
                  </p>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#5B6479] uppercase tracking-wider block">
                    Investment Amount ($ mUSDC)
                  </label>
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-xl bg-[#161A1D] border border-[#E3E0D6]/20 text-[#F2FBF9] text-sm focus:border-[#98FFE8] focus:outline-none"
                  />
                </div>

                {/* Amount Quick Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {["100", "500", "1000", String(rawAmount)].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setInvestAmount(preset)}
                      className="py-1.5 rounded-lg border border-[#E3E0D6]/10 text-[11px] font-bold text-[#5B6479] hover:text-[#98FFE8] hover:border-[#98FFE8]/30 transition-colors"
                    >
                      ${preset === String(rawAmount) ? "Max" : preset}
                    </button>
                  ))}
                </div>

                {/* Action Button Stepper */}
                <div className="pt-2 space-y-3">
                  {!isConnected ? (
                    <p className="text-xs text-[#5B6479] text-center">Connect wallet to fund tranche positions.</p>
                  ) : needsApproval ? (
                    <button
                      onClick={handleApprove}
                      disabled={isTxPending || isWaitingReceipt || parsedInvestAmount <= 0}
                      className="w-full py-3.5 rounded-xl text-xs font-bold text-[#161A1D] disabled:opacity-50 transition-all shadow-md"
                      style={{ background: "var(--gradient-surge)" }}
                    >
                      {isTxPending && txStep === "APPROVING"
                        ? "Approving mUSDC..."
                        : `Step 1: Approve $${parsedInvestAmount} mUSDC`}
                    </button>
                  ) : (
                    <button
                      onClick={handleInvest}
                      disabled={isTxPending || isWaitingReceipt || parsedInvestAmount <= 0}
                      className="w-full py-3.5 rounded-xl text-xs font-bold text-[#161A1D] disabled:opacity-50 transition-all shadow-md"
                      style={{ background: "var(--gradient-surge)" }}
                    >
                      {isTxPending && txStep === "INVESTING"
                        ? "Depositing into Escrow..."
                        : `Deposit $${parsedInvestAmount} into Escrow`}
                    </button>
                  )}
                </div>

                {/* Success Feedback */}
                {txStep === "SUCCESS" && (
                  <div className="p-4 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/10 text-xs text-[#98FFE8] space-y-1">
                    <span className="font-bold block">✓ Escrow Deposit Confirmed!</span>
                    <p className="text-[11px] text-[#F2FBF9]/80">
                      Your position is held in TrancheVault escrow. Once 100% funded, the listing finalizes onchain.
                    </p>
                  </div>
                )}

                {/* Contract Error Display */}
                {contractError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                    {contractError.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
