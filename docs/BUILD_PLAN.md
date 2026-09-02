# Build Plan — RecoverAI, Zero to Production

**Purpose:** Break the build into sequential, agent-sized chunks — small enough to hand to Antigravity one at a time, each one fully working and checkable before the next begins. This replaces "build me the whole product" with "build me chunk 4," which is the difference between a codebase you understand and one you're hoping works.

**How to use this file:** Work top to bottom. Don't start chunk N+1 until chunk N's "Definition of Done" is actually true — not "looks done," actually verified. Each chunk includes a ready-to-paste prompt for your agent; paste it as-is, or edit it, but don't skip the Definition of Done check afterward. If an agent's output for a chunk doesn't meet its Definition of Done, that's the moment to fix it — not three chunks later when it's tangled into everything built on top of it.

**Ordering principle:** chunks are sequenced by actual dependency, not by the Day 1–7 calendar in `MyIdea.md` §16. A rough day mapping is included at the end for reference, but the real ordering rule is: nothing gets built before the thing it depends on exists and is verified. Pure logic (no I/O) comes before anything that touches a database, an LLM, or a network call, because pure logic is the cheapest thing to get right and the most expensive thing to get wrong later.

**Every chunk assumes the agent has read `AGENTS.md`** (or `CLAUDE.md`, if using Claude Code for a chunk instead) — the non-negotiable rules there (LLM never sets the score, append-only tables, guardrail-bypass-as-type-error, do-nothing baseline independence, etc.) apply to every chunk below and aren't repeated in each prompt.

---

## Tool Integration Reference — Where Each One Fits

Ten tools, integrated at the specific chunks where each earns its place — not bolted on at the start. Two honest flags up front, before the details: **Grapify** (Graphify) and **Claude-Mem** are both real, well-built tools, but neither is a good fit for *this* project specifically — the reasons are in their entries below, not a blanket dismissal of the tools themselves. Follow the plan for the other eight; treat those two as optional, and skip them by default.

**A rule that applies to all five design tools (Impeccable, Taste Skill, Emil Kowalski's skills, Web Design Guidelines, Awesome Design):** `Design.md` already is your design system — built and corrected over multiple review passes, tied to your two actual visual references. Every one of these tools has its own opinionated defaults. Used carelessly, they'll suggest changes that fight `Design.md` instead of refining it. **Every prompt below explicitly tells the agent to work within `Design.md`'s tokens, not replace them — never drop that instruction, even if you shorten the rest of the prompt.**

**One mechanical note that applies to all "skill" tools (everything except CodeRabbit and the two MCP servers):** Antigravity loads skills from a `.agents/skills/<name>/SKILL.md` file in your project (or a global config path for skills you want in every project) and auto-registers them as `/<name>` slash commands. Several of these tools were built primarily for Claude Code's `.claude/skills/` folder — the fix is always the same: get the `SKILL.md` file (clone the repo, or use the tool's installer if it has an Antigravity target), and place it under `.agents/skills/` instead. The file format itself is shared across tools; only the folder differs.

### 1. CodeRabbit (GitHub)

- **When:** Set up once at the very end of **Chunk 0**, right after the GitHub repo exists. Becomes actively useful starting **Chunk 2** (the decision engine — your highest-risk code) and every chunk after.
- **Command:** No slash command — it's a GitHub App, not an agent skill. Install at coderabbit.ai or via the GitHub Marketplace, authorize it against your `recover-ai` repo only (not your whole account). Once installed, it reviews automatically; the manual command, posted as a PR comment, is `@coderabbitai review` (or `@coderabbitai full review` after a rebase/force-push).
- **What to ask it to do:** Nothing, for the automatic pass — it reviews every PR on its own. For a targeted ask, comment `@coderabbitai generate unit testing code for this file` on a specific file in the Files Changed tab — genuinely useful on Chunk 2/3's decision-engine files, where a second opinion on edge cases you didn't think of is worth having.
- **Frequency:** Install once. Runs automatically, repeatedly, on every PR from then on — this only pays off if you actually work through small PRs per chunk rather than one giant commit at the end, so structure your git workflow as one branch + one PR per chunk.

### 2. Figma MCP

- **Before anything else — a real prerequisite you don't currently meet:** Figma MCP reads from an actual Figma file via its selection state. You don't have a Figma file of RecoverAI's screens — you have two screenshots of other products, which is what `Design.md` was built from. Figma MCP has nothing to connect to until you first build RecoverAI mockups *in* Figma, which is extra work `Design.md` was specifically written to make unnecessary (it's already a complete, text-form spec an agent can build directly from).
- **Recommendation:** Skip it for this build. `Design.md` is doing Figma MCP's job already, in a format your agent can read without a running Figma desktop app or an active Dev Mode session.
- **If you build Figma mockups anyway** (e.g., you want to visually explore the Evaluation page layout before Chunk 12): open the file in Figma desktop, switch to Dev Mode, enable the MCP server from the inspect panel, copy the local server URL (`http://127.0.0.1:3845/mcp`), and add it to Antigravity's MCP server configuration the same way as any other MCP server. Select the frame you want, then ask: *"Using the Figma MCP server, generate this frame as a React component using the tokens in `docs/Design.md` §2 — don't introduce new colors or spacing values, map to the closest existing token."* Use once per screen you've mocked up, not repeatedly.

### 3. Playwright MCP

