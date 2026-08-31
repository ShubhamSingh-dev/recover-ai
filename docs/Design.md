# Design System Specification — RecoverAI

**Scope:** Visual style and reusable components for the RecoverAI product surfaces defined in `PRD.md` §5 — Dashboard/Overview, Payments, Customer, Recovery, Evaluation/Analytics, plus the marketing landing page implied by the product's public-facing entry point. Design only; no functional requirements are added or changed here.

**References used (style only, not literal content — per your note that the MVP layout differs):**
- `campaign-dashboard-design.jpg` → dark icon-sidebar + light-content app-shell pattern, slide-over form drawer, tab/badge/chip conventions, chart styling. Mapped onto the Dashboard/Payments/Recovery pages.
- `Screenshot_2026-08-29_193859.png` → light halftone-pattern marketing layout, centered pill badge, bento-grid feature cards, monochrome-first palette with a single accent color. Mapped onto the landing page.

Both references share the same underlying language — soft shadows, generous rounding, restrained color, one accent doing most of the work — so this spec treats them as one consistent system rather than two different styles.

---

## 1. Design Principles

1. **Evidence over decoration.** This product's whole pitch is disclosed scores, guardrails, and honest baselines — the UI should read as precise and calm, not flashy. No gradients-for-their-own-sake, no unexplained numbers.
2. **One accent color, used deliberately.** Both references lean monochrome with a single accent doing the pointing (blue for data/action in the dashboard ref, green for one highlighted stat in the landing ref). RecoverAI follows the same discipline — see §2.1.
3. **Real vs. simulated must be visually distinct at a glance**, per PRD NFR "Honesty of disclosure." This is a hard design constraint, not a style preference — see §9.4.
4. **Desktop-first, mobile-aware.** This is an ops/finance tool a merchant checks at a desk most of the time (like the dashboard reference), but the landing page and key status checks must work on a phone.

---

## 2. Design Tokens

Tokens are the single source of truth. Implement as CSS custom properties (or Tailwind theme config, given the Next.js/Tailwind/shadcn stack already chosen) — never hardcode raw values in components.

### 2.1 Color

**Base neutrals** (both references are built almost entirely from a gray ramp):

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-canvas` | `#F6F7F8` | App background (dashboard content area) |
| `--color-bg-surface` | `#FFFFFF` | Cards, drawers, modals, sidebar-inverse content |
| `--color-bg-sunken` | `#F0F1F3` | Table row alternation, input backgrounds, disabled fields |
| `--color-bg-inverse` | `#12141A` | Sidebar background (dashboard app shell) |
| `--color-border-default` | `#E4E6EA` | Card borders, dividers, input borders |
| `--color-border-strong` | `#D3D6DC` | Hover borders, active input borders |
| `--color-text-primary` | `#12141A` | Headings, primary content |
| `--color-text-secondary` | `#5B616E` | Labels, supporting text, table secondary lines |
| `--color-text-muted` | `#8A8F99` | Placeholder text, timestamps, disabled text |
| `--color-text-inverse` | `#F6F7F8` | Text on the dark sidebar |

**Primary (ink)** — both references are monochrome-first: the dashboard reference's "Create Campaign" button and active sidebar pill are solid black, not blue; the landing reference's headline and card titles are near-black with color reserved for exactly one stat. RecoverAI follows the same discipline:

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#12141A` | Primary buttons, active sidebar pill, active tab text — same value as `--color-text-primary`, named separately because it plays a UI role, not just a text role |
| `--color-primary-hover` | `#22242C` | Hover/active state of primary elements |
| `--color-on-primary` | `#FFFFFF` | Text/icons on primary-filled surfaces |

**Accent (data color)** — blue, used the way the dashboard reference actually uses it: chart bars, focus rings, links, the checkmark on a selected dropdown item, and the currently-focused input border. It is a *data and selection* signal, not a primary-action signal:

| Token | Hex | Usage |
|---|---|---|
| `--color-accent` | `#3B5BFF` | Chart primary series, links, focus rings, selected-item checkmarks, focused input border |
| `--color-accent-subtle` | `#EEF1FF` | Accent-tinted backgrounds (selected rows, info banners) |
| `--color-accent-hover` | `#2E48D9` | Hover/active state of accent-colored elements |

