/* MavNext — app shell, routing, session handling, entry screens.
   Hash routing (#/overview) keeps refresh and back/forward working on
   GitHub Pages repository subpaths without server rewrites. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon, ui } = MN;
  MN.views = MN.views || {};
  MN.actions = MN.actions || {};
  MN.forms = MN.forms || {};
  MN.changes = MN.changes || {};
  MN.inputs = MN.inputs || {};

  const NAV = [
    { key: 'overview', label: 'Overview', icon: 'overview', href: '#/overview' },
    { key: 'meetings', label: 'Meetings & Events', icon: 'calendar', href: '#/meetings' },
    { key: 'tasks', label: 'Tasks', icon: 'tasks', href: '#/tasks' },
    { key: 'handoffs', label: 'Handoffs', icon: 'handoff', href: '#/handoffs' },
    { key: 'members', label: 'Members & Roles', icon: 'users', href: '#/members' },
    { key: 'archive', label: 'Archive', icon: 'archive', href: '#/archive' }
  ];

  // ---------- Context ----------
  MN.ctx = function () {
    const ws = MN.Store.ws;
    if (!ws) return {};
    const sess = MN.Session.get() || {};
    const mode = MN.Store.mode;
    const userId = mode === 'demo' ? sess.actingUserId : mode === 'local' ? 'u_local' : (MN.Remote && MN.Remote.userId());
    const user = (ws.users || []).find((u) => u.id === userId) || null;
    const memberships = ws.members.filter((m) => m.userId === userId && m.status === 'active');
    const orgs = memberships.map((m) => ws.orgs.find((o) => o.id === m.orgId)).filter(Boolean);
    const org = orgs.find((o) => o.id === sess.orgId) || orgs[0] || null;
    const me = org ? memberships.find((m) => m.orgId === org.id) : null;
    return { mode, user, userId, orgs, org, me, sess };
  };

  // ---------- Routing ----------
  MN.route = function () {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, query] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const q = {};
    (query || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { parts, q, path };
  };
  MN.go = (hash) => { if (location.hash === hash) MN.render({ nav: true }); else location.hash = hash; };

  function resolveView(parts) {
    const [a, b, c] = parts;
    switch (a) {
      case undefined: case '': return { view: 'entry' };
      case 'signin': return { view: 'signin' };
      case 'signup': return { view: 'signup' };
      case 'local-setup': return { view: 'localSetup' };
      case 'invite': return { view: 'invite', id: b };
      case 'check-email': return { view: 'checkEmail' };
      case 'forgot': return { view: 'forgot' };
      case 'privacy': return { view: 'privacy' };
      case 'reset-password': return { view: 'resetPassword' };
      case 'profile-setup': return { view: 'profileSetup' };
      case 'welcome': return { view: 'welcome' };
      case 'overview': return { view: 'overview', nav: 'overview' };
      case 'meetings':
        if (b === 'new') return { view: 'meetingForm', nav: 'meetings' };
        if (b && c === 'edit') return { view: 'meetingForm', id: b, nav: 'meetings' };
        if (b) return { view: 'meetingDetail', id: b, nav: 'meetings' };
        return { view: 'meetings', nav: 'meetings' };
      case 'tasks': return { view: 'tasks', nav: 'tasks' };
      case 'handoffs':
        if (b === 'new') return { view: 'handoffNew', nav: 'handoffs' };
        if (b && c === 'review') return { view: 'handoffReview', id: b, nav: 'handoffs' };
        if (b && c === 'view') return { view: 'handoffView', id: b, nav: 'handoffs' };
        if (b) return { view: 'handoffEditor', id: b, nav: 'handoffs' };
        return { view: 'handoffs', nav: 'handoffs' };
      case 'members': return { view: 'members', nav: 'members' };
      case 'archive': return { view: 'archive', nav: 'archive' };
      case 'settings': return { view: 'settings', nav: 'settings' };
      default: return { view: 'notFound' };
    }
  }
  const PUBLIC_VIEWS = ['entry', 'signin', 'signup', 'localSetup', 'invite', 'checkEmail', 'forgot', 'privacy'];
  // Full-page views that need a signed-in account but no organization.
  const BARE_VIEWS = ['welcome', 'profileSetup', 'resetPassword'];

  // ---------- Opening workspaces ----------
  MN.openDemo = function () {
    const adapter = new MN.LocalAdapter(MN.KEYS.demo);
    let ws = adapter.load();
    if (!ws || ws.mode !== 'demo') { ws = MN.buildDemoWorkspace(); adapter.write(ws); }
    MN.Store.open('demo', adapter, ws);
    const sess = MN.Session.get();
    if (!sess || sess.mode !== 'demo') MN.Session.set({ mode: 'demo', actingUserId: 'u_maya', orgId: 'org_rrs' });
  };
  MN.openLocal = function () {
    const adapter = new MN.LocalAdapter(MN.KEYS.local);
    const ws = adapter.load();
    if (!ws) return false;
    MN.Store.open('local', adapter, ws);
    const sess = MN.Session.get();
    if (!sess || sess.mode !== 'local') MN.Session.set({ mode: 'local', orgId: ws.orgs[0] && ws.orgs[0].id });
    return true;
  };
  MN.leaveWorkspace = function () {
    MN.Store.close();
    MN.Session.end();
    MN.go('#/');
  };

  function restoreSession() {
    if (MN.Store.ws) return Promise.resolve(true);
    const sess = MN.Session.get();
    if (!sess) return Promise.resolve(false);
    if (sess.mode === 'demo') { MN.openDemo(); return Promise.resolve(true); }
    if (sess.mode === 'local') { if (MN.openLocal()) return Promise.resolve(true); MN.Session.end(); return Promise.resolve(false); }
    if (sess.mode === 'remote' && MN.Remote && MN.Remote.configured()) {
      return MN.Remote.restore().then((ok) => { if (!ok) MN.Session.end(); return ok; }, () => { MN.Session.end(); return false; });
    }
    MN.Session.end();
    return Promise.resolve(false);
  }

  // ---------- Shell ----------
  function navCount(key, c) {
    if (key !== 'tasks' || !c.me) return '';
    const n = MN.Store.list('tasks', c.org.id).filter((t) => t.assigneeId === c.me.id && t.status !== 'done').length;
    return n ? html`<span class="count" aria-label="${n} open assigned to you">${n}</span>` : '';
  }

  function shell(c, active, crumbs, body) {
    const modePill = c.mode === 'demo'
      ? html`<span class="demo-pill">${icon('compass', 'icon-sm')}Demo<span class="long">&nbsp;workspace</span></span>`
      : c.mode === 'local' ? html`<span class="demo-pill local-pill" title="Records are stored only in this browser">${icon('device', 'icon-sm')}<span class="long">This browser only</span></span>` : '';
    const permLabel = c.me ? (MN.PERMISSIONS[c.me.permission] || {}).label : '';
    const demoPeople = c.mode === 'demo' ? MN.Store.ws.users.filter((u) => MN.Store.ws.members.some((m) => m.userId === u.id && m.status === 'active')) : [];
    return html`
      <div class="shell" id="shell">
        <aside class="sidebar" id="sidebar" aria-label="Main navigation">
          <div class="sidebar-logo"><a href="#/overview" aria-label="MavNext overview"><img src="assets/mavnext-logo-trimmed.png" alt="MavNext" width="175" height="30"></a></div>
          <nav aria-label="Primary"><ul class="nav">
            ${NAV.map((n) => html`<li><a href="${n.href}" ${active === n.key ? MN.raw('aria-current="page"') : ''}>${icon(n.icon)}<span>${n.label}</span>${navCount(n.key, c)}</a></li>`)}
          </ul></nav>
          <div class="sidebar-bottom">
            <ul class="nav"><li><a href="#/settings" ${active === 'settings' ? MN.raw('aria-current="page"') : ''}>${icon('settings')}<span>Settings</span></a></li></ul>
            <p class="pilot-note">Independent student pilot. Not affiliated with or endorsed by UTA.</p>
          </div>
        </aside>
        <div class="drawer-backdrop" data-action="closeDrawer"></div>
        <div class="main-col">
          <header class="topbar">
            <button type="button" class="icon-btn menu-btn" data-action="toggleDrawer" aria-controls="sidebar" aria-expanded="false" aria-label="Open navigation">${icon('menu')}</button>
            <div class="org-select">
              <label for="org-switch" class="sr-only">Organization</label>
              <select id="org-switch" data-change="switchOrg">
                ${c.orgs.map((o) => html`<option value="${o.id}" ${o.id === c.org.id ? 'selected' : ''}>${o.name}</option>`)}
              </select>
            </div>
            <div class="crumbs" aria-label="Current page">${crumbs.map((cr, i) => html`${i ? html`<span class="sep" aria-hidden="true">/</span>` : ''}${i === crumbs.length - 1 ? html`<span class="here">${cr.label}</span>` : html`<a href="${cr.href}">${cr.label}</a>`}`)}</div>
            <div class="topbar-right">
              ${modePill}
              <div class="menu-wrap">
                <button type="button" class="profile-btn" data-action="toggleProfile" aria-haspopup="true" aria-expanded="false" aria-controls="profile-menu">
                  ${ui.avatar(c.me)}<span class="profile-meta"><strong>${c.me ? c.me.name : ''}</strong><span>${c.me ? c.me.title : ''}</span></span>${icon('chevronDown', 'icon-sm')}
                </button>
                <div class="menu" id="profile-menu" hidden>
                  <div class="menu-head"><strong>${c.me ? c.me.name : ''}</strong><br><span class="muted">${(c.user && c.user.email) || (c.mode === 'local' ? 'No account — this browser only' : '')}</span><br><span class="muted">${permLabel} · ${c.org.name}</span></div>
                  <a class="menu-item" href="#/settings">${icon('settings')}${c.mode === 'remote' ? 'Settings, account & security' : 'Settings'}</a>
                  ${c.mode === 'remote' ? html`<a class="menu-item" href="#/welcome">${icon('userPlus')}Join or create an organization</a><button type="button" class="menu-item" data-action="signOut">${icon('logout')}Sign out</button>` : ''}
                  ${c.mode === 'demo' ? html`<button type="button" class="menu-item" data-action="leave">${icon('logout')}Exit demo</button>` : ''}
                  ${c.mode === 'local' ? html`<button type="button" class="menu-item" data-action="leave">${icon('logout')}Close workspace</button>` : ''}
                </div>
              </div>
            </div>
          </header>
          ${c.mode === 'demo' ? html`
            <div class="demo-bar" role="region" aria-label="Demo controls">
              <span>Fictional demo data, stored only in this browser. Deliveries and sign-ins are simulated.</span>
              <label for="demo-as">View as (simulated, not a sign-in):</label>
              <select id="demo-as" data-change="demoSwitch">
                ${demoPeople.map((u) => { const m = MN.Store.ws.members.find((x) => x.userId === u.id && x.status === 'active'); return html`<option value="${u.id}" ${u.id === c.userId ? 'selected' : ''}>${u.name} — ${m.title} (${MN.PERMISSIONS[m.permission].short})</option>`; })}
              </select>
            </div>` : ''}
          <main id="main-content" class="content" tabindex="-1">${body}</main>
        </div>
      </div>`;
  }

  // ---------- Render ----------
  let lastPath = null;
  MN.render = function (opts) {
    const app = document.getElementById('app');
    const r = MN.route();
    const target = resolveView(r.parts);
    const isNav = (opts && opts.nav) || r.path !== lastPath;
    lastPath = r.path;

    if (!MN.Store.ws && !PUBLIC_VIEWS.includes(target.view)) {
      app.innerHTML = '<p class="sr-only" role="status">Loading…</p>';
      const initial = !!(opts && opts.initial);
      restoreSession().then((ok) => { if (!ok) history.replaceState(null, '', '#/'); MN.render({ nav: true, initial }); });
      return;
    }
    if (MN.Store.ws && target.view === 'entry') { history.replaceState(null, '', '#/overview'); return MN.render({ nav: true, initial: opts && opts.initial }); }
    if (MN.Store.mode === 'remote') {
      const redirect = (h) => { history.replaceState(null, '', h); return MN.render({ nav: true, initial: opts && opts.initial }); };
      if (MN.Remote.inRecovery() && target.view !== 'resetPassword') return redirect('#/reset-password');
      if (!MN.Remote.inRecovery() && !MN.Remote.profile() && !['profileSetup', 'privacy'].includes(target.view)) return redirect('#/profile-setup');
      if (['signin', 'signup', 'checkEmail', 'forgot'].includes(target.view)) return redirect('#/overview');
      if (!PUBLIC_VIEWS.includes(target.view) && !BARE_VIEWS.includes(target.view) && !MN.ctx().org) return redirect('#/welcome');
    } else if (BARE_VIEWS.includes(target.view)) { history.replaceState(null, '', '#/'); return MN.render({ nav: true }); }

    // Let the previous page clean up (e.g. the landing page's scroll animations) before switching.
    if (MN.onLeave) { const leave = MN.onLeave; MN.onLeave = null; try { leave(); } catch (e) { console.error(e); } }
    const params = Object.assign({}, target, { q: r.q });
    const view = MN.views[target.view] || MN.views.notFound;
    const scrollY = window.scrollY;

    if (PUBLIC_VIEWS.includes(target.view) || BARE_VIEWS.includes(target.view)) {
      app.innerHTML = String(view.render(params, MN.Store.ws ? MN.ctx() : null));
      document.title = `${view.title || 'MavNext'} · MavNext`;
    } else {
      const c = MN.ctx();
      if (!c.org || !c.me) {
        app.innerHTML = String(html`<div class="entry"><div class="entry-main"><div class="auth-card"><h1 tabindex="-1" data-page-title>No active membership</h1><p class="muted" style="margin-bottom:16px">This account is not an active member of any organization. Ask an administrator for an invitation link, or create a new workspace and become its administrator.</p>
          ${c.mode === 'remote' ? html`<form data-form="createOrg" novalidate>
            <div class="field"><label for="co-name">Organization name</label><input class="input" id="co-name" name="orgName" maxlength="120"><p class="field-error" data-err-for="orgName" hidden></p></div>
            <div class="field"><label for="co-me">Your name</label><input class="input" id="co-me" name="myName" maxlength="80"><p class="field-error" data-err-for="myName" hidden></p></div>
            <div class="field"><label for="co-term">Current term</label><input class="input" id="co-term" name="term" maxlength="40" placeholder="e.g., Fall 2026"></div>
            <button class="btn btn-primary" type="submit">Create workspace</button></form>` : ''}
          <div class="btn-row" style="margin-top:16px"><button class="btn" data-action="${c.mode === 'remote' ? 'signOut' : 'leave'}">${c.mode === 'remote' ? 'Sign out' : 'Back to start'}</button></div></div></div></div>`);
        return;
      }
      let out;
      try { out = view.render(params, c); } catch (e) { console.error(e); out = ui.empty('alert', 'This page could not be displayed', 'Something went wrong while showing this page. Your records were not changed.', html`<a class="btn" href="#/overview">Go to overview</a>`); }
      const crumbs = (view.crumbs ? view.crumbs(params, c) : [{ label: view.title || '' }]);
      app.innerHTML = String(shell(c, target.nav, crumbs, out));
      document.title = `${crumbs[crumbs.length - 1].label} · ${c.org.name} · MavNext`;
    }
    if (view.mount) view.mount(document.getElementById('main-content') || app, params, MN.ctx());
    if (isNav) {
      window.scrollTo(0, 0);
      const h1 = app.querySelector('[data-page-title]');
      if (h1 && !(opts && opts.initial)) h1.focus({ preventScroll: true });
    } else window.scrollTo(0, scrollY);
  };

  // ---------- Global event delegation ----------
  function closeMenus(except) {
    document.querySelectorAll('.menu').forEach((m) => { if (m !== except) { m.hidden = true; const b = document.querySelector(`[aria-controls="${m.id}"]`); if (b) b.setAttribute('aria-expanded', 'false'); } });
  }
  function setDrawer(open) {
    const shellEl = document.getElementById('shell');
    if (!shellEl) return;
    shellEl.classList.toggle('drawer-open', open);
    const b = shellEl.querySelector('.menu-btn');
    if (b) b.setAttribute('aria-expanded', String(open));
    if (open) { const first = shellEl.querySelector('.sidebar a'); if (first) first.focus(); } else if (b && getComputedStyle(b).display !== 'none') b.focus();
  }
  MN.actions.toggleDrawer = () => setDrawer(!document.getElementById('shell').classList.contains('drawer-open'));
  MN.actions.closeDrawer = () => setDrawer(false);
  MN.actions.toggleProfile = (el) => {
    const menu = document.getElementById('profile-menu');
    const open = menu.hidden;
    closeMenus();
    menu.hidden = !open; el.setAttribute('aria-expanded', String(open));
    if (open) { const f = menu.querySelector('.menu-item'); if (f) f.focus(); }
  };
  MN.actions.leave = () => {
    const mode = MN.Store.mode;
    const body = mode === 'demo' ? html`<p>You will return to the start screen. The demo workspace stays in this browser until you reset it.</p>` : html`<p>You will return to the start screen. This browser-only workspace is not deleted; open it again with "Use on this device".</p>`;
    MN.confirm({ title: mode === 'demo' ? 'Exit demo?' : 'Close workspace?', body, confirmLabel: mode === 'demo' ? 'Exit demo' : 'Close workspace' }).then((ok) => { if (ok) MN.leaveWorkspace(); });
  };
  MN.actions.signOut = () => { MN.Remote.signOut().then(() => { MN.Store.close(); MN.Session.end(); MN.go('#/signin'); MN.toast('Signed out.'); }, () => MN.toast('Sign-out failed. Check your connection and try again.')); };
  MN.changes.switchOrg = (el) => { MN.Session.patch({ orgId: el.value }); MN.go('#/overview'); };
  MN.changes.demoSwitch = (el) => {
    const ws = MN.Store.ws;
    const sess = MN.Session.get();
    const still = ws.members.find((m) => m.userId === el.value && m.orgId === sess.orgId && m.status === 'active');
    const first = ws.members.find((m) => m.userId === el.value && m.status === 'active');
    MN.Session.patch({ actingUserId: el.value, orgId: still ? sess.orgId : first.orgId });
    const u = ws.users.find((x) => x.id === el.value);
    MN.toast(`Now viewing the demo as ${u.name} (simulated).`);
    MN.render({ nav: true });
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!e.target.closest('.menu-wrap')) closeMenus();
    if (a && MN.actions[a.dataset.action]) {
      if (a.tagName === 'A') e.preventDefault();
      try { MN.actions[a.dataset.action](a, e); } catch (err) { MN.toast(err.message || 'That action could not be completed.'); }
      return;
    }
    const link = e.target.closest('.sidebar a');
    if (link) setDrawer(false);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && MN.changes[el.dataset.change]) { try { MN.changes[el.dataset.change](el, e); } catch (err) { MN.toast(err.message); } }
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el && MN.inputs[el.dataset.input]) MN.inputs[el.dataset.input](el, e);
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (f && MN.forms[f.dataset.form]) {
      e.preventDefault();
      try {
        const r = MN.forms[f.dataset.form](f, e);
        if (r && r.catch) r.catch((err) => MN.toast(err.message || 'Could not save.'));
      } catch (err) { MN.toast(err.message || 'Could not save.'); }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openMenu = document.querySelector('.menu:not([hidden])');
    if (openMenu) { closeMenus(); const b = document.querySelector(`[aria-controls="${openMenu.id}"]`); if (b) b.focus(); return; }
    const shellEl = document.getElementById('shell');
    if (shellEl && shellEl.classList.contains('drawer-open')) setDrawer(false);
  });
  window.addEventListener('hashchange', () => MN.render());
  // Another tab changed the same workspace: reload records so this tab does not overwrite them with stale data.
  window.addEventListener('storage', (e) => {
    if (!MN.Store.ws || !MN.Store.adapter || MN.Store.adapter.kind !== 'local') return;
    if (e.key === MN.Store.adapter.key && e.newValue) {
      try { MN.Store.ws = JSON.parse(e.newValue); MN.render(); } catch (err) { /* ignore malformed */ }
    }
  });
  MN.Store.subscribe((kind) => { if (kind === 'change') MN.render(); });

  // ---------- Entry screens ----------
  const brandPanel = () => MN.brandPanel();

  // MN.views.entry (the public landing page) lives in js/views-landing.js.
  MN.actions.enterDemo = () => { MN.openDemo(); MN.go('#/overview'); };
  MN.actions.enterLocal = () => { if (MN.openLocal()) MN.go('#/overview'); else MN.go('#/local-setup'); };

  MN.views.localSetup = {
    title: 'Set up this device',
    render() {
      const legacy = MN.readLegacyDraft();
      const meta = (legacy && legacy.data && legacy.data.meta) || {};
      return html`
        <div class="entry">${brandPanel()}
          <section class="entry-main"><div class="auth-card">
            <a class="back-link" href="#/">${icon('chevronLeft', 'icon-sm')}Back</a>
            <h1 tabindex="-1" data-page-title>Use on this device</h1>
            <p class="muted" style="margin-bottom:24px">This creates a workspace stored only in this browser. It is not shared, backed up, or synced. Use "Export" in Settings to keep a copy.</p>
            <form data-form="localSetup" novalidate>
              <div class="field"><label for="ls-org">Organization name <span class="req" aria-hidden="true">*</span></label><input class="input" id="ls-org" name="orgName" maxlength="120" required value="${meta.orgName || ''}"><p class="field-error" data-err-for="orgName" hidden></p></div>
              <div class="field"><label for="ls-name">Your name <span class="req" aria-hidden="true">*</span></label><input class="input" id="ls-name" name="myName" maxlength="80" required value="${meta.outgoingOfficer || ''}"><p class="field-error" data-err-for="myName" hidden></p></div>
              <div class="field"><label for="ls-term">Current term</label><input class="input" id="ls-term" name="termLabel" maxlength="40" placeholder="e.g., Fall 2026"></div>
              ${legacy && !legacy.corrupt ? html`<label class="check"><input type="checkbox" name="importLegacy" checked> <span>Import a copy of my earlier handoff draft. The original stays in this browser unchanged.</span></label>` : ''}
              ${legacy && legacy.corrupt ? html`<div class="notice notice-warn">${icon('alert')}<div>An earlier draft exists but could not be read. It has been left untouched.</div></div>` : ''}
              <div class="btn-row" style="margin-top:16px"><button class="btn btn-primary" type="submit">Create workspace</button></div>
            </form>
          </div></section>
        </div>`;
    }
  };
  MN.forms.localSetup = (form) => {
    const d = MN.formData(form);
    const errs = {};
    if (!d.orgName.trim()) errs.orgName = 'Enter your organization name.';
    if (!d.myName.trim()) errs.myName = 'Enter your name.';
    if (!MN.showErrors(form, errs)) return;
    const legacy = d.importLegacy ? MN.readLegacyDraft() : null;
    const ws = MN.buildLocalWorkspace({ orgName: d.orgName.trim(), myName: d.myName.trim(), termLabel: d.termLabel.trim(), legacy: legacy && legacy.data });
    if (legacy && legacy.data) ws.members[0].name = d.myName.trim();
    const adapter = new MN.LocalAdapter(MN.KEYS.local);
    return adapter.write(ws).then(() => {
      MN.Session.set({ mode: 'local', orgId: ws.orgs[0].id });
      MN.Store.open('local', adapter, ws);
      MN.go(legacy && ws.handoffs[0] ? `#/handoffs/${ws.handoffs[0].id}` : '#/overview');
      if (legacy) MN.toast('Imported a copy of your earlier draft. The original was not changed.');
    });
  };

  MN.views.notFound = { title: 'Not found', render() { return ui.empty('alert', 'Page not found', 'This address does not match a page in MavNext.', html`<a class="btn" href="#/overview">Go to overview</a>`); } };

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    const start = () => MN.render({ nav: true, initial: true });
    if (!(MN.Remote && MN.Remote.configured())) return start();
    MN.Remote.init().then(() => {
      const sess = MN.Session.get();
      if (!MN.Remote.userId() || (sess && sess.mode !== 'remote')) return start();
      return MN.Remote.restore().then(() => {
        let pending = null;
        try { pending = localStorage.getItem(MN.PENDING_INVITE); } catch (e) { /* storage unavailable */ }
        if (pending) history.replaceState(null, '', `#/invite/${pending}`);
        else if (!location.hash || location.hash === '#/') history.replaceState(null, '', '#/overview');
        start();
      });
    }).catch((err) => { console.error(err); MN.toast('Shared accounts are unavailable right now. Check your connection.'); start(); });
  });
})();
