# Execution Checklist — RecoverAI, Day by Day

Pure sequence, no theory. Full rationale, exact prompts, and doc references live in `BUILD_PLAN.md` — this file tells you *when* and *in what order*, and fills seven gaps found by auditing that plan before today (see below). Work top to bottom, day by day. Don't start a day's first item until the previous day's last checkbox is actually checked.

**The seven fixes baked into this version, so you know why some steps below don't appear in `BUILD_PLAN.md`:** a credentials/config lock-in step before Chunk 0 (gap 1); a branch-PR-CodeRabbit loop repeated every chunk (gap 2); a Vercel-preview-URL fix for Razorpay webhook testing, used from Chunk 5 instead of discovered at Chunk 15 (gap 3); one seed script built once and reused three times instead of three separate manual inserts (gap 4); Vercel env vars set incrementally per chunk instead of dumped at the end (gap 5); a timing checkpoint on the evaluation harness (gap 6); and final, locked numeric values for every guardrail threshold below instead of leaving them open (gap 7).

---

## Day 0 — Pre-Flight (do this before opening Antigravity for real work)

**Credentials — get every one of these now, paste into a local `.env.local` (never commit it):**
- [ ] Supabase project created → copy project URL + anon key + service-role key
- [ ] Gemini API key (Google AI Studio)
- [ ] Groq API key
- [ ] Razorpay test-mode key ID + key secret (from Razorpay dashboard, Test Mode toggle on)
- [ ] Vercel account connected to your GitHub

**Config values — lock these in now, write them into `.env.local` today, change only deliberately later, never mid-debug:**
```
MAX_RETRIES=3
MAX_CONTACT_ATTEMPTS=2
MIN_TIME_BETWEEN_CONTACT_HOURS=24
MIN_SCORE_TO_INTERVENE=40
HUMAN_APPROVAL_AMOUNT_THRESHOLD=10000
SPONTANEOUS_RESOLUTION_RATE=0.07
SYNTHETIC_DATA_SEED=recoverai-2026
LLM_PROVIDER=gemini
```
`HUMAN_APPROVAL_AMOUNT_THRESHOLD` is set above the Rahul worked example (₹4,999) on purpose, so that example doesn't accidentally trigger escalation when you use it to sanity-check Chunk 2. `SYNTHETIC_DATA_SEED` is a fixed string, not left random — this is what lets you regenerate the exact same benchmark batch later without the numbers shifting between testing and demo day.

**Tools — confirm every one from the install pass is actually live:**
- [ ] CodeRabbit shows as installed on your GitHub repo settings
- [ ] Playwright MCP tools appear in Antigravity's tool list
- [ ] `impeccable`, `taste-skill`, `emil-design-eng`, `review-animations`, `web-design-guidelines` all appear as `/` commands in Antigravity

**Git workflow — set this up now, use it every day after:**
- [ ] `main` branch protected (no direct pushes) if you want CodeRabbit to actually gate anything — optional but recommended
- [ ] Confirm you can create a branch, push, and open a PR from the command line or GitHub's UI without friction, since you'll do this ~16 times

---

## Day 1 — Chunks 0, 1, 2

### Chunk 0
1. [ ] Branch `chunk-0-scaffolding`
2. [ ] Paste Chunk 0's prompt (`BUILD_PLAN.md`) into Antigravity
3. [ ] Confirm `.env.example` lists every variable from Day 0's config block above (names only, blank values)
4. [ ] `npm run dev` works locally, placeholder page loads
5. [ ] Push, open PR — this is the first PR CodeRabbit will review; read its comments even though there's little logic yet, confirms it's actually working
6. [ ] Merge, deploy to Vercel, confirm the placeholder page is live at a real URL
7. [ ] **Set Supabase-unrelated Vercel env vars now:** none yet — nothing from Chunk 0 needs a production secret

### Chunk 1
1. [ ] Branch `chunk-1-database`
2. [ ] Paste Chunk 1's prompt into Antigravity
3. [ ] Run the migration against your real Supabase project (not a local-only DB)
4. [ ] **Set Vercel env vars now:** Supabase URL, anon key, service-role key
5. [ ] Run the test-insert script from Chunk 1's Definition of Done — confirm the `escalated`/`awaiting_approval` values are actually accepted
6. [ ] `npm run test` (if any tests exist yet), push, PR, CodeRabbit review, merge

