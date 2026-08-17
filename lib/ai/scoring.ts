import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Structured AI scoring result interface per architecture.md invariant 3.
 * decision must be one of: "approved" | "rejected" | "flagged"
 */
export interface AIScoringResult {
  tier: "A" | "B" | "C";
  score: number;       // 0–100 risk score
  apr: number;         // annualized percentage rate (e.g. 12.5 for 12.5%)
  aprBps: number;      // APR in basis points (e.g. 1250 for 12.5%)
  rationale: string;   // plain-language explanation of underwriting risk
  decision: "approved" | "rejected" | "flagged";
}

export interface InvoiceScoringInput {
  amount: number;
  dueDateIso: string;
  debtorName: string;
  ipfsCid?: string;
  documentSummary?: string;
}

/**
 * Fallback scoring result returned on AI error or malformed JSON.
 * Enforces architecture.md invariant 6: malformed output sets status to "flagged",
 * preventing invoices from silently getting stuck in "scoring".
 */
export const FALLBACK_FLAGGED_RESULT: AIScoringResult = {
  tier: "C",
  score: 0,
  apr: 0,
  aprBps: 0,
  rationale: "AI scoring pipeline returned an unparseable response or encountered an execution error. Flagged for manual review.",
  decision: "flagged",
};

/**
 * Evaluates an invoice using Gemini API and returns structured risk underwriting data.
 * All prompt engineering lives here per code-standards.md.
 */
export async function scoreInvoice(input: InvoiceScoringInput): Promise<AIScoringResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing in environment variables. Falling back to flagged.");
    return FALLBACK_FLAGGED_RESULT;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are Reflux AI, an institutional credit underwriting model pricing real business invoices for onchain tokenization on X Layer.

Analyze the following invoice credit request:
- Invoice Amount: $${input.amount.toLocaleString()} USD
- Due Date: ${input.dueDateIso}
- Debtor Company: ${input.debtorName}
- Document CID / Reference: ${input.ipfsCid || "None provided"}
- Additional Notes: ${input.documentSummary || "Standard commercial B2B invoice"}

Your Task:
Underwrite this credit risk based on standard commercial factoring metrics (debtor creditworthiness, invoice magnitude, timeline risk).
Return ONLY a raw JSON object with NO markdown formatting, NO code blocks (no \`\`\`json), and NO extra text before or after.

The JSON MUST match this exact schema:
{
  "tier": "A" | "B" | "C",
  "score": <number between 0 and 100 representing credit quality, where 100 is prime credit>,
  "apr": <number representing annual yield, e.g. 8.5 for 8.5%, 12.0 for 12%, 18.5 for 18.5%>,
  "rationale": "<2 to 3 concise, professional sentences explaining the underwriting rationale>",
  "decision": "approved" | "rejected" | "flagged"
}

Scoring Rules:
- Tier A: Score 80-100, APR 6.0% - 11.9%, Decision: approved
- Tier B: Score 60-79, APR 12.0% - 17.9%, Decision: approved
- Tier C: Score 40-59, APR 18.0% - 24.0%, Decision: approved (or flagged if anomaly detected)
- Anomaly / High Risk / Fraud Suspect: Score 0-39, Decision: rejected or flagged`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Clean any accidental markdown wrap (e.g. ```json ... ```)
    const cleanedText = text
      .replace(/^```(json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedText);

    // Validate fields strictly
    const tier = (["A", "B", "C"].includes(parsed.tier) ? parsed.tier : "C") as "A" | "B" | "C";
    const decision = (["approved", "rejected", "flagged"].includes(parsed.decision)
      ? parsed.decision
      : "flagged") as "approved" | "rejected" | "flagged";
    const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 50;
    const apr = typeof parsed.apr === "number" ? Math.max(1, Math.min(50, parsed.apr)) : 12.0;
    const aprBps = Math.round(apr * 100);
    const rationale = typeof parsed.rationale === "string" && parsed.rationale.length > 5
      ? parsed.rationale
      : "Credit risk evaluated based on debtor profile and timeline.";

    return {
      tier,
      score,
      apr,
      aprBps,
      rationale,
      decision,
    };
  } catch (error) {
    console.error("AI scoring failed:", error);
    return FALLBACK_FLAGGED_RESULT;
  }
}
