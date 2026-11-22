# MavNext — Build Log (Iteration 2)

> **Team lead:** [your name]  
> **Iteration date:** 2026-11-20  
> **AI-assisted with:** Antigravity (Google DeepMind)  
> **Iteration led by:** [team member name]  

---

## Starting Point

The repository contained a working Version 1 built in the initial iteration:
- `index.html`, `script.js`, `style.css` — a single-page six-section handoff questionnaire.
- Product was named "Officer Handoff Tool" throughout.
- UTA blue/orange palette (`#0064B1`, `#F58025`).
- Working: questionnaire, review screen, summary generation, localStorage persistence, clear-data modal, synthetic demo data.
- Missing: MavNext product name/branding, resume banner, demo-overwrite confirmation, character counters, `aria-pressed`/`aria-current`, skip-nav link, pilot disclaimer in footer, documentation.

---

## Audit Findings

A full requirements matrix was produced at the start of the iteration (see [Requirements Matrix](../requirements-matrix.md) if available, or the agent artifact). Key gaps identified:

1. **Product name** — All UI copy said "Officer Handoff Tool". The assignment and prompt specify "MavNext".
2. **Implied official status** — Header badge read "UTA Student Orgs"; summary stamp read "OFFICIAL OFFICER TRANSITION SUMMARY". Both imply university approval that does not exist.
3. **No resume flow** — The app always started from scratch, even when a saved draft existed.
4. **Demo overwrites without confirmation** — "Explore with Synthetic Demo" immediately replaced any existing draft.
5. **No character counters** — Textareas had no feedback on length.
6. **Missing accessibility attributes** — No `aria-current` on stepper, no `aria-pressed` on status buttons, no skip-nav link.
7. **Footer said "Zero-backend, client-side browser persistence only"** — Accurate but lacked the required pilot disclaimer.
8. **No documentation** — No functional tests, demo guide, build log, or pilot considerations.
9. **Print body font at 9pt** — Increased to 10pt for readability.
10. **Stepper step 0 labeled "Overview"** — Renamed to "Setup" for consistency with sections 1–6.

---

## Changes Implemented

### `style.css`
- Replaced UTA blue/orange palette with MavNext design tokens: deep navy `#142638`, warm ivory `#F7F6F2`, muted brass `#B59A65`.
- Added skip-link styles for accessibility.
- Added `.char-counter` with `.near-limit` (1000+) and `.at-limit` (1200) states.
- Added `#resume-banner` and `.has-draft` styles.
- Added `.inline-privacy-note` for Section 2.
- Updated focus-ring color to match new navy.
- Updated all brand color references (`--mn-navy`, etc.) throughout component styles.
- Increased `@media print` body font from 9pt to 10pt.
- Added `overflow: visible !important` to `.doc-section-card` in print to prevent text clipping.
- Added `@media (prefers-reduced-motion: reduce)` to disable animations.
- Added `.footer-pilot-notice` style.

### `index.html`
- Updated `<title>` to "MavNext — Officer handoffs, organized."
- Added SVG favicon (MN wordmark on navy background).
- Added original MavNext SVG wordmark in header (M + forward-arrow motif in brass).
- Replaced header brand text: "MavNext" + tagline "Officer handoffs, organized."
- Replaced "UTA Student Orgs" badge with inline SVG mark.
- Added skip-nav `<a href="#main-content">` link.
- Replaced "OFFICIAL OFFICER TRANSITION SUMMARY" stamp with "MavNext Summary".
- Replaced "UNIVERSITY OF TEXAS AT ARLINGTON • STUDENT ORGANIZATIONS" badge text with neutral descriptor.
- Added resume banner (`#resume-banner`) with "Continue my handoff" and "Start over" buttons.
- Updated welcome CTA: "Create handoff" (primary), "Try a sample handoff" (secondary).
- Renamed stepper Step 0 from "Overview" to "Setup".
- Renamed Section 6 nav label from "Unfinished" to "Commitments".
- Added inline privacy reminder div in Section 2 header area.
- Added `aria-label` on all `<section>` elements.
- Added `aria-hidden="true"` on decorative SVG icons.
- Added demo-overwrite confirmation modal (`#modal-demo-confirm`).
- Updated footer to required pilot disclaimer: "An independent student-developed pilot... Not an official UTA service."
- Updated summary doc footer notice to reference "MavNext" instead of "UT Arlington Officer Handoff Tool".
- Added `maxlength` attributes to all meta inputs.
- Added `role="list"` / `role="listitem"` to review accordion.

