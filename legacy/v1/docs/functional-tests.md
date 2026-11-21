# MavNext — Functional Test Results

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
