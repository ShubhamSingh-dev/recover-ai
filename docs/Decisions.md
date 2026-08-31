# Decisions Log — RecoverAI

**Purpose:** Two things a reviewer needs and shouldn't have to reconstruct by reading code: (1) an unambiguous list of what in this product is real versus simulated (`PRD.md` FR-16 requires this explicitly), and (2) a record of the significant decisions made across this project, with the reasoning, so a later change is a deliberate revision of a known decision rather than an accidental drift. New entries should be appended to §2 as they're made — this file is a running log, not a one-time document.

---

## 1. Real vs. Simulated — The Complete Disclosure

| Component | Status | Detail |
|---|---|---|
| **Recovery score** | **Real** | Deterministic, disclosed additive formula (`Design.md` §7.2, `MyIdea.md` §5) — not an LLM call, not a black-box probability. |
| **Failure classification** | **Real** | Rule-based, deterministic (`PRD.md` FR-1). |
| **Guardrail / policy engine** | **Real** | Every guardrail (`MAX_RETRIES`, `MAX_CONTACT_ATTEMPTS`, `MIN_TIME_BETWEEN_CONTACT`, `MIN_SCORE_TO_INTERVENE`, human-approval threshold) gates an actual code path (`ARCHITECTURE.md` §4.3) — none are decorative. |
| **LLM reasoning (explanation, message draft, intervention proposal)** | **Real** | Gemini 2.5 Flash (primary) or Groq Llama 3.3 70B (fallback), called via Vercel AI SDK v5 `generateObject` with schema-validated output (`TECH_STACK.md` §5, §6). The LLM's output is real; its authority is deliberately limited — see §2, "LLM never sets the score." |
| **Razorpay payment link creation** | **Real** | One test-mode payment link creation call (`PRD.md` §5.9). |
| **Razorpay webhook (payment success)** | **Real, minimally implemented** | One webhook listener for one event type. **No signature verification, idempotency handling, or retry/backoff** — see limitations below. |
| **Outbound recovery messaging** (WhatsApp/Email/SMS) | **Simulated** | No real messaging provider is integrated. A "sent" message is a `recovery_attempts` row with `is_simulated = true` and no outbound network call is made at all (`ARCHITECTURE.md` §7.3). Always visibly labeled "Simulated" in the UI (`Design.md` §9.4) and never presented ambiguously. |
| **Customer payment completion (for simulated sends)** | **Simulated** | Resolved against the synthetic hidden ground-truth outcome (`docs/evaluation.md` §2), not a real payment event. |
| **Customer payment completion (for real test-mode links)** | **Real** | Detected via the Razorpay test-mode webhook. |
| **Synthetic payment dataset** | **Synthetic, explicitly labeled** | 500–1,000 generated records (`PRD.md` §5.8), marked `is_synthetic = true` (`DATABASE.md` §2.3) and never mixed into real-payment metrics without that filter applied. |
| **Baseline strategies** (contact-everyone, do-nothing) | **Simulated, evaluation-only** | Computed in-memory against the synthetic batch (`ARCHITECTURE.md` §8.2); these are not live strategies a merchant can enable — they exist only to produce the comparison in `docs/evaluation.md`. |
| **Authentication** | **Real** | Supabase Auth, single merchant login (`ARCHITECTURE.md` §5). |
| **Database** | **Real** | Managed PostgreSQL via Supabase (`TECH_STACK.md` §3). |
| **Discount-offer intervention** | **Not built** | `MAX_DISCOUNT` guardrail and any discount-offer action were considered and explicitly cut rather than shipped as a decorative, unused rule — see §2, "Discount guardrail cut." |
| **Multi-tenant / multi-merchant support** | **Not built** | Single merchant only, by design (`PRD.md` §10). |

**Standing rule this table exists to enforce:** if a future change makes any row in this table inaccurate — a component moves from simulated to real, or vice versa — this file is updated in the same change, not after. A stale disclosure is worse than no disclosure.

