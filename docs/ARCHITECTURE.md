# Technical Architecture — RecoverAI

**Scope:** How the system defined in `PRD.md` is actually built and wired together — layers, boundaries, data flows, and the conventions the codebase should follow. Optimized for a solo-built, single-merchant MVP shipped in a 6-day window (`MyIdea.md` §16), not for production scale. No feature, integration, or requirement introduced here that isn't already agreed in `PRD.md` / `MyIdea.md` — this document describes *how* to build what's already specified, not *what* to build.

**One addition not previously discussed:** authentication. Neither `PRD.md` nor `MyIdea.md` specifies it, because the product is explicitly scoped as a single-merchant demo (`PRD.md` §10 — no multi-tenant account system). §5 below proposes the minimum viable answer consistent with that scope, flagged clearly as new rather than presented as already-agreed.

---

## 1. Architectural Principles

These follow directly from the product's own thesis (`MyIdea.md` §7) and this build's constraints, and should guide every structural decision below:

1. **The LLM never holds authority.** It explains, drafts, and proposes; deterministic backend code decides and enforces. This is not just a product claim (`PRD.md` NFR "Boundedness") — it must be a structural boundary in the code (§4.3), not just a convention people remember to follow.
2. **Every decision is inspectable.** The score, the guardrail check, and the LLM's output must each be independently visible and loggable (`PRD.md` FR-10) — the architecture must make it *easy* to log each stage, not something bolted on afterward.
3. **Simulated is never silently indistinguishable from real.** This is a data-layer and API-layer concern, not just a UI concern (`Design.md` §9.4) — the boundary is enforced where the record is created, not just where it's rendered.
4. **Build for one solo developer shipping in 6 days**, not for a team or for scale. Every choice below favors fewer moving parts, fewer new concepts, and faster local iteration over infrastructure that would matter at 10,000 merchants — because this product will never run at 10,000 merchants (`PRD.md` §10).
5. **No layer invents scope.** The architecture supports exactly the pages, journeys, and integrations already defined in `PRD.md` §5 and §5.9 — nothing is added here "because it would be good practice," per `MyIdea.md` §18 ("What NOT to do").

---

## 2. System Overview

RecoverAI is a single Next.js application (frontend + backend in one deployable unit) backed by a single Postgres database, with two outbound integrations: an LLM provider (Gemini, with Groq as a config-swap fallback) and Razorpay in test mode. There is no separate backend service, no message queue, and no microservices — a monolith is the correct architecture for this scope (§7.1).

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APPLICATION (Vercel)                  │
│                                                                       │
│  ┌───────────────────┐        ┌───────────────────────────────────┐ │
│  │   FRONTEND         │        │   BACKEND                         │ │
│  │   (React/TS,       │  HTTP  │   (API routes / server actions,   │ │
│  │   App Router,      │◄──────►│   Node/TS)                        │ │
│  │   Tailwind/shadcn)  │        │                                   │ │
│  │                    │        │  ┌─────────────────────────────┐  │ │
│  │  Dashboard         │        │  │  Decision Engine            │  │ │
│  │  Payments          │        │  │  ┌────────────────────────┐│  │ │
│  │  Customer          │        │  │  │ Failure classifier      ││  │ │
│  │  Recovery          │        │  │  │ Deterministic scorer    ││  │ │
│  │  Evaluation        │        │  │  │ Policy/guardrail engine ││  │ │
│  │  Landing (public)  │        │  │  └────────────────────────┘│  │ │
│  └───────────────────┘        │  │  ┌────────────────────────┐│  │ │
│                                │  │  │ LLM reasoning layer     ││  │ │
│                                │  │  │ (explain/draft/propose) ││  │ │
│                                │  │  └────────────────────────┘│  │ │
│                                │  │  ┌────────────────────────┐│  │ │
│                                │  │  │ Baseline engine          ││  │ │
│                                │  │  │ (contact-all/do-nothing) ││  │ │
│                                │  │  └────────────────────────┘│  │ │
│                                │  └─────────────────────────────┘  │ │
│                                └──────────────┬────────────────────┘ │
└───────────────────────────────────────────────┼──────────────────────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────┐
                     ▼                            ▼                        ▼
           ┌───────────────────┐      ┌────────────────────┐   ┌────────────────────┐
           │ PostgreSQL         │      │ LLM Provider        │   │ Razorpay             │
           │ (Supabase)         │      │ Gemini 2.5 Flash    │   │ (test mode)          │
           │                    │      │ (Groq fallback,     │   │ payment link +       │
           │ merchants          │      │  config-swap)       │   │ 1 webhook listener   │
           │ customers          │      │ via AI SDK v5       │   └────────────────────┘
           │ payments           │      │ generateObject()    │
           │ recovery_attempts  │      └────────────────────┘
           │ agent_decisions    │
           │ audit_logs         │
           └───────────────────┘
