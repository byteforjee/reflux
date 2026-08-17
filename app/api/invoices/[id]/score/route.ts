import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { scoreInvoice } from "@/lib/ai";
import { writeScoreOnchain } from "@/lib/contracts";

/**
 * POST /api/invoices/[id]/score
 * Runs the AI risk scoring pipeline on an invoice submission.
 * Enforces architecture.md invariants:
 * - Invariant 3: Structured AI response (tier, score, apr, rationale, decision)
 * - Invariant 4: Updates status to one of the 8 valid states (scoring, listed, rejected, flagged)
 * - Invariant 6: AI failures set status to "flagged" (never silently stuck in "scoring")
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await _request.json().catch(() => ({}));
  const incomingAssetId = body?.onchainAssetId;

  try {
    const invoice = await db.invoiceSubmission.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice submission not found" }, { status: 404 });
    }

    const effectiveAssetId = incomingAssetId || invoice.onchainAssetId;

    // Set status to scoring
    await db.invoiceSubmission.update({
      where: { id },
      data: {
        status: "scoring",
        ...(effectiveAssetId ? { onchainAssetId: String(effectiveAssetId) } : {}),
      },
    });

    // Run AI scoring via lib/ai/
    const aiResult = await scoreInvoice({
      amount: Number(invoice.amount),
      dueDateIso: invoice.dueDateIso,
      debtorName: invoice.debtorName,
      ipfsCid: invoice.ipfsCid || undefined,
    });

    // Determine final status based on decision
    let finalStatus: "listed" | "rejected" | "flagged" = "flagged";
    if (aiResult.decision === "approved") {
      finalStatus = "listed";
    } else if (aiResult.decision === "rejected") {
      finalStatus = "rejected";
    } else {
      finalStatus = "flagged";
    }

    let txHash: string | undefined = undefined;

    // If approved AND an onchain asset ID exists, write the score to RiskOracle and create TrancheVault listing
    if (aiResult.decision === "approved" && effectiveAssetId) {
      try {
        const onchainResult = await writeScoreOnchain({
          assetId: BigInt(effectiveAssetId),
          tier: aiResult.tier,
          score: aiResult.score,
          aprBps: aiResult.aprBps,
          rationale: aiResult.rationale,
          decision: aiResult.decision,
        });

        if (onchainResult.success && onchainResult.txHash) {
          txHash = onchainResult.txHash;
        }
      } catch (onchainError) {
        console.error("Failed to write score onchain during scoring route:", onchainError);
      }
    }

    // Update Prisma staging record with AI results & final status
    const updatedInvoice = await db.invoiceSubmission.update({
      where: { id },
      data: {
        status: finalStatus,
        aiTier: aiResult.tier,
        aiApr: String(aiResult.apr),
        aiRationale: aiResult.rationale,
        aiDecision: aiResult.decision,
        onchainAssetId: effectiveAssetId ? String(effectiveAssetId) : undefined,
      },
    });

    return NextResponse.json({
      data: {
        invoice: updatedInvoice,
        aiResult,
        txHash,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error(`POST /api/invoices/${id}/score error:`, message);

    // Safeguard: Ensure status is updated to flagged on unhandled exception (Invariant 6)
    try {
      await db.invoiceSubmission.update({
        where: { id },
        data: { status: "flagged", aiRationale: `Scoring route failure: ${message}` },
      });
    } catch {
      // Ignore secondary update error
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
