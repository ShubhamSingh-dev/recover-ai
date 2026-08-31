# Tech Stack — RecoverAI

**Scope:** The agreed technology choices for this project — what's used, why, and what should not be introduced without a deliberate decision to change this document. Every choice below traces back to `MyIdea.md` §14, `PRD.md` §5.9, or `ARCHITECTURE.md`; two small gaps (authentication, testing) were never explicitly named in prior discussion and are flagged as such rather than presented as already-agreed.

**Governing principle, unchanged from `ARCHITECTURE.md` §1.4:** this is a solo-built, single-merchant MVP shipping in 6 days. Every choice here optimizes for the smallest stack that gets the product built and demoed correctly — not for what would matter at scale. If a technology isn't required to satisfy something already in `PRD.md`, it doesn't belong in this project.

---

## 1. Frontend

| Technology | Role |
|---|---|
| **Next.js (App Router)** | Application framework — frontend and backend in one deployable unit |
| **React** | UI library |
| **TypeScript** | Language, used everywhere (frontend, backend, scripts) |
| **Tailwind CSS** | Styling, driven by the design tokens in `Design.md` §2 |
| **shadcn/ui** | Base component primitives (button, card, tabs, badge) |
| **Recharts** | Charts — baseline comparison bar chart (`Design.md` §9.1), evaluation page visuals |

**Why:** This is the stack named directly in `MyIdea.md` §14 and is not being revisited. Next.js App Router specifically because it lets one project serve both the merchant app and the API routes/webhook listener (`PRD.md` §5.9) without a second deployable, which matters for a 6-day solo build (`ARCHITECTURE.md` §7.1: no microservices). Tailwind + shadcn were chosen because they let the design tokens in `Design.md` §2 become the actual source of truth in code (theme config) rather than something developers have to remember to match by eye. Recharts specifically (not another charting library) because it's the standard, low-config choice for the exact chart types this product needs — a grouped bar chart and simple line/stat displays — and nothing in `PRD.md` requires more than that.

---

## 2. Backend

| Technology | Role |
|---|---|
| **Next.js API routes / Server Actions** | HTTP endpoints, webhook listener, mutation handlers |
| **Node.js / TypeScript** | Runtime and language for all server-side logic |

**Why:** Named in `MyIdea.md` §14. Using Next.js's own API routes instead of a separate backend framework (Express, Fastify, NestJS) means one runtime, one deployment, one language across the whole app — there's no API contract to maintain between two separately-versioned services, which would be pure overhead for a single-merchant demo (`ARCHITECTURE.md` §10). Server Components are used for reads (direct function calls into `server/`, per `ARCHITECTURE.md` §3.3), API routes are used for writes, webhooks, and anything a Client Component needs to call — this is a Next.js convention, not a separate technology decision.

---

## 3. Database

| Technology | Role |
|---|---|
| **PostgreSQL** | Primary datastore |
| **Supabase** | Managed Postgres hosting |

**Why:** Named in `MyIdea.md` §14. Supabase specifically because it gives a production-grade managed Postgres instance with zero infrastructure setup, which is the entire point for a 6-day build — and because it also provides the authentication layer used in §4, avoiding a second vendor for what is otherwise a small, related need. Postgres itself (over a NoSQL option) fits the data directly: six clearly relational tables (`payments`, `customers`, `recovery_attempts`, `agent_decisions`, `audit_logs`, `merchants`, per `ARCHITECTURE.md` §6.2) with real foreign-key relationships, not a schema-less or document-shaped problem.

**Query approach:** typed query functions, one module per table (`ARCHITECTURE.md` §4.4), no raw SQL scattered across route handlers. Whether that's raw parameterized SQL, a lightweight query builder, or an ORM (Prisma, Drizzle) is an implementation detail left open — the convention (one query module per table) matters more than the specific library, and picking one shouldn't require revisiting this document unless it changes the schema approach itself (see §8, jsonb/append-only conventions).

---

## 4. Authentication

| Technology | Role |
|---|---|
| **Supabase Auth** | Login for the single merchant user |

**⚠ Not previously named in `PRD.md`/`MyIdea.md`** — added in `ARCHITECTURE.md` §5 because the product needs *some* answer to "is the deployed demo an open URL," and `PRD.md` §10 rules out anything beyond single-merchant scope. Supabase Auth was chosen specifically because Supabase is already the database vendor (§3) — it adds no new vendor, no new billing relationship, and no new operational surface. Email/password, one user, no roles, no teams, no SSO — anything beyond that is out of scope per `PRD.md` §10 and should not be added without revisiting that scope decision first.