- **When:** Set up once, during **Chunk 0** (so it's available immediately), but genuinely useful starting **Chunk 9** (first real page with something to click through) and heavily in **Chunk 15** (final QA walkthrough).
- **Command:** Add to Antigravity's MCP server config:
  ```json
  { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
  ```
  Restart Antigravity after adding it, and confirm it's live — you should see browser-automation tools (`browser_navigate`, `browser_snapshot`, `browser_click`, etc.) available.
- **What to ask it to do:** After finishing each page-building chunk (9, 10, 12, 13, 14), ask: *"Use Playwright to navigate to [page], take a snapshot, and confirm [the specific Definition of Done for that chunk] — e.g., for Chunk 9: log in, open a payment with status awaiting_approval, click Approve, and confirm the status updates without a console error."* This turns each chunk's Definition of Done from something you check by eye into something the agent can actually verify and report back on.
- **Frequency:** Repeatedly — once per page-chunk as you finish it, then a full pass through every flow in **Chunk 15**.

### 4. Claude-Mem

- **What it actually does:** persists session context across separate Claude Code sessions so you're not re-explaining your project every time you open a new terminal window — genuinely useful for long-running Claude Code projects.
- **Why it's a poor fit here, specifically:** it's built as a Claude Code plugin (hooks into Claude Code's own session lifecycle), and you're vibecoding on Antigravity — there's no confirmed, direct way to attach it there. More importantly, its actual value — "don't lose context between sessions" — is already solved for this project by `AGENTS.md`, `docs/decisions.md`'s running log, and the eight planning docs, all of which are git-versioned, human-readable, and load automatically every session regardless of tool. Adding claude-mem on top would be a second, less legible memory system duplicating one that already works and that the rest of this plan depends on.
- **Recommendation:** Skip it for this build. If you separately use Claude Code (not Antigravity) for a specific chunk and want cross-session memory *there*, it remains a reasonable tool for that narrower purpose — that's a different use case from this build plan.

### 5. Grapify (Graphify)

- **What it actually does:** builds a queryable knowledge graph of your codebase so an agent navigates by structure instead of grepping every file — the tool's own documentation states the break-even point plainly: worth it around 500+ files, and for smaller projects "the graph construction cost exceeds the savings."
- **Why it's a poor fit here, specifically:** `BUILD_PLAN.md`'s own folder structure (Chunk 0's tree) puts this project at roughly 60–80 files total, well under that threshold. Installing it now means paying a real setup cost for a problem you don't have yet.
- **Recommendation:** Skip it by default. Revisit only if, in practice, you notice the agent genuinely struggling to trace cross-file dependencies once several chunks are built (realistically, not before **Chunk 9** or so) — at that point, and only then:
- **Command:** `pip install graphifyy` (note: package name has a double "y"), then `graphify install` from the project root. Claude Code gets a dedicated hook; Antigravity doesn't support that hook type, so Graphify falls back to writing its usage directive straight into `AGENTS.md` instead — check that a Graphify section actually appears there after running the installer, since that's your confirmation it registered correctly for a non-Claude-Code tool.
- **What to ask it to do:** *"Use `graphify query` to trace how [a specific cross-cutting concern, e.g. the guardrail verdict] flows from `guardrails.ts` through to the UI, before making changes."*
- **Frequency:** Once to install (if you install it at all), then queried as needed — not a per-chunk step.

### 6. Impeccable

- **When:** First use at the end of **Chunk 8** (right after each shared component is built — cheaper to fix a component once than after three pages already depend on it), then again on **Chunk 9/10**, **Chunk 12**, and **Chunk 14** — the pages with the most actual visual surface.
- **Command:** Clone `github.com/pbakaus/impeccable`, copy its skill folder into `.agents/skills/impeccable/` in your project root. Once loaded, its commands are invoked in plain language referencing its vocabulary (`polish`, `critique`, `audit`, `decoration discipline`, etc.) rather than one fixed slash command — Antigravity will pick these up as part of the loaded skill.
- **What to ask it to do:** *"Run an Impeccable critique on [component/page], but treat `docs/Design.md` §2's tokens as fixed constraints — flag issues within those tokens (spacing, hierarchy, unnecessary decoration), don't propose new colors, radii, or fonts outside what `Design.md` already defines."* That last clause is the one that keeps it from quietly fighting your existing design system.
- **Frequency:** Repeatedly — once per major UI chunk (8, 9/10, 12, 14), each time treated as a quick audit pass after the chunk's core build, not a redesign pass.

### 7. Taste Skill

- **When:** Same chunks as Impeccable (8, 9/10, 12, 14) — used alongside it, not instead of it. The tool's own documentation describes the pairing as deliberate: Taste Skill tunes style parameters, Impeccable sets the baseline vocabulary and anti-patterns.
- **Command:** Clone `github.com/Leonxlnx/taste-skill` (explicitly confirmed Antigravity-compatible), copy into `.agents/skills/taste-skill/`.
- **What to ask it to do:** *"Apply Taste Skill to refine [component/page]'s visual weight and polish, still constrained to `docs/Design.md` §2's tokens — this is a variant/intensity pass on the existing design, not a new direction."*
- **Frequency:** Repeatedly, same cadence as Impeccable — run them back to back on the same chunk, Impeccable first (vocabulary/anti-patterns), Taste Skill second (fine-tuning).

### 8. Emil Kowalski's skills (emilkowalski/skills)

- **When:** Same chunks again (8, 9/10, 12, 14), but run this one *last*, after Impeccable and Taste Skill — it's specifically about motion/animation, a narrower concern than general visual polish, and `Design.md` §2.6 already has base duration/easing tokens this skill should refine, not replace.
- **Command:** Clone `github.com/emilkowalski/skills`, but only copy the two most relevant sub-skills into `.agents/skills/` for a hackathon timeline — `emil-design-eng` (the core polish/animation philosophy) and `review-animations` (the audit pass). Skip the other four (`animation-vocabulary`, `apple-design`, `improve-animations`, `find-animation-opportunities`) unless you find yourself wanting them specifically — installing all six is more than a 7-day build needs.
- **What to ask it to do:** *"Run review-animations against [page]'s transitions and interactive states, checked against the motion tokens already defined in `docs/Design.md` §2.6 — flag anything that violates the sub-300ms guidance or uses a default easing curve instead of the specified ones, but don't introduce new animations beyond what `Design.md` calls for (drawer open/close, tab switch, hover states)."*
- **Frequency:** Once per major UI chunk, as the final polish step in that chunk — not a standalone chunk of its own.

### 9. Web Design Guidelines

- **When:** A first pass on **Chunk 9** (first real page — catch systemic issues early, not at the end), then the primary, thorough pass in **Chunk 15** as part of final QA.
- **Command:** Install via its Claude Skills marketplace listing (search "Web Design Guidelines" in whichever skill directory you're pulling from) into `.agents/skills/web-design-guidelines/`.
- **What to ask it to do:** *"Audit [page] against the Web Design Guidelines skill for accessibility and interface consistency — cross-check its findings against `docs/Design.md` §10's accessibility requirements (contrast, never-color-only status, focus states, touch targets) and flag only genuine gaps, not places where `Design.md` already made a documented, deliberate choice."* This one is closer to a second-opinion checker than a design-opinion tool, which is exactly why it's safe to run more literally than Impeccable/Taste/Emil's skill.
- **Frequency:** Twice total — a light pass at Chunk 9, a thorough pass at Chunk 15. Doesn't need repeating on every chunk the way the polish tools do.

### 10. Awesome Design

- **What it actually is:** not one skill — a registry of 67 different aesthetic presets (bento, brutalism, claymorphism, glassmorphism, and so on), each pullable independently.
- **Why it's a poor fit as a general install:** pulling a generic preset risks overwriting the specific aesthetic `Design.md` already derived from your two actual references (soft shadows, generous rounding, monochrome-first with one accent color). None of the 67 presets were built for RecoverAI; `Design.md` was.
- **Recommendation:** Don't install a preset directly into the project. If you want it at all, use it only as inspiration during **Chunk 14** (landing page) — browse the registry's preview site, and if one preset's *treatment of something specific* (e.g., how it handles a particular card layout) looks better than your current plan, describe that specific idea to your agent in your own words rather than pulling the whole preset in. That keeps `Design.md` as the single source of truth instead of quietly forking it.
- **Command (only if you still want to pull one for reference, not for direct use):** `npx typeui.sh list` to browse, `npx typeui.sh pull <slug> --dry-run` to preview without writing anything.
- **Frequency:** At most once, as a reference lookup during Chunk 14 — never a repeated or default step.

---

## Chunk 0 — Repo Scaffolding & Deploy Pipeline

**Goal:** A working, deployed "hello world" — prove the whole toolchain (Next.js → Vercel → Supabase) works before building anything that depends on it. Skipping this and discovering a deploy problem on Day 6 is the single most avoidable failure mode in a 7-day build.

**Build:**
- Next.js App Router project, TypeScript, Tailwind.
- Install: shadcn/ui, Recharts, Zod, Vercel AI SDK (v5 stable, **not** v6), Supabase client libraries.
- Create the full folder structure from `AGENTS.md`'s tree — as empty files/stub exports, not implemented yet. Having the skeleton in place means every later chunk has an obvious home instead of the agent inventing its own layout mid-build.
- `tailwind.config.ts` wired to `Design.md` §2's tokens (colors, spacing, radius, shadow, font scale) as theme extensions — not applied anywhere yet, just available.
- `.env.example` listing every variable named in `AGENTS.md` (Supabase, LLM provider keys, Razorpay test keys, guardrail thresholds, `SPONTANEOUS_RESOLUTION_RATE`) — blank values, just names and one-line comments.
- `docs/` populated with all eight planning documents; `AGENTS.md` and/or `CLAUDE.md` at repo root.
- Git init, GitHub repo, Vercel project connected to it.
- One trivial page (`app/page.tsx` or a placeholder marketing page) that deploys successfully.
- **Tooling for this chunk:** install CodeRabbit (GitHub App) and Playwright MCP now — see the Tool Integration Reference above, items 1 and 3. Neither does anything yet, but both should be live before Chunk 2 needs them.

**Depends on:** nothing.

**Docs:** `AGENTS.md` (folder structure), `TECH_STACK.md` §1/§8.

**Definition of Done:** `npm run dev` shows a page locally with no errors. The same commit is live at a real Vercel URL. `npm run build` completes clean.

**Prompt for your agent:**
> Set up this Next.js project from scratch per `AGENTS.md`'s folder structure and `TECH_STACK.md`. Install and configure: Tailwind, shadcn/ui, Recharts, Zod, Vercel AI SDK v5 (stable — do not install v6), Supabase client libraries. Create the full folder tree from `AGENTS.md` as empty/stub files — don't implement any logic yet, this chunk is scaffolding only. Wire `tailwind.config.ts` to the design tokens in `docs/Design.md` §2. Create `.env.example` listing every variable mentioned in `AGENTS.md`, with blank values and a one-line comment each. Get a minimal placeholder page deploying successfully to Vercel. Do not build any database schema, any decision-engine logic, or any real page content yet — that's later chunks.

---

## Chunk 1 — Database Schema, RLS, Auth, and Typed Queries

**Goal:** Every table, constraint, and access rule from `DATABASE.md` exists and is provably correct, before any application code depends on it.

**Build:**
- Supabase Postgres migration creating all six tables exactly as specified in `DATABASE.md` §2 — including the corrected `payments.status` (with `awaiting_approval`) and `agent_decisions.guardrail_result` (with `escalated`) enums from §2.3.2. This is the schema after the fixes made during the design review — don't rebuild the original two-state version.
- All CHECK constraints from `DATABASE.md` §4's summary table.
- RLS enabled on all six tables, scoped by merchant ownership (`DATABASE.md` §7).
- Supabase Auth: single merchant, email/password, one seed user.
- `server/db/client.ts` — connection module.
- `server/db/queries/` — one typed module per table (`merchants.ts`, `customers.ts`, `payments.ts`, `recovery-attempts.ts`, `agent-decisions.ts`, `audit-logs.ts`), CRUD-level functions only, **no business logic** — this chunk is data access, not decision logic.
- `lib/types.ts` — TypeScript types mirrored from the schema.

**Depends on:** Chunk 0.

**Docs:** `DATABASE.md` (all), `ARCHITECTURE.md` §5, §6.

**Definition of Done:** A test script can insert and query a row in each of the six tables through the query modules. Attempting to bypass RLS (e.g., querying as a non-owner) fails. You can log in as the seed merchant. Insert one `agent_decisions` row with `guardrail_result = 'escalated'` and one `payments` row with `status = 'awaiting_approval'` successfully — this specifically confirms the fixed enums are actually in the deployed schema, not just in the docs.

**Prompt for your agent:**
> Implement the database layer per `docs/DATABASE.md` — every table, column, type, default, and CHECK constraint exactly as specified, including the `awaiting_approval` payment status and `escalated` guardrail_result values from §2.3.2 (these were added during a design review to fix a real gap — make sure they're in the migration, not the original two-state version). Enable RLS per §7. Set up Supabase Auth for a single merchant user, email/password only. Build `server/db/client.ts` and one typed query module per table under `server/db/queries/` — CRUD operations only, no business/decision logic in this chunk. Generate `lib/types.ts` from the schema. After building, write and run a quick script that inserts a test row into each table, including one `agent_decisions` row with `guardrail_result='escalated'`, to confirm the schema actually accepts it.

---

## Chunk 2 — Decision Engine Core: Classification & Scoring (Pure Logic + Tests)

**Goal:** The two functions with zero I/O and the highest cost of being subtly wrong — build and test these in isolation before anything else touches them.

**Build:**
- `server/decision-engine/classify-failure.ts` — rule-based failure-reason classification, recoverable vs. not (PRD FR-1).
- `server/decision-engine/score.ts` — the disclosed additive scoring formula from `MyIdea.md` §6 / `Design.md` §7.2: past success rate, failure-type recoverability, time-of-day match, recency, prior-attempt penalty → a 0–100 score plus a breakdown array of `{factor, points}`. **Pure function — no database calls, no LLM calls, no imports from `llm.ts` (this is rule #1 in `AGENTS.md`, and this is the file the rule is actually about).**
- Vitest tests for both, written now — not deferred. Cover: an unrecoverable failure reason, a score right at the `MIN_SCORE_TO_INTERVENE` boundary, all factors present, all factors absent, negative-total edge case.

**Depends on:** Chunk 0 (needs `lib/types.ts` shapes, doesn't need the DB itself since this is pure logic — could technically run before Chunk 1, but sequenced after so the types it consumes are stable).

**Docs:** `PRD.md` FR-1/FR-2/FR-3, `MyIdea.md` §6, `Design.md` §7.2, `TECH_STACK.md` §7.

**Definition of Done:** `npm run test` passes for both modules. Feeding `score.ts` the exact example from `MyIdea.md` §5 (Rahul, ₹4,999) produces 78/100 with the matching breakdown. No import of `llm.ts` exists anywhere in this directory — confirm by grep, not by assumption.

**Prompt for your agent:**
> Build `server/decision-engine/classify-failure.ts` and `server/decision-engine/score.ts` per `docs/PRD.md` FR-1/FR-2/FR-3 and the worked example in `docs/MyIdea.md` §5–§6. Both are pure functions — no database access, no network calls, no LLM calls, and `score.ts` must never import anything from a file named `llm.ts` (this is a hard rule in `AGENTS.md`, not a style preference). `score.ts` returns a total score 0–100 and an array of `{factor, points}` for the breakdown. Write Vitest tests for both, covering: an unrecoverable failure reason, the `MIN_SCORE_TO_INTERVENE` boundary, all-factors-present, all-factors-absent, and a negative-total case. Verify your `score.ts` against the Rahul example in `MyIdea.md` §5 — it should produce 78/100 with that exact factor breakdown.

---

## Chunk 3 — Guardrails Engine (Policy Logic + Tests)

**Goal:** The three-way verdict — passed / blocked / escalated — that everything downstream must obey.

**Build:**
- `server/decision-engine/guardrails.ts` (PRD FR-4/FR-5/FR-7): given a score and a payment's history, returns `passed`, `blocked` (with a required reason), or `escalated`. Checks: `MIN_SCORE_TO_INTERVENE`, `MAX_RETRIES` (count of `agent_decisions` rows for the payment — every re-evaluation, per `DATABASE.md`'s clarified distinction), `MAX_CONTACT_ATTEMPTS` (count of `recovery_attempts` rows — only re-evaluations that reached the customer), `MIN_TIME_BETWEEN_CONTACT`, and the human-approval amount threshold (→ `escalated`).
- This is the one place in the decision engine that does read from the database (via Chunk 1's query modules) — to count prior attempts. It is still not an execution function; it decides, it doesn't act.
- Vitest tests covering every guardrail individually and the `MAX_RETRIES`-vs-`MAX_CONTACT_ATTEMPTS` distinction explicitly — a case where a payment is retried (new `agent_decisions` row) without being recontacted (no new `recovery_attempts` row), confirming the two counters diverge correctly.

**Depends on:** Chunk 1 (query modules), Chunk 2 (consumes the score).

**Docs:** `PRD.md` FR-4/FR-5/FR-7, `MyIdea.md` §7, `DATABASE.md` §2.5 (the retries/contact-attempts clarification), `ARCHITECTURE.md` §4.3.

**Definition of Done:** Tests pass for all five guardrails independently and for the three-way verdict. A test explicitly proves a retry-without-recontact scenario correctly increments `MAX_RETRIES`'s counter but not `MAX_CONTACT_ATTEMPTS`'s.

**Prompt for your agent:**
> Build `server/decision-engine/guardrails.ts` per `docs/PRD.md` FR-4/FR-5/FR-7 and `docs/MyIdea.md` §7. It takes a score (from `score.ts`) and a payment's history and returns one of three verdicts: `passed`, `blocked` (must include a reason), or `escalated` (amount exceeds the human-approval threshold). Implement all five guardrails: `MIN_SCORE_TO_INTERVENE`, `MAX_RETRIES`, `MAX_CONTACT_ATTEMPTS`, `MIN_TIME_BETWEEN_CONTACT`, human-approval threshold. Per `docs/DATABASE.md` §2.5: `MAX_RETRIES` counts `agent_decisions` rows for the payment (every re-evaluation); `MAX_CONTACT_ATTEMPTS` counts `recovery_attempts` rows (only re-evaluations that actually reached the customer) — these are different counters, write a test that proves they diverge in a retry-without-recontact scenario. Use the query modules from Chunk 1, don't write raw SQL here.

---

## Chunk 4 — LLM Layer

**Goal:** The one place in the codebase that calls Gemini or Groq — and only for the three narrow things it's allowed to do.

**Build:**
- `server/decision-engine/llm.ts` (PRD FR-6): given a payment's context and its score (read-only — this file never computes a score), calls Gemini 2.5 Flash via AI SDK v5's `generateObject`, with a Zod schema constraining output to: an explanation string, a drafted message string, and an intervention-type value from the fixed enum (`payment_link` | `reminder_message`).
- Groq fallback wired as a config-swap via `LLM_PROVIDER` env var — not called concurrently with Gemini, per `TECH_STACK.md` §5.
- A malformed/out-of-enum response from the LLM is a schema-validation failure — confirm this actually throws/is caught, not silently coerced.

**Depends on:** Chunk 2 (consumes score output as read-only input).

**Docs:** `PRD.md` FR-6, `TECH_STACK.md` §5/§6, `ARCHITECTURE.md` §4.3.

**Definition of Done:** Calling `llm.ts` with a sample payment context (e.g., the Rahul example) returns schema-validated output from Gemini. Switching `LLM_PROVIDER=groq` and re-running returns valid output from Groq instead, with no other code change. A deliberately malformed mock response is rejected by the schema, not passed through.

**Prompt for your agent:**
> Build `server/decision-engine/llm.ts` per `docs/PRD.md` FR-6 and `docs/TECH_STACK.md` §5/§6. It takes a payment's context and its already-computed score (from `score.ts` — this file reads the score, it never computes one) and calls Gemini 2.5 Flash via Vercel AI SDK v5's `generateObject`, using a Zod schema that constrains output to exactly: an explanation string, a drafted recovery message string, and an intervention type from the enum `payment_link` | `reminder_message`. Wire Groq (Llama 3.3 70B) as a fallback selected by an `LLM_PROVIDER` env var — never call both providers for the same request. Test manually with a sample payment (use the Rahul example from `docs/MyIdea.md` §5) against both providers, and confirm a deliberately malformed mock LLM response fails schema validation rather than being silently accepted.

---

## Chunk 5 — Execution & Audit Logging

**Goal:** The layer that actually does something in the world — simulated or real — and the layer that records that it happened.

**Build:**
- `server/decision-engine/execute.ts` (PRD FR-8/FR-9): takes a `passed` (or merchant-approved) guardrail verdict and the LLM's proposed intervention. For `reminder_message`: writes a `recovery_attempts` row with `is_simulated = true`, **makes no network call at all** (`decisions.md` D-004). For `payment_link`: creates a real Razorpay test-mode payment link, writes `is_simulated = false`.
- `server/audit/log.ts` — the single write path into `audit_logs`; every stage of the flow writes through this, nothing writes to `audit_logs` directly.
- Razorpay test-mode credentials wired via env vars; one link-creation call implemented, nothing more (no signature verification, no idempotency — `decisions.md` D-005).

**Depends on:** Chunk 1, Chunk 3 (only receives already-validated verdicts — never re-checks guardrails itself).

**Docs:** `PRD.md` FR-8/FR-9, `decisions.md` D-004/D-005, `ARCHITECTURE.md` §7.2/§7.3.

**Definition of Done:** Calling `execute.ts` with a `reminder_message` proposal produces a `recovery_attempts` row with `is_simulated=true` and zero outbound network calls (verify by checking there's no HTTP client invoked for this path, not just by the flag being set correctly). Calling it with a `payment_link` proposal produces a real, working Razorpay test-mode payment link. Both produce correct `audit_logs` entries via `log.ts`.

**Prompt for your agent:**
> Build `server/decision-engine/execute.ts` per `docs/PRD.md` FR-8/FR-9 and `server/audit/log.ts`. `execute.ts` takes an already-guardrail-approved verdict and an intervention proposal — it does not re-check guardrails itself. For `reminder_message`: write a `recovery_attempts` row with `is_simulated=true` and make absolutely no network call — no messaging SDK, no HTTP request of any kind for this path (`docs/decisions.md` D-004). For `payment_link`: create a real Razorpay test-mode payment link (one API call only, no signature verification or idempotency handling — that's an intentional, documented limitation per `docs/decisions.md` D-005) and write `is_simulated=false`. Build `audit/log.ts` as the single write path to `audit_logs` — every other module should call through this, never write to that table directly. Test both paths and confirm no network call happens for the simulated path.

---

## Chunk 6 — Wire the Full Decision Flow (API Routes)

**Goal:** Everything built so far becomes one working, callable flow — before any UI exists to trigger it.

**Build:**
- `app/api/payments/[id]/decide/route.ts` — orchestrates the full sequence from `ARCHITECTURE.md` §8.1 Flow A: classify → score → guardrails (first pass) → LLM → guardrails (validate proposal) → execute → audit, including the fallback-to-No-Action path on any validation failure.
- `app/api/payments/[id]/approve/route.ts` — merchant approve/decline on an `awaiting_approval` payment, per the exact flow in `DATABASE.md` §2.3.2: writes a **new** `agent_decisions` row (never mutates the escalated one), either proceeding to `execute.ts` (approved) or resolving to `no_action` (declined).
- `app/api/webhooks/razorpay/route.ts` — one webhook listener, one event type (payment success), updates the corresponding `recovery_attempts`/`payments` rows.

**Depends on:** Chunks 1–5, all of them — this is the integration point.

**Docs:** `ARCHITECTURE.md` §8.1, §4.2, `DATABASE.md` §2.3.2.

**Definition of Done:** Insert a test payment directly into the database, `POST` to `/decide`, and observe the correct full trail of rows (`agent_decisions`, possibly `recovery_attempts`, `audit_logs`) with no UI involved. Test three cases explicitly: (1) a normal recoverable payment reaching `RECOVERED` or a pending contact, (2) a low-score payment correctly resolving to `no_action` with a logged reason, (3) a high-amount payment reaching `awaiting_approval`, then resolved via `POST /approve` both as an approval and, separately, as a decline.

**Prompt for your agent:**
> Build the three API routes that wire together everything from Chunks 1–5, per `docs/ARCHITECTURE.md` §8.1's Flow A. `payments/[id]/decide/route.ts` runs the full sequence: classify-failure → score → guardrails (first pass) → llm → guardrails (validate the LLM's proposal) → execute → audit log, with a fallback to No Action on any validation failure. `payments/[id]/approve/route.ts` implements the exact flow in `docs/DATABASE.md` §2.3.2 — approve or decline on an `awaiting_approval` payment, always writing a *new* `agent_decisions` row, never mutating the escalated one. `webhooks/razorpay/route.ts` listens for one event type only (payment success) and updates the matching rows. After building, test end-to-end with manually inserted test payments (no UI needed yet) covering: a normal recovery, a payment that correctly resolves to no-action, and a high-amount payment that escalates and is then resolved both by approving and (separately, on a second test payment) by declining.

---

## Chunk 7 — App Shell, Auth Gate, and Navigation

**Goal:** The first visible UI — the frame everything else will live inside.

**Build:**
- `app/(app)/layout.tsx` — the two-tier shell from `Design.md` §3.1: dark icon rail + light nav panel with the user header at top, session-check gate for the whole route group.
- Login page using Supabase Auth (Chunk 1).
- Five empty placeholder pages (`dashboard`, `payments`, `customers/[id]`, `recovery`, `evaluation`) — just enough to navigate between, no real content yet.
- shadcn/ui primitives (button, card, badge, tabs) themed to `Design.md`'s tokens — primary buttons black (`--color-primary`), not accent blue, per the corrected color logic in `Design.md` §2.1.

**Depends on:** Chunk 0 (tokens), Chunk 1 (auth).

**Docs:** `Design.md` §2, §3.1, §4.

**Definition of Done:** Can log in, land on the app shell, and click between all five nav items, each showing an empty but correctly-styled page. Sidebar active state is the solid dark pill, not blue — this is a specific, previously-wrong detail worth checking by eye, not just trusting the code.

**Prompt for your agent:**
> Build the app shell per `docs/Design.md` §3.1 and §4: `app/(app)/layout.tsx` with the two-tier structure (dark icon rail, then a light nav panel with the user's avatar/name/email at the top and text nav items below), a session-check gate using Supabase Auth from Chunk 1, and a login page. Create five empty placeholder pages for dashboard/payments/customers/recovery/evaluation, just enough to navigate between. Set up shadcn/ui primitives (button, card, badge, tabs) themed to the tokens in `Design.md` §2 — primary buttons and the active sidebar item must be `--color-primary` (near-black), not blue; blue (`--color-accent`) is reserved for charts, links, and focus states only. Verify by eye that the active nav pill is actually dark, not blue, since this was a specific mistake caught and fixed during design review.

---

## Chunk 8 — Shared Recovery Components

**Goal:** Build the reusable pieces once, per `Design.md`'s spec, so every page after this just consumes them instead of each page reinventing its own version.

**Build**, all under `components/recovery/`, per their exact `Design.md` sections:
- `ScoreBreakdown.tsx` (§7.2)
- `GuardrailCheckRow.tsx` (§7.3)
- `StatusBadge.tsx` (§7.1 — five states: Recovered, Pending, No Action, Failed, Awaiting Human Approval, each with its mandatory icon, never color-only)
- `SimulatedIndicator.tsx` (§9.4 — dashed-border "Simulated" chip vs. solid-border "Live (test mode)" chip; these must never be visually similar enough to confuse at a glance)
- `AuditTrailTimeline.tsx` (§9.2 — no-action entries styled as normal, not de-emphasized)
- `ApprovalActionPair.tsx` (§9.3 — Approve/Decline, both Secondary button style, not Primary)

**Depends on:** Chunk 7 (tokens/primitives).

**Docs:** `Design.md` §7, §9.1–§9.5.

**Definition of Done:** Each component renders correctly with mock/hardcoded data — either in a temporary throwaway test route or directly verified during Chunk 9's integration. Specifically check: the simulated/real chips are genuinely visually distinct (not just different text), and status badges never rely on color alone (icon present in every case).

**Tooling for this chunk:** first real use of Impeccable, Taste Skill, and Emil Kowalski's skills (Tool Integration Reference, items 6–8) — install all three now if you haven't, run them in that order (Impeccable → Taste Skill → Emil's `review-animations`) against each component once it's built, always constrained to `Design.md`'s existing tokens per each tool's entry above.

**Prompt for your agent:**
> Build the shared components under `components/recovery/` exactly per their `docs/Design.md` sections: `ScoreBreakdown.tsx` (§7.2), `GuardrailCheckRow.tsx` (§7.3), `StatusBadge.tsx` (§7.1 — five states, each with its own icon, never color-only), `SimulatedIndicator.tsx` (§9.4 — dashed border for simulated, solid border for real, deliberately visually distinct, not just different text), `AuditTrailTimeline.tsx` (§9.2 — no-action log entries should look like normal timeline entries, not muted or de-emphasized, since restraint is a correct outcome), `ApprovalActionPair.tsx` (§9.3 — Approve/Decline buttons, Secondary style not Primary). Use mock data to verify each one renders correctly before moving on — these get reused across every page from here forward, so get them right now rather than patching them later once three pages depend on them.

---

## Chunk 9 — Payments Page

**Goal:** The first fully real page — list, filter, and full decision-trace drawer, wired to live data and the Chunk 6 API routes.

**Build:**
- `app/(app)/payments/page.tsx` per `Design.md` §3.4: search + date-range toolbar, status tabs (All/Recovered/Pending/No Action/Failed — note `Awaiting Human Approval` payments should be visible too, likely under an appropriate tab or a distinct indicator), list of list-row cards.
- Payment detail drawer: score breakdown → guardrail check rows → approval action pair (when applicable) → simulated/real indicator on any executed action → audit trail, in that order (per `Design.md` §3.4's stated reasoning — this ordering mirrors the actual decision sequence).
- Approve/Decline buttons wired live to Chunk 6's `/approve` route.

**Depends on:** Chunks 6, 7, 8.

**Docs:** `PRD.md` §5.2, `Design.md` §3.4.

**Definition of Done:** Seed a handful of test payments across all statuses (including one `awaiting_approval`). View the full list, open each payment's drawer, confirm the decision trace renders correctly and in the right order, and successfully approve one escalated payment and decline another — watching both resolve correctly in the UI without a page reload being required to see the state update (or with one, if that's the simpler implementation for now — just confirm it does update).

**Tooling for this chunk:** first real use of Playwright MCP (item 3) and Web Design Guidelines (item 9) — ask Playwright to drive the approve/decline flow end to end instead of clicking through it yourself, and run a first Web Design Guidelines pass now to catch any systemic accessibility gap before it's replicated across Chunks 10, 12, and 13. Also run Impeccable/Taste/Emil's skill (items 6–8) on this page once it's built, same as Chunk 8.

**Prompt for your agent:**
> Build `app/(app)/payments/page.tsx` per `docs/Design.md` §3.4: toolbar (search, date-range picker, status tabs), list of list-row cards, and a detail drawer that opens per payment. The drawer's content order matters — score breakdown, then guardrail check rows, then the approve/decline action pair (only when the payment is `awaiting_approval`), then the simulated/real indicator on any action taken, then the audit trail — this order mirrors the actual decision sequence, don't reorder it. Wire the Approve/Decline buttons live to the `/approve` API route from Chunk 6. Use the shared components from Chunk 8, don't build one-off replacements. Seed a handful of test payments spanning every status, including at least one `awaiting_approval`, and verify the full flow works end to end through the UI, not just via the API.

---

## Chunk 10 — Customer Page & Recovery Page

**Goal:** The two remaining list-style pages — mostly a matter of reusing what Chunk 9 already built correctly.

**Build:**
- `app/(app)/customers/[id]/page.tsx` per `Design.md` §3.5: customer header with inline stat tiles, behavioral-signals card (time-of-day pattern, past success rate — shown as labeled rows, not a chart, per `Design.md`'s explicit reasoning that these are formula inputs, not a trend), payment history reusing the Payments page's list-row card and drawer.
- `app/(app)/recovery/page.tsx` per `Design.md` §3.6: Active/Pending/Completed tabs, list-row cards with the progress bar shown by default (unlike Payments, where it's conditional) and the simulated/real indicator visible directly on the row.

**Depends on:** Chunk 9 (reuses its components directly).

**Docs:** `PRD.md` §5.3/§5.4, `Design.md` §3.5/§3.6.

**Definition of Done:** Both pages render real data correctly. Opening a payment from either page uses the same drawer component as the Payments page — confirm this is genuine reuse (same component import), not a visually-similar duplicate.

**Prompt for your agent:**
> Build `app/(app)/customers/[id]/page.tsx` and `app/(app)/recovery/page.tsx` per `docs/Design.md` §3.5 and §3.6. Both should reuse the list-row card and detail drawer components already built for the Payments page in Chunk 9 — don't recreate them. The Customer page's behavioral-signals section should show time-of-day pattern and past success rate as labeled rows, not a chart (per `Design.md` §3.5's explicit reasoning — these are formula inputs, showing them as a trend would overstate their precision). The Recovery page always shows the progress bar on its cards (unlike Payments, where it's conditional) and shows the simulated/real indicator directly on the row rather than only inside the drawer.

---

## Chunk 11 — Synthetic Data Generator & Baseline Engine

**Goal:** The evaluation harness's actual logic — and the one chunk where getting the statistics wrong would be invisible until the numbers came out wrong. Build the already-corrected version; don't rebuild the bug that was found and fixed during design review.

**Build:**
- `server/evaluation/synthetic-data.ts`: generates 500–1,000 payments with observable features (past success rate, failure reason, time-of-day, amount, recency, prior contacts) plus a hidden `synthetic_ground_truth_recoverable` value, computed with **different weights than `score.ts`, plus noise** (`evaluation.md` §2.1/§2.2). This function must never be imported by `server/decision-engine/`.
- `server/baseline-engine/contact-everyone.ts` — outcome from `synthetic_ground_truth_recoverable` for every payment.
- `server/baseline-engine/do-nothing.ts` — outcome from the **independent** `SPONTANEOUS_RESOLUTION_RATE` constant only. **This file must never read `synthetic_ground_truth_recoverable`** — that was a real, already-found-and-fixed bug (`decisions.md` D-014); reintroducing it would make this baseline structurally unable to differ from contact-everyone.
- `server/evaluation/metrics.ts`: ₹ recovered, recovery rate, contact attempts used (all three strategies), precision/recall (agent only, vs. ground truth).
- Vitest tests, including two specific regression tests: (1) `score.ts`/`classify-failure.ts` do not import from `synthetic-data.ts`, (2) `do-nothing.ts` does not import or reference `synthetic_ground_truth_recoverable` anywhere.

**Depends on:** Chunk 2 (the agent's own scoring/guardrail path, reused as-is per `evaluation.md` §3.2), Chunk 3.

**Docs:** `evaluation.md` (all — this is the authoritative methodology), `PRD.md` FR-11–FR-13, `decisions.md` D-013/D-014.

**Definition of Done:** Running the generator + all three strategies over a batch produces three genuinely different sets of numbers — specifically, confirm contact-everyone's and agent's recovery rates are **not** identical to do-nothing's (if they are, the independence bug has been reintroduced — stop and check `do-nothing.ts` immediately). The two regression tests pass.

**Prompt for your agent:**
> Build the evaluation harness per `docs/evaluation.md` — read that whole document first, it's the authoritative methodology, not just a reference. `server/evaluation/synthetic-data.ts` generates 500–1,000 synthetic payments with observable features plus a hidden `synthetic_ground_truth_recoverable` value computed with different weights than `score.ts` uses, plus noise — this file must never be imported anywhere under `server/decision-engine/`. `server/baseline-engine/contact-everyone.ts` uses that ground-truth value for every payment. `server/baseline-engine/do-nothing.ts` uses **only** an independent `SPONTANEOUS_RESOLUTION_RATE` constant (5-10%, env-configurable) and must never read `synthetic_ground_truth_recoverable` — this exact bug was found and fixed during design review (`docs/decisions.md` D-014); reintroducing it makes it mathematically impossible for the other two strategies to ever outperform do-nothing. Build `server/evaluation/metrics.ts` for the per-strategy ₹ recovered / recovery rate / contact attempts, plus agent-only precision/recall. Write tests that explicitly assert `do-nothing.ts` contains no reference to `synthetic_ground_truth_recoverable`, and that `score.ts`/`classify-failure.ts` contain no import of `synthetic-data.ts`. Run the full harness once built and confirm the three strategies produce genuinely different numbers.

---

## Chunk 12 — Evaluation Page

**Goal:** Make the harness's output visible and legible — this is the page carrying the most product credibility, per `Design.md` §3.3's own framing.

**Build:**
- `MethodologyBanner.tsx` and `BaselineComparisonChart.tsx` (`components/recovery/`, per `Design.md` §9.5 / §9.1 — these weren't needed until this chunk has data to show).
- `app/(app)/evaluation/page.tsx` per `Design.md` §3.3, composed in this order: methodology banner first (before any numbers — the reader should know the benchmark is non-circular before seeing results), then the benchmark card (three inline stat tiles + the grouped bar chart, in one card, agent tile visually marked as the hero), then the precision/recall card, then tabs (All/Recovered/No Action) filtering a restraint-case list using the guardrail check row and status badge components.
- `app/api/evaluation/run/route.ts` triggering Chunk 11's harness on demand.

**Depends on:** Chunk 11, Chunk 8.

**Docs:** `Design.md` §3.3, §9.1, §9.5, `PRD.md` §5.5.

**Definition of Done:** The page renders real benchmark results end-to-end from a live run of the harness — not hardcoded numbers. The methodology banner genuinely appears above the results, not below. Switching the "All / No Action" tab correctly filters the restraint-case list.

**Tooling for this chunk:** run Impeccable/Taste/Emil's skill (items 6–8) on this page — it's the one carrying the most product credibility, worth the extra polish pass. Use Playwright MCP (item 3) to verify the tab-filter behavior programmatically rather than only by eye.

**Prompt for your agent:**
> Build `app/(app)/evaluation/page.tsx` per `docs/Design.md` §3.3 — that section specifies both the components and their exact order, follow it precisely: methodology disclosure banner first, then a single benchmark card containing three inline stat tiles (Agent/Contact-everyone/Do-nothing) above the grouped bar chart in the same card, then a precision/recall card, then status tabs filtering a restraint-case list. Build the two components this page needs that haven't been built yet: `MethodologyBanner.tsx` (§9.5) and `BaselineComparisonChart.tsx` (§9.1). Wire an `evaluation/run` API route to trigger Chunk 11's harness, and make sure the page shows real, live-computed results, not placeholder numbers.

---

## Chunk 13 — Dashboard / Overview Page

**Goal:** The page that ties every other page's data together — deliberately built last among the five core pages, since it needs both live payment data (Chunk 9) and benchmark data (Chunk 12) to show anything real.

**Build:**
- `app/(app)/dashboard/page.tsx` per `PRD.md` §5.1: revenue at risk, revenue recovered, recovery rate, the agent-vs-baseline comparison panel (pulling the same numbers as the Evaluation page — this should be a shared data source, not a second, possibly-drifting computation), pending-actions/recommendations count.

**Depends on:** Chunk 9, Chunk 12.

**Docs:** `PRD.md` §5.1, `MyIdea.md` §4.

**Definition of Done:** Every number on the dashboard matches its counterpart elsewhere in the app (the recovery rate shown here equals what the Evaluation page shows; the pending-actions count equals the actual count of `awaiting_approval`/pending payments visible on the Payments page). Mismatched numbers between pages is a bug worth catching here, not after the demo is recorded.

**Prompt for your agent:**
> Build `app/(app)/dashboard/page.tsx` per `docs/PRD.md` §5.1: revenue at risk, revenue recovered, recovery rate, the agent-vs-baseline comparison panel, and a pending-actions count. Pull the agent-vs-baseline numbers from the same source Chunk 12's Evaluation page uses — don't recompute them separately, since two independent computations of the same claim risks them silently disagreeing. After building, cross-check every number on this page against its counterpart on the Payments and Evaluation pages and confirm they match exactly.

---

## Chunk 14 — Landing Page

**Goal:** The public-facing marketing page — not judging-critical the way the product pages are, which is why it's sequenced near the end, but still part of the submission.

**Build:**
- `app/(marketing)/page.tsx` per `Design.md` §3.2: pill badge, bento feature grid using the halftone/dot-screen illustration technique specified there, one accent-colored hero stat pulled from real evaluation results (per `Design.md`'s explicit rule: never a vanity metric), checkerboard-pattern decorative background.
- Content: RecoverAI's actual differentiators (disclosed scoring, non-circular evaluation, baseline comparison, visible restraint) — not generic SaaS copy.

**Depends on:** Chunk 0 (tokens), Chunk 12 (for a real hero stat).

**Docs:** `Design.md` §3.2, §9.1 (for which stat is appropriate to headline).

**Definition of Done:** Renders correctly at desktop and mobile widths (per `Design.md` §11). The hero stat is a real number pulled from an actual evaluation run, not a placeholder.

**Tooling for this chunk:** last stop for Impeccable/Taste/Emil's skill (items 6–8), and the one place Awesome Design (item 10) is worth even glancing at — as reference only, per its entry above, never a direct pull.

**Prompt for your agent:**
> Build `app/(marketing)/page.tsx` per `docs/Design.md` §3.2. Use the halftone/dot-screen 3D illustration technique specified there for the bento-grid feature cards, not a generic icon set. Content should be RecoverAI's actual differentiators — disclosed scoring, non-circular evaluation, baseline comparison, visible restraint — not generic SaaS marketing copy. The one accent-colored hero stat must be a real number pulled from a live evaluation run (Chunk 12), never a placeholder or invented figure. Confirm responsive behavior at mobile and desktop widths per `Design.md` §11.

---

## Chunk 15 — Deployment, Documentation, and Final QA

**Goal:** Submission-ready. No new features in this chunk — if something's missing, that's a signal to go back to an earlier chunk, not to add scope here.

**Build / do:**
- Production Vercel deploy with every real environment variable set (no placeholder keys).
- `.env.example` finalized to match the variables actually used in code — check it hasn't drifted from what got built.
- `README.md`: problem, product, demo, architecture, AI design, evaluation methodology, setup instructions, limitations (`MyIdea.md` §16's Day 6 spec).
- Double-check `decisions.md` §1's disclosure table against the actual shipped code — every "Real"/"Simulated" claim in that table should be verifiably true of what's deployed, not what was planned.
- Manual walkthrough of every flow (no E2E framework, per `TECH_STACK.md` §7 — this walkthrough **is** the testing strategy for everything above the decision-engine unit tests): a normal recovery, a correctly-withheld no-action case, an escalation resolved by approval, a second escalation resolved by decline, the baseline comparison view, mobile responsiveness on at least the Payments and Dashboard pages.
- **Tooling for this chunk:** run Playwright MCP (item 3) through every flow in the walkthrough above — this is its primary payoff, verifying each flow programmatically instead of purely by eye. Run the thorough Web Design Guidelines pass (item 9) here as well, the second and final time it's used.
- Record the 5-minute demo per `MyIdea.md` §17's storyline.

**Depends on:** everything.

**Docs:** `MyIdea.md` §16 (Day 7), §17, `TECH_STACK.md` §7, `decisions.md` §1.

**Definition of Done:** A reviewer cloning the repo fresh, following the README, can run it locally and see the same thing the deployed demo shows. Every disclosure-table row is true. The recorded demo covers all five beats from `MyIdea.md` §17.

**Prompt for your agent:**
> This is a QA and documentation pass, not a feature-building chunk — don't add anything new. Finalize the production Vercel deploy with real environment variables. Update `.env.example` to match what's actually used in the codebase, since it was written speculatively in Chunk 0. Write `README.md` covering problem, product, demo, architecture, AI design, evaluation methodology, setup, and limitations. Go through `docs/decisions.md` §1's disclosure table row by row and confirm each "Real" or "Simulated" claim is actually true of the deployed code as it exists right now, not as it was originally planned — fix the table if anything drifted during the build, or fix the code if it drifted from an intentional disclosure. Then walk through every flow manually: a normal recovery end to end, a payment correctly resolving to no-action, one escalation approved and a separate one declined, the evaluation page's baseline comparison, and mobile responsiveness on the Payments and Dashboard pages.

---

## Reference: Rough Day Mapping

Not a hard schedule — the real ordering rule is dependency, per chunk above. This is only for sanity-checking pace against `MyIdea.md` §16's 6-day-build / Day-7-polish structure:

| Day | Chunks |
|---|---|
| 1 | 0, 1, 2 |
| 2 | 3, 4, 5 |
| 3 | 6, 7, 8 |
| 4 | 9, 10 |
| 5 | 11, 12 |
| 6 | 13, 14 |
| 7 | 15 |

If you're behind this pace by Day 3 or 4, the honest move is cutting from `PRD.md` §6 (already-deferred features) — never from skipping a Definition of Done check to catch up, since that's exactly how the two bugs in `decisions.md` D-013/D-014 would have shipped instead of being caught.
