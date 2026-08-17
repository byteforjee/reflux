import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

/**
 * POST /api/invoices/[id]/cancel
 * State-gated cancellation endpoint for invoice listings.
 *
 * Hard Invariants:
 * 1. Only the original submitter wallet can request cancellation.
 * 2. An invoice can ONLY be cancelled while status is "listed" (or "submitted") AND fundedAmount == 0.
 * 3. The moment even one investor has funded any portion (fundedAmount > 0), cancellation is PERMANENTLY DISABLED.
 * 4. Repaid, Defaulted, and Cancelled states are terminal and cannot be cancelled or reopened.
 * 5. Anti-Reroll Protection: Track cancellation frequency per wallet. If >= 2 cancellations, flag wallet for review.
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    const { walletAddress, reason } = body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required for authorization" },
        { status: 401 }
      );
    }

    const invoice = await db.invoiceSubmission.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice submission not found" },
        { status: 404 }
      );
    }

    // Invariant 1: Caller must be the submitter
    if (invoice.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized: Only the facility originator can cancel this listing" },
        { status: 403 }
      );
    }

    // Invariant 4: Terminal states check
    if (["repaid", "defaulted", "cancelled"].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice is already in a terminal state (${invoice.status}). Cannot be modified.` },
        { status: 400 }
      );
    }

    // Invariant 2: Must be in a cancellable status
    if (!["listed", "submitted", "scoring"].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice in status "${invoice.status}" cannot be cancelled.` },
        { status: 400 }
      );
    }

    // Invariant 3: Zero-funding invariant. The moment any investor deposits capital, cancellation is disabled.
    const fundedAmountNum = Number(invoice.fundedAmount ?? 0);
    if (fundedAmountNum > 0) {
      return NextResponse.json(
        {
          error:
            "Cancellation permanently disabled: Liquidity providers have already committed capital to this facility.",
        },
        { status: 400 }
      );
    }

    // Execute cancellation
    const updatedInvoice = await db.invoiceSubmission.update({
      where: { id },
      data: {
        status: "cancelled",
        cancellationReason: reason?.trim() || "Issuer voluntary cancellation prior to funding",
        cancelledAt: new Date(),
      },
    });

    // Invariant 5: Anti-Reroll Protection & Trust Tier Tracking
    const userWallet = walletAddress.toLowerCase();
    const trustProfile = await db.walletTrustProfile.upsert({
      where: { walletAddress: userWallet },
      create: {
        walletAddress: userWallet,
        cancellationCount: 1,
        isFlaggedForReview: false,
        trustTier: "TIER_1",
      },
      update: {
        cancellationCount: { increment: 1 },
      },
    });

    // If wallet has 2 or more cancellations, flag for manual review
    let flagged = trustProfile.isFlaggedForReview;
    if (trustProfile.cancellationCount >= 2 && !trustProfile.isFlaggedForReview) {
      await db.walletTrustProfile.update({
        where: { walletAddress: userWallet },
        data: { isFlaggedForReview: true },
      });
      flagged = true;
    }

    return NextResponse.json({
      success: true,
      data: updatedInvoice,
      trustProfile: {
        cancellationCount: trustProfile.cancellationCount,
        isFlaggedForReview: flagged,
      },
      message: "Facility successfully cancelled prior to investor funding.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/invoices/[id]/cancel error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
