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
        ${manage && c.mode !== 'local' ? joinRequestsPanel(c) : ''}
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

  function joinRequestsPanel(c) {
    const reqs = S().list('joinRequests', c.org.id).filter((r) => r.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return html`<section class="panel" style="margin-bottom:24px" aria-labelledby="jr-h"><div class="panel-head"><h2 id="jr-h">Join requests</h2>${reqs.length ? ui.badge(`${reqs.length} waiting`, 'b-amber') : ''}</div>
      <div class="panel-body tight">${reqs.length ? html`<ul class="rows">${reqs.map((r) => html`<li class="row" style="align-items:flex-start">
        ${ui.avatar({ id: r.userId || r.id, name: r.requesterName }, true)}
        <div class="row-main"><span class="row-title">${r.requesterName}</span>
          <div class="row-meta"><span>${r.requesterEmail}</span>${r.desiredTitle ? html`<span>Role: ${r.desiredTitle}</span>` : ''}<span>Requested ${MN.relTime(r.createdAt)}</span></div>
          ${r.message ? html`<p class="small prewrap" style="margin-top:6px">“${r.message}”</p>` : ''}</div>
        <div class="btn-row"><button class="btn btn-sm btn-primary" data-action="approveRequest" data-id="${r.id}">Approve</button><button class="btn btn-sm" data-action="declineRequest" data-id="${r.id}">Decline</button></div></li>`)}</ul>`
        : html`<p class="empty-inline">No pending requests. Officers can find ${c.org.listed === false ? 'this organization only through an invitation — it is hidden from the directory' : 'this organization in the directory and ask to join'}.</p>`}
        ${c.mode === 'demo' ? html`<p class="hint" style="padding-bottom:12px">Demo: requests are fictional. Approving one adds a simulated member.</p>` : ''}
      </div></section>`;
  }
  MN.actions.approveRequest = (el) => {
    const r = S().get('joinRequests', el.dataset.id);
    MN.openDialog({
      title: `Approve ${r.requesterName}`,
      body: html`<p class="small muted" style="margin-bottom:12px">${r.requesterName} (${r.requesterEmail}) will get access to this organization with the permission you choose. Check that you know this person and their role.</p>
        <div class="grid-2"><div class="field"><label for="ap-title">Officer title</label><input class="input" id="ap-title" name="title" maxlength="60" value="${r.desiredTitle}"></div>
        <div class="field"><label for="ap-perm">Permission</label><select class="select" id="ap-perm" name="permission">${Object.entries(MN.PERMISSIONS).map(([k, d]) => html`<option value="${k}" ${k === 'officer' ? 'selected' : ''}>${d.label}</option>`)}</select></div></div>
        <p class="hint">Give Administrator only to people who should manage members and settings.</p><p class="field-error" data-dlg-error hidden></p>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Approve', value: 'ok', kind: 'btn-primary', submit: true }],
      onAction: (v, form) => { const d = MN.formData(form); return MN.Svc.decideJoinRequest(r.id, true, d.permission, d.title.trim()).then(() => MN.toast(`${r.requesterName} approved.`), (e) => { throw new Error(MN.Remote ? MN.Remote.friendly(e) : e.message); }); }
    });
  };
  MN.actions.declineRequest = (el) => {
    const r = S().get('joinRequests', el.dataset.id);
    MN.confirm({ title: `Decline ${r.requesterName}'s request?`, confirmLabel: 'Decline', danger: true, body: html`<p>${r.requesterName} won't get access. They can send a new request later.</p>` })
      .then((ok) => ok && MN.Svc.decideJoinRequest(r.id, false).then(() => MN.toast('Request declined.')));
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
              </div>
              ${c.mode !== 'local' ? html`<label class="check"><input type="checkbox" name="listed" ${o.listed === false ? '' : 'checked'}> <span><strong>List in the organization directory.</strong> Signed-in officers can find this organization's <em>name</em> and request to join; an administrator must approve every request. Uncheck to allow invitations only.</span></label>` : ''}
              </div><div class="editor-actions"><span></span><button class="btn btn-primary" type="submit">Save organization</button></div></form>`
              : html`<div class="panel-body"><dl class="meta-list"><dt>Name</dt><dd>${o.name}</dd><dt>Current term</dt><dd>${(o.currentTerm || {}).label || '—'}</dd><dt>Next term</dt><dd>${(o.nextTerm || {}).label || '—'}</dd></dl><p class="hint" style="margin-top:12px">Only administrators can change organization settings.</p></div>`}
          </section>

          ${c.mode === 'remote' ? accountPanel(c) : ''}
          ${securityCenter(c)}
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
  function accountPanel(c) {
    const p = MN.Remote.profile() || {};
    const isLastAdmin = c.me.permission === 'admin' && MN.wouldRemoveLastAdmin(c.org.id, c.me.id, null);
    return html`<section class="panel" aria-labelledby="acct-h"><div class="panel-head"><h2 id="acct-h">Your account &amp; security</h2></div>
      <form data-form="profileEdit" novalidate><div class="panel-body">
        <p class="small muted" style="margin-bottom:16px">Signed in as <strong>${MN.Remote.userEmail()}</strong>. Graduation term and major are visible only to you.</p>
        <div class="grid-3">
          <div class="field"><label for="ac-name">Full name</label><input class="input" id="ac-name" name="fullName" maxlength="80" value="${p.full_name || ''}"><p class="field-error" data-err-for="fullName" hidden></p></div>
          <div class="field"><label for="ac-grad">Expected graduation</label><input class="input" id="ac-grad" name="gradTerm" maxlength="20" value="${p.grad_term || ''}"></div>
          <div class="field"><label for="ac-major">Major (optional)</label><input class="input" id="ac-major" name="major" maxlength="80" value="${p.major || ''}"></div>
        </div>
        <p class="small muted">Privacy notice ${p.consent_version || '—'} accepted ${p.consent_at ? MN.fmtDateTime(p.consent_at) : '—'}. <a href="#/privacy" target="_blank" rel="noopener">Read it</a>.</p>
      </div><div class="editor-actions"><span></span><button class="btn btn-primary" type="submit">Save profile</button></div></form>
      <div class="panel-body" style="border-top:1px solid var(--border)">
        <h3 style="margin-bottom:8px">Password and sessions</h3>
        <div class="btn-row">
          <button class="btn" data-action="changePassword">${icon('edit')}Change password</button>
          <button class="btn" data-action="signOutEverywhere">${icon('logout')}Sign out on all devices</button>
          <button class="btn btn-danger-outline" data-action="leaveOrg" ${isLastAdmin ? 'disabled title="You are the only administrator. Make someone else an administrator first."' : ''}>Leave ${c.org.name}</button>
        </div>
        ${isLastAdmin ? html`<p class="hint" style="margin-top:8px">You can't leave while you are the only administrator.</p>` : ''}
        <p class="hint" style="margin-top:8px">For safety, MavNext signs you out after 60 minutes without activity.</p>
      </div></section>`;
  }
  function securityCenter(c) {
    const items = [
      ['Individual accounts', 'Every officer signs in with their own email and password. No shared club passwords. Passwords are hashed by the sign-in provider and never visible to MavNext.'],
      ['Verified access', 'New accounts confirm their email. Invitations are single-use, expire after 7 days, and only work for the exact email they were made for.'],
      ['Approval before access', 'Finding an organization in the directory shows only its name. An administrator must approve every join request.'],
      ['Database-enforced permissions', 'Row-level security rules decide what each person can read or change — even if someone bypasses the app and calls the database directly.'],
      ['Tamper-proof handoffs', 'Submitted handoff versions can\'t be edited or deleted, even by administrators. Acknowledgments never change anyone\'s permissions.'],
      ['Admin safeguards', 'Members can\'t promote themselves, and the last administrator can\'t be removed, demoted, or leave.'],
      ['Secret detection', 'Handoff fields warn when text looks like a password, recovery code, or account number.'],
      ['Session protection', 'Automatic sign-out after 60 minutes idle; sign out on all devices anytime.'],
      ['Privacy by design', 'Minimal profile data, recorded consent, no ads or trackers, and private profile details.']
    ];
    return html`<section class="panel" aria-labelledby="sec-h"><div class="panel-head"><h2 id="sec-h">How MavNext protects your club</h2>${ui.badge(c.mode === 'remote' ? 'Active' : 'Shown for reference', c.mode === 'remote' ? 'b-green' : 'b-gray')}</div>
      <div class="panel-body tight"><ul class="rows">${items.map(([t, d]) => html`<li class="row" style="align-items:flex-start"><span class="sec-state done" aria-hidden="true">${icon('check')}</span><div class="row-main"><strong>${t}</strong><div class="row-meta"><span>${d}</span></div></div></li>`)}</ul>
      ${c.mode !== 'remote' ? html`<p class="hint" style="padding-bottom:12px">${c.mode === 'demo' ? 'In the demo, accounts and approvals are simulated in your browser; these protections apply to signed-in workspaces.' : 'This browser-only workspace has no accounts; these protections apply to signed-in workspaces.'}</p>` : ''}</div></section>`;
  }
  MN.forms.profileEdit = (form) => {
    const d = MN.formData(form);
    if (!MN.showErrors(form, (d.fullName || '').trim().length >= 2 ? {} : { fullName: 'Enter your full name.' })) return;
    return MN.Remote.saveProfile({ fullName: d.fullName.trim(), gradTerm: d.gradTerm.trim(), major: d.major.trim() }).then(() => MN.toast('Profile saved.'), (e) => MN.toast(MN.Remote.friendly(e)));
  };
  MN.actions.changePassword = () => {
    MN.openDialog({
      title: 'Change password',
      body: html`<div class="field"><label for="cp-current">Current password</label><input class="input" id="cp-current" type="password" name="current" autocomplete="current-password" autofocus><p class="field-error" data-err-for="current" hidden></p></div>
        <div class="field"><label for="cp-new">New password</label><input class="input" id="cp-new" type="password" name="password" autocomplete="new-password"><span class="hint">${MN.Password.ruleText()}</span><p class="field-error" data-err-for="password" hidden></p></div>
        <div class="field"><label for="cp-confirm">Confirm new password</label><input class="input" id="cp-confirm" type="password" name="confirm" autocomplete="new-password"><p class="field-error" data-err-for="confirm" hidden></p></div><p class="field-error" data-dlg-error hidden></p>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Update password', value: 'ok', kind: 'btn-primary', submit: true }],
      onAction(v, form) {
        const d = MN.formData(form);
        const errs = {};
        if (!d.current) errs.current = 'Enter your current password.';
        const pp = MN.Password.problem(d.password, { email: MN.Remote.userEmail() });
        if (pp) errs.password = pp;
        else if (d.password !== d.confirm) errs.confirm = 'Passwords don\'t match.';
        if (!MN.showErrors(form, errs)) return false;
        // The project requires the current password for changes made while signed in.
        return MN.Remote.updatePassword(d.password, d.current).then(() => MN.toast('Password updated.'));
      }
    });
  };
  MN.actions.signOutEverywhere = () => MN.confirm({ title: 'Sign out on all devices?', confirmLabel: 'Sign out everywhere', body: html`<p>You'll be signed out here and on every other browser or phone where you're signed in.</p>` })
    .then((ok) => ok && MN.Remote.signOut(true).then(() => { MN.Store.close(); MN.Session.end(); MN.go('#/signin'); MN.toast('Signed out on all devices.'); }, (e) => MN.toast(e.message)));
  MN.actions.leaveOrg = () => {
    const { org } = MN.ctx();
    MN.confirm({ title: `Leave ${org.name}?`, danger: true, confirmLabel: 'Leave organization', body: html`<p>You'll lose access to ${org.name}'s meetings, tasks, and handoffs. Records you created stay with the organization. To return, you'll need a new invitation or an approved request.</p>` })
      .then((ok) => ok && MN.Remote.leaveOrganization(org.id).then(() => MN.Remote.restore()).then(() => { MN.Session.patch({ orgId: null }); MN.go('#/overview'); MN.toast(`You left ${org.name}.`); }, (e) => MN.toast(MN.Remote.friendly(e))));
  };

  MN.forms.orgSettings = (form) => {
    const d = MN.formData(form);
    if (!MN.showErrors(form, d.name.trim() ? {} : { name: 'Enter a name.' })) return;
    return MN.Svc.updateOrg({ name: d.name.trim(), listed: 'listed' in d ? !!d.listed : undefined, currentTerm: { label: d.ctLabel.trim(), start: d.ctStart, end: d.ctEnd }, nextTerm: { label: d.ntLabel.trim(), start: d.ntStart, end: d.ntEnd } }).then(() => MN.toast('Organization saved.'));
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