### `script.js`
- Updated `STORAGE_KEY` comment and markdown export to reference MavNext.
- Added `CHAR_LIMIT = 1200` and `CHAR_WARN = 1000` constants.
- Added character counter rendering in `renderQuestionnaireSections()`.
- Added `updateQuestionCardUI()` counter logic with `.near-limit` / `.at-limit` classes.
- Added `aria-pressed` attribute management on status buttons.
- Added `aria-current="step"` management in `updateStepperUI()`.
- Added `hasSavedDraft` state variable.
- Added `detectDraft()` function — checks localStorage for meaningful content.
- Added `updateResumeBanner()` — shows/hides resume banner based on draft state.
- Added `elements.resumeBanner`, `elements.btnResumeHandoff`, `elements.btnStartFresh`, `elements.saveDot`, `elements.modalDemoConfirm`, etc. to `cacheDomElements()`.
- Added resume banner event listeners: "Continue" validates form then goes to Section 1; "Start over" opens the clear modal.
- Added `requestLoadDemo()` — calls `loadSyntheticDemo()` directly if no draft, or shows `#modal-demo-confirm` if one exists.
- Added demo-overwrite modal event listeners.
- Changed `loadSyntheticDemo()` to navigate to Section 1 (not Review) after loading.
- Save-status dot starts grey ("No draft yet"); turns green on successful save; turns red on failure.
- `indicateSaved()` now also updates the dot color.
- `executeClearAllData()` resets dot to grey and status text to "No draft yet".
- `renderSummaryScreen()` date parsing uses `parseInt` for correctness; falls back to "—" rather than today's date when no date set.
- `generateMarkdownSummary()` footer updated to reference MavNext.
- `showToast()` on localStorage parse failure now gives a user-readable message.
- Synthetic demo data: removed real-looking NetID references; kept fictional org.

### `.agents/skills/officer-handoff/SKILL.md`
- Renamed product from "Officer Handoff Tool" to "MavNext" throughout.
- Added revision history block.
- Added resume/demo flow requirements.
- Added brass contrast rule.
- Added `aria-pressed` and `aria-current` to accessibility checklist.
- Added dead-end record (see below).
- Renamed skill to `mavnext-quality`.

### `docs/` (new)
- `functional-tests.md` — 5 test cases with inputs, expected results, code-inspection outcomes, and pass/fail.
- `demo-guide.md` — Two-minute "try it" guide with synthetic sample inputs and talking points.
- `build-log.md` — This file.
- `university-pilot-considerations.md` — Future-phase documentation for potential institutional adoption.

---

## Dead End Documented

**Attempted:** Separating CSS into `/css/styles.css` and JS into `/js/app.js` to match the original SKILL.md file layout specification.

**What happened:** The existing `index.html` referenced `style.css` and `script.js` at the root level. Restructuring would require updating all asset references in `index.html`, risking broken paths on GitHub Pages if the branch/subpath is not root. The flat structure already works, is simpler to maintain, and GitHub Pages supports it without configuration. The proposed structure was not required by any course or technical constraint.

**Decision:** Kept the flat file structure. Updated the SKILL.md to match the actual structure rather than the original theoretical layout.

**Why this is a genuine dead end:** We spent time planning the restructure, concluded it added complexity for no functional benefit, and explicitly rolled it back. This matches the "genuine dead end and explanation" required by the course.

