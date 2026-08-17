"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

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

export default function AnalyticsPage() {
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
        console.error("Failed to fetch analytics invoices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  // Compute Macro Metrics
  const totalVolume = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const activeTvl = invoices.reduce((sum, inv) => sum + Number(inv.fundedAmount || 0), 0);
  const settledRepayments = invoices
    .filter((inv) => inv.status === "repaid")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const scoredInvoices = invoices.filter((inv) => inv.aiApr && !isNaN(Number(inv.aiApr)));
  const avgApr =
    scoredInvoices.length > 0
      ? (
          scoredInvoices.reduce((sum, inv) => sum + Number(inv.aiApr), 0) /
          scoredInvoices.length
        ).toFixed(2)
      : "12.00";

  // Tier Composition Breakdown
  const tierA = invoices.filter((inv) => inv.aiTier === "A");
  const tierB = invoices.filter((inv) => inv.aiTier === "B");
  const tierC = invoices.filter((inv) => inv.aiTier === "C");

  const tierAVolume = tierA.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const tierBVolume = tierB.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const tierCVolume = tierC.reduce((sum, inv) => sum + Number(inv.amount), 0);

  const contracts = [
    {
      name: "AssetRegistry",
      address: CONTRACT_ADDRESSES.xlayerTestnet.assetRegistry,
      desc: "Onchain asset submission & 8-stage lifecycle state machine",
    },
    {
      name: "RiskOracle",
      address: CONTRACT_ADDRESSES.xlayerTestnet.riskOracle,
      desc: "Immutable AI risk score storage (Tier, Score, APR, Rationale)",
    },
    {
      name: "TrancheVault",
      address: CONTRACT_ADDRESSES.xlayerTestnet.trancheVault,
      desc: "Tranche liquidity pool, deposits, repayment & pro-rata payouts",
    },
    {
      name: "MockUSDC",
      address: CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc,
      desc: "6-decimal ERC-20 test stablecoin on X Layer Testnet",
    },
  ];

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E3E0D6]/10">
        <div>
          <span className="text-xs font-semibold text-[#98FFE8] uppercase tracking-wider block mb-1">
            Transparency Engine
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Protocol Analytics & Onchain Verification
          </h1>
          <p className="text-xs text-[#5B6479] mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Real-time protocol metrics, risk tier composition, and verified X Layer contract registries.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D] shadow-md shrink-0"
          style={{ background: "var(--gradient-surge)", fontFamily: "var(--font-body)" }}
        >
          Launch Terminal
        </Link>
      </div>

      {/* ── 1. MACRO METRICS GRID ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-2">
          <span className="text-xs text-[#5B6479] block">Total Volume Tokenized</span>
          <span className="text-2xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
            ${totalVolume.toLocaleString()} <span className="text-xs font-normal text-[#5B6479]">USD</span>
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-[#98FFE8]/30 bg-[#98FFE8]/5 space-y-2">
          <span className="text-xs text-[#98FFE8] font-bold block">Active Protocol TVL</span>
          <span className="text-2xl font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
            ${activeTvl.toLocaleString()} <span className="text-xs font-normal text-[#98FFE8]/80">mUSDC</span>
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-2">
          <span className="text-xs text-[#5B6479] block">Settled Repayments</span>
          <span className="text-2xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
            ${settledRepayments.toLocaleString()} <span className="text-xs font-normal text-[#5B6479]">mUSDC</span>
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-2">
          <span className="text-xs text-[#5B6479] block">Weighted Protocol Yield</span>
          <span className="text-2xl font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
            {avgApr}% APR
          </span>
        </div>
      </div>

      {/* ── 2. RISK TIER BREAKDOWN ─────────────────────────────────────────── */}
      <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
              Gemini AI Risk Composition Breakdown
            </h2>
            <p className="text-xs text-[#5B6479]">
              Risk tier distribution across tokenized credit facilities.
            </p>
          </div>

          <span className="text-xs font-bold text-[#98FFE8] font-mono">
            {invoices.length} Invoices Underwritten
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier A */}
          <div className="p-5 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#98FFE8]/20 text-[#98FFE8] text-xs font-bold">
                Tier A (Prime)
              </span>
              <span className="text-xs font-bold text-[#F2FBF9]">{tierA.length} Facilities</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#5B6479] block">Volume Share</span>
              <span className="text-xl font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
                ${tierAVolume.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-[#5B6479]">Score 80-100 · APR 6.0%–11.9% · Prime credit quality</p>
          </div>

          {/* Tier B */}
          <div className="p-5 rounded-xl border border-amber-400/30 bg-amber-400/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">
                Tier B (Medium)
              </span>
              <span className="text-xs font-bold text-[#F2FBF9]">{tierB.length} Facilities</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#5B6479] block">Volume Share</span>
              <span className="text-xl font-bold text-amber-400" style={{ fontFamily: "var(--font-display)" }}>
                ${tierBVolume.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-[#5B6479]">Score 60-79 · APR 12.0%–17.9% · Medium risk credit</p>
          </div>

          {/* Tier C */}
          <div className="p-5 rounded-xl border border-rose-400/30 bg-rose-400/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-rose-400/20 text-rose-400 text-xs font-bold">
                Tier C (High Yield)
              </span>
              <span className="text-xs font-bold text-[#F2FBF9]">{tierC.length} Facilities</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#5B6479] block">Volume Share</span>
              <span className="text-xl font-bold text-rose-400" style={{ fontFamily: "var(--font-display)" }}>
                ${tierCVolume.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-[#5B6479]">Score 40-59 · APR 18.0%–24.0% · Higher yield / flag risk</p>
          </div>
        </div>
      </div>

      {/* ── 3. ONCHAIN CONTRACT REGISTRY ────────────────────────────────────── */}
      <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
            Onchain Smart Contract Registry (X Layer Testnet)
          </h2>
          <p className="text-xs text-[#5B6479]">
            All core smart contracts deployed on X Layer Testnet (Chain ID 1952). Fully verified code on OKLink explorer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contracts.map((c) => (
            <div
              key={c.name}
              className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-3 hover:border-[#98FFE8]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F2FBF9]">{c.name}</h3>
                <span className="px-2 py-0.5 rounded bg-[#98FFE8]/10 text-[10px] font-bold text-[#98FFE8]">
                  Verified 0.8.24
                </span>
              </div>
              <p className="text-xs text-[#5B6479] leading-relaxed">{c.desc}</p>
              <div className="pt-2 flex items-center justify-between border-t border-[#E3E0D6]/10 text-xs">
                <span className="font-mono text-[11px] text-[#F2FBF9]/80">
                  {c.address.slice(0, 10)}...{c.address.slice(-8)}
                </span>
                <a
                  href={`https://www.oklink.com/xlayer-test/address/${c.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#98FFE8] font-semibold hover:underline flex items-center gap-1"
                >
                  OKLink Explorer ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. RECENT ACTIVITY FEED ─────────────────────────────────────────── */}
      <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
        <h2 className="text-base font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
          Recent Protocol Activity
        </h2>

        {loading ? (
          <p className="text-xs text-[#98FFE8] animate-pulse">Loading activity stream...</p>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-[#5B6479] py-8 text-center border border-dashed border-[#E3E0D6]/10 rounded-xl">
            No recent protocol activity recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {invoices.slice(0, 5).map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F2FBF9]">{inv.debtorName}</span>
                    <span className="text-[#98FFE8] font-mono">${Number(inv.amount).toLocaleString()} USD</span>
                  </div>
                  {inv.aiRationale && (
                    <p className="text-[11px] text-[#5B6479] italic line-clamp-1">
                      &ldquo;{inv.aiRationale}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2.5 py-1 rounded bg-[#98FFE8]/10 text-[#98FFE8] font-bold text-[11px]">
                    {inv.aiTier ? `Tier ${inv.aiTier}` : "Scoring"}
                  </span>
                  <span className="text-[#5B6479] uppercase text-[10px] font-semibold">
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
