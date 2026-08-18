"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useChainId } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { CONTRACT_ADDRESSES, trancheVaultAbi, mockUsdcAbi } from "@/lib/contracts";
import { xlayerTestnet, xlayerMainnet } from "@/lib/chain/config";

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
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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
}

const DEFAULT_ADMIN_ALLOWLIST = [
  "0xfdf43ee9ee87374126d7b14107cf512891cc3bd5",
  "0x9bea067a3aa1f1cd309eda2fe87747a998a4cf80",
];

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const isMainnet = chainId === xlayerMainnet.id;
  const currentChain = isMainnet ? xlayerMainnet : xlayerTestnet;

  const usdcAddress = isMainnet
    ? (CONTRACT_ADDRESSES.xlayerMainnet.usdc as `0x${string}`)
    : (CONTRACT_ADDRESSES.xlayerTestnet.mockUsdc as `0x${string}`);
  const trancheVaultAddress = isMainnet
    ? (CONTRACT_ADDRESSES.xlayerMainnet.trancheVault as `0x${string}`)
    : (CONTRACT_ADDRESSES.xlayerTestnet.trancheVault as `0x${string}`);

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [txStep, setTxStep] = useState<"IDLE" | "APPROVING" | "REPAYING" | "SUCCESS" | "ERROR">("IDLE");
  const [isMintingFaucet, setIsMintingFaucet] = useState(false);
  const [isServerSettling, setIsServerSettling] = useState(false);
  const [serverSettleResult, setServerSettleResult] = useState<{ success: boolean; txHash?: string } | null>(null);

  // Wagmi contract hooks
  const { writeContract, writeContractAsync, data: txHash, isPending: isTxPending, error: contractError } = useWriteContract();
  const { isLoading: isWaitingReceipt, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Read admin allowlist from public env var + defaults
  const allowlistRaw = process.env.NEXT_PUBLIC_ADMIN_ALLOWLIST || "";
  const envAllowlist = allowlistRaw.split(",").map((addr) => addr.trim().toLowerCase()).filter(Boolean);
  const fullAllowlist = Array.from(new Set([...DEFAULT_ADMIN_ALLOWLIST, ...envAllowlist]));
  const isAuthorizedAdmin = isConnected && address && fullAllowlist.includes(address.toLowerCase());

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (json.data) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter funded or listed invoices for settlement
  const eligibleInvoices = invoices.filter((inv) => ["funded", "listed"].includes(inv.status));

  // Auto-select first eligible invoice
  useEffect(() => {
    if (eligibleInvoices.length > 0 && !selectedInvoice) {
      setSelectedInvoice(eligibleInvoices[0]);
    }
  }, [eligibleInvoices, selectedInvoice]);

  // Compute calculated repayment amount (Principal + 30 days yield at assigned APR)
  const calculateRepayment = (inv: InvoiceRecord) => {
    const principal = Number(inv.amount);
    const aprPercent = inv.aiApr ? Number(inv.aiApr) : 12.0;
    const yieldAmount = principal * (aprPercent / 100) * (30 / 365);
    return Math.round((principal + yieldAmount) * 100) / 100;
  };

  const activeRepaymentTotal = selectedInvoice ? calculateRepayment(selectedInvoice) : 0;
  const repaymentUnits = BigInt(Math.round(activeRepaymentTotal * 10 ** 6));

  // Read allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && trancheVaultAddress ? [address, trancheVaultAddress] : undefined,
  });

  // Read balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: usdcAddress,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const userBalanceUsd = balanceData ? Number(BigInt(balanceData.toString())) / 10 ** 6 : 0;
  const currentAllowance = allowanceData ? BigInt(allowanceData.toString()) : BigInt(0);
  const needsApproval = currentAllowance < repaymentUnits;

  // 1-Click Faucet for Paying Agent (Testnet only)
  const handleClaimAdminFaucet = async () => {
    if (!address || isMainnet) return;
    setIsMintingFaucet(true);
    try {
      const tx = await writeContractAsync({
        address: usdcAddress,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [address, BigInt(25_000 * 10 ** 6)], // 25,000 mUSDC
        chainId: xlayerTestnet.id,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
      await refetchBalance();
    } catch (err) {
      console.error("Admin faucet error:", err);
    } finally {
      setIsMintingFaucet(false);
    }
  };

  // Execute Approve
  const handleApproveRepayment = () => {
    if (!selectedInvoice) return;
    setTxStep("APPROVING");
    writeContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [trancheVaultAddress, repaymentUnits],
      chainId: currentChain.id,
    });
  };

  // Execute Simulate Repayment directly with wallet
  const handleSimulateRepayment = () => {
    if (!selectedInvoice) return;
    setTxStep("REPAYING");
    const assetId = BigInt(selectedInvoice.onchainAssetId || "1");

    writeContract({
      address: trancheVaultAddress,
      abi: trancheVaultAbi,
      functionName: "simulateRepayment",
      args: [assetId, repaymentUnits],
      chainId: currentChain.id,
    });
  };

  // Server-side instant settlement fallback
  const handleServerSideSettle = async () => {
    if (!selectedInvoice) return;
    setIsServerSettling(true);
    setServerSettleResult(null);
    try {
      const assetId = selectedInvoice.onchainAssetId || "1";
      const res = await fetch("/api/admin/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          repaymentAmountUsd: activeRepaymentTotal,
          network: isMainnet ? "xlayerMainnet" : "xlayerTestnet",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setServerSettleResult({ success: true, txHash: data.txHash });
        setTxStep("SUCCESS");
        await fetchInvoices();
      } else {
        throw new Error(data.error || "Server-side settlement failed");
      }
    } catch (err) {
      console.error("Server settlement error:", err);
      setServerSettleResult({ success: false });
    } finally {
      setIsServerSettling(false);
    }
  };

  useEffect(() => {
    if (isTxSuccess) {
      if (txStep === "APPROVING") {
        setTxStep("IDLE");
        refetchAllowance();
      } else if (txStep === "REPAYING") {
        setTxStep("SUCCESS");
        refetchBalance();
        refetchAllowance();
        fetchInvoices();
      }
    }
  }, [isTxSuccess, txStep, refetchAllowance, refetchBalance]);

  return (
    <div className="min-h-screen py-12 px-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E3E0D6]/10">
        <div>
          <span className="text-xs font-semibold text-[#98FFE8] uppercase tracking-wider block mb-1">
            Protocol Operations
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F2FBF9]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Institutional Settlement Gateway
          </h1>
          <p className="text-xs text-[#5B6479] mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Administer debtor settlement payouts and execute pro-rata tranche yields on X Layer.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-bold text-[#5B6479] hover:text-[#98FFE8] transition-colors"
        >
          ← Return to Dashboard
        </Link>
      </div>

      {/* ACCESS GATE DISCLOSURE */}
      {!isAuthorizedAdmin ? (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-5 max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 text-xl">
            🔒
          </div>
          <h2 className="text-lg font-bold text-[#F2FBF9]">Paying Agent Authorization Required</h2>
          <p className="text-xs text-[#5B6479] leading-relaxed max-w-md mx-auto">
            {isConnected && address
              ? `Connected wallet (${address.slice(0, 6)}...${address.slice(-4)}) is not in the designated paying agent allowlist.`
              : "Connect your designated paying agent wallet to access protocol settlement functions."}
          </p>

          <div className="pt-2 flex justify-center">
            <ConnectKitButton.Custom>
              {({ isConnected, show, truncatedAddress }) => (
                <button
                  onClick={show}
                  className="px-6 py-3 rounded-xl text-xs font-bold text-[#161A1D] transition-transform hover:scale-105 shadow-md"
                  style={{ background: "var(--gradient-surge)" }}
                >
                  {isConnected ? `Switch Wallet (${truncatedAddress})` : "Connect Paying Agent Wallet"}
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SIMULATED SETTLEMENT DISCLOSURE BANNER */}
          <div className="p-6 rounded-2xl border border-[#98FFE8]/30 bg-[#98FFE8]/5 space-y-2">
            <div className="flex items-center gap-2 text-[#98FFE8] text-xs font-bold uppercase tracking-wider">
              <span>⚡ Paying Agent Settlement Protocol</span>
            </div>
            <p className="text-xs text-[#F2FBF9]/90 leading-relaxed">
              Debtor repayments are administered via the designated paying agent gateway. Depositing debtor settlement proceeds into <span className="font-mono text-[#98FFE8]">TrancheVault</span> transitions the facility status to <span className="font-bold text-[#98FFE8]">Repaid</span> and unlocks pro-rata yield payouts for liquidity providers.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-1">
              <span className="text-xs text-[#5B6479]">Eligible for Repayment</span>
              <span className="text-2xl font-bold text-[#98FFE8] block" style={{ fontFamily: "var(--font-display)" }}>
                {eligibleInvoices.length} Listings
              </span>
            </div>
            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-1">
              <span className="text-xs text-[#5B6479]">Admin Wallet Status</span>
              <span className="text-sm font-mono text-[#98FFE8] block mt-1">
                {address?.slice(0, 6)}...{address?.slice(-4)} (Authorized)
              </span>
            </div>
            <div className="p-6 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-1">
              <span className="text-xs text-[#5B6479]">Target Network</span>
              <span className="text-sm font-bold text-[#F2FBF9] block mt-1">
                X Layer Testnet (1952)
              </span>
            </div>
          </div>

          {/* Main Repayment Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Eligible Invoices List (Cols 1-6) */}
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-xs font-bold text-[#5B6479] uppercase tracking-wider">
                Select Facility for Settlement
              </h2>

              {loading ? (
                <div className="py-12 text-center text-xs text-[#98FFE8] animate-pulse">
                  Loading active facilities from X Layer...
                </div>
              ) : eligibleInvoices.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-[#E3E0D6]/10 bg-[#161A1D] text-center space-y-2">
                  <p className="text-xs text-[#5B6479]">No eligible facilities currently pending repayment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eligibleInvoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    const calculatedTotal = calculateRepayment(inv);

                    return (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setTxStep("IDLE");
                          setServerSettleResult(null);
                        }}
                        className={`p-5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#98FFE8] bg-[#161A1D] shadow-lg shadow-[#98FFE8]/5"
                            : "border-[#E3E0D6]/10 bg-[#161A1D]/60 hover:border-[#E3E0D6]/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#F2FBF9]">{inv.debtorName}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.status === "funded"
                                ? "bg-[#98FFE8]/10 text-[#98FFE8]"
                                : "bg-amber-400/10 text-amber-400"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs">
                          <div>
                            <span className="text-[#5B6479] block text-[11px]">Principal Facility</span>
                            <span className="font-bold text-[#F2FBF9]">${Number(inv.amount).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#5B6479] block text-[11px]">Assigned Yield</span>
                            <span className="font-bold text-[#98FFE8]">{inv.aiApr || "8.5"}% APR</span>
                          </div>
                          <div>
                            <span className="text-[#5B6479] block text-[11px]">Total Repayment</span>
                            <span className="font-bold text-[#98FFE8]">${calculatedTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Settlement Action Card (Cols 7-12) */}
            <div className="lg:col-span-6 space-y-6">
              {selectedInvoice ? (
                <div className="p-6 rounded-2xl border border-[#E3E0D6]/15 bg-[#161A1D] space-y-6">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[#5B6479] block">Selected Facility Target</span>
                    <h3 className="text-2xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                      {selectedInvoice.debtorName}
                    </h3>
                  </div>

                  {/* Repayment Calculation Breakdown */}
                  <div className="p-4 rounded-xl border border-[#E3E0D6]/10 bg-[#161A1D]/80 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5B6479]">Principal Repayment Amount</span>
                      <span className="font-mono text-[#F2FBF9] font-bold">
                        ${Number(selectedInvoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} mUSDC
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5B6479]">Accrued Yield (Assigned {selectedInvoice.aiApr || "8.5"}% APR)</span>
                      <span className="font-mono text-[#98FFE8] font-bold">
                        +${(activeRepaymentTotal - Number(selectedInvoice.amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDC
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#E3E0D6]/10 text-sm font-bold">
                      <span className="text-[#F2FBF9]">Total Repayment Payout Pool</span>
                      <span className="font-mono text-[#98FFE8]">
                        ${activeRepaymentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} mUSDC
                      </span>
                    </div>
                  </div>

                  {/* Paying Agent Wallet Balance & Faucet */}
                  <div className="p-3.5 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#5B6479] block text-[11px]">Paying Agent Balance</span>
                      <span className="font-mono font-bold text-[#F2FBF9]">
                        ${userBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDC
                      </span>
                    </div>
                    <button
                      onClick={handleClaimAdminFaucet}
                      disabled={isMintingFaucet}
                      className="px-3 py-1.5 rounded-lg bg-[#98FFE8]/15 border border-[#98FFE8]/30 hover:bg-[#98FFE8]/25 text-[#98FFE8] text-[11px] font-bold transition-all disabled:opacity-50"
                    >
                      {isMintingFaucet ? "Minting 25k..." : "+ Faucet: Claim 25k mUSDC"}
                    </button>
                  </div>

                  {/* Settlement Execution Buttons */}
                  <div className="space-y-3 pt-2">
                    {needsApproval ? (
                      <button
                        onClick={handleApproveRepayment}
                        disabled={isTxPending || isWaitingReceipt || userBalanceUsd < activeRepaymentTotal}
                        className="w-full py-3.5 rounded-xl text-xs font-bold text-[#161A1D] disabled:opacity-50 transition-all shadow-md"
                        style={{ background: "var(--gradient-surge)" }}
                      >
                        {isTxPending && txStep === "APPROVING"
                          ? "Approving Settlement Funds..."
                          : `Step 1: Approve $${activeRepaymentTotal.toLocaleString()} mUSDC`}
                      </button>
                    ) : (
                      <button
                        onClick={handleSimulateRepayment}
                        disabled={isTxPending || isWaitingReceipt}
                        className="w-full py-3.5 rounded-xl text-xs font-bold text-[#161A1D] disabled:opacity-50 transition-all shadow-md"
                        style={{ background: "var(--gradient-surge)" }}
                      >
                        {isTxPending && txStep === "REPAYING"
                          ? "Executing Settlement Transaction..."
                          : `Step 2: Deposit Settlement Pool ($${activeRepaymentTotal.toLocaleString()} mUSDC)`}
                      </button>
                    )}

                    {/* Server-Side Instant Settle Option */}
                    <button
                      onClick={handleServerSideSettle}
                      disabled={isServerSettling}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-[#98FFE8] bg-[#98FFE8]/10 border border-[#98FFE8]/30 hover:bg-[#98FFE8]/20 transition-all disabled:opacity-50"
                    >
                      {isServerSettling ? "Broadcasting Settlement Onchain..." : "⚡ 1-Click Server-Side Settlement"}
                    </button>
                  </div>

                  {/* Success State */}
                  {txStep === "SUCCESS" && (
                    <div className="p-4 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/10 text-xs text-[#98FFE8] space-y-1">
                      <span className="font-bold block">✓ Settlement Deposited & Listing Repaid!</span>
                      <p className="text-[11px] text-[#F2FBF9]/80">
                        Facility is now marked Repaid. Investors can now claim pro-rata principal + interest yields in their portfolio.
                      </p>
                      {serverSettleResult?.txHash && (
                        <a
                          href={`https://www.oklink.com/xlayer-test/tx/${serverSettleResult.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] underline block pt-1 text-[#98FFE8]"
                        >
                          View Settlement TX on OKLink ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* Error State */}
                  {contractError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                      {contractError.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-12 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] text-center text-xs text-[#5B6479]">
                  Select a facility from the list on the left to review repayment calculations.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
