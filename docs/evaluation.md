# Evaluation Methodology — RecoverAI

**Purpose:** Document, precisely and checkably, how RecoverAI's central claim — "the agent recovers more revenue, more efficiently, than the obvious alternatives" — is measured, and why that measurement can be trusted rather than taken on faith. This document is referenced from the Evaluation page (`PRD.md` §5.5) and is the artifact a skeptical reader (a Razorpay AI Buildathon judge, `PRD.md` §2) should be able to check the product's claims against.

**Audience:** Anyone auditing whether RecoverAI's reported numbers mean what they claim to mean — primarily hackathon evaluators, but written to the same standard for any future reader.

---

## 1. The Problem This Methodology Solves

An AI system that scores its own test is not evidence of anything. If the same logic that decides whether a payment is "recoverable" is also used to decide whether the synthetic test payment actually recovers, then a high score is guaranteed to correlate with success — not because the scoring is good, but because the test cannot fail. This is the single most common way an evaluation like this goes wrong, and it is invisible unless the methodology is stated explicitly.

Two further problems compound it if left unaddressed:

- **A recovery rate reported alone is not evidence of value.** "35.7% recovered" means nothing without a reference point — a system that does nothing might recover a similar percentage on its own (some failed payments resolve themselves; a customer simply retries). A number needs a baseline to be a claim.
- **An unexplained score is not evidence either.** A bare "82% recovery probability" invites the question "where does that number come from," and if the honest answer is "the model's internal weights," it isn't checkable by anyone outside the system.

This document exists to close all three gaps: the score is disclosed (`Design.md` §7.2, `MyIdea.md` §5), the test is provably non-circular (§2 below), and every number is reported against two named baselines, not alone (§4).

---

## 2. Non-Circularity: The Hidden Ground-Truth Function

### 2.1 The core design

The synthetic data generator (`server/evaluation/synthetic-data.ts`, `ARCHITECTURE.md` §4.2) produces two things for each synthetic payment, and — this is the part that must never change without re-reading this document first — **the two are computed by independent code that never calls into each other**:

1. **Observable features**, which is everything the agent's scoring logic is allowed to see: past success rate, failure reason, time-of-day pattern, payment amount, days since last attempt, prior contact count (`MyIdea.md` §10.1).
2. **A hidden ground-truth recoverability outcome**, computed by a separate function using different weights than the agent's own scoring formula, plus injected randomness/noise, and used *only* to determine whether a simulated recovery attempt succeeds *when a payment is actually contacted*. This is `payments.synthetic_ground_truth_recoverable` (`DATABASE.md` §2.3.1).

