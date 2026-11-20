# Officer Handoff Tool

**A structured leadership transition web application for student organizations at the University of Texas at Arlington (UTA).**

Built with pure front-end web technologies (HTML5, CSS3, vanilla JavaScript) designed to deploy directly on **GitHub Pages** with zero build configuration, zero backend dependencies, and zero collection of sensitive credentials.

---

## 🌟 Purpose

Transitioning executive leadership in student organizations is often disorganized, leading to lost institutional knowledge, delayed university compliance, and fragmented account access. 

The **Officer Handoff Tool** guides outgoing officers through a six-step structured questionnaire and generates a clean, readable, one-page handoff quick-start summary with designated print-friendly CSS for immediate physical printing or PDF export.

---

## 🚀 Key Features

1. **Welcome & Identity Setup**:
   - Executive and committee officer role selection (President, Vice President, Treasurer, Secretary, Event Coordinator, or custom role).
   - Prominent **Privacy & Security Warning** reminding officers to never record passwords, PINs, recovery codes, or sensitive banking details.
2. **6-Section Structured Questionnaire**:
   - **Section 1: Responsibilities** — Role mission, core duties, weekly routines, key campus relationships, and success advice.
   - **Section 2: Account Access Transfer** — Step-by-step procedural guides for transferring administrative ownership on MavOrgs, Google Drive, Discord, Slack, and social media.
   - **Section 3: Recurring Deadlines** — Key timeline milestones: annual re-registration, Maverick Stampede activity fairs, room reservation lead times, and elections.
   - **Section 4: Funding Procedures** — Factual, free-text explanation of Student Government funding, off-campus bank signee transitions, reimbursements, and invoice handling.
   - **Section 5: Event Lessons** — Retrospective on signature events, preferred campus venues (University Center, Woolf Hall, etc.), catering rules, and student promotion.
   - **Section 6: Unfinished Commitments** — Outstanding vendor orders, open university approvals, ongoing initiatives, and top 3 immediate next steps for the first 14 days.
3. **Response Status Controls & Anti-Hallucination**:
   - Explicit controls on every question to mark items as **Standard Response**, **Mark as Unknown**, **Not Applicable (N/A)**, or **Flag as Unresolved Action Item**.
   - Missing or blank items are visibly tagged as `[Not Provided]` rather than inventing or assuming unprovided information.
4. **Audit & Review Screen**:
   - Metrics grid breaking down Answered, Unfinished, Unknown, Not Applicable, and Blank items.
   - Section-by-section breakdown with direct "Edit" shortcuts.
5. **Print-Ready One-Page Summary**:
   - Formatted institutional document header with UTA branding, outgoing/incoming officer credentials, and last-reviewed date.
   - High-visibility **Priority Action Items & Unresolved Next Steps** banner with actionable check-boxes.
   - 6-section digest grid with signature sign-off lines.
   - Built-in `@media print` rules for browser **Print / Save as PDF** (`window.print()`).
6. **Local Browser Persistence & Privacy**:
   - All data auto-saves securely to the user's browser `localStorage` (`uta_officer_handoff_data`).
   - Dedicated **"Clear My Answers"** button with a confirmation safety dialog.
   - **Load Demo Data** option featuring a synthetic, fictional student org (*UTA Maverick Robotics Society*) with zero real credentials.

---

## 🛠️ Technology Stack

- **HTML5**: Semantic, accessible markup with ARIA roles and labels.
- **CSS3**: Responsive flexbox and grid layouts, CSS custom properties, UTA-inspired color palette (`#0064B1` UTA Blue, `#0B2341` Deep Navy, `#F58025` Maverick Orange), and print stylesheet.
- **Vanilla JavaScript (ES6+)**: Zero dependencies, zero build step, modular event-driven architecture with client-side state persistence.

---

## 💻 How to Preview and Test Locally

Because this application uses standard static HTML/CSS/JS without bundlers or server-side runtimes, you can test it locally in several ways:

### Option A: Open directly in any Web Browser
Double-click `index.html` or drag and drop it into any modern web browser (Google Chrome, Firefox, Safari, Edge).

### Option B: Local Python HTTP Server (Recommended)
Open your terminal in the repository directory and run:

```bash
# Python 3
python3 -m http.server 8000
```

Then navigate to:
```
http://localhost:8000
```

### Option C: VS Code / IDE Live Server
If using Visual Studio Code or an IDE extension like **Live Server**, right-click `index.html` and select **"Open with Live Server"**.

---

## 🌐 Deploying to GitHub Pages

1. Commit and push the repository to GitHub.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` (or `master`), and folder `/ (root)`.
4. Click **Save**. Within 1–2 minutes, your website will be live at:
   `https://<your-username>.github.io/<repository-name>/`

---

## 🔒 Security & Privacy Notice

This tool is strictly client-side. It does not communicate with any external backend API, database, or analytics tracker. Outgoing officers must only document official procedural delegation processes and must **never** record passwords, MFA recovery codes, or personal financial details.
