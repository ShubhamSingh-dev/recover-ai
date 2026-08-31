# Database — RecoverAI

**Scope:** The complete, authoritative schema for RecoverAI — entities, fields, relationships, constraints, indexes, and the business rules and access rules that govern them. This document is the source of truth for the database: any schema change should be made here first, then implemented, not the other way around. Built from `ARCHITECTURE.md` §6 (which named the six tables) and `PRD.md`/`MyIdea.md`'s functional requirements — nothing here changes an agreed table name or relationship without a stated reason (flagged inline where this document adds a field or rule not previously specified).

**Two inferences made explicit here, not previously specified at field level:**
1. **Intervention type enum values** (`payment_link`, `reminder_message`) — `MyIdea.md` §6 says the LLM proposes "from an allowed action enum" but only names `createPaymentLink()` and `sendMessage()` as the two real execution tools; this document fixes those two as the enum, consistent with `MyIdea.md` §7's rule that no guardrail (or enum value) should exist without gating a real code path. Adding a third value later needs both a code path and an update here.
2. **Row Level Security (RLS) as the authorization mechanism** — `ARCHITECTURE.md` §5 established single-merchant Supabase Auth but didn't specify how database access is actually restricted. §7 below proposes RLS specifically because it's declarative, built into the already-chosen database (no new tool), and is Supabase's own idiomatic default — the simpler option here, not an added one.

---

## 1. Principles

1. **Normalized, no redundant derived data stored where it can be recomputed.** Where a value is a deterministic function of another (e.g., failure-reason → recoverable/not-recoverable classification), it is computed and stored once, at decision time, in the table that represents that decision — not duplicated onto the payment itself. See §2.3, §2.5.
2. **Six tables, no more.** `merchants`, `customers`, `payments`, `recovery_attempts`, `agent_decisions`, `audit_logs` — exactly the set named in `ARCHITECTURE.md` §6.2. §9 states explicitly what related-seeming tables were considered and deliberately not added.
3. **Append-only where the record represents history.** `agent_decisions` and `audit_logs` are never updated or deleted — a correction is a new row. This is what makes `PRD.md`'s auditability requirement actually true at the data layer, not just a UI presentation choice.
4. **The real/simulated and real/synthetic boundaries are columns, not inferred state.** `is_simulated` and `is_synthetic` are explicit booleans, checked directly — never derived by, say, checking whether a Razorpay ID is present.
5. **One merchant today, schema shaped so that isn't a structural dead end — without building for multi-tenancy now.** Every table that needs merchant scoping has a `merchant_id` (directly or reachable by one join), which is what makes Row Level Security possible with plain, boring policies (§7) rather than because multi-merchant support is planned.

---

## 2. Entities

### 2.1 `merchants`

The single merchant using the product (`PRD.md` §10 — no multi-tenant account system).

| Field | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `auth_user_id` | `uuid` | `NOT NULL`, `UNIQUE`, references Supabase-managed `auth.users(id)` |
| `name` | `text` | `NOT NULL` |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()` |

**Business rules:**
- Exactly one row is expected to exist for the life of this MVP. This is a documented operational convention, not a database constraint — a `CHECK`/trigger enforcing "only one row" would be one more moving part to maintain for a fact that's true by construction (there's only one signup flow, run once). Revisit only if `PRD.md` §10's single-merchant scope changes.
- `auth_user_id` is the only link between the database's business data and Supabase Auth's own `auth.users` table — no other table references `auth.users` directly (§7).

### 2.2 `customers`

One row per customer known to the merchant, real or synthetic.

| Field | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `merchant_id` | `uuid` | `NOT NULL`, references `merchants(id) ON DELETE CASCADE` |
| `name` | `text` | `NOT NULL` |
| `contact_info` | `text` | `NOT NULL` — email or phone; treated as PII, see §8 |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()` |

**Business rules:**
- `contact_info` is never displayed in list views (Payments, Recovery pages) per `Design.md` §3.4/§3.6's list-row card, which shows name/amount/status, not contact details — the customer detail page (`PRD.md` §5.3) is the only surface that reads this column. This is a query-shape convention (§8), not a schema constraint.
- Behavioral signals shown on the customer page (`PRD.md` §5.3: time-of-day pattern, past success rate) are **not stored as columns here** — they're computed on read from that customer's `payments`/`recovery_attempts` history. Storing them would duplicate data already derivable and risk drift from the source rows.

