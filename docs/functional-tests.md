# MavNext — Functional Tests

## Iteration 4: accounts, joining, security (2026-11-21)

All results are from automated runs on 2026-11-21. Nothing here is from human user testing.

| Suite | What it covers | Result |
|---|---|---|
| `tests/functional.py` | Demo and browser-only workflows (unchanged suite) | 23/23 pass |
| `tests/accounts_mock.py` | Sign-up validation, password rules, unconfirmed sign-in, profile completion, onboarding, directory, join request → admin approval, settings, password change and reset, invitations while signed out, privacy page, mobile sign-up. Runs the real app against an **in-browser stand-in** for Supabase. | 27/27 pass |
| `tests/rls_test.py` | Original database rules (001), local PostgreSQL 16 | 34/34 pass |
| `tests/rls_test2.py` | Migration 002 rules, local PostgreSQL 16 | 38/38 pass |
| Live project, logged out | REST calls with the publishable key to all tables and the new functions | All denied (401) |

**Not yet verified:** a real person signing up, confirming email, and signing in on the live project; two real accounts checking each other's isolation.

### Migration 002 database checks

| Check | Result |
|---|---|
| sign-up creates profile from consented metadata | Pass |
| no profile without consent | Pass |
| profiles are private to their owner | Pass |
| cannot edit another profile | Pass |
| consent time cannot be backdated | Pass |
| user without profile can complete own profile | Pass |
| create_organization: profile name + title, admin | Pass |
| org name length enforced | Pass |
| directory lists names of listed orgs only | Pass |
| directory search | Pass |
| anonymous cannot use directory | Pass |
| directory does not grant read access to org | Pass |
| no direct inserts into join_requests | Pass |
| request_to_join works | Pass |
| only one pending request per org | Pass |
| cannot request unlisted org | Pass |
| a second user can also request (one pending each) | Pass |
| pending request grants no membership | Pass |
| other users cannot see requests | Pass |
| requester sees own request | Pass |
| admin sees org requests | Pass |
| requester cannot approve self | Pass |
| admin approves | Pass |
| approved member has chosen permission/title | Pass |
| approved member can now read org | Pass |
| approval recorded in activity | Pass |
| request cannot be decided twice | Pass |
| cannot cancel someone else's request | Pass |
| requester can cancel own | Pass |
| unconfirmed email cannot accept invitation | Pass |
| expired invitation rejected | Pass |
| valid invitation accepted | Pass |
| invited member gets profile name | Pass |
| last admin cannot leave | Pass |
| member can leave | Pass |
| after leaving, no access | Pass |
| former member can rejoin through approval | Pass |
| internal membership helper not callable | Pass |

---

## Iteration 3 — workspace redesign (2026-11-20)

**How these were run:** automated Playwright scripts in headless Google Chrome against the app served locally (`python -m http.server`). Desktop viewport 1366×900; mobile 375×780. Results below are the actual output of the final run. No human user testing is reported here.

### Browser workflows (demo and this-device modes)

| Test | Result | Observed |
|---|---|---|
| 0. Earlier draft detected on entry | Pass | entry screen notes the earlier draft by org name |
| 0b. Earlier draft imported as copy | Pass | imported text="Real draft text — must survive", legacy key unchanged |
| 0c. v1 "unresolved" migrated to "Needs follow-up" | Pass | aria-pressed=true |
| 1. Enter demo without overwriting existing drafts | Pass | local workspace and v1 draft byte-identical after entering demo; demo stored under its own key |
| 2. Create meeting and see it on the dashboard | Pass | upcoming 2->3; agenda items=3 |
| 3. Linked task created, shown once, completed, persisted | Pass | records=1, linked to meeting=True, my open 3->2, stored status=done |
| 4. Handoff answer autosaves and restores after refresh | Pass | restored: "1. Update roster. 2. Meet advisor. 3. Tr" |
| 7a. Review lists missing required, unknown, follow-up, blank | Pass | missing "Reimbursements" flagged; submit disabled while required item empty |
| 7b. Review counts match stored answer states | Pass | shown={'followup': '1', 'unknown': '1', 'blank': '14'} computed={'followup': 1, 'unknown': 1, 'blank': 14} |
| 5a. Submit requires recipient confirmation, creates v1 | Pass | confirmation enforced; snapshot view shows version 1 |
| 5b. Submitted snapshot preserved after later edits | Pass | v1 still shows original mission text |
| 6a. Incoming officer permissions | Pass | review prompt shown, no create buttons, sees only own task ["Read last year's competition rules summary"], editor redirects to read-only view |
| 6b. Clarification → v2 → acknowledgment | Pass | changes-requested notice shown to outgoing; v2 submitted; acknowledged; David permission still "incoming"; v1 readable |
| 8. Long content prints in full (no truncation) | Pass | 2000-char answer fully present; sidebar hidden in print; PDF pages=4 |
| 10. Reset demo leaves other records untouched | Pass | demo restored; local workspace and v1 draft byte-identical; dialog explains scope |
| Extra: last administrator cannot be demoted | Pass | Dialog stays open with "This is the only administrator. Make someone else an administrator first." |
| Extra: cancelling a meeting keeps its tasks | Pass | ['cancelled', 3] |
| Extra: delete only this draft | Pass | remaining=['President', 'Treasurer'] |
| 9a. Mobile drawer and no horizontal overflow | Pass | overflow=[]; drawer open/focus=[True, True, 'true']; Esc closes & returns focus=[True, True] |
| 9b. Keyboard: skip link, dialog focus trap, Escape, focus return | Pass | dialog first focus=td-title, trapped=True, returned to "New task", skip link -> #main-content |
| Extra: org selector lists only memberships | Pass | David sees ['Riverside Robotics Society']; Maya also belongs to Women in Computing |
| Extra: new workspace shows empty states, no invented activity | Pass | Women in Computing (empty demo org) |
| Console errors | Pass | none |

