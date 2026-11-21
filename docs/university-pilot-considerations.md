# MavNext — University Pilot Considerations

> This document describes what would need to happen before MavNext could be adopted as an institutional service at UT Arlington.  
> **These are future decisions, not features to implement now, and not approvals to claim.**  
> The current product is an independent student-developed prototype.

---

## What MavNext Is Today

MavNext is a browser-only, client-side handoff tool built by INSY 3331 students as a course project. It:
- Runs on GitHub Pages with no backend.
- Stores all data locally in the user's browser (localStorage).
- Requires no account, login, or university credentials.
- Produces a printable one-page handoff summary.
- Uses entirely synthetic demonstration data.

It is **not** an official UTA service, has not been reviewed by UTA IT, Student Life, or Student Activities, and carries no institutional endorsement.

---

## Stakeholder Identification

Before any institutional adoption, the following stakeholders should be identified and consulted:

| Stakeholder | Role |
|---|---|
| **Student Activities & Organizations Office** | Primary operational owner; handles MavOrgs, org registration, and leadership transitions |
| **UTA IT / Information Security** | Reviews browser storage practices, CSP, and any future server-side data handling |
| **University Counsel / FERPA Officer** | Reviews what data the tool collects and whether any of it constitutes educational records |
| **Student Government** | Likely user base; input on funding-section language and pilot scope |
| **College / Department Advisors** | Advisors who participate in org leadership transitions |
| **Student org officers (target users)** | Must be involved in requirements validation and usability testing |

---

## Accessibility & Privacy Review

- The current prototype has not undergone a formal accessibility audit. Before institutional deployment, testing with NVDA, VoiceOver, JAWS, and keyboard-only navigation should be performed and documented.
- WCAG 2.1 AA compliance should be formally verified, not just estimated by code inspection.
- A privacy impact assessment should determine whether localStorage data qualifies as a university record under FERPA or Texas Public Information Act, and what retention/deletion obligations apply.
- Users should be clearly informed (and confirmed to understand) that clearing their browser data permanently removes their draft.

---

## Hosting & Support

The current GitHub Pages hosting is appropriate for a student pilot. For institutional adoption, the following questions need answers:

- **Who owns the repository and domain?** GitHub Pages on a student account cannot serve as a long-term institutional host.
- **Who maintains the codebase** after the course ends? A student project without a designated maintainer becomes unmaintained software.
- **Who handles bug reports** from student officers outside the course team?
- **What happens when the tool is not updated** as MavOrgs, university platforms, or policies change?

---

## Branding & Identity

- The current MavNext wordmark and color palette are original to this project and do not use official UTA brand assets.
- If adopted institutionally, the product name, visual identity, and copy would need to be reviewed and approved by UTA Marketing & Communications.
- The current footer disclaimer ("Not an official UTA service") would need to be updated or removed only when official status is confirmed.

---

## Data Considerations (If Shared Storage Is Introduced)

The current prototype has no server-side data at all. If a future version introduces shared storage (e.g., so incoming officers can see the handoff the outgoing officer prepared):

- A formal data classification decision is required. What tier of institutional data would handoff content represent?
- Authentication (SSO via UTA's NetID) would likely be required to protect records.
- Retention and deletion policies must be defined: how long are handoff records kept, and who can delete them?
- Access controls: who can read a given handoff? Only the outgoing and incoming officer? The faculty advisor? The Student Activities office?
- Whether UTA-approved cloud storage (not GitHub Pages) is required.

**None of these decisions need to be made now.** The browser-only approach is the right scope for the current pilot.

---

## User Testing & Success Measures

Before institutional adoption, the pilot should demonstrate:

- Completion of handoffs by at least a sample of real student org officers (not just course participants).
- Measured reduction in common transition problems (e.g., lost account access, missed re-registration deadlines).
- Agreed success metrics with Student Activities — what does "this tool is working" actually look like?
- At minimum 3 rounds of user testing beyond the course-required 3 sessions, covering multiple org types and officer roles.

---

## What Does Not Need to Change for the Pilot

- **No backend is needed** for the core handoff use case. The browser-only model is an asset: it eliminates server costs, security surface area, and account management.
- **SSO is not needed** unless shared records are introduced. Adding SSO without shared records adds friction and complexity with no benefit.
- **Email notifications are not needed** for the initial pilot — the outgoing officer prints or shares the PDF directly.
- **Administrative dashboards** (showing all org handoffs to a Student Activities coordinator) are a potential future phase, not a current need.

---

## Recommended Next Steps (If Pursuing Institutional Adoption)

1. Present the pilot to the Student Activities & Organizations Office and get their feedback.
2. Identify at least one real student org willing to use the tool for their next transition cycle.
3. Conduct a structured user study with that org.
4. Document findings and define the minimum feature set for an institutionally-supported version.
5. Determine whether a full rebuild (with authentication and shared storage) is actually warranted, or whether the browser-only model continues to serve the need.
