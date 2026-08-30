# FinanceLab Analyst Workstation — pre-public MVP v2.2

FinanceLab is a local-first analyst training environment. It combines the strongest learning mechanics from the earlier MarketMind direction with a coherent **Analyst Workstation** identity: learners study concepts, practise decisions, complete analyst work and build evidence-backed mastery.

## Product loop

Diagnostic → Learn → Practise → Apply → Review → Mastery update → Next best action

## Included in this MVP

- Evidence-based mastery across eight finance skills, with confidence and recency separated from raw mastery
- A dependency-aware curriculum with nine modules and transparent unlock requirements
- Nine substantive assignments covering financial statements, cash flow, valuation, M&A, research and markets
- A daily brief with a stable daily queue, due concepts, mixed practice and recommended work
- A 68-concept knowledge library with definitions, formulas, intuition, examples and common mistakes
- 88 practice questions: 68 recall prompts plus 20 interpretation/application questions
- A 16-question diagnostic that produces an initial skill profile without pretending to be completed work
- DCF, comparable-company and merger-model workspaces with formulas, validation and learner conclusions
- Two research packets with structured evidence, thesis, risks, catalysts and grading criteria
- Six market scenarios built around Previous / Consensus / Actual interpretation
- A development review that separates activity, evidence, mastery, confidence and recent performance
- Local persistence, legacy-state migration, backup, restore and full reset
- Opt-in Kimi Coach feedback for assessed assignments, model conclusions, research briefs and market reasoning
- An AI Fund workspace with a 10-agent investment committee, deterministic cross-sectional scan, sector tape, momentum and anomaly scoring, supplied-catalyst review, fundamental checks, setup testing, bull/bear debate, non-overridable risk gate and risk-sized paper portfolio

## AI Fund boundary

The AI Fund is a local research and paper-trading workflow. Its bundled market snapshot contains twelve fictional securities and is labelled throughout the interface as static training data. It demonstrates the complete operating system without suggesting that the app currently has a live or licensed full-market feed.

The signal engine, setup statistics, liquidity checks, exposure limits, position sizing, stop level and final risk veto are deterministic. Kimi enriches only the Catalyst, Fundamentals, Bull Advocate, Bear Advocate and fund-memo language from the supplied packet. It cannot change the risk decision or place an order.

A real full-universe scan requires a licensed price, volume, fundamentals and news provider connected on the server. Live execution is deliberately excluded; the current portfolio is paper-only.

## Kimi Coach boundary

Kimi is connected through FinanceLab's own server route. The browser never contacts the provider directly and never receives server credentials. Prompts are selected from a fixed allowlist, learner text is treated as untrusted content, responses use a validated structure and raw upstream errors are not returned.

Kimi feedback is formative only. It cannot change calculations, deterministic rubric scores, mastery, confidence, curriculum unlocks or saved progress. Feedback is requested only when the learner clicks a Kimi Coach action and is not saved automatically.

The local server reads the existing secret from `.env` when it starts. Environment files are ignored by Git and must also be excluded manually from every shared ZIP or archive.

## Deliberate product boundary

This is a feature-complete **pre-public MVP**, not a production release. It intentionally excludes accounts, payments, live feeds, collaboration, social features, remote databases and generative-AI grading. Kimi provides optional coaching, not authoritative grading. There are no fake integrations: every core workflow remains usable without Kimi, and every completed learning action feeds the deterministic evidence model.

## Local use

Use the provided Node runtime or another current Node.js installation:

```text
pnpm install
pnpm dev
```

For a production-style local build:

```text
pnpm build
```

## Verification

```text
pnpm test
pnpm build
```

The automated suite covers financial calculations, parser edge cases, adaptive learning logic, anti-farming evidence weighting, confidence-gated completion, stable daily briefs, legacy migration and backup round-trips.

It also covers the Kimi request contracts, allowlisted modes, fund committee schema, non-overridable risk veto, paper-position sizing, safe upstream failures, cross-origin rejection and the browser/server secret boundary. All API tests use mocked responses and consume no Kimi credits.

## Suggested evaluation path

1. Complete the diagnostic and inspect the generated skill profile.
2. Open Daily Brief and answer a mix of recall and application questions.
3. Complete Helios, Vertex or Northstar from Assignments.
4. Build and save a DCF or merger-model conclusion in Models.
5. Write an evidence-backed brief in Research.
6. Interpret one Previous / Consensus / Actual scenario in Markets.
7. Inspect the resulting evidence and next recommendation in Development Review.
8. Export and restore a local backup from Settings.

## Product rule

> Make learning finance feel like doing finance.

Every feature must improve learning, application or proof of mastery.