Also checked:
- Opening `index.html` directly from `file://` loads and enters the demo with no errors.
- Under a GitHub Pages-style subpath (`/Officer-Handoff-Tool/`), a deep link to a handoff section survives refresh, and browser Back returns to the previous page.
- The sidebar logo renders at 175×30 px from the 1870×320 trimmed source (aspect ratio preserved).

### Database access policies (`supabase/schema.sql`)

Run against **local PostgreSQL 16** with stand-in `auth.uid()` / `auth.jwt()` functions and `authenticated` role, **not** against a Supabase project. Tests the policy logic only.

| Test | Result |
|---|---|
| create_organization makes caller admin | Pass |
| admin creates invitation | Pass |
| non-member cannot create invitation | Pass |
| invitation rejected for different email | Pass |
| invitation accepted by matching email | Pass |
| invitation cannot be reused | Pass |
| officer cannot self-promote | Pass |
| last admin cannot demote self | Pass |
| Eve sees only her org | Pass |
| Eve cannot read Org A memberships | Pass |
| Eve cannot write into Org A | Pass |
| admin creates meeting | Pass |
| incoming officer cannot create meeting | Pass |
| officer cannot cancel others' meeting | Pass |
| Eve cannot read Org A meetings | Pass |
| incoming sees only assigned tasks | Pass |
| incoming can complete own task | Pass |
| incoming cannot edit other task fields | Pass |
| incoming cannot touch unassigned task | Pass |
| officer creates own handoff | Pass |
| officer cannot create handoff for someone else | Pass |
| incoming cannot see unsubmitted draft | Pass |
| outgoing submits v1 | Pass |
| version numbers must be sequential | Pass |
| submitted snapshot cannot be modified | Pass |
| submitted snapshot cannot be deleted (even admin) | Pass |
| submitted handoff cannot be deleted | Pass |
| incoming sees handoff after submission | Pass |
| outgoing cannot acknowledge own handoff | Pass |
| incoming acknowledges | Pass |
| acknowledging does not grant admin | Pass |
| incoming cannot edit handoff | Pass |
| Eve cannot read Org A versions | Pass |
| anonymous cannot create organization | Pass |

### Colour contrast (computed WCAG 2.1 ratios)

| Pair | Ratio |
|---|---|
| Navy `#142638` on white | 15.39 |
| Muted `#526176` on page `#F6F8FB` | 5.93 |
| White on primary blue `#0064B1` | 6.07 |
| Blue `#0064B1` on blue tint (active nav) | 5.32 |
| Amber text on demo bar | 6.24 |
| Green status text on tint | 4.73 |
| Placeholder `#5F6C7E` on white | ≥4.5 (adjusted from 4.49) |
| Orange `#F58025` on white | 2.63 — **not used for text**; logo and active-nav marker only |

### Not verified

- Real sign-in, sign-out, invitation acceptance, shared storage, and organization isolation through the Supabase API (no project configured).
- Screen reader behaviour (no assistive-technology testing).
- Browsers other than Chromium.

---

## Iteration 2 — single-form app (historical)

