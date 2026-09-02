# AGENTS.md — RecoverAI

Standing instructions for AI agents working in this repository (Antigravity, or any other AGENTS.md-aware tool). This file is self-sufficient — it doesn't assume you've read anything else first — but the full detail behind every rule here lives in `docs/`. Read the relevant doc before implementing anything nontrivial rather than guessing from this summary alone.

## What this project is

RecoverAI — an AI Revenue Recovery agent built for the Razorpay AI Buildathon (Track 03: AI Revenue Recovery). It decides which failed payments are worth pursuing, acts within hard guardrails, knows when to do nothing, and proves — on a documented, non-circular synthetic benchmark — that its strategy beats two baselines (contact-everyone, do-nothing).

**Constraints that shape every decision below:** solo build, 6-day build window (feature-complete by end of Day 6; Day 7 is testing/polish/submission only, no new features), single merchant, single Next.js app. Every architectural choice in this project optimizes for that, not for scale.

Full context: @docs/MyIdea.md (the pitch and 7-day plan) and @docs/PRD.md (what's actually in scope).

## Scope boundaries — read before adding anything

`@docs/PRD.md` §10 and `@docs/MyIdea.md` §18 list what's explicitly out of scope, after a real pass of cutting scope creep during planning. Don't reintroduce anything from those lists — extra channels, other Buildathon tracks, production-grade webhook hardening, real messaging providers, multi-tenant support, ML model training — without the person explicitly asking first. If a task seems to require one of these, stop and ask rather than building around it.

`@docs/TECH_STACK.md` §9 lists specific technologies and patterns that need a deliberate decision before use: a second backend framework, a third LLM provider, AI SDK v6, a message queue, a caching layer, React Query/SWR, a real messaging provider, multi-tenant auth, an E2E test framework, a second cloud vendor, or any ORM/data-model swap. None of these are needed for this project's actual scope — don't add one because it seems like good practice.

## Non-negotiable rules

These are structural, not stylistic — breaking one doesn't just look wrong, it breaks something the rest of the system depends on, or quietly invalidates a claim the whole product is built to prove.

1. **The LLM never sets the score, and never has final authority.** `server/decision-engine/score.ts` must never import from `llm.ts`; `llm.ts` may read the score to build its prompt, never the reverse. The LLM's only outputs are: an explanation string, a drafted message, and an intervention-type value from a fixed enum — all schema-validated via AI SDK's `generateObject`. A malformed or out-of-enum response is a validation failure → falls back to No Action, the same as any other guardrail failure. (`@docs/ARCHITECTURE.md` §4.3)
2. **Every call into `execute.ts` requires a passed (or merchant-approved) guardrail verdict as an argument.** There must be no code path that reaches Razorpay or the simulated-send function without one — guardrail bypass should be impossible to write, not just discouraged.
3. **`is_simulated` and `is_synthetic` are explicit booleans, checked directly, everywhere.** Never infer real-vs-simulated from a proxy (e.g. presence of a Razorpay ID). Any UI showing an action must visibly distinguish simulated from real — dashed vs. solid border, per `@docs/Design.md` §9.4 — and that distinction is enforced at the data layer first, not just in how it's rendered.
4. **The do-nothing baseline must never read `synthetic_ground_truth_recoverable`.** It uses only the independent `SPONTANEOUS_RESOLUTION_RATE` constant. This was a real, already-fixed bug (`@docs/decisions.md` D-014) — if both do-nothing and contact-everyone read the same per-payment ground-truth value, they produce identical results on every payment, making it mathematically impossible for the product to ever show its headline claim. Reintroducing this silently breaks the benchmark without throwing any error.
5. **`agent_decisions` and `audit_logs` are append-only.** Never `UPDATE` or `DELETE` a row in either — a correction, a retry, or a merchant's approve/decline action is always a *new* row, never an edit. "The current decision" for a payment is the row with the latest timestamp, not the only row.
6. **No business logic in the frontend or in API route handlers.** Route handlers parse the request, call one function from `server/`, format the response — nothing more. Server Components fetch via direct function calls into `server/` for initial page loads, not client-side calls to `/api`.
7. **All config — guardrail thresholds, `LLM_PROVIDER`, `SPONTANEOUS_RESOLUTION_RATE` — is environment variables, never hardcoded constants and never database rows.** No `settings`/`config` table exists or should be added.
8. **One query module per table, no raw SQL scattered in route handlers.**

## Tech stack

Full reasoning: @docs/TECH_STACK.md

- **Framework:** Next.js App Router — one deployable unit; frontend, API routes, and the webhook listener all live in this one app. This is deliberate (`@docs/decisions.md` D-010), not a default to reconsider.
- **Language:** TypeScript throughout.
- **Styling:** Tailwind + shadcn/ui, driven entirely by the design tokens in `@docs/Design.md` §2 — no hardcoded colors, spacing, or radii in component code.
- **Charts:** Recharts.
- **Database:** PostgreSQL via Supabase.
- **Auth:** Supabase Auth — single merchant, email/password, no roles/teams/SSO.
- **LLM:** Gemini 2.5 Flash (primary) via Vercel AI SDK **v5 stable** (explicitly not v6 beta — decided deliberately, see `@docs/decisions.md` D-009) using `generateObject`; Groq Llama 3.3 70B as a config-swap fallback via `LLM_PROVIDER`, never called concurrently with Gemini.
- **Schema validation:** Zod, paired with `generateObject`.
- **Payments:** Razorpay test mode only — one payment link creation call, one webhook listener for one event type, nothing more. No signature verification, idempotency, or retry hardening — a stated limitation, not an oversight.
- **Testing:** Vitest, unit tests on the deterministic decision engine only (`classify-failure.ts`, `score.ts`, `guardrails.ts`). No E2E framework — Day 7 includes a full manual walkthrough instead.
- **Deployment:** Vercel, git-push deploy, no separate CI/CD pipeline.

## Folder structure

Full detail: @docs/ARCHITECTURE.md §3–§4

```text
recover-ai/
├── app/
│   ├── (marketing)/page.tsx               # Landing page
│   ├── (app)/
│   │   ├── layout.tsx                     # App shell + session-check gate for this route group
│   │   ├── dashboard/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── payments/[id]/                 # drawer content
│   │   ├── customers/[id]/page.tsx
│   │   ├── recovery/page.tsx
│   │   └── evaluation/page.tsx
│   └── api/
│       ├── webhooks/razorpay/route.ts     # one event type only
│       ├── payments/[id]/decide/route.ts
│       ├── payments/[id]/approve/route.ts # merchant approve/decline on an escalated payment
│       └── evaluation/run/route.ts
│
├── components/
│   ├── ui/                                # shadcn primitives
│   └── recovery/                          # one component per Design.md spec entry — reused
│                                          #   across pages, never reimplemented per page
│
├── lib/
│   ├── api-client.ts
│   └── types.ts
│
├── server/                                # the sole authority for score, guardrails, LLM
│   │                                      #   validation, and every logged decision
│   ├── decision-engine/
│   │   ├── classify-failure.ts
│   │   ├── score.ts                       # pure TS, no I/O, never imports llm.ts
│   │   ├── guardrails.ts                  # three-way verdict: passed | blocked | escalated
│   │   ├── llm.ts
│   │   └── execute.ts
│   ├── baseline-engine/
│   │   ├── contact-everyone.ts
│   │   └── do-nothing.ts                  # SPONTANEOUS_RESOLUTION_RATE only — see rule 4 above
│   ├── evaluation/
│   │   ├── synthetic-data.ts              # never imported by decision-engine/score.ts
│   │   └── metrics.ts
│   ├── audit/log.ts                       # single write path for every audit_logs row
│   └── db/
│       ├── client.ts
│       └── queries/                       # one typed module per table
│
├── tests/
│   └── decision-engine/                   # Vitest — highest-risk, cheapest-to-test code
│
├── docs/
│   ├── PRD.md          ├── ARCHITECTURE.md   ├── evaluation.md
│   ├── MyIdea.md        ├── DATABASE.md       └── decisions.md
│   └── Design.md        └── TECH_STACK.md
│
├── public/
├── .env.example                           # documents every required var, populates none
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

## Setup & commands

Confirm against `package.json` once it exists — this is the expected shape, not yet verified against a real config:

```bash
npm install
npm run dev          # local dev server
npm run build         # production build
npm run test           # vitest run — decision-engine unit tests
npm run lint           # lint
```

Required environment variables (see `.env.example` for the authoritative list, none populated there): Supabase URL/keys, `LLM_PROVIDER` + Gemini/Groq API keys, Razorpay test-mode keys, guardrail thresholds (`MAX_RETRIES`, `MAX_CONTACT_ATTEMPTS`, `MIN_TIME_BETWEEN_CONTACT`, `MIN_SCORE_TO_INTERVENE`, human-approval amount threshold), `SPONTANEOUS_RESOLUTION_RATE`.

## Code review / PR expectations

- Match the design tokens in `@docs/Design.md` §2 exactly — no ad hoc colors, spacing, or radii.
- A new UI element for something already in `@docs/Design.md` §7/§9 (status badges, score breakdown, guardrail check row, simulated/real indicator, audit trail, approval action pair, baseline chart, methodology banner) reuses that spec's component — it does not get a new one-off implementation per page.
- Any change to `server/decision-engine/` or `server/baseline-engine/` needs a matching Vitest test, since that's the one place this project has decided testing effort belongs (`@docs/TECH_STACK.md` §7).
- A change to what's real vs. simulated updates `@docs/decisions.md` §1 (the disclosure table) in the same change — not after. That file states explicitly that a stale disclosure is worse than no disclosure.

## When you're not sure

- **Feature ambiguity:** check `@docs/PRD.md` §5 (MVP scope) before assuming something should be built, and §6/§10 before assuming something should be added. If genuinely undecided, ask — don't default to the more-impressive option. This project has a repeated, deliberate pattern of cutting scope that looked reasonable in isolation (`@docs/decisions.md` D-006 is the clearest example: a guardrail was cut entirely rather than shipped decorative).
- **A real gap or inconsistency in the docs themselves:** this has happened before and was worth catching, not silently working around (`@docs/decisions.md` D-013, D-014 — one was a missing database state, the other was a statistical bug that would have quietly broken the evaluation's headline claim). Flag it.
- **Any new significant decision** (library choice, schema change, scope cut, a fix like D-013/D-014): gets logged in `@docs/decisions.md` §2, in the same Context / Decision / Consequences shape as the existing entries, per that file's own §3 instructions — not left undocumented for someone to rediscover later.