```

---

## 3. Frontend Layer

### 3.1 Responsibility

Render merchant-facing surfaces (`PRD.md` §5.1–§5.5) and the public landing page (`Design.md` §3.2). The frontend's job is display, interaction, and client-side state for in-progress UI (drawer open/closed, active tab, form inputs) — **it holds no business logic**. It does not compute scores, does not decide guardrail outcomes, and does not call the LLM or Razorpay directly.

### 3.2 Structure

Next.js App Router, one route segment per product page, matching `PRD.md` §5 and `Design.md` §3 one-to-one:

```text
app/
  (marketing)/
    page.tsx                  → Landing page (Design.md §3.2)
  (app)/
    layout.tsx                → App shell: icon rail + nav panel (Design.md §3.1)
    dashboard/page.tsx        → PRD §5.1
    payments/page.tsx         → PRD §5.2
    payments/[id]/            → drawer content, loaded via route or client fetch
    customers/[id]/page.tsx   → PRD §5.3
    recovery/page.tsx         → PRD §5.4
    evaluation/page.tsx       → PRD §5.5
  api/                        → see §4.2
components/
  ui/                         → shadcn primitives (button, badge, card, tabs...)
  recovery/                   → domain components: ScoreBreakdown, GuardrailCheckRow,
                                 SimulatedIndicator, AuditTrailTimeline, StatusBadge
                                 (Design.md §7, §9 — one component per spec entry,
                                 not one ad hoc component per page)
lib/
  api-client.ts               → typed fetch wrappers around /api routes
  types.ts                    → shared TS types, mirrored from db schema (§4.4)