---

## 2. Decision Log

Each entry: the decision, the context that prompted it, and the consequence of making it. Ordered chronologically by when the decision was made in the project.

---

### D-001 — Replace fake-precision scoring with a disclosed, additive formula

**Context:** The original concept reported a bare "Recovery probability: 82%" with no stated origin — an unexplained number that reads as fabricated precision and is the exact failure mode judging criteria (`PRD.md` §2) warn against.

**Decision:** The recovery score is a disclosed, additive weighted formula over named, observable factors (past success rate, failure-type recoverability, time-of-day match, recency, prior-attempt penalty — `MyIdea.md` §5), computed in plain deterministic code, never by the LLM.

**Consequences:** Every score is traceable and defensible under questioning. This is also what makes the LLM/backend authority boundary (`ARCHITECTURE.md` §4.3) possible — a score the LLM invented couldn't be structurally separated from the LLM's other output the way a deterministic score can.

---

### D-002 — Make the evaluation provably non-circular

**Context:** The original plan generated and scored the evaluation batch using the same logic, which cannot fail the test it's checked against.

**Decision:** The synthetic data generator produces a hidden ground-truth function, independent of the agent's own scoring formula (different weights, plus noise), used only to determine simulated outcomes — never exposed to the agent (`docs/evaluation.md` §2).

**Consequences:** Enforced as a code-structure rule (`ARCHITECTURE.md` §4.3, `docs/evaluation.md` §2.3), not just a documented intention. Any future code change that lets scoring logic read the hidden ground truth invalidates every reported metric.

---

### D-003 — Report baseline comparisons, not a standalone recovery rate

**Context:** "Recovery rate: 35.7%" reported alone has no reference point — it isn't evidence that the product adds value over doing nothing or over the naive alternative.

**Decision:** Every metric is reported for three strategies side by side: agent, contact-everyone, do-nothing (`MyIdea.md` §10.2, `docs/evaluation.md` §3.2).

**Consequences:** This became the headline evaluation result rather than a secondary chart. It also required implementing two baseline simulators (`ARCHITECTURE.md` §4.2, `baseline-engine/`), which are real code, not hypothetical comparisons described only in prose.

---

### D-004 — Simulate all outbound messaging; no real WhatsApp/Email/SMS integration

**Context:** Real third-party messaging API integration and approval carries meaningful setup risk within a 6-day build window, for no judging benefit — the product's value proposition is the decision loop, not the delivery mechanism.

**Decision:** All outbound recovery messages are simulated from the start, explicitly and visibly labeled as such in both UI (`Design.md` §9.4) and data (`recovery_attempts.is_simulated`, `DATABASE.md` §2.4) — never built to appear real and then caveated later.

**Consequences:** Zero third-party messaging integration risk. Required a firm design rule (§1 above, and `ARCHITECTURE.md` §1.3) that simulated and real must never be visually or structurally ambiguous, which shaped several downstream UI and schema decisions.

---

### D-005 — Minimal Razorpay integration; explicitly defer webhook hardening

**Context:** Full production-grade webhook handling (signature verification, idempotency, retry/backoff) is a real engineering investment with a real learning curve, and isn't demo-critical for proving the decision loop works.

**Decision:** Integrate exactly one payment link creation call and one webhook listener for one event type (`PRD.md` §5.9). No signature verification, no idempotency, no retry logic.

**Consequences:** This is a **stated limitation**, not a hidden gap — documented here, in `PRD.md` §9's edge cases, and in `ARCHITECTURE.md` §7.2/§10, each place explicit that a missed or duplicate webhook event should not corrupt an audit trail or double-count revenue in the demo dataset, even without full hardening.

---

### D-006 — Cut the discount-offer guardrail rather than ship it decorative

**Context:** An early `MAX_DISCOUNT = 10%` guardrail existed with no discount-offer action actually wired into the intervention proposal logic behind it — a guardrail that gates nothing reads as padding to a reviewer, and is worse than not mentioning discounts at all.

