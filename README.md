# Reflux Protocol

> **Autonomous AI-Underwritten Commercial Receivable Financing on OKX X Layer**  
> *Built for X Layer AI Season 2026*

[![X Layer](https://img.shields.io/badge/Network-X_Layer_Testnet_(1952)-00FFCC?style=flat-square&logo=okx)](https://www.oklink.com/xlayer-test)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Google Gemini](https://img.shields.io/badge/AI_Engine-Gemini_Flash-8E75FF?style=flat-square&logo=google)](https://ai.google.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Tests-23%2F23_Pass_100%25-green?style=flat-square)](https://getfoundry.sh/)

---

## 📌 Executive Summary

**Reflux** is a decentralized commercial trade receivable financing protocol deployed natively on **OKX X Layer Testnet (Chain ID: 1952)**. 

Small and medium-sized businesses face severe working capital constraints due to 30-to-90 day invoice payment terms. Reflux solves this $3T liquidity bottleneck by tokenizing verifiable commercial receivables into onchain credit tranches, underwritten in real time by **Google Gemini AI**, and funded by decentralized stablecoin liquidity in non-custodial escrow vaults.

---

## ⚡ Core Invariants & Key Innovations

### 1. Autonomous AI Credit Underwriting Engine
Every submitted invoice is evaluated by **Google Gemini** against institutional credit criteria (debtor solvency, transaction history, sector volatility, and maturity horizon).
* **Deterministic Risk Tiering**: Assigns **Tier A** (Prime, 80–100 score), **Tier B** (Standard, 60–79 score), or **Tier C** (High Yield, 40–59 score).
* **Dynamic APR Pricing**: Calculates market-clearing yield in basis points (e.g., `850 bps` = 8.50% APR).
* **Onchain Score Immutability**: Cryptographic scores and rationales are signed and broadcast to `RiskOracle.sol` on X Layer.

### 2. All-or-Nothing Escrow Funding Window
To eliminate partial-tokenization fraud and repayment ambiguity:
* Every listing features an onchain **`fundingDeadline`** set with meaningful runway before the payment due date.
* Investor capital is held in **escrow** by `TrancheVault.sol`—funds are never released incrementally.
* **100% Finalization**: Status only advances to `Funded` if 100% of the facility target is subscribed before the deadline.
* **100% Full Refund Guarantee (`claimRefund`)**: If the funding window expires without reaching 100%, the listing auto-transitions to `ExpiredUnfunded` (AssetStatus 9) and investors can withdraw **100% of their deposited principal with 0 fees**.

### 3. State-Gated Listing Cancellation & Anti-Reroll Protection
* An issuer can only cancel a listing while its status is `Listed` **AND** `fundedAmount == 0`.
* The moment even one investor deposits capital (`fundedAmount > 0`), cancellation is permanently disabled onchain.
* Wallets attempting repeated cancellations are flagged by the `WalletTrustProfile` engine to prevent APR rerolling.

### 4. Paying Agent Settlement & Pro-Rata Payouts
* Debtor settlement proceeds are deposited directly into `TrancheVault.sol` via paying agent settlement.
* Investors claim their exact pro-rata principal + accrued yield non-custodially via `claimPayout()`.

---

## 🔗 Verified Smart Contracts on X Layer Testnet

| Contract | Address | Explorer | Description |
| :--- | :--- | :--- | :--- |
| **`AssetRegistry.sol`** | `0xaf248c5474f40945ed41664125350a890782cad0` | [OKLink Explorer](https://www.oklink.com/xlayer-test/address/0xaf248c5474f40945ed41664125350a890782cad0) | 10-state asset lifecycle, IPFS proofs & access control |
| **`TrancheVault.sol`** | `0x56deb48168bdfe8a396db8780d239913279ed4f2` | [OKLink Explorer](https://www.oklink.com/xlayer-test/address/0x56deb48168bdfe8a396db8780d239913279ed4f2) | Escrow liquidity vault, all-or-nothing refunds & payouts |
| **`RiskOracle.sol`** | `0x37e1Bf4Ac7e80507c22f6710B205b696068F1127` | [OKLink Explorer](https://www.oklink.com/xlayer-test/address/0x37e1Bf4Ac7e80507c22f6710B205b696068F1127) | Immutable AI risk scores, tiers, and APR storage |
| **`MockUSDC.sol`** | `0xD84509d311700d7946439E66DD6573138d79bBCb` | [OKLink Explorer](https://www.oklink.com/xlayer-test/address/0xD84509d311700d7946439E66DD6573138d79bBCb) | 6-decimal test stablecoin with built-in 1-click faucet |

---

## 🏛️ System Architecture

```
                                      REFLUX SYSTEM ARCHITECTURE

    [ Business / Issuer ]                 [ Google Gemini AI ]              [ Liquidity Investor ]
             │                                     │                                  │
      1. Upload Invoice                            │                           3. Deposit mUSDC
      & SHA-256 Hash                               │                              into Escrow
             │                                     │                                  │
             ▼                                     ▼                                  ▼
   ┌──────────────────┐  2. Underwrite    ┌─────────────────┐  4. 100% Target  ┌─────────────────┐
   │ AssetRegistry.sol│ ◄──────────────── │ RiskOracle.sol  │ ───────────────► │ TrancheVault.sol│
   │ (10 States)      │   Score & APR     │ (Immutable Rec) │    Finalized     │ (Escrow Pools)  │
   └──────────────────┘                   └─────────────────┘                  └─────────────────┘
             │                                                                        │
             │                           5. Repay Settlement                          │
             └────────────────────────◄───────────────────────────────────────────────┘
                                         (Principal + Yield)
                                                  │
                                                  ▼
                                       [ Pro-Rata Payout Claim ]
```

---

## 🛠️ Technology Stack

* **Blockchain & Layer 2**: OKX X Layer Testnet (EVM, Chain ID `1952`, RPC: `https://testrpc.xlayer.tech`)
* **Smart Contracts**: Solidity `0.8.24`, OpenZeppelin Contracts `v5.3.0`, Foundry Test Suite (23 unit tests)
* **AI Credit Engine**: Google Gemini API (`gemini-flash-latest`), `@google/generative-ai`
* **Frontend Application**: Next.js 16 (App Router, React 19, Turbopack, Strict TypeScript)
* **Web3 Integration**: Viem, Wagmi, ConnectKit, TanStack Query
* **Styling & UI**: Tailwind CSS v4, Custom Space Grotesk typography, Glassmorphism aesthetic
* **Decentralized Storage**: Pinata IPFS integration for immutable invoice document anchoring
* **Database & Indexing**: PostgreSQL with Prisma ORM v7

---

## 🚀 Getting Started Locally

### 1. Clone Repository
```bash
git clone https://github.com/byteforjee/reflux.git
cd reflux
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure you provide:
* `DATABASE_URL`: PostgreSQL database connection string
* `GEMINI_API_KEY`: Google Gemini API key
* `ORACLE_PRIVATE_KEY`: Private key for oracle score broadcasting
* `PINATA_JWT`: Pinata IPFS pinning service JWT

### 4. Run Smart Contract Tests (Foundry)
```bash
cd contracts
forge test -vvv
```
*(All 23 unit tests across `AssetRegistryTest`, `RiskOracleTest`, and `TrancheVaultTest` will execute)*

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Application Routes

* **`/`** — Reflux Protocol Landing Page, Live Statistics & AI Pricing Worked Example
* **`/dashboard`** — Issuer Terminal & "My Invoices" with dynamic countdown runway & state-gated cancellation
* **`/dashboard/submit`** — 3-Step Invoice Tokenization Wizard with IPFS upload & automated AI credit scoring
* **`/browse`** — Investor Marketplace with Tier A/B/C risk filters and funding progress
* **`/browse/[id]`** — Facility Deep Dive, AI Underwriting Rationale, 1-Click Faucet (+10k mUSDC) & Escrow Investment
* **`/portfolio`** — Investor Terminal for tracking active positions, settled yields & 1-click refund claims
* **`/analytics`** — Protocol Macro Metrics, AI Risk Composition Breakdown & OKLink Contract Registry
* **`/docs`** & **`/guide`** — Comprehensive Knowledge Base, Glossary, Yield Formulas & Workflow Guides

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
