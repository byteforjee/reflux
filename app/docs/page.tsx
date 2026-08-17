"use client";

import { useState } from "react";
import Link from "next/link";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "GLOSSARY" | "ROUTES" | "UNDERWRITING" | "GUIDES" | "CONTRACTS">("OVERVIEW");

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-12">
      {/* ── Top Header & Hero ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#E3E0D6]/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#98FFE8]/10 border border-[#98FFE8]/20 text-[#98FFE8] text-[11px] font-bold uppercase tracking-wider">
              Protocol Documentation
            </span>
            <span className="text-xs text-[#5B6479]">v1.0.0 · X Layer Testnet (1952)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
            Reflux Protocol Guide & Architecture
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6479] mt-1 max-w-2xl leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            Comprehensive documentation covering institutional credit underwriting, tokenized trade receivables, protocol navigation, mathematical formulas, and onchain settlement.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/browse"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#5B6479] hover:text-[#F2FBF9] border border-[#E3E0D6]/10 hover:border-[#E3E0D6]/30 transition-all"
          >
            Browse Marketplace →
          </Link>
          <Link
            href="/dashboard/submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D] shadow-md hover:opacity-95 transition-opacity"
            style={{ background: "var(--gradient-surge)" }}
          >
            Originate Facility
          </Link>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E3E0D6]/10">
        {[
          { id: "OVERVIEW", label: "1. Protocol Overview" },
          { id: "GLOSSARY", label: "2. Key Terminologies" },
          { id: "ROUTES", label: "3. Application Routes" },
          { id: "UNDERWRITING", label: "4. AI Underwriting Model" },
          { id: "GUIDES", label: "5. User Workflows" },
          { id: "CONTRACTS", label: "6. Onchain Contracts" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-[#98FFE8] text-[#161A1D] shadow-md"
                : "text-[#5B6479] hover:text-[#F2FBF9] hover:bg-[#161A1D]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: PROTOCOL OVERVIEW ───────────────────────────────────────── */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
            <h2 className="text-xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
              The Reflux Protocol Thesis
            </h2>
            <p className="text-xs sm:text-sm text-[#F2FBF9]/80 leading-relaxed">
              Global commercial trade is constrained by over <strong>$3 Trillion</strong> in locked, unpaid invoices. Small and medium enterprises (SMEs) routinely wait 30 to 90 days for corporate debtors to settle invoices, creating severe working capital bottlenecks.
            </p>
            <p className="text-xs sm:text-sm text-[#F2FBF9]/80 leading-relaxed">
              <strong>Reflux</strong> bridges real-world enterprise accounts receivable with decentralized liquidity on <strong>X Layer</strong>. Businesses tokenize commercial invoices into audited collateral assets, Google Gemini AI objectively prices credit risk, global liquidity providers fund tranches with stablecoins, and debtor settlements automatically distribute pro-rata returns.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#E3E0D6]/10">
              <div className="p-5 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 space-y-2">
                <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider block">1. Instant Liquidity</span>
                <p className="text-xs text-[#5B6479] leading-relaxed">
                  Convert 60-day enterprise receivables into instant working capital without traditional banking delays.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 space-y-2">
                <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider block">2. Objective AI Risk</span>
                <p className="text-xs text-[#5B6479] leading-relaxed">
                  Institutional multi-factor credit underwriting with automated pricing and immutable onchain risk scores.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 space-y-2">
                <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider block">3. Ethereum L2 Security</span>
                <p className="text-xs text-[#5B6479] leading-relaxed">
                  Built on X Layer using Polygon CDK zkEVM rollups for near-instant transaction finality and sub-cent gas fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: KEY TERMINOLOGIES ────────────────────────────────────────── */}
      {activeTab === "GLOSSARY" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                Protocol Glossary & Concepts
              </h2>
              <p className="text-xs text-[#5B6479] mt-1">
                Standard financial and technical definitions used throughout the Reflux ecosystem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  term: "Trade Receivable / Commercial Invoice",
                  desc: "A legally binding claim for payment held by a business against an enterprise client for delivered goods or completed services.",
                },
                {
                  term: "Invoice Face Value",
                  desc: "The total gross payment amount stated on the invoice in USD, which the corporate debtor is obligated to settle at maturity.",
                },
                {
                  term: "Maturity / Payment Due Date",
                  desc: "The contractual date on which the invoice becomes due for settlement. Must be in the future for onchain asset origination.",
                },
                {
                  term: "Cryptographic SHA-256 Fingerprint",
                  desc: "A 256-bit hash generated in your browser from the original document binary, anchored onchain to prove document authenticity without exposing private trade data.",
                },
                {
                  term: "Decentralized Storage Hash (IPFS)",
                  desc: "Content-addressed decentralized storage identifier ensuring the collateral document is permanently accessible for auditability.",
                },
                {
                  term: "Credit Quality Score (0–100)",
                  desc: "A quantitative index generated by the Gemini underwriting model reflecting debtor reliability, repayment tenor, and industry risk.",
                },
                {
                  term: "Risk Tiers (A, B, C)",
                  desc: "Categorization based on credit quality: Tier A (Prime, 80-100 score), Tier B (Medium, 60-79 score), and Tier C (High Yield, 40-59 score).",
                },
                {
                  term: "Assigned APR & Basis Points",
                  desc: "The market-clearing annualized percentage rate assigned by AI underwriting (e.g., 8.50% APR = 850 basis points).",
                },
                {
                  term: "Tranche Liquidity Vault",
                  desc: "Smart contract pool (TrancheVault.sol) where investor stablecoins are held and tracked pro-rata against individual credit facilities.",
                },
                {
                  term: "Paying Agent Settlement Protocol",
                  desc: "The operational model where corporate repayment proceeds are deposited onchain into the vault, transitioning status to Repaid and unlocking investor payouts.",
                },
                {
                  term: "mUSDC (Mock USD Coin)",
                  desc: "The official 6-decimal test stablecoin deployed on X Layer Testnet (0xD84509d311700d7946439E66DD6573138d79bBCb) simulating Circle USDC tokenomics for tranche deposits and settlement claims.",
                },
                {
                  term: "1-Click Testnet Faucet",
                  desc: "An unrestricted test token minting feature built directly into the Reflux interface (/browse/[id] and /portfolio), allowing users to claim 10,000 mUSDC test liquidity with 1 click.",
                },
                {
                  term: "All-or-Nothing Funding Window",
                  desc: "A protective escrow mechanism where listings must achieve 100% target funding before an onchain deadline. Eliminates partial-tokenization ambiguity and protects investor capital.",
                },
                {
                  term: "100% Escrow Refund Guarantee",
                  desc: "If an invoice does not reach 100% funding by its deadline, it transitions to Expired Unfunded and all contributors can withdraw 100% of their deposited principal with 0 fees.",
                },
              ].map((item, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2 hover:border-[#98FFE8]/30 transition-colors">
                  <h3 className="text-xs font-bold text-[#98FFE8]">{item.term}</h3>
                  <p className="text-xs text-[#5B6479] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: APPLICATION ROUTES ───────────────────────────────────────── */}
      {activeTab === "ROUTES" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                Application Routes & Navigation Map
              </h2>
              <p className="text-xs text-[#5B6479] mt-1">
                Explore each dedicated terminal and route across the Reflux application.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  route: "/",
                  name: "Landing Terminal",
                  type: "Public",
                  desc: "Protocol introductory homepage featuring real-time trust metrics, interactive APR yield calculators, animated petal visuals, and core value propositions.",
                },
                {
                  route: "/dashboard",
                  name: "Borrower Operations Terminal",
                  type: "Authenticated",
                  desc: "Originator command center to view active credit lines, review total originated capital, monitor pending AI evaluations, and initiate new collateral tokenization.",
                },
                {
                  route: "/dashboard/submit",
                  name: "Origination & Intake Wizard",
                  type: "Interactive",
                  desc: "Three-step facility intake: 1) Client-side document upload & SHA-256 hashing, 2) Facility terms entry, 3) Onchain asset registration on AssetRegistry.sol & automated AI credit underwriting.",
                },
                {
                  route: "/browse",
                  name: "Investor Marketplace",
                  type: "Public / Web3",
                  desc: "Filterable marketplace displaying all approved invoice tranches. Filter by Tier A (Prime), Tier B (Medium), or Tier C (High Yield) with live APR badges and funding progress bars.",
                },
                {
                  route: "/browse/[id]",
                  name: "Facility Deep Dive & Investment",
                  type: "Interactive",
                  desc: "In-depth credit profile displaying the Gemini risk rationale, decentralized IPFS proof links, debtor parameters, and the two-step stablecoin deposit interface (Approve + Invest).",
                },
                {
                  route: "/portfolio",
                  name: "Investor Portfolio & Payouts",
                  type: "Authenticated",
                  desc: "Liquidity provider portal reading onchain positions from TrancheVault.sol, displaying active deposits, claimable settlement yields, and executing 1-click payout withdrawals.",
                },
                {
                  route: "/analytics",
                  name: "Transparency Engine",
                  type: "Public",
                  desc: "Real-time protocol transparency hub displaying total volume, active TVL, cumulative settlements, average weighted APR, risk composition, verified contracts, and live activity stream.",
                },
                {
                  route: "Reflux AI Copilot",
                  name: "Global AI Underwriting Chatbot",
                  type: "Global Widget",
                  desc: "Floating assistant embedded across all pages, equipped with institutional credit knowledge to answer underwriting questions, explain risk tiers, and verify data privacy.",
                },
              ].map((r, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#98FFE8] font-bold">{r.route}</span>
                      <span className="text-xs font-bold text-[#F2FBF9]">{r.name}</span>
                    </div>
                    <p className="text-xs text-[#5B6479] leading-relaxed">{r.desc}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#E3E0D6]/5 border border-[#E3E0D6]/10 text-[10px] font-bold text-[#5B6479] uppercase self-start sm:self-center shrink-0">
                    {r.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: AI UNDERWRITING MODEL ───────────────────────────────────── */}
      {activeTab === "UNDERWRITING" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                Automated Credit Risk Underwriting Engine
              </h2>
              <p className="text-xs text-[#5B6479] mt-1">
                How Google Gemini AI evaluates invoice collateral and calculates market-clearing yield.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/5 space-y-4">
              <h3 className="text-sm font-bold text-[#98FFE8]">The Underwriting Pipeline</h3>
              <p className="text-xs text-[#F2FBF9]/90 leading-relaxed">
                When an invoice is registered onchain, our backend invokes Google Gemini (<code>gemini-flash-latest</code>) with an institutional credit underwriting rubric. The engine evaluates:
              </p>
              <ul className="text-xs text-[#5B6479] space-y-2 list-disc list-inside">
                <li><strong>Debtor Credit Quality:</strong> Enterprise track record, public financial standing, and default risk.</li>
                <li><strong>Facility Duration (Tenor):</strong> Time to maturity (30–90 days) and liquidity premium.</li>
                <li><strong>Concentration Risk:</strong> Single debtor exposure relative to aggregate protocol volume.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-[#98FFE8]/30 bg-[#161A1D] space-y-3">
                <span className="px-3 py-1 rounded-full bg-[#98FFE8]/20 text-[#98FFE8] text-xs font-bold">Tier A (Prime)</span>
                <div className="space-y-1">
                  <span className="text-xl font-bold text-[#F2FBF9] block">Score 80 – 100</span>
                  <span className="text-sm font-bold text-[#98FFE8]">6.00% – 11.99% APR</span>
                </div>
                <p className="text-xs text-[#5B6479] leading-relaxed">
                  Established investment-grade corporate debtors with proven historical cash flows and minimal default probability.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-amber-400/30 bg-[#161A1D] space-y-3">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">Tier B (Medium Risk)</span>
                <div className="space-y-1">
                  <span className="text-xl font-bold text-[#F2FBF9] block">Score 60 – 79</span>
                  <span className="text-sm font-bold text-amber-400">12.00% – 17.99% APR</span>
                </div>
                <p className="text-xs text-[#5B6479] leading-relaxed">
                  Mid-market commercial counterparties with stable performance requiring a moderate yield risk premium.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-rose-400/30 bg-[#161A1D] space-y-3">
                <span className="px-3 py-1 rounded-full bg-rose-400/20 text-rose-400 text-xs font-bold">Tier C (High Yield)</span>
                <div className="space-y-1">
                  <span className="text-xl font-bold text-[#F2FBF9] block">Score 40 – 59</span>
                  <span className="text-sm font-bold text-rose-400">18.00% – 24.00% APR</span>
                </div>
                <p className="text-xs text-[#5B6479] leading-relaxed">
                  Higher-yielding receivables with shorter operating histories or non-standard contractual terms.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-3">
              <h3 className="text-xs font-bold text-[#5B6479] uppercase tracking-wider">
                Immutable Onchain Oracle Settlement
              </h3>
              <p className="text-xs text-[#F2FBF9]/80 leading-relaxed">
                Once evaluated, the structured underwriting result (Tier, Score, APR bps, Rationale) is signed by the protocol oracle key and broadcast to <strong>RiskOracle.sol</strong>. Scores cannot be retroactively altered by originators or investors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: USER WORKFLOWS ───────────────────────────────────────────── */}
      {activeTab === "GUIDES" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                Step-by-Step User Workflows
              </h2>
              <p className="text-xs text-[#5B6479] mt-1">
                Walkthroughs for business originators, liquidity providers, and paying agents.
              </p>
            </div>

            {/* Workflow 1: Borrowers */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider block">
                Workflow A: Business Invoice Originator (Borrower)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2">
                  <span className="text-xs font-bold text-[#F2FBF9]">Step 1: Upload Collateral</span>
                  <p className="text-xs text-[#5B6479]">
                    Navigate to <code>/dashboard/submit</code>. Drag and drop your B2B commercial invoice (PDF). Client-side SHA-256 hash is computed instantly.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2">
                  <span className="text-xs font-bold text-[#F2FBF9]">Step 2: Enter Parameters</span>
                  <p className="text-xs text-[#5B6479]">
                    Input invoice face value, maturity due date, and verified debtor company name.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2">
                  <span className="text-xs font-bold text-[#F2FBF9]">Step 3: Sign & Underwrite</span>
                  <p className="text-xs text-[#5B6479]">
                    Sign the mint transaction in your wallet on X Layer Testnet. Gemini AI scores the facility and lists it on the Marketplace.
                  </p>
                </div>
              </div>
            </div>

            {/* Workflow 2: Investors */}
            <div className="space-y-4 pt-4 border-t border-[#E3E0D6]/10">
              <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider block">
                Workflow B: Liquidity Provider (Investor)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2">
                  <span className="text-xs font-bold text-[#F2FBF9]">Step 1: Browse Tranches</span>
                  <p className="text-xs text-[#5B6479]">
                    Visit <code>/browse</code>, filter listings by Risk Tier (A, B, C), and select an invoice facility.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 space-y-2">
                  <span className="text-xs font-bold text-[#98FFE8]">Step 2: Claim Test mUSDC</span>
                  <p className="text-xs text-[#5B6479]">
                    Click the <strong>&ldquo;+ Faucet: Claim 10,000 mUSDC&rdquo;</strong> button directly on the listing page or in your portfolio.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2">
                  <span className="text-xs font-bold text-[#F2FBF9]">Step 3: Deposit Stablecoins</span>
                  <p className="text-xs text-[#5B6479]">
                    Review the AI underwriting summary, approve mUSDC allowance, and deposit into the TrancheVault.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2">
                  <span className="text-xs font-bold text-[#F2FBF9]">Step 4: Claim Settlement Yield</span>
                  <p className="text-xs text-[#5B6479]">
                    Once repaid, visit <code>/portfolio</code> and click <strong>Claim Payout</strong> to withdraw principal + accrued yield.
                  </p>
                </div>
              </div>
            </div>

            {/* Workflow 3: Settlement */}
            <div className="space-y-4 pt-4 border-t border-[#E3E0D6]/10">
              <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider block">
                Workflow C: Maturity Settlement & Payout Unlocking
              </span>
              <div className="p-5 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-2">
                <span className="text-xs font-bold text-[#F2FBF9]">Debtor Repayment & Pro-Rata Yield Distribution</span>
                <p className="text-xs text-[#5B6479] leading-relaxed">
                  Upon invoice maturity, trade receivable funds (principal + accrued yield) are settled into the smart contracts. The vault automatically calculates the yield distribution:
                  <code className="block my-2 text-[11px] text-[#98FFE8] bg-[#161A1D] p-2 rounded border border-[#E3E0D6]/10">
                    Total Repayment = Principal + (Principal × APR% × (Term Days / 365))
                  </code>
                  This transitions the facility state to <strong>Repaid</strong> and enables all tranche investors to claim their pro-rata returns directly from their portfolio terminal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: ONCHAIN CONTRACTS ───────────────────────────────────────── */}
      {activeTab === "CONTRACTS" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                Verified Smart Contracts & Network Specifications
              </h2>
              <p className="text-xs text-[#5B6479] mt-1">
                Live deployed Solidity 0.8.24 contracts verified on OKLink block explorer.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[#5B6479] block">Network</span>
                  <span className="font-bold text-[#F2FBF9]">X Layer Testnet</span>
                </div>
                <div>
                  <span className="text-[#5B6479] block">Chain ID</span>
                  <span className="font-mono font-bold text-[#98FFE8]">1952 (0x7a0)</span>
                </div>
                <div>
                  <span className="text-[#5B6479] block">Primary RPC</span>
                  <span className="font-mono text-[11px] text-[#F2FBF9]">https://testrpc.xlayer.tech</span>
                </div>
                <div>
                  <span className="text-[#5B6479] block">Native Gas Token</span>
                  <span className="font-bold text-[#98FFE8]">OKB</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  name: "AssetRegistry.sol",
                  address: CONTRACT_ADDRESSES.xlayerTestnet.assetRegistry,
                  desc: "Source of truth for invoice lifecycle (Submitted, Scored, Listed, Funded, Repaid). Holds document hashes and face values.",
                },
                {
                  name: "RiskOracle.sol",
                  address: CONTRACT_ADDRESSES.xlayerTestnet.riskOracle,
                  desc: "Immutable onchain credit risk ledger storing Gemini risk tier, numeric score, APR basis points, and qualitative rationale.",
                },
                {
                  name: "TrancheVault.sol",
                  address: CONTRACT_ADDRESSES.xlayerTestnet.trancheVault,
                  desc: "Non-custodial liquidity vault managing stablecoin deposits, pro-rata tranche ownership, repayment intake, and payout claims.",
                },
                {
                  name: "MockUSDC.sol (mUSDC Stablecoin & Faucet)",
                  address: CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc,
                  desc: "Standard 6-decimal test stablecoin with 1-click faucet minting functions used for liquidity deposits and settlement payouts on X Layer Testnet.",
                },
              ].map((c) => (
                <div key={c.name} className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#F2FBF9]">{c.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-[#98FFE8]/10 text-[10px] font-bold text-[#98FFE8]">
                      Verified
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
        </div>
      )}
    </div>
  );
}
