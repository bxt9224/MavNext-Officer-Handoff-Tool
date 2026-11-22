-- MavNext — migration 002: password accounts, profiles with consent, organization
-- directory, join requests, invitation expiry, leaving an organization.
-- Safe to run on a project that already ran 001 (supabase/schema.sql before this block).
-- Everything here is also appended to supabase/schema.sql for fresh installs.

-- ---------------------------------------------------------------- organizations / invitations
alter table public.organizations add column if not exists listed boolean not null default true;
alter table public.invitations   add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

-- ---------------------------------------------------------------- profiles (one per account, private to its owner)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  grad_term text check (grad_term is null or char_length(grad_term) <= 20),
  major text check (major is null or char_length(major) <= 80),
  consent_version text not null check (char_length(consent_version) between 1 and 20),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists prof_read on public.profiles;
drop policy if exists prof_insert on public.profiles;
drop policy if exists prof_update on public.profiles;
create policy prof_read   on public.profiles for select using (user_id = auth.uid());
create policy prof_insert on public.profiles for insert with check (user_id = auth.uid());
create policy prof_update on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Consent time is set by the server, never by the browser.
create or replace function public.mn_profile_stamp() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.consent_version is distinct from old.consent_version then
    new.consent_at := now();
  else
    new.consent_at := old.consent_at;
  end if;
  return new;
end $$;
drop trigger if exists profiles_stamp on public.profiles;
create trigger profiles_stamp before insert or update on public.profiles for each row execute function public.mn_profile_stamp();

-- Create the profile from sign-up details, but only if the person gave consent.
create or replace function public.mn_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'consent_version', '') <> '' then
    insert into profiles (user_id, full_name, grad_term, major, consent_version)
    values (new.id,
            left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Member'), 80),
            left(nullif(trim(new.raw_user_meta_data->>'grad_term'), ''), 20),
            left(nullif(trim(new.raw_user_meta_data->>'major'), ''), 80),
            left(new.raw_user_meta_data->>'consent_version', 20))
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists mn_on_auth_user_created on auth.users;
create trigger mn_on_auth_user_created after insert on auth.users for each row execute function public.mn_new_user();

-- ---------------------------------------------------------------- join requests (admin approves; requester gets nothing until then)
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  org_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  desired_title text not null default '' check (char_length(desired_title) <= 60),
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.memberships(id)
);
create unique index if not exists join_requests_one_pending on public.join_requests (org_id, user_id) where status = 'pending';
alter table public.join_requests enable row level security;
drop policy if exists jr_read on public.join_requests;
create policy jr_read on public.join_requests for select using (user_id = auth.uid() or mn_perm(org_id) = 'admin');
-- No insert/update/delete policies: all changes go through the functions below.

-- Signed-in users can see the NAMES of listed organizations, nothing else.
create or replace function public.org_directory(search text default '')
returns table (id uuid, name text) language sql stable security definer set search_path = public as $$
  select o.id, o.name from organizations o
  where auth.uid() is not null and o.listed
    and (coalesce(search, '') = '' or o.name ilike '%' || replace(replace(search, '%', ''), '_', '') || '%')
  order by o.name limit 50
$$;