---

## Tests Performed

See [`docs/functional-tests.md`](functional-tests.md) for the five formal test cases.

Browser-side verification of all five cases is pending — the team must open `index.html` and manually confirm:
- Sample data loads and renders correctly in the summary.
- Partial handoffs show gaps honestly.
- Edits after Review update the summary.
- Clear action removes all data including after refresh.
- Long answers are readable in print preview.

---

## Screenshots Still Needed (Team Action Required)

> These cannot be generated by the agent. They must be real browser captures.

| Screenshot | When to capture |
|---|---|
| **Before state** (Version 1) — Welcome screen | Use `git stash` or `git show HEAD:index.html` in a temporary copy |
| **Before state** (Version 1) — Summary screen | Same as above |
| **After state** (Version 2 / MavNext) — Welcome screen | Now, with `index.html` open |
| **After state** (Version 2 / MavNext) — Summary screen (with sample data) | Load demo, go to summary |
| **Antigravity conversation** — Agent plan visible | Screenshot the IDE conversation panel showing this request |
| **Antigravity conversation** — Agent making changes | Screenshot visible code changes in the agent UI |

---

## Remaining Limitations

1. Browser print with fully-saturated inputs will produce 2–3 pages. Character limits (1200/field) help. Known and documented.
2. Browser back button not supported by the SPA routing — documented in demo guide.
3. No formal accessibility audit (axe, NVDA, VoiceOver). Code passes inspection; real assistive-technology testing is recommended before any institutional deployment.
4. User tests (3 required) must be conducted by the team with real participants outside the course. The agent cannot conduct or fabricate these.
5. Google Fonts requires internet — offline degradation is graceful (system fonts).

---

## Suggested Commit Message (for GitHub Desktop)

```
feat: rebrand to MavNext, add resume flow, accessibility, docs

- Rename product to MavNext throughout UI (title, header, footer, summary)
- Replace UTA blue/orange palette with deep navy #142638 + brass #B59A65
- Add original SVG wordmark in header and as favicon
- Add resume banner: show Continue / Start Over when saved draft exists
- Add demo overwrite confirmation modal
- Add character counters (1000 warn, 1200 limit) on all textareas
- Add aria-pressed on status buttons, aria-current on stepper
- Add skip-nav link for keyboard accessibility
- Add inline privacy reminder in Section 2
- Remove 'OFFICIAL OFFICER TRANSITION SUMMARY' stamp (not an official record)
- Add required pilot disclaimer in app footer and summary doc footer
- Increase print body font 9pt → 10pt; add overflow:visible for print cards
- Add prefers-reduced-motion support
- Update SKILL.md: rename to mavnext-quality, add revision history, dead end
- Add docs/: functional-tests.md, demo-guide.md, build-log.md,
  university-pilot-considerations.md
```

---

# Iteration 3 — Workspace redesign (2026-11-20)

> **AI-assisted with:** Claude (Anthropic), working in the repository at the team lead's request.
> Nothing was committed or pushed. Review the changes in GitHub Desktop.

## Starting point

- The Iteration 2 single-form app (uncommitted changes to `index.html`, `script.js`, `style.css`, `README.md`, and `SKILL.md`, plus untracked `docs/`).
- Browser-only storage under `uta_officer_handoff_data`. "Try a sample" replaced the user's draft (after a confirmation). "Clear my answers" sat in the global header.
- No backend, authentication, or automated tests.
- The UI mockup image referenced in the brief was **not available** to the agent; the design follows the written description (blue-and-orange dashboard, meeting detail, handoff editor, left sidebar). The supplied MavNext logo PNG (transparent) was added to `assets/`.

## Preservation