---

## 5. APIs & External Services

| Service | Role | Integration scope |
|---|---|---|
| **Google AI Studio (Gemini 2.5 Flash)** | Primary LLM | Score explanation, message drafting, intervention proposal — nothing else |
| **Groq (Llama 3.3 70B)** | Fallback LLM | Config-swap only, never called concurrently with Gemini |
| **Razorpay (test mode)** | Payments | One payment link creation call, one webhook listener — nothing else |

**Why Gemini 2.5 Flash:** researched and decided earlier in this project — as of the research date, the strongest free-tier option with no credit card requirement, solid rate limits, and native structured-output/tool-calling support, which is exactly what the constrained LLM role (`PRD.md` FR-6) needs.

**Why Groq as fallback, not a second active model:** the recovery score is deterministic TypeScript, not an LLM call (`MyIdea.md` §14) — there is no scenario in this product that benefits from two models running simultaneously, only a scenario where the primary is unavailable during a live demo. Groq's free tier is fast and has no credit card requirement, making it a low-cost insurance policy, wired as a one-line config swap (`ARCHITECTURE.md` §4.4), not a second code path to maintain.

**Why Razorpay test mode, minimally:** `PRD.md` §5.9 and §10 explicitly cap this to one payment link creation call and one webhook event type, with no signature verification, idempotency, or retry hardening. This is a scope decision restated here as a technology-boundary decision: the integration code should not grow beyond what's needed to demonstrate one real payment resolving, because production-grade webhook handling is explicitly out of scope.

**No other external services.** No real WhatsApp/Email/SMS provider — outbound messaging is simulated in code, with no network call made at all for that path (`ARCHITECTURE.md` §7.3), which is a technology decision (no SDK, no API key, no vendor) as much as a product one.

---

## 6. Libraries

| Library | Role |
|---|---|
| **Vercel AI SDK (v5, stable — not v6 beta)** | LLM calling, `generateObject` for schema-validated structured output, provider adapters for Gemini and Groq |
| **Zod** (or equivalent schema library) | Defines the schemas `generateObject` validates LLM output against (explanation string, message string, intervention-type enum) |

**Why AI SDK v5, not v6:** decided earlier in this project. v6 (beta at the time) has an appealing agent/human-in-the-loop abstraction that maps well onto the `REQUIRE_HUMAN_APPROVAL` guardrail, but betting a Day 3–4 core loop on a pre-stable SDK version with a hard 7-day deadline and no slack is exactly the kind of risk this build avoids. The human-approval guardrail is built as plain code (a status flag + an approve action) instead — see `PRD.md` FR-4, `ARCHITECTURE.md` §4.3.

**Why a schema library alongside AI SDK:** `generateObject`'s schema-validated output (`PRD.md` §5.9, FR-6) requires a schema to validate against; Zod is the standard pairing with AI SDK and is treated here as an implementation detail of the already-agreed "schema-validated output" requirement, not a new architectural decision.

**No other libraries are assumed.** Small utility needs (date formatting, className merging for Tailwind, etc.) can be added as needed without revisiting this document — §9 below defines what *does* require a decision, and small, single-purpose utilities aren't it.

---

## 7. Testing

**⚠ Not previously named** — `MyIdea.md` §16 already includes a `tests/` directory in the agreed repo structure, but no tool was ever chosen to fill it. This section names one; it does not introduce a new requirement.

| Tool | Role |
|---|---|
| **Vitest** | Unit tests for the deterministic decision-engine (`classify-failure.ts`, `score.ts`, `guardrails.ts`, `ARCHITECTURE.md` §4.2) |

**Why Vitest, and why only unit tests:** the highest-value, highest-risk code in this product is the deterministic scoring and guardrail logic — it's pure functions with no I/O, exactly the kind of code cheap to unit-test and expensive to get subtly wrong (a guardrail bug is the one class of bug that would undermine the product's actual thesis). Vitest is chosen because it's fast, has near-zero configuration in a Next.js/TypeScript project, and needs no separate test runner setup. No end-to-end testing framework (Playwright, Cypress) is introduced: `MyIdea.md` §16 already allocates Day 7 morning to a full manual walkthrough of every flow, including the restraint/no-action case and the baseline comparison view — an automated E2E suite would cost build time this project doesn't have (`PRD.md` "Buildability within constraints" NFR) without changing what actually gets checked before submission.

