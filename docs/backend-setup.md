# Real accounts (Supabase)

**Status (2026-11-21):** a Supabase project is connected through `js/config.js` on the `supabase-login` branch. `supabase/schema.sql` and `supabase/migrations/002_accounts_and_joining.sql` have been applied, and the auth settings below are set. End-to-end sign-up by a real person had **not yet been confirmed** when this was written. See "Verification" at the end.

## How accounts work

| Step | What happens | Enforced by |
|---|---|---|
| Sign up | Full name, email, password, expected graduation term, optional major, and required privacy consent. Supabase emails a confirmation link. | Supabase Auth; `mn_new_user` trigger creates the profile only if consent was given |
| Confirm email | The person clicks the link once. Until then, sign-in is refused. | Supabase "Confirm email" setting |
| Sign in | Email + password. Passwords are hashed by Supabase and never stored by MavNext. | Supabase Auth (min 10 characters, letters + digits) |
| No organization yet | The onboarding page offers three ways in: request to join, use an invitation, or create an organization. | — |
| Request to join | The directory shows only the **names** of listed organizations. A request gives no access until an administrator approves it. | `org_directory`, `request_to_join`, `decide_join_request`, RLS on `join_requests` |
| Invitation | An admin creates a link for one email. It is single-use, expires after 7 days, and needs a confirmed email that matches. | `accept_invitation` |
| Create organization | The creator becomes its administrator and confirms they lead it. Limit: 5 organizations administered per account. | `create_organization` |
| Leave | Members can leave; the last administrator cannot. | `leave_organization`, `memberships_guard` |
| Password reset | "Forgot password" emails a reset link; the app then requires a new password. | Supabase Auth |
| Session safety | Automatic sign-out after 60 minutes idle; "Sign out on all devices". | `js/remote.js` (idle timer), Supabase global sign-out |

The browser only uses the publishable key. Every table has row-level security, and logged-out visitors are denied on every table and function.

## Supabase settings in use

- **Authentication → Sign In / Providers → Email:** Confirm email **on**; minimum password length **10**; password requirements **letters and digits**; magic links / email OTP **off** (password sign-in only).
- **Authentication → URL Configuration:** Site URL `https://rojantimalsina7-droid.github.io/Officer-Handoff-Tool/`; redirect URLs: that same address plus `http://localhost:8000/`.

## Opening the app by double-clicking `index.html`

Works for sign-up, sign-in, and all workspace features. Email links (confirmation, password reset) can't open a local file, so they open the **Site URL** (the GitHub Pages address) instead. Confirming there is enough; then sign in from the local file. Finishing a password reset needs the online site to have this branch's `js/config.js`, i.e. after it is merged to `main`. Invitation links always use `siteUrl` from `js/config.js`.

## Email delivery limits (important for demos)

Without a custom email service, Supabase **only sends email to members of the Supabase organization's team**, and only about **2 emails per hour**. Confirmation and reset emails to anyone else are refused.

- **For a class demo:** add each tester's email under Supabase → Organization settings → Team, and spread out sign-ups.
- **For real use:** connect a free SMTP provider (for example Brevo) under Authentication → Emails → SMTP Settings. This also unlocks editing the email templates.

## Fresh setup on a new project

1. Create a Supabase project (free tier).
2. Run `supabase/schema.sql` in the SQL Editor. It already includes migration 002.
3. Apply the auth settings and URLs above.
4. Put the project URL and **publishable** key in `js/config.js`. Never put the secret / `service_role` key in the repository.

To upgrade an existing project, run only `supabase/migrations/002_accounts_and_joining.sql`. It is safe to re-run.

## Verification

| Check | How | Result |
|---|---|---|
| Database rules (001) | `tests/rls_test.py` on local PostgreSQL 16 with stand-in auth | 34/34 passed |
| Database rules (002) | `tests/rls_test2.py`, same setup | 38/38 passed |
| Logged-out access on the live project | Direct REST calls with the publishable key | Denied (401) on all 11 tables and every MavNext function tested |
| App account flows | `tests/accounts_mock.py`: real app with a stand-in Supabase client | 27/27 passed |
| Real sign-up → confirm → sign in → create org on the live project | A person with a real inbox | **Pending**: needs the project owner's email |
| Two real accounts in different organizations cannot see each other's data | Two real accounts | **Pending** |