```

### 3.3 Conventions

- **One domain component per Design.md spec entry** (score breakdown, guardrail check row, simulated indicator, audit trail timeline, status badge — `Design.md` §7 and §9) reused across pages, rather than each page implementing its own version. `Design.md` §3.3–§3.6 already assumes this reuse (e.g., the Payments drawer and Customer page both reuse the same list-row card) — the component structure should make that reuse the only option, not an opportunity someone has to notice.
- **Design tokens only** (`Design.md` §2) — no hardcoded colors, spacing, or radii in component code. Enforced via Tailwind theme config, not convention alone.
- **Server Components by default**, Client Components only where interactivity requires it (drawer state, tab switching, form inputs). Data fetching for page-level content happens in Server Components calling internal functions directly (§4.2) — not client-side fetches to `/api` for the initial page load, which keeps the common case simple and fast without introducing a client-state library.
- **No direct database or LLM calls from frontend code.** Every data access goes through the backend layer (§4), even though Next.js technically allows Server Components to query the database directly — this boundary is kept even at the cost of one extra function call, because §1.1 and §1.2 depend on every decision passing through the same inspectable path.

---

## 4. Backend Layer

### 4.1 Responsibility

The backend is the **sole authority**: it is where the score is computed, where guardrails are enforced, where LLM output is validated, and where every decision is logged. If a rule from `PRD.md` §7 or `MyIdea.md` §7 needs enforcing, it is enforced here — never in the frontend, never assumed from the LLM's output.

### 4.2 Structure

Given the 6-day build window, prefer **direct function calls from Server Components** for reads, and **API routes** for anything that mutates state, is triggered by an external webhook, or needs to be called from a Client Component:

```text
app/api/
  webhooks/razorpay/route.ts       → PRD §5.9: 1 webhook, payment-success event only
  payments/[id]/decide/route.ts    → triggers the full decision flow (§6.1) for one payment
  payments/[id]/approve/route.ts   → merchant's approve/decline action on an
                                       'awaiting_approval' payment (DATABASE.md §2.3.2).
                                       Approve: writes a new agent_decisions row
                                       (guardrail_result='passed'), proceeds to execute.ts.
                                       Decline: writes a new agent_decisions row
                                       (guardrail_result='blocked', reason='merchant
                                       declined'), payments.status → 'no_action'. Neither
                                       mutates the original escalated row (append-only,
                                       DATABASE.md §2.5) — this route's actual behavior
                                       was previously named but never specified here
  evaluation/run/route.ts          → triggers the benchmark harness (PRD §5.8) over the batch

server/
  decision-engine/
    classify-failure.ts            → rule-based classification (PRD FR-1)
    score.ts                       → deterministic scoring formula (PRD FR-2/FR-3) — pure TS, no I/O
    guardrails.ts                  → policy engine (PRD FR-4/FR-5/FR-7)
    llm.ts                         → Gemini/Groq calls via AI SDK generateObject (PRD FR-6)
    execute.ts                     → simulated send / Razorpay link creation (PRD FR-8/FR-9)
  baseline-engine/
    contact-everyone.ts            → outcome from synthetic_ground_truth_recoverable
    do-nothing.ts                  → outcome from SPONTANEOUS_RESOLUTION_RATE only —
                                       must never import synthetic_ground_truth_recoverable
                                       (evaluation.md §2.4)
  evaluation/
    synthetic-data.ts              → generator + hidden ground-truth function (PRD FR-11,
                                       MyIdea §10.1 — lives in its own module, never imported
                                       by decision-engine/score.ts, enforcing non-circularity
                                       at the code-structure level, not just by convention)
    metrics.ts                     → precision/recall, ₹ recovered, contact attempts (PRD FR-12/13)
  audit/
    log.ts                         → single write path for all decision + non-decision events
  db/
    client.ts                      → Postgres connection (Supabase)
    queries/                       → one file per table, typed query functions
```

### 4.3 The deterministic/LLM boundary, as code structure

This is the single most important structural rule in the backend, because it is the architecture's answer to `PRD.md`'s "Boundedness" NFR:

- `decision-engine/score.ts` **must not** import anything from `decision-engine/llm.ts`, and vice versa is one-directional only: `llm.ts` may read the score's output to build its prompt, but `score.ts` never reads anything the LLM produced.
- `llm.ts`'s only outputs are: (a) a natural-language explanation string, (b) a drafted message string, (c) an intervention-type value from a fixed enum — all schema-validated via AI SDK's `generateObject` (`MyIdea.md` §6, §14). A malformed or out-of-enum response is a validation failure, handled the same way as any other guardrail failure: fall back to No Action (`PRD.md` Edge Cases §9).
- `guardrails.ts` receives the score (from `score.ts`) and the proposal (from `llm.ts`) as plain data and is the only module allowed to produce a final verdict — **one of three**, not two: `passed` (execute now), `blocked` (permanent no-action), or `escalated` (would execute, but the amount exceeds the human-approval threshold — pauses for the merchant's Approve/Decline action, §5, DATABASE.md §2.3.2). Nothing downstream of `guardrails.ts` re-checks or overrides that verdict.
- Every call into `execute.ts` requires a passed guardrail verdict as an argument — there is no code path that reaches Razorpay or the simulated-send function without one, which makes "the LLM bypassed a guardrail" a type error, not just a bug to watch for.

### 4.4 Conventions

- **One query module per table**, no raw SQL scattered across route handlers — keeps the schema (§4.5) the single source of truth for shape, and makes it possible to change a table without hunting through the whole codebase.
- **Config via environment variables only** (`PRD.md` NFR "Security"): `LLM_PROVIDER` (gemini | groq), API keys, Razorpay test keys, guardrail thresholds (`MAX_RETRIES`, `MAX_CONTACT_ATTEMPTS`, `MIN_SCORE_TO_INTERVENE`, human-approval amount), and `SPONTANEOUS_RESOLUTION_RATE` (evaluation-only, `evaluation.md` §2.4). Guardrail thresholds being env-driven rather than hardcoded constants means the demo can show a threshold change taking effect without a code deploy, which is a cheap, real demonstration of "these are enforced rules, not decoration."
- **LLM provider swap is a one-line config change** (`LLM_PROVIDER=groq`), per `MyIdea.md` §14 — `llm.ts` wraps both providers behind one interface so nothing else in the codebase needs to know which is active.
- **No business logic in API route handlers.** Route handlers parse the request, call one function from `server/`, and format the response. This keeps the decision engine testable independent of HTTP, which matters for the evaluation harness (§4.2, `evaluation/`), which calls the same scoring/guardrail functions directly, in-process, over 500–1,000 records — not over HTTP.

---

## 5. Authentication (new — not previously specified)

`PRD.md` §10 scopes this as a single-merchant demo with no multi-tenant account system, and neither prior document addresses login. Given that scope, the right-sized answer is the smallest thing that (a) keeps the deployed demo from being an open, unauthenticated write-capable URL, and (b) doesn't introduce multi-tenant complexity the product explicitly doesn't need:

- **Supabase Auth, email/password, single merchant user.** Supabase is already the database provider (`MyIdea.md` §14), so this adds no new vendor.
- **One `merchants` row, one associated auth user.** No organization/team model, no roles, no invite flow — `PRD.md` §10 rules these out explicitly ("multi-tenant merchant management... beyond what's needed to demo a single merchant's data").
- **Session check happens once, at the `(app)` layout level** (`app/(app)/layout.tsx`), gating the entire authenticated route group. The landing page (`(marketing)`) and the Razorpay webhook route are the only unauthenticated entry points — the webhook is authenticated separately, by Razorpay's request signature being present (though full signature *verification* is out of scope per `PRD.md` §5.9/§10; the route simply isn't reachable from the public UI).
- **No API-key-based merchant access, no public API.** Nothing in `PRD.md` requires the product to expose an API beyond its own frontend, so none is built.

This is intentionally the least amount of auth architecture that satisfies "the deployed demo isn't wide open" — anything more (roles, teams, SSO) would be exactly the kind of premature scaffolding this document's principles (§1.4) argue against.

---

## 6. Database Layer

### 6.1 Responsibility

Postgres (via Supabase, per `MyIdea.md` §14) is the single source of truth for all persistent state: payments, customers, recovery attempts, every agent decision (including no-action), and the full audit log. The database does not contain business logic (no stored procedures for scoring or guardrails) — it stores the inputs and outputs of the backend layer's logic, keeping all decision logic in one place (§4) rather than split between application code and the database.

### 6.2 Schema

Six tables, as named in `MyIdea.md` §14, with responsibilities made explicit here:

```text
merchants
  id, name, created_at
  — single row for the MVP (§5); shape left open for multi-merchant only if ever revisited,
    not built out now (PRD §10)

customers
  id, merchant_id, name, contact_info, created_at
  — one row per synthetic or real customer; feeds behavioral signals in Design.md §3.5

payments
  id, merchant_id, customer_id, amount, method, failure_reason,
  status (pending | awaiting_approval | recovered | no_action | failed),
  is_synthetic (bool),
  created_at, updated_at
  — status vocabulary matches DATABASE.md §2.3 exactly, including "No Action" and
    "awaiting_approval" (added in the DATABASE.md revision that closed the human-approval
    gap this sketch previously didn't reflect — see §5, §8.1 step 6) as first-class

recovery_attempts
  id, payment_id, attempt_number, intervention_type,
  is_simulated (bool),               ← Design §9.4 boundary enforced here, not just in UI
  sent_at, outcome, outcome_at
  — no separate "channel" field: intervention_type (payment_link | reminder_message,
    DATABASE.md §2.4) already implies the delivery mechanism given MVP's undifferentiated
    messaging (§7.3); an earlier version of this sketch listed one, dropped here to match
    the authoritative schema in DATABASE.md rather than leaving two documents disagreeing

agent_decisions
  id, payment_id, score, score_breakdown (jsonb), classification,
  guardrail_result (passed | blocked | escalated), guardrail_reason,
  llm_explanation, llm_proposed_intervention,
  decided_at
  — one row per decision, including no-action and escalated decisions (PRD FR-5, FR-10;
    DATABASE.md §2.3.2 on the escalated state and the approve/decline flow)

audit_logs
  id, payment_id, event_type, event_detail (jsonb), timestamp
  — append-only; every stage in §7.1's flow writes one row here via audit/log.ts (§4.2),
    never written to directly from route handlers
```

### 6.3 Conventions

- **`is_simulated` and `is_synthetic` are boolean columns, not inferred from other fields.** This is the same "simulated must be visually distinct" principle (§1.3) applied to the data layer: a query can filter real-vs-simulated or synthetic-vs-real without joining or guessing, and the frontend's simulated-indicator component (`Design.md` §9.4) reads this column directly.
- **`agent_decisions` and `audit_logs` are append-only.** Nothing in the application updates or deletes rows in these tables — a correction is a new row, not an edit — because `PRD.md`'s auditability requirement means the history itself must be trustworthy, not just the current state.
- **Score breakdowns and LLM output are stored as `jsonb`**, not normalized into further tables, since they're written once, read for display, and never queried by their internal fields — normalizing them would add migration overhead with no benefit at this scale (§1.4).
- **No ORM abstraction beyond typed query functions** (§4.2's `db/queries/`). A full ORM (Prisma, Drizzle) is a reasonable choice but not a required one for six tables in a six-day build; either raw parameterized SQL or a lightweight query builder is fine — the important convention is one query module per table, not the specific library.

---

## 7. External Services

### 7.1 LLM Provider — Gemini 2.5 Flash (primary), Groq Llama 3.3 70B (fallback)

Called exclusively from `server/decision-engine/llm.ts` (§4.2/§4.3), through Vercel AI SDK v5's `generateObject` for schema-validated structured output (`MyIdea.md` §14). Three narrow jobs only, per `MyIdea.md` §6: explain the score, draft the recovery message, propose an intervention type from a fixed enum. The evaluation harness (`server/evaluation/`) never calls the LLM — the benchmark runs on deterministic scoring only (`MyIdea.md` §14's note that the recovery score is plain TypeScript), so free-tier rate limits only matter for the handful of live-demoed decisions.

### 7.2 Razorpay (test mode)

Two integration points only, per `PRD.md` §5.9, both isolated in `server/decision-engine/execute.ts` and `app/api/webhooks/razorpay/route.ts`:

- Create one test-mode payment link, called from `execute.ts` when a guardrail-passed decision's intervention type requires it.
- Listen for one webhook event (payment success), which updates the corresponding `payments` and `recovery_attempts` rows and appends to `audit_logs`.

No signature verification, no idempotency handling, no retry logic — explicitly out of scope (`PRD.md` §9, §10) and documented as a stated limitation in `docs/decisions.md`, not silently absent.

### 7.3 No other external services

No real WhatsApp/Email/SMS provider (`PRD.md` §5.9) — `execute.ts`'s simulated-send path writes a `recovery_attempts` row with `is_simulated = true` and returns immediately; no outbound network call is made at all for this path, which is itself part of what makes the boundary honest rather than merely labeled.

---

## 8. Core Data Flows

### 8.1 Flow A — Recovery decision (covers both the "act" and "restraint" journeys, `PRD.md` Journeys B & C)

```text
1. Payment fails (synthetic event or real Razorpay test-mode webhook)
        │
        ▼
2. classify-failure.ts   → recoverable / not-recoverable category
        │
        ▼
3. score.ts              → deterministic 0–100 score + breakdown (pure function, no I/O)
        │
        ▼
4. guardrails.ts (first pass) → is score ≥ MIN_SCORE_TO_INTERVENE? attempts remaining?
        │                        time since last contact ok?
        ├── NO  ──► agent_decisions row (guardrail_result = blocked) + audit_logs
        │           entry ("NO ACTION — <reason>") → done, no further steps (PRD FR-5)
        │
        └── YES ─► continue
        │
        ▼
5. llm.ts                → explanation (prose) + drafted message + proposed
                            intervention type, via generateObject (schema-validated)
        │
        ▼
6. guardrails.ts (second pass) → validate LLM's proposed intervention type is in the
                                   allowed enum and within remaining attempt/amount limits
        │
        ├── FAILS validation ──► fall back to NO ACTION, log why (PRD Edge Cases §9)
        │
        ├── PASSES, amount above human-approval threshold ──► ESCALATE:
        │           agent_decisions row (guardrail_result = 'escalated') + payments.status
        │           → 'awaiting_approval' + audit_logs entry → pause here. Resumes only via
        │           the merchant's Approve/Decline action (§4.2, DATABASE.md §2.3.2), which
        │           writes its own new agent_decisions row and either rejoins step 7 below
        │           (approved) or ends at NO ACTION (declined) — never auto-resolved
        │
        └── PASSES, within threshold ─► continue
        │
        ▼
7. execute.ts            → simulated send (is_simulated=true, no network call) OR
                            Razorpay test-mode payment link creation
        │
        ▼
8. audit/log.ts writes every step above to audit_logs; agent_decisions row finalized
        │
        ▼
9. Customer pays (simulated resolution or real test-mode webhook) → status updates to
   RECOVERED; dashboard and evaluation metrics reflect the update on next read
```

Every arrow in this flow is a plain function call within the same Next.js process — there is no queue, no async job runner, and no separate service boundary, which is deliberately simpler than a "real" production recovery system would be (§1.4).

### 8.2 Flow B — Evaluation / benchmark run (`PRD.md` §5.8, FR-11–FR-13)

```text
1. synthetic-data.ts generates 500–1,000 payments with observable features
   + a hidden ground-truth outcome (independent function, never imported by score.ts)
        │
        ▼
2. For each payment, run three strategies in-process (no HTTP, no LLM):
     a) Agent      → classify-failure.ts + score.ts + guardrails.ts (same modules as
                      Flow A, called directly — one code path, not a duplicate). The
                      human-approval threshold check is bypassed during evaluation runs
                      (treated as auto-approved) since a batch has no merchant available
                      to click Approve — every other guardrail still applies in full
                      (evaluation.md §3.2, note on the escalation gap this closes)
     b) Contact-everyone → baseline-engine/contact-everyone.ts — outcome from
                            synthetic_ground_truth_recoverable, same as the agent's
                            contacted payments (evaluation.md §2.4)
     c) Do-nothing       → baseline-engine/do-nothing.ts — outcome from the independent
                            SPONTANEOUS_RESOLUTION_RATE constant, drawn per payment.
                            **Must never read synthetic_ground_truth_recoverable** — doing
                            so was a real bug in the original design (evaluation.md §2.4):
                            it would make do-nothing's outcome identical to
                            contact-everyone's on every payment, since both would be
                            reading the same boolean, making it impossible for either
                            contacted strategy to ever show a measured advantage
        │
        ▼
