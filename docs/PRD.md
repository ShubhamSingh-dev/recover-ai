# Product Requirements Document — RecoverAI

**Product:** RecoverAI — AI Revenue Recovery Agent
**Track:** Razorpay AI Buildathon, Track 03 — AI Revenue Recovery
**Scope of this PRD:** The hackathon MVP build (Days 1–6) plus explicitly labeled future work. Sourced entirely from the refined `MyIdea.md` and the AI-stack decisions already agreed. No new features are introduced in this document.

---

## 1. Problem Statement

Online merchants using Razorpay lose revenue every time a payment fails. The naive response — contact every failed payment the same way — wastes effort on unrecoverable failures and doesn't prove it's better than doing nothing. The real problem is not detecting failed payments; it is:

1. Deciding **which** failed payments are worth pursuing.
2. Choosing an appropriate, bounded recovery action.
3. Knowing **when to stop or not act at all**.
4. Proving, with evidence, that the recovery strategy creates more value than the obvious alternatives (contacting everyone, or doing nothing).

RecoverAI is a small, complete product that makes this decision loop explicit, bounded, and measurable — end to end, from a single failed payment to a documented, non-circular benchmark of recovered revenue.

---

## 2. Target Users

### Primary: Merchant operations / finance user
A person at an online merchant business (SME to mid-market) responsible for payment operations or revenue recovery. They currently see failed payments as a raw list with no prioritization, no automated follow-up strategy, and no way to know whether their recovery efforts are actually working.

