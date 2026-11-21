/* MavNext — Supabase integration for real accounts and shared organization data.
   STATUS: prepared but UNVERIFIED. It only activates when js/config.js has a
   Supabase URL and anon key. It has not been run against a live project.
   Sign-in uses one-time email links (no passwords collected by MavNext).
   Authorization is enforced by the database policies in supabase/schema.sql. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  const cfg = () => window.MAVNEXT_CONFIG || {};
  let client = null;
  let user = null;

  const TABLE = { meetings: 'meetings', tasks: 'tasks', handoffs: 'handoffs' };

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the sign-in library.'));
      document.head.appendChild(s);
    });
  }
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  const adapter = {
    kind: 'remote',
    apply(change) {
      const { coll, rec, op, id } = change;
      if (TABLE[coll]) {
        if (op === 'remove') return client.from(TABLE[coll]).delete().eq('id', id).then(ok);
        return client.from(TABLE[coll]).upsert({ id: rec.id, org_id: rec.orgId, data: rec }).then(ok);
      }
      switch (coll) {
        case 'orgs': return client.from('organizations').update({ name: rec.name, current_term: rec.currentTerm, next_term: rec.nextTerm }).eq('id', rec.id).then(ok);
        case 'members': return client.from('memberships').update({ permission: rec.permission, status: rec.status, data: { name: rec.name, email: rec.email, title: rec.title, termStart: rec.termStart, termEnd: rec.termEnd } }).eq('id', rec.id).then(ok);
        case 'handoffVersions': return client.from('handoff_versions').insert({ id: rec.id, org_id: rec.orgId, handoff_id: rec.handoffId, version: rec.version, submitted_by: rec.submittedBy, snapshot: rec.snapshot }).then(ok);
        case 'handoffReviews': return client.from('handoff_reviews').insert({ id: rec.id, org_id: rec.orgId, handoff_id: rec.handoffId, version: rec.version, type: rec.type, by_member: rec.by, message: rec.message }).then(ok);
        case 'activity': return client.from('activity').insert({ id: rec.id, org_id: rec.orgId, actor_member: rec.actorId, data: { type: rec.type, text: rec.text, ref: rec.ref } }).then(ok);
        case 'invitations': if (op === 'remove') return client.from('invitations').delete().eq('id', id).then(ok); break;
        default: break;
      }
      return Promise.reject(new Error(`Saving ${coll} is not supported with shared accounts.`));
    }
  };

  async function loadWorkspace() {
    const [orgs, mems, meetings, tasks, handoffs, versions, reviews, activity, invites] = await Promise.all([
      client.from('organizations').select('*').then(ok),
      client.from('memberships').select('*').then(ok),
      client.from('meetings').select('data').then(ok),
      client.from('tasks').select('data').then(ok),
      client.from('handoffs').select('data').then(ok),
      client.from('handoff_versions').select('*').then(ok),
      client.from('handoff_reviews').select('*').then(ok),
      client.from('activity').select('*').order('at', { ascending: false }).limit(200).then(ok),
      client.from('invitations').select('*').is('accepted_at', null).then(ok)
    ]);
    const members = mems.map((m) => Object.assign({}, m.data, { id: m.id, orgId: m.org_id, userId: m.user_id, permission: m.permission, status: m.status, joinedAt: m.created_at }));
    const users = [{ id: user.id, name: (members.find((m) => m.userId === user.id) || {}).name || user.email, email: user.email }];
    return {
      schemaVersion: 1, mode: 'remote', users,
      orgs: orgs.map((o) => ({ id: o.id, name: o.name, currentTerm: o.current_term || {}, nextTerm: o.next_term || {}, createdAt: o.created_at })),
      members,
      meetings: meetings.map((r) => r.data), tasks: tasks.map((r) => r.data), handoffs: handoffs.map((r) => r.data),
      handoffVersions: versions.map((v) => ({ id: v.id, orgId: v.org_id, handoffId: v.handoff_id, version: v.version, submittedAt: v.submitted_at, submittedBy: v.submitted_by, snapshot: v.snapshot })),
      handoffReviews: reviews.map((r) => ({ id: r.id, orgId: r.org_id, handoffId: r.handoff_id, version: r.version, type: r.type, by: r.by_member, at: r.at, message: r.message })),
      activity: activity.map((a) => Object.assign({ id: a.id, orgId: a.org_id, at: a.at, actorId: a.actor_member }, a.data)),
      invitations: invites.map((i) => Object.assign({}, i.data, { id: i.id, orgId: i.org_id, email: i.email, permission: i.permission, createdAt: i.created_at, acceptedAt: i.accepted_at }))
    };
  }

  MN.Remote = {
    configured: () => !!(cfg().supabaseUrl && cfg().supabaseAnonKey),
    userId: () => (user ? user.id : null),
    async init() {
      await loadSdk();
      client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } });
      const { data } = await client.auth.getSession();
      user = data.session ? data.session.user : null;
      if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + (location.hash || '#/'));
      if (user && !MN.Session.get()) MN.Session.set({ mode: 'remote' });
    },
    sendLink(email) {
      const redirect = location.origin + location.pathname;
      return client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } }).then(({ error }) => { if (error) throw new Error(error.message); });
    },
    async restore() {
      if (!client) await MN.Remote.init();
      const { data } = await client.auth.getSession();
      user = data.session ? data.session.user : null;
      if (!user) return false;
      const ws = await loadWorkspace();
      MN.Store.open('remote', adapter, ws);
      MN.Session.patch({ mode: 'remote' });
      return true;
    },
    signOut: () => client.auth.signOut().then(({ error }) => { if (error) throw new Error(error.message); user = null; }),
    createOrganization: (name, displayName, termLabel) => client.rpc('create_organization', { org_name: name, display_name: displayName, term_label: termLabel || '' }).then(ok),
    createInvitation(input) {
      const { org } = MN.ctx();
      return client.from('invitations').insert({ org_id: org.id, email: input.email, permission: input.permission, data: { name: input.name, title: input.title, termStart: input.termStart, termEnd: input.termEnd } })
        .select('token').single().then(ok).then((row) => `${location.origin}${location.pathname}#/invite/${row.token}`);
    },
    revokeInvitation: (id) => adapter.apply({ coll: 'invitations', op: 'remove', id }).then(() => MN.Remote.restore()).then(() => MN.render()),
    acceptInvitation: (token) => {
      if (!user) return Promise.reject(new Error('Sign in with the invited email address first.'));
      return client.rpc('accept_invitation', { invite_token: token }).then(ok);
    }
  };
})();
