"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectKitButton } from "connectkit";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { formatUnits } from "viem";
import { xlayerMainnet, xlayerTestnet } from "@/lib/chain/config";
import { RefluxLockup } from "@/components/ui-reflux/RefluxLockup";

interface HeaderProps {
  /** Mode: "landing" shows anchor links & Launch App button; "app" shows route links & wallet connect pill */
  mode?: "landing" | "app";
}

export function Header({ mode = "landing" }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // Query live native OKB balance for the current active chain
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    chainId,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close network dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNetworkDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAppView =
    mode === "app" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/browse") ||
    pathname.startsWith("/portfolio") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/admin");

  const isMainnet = chainId === xlayerMainnet.id;
  const isTestnet = chainId === xlayerTestnet.id;

  const formattedOkbBalance = balanceData
    ? Number(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)
    : "0.0000";

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
        await refetchBalance();
      }
    } catch (err) {
      console.error("Network switch error:", err);
    } finally {
      setNetworkDropdownOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#161A1D]/90 backdrop-blur-md border-b border-[#E3E0D6]/15 py-3 shadow-lg"
          : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Lockup Logo */}
        <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
          <RefluxLockup size={26} variant="dark" />
        </Link>

        {/* Center-Right: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-7">
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

        {/* Right: Network Selector + OKB Balance + Wallet Button */}
        <div className="hidden sm:flex items-center gap-3">
          {isConnected && (
            <>
              {/* Network Selector Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    isMainnet
                      ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:border-emerald-400"
                      : isTestnet
                      ? "border-[#98FFE8]/40 bg-[#98FFE8]/10 text-[#98FFE8] hover:border-[#98FFE8]"
                      : "border-amber-500/40 bg-amber-950/30 text-amber-300 hover:border-amber-400"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isMainnet
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                        : isTestnet
                        ? "bg-[#98FFE8] shadow-[0_0_8px_rgba(152,255,232,0.8)] animate-pulse"
                        : "bg-amber-400 animate-ping"
                    }`}
                  />
                  <span>
                    {isMainnet
                      ? "X Layer Mainnet"
                      : isTestnet
                      ? "X Layer Testnet"
                      : "Switch Network"}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      networkDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {networkDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#161A1D] border border-[#E3E0D6]/20 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5B6479] px-3 py-1 mb-1">
                      Select Network
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSwitchNetwork(xlayerMainnet.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isMainnet
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "text-[#F2FBF9] hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        <span>X Layer Mainnet</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        Live
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchNetwork(xlayerTestnet.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold mt-1 transition-colors ${
                        isTestnet
                          ? "bg-[#98FFE8]/15 text-[#98FFE8] border border-[#98FFE8]/30"
                          : "text-[#F2FBF9] hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#98FFE8] shadow-[0_0_6px_rgba(152,255,232,0.8)]" />
                        <span>X Layer Testnet</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#98FFE8]/80 bg-[#98FFE8]/10 px-1.5 py-0.5 rounded">
                        Sandbox
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Native OKB Balance Pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E3E0D6]/15 bg-[#121517] text-xs font-mono font-bold text-[#F2FBF9] shadow-inner"
                title={`Native OKB Gas Balance on ${isMainnet ? "X Layer Mainnet" : "X Layer Testnet"}`}
              >
                <span className="text-[#98FFE8] font-sans font-semibold text-[11px]">OKB</span>
                <span>{formattedOkbBalance}</span>
              </div>
            </>
          )}

          {/* Connect Wallet / Address Pill */}
          <ConnectKitButton.Custom>
            {({ isConnected, isConnecting, show, address }) => {
              if (isConnected && address) {
                return (
                  <button
                    onClick={show}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#98FFE8]/30 bg-[#161A1D] text-xs font-bold text-[#F2FBF9] hover:border-[#98FFE8]/60 transition-colors shadow-md"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#98FFE8]" />
                    <span>
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </button>
                );
              }

              if (!isAppView) {
                return (
                  <Link
                    href="/dashboard"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-md"
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
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-md"
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
          className="lg:hidden p-2 text-[#F2FBF9] hover:text-[#98FFE8] focus:outline-none"
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
        <div className="lg:hidden bg-[#161A1D] border-b border-[#E3E0D6]/20 px-6 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {isConnected && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#121517] border border-[#E3E0D6]/10 mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-[#5B6479]">Active Network</span>
                <span className="text-xs font-bold text-[#F2FBF9]">
                  {isMainnet ? "X Layer Mainnet" : isTestnet ? "X Layer Testnet" : "Unknown"}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-mono text-[#5B6479]">Native OKB</span>
                <span className="text-xs font-mono font-bold text-[#98FFE8]">{formattedOkbBalance} OKB</span>
              </div>
            </div>
          )}

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

          <div className="pt-3 border-t border-[#E3E0D6]/10 flex flex-col gap-2.5">
            {isConnected && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchNetwork(xlayerMainnet.id)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isMainnet
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-[#121517] text-[#5B6479] border-[#E3E0D6]/10"
                  }`}
                >
                  Mainnet
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchNetwork(xlayerTestnet.id)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isTestnet
                      ? "bg-[#98FFE8]/20 text-[#98FFE8] border-[#98FFE8]/40"
                      : "bg-[#121517] text-[#5B6479] border-[#E3E0D6]/10"
                  }`}
                >
                  Testnet
                </button>
              </div>
            )}

            <ConnectKitButton.Custom>
              {({ isConnected, isConnecting, show, address }) => {
                if (isConnected && address) {
                  return (
                    <button
                      onClick={show}
                      className="w-full text-center py-2.5 rounded-xl border border-[#98FFE8]/30 bg-[#161A1D] text-xs font-bold text-[#F2FBF9]"
                    >
                      Connected: {address.slice(0, 6)}...{address.slice(-4)}
                    </button>
                  );
                }
                return (
                  <button
                    onClick={show}
                    disabled={isConnecting}
                    className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-[#161A1D]"
                    style={{ background: "var(--gradient-surge)" }}
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </button>
                );
              }}
            </ConnectKitButton.Custom>
          </div>
        </div>
      )}
    </header>
  );
}
