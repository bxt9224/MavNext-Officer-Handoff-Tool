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

  // Password rules mirror the Supabase setting (min 10, letters + digits).
  function passwordScore(pw) {
    let s = 0;
    if (pw.length >= 10) s += 1;
    if (pw.length >= 14) s += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
    if (/\d/.test(pw)) s += 1;
    if (/[^A-Za-z0-9]/.test(pw)) s += 1;
    return s;
  }
  function passwordProblem(pw, email) {
    if (pw.length < 10) return 'Use at least 10 characters.';
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include both letters and numbers.';
    if (email && pw.toLowerCase().includes(email.split('@')[0].toLowerCase())) return 'Don\'t include your email name in the password.';
    if (/^(password|mavnext|qwerty|123456|letmein)/i.test(pw)) return 'That password is too common.';
    return '';
  }
  const passwordFields = (label) => html`
    <div class="field"><label for="pw-new">${label || 'Password'} <span class="req" aria-hidden="true">*</span></label>
      <div style="display:flex;gap:8px"><input class="input" id="pw-new" type="password" name="password" autocomplete="new-password" minlength="10" required aria-describedby="pw-hint pw-meter" data-input="pwMeter">
        <button type="button" class="btn" data-action="togglePw" aria-controls="pw-new" aria-pressed="false">Show</button></div>
      <div class="progress" style="height:6px;margin-top:6px" aria-hidden="true"><span id="pw-bar" style="width:0%"></span></div>
      <span class="hint" id="pw-hint">At least 10 characters, with letters and numbers. A short phrase works well.</span>
      <span class="hint" id="pw-meter" aria-live="polite"></span>
      <p class="field-error" data-err-for="password" hidden></p></div>
    <div class="field"><label for="pw-confirm">Confirm password <span class="req" aria-hidden="true">*</span></label><input class="input" id="pw-confirm" type="password" name="confirm" autocomplete="new-password" required><p class="field-error" data-err-for="confirm" hidden></p></div>`;
  MN.inputs.pwMeter = (el) => {
    const s = passwordScore(el.value);
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    const bar = document.getElementById('pw-bar');
    if (bar) { bar.style.width = `${(s / 5) * 100}%`; bar.style.background = s <= 1 ? 'var(--red)' : s <= 2 ? 'var(--amber-text)' : 'var(--green)'; }
    const m = document.getElementById('pw-meter'); if (m) m.textContent = el.value ? `Strength: ${labels[s]}` : '';
  };
  MN.actions.togglePw = (el) => {
    const on = el.getAttribute('aria-pressed') !== 'true';
    document.querySelectorAll('#pw-new, #pw-confirm, #si-pw').forEach((i) => { i.type = on ? 'text' : 'password'; });
    el.setAttribute('aria-pressed', String(on)); el.textContent = on ? 'Hide' : 'Show';
  };

  function accountsUnavailable(title) {
    return page(html`${back('#/')}<h1 tabindex="-1" data-page-title>${title}</h1>
      <div class="notice notice-warn" style="margin:16px 0">${icon('info')}<div><strong>Accounts are not set up on this deployment yet.</strong><br>Shared sign-in needs a database connection that the project owner has not configured. No account details are collected here.</div></div>
      <p class="muted small" style="margin-bottom:16px">Until then you can explore the demo, or keep your own records in this browser.</p>
      <div class="btn-row"><button class="btn btn-primary" data-action="enterDemo">Explore demo</button><button class="btn" data-action="enterLocal">Use on this device</button></div>`);
  }
  function fileWarning(kind) {
    if (location.protocol !== 'file:') return '';
    const msg = kind === 'signup'
      ? 'The confirmation email link opens the online MavNext site. Confirm there, then come back to this window and sign in.'
      : kind === 'forgot'
        ? 'Password reset links open the online MavNext site. Finish choosing your new password there, then sign in here.'
        : '';
    return msg ? html`<div class="notice notice-info" style="margin-bottom:16px">${icon('info')}<div>${msg}</div></div>` : '';
  }
  const status = () => html`<div role="status" aria-live="polite" data-status style="margin-top:12px"></div>`;
  function setStatus(kind, msg) {
    const st = document.querySelector('[data-status]');
    if (st) st.innerHTML = msg ? String(html`<div class="notice notice-${kind}">${icon(kind === 'ok' ? 'check' : kind === 'danger' ? 'alert' : 'info')}<div>${msg}</div></div>`) : '';
  }
  function busy(form, on, label) {
    const b = form.querySelector('button[type="submit"]');
    if (!b) return;
    if (on) { b.dataset.label = b.textContent; b.textContent = label || 'Working…'; b.disabled = true; } else { b.textContent = b.dataset.label || b.textContent; b.disabled = false; }
  }

  // ---------- sign up ----------
  MN.views.signup = {
    title: 'Create account',
    render() {
      if (!remoteOn()) return accountsUnavailable('Create account');
      return page(html`${back('#/')}<h1 tabindex="-1" data-page-title>Create your officer account</h1>
        <p class="muted" style="margin:4px 0 20px">One account per person. After signing up you can create your organization's workspace, accept an invitation, or request to join.</p>
        ${fileWarning('signup')}
        <form data-form="signUp" novalidate>
          ${profileFields(null)}
          <div class="field"><label for="su-email">Email <span class="req" aria-hidden="true">*</span></label><input class="input" id="su-email" type="email" name="email" autocomplete="email" required><span class="hint">Use the email your club knows you by — invitations are matched to it.</span><p class="field-error" data-err-for="email" hidden></p></div>
          ${passwordFields()}
          ${consentField()}
          <button class="btn btn-primary" type="submit" style="margin-top:16px;width:100%">Create account</button>
          <p class="small muted" style="margin-top:12px">Already have an account? <a href="#/signin">Sign in</a></p>
        </form>${status()}`, true);
    }
  };
  MN.forms.signUp = (form) => {
    const d = MN.formData(form);
    const errs = profileErrors(d);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) errs.email = 'Enter a valid email address.';
    const pp = passwordProblem(d.password || '', d.email);
    if (pp) errs.password = pp;
    else if (d.password !== d.confirm) errs.confirm = 'Passwords don\'t match.';
    if (!MN.showErrors(form, errs)) return;
    busy(form, true, 'Creating account…'); setStatus('', '');
    return R().signUp({ email: d.email.trim().toLowerCase(), password: d.password, fullName: d.fullName.trim(), gradTerm: d.gradTerm, major: d.major.trim() })
      .then((r) => {
        if (r.signedIn) return R().restore().then(() => MN.go('#/welcome'));
        MN.go(`#/check-email?e=${encodeURIComponent(d.email.trim().toLowerCase())}`);
        return null;
      }, (err) => { busy(form, false); setStatus('danger', err.message); });
  };
  MN.views.checkEmail = {
    title: 'Check your email',
    render(p) {
      const e = p.q.e || '';
      return page(html`<h1 tabindex="-1" data-page-title>Confirm your email</h1>
        <p style="margin:12px 0">If <strong>${e}</strong> can be used for a new account, we sent it a confirmation link.</p>
        <ol class="small" style="padding-left:18px;margin:0 0 16px;line-height:1.7"><li>Open the email from Supabase (check spam).</li><li>Click <strong>Confirm your mail</strong>. It may open the online MavNext site — that's fine.</li><li>Come back here and sign in with your email and password.</li></ol>
        <div class="btn-row"><a class="btn btn-primary" href="#/signin?e=${encodeURIComponent(e)}">Go to sign in</a><button class="btn" data-action="resendConfirm" data-email="${e}">Resend email</button></div>
        <p class="hint" style="margin-top:12px">Already have an account with this email? Sign in instead, or reset your password.</p>${status()}`);
    }
  };
  MN.actions.resendConfirm = (el) => {
    el.disabled = true;
    R().resendConfirmation(el.dataset.email).then(() => setStatus('ok', 'If the account still needs confirming, a new email is on its way.'), (err) => setStatus('danger', err.message)).then(() => { setTimeout(() => { el.disabled = false; }, 30000); });
  };

  // ---------- sign in ----------
  MN.views.signin = {
    title: 'Sign in',
    render(p) {
      if (!remoteOn()) return accountsUnavailable('Sign in');
      return page(html`${back('#/')}<h1 tabindex="-1" data-page-title>Sign in</h1>
        <p class="muted" style="margin:4px 0 20px">Officer accounts only. New here? <a href="#/signup">Create an account</a>.</p>
        <form data-form="signIn" novalidate>
          <div class="field"><label for="si-email">Email</label><input class="input" id="si-email" type="email" name="email" autocomplete="email" value="${p.q.e || ''}" required><p class="field-error" data-err-for="email" hidden></p></div>
          <div class="field"><label for="si-pw">Password</label>
            <div style="display:flex;gap:8px"><input class="input" id="si-pw" type="password" name="password" autocomplete="current-password" required><button type="button" class="btn" data-action="togglePw" aria-controls="si-pw" aria-pressed="false">Show</button></div>
            <p class="field-error" data-err-for="password" hidden></p></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" type="submit">Sign in</button><a href="#/forgot" class="small">Forgot password?</a></div>
        </form>${status()}`);
    }
  };
  let failedSignIns = 0;
  MN.forms.signIn = (form) => {
    const d = MN.formData(form);
    const errs = {};
    if (!d.email) errs.email = 'Enter your email.';
    if (!d.password) errs.password = 'Enter your password.';
    if (!MN.showErrors(form, errs)) return;
    busy(form, true, 'Signing in…'); setStatus('', '');
    return R().signIn(d.email.trim().toLowerCase(), d.password)
      .then(() => { failedSignIns = 0; return R().restore(); })
      .then(() => {
        let pending = null; try { pending = localStorage.getItem(PENDING_INVITE); } catch (e) { /* ignore */ }
        MN.go(pending ? `#/invite/${pending}` : '#/overview');
      }, (err) => {
        busy(form, false); failedSignIns += 1;
        // Slow down repeated guesses in this tab; Supabase also rate-limits on the server.
        if (failedSignIns >= 3) { const b = form.querySelector('button[type="submit"]'); b.disabled = true; setTimeout(() => { b.disabled = false; }, Math.min(30000, 5000 * (failedSignIns - 2))); }
        const st = document.querySelector('[data-status]');
        st.innerHTML = String(html`<div class="notice notice-danger">${icon('alert')}<div>${err.message}${err.unconfirmed ? html`<br><button class="btn btn-sm" style="margin-top:8px" data-action="resendConfirm" data-email="${d.email.trim().toLowerCase()}">Resend confirmation email</button>` : ''}</div></div>`);
      });
  };

  // ---------- password reset ----------
  MN.views.forgot = {
    title: 'Reset password',
    render() {
      if (!remoteOn()) return accountsUnavailable('Reset password');
      return page(html`${back('#/signin', 'Back to sign in')}<h1 tabindex="-1" data-page-title>Reset your password</h1>
        <p class="muted" style="margin:4px 0 20px">We'll email a reset link. Open it in this same browser.</p>
        ${fileWarning('forgot')}
        <form data-form="forgot" novalidate><div class="field"><label for="fg-email">Email</label><input class="input" id="fg-email" type="email" name="email" autocomplete="email" required><p class="field-error" data-err-for="email" hidden></p></div>
        <button class="btn btn-primary" type="submit">Send reset link</button></form>${status()}`);
    }
  };
  MN.forms.forgot = (form) => {
    const d = MN.formData(form);
    if (!MN.showErrors(form, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '') ? {} : { email: 'Enter a valid email address.' })) return;
    busy(form, true, 'Sending…');
    return R().sendPasswordReset(d.email.trim().toLowerCase()).then(() => { busy(form, false); setStatus('ok', 'If an account exists for that email, a reset link is on its way. Open it in this browser.'); },
      (err) => { busy(form, false); setStatus('danger', err.message); });
  };
  MN.views.resetPassword = {
    title: 'Choose a new password', bare: true,
    render() {
      return page(html`<h1 tabindex="-1" data-page-title>Choose a new password</h1>
        <p class="muted" style="margin:4px 0 20px">Signed in as ${R().userEmail()}.</p>
        <form data-form="resetPassword" novalidate>${passwordFields('New password')}<button class="btn btn-primary" type="submit">Save new password</button></form>${status()}`);
    }
  };
  MN.forms.resetPassword = (form) => {
    const d = MN.formData(form);
    const errs = {};
    const pp = passwordProblem(d.password || '', R().userEmail());
    if (pp) errs.password = pp; else if (d.password !== d.confirm) errs.confirm = 'Passwords don\'t match.';
    if (!MN.showErrors(form, errs)) return;
    busy(form, true, 'Saving…');
    return R().updatePassword(d.password).then(() => { MN.toast('Password updated.'); MN.go('#/overview'); }, (err) => { busy(form, false); setStatus('danger', err.message); });
  };

  // ---------- profile completion (accounts created before profiles existed) ----------
  MN.views.profileSetup = {
    title: 'Complete your profile', bare: true,
    render() {
      return page(html`<h1 tabindex="-1" data-page-title>Complete your profile</h1>
        <p class="muted" style="margin:4px 0 20px">Signed in as ${R().userEmail()}. We need a few details before you continue.</p>
        <form data-form="profileSetup" novalidate>${profileFields(R().profile())}${consentField()}<button class="btn btn-primary" type="submit" style="margin-top:16px">Continue</button></form>${status()}
        <p class="small" style="margin-top:16px"><button class="btn btn-ghost btn-sm" data-action="signOut">Sign out</button></p>`, true);
    }
  };
  MN.forms.profileSetup = (form) => {
    const d = MN.formData(form);
    if (!MN.showErrors(form, profileErrors(d))) return;
    busy(form, true, 'Saving…');
    return R().saveProfile({ fullName: d.fullName.trim(), gradTerm: d.gradTerm, major: d.major.trim() }).then(() => R().restore()).then(() => MN.go('#/welcome'),
      (err) => { busy(form, false); setStatus('danger', R().friendly(err)); });
  };

  // ---------- onboarding: create / invitation / request ----------
  MN.views.welcome = {
    title: 'Join or create an organization', bare: true,
    render(p, c) {
      const prof = R().profile() || {};
      const tab = ['create', 'invite', 'request'].includes(p.q.tab) ? p.q.tab : 'request';
      const tabLink = (k, label) => html`<a class="tab" role="tab" href="#/welcome?tab=${k}" aria-selected="${tab === k}">${label}</a>`;
      const hasOrg = c && c.orgs && c.orgs.length;
      return page(html`
        ${hasOrg ? back('#/overview', 'Back to my workspace') : ''}
        <h1 tabindex="-1" data-page-title>Welcome${prof.full_name ? `, ${prof.full_name.split(' ')[0]}` : ''}</h1>
        <p class="muted" style="margin:4px 0 16px">${hasOrg ? 'Join another organization or start a new one.' : 'You\'re not part of an organization yet. Pick how you\'re joining.'}</p>
        <div class="tabs" role="tablist" aria-label="How are you joining?" style="padding:0;margin-bottom:20px">${tabLink('request', 'Request to join')}${tabLink('invite', 'I have an invitation')}${tabLink('create', 'Create organization')}</div>
        ${tab === 'request' ? html`
          <p class="small muted" style="margin-bottom:12px">Find your organization and ask to join. An administrator must approve you before you can see anything.</p>
          <form data-form="dirSearch" class="inline-form" style="margin:0 0 12px" role="search"><label for="dir-q" class="sr-only">Search organizations</label><input class="input" id="dir-q" name="q" placeholder="Search organizations" data-input="dirSearch" autocomplete="off"><button class="btn" type="submit">Search</button></form>
          <div data-dir-results aria-live="polite"><p class="empty-inline">Loading organizations…</p></div>` : ''}
        ${tab === 'invite' ? html`
          <p class="small muted" style="margin-bottom:12px">An administrator gives you a link or code. Invitations work once, expire after 7 days, and only for the email they were created for.</p>
          <form data-form="useInvite" novalidate><div class="field"><label for="iv-code">Invitation link or code</label><input class="input" id="iv-code" name="code" autocomplete="off" placeholder="Paste the link or code"><p class="field-error" data-err-for="code" hidden></p></div><button class="btn btn-primary" type="submit">Continue</button></form>` : ''}
        ${tab === 'create' ? html`
          <p class="small muted" style="margin-bottom:12px">You'll become the organization's administrator and can invite your board. Only create a workspace for a club you lead.</p>
          <form data-form="createOrg" novalidate>
            <div class="field"><label for="co-name">Organization name <span class="req" aria-hidden="true">*</span></label><input class="input" id="co-name" name="orgName" maxlength="120" placeholder="e.g., Nepalese Student Association"><p class="field-error" data-err-for="orgName" hidden></p></div>
            <div class="grid-2"><div class="field"><label for="co-title">Your officer title <span class="req" aria-hidden="true">*</span></label><input class="input" id="co-title" name="title" maxlength="60" list="role-list2" placeholder="e.g., President"><datalist id="role-list2">${['President', 'Vice President', 'Treasurer', 'Secretary', 'Faculty Advisor'].map((r) => html`<option value="${r}">`)}</datalist><p class="field-error" data-err-for="title" hidden></p></div>
            <div class="field"><label for="co-term">Current term</label><input class="input" id="co-term" name="term" maxlength="40" placeholder="e.g., Spring 2027"></div></div>
            <label class="check"><input type="checkbox" name="confirmLead"> <span>I am an officer of this organization and allowed to set up its workspace.</span></label><p class="field-error" data-err-for="confirmLead" hidden></p>
            <button class="btn btn-primary" type="submit" style="margin-top:12px">Create workspace</button></form>` : ''}
        <div data-my-requests style="margin-top:24px"></div>
        ${status()}
        <div class="btn-row" style="margin-top:20px">${hasOrg ? html`<a class="btn" href="#/overview">Go to my workspace</a>` : ''}<button class="btn btn-ghost" data-action="signOut">Sign out</button></div>`, true);
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
        : html`<p class="empty-inline">${q ? 'No organizations match that search.' : 'No organizations are listed yet.'} You can create one, or use an invitation.</p>`);
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
        return page(html`<h1 tabindex="-1" data-page-title>You've been invited to MavNext</h1>
          <p class="muted" style="margin:8px 0 16px">Create an account, or sign in, with the email address this invitation was made for. You'll come back here to accept it.</p>
          <div class="btn-row"><a class="btn btn-primary" href="#/signup">Create account</a><a class="btn" href="#/signin">Sign in</a></div>`);
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
  MN.views.privacy = {
    title: 'Privacy notice',
    render() {
      return page(html`${back('#/')}<h1 tabindex="-1" data-page-title>Privacy notice</h1>
        <p class="small muted" style="margin:4px 0 16px">Version ${(MN.Remote && MN.Remote.CONSENT_VERSION) || '2026-11-21'} · MavNext is an independent student pilot, not a UTA service.</p>
        <div class="small" style="line-height:1.65">
          <h2 style="font-size:16px;margin:12px 0 4px">What we collect</h2>
          <p>Your name, email, expected graduation term, optional major, and the records you or your officers create: meetings, tasks, handoffs, and activity. Your password is handled by our sign-in provider and is never visible to MavNext or other users.</p>
          <h2 style="font-size:16px;margin:12px 0 4px">Why</h2>
          <p>Only to run your organization's workspace: showing who is on the board, assigning work, and passing responsibilities to the next officer. No advertising, no selling of data, no analytics trackers.</p>
          <h2 style="font-size:16px;margin:12px 0 4px">Who can see it</h2>
          <p>Your profile details (graduation term, major) are visible only to you. Your name, email, and officer title are visible to members of organizations you join. Club records are visible only to that organization's members, according to their permission. Database rules enforce this, not just the screen.</p>
          <h2 style="font-size:16px;margin:12px 0 4px">Where it's stored</h2>
          <p>In a Supabase database operated for this pilot. Data is sent over encrypted connections. Demo mode and "Use on this device" store data only in your browser.</p>
          <h2 style="font-size:16px;margin:12px 0 4px">Don't store secrets</h2>
          <p>Never put passwords, recovery codes, bank or card numbers, or private financial records in MavNext. Handoffs describe procedures, not credentials.</p>
          <h2 style="font-size:16px;margin:12px 0 4px">Your choices</h2>
          <p>You can edit your profile, leave an organization, or ask the project team to delete your account and data. Consent is recorded with this notice's version and the time you agreed.</p>
        </div>`, true);
    }
  };
})();
