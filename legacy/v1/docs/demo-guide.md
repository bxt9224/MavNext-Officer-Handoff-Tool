# MavNext — Two-Minute "Try It" Demo Guide

> Use this guide for the pitch demo, user tests, and the assignment's required two-minute walkthrough.  
> All inputs below are synthetic. Do not enter real credentials or personal information.

---

## Before You Start

- Open `index.html` in Chrome, Edge, Firefox, or Safari.
- No installation, login, or internet connection required (fonts load from CDN if online).
- If a previous draft exists, you will see a **"You have a saved draft"** banner. Click **"Start over"** to begin fresh for the demo, or **"Continue my handoff"** to resume.

---

## Option A — Use Sample Data (Fastest, ~1 min)

1. Click **"Try a sample handoff"** on the welcome screen (or **"Try a sample"** in the top-right header).
2. If a draft exists, confirm the overwrite prompt.
3. MavNext loads the **UTA Maverick Robotics Society** fictional handoff and takes you to Section 1.
4. Scroll through Section 1 to show the question cards, status badges, and character counter.
5. Click **"Next: Account Access →"** — point out the inline privacy reminder in Section 2.
6. Click the **Review** step in the top progress bar to jump straight to the Review screen.
7. Show the five metric cards (Answered / Action Required / Unknown / Not Applicable / Blank).
8. Click **"View Summary →"**.
9. Point out the **Priority Action Items** callout (3 unresolved items from Section 6).
10. Click **"Print / Save PDF"** — browser print dialog opens. Cancel to continue the demo.

**Total time:** ~60 seconds.

---

## Option B — Guided Live Walkthrough (~2 min)

### Step 1 — Setup (20 sec)
- Organization Name: `Maverick Finance Society (Demo)`
- Role: `Treasurer`
- Outgoing Officer: `Jordan Smith`
- Incoming Officer: `Taylor Reyes`
- Handoff Date: today's date (pre-filled)
- Click **"Create handoff"**.

### Step 2 — Section 1: Responsibilities (20 sec)
- **Role Mission**: `Manage the organization's budget, approve reimbursements, and prepare semester financial reports for Student Government.`
- **Weekly Routines**: `Reconcile the budget spreadsheet every Friday. Attend exec board meeting every Tuesday at 7 PM.`
- Leave **Campus Relationships** blank (show that blanks are allowed — they appear as Missing in Review).
- Click **"Mark as Unknown"** on **Officer Success Tips** to demonstrate the status control.

### Step 3 — Skip to Section 6 (15 sec)
- Click **"6"** in the top progress bar (or navigate forward through sections).
- **Pending Contracts**: type `Open invoice #2241 with a banner printing vendor — $120, delivery expected November 30.` → click **"Flag as Unresolved"**.
- **Immediate Next Steps**: `1. Update bank signers at branch. 2. File Q4 reimbursement receipts. 3. Submit spring SGA budget request.` → click **"Flag as Unresolved"**.

### Step 4 — Review (15 sec)
- Click the **✓ Review** step.
- Show the metrics: Answered = 3, Unknown = 1, Unresolved = 2, Blank = 1+.
- Click **"Edit Section 1"** → change one answer → return to Review to show data persistence.

### Step 5 — Summary & Print (20 sec)
- Click **"View Summary →"**.
- Point out the **unresolved callout** at the top.
- Scroll through the six-section digest grid.
- Point out blank fields showing `[Not Provided]` and unknown showing `[Marked as Unknown]`.
- Click **"Print / Save PDF"**. Cancel after the dialog opens.

### Step 6 — Clear Data (10 sec)
- Click **"Clear my answers"** in the header.
- Show the confirmation modal — read the note about printed copies.
- Click **"Yes, clear everything"** — UI resets to blank welcome screen.

---

## Talking Points

- **"All answers stay in this browser."** Nothing is sent to a server. There is no account.
- **"Gaps are honest."** Blanks, unknowns, and unresolved items appear exactly as such — MavNext never invents answers.
- **"The summary is for the incoming officer."** It is a readable, printable one-page briefing — not a form.
- **"This is an independent pilot."** Not an official UTA service. We built it to solve a real problem student orgs face every semester.

---

## If Something Goes Wrong During the Demo

| Issue | Quick fix |
|---|---|
| Screen looks blank or broken | Refresh the page — draft reloads from browser storage |
| Fonts look wrong | Check internet connection (fonts load from Google CDN) |
| Print dialog shows whole page, not just summary | Make sure you are on the Summary screen before clicking Print |
| "No draft yet" shows but you expect a draft | A different browser or private/incognito window clears localStorage |

---

## Notes for User Tests

- Ask participants to complete the handoff with **fictional information** about a club they belong to or make up.
- Observe where they hesitate or misunderstand a question — note it for the build log.
- Ask: "Did anything confuse you?" and "Is there anything missing you would want to include?"
- Record observations honestly. Do not prompt users toward specific answers.