create or replace function public.request_to_join(org uuid, title text default '', note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare p profiles; o organizations; rid uuid;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  select * into p from profiles where user_id = auth.uid();
  if not found then raise exception 'complete your profile first'; end if;
  select * into o from organizations where id = org and listed;
  if not found then raise exception 'organization not found'; end if;
  if exists (select 1 from memberships where org_id = org and user_id = auth.uid() and status = 'active') then
    raise exception 'you are already a member of this organization';
  end if;
  if (select count(*) from join_requests where user_id = auth.uid() and status = 'pending') >= 5 then
    raise exception 'you have too many pending requests; wait for a reply or cancel one';
  end if;
  insert into join_requests (org_id, org_name, user_id, requester_name, requester_email, desired_title, message)
  values (org, o.name, auth.uid(), p.full_name, coalesce(auth.jwt()->>'email', ''), left(coalesce(title, ''), 60), left(coalesce(note, ''), 500))
  returning id into rid;
  return rid;
exception when unique_violation then
  raise exception 'you already have a pending request for this organization';
end $$;

create or replace function public.cancel_join_request(req uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update join_requests set status = 'cancelled', decided_at = now()
  where id = req and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request not found or no longer pending'; end if;
end $$;

-- Adds (or re-activates) a membership. Internal helper; not callable from the browser.
create or replace function public.mn_upsert_membership(org uuid, uid uuid, perm text, d jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  insert into memberships (org_id, user_id, permission, status, data)
  values (org, uid, perm, 'active', d)
  on conflict (org_id, user_id) do update set permission = excluded.permission, status = 'active', data = memberships.data || excluded.data
  returning id into mid;
  return mid;
end $$;
revoke all on function public.mn_upsert_membership(uuid, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.decide_join_request(req uuid, approve boolean, perm text default 'officer', title text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare r join_requests; me uuid; mid uuid;
begin
  select * into r from join_requests where id = req and status = 'pending' for update;
  if not found then raise exception 'request not found or already decided'; end if;
  if mn_perm(r.org_id) is distinct from 'admin' then raise exception 'only an administrator can decide join requests'; end if;
  me := mn_member_id(r.org_id);
  if approve then
    if perm not in ('admin','officer','incoming') then raise exception 'invalid permission'; end if;
    mid := mn_upsert_membership(r.org_id, r.user_id, perm,
             jsonb_build_object('name', r.requester_name, 'email', r.requester_email, 'title', left(coalesce(nullif(title, ''), r.desired_title), 60)));
    insert into activity (id, org_id, actor_member, data)
    values ('a_' || replace(gen_random_uuid()::text, '-', ''), r.org_id, me,
            jsonb_build_object('type', 'member.joined', 'text', 'approved ' || r.requester_name || '''s request to join'));
  end if;
  update join_requests set status = case when approve then 'approved' else 'declined' end, decided_at = now(), decided_by = me where id = req;
  return mid;
end $$;

-- ---------------------------------------------------------------- organizations: create (with title) and leave
drop function if exists public.create_organization(text, text, text);
create or replace function public.create_organization(org_name text, display_name text default '', term_label text default '', officer_title text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid; nm text;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  if char_length(trim(coalesce(org_name, ''))) not between 2 and 120 then raise exception 'organization name must be 2-120 characters'; end if;
  if (select count(*) from memberships where user_id = auth.uid() and permission = 'admin') >= 5 then
    raise exception 'you already administer 5 organizations';
  end if;
  select full_name into nm from profiles where user_id = auth.uid();
  insert into organizations (name, current_term) values (trim(org_name), jsonb_build_object('label', coalesce(term_label, ''))) returning id into oid;
  perform mn_upsert_membership(oid, auth.uid(), 'admin',
    jsonb_build_object('name', coalesce(nm, nullif(trim(display_name), ''), 'Member'), 'email', auth.jwt()->>'email',
                       'title', coalesce(nullif(trim(officer_title), ''), 'Administrator')));
  return oid;
end $$;

create or replace function public.leave_organization(org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update memberships set status = 'former' where org_id = org and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'you are not an active member of this organization'; end if;
end $$;  -- the memberships_guard trigger still blocks the last administrator from leaving

-- ---------------------------------------------------------------- invitations: expiry + verified email
create or replace function public.accept_invitation(invite_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invitations; confirmed timestamptz; nm text;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  select email_confirmed_at into confirmed from auth.users where id = auth.uid();
  if confirmed is null then raise exception 'confirm your email address before accepting an invitation'; end if;
  select * into inv from invitations where token = invite_token and accepted_at is null for update;
  if not found then raise exception 'invitation not found or already used'; end if;
  if inv.expires_at < now() then raise exception 'this invitation has expired; ask for a new one'; end if;
  if lower(auth.jwt()->>'email') <> inv.email then raise exception 'this invitation was created for a different email address'; end if;
  if exists (select 1 from memberships where org_id = inv.org_id and user_id = auth.uid() and status = 'active') then
    raise exception 'you are already a member of this organization';
  end if;
  select full_name into nm from profiles where user_id = auth.uid();
  update invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return mn_upsert_membership(inv.org_id, auth.uid(), inv.permission,
           inv.data || jsonb_build_object('email', inv.email, 'name', coalesce(nm, inv.data->>'name', 'Member')));
end $$;

-- ---------------------------------------------------------------- privileges
revoke all on function public.org_directory(text) from public, anon;
revoke all on function public.request_to_join(uuid, text, text) from public, anon;
revoke all on function public.cancel_join_request(uuid) from public, anon;
revoke all on function public.decide_join_request(uuid, boolean, text, text) from public, anon;
revoke all on function public.create_organization(text, text, text, text) from public, anon;
revoke all on function public.leave_organization(uuid) from public, anon;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.org_directory(text), public.request_to_join(uuid, text, text), public.cancel_join_request(uuid),
  public.decide_join_request(uuid, boolean, text, text), public.create_organization(text, text, text, text),
  public.leave_organization(uuid), public.accept_invitation(uuid) to authenticated;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
