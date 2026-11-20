---
name: officer-handoff
description: >-
  Standard development rules, architectural constraints, and handoff workflow guidelines
  for the Officer Handoff Tool for UT Arlington student organizations. Future agents
  MUST read and apply this skill before every build iteration.
---

# Officer Handoff Tool — Development Skill & Guidelines

This skill defines the mandatory architectural, functional, security, and UI standards for the **Officer Handoff Tool**, designed specifically for outgoing and incoming student organization officers at the **University of Texas at Arlington (UTA)**.

> [!IMPORTANT]
> **Mandatory Agent Pre-Execution Requirement:**
> Every future agent working on this repository **must read and strictly enforce this skill** before beginning any build, modification, or code iteration. No deviation from the constraints below is permitted.

---

## 1. Core Principles & Strict Constraints

All development iterations must adhere to the following 11 core rules:

1. **Pure Front-End Tech Stack**:
   - Build using only **HTML5, CSS3, and vanilla JavaScript**.
   - Must run natively in modern web browsers and be 100% compatible with **GitHub Pages** (root or `/docs` static deployment).
2. **Target Purpose**:
   - Deliver a purpose-built application that helps outgoing student organization officers prepare a comprehensive, structured handoff summary for incoming officers.
3. **Six Required Questionnaire Sections**:
   - The questionnaire must include all six specific sections detailed in [Section 3](#3-the-six-questionnaire-sections).
4. **Strict Truthfulness & Flagging (Anti-Hallucination)**:
   - Clearly flag missing, unknown, and unresolved fields.
   - Never invent, assume, or auto-complete unprovided handoff details.
5. **One-Page Handoff Summary**:
   - Generate a clean, readable one-page summary view featuring a **Last-Reviewed Date** and a dedicated **Unresolved Next Steps** section.
6. **Print & PDF Exportability**:
   - Native support for printing or exporting to PDF via browser print functionality (`window.print()`), with robust `@media print` styling ensuring proper pagination and page-break management.
7. **Client-Side-Only Persistence**:
   - Store answers **only in the user's browser** (e.g., `localStorage`).
   - Provide an easily accessible **"Clear My Answers"** button (with confirmation) that completely wipes stored local data.
8. **Strict Security & Privacy Boundary**:
   - **Never request, accept, or store passwords, MFA/recovery codes, private contact details, or confidential financial information** (such as bank account numbers or SSNs).
   - Only document procedural steps (e.g., "Transfer admin role on MavOrgs", "Transfer ownership of Google Drive").
9. **Synthetic Demonstration Data Only**:
   - Any pre-filled presets, demo loaders, or placeholder examples must use **100% synthetic, fictional demonstration data** (e.g., fictional club names like "UTA Maverick Robotics Society").
10. **Accessibility & Responsive Design**:
    - Mobile-friendly, responsive layout.
    - Accessible semantic HTML, proper contrast, keyboard navigation, explicit form labels, and clear inline validation/error messages.
11. **No Backend or External Tooling Dependencies**:
    - **No backend servers** (Node.js/Express, Python/Flask, etc.).
    - **No build tools or bundlers** (npm, Vite, Webpack, Parcel, Babel, etc.).
    - **No API keys or paid external APIs**.

---

## 2. Architecture & File Layout

When building the application, maintain a clean, zero-build static structure:

```text
/
├── index.html         # Single-page application entry point & semantic layout
├── css/
│   └── styles.css     # Responsive design, accessibility styles, and @media print rules
├── js/
│   └── app.js         # State management, local persistence, validation, and print handlers
└── README.md          # Project overview & GitHub Pages usage instructions
```

- Keep code modular and readable without build steps.
- Avoid external CSS/JS libraries unless lightweight and loaded via standard reliable CDNs without requiring build tools or API tokens.

---

## 3. The Six Questionnaire Sections

The application must organize questions into these six distinct categories:

| Section # | Section Title | Focus & Expected Questions |
| :--- | :--- | :--- |
| **1** | **Responsibilities** | Role mission, core officer duties, recurring weekly/monthly routines, key campus relationships, and expectations. |
| **2** | **Account-Access Transfer Steps** | Step-by-step procedures to transfer ownership for organizational tools (MavOrgs, Google Workspace, Canvas, social media, Discord/Slack). *Reminder: Procedural transfer guidance only—never passwords.* |
| **3** | **Recurring Deadlines** | Annual and semester timeline milestones: student org re-registration, semester activity fair dates, room reservation cutoffs, election windows. |
| **4** | **Funding Procedures** | Student Government allocation guidelines, UTA Activity Fee processes, bank signee transitions, reimbursement workflows, and invoice handling. |
| **5** | **Event Lessons** | Retrospective insights on major past events: what succeeded, common pitfalls, preferred campus venues, catering tips, and attendance patterns. |
| **6** | **Unfinished Commitments** | Pending vendor contracts, open invoices, ongoing university inquiries, and unfinished initiatives handed off to the incoming team. |

---

## 4. Summary Generation & Print/PDF Specification

### Required Elements in the Summary View
1. **Organization & Role Header**: Org Name, Officer Position, Outgoing Officer Name (synthetic/optional), and Incoming Officer Name.
2. **Last-Reviewed Date**: Timestamp dynamically captured or explicitly set by the officer.
3. **Structured Review Blocks**: Concise digest of answers from each of the 6 sections.
4. **Unresolved Next Steps Banner**: High-visibility block grouping all questions flagged as *Incomplete*, *Pending*, or *Unresolved*, with designated checkboxes or action prompts for the incoming officer.

### Print & PDF Export Rules
- Implement dedicated `@media print` CSS:
  - Hide navigation bars, interactive form controls, edit buttons, and the "Clear My Answers" button.
  - Reset backgrounds to clean white with high-contrast text for monochrome and color printing.
  - Enforce page break controls (`page-break-inside: avoid;`, `break-inside: avoid;`) to prevent awkward splits across sections.
  - Ensure the summary fits cleanly into an easily readable format suitable for physical printing or browser "Save as PDF".

---

## 5. Privacy, Safety, and Local Data Protocol

- **Prohibited Data**:
  - Form validation and input placeholders must explicitly warn: *"Do NOT enter passwords, PINs, bank account numbers, or private personal phone numbers."*
- **Local Storage Schema**:
  - Key names should be namespaced (e.g., `uta_officer_handoff_data`).
  - Loading logic must gracefully handle empty, corrupted, or older schema data.
- **Data Erasure**:
  - The **Clear My Answers** control must present a clear confirmation dialog (`confirm` or modal) before purging `localStorage` and resetting form inputs to prevent accidental loss.

---

## 6. Pre-Build & Iteration Checklist for Agents

Before completing any development iteration on the website, verify each item:

- [ ] Does the site run directly in the browser by opening `index.html` without running a build command (`npm run build`, etc.)?
- [ ] Are all 6 sections present and intuitive to navigate?
- [ ] Are missing and unresolved fields flagged visibly in the summary rather than filled with assumed values?
- [ ] Does the summary display the "Last-Reviewed Date" and "Unresolved Next Steps"?
- [ ] Does the print stylesheet cleanly format the summary for print/PDF export?
- [ ] Does "Clear My Answers" purge local storage and reset the UI safely?
- [ ] Are there zero requests for sensitive credentials (passwords, PINs, private data)?
- [ ] Is any sample/demo data completely synthetic?
- [ ] Is the design responsive, accessible, and free of external backend dependencies?
