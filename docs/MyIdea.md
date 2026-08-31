# MyIdea.md — RecoverAI: Revenue Recovery Agent (Refined v2)

> Refined after a brutal internal review of v1. This version keeps the core concept but closes the three holes that would have cost the most points: fake-precision scoring, a circular evaluation, and scope-creep on real third-party integrations. Every change below exists to raise judged score per hour of build time, not to add features for their own sake.

## 0. What changed from v1 and why

| v1 | Problem identified in review | v2 fix |
|---|---|---|
| "Recovery probability: 82%" with no stated origin | Fake precision — judges (esp. Razorpay's own risk people) spot this instantly, and it's the exact failure mode the brief warns against | Disclosed weighted scoring formula (Section 6) — every number traces to a visible rule |
| Evaluation batch generated and scored by the same logic | Circular — can't fail a test you wrote to pass | Synthetic generator has a **hidden ground-truth function** the agent never sees (Section 9) |
| "Recovery rate: 35.7%" reported alone | A rate with no reference point isn't evidence of value | Added **baseline comparison** (agent vs. "contact everyone" vs. "do nothing") — this is now the headline metric |
| Real WhatsApp/Email sending planned | Third-party API approval/integration risk eats a full day for zero judging benefit | Fully simulated messaging from Day 1, explicitly and openly stated as simulated |
| Full Razorpay webhook handling (signatures, idempotency, retries) | New API, high learning-curve risk, not demo-critical | Minimal integration: one test-mode payment link + one webhook listener; rest documented as "future hardening" |
| `MAX_DISCOUNT = 10%` guardrail with no feature behind it | Guardrail that gates nothing reads as padding | Either wired into a real (tiny) discount-offer action path, or removed — no decorative rules |
| "Agent should not intervene" cases added on Day 5 | Bolted on late; brief treats restraint as core evidence of a real policy engine | Now a first-class part of the synthetic dataset and demo from Day 1 |
| 7-day plan with no slack | Solo build, no ML/agent-orchestration experience, real risk of days slipping | Product is feature-complete and demo-able by end of **Day 6**; Day 7 is pure testing/polish/recording, no new logic |

---

## 1. Project status

**Selected Buildathon track:** AI Revenue Recovery

**Working product name:** RecoverAI

**Core idea:** A small, complete SaaS product for merchants that recovers **failed one-time payments** — and *proves*, with a held-out benchmark and a baseline comparison, that its recovery decisions create more value than doing nothing or contacting everyone blindly.

The differentiator is no longer the concept (failed-payment recovery is the obvious reading of the track). The differentiator is **evidence discipline**: a non-circular evaluation, a disclosed scoring method, and demonstrated restraint (knowing when *not* to act). These are the things the brief explicitly rewards and that most competing submissions will skip.

## 2. The problem

A merchant seeing "payment failed" isn't the interesting problem. The interesting problem is:

- Is this payment actually worth trying to recover?
- Why did it fail?
- What recovery action is appropriate, through which channel, at what time?
- When should the system retry, escalate, or **stop and do nothing**?
- Did the intervention actually recover money — and would a dumber strategy have done just as well?

That last question is new in v2 and is now central to the whole product: **recovery decisions are only valuable if they beat the obvious alternative.**

## 3. Narrow scope decision (unchanged, validated as correct)

We intentionally solve **failed one-time payment recovery for online merchants**, and explicitly not subscriptions, invoices, chargebacks, abandoned carts, mandates, fraud, or voice. This was correct in v1 and stays correct — a narrow, fully-evidenced product beats a broad, half-working one. What v2 changes is not the scope of the *problem*, but the rigor of the *proof*.

## 4. Product for the merchant (unchanged surface, one addition)

### Overview
- Revenue at risk
- Revenue recovered
- Recovery rate
- **Recovery rate vs. baseline strategies** *(new — see Section 9)*
- Failed payments
- Pending recovery actions
- AI recommendations

Example:

```text
Revenue at risk:            ₹52,400
Revenue recovered (agent):  ₹18,700   (35.7%)
Revenue recovered (contact-all baseline): ₹13,900   (26.5%)
Revenue recovered (do-nothing baseline):  ₹0        (0%)
Agent lift over best baseline: +34.5%
Contact attempts used (agent): 31   vs. contact-all: 51
```

This single panel is the most important thing you build this week. It turns "we recovered money" into "our decision layer recovered more money with fewer, better-targeted actions than the obvious alternative" — a business claim, not a vanity number.

### Payments page
Unchanged: payment ID, customer, amount, method, failure reason, timestamp, recovery status, AI recommendation. Add a **"No action" status** as a first-class value (not an afterthought) — some payments should visibly and correctly get no intervention.

### Customer page
Unchanged: history, previous failures/successes, recovery attempts, outcomes, behavioral context.

### Recovery page
Unchanged: campaigns, contacted customers, pending actions, recovered payments.

### Evaluation/analytics page (substantially expanded — see Section 9)
This page now carries most of the product's actual credibility. It shows the held-out benchmark, the baseline comparison, and the restraint cases, not just a headline number.

## 5. Example user flow (unchanged structure, scoring made honest)

**Rahul** — ₹4,999, card, insufficient funds, several prior successful payments, typically pays in the evening.

```text
Recovery score: 78/100 (Tier: High)
Recommended action: Send payment link
Recommended time: 6:30 PM

Score breakdown (disclosed, not hidden):
+ Past success rate (5/6 payments succeeded):        +30
+ Failure type "insufficient funds" is recoverable:   +25
+ Time-of-day pattern match (evening):                +15
+ Recency of last success (within 14 days):           +8
– Two recovery attempts already this month:           -10
= 78 / 100 → High tier → intervene
```

Note the shift from a bare "82%" to a **disclosed additive score with a stated formula**. Same underlying idea, but now every number is traceable and defensible in a Q&A with judges — which is exactly the moment a fake-precision number gets you caught.

Flow after the decision is unchanged: payment link created → personalized message generated → message **simulated as sent** (explicitly labeled "simulated" in the UI, not hidden) → customer opens link (simulated or real test-mode payment) → payment succeeds → webhook/event updates status → dashboard FAILED → RECOVERED → metrics update.

## 6. The AI/agent concept (same shape, authority boundary unchanged and reinforced)

```text
Payment failure
      ↓
Collect payment + customer context
      ↓
Diagnose failure (rule-based classification, not LLM guesswork)
      ↓
Score recovery opportunity (disclosed weighted formula, Section 6 above)
      ↓
LLM proposes intervention + generates explanation + personalized message
      ↓
Backend policy engine validates (guardrails, Section 7)
      ↓
Execute action (simulated send / real test-mode payment link)
      ↓
Observe result
      ↓
Recovered / Retry / Stop / Escalate / No-action
      ↓
Audit + metrics (including "why no action")
```

Key change: **the recovery score itself is deterministic and disclosed, not something the LLM invents.** The LLM's job is narrower and more defensible than in v1 — it explains the score in natural language, drafts the outreach message, and proposes the intervention type from an allowed list. It does not generate the probability. This is both more honest and easier to build correctly in a week.

Tools (unchanged, still the right shape):

```text
getPayment()
getCustomerHistory()
classifyFailureReason()
calculateRecoveryScore()      // deterministic, disclosed formula — not an LLM call
proposeIntervention()         // LLM, constrained to an allowed action enum
generateRecoveryMessage()     // LLM
sendMessage()                 // simulated
createPaymentLink()           // Razorpay test-mode, minimal
scheduleRetry()
stopRecovery()
escalateToMerchant()
```

## 7. Guardrails (tightened — every rule must gate something real)

```text
MAX_RETRIES = 3
MAX_CONTACT_ATTEMPTS = 2
MIN_TIME_BETWEEN_CONTACT = 24 hours
MIN_SCORE_TO_INTERVENE = 40 / 100      // below this, action is always "No action"
REQUIRE_HUMAN_APPROVAL for amounts above a configurable threshold
```

`MAX_DISCOUNT` is removed unless a discount-offer action is actually wired into `proposeIntervention()`'s allowed-action enum and demonstrable in the demo. Do not ship a guardrail that doesn't gate a real code path — it will get spotted as padding faster than a missing feature would.

**Design principle, unchanged and now the product's actual thesis:** LLM = reasoning and communication layer. Backend = authority and arithmetic. The score, the guardrail checks, and the metrics are all deterministic and inspectable; the LLM only explains and drafts.

## 8. AI decision explanation (unchanged format, now backed by the disclosed score)

```text
Recovery Decision — Rahul, ₹4,999

Score: 78/100 (High) — see breakdown, Section 5
Action: Send payment link at 6:30 PM
Guardrail check: PASSED (attempt 1 of 2, above MIN_SCORE_TO_INTERVENE)

Why:
✓ Previous successful payments (5/6)
✓ Failure type is recoverable (insufficient funds)
✓ Evening timing matches customer pattern
✓ Within recency window

LLM-generated explanation (for the merchant, in plain language):
"Rahul has a strong track record and this failure type is usually temporary.
Sending a payment link during his usual evening payment window is likely to work."
```

The structured score is the source of truth. The LLM's prose *explains* the score — it never overrides or invents it.

## 9. Audit trail (unchanged, one addition: explicit non-action entries)

```text
14:32 — Payment failed
14:33 — Failure classified: insufficient_funds (recoverable)
14:34 — Recovery score calculated: 78/100 (High)
14:35 — Guardrail check: passed
14:36 — LLM proposed: send payment link, 6:30 PM
14:36 — Policy validation: passed
18:30 — Recovery message sent (simulated)
19:04 — Payment link opened
19:06 — Payment successful
19:07 — Recovery marked SUCCESSFUL
```

And, for a restraint case:

```text
09:12 — Payment failed
09:13 — Failure classified: card_blacklisted (not recoverable)
09:13 — Recovery score calculated: 12/100 (Low)
09:13 — Guardrail check: below MIN_SCORE_TO_INTERVENE
09:13 — Decision: NO ACTION — escalate to merchant for manual review
09:13 — Recovery marked NOT ATTEMPTED (correctly)
```

This second kind of log entry is now shown prominently in the demo — it's direct proof the system isn't just "recover everything and hope."

## 10. Evaluation — this is the section that wins or loses the submission

### 10.1 The non-circularity fix (highest-priority build item)

The synthetic data generator must produce two separate things that never touch each other in code:

1. **Observable features** the agent is allowed to see: past success rate, failure reason, time-of-day pattern, amount, days since last attempt, prior contact count.
2. **A hidden "true recoverability" function**, defined independently by you when generating the data (e.g., a weighted formula with deliberately different weights than the agent's scoring formula, plus randomness/noise), used ONLY to decide whether a simulated recovery attempt "succeeds" in the synthetic environment. The agent never sees this function or its output — it only sees the observable features and the eventual simulated outcome.

This means the agent's score and the world's ground truth are genuinely independent, so "the agent's score correlates with actual outcomes" becomes a real, checkable claim instead of a tautology. Document this split explicitly and visibly in `docs/evaluation.md` — stating your own methodology this plainly is, by itself, a differentiator most teams won't bother with.

### 10.2 Baseline comparison (the new headline metric)

Run the same synthetic batch through three strategies:

- **Agent** (score → tiered decision → guardrails)
- **Contact-everyone** (naive baseline — no scoring, contact all failed payments up to guardrail limits)
- **Do-nothing** (floor baseline — recovery rate from failures that would resolve on their own)

Report recovered ₹, recovery rate, and contact attempts used for all three, side by side. The story you want: *the agent recovers close to or more than contact-everyone, while using meaningfully fewer contact attempts* — that's a genuine efficiency/precision argument, not just a raw recovery number.

### 10.3 Metrics to report

- Total failed payments, revenue at risk
- Recovery opportunities identified vs. correctly withheld (no-action cases)
- ₹ recovered — agent vs. both baselines
- Recovery rate — agent vs. both baselines
- Contact attempts used — agent vs. contact-everyone
- Where ground truth allows it: precision/recall of the "should we intervene" decision against the hidden ground-truth function
- Explicit list of restraint cases (correctly not attempted) with reasons

### 10.4 Scale

500–1,000 synthetic failed payments, generated with the hidden-function methodology above. No claim is made without this batch backing it. No custom ML training — the rigor comes from the evaluation design, not from model sophistication.

## 11. What makes this different from "payment failed → email" (sharpened)

v1's differentiation was the decision loop itself (diagnose → score → intervene → observe → stop/retry → measure). That loop is now table stakes — assume other teams build something similar. v2's actual differentiation is:

1. A recovery score with a **disclosed, inspectable formula** instead of an unexplained LLM-generated percentage.
2. An evaluation that is **provably non-circular** (hidden ground-truth function, documented split).
3. A **baseline comparison** proving the agent beats the obvious alternative, not just "the agent worked."
4. **Restraint made visible** — no-action cases are a demoed feature, not an edge case buried in logs.

Any one of these is a reasonable addition. All four together is what separates "generic hackathon agent demo" from "someone who understands what it means for an AI decision system to be trustworthy," which is exactly the capability Razorpay is hiring for.

## 12. Why this benefits Razorpay (unchanged)

Recovering transactions that would otherwise be lost increases merchant revenue, reduces churn, and demonstrates AI embedded usefully into payment infrastructure — directly aligned with Razorpay's own Agent Studio direction (Subscription Recovery, Abandoned Cart Conversion, etc.), while staying intentionally narrower in scope.

## 13. Why this benefits you as a candidate (sharpened)

The project now demonstrates something more specific than "can build a full-stack AI product": it demonstrates that you understand **evaluation integrity** — that a synthetic benchmark can lie to you if you're not careful, and that you know how to prevent that. That's a materially rarer and more senior-sounding signal than "built an agent with tool calling," and it costs you roughly one extra day of build time to earn.

## 14. Technology stack (unchanged, integration scope explicitly capped)

### Frontend
Next.js, React, TypeScript, Tailwind/shadcn, Recharts.

### Backend
Next.js API routes/server actions and/or Node.js/TypeScript, REST endpoints.

### Database
PostgreSQL (Supabase for speed).

```text
merchants
customers
payments
recovery_attempts
agent_decisions
audit_logs
```

### AI
Existing LLM API, AI SDK, structured outputs, tool calling. The recovery **score** is plain deterministic TypeScript, not an LLM call — only the explanation, message drafting, and intervention proposal go through the LLM. No custom model training.

### Payments (explicitly capped scope)
- Razorpay test-mode: create one payment link, listen for one webhook event. Nothing more.
- No signature/idempotency/retry hardening — documented as a stated limitation, not attempted.
- **No real WhatsApp/Email/SMS integration.** All outbound messaging is simulated and visibly labeled "simulated" in the UI. This is a deliberate, disclosed decision, not a shortcut you hide.

### Deployment
Vercel + managed Postgres/Supabase, env-based secrets.

## 15. Product architecture (one addition: baseline engine)

```text
                 MERCHANT
                    │
                    ▼
             ┌──────────────┐
             │   Dashboard  │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │   Backend    │
             │ Node/TS      │
             └──────┬───────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   Razorpay Events        PostgreSQL
   (minimal, test-mode)       │
          └─────────┬─────────┘
                    ▼
             ┌──────────────┐
             │ Deterministic│
             │ Scoring Layer│──────────┐
             └──────┬───────┘          │
                    ▼                  ▼
             ┌──────────────┐   ┌─────────────┐
             │  LLM Reasoning│   │  Baseline   │
             │  (explain +   │   │  Engine     │
             │   propose)    │   │ (contact-all│
             └──────┬───────┘   │  / do-nothing)│
                    ▼           └─────────────┘
             Policy Engine (guardrails)
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Retry   Simulated    No Action
              Message/Link  (escalate)
                    │
                    ▼
             CUSTOMER (simulated or test-mode)
                    │
                    ▼
                PAYMENT
                    │
                    ▼
             Revenue Recovered
                    │
                    ▼
        Evaluation Page (agent vs. baselines,
        hidden-ground-truth benchmark)
```

## 16. Build plan — feature-complete and demo-ready by end of Day 6

Deadline: **September 4, 2026** (7 days from today).

### Day 1 — Foundation + honest data
- Freeze scope (this document).
- Next.js + TypeScript app, backend, Supabase/Postgres, schema.
- Build the **synthetic data generator with the hidden ground-truth function** (Section 9.1) — this is now Day 1 work, not Day 5, because everything downstream depends on it being right.
- GitHub repo, README skeleton.
- End-of-day target: dashboard shows failed payments and revenue at risk from real (synthetic) data with a defensible generation methodology already documented.

### Day 2 — Merchant product surface
- Dashboard, payment detail page, customer history, filters/status (including "No action" status).
- Minimal Razorpay test-mode integration: one payment link creation, one webhook listener. Nothing beyond this.
- Fully simulated messaging path, explicitly labeled.
- End-of-day target: complete non-AI SaaS interface works end-to-end on synthetic + one real test-mode payment link.

### Day 3 — Deterministic scoring + guardrails
- Implement the disclosed weighted scoring formula (Section 6).
- Implement guardrails (Section 7) as real, enforced checks — no decorative rules.
- Implement no-action logic as a first-class path, not a fallback.
- End-of-day target: **failed payment → deterministic score → guardrail-checked decision**, fully working without the LLM yet.

### Day 4 — LLM layer + agent execution
- Wire the LLM to explain the score, draft the recovery message, and propose the intervention type (constrained to an allowed enum).
- Implement the recovery state machine (retry/stop/escalate), audit timeline (including no-action entries), payment link generation, simulated send, success detection, status update to RECOVERED.
- End-of-day target: **failure → deterministic score → LLM explanation/message → policy check → simulated/real intervention → recovered**, fully working.

### Day 5 — Evaluation + baseline comparison
- Generate the full 500–1,000 record synthetic batch.
- Run agent, contact-everyone baseline, and do-nothing baseline over the same batch.
- Build the evaluation page: agent vs. baselines, ₹ recovered, recovery rate, contact attempts used, restraint cases, precision/recall where ground truth allows.
- Write `docs/evaluation.md` documenting the hidden-ground-truth methodology explicitly.
- End-of-day target: the product is **fully feature-complete**, every claim in the eval page is backed by the documented batch.

### Day 6 — Polish, no new logic
By end of today the product must already be functionally complete (Day 5 target met). Today is strictly:
- Responsive UI, loading/error/empty states, chart cleanup, realistic data presentation.
- No broken buttons, no dead-end flows.
- GitHub structure finalized:

```text
recover-ai/
├── app/
├── components/
├── lib/
├── agents/
├── db/
├── tests/
├── docs/
│   ├── architecture.md
│   ├── evaluation.md      // hidden ground-truth methodology, baseline results
│   └── decisions.md       // what was simulated vs. real, and why
├── public/
├── .env.example
├── README.md
└── package.json
```

- README: problem, product, demo, architecture, AI design, evaluation methodology, setup, limitations (explicitly listing what's simulated).
- Architecture diagram + screenshots/GIF added.

### Day 7 — Testing, deployment, submission only
**No new features, no new logic — this day is a hard boundary.**

Morning: clean install from GitHub, test all flows (including a restraint/no-action case and the baseline comparison view), fix deployment issues, verify env vars, deploy.

Afternoon: record the 5-minute pitch (Section 17).

Evening: final GitHub cleanup, final README, final video, submit.

## 17. Five-minute demo storyline (sharpened to foreground the differentiators)

### 0:00–0:30 — Problem
> "₹52,400 at risk. The hard part isn't knowing payments failed — it's knowing which failures are worth pursuing, and proving your strategy actually beats the obvious alternative."

### 0:30–1:15 — Dashboard
Show revenue-at-risk, and immediately show the **agent-vs-baseline panel** so judges see the differentiator in the first 90 seconds, not buried at the end.

### 1:15–2:00 — AI diagnosis on a recoverable case
Open Rahul's payment. Show the disclosed score breakdown (not a bare percentage), the guardrail check, and the LLM's explanation.

### 2:00–2:30 — Restraint case
Open a low-score payment. Show the system correctly choosing **no action** and escalating instead of blindly contacting. This is the guardrail proof point.

### 2:30–3:15 — Agent executes recovery
Payment link created, message drafted and (labeled) simulated sent, customer completes payment, dashboard flips to RECOVERED, audit trail visible.

### 3:15–4:15 — Evaluation page
Full batch results: agent vs. contact-everyone vs. do-nothing, ₹ recovered, contact attempts used, restraint cases correctly withheld. Explicitly mention the hidden ground-truth methodology in one sentence — this is the line that signals rigor to a technical judge.

### 4:15–5:00 — Architecture and honesty
> "The score is deterministic and disclosed. The LLM only explains and drafts messages — it never invents the number or bypasses a guardrail. Everything here that isn't real Razorpay test-mode is explicitly simulated and labeled as such in the code and the UI. Every decision is logged, including the decisions not to act."

## 18. What NOT to do (unchanged, one addition)

Do not:
- train a neural network from scratch or spend the week learning PyTorch;
- present an unexplained probability as if it came from a model;
- build a generic chatbot;
- build every Revenue Recovery use case;
- add voice or real messaging APIs unless the core loop and evaluation are already excellent;
- spend days on UI before the scoring/guardrail/evaluation core works;
- make claims unsupported by the documented, non-circular evaluation batch;
- **hide what's simulated** — label it, in the UI and in `docs/decisions.md`. Judges trust disclosed simulation far more than they trust an undisclosed one they later discover.

## 19. Definition of success (raised bar)

The MVP is successful if, in a live demo, a reviewer can see:

```text
A failed payment
      ↓
A disclosed, inspectable recovery score (not a mystery percentage)
      ↓
A guardrail-checked decision — including, for some payments, correctly no action
      ↓
Agent executes a bounded, simulated-or-real recovery action
      ↓
Customer completes payment; system detects success
      ↓
₹ recovered appears in analytics — alongside baseline comparisons proving the
strategy beats "contact everyone" and "do nothing"
      ↓
Every decision, including non-decisions, exists in the audit trail
      ↓
The evaluation methodology itself (hidden ground truth, no circularity) is
documented and explained in under one sentence during the demo
```

The project should feel like a small, honest, evidence-backed SaaS product — not an AI prototype, and not a demo that quietly hopes nobody asks where the numbers came from.

## 20. Core philosophy (updated)

v1's philosophy: **build a small problem completely rather than a huge problem partially.** Still correct, still the frame for scope.

v2 adds the missing half: **a small problem solved with evidence you can defend under questioning beats a small problem solved with numbers you can't explain.** The build order, the day-1 investment in the hidden-ground-truth generator, and the baseline comparison all exist to make that second sentence true by Day 6.