The tests below were written for the previous single-form version (now in `legacy/v1/`). They are kept for the record and no longer describe the current app.


> Test date: 2026-11-20  
> Tester: AI-assisted iteration (Antigravity)  
> Environment: Static files opened in browser — no server required  

> [!IMPORTANT]
> Tests marked **Browser verification needed** require a human to open `index.html` and confirm the described behavior. The agent verified logic by code inspection; it cannot substitute for real browser execution.

---

## Test Case 1 — Complete Synthetic Handoff: Answers Appear Accurately in Summary

**Objective:** A fully completed handoff (via sample data) renders all answers faithfully in the summary, with no invented content.

**Input:**
1. Open `index.html` in a browser.
2. Click "Try a sample" (or "Try a sample handoff" on the welcome screen).
3. Confirm the overwrite dialog (if a draft exists).
4. Navigate through Sections 1–6 and observe that all fields are filled with UTA Maverick Robotics Society (fictional) data.
5. Navigate to Review, then click "View Summary →".

**Expected result:**
- Summary document header shows: Org = "UTA Maverick Robotics Society", Role = "President", Outgoing = "Maya Lin", Incoming = "David Kim".
- All 24 questions show their synthetic text — no `[Not Provided]` tags.
- Three Section 6 items (`q_pending_contracts`, `q_university_inquiries`, `q_immediate_next_steps`) appear in the **Priority Action Items** callout.
- Document status reads "3 Action Items Pending".
- No passwords, real names, or sensitive data appear anywhere.

**Actual result:** _(Browser verification needed)_  
**Code-inspection result:** PASS — `renderSummaryScreen()` reads directly from `appState.answers`; `escapeHtml()` applied to all user content; unresolved items collected from status=`unresolved`; `[Not Provided]` tag only rendered when `text.trim().length === 0` and status is `standard`.

**Pass / Fail:** Code: PASS | Browser: Pending  
**Notes:** Demo data includes fictional org and names. Verify no UTA-specific real data is present.

---

## Test Case 2 — Partial Handoff with Unknown/Unresolved Items: Gaps Remain Visible

**Objective:** An incomplete handoff exports without inventing answers. Unknown and blank items are clearly labeled.

**Input:**
1. Open `index.html` fresh (or after clearing).
2. Enter org name "Test Org" and select role "Treasurer". Click "Create handoff".
3. In Section 1: answer only `q_mission`. Leave the remaining 3 blank.
4. In Section 1: for `q_campus_relations`, click "Mark as Unknown".
5. In Section 2: for `q_mavorgs_transfer`, click "Flag as Unresolved" and type a note.
6. Leave all other sections blank.
7. Navigate to Review, then click "View Summary →".

**Expected result:**
- Review metrics: Answered ≥ 1, Unknown = 1, Unresolved = 1, Missing ≥ several.
- Summary Section 1 shows answered text for `q_mission`.
- `q_campus_relations` shows `[Marked as Unknown / Research Needed]`.
- Blank questions show `[Not Provided — Outgoing Officer Did Not Enter a Response]`.
- `q_mavorgs_transfer` appears in the Priority Action Items callout with the entered note.
- No field shows invented or assumed text.

**Actual result:** _(Browser verification needed)_  
**Code-inspection result:** PASS — `renderSummaryScreen()` has distinct branches for each status; blank standard answers render the `doc-tag-missing` span; unknown/na/unresolved each render labeled tags only.

**Pass / Fail:** Code: PASS | Browser: Pending  
**Notes:** Verify that "unknown" does not appear in the Answered count on the Review screen.

---

## Test Case 3 — Edit After Review: Navigation Preserves Data and Summary Updates

**Objective:** Navigating back from Review or Summary to a section, editing an answer, then returning to Summary shows the updated content.

**Input:**
1. Load sample data. Navigate to Review.
2. Click "Edit Section 1" on the Review screen.
3. Change the text in `q_mission` to "EDITED CONTENT".
4. Navigate to Review (stepper or nav button), then click "View Summary →".

**Expected result:**
- Section 1 of the summary shows "EDITED CONTENT" in the Role Mission field.
- All other answers are unchanged.
- Save-status indicator shows "Saved to browser" after the edit.

**Actual result:** _(Browser verification needed)_  
**Code-inspection result:** PASS — `appState` is a single in-memory object; textarea `input` listener writes directly to `appState.answers[q.id].text`; `renderSummaryScreen()` re-reads from `appState` fresh on each call; `scheduleSave()` persists to localStorage within 300ms.