**Decision:** `MAX_DISCOUNT` and any discount-offer intervention type are cut entirely unless a real discount-offer action path is built and demonstrable (`MyIdea.md` §7). As of this log, it has not been built — see `PRD.md` §6, deferred features.

**Consequences:** The intervention-type enum is exactly two values (`payment_link`, `reminder_message` — `DATABASE.md` §2.4), both backed by real execution code. Every guardrail that does ship gates an actual code path, with no exceptions.

---

### D-007 — Restraint (no-action) is a first-class, demoed outcome, not an edge case

**Context:** In an earlier pass, "the agent should not intervene" cases were treated as something to add late, once the main flow worked — which risks restraint reading as an afterthought rather than evidence of a real policy engine.

**Decision:** No-action is a first-class status value (`payments.status = 'no_action'`, `DATABASE.md` §2.3) present in the synthetic dataset and the demo from the start, with its own audit trail entries (`MyIdea.md` §9) and its own filterable view on the Evaluation and Payments pages (`Design.md` §3.3, §3.4).

**Consequences:** Restraint cases are directly visible and countable, not buried in logs — this is the concrete evidence that the system can say no, not just yes.

---

### D-008 — One LLM provider active at a time; Gemini primary, Groq fallback only

**Context:** Research into available free-tier LLM options and the constrained nature of the LLM's actual job (explain, draft, propose — never score) raised the question of whether multiple models should be used.

**Decision:** Gemini 2.5 Flash is the single active provider. Groq (Llama 3.3 70B) is configured as a fallback, swappable via one environment variable, never called concurrently with Gemini (`TECH_STACK.md` §5).

**Consequences:** No multi-model orchestration complexity, no inconsistent tone across a demo, no added swap-cost. The fallback exists purely as insurance against free-tier throttling during a live demo, at roughly twenty minutes of setup cost.

---

### D-009 — AI SDK v5 (stable), not v6 (beta), despite v6's appealing agent/approval abstraction

**Context:** AI SDK v6 beta includes a human-in-the-loop tool-approval abstraction that maps closely onto the `REQUIRE_HUMAN_APPROVAL` guardrail — genuinely a good conceptual fit.

**Decision:** Use the stable v5 line. Build the human-approval guardrail as plain code (a status flag plus a merchant-facing approve action) instead of adopting the beta SDK feature (`TECH_STACK.md` §6).

**Consequences:** Removes a pre-stable-dependency risk from the critical Day 3–4 build path, at the cost of writing roughly an hour of code that the beta SDK would have provided. Given the 7-day deadline has no slack, this was judged the correct tradeoff. Revisit only if AI SDK v6 reaches stable with schedule room to spare (`TECH_STACK.md` §9).

---

### D-010 — Single Next.js monolith; no separate backend service

**Context:** The product needs a frontend, a backend, webhook handling, and a benchmark harness — all could be architected as separate services.

**Decision:** One Next.js application serves the frontend, the API routes, and the webhook listener; the evaluation harness runs in-process (`ARCHITECTURE.md` §2, §7.1).

**Consequences:** One deployable unit, one language throughout, no API contract to maintain between services. Correct for a solo, 6-day, single-merchant build; would need revisiting only if the product's scale or team size changed materially.

---

### D-011 — Row Level Security chosen as the database authorization mechanism

**Context:** `PRD.md`/`MyIdea.md` never specified how database access would actually be restricted once Supabase Auth was introduced (`ARCHITECTURE.md` §5).

**Decision:** Enable RLS on all six tables, scoped by merchant ownership (`DATABASE.md` §7.2), even though there is currently exactly one merchant.

**Consequences:** A declarative, backstop-level safeguard using a feature already built into the chosen database — not a new tool, not new operational complexity. Primary access control remains the application-level session check (`ARCHITECTURE.md` §5); RLS is defense-in-depth, not the main mechanism, since backend queries run under the service-role key (`DATABASE.md` §7.3).

