# Enabling real accounts (Supabase)

**Status:** prepared, **not verified against a live Supabase project.** Until the steps below are done and tested, MavNext runs only in demo and "this device" modes, and the sign-in screens say so.

Why Supabase: it has a free tier, works directly from a static GitHub Pages site, supports email-link sign-in (no passwords handled by MavNext), and enforces access with PostgreSQL row-level security. No personally operated server is needed.

## What the owner must supply

| Item | Where | Notes |
|---|---|---|
| Supabase project URL | `js/config.js` → `supabaseUrl` | Settings → API |
| Supabase **anon** key | `js/config.js` → `supabaseAnonKey` | Public by design; security comes from RLS |
| Site URL + redirect URL | Supabase → Authentication → URL Configuration | e.g. `https://<user>.github.io/<repo>/` |

**Never** put the `service_role` key, a database password, or any other secret in the repository.

## Steps

1. Create a free Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql` once.
3. **Authentication → Providers → Email:** enable it. Email-link (magic link) sign-in is used. Supabase's built-in email sender is rate-limited and intended for testing; configure custom SMTP for real use.
4. **Authentication → URL Configuration:** set the Site URL and add the same URL to Redirect URLs.
5. Fill in `js/config.js` and deploy.

## How it works

- **Accounts:** each officer signs in with their own email. MavNext never sees a password.
- **Workspaces:** after signing in, a user with no membership can create an organization (`create_organization` RPC) and becomes its administrator.
- **Invitations:** administrators create an invitation for a specific email and permission. MavNext shows a link to share; **it does not send email**. `accept_invitation` only succeeds when the signed-in user's email matches the invitation. Each invitation works once.
- **Permissions** (`memberships.permission`): `admin`, `officer`, `incoming`. Only admins can change memberships. A trigger blocks removing or demoting the last admin. Choosing an organization name grants nothing; every policy checks membership.
- **Snapshots:** `handoff_versions` and `handoff_reviews` have no update or delete policies, so submitted versions are immutable. Version numbers must be sequential.
- **Status** (Draft / Submitted / Changes requested / Acknowledged) is derived from versions and reviews, never stored as an editable field.

## Verification still required after configuration

These were **not** possible without a live project and must be tested before real use:

- [ ] Sign-in link arrives and returns to the site (PKCE `?code=` flow) on the GitHub Pages URL
- [ ] Sign-out
- [ ] Create organization; data loads after refresh
- [ ] Invitation link accepted by the matching email; rejected for a different email
- [ ] Two accounts in different organizations cannot read each other's records, including direct REST requests with the anon key
- [ ] Incoming officer can acknowledge; officer cannot self-promote
- [ ] Every write path in `js/remote.js` (meetings, tasks, handoffs, versions, reviews, activity, members, org settings)

What *was* tested: the SQL policies were run against local PostgreSQL 16 with stand-in `auth.uid()` / `auth.jwt()` functions. 34 of 34 checks passed (see `functional-tests.md`). That shows the policy logic behaves as intended. It does not show that the Supabase client code or hosted service works.
