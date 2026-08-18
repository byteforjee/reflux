"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount, useSwitchChain, useWriteContract, usePublicClient } from "wagmi";
import { computeFileHash, hashToBytes32, uploadInvoiceToIpfs } from "@/lib/storage";
import { CONTRACT_ADDRESSES, assetRegistryAbi } from "@/lib/contracts";
import { xlayerTestnet, xlayerMainnet } from "@/lib/chain/config";

type SubmissionStep = "DOCUMENT" | "DETAILS" | "EXECUTE" | "COMPLETE";

function parseFriendlyErrorMessage(rawMessage?: string): string {
  if (!rawMessage) return "An unexpected error occurred during processing. Please try again.";
  const msg = String(rawMessage);

  if (
    msg.includes("InvalidDueDate") ||
    msg.includes("dueDateTimestamp <= block.timestamp")
  ) {
    return "The selected payment due date must be scheduled for a future date (after today's date).";
  }

  if (
    msg.includes("User rejected") ||
    msg.includes("user rejected") ||
    msg.includes("4001") ||
    msg.includes("ACTION_REJECTED") ||
    msg.includes("cancelled") ||
    msg.includes("rejected the request")
  ) {
    return "Transaction signature rejected in wallet. Please confirm the transaction in your wallet.";
  }

  if (msg.includes("invalid chain ID") || msg.includes("ChainMismatchError")) {
    return "Network mismatch. Please switch your connected wallet to X Layer Testnet (Chain ID 1952).";
  }

  if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) {
    return "Insufficient OKB balance in your wallet to cover gas fees on X Layer Testnet.";
  }

  if (msg.includes("InvalidAmount")) {
    return "Invoice face value must be greater than $0.00.";
  }

  if (msg.includes("Connector not connected") || msg.includes("account is required")) {
    return "Wallet not connected. Please connect your Web3 wallet using the button in the header.";
  }

  if (msg.includes("Contract Call:") || msg.includes("Version: viem") || msg.includes("Execution reverted")) {
    return "Unable to execute the asset registration onchain. Please ensure your connected wallet is on X Layer Testnet and confirm the transaction in your wallet.";
  }

  return msg;
}

