import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

/**
 * GET /api/invoices/[id]
 * Fetch single invoice details along with resubmission history and trust profile.
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const invoice = await db.invoiceSubmission.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fetch prior resubmission history if this is a resubmitted invoice
    let priorAttempts: unknown[] = [];
    if (invoice.parentSubmissionId) {
      priorAttempts = await db.invoiceSubmission.findMany({
        where: {
          OR: [
            { id: invoice.parentSubmissionId },
            { parentSubmissionId: invoice.parentSubmissionId },
          ],
          id: { not: invoice.id },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Also fetch any child resubmissions derived from this invoice
    const childAttempts = await db.invoiceSubmission.findMany({
      where: { parentSubmissionId: invoice.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: {
        ...invoice,
        priorAttempts: [...priorAttempts, ...childAttempts],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/invoices/[id] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
