-- MavNext — Supabase schema and row-level security
-- STATUS: prepared, NOT yet run against a live project. Review before use.
-- Run in the Supabase SQL editor of a new project (free tier is sufficient).
-- Every table has RLS enabled; the browser only ever uses the public anon key.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  current_term jsonb not null default '{}'::jsonb,
  next_term jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('admin','officer','incoming')),
  status text not null default 'active' check (status in ('active','former')),
  data jsonb not null default '{}'::jsonb,          -- name, email, title, termStart, termEnd
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.meetings (id text primary key, org_id uuid not null references public.organizations(id) on delete cascade, data jsonb not null, updated_at timestamptz not null default now());
create table public.tasks    (id text primary key, org_id uuid not null references public.organizations(id) on delete cascade, data jsonb not null, updated_at timestamptz not null default now());
create table public.handoffs (id text primary key, org_id uuid not null references public.organizations(id) on delete cascade, data jsonb not null, updated_at timestamptz not null default now());

-- Submitted snapshots: insert-only (no update/delete policies exist).
create table public.handoff_versions (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  handoff_id text not null references public.handoffs(id) on delete restrict,
  version int not null,
  submitted_by uuid not null references public.memberships(id),
  snapshot jsonb not null,
  submitted_at timestamptz not null default now(),
  unique (handoff_id, version)
);

create table public.handoff_reviews (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  handoff_id text not null references public.handoffs(id) on delete restrict,
  version int not null,
  type text not null check (type in ('acknowledged','clarification')),
  by_member uuid not null references public.memberships(id),
  message text not null default '' check (char_length(message) <= 1000),
  at timestamptz not null default now()
);

