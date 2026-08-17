import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

/**
 * POST /api/invoices/[id]/invest
 * Records an investment event and updates fundedAmount and status.
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    const { amountInvested } = body;

    const invoice = await db.invoiceSubmission.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const currentFunded = Number(invoice.fundedAmount ?? 0);
    const addedAmount = Number(amountInvested ?? 0);
    const newFunded = currentFunded + addedAmount;
    const targetAmount = Number(invoice.amount);

    const isFullyFunded = newFunded >= targetAmount;

    const updated = await db.invoiceSubmission.update({
      where: { id },
      data: {
        fundedAmount: newFunded,
        status: isFullyFunded ? "funded" : invoice.status,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/invoices/[id]/invest error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