function SubmitInvoiceContent() {
  const searchParams = useSearchParams();
  const parentIdParam = searchParams.get("parent");
  const debtorParam = searchParams.get("debtor");
  const amountParam = searchParams.get("amount");
  const resubmitCountParam = searchParams.get("resubmitCount");

  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Wizard state
  const [step, setStep] = useState<SubmissionStep>("DOCUMENT");

  // Step 1: File & Hash
  const [file, setFile] = useState<File | null>(null);
  const [docHash, setDocHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  // Default due date: 30 days in the future
  const defaultFutureDate = new Date(Date.now() + 30 * 86400 * 1000).toISOString().split("T")[0];

  // Step 2: Form Inputs
  const [amount, setAmount] = useState<string>(amountParam || "");
  const [dueDateIso, setDueDateIso] = useState<string>(defaultFutureDate);
  const [debtorName, setDebtorName] = useState<string>(debtorParam || "");
  const [parentSubmissionId] = useState<string | null>(parentIdParam || null);
  const [resubmissionCount] = useState<number>(Number(resubmitCountParam || 0));

  useEffect(() => {
    if (debtorParam) setDebtorName(debtorParam);
    if (amountParam) setAmount(amountParam);
  }, [debtorParam, amountParam]);

  // Step 3: Pipeline Execution State
  const [pipelineState, setPipelineState] = useState<{
    stage: "IDLE" | "STORAGE" | "REGISTERING" | "MINTING_WALLET" | "MINTING_CONFIRMING" | "SCORING" | "DONE" | "ERROR";
    ipfsCid?: string;
    submissionId?: string;
    txHash?: `0x${string}`;
    error?: string;
    aiScoreResult?: { tier: string; score: number; apr: number; decision: string };
  }>({ stage: "IDLE" });

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsHashing(true);
    try {
      const hash = await computeFileHash(selected);
      setDocHash(hash);
    } catch (err) {
      console.error("Cryptographic hashing error:", err);
    } finally {
      setIsHashing(false);
    }
  };

  // Run Full Submission Pipeline with linear async/await
  const runSubmissionPipeline = async () => {
    if (!file || !docHash || !amount || !dueDateIso || !debtorName || !address) {
      return;
    }

    setStep("EXECUTE");

    let currentCid = pipelineState.ipfsCid;
    let currentSubId = pipelineState.submissionId;

    try {
      // 1. Secure Collateral Archival
      if (!currentCid) {
        setPipelineState({ stage: "STORAGE" });
        const ipfsResult = await uploadInvoiceToIpfs(file);

        if (ipfsResult.error || !ipfsResult.cid) {
          throw new Error(ipfsResult.error || "Failed to archive collateral document on decentralized storage");
        }
        currentCid = ipfsResult.cid;
      }

      // 2. Initialize Staging Record
      if (!currentSubId) {
        setPipelineState({ stage: "REGISTERING", ipfsCid: currentCid });
        const intakeRes = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            amount: Number(amount),
            dueDateIso,
            debtorName,
            ipfsCid: currentCid,
            documentHash: docHash,
            parentSubmissionId,
            resubmissionCount,
          }),
        });

        const intakeData = await intakeRes.json();
        if (!intakeRes.ok || intakeData.error) {
          throw new Error(intakeData.error || "Failed to initialize credit facility record");
        }

        currentSubId = intakeData.data.id;
      }

      // 3. Network Verification & Selection
      const activeChainId = chain?.id === xlayerTestnet.id ? xlayerTestnet.id : xlayerMainnet.id;
      const isMainnet = activeChainId === xlayerMainnet.id;
      const networkKey = isMainnet ? "xlayerMainnet" : "xlayerTestnet";
      const targetChain = isMainnet ? xlayerMainnet : xlayerTestnet;

      if (chain && chain.id !== xlayerMainnet.id && chain.id !== xlayerTestnet.id && switchChainAsync) {
        try {
          await switchChainAsync({ chainId: xlayerMainnet.id });
        } catch {
          throw new Error(
            "Please approve the network switch to OKX X Layer in your wallet."
          );
        }
      }

      // 4. Submit Asset Onchain via AssetRegistry
      setPipelineState({
        stage: "MINTING_WALLET",
        ipfsCid: currentCid,
        submissionId: currentSubId,
      });

      const amountUnits = BigInt(Math.round(Number(amount) * 10 ** 6));
      const dueDateTimestamp = BigInt(Math.floor(new Date(dueDateIso).getTime() / 1000));
      const nowSec = BigInt(Math.floor(Date.now() / 1000));

      if (dueDateTimestamp <= nowSec) {
        throw new Error("Invoice payment due date must be scheduled for a future date.");
      }

      const bytes32Hash = hashToBytes32(docHash);
      const registryAddress = isMainnet
        ? (CONTRACT_ADDRESSES.xlayerMainnet.assetRegistry as `0x${string}`)
        : (CONTRACT_ADDRESSES.xlayerTestnet.assetRegistry as `0x${string}`);

      const tx = await writeContractAsync({
        chainId: targetChain.id,
        address: registryAddress,
        abi: assetRegistryAbi,
        functionName: "submitAsset",
        args: [amountUnits, dueDateTimestamp, debtorName, currentCid, bytes32Hash],
      });

      setPipelineState({
        stage: "MINTING_CONFIRMING",
        ipfsCid: currentCid,
        submissionId: currentSubId,
        txHash: tx,
      });

      let mintedAssetId: string | undefined = undefined;

      // 5. Wait for onchain receipt
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
        try {
          const total = await publicClient.readContract({
            address: registryAddress,
            abi: assetRegistryAbi,
            functionName: "totalAssets",
          });
          mintedAssetId = total.toString();
        } catch (readErr) {
          console.warn("Could not read totalAssets:", readErr);
        }
      }

      // 6. Automated Credit Underwriting via Gemini
      setPipelineState({
        stage: "SCORING",
        ipfsCid: currentCid,
        submissionId: currentSubId,
        txHash: tx,
      });

      const scoreRes = await fetch(`/api/invoices/${currentSubId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onchainAssetId: mintedAssetId,
          network: networkKey,
        }),
      });

      const scoreData = await scoreRes.json();
      if (!scoreRes.ok || scoreData.error) {
        throw new Error(scoreData.error || "Credit risk underwriting failed");
      }

      const aiResult = scoreData.data.aiResult;
      setPipelineState({
        stage: "DONE",
        ipfsCid: currentCid,
        submissionId: currentSubId,
        txHash: tx,
        aiScoreResult: {
          tier: aiResult.tier,
          score: aiResult.score,
          apr: aiResult.apr,
          decision: aiResult.decision,
        },
      });
      setStep("COMPLETE");
    } catch (err: unknown) {
      console.error("Submission pipeline error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setPipelineState({
        stage: "ERROR",
        ipfsCid: currentCid,
        submissionId: currentSubId,
        error: message,
      });
    }
  };

  return (
    <div className="min-h-screen py-12 px-6 max-w-4xl mx-auto w-full space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#E3E0D6]/10">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold text-[#5B6479] hover:text-[#98FFE8] flex items-center gap-1.5 mb-2 transition-colors">
            ← Return to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
            Originate Invoice Credit Facility
          </h1>
          <p className="text-xs text-[#5B6479] mt-1">
            Tokenize commercial trade receivables into institutional credit tranches on X Layer.
          </p>
        </div>

        {/* Stepper Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E3E0D6]/15 bg-[#161A1D] text-xs font-semibold text-[#5B6479]">
          <span className={step === "DOCUMENT" ? "text-[#98FFE8]" : ""}>1. Collateral</span>
          <span>→</span>
          <span className={step === "DETAILS" ? "text-[#98FFE8]" : ""}>2. Terms</span>
          <span>→</span>
          <span className={step === "EXECUTE" || step === "COMPLETE" ? "text-[#98FFE8]" : ""}>3. Underwriting</span>
        </div>
      </div>

      {/* Network Warning Banner if wallet is on wrong chain */}
      {isConnected && chain && chain.id !== xlayerTestnet.id && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center justify-between gap-4">
          <div>
            <span className="font-bold block text-amber-200">Network Switch Required</span>
            <span>
              Connected to <strong>{chain.name || `Chain ID ${chain.id}`}</strong>. Please switch to <strong>X Layer Testnet (Chain ID 1952)</strong> to interact with the protocol.
            </span>
          </div>
          <button
            onClick={() => switchChainAsync?.({ chainId: xlayerTestnet.id })}
            className="px-4 py-2 rounded-lg bg-amber-400 text-[#161A1D] text-xs font-bold hover:bg-amber-300 transition-colors whitespace-nowrap"
          >
            Switch to X Layer Testnet
          </button>
        </div>
      )}

      {/* ── STEP 1: DOCUMENT UPLOAD ────────────────────────────────────────── */}
      {step === "DOCUMENT" && (
        <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
              Step 1: Upload Commercial Invoice Collateral
            </h2>
            <p className="text-xs text-[#5B6479]">
              Select a verified commercial B2B invoice (PDF or Image). A SHA-256 cryptographic fingerprint will be anchored onchain for immutable auditability.
            </p>
          </div>

          {/* File Dropzone */}
          <label className="border-2 border-dashed border-[#E3E0D6]/20 hover:border-[#98FFE8]/50 bg-[#161A1D]/60 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors space-y-3 text-center group">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#98FFE8]/10 border border-[#98FFE8]/20 flex items-center justify-center text-[#98FFE8] text-xl group-hover:scale-110 transition-transform">
              📄
            </div>
            {file ? (
              <div>
                <span className="text-sm font-bold text-[#F2FBF9] block">{file.name}</span>
                <span className="text-xs text-[#5B6479]">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            ) : (
              <div>
                <span className="text-sm font-bold text-[#F2FBF9] block">Select invoice collateral file</span>
                <span className="text-xs text-[#5B6479]">PDF, PNG, or JPG up to 10MB</span>
              </div>
            )}
          </label>

          {/* Hash Display */}
          {isHashing && (
            <p className="text-xs text-[#98FFE8] animate-pulse">Generating cryptographic SHA-256 fingerprint...</p>
          )}

          {docHash && !isHashing && (
            <div className="p-4 rounded-xl border border-[#98FFE8]/20 bg-[#98FFE8]/5 space-y-1">
              <span className="text-[11px] font-bold text-[#98FFE8] uppercase tracking-wider block">
                ✓ Cryptographic Fingerprint Verified
              </span>
              <p className="text-xs font-mono text-[#F2FBF9]/90 break-all">{docHash}</p>
            </div>
          )}

          {/* Next Action */}
          <div className="pt-4 flex justify-end">
            <button
              disabled={!file || !docHash || isHashing}
              onClick={() => setStep("DETAILS")}
              className="px-6 py-3 rounded-xl text-xs font-bold text-[#161A1D] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:opacity-95"
              style={{ background: "var(--gradient-surge)" }}
            >
              Continue to Facility Terms →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: INVOICE DETAILS ────────────────────────────────────────── */}
      {step === "DETAILS" && (
        <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
              Step 2: Credit Facility Parameters
            </h2>
            <p className="text-xs text-[#5B6479]">
              Specify the invoice face value, maturity due date, and verified debtor enterprise name.
            </p>
          </div>

          <div className="space-y-4">
            {/* Invoice Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5B6479] uppercase tracking-wider block">
                Invoice Face Value ($ USD)
              </label>
              <input
                type="number"
                placeholder="e.g. 25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#161A1D] border border-[#E3E0D6]/20 text-[#F2FBF9] text-sm focus:border-[#98FFE8] focus:outline-none transition-colors"
              />
            </div>

            {/* Debtor Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5B6479] uppercase tracking-wider block">
                Debtor Enterprise Name
              </label>
              <input
                type="text"
                placeholder="e.g. Global Logistics Inc."
                value={debtorName}
                onChange={(e) => setDebtorName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#161A1D] border border-[#E3E0D6]/20 text-[#F2FBF9] text-sm focus:border-[#98FFE8] focus:outline-none transition-colors"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5B6479] uppercase tracking-wider block">
                Payment Due Date (Maturity)
              </label>
              <input
                type="date"
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                value={dueDateIso}
                onChange={(e) => setDueDateIso(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#161A1D] border border-[#E3E0D6]/20 text-[#F2FBF9] text-sm focus:border-[#98FFE8] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Stepper Buttons */}
          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={() => setStep("DOCUMENT")}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#5B6479] hover:text-[#F2FBF9] transition-colors"
            >
              ← Back to Collateral
            </button>
            <button
              disabled={!amount || !dueDateIso || !debtorName || Number(amount) <= 0}
              onClick={runSubmissionPipeline}
              className="px-6 py-3 rounded-xl text-xs font-bold text-[#161A1D] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:opacity-95"
              style={{ background: "var(--gradient-surge)" }}
            >
              Review & Originate Facility →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: EXECUTION STEPPER ──────────────────────────────────────── */}
      {(step === "EXECUTE" || step === "COMPLETE") && (
        <div className="p-8 rounded-2xl border border-[#E3E0D6]/10 bg-[#161A1D] space-y-6 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-body)" }}>
              {step === "COMPLETE" ? "Facility Originated & Underwritten Successfully" : "Executing Origination & Risk Underwriting"}
            </h2>
            <p className="text-xs text-[#5B6479]">
              Archiving collateral, initializing protocol state, registering onchain asset, and executing automated credit risk underwriting.
            </p>
          </div>

          {/* Status Stepper Cards */}
          <div className="space-y-3">
            {/* Stage 1: Storage */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
              pipelineState.stage === "STORAGE" ? "border-[#98FFE8] bg-[#98FFE8]/10 text-[#98FFE8]" : pipelineState.ipfsCid ? "border-[#98FFE8]/30 bg-[#161A1D] text-[#F2FBF9]" : "border-[#E3E0D6]/10 text-[#5B6479]"
            }`}>
              <span>1. Collateral Document Storage & Integrity Verification</span>
              {pipelineState.ipfsCid ? <span className="font-mono text-[11px] text-[#98FFE8]">Verified ({pipelineState.ipfsCid.slice(0, 10)}...)</span> : pipelineState.stage === "STORAGE" ? <span className="animate-pulse">Archiving...</span> : <span>Pending</span>}
            </div>

            {/* Stage 2: Registry Intake */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
              pipelineState.stage === "REGISTERING" ? "border-[#98FFE8] bg-[#98FFE8]/10 text-[#98FFE8]" : pipelineState.submissionId ? "border-[#98FFE8]/30 bg-[#161A1D] text-[#F2FBF9]" : "border-[#E3E0D6]/10 text-[#5B6479]"
            }`}>
              <span>2. Initializing Credit Registry Facility</span>
              {pipelineState.submissionId ? <span className="font-mono text-[11px] text-[#98FFE8]">ID: #{pipelineState.submissionId.slice(0, 8)}</span> : pipelineState.stage === "REGISTERING" ? <span className="animate-pulse">Initializing...</span> : <span>Pending</span>}
            </div>

            {/* Stage 3: Onchain Mint */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
              pipelineState.stage === "MINTING_WALLET" || pipelineState.stage === "MINTING_CONFIRMING" ? "border-[#98FFE8] bg-[#98FFE8]/10 text-[#98FFE8]" : (pipelineState.stage === "SCORING" || pipelineState.stage === "DONE") ? "border-[#98FFE8]/30 bg-[#161A1D] text-[#F2FBF9]" : "border-[#E3E0D6]/10 text-[#5B6479]"
            }`}>
              <span>3. Minting Asset on X Layer Blockchain</span>
              {pipelineState.txHash ? (
                <span className="font-mono text-[11px] text-[#98FFE8]">Tx: {pipelineState.txHash.slice(0, 10)}...</span>
              ) : pipelineState.stage === "MINTING_WALLET" ? (
                <span className="animate-pulse text-[#98FFE8]">Confirm in Wallet...</span>
              ) : pipelineState.stage === "MINTING_CONFIRMING" ? (
                <span className="animate-pulse text-[#98FFE8]">Confirming onchain...</span>
              ) : (
                <span>Pending</span>
              )}
            </div>

            {/* Stage 4: AI Underwriting */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
              pipelineState.stage === "SCORING" ? "border-[#98FFE8] bg-[#98FFE8]/10 text-[#98FFE8]" : pipelineState.stage === "DONE" ? "border-[#98FFE8]/30 bg-[#161A1D] text-[#F2FBF9]" : "border-[#E3E0D6]/10 text-[#5B6479]"
            }`}>
              <span>4. Automated Credit Risk Underwriting & Rate Calibration</span>
              {pipelineState.stage === "DONE" ? <span className="font-bold text-[#98FFE8]">✓ Completed</span> : pipelineState.stage === "SCORING" ? <span className="animate-pulse">Underwriting Risk...</span> : <span>Pending</span>}
            </div>
          </div>

          {/* AI Result Banner on Completion */}
          {pipelineState.stage === "DONE" && pipelineState.aiScoreResult && (
            <div className="p-6 rounded-xl border border-[#98FFE8]/30 bg-[#98FFE8]/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#98FFE8] uppercase tracking-wider">
                  Automated Underwriting Summary
                </span>
                <span className="px-3 py-1 rounded-full bg-[#98FFE8]/20 text-[#98FFE8] text-xs font-bold">
                  Tier {pipelineState.aiScoreResult.tier} — {pipelineState.aiScoreResult.decision.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#5B6479] block">Credit Quality Score</span>
                  <span className="text-2xl font-bold text-[#F2FBF9] mt-1 block">{pipelineState.aiScoreResult.score} / 100</span>
                </div>
                <div>
                  <span className="text-[#5B6479] block">Assigned Market Yield</span>
                  <span className="text-2xl font-bold text-[#98FFE8] mt-1 block">{pipelineState.aiScoreResult.apr}% APR</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Display */}
          {pipelineState.stage === "ERROR" && (
            <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 space-y-3">
              <div className="space-y-1">
                <span className="font-bold block text-rose-200">Transaction Notice</span>
                <p className="text-xs leading-relaxed text-rose-300/90 font-medium">
                  {parseFriendlyErrorMessage(pipelineState.error)}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                {chain && chain.id !== xlayerTestnet.id && (
                  <button
                    onClick={() => switchChainAsync?.({ chainId: xlayerTestnet.id })}
                    className="px-4 py-2 rounded-lg bg-amber-400 text-[#161A1D] font-bold hover:bg-amber-300 transition-colors"
                  >
                    Switch to X Layer Testnet
                  </button>
                )}
                <button
                  onClick={runSubmissionPipeline}
                  className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-100 font-bold transition-colors"
                >
                  Retry Asset Registration →
                </button>
              </div>
            </div>
          )}

          {/* Navigation Action */}
          {step === "COMPLETE" && (
            <div className="pt-4 flex justify-end gap-3">
              <Link
                href="/browse"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#5B6479] hover:text-[#F2FBF9] transition-colors"
              >
                View in Marketplace →
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-xl text-xs font-bold text-[#161A1D] shadow-md hover:opacity-95 transition-opacity"
                style={{ background: "var(--gradient-surge)" }}
              >
                Return to Dashboard →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubmitInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-20 text-center text-xs text-[#98FFE8] animate-pulse">
          Loading facility intake terminal...
        </div>
      }
    >
      <SubmitInvoiceContent />
    </Suspense>
  );
}
