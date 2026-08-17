"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectKitButton } from "connectkit";
import { RefluxLockup } from "@/components/ui-reflux/RefluxLockup";

interface HeaderProps {
  /** Mode: "landing" shows anchor links & Launch App button; "app" shows route links & wallet connect pill */
  mode?: "landing" | "app";
}

export function Header({ mode = "landing" }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAppView = mode === "app" || pathname.startsWith("/dashboard") || pathname.startsWith("/browse") || pathname.startsWith("/portfolio");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#161A1D]/90 backdrop-blur-md border-b border-[#E3E0D6]/15 py-3 shadow-lg"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Left: Lockup Logo */}
        <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
          <RefluxLockup size={26} variant="dark" />
        </Link>

        {/* Center-Right: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          {!isAppView ? (
            <>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-[#5B6479] hover:text-[#F2FBF9] transition-colors"
              >
                How It Works
              </a>
              <a
                href="#ai-transparency"
                className="text-sm font-medium text-[#5B6479] hover:text-[#F2FBF9] transition-colors"
              >
                AI Underwriting
              </a>
              <Link
                href="/docs"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/docs" ? "text-[#98FFE8] font-bold" : "text-[#5B6479] hover:text-[#F2FBF9]"
                }`}
              >
                Protocol Guide
              </Link>
              <a
                href="#risk-disclosure"
                className="text-sm font-medium text-[#5B6479] hover:text-[#F2FBF9] transition-colors"
              >
                Risk Framework
              </a>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/dashboard"
                    ? "text-[#98FFE8] font-bold"
                    : "text-[#5B6479] hover:text-[#F2FBF9]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/browse"
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith("/browse")
                    ? "text-[#98FFE8] font-bold"
                    : "text-[#5B6479] hover:text-[#F2FBF9]"
                }`}
              >
                Browse Listings
              </Link>
              <Link
                href="/portfolio"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/portfolio"
                    ? "text-[#98FFE8] font-bold"
                    : "text-[#5B6479] hover:text-[#F2FBF9]"
                }`}
              >
                Portfolio
              </Link>
              <Link
                href="/analytics"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/analytics"
                    ? "text-[#98FFE8] font-bold"
                    : "text-[#5B6479] hover:text-[#F2FBF9]"
                }`}
              >
                Analytics
              </Link>
              <Link
                href="/docs"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/docs"
                    ? "text-[#98FFE8] font-bold"
                    : "text-[#5B6479] hover:text-[#F2FBF9]"
                }`}
              >
                Docs
              </Link>
            </>
          )}
        </nav>

        {/* Right: CTA / Wallet Connect Slot */}
        <div className="hidden md:flex items-center gap-4">
          <ConnectKitButton.Custom>
            {({ isConnected, isConnecting, show, address, chain }) => {
              if (isConnected && address) {
                return (
                  <button
                    onClick={show}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-[#98FFE8]/30 bg-[#161A1D] text-xs font-bold text-[#F2FBF9] hover:border-[#98FFE8]/60 transition-colors shadow-md"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#98FFE8] animate-pulse" />
                    <span>
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    {chain && (
                      <span className="px-1.5 py-0.5 rounded bg-[#98FFE8]/10 text-[10px] text-[#98FFE8]">
                        {chain.name}
                      </span>
                    )}
                  </button>
                );
              }

              if (!isAppView) {
                return (
                  <Link
                    href="/dashboard"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-md"
                    style={{
                      background: "var(--gradient-surge)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Launch App
                  </Link>
                );
              }

              return (
                <button
                  onClick={show}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-md"
                  style={{
                    background: "var(--gradient-surge)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              );
            }}
          </ConnectKitButton.Custom>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#F2FBF9] hover:text-[#98FFE8] focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M18.293 5.293a1 1 0 011.414 1.414L13.414 12l6.293 6.293a1 1 0 01-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 01-1.414-1.414L10.586 12 4.293 5.707a1 1 0 011.414-1.414L12 10.586l6.293-6.293z"
              />
            ) : (
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4 5h16a1 1 0 010 2H4a1 1 0 110-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2z"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#161A1D] border-b border-[#E3E0D6]/20 px-6 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-4">
            {!isAppView ? (
              <>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#5B6479] hover:text-[#F2FBF9]"
                >
                  How It Works
                </a>
                <a
                  href="#ai-transparency"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#5B6479] hover:text-[#F2FBF9]"
                >
                  AI Underwriting
                </a>
                <Link
                  href="/docs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#98FFE8] font-bold"
                >
                  Protocol Guide & Docs
                </Link>
                <a
                  href="#risk-disclosure"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#5B6479] hover:text-[#F2FBF9]"
                >
                  Risk Framework
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#F2FBF9]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/browse"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#5B6479]"
                >
                  Browse Listings
                </Link>
                <Link
                  href="/portfolio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#5B6479]"
                >
                  Portfolio
                </Link>
                <Link
                  href="/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#5B6479]"
                >
                  Analytics
                </Link>
                <Link
                  href="/docs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-[#98FFE8]"
                >
                  Docs & Guide
                </Link>
              </>
            )}
          </nav>

          <div className="pt-2 border-t border-[#E3E0D6]/10">
            {!isAppView ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 rounded-lg text-xs font-bold text-[#161A1D]"
                style={{ background: "var(--gradient-surge)" }}
              >
                Launch App
              </Link>
            ) : (
              <button className="w-full text-center py-2.5 rounded-lg border border-[#E3E0D6]/20 bg-[#161A1D] text-xs font-bold text-[#F2FBF9]">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