### 2.3 `payments`

The central entity: one row per failed payment (real test-mode or synthetic), covering `PRD.md` §5.2, FR-1, FR-2, FR-11.

| Field | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `merchant_id` | `uuid` | `NOT NULL`, references `merchants(id) ON DELETE CASCADE` |
| `customer_id` | `uuid` | `NOT NULL`, references `customers(id) ON DELETE RESTRICT` |
| `amount` | `numeric(12,2)` | `NOT NULL`, `CHECK (amount > 0)` |
| `method` | `text` | `NOT NULL`, `CHECK (method IN ('card','upi','netbanking','wallet'))` |
| `failure_reason` | `text` | `NOT NULL` — e.g. `insufficient_funds`, `card_blacklisted`, `bank_decline`, `card_expired` (`MyIdea.md` §5, §9) |
| `status` | `text` | `NOT NULL`, default `'pending'`, `CHECK (status IN ('pending','awaiting_approval','recovered','no_action','failed'))` — matches `PRD.md` §5.2's status vocabulary, including `no_action` as first-class. **`awaiting_approval` added in this revision** — see §2.3.2; the original status list omitted the state `PRD.md` FR-4's human-approval edge case and `Design.md` §7.1/§9.3 already require. |
| `is_synthetic` | `boolean` | `NOT NULL`, default `false` |
| `synthetic_ground_truth_recoverable` | `boolean` | Nullable. `CHECK (is_synthetic = true OR synthetic_ground_truth_recoverable IS NULL)` — see §2.3.1 |
| `razorpay_payment_link_id` | `text` | Nullable — set only when a real test-mode link was created (`PRD.md` §5.9) |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()` |
| `updated_at` | `timestamptz` | `NOT NULL`, default `now()`, bumped on every status change |

**2.3.1 — the non-circularity column, and why it's here:**
`MyIdea.md` §10.1 requires a hidden ground-truth function, generated independently of the agent's own scoring logic, used only to decide simulated outcomes for the evaluation batch (`PRD.md` FR-11). `synthetic_ground_truth_recoverable` is that function's output, persisted per synthetic payment so the benchmark (`ARCHITECTURE.md` §8.2) is reproducible without re-running the generator. This is the single most important access rule in this document: **no code path in `server/decision-engine/` (`score.ts`, `classify-failure.ts`, `guardrails.ts`) may read this column.** Only `server/evaluation/metrics.ts` reads it, to check the agent's (and baselines') decisions against ground truth after the fact. Enforcing this is a code-review rule, not a database permission — Postgres has no per-column, per-caller access control granular enough to express it, so it's stated here explicitly as the rule that must hold.

**A second access rule, found missing in this revision and equally important:** this column represents "recoverable *if contacted*" — it is meaningless, and must never be read, for the **do-nothing** baseline. The prior version of this document didn't say this, and its absence is a real bug, not a gap in wording: if `contact-everyone` and `do-nothing` both determined their outcome from this same boolean, every payment would resolve identically under both strategies regardless of whether anyone was contacted — making it structurally impossible for contact-everyone or the agent to ever outperform do-nothing, which is the exact claim `MyIdea.md` §10.2 and `evaluation.md` §4 are built to demonstrate. `do-nothing`'s outcome must come from a separate, independent signal — see `evaluation.md` §2.4 (added in this revision) for the corrected model.

**2.3.2 — the human-approval gap, found and fixed in this revision:**
The prior version of this schema had no way to represent "flagged for merchant review, not yet acted on." `PRD.md` FR-4 requires it, and `Design.md` §7.1 (the "Awaiting Human Approval" badge) and §9.3 (the Approve/Decline action pair) both already assumed it existed — the earlier schema would have silently broken the moment that flow was implemented, since a passing-score payment above the amount threshold had nowhere to sit while waiting. Fixed as follows:
- `payments.status` gains `'awaiting_approval'`, entered when a decision passes scoring/guardrails but the amount exceeds the configurable human-approval threshold (`ARCHITECTURE.md` §8.1, step 6).
- `agent_decisions.guardrail_result` gains `'escalated'` (§2.5) — distinct from `'blocked'` (permanent no-action) and `'passed'` (auto-executed): escalated means "would execute, but needs a human first."
- The merchant's approve/decline action (`app/api/payments/[id]/approve/route.ts`, `ARCHITECTURE.md` §4.2) writes a **new** `agent_decisions` row rather than mutating the escalated one, consistent with this table's append-only rule (§2.5) and its existing "latest row wins" convention: approve → new row with `guardrail_result = 'passed'`, which proceeds to `execute.ts`; decline → new row with `guardrail_result = 'blocked'`, `guardrail_reason = 'merchant declined'`, and `payments.status` moves to `'no_action'`.

**Other business rules:**
- **Classification (recoverable / not-recoverable) is not a column on this table.** It's a deterministic function of `failure_reason`, computed by `classify-failure.ts` and stored per-decision in `agent_decisions.classification` (§2.5) — storing it here too would let the two copies drift if the classification logic changes. If you need "list all recoverable payments," join through the latest `agent_decisions` row, not this table.
- `razorpay_payment_link_id` being non-null is what distinguishes a real test-mode execution from a simulated one at the payment level — though the authoritative simulated/real flag lives on `recovery_attempts.is_simulated` (§2.4), since one payment can have multiple attempts.

### 2.4 `recovery_attempts`

One row per executed recovery action (simulated or real), covering `PRD.md` §5.4, §5.9, FR-8, FR-9.

| Field | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `payment_id` | `uuid` | `NOT NULL`, references `payments(id) ON DELETE CASCADE` |
| `attempt_number` | `int` | `NOT NULL`, `CHECK (attempt_number >= 1)` |
| `intervention_type` | `text` | `NOT NULL`, `CHECK (intervention_type IN ('payment_link','reminder_message'))` — see inference note above |
| `is_simulated` | `boolean` | `NOT NULL` |
| `sent_at` | `timestamptz` | Nullable until dispatched |
| `outcome` | `text` | Nullable, `CHECK (outcome IN ('pending','succeeded','failed'))` |
| `outcome_at` | `timestamptz` | Nullable |

**Constraints:**
- `UNIQUE (payment_id, attempt_number)` — prevents two attempts claiming the same sequence position, which would corrupt the `MAX_CONTACT_ATTEMPTS`/`MAX_RETRIES` guardrail checks (`MyIdea.md` §7) that count rows in this table.

**Business rules:**
- A row here only exists for a payment that **passed** both guardrail checks in `ARCHITECTURE.md` §8.1 — a no-action decision never produces a `recovery_attempts` row, only an `agent_decisions` row with `guardrail_result = 'blocked'` (§2.5) and an `audit_logs` entry (§2.6). This keeps "did we act" a simple `EXISTS` check against this table.
- `is_simulated = false` rows must have a corresponding non-null `payments.razorpay_payment_link_id` — enforced at the application layer in `execute.ts` (`ARCHITECTURE.md` §4.3), since a cross-table `CHECK` isn't possible in Postgres without a trigger, and one isn't justified for this single invariant.

### 2.5 `agent_decisions`

One row per decision the system makes about a payment — including no-action decisions. Covers `PRD.md` FR-2, FR-3, FR-4, FR-5, FR-6, FR-10.

| Field | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `payment_id` | `uuid` | `NOT NULL`, references `payments(id) ON DELETE CASCADE` |
| `classification` | `text` | `NOT NULL`, `CHECK (classification IN ('recoverable','not_recoverable'))` |
| `score` | `int` | `NOT NULL`, `CHECK (score BETWEEN 0 AND 100)` |
| `score_breakdown` | `jsonb` | `NOT NULL` — factor-by-factor breakdown (`MyIdea.md` §5: past success rate, failure-type recoverability, time-of-day match, recency, prior-attempt penalty). Kept as `jsonb` rather than one column per factor because the factor set is a scoring-formula detail, not a schema-stable fact — a formula tweak shouldn't require a migration. |
| `guardrail_result` | `text` | `NOT NULL`, `CHECK (guardrail_result IN ('passed','blocked','escalated'))` — `escalated` added in this revision, see §2.3.2 |
| `guardrail_reason` | `text` | `CHECK (guardrail_result = 'passed' OR guardrail_reason IS NOT NULL)` — a blocked or escalated decision must always state why (`PRD.md` FR-5; for `escalated`, the reason is always "amount exceeds human-approval threshold") |
| `llm_explanation` | `text` | Nullable — only populated when `guardrail_result = 'passed'` (the LLM is only called after the first guardrail pass, `ARCHITECTURE.md` §8.1 step 4→5) |
| `llm_proposed_intervention` | `text` | Nullable, `CHECK (llm_proposed_intervention IS NULL OR llm_proposed_intervention IN ('payment_link','reminder_message'))` |
| `decided_at` | `timestamptz` | `NOT NULL`, default `now()` |

**Business rules:**
- **Multiple rows per payment are expected**, not an anomaly — a retried payment produces a new decision row each time it's re-evaluated (`MyIdea.md`'s `scheduleRetry()` tool). "The current decision" for a payment is the row with the latest `decided_at`, not the only row.
- **This resolves an ambiguity `MyIdea.md` §7 never spelled out**: `MAX_RETRIES` and `MAX_CONTACT_ATTEMPTS` are two different guardrails with no stated distinction between them. The schema makes the distinction concrete, and it should be documented as such rather than left to be inferred: `MAX_RETRIES` counts rows in **this table** (`agent_decisions`) for a payment — every re-evaluation, whether or not it results in contact. `MAX_CONTACT_ATTEMPTS` counts rows in `recovery_attempts` (§2.4) — only re-evaluations that actually passed guardrails and reached the customer. A payment can be re-evaluated (retried) without being re-contacted, e.g. if its score dropped below threshold on a later pass — that's the case these two counters exist to distinguish.
- This table, not `payments`, is what the Evaluation page's restraint-case list (`Design.md` §3.3, `PRD.md` §5.5) queries: "correctly withheld" means `guardrail_result = 'blocked'` here, joined back to the payment for display.
- Append-only (§1.3) — a decision is never edited after the fact, including if it's later found to be wrong; that's a data point for the evaluation, not something to be erased.

### 2.6 `audit_logs`

The complete, granular event trail — every stage of every decision, including ones that don't produce an `agent_decisions` row of their own (e.g., "payment failed" itself). Covers `PRD.md` FR-10, the Audit Trail requirement (`PRD.md` §5.7).

| Field | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `payment_id` | `uuid` | `NOT NULL`, references `payments(id) ON DELETE CASCADE` |
| `event_type` | `text` | `NOT NULL` — e.g. `payment_failed`, `classified`, `scored`, `guardrail_checked`, `llm_proposed`, `validated`, `executed`, `outcome_observed`, `no_action` |
| `event_detail` | `jsonb` | `NOT NULL`, default `'{}'` — free-form detail specific to `event_type` (e.g. the guardrail name that triggered a block) |
| `occurred_at` | `timestamptz` | `NOT NULL`, default `now()` |

**Business rules:**
- Written exclusively through the single `audit/log.ts` write path (`ARCHITECTURE.md` §4.2) — never inserted into directly from a route handler, which is what makes it trustworthy as *the* trail rather than *a* trail alongside others.
- Append-only (§1.3), same as `agent_decisions`. This is the table `Design.md` §9.2's audit trail timeline component reads directly, in `occurred_at` order.
- Not deduplicated against `agent_decisions` — `agent_decisions` is the structured, queryable summary of a decision; `audit_logs` is the full narrative including steps that never produce their own decision row (e.g., the initial `payment_failed` event). Both exist because they serve different reads (§2.5 for "what did we decide," §2.6 for "walk me through exactly what happened").

---

## 3. Entity-Relationship Overview

```text
merchants ──1───────*── customers ──1───────*── payments ──1───────*── recovery_attempts
    │                                              │
    │ (auth_user_id → auth.users, Supabase-managed) ├──1───────*── agent_decisions
                                                     │
                                                     └──1───────*── audit_logs
