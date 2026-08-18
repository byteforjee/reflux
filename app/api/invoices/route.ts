import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { createPublicClient, http } from "viem";
import { xlayerTestnet, xlayerMainnet } from "@/lib/chain/config";
import { CONTRACT_ADDRESSES, trancheVaultAbi } from "@/lib/contracts";

const mainnetPublicClient = createPublicClient({
  chain: xlayerMainnet,
  transport: http(),
});

const testnetPublicClient = createPublicClient({
  chain: xlayerTestnet,
  transport: http(),
});

/**
 * POST /api/invoices
 * Staging intake for a new invoice submission.
 * Enforces cryptographic deduplication and network segregation.
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
      network = "xlayerMainnet",
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

    const effectiveNetwork = network === "xlayerTestnet" ? "xlayerTestnet" : "xlayerMainnet";

    // Deduplication check: prevent duplicate registration of the exact same document on the same network
    if (documentHash) {
      const existing = await db.invoiceSubmission.findFirst({
        where: {
          documentHash,
          network: effectiveNetwork,
          status: {
            notIn: ["rejected", "cancelled"],
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: `Duplicate invoice detected: An invoice with this identical document fingerprint (${documentHash.slice(0, 10)}...) is already active on ${
              effectiveNetwork === "xlayerMainnet" ? "X Layer Mainnet" : "X Layer Testnet"
            }.`,
            existingId: existing.id,
            existingStatus: existing.status,
          },
          { status: 409 }
        );
      }
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
        network: effectiveNetwork,
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
 * Returns invoice submissions filtered by network, status, and wallet, enriched with live onchain state.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress")?.toLowerCase();
    const status = searchParams.get("status");
    const network = searchParams.get("network"); // "xlayerMainnet" | "xlayerTestnet"

    const where: Record<string, unknown> = {};
    if (walletAddress) where.walletAddress = walletAddress;
    if (status) where.status = status;
    if (network) where.network = network;

    const invoices = await db.invoiceSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Enrich with live onchain state from TrancheVault for the corresponding network
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        if (inv.onchainAssetId) {
          try {
            const isMainnet = inv.network === "xlayerMainnet";
            const client = isMainnet ? mainnetPublicClient : testnetPublicClient;
            const vaultAddress = isMainnet
              ? CONTRACT_ADDRESSES.xlayerMainnet.trancheVault
              : CONTRACT_ADDRESSES.xlayerTestnet.trancheVault;

            const listing = await client.readContract({
              address: vaultAddress,
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
