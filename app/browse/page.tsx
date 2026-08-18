"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useChainId } from "wagmi";
import { xlayerMainnet, xlayerTestnet } from "@/lib/chain/config";

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
  network?: string;
  createdAt: string;
}

export default function BrowsePage() {
  const chainId = useChainId();
  const isMainnet = chainId === xlayerMainnet.id;
  const activeNetworkKey = isMainnet ? "xlayerMainnet" : "xlayerTestnet";

  const [selectedTier, setSelectedTier] = useState<"ALL" | "A" | "B" | "C">("ALL");
  const [selectedStatusTab, setSelectedStatusTab] = useState<"ALL" | "OPEN" | "COMPLETED">("ALL");
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true);
      try {
        const res = await fetch(`/api/invoices?network=${activeNetworkKey}`);
        const json = await res.json();
        if (json.data) {
          setInvoices(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, [activeNetworkKey]);

  // Filter listings by tier and status tab
  const filteredListings = invoices.filter((inv) => {
    const isMarketplaceStatus = ["listed", "funded", "repaid"].includes(inv.status);
    if (!isMarketplaceStatus) return false;

    const funded = Number(inv.fundedAmount || 0);
    const target = Number(inv.amount || 1);
    const pct = target > 0 ? (funded / target) * 100 : 0;
    const isCompleted = inv.status === "funded" || inv.status === "repaid" || pct >= 100;

    // Status tab filter
    if (selectedStatusTab === "OPEN" && isCompleted) return false;
    if (selectedStatusTab === "COMPLETED" && !isCompleted) return false;

    // Tier filter
    if (selectedTier === "ALL") return true;
    return inv.aiTier === selectedTier;
  });

  const openCount = invoices.filter((inv) => {
    const funded = Number(inv.fundedAmount || 0);
    const target = Number(inv.amount || 1);
    const pct = target > 0 ? (funded / target) * 100 : 0;
    return ["listed"].includes(inv.status) && pct < 100;
  }).length;

  const completedCount = invoices.filter((inv) => {
    const funded = Number(inv.fundedAmount || 0);
    const target = Number(inv.amount || 1);
    const pct = target > 0 ? (funded / target) * 100 : 0;
    return inv.status === "funded" || inv.status === "repaid" || pct >= 100;
  }).length;

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E3E0D6]/10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-xs font-semibold text-[#98FFE8] uppercase tracking-wider block">
              X Layer Marketplace
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                isMainnet
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                  : "bg-[#98FFE8]/10 text-[#98FFE8] border border-[#98FFE8]/30"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? "bg-emerald-400" : "bg-[#98FFE8]"} animate-pulse`} />
              {isMainnet ? "Mainnet Real Facilities" : "Testnet Sandbox"}
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Browse Invoice Listings
          </h1>
          <p className="text-xs text-[#5B6479] mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Explore institutional AI-underwritten credit tranches. Verified collateral isolated strictly to {isMainnet ? "X Layer Mainnet" : "X Layer Testnet"}.
          </p>
        </div>

        <Link
          href="/dashboard/submit"
          className="self-start md:self-auto px-5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-md flex items-center gap-2"
          style={{ background: "var(--gradient-surge)" }}
        >
          <span>+ Originate New Invoice</span>
        </Link>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl bg-[#121517] border border-[#E3E0D6]/10">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-[#161A1D] p-1 rounded-xl border border-[#E3E0D6]/10">
          <button
            onClick={() => setSelectedStatusTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedStatusTab === "ALL"
                ? "bg-[#98FFE8] text-[#161A1D] shadow-sm"
                : "text-[#5B6479] hover:text-[#F2FBF9]"
            }`}
          >
            All Listings ({invoices.length})
          </button>
          <button
            onClick={() => setSelectedStatusTab("OPEN")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedStatusTab === "OPEN"
                ? "bg-[#98FFE8] text-[#161A1D] shadow-sm"
                : "text-[#5B6479] hover:text-[#F2FBF9]"
            }`}
          >
            Open for Funding ({openCount})
          </button>
          <button
            onClick={() => setSelectedStatusTab("COMPLETED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedStatusTab === "COMPLETED"
                ? "bg-emerald-400 text-[#161A1D] shadow-sm"
                : "text-[#5B6479] hover:text-[#F2FBF9]"
            }`}
          >
            Fully Funded / Completed ({completedCount})
          </button>
        </div>

        {/* Tier Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#5B6479] font-medium mr-1 uppercase font-mono">Tier:</span>
          {(["ALL", "A", "B", "C"] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedTier === tier
                  ? "bg-[#161A1D] text-[#98FFE8] border border-[#98FFE8]/50"
                  : "text-[#5B6479] hover:text-[#F2FBF9]"
              }`}
            >
              {tier === "ALL" ? "All" : `Tier ${tier}`}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#98FFE8] animate-pulse">
          Loading {isMainnet ? "X Layer Mainnet" : "X Layer Testnet"} invoice listings...
        </div>
      ) : filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((inv) => {
            const apr = inv.aiApr ? `${inv.aiApr}%` : "12.0%";
            const tier = inv.aiTier || "A";
            const funded = Number(inv.fundedAmount || 0);
            const target = Number(inv.amount || 1);
            const pct = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 0;
            const isFullyFunded = inv.status === "funded" || inv.status === "repaid" || pct >= 100;
            const tokenSymbol = isMainnet ? "USDC" : "mUSDC";

            return (
              <div
                key={inv.id}
                className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                  isFullyFunded
                    ? "border-emerald-500/30 bg-[#121816]/60 hover:border-emerald-500/60"
                    : "border-[#E3E0D6]/10 bg-[#161A1D] hover:-translate-y-1 hover:border-[#98FFE8]/40"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Badge & Status */}
                  <div className="flex items-center justify-between">
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

                    {isFullyFunded ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        100% Completed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#98FFE8]/10 text-[#98FFE8] border border-[#98FFE8]/30">
                        Open for Funding
                      </span>
                    )}
                  </div>

                  {/* Debtor Name & Amount */}
                  <div>
                    <h3
                      className="text-xl font-bold text-[#F2FBF9] truncate"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {inv.debtorName}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                        ${Number(inv.amount).toLocaleString()}
                      </span>
                      <span className="text-xs text-[#5B6479] font-mono">{tokenSymbol}</span>
                    </div>
                  </div>

                  {/* Escrow Funding Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#5B6479]">Funding Status</span>
                      <span className={isFullyFunded ? "text-emerald-300 font-bold" : "text-[#98FFE8] font-bold"}>
                        {isFullyFunded ? "100% Complete" : `${pct}% Funded`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#121517] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isFullyFunded
                            ? "bg-emerald-400"
                            : "bg-gradient-to-r from-[#1F8F84] to-[#98FFE8]"
                        }`}
                        style={{ width: `${Math.max(pct, funded > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#5B6479] font-mono">
                      <span>${funded.toLocaleString()} deposited</span>
                      <span>Target: ${Number(inv.amount).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E3E0D6]/10 text-xs">
                    <div>
                      <span className="text-[11px] text-[#5B6479] block">Underwritten APR</span>
                      <span className="font-bold text-[#98FFE8] font-mono text-sm">{apr}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#5B6479] block">Due Date</span>
                      <span className="font-bold text-[#F2FBF9] text-xs">{inv.dueDateIso}</span>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="pt-6">
                  {isFullyFunded ? (
                    <Link
                      href={`/browse/${inv.id}`}
                      className="block w-full text-center py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-bold text-emerald-300 hover:bg-emerald-950/40 transition-colors"
                    >
                      View Facility Details (Closed) →
                    </Link>
                  ) : (
                    <Link
                      href={`/browse/${inv.id}`}
                      className="block w-full text-center py-2.5 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-md"
                      style={{ background: "var(--gradient-surge)" }}
                    >
                      Fund Tranche Position →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center space-y-4 rounded-2xl border border-dashed border-[#E3E0D6]/20 bg-[#161A1D]/40">
          <div className="text-3xl">📂</div>
          <h3 className="text-lg font-bold text-[#F2FBF9]">No Active Listings Found</h3>
          <p className="text-xs text-[#5B6479] max-w-md mx-auto">
            There are currently no {selectedStatusTab !== "ALL" ? selectedStatusTab.toLowerCase() : ""} invoice listings matching your filter on {isMainnet ? "X Layer Mainnet" : "X Layer Testnet"}.
          </p>
          <Link
            href="/dashboard/submit"
            className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D]"
            style={{ background: "var(--gradient-surge)" }}
          >
            Originate First Facility
          </Link>
        </div>
      )}
    </div>
  );
}
