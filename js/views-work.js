/* MavNext — Overview, Meetings & Events, Tasks. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon, ui } = MN;
  const S = () => MN.Store;

  const activeMembers = (orgId) => S().list('members', orgId).filter((m) => m.status === 'active' || m.status === 'contact');
  const upcoming = (orgId) => S().list('meetings', orgId).filter((m) => m.status !== 'cancelled' && m.date >= MN.todayISO()).sort(MN.byDate);
  const past = (orgId) => S().list('meetings', orgId).filter((m) => m.date < MN.todayISO() || m.status === 'cancelled').sort(MN.byDate).reverse();
  const isOverdue = (t) => t.status !== 'done' && t.dueDate && t.dueDate < MN.todayISO();

  function meetingRow(m) {
    const isPast = m.date < MN.todayISO();
    return html`<li class="row">
      <div class="date-chip ${isPast || m.status === 'cancelled' ? 'past' : ''}" aria-hidden="true"><span class="m">${MN.monthShort(m.date)}</span><span class="d">${MN.dayNum(m.date)}</span></div>
      <div class="row-main">
        <a class="row-title" href="#/meetings/${m.id}">${m.title}</a>
        <div class="row-meta">
          <span>${icon('clock', 'icon-sm')}${MN.fmtDate(m.date)}${m.time ? ` · ${MN.fmtTime(m.time)} ${MN.tzShort(m.timezone, m.date)}` : ''}</span>
          ${m.location ? html`<span>${icon('pin', 'icon-sm')}${m.location}</span>` : ''}
        </div>
      </div>
      ${m.status === 'cancelled' ? ui.badge('Cancelled', 'b-red') : m.kind === 'event' ? ui.badge('Event', 'b-purple') : ''}
    </li>`;
  }

  function taskRow(t, c, opts) {
    const canStatus = MN.can(c.me, 'task.status', t);
    const meeting = t.meetingId ? S().get('meetings', t.meetingId) : null;
    const handoff = t.handoffId ? S().get('handoffs', t.handoffId) : null;
    const assignee = S().get('members', t.assigneeId);
    return html`<li class="row">
      <input type="checkbox" id="tk-${t.id}" ${t.status === 'done' ? 'checked' : ''} ${canStatus ? '' : 'disabled'} data-change="toggleTask" data-id="${t.id}" style="width:18px;height:18px;accent-color:var(--blue);flex:none">
      <div class="row-main">
        <label for="tk-${t.id}" class="row-title" style="${t.status === 'done' ? 'text-decoration:line-through;color:var(--muted)' : ''}">${t.title}</label>
        <div class="row-meta">
          ${opts && opts.showAssignee ? html`<span>${icon('user', 'icon-sm')}${assignee ? assignee.name : 'Unassigned'}</span>` : ''}
          ${t.dueDate ? html`<span style="${isOverdue(t) ? 'color:var(--red);font-weight:600' : ''}">${icon('calendar', 'icon-sm')}${isOverdue(t) ? 'Overdue · ' : 'Due '}${MN.fmtDate(t.dueDate, { weekday: undefined })}</span>` : ''}
          ${meeting ? html`<span>${icon('link', 'icon-sm')}<a href="#/meetings/${meeting.id}">${meeting.title}</a></span>` : ''}
          ${handoff && MN.can(c.me, 'handoff.view', handoff) ? html`<span>${icon('handoff', 'icon-sm')}<a href="#/handoffs/${handoff.id}">${handoff.role} handoff</a></span>` : ''}
        </div>
      </div>
      ${ui.taskBadge(t.status)}
      ${MN.can(c.me, 'task.edit', t) || canStatus ? html`<button type="button" class="icon-btn" data-action="editTask" data-id="${t.id}" aria-label="Edit task: ${t.title}">${icon('edit')}</button>` : ''}
    </li>`;
  }
  MN.taskRow = taskRow;

  MN.changes.toggleTask = (el) => {
    const t = S().get('tasks', el.dataset.id);
    MN.Svc.setTaskStatus(t.id, el.checked ? 'done' : 'todo').then(() => MN.toast(el.checked ? `Marked "${t.title}" done.` : `Reopened "${t.title}".`));
  };

  // ---------- Overview ----------
  MN.views.overview = {
    title: 'Overview',
    crumbs: (p, c) => [{ label: 'Overview' }],
    render(p, c) {
      const org = c.org;
      const meetingsAll = S().list('meetings', org.id);
      const up = upcoming(org.id);
      const myTasks = S().list('tasks', org.id).filter((t) => t.assigneeId === c.me.id && t.status !== 'done').sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9'));
      const openOrgTasks = S().list('tasks', org.id).filter((t) => t.status !== 'done' && MN.can(c.me, 'task.view', t));
      const handoffs = S().list('handoffs', org.id).filter((h) => MN.can(c.me, 'handoff.view', h));
      const mine = handoffs.filter((h) => h.outgoingMemberId === c.me.id && MN.handoffStatus(h).key !== 'acknowledged');
      const toReview = handoffs.filter((h) => h.incomingMemberId === c.me.id && MN.handoffStatus(h).key === 'submitted');
      const members = S().list('members', org.id).filter((m) => m.status === 'active');
      const activity = S().list('activity', org.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
      const isNew = !meetingsAll.length && !S().list('tasks', org.id).length && !S().list('handoffs', org.id).length;
      const term = org.currentTerm && org.currentTerm.label;

      const handoffCard = (h) => {
        const st = MN.handoffStatus(h);
        const pr = MN.handoffProgress(h.answers);
        const inc = S().get('members', h.incomingMemberId);
        return html`<div style="padding:4px 0 8px">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><strong>${h.role} handoff</strong>${ui.statusBadge(st.key)}</div>
          <p class="small muted" style="margin:4px 0 12px">${inc ? `To ${inc.name}` : 'Incoming officer not chosen'}${h.incomingTerm ? ` · ${h.incomingTerm}` : ''}</p>
          <div class="progress-label"><span>${pr.done} of ${pr.total} questions addressed</span><span>${pr.pct}%</span></div>
          <div class="progress" role="progressbar" aria-label="${h.role} handoff progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pr.pct}"><span style="width:${pr.pct}%"></span></div>
          <p class="small muted" style="margin:8px 0 12px">${pr.sectionsDone} of 6 sections complete · Saved ${MN.relTime(h.lastSavedAt)}</p>
          <a class="btn btn-primary btn-sm" href="#/handoffs/${h.id}">${st.key === 'draft' || st.key === 'changes_requested' ? 'Continue handoff' : 'Open handoff'}</a>
        </div>`;
      };

      return html`
        ${ui.pageHead(org.name, term ? `Current term: ${term}` : 'No current term set', MN.can(c.me, 'meeting.create') ? html`<a class="btn" href="#/meetings/new">${icon('plus')}New meeting</a><button class="btn btn-primary" data-action="newTask">${icon('plus')}New task</button>` : '')}
        <div class="stats">
          <div class="stat"><div class="label">Upcoming meetings</div><div class="value">${up.length}</div><div class="sub">${up[0] ? `Next: ${MN.fmtDate(up[0].date, { weekday: undefined, year: undefined })}` : 'None scheduled'}</div></div>
          <div class="stat"><div class="label">Your open tasks</div><div class="value">${myTasks.length}</div><div class="sub">${myTasks.filter(isOverdue).length} overdue</div></div>
          <div class="stat"><div class="label">${MN.can(c.me, 'task.viewAll') ? 'Open tasks (org)' : 'Open tasks visible to you'}</div><div class="value">${openOrgTasks.length}</div><div class="sub">Across ${MN.plural(new Set(openOrgTasks.map((t) => t.assigneeId)).size, 'person', 'people')}</div></div>
          <div class="stat"><div class="label">Active members</div><div class="value">${members.length}</div><div class="sub">${members.filter((m) => m.permission === 'incoming').length} incoming</div></div>
        </div>
        ${isNew ? html`<div class="panel" style="margin-bottom:24px"><div class="panel-head"><h2>Set up your workspace</h2></div><div class="panel-body"><div class="grid-3">
            ${ui.empty('calendar', 'Create your first meeting', 'Schedule a board meeting with an agenda and attendees.', MN.can(c.me, 'meeting.create') ? html`<a class="btn btn-primary btn-sm" href="#/meetings/new">Create meeting</a>` : '')}
            ${ui.empty('users', 'Invite your board members', c.mode === 'local' ? 'Add the people you work with so you can assign tasks.' : 'Give each officer their own access with the right permissions.', MN.can(c.me, 'members.manage') ? html`<a class="btn btn-sm" href="#/members">Go to members</a>` : '')}
            ${ui.empty('handoff', 'Start a handoff', 'Document your role for the next officer, one section at a time.', MN.can(c.me, 'handoff.create') ? html`<a class="btn btn-sm" href="#/handoffs/new">Start handoff</a>` : '')}
        </div></div></div>` : ''}
        <div class="dash-grid">
          <div class="stack">
            <section class="panel" aria-labelledby="ov-meet">
              <div class="panel-head"><h2 id="ov-meet">Upcoming meetings &amp; events</h2><a class="btn btn-ghost btn-sm" href="#/meetings">View all</a></div>
              <div class="panel-body tight">${up.length ? html`<ul class="rows">${up.slice(0, 4).map(meetingRow)}</ul>` : html`<p class="empty-inline">No upcoming meetings. ${MN.can(c.me, 'meeting.create') ? html`<a href="#/meetings/new">Create your first meeting</a>.` : ''}</p>`}</div>
            </section>
            <section class="panel" aria-labelledby="ov-tasks">
              <div class="panel-head"><h2 id="ov-tasks">Your tasks</h2><a class="btn btn-ghost btn-sm" href="#/tasks">View all</a></div>
              <div class="panel-body tight">${myTasks.length ? html`<ul class="rows">${myTasks.slice(0, 5).map((t) => taskRow(t, c))}</ul>` : html`<p class="empty-inline">Nothing assigned to you is open.</p>`}</div>
            </section>
          </div>
          <div class="stack">
            <section class="panel" aria-labelledby="ov-handoff">
              <div class="panel-head"><h2 id="ov-handoff">Handoff status</h2><a class="btn btn-ghost btn-sm" href="#/handoffs">All handoffs</a></div>
              <div class="panel-body">
                ${toReview.map((h) => html`<div class="notice notice-info" style="margin-bottom:12px">${icon('file')}<div><strong>${h.role} handoff is ready for your review.</strong><br><a href="#/handoffs/${h.id}/view">Review and acknowledge</a></div></div>`)}
                ${mine.length ? mine.map(handoffCard) : !toReview.length ? html`<p class="empty-inline" style="padding-top:0">You have no handoff in progress.</p>${MN.can(c.me, 'handoff.create') ? html`<a class="btn btn-sm" href="#/handoffs/new">Start a handoff</a>` : ''}` : ''}
              </div>
            </section>
            <section class="panel" aria-labelledby="ov-act">
              <div class="panel-head"><h2 id="ov-act">Recent activity</h2></div>
              <div class="panel-body tight">${activity.length ? html`<ul class="timeline">${activity.map((a) => html`<li><span class="dot" aria-hidden="true"></span><div><strong>${ui.memberName(a.actorId)}</strong> ${a.text}<time datetime="${a.at}">${MN.relTime(a.at)}</time></div></li>`)}</ul>` : html`<p class="empty-inline">No activity yet. Actions in this workspace will appear here.</p>`}</div>
            </section>
          </div>
        </div>`;
    }
  };

  // ---------- Meetings list ----------
  MN.views.meetings = {
    title: 'Meetings & Events',
    crumbs: () => [{ label: 'Meetings & Events' }],
    render(p, c) {
      const tab = p.q.tab === 'past' ? 'past' : 'upcoming';
      const up = upcoming(c.org.id); const pa = past(c.org.id);
      const list = tab === 'past' ? pa : up;
      return html`
        ${ui.pageHead('Meetings & Events', 'Plan meetings, record notes, and turn action items into tasks.', MN.can(c.me, 'meeting.create') ? html`<a class="btn btn-primary" href="#/meetings/new">${icon('plus')}New meeting or event</a>` : '')}
        <div class="panel">
          <div class="tabs" role="tablist" aria-label="Meeting lists">
            <a class="tab" role="tab" href="#/meetings" aria-selected="${tab === 'upcoming'}">Upcoming<span class="count">${up.length}</span></a>
            <a class="tab" role="tab" href="#/meetings?tab=past" aria-selected="${tab === 'past'}">Past &amp; cancelled<span class="count">${pa.length}</span></a>
          </div>
          <div class="panel-body tight" role="tabpanel">
            ${list.length ? html`<ul class="rows">${list.map(meetingRow)}</ul>`
              : tab === 'upcoming' ? ui.empty('calendar', 'Create your first meeting', 'Upcoming meetings and events for this organization will appear here.', MN.can(c.me, 'meeting.create') ? html`<a class="btn btn-primary" href="#/meetings/new">Create meeting</a>` : '')
              : html`<p class="empty-inline">No past meetings yet.</p>`}
          </div>
        </div>`;
    }
  };

  // ---------- Meeting form ----------
  const TZS = ['America/Chicago', 'America/New_York', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'];
  MN.views.meetingForm = {
    title: 'Meeting',
    crumbs: (p) => [{ label: 'Meetings & Events', href: '#/meetings' }, { label: p.id ? 'Edit' : 'New' }],
    render(p, c) {
      const m = p.id ? S().get('meetings', p.id) : null;
      if (p.id && !m) return ui.empty('alert', 'Meeting not found', 'It may have been removed.', html`<a class="btn" href="#/meetings">Back to meetings</a>`);
      if (!MN.can(c.me, m ? 'meeting.edit' : 'meeting.create', m)) return ui.empty('alert', 'You cannot edit meetings', 'Ask an officer or administrator.', html`<a class="btn" href="#/meetings">Back</a>`);
      const v = m || { title: '', kind: 'meeting', date: MN.addDays(MN.todayISO(), 7), time: '18:00', timezone: MN.localTZ(), location: '', agenda: [], notes: '', attendeeIds: [c.me.id] };
      const tzList = TZS.includes(v.timezone) ? TZS : [v.timezone].concat(TZS);
      const people = activeMembers(c.org.id);
      return html`
        ${ui.pageHead(m ? 'Edit meeting' : 'New meeting or event', '', '', { href: m ? `#/meetings/${m.id}` : '#/meetings', label: m ? m.title : 'Meetings & Events' })}
        <form class="panel" data-form="meeting" data-id="${m ? m.id : ''}" novalidate>
          <div class="panel-body">
            <div class="grid-2">
              <div class="field"><label for="mf-title">Title <span class="req" aria-hidden="true">*</span></label><input class="input" id="mf-title" name="title" maxlength="120" required value="${v.title}"><p class="field-error" data-err-for="title" hidden></p></div>
              <div class="field"><label for="mf-kind">Type</label><select class="select" id="mf-kind" name="kind"><option value="meeting" ${v.kind === 'meeting' ? 'selected' : ''}>Meeting</option><option value="event" ${v.kind === 'event' ? 'selected' : ''}>Event</option></select></div>
            </div>
            <div class="grid-3">
              <div class="field"><label for="mf-date">Date <span class="req" aria-hidden="true">*</span></label><input class="input" type="date" id="mf-date" name="date" required value="${v.date}"><p class="field-error" data-err-for="date" hidden></p></div>
              <div class="field"><label for="mf-time">Start time</label><input class="input" type="time" id="mf-time" name="time" value="${v.time}"></div>
              <div class="field"><label for="mf-tz">Time zone</label><select class="select" id="mf-tz" name="timezone">${tzList.map((z) => html`<option value="${z}" ${z === v.timezone ? 'selected' : ''}>${z.replace('_', ' ')} (${MN.tzShort(z, v.date)})</option>`)}</select></div>
            </div>
            <div class="field"><label for="mf-loc">Location</label><input class="input" id="mf-loc" name="location" maxlength="160" value="${v.location}" placeholder="Room, building, or video link"></div>
            ${m ? '' : html`<div class="field"><label for="mf-agenda">Agenda items</label><textarea class="textarea" id="mf-agenda" name="agenda" placeholder="One item per line"></textarea><span class="hint">One item per line. You can add more from the meeting page.</span></div>`}
            <div class="field"><label for="mf-notes">Planning notes</label><textarea class="textarea" id="mf-notes" name="notes" maxlength="${MN.CHAR_LIMIT * 2}">${v.notes}</textarea></div>
            <fieldset><legend>Attendees</legend>
              ${people.length ? html`<div class="grid-3">${people.map((pp) => html`<label class="check"><input type="checkbox" name="attendeeIds" data-group="1" value="${pp.id}" ${v.attendeeIds.includes(pp.id) ? 'checked' : ''}><span>${pp.name}<br><span class="muted small">${pp.title}</span></span></label>`)}</div>` : html`<p class="empty-inline">No members yet.</p>`}
            </fieldset>
          </div>
          <div class="editor-actions"><a class="btn" href="${m ? `#/meetings/${m.id}` : '#/meetings'}">Cancel</a><button type="submit" class="btn btn-primary">${m ? 'Save changes' : 'Create meeting'}</button></div>
        </form>`;
    }
  };
  MN.forms.meeting = (form) => {
    const d = MN.formData(form);
    const errs = {};
    if (!d.title.trim()) errs.title = 'Enter a title.';
    if (!d.date) errs.date = 'Choose a date.';
    if (!MN.showErrors(form, errs)) return;
    const input = { title: d.title, kind: d.kind, date: d.date, time: d.time, timezone: d.timezone, location: d.location.trim(), notes: d.notes, attendeeIds: d.attendeeIds || [] };
    if (form.dataset.id) input.id = form.dataset.id;
    else input.agenda = (d.agenda || '').split('\n').map((s) => s.trim()).filter(Boolean).map((text) => ({ id: MN.uid('ag'), text }));
    return MN.Svc.saveMeeting(input).then((rec) => { MN.go(`#/meetings/${rec.id}`); MN.toast(form.dataset.id ? 'Meeting updated.' : 'Meeting created.'); });
  };

  // ---------- Meeting detail ----------
  MN.views.meetingDetail = {
    title: 'Meeting',
    crumbs: (p) => { const m = S().get('meetings', p.id); return [{ label: 'Meetings & Events', href: '#/meetings' }, { label: m ? m.title : 'Not found' }]; },
    render(p, c) {
      const m = S().get('meetings', p.id);
      if (!m || m.orgId !== c.org.id) return ui.empty('alert', 'Meeting not found', 'It may belong to another organization or have been removed.', html`<a class="btn" href="#/meetings">Back to meetings</a>`);
      const tab = ['agenda', 'notes', 'actions'].includes(p.q.tab) ? p.q.tab : 'agenda';
      const canEdit = MN.can(c.me, 'meeting.edit', m) && m.status !== 'cancelled';
      const tasks = S().list('tasks', c.org.id).filter((t) => t.meetingId === m.id && MN.can(c.me, 'task.view', t));
      const status = m.status === 'cancelled' ? ui.badge('Cancelled', 'b-red') : m.date < MN.todayISO() ? ui.badge('Past', 'b-gray') : m.date === MN.todayISO() ? ui.badge('Today', 'b-blue') : ui.badge('Upcoming', 'b-blue');
      const tabLink = (k, label, n) => html`<a class="tab" role="tab" href="#/meetings/${m.id}?tab=${k}" aria-selected="${tab === k}">${label}${n != null ? html`<span class="count">${n}</span>` : ''}</a>`;
      return html`
        ${ui.pageHead(m.title, '', html`
          ${canEdit ? html`<a class="btn" href="#/meetings/${m.id}/edit">${icon('edit')}Edit</a>` : ''}
          ${MN.can(c.me, 'meeting.cancel', m) && m.status !== 'cancelled' ? html`<button class="btn btn-danger-outline" data-action="cancelMeeting" data-id="${m.id}">Cancel meeting</button>` : ''}`, { href: '#/meetings', label: 'Meetings & Events' })}
        <div class="detail-grid">
          <div class="panel">
            <div class="panel-body" style="padding-bottom:16px">
              <div class="btn-row" style="margin-bottom:8px">${status}${m.kind === 'event' ? ui.badge('Event', 'b-purple') : ''}</div>
              <div class="row-meta" style="font-size:14px">
                <span>${icon('calendar', 'icon-sm')}${MN.fmtDate(m.date)}</span>
                ${m.time ? html`<span>${icon('clock', 'icon-sm')}${MN.fmtTime(m.time)} ${MN.tzShort(m.timezone, m.date)}</span>` : ''}
                ${m.location ? html`<span>${icon('pin', 'icon-sm')}${m.location}</span>` : ''}
              </div>
            </div>
            <div class="tabs" role="tablist" aria-label="Meeting details">${tabLink('agenda', 'Agenda', m.agenda.length)}${tabLink('notes', 'Notes')}${tabLink('actions', 'Action items', tasks.length)}</div>
            <div class="panel-body" role="tabpanel">
              ${tab === 'agenda' ? html`
                ${m.agenda.length ? html`<ol class="agenda">${m.agenda.map((a) => html`<li><span class="txt">${a.text}</span>${canEdit ? html`<button class="icon-btn" data-action="removeAgenda" data-id="${m.id}" data-item="${a.id}" aria-label="Remove agenda item: ${a.text}">${icon('x', 'icon-sm')}</button>` : ''}</li>`)}</ol>` : html`<p class="empty-inline">No agenda items yet.</p>`}
                ${canEdit ? html`<form class="inline-form" data-form="agendaItem" data-id="${m.id}"><label for="ag-new" class="sr-only">New agenda item</label><input class="input" id="ag-new" name="text" maxlength="200" placeholder="Add an agenda item"><button class="btn" type="submit">${icon('plus')}Add</button></form>` : ''}` : ''}
              ${tab === 'notes' ? (canEdit ? html`
                <form data-form="meetingNotes" data-id="${m.id}"><div class="field"><label for="mn-notes">Meeting notes</label><textarea class="textarea" id="mn-notes" name="notes" rows="10" maxlength="${MN.CHAR_LIMIT * 2}">${m.notes}</textarea><span class="hint">Notes can be included in a handoff when you choose to.</span></div><button class="btn btn-primary" type="submit">Save notes</button></form>`
                : (m.notes ? html`<div class="prewrap">${m.notes}</div>` : html`<p class="empty-inline">No notes recorded.</p>`)) : ''}
              ${tab === 'actions' ? html`
                ${tasks.length ? html`<ul class="rows">${tasks.map((t) => taskRow(t, c, { showAssignee: true }))}</ul>` : html`<p class="empty-inline">No action items yet.</p>`}
                ${MN.can(c.me, 'task.create') && m.status !== 'cancelled' ? html`<button class="btn" style="margin-top:12px" data-action="newTask" data-meeting="${m.id}">${icon('plus')}Add action item</button><p class="hint" style="margin-top:8px">Action items are tasks. They also appear on the Tasks page — one record, not a copy.</p>` : ''}` : ''}
            </div>
          </div>
          <aside class="panel" aria-labelledby="att-h">
            <div class="panel-head"><h2 id="att-h">Attendees (${m.attendeeIds.length})</h2></div>
            <div class="panel-body tight">${m.attendeeIds.length ? m.attendeeIds.map((id) => S().get('members', id)).filter(Boolean).map((pp) => html`<div class="person">${ui.avatar(pp, true)}<div>${pp.name}<small>${pp.title}</small></div></div>`) : html`<p class="empty-inline">No attendees selected.</p>`}</div>
          </aside>
        </div>`;
    }
  };
  MN.forms.agendaItem = (form) => {
    const text = form.elements.text.value.trim();
    if (!text) { form.elements.text.focus(); return; }
    return MN.Svc.addAgendaItem(form.dataset.id, text).then(() => { const i = document.getElementById('ag-new'); if (i) i.focus(); });
  };
  MN.actions.removeAgenda = (el) => MN.Svc.removeAgendaItem(el.dataset.id, el.dataset.item);
  MN.forms.meetingNotes = (form) => MN.Svc.saveMeetingNotes(form.dataset.id, form.elements.notes.value).then(() => MN.toast('Notes saved.'));
  MN.actions.cancelMeeting = (el) => {
    const m = S().get('meetings', el.dataset.id);
    const n = S().list('tasks', m.orgId).filter((t) => t.meetingId === m.id).length;
    MN.confirm({ title: 'Cancel this meeting?', danger: true, confirmLabel: 'Cancel meeting',
      body: html`<p><strong>${m.title}</strong> on ${MN.fmtDate(m.date)} will be marked cancelled and moved to Past &amp; cancelled.</p><p>Its agenda, notes, and ${MN.plural(n, 'linked task')} are kept. Nothing else is removed.</p>` })
      .then((ok) => ok && MN.Svc.cancelMeeting(m.id).then(() => MN.toast('Meeting cancelled.')));
  };

  // ---------- Tasks ----------
  MN.views.tasks = {
    title: 'Tasks',
    crumbs: () => [{ label: 'Tasks' }],
    render(p, c) {
      const canAll = MN.can(c.me, 'task.viewAll');
      const scope = p.q.scope === 'all' && canAll ? 'all' : 'mine';
      const state = ['open', 'done'].includes(p.q.state) ? p.q.state : 'open';
      let list = S().list('tasks', c.org.id).filter((t) => MN.can(c.me, 'task.view', t));
      if (scope === 'mine') list = list.filter((t) => t.assigneeId === c.me.id);
      list = list.filter((t) => (state === 'done' ? t.status === 'done' : t.status !== 'done'));
      list.sort((a, b) => (state === 'done' ? (b.completedAt || '').localeCompare(a.completedAt || '') : (a.dueDate || '9').localeCompare(b.dueDate || '9')));
      const q = (s, st) => `#/tasks?scope=${s}&state=${st}`;
      return html`
        ${ui.pageHead('Tasks', 'Assign work, track status, and link tasks to meetings or handoffs.', MN.can(c.me, 'task.create') ? html`<button class="btn btn-primary" data-action="newTask">${icon('plus')}New task</button>` : '')}
        <div class="filters" role="group" aria-label="Task filters">
          <a class="chip" href="${q('mine', state)}" aria-pressed="${scope === 'mine'}">My tasks</a>
          ${canAll ? html`<a class="chip" href="${q('all', state)}" aria-pressed="${scope === 'all'}">All organization tasks</a>` : ''}
          <span aria-hidden="true" style="width:8px"></span>
          <a class="chip" href="${q(scope, 'open')}" aria-pressed="${state === 'open'}">Open</a>
          <a class="chip" href="${q(scope, 'done')}" aria-pressed="${state === 'done'}">Completed</a>
        </div>
        <div class="panel"><div class="panel-body tight">
          ${list.length ? html`<ul class="rows">${list.map((t) => taskRow(t, c, { showAssignee: scope === 'all' }))}</ul>`
            : ui.empty('tasks', state === 'done' ? 'No completed tasks' : 'No open tasks', scope === 'mine' ? 'Tasks assigned to you will appear here.' : 'Tasks in this organization will appear here.', MN.can(c.me, 'task.create') && state === 'open' ? html`<button class="btn btn-primary" data-action="newTask">Create a task</button>` : '')}
        </div></div>`;
    }
  };

  function taskDialog(t, preset) {
    const c = MN.ctx();
    const people = activeMembers(c.org.id);
    const meetings = S().list('meetings', c.org.id).filter((m) => m.status !== 'cancelled' || (t && t.meetingId === m.id)).sort(MN.byDate).reverse();
    const handoffs = S().list('handoffs', c.org.id).filter((h) => MN.can(c.me, 'handoff.view', h));
    const v = t || Object.assign({ title: '', description: '', assigneeId: c.me.id, dueDate: '', status: 'todo', meetingId: '', handoffId: '' }, preset || {});
    const fullEdit = !t || MN.can(c.me, 'task.edit', t);
    const dis = fullEdit ? '' : 'disabled';
    MN.openDialog({
      title: t ? 'Edit task' : (v.meetingId ? 'New action item' : 'New task'),
      body: html`
        ${!fullEdit ? html`<p class="hint" style="margin-bottom:12px">You can update the status of this task. Other details can be changed by its creator or an administrator.</p>` : ''}
        <div class="field"><label for="td-title">Title <span class="req" aria-hidden="true">*</span></label><input class="input" id="td-title" name="title" maxlength="160" value="${v.title}" ${dis} autofocus><p class="field-error" data-err-for="title" hidden></p></div>
        <div class="field"><label for="td-desc">Description <span class="muted">(optional)</span></label><textarea class="textarea" id="td-desc" name="description" maxlength="1000" ${dis}>${v.description}</textarea></div>
        <div class="grid-2">
          <div class="field"><label for="td-who">Assignee <span class="req" aria-hidden="true">*</span></label><select class="select" id="td-who" name="assigneeId" ${dis}>${ui.memberOptions(people, v.assigneeId, 'Choose a person')}</select><p class="field-error" data-err-for="assigneeId" hidden></p></div>
          <div class="field"><label for="td-due">Due date</label><input class="input" type="date" id="td-due" name="dueDate" value="${v.dueDate || ''}" ${dis}></div>
        </div>
        <div class="field"><label for="td-status">Status</label><select class="select" id="td-status" name="status">${[['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Done']].map(([k, l]) => html`<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`)}</select></div>
        <div class="grid-2">
          <div class="field"><label for="td-meet">Related meeting</label><select class="select" id="td-meet" name="meetingId" ${dis}><option value="">None</option>${meetings.map((m) => html`<option value="${m.id}" ${m.id === v.meetingId ? 'selected' : ''}>${m.title} (${MN.fmtDate(m.date, { weekday: undefined })})</option>`)}</select></div>
          <div class="field"><label for="td-hand">Related handoff</label><select class="select" id="td-hand" name="handoffId" ${dis}><option value="">None</option>${handoffs.map((h) => html`<option value="${h.id}" ${h.id === v.handoffId ? 'selected' : ''}>${h.role} handoff</option>`)}</select></div>
        </div>
        <p class="field-error" data-dlg-error hidden></p>`,
      actions: [
        ...(t && MN.can(c.me, 'task.delete', t) ? [{ label: 'Delete task', value: 'delete', kind: 'btn-danger-outline' }] : []),
        { label: 'Cancel', value: 'cancel' }, { label: t ? 'Save task' : 'Create task', value: 'save', kind: 'btn-primary', submit: true }],
      onAction(val, form, close) {
        if (val === 'delete') {
          close();
          MN.confirm({ title: 'Delete this task?', danger: true, confirmLabel: 'Delete task', body: html`<p>"${t.title}" will be permanently removed from Tasks${t.meetingId ? ' and from its meeting\'s action items' : ''}. Nothing else is affected.</p>` })
            .then((ok) => ok && MN.Svc.deleteTask(t.id).then(() => MN.toast('Task deleted.')));
          return;
        }
        const d = MN.formData(form);
        if (!fullEdit) return MN.Svc.setTaskStatus(t.id, d.status).then(() => MN.toast('Task updated.'));
        const errs = {};
        if (!d.title.trim()) errs.title = 'Enter a title.';
        if (!d.assigneeId) errs.assigneeId = 'Choose who this is assigned to.';
        if (!MN.showErrors(form, errs)) return false;
        const input = Object.assign({}, t ? { id: t.id } : {}, { title: d.title, description: d.description.trim(), assigneeId: d.assigneeId, dueDate: d.dueDate, status: d.status, meetingId: d.meetingId || null, handoffId: d.handoffId || null });
        return MN.Svc.saveTask(input).then(() => MN.toast(t ? 'Task saved.' : 'Task created.'));
      }
    });
  }
  MN.actions.newTask = (el) => taskDialog(null, { meetingId: el.dataset.meeting || '', handoffId: el.dataset.handoff || '' });
  MN.actions.editTask = (el) => taskDialog(S().get('tasks', el.dataset.id));
})();
