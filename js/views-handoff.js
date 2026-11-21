/* MavNext — Handoffs: list, new, editor, pre-submit review, submitted snapshot,
   incoming-officer review, print/export. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon, ui } = MN;
  const S = () => MN.Store;
  const people = (orgId) => S().list('members', orgId).filter((m) => m.status === 'active' || m.status === 'contact');
  const name = (id) => (S().get('members', id) || {}).name || '';

  function notFound() { return ui.empty('alert', 'Handoff not found', 'It may belong to another organization, or you may not have access to it.', html`<a class="btn" href="#/handoffs">Back to handoffs</a>`); }

  // ---------- List ----------
  MN.views.handoffs = {
    title: 'Handoffs',
    crumbs: () => [{ label: 'Handoffs' }],
    render(p, c) {
      const list = S().list('handoffs', c.org.id).filter((h) => MN.can(c.me, 'handoff.view', h))
        .sort((a, b) => (b.lastSavedAt || '').localeCompare(a.lastSavedAt || ''));
      return html`
        ${ui.pageHead('Handoffs', 'Each handoff passes one officer role to the next person, in six sections.', MN.can(c.me, 'handoff.create') ? html`<a class="btn btn-primary" href="#/handoffs/new">${icon('plus')}Start a handoff</a>` : '')}
        <div class="panel">
          ${list.length ? html`<div class="table-wrap"><table class="list">
            <thead><tr><th scope="col">Role</th><th scope="col">Outgoing → incoming</th><th scope="col" class="opt">Terms</th><th scope="col">Status</th><th scope="col" class="opt">Progress</th><th scope="col" class="opt">Last saved</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>${list.map((h) => {
              const st = MN.handoffStatus(h); const pr = MN.handoffProgress(h.answers);
              const canEdit = MN.can(c.me, 'handoff.edit', h);
              return html`<tr>
                <td><a class="row-title" href="#/handoffs/${h.id}${canEdit ? '' : '/view'}">${h.role}</a></td>
                <td>${name(h.outgoingMemberId) || '—'} → ${name(h.incomingMemberId) || html`<span class="muted">Not chosen</span>`}</td>
                <td class="opt">${h.outgoingTerm || '—'} → ${h.incomingTerm || '—'}</td>
                <td>${ui.statusBadge(st.key)}${st.versions.length ? html` <span class="small muted">v${st.latest.version}</span>` : ''}${st.editedSince && canEdit ? html`<br><span class="small muted">Unsubmitted edits</span>` : ''}</td>
                <td class="opt" style="min-width:120px"><div class="progress" role="progressbar" aria-label="Progress" aria-valuenow="${pr.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pr.pct}%"></span></div><span class="small muted">${pr.done}/${pr.total}</span></td>
                <td class="opt small muted">${MN.relTime(h.lastSavedAt)}</td>
                <td style="white-space:nowrap">
                  ${canEdit ? html`<a class="btn btn-sm" href="#/handoffs/${h.id}">Edit</a>` : ''}
                  ${st.versions.length || !canEdit ? html`<a class="btn btn-sm btn-ghost" href="#/handoffs/${h.id}/view">View</a>` : ''}
                  ${MN.can(c.me, 'handoff.delete', h) ? html`<button class="btn btn-sm btn-ghost" style="color:var(--red)" data-action="deleteDraft" data-id="${h.id}" aria-label="Delete the ${h.role} draft">Delete draft</button>` : ''}
                </td></tr>`;
            })}</tbody></table></div>`
            : html`<div class="panel-body">${ui.empty('handoff', 'Start a handoff', 'Document your role — responsibilities, access procedures, deadlines, funding, lessons, and open commitments — for the next officer.', MN.can(c.me, 'handoff.create') ? html`<a class="btn btn-primary" href="#/handoffs/new">Start a handoff</a>` : '')}</div>`}
        </div>`;
    }
  };
  MN.actions.deleteDraft = (el) => {
    const h = S().get('handoffs', el.dataset.id);
    const pr = MN.handoffProgress(h.answers);
    const linked = S().list('tasks', h.orgId).filter((t) => t.handoffId === h.id).length;
    MN.confirm({ title: 'Delete this draft?', danger: true, confirmLabel: 'Delete draft',
      body: html`<p>The <strong>${h.role}</strong> handoff draft (${pr.done} of ${pr.total} questions addressed) will be permanently removed.</p><p>${linked ? `${MN.plural(linked, 'task')} linked to it will be kept and unlinked. ` : ''}Meetings, tasks, members, and other handoffs are not affected. Only unsubmitted drafts can be deleted.</p>` })
      .then((ok) => ok && MN.Svc.deleteDraft(h.id).then(() => { MN.toast('Draft deleted.'); MN.go('#/handoffs'); }));
  };

  // ---------- New / details form ----------
  function detailsFields(c, v) {
    const ps = people(c.org.id);
    const isAdmin = c.me.permission === 'admin';
    const outgoingChoices = isAdmin ? ps : ps.filter((m) => m.id === c.me.id);
    return html`
      <div class="grid-2">
        <div class="field"><label for="hd-role">Officer role <span class="req" aria-hidden="true">*</span></label><input class="input" id="hd-role" name="role" list="role-list" maxlength="60" value="${v.role}" required><datalist id="role-list">${['President', 'Vice President', 'Treasurer', 'Secretary', 'Events Chair', 'Outreach Chair'].map((r) => html`<option value="${r}">`)}</datalist><p class="field-error" data-err-for="role" hidden></p></div>
        <div class="field"><label for="hd-org">Organization</label><input class="input" id="hd-org" value="${c.org.name}" disabled></div>
        <div class="field"><label for="hd-out">Outgoing officer <span class="req" aria-hidden="true">*</span></label><select class="select" id="hd-out" name="outgoingMemberId">${ui.memberOptions(outgoingChoices, v.outgoingMemberId)}</select></div>
        <div class="field"><label for="hd-in">Incoming officer</label><select class="select" id="hd-in" name="incomingMemberId">${ui.memberOptions(ps.filter((m) => m.id !== v.outgoingMemberId), v.incomingMemberId, 'Not chosen yet')}</select><span class="hint">${c.mode === 'local' ? 'People in this browser-only workspace have no accounts.' : 'Only members of this organization can be chosen.'}</span></div>
        <div class="field"><label for="hd-ot">Outgoing term</label><input class="input" id="hd-ot" name="outgoingTerm" maxlength="40" value="${v.outgoingTerm}" placeholder="e.g., Fall 2026"></div>
        <div class="field"><label for="hd-it">Incoming term</label><input class="input" id="hd-it" name="incomingTerm" maxlength="40" value="${v.incomingTerm}" placeholder="e.g., Spring 2027"></div>
      </div>`;
  }
  MN.views.handoffNew = {
    title: 'Start a handoff',
    crumbs: () => [{ label: 'Handoffs', href: '#/handoffs' }, { label: 'New' }],
    render(p, c) {
      if (!MN.can(c.me, 'handoff.create')) return ui.empty('alert', 'You cannot start handoffs', 'Incoming officers review handoffs assigned to them.', html`<a class="btn" href="#/handoffs">Back</a>`);
      const v = { role: c.me.permission !== 'incoming' ? (c.me.title || '').replace(/\s*\(.*\)$/, '') : '', outgoingMemberId: c.me.id, incomingMemberId: '', outgoingTerm: (c.org.currentTerm || {}).label || '', incomingTerm: (c.org.nextTerm || {}).label || '' };
      return html`${ui.pageHead('Start a handoff', 'Who is handing off which role? You can change these details later.', '', { href: '#/handoffs', label: 'Handoffs' })}
        <form class="panel" data-form="newHandoff" novalidate><div class="panel-body">${detailsFields(c, v)}</div>
        <div class="editor-actions"><a class="btn" href="#/handoffs">Cancel</a><button class="btn btn-primary" type="submit">Create handoff</button></div></form>`;
    }
  };
  MN.forms.newHandoff = (form) => {
    const d = MN.formData(form);
    if (!MN.showErrors(form, d.role.trim() ? {} : { role: 'Enter the officer role.' })) return;
    return MN.Svc.createHandoff({ role: d.role.trim(), outgoingMemberId: d.outgoingMemberId, incomingMemberId: d.incomingMemberId || null, outgoingTerm: d.outgoingTerm.trim(), incomingTerm: d.incomingTerm.trim() })
      .then((h) => MN.go(`#/handoffs/${h.id}?s=responsibilities`));
  };

  // ---------- Editor ----------
  const STEPS = [{ id: 'details', title: 'Handoff details' }].concat(MN.SECTIONS).concat([{ id: 'records', title: 'Related records' }]);

  function secState(h, s) {
    if (s.id === 'details') return { state: h.role && h.incomingMemberId ? 'done' : 'partial', label: '' };
    if (s.id === 'records') { const n = (h.includes.taskIds || []).length + (h.includes.meetingIds || []).length; return { state: n ? 'done' : 'empty', label: n ? String(n) : '' }; }
    const pr = MN.sectionProgress(h.answers, s);
    return { state: pr.state, label: `${pr.done}/${pr.total}` };
  }
  function stateIcon(st, n) {
    return html`<span class="sec-state ${st === 'done' ? 'done' : st === 'partial' ? 'partial' : ''}" aria-hidden="true">${st === 'done' ? icon('check') : n || ''}</span>`;
  }

  MN.views.handoffEditor = {
    title: 'Handoff',
    crumbs: (p) => { const h = S().get('handoffs', p.id); return [{ label: 'Handoffs', href: '#/handoffs' }, { label: h ? `${h.role} handoff` : 'Not found' }]; },
    render(p, c) {
      const h = S().get('handoffs', p.id);
      if (!h || h.orgId !== c.org.id || !MN.can(c.me, 'handoff.view', h)) return notFound();
      if (!MN.can(c.me, 'handoff.edit', h)) { setTimeout(() => history.replaceState(null, '', `#/handoffs/${h.id}/view`) || MN.render(), 0); return ''; }
      const stepId = STEPS.some((s) => s.id === p.q.s) ? p.q.s : 'responsibilities';
      const step = STEPS.find((s) => s.id === stepId);
      const idx = STEPS.indexOf(step);
      const st = MN.handoffStatus(h);
      const pr = MN.handoffProgress(h.answers);
      const prev = STEPS[idx - 1]; const next = STEPS[idx + 1];
      return html`
        ${ui.pageHead(`${h.role} handoff`, '', html`
          <a class="btn" href="#/handoffs/${h.id}/view">${icon('eye')}Preview</a>
          <a class="btn btn-primary" href="#/handoffs/${h.id}/review">${st.versions.length ? 'Review & resubmit' : 'Review & submit'}</a>`, { href: '#/handoffs', label: 'Handoffs' })}
        ${st.key === 'changes_requested' ? html`<div class="notice notice-warn" style="margin-bottom:16px">${icon('message')}<div><strong>${name(st.review.by)} requested clarification on version ${st.latest.version}:</strong><div class="prewrap" style="margin-top:4px">${st.review.message}</div><span class="small">Update the relevant answers, then submit a new version. Version ${st.latest.version} stays preserved.</span></div></div>` : ''}
        ${st.versions.length && st.key !== 'changes_requested' ? html`<div class="notice notice-info" style="margin-bottom:16px">${icon('info')}<div>Version ${st.latest.version} was submitted ${MN.fmtDateTime(st.latest.submittedAt)} and is preserved as-is. ${st.editedSince ? 'You have edits that are not in any submitted version.' : 'Edits you make here become a new version only when you submit again.'}</div></div>` : ''}
        <div class="editor-grid">
          <nav class="panel section-nav" aria-label="Handoff sections">
            <div style="padding:16px 16px 8px">
              <div class="progress-label"><span data-prog-text>${pr.done} of ${pr.total} addressed</span><span data-prog-pct>${pr.pct}%</span></div>
              <div class="progress" role="progressbar" aria-label="Questions addressed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pr.pct}" data-prog-bar><span style="width:${pr.pct}%"></span></div>
            </div>
            <ol>${STEPS.map((s) => { const ss = secState(h, s); return html`<li><a href="#/handoffs/${h.id}?s=${s.id}" ${s.id === stepId ? MN.raw('aria-current="step"') : ''} data-sec-link="${s.id}">${stateIcon(ss.state, s.n)}<span>${s.title}</span><span class="sec-count" data-sec-count="${s.id}">${ss.label}</span></a></li>`; })}</ol>
          </nav>
          <div class="panel">
            <div class="editor-head">
              <span>Organization: <strong>${c.org.name}</strong></span>
              <span>Outgoing: <strong>${name(h.outgoingMemberId) || '—'}</strong>${h.outgoingTerm ? ` (${h.outgoingTerm})` : ''}</span>
              <span>Incoming: <strong>${name(h.incomingMemberId) || 'Not chosen'}</strong>${h.incomingTerm ? ` (${h.incomingTerm})` : ''}</span>
              <span>Status: ${ui.statusBadge(st.key)}</span>
              <span class="save-state" data-save-state role="status" aria-live="polite">${icon('check', 'icon-sm')}Saved ${MN.fmtDateTime(h.lastSavedAt)}</span>
            </div>
            <div class="panel-body">${stepBody(h, step, c)}</div>
            <div class="editor-actions">
              ${prev ? html`<a class="btn" href="#/handoffs/${h.id}?s=${prev.id}">${icon('chevronLeft', 'icon-sm')}${prev.title}</a>` : html`<span></span>`}
              ${next ? html`<a class="btn btn-primary" href="#/handoffs/${h.id}?s=${next.id}">${next.title}${icon('chevronRight', 'icon-sm')}</a>` : html`<a class="btn btn-primary" href="#/handoffs/${h.id}/review">Review &amp; submit${icon('chevronRight', 'icon-sm')}</a>`}
            </div>
          </div>
        </div>`;
    },
    mount(root, p) { const h = S().get('handoffs', p.id); if (h) root.dataset.handoff = h.id; }
  };

  function stepBody(h, step, c) {
    if (step.id === 'details') {
      return html`<h2 style="margin-bottom:4px">Handoff details</h2><p class="muted" style="margin-bottom:24px">Changes here save when you leave each field.</p>
        <form data-form="noop" data-handoff-meta="${h.id}">${detailsFields(c, h)}</form>`;
    }
    if (step.id === 'records') {
      const inc = h.includes || { taskIds: [], meetingIds: [] };
      const tasks = inc.taskIds.map((id) => S().get('tasks', id)).filter(Boolean);
      const meetings = inc.meetingIds.map((id) => S().get('meetings', id)).filter(Boolean);
      return html`<h2 style="margin-bottom:4px">Related records</h2>
        <p class="muted" style="margin-bottom:16px">Choose specific tasks and meeting notes to include. Nothing is included unless you select it. Included items are copied into the handoff when you submit.</p>
        <button class="btn" data-action="chooseIncludes" data-id="${h.id}" style="margin-bottom:16px">${icon('plus')}Choose tasks and meeting notes</button>
        <h3 style="margin:8px 0">Tasks (${tasks.length})</h3>
        ${tasks.length ? html`<ul class="check-list">${tasks.map((t) => html`<li>${ui.taskBadge(t.status)} <span>${t.title} — ${name(t.assigneeId)}${t.dueDate ? `, due ${MN.fmtDate(t.dueDate, { weekday: undefined })}` : ''}</span></li>`)}</ul>` : html`<p class="empty-inline">No tasks included.</p>`}
        <h3 style="margin:16px 0 8px">Meeting notes (${meetings.length})</h3>
        ${meetings.length ? html`<ul class="check-list">${meetings.map((m) => html`<li><span><strong>${m.title}</strong> (${MN.fmtDate(m.date)}) — ${m.agenda.length} agenda items, ${m.notes ? 'notes included' : 'no notes recorded'}</span></li>`)}</ul>` : html`<p class="empty-inline">No meeting notes included.</p>`}`;
    }
    return html`
      <h2 style="margin-bottom:4px">${step.n}. ${step.title}</h2>
      <p class="muted" style="margin-bottom:16px">${step.intro}</p>
      ${step.privacy ? html`<div class="notice notice-warn" style="margin-bottom:16px">${icon('alert')}<div>Describe <strong>how</strong> access is transferred. Do not enter passwords, PINs, recovery codes, or account numbers — anywhere in MavNext.</div></div>` : ''}
      <div>${step.questions.map((q) => questionBlock(h, q))}</div>`;
  }

  function questionBlock(h, q) {
    const a = h.answers[q.id] || { text: '', status: 'answered' };
    const len = (a.text || '').length;
    return html`<div class="q" data-q="${q.id}">
      <label class="q-title" for="qa-${q.id}">${q.title}${q.required ? html` <span class="badge b-gray">Required</span>` : ''}</label>
      <p class="q-help" id="qh-${q.id}">${q.help} <span class="muted">Example: ${q.example}</span></p>
      <textarea class="textarea" id="qa-${q.id}" data-input="answer" data-qid="${q.id}" aria-describedby="qh-${q.id} qs-${q.id}" maxlength="${MN.CHAR_LIMIT}" placeholder="${a.status === 'answered' ? '' : 'Optional note'}">${a.text}</textarea>
      <p class="field-error" data-sens="${q.id}" ${MN.looksSensitive(a.text) ? '' : 'hidden'}>This may contain a password, code, or account number. Please describe the procedure instead.</p>
      <div class="q-foot">
        <span class="small muted" id="qs-${q.id}">${a.status === 'answered' ? '' : `Marked: ${MN.ANSWER_MARKS[a.status].label}.`}</span>
        <span class="small muted">Mark as:</span>
        ${Object.keys(MN.ANSWER_MARKS).map((k) => html`<button type="button" class="mark" data-action="markAnswer" data-qid="${q.id}" data-mark="${k}" aria-pressed="${a.status === k}">${MN.ANSWER_MARKS[k].label}</button>`)}
        <span class="counter" data-counter="${q.id}">${len} / ${MN.CHAR_LIMIT}</span>
      </div>
    </div>`;
  }

  // Autosave
  const timers = {};
  function setSaveState(text, error) {
    const el = document.querySelector('[data-save-state]');
    if (!el) return;
    el.classList.toggle('error', !!error);
    el.innerHTML = String(html`${icon(error ? 'alert' : 'check', 'icon-sm')}${text}`);
  }
  function refreshProgress(h) {
    const pr = MN.handoffProgress(h.answers);
    const t = document.querySelector('[data-prog-text]'); if (t) t.textContent = `${pr.done} of ${pr.total} addressed`;
    const pc = document.querySelector('[data-prog-pct]'); if (pc) pc.textContent = `${pr.pct}%`;
    const bar = document.querySelector('[data-prog-bar]'); if (bar) { bar.setAttribute('aria-valuenow', pr.pct); bar.firstElementChild.style.width = `${pr.pct}%`; }
    STEPS.forEach((s) => {
      const link = document.querySelector(`[data-sec-link="${s.id}"]`);
      if (!link) return;
      const ss = secState(h, s);
      link.querySelector('.sec-state').outerHTML = String(stateIcon(ss.state, s.n));
      link.querySelector('.sec-count').textContent = ss.label;
    });
  }
  function saveAnswerNow(hid, qid, answer) {
    clearTimeout(timers[qid]); delete timers[qid];
    setSaveState('Saving…');
    return MN.Svc.saveAnswer(hid, qid, answer).then(() => {
      setSaveState(`Saved ${MN.fmtDateTime(MN.nowISO())}`);
      refreshProgress(S().get('handoffs', hid));
    }, () => setSaveState('Not saved — check storage or connection', true));
  }
  function currentHandoffId() { const m = document.querySelector('[data-handoff]'); return m && m.dataset.handoff; }

  MN.inputs.answer = (el) => {
    const hid = currentHandoffId(); const qid = el.dataset.qid;
    const h = S().get('handoffs', hid);
    const status = (h.answers[qid] || {}).status || 'answered';
    const cnt = document.querySelector(`[data-counter="${qid}"]`); if (cnt) cnt.textContent = `${el.value.length} / ${MN.CHAR_LIMIT}`;
    const sens = document.querySelector(`[data-sens="${qid}"]`); if (sens) sens.hidden = !MN.looksSensitive(el.value);
    setSaveState('Unsaved changes…');
    clearTimeout(timers[qid]);
    timers[qid] = setTimeout(() => saveAnswerNow(hid, qid, { text: el.value, status }), 500);
  };
  /** Flush any pending answer saves (called before navigation). */
  MN.flushEditor = function () {
    const hid = currentHandoffId(); if (!hid) return;
    Object.keys(timers).forEach((qid) => {
      const el = document.getElementById(`qa-${qid}`);
      const h = S().get('handoffs', hid);
      if (el) saveAnswerNow(hid, qid, { text: el.value, status: (h.answers[qid] || {}).status || 'answered' });
    });
  };
  window.addEventListener('hashchange', MN.flushEditor, true);
  window.addEventListener('pagehide', MN.flushEditor);

  MN.actions.markAnswer = (el) => {
    const hid = currentHandoffId(); const qid = el.dataset.qid;
    const h = S().get('handoffs', hid);
    const cur = (h.answers[qid] || {}).status;
    const next = cur === el.dataset.mark ? 'answered' : el.dataset.mark;
    const ta = document.getElementById(`qa-${qid}`);
    saveAnswerNow(hid, qid, { text: ta.value, status: next }).then(() => {
      document.querySelectorAll(`.mark[data-qid="${qid}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mark === next)));
      const s = document.getElementById(`qs-${qid}`); if (s) s.textContent = next === 'answered' ? '' : `Marked: ${MN.ANSWER_MARKS[next].label}.`;
      ta.placeholder = next === 'answered' ? '' : 'Optional note';
    });
  };

  MN.changes.handoffMeta = null;
  document.addEventListener('change', (e) => {
    const form = e.target.closest('[data-handoff-meta]');
    if (!form) return;
    const d = MN.formData(form);
    if (!d.role.trim()) { MN.showErrors(form, { role: 'Enter the officer role.' }); return; }
    MN.showErrors(form, {});
    setSaveState('Saving…');
    MN.Svc.updateHandoffMeta(form.dataset.handoffMeta, { role: d.role.trim(), outgoingMemberId: d.outgoingMemberId, incomingMemberId: d.incomingMemberId || null, outgoingTerm: d.outgoingTerm.trim(), incomingTerm: d.incomingTerm.trim() })
      .then(() => { setSaveState(`Saved ${MN.fmtDateTime(MN.nowISO())}`); refreshProgress(S().get('handoffs', form.dataset.handoffMeta)); }, () => setSaveState('Not saved', true));
  });
  MN.forms.noop = () => {};

  MN.actions.chooseIncludes = (el) => {
    const h = S().get('handoffs', el.dataset.id);
    const c = MN.ctx();
    const tasks = S().list('tasks', c.org.id).filter((t) => MN.can(c.me, 'task.view', t)).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    const meetings = S().list('meetings', c.org.id).filter((m) => m.status !== 'cancelled').sort(MN.byDate).reverse();
    MN.openDialog({
      title: 'Choose records to include', wide: true,
      body: html`<p class="muted" style="margin-bottom:16px">Only what you check is included. The incoming officer sees these items as they are when you submit.</p>
        <fieldset><legend>Tasks</legend><div class="include-list">${tasks.length ? tasks.map((t) => html`<label class="check"><input type="checkbox" name="taskIds" data-group="1" value="${t.id}" ${h.includes.taskIds.includes(t.id) ? 'checked' : ''}><span>${t.title}<br><span class="small muted">${name(t.assigneeId)} · ${{ todo: 'To do', in_progress: 'In progress', done: 'Done' }[t.status]}${t.dueDate ? ` · due ${MN.fmtDate(t.dueDate, { weekday: undefined })}` : ''}</span></span></label>`) : html`<p class="empty-inline">No tasks.</p>`}</div></fieldset>
        <fieldset><legend>Meeting agendas and notes</legend><div class="include-list">${meetings.length ? meetings.map((m) => html`<label class="check"><input type="checkbox" name="meetingIds" data-group="1" value="${m.id}" ${h.includes.meetingIds.includes(m.id) ? 'checked' : ''}><span>${m.title}<br><span class="small muted">${MN.fmtDate(m.date)} · ${m.notes ? 'has notes' : 'no notes'}</span></span></label>`) : html`<p class="empty-inline">No meetings.</p>`}</div></fieldset>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Save selection', value: 'save', kind: 'btn-primary', submit: true }],
      onAction(v, form) {
        const d = MN.formData(form);
        return MN.Svc.setIncludes(h.id, { taskIds: d.taskIds || [], meetingIds: d.meetingIds || [] }).then(() => { MN.render(); MN.toast('Selection saved.'); });
      }
    });
  };

  // ---------- Pre-submit review ----------
  MN.views.handoffReview = {
    title: 'Review & submit',
    crumbs: (p) => { const h = S().get('handoffs', p.id); return [{ label: 'Handoffs', href: '#/handoffs' }, { label: h ? `${h.role} handoff` : '', href: h ? `#/handoffs/${h.id}` : '#/handoffs' }, { label: 'Review & submit' }]; },
    render(p, c) {
      const h = S().get('handoffs', p.id);
      if (!h || h.orgId !== c.org.id || !MN.can(c.me, 'handoff.edit', h)) return notFound();
      const a = MN.analyzeAnswers(h.answers);
      const st = MN.handoffStatus(h);
      const inc = S().get('members', h.incomingMemberId);
      const alreadyCurrent = st.versions.length && !st.editedSince && st.key !== 'changes_requested';
      const link = (q) => html`<a href="#/handoffs/${h.id}?s=${q.sectionId}">${q.title}</a> <span class="muted small">— ${MN.SECTIONS.find((s) => s.id === q.sectionId).title}</span>`;
      const group = (title, items, cls, note) => html`<section class="panel"><div class="panel-head"><h2>${title}</h2>${ui.badge(String(items.length), cls)}</div><div class="panel-body tight">${note ? html`<p class="small muted" style="padding-top:8px">${note}</p>` : ''}${items.length ? html`<ul class="check-list">${items.map((q) => html`<li>${link(q)}</li>`)}</ul>` : html`<p class="empty-inline">None.</p>`}</div></section>`;
      const delivery = c.mode === 'demo'
        ? 'This is a demo: submission is simulated. The version becomes visible when you view the demo as the incoming officer.'
        : c.mode === 'local'
          ? 'This workspace exists only in this browser. Submitting saves a dated, read-only version here — nobody else receives it. Print or export it to share.'
          : `${inc ? inc.name : 'The incoming officer'} will be able to open it when signed in to this organization's workspace.`;
      const blocked = a.missingRequired.length || !inc;
      return html`
        ${ui.pageHead('Review before submitting', `${h.role} handoff · ${c.org.name}`, html`<a class="btn" href="#/handoffs/${h.id}/view">${icon('eye')}Preview document</a>`, { href: `#/handoffs/${h.id}`, label: 'Back to editor' })}
        ${a.missingRequired.length ? html`<div class="notice notice-danger" style="margin-bottom:16px">${icon('alert')}<div><strong>${MN.plural(a.missingRequired.length, 'required question')} still empty.</strong> Answer each one, or mark it Unknown, Not applicable, or Needs follow-up.<ul style="margin:8px 0 0;padding-left:18px">${a.missingRequired.map((q) => html`<li>${link(q)}</li>`)}</ul></div></div>` : ''}
        <div class="review-cols" style="margin-bottom:24px">
          ${group('Needs follow-up', a.followup, 'b-purple', 'Unresolved items the incoming officer must act on.')}
          ${group('Unknown', a.unknown, 'b-amber', 'Not known by the outgoing officer — research needed.')}
          ${group('Left blank (optional)', a.blank, 'b-gray', 'Shown as "Not provided" in the handoff.')}
        </div>
        <div class="dash-grid">
          <section class="panel"><div class="panel-head"><h2>Included records</h2><a class="btn btn-ghost btn-sm" href="#/handoffs/${h.id}?s=records">Change</a></div><div class="panel-body tight">
            ${(h.includes.taskIds.length + h.includes.meetingIds.length) ? html`<ul class="check-list">
              ${h.includes.taskIds.map((id) => S().get('tasks', id)).filter(Boolean).map((t) => html`<li>Task: ${t.title} (${name(t.assigneeId)})</li>`)}
              ${h.includes.meetingIds.map((id) => S().get('meetings', id)).filter(Boolean).map((m) => html`<li>Meeting notes: ${m.title}, ${MN.fmtDate(m.date)}</li>`)}</ul>` : html`<p class="empty-inline">No tasks or meeting notes included.</p>`}
            <p class="small muted" style="padding-bottom:12px">${a.na.length} question${a.na.length === 1 ? '' : 's'} marked not applicable.</p>
          </div></section>
          <form class="panel" data-form="submitHandoff" data-id="${h.id}" novalidate>
            <div class="panel-head"><h2>Recipient</h2></div>
            <div class="panel-body">
              ${inc ? html`<div class="person">${ui.avatar(inc)}<div><strong>${inc.name}</strong><small>${inc.title}${h.incomingTerm ? ` · ${h.incomingTerm}` : ''}</small></div></div>
                <p class="small muted" style="margin:12px 0">${delivery}</p>
                <label class="check"><input type="checkbox" name="confirmRecipient" required> <span>${inc.name} is the intended recipient of this ${h.role} handoff.</span></label>
                <p class="field-error" data-err-for="confirmRecipient" hidden></p>`
                : html`<div class="notice notice-warn">${icon('alert')}<div>Choose the incoming officer in <a href="#/handoffs/${h.id}?s=details">Handoff details</a> before submitting.</div></div>`}
              <p class="small muted" style="margin-top:12px">Submitting saves version ${st.versions.length + 1} as a dated snapshot. ${st.versions.length ? `Earlier versions stay readable and unchanged.` : 'Later edits never change it.'} Submitting does not change anyone's permissions.</p>
            </div>
            <div class="editor-actions"><a class="btn" href="#/handoffs/${h.id}">Keep editing</a>
              <button class="btn btn-primary" type="submit" ${blocked || alreadyCurrent ? 'disabled' : ''}>${icon('send')}Submit version ${st.versions.length + 1}</button></div>
            ${alreadyCurrent ? html`<p class="small muted" style="padding:0 24px 16px">Version ${st.latest.version} already contains these answers.</p>` : ''}
          </form>
        </div>`;
    }
  };
  MN.forms.submitHandoff = (form) => {
    if (!MN.showErrors(form, form.elements.confirmRecipient && form.elements.confirmRecipient.checked ? {} : { confirmRecipient: 'Confirm the recipient to submit.' })) return;
    MN.flushEditor();
    return MN.Svc.submitHandoff(form.dataset.id).then((v) => { MN.go(`#/handoffs/${form.dataset.id}/view?v=${v.version}`); MN.toast(`Version ${v.version} submitted${MN.Store.mode === 'demo' ? ' (simulated delivery)' : ''}.`); });
  };

  // ---------- Document (snapshot or draft) ----------
  function answerHtml(a) {
    const text = (a && a.text || '').trim();
    if (!a || a.status === 'answered') return text ? html`<div class="ans">${text}</div>` : html`<div class="ans flag">[Not provided]</div>`;
    const m = MN.ANSWER_MARKS[a.status];
    return html`<div class="ans flag">[${m.doc}]</div>${text ? html`<div class="ans" style="margin-top:4px">Note: ${text}</div>` : ''}`;
  }
  MN.renderDoc = function (snap, meta) {
    const a = MN.analyzeAnswers(snap.answers);
    const attention = a.followup.concat(a.unknown, a.missingRequired);
    return html`<article class="panel doc" aria-label="Handoff document">
      <header class="doc-head">
        <p class="small muted" style="margin-bottom:4px">${snap.orgName} · MavNext handoff</p>
        <h1 style="margin-bottom:8px">${snap.role} handoff</h1>
        <dl class="meta-list">
          <dt>Outgoing</dt><dd>${snap.outgoingName || '—'}${snap.outgoingTerm ? ` (${snap.outgoingTerm})` : ''}</dd>
          <dt>Incoming</dt><dd>${snap.incomingName || '—'}${snap.incomingTerm ? ` (${snap.incomingTerm})` : ''}</dd>
          <dt>Version</dt><dd>${meta.label}</dd>
        </dl>
      </header>
      ${attention.length ? html`<section class="doc-section"><h2>Needs attention (${attention.length})</h2><ul class="check-list">${attention.map((q) => { const ans = snap.answers[q.id] || {}; return html`<li><span>${ans.status === 'followup' ? ui.badge('Needs follow-up', 'b-purple') : ans.status === 'unknown' ? ui.badge('Unknown', 'b-amber') : ui.badge('Required — not provided', 'b-red')} <strong>${q.title}</strong>${ans.text ? html` — ${ans.text}` : ''}</span></li>`; })}</ul></section>` : ''}
      ${MN.SECTIONS.map((s) => html`<section class="doc-section"><h2>${s.n}. ${s.title}</h2>${s.questions.map((q) => html`<div class="doc-q"><h3>${q.title}${(snap.answers[q.id] || {}).status && snap.answers[q.id].status !== 'answered' ? ui.badge(MN.ANSWER_MARKS[snap.answers[q.id].status].label, MN.ANSWER_MARKS[snap.answers[q.id].status].badge) : ''}</h3>${answerHtml(snap.answers[q.id])}</div>`)}</section>`)}
      ${(snap.included.tasks.length || snap.included.meetings.length) ? html`<section class="doc-section"><h2>Included records</h2>
        ${snap.included.tasks.length ? html`<h3 style="margin-bottom:8px">Tasks</h3><ul class="check-list" style="margin-bottom:16px">${snap.included.tasks.map((t) => html`<li><span><strong>${t.title}</strong> — ${t.assignee}${t.dueDate ? `, due ${MN.fmtDate(t.dueDate, { weekday: undefined })}` : ''} · ${{ todo: 'To do', in_progress: 'In progress', done: 'Done' }[t.status]}${t.description ? html`<br><span class="muted">${t.description}</span>` : ''}</span></li>`)}</ul>` : ''}
        ${snap.included.meetings.map((m) => html`<div class="doc-q"><h3>${m.title} — ${MN.fmtDate(m.date)}${m.location ? `, ${m.location}` : ''}</h3>${m.agenda.length ? html`<div class="ans">Agenda: ${m.agenda.join('; ')}</div>` : ''}${m.notes ? html`<div class="ans" style="margin-top:4px">${m.notes}</div>` : html`<div class="ans flag">[No notes recorded]</div>`}</div>`)}
      </section>` : ''}
      <footer class="doc-section small muted">This document records what the outgoing officer entered. It is not an official university record. Acknowledgment confirms receipt only — not that every detail is correct or that account access has been transferred. Never store passwords or account numbers in a handoff.</footer>
    </article>`;
  };

  MN.snapshotMarkdown = function (snap, label) {
    const lines = [`# ${snap.role} handoff — ${snap.orgName}`, '', `- Outgoing: ${snap.outgoingName}${snap.outgoingTerm ? ` (${snap.outgoingTerm})` : ''}`, `- Incoming: ${snap.incomingName}${snap.incomingTerm ? ` (${snap.incomingTerm})` : ''}`, `- ${label}`, ''];
    MN.SECTIONS.forEach((s) => {
      lines.push(`## ${s.n}. ${s.title}`, '');
      s.questions.forEach((q) => {
        const a = snap.answers[q.id] || {};
        const flag = a.status && a.status !== 'answered' ? `[${MN.ANSWER_MARKS[a.status].doc}] ` : '';
        lines.push(`### ${q.title}`, '', `${flag}${(a.text || '').trim() || (flag ? '' : '[Not provided]')}`, '');
      });
    });
    if (snap.included.tasks.length || snap.included.meetings.length) {
      lines.push('## Included records', '');
      snap.included.tasks.forEach((t) => lines.push(`- Task: ${t.title} — ${t.assignee}${t.dueDate ? `, due ${t.dueDate}` : ''} (${t.status})`));
      snap.included.meetings.forEach((m) => lines.push(`- Meeting: ${m.title} (${m.date})${m.agenda.length ? ` — agenda: ${m.agenda.join('; ')}` : ''}${m.notes ? `\n  Notes: ${m.notes.replace(/\n/g, '\n  ')}` : ''}`));
      lines.push('');
    }
    lines.push('---', 'Not an official university record. Acknowledgment confirms receipt only.');
    return lines.join('\n');
  };

  MN.views.handoffView = {
    title: 'Handoff',
    crumbs: (p) => { const h = S().get('handoffs', p.id); return [{ label: 'Handoffs', href: '#/handoffs' }, { label: h ? `${h.role} handoff` : 'Not found' }]; },
    render(p, c) {
      const h = S().get('handoffs', p.id);
      if (!h || h.orgId !== c.org.id || !MN.can(c.me, 'handoff.view', h)) return notFound();
      const st = MN.handoffStatus(h);
      const canEdit = MN.can(c.me, 'handoff.edit', h);
      const wantDraft = p.q.v === 'draft' || (!st.versions.length);
      const ver = wantDraft ? null : (st.versions.find((v) => String(v.version) === p.q.v) || st.latest);
      if (wantDraft && !canEdit) return notFound();
      const snap = ver ? ver.snapshot : MN.Svc.buildSnapshot(h);
      const label = ver ? `Version ${ver.version}, submitted ${MN.fmtDateTime(ver.submittedAt)} by ${name(ver.submittedBy)}` : `Draft preview, last saved ${MN.fmtDateTime(h.lastSavedAt)} — not submitted`;
      const reviews = S().list('handoffReviews').filter((r) => r.handoffId === h.id).sort((a, b) => a.at.localeCompare(b.at));
      const events = st.versions.map((v) => ({ at: v.submittedAt, text: html`<strong>${name(v.submittedBy)}</strong> submitted version ${v.version}` }))
        .concat(reviews.map((r) => ({ at: r.at, text: html`<strong>${name(r.by)}</strong> ${r.type === 'acknowledged' ? 'acknowledged receipt of' : 'requested clarification on'} version ${r.version}${r.message ? html`<div class="prewrap muted">“${r.message}”</div>` : ''}` })))
        .sort((a, b) => a.at.localeCompare(b.at));
      const isLatest = ver && st.latest && ver.version === st.latest.version;
      const canReview = isLatest && MN.can(c.me, 'handoff.review', h);
      return html`
        ${ui.pageHead(`${h.role} handoff`, label, html`
          <button class="btn" data-action="printDoc">${icon('printer')}Print / Save PDF</button>
          <button class="btn" data-action="exportDoc" data-id="${h.id}" data-v="${ver ? ver.version : 'draft'}">${icon('download')}Download text</button>
          ${canEdit ? html`<a class="btn btn-primary" href="#/handoffs/${h.id}">${icon('edit')}Edit</a>` : ''}`, { href: '#/handoffs', label: 'Handoffs' })}
        <div class="detail-grid">
          <div>
            ${!ver ? html`<div class="notice notice-info no-print" style="margin-bottom:16px">${icon('info')}<div>This is a preview of the current draft. It has not been submitted.</div></div>` : ''}
            ${ver && !isLatest ? html`<div class="notice notice-warn no-print" style="margin-bottom:16px">${icon('info')}<div>You are viewing an earlier version. <a href="#/handoffs/${h.id}/view?v=${st.latest.version}">View the latest (version ${st.latest.version})</a>.</div></div>` : ''}
            ${MN.renderDoc(snap, { label })}
          </div>
          <aside class="stack no-print">
            <section class="panel"><div class="panel-head"><h2>Status</h2>${ui.statusBadge(st.key)}</div><div class="panel-body">
              ${canReview ? html`<p class="small" style="margin-bottom:12px">${name(h.outgoingMemberId)} submitted this handoff to you. Acknowledge that you received it, or ask for clarification.</p>
                <div class="btn-row"><button class="btn btn-primary" data-action="ackHandoff" data-id="${h.id}">${icon('check')}Acknowledge receipt</button><button class="btn" data-action="clarifyHandoff" data-id="${h.id}">${icon('message')}Request clarification</button></div>
                ${c.mode === 'demo' ? html`<p class="hint" style="margin-top:8px">Demo: you are viewing as ${c.me.name} through the simulated role switch.</p>` : ''}`
                : h.incomingMemberId === c.me.id && st.key === 'acknowledged' ? html`<p class="small">You acknowledged version ${st.review.version}.</p>`
                : h.incomingMemberId === c.me.id && st.key === 'changes_requested' ? html`<p class="small">You requested clarification. The outgoing officer can submit a new version.</p>`
                : st.key === 'acknowledged' ? html`<p class="small">${name(st.review.by)} acknowledged receipt of version ${st.review.version} on ${MN.fmtDateTime(st.review.at)}.</p>`
                : st.key === 'changes_requested' ? html`<p class="small">${name(st.review.by)} requested clarification on version ${st.review.version}.</p>`
                : st.key === 'draft' ? html`<p class="small muted">Not submitted yet.</p>`
                : st.key === 'submitted' ? html`<p class="small muted">Waiting for ${name(h.incomingMemberId) || 'the incoming officer'} to review.${c.mode === 'demo' && canEdit ? ' In the demo, use "View as" to switch to the incoming officer.' : ''}${c.mode === 'local' ? ' This browser-only workspace cannot deliver it; print or download it to share.' : ''}</p>` : ''}
            </div></section>
            <section class="panel"><div class="panel-head"><h2>Versions</h2></div><div class="panel-body tight">
              ${st.versions.length ? html`<ul class="rows">${st.versions.slice().reverse().map((v) => html`<li class="row"><div class="row-main"><a class="row-title" href="#/handoffs/${h.id}/view?v=${v.version}" ${ver && v.version === ver.version ? MN.raw('aria-current="page"') : ''}>Version ${v.version}</a><div class="row-meta"><span>${MN.fmtDateTime(v.submittedAt)}</span></div></div></li>`)}</ul>` : html`<p class="empty-inline">No submitted versions.</p>`}
              ${canEdit && st.versions.length ? html`<p style="padding-bottom:12px"><a href="#/handoffs/${h.id}/view?v=draft">Preview current draft</a></p>` : ''}
            </div></section>
            <section class="panel"><div class="panel-head"><h2>History</h2></div><div class="panel-body tight">
              ${events.length ? html`<ul class="timeline">${events.map((e) => html`<li><span class="dot" aria-hidden="true"></span><div>${e.text}<time datetime="${e.at}">${MN.fmtDateTime(e.at)}</time></div></li>`)}</ul>` : html`<p class="empty-inline">Nothing yet.</p>`}
            </div></section>
          </aside>
        </div>`;
    }
  };
  MN.actions.printDoc = () => window.print();
  MN.actions.exportDoc = (el) => {
    const h = S().get('handoffs', el.dataset.id);
    const st = MN.handoffStatus(h);
    const ver = el.dataset.v === 'draft' ? null : st.versions.find((v) => String(v.version) === el.dataset.v);
    const snap = ver ? ver.snapshot : MN.Svc.buildSnapshot(h);
    const label = ver ? `Version ${ver.version}, submitted ${MN.fmtDateTime(ver.submittedAt)}` : `Draft (not submitted), saved ${MN.fmtDateTime(h.lastSavedAt)}`;
    MN.download(`${h.role.replace(/\W+/g, '-').toLowerCase()}-handoff-${ver ? `v${ver.version}` : 'draft'}.md`, MN.snapshotMarkdown(snap, label), 'text/markdown');
  };
  MN.actions.ackHandoff = (el) => {
    const h = S().get('handoffs', el.dataset.id);
    MN.openDialog({
      title: 'Acknowledge receipt',
      body: html`<p>You confirm that you received version ${MN.handoffStatus(h).latest.version} of the ${h.role} handoff from ${name(h.outgoingMemberId)}.</p>
        <div class="notice notice-info" style="margin:12px 0">${icon('info')}<div>Acknowledging does <strong>not</strong> certify that the information is correct or complete, and does not mean account access has been transferred. It does not change anyone's permissions.</div></div>
        <div class="field"><label for="ack-msg">Note to ${name(h.outgoingMemberId)} <span class="muted">(optional)</span></label><textarea class="textarea" id="ack-msg" name="message" maxlength="600"></textarea></div><p class="field-error" data-dlg-error hidden></p>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Acknowledge receipt', value: 'ok', kind: 'btn-primary', submit: true }],
      onAction: (v, form) => MN.Svc.reviewHandoff(h.id, 'acknowledged', form.elements.message.value).then(() => MN.toast('Receipt acknowledged.'))
    });
  };
  MN.actions.clarifyHandoff = (el) => {
    const h = S().get('handoffs', el.dataset.id);
    MN.openDialog({
      title: 'Request clarification',
      body: html`<div class="field"><label for="cl-msg">What needs clarifying? <span class="req" aria-hidden="true">*</span></label><textarea class="textarea" id="cl-msg" name="message" maxlength="1000" required></textarea><span class="hint">${name(h.outgoingMemberId)} will see this and can submit a revised version. The current version stays preserved.</span><p class="field-error" data-err-for="message" hidden></p></div><p class="field-error" data-dlg-error hidden></p>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Send request', value: 'ok', kind: 'btn-primary', submit: true }],
      onAction: (v, form) => {
        if (!MN.showErrors(form, form.elements.message.value.trim() ? {} : { message: 'Describe what needs clarifying.' })) return false;
        return MN.Svc.reviewHandoff(h.id, 'clarification', form.elements.message.value).then(() => MN.toast(MN.Store.mode === 'demo' ? 'Clarification requested (simulated delivery).' : 'Clarification requested.'));
      }
    });
  };
})();