### Chunk 2
1. [ ] Branch `chunk-2-scoring`
2. [ ] Paste Chunk 2's prompt into Antigravity
3. [ ] `npm run test` — confirm all pass, confirm the Rahul example produces 78/100
4. [ ] `grep -r "llm" server/decision-engine/score.ts server/decision-engine/classify-failure.ts` — confirm zero results, don't just trust the agent's word
5. [ ] Push, PR, CodeRabbit review (ask it explicitly: `@coderabbitai generate unit testing code for this file` on `score.ts` — see what edge cases it finds that you didn't), merge

**End of Day 1 checkpoint:** database is live, scoring is tested and correct, zero UI exists yet — that's expected, not behind schedule.

---

## Day 2 — Chunks 3, 4, 5

### Chunk 3
1. [ ] Branch `chunk-3-guardrails`
2. [ ] Paste Chunk 3's prompt — confirm it reads the locked config values from `.env.local`, not hardcoded numbers
3. [ ] `npm run test` — confirm the retry-vs-contact-attempt divergence test specifically passes
4. [ ] Push, PR, CodeRabbit review, merge

### Chunk 4
1. [ ] Branch `chunk-4-llm`
2. [ ] Paste Chunk 4's prompt
3. [ ] Manual test against Gemini using the Rahul example — confirm schema-validated output
4. [ ] Switch `LLM_PROVIDER=groq` locally, re-run, confirm Groq works too, switch back to `gemini`
5. [ ] **Set Vercel env vars now:** `GEMINI_API_KEY`, `GROQ_API_KEY`, `LLM_PROVIDER`
6. [ ] Push, PR, CodeRabbit review, merge

### Chunk 5
1. [ ] Branch `chunk-5-execute`
2. [ ] Paste Chunk 5's prompt
3. [ ] **Razorpay webhook bottleneck fix — do this now, not at Chunk 15:** push this branch, get its Vercel preview deployment URL, register `<preview-url>/api/webhooks/razorpay` as the webhook endpoint in your Razorpay test-mode dashboard. Razorpay cannot reach `localhost`, so this is the only way to test the webhook before final deploy. You'll update this URL to the production one in Day 7.
4. [ ] **Set Vercel env vars now:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
5. [ ] Confirm zero network calls happen on the simulated path (check dev tools network tab or server logs, not just the `is_simulated` flag)
6. [ ] Create one real test-mode payment link, confirm it works
7. [ ] Push, PR, CodeRabbit review, merge

**End of Day 2 checkpoint:** the full decision engine exists and is individually tested — nothing is wired together yet.

---

## Day 3 — Chunks 6, 7, 8

### Chunk 6
1. [ ] Branch `chunk-6-api-routes`
2. [ ] **Build the shared seed script now, as part of this chunk, not later:** ask your agent to create `scripts/seed.ts` covering — one normal recoverable payment, one payment that correctly resolves to `no_action`, one payment above `HUMAN_APPROVAL_AMOUNT_THRESHOLD` (triggers `awaiting_approval`), one already-`recovered` payment, one `failed` payment. This single script gets reused in Chunks 6, 9, and 10 — don't hand-insert test rows three separate times.
3. [ ] Paste Chunk 6's prompt
4. [ ] Run `scripts/seed.ts`, then test all three flows from Chunk 6's Definition of Done via direct API calls (no UI yet)
5. [ ] Push, PR, CodeRabbit review — this is your highest-integration-risk chunk, read the review carefully — merge

### Chunk 7
1. [ ] Branch `chunk-7-app-shell`
2. [ ] Paste Chunk 7's prompt
3. [ ] Log in, click through all five empty pages
4. [ ] **Verify by eye, don't skip this:** active sidebar item is dark/black, not blue
5. [ ] Push, PR, CodeRabbit review, merge

### Chunk 8
1. [ ] Branch `chunk-8-components`
2. [ ] Paste Chunk 8's prompt
3. [ ] For each of the six components, run in this order: `/impeccable critique [component], constrained to docs/Design.md §2 tokens` → `/taste-skill` same constraint → `/review-animations` same constraint
4. [ ] Verify simulated-vs-real chips are visually distinct at a glance, status badges all have icons
5. [ ] Push, PR, CodeRabbit review, merge

**End of Day 3 checkpoint:** you can log in and see a styled but empty app; the seed script exists and works.

---

## Day 4 — Chunks 9, 10

### Chunk 9
1. [ ] Branch `chunk-9-payments-page`
2. [ ] Paste Chunk 9's prompt, tell the agent to use `scripts/seed.ts` for test data, not fresh manual inserts
3. [ ] Run the same three design-skill passes as Chunk 8 (Impeccable → Taste Skill → `review-animations`), constrained to `Design.md`
4. [ ] Run `/web-design-guidelines [payments page]` — first of its two total uses
5. [ ] Ask Playwright MCP: *"Navigate to /payments, log in, open the seeded awaiting_approval payment, click Approve, confirm status updates with no console error. Then open a different awaiting_approval payment (reseed one if needed) and click Decline, confirm it resolves to no_action."*
6. [ ] Push, PR, CodeRabbit review, merge

### Chunk 10
1. [ ] Branch `chunk-10-customer-recovery-pages`
2. [ ] Paste Chunk 10's prompt, reuse `scripts/seed.ts`
3. [ ] Confirm both pages import the same drawer component as Payments — not a visual duplicate
4. [ ] Push, PR, CodeRabbit review, merge

**End of Day 4 checkpoint:** three of five core pages work end to end with real data.

---

## Day 5 — Chunks 11, 12

### Chunk 11
1. [ ] Branch `chunk-11-evaluation-harness`
2. [ ] Paste Chunk 11's prompt, confirm `SYNTHETIC_DATA_SEED` from Day 0 is actually used, not a random seed each run
3. [ ] `npm run test` — confirm both regression tests pass: no import of `synthetic-data.ts` in `score.ts`/`classify-failure.ts`; no reference to `synthetic_ground_truth_recoverable` in `do-nothing.ts`
4. [ ] Run the full harness once, confirm contact-everyone's and agent's recovery rates are **not** identical to do-nothing's
5. [ ] **Time it.** If a full run (generate + all three strategies + metrics) takes longer than ~8 seconds, don't leave it computing live on every page load — precompute once, store the result, and have the Evaluation page read the stored result instead. Decide this now, not while debugging a demo-day timeout.
6. [ ] Push, PR, CodeRabbit review, merge

### Chunk 12
1. [ ] Branch `chunk-12-evaluation-page`
2. [ ] Paste Chunk 12's prompt
3. [ ] Confirm the methodology banner renders above the numbers, not below
4. [ ] Run Impeccable → Taste Skill → `review-animations` on this page — it's your highest-credibility page, worth the full pass
5. [ ] Ask Playwright MCP to click through the All/No Action tabs and confirm the restraint list actually filters
6. [ ] Push, PR, CodeRabbit review, merge

**End of Day 5 checkpoint:** the evaluation harness runs, is regression-tested against both known bugs, and is visible in the UI. This is the differentiator — don't let it be the part that's rushed.

---

## Day 6 — Chunks 13, 14 — Feature-Complete Deadline

### Chunk 13
1. [ ] Branch `chunk-13-dashboard`
2. [ ] Paste Chunk 13's prompt, confirm it reads from the same data source as Chunk 12, not a second computation
3. [ ] Cross-check every number against Payments and Evaluation pages — they must match exactly
4. [ ] Push, PR, CodeRabbit review, merge

### Chunk 14
1. [ ] Branch `chunk-14-landing`
2. [ ] Paste Chunk 14's prompt
3. [ ] Confirm the hero stat is a real number pulled from Chunk 12's live results, not a placeholder
4. [ ] Run Impeccable → Taste Skill → `review-animations` — last use of all three
5. [ ] Check responsive behavior at mobile and desktop widths
6. [ ] Push, PR, CodeRabbit review, merge

**End of Day 6 — hard checkpoint:** every one of the five core pages plus the landing page works end to end with real data, no placeholder numbers anywhere. If something's not done, the fix is cutting scope from `PRD.md` §6, not skipping ahead into Day 7 with unfinished features — Day 7 has zero room for new feature work.

---

## Day 7 — Chunk 15 — QA, Deploy, Submit

1. [ ] Branch `chunk-15-final-qa` (or work directly against `main` if you're confident — this chunk shouldn't touch feature code)
2. [ ] **Update the Razorpay webhook URL** from Day 2's Vercel preview URL to your final production domain
3. [ ] Set every remaining Vercel env var, confirm none are placeholders — cross-check against the full Day 0 list
4. [ ] Update `.env.example` to match what's actually used in code (it was written speculatively on Day 1)
5. [ ] Write `README.md`: problem, product, demo, architecture, AI design, evaluation methodology, setup, limitations
6. [ ] Go through `docs/decisions.md` §1's disclosure table row by row — confirm every "Real"/"Simulated" claim is true of the deployed code as it exists right now, not as originally planned. Fix the table or fix the code, whichever drifted.
7. [ ] Run `/web-design-guidelines` — second and final use, full pass across all pages
8. [ ] Ask Playwright MCP to walk every flow end to end: normal recovery, correctly-withheld no-action, escalation approved, a *separate* escalation declined, baseline comparison view, mobile check on Payments and Dashboard
9. [ ] Fresh clone test: clone the repo into a new folder, follow your own README from scratch, confirm it actually works — this is the check that catches "works on my machine"
10. [ ] **Lock the demo data before recording:** don't regenerate the synthetic batch or reseed test payments between your last QA pass and hitting record — the numbers you rehearsed with should be the numbers in the video
11. [ ] Record the 5-minute demo per `MyIdea.md` §17's storyline
12. [ ] Final push, merge to `main`, confirm production deploy is the version in the video
13. [ ] Submit

---

## If You Fall Behind

Cut scope from `PRD.md` §6 (already-deferred features). Never skip a Definition of Done check to catch up — that's the exact discipline that caught the two real bugs (`decisions.md` D-013, D-014) before they shipped instead of after.