3. Each strategy's decision is checked against its own outcome signal (§2 above) to
   determine simulated success/failure — never against the agent's own score, and never
   by mixing the two ground-truth signals across strategies
        │
        ▼
4. metrics.ts aggregates: ₹ recovered, recovery rate, contact attempts used (all three
   strategies), precision/recall (agent only, vs. hidden ground truth)
        │
        ▼
5. Results persisted (or computed on demand — either is acceptable at this scale) and
   rendered on the Evaluation page (Design.md §3.3)
```

This flow deliberately reuses the exact same `score.ts`/`guardrails.ts` modules as Flow A rather than a parallel "evaluation mode" implementation — running different code in the benchmark than in the live decision path would undermine the non-circularity guarantee `MyIdea.md` §10.1 is built around.

### 8.3 Flow C — Merchant reads a page (`PRD.md` Journey A, D)

```text
Merchant → Server Component → db/queries/* (direct function call, no /api round-trip)
         → rendered page
```

No caching layer, no client-side state management beyond component state for UI interactions (drawer, tabs). At 500–1,000 records and one merchant, a direct query on every page load is fast enough and far simpler than introducing a cache invalidation story this product doesn't need (§1.4).

---

## 9. Architectural Patterns & Conventions Summary

For quick reference — the specific patterns established above that the codebase should follow consistently:

| Pattern | Why |
|---|---|
| Deterministic scoring and LLM reasoning are separate modules with a one-directional dependency (§4.3) | Makes "LLM never sets the score" a structural fact, not a remembered rule |
| Every executable action requires a passed guardrail verdict as an argument (§4.3) | Makes "guardrail bypass" a type error, not a possible bug |
| One query module per table, no raw SQL in route handlers (§4.4, §6.3) | Schema stays the single source of truth; easy to audit and change |
| `is_simulated` / `is_synthetic` as explicit boolean columns (§6.3) | Enforces the real-vs-simulated boundary at the data layer, not just the UI |
| `agent_decisions` and `audit_logs` are append-only (§6.3) | Preserves a trustworthy history, per the auditability NFR |
| LLM provider selected via one env var, behind one interface (§4.4) | Config-swap fallback with zero code changes, per `MyIdea.md` §14 |
| Guardrail thresholds are env-driven, not hardcoded (§4.4) | Cheap, real demonstration that rules are enforced, not decorative |
| Evaluation harness calls the same decision-engine functions as the live flow, in-process (§8.2) | Preserves non-circularity; avoids a second, drifting implementation |
| One domain UI component per Design.md spec entry, reused across pages (§3.3) | Matches the reuse Design.md's page compositions already assume |
| No business logic in frontend or in route handlers (§3.3, §4.4) | Keeps decision logic testable and in exactly one place |

---

## 10. What This Architecture Deliberately Does Not Include

Consistent with `PRD.md` §10 and `MyIdea.md` §18, and following the same convention `Design.md` §12 uses to state exclusions plainly rather than leaving them implicit:

- No microservices, message queue, or background job runner — a single Next.js process handles both request/response and the evaluation batch run synchronously or via a single triggered route.
- No caching layer (Redis or otherwise) — unnecessary at one merchant and a 500–1,000-record benchmark.
- No ORM requirement, no database migration framework mandated beyond whatever ships fastest (Supabase's own migration tooling is sufficient).
- No horizontal scaling, load balancing, or multi-region deployment — Vercel's default single-deployment model is sufficient for a demo.
- No API rate limiting, request throttling, or DDoS protection beyond what Vercel provides by default.
- No role-based access control, teams, or multi-tenant merchant support (§5) — one merchant, one login.
- No production-grade Razorpay webhook hardening (signature verification, idempotency, retry/backoff) — restated here from `PRD.md` §9/§10 because it's as much an architectural decision as a feature decision.
- No automated CI/CD pipeline beyond Vercel's built-in git-push deploy — a dedicated pipeline would cost build time this project doesn't have and isn't required by anything in `PRD.md`.

These are not oversights; each is a scope decision already made in `PRD.md`/`MyIdea.md`, restated here so the architecture doesn't silently drift toward building them "for correctness" during implementation.
