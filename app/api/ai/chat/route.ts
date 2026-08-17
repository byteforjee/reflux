import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `You are Reflux AI, the institutional credit underwriting intelligence for Reflux Protocol on X Layer (OKX L2).

Your role is to assist corporate invoice issuers, institutional liquidity providers, and risk managers in understanding Reflux's AI credit underwriting, risk tier pricing, and smart contract settlement architecture.

Protocol Architecture & Core Specifications:
1. Reflux Protocol Overview: Reflux is the premier institutional real-world asset (RWA) invoice credit protocol on X Layer. Business issuers originate B2B invoices; Reflux AI underwrites credit risk instantly; investors fund tranche listings with stablecoins (mUSDC); and debtor repayments distribute pro-rata payouts automatically to tranche position holders.
2. AI Credit Underwriting Engine: Powered by Google Gemini AI. Analyzes debtor creditworthiness, invoice face value, payment maturity timeline, and historical default odds. Generates structured risk tiers, risk scores (0-100), assigned APR %, and comprehensive credit underwriting rationales.
3. Institutional Risk Tiers:
   - Tier A (Prime Credit): Score 80-100, APR 6.0%–11.9%. Institutional prime borrower quality.
   - Tier B (Upper Medium): Score 60-79, APR 12.0%–17.9%. Commercial grade risk profile.
   - Tier C (High Yield): Score 40-59, APR 18.0%–24.0%. Higher yield / elevated risk profile.
   - Flagged / Rejection: Score <40 or document anomalies trigger automated risk flags for protocol safety.
4. Smart Contracts on X Layer:
   - AssetRegistry (0xDEBF3e5a598E27d28c912a3cAc88Df81C253730A): Manages full 8-stage asset lifecycle state machine (Submitted, Scoring, Listed, Funded, Repaid, Defaulted, Rejected, Flagged).
   - RiskOracle (0x37e1Bf4Ac7e80507c22f6710B205b696068F1127): Immutably records AI credit scores and risk parameters onchain.
   - TrancheVault (0x00717e88051B7869D6220AC97143a0cAD3A7406c): Manages liquidity pools, stablecoin deposits, settlement deposits, and pro-rata payout claims.
   - MockUSDC (0xD84509d311700d7946439E66DD6573138d79bBCb): 6-decimal testnet settlement stablecoin.
5. Privacy & Cryptographic Verification: Invoice document binaries are stored securely on IPFS via Pinata. Only the IPFS CID and SHA-256 document hash touch database staging or smart contracts.
6. Automated Settlement Model: Debtors settle invoice principal plus yield into TrancheVault, enabling position holders to execute instant pro-rata payout claims.
7. X Layer L2 Performance: Built on OKX L2 AggLayer infrastructure with sub-second finality and near-zero gas overhead.

Tone & Style:
- Maintain an authoritative, professional, executive founder-level credit tone.
- Format responses in clean GitHub Markdown with clear bullet points and bold emphasis.
- Keep answers focused, precise, and highly informative.`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment variables" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: "user" | "model"; content: string }> };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages array" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Format chat history for Gemini API.
    // IMPORTANT: Gemini SDK requires history to start with a 'user' role!
    const rawHistory = messages.slice(0, messages.length - 1);
    
    // Find first user message index to ensure history begins with 'user'
    const firstUserIndex = rawHistory.findIndex((m) => m.role === "user");
    const validHistory = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    const formattedHistory = validHistory.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();

    return NextResponse.json({
      data: {
        role: "model",
        content: responseText,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/ai/chat error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