---

### D-012 — Testing scope: Vitest unit tests on the decision engine only; no E2E framework

**Context:** The agreed repo structure (`MyIdea.md` §16) includes a `tests/` directory, but no testing tool or strategy was ever chosen, and the 6-day build has no schedule slack.

**Decision:** Unit-test the deterministic decision engine (classification, scoring, guardrails) with Vitest. Do not introduce an end-to-end testing framework; rely on the already-planned Day 7 manual walkthrough of every flow, including the restraint case and baseline comparison view (`TECH_STACK.md` §7).

**Consequences:** Testing effort is concentrated on the highest-risk, cheapest-to-test code (pure functions with no I/O) — a guardrail bug is the one class of bug that would undermine the product's actual thesis. E2E coverage is intentionally traded for build time, on the judgment that a thorough manual pass covers what an automated E2E suite would have caught, at a fraction of the setup cost.

---

### D-013 — Add `awaiting_approval` / `escalated` as first-class states, closing a schema gap

**Context:** A design review found that `DATABASE.md`'s `payments.status` and `agent_decisions.guardrail_result` enums had no state for "flagged for human review, not yet decided" — even though `PRD.md` FR-4, an explicit PRD edge case, and `Design.md` §7.1/§9.3 all already assumed this state existed. The gap was invisible until read across all four documents at once: each individual document looked complete on its own.

**Decision:** Add `'awaiting_approval'` to `payments.status` and `'escalated'` to `agent_decisions.guardrail_result` (`DATABASE.md` §2.3.2). The merchant's Approve/Decline action writes a new `agent_decisions` row rather than mutating the escalated one, preserving the append-only convention (D-011's spirit, `DATABASE.md` §2.5).

**Consequences:** The human-approval flow — required by the PRD, designed in `Design.md`, and stubbed as an API route in `ARCHITECTURE.md` — now has somewhere to actually persist its state. `ARCHITECTURE.md` §8.1's decision flow diagram was updated to give escalation its own explicit branch instead of a buried parenthetical, since a state a reviewer can't find in the main flow diagram is a state easy to forget to implement.

---

### D-014 — Give the do-nothing baseline an independent outcome signal, fixing a real methodology bug

**Context:** A design review found that `evaluation.md`'s original methodology used the same `synthetic_ground_truth_recoverable` boolean to determine outcomes for all three strategies, including do-nothing. Since contact-everyone and do-nothing would then read the identical per-payment value, they'd always produce identical results — making it mathematically impossible for either contacted strategy to ever recover more than do-nothing. This directly contradicts the headline claim this entire evaluation methodology exists to support (`MyIdea.md` §10.2, D-003).

**Decision:** `synthetic_ground_truth_recoverable` now applies only to strategies that contact the payment (agent, contact-everyone). Do-nothing's outcome is drawn from a separate, independent constant, `SPONTANEOUS_RESOLUTION_RATE` (5–10%, env-configurable), per payment, never touching the ground-truth column (`evaluation.md` §2.4).

**Consequences:** The three-strategy comparison can now actually produce the finding it's designed to measure, rather than being structurally guaranteed to show no difference between contacting and not contacting. This is a correction to methodology, not a new feature — no new database column was needed, since `SPONTANEOUS_RESOLUTION_RATE` is a single global constant, not per-payment data (kept that way deliberately, per `evaluation.md` §6's disclosed-simplification framing, consistent with this project's bias toward the smallest correct model rather than a more elaborate one).

---

A new entry belongs here when a choice is made that a future contributor might reasonably second-guess or accidentally reverse — not for every small implementation detail. Use the same shape as the entries above: **Context** (what prompted the decision), **Decision** (what was chosen), **Consequences** (what that commits the project to, and what it rules out). If a decision changes what's real vs. simulated, update §1 in the same change.
