import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { createPublicClient, http } from "viem";
import { xlayerTestnet } from "@/lib/chain/config";
import { CONTRACT_ADDRESSES, trancheVaultAbi } from "@/lib/contracts";

const publicClient = createPublicClient({
  chain: xlayerTestnet,
  transport: http(),
});

/**
 * POST /api/invoices
 * Staging intake for a new invoice submission.
 * Creates an InvoiceSubmission record in Prisma with initial status "submitted".
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      walletAddress,
      amount,
      dueDateIso,
      debtorName,
      ipfsCid,
      documentHash,
      parentSubmissionId,
      resubmissionCount,
    } = body;

    // Validate required fields
    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json({ error: "Missing or invalid walletAddress" }, { status: 400 });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Missing or invalid invoice amount" }, { status: 400 });
    }
    if (!dueDateIso || typeof dueDateIso !== "string") {
      return NextResponse.json({ error: "Missing or invalid dueDateIso" }, { status: 400 });
    }
    if (!debtorName || typeof debtorName !== "string") {
      return NextResponse.json({ error: "Missing or invalid debtorName" }, { status: 400 });
    }

    const submission = await db.invoiceSubmission.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        amount: Number(amount),
        dueDateIso,
        debtorName: debtorName.trim(),
        ipfsCid: ipfsCid || null,
        documentHash: documentHash || null,
        status: "submitted",
        parentSubmissionId: parentSubmissionId || null,
        resubmissionCount: Number(resubmissionCount || 0),
      },
    });

    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/invoices error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/invoices
 * Returns all active invoice submissions enriched with live onchain TrancheVault state.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress")?.toLowerCase();
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (walletAddress) where.walletAddress = walletAddress;
    if (status) where.status = status;

    const invoices = await db.invoiceSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Enrich with live onchain state from TrancheVault
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        if (inv.onchainAssetId) {
          try {
            const listing = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.xlayerTestnet.trancheVault,
              abi: trancheVaultAbi,
              functionName: "getListing",
              args: [BigInt(inv.onchainAssetId)],
            });
            const onchainRaisedUsd = Number(listing.raisedAmount) / 10 ** 6;
            const targetUsd = Number(listing.targetAmount) / 10 ** 6;
            const isRepaid = listing.repaid;
            const isDefaulted = listing.defaulted;
            const fundingDeadlineSec = Number(listing.fundingDeadline);
            const isDeadlinePassed = fundingDeadlineSec > 0 && fundingDeadlineSec * 1000 < Date.now();
            const isExpiredUnfunded = listing.expiredUnfunded || (isDeadlinePassed && onchainRaisedUsd < targetUsd && !isRepaid);

            let dynamicStatus = inv.status;
            if (isRepaid) dynamicStatus = "repaid";
            else if (isDefaulted) dynamicStatus = "defaulted";
            else if (isExpiredUnfunded) dynamicStatus = "expired_unfunded";
            else if (targetUsd > 0 && onchainRaisedUsd >= targetUsd) dynamicStatus = "funded";

            return {
              ...inv,
              fundedAmount: onchainRaisedUsd,
              status: dynamicStatus,
              fundingDeadline: fundingDeadlineSec > 0 ? fundingDeadlineSec : null,
              fundingDeadlineIso: fundingDeadlineSec > 0 ? new Date(fundingDeadlineSec * 1000).toISOString() : null,
              isExpiredUnfunded,
            };
          } catch {
            return inv;
          }
        }
        return inv;
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/invoices error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