**Needs:**
- See revenue at risk and revenue recovered at a glance.
- Understand *why* the system is (or isn't) pursuing a given payment.
- Trust that automated outreach is bounded and won't spam or over-discount customers.
- See evidence that the strategy works, not just a raw recovered-amount number.

### Secondary: Buildathon evaluator (demo audience)
Not a user of the deployed product in the traditional sense, but a stakeholder whose evaluation criteria (per `Hackathon.md`) directly shape what "done" means for this PRD: evidence, guardrails, explainability, measured outcomes, and honest disclosure of what is real vs. simulated.

---

## 3. Goals

### Product goals
- Correctly distinguish recoverable from non-recoverable failed payments using a transparent, disclosed scoring method.
- Execute a bounded, guarded recovery action for recoverable payments.
- Explicitly and correctly choose **no action** for payments that don't clear the recovery bar.
- Prove, on a documented synthetic benchmark, that the agent's strategy outperforms two baselines: contact-everyone and do-nothing.
- Maintain a complete, human-readable audit trail of every decision, including non-decisions.

### Explicit non-goals (see Section 9, Out of Scope)
- Being a general-purpose payments platform.
- Covering any recovery type beyond failed one-time payments.
- Training or fine-tuning a custom ML model.

### Success metrics (for the MVP, evaluated against the synthetic benchmark defined in `MyIdea.md` §10)
- Agent recovers **more revenue than the do-nothing baseline**, and is **within a demonstrably better efficiency ratio** than the contact-everyone baseline (i.e., comparable or better ₹ recovered using measurably fewer contact attempts).
- 100% of agent decisions (including no-action) are logged with a traceable reason.
- 0 guardrail violations in the benchmark run (no retry/contact/discount limits exceeded).
- Evaluation methodology (hidden ground-truth split) is documented and independently checkable in `docs/evaluation.md`.

---

## 4. Core User Journeys

### Journey A — Merchant reviews overall recovery performance (primary journey)
1. Merchant opens the dashboard.
2. Sees revenue at risk, revenue recovered, recovery rate, and the agent-vs-baseline comparison panel.
3. Drills into the evaluation/analytics page to see the full benchmark: agent vs. contact-everyone vs. do-nothing, contact attempts used, and restraint cases.
4. Comes away with a specific, evidenced answer to "is this working better than what I'm doing now?"

### Journey B — A failed payment is diagnosed and recovered
1. A payment fails (synthetic event, or a real Razorpay test-mode event).
2. System classifies the failure reason and computes a deterministic recovery score with a visible breakdown.
3. Guardrail check passes (score above threshold, within retry/contact limits).
4. LLM explains the score in plain language and drafts a recovery message; proposes an intervention type from the allowed set.
5. Policy engine validates the proposal against guardrails.
6. Message is sent (simulated, and explicitly labeled as simulated in the UI) or a real Razorpay test-mode payment link is created.
7. Customer completes payment (simulated or real test-mode).
8. Status updates to RECOVERED; audit trail and dashboard metrics update.

### Journey C — A failed payment is correctly left alone (restraint journey)
1. A payment fails with a low recovery score (e.g., non-recoverable failure type, exhausted contact attempts, or below the minimum-score guardrail).
2. System logs the score and the guardrail check.
3. Decision is explicitly **NO ACTION**, with an escalation flag for manual merchant review.
4. This decision — and its reasoning — is visible in the audit trail and countable in the evaluation page as a correctly-withheld case.

### Journey D — Merchant inspects a single customer's history
1. Merchant opens a customer record.
2. Sees payment history, prior recovery attempts and outcomes, and the behavioral signals (e.g., time-of-day pattern) that fed into past scores.

---

## 5. MVP Scope (must ship by end of Day 6)

### 5.1 Dashboard / Overview
- Revenue at risk, revenue recovered, recovery rate.
- Agent-vs-baseline comparison panel (agent, contact-everyone, do-nothing): ₹ recovered, recovery rate, contact attempts used, agent lift over best baseline.
- Count of pending recovery actions and AI recommendations.

### 5.2 Payments page
- List of failed payments: ID, customer, amount, method, failure reason, timestamp, recovery status, AI recommendation.
- Status values include **No Action** as a first-class state, not just Pending/Recovered/Failed.

### 5.3 Customer page
- Payment history, prior recovery attempts and outcomes, behavioral context used in scoring (e.g., time-of-day pattern, past success rate).

### 5.4 Recovery page
- Active and past recovery campaigns/attempts, contacted customers, pending actions, recovered payments.

### 5.5 Evaluation / Analytics page
- Full synthetic-benchmark results: agent vs. contact-everyone vs. do-nothing.
- ₹ recovered, recovery rate, contact attempts used, per strategy.
- Restraint cases (correctly withheld) listed with reasons.
- Precision/recall of the intervene/no-intervene decision against the hidden ground-truth function, where determinable.
- Short in-app explanation (one or two lines) of the hidden-ground-truth, non-circular methodology, linking to `docs/evaluation.md`.

### 5.6 Decision Engine
- **Failure classification**: rule-based categorization of failure reason into recoverable / not recoverable.
- **Deterministic recovery scoring**: disclosed, additive weighted formula (see `MyIdea.md` §6) — not an LLM call, not a fabricated probability.
- **Guardrail / policy engine**: enforces `MAX_RETRIES`, `MAX_CONTACT_ATTEMPTS`, `MIN_TIME_BETWEEN_CONTACT`, `MIN_SCORE_TO_INTERVENE`, and human-approval flagging above a configurable amount threshold. Every guardrail implemented must gate a real code path (no decorative rules).
- **LLM layer** (constrained): explains the score in plain language; drafts the outreach message; proposes an intervention type from an allowed enum. The LLM never sets the score and never bypasses a guardrail — its output is validated before execution.
- **Execution**: simulated message send (explicitly labeled "simulated" in UI and code) and/or Razorpay test-mode payment link creation (minimal integration — one link creation call, one webhook listener).
- **Outcome observation**: detects simulated or real payment success and updates status.
- **Stop/retry logic**: enforced by the guardrails above; a payment that exhausts its allowed attempts is marked accordingly, not retried indefinitely.

### 5.7 Audit Trail
- Full timestamped log per payment: classification, score + breakdown, guardrail check result, LLM proposal, validation result, execution, outcome.
- Explicit log entries for **no-action** decisions with the reason (which guardrail/threshold triggered restraint).

### 5.8 Synthetic Data & Evaluation Harness
- Generator producing 500–1,000 synthetic failed payments.
- **Hidden ground-truth function**: a separate, undisclosed-to-the-agent recoverability function (different weights/logic than the agent's own scoring formula, plus noise) used only to determine simulated outcomes — ensuring the benchmark is not circular.
- Baseline strategy simulators: contact-everyone, do-nothing, run against the same batch as the agent.
- `docs/evaluation.md` documenting the split between observable features, the agent's scoring formula, and the hidden ground-truth function.

### 5.9 Integrations
- Razorpay test-mode: create one payment link; listen for one webhook event type (payment success). No signature/idempotency/retry hardening in MVP (documented as a stated limitation).
- LLM: Google Gemini 2.5 Flash (primary, via Google AI Studio, free tier) called through Vercel AI SDK v5's `generateObject` / tool-calling for structured, schema-validated output. Groq (Llama 3.3 70B) configured as a fallback provider, swappable via config, not called concurrently with Gemini.
- No real WhatsApp/Email/SMS integration. All outbound messaging is simulated and visibly labeled as such in the UI and in `docs/decisions.md`.

### 5.10 Deployment & Repo
- Deployed on Vercel with managed Postgres (Supabase).
- Public GitHub repository with the structure defined in `MyIdea.md` §16 (Day 6), including `docs/architecture.md`, `docs/evaluation.md`, `docs/decisions.md`, and a README covering problem, product, demo, architecture, AI design, evaluation methodology, setup, and limitations.

---

## 6. Future / Out-of-MVP Features (explicitly deferred, not built this week)

These were discussed only as later possibilities or as things intentionally cut from MVP scope — none are committed for the hackathon build:

- Real WhatsApp/Email/SMS delivery (currently simulated by design).
- Full Razorpay webhook hardening: signature verification, idempotency handling, retry-of-webhook logic.
- Discount-offer intervention type (only included if actually wired into the allowed-action enum and demonstrable; otherwise cut, per `MyIdea.md` §7).
- Any other Buildathon track's problem space (subscriptions, chargebacks, fraud, receivables, mandates, voice) — explicitly out of scope for this product, not just deferred.
- Custom-trained ML/fraud models.
- Multi-merchant, multi-currency, or production-scale considerations beyond what's needed for the demo and benchmark.

---

## 7. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | System shall classify each failed payment's failure reason into a recoverable/not-recoverable category using rule-based logic. | MVP |
| FR-2 | System shall compute a deterministic recovery score (0–100) using a disclosed, additive weighted formula over observable features. | MVP |
| FR-3 | System shall display the full score breakdown (each contributing factor and its point value) to the merchant, not just the final number. | MVP |
| FR-4 | System shall enforce configurable guardrails (`MAX_RETRIES`, `MAX_CONTACT_ATTEMPTS`, `MIN_TIME_BETWEEN_CONTACT`, `MIN_SCORE_TO_INTERVENE`, human-approval threshold) before any recovery action executes. | MVP |
| FR-5 | System shall produce a **No Action** decision, with a stated reason, whenever a payment does not clear the guardrails — this is a first-class, expected outcome, not an error state. | MVP |
| FR-6 | System shall use an LLM only to (a) explain a score in natural language, (b) draft a recovery message, and (c) propose an intervention type from a fixed enum; the LLM output shall be schema-validated before use. | MVP |
| FR-7 | System shall validate every LLM-proposed intervention against the guardrails before execution; a proposal that fails validation shall not execute. | MVP |
| FR-8 | System shall simulate outbound recovery messages by default and shall visibly label simulated actions as simulated in both UI and logs. | MVP |
| FR-9 | System shall optionally create a real Razorpay test-mode payment link and detect payment success via one webhook listener. | MVP |
| FR-10 | System shall log every decision (action taken or not taken) with a timestamp, the inputs considered, the score, the guardrail result, and the outcome. | MVP |
| FR-11 | System shall generate a synthetic dataset of 500–1,000 failed payments using a hidden ground-truth recoverability function that is not exposed to the agent's scoring logic. | MVP |
| FR-12 | System shall compute and display, for the same synthetic batch: agent performance, contact-everyone baseline performance, and do-nothing baseline performance, each with ₹ recovered, recovery rate, and contact attempts used. | MVP |
| FR-13 | System shall compute precision/recall of the intervene/no-intervene decision against the hidden ground-truth function where determinable, and display it on the evaluation page. | MVP |
| FR-14 | System shall provide a dashboard summarizing revenue at risk, revenue recovered, recovery rate, and the agent-vs-baseline comparison. | MVP |
| FR-15 | System shall provide per-customer views showing payment history and prior recovery outcomes. | MVP |
| FR-16 | System documentation shall explicitly state, in `docs/decisions.md`, which components are simulated vs. real. | MVP |

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Explainability** | Every automated decision (act or don't act) must have a human-readable, traceable reason. No unexplained scores or probabilities may be shown to the user. |
| **Auditability** | Every decision, including no-action decisions, must be permanently logged and viewable in the audit trail. |
| **Determinism / Non-circularity** | The recovery scoring logic and the benchmark's ground-truth logic must be implemented independently, so evaluation results are not tautological. |
| **Boundedness** | The LLM must never be the final authority on a monetary or contact-frequency decision; all such decisions pass through deterministic guardrail checks. |
| **Honesty of disclosure** | Any simulated component (messaging, non-implemented hardening) must be labeled as such in the UI and documentation — never presented as if it were fully real. |
| **Reliability (demo-scoped)** | The product must run reliably through a full live demo run-through without crashes; production-grade SLAs, uptime guarantees, and horizontal scaling are not required. |
| **Performance (demo-scoped)** | Dashboard and evaluation pages must load and render the 500–1,000-record benchmark results without perceptible lag during a live demo. |
| **Security (minimum)** | API keys and secrets (Razorpay, LLM providers) must be stored via environment variables, never committed to the repository. |
| **Portability** | The LLM provider must be swappable via configuration (Gemini primary, Groq fallback) without code changes to the decision engine. |
| **Maintainability (build-scoped)** | Codebase must be structured per the repository layout in `MyIdea.md` §16 so a reviewer can navigate architecture, evaluation methodology, and decisions documentation independently. |
| **Buildability within constraints** | All requirements in this PRD must be achievable by one solo builder with existing full-stack (Next.js/TypeScript) experience and no prior ML/agent-orchestration experience, within a 6-day build window plus a 1-day testing/polish/submission window. |

---

## 9. Edge Cases

- **Payment with an unrecoverable failure reason** (e.g., blocked card): must score low and correctly resolve to No Action, not be forced through the recovery flow.
- **Customer who has already exhausted `MAX_CONTACT_ATTEMPTS`**: guardrail must block further contact even if the score is high, and the system must log why.
- **Payment above the human-approval amount threshold**: must be flagged for merchant review rather than auto-executed, even with a passing score.
- **LLM returns a malformed or out-of-enum intervention proposal**: schema validation must reject it before it reaches the policy engine; system should fall back to No Action rather than executing an unvalidated proposal.
- **Primary LLM provider (Gemini) is rate-limited or unavailable during the live demo**: system must be able to swap to the Groq fallback via configuration without code changes.
- **Synthetic batch produces a payment where the agent's score and the hidden ground truth strongly disagree**: this is expected (noise is part of the ground-truth function) and must be visible in the precision/recall metrics, not hidden or filtered out.
- **A recovery message is simulated but a merchant might mistake it for a real send**: UI must not allow this ambiguity — simulated actions are visually and textually distinct from real ones at all times.
- **Razorpay test-mode webhook fails to fire or arrives out of order**: MVP does not need idempotency/retry handling for this, but the missed/duplicate event should not corrupt a payment's audit trail or double-count recovered revenue in the demo dataset used for evaluation metrics.

---

## 10. Out of Scope (explicit)

The following are not part of this product, this PRD, or this hackathon submission, and should not be treated as deferred features to revisit mid-build:

- Any Buildathon track other than AI Revenue Recovery (Growth/Agentic Commerce, Risk Manager, Finance Controller, Open Track).
- Subscription recovery, B2B receivables chasing, mandate retry sequencing, Hinglish voice recovery, promise-to-pay tracking, checkout drop-off recovery, or any other Revenue Recovery direction besides failed one-time payment recovery.
- Real outbound messaging via WhatsApp, email, or SMS.
- Production-grade Razorpay webhook handling (signature verification, idempotency, retry/backoff).
- Any form of custom model training or fine-tuning.
- Multi-tenant merchant management, billing, or account systems beyond what's needed to demo a single merchant's data.
- Multi-currency support.
- Fraud detection or offense-capable functionality of any kind (explicitly disqualifying per the hackathon brief's rules for Track 02, and not part of Track 03's scope either).
- General chatbot or conversational support functionality not tied to the recovery decision loop.

---

## 11. Open Assumptions

- The synthetic dataset (500–1,000 records) is the primary evidence base for all reported metrics; no claim is made that depends on data not covered by this batch.
- "Demo-ready by Day 6" assumes no further feature additions are approved after that point — Day 7 is a hard boundary per the agreed build plan.
- LLM usage volume is low (a handful of live-demoed decisions, not the full evaluation batch, since the batch runs on deterministic logic only), so free-tier rate limits are not expected to constrain the evaluation harness.