**Pass / Fail:** Code: PASS | Browser: Pending  
**Notes:** Also test that navigating with the browser back button does not break state (note: browser back is not supported by the SPA — this is a known limitation).

---

## Test Case 4 — Clear Draft: All App Answers Disappear, Including After Refresh

**Objective:** "Clear my answers" removes all stored data from localStorage and resets the UI.

**Input:**
1. Load sample data. Confirm data is visible in Section 1.
2. Click "Clear my answers" in the top-right header.
3. Click "Yes, clear everything" in the confirmation modal.
4. Observe the UI.
5. Refresh the page (`F5` or `Ctrl+R`).
6. Inspect `localStorage` in DevTools (Application > Local Storage).

**Expected result:**
- After step 3: welcome screen shown, all form fields blank, save-status reads "No draft yet".
- Resume banner is not visible.
- After step 5: same blank welcome screen — no draft reloaded.
- After step 6: `uta_officer_handoff_data` key is absent from localStorage.

**Actual result:** _(Browser verification needed)_  
**Code-inspection result:** PASS — `executeClearAllData()` calls `localStorage.removeItem(STORAGE_KEY)`, resets `appState` to `defaultState`, calls `syncMetaFormFromState()`, `syncAllQuestionCardsFromState()`, `updateResumeBanner()`, and `navigateToScreen('welcome')`. Save-status and dot are reset to "No draft yet" and grey.

**Pass / Fail:** Code: PASS | Browser: Pending  
**Notes:** Verify that the modal text includes the note "It does not remove any copies you have already printed or downloaded."

---

## Test Case 5 — Long Realistic Answers and Print: Text Remains Readable and Complete

**Objective:** When an officer enters realistic maximum-length answers, the summary is readable and complete in print/PDF. No text is clipped or hidden.

**Input:**
1. Load sample data.
2. In Section 5 (`q_signature_events`), replace the existing text with a ~1000-character realistic answer (multiple sentences describing events).
3. Navigate to Summary.
4. Click "Print / Save PDF" and use browser print preview.

**Expected result:**
- Character counter shows the count approaching 1000 (warning color at ≥1000, error color at 1200 limit).
- In print preview: all entered text is visible. No text is cut off. Section cards wrap rather than clip.
- Summary fits within 2 pages at most on US Letter.
- Navigation, buttons, and header are hidden from the print view.

**Actual result:** _(Browser verification needed)_  
**Code-inspection result:** PASS (partial) — `maxlength="${CHAR_LIMIT}"` enforces the 1200 character limit at the browser level. `white-space: pre-line` on `.doc-entry-body` preserves line breaks. `overflow: visible !important` applied to `.doc-section-card` in `@media print`. Long answers will push to 2 pages with realistic inputs — this is documented as a known limitation rather than a failure.

**Pass / Fail:** Code: PASS (with known limitation) | Browser: Pending  
**Notes:** Very long answers across all 24 fields will exceed one page. This is honest behavior. The summary is designed for concise inputs; prompts encourage officers to be specific but brief.

---

## Additional Checks (Inspection-Only)

| Check | Status | Notes |
|---|---|---|
| Mobile layout (375px) | Code: PASS | `grid-template-columns: 1fr` at ≤640px; stepper scrolls horizontally |
| Keyboard tab order | Code: PASS | All buttons, inputs, selects, textareas are naturally focusable; skip-link at top |
| Refresh behavior | Code: PASS | localStorage loads on `init()` → `loadFromLocalStorage()` |
| Empty state (fresh load) | Code: PASS | Resume banner hidden; "No draft yet" in save-status |
| Storage failure (full) | Code: PASS | `indicateSaved(false)` shows "Save failed — storage may be full" |
| Browser console errors | Browser: Pending | Open DevTools and check Console tab |
| Print output | Browser: Pending | Requires real print-preview inspection |
| Broken or inactive controls | Code: PASS | All buttons have event listeners attached in `attachEventListeners()` |

---

## Known Limitations

1. **Browser back button** does not navigate between sections — this is a single-page app with JS-managed routing. Document this in the demo guide.
2. **Print layout with maximum inputs** may exceed one page. Character limits (1200/field) help contain this, but 24 fully-saturated fields will likely produce 2–3 pages.
3. **Copy Text button uses `execCommand` fallback** in browsers without Clipboard API — works but `execCommand` is deprecated. No user impact currently.
4. **Google Fonts CDN** requires internet access. If offline, Inter and Merriweather fall back gracefully to system fonts.
5. **No progress is preserved across different browsers or devices** — localStorage is per-browser, per-origin.
