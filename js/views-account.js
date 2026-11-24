/* MavNext — accounts: sign up, sign in, password reset, profile, privacy notice,
   onboarding (create organization / accept invitation / request to join), invitations. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon, ui } = MN;
  const PENDING_INVITE = 'mavnext.pendingInvite';
  MN.PENDING_INVITE = PENDING_INVITE;
  const R = () => MN.Remote;
  const remoteOn = () => !!(MN.Remote && MN.Remote.configured());

  // ---------- shared pieces ----------
  MN.brandPanel = () => html`
    <section class="entry-brand" aria-label="About MavNext">
      <img src="assets/mavnext-logo-trimmed.png" alt="MavNext" width="260" height="44">
      <h1>A leadership workspace for student organization officers.</h1>
      <p class="muted">Plan meetings, track tasks, and pass each role to the next officer with a structured, reviewable handoff.</p>
      <div class="flow" aria-label="How it fits together"><span>Workspace</span>${icon('chevronRight', 'icon-sm')}<span>Meetings &amp; tasks</span>${icon('chevronRight', 'icon-sm')}<span>Role handoff</span>${icon('chevronRight', 'icon-sm')}<span>Incoming review</span>${icon('chevronRight', 'icon-sm')}<span>Archive</span></div>
      <p class="small muted">An independent student-developed pilot. Not an official UTA service and not endorsed by the university.</p>
    </section>`;
  const page = (inner, wide) => html`<div class="entry">${MN.brandPanel()}<section class="entry-main"><div class="auth-card" ${wide ? MN.raw('style="max-width:620px"') : ''}>${inner}</div></section></div>`;
  const back = (href, label) => html`<a class="back-link" href="${href}">${icon('chevronLeft', 'icon-sm')}${label || 'Back'}</a>`;

  function gradTerms() {
    const y = new Date().getFullYear();
    const out = [];
    for (let i = 0; i <= 6; i += 1) ['Spring', 'Summer', 'Fall'].forEach((s) => out.push(`${s} ${y + i}`));
    return out;
  }
  const MAJORS = ['Information Systems', 'Computer Science', 'Business Administration', 'Finance', 'Accounting', 'Marketing', 'Management', 'Nursing', 'Biology', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Psychology', 'Economics', 'Political Science', 'Undeclared'];
  const profileFields = (p) => html`
    <div class="field"><label for="pf-name">Full name <span class="req" aria-hidden="true">*</span></label><input class="input" id="pf-name" name="fullName" autocomplete="name" maxlength="80" value="${(p && p.full_name) || ''}" required><p class="field-error" data-err-for="fullName" hidden></p></div>
    <div class="grid-2">
      <div class="field"><label for="pf-grad">Expected graduation <span class="req" aria-hidden="true">*</span></label><select class="select" id="pf-grad" name="gradTerm"><option value="">Choose a term</option>${gradTerms().map((g) => html`<option ${p && p.grad_term === g ? 'selected' : ''}>${g}</option>`)}<option value="Not a student" ${p && p.grad_term === 'Not a student' ? 'selected' : ''}>Not a student (advisor or staff)</option></select><p class="field-error" data-err-for="gradTerm" hidden></p></div>
      <div class="field"><label for="pf-major">Major <span class="muted">(optional)</span></label><input class="input" id="pf-major" name="major" list="major-list" maxlength="80" value="${(p && p.major) || ''}"><datalist id="major-list">${MAJORS.map((m) => html`<option value="${m}">`)}</datalist></div>
    </div>`;
  const consentField = () => html`
    <label class="check" style="margin-top:4px"><input type="checkbox" name="consent" required>
      <span>I have read the <a href="#/privacy" target="_blank" rel="noopener">privacy notice</a> and agree that MavNext stores my name, email, graduation term, optional major, and the club records I create, to run my organization's workspace.</span></label>
    <p class="field-error" data-err-for="consent" hidden></p>`;
  function profileErrors(d) {
    const e = {};
    if (!d.fullName || d.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
    if (!d.gradTerm) e.gradTerm = 'Choose your expected graduation term.';
    if ('consent' in d && !d.consent) e.consent = 'You need to agree to the privacy notice to continue.';
    return e;
  }

  MN.profileFields = profileFields;
  MN.consentField = consentField;
  MN.profileErrors = profileErrors;

  const status = () => html`<div role="status" aria-live="polite" data-status style="margin-top:12px"></div>`;
  function setStatus(kind, msg) {
    const st = document.querySelector('[data-status]');
    if (st) st.innerHTML = msg ? String(html`<div class="notice notice-${kind}">${icon(kind === 'ok' ? 'check' : kind === 'danger' ? 'alert' : 'info')}<div>${msg}</div></div>`) : '';
  }
  function busy(form, on, label) {
    const b = form.querySelector('button[type="submit"]');
    if (!b) return;
    const t = b.querySelector('.ap-submit-label') || b;
    form.setAttribute('aria-busy', String(on));
    if (on) { b.dataset.label = t.textContent; t.textContent = label || 'Working…'; b.disabled = true; } else { t.textContent = b.dataset.label || t.textContent; b.disabled = false; }
  }
  function accountsUnavailable(title) {
    return page(html`${back('#/')}<h1 tabindex="-1" data-page-title>${title}</h1>
      <div class="notice notice-warn" style="margin:16px 0">${icon('info')}<div><strong>Accounts are not set up on this deployment yet.</strong><br>Shared sign-in needs a database connection that the project owner has not configured. No account details are collected here.</div></div>
      <div class="btn-row"><button class="btn btn-primary" data-action="enterDemo">Explore demo</button></div>`);
  }

  MN.views.resetPassword = {
    title: 'Choose a new password', bare: true,
    render() {
      return MN.authShell(html`<header class="ap-head"><h1 class="ap-title" id="ap-title" tabindex="-1" data-page-title>Choose a new password</h1>
          <p class="ap-sub">Signed in as ${R().userEmail()} from your reset link.</p></header>
        <form data-form="resetPassword" novalidate>
          <input type="email" name="username" autocomplete="username" value="${R().userEmail()}" hidden>
          ${MN.passwordField({ id: 'rp-pw', label: 'New password', meter: true, autocomplete: 'new-password' })}
          <div class="ap-status" role="status" aria-live="polite" data-status></div>
          <button class="ap-submit" type="submit"><span class="ap-spinner" aria-hidden="true"></span><span class="ap-submit-label">Save new password</span></button>
        </form>`);
    },
    mount() {
      const root = document.getElementById('auth-panel');
      const stop = root ? MN.bindPasswordFields(root, () => ({ email: R().userEmail() })) : null;
      MN.onLeave = () => { if (stop) stop(); };
    }
  };
  MN.forms.resetPassword = (form) => {
    const d = MN.formData(form);
    const pp = MN.Password.problem(d.password || '', { email: R().userEmail() });
    if (!MN.showErrors(form, pp ? { password: pp } : {})) return;
    busy(form, true, 'Saving…');
    return R().updatePassword(d.password).then(() => { MN.toast('Password updated.'); MN.go('#/overview'); }, (err) => { busy(form, false); setStatus('danger', err.message); });
  };

  // ---------- profile completion (accounts created before profiles existed) ----------
  MN.views.profileSetup = {
    title: 'Finish setting up', bare: true,
    render() {
      const meta = R().userMeta ? R().userMeta() : {};
      const p = R().profile() || { full_name: meta.full_name || meta.name || '' };
      return MN.authShell(html`<header class="ap-head"><h1 class="ap-title" id="ap-title" tabindex="-1" data-page-title>Finish setting up</h1>
          <p class="ap-sub">Signed in as ${R().userEmail()}. A few details, then you're in.</p></header>
        <form data-form="profileSetup" class="ap-plain-form" novalidate>${profileFields(p)}${consentField()}
          <div data-status role="status" aria-live="polite"></div>
          <button class="ap-submit" type="submit"><span class="ap-spinner" aria-hidden="true"></span><span class="ap-submit-label">Continue</span></button></form>
        <p class="ap-foot"><button type="button" class="ap-link" data-action="signOut">Sign out</button></p>`, { wide: true });
    }
  };
  MN.forms.profileSetup = (form) => {
    const d = MN.formData(form);
    if (!MN.showErrors(form, profileErrors(d))) return;
    busy(form, true, 'Saving…');
    return R().saveProfile({ fullName: d.fullName.trim(), gradTerm: d.gradTerm, major: d.major.trim() }).then(() => R().restore()).then(() => MN.go('#/welcome'),
      (err) => { busy(form, false); setStatus('danger', R().friendly(err)); });
  };

  // ---------- onboarding: sidebar-based layout ----------
  const obNavItem = (key, ico, title, desc, tab) => html`
    <a class="ob-nav-item${tab === key ? ' ob-nav-item--active' : ''}" href="#/welcome?tab=${key}">
      <span class="ob-nav-icon">${icon(ico)}</span>
      <span class="ob-nav-text">
        <strong>${title}</strong>
        <span class="ob-nav-desc">${desc}</span>
      </span>
    </a>`;

  MN.views.welcome = {
    title: 'Set up your workspace', bare: true,
    render(p, c) {
      const prof = R().profile() || {};
      const firstName = prof.full_name ? prof.full_name.split(' ')[0] : '';
      const initials = prof.full_name ? prof.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '';
      const tab = ['create', 'invite', 'request'].includes(p.q.tab) ? p.q.tab : 'request';
      const hasOrg = c && c.orgs && c.orgs.length;
      return html`<div class="ob-wrap">
        <header class="ob-topbar">
          <a href="#/" class="ob-logo-link"><img src="assets/mavnext-logo-trimmed.png" alt="MavNext" class="ob-logo"></a>
          <div class="ob-topbar-right">
            <a href="#/privacy" class="ob-help-link">${icon('info', 'icon-sm')} Help</a>
            <button class="ob-user-btn" data-action="signOut" title="Sign out">
              <span class="ob-avatar">${initials}</span>
              <span class="ob-user-name">${prof.full_name || R().userEmail() || ''}</span>
            </button>
          </div>
        </header>
        <div class="ob-body">
          <aside class="ob-sidebar">
            <p class="ob-sidebar-label">WORKSPACE SETUP</p>
            <nav class="ob-sidebar-nav">
              ${obNavItem('request', 'users', 'Find your organization', 'Search and request to join', tab)}
              ${obNavItem('invite', 'mail', 'Use an invitation', 'Enter a code from your admin', tab)}
              ${obNavItem('create', 'building', 'Create a workspace', 'Start a new organization', tab)}
            </nav>
            <div class="ob-sidebar-footer">
              <a href="#/privacy" class="ob-sidebar-link">${icon('info', 'icon-sm')} Contact support</a>
              <button class="ob-sidebar-link" data-action="signOut">${icon('logout', 'icon-sm')} Sign out</button>
            </div>
          </aside>
          <main class="ob-content">
            <div class="ob-content-inner">
              <p class="ob-greeting">Welcome, ${firstName || 'there'}</p>
              <h1 class="ob-title" tabindex="-1" data-page-title>Set up your workspace</h1>
              <p class="ob-subtitle">${hasOrg ? 'Join another organization or create a workspace for your team.' : 'Join your student organization or create a workspace for your team.'}</p>

              ${tab === 'request' ? html`
                <section class="ob-section">
                  <h2 class="ob-section-heading">Find your organization</h2>
                  <p class="ob-section-desc">Search by name. An administrator will review your request.</p>
                  <form data-form="dirSearch" role="search" class="ob-search-form">
                    <div class="field"><label for="dir-q">Organization name</label>
                    <div class="ob-search-row">
                      <span class="ob-search-icon">${icon('search')}</span>
                      <input class="input ob-search-input" id="dir-q" name="q" placeholder="Search organizations" data-input="dirSearch" autocomplete="off">
                    </div></div>
                  </form>
                  <h3 class="ob-results-heading">Organizations</h3>
                  <div data-dir-results aria-live="polite" class="ob-results">
                    <div class="ob-empty-state">
                      <span class="ob-empty-icon">${icon('building')}</span>
                      <p class="ob-empty-title">No organizations yet</p>
                      <p class="small muted">Search above to find your club, or create a new workspace.</p>
                    </div>
                  </div>
                </section>` : ''}

              ${tab === 'invite' ? html`
                <section class="ob-section">
                  <h2 class="ob-section-heading">Accept an invitation</h2>
                  <p class="ob-section-desc">An administrator gives you a link or code. Invitations work once, expire after 7 days, and only for the email they were created for.</p>
                  <form data-form="useInvite" novalidate>
                    <div class="field"><label for="iv-code">Invitation link or code</label><input class="input" id="iv-code" name="code" autocomplete="off" placeholder="Paste the link or code"><p class="field-error" data-err-for="code" hidden></p></div>
                    <button class="btn btn-primary" type="submit">Continue</button>
                  </form>
                  <p class="ob-alt-link">Don't have one? <a href="#/welcome?tab=request">Search for your organization instead.</a></p>
                </section>` : ''}

              ${tab === 'create' ? html`
                <section class="ob-section">
                  <h2 class="ob-section-heading">Create a workspace</h2>
                  <p class="ob-section-desc">You'll be the administrator and can invite your board. Only create a workspace for a club you lead.</p>
                  <form data-form="createOrg" novalidate>
                    <div class="field"><label for="co-name">Organization name <span class="req" aria-hidden="true">*</span></label><input class="input" id="co-name" name="orgName" maxlength="120" placeholder="e.g., Nepalese Student Association"><p class="field-error" data-err-for="orgName" hidden></p></div>
                    <div class="grid-2"><div class="field"><label for="co-title">Your officer title <span class="req" aria-hidden="true">*</span></label><input class="input" id="co-title" name="title" maxlength="60" list="role-list2" placeholder="e.g., President"><datalist id="role-list2">${['President', 'Vice President', 'Treasurer', 'Secretary', 'Faculty Advisor'].map((r) => html`<option value="${r}">`)}</datalist><p class="field-error" data-err-for="title" hidden></p></div>
                    <div class="field"><label for="co-term">Current term</label><input class="input" id="co-term" name="term" maxlength="40" placeholder="e.g., Spring 2027"></div></div>
                    <label class="check"><input type="checkbox" name="confirmLead"> <span>I am an officer of this organization and allowed to set up its workspace.</span></label><p class="field-error" data-err-for="confirmLead" hidden></p>
                    <button class="btn btn-primary" type="submit" style="margin-top:12px">Create workspace</button>
                  </form>
                </section>` : ''}

              <div data-my-requests style="margin-top:32px"></div>
              ${status()}
              ${hasOrg ? html`<div class="btn-row" style="margin-top:24px"><a class="btn" href="#/overview">${icon('chevronRight', 'icon-sm')} Go to my workspace</a></div>` : ''}
            </div>
            <footer class="ob-content-footer">
              <span>Have an invitation? <a href="#/welcome?tab=invite">Use your code</a></span>
              <span class="ob-footer-sep">·</span>
              <a href="#/privacy">Privacy</a>
            </footer>
          </main>
        </div>
      </div>`;
    },
    mount(root, p) {
      const tab = ['create', 'invite', 'request'].includes(p.q.tab) ? p.q.tab : 'request';
      if (tab === 'request') searchDirectory('');
      loadMyRequests();
    }
  };
  let dirTimer = null;
  MN.inputs.dirSearch = (el) => { clearTimeout(dirTimer); dirTimer = setTimeout(() => searchDirectory(el.value.trim()), 300); };
  MN.forms.dirSearch = (form) => searchDirectory(form.elements.q.value.trim());
  function searchDirectory(q) {
    const box = document.querySelector('[data-dir-results]');
    if (!box) return;
    const memberOf = new Set(((MN.ctx().orgs) || []).map((o) => o.id));
    R().directory(q).then((rows) => {
      if (!document.contains(box)) return;
      box.innerHTML = String(rows.length ? html`<ul class="rows">${rows.map((o) => html`<li class="row"><div class="row-main"><span class="row-title">${o.name}</span></div>${memberOf.has(o.id) ? ui.badge('Member', 'b-green') : html`<button class="btn btn-sm" data-action="requestJoin" data-id="${o.id}" data-name="${o.name}">Request to join</button>`}</li>`)}</ul>`
        : html`<div class="ob-empty-state"><span class="ob-empty-icon">${icon('search')}</span><p class="ob-empty-title">${q ? 'No organizations match that search.' : 'Start with your organization’s name.'}</p><p class="small muted">${q ? 'Try a different name, or create a new workspace.' : 'Only organizations using MavNext will appear here.'}</p></div>`);
    }, (err) => { box.innerHTML = String(html`<p class="field-error">${R().friendly(err)}</p>`); });
  }
  function loadMyRequests() {
    const box = document.querySelector('[data-my-requests]');
    if (!box) return;
    R().myRequests().then((rows) => {
      if (!document.contains(box) || !rows.length) return;
      const st = { pending: ['Waiting for approval', 'b-amber'], approved: ['Approved', 'b-green'], declined: ['Declined', 'b-red'], cancelled: ['Cancelled', 'b-gray'] };
      box.innerHTML = String(html`<h2 style="font-size:16px;margin-bottom:4px">Your requests</h2><ul class="rows">${rows.slice(0, 8).map((r) => html`<li class="row"><div class="row-main"><span class="row-title">${r.org_name}</span><div class="row-meta"><span>Sent ${MN.relTime(r.created_at)}</span>${r.desired_title ? html`<span>${r.desired_title}</span>` : ''}</div></div>${ui.badge(st[r.status][0], st[r.status][1])}${r.status === 'pending' ? html`<button class="btn btn-sm btn-ghost" data-action="cancelRequest" data-id="${r.id}" aria-label="Cancel request to ${r.org_name}">Cancel</button>` : ''}${r.status === 'approved' ? html`<button class="btn btn-sm" data-action="openApproved">Open</button>` : ''}</li>`)}</ul>`);
    }, () => {});
  }
  MN.actions.requestJoin = (el) => {
    MN.openDialog({
      title: `Request to join ${el.dataset.name}`,
      body: html`<p class="small muted" style="margin-bottom:12px">The organization's administrators will see your name, email, and this message. You get no access until one of them approves.</p>
        <div class="field"><label for="rq-title">Your officer role <span class="req" aria-hidden="true">*</span></label><input class="input" id="rq-title" name="title" maxlength="60" list="role-list3" autofocus><datalist id="role-list3">${['President', 'Vice President', 'Treasurer', 'Secretary', 'Events Chair', 'Incoming officer', 'Faculty Advisor'].map((r) => html`<option value="${r}">`)}</datalist><p class="field-error" data-err-for="title" hidden></p></div>
        <div class="field"><label for="rq-note">Message to the admins <span class="muted">(optional)</span></label><textarea class="textarea" id="rq-note" name="note" maxlength="500" placeholder="e.g., I was elected treasurer at the April meeting."></textarea></div>
        <p class="field-error" data-dlg-error hidden></p>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Send request', value: 'send', kind: 'btn-primary', submit: true }],
      onAction(v, form) {
        const d = MN.formData(form);
        if (!MN.showErrors(form, d.title.trim() ? {} : { title: 'Enter the role you hold or were elected to.' })) return false;
        return R().requestToJoin(el.dataset.id, d.title.trim(), d.note.trim()).then(() => { MN.toast('Request sent. You\'ll get access once an admin approves it.'); loadMyRequests(); }, (err) => { throw new Error(R().friendly(err)); });
      }
    });
  };
  MN.actions.cancelRequest = (el) => R().cancelRequest(el.dataset.id).then(() => { MN.toast('Request cancelled.'); loadMyRequests(); }, (err) => MN.toast(R().friendly(err)));
  MN.actions.openApproved = () => R().restore().then(() => MN.go('#/overview'));
  MN.forms.useInvite = (form) => {
    const m = (form.elements.code.value || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!MN.showErrors(form, m ? {} : { code: 'That doesn\'t look like a MavNext invitation link or code.' })) return;
    MN.go(`#/invite/${m[0].toLowerCase()}`);
  };
  MN.forms.createOrg = (form) => {
    const d = MN.formData(form);
    const errs = {};
    if ((d.orgName || '').trim().length < 2) errs.orgName = 'Enter the organization name.';
    if (!(d.title || '').trim()) errs.title = 'Enter your officer title.';
    if (!d.confirmLead) errs.confirmLead = 'Confirm that you lead this organization.';
    if (!MN.showErrors(form, errs)) return;
    busy(form, true, 'Creating…');
    return R().createOrganization(d.orgName.trim(), d.title.trim(), d.term.trim()).then((orgId) => R().restore().then(() => { MN.Session.patch({ orgId }); MN.go('#/overview'); MN.toast('Workspace created. You are its administrator.'); }),
      (err) => { busy(form, false); setStatus('danger', R().friendly(err)); });
  };

  // ---------- invitations ----------
  MN.views.invite = {
    title: 'Invitation',
    render(p) {
      if (!remoteOn()) return accountsUnavailable('Invitation');
      try { localStorage.setItem(PENDING_INVITE, p.id); } catch (e) { /* ignore */ }
      if (!R().userId()) {
        MN.go('#/signup');
        return page(html`<p class="muted">Redirecting to account creation…</p>`);
      }
      return page(html`<h1 tabindex="-1" data-page-title>Accept invitation</h1>
        <p class="muted" style="margin:8px 0 16px">Signed in as <strong>${R().userEmail()}</strong>. The invitation is checked against this email before access is granted.</p>
        <div class="btn-row"><button class="btn btn-primary" data-action="acceptInvite" data-token="${p.id}">Accept invitation</button><button class="btn" data-action="declineInvite">Not now</button></div>
        <div role="status" aria-live="polite" data-invite-status style="margin-top:12px"></div>`);
    }
  };
  MN.actions.acceptInvite = (el) => {
    const st = document.querySelector('[data-invite-status]');
    el.disabled = true; st.textContent = 'Checking invitation…';
    R().acceptInvitation(el.dataset.token).then((memberId) => {
      try { localStorage.removeItem(PENDING_INVITE); } catch (e) { /* ignore */ }
      return R().restore().then(() => {
        const m = MN.Store.get('members', memberId);
        if (m) MN.Session.patch({ orgId: m.orgId });
        MN.go('#/overview'); MN.toast('Invitation accepted.');
      });
    }, (err) => { el.disabled = false; st.textContent = R().friendly(err); });
  };
  MN.actions.declineInvite = () => { try { localStorage.removeItem(PENDING_INVITE); } catch (e) { /* ignore */ } MN.go(MN.Store.ws ? '#/welcome' : '#/'); };

  // ---------- privacy notice ----------
  const privNavItem = (id, label, activeId) => html`
    <a class="pv-nav-item${activeId === id ? ' pv-nav-item--active' : ''}" href="javascript:void(0)" data-pv-scroll="${id}">${label}</a>`;

  MN.views.privacy = {
    title: 'Privacy notice', bare: true,
    render() {
      const version = (MN.Remote && MN.Remote.CONSENT_VERSION) || '2026-11-21';
      return html`<div class="pv-wrap">
        <header class="pv-topbar">
          <a href="#/" class="ob-logo-link"><img src="assets/mavnext-logo-trimmed.png" alt="MavNext" class="ob-logo"></a>
          <a href="#/" class="pv-back-link">${icon('chevronLeft')} Back to workspace</a>
        </header>
        <div class="pv-body">
          <aside class="pv-sidebar">
            <div class="pv-sidebar-title">Privacy notice</div>
            <div class="pv-sidebar-label">ON THIS PAGE</div>
            <nav class="pv-sidebar-nav">
              ${privNavItem('overview', 'Overview', 'overview')}
              ${privNavItem('collect', 'What we collect', '')}
              ${privNavItem('why', 'Why we need it', '')}
              ${privNavItem('who', 'Who can see it', '')}
              ${privNavItem('stored', 'Where it is stored', '')}
              ${privNavItem('choices', 'Your choices', '')}
            </nav>
          </aside>
          <main class="pv-content">
            <div class="pv-content-inner">
              <div class="pv-breadcrumb">MavNext <span class="pv-breadcrumb-sep">/</span> Privacy</div>
              <h1 class="pv-heading" tabindex="-1" data-page-title>Privacy notice</h1>
              <p class="pv-version">Version ${version} · MavNext is an independent student pilot, not a UTA service.</p>

              <section id="privacy-overview" class="pv-section">
                <h2 class="pv-section-title">Overview</h2>
                <p>MavNext collects only what is needed to run your club's workspace. We never sell your data, run ads, or use analytics trackers.</p>
                <div class="pv-callout">
                  <strong>Your privacy matters.</strong> This notice explains what information MavNext handles, why it is needed, who can access it, and where it is stored.
                </div>
              </section>

              <hr class="pv-divider">

              <section id="privacy-collect" class="pv-section">
                <h2 class="pv-section-title">What we collect</h2>
                <p>Your <strong>name</strong>, <strong>email address</strong>, expected graduation term, and optional major — plus the records your team creates: meetings, tasks, handoffs, and activity logs.</p>
                <p>Your password is handled by our sign-in provider (Supabase Auth) and is <strong>never visible</strong> to MavNext or other users.</p>
              </section>

              <hr class="pv-divider">

              <section id="privacy-why" class="pv-section">
                <h2 class="pv-section-title">Why we need it</h2>
                <p>To power your workspace: showing who is on the board, assigning tasks, and making officer transitions seamless. That is it — nothing else.</p>
              </section>

              <hr class="pv-divider">

              <section id="privacy-who" class="pv-section">
                <h2 class="pv-section-title">Who can see your information</h2>
                <table class="pv-table">
                  <thead>
                    <tr><th>Information</th><th>Access</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Graduation term &amp; major</td><td>Only you</td></tr>
                    <tr><td>Name, email &amp; officer title</td><td>Your club members</td></tr>
                    <tr><td>Club records (meetings, tasks, handoffs)</td><td>Organization members, based on role</td></tr>
                    <tr><td>Password</td><td>No one — handled by Supabase Auth</td></tr>
                  </tbody>
                </table>
                <p class="pv-table-note">Database-level security rules enforce these boundaries — not just the app interface.</p>
              </section>

              <hr class="pv-divider">

              <section id="privacy-stored" class="pv-section">
                <h2 class="pv-section-title">Where it is stored</h2>
                <p>In a secure Supabase database with <strong>encrypted connections</strong>. Demo mode and "Use on this device" keep everything in your browser only — nothing is sent anywhere.</p>
                <div class="pv-callout pv-callout--warn">
                  <strong>Keep your secrets safe.</strong> Never put passwords, recovery codes, bank or card numbers, or private financial records in MavNext. Handoff sections describe procedures, not credentials.
                </div>
              </section>

              <hr class="pv-divider">

              <section id="privacy-choices" class="pv-section">
                <h2 class="pv-section-title">Your choices</h2>
                <ul class="pv-list">
                  <li>Edit or update your profile at any time.</li>
                  <li>Leave an organization whenever you need to.</li>
                  <li>Ask the project team to delete your account and all associated data.</li>
                </ul>
                <p class="pv-footnote">Consent is recorded with this notice's version number and the time you agreed.</p>
              </section>
            </div>
          </main>
        </div>
      </div>`;
    },
    mount() {
      // smooth-scroll sidebar nav + active tracking
      document.querySelectorAll('[data-pv-scroll]').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const id = a.dataset.pvScroll;
          const el = document.getElementById('privacy-' + id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.querySelectorAll('.pv-nav-item').forEach(n => n.classList.remove('pv-nav-item--active'));
          a.classList.add('pv-nav-item--active');
        });
      });
      // update active on scroll
      const sections = document.querySelectorAll('.pv-section[id]');
      const content = document.querySelector('.pv-content');
      if (content && sections.length) {
        content.addEventListener('scroll', () => {
          let cur = '';
          sections.forEach(s => { if (s.offsetTop - content.scrollTop <= 80) cur = s.id.replace('privacy-', ''); });
          document.querySelectorAll('[data-pv-scroll]').forEach(a => {
            a.classList.toggle('pv-nav-item--active', a.dataset.pvScroll === cur);
          });
        });
      }
    }
  };
})();