The agent never sees the hidden function or its output. It only ever sees the observable features (which it's built to reason over) and, later, the eventual simulated outcome of its own action — the same information a real merchant's system would have.

### 2.2 Why different weights, not just "a separate function"

If the hidden function used the *same* weights as the agent's scoring formula, agreement between the two would be guaranteed by construction, which is exactly the circularity this design exists to avoid. Using deliberately different weights, plus noise, means the two are genuinely independent models of the same underlying idea ("is this payment recoverable"), and any correlation between the agent's decisions and the ground-truth outcomes is a real, checkable finding — not an artifact of shared code.

### 2.3 Where this is enforced

This is a code-structure rule, not just a documentation promise: `server/decision-engine/score.ts` and `server/decision-engine/classify-failure.ts` do not import from, and are never passed, anything from `server/evaluation/synthetic-data.ts`'s ground-truth function (`ARCHITECTURE.md` §4.3). Any code change that would let the scoring logic read `synthetic_ground_truth_recoverable` — directly, or indirectly through a shared helper — invalidates every number in this document and must not ship without updating this methodology and the evaluation page's disclosure banner (`Design.md` §3.3, item 1) to match.

### 2.4 A second, independent signal: spontaneous resolution (fixing a real bug in the original methodology)

The rest of this document, as originally written, used `synthetic_ground_truth_recoverable` to determine outcomes for **all three** strategies, including do-nothing. That's a genuine bug, not a simplification: if contact-everyone and do-nothing both read the same per-payment boolean to decide success, they get **identical results on every payment**, because whether the payment was contacted never enters the calculation. That makes it mathematically impossible for contact-everyone or the agent to ever recover more than do-nothing — the opposite of what this evaluation exists to show (§4 below).

The fix: `synthetic_ground_truth_recoverable` answers *"if this payment is contacted, does it recover"* and applies only to strategies that contact the payment (agent, contact-everyone). A second, independent quantity — `SPONTANEOUS_RESOLUTION_RATE`, a single fixed constant (not a per-payment column; a reasonable value is 5–10%, configurable via environment variable like the guardrail thresholds) — answers *"does this payment recover on its own, with no contact at all"* and is the **only** thing that determines a do-nothing outcome. It is drawn independently per payment, at evaluation time, and never touches `synthetic_ground_truth_recoverable`.

Concretely:

| Strategy | Contacted? | Outcome determined by |
|---|---|---|
| Agent | Only payments that pass scoring/guardrails | `synthetic_ground_truth_recoverable`, for contacted payments only; not contacted → no recovery |
| Contact-everyone | All payments | `synthetic_ground_truth_recoverable`, for every payment |
| Do-nothing | None | `SPONTANEOUS_RESOLUTION_RATE`, drawn independently per payment — never `synthetic_ground_truth_recoverable` |

This is what makes "agent/contact-everyone recover more than do-nothing" a genuine, checkable finding rather than a guaranteed artifact of the batch, and what makes "do-nothing recovers *something*, not zero" a realistic baseline (some payments do resolve on their own) without that something being spuriously large.

---

## 3. What Gets Measured

### 3.1 The synthetic batch

- **Scale:** 500–1,000 synthetic failed payments (`PRD.md` §5.8, FR-11), generated once per evaluation run using the methodology in §2.
- **No claim in this document, or on the Evaluation page, is made about anything outside this batch.** There is no live-merchant validation, no held-out real-world data, and no claim that these numbers predict performance for an actual merchant's actual customers — this is a controlled, synthetic benchmark, and is presented as exactly that (see §6).

### 3.2 The three strategies compared

Every payment in the batch is run through all three strategies, against the same hidden ground truth, so the comparison is apples-to-apples:

| Strategy | Definition |
|---|---|
| **Agent** | The actual product logic: classify → score → guardrail-check → (if passed) LLM proposes intervention → guardrail-validate → execute. Implemented by calling the exact same `score.ts`/`guardrails.ts` functions used in the live product flow (`ARCHITECTURE.md` §8.2) — not a separate "evaluation-mode" reimplementation. |
| **Contact-everyone** | The naive baseline: every failed payment is contacted, up to the same `MAX_CONTACT_ATTEMPTS`/`MAX_RETRIES` guardrail limits as the agent, with no scoring or restraint applied. This represents "do what most teams' MVP does." |
| **Do-nothing** | The floor baseline: no recovery action is taken on any payment. A payment "recovers" under this strategy only via the independent `SPONTANEOUS_RESOLUTION_RATE` draw (§2.4) — **never** `synthetic_ground_truth_recoverable`, which only applies to contacted payments. This isolates how much of any reported recovery is attributable to the product at all, and — critically — keeps this baseline's outcome statistically independent of whether a payment gets contacted, which is what makes the comparison in §4 meaningful rather than a guaranteed tie. |

Running the agent's real code path against these two baselines, rather than describing the baselines only in prose, is what makes the "agent beats the obvious alternative" claim a measured result instead of an assertion.

**A gap the original methodology left unresolved:** the live decision flow (`ARCHITECTURE.md` §8.1) has a third guardrail outcome beyond passed/blocked — `escalated`, for payments above the human-approval amount threshold (`DATABASE.md` §2.3.2) — which pauses for a merchant's Approve/Decline action. A 500–1,000-record batch run has no human available to click Approve, so this needs an explicit, stated rule rather than silently hanging or silently skipping the guardrail. **The rule: the human-approval threshold is bypassed during evaluation runs only, treated as auto-approved.** This is a deliberate, disclosed choice: this benchmark measures the quality of the scoring-and-guardrail *policy* (does it correctly identify recoverable payments and act with restraint), not merchant approval behavior, which isn't part of what's being evaluated. Every other guardrail (`MIN_SCORE_TO_INTERVENE`, `MAX_CONTACT_ATTEMPTS`, `MAX_RETRIES`, `MIN_TIME_BETWEEN_CONTACT`) still applies in full during evaluation — only the human-approval pause is skipped, and only because it has no meaning outside a live merchant session.

### 3.3 Metrics reported, per strategy

- **₹ recovered** — total simulated recovered amount, determined by checking each contacted (or, for do-nothing, each untouched) payment's outcome against the hidden ground truth.
- **Recovery rate** — ₹ recovered ÷ total revenue at risk in the batch, per strategy.
- **Contact attempts used** — total `recovery_attempts`-equivalent actions taken, per strategy. This is the number that turns "the agent recovers about as much as contact-everyone" into an efficiency claim: recovering a comparable amount with meaningfully fewer contact attempts is the actual headline result this methodology is built to produce (`MyIdea.md` §10.2).
- **Precision / recall of the intervene / no-intervene decision** — computed for the agent only, against the hidden ground truth, where determinable (`PRD.md` FR-13). Precision: of the payments the agent chose to contact, what fraction were truly recoverable per ground truth. Recall: of the payments that were truly recoverable per ground truth, what fraction did the agent choose to contact. These are not computed for contact-everyone (which has no precision by construction — it contacts everyone) or do-nothing (which has no recall by construction — it contacts no one); reporting them there would be a category error, not a finding.
- **Restraint cases** — the list of payments where the agent's decision was `no_action` (`agent_decisions.guardrail_result = 'blocked'`, `DATABASE.md` §2.5), shown with the specific guardrail or threshold that triggered it. These are listed explicitly, not just counted, because "the system correctly declined to act here, and here's why" is direct evidence of a real policy engine rather than a black box that always says yes (`MyIdea.md` §9).

---

## 4. How to Read the Comparison

The intended reading of the three-strategy comparison, stated plainly so it isn't left to interpretation:

1. **Agent vs. do-nothing** answers: *does this product create value at all, above what would happen anyway?* If the agent's ₹ recovered isn't meaningfully above do-nothing's, nothing else in this document matters.
2. **Agent vs. contact-everyone** answers: *is the product's restraint and targeting actually smart, or is it just doing less of the same thing?* The target finding is recovering a comparable or better amount using fewer contact attempts — that's a precision argument, not just a volume argument.
3. **Precision/recall** answers a narrower, more technical question: *when the agent chooses to act, how often is it right, and how much genuine opportunity does it miss?* This is the number most likely to expose a scoring formula that's miscalibrated (e.g., too conservative — high precision, low recall — or too aggressive — the reverse), and is reported honestly even if it isn't flattering.

No single number here is presented as "the" result — the claim is the *pattern* across all of them, and any one number should be read alongside the others, not in isolation.

---

## 5. Reproducibility

- The generator, the agent's scoring/guardrail code, and the metrics computation all live in version-controlled application code (`server/evaluation/`, `server/decision-engine/`, `ARCHITECTURE.md` §4.2) — nothing about the methodology lives only in this document or only in a notebook.
- Because the same underlying random seed determines a given batch's hidden ground truth, re-running the generator with the same seed reproduces the same batch; running without a fixed seed produces a new, independently valid batch (the methodology doesn't depend on any specific batch, only on the generation process being sound).
- Results are computed on demand from the persisted batch (`ARCHITECTURE.md` §8.2, §8.3) rather than cached in a dedicated results table (`DATABASE.md` §9) — at 500–1,000 records this is fast enough that "the numbers on the page" and "what you'd get re-running the computation right now" are always the same thing, which is itself part of the trustworthiness this document is arguing for.

