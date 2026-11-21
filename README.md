# MavNext

**A leadership workspace for student organization officers.**

MavNext helps officers organize their current term and pass each role to the next officer:

Organization workspace → meetings and tasks → role-specific handoff → incoming officer review → archived term.

> An independent student-developed pilot. Not an official UTA service and not endorsed by the university.

---

## What it does

| Area | What you can do |
|---|---|
| **Overview** | Current term, upcoming meetings, your tasks, handoff progress, and recent activity. Every number comes from stored records. |
| **Meetings & Events** | Create and edit meetings or events (date, time, time zone, location), add agenda items and notes, choose attendees, add action items. |
| **Tasks** | Title, description, assignee, due date, status (To do / In progress / Done), and an optional link to a meeting or handoff. Filter by My tasks, All, Open, and Completed. A meeting's action items are the same task records, not copies. |
| **Handoffs** | The six-section handoff (Responsibilities, Account access procedures, Recurring deadlines, Funding procedures, Lessons learned, Open commitments). Answers autosave. Any answer can be marked Unknown, Not applicable, or Needs follow-up. You choose which tasks and meeting notes to include. A pre-submit review lists missing required items and unresolved answers. Each submission is a dated, read-only version. |
| **Incoming review** | The incoming officer opens the submitted version and either acknowledges receipt or requests clarification. The outgoing officer can then submit a new version; earlier versions stay readable. |
| **Members & Roles** | Officer titles, permission roles (Administrator / Officer / Incoming officer), and term dates. The last administrator cannot be removed or demoted. |
| **Archive** | Submitted handoffs grouped by term and role, with every version. |
| **Print / export** | "Print / Save PDF" prints the full record (never truncated). "Download text" saves a Markdown copy. |

Screenshots of the actual build are in [`docs/screenshots/`](docs/screenshots/).

## Three ways to use it

1. **Explore demo:** a fictional club (Riverside Robotics Society) with board members, meetings, tasks, a partly finished President handoff, and an archived Treasurer handoff. Use **View as** in the yellow demo bar to switch between the simulated people, including the incoming officer. Demo data lives under its own browser key and never touches other records. Reset it from **Settings → Reset demo workspace**.
2. **Use on this device without an account:** a private workspace stored only in this browser. Nothing is shared, and other officers cannot receive handoffs. Use Print or Export to share. If a draft from the earlier version of MavNext exists, you can import a copy; the original is never modified.
3. **Sign in / Create account:** individual accounts with organization memberships, using Supabase. **Not active until the project owner configures it.** See [`docs/backend-setup.md`](docs/backend-setup.md). Until then these screens say accounts are unavailable and collect nothing.

## Running locally

No build step and no install.

- Double-click `index.html`, **or**
- `python -m http.server 8000`, then open <http://localhost:8000>.

## Deploying to GitHub Pages

Settings → Pages → Deploy from a branch → `main` / `(root)`. All paths are relative and routing uses `#/…` hashes, so refresh and deep links work under `https://<user>.github.io/<repo>/`.

## Storage and privacy

| Mode | Where records live | Sent anywhere? |
|---|---|---|
| Demo | `localStorage` key `mavnext.demo.v1` | No |
| This device | `localStorage` key `mavnext.local.v1` | No |
| Signed in (once configured) | The configured Supabase project | **Yes**, to that service, and visible to organization members according to their permissions |

- The earlier version's draft (`uta_officer_handoff_data`) is read but never changed or deleted.
- MavNext never calls `localStorage.clear()`. Each destructive action is scoped, confirmed, and explains what it removes.
- **Never enter** passwords, PINs, recovery codes, private financial records, or account numbers. The access section asks for transfer *procedures* only, and the editor warns when text looks like a credential.

## Project structure

```
index.html              app entry (plain scripts, works from file://)
style.css               design system and layout
assets/                 MavNext logo (original + losslessly trimmed copies)
js/config.js            Supabase URL + anon key (empty = accounts off)
js/util.js, icons.js    helpers, local outline icons
js/sections.js          the six handoff sections and answer analysis
js/store.js             storage adapters, session, v1 draft migration
js/permissions.js       permission model + derived handoff status
js/svc.js               all write operations (permission-checked)
js/fixtures.js          demo data (fictional)
js/remote.js            Supabase adapter (unverified until configured)
js/ui.js                shared components: dialog, confirm, badges, empty states
js/app.js               shell, routing, entry screens
js/views-*.js           pages
supabase/schema.sql     tables, row-level security, invitation + org RPCs
legacy/v1/              the previous single-form app, kept for reference
tests/                  Playwright workflow tests, PostgreSQL policy tests
docs/                   tests, build log, setup, demo guide
```

## Known limitations

- Shared accounts, invitations, and cross-device sync are **not verified**: no Supabase project has been configured. The database policies were tested against local PostgreSQL 16 with stand-in auth functions (see `docs/functional-tests.md`), not against Supabase itself.
- MavNext sends no email. With accounts configured, admins get an invitation **link** to share themselves.
- No calendar views or notifications.
- No formal assistive-technology audit; keyboard and focus behaviour were tested in automated Chromium only.

## Course

Built for **INSY 3331** at the University of Texas at Arlington.
