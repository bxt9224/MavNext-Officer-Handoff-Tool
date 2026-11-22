---
name: mavnext-quality
description: >-
  Product purpose, architecture, data-safety, permission, branding, accessibility,
  GitHub Pages, and evidence standards for MavNext — a leadership workspace that helps
  student organization officers run their term and hand off each role. Every agent
  working on this repository MUST read this skill before changing anything.
---

# MavNext — Development Skill & Quality Guidelines

> **Revision history**
> - v1 (2026-11-20): Renamed from `officer-handoff`. MavNext name and brass/ivory palette; resume banner, demo-overwrite confirmation, character counters, aria states, pilot documentation.
> - v4 (2026-11-21): Noto Sans (self-hosted) replaces Inter; UTA heading weights; cinematic landing with GSAP/ScrollTrigger/Lenis (vendored); docs/uta-requirements.md is the reference for brand decisions.
> - v3 (2026-11-21): Supabase connected; email+password accounts with consent; onboarding (request to join / invitation / create); migration 002; security center. Rule: any schema change ships as a numbered migration AND in schema.sql, with tests in tests/rls_test*.py.
> - v2 (2026-11-20): Product expanded from one anonymous form to an organization workspace (meetings, tasks, handoffs, members, archive). The rule against a backend is **replaced**: shared accounts use Supabase with row-level security, off until configured. Blue/orange palette restored per the owner's brief. Storage split into isolated keys; the v1 draft key is read-only. Lessons from verification recorded in §12.

---

## 1. Product identity

- **Name:** MavNext. Exact capitalization.
- **What it is:** a workspace connecting organization → meetings and tasks → role handoff → incoming review → archive. The six-section handoff is the core feature.
- **Status:** independent student-developed pilot. Not an official UTA service; no endorsement, seal, mascot, or official-integration language. Keep the pilot notice discreet (sidebar footer, entry page, Settings), not inside the workflow.
- **Logo:** `assets/mavnext-logo.png` (original, transparent). `mavnext-logo-trimmed.png` and `mavnext-mark.png` are lossless crops. Never redraw, recolor, or stretch it; set only height or only width.

## 2. Architecture (keep)

- Plain HTML/CSS/JS, **no build step**, classic `<script>` tags (must open from `file://`), relative paths, hash routing (`#/…`) for GitHub Pages subpaths.
- Layers: `store.js` (adapters, session, migration) → `svc.js` (every write; permission checked) → views. Views never mutate records or touch `localStorage` directly.
- Shared components live in `ui.js` (dialog, confirm, badges, empty states, page header). Reuse them.
- Icons: the local outline set in `icons.js` only. No emoji navigation.

## 3. Storage and data safety

| Key | Owner | Rule |
|---|---|---|
| `mavnext.demo.v1` | Demo | Reset only via Settings → Reset demo |
| `mavnext.local.v1` | This-device workspace | Deleted only via Settings with confirmation |
| `mavnext.session.v1` | Active mode/org | — |
| `uta_officer_handoff_data` | v1 draft | **Read-only. Never write or remove.** Import copies only. |

- Never call `localStorage.clear()`. Destructive actions are scoped (Delete this draft, Cancel this meeting, Reset demo), confirmed, and say exactly what is and is not removed.
- `handoffVersions`, `handoffReviews`, and `activity` are append-only (enforced in `Store.put` and in SQL).
- Handoff status is **derived** from versions and reviews; never store an editable status.

## 4. Accounts and permissions

- Permission roles (`admin`, `officer`, `incoming`) are separate from officer titles.
- UI checks (`MN.can`) only decide what to show. Shared data is protected by `supabase/schema.sql`; change both together.
- Never: localStorage passwords, a shared club password, collecting passwords in an unfinished flow, or service-role keys/secrets in frontend code.
- The demo role switch is labeled "simulated, not a sign-in" and exists only in demo mode.
- Submitting or acknowledging a handoff never changes permissions. The last admin cannot be removed or demoted.
- Do not say "Invitation sent" or "delivered" unless a real service confirmed it. Today: demo = simulated; Supabase = a link the admin shares.

## 5. Handoff content rules

- The six sections and question ids in `sections.js` are stable (migration depends on them).
- Answering is the default; Unknown / Not applicable / Needs follow-up are compact secondary marks.
- Required questions must be answered or explicitly marked before submit. Never invent or auto-complete answers. Blank shows `[Not provided]`.
- Access sections describe procedures. Keep the privacy warning and the credential-pattern warning.
- Include tasks/meeting notes only when the user selects them; show them in review.
- Print/export the full record. Never truncate to fit one page.

## 6. Visual system