---

## 6. Limitations — Stated Plainly

Consistent with this product's own principle of disclosing what's real vs. simulated (`PRD.md` NFR "Honesty of disclosure"), the same standard applies to the evaluation itself:

- **This is a synthetic benchmark, not a real-world validation.** No claim here should be read as "this is what would happen with real merchants and real customers" — only as "this is what happens against this documented, independently-generated synthetic ground truth."
- **The hidden ground-truth function is itself a designed artifact, not a law of nature.** It encodes the builder's own assumptions about what makes a payment recoverable (with deliberately different weights and added noise, §2.2) — it is a reasonable, honestly-disclosed proxy for reality, not a source of objective truth. A different, equally reasonable ground-truth function could produce different absolute numbers, though the same *comparative* pattern (agent vs. baselines) is the more robust claim.
- **Noise is expected and is not filtered out.** Cases where the agent's score and the hidden ground truth strongly disagree are expected outcomes of the noise term (`PRD.md` Edge Cases §9) and are included in the precision/recall figures, not excluded as outliers — excluding them would itself reintroduce a form of circularity (only counting the cases that make the agent look good).
- **No claim is made beyond the 500–1,000-record batch.** Scaling this methodology to a larger or different batch, or to a different failure-reason distribution, is future work, not something this document or the current Evaluation page asserts.
- **`SPONTANEOUS_RESOLUTION_RATE` (§2.4) is a single global assumption, not a per-payment modeled quantity.** In reality, different failure reasons likely have different spontaneous-resolution rates (a temporary bank-side decline may resolve itself more often than a blacklisted card). Modeling that per-payment is reasonable future work; a single global constant is the disclosed simplification this benchmark uses, and the comparative finding (agent/contact-everyone beat do-nothing) is robust to reasonable choices of this constant, though the exact margin isn't.
- **This methodology validates the decision *policy*, not a trained model.** There is no machine learning model being evaluated here — the "agent" is a disclosed, deterministic formula (`Design.md` §7.2, `MyIdea.md` §5) plus a constrained LLM layer that never sets the score (`ARCHITECTURE.md` §4.3). This evaluation is closer to policy backtesting than to ML model evaluation, and should be read that way.
