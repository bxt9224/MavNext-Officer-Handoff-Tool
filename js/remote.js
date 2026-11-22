/* MavNext — Supabase integration: individual accounts and shared organization data.
   Active only when js/config.js has a Supabase URL and publishable key.
   - Accounts: email + password (Supabase Auth stores and hashes passwords; MavNext never sees them
     after submission). New accounts confirm their email before signing in.
   - Authorization is enforced by the database policies in supabase/schema.sql. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  const CONSENT_VERSION = '2026-11-21';
  const IDLE_LIMIT_MS = 60 * 60 * 1000; // sign out after 60 minutes without activity
  const RESET_FLAG = 'mavnext.pendingReset';
  const CONFIRMED_FLAG = 'mavnext.emailConfirmed';
  const cfg = () => window.MAVNEXT_CONFIG || {};
  let client = null;
  let user = null;
  let profile = null;
  let recovery = false;
  let lastActivity = Date.now();
  let providerCache = null;

  const TABLE = { meetings: 'meetings', tasks: 'tasks', handoffs: 'handoffs' };
  // Email links can't open a local file, so from file:// we let Supabase use the project's Site URL.
  const redirectUrl = () => (location.protocol === 'file:' ? undefined : location.origin + location.pathname);

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the sign-in library. Check your connection.'));
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
        case 'orgs': return client.from('organizations').update({ name: rec.name, current_term: rec.currentTerm, next_term: rec.nextTerm, listed: rec.listed !== false }).eq('id', rec.id).then(ok);
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
    const [orgs, mems, meetings, tasks, handoffs, versions, reviews, activity, invites, requests, prof] = await Promise.all([
      client.from('organizations').select('*').then(ok),
      client.from('memberships').select('*').then(ok),
      client.from('meetings').select('data').then(ok),
      client.from('tasks').select('data').then(ok),
      client.from('handoffs').select('data').then(ok),
      client.from('handoff_versions').select('*').then(ok),
      client.from('handoff_reviews').select('*').then(ok),
      client.from('activity').select('*').order('at', { ascending: false }).limit(200).then(ok),
      client.from('invitations').select('*').is('accepted_at', null).then(ok),
      client.from('join_requests').select('*').order('created_at', { ascending: false }).limit(200).then(ok),
      client.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(ok)
    ]);
    profile = prof || null;
    const members = mems.map((m) => Object.assign({}, m.data, { id: m.id, orgId: m.org_id, userId: m.user_id, permission: m.permission, status: m.status, joinedAt: m.created_at }));
    return {
      schemaVersion: 1, mode: 'remote',
      users: [{ id: user.id, name: (profile && profile.full_name) || user.email, email: user.email }],
      orgs: orgs.map((o) => ({ id: o.id, name: o.name, currentTerm: o.current_term || {}, nextTerm: o.next_term || {}, listed: o.listed !== false, createdAt: o.created_at })),
      members,
      meetings: meetings.map((r) => r.data), tasks: tasks.map((r) => r.data), handoffs: handoffs.map((r) => r.data),
      handoffVersions: versions.map((v) => ({ id: v.id, orgId: v.org_id, handoffId: v.handoff_id, version: v.version, submittedAt: v.submitted_at, submittedBy: v.submitted_by, snapshot: v.snapshot })),
      handoffReviews: reviews.map((r) => ({ id: r.id, orgId: r.org_id, handoffId: r.handoff_id, version: r.version, type: r.type, by: r.by_member, at: r.at, message: r.message })),
      activity: activity.map((a) => Object.assign({ id: a.id, orgId: a.org_id, at: a.at, actorId: a.actor_member }, a.data)),
      invitations: invites.map((i) => Object.assign({}, i.data, { id: i.id, orgId: i.org_id, email: i.email, permission: i.permission, createdAt: i.created_at, expiresAt: i.expires_at, acceptedAt: i.accepted_at })),
      joinRequests: requests.map((r) => ({ id: r.id, orgId: r.org_id, orgName: r.org_name, userId: r.user_id, requesterName: r.requester_name, requesterEmail: r.requester_email, desiredTitle: r.desired_title, message: r.message, status: r.status, createdAt: r.created_at, decidedAt: r.decided_at }))
    };
  }

  function friendly(err) {
    const m = (err && err.message) || String(err || '');
    const code = (err && err.code) || '';
    if (code === 'weak_password' || /weak password|password should|password is known to be weak/i.test(m)) {
      const reasons = (err && err.reasons) || [];
      if (reasons.includes('pwned')) return 'This password has appeared in a known data breach. Choose a different one.';
      return `Choose a stronger password. ${MN.Password ? MN.Password.ruleText() : ''}`.trim();
    }
    if (/invalid login credentials/i.test(m)) return 'Email or password is incorrect.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first — open the confirmation link we sent you.';
    if (/provider is not enabled|unsupported provider/i.test(m)) return 'Google sign-in isn\'t turned on for MavNext yet. Use your email and password for now.';
    if (/rate limit|too many/i.test(m)) return 'Too many attempts. Wait a few minutes and try again. (The free email service sends only a few emails per hour.)';
    if (/not authorized/i.test(m)) return 'This email address can\'t receive MavNext emails yet. The project owner must add it to the Supabase team or connect a custom email service.';
    if (/signups not allowed|signup is disabled/i.test(m)) return 'New accounts are switched off right now. Ask the project owner.';
    if (/current password required|current_password/i.test(m)) return 'Your current password is incorrect.';
    if (/same password|different from the old/i.test(m)) return 'The new password must be different from your current one.';
    if (/failed to fetch|network/i.test(m)) return 'Could not reach the server. Check your connection.';
    return m || 'Something went wrong. Please try again.';
  }

  function trackIdle() {
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));
    setInterval(() => {
      if (user && Date.now() - lastActivity > IDLE_LIMIT_MS) {
        MN.Remote.signOut().then(() => { MN.Store.close(); MN.Session.end(); location.hash = '#/signin'; MN.toast('You were signed out after 60 minutes of inactivity.'); });
      }
    }, 60 * 1000);
  }

  MN.Remote = {
    CONSENT_VERSION,
    friendly,
    configured: () => !!(cfg().supabaseUrl && cfg().supabaseAnonKey),
    /** Shareable address for links (invitations). From a local file, use the published site. */
    siteUrl: () => (location.protocol === 'file:' ? (cfg().siteUrl || '') : location.origin + location.pathname),
    ready: () => !!client,
    userId: () => (user ? user.id : null),
    userEmail: () => (user ? user.email : ''),
    profile: () => profile,
    inRecovery: () => recovery,
    async init() {
      await loadSdk();
      client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } });
      client.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') recovery = true; });
      const { data } = await client.auth.getSession();
      user = data.session ? data.session.user : null;
      const fromLink = location.search.includes('code=');
      let resetPending = false; try { resetPending = !!localStorage.getItem(RESET_FLAG); } catch (e) { /* ignore */ }
      // A signup confirmation link signs the new account in. Show a confirmed notice on the sign-in page instead.
      if (fromLink && user && !recovery && !resetPending && user.app_metadata && user.app_metadata.provider === 'email') {
        await client.auth.signOut().catch(() => {});
        user = null;
        try { localStorage.setItem(CONFIRMED_FLAG, '1'); } catch (e) { /* ignore */ }
        history.replaceState(null, '', location.pathname + '#/signin');
        return { fromLink: false };
      }
      if (fromLink) history.replaceState(null, '', location.pathname + (location.hash || '#/'));
      try { if (user && localStorage.getItem(RESET_FLAG)) recovery = true; } catch (e) { /* ignore */ }
      const sess = MN.Session.get();
      if (user && (!sess || fromLink || sess.mode === 'remote')) MN.Session.patch({ mode: 'remote' });
      trackIdle();
      return { fromLink };
    },

    // ----- accounts -----
    async signUp(input) {
      const { data, error } = await client.auth.signUp({
        email: input.email, password: input.password,
        options: { emailRedirectTo: redirectUrl(), data: Object.assign({ full_name: input.fullName }, input.consent ? { grad_term: input.gradTerm || '', major: input.major || '', consent_version: CONSENT_VERSION } : {}) }
      });
      if (error) { const e = new Error(friendly(error)); e.weak = error.code === 'weak_password'; throw e; }
      if (data.session) { user = data.session.user; MN.Session.set({ mode: 'remote' }); return { signedIn: true }; }
      return { signedIn: false };
    },
    async signIn(email, password) {
      try { localStorage.removeItem(RESET_FLAG); } catch (e) { /* ignore */ }
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) { const e = new Error(friendly(error)); e.unconfirmed = /not confirmed/i.test(error.message); throw e; }
      user = data.user; lastActivity = Date.now();
      MN.Session.set({ mode: 'remote' });
    },
    /** Google sign-in (OAuth with PKCE). Leaves the page; Supabase returns to this address with ?code=. */
    async signInWithGoogle() {
      if (!client) await MN.Remote.init();
      try { localStorage.removeItem(RESET_FLAG); } catch (e) { /* ignore */ }
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl(), queryParams: { prompt: 'select_account' } } });
      if (error) throw new Error(friendly(error));
    },
    /** Whether an external provider is switched on in Supabase (public settings endpoint). null if unknown. */
    providerEnabled(name) {
      if (!providerCache) {
        providerCache = fetch(`${cfg().supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: cfg().supabaseAnonKey } })
          .then((r) => (r.ok ? r.json() : null)).then((j) => j && j.external ? j.external : null).catch(() => null);
      }
      return providerCache.then((ext) => (ext && name in ext ? !!ext[name] : null));
    },
    userMeta: () => (user && user.user_metadata) || {},
    resendConfirmation: (email) => client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl() } }).then(({ error }) => { if (error) throw new Error(friendly(error)); }),
    sendPasswordReset(email) {
      try { localStorage.setItem(RESET_FLAG, '1'); } catch (e) { /* ignore */ }
      return client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() }).then(({ error }) => { if (error) throw new Error(friendly(error)); });
    },
    /** currentPassword: required by this project's Supabase setting for normal password changes;
        not needed after a reset link (Supabase exempts recovery sessions). */
    async updatePassword(password, currentPassword) {
      const attrs = currentPassword ? { password, current_password: currentPassword } : { password };
      const { error } = await client.auth.updateUser(attrs);
      if (error) { const e = new Error(friendly(error)); e.weak = error.code === 'weak_password'; throw e; }
      recovery = false;
      try { localStorage.removeItem(RESET_FLAG); } catch (e) { /* ignore */ }
    },
    async signOut(everywhere) {
      const { error } = await client.auth.signOut(everywhere ? { scope: 'global' } : undefined);
      if (error) throw new Error(friendly(error));
      user = null; profile = null; recovery = false;
      try { localStorage.removeItem('mavnext.pendingInvite'); localStorage.removeItem(RESET_FLAG); } catch (e) { /* ignore */ }
    },
    async saveProfile(p) {
      const row = { user_id: user.id, full_name: p.fullName, grad_term: p.gradTerm || null, major: p.major || null, consent_version: CONSENT_VERSION };
      profile = ok(await client.from('profiles').upsert(row).select().single());
      return profile;
    },
    async loadProfile() {
      profile = ok(await client.from('profiles').select('*').eq('user_id', user.id).maybeSingle()) || null;
      return profile;
    },

    // ----- workspace -----
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
    reload: () => MN.Remote.restore().then(() => MN.render()),
    createOrganization: (name, title, termLabel) => client.rpc('create_organization', { org_name: name, display_name: (profile && profile.full_name) || '', term_label: termLabel || '', officer_title: title || '' }).then(ok),
    leaveOrganization: (orgId) => client.rpc('leave_organization', { org: orgId }).then(ok),

    // ----- invitations -----
    createInvitation(input) {
      const { org } = MN.ctx();
      return client.from('invitations').insert({ org_id: org.id, email: input.email, permission: input.permission, data: { name: input.name, title: input.title, termStart: input.termStart, termEnd: input.termEnd } })
        .select('token').single().then(ok).then((row) => MN.Remote.restore().then(() => { MN.render(); return `${MN.Remote.siteUrl()}#/invite/${row.token}`; }));
    },
    revokeInvitation: (id) => adapter.apply({ coll: 'invitations', op: 'remove', id }).then(() => MN.Remote.reload()),
    acceptInvitation: (token) => {
      if (!user) return Promise.reject(new Error('Sign in with the invited email address first.'));
      return client.rpc('accept_invitation', { invite_token: token }).then(ok);
    },

    // ----- directory + join requests -----
    directory: (search) => client.rpc('org_directory', { search: search || '' }).then(ok),
    requestToJoin: (orgId, title, note) => client.rpc('request_to_join', { org: orgId, title: title || '', note: note || '' }).then(ok),
    cancelRequest: (id) => client.rpc('cancel_join_request', { req: id }).then(ok),
    decideRequest: (id, approve, perm, title) => client.rpc('decide_join_request', { req: id, approve, perm: perm || 'officer', title: title || '' }).then(ok),
    myRequests: () => client.from('join_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(ok)
  };
})();