Primary `#0064B1`, navy text `#142638`, orange accent `#F58025` (**never for text**; logo + active-nav marker), page `#F6F8FB`, panels `#FFFFFF`, muted `#526176`, borders `#DCE3EC`. One sans family: Noto Sans, Verdana fallback (UTA web typeface); H1/H2 800, H3/H4 700, H5/H6 600, body 400. Titles ~28px, section headings 17–20px, body 14–16px, meta 12–14px. Sidebar 240px, topbar 64px, 8px spacing, 8–12px radii, thin borders, minimal shadow. No gradients, glass, decorative charts, or dead controls.

## 7. Honest copy

- Privacy text must match the active mode (local-only vs transmitted to the configured service).
- Never claim real login, shared storage, invitations, or delivery works until verified against a configured project.

## 8. Accessibility checklist

- Labels on all controls; skip link; `aria-current` on nav/steps; `aria-pressed` / `aria-selected` render as `"true"` / `"false"`.
- Dialogs: `role="dialog"`, `aria-modal`, focus trap, Escape closes, focus returns, background `inert`.
- Mobile ≤860px: sidebar becomes a drawer (Escape closes, focus managed). No horizontal overflow at 375px.
- Focus moves to the page title on navigation, but **not** on first load.

## 9. Verification standard

- Run the app and inspect real screenshots at desktop and 375px. Run the Playwright workflow checks (demo isolation, meeting → dashboard, linked task, autosave + refresh, submit + snapshot, incoming acknowledgment, review counts, long content print, mobile/keyboard, reset isolation).
- For SQL changes, run the policy tests against PostgreSQL with stand-in `auth.uid()` / `auth.jwt()`, and say clearly that this is not Supabase.
- Record actual results only. Mark anything unverified as unverified. Never invent user feedback, screenshots, or history.

## 10. GitHub Pages checklist

- [ ] Relative paths only; `index.html` at root; lowercase filenames.
- [ ] Deep link + refresh works under `/<repo>/`.
- [ ] Opens from `file://` without console errors.

## 11. Agents must never

- Commit, push, merge, reset, or publish (the team lead uses GitHub Desktop).
- Overwrite teammates' work or drafts without a preserved copy.
- Add analytics, external AI APIs, or any endpoint besides the configured Supabase project.
- Log user answers to the console.

## 12. Lessons learned (Iteration 3)

- A template helper that drops `true`/`false` silently breaks ARIA state attributes. Render booleans as strings and use ternaries for conditional markup.
- `position:absolute` screen-reader text inside an `overflow:auto` table wrapper escapes it unless the wrapper is positioned.
- In RLS subqueries, unqualified column names resolve to the *inner* table. `h.org_id = org_id` compares a column to itself. Always qualify with the policy's table name.
- Playwright `check()` on an element that re-renders after `change` times out. Click it, then assert the stored state.

## 13. Lessons learned (Iteration 4)

- Password accounts work from `file://` (double-click). Email links can't return to a file, so they go to the Site URL; leave `emailRedirectTo` unset from `file://` and use `siteUrl` from config for invitation links.
- With PKCE, email links must be opened in the browser that requested them. Password sign-in avoids this for everyday use.
- Supabase's default email sender only reaches project team members (about 2 per hour) and templates can't be edited without custom SMTP. Don't design flows that depend on custom template content.
- Browsers drop a `<form>` nested inside another form. Keep status/result areas outside forms that get re-rendered.
- After copying files to the team folder, verify checksums; a just-written output can be read stale.
- Supabase's SQL editor warns on `drop ... if exists`; migrations should only drop objects they immediately recreate.

## 14. Landing page and motion rules (Iteration 5)

- The landing page is `MN.views.entry` (`js/views-landing.js`); motion lives only in `js/landing-motion.js`. `MN.onLeave` must tear it down before any other route renders.
- Exactly one loop: Lenis (`autoRaf: false`) runs from `gsap.ticker`. Register ScrollTrigger once. Never add another requestAnimationFrame loop.
- Content must be fully visible without the libraries. Only GSAP sets initial hidden states. Under `prefers-reduced-motion`, nothing animates and Lenis is off.
- Use the logo only on white surfaces. Never recolor, reverse, crop, or animate parts of it. Use no UTA seal, mascot, or signature.
- Bright UTA Orange is decorative only. Check contrast for any new text color, including on #F6F8FB.
- Photos come only from `assets/photos/` with a permission record. Never use generated people presented as UTA students, or another campus labeled as UTA.
- Fonts opened from `file://` are blocked unless embedded (data URIs). Don't switch back to plain font files without keeping that fallback.
- ScrollTrigger `once: true` triggers remove themselves; count triggers on a fresh load when testing for duplicates.