```

- One merchant has many customers.
- One customer has many payments.
- One payment has many recovery attempts, many agent decisions (one per re-evaluation), and many audit log entries.
- No many-to-many relationships anywhere in the schema — every relationship is a plain one-to-many, which is what "normalized, no unnecessary complexity" (this document's mandate) looks like at six tables.

---

## 4. Constraints Summary

| Table | Constraint | Purpose |
|---|---|---|
| `merchants` | `UNIQUE(auth_user_id)` | One login per merchant row |
| `payments` | `CHECK(amount > 0)` | Rejects invalid data at the source, not just in the UI |
| `payments` | `CHECK(method IN (...))`, `CHECK(status IN (...))` | Enum-shaped fields stay enum-shaped |
| `payments` | `CHECK(is_synthetic = true OR synthetic_ground_truth_recoverable IS NULL)` | Ground truth can only exist where it's meaningful — real payments have no simulated ground truth |
| `recovery_attempts` | `UNIQUE(payment_id, attempt_number)` | Protects the guardrail attempt-counting logic from double-counting |
| `recovery_attempts` | `CHECK(attempt_number >= 1)` | No zero/negative attempt numbers |
| `agent_decisions` | `CHECK(score BETWEEN 0 AND 100)` | Score stays in its defined range at the data layer, not just the formula |
| `agent_decisions` | `CHECK(guardrail_result = 'passed' OR guardrail_reason IS NOT NULL)` | A block or escalation always has a stated reason — makes `PRD.md` FR-5 a database fact |
| All child tables | `ON DELETE CASCADE` from `payments`/`customers`/`merchants` | A payment's full history is deleted together; there's no valid state where `recovery_attempts` outlives its `payments` row |

---

## 5. Indexes

| Table | Index | Reason |
|---|---|---|
| `customers` | `(merchant_id)` | Every customer query is merchant-scoped |
| `payments` | `(merchant_id, status)` | Payments and Recovery pages filter by status tabs (`Design.md` §3.4, §3.6) within one merchant |
| `payments` | `(merchant_id, created_at)` | Date-range picker filtering (`Design.md` §3.1) |
| `payments` | `(customer_id)` | Customer page's payment history (`PRD.md` §5.3) |
| `recovery_attempts` | `(payment_id)` | Attempt lookups and guardrail attempt-counting, both keyed by payment |
| `agent_decisions` | `(payment_id, decided_at DESC)` | Fetching "the current decision" for a payment is always "latest by this key" |
| `audit_logs` | `(payment_id, occurred_at)` | The audit trail timeline is always rendered in this order, for one payment |

No indexes beyond these are added speculatively — each one here is backed by a specific, already-agreed query pattern from `Design.md` or `PRD.md`, not a general "might be useful" guess.

---

## 6. How Users and Their Data Are Related

There is exactly one application user (the merchant) in this MVP, per `PRD.md` §10. That user's identity lives in Supabase's managed `auth.users` table, outside this schema, and is connected to the business data through exactly one foreign key: `merchants.auth_user_id`.

Everything else hangs off that single merchant:

```text
auth.users (Supabase-managed)
      │  auth_user_id
      ▼
  merchants
      │  merchant_id
      ▼
  customers ──► payments ──► recovery_attempts / agent_decisions / audit_logs
