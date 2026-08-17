/**
 * lib/ai/index.ts
 *
 * Central entry point for all AI utilities (invoice risk scoring & chatbot).
 * All Claude / Gemini API integration logic and prompt engineering live in lib/ai/,
 * never inlined in route handlers (code-standards.md, architecture.md).
 */

export {
  scoreInvoice,
  FALLBACK_FLAGGED_RESULT,
  type AIScoringResult,
  type InvoiceScoringInput,
} from "./scoring";
