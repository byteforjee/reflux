"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { xlayerMainnet } from "@/lib/chain/config";

interface InvoiceRecord {
  id: string;
  walletAddress: string;
  amount: number;
  dueDateIso: string;
  debtorName: string;
  ipfsCid: string | null;
  documentHash: string | null;
  status: string;
  aiRationale: string | null;
  aiTier: string | null;
  aiApr: string | null;
  aiDecision: string | null;
  onchainAssetId: string | null;
  fundedAmount: number | string;
  fundingDeadline?: number | null;
  fundingDeadlineIso?: string | null;
  isExpiredUnfunded?: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  resubmissionCount: number;
  parentSubmissionId: string | null;
  network?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"issuer" | "investor">("issuer");
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isMainnet = chainId === xlayerMainnet.id;
  const activeNetworkKey = isMainnet ? "xlayerMainnet" : "xlayerTestnet";

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRationale, setSelectedRationale] = useState<{ debtor: string; rationale: string; tier: string | null; score: string | null; apr: string | null } | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!address) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?walletAddress=${address.toLowerCase()}&network=${activeNetworkKey}`);
      const json = await res.json();
      if (json.data) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch user invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [address, activeNetworkKey]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Compute Metrics for connected issuer
  const totalSubmissions = invoices.length;
  const pendingScoring = invoices.filter((inv) => ["submitted", "scoring"].includes(inv.status)).length;
  const totalFundedValue = invoices
    .filter((inv) => ["funded", "repaid"].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.amount), 0) +
    invoices
      .filter((inv) => inv.status === "listed")
      .reduce((sum, inv) => sum + Number(inv.fundedAmount || 0), 0);

  // Compute Countdown Helper
  const getDueCountdown = (dueDateIso: string) => {
    const diffMs = new Date(dueDateIso).getTime() - Date.now();
    if (diffMs <= 0) return "Matured";
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days === 1) return "Due in 1 day";
    return `Due in ${days} days`;
  };

  const getFundingWindowCountdown = (deadlineIso?: string | null) => {
    if (!deadlineIso) return null;
    const diffMs = new Date(deadlineIso).getTime() - Date.now();
    if (diffMs <= 0) return "Funding Window Closed";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h funding runway`;
  };

  // Handle State-Gated Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModalInvoice || !address) return;
    setCancelling(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/invoices/${cancelModalInvoice.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          reason: cancelReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to cancel listing");
      }

      setActionSuccess(`Listing for "${cancelModalInvoice.debtorName}" has been successfully cancelled.`);
      setCancelModalInvoice(null);
      setCancelReason("");
      fetchInvoices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E3E0D6]/10">
        <div>
          <span className="text-xs font-semibold text-[#98FFE8] uppercase tracking-wider block mb-1">
            Reflux Terminal
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Protocol Dashboard
          </h1>
          <p className="text-xs text-[#5B6479] mt-1" style={{ fontFamily: "var(--font-body)" }}>
            {isConnected && address
              ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
              : "Connect your wallet to manage invoice credit facilities or track positions."}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/submit"
            className="px-5 py-3 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
            style={{
              background: "var(--gradient-surge)",
              fontFamily: "var(--font-body)",
            }}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span>Originate New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Role Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E3E0D6]/10">
        <button
          onClick={() => setActiveTab("issuer")}
          className={`px-5 py-3 text-xs font-bold transition-all relative border-b-2 ${
            activeTab === "issuer"
              ? "text-[#98FFE8] border-[#98FFE8]"
              : "text-[#5B6479] border-transparent hover:text-[#F2FBF9]"
          }`}
          style={{ fontFamily: "var(--font-body)" }}
        >
          Issuer View (My Invoices)
        </button>
        <button
          onClick={() => setActiveTab("investor")}
          className={`px-5 py-3 text-xs font-bold transition-all relative border-b-2 ${
            activeTab === "investor"
              ? "text-[#98FFE8] border-[#98FFE8]"
              : "text-[#5B6479] border-transparent hover:text-[#F2FBF9]"
          }`}
          style={{ fontFamily: "var(--font-body)" }}
        >
          Investor View (Market Overview)
        </button>
      </div>

      {/* Action Notification Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/10 text-xs text-[#98FFE8] flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-[#98FFE8] font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-300 font-bold">✕</button>
        </div>
      )}

      {/* ── ISSUER VIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === "issuer" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-2">
              <span className="text-xs text-[#5B6479] block">Total Invoices Submitted</span>
              <span className="text-2xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                {totalSubmissions}
              </span>
            </div>
            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-2">
              <span className="text-xs text-[#5B6479] block">Pending AI Risk Scoring</span>
              <span className="text-2xl font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
                {pendingScoring}
              </span>
            </div>
            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-2">
              <span className="text-xs text-[#5B6479] block">Total Funded Capital</span>
              <span className="text-2xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                ${totalFundedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Submissions Section */}
          <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
                  My Invoice Credit Facilities
                </h3>
                <p className="text-xs text-[#5B6479] mt-0.5">
                  Real-time lifecycle tracking, AI underwriting results, and funding progress.
                </p>
              </div>
              <button
                onClick={fetchInvoices}
                className="text-xs text-[#98FFE8] hover:underline font-semibold flex items-center gap-1"
              >
                ↻ Refresh
              </button>
            </div>

            {!isConnected ? (
              <div className="py-16 text-center space-y-4 border border-dashed border-[#E3E0D6]/10 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mx-auto text-[#98FFE8]">
                  🔒
                </div>
                <p className="text-xs text-[#5B6479] max-w-sm mx-auto">
                  Please connect your Web3 wallet to view your submitted invoice credit facilities.
                </p>
              </div>
            ) : loading ? (
              <div className="py-16 text-center text-xs text-[#98FFE8] animate-pulse">
                Fetching credit facilities from X Layer...
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center space-y-4 border border-dashed border-[#E3E0D6]/10 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mx-auto text-[#98FFE8]">
                  📄
                </div>
                <p className="text-xs text-[#5B6479] max-w-sm mx-auto">
                  No invoice submissions found for your connected wallet. Click &ldquo;Originate New Invoice&rdquo; to tokenize commercial receivables.
                </p>
                <Link
                  href="/dashboard/submit"
                  className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-[#161A1D]"
                  style={{ background: "var(--gradient-surge)" }}
                >
                  Originate Facility
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv) => {
                  const targetAmount = Number(inv.amount);
                  const fundedAmount = Number(inv.fundedAmount || 0);
                  const isFullyFunded = inv.status === "funded" || inv.status === "repaid";
                  const displayFunded = isFullyFunded ? targetAmount : fundedAmount;
                  const fundingPercent = targetAmount > 0 ? Math.min(100, Math.round((displayFunded / targetAmount) * 100)) : 0;
                  const isCancellable = (inv.status === "listed" || inv.status === "submitted") && fundedAmount === 0;

                  return (
                    <div
                      key={inv.id}
                      className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 hover:border-[#98FFE8]/20 transition-all space-y-4"
                    >
                      {/* Top Row: Debtor & Status Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-bold text-[#F2FBF9]">{inv.debtorName}</h4>
                            <span className="font-mono text-xs text-[#98FFE8] font-bold">
                              ${targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                            </span>
                          </div>
                          <span className="text-[11px] text-[#5B6479]">
                            Facility ID: #INV-{inv.id.slice(0, 8)} · Submitted {new Date(inv.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Status & Tier Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {inv.aiTier && (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                inv.aiTier === "A"
                                  ? "bg-[#98FFE8]/10 text-[#98FFE8] border border-[#98FFE8]/30"
                                  : inv.aiTier === "B"
                                  ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                                  : "bg-rose-400/10 text-rose-400 border border-rose-400/30"
                              }`}
                            >
                              Tier {inv.aiTier} · {inv.aiApr ? `${inv.aiApr}% APR` : ""}
                            </span>
                          )}

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              inv.status === "repaid"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : inv.status === "funded"
                                ? "bg-[#98FFE8]/10 text-[#98FFE8] border border-[#98FFE8]/30"
                                : inv.status === "listed"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                : inv.status === "expired_unfunded"
                                ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30"
                                : inv.status === "cancelled"
                                ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30"
                                : inv.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {inv.status === "expired_unfunded" ? "Expired Unfunded" : inv.status}
                          </span>
                        </div>
                      </div>

                      {/* Middle Grid: Progress & Maturity */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-3 border-t border-[#E3E0D6]/10 text-xs">
                        {/* Funding Progress (Cols 1-6) */}
                        <div className="md:col-span-6 space-y-2">
                          <div className="flex items-center justify-between text-[#5B6479]">
                            <span>Funding Progress ({fundingPercent}%)</span>
                            <span className="font-mono text-[#F2FBF9]">
                              ${displayFunded.toLocaleString()} / ${targetAmount.toLocaleString()} USDC
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#161A1D] border border-[#E3E0D6]/10 overflow-hidden">
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${fundingPercent}%`,
                                background: "var(--gradient-surge)",
                              }}
                            />
                          </div>
                        </div>

                        {/* Maturity & Tenor (Cols 7-12) */}
                        <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-6 text-[#5B6479]">
                          {inv.status === "listed" && inv.fundingDeadlineIso && (
                            <div>
                              <span className="block text-[11px]">Funding Window</span>
                              <span className="font-bold text-amber-400">
                                {getFundingWindowCountdown(inv.fundingDeadlineIso)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="block text-[11px]">Payment Due Date</span>
                            <span className="font-bold text-[#F2FBF9]">{inv.dueDateIso}</span>
                          </div>
                          <div>
                            <span className="block text-[11px]">Maturity</span>
                            <span className="font-bold text-[#98FFE8]">{getDueCountdown(inv.dueDateIso)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E3E0D6]/10 text-xs">
                        <div className="flex items-center gap-3">
                          {inv.aiRationale && (
                            <button
                              onClick={() =>
                                setSelectedRationale({
                                  debtor: inv.debtorName,
                                  rationale: inv.aiRationale || "",
                                  tier: inv.aiTier,
                                  score: null,
                                  apr: inv.aiApr,
                                })
                              }
                              className="text-[#98FFE8] hover:underline font-semibold flex items-center gap-1"
                            >
                              🔍 View AI Underwriting Rationale
                            </button>
                          )}
                          {inv.resubmissionCount > 0 && (
                            <span className="text-[#5B6479] text-[11px] bg-[#161A1D] px-2 py-0.5 rounded border border-[#E3E0D6]/10">
                              Attempt #{inv.resubmissionCount + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Cancel Listing Button (State-gated) */}
                          {inv.status === "listed" && (
                            <button
                              onClick={() => setCancelModalInvoice(inv)}
                              disabled={!isCancellable}
                              title={
                                !isCancellable
                                  ? "Cancellation permanently disabled: Liquidity providers have committed capital"
                                  : "Cancel listing"
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isCancellable
                                  ? "text-rose-400 border border-rose-500/30 hover:bg-rose-500/10"
                                  : "text-[#5B6479] border border-[#E3E0D6]/10 cursor-not-allowed opacity-50"
                              }`}
                            >
                              Cancel Listing
                            </button>
                          )}

                          {/* Resubmit Option if rejected or flagged */}
                          {(inv.status === "rejected" || inv.status === "flagged") && (
                            <Link
                              href={`/dashboard/submit?parent=${inv.id}&debtor=${encodeURIComponent(inv.debtorName)}&amount=${inv.amount}&resubmitCount=${(inv.resubmissionCount || 0) + 1}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#161A1D] shadow-sm hover:opacity-90"
                              style={{ background: "var(--gradient-surge)" }}
                            >
                              Resubmit Facility →
                            </Link>
                          )}

                          {/* Marketplace Link */}
                          {(inv.status === "listed" || inv.status === "funded") && (
                            <Link
                              href={`/browse/${inv.id}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#98FFE8] border border-[#98FFE8]/30 hover:bg-[#98FFE8]/10"
                            >
                              View Listing ↗
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INVESTOR VIEW TAB ───────────────────────────────────────────────── */}
      {activeTab === "investor" && (
        <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                Liquidity Provider Command Center
              </h3>
              <p className="text-xs text-[#5B6479] mt-1">
                Fund underwritten enterprise invoices and earn transparent pro-rata yield.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/portfolio"
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#F2FBF9] border border-[#E3E0D6]/15 hover:border-[#98FFE8]/40"
              >
                My Portfolio Positions →
              </Link>
              <Link
                href="/browse"
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#161A1D]"
                style={{ background: "var(--gradient-surge)" }}
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: AI RATIONALE DEEP DIVE ────────────────────────────────────── */}
      {selectedRationale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-xl w-full p-6 rounded-2xl border border-[#98FFE8]/30 bg-[#161A1D] space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E3E0D6]/10 pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#98FFE8] uppercase tracking-wider block">
                  Gemini Underwriting Report
                </span>
                <h3 className="text-base font-bold text-[#F2FBF9]">{selectedRationale.debtor}</h3>
              </div>
              <button
                onClick={() => setSelectedRationale(null)}
                className="text-[#5B6479] hover:text-[#F2FBF9] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-[#E3E0D6]/10 bg-[#161A1D]/60 space-y-1">
                <span className="text-[#5B6479] block">Assigned Credit Tier</span>
                <span className="font-bold text-[#98FFE8] text-sm">
                  {selectedRationale.tier ? `Tier ${selectedRationale.tier}` : "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-[#E3E0D6]/10 bg-[#161A1D]/60 space-y-1">
                <span className="text-[#5B6479] block">Market-Clearing APR</span>
                <span className="font-bold text-[#98FFE8] text-sm">
                  {selectedRationale.apr ? `${selectedRationale.apr}% APR` : "N/A"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#5B6479] uppercase tracking-wider block">
                Underwriting Rationale Output
              </span>
              <p className="text-xs sm:text-sm text-[#F2FBF9]/90 italic leading-relaxed bg-[#161A1D]/80 p-4 rounded-xl border border-[#E3E0D6]/10">
                &ldquo;{selectedRationale.rationale}&rdquo;
              </p>
            </div>

            <div className="pt-2 border-t border-[#E3E0D6]/10 flex justify-end">
              <button
                onClick={() => setSelectedRationale(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-[#161A1D]"
                style={{ background: "var(--gradient-surge)" }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: STATE-GATED CANCELLATION CONFIRMATION ─────────────────────── */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 rounded-2xl border border-rose-500/30 bg-[#161A1D] space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E3E0D6]/10 pb-4">
              <h3 className="text-base font-bold text-rose-400">Cancel Facility Listing</h3>
              <button
                onClick={() => setCancelModalInvoice(null)}
                className="text-[#5B6479] hover:text-[#F2FBF9] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#F2FBF9]/80 leading-relaxed">
              <p>
                You are about to cancel the listing for <strong>{cancelModalInvoice.debtorName}</strong> (${Number(cancelModalInvoice.amount).toLocaleString()} USD).
              </p>
              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-[11px] space-y-1">
                <span className="font-bold block">Anti-Reroll Policy Notice:</span>
                <span>
                  Cancellation is only allowed while zero investor capital has been funded. Repeated cancellations count against your submitter trust score.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#5B6479] block">Reason for Cancellation (Optional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Terms adjusted, invoice settled directly"
                className="w-full px-3 py-2 rounded-lg bg-[#161A1D] border border-[#E3E0D6]/15 text-xs text-[#F2FBF9] focus:outline-none focus:border-[#98FFE8]/50"
              />
            </div>

            <div className="pt-4 border-t border-[#E3E0D6]/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setCancelModalInvoice(null)}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg text-xs font-bold text-[#5B6479] hover:text-[#F2FBF9]"
              >
                Keep Listing
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