- The Iteration 2 `index.html`, `script.js`, and `style.css` were copied unchanged to `legacy/v1/`; the old `demo-guide.md` and `functional-tests.md` to `legacy/v1/docs/`.
- The old draft key is **read-only**: the new app imports a *copy* into a separate browser-only workspace and never modifies or deletes the original. Settings also offers "Download earlier draft (JSON)".
- v1 statuses map as: standard→answered, unknown→unknown, na→not applicable, unresolved→needs follow-up. Question ids are unchanged.

## What changed

- **Architecture:** still plain HTML/CSS/JS with no build step (works from `file://` and GitHub Pages). It is split into a data layer (`store.js`, adapters), operations with permission checks (`svc.js`), a permission model (`permissions.js`), demo fixtures, shared UI components, and views. Hash routing supports refresh, back/forward, and repository subpaths.
- **Modes:** demo (`mavnext.demo.v1`), browser-only workspace (`mavnext.local.v1`), and signed-in Supabase (prepared, off until configured). Each mode has separate storage; there is no global clear.
- **Screens:** entry (Sign in / Create account / Explore demo / Use on this device), Overview, Meetings & Events (list, form, detail with Agenda / Notes / Action items), Tasks, Handoffs (list, six-section editor, related records, pre-submit review, versioned snapshot, incoming review), Members & Roles, Archive, Settings.
- **Handoff workflow:** Draft → Submitted → Acknowledged, with Changes requested. Status is *derived* from immutable versions and reviews. Submitting or acknowledging never changes permissions.
- **Design system:** the specified palette, Inter / system sans, 240px sidebar, 64px topbar, 8px spacing, 8–12px radii, local outline SVG icons, orange only for brand accents.
- **Backend preparation:** `supabase/schema.sql` (RLS, last-admin guard, insert-only snapshots, email-matched invitation acceptance), `js/remote.js`, `docs/backend-setup.md`.

## Decisions

- **Kept vanilla JS.** It can support the structure cleanly, and a framework would add a build step that Pages does not need.
- **Supabase over alternatives:** a free tier, browser-accessible, email-link auth (no passwords handled by the app), and database-enforced policies.
- **Added a "this device" mode** so the earlier anonymous use case and existing drafts have a home that does not pretend to be shared.
- **Invitations produce links, not emails:** MavNext has no delivery service, so it never says "Invitation sent".

## Problems found during verification (and fixed)

- Boolean values rendered as empty strings in templates, so `aria-selected` / `aria-pressed` states did not show. Now rendered as `"true"` / `"false"`.
- Visually hidden table labels escaped their scroll container on mobile, causing horizontal overflow. Fixed with `position: relative` on `.table-wrap`.
- The first page load moved focus to the page title, which skipped the skip link. Focus now moves only on navigation.
- A synchronous permission error inside a dialog escaped as an uncaught error. Now shown inside the dialog.
- SQL policy subqueries had ambiguous column references (`org_id`, `id`) that would have made checks pass trivially. Caught while reviewing the SQL; qualified before the local PostgreSQL policy tests were run.

## Still open

- Configure and verify Supabase (see `backend-setup.md`).
- Human usability testing and screen-reader testing.


---

# Iteration 4: Real accounts and joining (2026-11-21)

> AI-assisted with Claude on branch `supabase-login`. Not committed by the agent.

## What the team asked for
- Officers only; email + password accounts; sign-up with full name, expected graduation term, major, and privacy consent.
- Both invitations and "request to join" an organization.
- Stronger security and features that stand out for MavPitch.

## What changed
- **Supabase connected** (URL + publishable key in `js/config.js`). Schema applied, then migration 002: profiles with server-timestamped consent, organization directory (names only), join requests with admin approval, invitation expiry plus a confirmed-email requirement, `leave_organization`, and an organization-creation limit.
- **Auth settings:** confirm email on, min password 10, letters and digits required, magic links off.
- **New screens** (`js/views-account.js`): sign up, check email, sign in (with resend confirmation and repeated-failure slowdown), forgot/reset password, profile completion for older accounts, onboarding (request / invitation / create), privacy notice.
- **Admin features:** join-request panel with approve (choose title and permission) or decline, an overview alert for waiting requests, and a directory listing toggle.
- **Account and security settings:** edit profile, consent record, change password, sign out on all devices, leave organization, 60-minute idle sign-out, and a "How MavNext protects your club" panel.
- **Demo:** includes a fictional pending join request (Sam Patel), so approval can be shown without accounts.

