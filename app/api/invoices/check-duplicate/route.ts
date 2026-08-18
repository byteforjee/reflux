import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

/**
 * GET /api/invoices/check-duplicate?hash=...&network=...
 * Real-time pre-check endpoint to verify if an invoice document has already been submitted.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get("hash");
    const network = searchParams.get("network") || "xlayerMainnet";

    if (!hash) {
      return NextResponse.json({ error: "Missing hash parameter" }, { status: 400 });
    }

    const existing = await db.invoiceSubmission.findFirst({
      where: {
        documentHash: hash,
        network: network === "xlayerTestnet" ? "xlayerTestnet" : "xlayerMainnet",
        status: {
          notIn: ["rejected", "cancelled"],
        },
      },
      select: {
        id: true,
        debtorName: true,
        amount: true,
        status: true,
        createdAt: true,
        network: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        isDuplicate: true,
        existingInvoice: existing,
      });
    }

    return NextResponse.json({
      isDuplicate: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/invoices/check-duplicate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
