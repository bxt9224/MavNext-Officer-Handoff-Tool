/* MavNext — arrival, sign in, password reset request, and registration.

   Routes
     #/enter         arrival: hero copy + lamp OFF. Pulling the cord or "Go straight to sign in"
                     runs one transition and the URL becomes #/signin (replaceState, no re-render).
     #/signin        the usable sign-in card immediately, lamp ON (direct links, sign-out, returns).
     #/forgot        the same card in "reset your password" mode.
     #/signup        separate registration page (no lamp): Google or email, password rules.
     #/check-email   registration page, "check your email" state.
   States on #auth-scene: data-state = arrival | transitioning | signin.

   Authentication is Supabase Auth through js/remote.js (email + password, Google OAuth).
   Nothing here stores passwords. Without Supabase configuration the cards say so and offer the
   labeled demo / this-device workspace instead. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon } = MN;
  const R = () => MN.Remote;
  const remoteOn = () => !!(MN.Remote && MN.Remote.configured());
  const isFile = () => location.protocol === 'file:';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const TRANSITION_MS = 640;
  const reduce = () => (MN.AuthScene ? MN.AuthScene.reduceMotion() : true);
  const state = { failed: 0, sentTo: '' };
  let live = null;

  const ARROW = MN.raw('<svg class="au-arrow" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  const GOOGLE_G = MN.raw('<svg class="ap-g" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>');
  const EYE = MN.raw('<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path class="ap-eye-open" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle class="ap-eye-open" cx="12" cy="12" r="3"/><path class="ap-eye-shut" d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>');

  // ---------- password field (sign in, registration, reset, settings) ----------
  /** o: { id, name, label, autocomplete, meter, showButton ('icon'|'text'), required, suggest } */
  MN.passwordField = function (o) {
    const id = o.id || 'ap-pw';
    const name = o.name || 'password';
    const textBtn = o.showButton === 'text';
    return html`
      <div class="ap-field">
        <div class="ap-label-row">
          <label class="ap-label" for="${id}">${o.label || 'Password'}${o.required ? html` <span class="req" aria-hidden="true">*</span>` : ''}</label>
          ${o.meter && o.suggest === true && MN.Password.canGenerate() ? html`<button type="button" class="ap-link" data-suggest="${id}">Suggest a strong password</button>` : ''}
        </div>
        <div class="ap-pw ${textBtn ? 'ap-pw-text' : ''}">
          <input class="ap-input" id="${id}" name="${name}" type="password" autocomplete="${o.autocomplete || 'current-password'}" autocapitalize="off" spellcheck="false" aria-describedby="${id}-err${o.meter ? ` ${id}-meter` : ''}">
          ${textBtn
            ? html`<button type="button" class="ap-show" data-eye="${id}" data-eye-text aria-controls="${id}" aria-pressed="false">Show</button>`
            : html`<button type="button" class="ap-eye" data-eye="${id}" aria-controls="${id}" aria-pressed="false" aria-label="Show password">${EYE}</button>`}
        </div>
        <p class="ap-err" id="${id}-err" data-err-for="${name}" hidden></p>
        ${o.meter ? html`
          <div class="ap-meter" id="${id}-meter" data-meter-for="${id}" data-score="0">
            <div class="ap-meter-top"><div class="ap-meter-bar" aria-hidden="true"><span></span><span></span><span></span><span></span></div><span class="ap-meter-label" aria-live="polite"></span></div>
            <ul class="ap-reqs" aria-label="Password requirements">${MN.Password.checks('').map((c) => html`<li data-req="${c.key}" data-ok="false"><span class="ap-req-icon" aria-hidden="true"></span>${c.label}<span class="sr-only" data-req-state> (not met)</span></li>`)}</ul>
            <p class="ap-suggested" data-suggested hidden>A strong password is filled in and shown. Save it in your password manager. <button type="button" class="ap-link" data-copy="${id}">Copy</button></p>
          </div>` : ''}
      </div>`;
  };

  /** Show/hide, strength meter, suggest and copy for every password field inside root. */
  MN.bindPasswordFields = function (root, ctxFn) {
    const offs = [];
    const on = (el, ev, fn) => { el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); };
    root.querySelectorAll('[data-eye]').forEach((btn) => on(btn, 'click', () => {
      const input = root.querySelector(`#${btn.dataset.eye}`);
      setVisible(input, btn, input.type === 'password');
      input.focus({ preventScroll: true });
    }));
    root.querySelectorAll('[data-meter-for]').forEach((meter) => {
      const input = root.querySelector(`#${meter.dataset.meterFor}`);
      const update = () => updateMeter(meter, input.value, ctxFn ? ctxFn() : {});
      on(input, 'input', () => { const s = meter.querySelector('[data-suggested]'); if (s && input.dataset.suggested !== input.value) s.hidden = true; update(); });
      update();
    });
    root.querySelectorAll('[data-suggest]').forEach((btn) => on(btn, 'click', () => {
      const input = root.querySelector(`#${btn.dataset.suggest}`);
      const pw = MN.Password.generate(18);
      input.value = pw; input.dataset.suggested = pw;
      setVisible(input, root.querySelector(`[data-eye="${input.id}"]`), true);
      const meter = root.querySelector(`[data-meter-for="${input.id}"]`);
      if (meter) { updateMeter(meter, pw, ctxFn ? ctxFn() : {}); const s = meter.querySelector('[data-suggested]'); if (s) s.hidden = false; }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus({ preventScroll: true });
    }));
    root.querySelectorAll('[data-copy]').forEach((btn) => on(btn, 'click', () => {
      const input = root.querySelector(`#${btn.dataset.copy}`);
      const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(done, () => input.select());
      else input.select();
    }));
    return () => offs.forEach((f) => f());
  };
  function setVisible(input, btn, show) {
    input.type = show ? 'text' : 'password';
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(show));
    if (btn.hasAttribute('data-eye-text')) btn.textContent = show ? 'Hide' : 'Show';
    else { btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); btn.classList.toggle('is-shown', show); }
  }
  function updateMeter(meter, pw, ctx) {
    meter.hidden = !pw; // the indicator appears only once typing starts
    const st = MN.Password.strength(pw, ctx);
    meter.dataset.score = String(st.score);
    meter.dataset.tone = st.tone;
    meter.querySelector('.ap-meter-label').textContent = st.label ? `${st.label}${st.reason === 'personal' ? ' — avoid your name or email' : ''}` : '';
    MN.Password.checks(pw).forEach((c) => {
      const li = meter.querySelector(`[data-req="${c.key}"]`);
      if (li) { li.dataset.ok = String(c.ok); li.querySelector('[data-req-state]').textContent = c.ok ? ' (met)' : ' (not met)'; }
    });
  }

  // ---------- small helpers ----------
  const header = () => html`
    <header class="au-header">
      <a class="au-logo" href="#/" aria-label="MavNext home"><img src="assets/mavnext-logo-trimmed.png" alt="MavNext" width="200" height="34"></a>
      <a class="au-home" href="#/">Back to home</a>
    </header>`;
  const statusBox = () => html`<div class="ap-status" role="status" aria-live="polite" data-status></div>`;
  function say(scope, kind, msg, extra) {
    const st = scope && scope.querySelector('[data-status]');
    if (!st) return;
    st.innerHTML = msg ? String(html`<div class="notice notice-${kind}">${icon(kind === 'ok' ? 'check' : kind === 'danger' ? 'alert' : 'info')}<div>${msg}${extra || ''}</div></div>`) : '';
  }
  function busy(form, on, label) {
    const b = form.querySelector('button[type="submit"]');
    const l = b.querySelector('.ap-submit-label');
    form.setAttribute('aria-busy', String(on));
    b.disabled = on;
    if (on) { b.dataset.label = l.textContent; l.textContent = label; } else if (b.dataset.label) l.textContent = b.dataset.label;
  }
  const unavailable = (H) => html`
    <${MN.raw(H)} class="au-title" id="au-title" tabindex="-1">Accounts aren't set up here</${MN.raw(H)}>
    <p class="au-sub">This copy of MavNext isn't connected to a sign-in service, so no account details are collected.</p>
    <p class="ap-note">You can still explore MavNext with fictional demo data, or keep your own records in this browser only.</p>
    <button type="button" class="au-btn au-btn-primary" data-action="enterDemo"><span class="ap-submit-label">Explore the demo</span></button>
    <button type="button" class="au-btn au-btn-quiet" data-action="enterLocal">Use on this device only</button>`;

  // ---------- arrival + sign-in scene ----------
  function card(H, mode) {
    if (!remoteOn()) return html`<div class="au-card" data-mode="unavailable">${unavailable(H)}</div>`;
    return html`
      <div class="au-card" data-mode="${mode}">
        <div class="au-mode" data-show="signin">
          <${MN.raw(H)} class="au-title" id="au-title" tabindex="-1">Welcome Back Maverick</${MN.raw(H)}>
          <p class="au-sub">Pick up where your team left off.</p>
          <form class="au-form" data-form="signin" novalidate>
            <div class="ap-field">
              <label class="ap-label" for="si-email">Email address</label>
              <input class="ap-input" id="si-email" name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="you@example.com" aria-describedby="si-email-err">
              <p class="ap-err" id="si-email-err" data-err-for="email" hidden></p>
            </div>
            ${MN.passwordField({ id: 'si-pw', autocomplete: 'current-password' })}
            <div class="au-forgot-row"><button type="button" class="ap-link" data-mode-to="forgot">Forgot password?</button></div>
            ${statusBox()}
            <button type="submit" class="au-btn au-btn-primary"><span class="ap-spinner" aria-hidden="true"></span><span class="ap-submit-label">Sign in</span>${ARROW}</button>
          </form>
          <p class="au-alt">New here? <a href="#/signup">Create an account</a></p>
        </div>
        <div class="au-mode" data-show="forgot">
          <button type="button" class="au-back" data-mode-to="signin">${icon('chevronLeft', 'icon-sm')}Back to sign in</button>
          <${MN.raw(H)} class="au-title" id="au-title-forgot" tabindex="-1">Reset your password</${MN.raw(H)}>
          <p class="au-sub">Enter your account email and we'll send you a link to choose a new one.</p>
          <form class="au-form" data-form="forgot" novalidate>
            <div class="ap-field">
              <label class="ap-label" for="fg-email">Email address</label>
              <input class="ap-input" id="fg-email" name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="you@example.com" aria-describedby="fg-email-err">
              <p class="ap-err" id="fg-email-err" data-err-for="email" hidden></p>
            </div>
            ${statusBox()}
            <button type="submit" class="au-btn au-btn-primary"><span class="ap-spinner" aria-hidden="true"></span><span class="ap-submit-label">Send reset link</span></button>
            ${isFile() ? html`<p class="ap-note">Opened as a file: the reset link opens the online MavNext site. Finish there.</p>` : ''}
          </form>
        </div>
      </div>`;
  }

  function scene(st, mode, inner) {
    const arrival = st === 'arrival';
    const H = arrival ? 'h2' : 'h1';
    return html`
      <div class="au ${arrival ? '' : 'is-static'}" id="auth-scene" data-state="${st}">
        ${header()}
        <main class="au-stage" id="main-content" tabindex="-1">
          <div class="au-desk" aria-hidden="true"></div>
          <div class="au-left">
            <div class="au-beam" aria-hidden="true"><div class="au-beam-in"></div></div>
            ${arrival ? html`
              <div class="au-copy">
                <p class="au-eyebrow">For student organization leaders</p>
                <h1 class="au-headline" tabindex="-1" data-page-title>Keep your club’s <span class="au-hl-2">next chapter bright.</span></h1>
                <p class="au-lede">Plan meetings, keep your board connected, and pass on what the next team needs.</p>
                <button type="button" class="au-btn au-btn-lav" data-go>Go straight to sign in${ARROW}</button>
              </div>` : ''}
            <section class="au-card-wrap" id="auth-panel" aria-labelledby="au-title" ${arrival ? MN.raw('inert') : ''}>
              ${inner || card(H, mode)}
            </section>
          </div>
          ${MN.AuthScene ? MN.AuthScene.lamp({ lit: !arrival, hint: arrival }) : ''}
        </main>
      </div>`;
  }

  function mountScene() {
    cleanup();
    const root = document.getElementById('auth-scene');
    if (!root) return;
    let confirmed = false;
    try { confirmed = localStorage.getItem('mavnext.emailConfirmed') === '1'; localStorage.removeItem('mavnext.emailConfirmed'); } catch (e) { /* ignore */ }
    if (confirmed) say(root, 'ok', 'Your email address is confirmed. Sign in to open your workspace.');
    const timers = [];
    const offs = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const on = (el, ev, fn) => { if (el) { el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); } };
    const cardEl = root.querySelector('.au-card');
    let ctrl = null;

    function focusTitle() {
      const t = root.querySelector('.au-mode:not([hidden]) .au-title') || root.querySelector('.au-title');
      if (t) t.focus({ preventScroll: true });   // a heading, not a field: no on-screen keyboard
    }
    // One transition, whichever way it was started. Repeated activations are ignored.
    function enter(force) {
      if (root.dataset.state !== 'arrival') return;
      const instant = force === true || reduce();
      root.dataset.state = 'transitioning';
      if (instant) root.classList.add('is-static');
      const panel = root.querySelector('#auth-panel');
      panel.inert = false; panel.removeAttribute('inert');
      const copy = root.querySelector('.au-copy');
      if (copy) { copy.inert = true; const h = copy.querySelector('[data-page-title]'); if (h) h.removeAttribute('data-page-title'); }
      root.querySelectorAll('h2.au-title').forEach((t) => {   // the card's heading becomes the page heading
        const h1 = document.createElement('h1');
        Array.from(t.attributes).forEach((a) => h1.setAttribute(a.name, a.value));
        h1.innerHTML = t.innerHTML; t.replaceWith(h1);
      });
      if (ctrl) ctrl.retire();
      if (location.hash !== '#/signin') history.replaceState(null, '', '#/signin');
      document.title = 'Sign in · MavNext';
      const settle = () => { root.dataset.state = 'signin'; if (copy) copy.remove(); focusTitle(); };
      if (instant) settle(); else later(settle, TRANSITION_MS);
    }

    if (MN.AuthScene && root.querySelector('.lp')) {
      try { ctrl = MN.AuthScene.mount(root, { onActivate: () => enter() }); } catch (e) { console.error(e); }
    }
    on(root.querySelector('[data-go]'), 'click', () => enter());
    // Never leave the form unreachable: if the lamp failed, or the window is too narrow for the scene.
    if (root.dataset.state === 'arrival' && (!ctrl || window.matchMedia('(max-width: 760px)').matches)) enter(true);

    if (cardEl && cardEl.dataset.mode !== 'unavailable') {
      setMode(cardEl, cardEl.dataset.mode, false);
      cardEl.querySelectorAll('[data-mode-to]').forEach((b) => on(b, 'click', () => { setMode(cardEl, b.dataset.modeTo, true); }));
      offs.push(MN.bindPasswordFields(cardEl));
      cardEl.querySelectorAll('.ap-input').forEach((inp) => on(inp, 'input', () => clearErr(cardEl, inp)));
    }
    live = { timers, offs, ctrl };
    MN.onLeave = cleanup;
  }

  function setMode(cardEl, mode, user) {
    const from = cardEl.dataset.mode;
    cardEl.dataset.mode = mode;
    cardEl.querySelectorAll('[data-show]').forEach((el) => { el.hidden = el.dataset.show !== mode; });
    // carry the email across
    const si = cardEl.querySelector('#si-email'); const fg = cardEl.querySelector('#fg-email');
    if (si && fg) { if (mode === 'forgot' && si.value && !fg.value) fg.value = si.value; if (mode === 'signin' && fg.value && !si.value) si.value = fg.value; }
    if (user && from !== mode) {
      const target = mode === 'forgot' ? '#/forgot' : '#/signin';
      if (location.hash !== target) history.replaceState(null, '', target);
      document.title = `${mode === 'forgot' ? 'Reset password' : 'Sign in'} · MavNext`;
      const t = cardEl.querySelector('.au-mode:not([hidden]) .au-title');
      if (t) t.focus({ preventScroll: true });
    }
  }
  function clearErr(scope, inp) {
    if (inp.getAttribute('aria-invalid') !== 'true') return;
    inp.removeAttribute('aria-invalid');
    const err = scope.querySelector(`#${inp.id}-err`); if (err) err.hidden = true;
  }
  function cleanup() {
    if (!live) return;
    live.timers.forEach(clearTimeout);
    live.offs.forEach((f) => f());
    if (live.ctrl) live.ctrl.destroy();
    live = null;
  }

  // ---------- forms: sign in, reset request ----------
  MN.forms.signin = (form) => {
    const scope = form.closest('.au-mode');
    const d = MN.formData(form);
    const email = (d.email || '').trim().toLowerCase();
    const errs = {};
    if (!email) errs.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email)) errs.email = 'Enter a valid email address, like name@example.com.';
    if (!d.password) errs.password = 'Enter your password.';
    say(scope, '', '');
    if (!MN.showErrors(form, errs) || !remoteOn()) return null;
    busy(form, true, 'Signing in…');
    return R().signIn(email, d.password)
      .then(() => { state.failed = 0; return R().restore(); })
      .then(() => {
        let pending = null; try { pending = localStorage.getItem(MN.PENDING_INVITE); } catch (e) { /* ignore */ }
        MN.go(pending ? `#/invite/${pending}` : '#/overview');
      }, (err) => {
        busy(form, false);
        state.failed += 1;
        // Slow down repeated guesses in this tab; Supabase also rate-limits on the server.
        if (state.failed >= 3) { const b = form.querySelector('button[type="submit"]'); b.disabled = true; setTimeout(() => { b.disabled = false; }, Math.min(30000, 5000 * (state.failed - 2))); }
        say(scope, 'danger', err.message, err.unconfirmed ? html`<br><button type="button" class="ap-link" data-resend-inline>Resend confirmation email</button>` : '');
        const rb = scope.querySelector('[data-resend-inline]');
        if (rb) rb.addEventListener('click', () => resend(rb, email, scope));
      });
  };
  MN.forms.forgot = (form) => {
    const scope = form.closest('.au-mode');
    const email = (MN.formData(form).email || '').trim().toLowerCase();
    const errs = {};
    if (!email) errs.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email)) errs.email = 'Enter a valid email address, like name@example.com.';
    say(scope, '', '');
    if (!MN.showErrors(form, errs) || !remoteOn()) return null;
    busy(form, true, 'Sending…');
    return R().sendPasswordReset(email).then(() => {
      busy(form, false);
      say(scope, 'ok', `If an account exists for ${email}, a reset link is on its way. Open it in this browser to choose a new password.`);
    }, (err) => { busy(form, false); say(scope, 'danger', err.message); });
  };
  function resend(btn, email, scope) {
    if (!email) return;
    btn.disabled = true;
    R().resendConfirmation(email).then(() => say(scope, 'ok', 'If the account still needs confirming, a new email is on its way.'), (err) => say(scope, 'danger', err.message))
      .then(() => { setTimeout(() => { btn.disabled = false; }, 30000); });
  }

  // ---------- registration page (no lamp) ----------
  function registerPage(sent, email) {
    const body = !remoteOn() ? unavailable('h1') : sent ? sentBlock(email) : html`
      <h1 class="rg-title" id="rg-title" tabindex="-1" data-page-title>Create your officer account</h1>
      <p class="rg-sub">Your team. Your plans. Your next chapter.</p>
      ${isFile() ? html`<div class="notice notice-info rg-notice">${icon('info')}<div>The confirmation email link opens the online MavNext site. Confirm there, then come back to this window and sign in.</div></div>` : ''}
      <div data-google-scope>
        <button type="button" class="rg-google" data-google>${GOOGLE_G}<span>Continue with Google</span></button>
        ${statusBox()}
      </div>
      <div class="rg-or"><span>or use your email</span></div>
      <form class="rg-form" data-form="register" novalidate>
        ${MN.profileFields(null)}
        <div class="field">
          <label for="rg-email">Email <span class="req" aria-hidden="true">*</span></label>
          <input class="input" id="rg-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" aria-describedby="rg-email-hint rg-email-err">
          <span class="hint" id="rg-email-hint">Use the email your club knows you by — invitations are matched to it.</span>
          <p class="field-error" id="rg-email-err" data-err-for="email" hidden></p>
        </div>
        <div class="grid-2">
          ${MN.passwordField({ id: 'rg-pw', label: 'Password', required: true, autocomplete: 'new-password', meter: true })}
          <div class="field">
            <label for="rg-confirm">Confirm password <span class="req" aria-hidden="true">*</span></label>
            <input class="input" id="rg-confirm" name="confirm" type="password" autocomplete="new-password" aria-describedby="rg-confirm-err">
            <p class="field-error" id="rg-confirm-err" data-err-for="confirm" hidden></p>
          </div>
        </div>
        ${MN.consentField()}
        ${statusBox()}
        <button type="submit" class="au-btn au-btn-primary rg-submit"><span class="ap-spinner" aria-hidden="true"></span><span class="ap-submit-label">Create account</span></button>
        <p class="rg-foot">Already have an account? <a href="#/signin">Sign in</a></p>
      </form>`;
    return html`
      <div class="rg">
        ${header()}
        <main class="rg-main" id="main-content" tabindex="-1">
          <section class="rg-card" aria-labelledby="rg-title">${body}</section>
        </main>
      </div>`;
  }
  function sentBlock(email) {
    return html`
      <h1 class="rg-title" id="rg-title" tabindex="-1" data-page-title>Check your email</h1>
      <p class="rg-sub">If <strong data-sent-email>${email || 'your email'}</strong> can be used for a new account, we sent it a confirmation link. Open it, then come back and sign in.</p>
      <div data-sent-scope>
        <p class="ap-note">Nothing there? Check spam, or <button type="button" class="ap-link" data-resend>send it again</button>.</p>
        ${statusBox()}
      </div>
      <a class="au-btn au-btn-primary rg-submit" href="#/signin"><span class="ap-submit-label">Go to sign in</span>${ARROW}</a>`;
  }
  function mountRegister() {
    cleanup();
    const card = document.querySelector('.rg-card');
    if (!card) return;
    const offs = [];
    const on = (el, ev, fn) => { if (el) { el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); } };
    offs.push(MN.bindPasswordFields(card, () => ({ email: (card.querySelector('#rg-email') || {}).value, name: (card.querySelector('#pf-name') || {}).value })));
    on(card.querySelector('[data-google]'), 'click', (e) => google(e.currentTarget));
    on(card.querySelector('[data-resend]'), 'click', (e) => resend(e.currentTarget, state.sentTo, card.querySelector('[data-sent-scope]')));
    card.querySelectorAll('input').forEach((inp) => on(inp, 'input', () => clearErr(card, inp)));
    live = { timers: [], offs, ctrl: null };
    MN.onLeave = cleanup;
  }

  MN.forms.register = (form) => {
    const d = MN.formData(form);
    const email = (d.email || '').trim().toLowerCase();
    const errs = MN.profileErrors({ fullName: d.fullName, gradTerm: d.gradTerm });
    if (!email) errs.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email)) errs.email = 'Enter a valid email address, like name@example.com.';
    const pp = MN.Password.problem(d.password || '', { email });
    if (pp) errs.password = pp;
    else if (d.confirm !== d.password) errs.confirm = 'Passwords don\'t match.';
    if (!d.consent) errs.consent = 'You need to agree to the privacy notice to continue.';
    const scope = form;
    say(scope, '', '');
    if (!MN.showErrors(form, errs) || !remoteOn()) return null;
    busy(form, true, 'Creating account…');
    return R().signUp({ email, password: d.password, fullName: d.fullName.trim(), gradTerm: d.gradTerm, major: (d.major || '').trim(), consent: true })
      .then((r) => {
        if (r.signedIn) return R().restore().then(() => MN.go('#/welcome'));
        state.sentTo = email;
        history.replaceState(null, '', `#/check-email?e=${encodeURIComponent(email)}`);
        const card = form.closest('.rg-card');
        card.innerHTML = String(sentBlock(email));
        mountRegister();
        const t = card.querySelector('#rg-title'); if (t) t.focus();
        document.title = 'Check your email · MavNext';
        return null;
      }, (err) => {
        busy(form, false);
        say(scope, 'danger', err.message);
        if (err.weak) { const pw = form.elements.password; pw.setAttribute('aria-invalid', 'true'); pw.focus(); }
      });
  };

  function google(btn) {
    const scope = btn.closest('[data-google-scope]');
    say(scope, '', '');
    if (isFile()) {
      const site = (window.MAVNEXT_CONFIG || {}).siteUrl;
      say(scope, 'info', 'Google sign-in needs the online site, because Google can\'t return to a file on your computer.', site ? html` <a href="${site}#/signup">Open MavNext online</a>.` : '');
      return;
    }
    const label = btn.querySelector('span');
    btn.disabled = true; label.textContent = 'Checking…';
    const providerCheck = MN.Remote.providerEnabled ? MN.Remote.providerEnabled('google') : Promise.resolve(null);
    providerCheck.then((enabled) => {
      if (enabled === false) {
        btn.disabled = false; label.textContent = 'Continue with Google';
        say(scope, 'info', 'Google sign-in isn\'t turned on for MavNext yet. Use your email and a password for now.');
        return null;
      }
      label.textContent = 'Opening Google…';
      return R().signInWithGoogle();
    }).catch((err) => {
      btn.disabled = false; label.textContent = 'Continue with Google';
      say(scope, 'danger', err.message);
    });
  }

  /** The lit lamp scene with a plain card on the left (reset password, finish profile). */
  MN.authShell = (inner) => scene('signin', 'plain', html`<div class="au-card ap-plain">${inner}</div>`);

  MN.views.enter = { title: 'Welcome', render: () => scene('arrival', 'signin'), mount: mountScene };
  MN.views.signin = { title: 'Sign in', render: () => scene('signin', 'signin'), mount: mountScene };
  MN.views.forgot = { title: 'Reset password', render: () => scene('signin', 'forgot'), mount: mountScene };
  MN.views.signup = { title: 'Create account', render: () => registerPage(false), mount: mountRegister };
  MN.views.checkEmail = {
    title: 'Check your email',
    render: (p) => { state.sentTo = p.q.e || state.sentTo; return registerPage(true, state.sentTo); },
    mount: mountRegister
  };
})();