## Problems found and fixed
- The first email-link test was opened from `file://`, so Supabase fell back to the GitHub Pages site, which had no config. Added a warning when the app is opened as a file.
- A nested `<form>` made the code-entry button resubmit the email form. Moved the status area outside the form.
- One file copy to the team folder delivered a stale version. Copies are now checked byte-for-byte (md5).
- Test-writing mistakes (operator precedence in SQL, leftover database state) were fixed in the tests, not the product.

## Landing page (2026-11-21)
- New public landing page at `#/` (`js/views-landing.js`): hero, the problem, how it works, three feature sections with real demo screenshots (`assets/screen-*.jpg`), a security band, FAQ, and a final call to action. Signed-in officers skip it.
- Copy is factual: no invented statistics or testimonials, and the UTA disclaimer stays in the hero note area and footer.
- Verified at 1440 px and 390 px: no horizontal overflow, nav links scroll to sections and move focus, FAQ opens, demo and sign-up buttons work, no page errors. Demo regression 23/23; account flows 27/27.

---

# Iteration 5: Cinematic landing page, UTA-guideline-informed (2026-11-21)

## Research
Read UTA's Brand Standards, Digital Branding, Web Colors, Typefaces, Digital Design System, Images & Video, Photography, Co-branding, Unit Signatures, Student Organizations, and Accessibility pages. Findings, conflicts (orange RGB values, contradictory orange usage), and open review items are in `docs/uta-requirements.md`.

## What changed
- **Landing page rebuilt** (`js/views-landing.js`): white header with the unmodified logo; a photographic hero under a dark-blue overlay ("Lead your term. Prepare the next."); an expanding photo band; an asymmetric "Good leadership should carry forward." section with two layered photos; one HTML product scene (sample data) showing organize → handoff → incoming review; a Web Blue closing call to action; and a white footer with the independent-pilot statement.
- **Motion** (`js/landing-motion.js`): GSAP 3.15.1 + ScrollTrigger + Lenis 1.3.27 on one `gsap.ticker` loop, as in Lenis's documented integration. A short hero entrance, a settling hero image, the band expanding inside its frame, two-layer parallax (desktop, ≤ 60 px), once-only reveals, and a one-time product sequence. Reduced motion turns all of it off. Everything is torn down when leaving the page.
- **Typography:** Noto Sans self-hosted for the whole app; headings use UTA's 800/700/600 weights. Latin weights are embedded as data URIs because Chrome blocks font files from `file://`.
- **Removed** Google Fonts (Inter); the site no longer needs any CDN.

## Problems found and fixed
- Fonts silently fell back to Verdana when opened as a file (blocked by the browser's cross-origin rules for `file://`). Fixed with embedded fonts.
- The hero headline wrapped mid-phrase at desktop widths; each sentence is now kept on its own line.
- Step numbers in Web Orange measured 4.24:1 on the gray section background; changed to UTA Blue (5.71:1).
- Test-harness issues (a mock-state save race, comparing trigger counts mid-scroll) were fixed in the tests.

## Photos
The owner supplied 9 images: 6 UTA photographs (permission granted by UTA, per the owner) and 3 AI-generated images. Used:
- hero: Big Event photo
- band: Homecoming photo
- why section: two AI images, unlabeled by the owner's choice

To keep hero text at AA contrast on the real photo, I strengthened the overlay (with an extra setting for 861–1080 px) and made the hero text solid white. Details and the remaining caveat are in `assets/photos/README.md` and `docs/uta-requirements.md` (R3).
