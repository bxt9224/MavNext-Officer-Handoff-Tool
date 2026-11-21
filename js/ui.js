/* MavNext — shared UI components: badges, avatars, empty states, page headers,
   accessible dialogs, confirmation, toast. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon } = MN;

  MN.ui = {
    badge: (label, cls) => html`<span class="badge ${cls || 'b-gray'}">${label}</span>`,
    statusBadge: (key) => { const s = MN.STATUS_LABELS[key] || MN.STATUS_LABELS.draft; return MN.ui.badge(s.label, s.badge); },
    taskBadge: (status) => MN.ui.badge({ todo: 'To do', in_progress: 'In progress', done: 'Done' }[status] || status, { todo: 'b-gray', in_progress: 'b-blue', done: 'b-green' }[status]),
    permBadge: (p) => { const d = MN.PERMISSIONS[p]; return d ? MN.ui.badge(d.short, d.badge) : ''; },
    avatar: (member, small) => html`<span class="avatar ${small ? 'avatar-sm' : ''} ${MN.avatarClass(member ? member.id : '?')}" aria-hidden="true">${MN.initials(member ? member.name : '?')}</span>`,
    pageHead: (title, sub, actions, back) => html`
      <div class="page-head">
        <div>
          ${back ? html`<a class="back-link" href="${back.href}">${icon('chevronLeft', 'icon-sm')}${back.label}</a>` : ''}
          <h1 tabindex="-1" data-page-title>${title}</h1>
          ${sub ? html`<p>${sub}</p>` : ''}
        </div>
        ${actions ? html`<div class="btn-row">${actions}</div>` : ''}
      </div>`,
    empty: (ic, title, text, action) => html`
      <div class="empty">${icon(ic)}<h3>${title}</h3><p>${text}</p>${action || ''}</div>`,
    memberName: (id) => { const m = MN.Store.get('members', id); return m ? m.name : 'Unassigned'; },
    memberOptions: (members, selected, includeBlank) => html`
      ${includeBlank ? html`<option value="">${includeBlank}</option>` : ''}
      ${members.map((m) => html`<option value="${m.id}" ${m.id === selected ? 'selected' : ''}>${m.name}${m.title ? ` — ${m.title}` : ''}</option>`)}`
  };

  // ---------- Toast ----------
  let toastTimer = null;
  MN.toast = function (msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
  };

  // ---------- Dialog ----------
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  /**
   * opts: { title, body (html), actions: [{label, value, kind, submit}], wide, onOpen(root), onAction(value, form, close) }
   * onAction may return false to keep the dialog open, or a Promise.
   */
  MN.openDialog = function (opts) {
    const root = document.getElementById('dialog-root');
    const opener = document.activeElement;
    const id = MN.uid('dlg');
    root.innerHTML = String(html`
      <div class="dialog-backdrop">
        <div class="dialog ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}-t">
          <form novalidate>
            <div class="dialog-head"><h2 id="${id}-t">${opts.title}</h2>
              <button type="button" class="icon-btn" data-dlg="close" aria-label="Close">${icon('x')}</button></div>
            <div class="dialog-body">${opts.body}</div>
            <div class="dialog-foot">
              ${(opts.actions || []).map((a) => html`<button type="${a.submit ? 'submit' : 'button'}" class="btn ${a.kind || ''}" data-dlg-value="${a.value}">${a.label}</button>`)}
            </div>
          </form>
        </div>
      </div>`);
    const backdrop = root.firstElementChild;
    const dialog = backdrop.querySelector('.dialog');
    const form = dialog.querySelector('form');
    const main = document.querySelector('.shell, .entry');
    if (main) main.setAttribute('inert', '');
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      root.innerHTML = '';
      if (main) main.removeAttribute('inert');
      document.removeEventListener('keydown', onKey, true);
      if (opener && document.contains(opener)) opener.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); if (opts.onCancel) opts.onCancel(); }
      if (e.key === 'Tab') {
        const f = Array.from(dialog.querySelectorAll(FOCUSABLE));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) { close(); if (opts.onCancel) opts.onCancel(); } });
    function run(value) {
      let r;
      try { r = opts.onAction ? opts.onAction(value, form, close) : undefined; } catch (err) { r = Promise.reject(err); }
      Promise.resolve(r).then((keep) => { if (keep !== false) close(); }, (err) => {
        const box = form.querySelector('[data-dlg-error]');
        const msg = (err && err.message) || 'Something went wrong.';
        if (box) { box.textContent = msg; box.hidden = false; } else MN.toast(msg);
      });
    }
    dialog.addEventListener('click', (e) => {
      const c = e.target.closest('[data-dlg="close"]');
      if (c) { close(); if (opts.onCancel) opts.onCancel(); return; }
      const b = e.target.closest('button[data-dlg-value]');
      if (b && b.type !== 'submit') {
        if (b.dataset.dlgValue === 'cancel') { close(); if (opts.onCancel) opts.onCancel(); return; }
        run(b.dataset.dlgValue);
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const b = e.submitter || form.querySelector('button[type="submit"]');
      run(b ? b.dataset.dlgValue : 'submit');
    });
    if (opts.onOpen) opts.onOpen(dialog);
    const first = dialog.querySelector('[autofocus]') || dialog.querySelector('.dialog-body ' + FOCUSABLE) || dialog.querySelector('[data-dlg-value="cancel"]') || dialog.querySelector(FOCUSABLE);
    if (first) first.focus();
    return close;
  };

  /** Confirmation dialog. Resolves true only when the user confirms. */
  MN.confirm = function (o) {
    return new Promise((resolve) => {
      let done = false;
      MN.openDialog({
        title: o.title,
        body: html`${o.body}<p class="field-error" data-dlg-error hidden></p>`,
        actions: [{ label: 'Cancel', value: 'cancel' }, { label: o.confirmLabel || 'Confirm', value: 'ok', kind: o.danger ? 'btn-danger' : 'btn-primary' }],
        onAction: (v) => { if (v === 'ok' && !done) { done = true; resolve(true); } },
        onCancel: () => { if (!done) { done = true; resolve(false); } }
      });
    });
  };

  /** Reads named form controls into an object (checkbox groups become arrays). */
  MN.formData = function (form) {
    const out = {};
    Array.from(form.elements).forEach((el) => {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') {
        if (el.dataset.group) { out[el.name] = out[el.name] || []; if (el.checked) out[el.name].push(el.value); }
        else out[el.name] = el.checked;
      } else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    });
    return out;
  };

  /** Marks invalid fields and focuses the first. errors: { fieldName: message } */
  MN.showErrors = function (form, errors) {
    form.querySelectorAll('[data-err-for]').forEach((e) => { e.textContent = ''; e.hidden = true; });
    form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
    const keys = Object.keys(errors);
    keys.forEach((k) => {
      const field = form.elements[k];
      const box = form.querySelector(`[data-err-for="${k}"]`);
      if (field && field.setAttribute) field.setAttribute('aria-invalid', 'true');
      if (box) { box.textContent = errors[k]; box.hidden = false; }
    });
    if (keys.length && form.elements[keys[0]] && form.elements[keys[0]].focus) form.elements[keys[0]].focus();
    return keys.length === 0;
  };
})();