**Semantic status colors** — required by PRD §5.2/5.7 (Recovered / Pending / No Action / Failed states must be distinguishable without relying on color alone; see §10):

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#1E8E5A` | Recovered status, positive lift over baseline |
| `--color-success-subtle` | `#E9F7EF` | Success badge background |
| `--color-warning` | `#B7791F` | Pending / awaiting human approval |
| `--color-warning-subtle` | `#FBF3E1` | Warning badge background |
| `--color-neutral-status` | `#5B616E` | No Action (restraint) — deliberately neutral, not red, since correct restraint is a good outcome |
| `--color-neutral-status-subtle` | `#EEEFF2` | No Action badge background |
| `--color-danger` | `#C6362E` | Failed recovery, guardrail violation, destructive actions |
| `--color-danger-subtle` | `#FBEAE9` | Danger badge background |

**Chart colors** (for the agent-vs-baseline comparison, per PRD §5.5/FR-12):

| Token | Hex | Series |
|---|---|---|
| `--color-chart-agent` | `#3B5BFF` | Agent strategy (accent — it's the hero series) |
| `--color-chart-baseline-1` | `#A9B4E8` | Contact-everyone baseline (muted accent tint, echoing the "Last Period" light-blue bar in the dashboard reference) |
| `--color-chart-baseline-2` | `#D3D6DC` | Do-nothing baseline (neutral gray — the floor) |

Do not introduce additional hero colors. If a sixth semantic meaning is ever needed, reuse an existing token with an icon or label change before adding a new hue.

### 2.2 Typography

Both references use a clean, modern grotesque sans with tight, confident headline weight and restrained body weight — **Inter** (or **Geist**, Vercel's own, given the Next.js/Vercel stack) fulfills this directly; no need to source a second display face.

| Token | Font | Size | Weight | Line height | Usage |
|---|---|---|---|---|---|
| `--font-display` | Inter/Geist | 32px | 700 | 1.2 | Landing hero headline (image 2 style) |
| `--font-h1` | Inter/Geist | 24px | 700 | 1.3 | Page titles ("Recent Campaign" equivalent: "Dashboard", "Payments") |
| `--font-h2` | Inter/Geist | 18px | 600 | 1.35 | Section headers ("Audience", "Time Manage" equivalent: "Score Breakdown", "Guardrail Check") |
| `--font-body` | Inter/Geist | 14px | 400 | 1.5 | Default body/table/form text |
| `--font-body-sm` | Inter/Geist | 13px | 400 | 1.45 | Secondary text, helper text, timestamps |
| `--font-label` | Inter/Geist | 13px | 500 | 1.3 | Form field labels, table column headers |
| `--font-mono` | JetBrains Mono / Geist Mono | 13px | 400 | 1.5 | Audit trail timestamps, payment IDs, score formulas — anywhere exactness matters |

**Rule:** never go below 13px for interactive or informational text (accessibility floor — see §10). The mono face is a deliberate addition beyond the references, justified by RecoverAI's evidence-first principle (§1): IDs, timestamps, and score math should look exact, not decorative.

### 2.3 Spacing

4px base unit, matching the tight, consistent gutters visible in both references:

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Card internal padding: `--space-6` (24px) desktop, `--space-4` (16px) mobile. Section gaps on the dashboard: `--space-6`. Landing page section gaps: `--space-16`.

### 2.4 Radius

Both references favor generous, consistent rounding over sharp corners:

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Badges, chips, small buttons |
| `--radius-md` | 10px | Inputs, standard buttons |
| `--radius-lg` | 14px | Cards, dropdown menus |
| `--radius-xl` | 20px | Feature/bento cards (landing page), drawers |
| `--radius-full` | 999px | Pills, avatars, toggle switches, the "Why AstraCore"-style badge |

### 2.5 Shadow

Soft, low-contrast shadows only — never a hard drop shadow. Matches the barely-there elevation in both references:

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(18,20,26,0.04)` | Inputs, chips |
| `--shadow-sm` | `0 2px 8px rgba(18,20,26,0.06)` | Cards at rest |
| `--shadow-md` | `0 8px 24px rgba(18,20,26,0.08)` | Dropdowns, hover-elevated cards |
| `--shadow-lg` | `0 16px 48px rgba(18,20,26,0.12)` | Drawers, modals |

### 2.6 Motion

| Token | Value | Usage |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default easing |
| `--duration-fast` | 120ms | Hover states, toggles |
| `--duration-base` | 200ms | Drawer/modal open, tab switch |
| `--duration-slow` | 320ms | Page transitions, chart entrance |

Respect `prefers-reduced-motion`: fall back to opacity-only transitions with no translation/scale when set (see §10).

---

## 3. Layout & App Shell

### 3.1 Dashboard app shell (Dashboard, Payments, Customer, Recovery, Evaluation pages)

The reference is a **two-tier left structure**, not a single sidebar — reproduced here as-is rather than collapsed into one panel:

- **Tier 1 — icon rail** (`--color-bg-inverse`, fixed width 64px): icons only, no text, no avatar. Product logo mark at top, then a short set of global icons (search, notifications, settings) if needed — this rail does not carry the primary page navigation in the reference; it's a slim utility strip.
- **Tier 2 — nav panel** (`--color-bg-surface`, fixed width 240px, 1px `--color-border-default` right edge): user header pinned at the **top** — avatar (32px, `--radius-full`) + name (`--font-body`, weight 600) + email (`--font-body-sm`, `--color-text-muted`) stacked beside it, exactly matching "Benjamin Yang / benji@metricmap.co." Below the header, the text nav list (icon + label per row) for the five product pages: Dashboard, Payments, Customers, Recovery, Evaluation. Active item gets a solid `--color-primary` (black) rounded-rect background with `--color-on-primary` text, matching the reference's "Recent Campaigns" active state exactly — no accent-blue substitution.
- **Content area** (`--color-bg-canvas`): page header (`--font-h1` + optional right-aligned primary action button) followed by a 12-column responsive grid of cards/tables. Include a search input (icon-prefixed, with a `⌘F`-style keyboard-shortcut hint right-aligned inside the field, `--font-body-sm` `--color-text-muted`) and a date-range picker (calendar icon + formatted range text, e.g. "28–30 Sep") on list pages (Payments, Recovery) — both present in the reference's toolbar row and needed for filtering the payments/recovery lists.
- **Right-side drawer** (slide-over, `--shadow-lg`, `--radius-xl` on the left edge only, white surface, fixed width ~440px): used for detail views that need focus without a full page navigation — e.g., opening a single payment's full decision trace (score breakdown, guardrail check, audit trail) while the list stays visible behind it. On open, the content area behind it gets a scrim (`rgba(18,20,26,0.4)`, matching the dimmed-background effect visible in the reference) and is inert (not interactive) until the drawer closes — mirroring the "Campaign Info" drawer's dimming behavior, which the first draft of this spec omitted.

### 3.2 Landing page shell

Directly adapts the landing reference's structure:

- Light canvas (`--color-bg-canvas`) with a **visible** decorative checkerboard/grid pattern running down both page margins — alternating filled and empty squares, `--color-border-default` at roughly 70–80% opacity, clearly legible as a pattern rather than a faint texture. (First draft of this spec understated this as "low-opacity" — it isn't; it's a deliberate, fairly bold graphic border element, just kept out of the content column so it never sits behind text.) Simplify to fewer/larger squares on mobile (§11) rather than fading it out.
- Centered pill badge (`--radius-full`, `--color-bg-surface`, `--shadow-xs`, small icon + label) above each major section headline, echoing "Why AstraCore."
- Bento-style feature grid: asymmetric card sizes (`--radius-xl`, `--shadow-sm`, 1px `--color-border-default`), each with a **halftone/dot-screen illustration** — a 3D-rendered abstract shape (cube, interlocking form, stepped block) reduced to a grayscale dot-matrix pattern, exactly the technique used for "Focus," "Connect," and "Scale" in the reference. This is a specific illustration style, not a generic icon set: render each shape at low-poly 3D, then apply a halftone/dot-screen filter so it reads as print-like dot texture rather than a flat icon or photo. Pair each with a bold `--font-h2` title and `--font-body` supporting copy — content reused for RecoverAI's actual differentiators (disclosed scoring, non-circular evaluation, baseline comparison, visible restraint) rather than generic SaaS claims, since content must reflect the real product per PRD §5 and not invented marketing claims.
- One stat card gets the single accent-colored icon treatment (as "99.99% Platform Uptime" does in green) — reserve this for RecoverAI's one headline, evidence-backed number (e.g., agent lift over best baseline), never for a vanity metric, consistent with the product's evidence-over-decoration principle. Use `--color-accent` (blue) here rather than introducing a third hue, keeping the palette to primary/accent/semantic only.

### 3.3 Evaluation / Analytics page composition

This page has no direct precedent in either reference image — it's the one screen that's entirely RecoverAI's own content (PRD §5.5) — so it's the one most likely to drift from the rest of the system if left unspecified. To keep it consistent, it reuses the reference's actual density pattern rather than inventing a new one: **inline stat tiles sit inside the same card as the chart they summarize** (see the "Sent 203 Mail" / "Opened 18%" tiles sitting directly above the bar chart, not as separate cards), followed by tabs, then a filterable list. Composed top to bottom:

1. **Methodology disclosure banner** (§9.5) — full width, directly under the page header, before any numbers. Placed first deliberately: the reader should know the benchmark is non-circular *before* seeing results that could otherwise look self-serving.
2. **Benchmark card** — one card, `--radius-lg`, `--shadow-sm`, `--space-6` padding, containing:
   - A row of three inline stat tiles at the top of the card (same treatment as "Sent 203 Mail +6%": `--font-h1` number, `--font-label` caption, small delta), one per strategy — **Agent**, **Contact-everyone**, **Do-nothing** — each showing ₹ recovered as the headline figure. The Agent tile gets a `--color-primary` 2px top border to mark it as the hero series without needing a second color; recovery rate and contact-attempts-used appear as smaller secondary lines beneath the headline figure within the same tile, not as separate tiles, keeping three tiles instead of nine.
   - The grouped bar chart (§9.1) directly below that same tile row, inside the same card, legend included — exactly the reference's stat-tiles-above-chart-in-one-card structure.
3. **Precision/recall card** — a second, smaller metric card beside or below the benchmark card (2-column split on desktop, stacked on tablet/mobile per §11): two stat tiles (precision, recall) in the same inline style, plus one line of `--font-body-sm` `--color-text-secondary` explaining what they're measured against ("vs. hidden ground-truth function — see Evaluation Methodology above").
4. **Tabs + toolbar**, matching the reference's "Active 14 / In Progress 3 / Completed 8" + search/date-range row exactly (§3.1, §8): tabs filter the list below by **All / Recovered / No Action**, so the restraint cases (PRD §5.5, "correctly withheld") are one tab click away rather than buried at the bottom of an undifferentiated list.
5. **Restraint / decision list** — list-row cards (§6, type 2), each showing the payment, its score, and its guardrail-triggered reason via the guardrail check row component (§7.3), with the No Action status badge (§7.1) right-aligned. This reuses three already-specified components rather than introducing a fourth list style for this one page.

No new visual primitives were needed for this page — the fix here was compositional (matching the reference's actual tile-in-card density and tab/toolbar pattern) rather than stylistic.

### 3.4 Payments page composition

The most direct match to the reference's own "Recent Campaign" list view, so composition is largely literal:

1. Page header (`--font-h1` "Payments") + toolbar directly below: search input, date-range picker, and status tabs — **All / Recovered / Pending / No Action / Failed** — reusing the exact toolbar row from §3.1 and the tab component from §8. This mirrors the reference's "Active 14 / In Progress 3 / Completed 8" + search/date-range row placement exactly, just with RecoverAI's own status vocabulary (PRD §5.2) in place of campaign statuses.
2. List of list-row cards (§6, type 2): failure-type icon, customer name + amount + failure reason (`--font-body`/`--font-body-sm`), status badge (§7.1) right-aligned, thin progress bar only when a recovery attempt is actively in progress.
3. Clicking a row opens the right-side drawer (§3.1) containing, top to bottom: payment summary, the score breakdown component (§7.2), the guardrail check row(s) (§7.3), the human-approval action pair (§9.3) when applicable, the simulated-vs-real indicator (§9.4) on any executed action, and the audit trail timeline (§9.2) at the bottom. This ordering — score → guardrails → action taken → history — mirrors the actual decision sequence from `MyIdea.md` §6, so the drawer reads top-to-bottom the same way the agent reasons.

### 3.5 Customer page composition

Not directly modeled on either reference image (neither shows a single-record profile view), so it's composed from the same primitives used elsewhere rather than styled freehand:

1. Customer header: avatar-style initial circle (`--radius-full`, `--color-bg-sunken`, `--font-h2` initial), name, and 2–3 small inline stat tiles (§3.3's tile style, reused) for at-a-glance history — total payments, past success rate — since these are exactly the behavioral inputs the score breakdown (§7.2) later references, and showing them here first gives the merchant the same context the agent had.
2. Behavioral signals card: the specific factors PRD §5.3 requires (time-of-day pattern, recency) shown as labeled `--font-body` rows, not a chart — these are inputs to a formula, not a trend, so a chart would overstate their precision.
3. Payment history: the same list-row card used on the Payments page (§3.4), filtered to this customer, opening the same right-side drawer on click — no second list style introduced for what is functionally the same list, filtered.

### 3.6 Recovery page composition

This page is close to a literal reuse of the reference's core layout — campaigns/attempts, tabs, progress bars — so it needs the least adaptation of any page:

1. Toolbar + tabs: **Active / Pending / Completed**, directly reusing §3.1's toolbar and §8's tab component — this is the same tri-state tab pattern as the reference's "Active 14 / In Progress 3 / Completed 8," applied to recovery attempts instead of campaigns.
2. List of list-row cards (§6, type 2) with the progress bar shown by default here (unlike the Payments list, where it only appears for active attempts) — on the Recovery page, an in-progress bar is the point of the view, matching the reference's own campaign cards, which always show a progress bar.
3. Each card's simulated/real indicator (§9.4) is visible directly on the row, not only inside the drawer, since "was this a real or simulated recovery attempt" is exactly the question this page exists to answer at a glance.

---

## 4. Buttons

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `--color-primary` | `--color-on-primary` | none | One per view/section — matches the reference's solid-black "Create Campaign" button exactly. Used for e.g. "Approve Recovery" |
| Secondary | `--color-bg-surface` | `--color-text-primary` | 1px `--color-border-default` | "Cancel"-equivalent, secondary actions |
| Ghost | transparent | `--color-text-secondary` | none | Tertiary/inline actions, icon-only toolbar buttons |
| Destructive | `--color-danger` | white | none | Irreversible actions only (rare in this product — mostly view-only ops data) |

**Sizing:** `--radius-md`, height 40px desktop / 44px mobile (meets the 44px touch-target floor, §10), horizontal padding `--space-4`, `--font-body` weight 500. Disabled state: 40% opacity, no shadow, `cursor: not-allowed`. Hover: `--shadow-sm` added, background shifts to the `-hover` token. Focus (keyboard): 2px `--color-accent` outline offset 2px, always visible — never `outline: none` without a replacement. Note the focus ring stays blue even on a black button; accent blue is reserved for focus/selection signals everywhere, including on primary-colored surfaces.

---

## 5. Forms & Inputs

Directly modeled on the campaign-drawer reference — labeled fields stacked vertically, icon-prefixed inputs where the icon adds scannability, chip-based multi-selects, and dropdowns with checkmarks.

- **Text input:** `--radius-md`, 1px `--color-border-default`, `--color-bg-surface`, height 40px, `--space-3` horizontal padding. Focus: border becomes `--color-accent`, 3px accent-subtle glow. Label above in `--font-label`, `--color-text-secondary`.
- **Textarea:** same treatment, min-height 80px, resizable vertically only.
- **Select/dropdown:** same input shell + chevron icon right-aligned; open menu is a `--shadow-md` `--radius-lg` panel with `--space-2` item padding and a checkmark icon (not just highlight color) on the selected item, exactly as in the reference — this dual-signal (checkmark + highlight) matters for accessibility, not just style (§10).
- **Multi-select / tag chips** (e.g., a future "recovery channel" selector): chips use `--radius-sm`, `--color-bg-sunken` background, `--font-body-sm`, with an inline "×" remove icon — matches the "Instagram ×  Google Ads ×" pattern exactly.
- **Toggle switch** (e.g., "Start now" pattern — reusable for any future on/off setting): `--radius-full` track, `--color-border-default` off / `--color-accent` on, white circular thumb, `--duration-fast` slide.
- **Icon-prefixed numeric fields** (matching "Target customers", "Email only" fields with a leading icon): use for RecoverAI equivalents such as amount, contact-attempt counters — leading icon in `--color-text-muted`, 16px, `--space-2` gap from the value.
- **Rule-builder rows** (matching "Spend = $200 / Increase budget $ 30" pattern): this exact pattern maps directly onto RecoverAI's guardrail configuration UI if/when guardrails become merchant-editable — a horizontal row of \[field dropdown\] \[operator dropdown\] \[value input\] \[delete icon\], each in its own bordered segment. Not required for MVP per PRD (guardrails are backend-configured, not merchant-edited in MVP) but the component is specified now so it drops in cleanly if that becomes a later feature — do not build the editing behavior itself yet.

---

## 6. Cards

Three card types cover every surface in the PRD:

1. **Metric card** (Dashboard overview numbers: revenue at risk, revenue recovered, recovery rate): `--color-bg-surface`, `--radius-lg`, `--shadow-sm`, `--space-6` padding. Large `--font-h1`-weight number, `--font-label` caption above it, optional small delta indicator (↑/↓ + percentage) in success/danger color — never color-only (§10).
2. **List/table-row card** (Payments, Recovery, Customer history — matching the "Recent Campaign" article cards with channel icon, title, dates, progress bar): channel/failure-type icon left, title + metadata `--font-body`/`--font-body-sm`, status badge right-aligned (§7), optional thin progress bar (`--radius-full`, `--color-bg-sunken` track, `--color-accent` fill) beneath for in-progress recovery attempts.
3. **Feature/bento card** (Landing page only): as described in §3.2.

All cards share the same border/shadow/radius vocabulary (`--color-border-default`, `--shadow-sm`, `--radius-lg` or `--radius-xl`) so the product never feels like two different design systems stitched together.

---

## 7. Badges, Status Pills & the Score Breakdown Component

These are the components that carry the most product meaning, per PRD §5 and §8 (Explainability/Auditability), so they get the most explicit spec.

### 7.1 Status badge
`--radius-sm`, `--font-body-sm` weight 500, `--space-1` vertical / `--space-2` horizontal padding, colored background + colored text (never white text on a saturated fill — keep contrast comfortable and consistent with the soft, low-saturation palette):

| Status | Background | Text | Icon |
|---|---|---|---|
| Recovered | `--color-success-subtle` | `--color-success` | check-circle |
| Pending | `--color-warning-subtle` | `--color-warning` | clock |
| No Action | `--color-neutral-status-subtle` | `--color-neutral-status` | minus-circle |
| Failed / Not Recoverable | `--color-danger-subtle` | `--color-danger` | x-circle |
| Awaiting Human Approval | `--color-warning-subtle` | `--color-warning` | user-check |

The icon is mandatory, not optional — status must never be conveyed by badge color alone (§10).

### 7.2 Score breakdown component
A dedicated component for the disclosed additive score (PRD FR-2/FR-3, `MyIdea.md` §5), rendered wherever a payment's recovery score is shown:

- Header row: large score number (`--font-h1`) + tier badge (High/Medium/Low, using the status-badge styling above with its own neutral-to-accent scale) + `--font-mono` "/100".
- Below it, a vertical list of contributing factors, each row: factor label (`--font-body`) left, signed point value right in `--font-mono`, with `+` values in `--color-success` and `–` values in `--color-danger` — this is a direct, literal implementation of the plaintext breakdown already written in `MyIdea.md` §5, just componentized.
- A closing total row visually separated by a `--color-border-default` divider.

### 7.3 Guardrail check row
Compact list item: guardrail name, pass/fail badge (reuse §7.1's success/danger tokens with "Passed"/"Blocked" labels), and — when blocked — the specific reason in `--font-body-sm` `--color-text-secondary`. Used in both the payment detail drawer and the audit trail (§9.2).

---

## 8. Navigation

- **Sidebar (dashboard):** two-tier structure as described in §3.1 — icon rail + labeled nav panel. Because the nav panel carries text labels (unlike a collapsed icon-only sidebar), no hover-tooltip fallback is needed for page identification. Active state uses the solid `--color-primary` pill described in §3.1, not a color change on the icon alone (§10).
- **Tabs** (matching "Active 14 / In Progress 3 / Completed 8" pattern): used for filtering Payments/Recovery lists by status. Active tab: `--color-text-primary` text + `--color-accent` 2px underline. Inactive: `--color-text-secondary`. Count badge: small `--color-bg-sunken` pill with `--font-body-sm` number, exactly matching the reference's circular count badges.
- **Landing page top nav:** simple horizontal bar, logo left, section links center/right, primary CTA button right — not present in either reference image directly but implied by standard landing conventions; kept minimal and consistent with the same button/type tokens as the rest of the system rather than introducing new styling.

---

## 9. Component Notes Specific to RecoverAI's Product Logic

These don't come from the references — they're dictated by the PRD and specified here so the visual system stays consistent as they get built.

### 9.1 Baseline comparison chart
Grouped bar chart (matching the reference's "Chosen Period / Last Period" grouped-bar convention, extended to three series): agent (`--color-chart-agent`), contact-everyone (`--color-chart-baseline-1`), do-nothing (`--color-chart-baseline-2`). Legend uses filled square swatches + label, positioned above the chart exactly as in the reference. Axis labels `--font-body-sm`, gridlines `--color-border-default` at low opacity, dashed.

### 9.2 Audit trail timeline
Vertical timeline: a thin `--color-border-default` connecting line, each entry a small icon dot (colored per event type using the same status tokens) + `--font-mono` timestamp + `--font-body` description. No-action entries (PRD FR-5, FR-10) use the neutral-status token and an explicit "No Action" label inline — they must look like a normal, expected timeline entry, not a muted or de-emphasized one, since restraint is a correct outcome, not a lesser one.

### 9.3 Human-approval action pair
A gap in the first draft: PRD FR-4 and the human-approval edge case require the merchant to actively approve or decline a flagged payment above the amount threshold — this needs a real interactive component, not just the passive "Awaiting Human Approval" badge from §7.1. Rendered inline on the payment row and repeated in the detail drawer: two buttons side by side — **Approve** (Secondary button style, §4, but with `--color-success` text/border instead of the default neutral, since this is a positive confirming action) and **Decline** (Secondary button style with `--color-danger` text/border). Neither uses a filled/primary style — this keeps the visual weight lower than the black primary button reserved for the main per-page action, appropriate since this is a review decision, not the page's core task. Once actioned, the button pair is replaced by the resulting status badge (§7.1) and a new audit trail entry is written (§9.2).

### 9.4 Simulated vs. real indicator
Per PRD NFR "Honesty of disclosure" — this is the one place where the design system deliberately breaks its own minimalism to force a visual difference:
- Any simulated action (message send, etc.) gets a **dashed-border** chip (`border: 1px dashed var(--color-border-strong)`, `--color-bg-sunken` fill, small "flask" or "test-tube" icon) with the literal word "Simulated" in `--font-body-sm`.
- Any real action (Razorpay test-mode payment link) gets a **solid-border** chip in `--color-accent-subtle` with a "link" icon and the word "Live (test mode)."
- These two chip styles must never be visually similar enough to confuse at a glance — dashed vs. solid border is the deliberate, load-bearing difference, reinforced by icon and label so it doesn't rely on the border alone.

### 9.5 Methodology disclosure banner
Referenced by §3.3 (Evaluation page) but a general-purpose component: a full-width banner, `--radius-lg`, `--color-accent-subtle` background, 1px `--color-accent` left border (4px, as an accent stripe rather than an all-around border, keeping it calm), small info icon, one or two lines of `--font-body` text, and a text link ("Read the full methodology →") to `docs/evaluation.md`. Persistent, not dismissible — this isn't a one-time tip, it's a standing disclosure that should be visible every time someone views benchmark results, consistent with the product's evidence-over-decoration principle (§1).

---

## 10. Accessibility

- **Contrast:** all text/background pairs in §2.1 meet WCAG AA (4.5:1 for body text, 3:1 for large text ≥18px/bold ≥14px and for UI component boundaries). Verify any new token pairing before adding it.
- **Never color-only:** status badges, chart series, and the simulated/real distinction all pair color with an icon and/or label (§7.1, §9.1, §9.4) — colorblind and grayscale-display users must be able to read every state.
- **Focus states:** every interactive element has a visible 2px accent focus ring on keyboard focus; nothing is reachable only by mouse.
- **Touch targets:** minimum 44×44px on mobile for buttons, nav icons, and chip remove-icons, even though the visual button height token is 40px on desktop — pad the hit area, not necessarily the visible shape.
- **Motion:** respect `prefers-reduced-motion` (§2.6); no essential information may be conveyed only through animation (e.g., a chart entrance animation is decorative, not the only way to see the final values).
- **Semantic structure:** dashboard pages use real heading levels (h1 per page, h2 per section) matching the `--font-h1`/`--font-h2` tokens, not just styled `<div>`s — so screen-reader users get the same page structure sighted users get from the type scale.
- **Live regions:** status changes that happen without navigation (e.g., a payment flipping to Recovered while the merchant is looking at the list) should be announced via `aria-live="polite"`, not just a silent color change.

---

## 11. Responsive Behavior

| Breakpoint | Range | Dashboard shell | Landing page |
|---|---|---|---|
| Mobile | < 640px | Both sidebar tiers collapse into a single hamburger-triggered full-height drawer (user header at top, nav list below, matching the desktop tier-2 layout) — or a bottom tab bar (5 icons, `--color-primary` active pill) as a lighter-weight alternative; metric cards stack single-column; table/list rows become stacked card layout (label above value) instead of columns; the right-side detail drawer becomes a full-screen sheet instead of a partial overlay | Bento grid collapses to single column, stacked in the same visual order; decorative grid pattern simplifies (fewer, larger squares) to reduce visual noise on small screens without disappearing entirely |
| Tablet | 640–1024px | Icon rail stays fixed (64px); nav panel collapses to icon-only with hover tooltips (the one case where a tooltip fallback is actually needed, since labels no longer fit); metric cards go 2-column; tables remain tabular but drop secondary columns behind a "details" expand | Bento grid becomes 2-column |
| Desktop | > 1024px | Full two-tier layout as specified in §3.1 | Full bento layout as in §3.2 |

The dashboard is desktop-first in priority (per §1, principle 4) — mobile must be fully usable for checking status and approving/declining a flagged payment, but dense editing (e.g., a future guardrail rule-builder, §5) is acceptable to simplify or defer to desktop on small screens rather than cramming the full rule-builder UI into a phone width.

---

## 12. What This Spec Deliberately Does Not Include

Consistent with `PRD.md` §10 (Out of Scope) and `MyIdea.md`'s discipline about not padding scope:

- No dark-mode theme — single light theme (with the dark sidebar as an app-shell accent, not a theme toggle) is sufficient for the MVP and the demo; a true dark mode is a future addition, not specified here.
- No design for merchant-editable guardrail rules beyond the component note in §5 — the rule-builder pattern is specified so it's ready if that becomes a real feature, but its interaction behavior isn't designed since PRD scopes guardrails as backend-configured for MVP.
- No multi-brand/white-label theming — one visual identity only, matching the single-merchant-demo scope in PRD §10.
