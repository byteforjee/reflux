import Image from "next/image";
import Link from "next/link";
import { RefluxLockup } from "@/components/ui-reflux/RefluxLockup";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#161A1D] text-[#F2FBF9]">
      {/* ── 1. HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Background Petal Animation (Low Opacity Ambient Mark) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none opacity-[0.04]">
          <svg
            width="640"
            height="640"
            viewBox="0 0 100 100"
            fill="var(--accent-mint)"
            className="reflux-petal-rotate"
            aria-hidden="true"
          >
            {([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const).map(
              (deg) => (
                <path
                  key={deg}
                  d="M50,42 C47.2,34 46,26 46,18 A4.3,4.3 0 0 0 54,18 C54,26 52.8,34 50,42 Z"
                  transform={`rotate(${deg} 50 50)`}
                />
              )
            )}
          </svg>
        </div>

        {/* Ambient Gradient Glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] -z-20 pointer-events-none opacity-20"
          style={{ background: "var(--gradient-surge)" }}
        />

        {/* Hackathon Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#98FFE8]/30 bg-[#161A1D]/80 backdrop-blur-md mb-8">
          <span className="w-2 h-2 rounded-full bg-[#98FFE8] animate-pulse" />
          <span
            className="text-xs font-semibold tracking-wide text-[#98FFE8]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Institutional RWA Invoice Credit on X Layer
          </span>
        </div>

        {/* Hero Headline */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#F2FBF9] max-w-4xl leading-[1.1] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          AI-Underwritten <br className="hidden sm:inline" />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-surge)" }}
          >
            Invoice Credit Protocol
          </span>
        </h1>

        {/* Hero Subhead */}
        <p
          className="text-base sm:text-xl text-[#5B6479] max-w-2xl leading-relaxed mb-10"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Reflux tokenizes real business invoices into investable onchain credit. AI prices risk in seconds, investors fund liquidity directly on X Layer.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-[#161A1D] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#98FFE8]/10 text-center"
            style={{
              background: "var(--gradient-surge)",
              fontFamily: "var(--font-body)",
            }}
          >
            Launch Terminal
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-[#F2FBF9] border border-[#98FFE8]/30 hover:border-[#98FFE8] bg-[#98FFE8]/5 hover:bg-[#98FFE8]/10 transition-all text-center flex items-center justify-center gap-2"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <span>Protocol Guide & Docs</span>
            <span className="text-[#98FFE8]">→</span>
          </Link>
        </div>
      </section>

      {/* ── 2. TRUST BAR ────────────────────────────────────────────────────── */}
      <section className="border-y border-[#E3E0D6]/10 bg-[#161A1D]/60 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-70 text-xs font-semibold text-[#5B6479]">
          <div className="flex items-center gap-2">
            <span>POWERED BY</span>
            <Image
              src="/brand/xlayer/XLayer_Logo_White.svg"
              alt="X Layer"
              width={80}
              height={18}
              className="h-4 w-auto"
            />
          </div>
          <div className="h-3 w-[1px] bg-[#E3E0D6]/10 hidden sm:block" />
          <span>OKX L2 AGGLAYER</span>
          <div className="h-3 w-[1px] bg-[#E3E0D6]/10 hidden sm:block" />
          <span>EVM EQUIVALENT</span>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2
            className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How Reflux Works
          </h2>
          <p className="text-sm sm:text-base text-[#5B6479]">
            A seamless 4-step workflow bridging real business invoices to onchain capital markets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 backdrop-blur-sm hover:-translate-y-1 hover:border-[#98FFE8]/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mb-6 text-[#98FFE8] font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
              01
            </div>
            <h3 className="text-base font-bold text-[#F2FBF9] mb-2" style={{ fontFamily: "var(--font-body)" }}>
              Submit Invoice
            </h3>
            <p className="text-xs text-[#5B6479] leading-relaxed">
              Business uploads an unpaid B2B invoice with debtor info. The document binary is pinned safely to IPFS.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 backdrop-blur-sm hover:-translate-y-1 hover:border-[#98FFE8]/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mb-6 text-[#98FFE8] font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
              02
            </div>
            <h3 className="text-base font-bold text-[#F2FBF9] mb-2" style={{ fontFamily: "var(--font-body)" }}>
              AI Risk Underwriting
            </h3>
            <p className="text-xs text-[#5B6479] leading-relaxed">
              Gemini AI analyzes credit quality, assigning an instant risk tier (A/B/C), APR rate, and structured rationale written onchain.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 backdrop-blur-sm hover:-translate-y-1 hover:border-[#98FFE8]/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mb-6 text-[#98FFE8] font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
              03
            </div>
            <h3 className="text-base font-bold text-[#F2FBF9] mb-2" style={{ fontFamily: "var(--font-body)" }}>
              Onchain Funding
            </h3>
            <p className="text-xs text-[#5B6479] leading-relaxed">
              Investors browse verified listings and purchase tranche positions with stablecoins on X Layer.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 backdrop-blur-sm hover:-translate-y-1 hover:border-[#98FFE8]/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center mb-6 text-[#98FFE8] font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
              04
            </div>
            <h3 className="text-base font-bold text-[#F2FBF9] mb-2" style={{ fontFamily: "var(--font-body)" }}>
              Pro-Rata Settlement
            </h3>
            <p className="text-xs text-[#5B6479] leading-relaxed">
              When the debtor settles offchain, proceeds are deposited to trigger automated pro-rata payout to token holders.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. AI TRANSPARENCY WORKED EXAMPLE ─────────────────────────────── */}
      <section id="ai-transparency" className="py-24 px-6 bg-[#161A1D]/40 border-y border-[#E3E0D6]/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Description */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-block px-3 py-1 rounded-md bg-[#98FFE8]/10 text-[#98FFE8] text-xs font-bold uppercase tracking-wider">
              AI Credit Engine
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#F2FBF9] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              Transparent, AI-Driven Credit Pricing
            </h2>
            <p className="text-sm text-[#5B6479] leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
              Reflux does not rely on subjective underwriting or multi-week factoring review cycles. Every invoice is priced instantly by Gemini AI, generating an immutable onchain rationale for complete investor transparency.
            </p>
            <div className="space-y-3 pt-2 text-xs text-[#F2FBF9] font-medium">
              <div className="flex items-center gap-2">
                <span className="text-[#98FFE8]">✓</span> Instant risk tiering (Tier A Prime, Tier B Upper Medium, Tier C Medium)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#98FFE8]">✓</span> Automated APR calculation based on counterparty & maturity
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#98FFE8]">✓</span> Onchain immutable record stored in RiskOracle contract
              </div>
            </div>
          </div>

          {/* Right Worked Example Card */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-2xl border border-[#98FFE8]/30 bg-[#161A1D] shadow-2xl relative overflow-hidden group hover:border-[#98FFE8]/60 transition-colors">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E3E0D6]/10">
                <div>
                  <span className="text-[11px] font-semibold text-[#5B6479] uppercase tracking-wider block">
                    Underwriting Sample #INV-8492
                  </span>
                  <h3 className="text-lg font-bold text-[#F2FBF9] mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                    Acme Global Freight Services
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#98FFE8]/10 text-[#98FFE8] border border-[#98FFE8]/30 text-xs font-bold">
                    Tier A Approved
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-6 py-6 border-b border-[#E3E0D6]/10">
                <div>
                  <span className="text-xs text-[#5B6479] block mb-1">Invoice Value</span>
                  <span className="text-xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                    $45,000
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#5B6479] block mb-1">Risk Score</span>
                  <span className="text-xl font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
                    88 / 100
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#5B6479] block mb-1">Assigned Yield</span>
                  <span className="text-xl font-bold text-[#98FFE8]" style={{ fontFamily: "var(--font-display)" }}>
                    8.75% APR
                  </span>
                </div>
              </div>

              {/* Rationale Quote Box */}
              <div className="pt-6 space-y-2">
                <span className="text-xs font-bold text-[#5B6479] uppercase tracking-wider block">
                  AI Rationale Output
                </span>
                <p className="text-xs sm:text-sm text-[#F2FBF9]/90 italic leading-relaxed bg-[#161A1D] p-4 rounded-xl border border-[#E3E0D6]/10">
                  &ldquo;The $45,000 receivable represents a manageable ticket size backed by an established logistics counterparty with clear commercial utility. Standard 60-day payment terms and verifiable documentation indicate low counterparty risk. Approved under Tier A prime terms for listing.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. RISK DISCLOSURE STRIP ───────────────────────────────────────── */}
      <section id="risk-disclosure" className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="p-6 sm:p-8 rounded-xl border border-[#E3E0D6]/15 bg-[#161A1D]/90 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-[#98FFE8]">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19H3.5L12 5.5zM11 10h2v4h-2zm0 5h2v2h-2z" />
            </svg>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
              Protocol Architecture & Risk Disclosures
            </h3>
          </div>

          <p className="text-xs text-[#5B6479] leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            Reflux operates an onchain marketplace for tokenized real-world invoice credit. Repayment is processed via a designated paying-agent mechanism that receives offchain debtor settlements and triggers onchain pro-rata distribution. AI scoring performs first-pass plausibility and anomaly checks. New submitters are subject to trust-tier volume caps. Yield is generated from real invoice repayment, not token emissions.
          </p>
        </div>
      </section>

      {/* ── PROTOCOL GUIDE & DOCUMENTATION CALLOUT ───────────────────────────── */}
      <section className="py-12 px-6 max-w-7xl mx-auto w-full">
        <div className="p-8 sm:p-10 rounded-2xl border border-[#98FFE8]/30 bg-[#98FFE8]/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider block">
              Knowledge Base & Complete User Guide
            </span>
            <h3 className="text-2xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
              New to Reflux Protocol?
            </h3>
            <p className="text-xs sm:text-sm text-[#5B6479] max-w-xl leading-relaxed">
              Explore our full documentation covering key terminologies, step-by-step borrower and investor guides, AI underwriting formulas, and onchain contract verification on X Layer.
            </p>
          </div>

          <Link
            href="/docs"
            className="px-6 py-3.5 rounded-xl text-xs font-bold text-[#161A1D] shadow-md hover:opacity-95 transition-opacity shrink-0 flex items-center gap-2"
            style={{ background: "var(--gradient-surge)" }}
          >
            <span>Read Protocol Guide & Docs</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── 6. FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full text-center">
        <div className="p-12 sm:p-16 rounded-2xl border border-[#98FFE8]/20 bg-gradient-to-b from-[#161A1D] to-[#1F8F84]/10 relative overflow-hidden space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
            Ready to Experience AI-Underwritten Credit?
          </h2>
          <p className="text-sm sm:text-base text-[#5B6479] max-w-xl mx-auto">
            Submit an invoice for instant AI pricing or explore open credit listings on X Layer Testnet.
          </p>
          <div className="pt-4">
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 rounded-xl text-sm font-bold text-[#161A1D] transition-transform hover:scale-105 active:scale-95 shadow-xl"
              style={{ background: "var(--gradient-surge)", fontFamily: "var(--font-body)" }}
            >
              Launch Reflux App
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
