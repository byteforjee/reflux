import Image from "next/image";
import Link from "next/link";
import { RefluxLockup } from "@/components/ui-reflux/RefluxLockup";

export function Footer() {
  return (
    <footer className="w-full bg-[#161A1D] border-t border-[#E3E0D6]/10 pt-16 pb-12 text-[#5B6479]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#E3E0D6]/10">
          {/* Brand Info (Cols 1-5) */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-block">
              <RefluxLockup size={24} variant="dark" />
            </Link>
            <p className="text-xs leading-relaxed text-[#5B6479] max-w-sm" style={{ fontFamily: "var(--font-body)" }}>
              AI-underwritten invoice credit protocol built on X Layer. Real business invoices tokenized into investable credit with automated pro-rata yield settlement.
            </p>
          </div>

          {/* Navigation Columns (Cols 6-12) */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 1: Product */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#F2FBF9] uppercase tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
                Product
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/browse" className="hover:text-[#98FFE8] transition-colors">
                    Browse Listings
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-[#98FFE8] transition-colors">
                    Submit Invoice
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio" className="hover:text-[#98FFE8] transition-colors">
                    Portfolio
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-[#98FFE8] transition-colors">
                    Protocol Guide & Docs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Protocol */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#F2FBF9] uppercase tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
                Protocol
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="https://www.okx.com/xlayer" target="_blank" rel="noreferrer" className="hover:text-[#98FFE8] transition-colors">
                    X Layer L2
                  </a>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-[#98FFE8] transition-colors">
                    Architecture & Scoring
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className="hover:text-[#98FFE8] transition-colors">
                    Transparency Engine
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#F2FBF9] uppercase tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
                Resources
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/docs" className="hover:text-[#98FFE8] transition-colors">
                    Developer Docs
                  </Link>
                </li>
                <li>
                  <a href="https://www.oklink.com/xlayer-test" target="_blank" rel="noreferrer" className="hover:text-[#98FFE8] transition-colors">
                    OKLink Explorer
                  </a>
                </li>
                <li>
                  <a href="#risk-disclosure" className="hover:text-[#98FFE8] transition-colors">
                    Risk Disclosures
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Attribution Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Copyright */}
          <p className="text-xs text-[#5B6479]">
            © {new Date().getFullYear()} Reflux Protocol. Premier Institutional Invoice Credit on X Layer.
          </p>

          {/* Official X Layer Attribution Badge */}
          <div className="flex items-center gap-2.5 opacity-85 hover:opacity-100 transition-opacity">
            <span className="text-[11px] font-medium text-[#5B6479]">Built on</span>
            <Image
              src="/brand/xlayer/XLayer_Logo_White.svg"
              alt="X Layer"
              width={90}
              height={20}
              className="h-5 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
