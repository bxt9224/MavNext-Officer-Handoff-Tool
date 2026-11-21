/* MavNext — Members & Roles, Archive, Settings. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon, ui } = MN;
  const S = () => MN.Store;
  const fmtTerm = (m) => (m.termStart || m.termEnd) ? `${m.termStart ? MN.fmtDate(m.termStart, { weekday: undefined }) : '?'} – ${m.termEnd ? MN.fmtDate(m.termEnd, { weekday: undefined }) : '?'}` : '—';

  // ---------- Members ----------
  MN.views.members = {
    title: 'Members & Roles',
    crumbs: () => [{ label: 'Members & Roles' }],
    render(p, c) {
      const all = S().list('members', c.org.id);
      const current = all.filter((m) => m.status === 'active' || m.status === 'contact');
      const former = all.filter((m) => m.status === 'former');
      const invites = S().list('invitations', c.org.id).filter((i) => !i.acceptedAt);
      const manage = MN.can(c.me, 'members.manage');
      const addBtn = !manage ? '' : c.mode === 'local' ? html`<button class="btn btn-primary" data-action="addPerson">${icon('userPlus')}Add person</button>`
        : html`<button class="btn btn-primary" data-action="invite">${icon('userPlus')}Invite officer</button>`;
      return html`
        ${ui.pageHead('Members & Roles', 'Officer titles describe the job. Permissions decide what someone can do in MavNext.', addBtn)}
        ${c.mode === 'local' ? html`<div class="notice notice-info" style="margin-bottom:16px">${icon('info')}<div>This workspace is stored only in this browser. People listed here have no accounts and cannot sign in; they are names you can assign tasks and handoffs to.</div></div>` : ''}
        <div class="panel" style="margin-bottom:24px"><div class="table-wrap"><table class="list">
          <thead><tr><th scope="col">Name</th><th scope="col">Officer title</th><th scope="col">Permission</th><th scope="col" class="opt">Term</th>${manage ? html`<th scope="col"><span class="sr-only">Actions</span></th>` : ''}</tr></thead>
          <tbody>${current.map((m) => html`<tr>
            <td><div class="person" style="padding:0">${ui.avatar(m, true)}<div>${m.name}${m.id === c.me.id ? html` <span class="muted small">(you)</span>` : ''}${m.email ? html`<small>${m.email}</small>` : ''}</div></div></td>
            <td>${m.title || '—'}</td>
            <td>${m.status === 'contact' ? ui.badge('No account', 'b-gray') : ui.permBadge(m.permission)}</td>
            <td class="opt small">${fmtTerm(m)}</td>
            ${manage ? html`<td style="white-space:nowrap"><button class="btn btn-sm" data-action="editMember" data-id="${m.id}" aria-label="Edit ${m.name}">Edit</button>
              ${m.id !== c.me.id ? html`<button class="btn btn-sm btn-ghost" style="color:var(--red)" data-action="removeMember" data-id="${m.id}" aria-label="End membership for ${m.name}">${m.status === 'contact' ? 'Remove' : 'End membership'}</button>` : ''}</td>` : ''}
          </tr>`)}</tbody></table></div></div>
        ${c.mode !== 'local' && manage ? html`<section class="panel" style="margin-bottom:24px"><div class="panel-head"><h2>Pending invitations</h2></div><div class="panel-body tight">
          ${invites.length ? html`<ul class="rows">${invites.map((i) => html`<li class="row"><div class="row-main"><span class="row-title">${i.name}</span><div class="row-meta"><span>${i.email}</span><span>${i.title}</span><span>${MN.PERMISSIONS[i.permission].label}</span><span>Created ${MN.relTime(i.createdAt)}</span></div></div>
            ${c.mode === 'demo' ? html`<button class="btn btn-sm" data-action="simAccept" data-id="${i.id}">Simulate acceptance</button>` : ''}
            <button class="btn btn-sm btn-ghost" style="color:var(--red)" data-action="revokeInvite" data-id="${i.id}">Revoke</button></li>`)}</ul>` : html`<p class="empty-inline">No pending invitations.</p>`}
          ${c.mode === 'demo' ? html`<p class="hint" style="padding-bottom:12px">Demo: invitations are not delivered. "Simulate acceptance" stands in for the invitee signing in and accepting.</p>` : ''}
        </div></section>` : ''}
        <section class="panel" style="margin-bottom:24px"><div class="panel-head"><h2>Permission roles</h2></div><div class="panel-body tight"><ul class="rows">
          ${Object.entries(MN.PERMISSIONS).map(([k, d]) => html`<li class="row">${ui.permBadge(k)}<div class="row-main"><strong>${d.label}</strong><div class="row-meta"><span>${d.desc}</span></div></div></li>`)}
          <li class="row"><div class="row-main"><div class="row-meta"><span>Submitting or acknowledging a handoff never changes permissions. Only an administrator can change them, and the last administrator cannot be removed or demoted.</span></div></div></li>
        </ul></div></section>
        ${former.length ? html`<section class="panel"><div class="panel-head"><h2>Former members</h2></div><div class="panel-body tight"><ul class="rows">${former.map((m) => html`<li class="row">${ui.avatar(m, true)}<div class="row-main"><span class="row-title">${m.name}</span><div class="row-meta"><span>${m.title}</span><span>${fmtTerm(m)}</span><span>No access</span></div></div></li>`)}</ul></div></section>` : ''}`;
    }
  };

  function memberFields(v, opts) {
    return html`
      ${opts.nameEmail ? html`<div class="grid-2"><div class="field"><label for="mb-name">Name <span class="req" aria-hidden="true">*</span></label><input class="input" id="mb-name" name="name" maxlength="80" value="${v.name || ''}" autofocus><p class="field-error" data-err-for="name" hidden></p></div>
        ${opts.email ? html`<div class="field"><label for="mb-email">Email <span class="req" aria-hidden="true">*</span></label><input class="input" type="email" id="mb-email" name="email" maxlength="120" value="${v.email || ''}"><p class="field-error" data-err-for="email" hidden></p></div>` : ''}</div>` : ''}
      <div class="grid-2">
        <div class="field"><label for="mb-title">Officer title</label><input class="input" id="mb-title" name="title" maxlength="60" value="${v.title || ''}"></div>
        ${opts.permission ? html`<div class="field"><label for="mb-perm">Permission</label><select class="select" id="mb-perm" name="permission">${Object.entries(MN.PERMISSIONS).map(([k, d]) => html`<option value="${k}" ${v.permission === k ? 'selected' : ''}>${d.label}</option>`)}</select></div>` : ''}
        <div class="field"><label for="mb-ts">Term start</label><input class="input" type="date" id="mb-ts" name="termStart" value="${v.termStart || ''}"></div>
        <div class="field"><label for="mb-te">Term end</label><input class="input" type="date" id="mb-te" name="termEnd" value="${v.termEnd || ''}"><p class="field-error" data-err-for="termEnd" hidden></p></div>
      </div><p class="field-error" data-dlg-error hidden></p>`;
  }
  function termErr(d) { return d.termStart && d.termEnd && d.termEnd < d.termStart ? { termEnd: 'Term end must be after the start.' } : {}; }

  MN.actions.editMember = (el) => {
    const m = S().get('members', el.dataset.id);
    const c = MN.ctx();
    MN.openDialog({
      title: `Edit ${m.name}`,
      body: html`${m.id === c.me.id ? html`<p class="hint" style="margin-bottom:12px">This is your own membership. You cannot remove the organization's last administrator.</p>` : ''}${memberFields(m, { permission: m.status === 'active', nameEmail: m.status === 'contact' })}`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Save', value: 'save', kind: 'btn-primary', submit: true }],
      onAction(v, form) {
        const d = MN.formData(form);
        if (!MN.showErrors(form, termErr(d))) return false;
        const patch = { title: d.title.trim(), termStart: d.termStart, termEnd: d.termEnd };
        if (d.permission) patch.permission = d.permission;
        if (d.name !== undefined) { if (!d.name.trim()) { MN.showErrors(form, { name: 'Enter a name.' }); return false; } patch.name = d.name.trim(); }
        return MN.Svc.updateMember(m.id, patch).then(() => MN.toast('Membership updated.'));
      }
    });
  };
  MN.actions.removeMember = (el) => {
    const m = S().get('members', el.dataset.id);
    MN.confirm({ title: m.status === 'contact' ? `Remove ${m.name}?` : `End ${m.name}'s membership?`, danger: true, confirmLabel: m.status === 'contact' ? 'Remove' : 'End membership',
      body: html`<p>${m.name} will ${m.status === 'contact' ? 'no longer be available to assign' : 'lose access to this organization'}. Their past meetings, tasks, and handoffs stay in the records with their name.</p>` })
      .then((ok) => ok && MN.Svc.removeMember(m.id).then(() => MN.toast('Membership ended.'), (e) => MN.toast(e.message)));
  };
  MN.actions.addPerson = () => {
    MN.openDialog({
      title: 'Add person', body: html`<p class="hint" style="margin-bottom:12px">This adds a name to this browser-only workspace. It does not create an account or send anything.</p>${memberFields({ title: '' }, { nameEmail: true })}`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Add person', value: 'save', kind: 'btn-primary', submit: true }],
      onAction(v, form) {
        const d = MN.formData(form);
        if (!MN.showErrors(form, Object.assign(d.name.trim() ? {} : { name: 'Enter a name.' }, termErr(d)))) return false;
        return MN.Svc.addContact({ name: d.name.trim(), title: d.title.trim(), permission: 'officer', termStart: d.termStart, termEnd: d.termEnd }).then(() => MN.toast(`${d.name.trim()} added.`));
      }
    });
  };
  MN.actions.invite = () => {
    const c = MN.ctx();
    MN.openDialog({
      title: 'Invite an officer',
      body: html`<p class="hint" style="margin-bottom:12px">${c.mode === 'demo' ? 'Demo: this creates a pending invitation record only. Nothing is sent.' : 'MavNext creates an invitation link for you to share. It does not send email. The person must sign in with this exact email address to accept.'}</p>${memberFields({ permission: 'officer' }, { nameEmail: true, email: true, permission: true })}`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: c.mode === 'demo' ? 'Create invitation' : 'Create invitation link', value: 'save', kind: 'btn-primary', submit: true }],
      onAction(v, form) {
        const d = MN.formData(form);
        const errs = Object.assign({}, termErr(d));
        if (!d.name.trim()) errs.name = 'Enter a name.';
        if (!/.+@.+\..+/.test(d.email)) errs.email = 'Enter a valid email.';
        if (!MN.showErrors(form, errs)) return false;
        const input = { name: d.name.trim(), email: d.email.trim().toLowerCase(), title: d.title.trim(), permission: d.permission, termStart: d.termStart, termEnd: d.termEnd };
        if (c.mode === 'demo') return MN.Svc.createDemoInvitation(input).then(() => MN.toast('Invitation created (demo — nothing was sent).'));
        return MN.Remote.createInvitation(input).then((link) => {
          setTimeout(() => MN.openDialog({ title: 'Invitation link created', body: html`<p>Share this link with ${input.name}. No email was sent.</p><div class="field" style="margin-top:12px"><label for="inv-link">Invitation link</label><input class="input" id="inv-link" readonly value="${link}"></div>`, actions: [{ label: 'Done', value: 'cancel', kind: 'btn-primary' }] }), 0);
        });
      }
    });
  };
  MN.actions.simAccept = (el) => MN.Svc.simulateAcceptInvitation(el.dataset.id).then(() => MN.toast('Simulated: the invitation was accepted.'));
  MN.actions.revokeInvite = (el) => {
    const i = S().get('invitations', el.dataset.id);
    MN.confirm({ title: 'Revoke invitation?', danger: true, confirmLabel: 'Revoke', body: html`<p>The invitation for ${i.name} (${i.email}) will stop working. Nothing else changes.</p>` })
      .then((ok) => ok && (MN.Store.mode === 'remote' ? MN.Remote.revokeInvitation(i.id) : MN.Svc.revokeInvitation(i.id)).then(() => MN.toast('Invitation revoked.')));
  };

  // ---------- Archive ----------
  MN.views.archive = {
    title: 'Archive',
    crumbs: () => [{ label: 'Archive' }],
    render(p, c) {
      if (!MN.can(c.me, 'archive.view')) return ui.empty('alert', 'No access', 'Only organization members can view the archive.');
      const items = S().list('handoffs', c.org.id).filter((h) => MN.can(c.me, 'handoff.view', h) && MN.handoffStatus(h).versions.length);
      const byTerm = {};
      items.forEach((h) => { const k = h.outgoingTerm || 'Term not recorded'; (byTerm[k] = byTerm[k] || []).push(h); });
      const terms = Object.keys(byTerm).sort().reverse();
      return html`
        ${ui.pageHead('Archive', 'Submitted handoffs by term and role. Every submitted version stays readable and unchanged.')}
        ${terms.length ? terms.map((t) => html`<section class="panel" style="margin-bottom:24px" aria-labelledby="ar-${t.replace(/\W/g, '')}"><div class="panel-head"><h2 id="ar-${t.replace(/\W/g, '')}">${t}</h2><span class="small muted">${MN.plural(byTerm[t].length, 'handoff')}</span></div>
          <div class="panel-body tight"><ul class="rows">${byTerm[t].sort((a, b) => a.role.localeCompare(b.role)).map((h) => { const st = MN.handoffStatus(h); return html`<li class="row">
            <div class="row-main"><a class="row-title" href="#/handoffs/${h.id}/view">${h.role}</a><div class="row-meta"><span>${ui.memberName(h.outgoingMemberId)} → ${ui.memberName(h.incomingMemberId)}</span>${h.incomingTerm ? html`<span>for ${h.incomingTerm}</span>` : ''}<span>${MN.plural(st.versions.length, 'version')}: ${st.versions.map((v, i) => html`${i ? ', ' : ''}<a href="#/handoffs/${h.id}/view?v=${v.version}">v${v.version} (${MN.fmtDate(v.submittedAt.slice(0, 10), { weekday: undefined })})</a>`)}</span></div></div>
            ${ui.statusBadge(st.key)}</li>`; })}</ul></div></section>`)
          : html`<div class="panel">${ui.empty('archive', 'Nothing archived yet', 'Handoffs appear here once they are submitted. Records are visible only to members of this organization.')}</div>`}`;
    }
  };

  // ---------- Settings ----------
  MN.views.settings = {
    title: 'Settings',
    crumbs: () => [{ label: 'Settings' }],
    render(p, c) {
      const admin = MN.can(c.me, 'org.settings');
      const o = c.org;
      const legacy = MN.readLegacyDraft();
      const privacy = c.mode === 'demo'
        ? 'Demo records are fictional and stored only in this browser (key mavnext.demo.v1). They are not sent anywhere and are kept separate from any real workspace or earlier draft.'
        : c.mode === 'local'
          ? 'This workspace is stored only in this browser (key mavnext.local.v1). MavNext does not send these records anywhere. Clearing browser data or switching browsers loses them, so export a copy.'
          : 'Shared workspace records are sent to and stored by the database service this deployment is configured with, and are visible to members of the organization according to their permissions.';
      return html`
        ${ui.pageHead('Settings', `${o.name}`)}
        <div class="stack" style="max-width:860px">
          <section class="panel"><div class="panel-head"><h2>Organization</h2></div>
            ${admin ? html`<form data-form="orgSettings" novalidate><div class="panel-body">
              <div class="field"><label for="st-name">Organization name</label><input class="input" id="st-name" name="name" maxlength="120" value="${o.name}"><p class="field-error" data-err-for="name" hidden></p></div>
              <div class="grid-3">
                <div class="field"><label for="st-ct">Current term</label><input class="input" id="st-ct" name="ctLabel" maxlength="40" value="${(o.currentTerm || {}).label || ''}" placeholder="e.g., Fall 2026"></div>
                <div class="field"><label for="st-cs">Starts</label><input class="input" type="date" id="st-cs" name="ctStart" value="${(o.currentTerm || {}).start || ''}"></div>
                <div class="field"><label for="st-ce">Ends</label><input class="input" type="date" id="st-ce" name="ctEnd" value="${(o.currentTerm || {}).end || ''}"></div>
                <div class="field"><label for="st-nt">Next term</label><input class="input" id="st-nt" name="ntLabel" maxlength="40" value="${(o.nextTerm || {}).label || ''}"></div>
                <div class="field"><label for="st-ns">Starts</label><input class="input" type="date" id="st-ns" name="ntStart" value="${(o.nextTerm || {}).start || ''}"></div>
                <div class="field"><label for="st-ne">Ends</label><input class="input" type="date" id="st-ne" name="ntEnd" value="${(o.nextTerm || {}).end || ''}"></div>
              </div></div><div class="editor-actions"><span></span><button class="btn btn-primary" type="submit">Save organization</button></div></form>`
              : html`<div class="panel-body"><dl class="meta-list"><dt>Name</dt><dd>${o.name}</dd><dt>Current term</dt><dd>${(o.currentTerm || {}).label || '—'}</dd><dt>Next term</dt><dd>${(o.nextTerm || {}).label || '—'}</dd></dl><p class="hint" style="margin-top:12px">Only administrators can change organization settings.</p></div>`}
          </section>

          <section class="panel"><div class="panel-head"><h2>Privacy and storage</h2></div><div class="panel-body">
            <p>${privacy}</p>
            <p style="margin-top:12px">Do not enter passwords, PINs, recovery codes, private financial records, or account numbers anywhere in MavNext. Access sections describe transfer procedures only.</p>
            <div class="btn-row" style="margin-top:16px"><button class="btn" data-action="exportWorkspace">${icon('download')}Export ${c.mode === 'demo' ? 'demo ' : ''}records (JSON)</button></div>
          </div></section>

          ${c.mode === 'demo' ? html`<section class="panel"><div class="panel-head"><h2>Demo workspace</h2></div><div class="panel-body">
            <p>Resetting restores the fictional sample organization and removes every change made in the demo on this browser.</p>
            <div class="btn-row" style="margin-top:16px"><button class="btn btn-danger-outline" data-action="resetDemo">${icon('reset')}Reset demo workspace</button></div></div></section>` : ''}

          ${c.mode === 'local' ? html`<section class="panel"><div class="panel-head"><h2>This browser's workspace</h2></div><div class="panel-body">
            ${legacy && legacy.data ? html`<p style="margin-bottom:12px">An earlier-version draft is still saved in this browser, unchanged. You can import another copy of it as a new handoff draft.</p><div class="btn-row" style="margin-bottom:24px"><button class="btn" data-action="reimportLegacy">Import earlier draft again</button><button class="btn btn-ghost" data-action="downloadLegacy">${icon('download')}Download earlier draft (JSON)</button></div>` : ''}
            <p>Deleting removes this browser-only workspace: its organization, people, meetings, tasks, handoffs, and versions. Export first if you need a copy.</p>
            <div class="btn-row" style="margin-top:16px"><button class="btn btn-danger-outline" data-action="deleteLocal">${icon('trash')}Delete this browser's workspace</button></div></div></section>` : ''}

          <section class="panel"><div class="panel-head"><h2>About</h2></div><div class="panel-body small muted">
            MavNext is an independent student-developed pilot for student organization officer transitions. It is not an official University of Texas at Arlington service and is not endorsed by the university. Records are not published.
          </div></section>
        </div>`;
    }
  };
  MN.forms.orgSettings = (form) => {
    const d = MN.formData(form);
    if (!MN.showErrors(form, d.name.trim() ? {} : { name: 'Enter a name.' })) return;
    return MN.Svc.updateOrg({ name: d.name.trim(), currentTerm: { label: d.ctLabel.trim(), start: d.ctStart, end: d.ctEnd }, nextTerm: { label: d.ntLabel.trim(), start: d.ntStart, end: d.ntEnd } }).then(() => MN.toast('Organization saved.'));
  };
  MN.actions.exportWorkspace = () => {
    const c = MN.ctx();
    MN.download(`mavnext-${c.mode}-${MN.todayISO()}.json`, JSON.stringify(Object.assign({ exportedAt: MN.nowISO(), exportedFrom: c.mode }, MN.Store.ws), null, 2));
  };
  MN.actions.resetDemo = () => {
    MN.confirm({ title: 'Reset the demo workspace?', danger: true, confirmLabel: 'Reset demo',
      body: html`<p>This removes every change made in the demo on this browser and restores the fictional sample data.</p><p><strong>Not affected:</strong> your browser-only workspace, any signed-in organization records, and drafts from the earlier version of MavNext.</p>` })
      .then((ok) => {
        if (!ok) return;
        const adapter = new MN.LocalAdapter(MN.KEYS.demo);
        adapter.clear();
        const ws = MN.buildDemoWorkspace();
        adapter.write(ws);
        MN.Store.open('demo', adapter, ws);
        MN.Session.set({ mode: 'demo', actingUserId: 'u_maya', orgId: 'org_rrs' });
        MN.go('#/overview'); MN.toast('Demo workspace reset.');
      });
  };
  MN.actions.deleteLocal = () => {
    const ws = MN.Store.ws;
    MN.confirm({ title: 'Delete this browser\'s workspace?', danger: true, confirmLabel: 'Delete workspace',
      body: html`<p>This permanently removes <strong>${ws.orgs[0].name}</strong> from this browser: ${MN.plural(ws.members.length, 'person', 'people')}, ${MN.plural(ws.meetings.length, 'meeting')}, ${MN.plural(ws.tasks.length, 'task')}, ${MN.plural(ws.handoffs.length, 'handoff')}, and ${MN.plural(ws.handoffVersions.length, 'submitted version')}.</p><p><strong>Not affected:</strong> the demo, any earlier-version draft, and copies you printed or exported.</p>` })
      .then((ok) => { if (!ok) return; MN.Store.adapter.clear(); MN.leaveWorkspace(); MN.toast('Workspace deleted from this browser.'); });
  };
  MN.actions.reimportLegacy = () => {
    const legacy = MN.readLegacyDraft();
    const c = MN.ctx();
    const ws = MN.Store.ws;
    const h = MN.importLegacyInto(ws, legacy.data, c.me);
    MN.Store.persist({ op: 'bulk' }).then(() => { MN.go(`#/handoffs/${h.id}`); MN.toast('Imported a copy of the earlier draft.'); });
  };
  MN.actions.downloadLegacy = () => { const l = MN.readLegacyDraft(); MN.download('mavnext-earlier-draft.json', l.raw); };
})();