**No coverage targets, no CI-gated testing.** A handful of well-chosen unit tests on the decision engine is the goal, not a coverage percentage — consistent with `ARCHITECTURE.md` §10's decision not to build a CI/CD pipeline beyond Vercel's default deploy.

---

## 8. Deployment & Infrastructure

| Technology | Role |
|---|---|
| **Vercel** | Hosting, deployment, environment variable management |
| **Supabase (managed Postgres)** | Database hosting (see §3) |

**Why:** Named in `MyIdea.md` §14. Vercel is the natural pairing for a Next.js app — git-push deploys, environment variable management, and zero infrastructure configuration, which matters more for a 6-day solo build than any of Vercel's alternatives' individual features. No separate CI/CD pipeline, no containerization (Docker), no infrastructure-as-code tooling — Vercel's built-in deploy-on-push is sufficient for a single-environment demo deployment, and anything more would be infrastructure this product will never need (`ARCHITECTURE.md` §10).

**Secrets:** all API keys (Razorpay test keys, Gemini/Groq keys, Supabase keys), guardrail thresholds, and `SPONTANEOUS_RESOLUTION_RATE` (the do-nothing baseline's evaluation-only constant, `evaluation.md` §2.4, `ARCHITECTURE.md` §4.4) are environment variables, set in Vercel's dashboard and documented (not populated) in `.env.example`, per `PRD.md`'s Security NFR and the already-agreed repo structure (`MyIdea.md` §16).

---

## 9. Technologies & Patterns That Should NOT Be Introduced Without Approval

Each of these would be a reasonable choice in a different context, which is exactly why it needs a deliberate decision here rather than being added ad hoc mid-build:

- **A second backend framework or service** (Express, FastAPI, a separate Python service for anything) — the monolith decision in `ARCHITECTURE.md` §7.1 is deliberate; splitting adds a deployment and an API contract this project doesn't need.
- **Any additional LLM provider** beyond Gemini (primary) and Groq (fallback) — `MyIdea.md` §14's "one LLM, actively" reasoning applies regardless of which specific model; a third provider adds swap-cost and inconsistent tone for zero judging or product upside.
- **AI SDK v6** (or upgrading past the stable v5 line) before it reaches stable — the risk tradeoff in §6 was already made deliberately; revisit only if v6 reaches stable *and* there's slack in the schedule, not by default.
- **A message queue or background job runner** (BullMQ, SQS, etc.) — nothing in this product's request volume or latency needs asynchronous job processing; the decision flow (`ARCHITECTURE.md` §8.1) runs synchronously within a single request.
- **A caching layer** (Redis or similar) — one merchant, one 500–1,000-record benchmark; direct queries are fast enough (`ARCHITECTURE.md` §8.3).
- **Client-side data-fetching libraries** (React Query, SWR) for initial page loads — Server Components fetch directly (`ARCHITECTURE.md` §3.3); introduce one only if a genuinely client-driven, polling, or optimistic-update need appears that Server Components can't cover.
- **Any real messaging provider** (Twilio, SendGrid, WhatsApp Business API, etc.) — outbound messaging is simulated by product decision (`PRD.md` §5.9), not by technical limitation; adding a real provider would be a scope change, not a tech-stack change, and needs to go back through `PRD.md` first.
- **Multi-tenant auth patterns** (organizations, roles, invites, SSO) — out of scope per `PRD.md` §10; §4's single-user Supabase Auth setup should not grow in this direction without a scope decision first.
- **An E2E testing framework** (Playwright, Cypress) — §7's reasoning (manual Day 7 walkthrough already covers this, and build time is the binding constraint) holds unless the schedule materially changes.
- **A second cloud vendor or hosting platform alongside Vercel** (AWS, GCP, a separate database host) — Supabase already covers database and auth; there's no remaining infrastructure need Vercel doesn't already meet.
- **Any ORM/query-builder swap** that changes the schema modeling approach (e.g., a document-store abstraction, a GraphQL layer) — the relational schema in `ARCHITECTURE.md` §6.2 and its jsonb/append-only conventions are the agreed shape; a new query tool is fine, a new *data model* approach is not.

If a strong technical reason emerges to cross one of these lines mid-build, that reason should be written down (in `docs/decisions.md`, per the agreed repo structure) rather than the stack quietly drifting — consistent with this project's own principle that every decision should be inspectable, not just the product's.