```

There is no user-owns-record model beyond this — customers are the merchant's customers, not separate application users, and never authenticate into the product. This mirrors `PRD.md` §2's two user types (merchant operations user, and the buildathon evaluator who only views the deployed demo) — neither is a "customer" in the database sense.

---

## 7. Authentication & Authorization

### 7.1 Where authentication lives

Supabase Auth manages `auth.users`; this schema never duplicates password or session data — `merchants.auth_user_id` is a reference, not a copy (`ARCHITECTURE.md` §5).

### 7.2 Database access rule: Row Level Security (RLS)

RLS is enabled on all six tables. Each policy resolves to "does this row belong to the merchant associated with the currently authenticated `auth.uid()`":

- `customers`, `payments`: policy checks `merchant_id = (SELECT id FROM merchants WHERE auth_user_id = auth.uid())` directly.
- `recovery_attempts`, `agent_decisions`, `audit_logs`: policy checks merchant ownership via an `EXISTS` subquery joining back through `payments.merchant_id`, since these tables don't carry `merchant_id` directly (§1's normalization principle — no redundant column added purely to make an RLS policy simpler).

**Why RLS, and why this isn't over-engineering for one merchant:** it's a declarative feature of the database already chosen (`TECH_STACK.md` §3), not a new tool or new complexity. The alternative — trusting every route handler to remember to filter by `merchant_id` — is *more* code and *more* ways to get it wrong, for a security property ("one merchant's data is never returned for another session") that matters even when there's currently only one merchant, because the failure mode (an authorization bug leaking data) is exactly the kind of thing that should be enforced structurally per this project's own §1 principle in `ARCHITECTURE.md` ("no layer invents scope" cuts both ways — it also means not skipping a cheap, standard safeguard).

### 7.3 How the backend actually connects

Per `ARCHITECTURE.md` §3.3, the frontend never queries the database directly — only server-side code does (Server Components and API routes). That server-side code runs with Supabase's service-role key (kept server-only, per `TECH_STACK.md` §8's secrets handling), which bypasses RLS by design. This means **RLS in this MVP is a defense-in-depth backstop, not the primary access-control mechanism** — the primary mechanism is the session check at the `(app)` layout level (`ARCHITECTURE.md` §5). RLS matters if a future code path ever queries Supabase from a context using the anon key (e.g., a client-side Supabase call) — it ensures that path is safe by default rather than by remembering to add a `WHERE merchant_id = ...` everywhere.

### 7.4 No other authorization model

No roles, no permission levels, no row-level sharing between users — there being only one merchant user makes "authorization" mean exactly one thing: is this request authenticated as the merchant, or not. Anything more granular is out of scope per `PRD.md` §10 and `TECH_STACK.md` §9, and shouldn't be added to this schema without revisiting that scope decision first.

---

## 8. Data Protection

- **`customers.contact_info` is the only PII in this schema.** It's stored as plain `text` (not hashed — the product needs to display and act on it, e.g. drafting a message to a real address/number), protected by the same RLS/session boundary as everything else (§7), and, per §2.2, is only ever selected on the customer detail page, never in list views.
- **No payment card data is stored.** `payments.method` records the payment *method type* (`card`, `upi`, etc.), never a card number, CVV, or other card data — Razorpay's test-mode integration (`PRD.md` §5.9) handles the actual payment instrument; this schema only stores the outcome and metadata.
- **Secrets never live in this schema.** API keys, guardrail thresholds, and provider config are environment variables (`TECH_STACK.md` §8), not database rows — there is no `settings` or `config` table.
- **Synthetic data is marked, never mixed silently with real data.** `payments.is_synthetic` means every query that powers a real-money claim (e.g., "this many rupees recovered") can and must filter on it, and every query that powers the evaluation benchmark can filter to synthetic-only — this is why the column exists on the row itself rather than being inferred from, say, a naming convention on customer names.

---

## 9. What Was Deliberately Not Added

Consistent with this document's "keep the schema normalized and avoid unnecessary tables" mandate, and the same convention `PRD.md` §10 and `ARCHITECTURE.md` §10 use to state exclusions rather than leave them implicit:

- **No `baseline_results` or `evaluation_runs` table.** The evaluation harness (`ARCHITECTURE.md` §8.2) computes contact-everyone and do-nothing baseline outcomes in-memory from `payments.synthetic_ground_truth_recoverable`, on demand — these baselines don't make real decisions worth auditing the way the agent's do, so they don't need their own decision/audit rows. If re-running the full benchmark on every page load ever becomes too slow, a results-cache table is a reasonable future addition — not needed at 500–1,000 records (`ARCHITECTURE.md` §8.3).
- **No `score_factors` or `guardrail_rules` table.** Scoring factors and guardrail thresholds are code and config (`TECH_STACK.md` §8), not data — they change by deploying new logic or changing an environment variable, not by editing rows, so modeling them as tables would suggest an editability the product doesn't have in MVP (`MyIdea.md` §7 rules out a merchant-editable guardrail UI for now).
- **No separate `failure_reasons` lookup table.** The set of failure reasons is small, stable, and defined in application code (the classifier, `classify-failure.ts`) — a lookup table would be one more join for no query this product needs to make (nothing filters "all failure reasons starting with...").
- **No `notifications` or `messages` table.** Outbound messaging is simulated (`PRD.md` §5.9) and its record *is* the `recovery_attempts` row (`is_simulated = true`) — a separate message-content table would duplicate what the LLM drafted, which isn't queried or displayed anywhere after the fact except inside that same attempt's context.
- **No `sessions` table.** Session management is Supabase Auth's responsibility entirely (§7.1) — this schema has no reason to know about sessions.

If a future requirement genuinely needs one of these, that's a `PRD.md` change first, then a schema change here — not a table added directly during implementation.
