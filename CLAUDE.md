## Application Building Context — Reflux

Reflux is an AI-underwritten invoice credit protocol built for the
X Layer AI Season hackathon (AI-RWA track). Real business invoices
are tokenized, AI prices the credit risk, investors fund them
onchain, and repayment pays out pro-rata to token holders. Built on
X Layer.

Read the following files in order before implementing or making
any architectural decision:

1. `context/project-overview.md` — product definition, the core
   loop, repayment and fraud model stated plainly, and scope
   (what's in the hackathon submission vs. a stretch goal vs.
   explicitly out of scope)
2. `context/architecture.md` — system structure, boundaries,
   storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, logo and
   lockup rules, icon system, X Layer attribution, gradients,
   component and layout patterns (including the landing page,
   header/footer, and chatbot widget), and animation direction
4. `context/code-standards.md` — implementation rules and
   conventions, including smart contract and web3-interaction
   standards
5. `context/ai-workflow-rules.md` — development workflow, scoping
   rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work,
   open questions, and next steps

Then read `context/specs/00-build-plan.md` to see the full list of
build units and their order. Do not start any unit without a
corresponding spec file in `context/specs/`.

## Brand & Asset Sources

Two folders ship alongside `context/` and are read-only inputs, not
things to regenerate:

- `reflux-brand-assets/` — the Reflux logo (SVG/PNG, backgroundless),
  favicons, color palette, typography files, gradients, and the
  product icon set (including the chatbot icon). Referenced in
  detail throughout `context/ui-context.md` — that file is the
  usage guide, this folder is the source.
- `XLayer-logo-kit/` — X Layer's official logo, icon, and profile
  assets, with their own usage guideline PDF. Used primarily for
  the footer attribution — see `context/ui-context.md`'s "X Layer
  Attribution" section for exactly which file and size to use
  where.

Do not create new logo, icon, or wordmark variations outside these
folders without updating `context/ui-context.md` first.

## Workflow

Update `context/progress-tracker.md` after each meaningful
implementation change.

If implementation changes the architecture, scope, or standards
documented in the context files, update the relevant file before
continuing.

Do not skip ahead to a later unit because it looks easy or
interesting — most importantly, do not start Unit 12 (Secondary
Market) before Units 01–11 are complete, and do not deploy to X
Layer Mainnet before every contract has been tested and verified on
X Layer Testnet first. Build in the order defined in the build
plan.