create table public.activity (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_member uuid not null references public.memberships(id),
  data jsonb not null,
  at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  permission text not null check (permission in ('admin','officer','incoming')),
  data jsonb not null default '{}'::jsonb,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references public.memberships(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER so policies can look up the caller's membership without recursion.
create or replace function public.mn_member_id(org uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from memberships where org_id = org and user_id = auth.uid() and status = 'active'
$$;
create or replace function public.mn_perm(org uuid) returns text
language sql stable security definer set search_path = public as $$
  select permission from memberships where org_id = org and user_id = auth.uid() and status = 'active'
$$;
create or replace function public.mn_handoff_visible(h text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from handoffs x where x.id = h and (
      mn_perm(x.org_id) = 'admin'
      or x.data->>'outgoingMemberId' = mn_member_id(x.org_id)::text
      or (x.data->>'incomingMemberId' = mn_member_id(x.org_id)::text
          and exists (select 1 from handoff_versions v where v.handoff_id = x.id))))
$$;

-- Keep jsonb copies of id/org consistent with the real columns.
create or replace function public.mn_stamp() returns trigger language plpgsql as $$
begin
  new.data := new.data || jsonb_build_object('id', new.id, 'orgId', new.org_id);
  new.updated_at := now();
  return new;
end $$;
create trigger meetings_stamp before insert or update on public.meetings for each row execute function public.mn_stamp();
create trigger tasks_stamp    before insert or update on public.tasks    for each row execute function public.mn_stamp();
create trigger handoffs_stamp before insert or update on public.handoffs for each row execute function public.mn_stamp();

-- ---------------------------------------------------------------- RLS
alter table public.organizations    enable row level security;
alter table public.memberships      enable row level security;
alter table public.meetings         enable row level security;
alter table public.tasks            enable row level security;
alter table public.handoffs         enable row level security;
alter table public.handoff_versions enable row level security;
alter table public.handoff_reviews  enable row level security;
alter table public.activity         enable row level security;
alter table public.invitations      enable row level security;

-- Organizations: members read; admins update; creation only via create_organization().
create policy org_read   on public.organizations for select using (mn_perm(id) is not null);
create policy org_update on public.organizations for update using (mn_perm(id) = 'admin') with check (mn_perm(id) = 'admin');

-- Memberships: members see their org's roster; only admins change it; no direct inserts/deletes.
create policy mem_read   on public.memberships for select using (mn_perm(org_id) is not null);
create policy mem_update on public.memberships for update using (mn_perm(org_id) = 'admin') with check (mn_perm(org_id) = 'admin');

create or replace function public.mn_guard_membership() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id <> old.user_id or new.org_id <> old.org_id then
    raise exception 'membership owner cannot change';
  end if;
  if old.permission = 'admin' and old.status = 'active' and (new.permission <> 'admin' or new.status <> 'active') then
    if (select count(*) from memberships where org_id = old.org_id and permission = 'admin' and status = 'active') <= 1 then
      raise exception 'cannot remove or demote the last administrator';
    end if;
  end if;
  return new;
end $$;
create trigger memberships_guard before update on public.memberships for each row execute function public.mn_guard_membership();

-- Meetings: members read; officers/admins write; only admin or creator may cancel; admins delete.
create policy mt_read   on public.meetings for select using (mn_perm(org_id) is not null);
create policy mt_insert on public.meetings for insert with check (mn_perm(org_id) in ('admin','officer') and data->>'createdBy' = mn_member_id(org_id)::text);
create policy mt_update on public.meetings for update using (mn_perm(org_id) in ('admin','officer')) with check (mn_perm(org_id) in ('admin','officer'));
create policy mt_delete on public.meetings for delete using (mn_perm(org_id) = 'admin');
create or replace function public.mn_guard_meeting() returns trigger language plpgsql as $$
begin
  if new.data->>'createdBy' is distinct from old.data->>'createdBy' then raise exception 'createdBy cannot change'; end if;
  if new.data->>'status' = 'cancelled' and old.data->>'status' <> 'cancelled'
     and mn_perm(old.org_id) <> 'admin' and old.data->>'createdBy' <> mn_member_id(old.org_id)::text then
    raise exception 'only an administrator or the creator can cancel this meeting';
  end if;
  return new;
end $$;
create trigger meetings_guard before update on public.meetings for each row execute function public.mn_guard_meeting();

-- Tasks: admins/officers see all; incoming officers see only tasks assigned to them.
create policy tk_read on public.tasks for select using (
  mn_perm(org_id) in ('admin','officer') or data->>'assigneeId' = mn_member_id(org_id)::text);
create policy tk_insert on public.tasks for insert with check (mn_perm(org_id) in ('admin','officer') and data->>'createdBy' = mn_member_id(org_id)::text);
create policy tk_update on public.tasks for update using (
  mn_perm(org_id) in ('admin','officer') or data->>'assigneeId' = mn_member_id(org_id)::text)
  with check (mn_perm(org_id) is not null);
create policy tk_delete on public.tasks for delete using (
  mn_perm(org_id) = 'admin' or (mn_perm(org_id) = 'officer' and data->>'createdBy' = mn_member_id(org_id)::text));
-- Anyone who is not admin, creator, or assignee may change only the status fields.
create or replace function public.mn_guard_task() returns trigger language plpgsql as $$
declare me text := mn_member_id(old.org_id)::text;
begin
  if mn_perm(old.org_id) = 'admin' then return new; end if;
  if mn_perm(old.org_id) = 'officer' and (old.data->>'createdBy' = me or old.data->>'assigneeId' = me) then
    if new.data->>'createdBy' is distinct from old.data->>'createdBy' then raise exception 'createdBy cannot change'; end if;
    return new;
  end if;
  if (new.data - 'status' - 'completedAt' - 'updatedAt') <> (old.data - 'status' - 'completedAt' - 'updatedAt') then
    raise exception 'you may only change the status of this task';
  end if;
  return new;
end $$;
create trigger tasks_guard before update on public.tasks for each row execute function public.mn_guard_task();

-- Handoffs: admin, outgoing officer, or (after submission) incoming officer can read.
create policy ho_read on public.handoffs for select using (mn_handoff_visible(id));
create policy ho_insert on public.handoffs for insert with check (
  mn_perm(org_id) = 'admin' or (mn_perm(org_id) = 'officer' and data->>'outgoingMemberId' = mn_member_id(org_id)::text));
create policy ho_update on public.handoffs for update using (
  mn_perm(org_id) = 'admin' or (mn_perm(org_id) = 'officer' and data->>'outgoingMemberId' = mn_member_id(org_id)::text))
  with check (mn_perm(org_id) = 'admin' or (mn_perm(org_id) = 'officer' and data->>'outgoingMemberId' = mn_member_id(org_id)::text));
create policy ho_delete on public.handoffs for delete using (
  (mn_perm(org_id) = 'admin' or data->>'outgoingMemberId' = mn_member_id(org_id)::text)
  and not exists (select 1 from handoff_versions v where v.handoff_id = handoffs.id));

-- Versions: visible like the handoff; inserted only by admin/outgoing; never updated or deleted.
create policy hv_read on public.handoff_versions for select using (mn_handoff_visible(handoff_id));
create policy hv_insert on public.handoff_versions for insert with check (
  submitted_by = mn_member_id(org_id)
  and exists (select 1 from handoffs h where h.id = handoff_versions.handoff_id and h.org_id = handoff_versions.org_id and
              (mn_perm(h.org_id) = 'admin' or h.data->>'outgoingMemberId' = mn_member_id(h.org_id)::text)));
create or replace function public.mn_guard_version() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.submitted_at := now();
  if new.version <> coalesce((select max(version) from handoff_versions where handoff_id = new.handoff_id), 0) + 1 then
    raise exception 'version must follow the latest submitted version';
  end if;
  return new;
end $$;
create trigger versions_guard before insert on public.handoff_versions for each row execute function public.mn_guard_version();

-- Reviews: only the assigned incoming officer, only on the latest version.
create policy hr_read on public.handoff_reviews for select using (mn_handoff_visible(handoff_id));
create policy hr_insert on public.handoff_reviews for insert with check (
  by_member = mn_member_id(org_id)
  and exists (select 1 from handoffs h where h.id = handoff_reviews.handoff_id and h.org_id = handoff_reviews.org_id and h.data->>'incomingMemberId' = mn_member_id(h.org_id)::text)
  and version = (select max(version) from handoff_versions v where v.handoff_id = handoff_reviews.handoff_id));
create or replace function public.mn_stamp_review() returns trigger language plpgsql as $$
begin new.at := now(); return new; end $$;
create trigger reviews_stamp before insert on public.handoff_reviews for each row execute function public.mn_stamp_review();

-- Activity: members read; each member writes only as themselves.
create policy act_read on public.activity for select using (mn_perm(org_id) is not null);
create policy act_insert on public.activity for insert with check (actor_member = mn_member_id(org_id));

-- Invitations: admins create, read, and revoke. Acceptance goes through accept_invitation().
create policy inv_read on public.invitations for select using (mn_perm(org_id) = 'admin');
create policy inv_insert on public.invitations for insert with check (mn_perm(org_id) = 'admin');
create policy inv_delete on public.invitations for delete using (mn_perm(org_id) = 'admin' and accepted_at is null);
create or replace function public.mn_stamp_invite() returns trigger language plpgsql as $$
begin new.created_by := mn_member_id(new.org_id); new.email := lower(trim(new.email)); new.accepted_at := null; new.accepted_by := null; return new; end $$;
create trigger invitations_stamp before insert on public.invitations for each row execute function public.mn_stamp_invite();

-- ---------------------------------------------------------------- RPCs
-- Creates an organization with the caller as its first administrator.
create or replace function public.create_organization(org_name text, display_name text, term_label text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  insert into organizations (name, current_term) values (org_name, jsonb_build_object('label', term_label)) returning id into oid;
  insert into memberships (org_id, user_id, permission, data)
    values (oid, auth.uid(), 'admin', jsonb_build_object('name', display_name, 'email', auth.jwt()->>'email', 'title', 'Administrator'));
  return oid;
end $$;

-- Accepts an invitation only for the signed-in user whose verified email matches it.
create or replace function public.accept_invitation(invite_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invitations; mid uuid;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  select * into inv from invitations where token = invite_token and accepted_at is null for update;
  if not found then raise exception 'invitation not found or already used'; end if;
  if lower(auth.jwt()->>'email') <> inv.email then raise exception 'this invitation was created for a different email address'; end if;
  if exists (select 1 from memberships where org_id = inv.org_id and user_id = auth.uid()) then raise exception 'you are already a member of this organization'; end if;
  insert into memberships (org_id, user_id, permission, data)
    values (inv.org_id, auth.uid(), inv.permission, inv.data || jsonb_build_object('email', inv.email))
    returning id into mid;
  update invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return mid;
end $$;

revoke all on function public.create_organization(text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text) to authenticated;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;
