"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface InvoiceRecord {
  id: string;
  walletAddress: string;
  amount: number;
  dueDateIso: string;
  debtorName: string;
  ipfsCid: string | null;
  status: string;
  aiRationale: string | null;
  aiTier: string | null;
  aiApr: string | null;
  aiDecision: string | null;
  onchainAssetId: string | null;
  fundedAmount?: number;
  createdAt: string;
}

export default function BrowsePage() {
  const [selectedTier, setSelectedTier] = useState<"ALL" | "A" | "B" | "C">("ALL");
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/invoices");
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
  }, []);

  // Filter listings by tier (and only show listed, funded, or repaid)
  const filteredListings = invoices.filter((inv) => {
    const isMarketplaceStatus = ["listed", "funded", "repaid"].includes(inv.status);
    if (!isMarketplaceStatus) return false;
    if (selectedTier === "ALL") return true;
    return inv.aiTier === selectedTier;
  });

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E3E0D6]/10">
        <div>
          <span className="text-xs font-semibold text-[#98FFE8] uppercase tracking-wider block mb-1">
            X Layer Marketplace
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Browse Invoice Listings
          </h1>
          <p className="text-xs text-[#5B6479] mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Explore AI-underwritten credit listings. Fund tranche positions with stablecoins on X Layer.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-[#5B6479] font-medium mr-2">Filter Risk Tier:</span>
        {(["ALL", "A", "B", "C"] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedTier === tier
                ? "bg-[#98FFE8] text-[#161A1D] shadow-md"
                : "bg-[#161A1D] text-[#5B6479] border border-[#E3E0D6]/10 hover:text-[#F2FBF9]"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {tier === "ALL" ? "All Listings" : `Tier ${tier}`}
          </button>
        ))}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#98FFE8] animate-pulse">
          Loading active invoice listings from X Layer...
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

            return (
              <div
                key={inv.id}
                className="p-6 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-5 hover:-translate-y-1 hover:border-[#98FFE8]/40 transition-all duration-300 flex flex-col justify-between"
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
                      Tier {tier} Approved
                    </span>

                    <span className="text-[11px] font-semibold text-[#5B6479] uppercase">
                      {inv.status}
                    </span>
                  </div>

                  {/* Debtor Name & Amount */}
                  <div>
                    <h3 className="text-base font-bold text-[#F2FBF9] line-clamp-1" style={{ fontFamily: "var(--font-body)" }}>
                      {inv.debtorName}
                    </h3>
                    <div className="text-2xl font-bold text-[#F2FBF9] mt-1" style={{ fontFamily: "var(--font-display)" }}>
                      ${Number(inv.amount).toLocaleString()} <span className="text-xs font-normal text-[#5B6479]">USD</span>
                    </div>
                  </div>

                  {/* APR & Due Date */}
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-[#E3E0D6]/10 text-xs">
                    <div>
                      <span className="text-[#5B6479] block">Assigned APR</span>
                      <span className="font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
                        {apr} APR
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5B6479] block">Due Date</span>
                      <span className="font-medium text-[#F2FBF9]">{inv.dueDateIso}</span>
                    </div>
                  </div>

                  {/* Funding Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5B6479]">
                        ${funded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / ${target.toLocaleString()}
                      </span>
                      <span className="font-bold text-[#98FFE8]">
                        {isFullyFunded ? "100% Funded" : `${pct}% Funded`}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#161A1D] border border-[#E3E0D6]/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1F8F84] to-[#98FFE8] transition-all duration-500"
                        style={{
                          width: `${isFullyFunded ? 100 : Math.max(pct, funded > 0 ? 3 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-2">
                  <Link
                    href={`/browse/${inv.id}`}
                    className="block w-full text-center py-3 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "var(--gradient-surge)" }}
                  >
                    View Listing & Fund →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 border border-dashed border-[#E3E0D6]/10 rounded-2xl bg-[#161A1D]">
          <div className="w-14 h-14 rounded-full bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mx-auto text-[#98FFE8] text-xl">
            🔍
          </div>
          <h3 className="text-base font-bold text-[#F2FBF9]">No Active Listings Found</h3>
          <p className="text-xs text-[#5B6479] max-w-sm mx-auto leading-relaxed">
            There are currently no open invoice credit listings under {selectedTier === "ALL" ? "any tier" : `Tier ${selectedTier}`}. Submit an invoice to start the AI underwriting pipeline!
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/submit"
              className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D]"
              style={{ background: "var(--gradient-surge)" }}
            >
              Submit an Invoice
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
