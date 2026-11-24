/* MavNext — operations. Every write goes through here: permission check,
   record update, activity entry. Views never mutate records directly. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const S = () => MN.Store;

  class PermissionError extends Error {}
  function need(ok, msg) { if (!ok) throw new PermissionError(msg || 'You do not have permission to do that.'); }

  function log(type, text, ref) {
    const { me, org } = MN.ctx();
    if (!me || !org) return Promise.resolve();
    return S().put('activity', { id: MN.uid('a'), orgId: org.id, at: MN.nowISO(), actorId: me.id, type, text, ref: ref || null });
  }

  const Svc = {
    PermissionError,

    // ----- Meetings -----
    saveMeeting(input) {
      const { me, org } = MN.ctx();
      const existing = input.id ? S().get('meetings', input.id) : null;
      need(MN.can(me, existing ? 'meeting.edit' : 'meeting.create', existing));
      const now = MN.nowISO();
      const rec = Object.assign({
        id: MN.uid('mt'), orgId: org.id, kind: 'meeting', status: 'scheduled', agenda: [], notes: '', attendeeIds: [],
        createdBy: me.id, createdAt: now
      }, existing || {}, input, { updatedAt: now });
      rec.title = rec.title.trim();
      return S().put('meetings', rec).then(() => log(existing ? 'meeting.updated' : 'meeting.created', `${existing ? 'updated' : 'scheduled'} "${rec.title}"`, { kind: 'meeting', id: rec.id })).then(() => rec);
    },
    addAgendaItem(meetingId, text) {
      const { me } = MN.ctx();
      const m = S().get('meetings', meetingId);
      need(MN.can(me, 'meeting.edit', m));
      const rec = Object.assign({}, m, { agenda: m.agenda.concat([{ id: MN.uid('ag'), text: text.trim() }]), updatedAt: MN.nowISO() });
      return S().put('meetings', rec).then(() => log('meeting.agenda', `added an agenda item to "${m.title}"`, { kind: 'meeting', id: m.id }));
    },
    removeAgendaItem(meetingId, itemId) {
      const { me } = MN.ctx();
      const m = S().get('meetings', meetingId);
      need(MN.can(me, 'meeting.edit', m));
      return S().put('meetings', Object.assign({}, m, { agenda: m.agenda.filter((a) => a.id !== itemId), updatedAt: MN.nowISO() }));
    },
    saveMeetingNotes(meetingId, notes) {
      const { me } = MN.ctx();
      const m = S().get('meetings', meetingId);
      need(MN.can(me, 'meeting.edit', m));
      return S().put('meetings', Object.assign({}, m, { notes, updatedAt: MN.nowISO() }));
    },
    cancelMeeting(meetingId) {
      const { me } = MN.ctx();
      const m = S().get('meetings', meetingId);
      need(MN.can(me, 'meeting.cancel', m), 'Only an administrator or the person who created this meeting can cancel it.');
      return S().put('meetings', Object.assign({}, m, { status: 'cancelled', updatedAt: MN.nowISO() })).then(() => log('meeting.cancelled', `cancelled "${m.title}"`, { kind: 'meeting', id: m.id }));
    },

    // ----- Tasks -----
    saveTask(input) {
      const { me, org } = MN.ctx();
      const existing = input.id ? S().get('tasks', input.id) : null;
      need(MN.can(me, existing ? 'task.edit' : 'task.create', existing));
      const now = MN.nowISO();
      const rec = Object.assign({ id: MN.uid('t'), orgId: org.id, description: '', status: 'todo', meetingId: null, handoffId: null, createdBy: me.id, createdAt: now }, existing || {}, input, { updatedAt: now });
      rec.title = rec.title.trim();
      if (rec.status === 'done' && !rec.completedAt) rec.completedAt = now;
      if (rec.status !== 'done') rec.completedAt = null;
      const who = S().get('members', rec.assigneeId);
      return S().put('tasks', rec).then(() => log(existing ? 'task.updated' : 'task.created', existing ? `updated "${rec.title}"` : `assigned "${rec.title}"${who ? ` to ${who.name}` : ''}`, { kind: 'task', id: rec.id })).then(() => rec);
    },
    setTaskStatus(taskId, status) {
      const { me } = MN.ctx();
      const t = S().get('tasks', taskId);
      need(MN.can(me, 'task.status', t));
      const now = MN.nowISO();
      const rec = Object.assign({}, t, { status, updatedAt: now, completedAt: status === 'done' ? (t.completedAt || now) : null });
      const verb = status === 'done' ? 'completed' : status === 'in_progress' ? 'started' : 'reopened';
      return S().put('tasks', rec).then(() => log(status === 'done' ? 'task.done' : 'task.status', `${verb} "${t.title}"`, { kind: 'task', id: t.id }));
    },
    deleteTask(taskId) {
      const { me } = MN.ctx();
      const t = S().get('tasks', taskId);
      need(MN.can(me, 'task.delete', t));
      return S().remove('tasks', taskId).then(() => log('task.deleted', `deleted task "${t.title}"`));
    },

    // ----- Handoffs -----
    createHandoff(input) {
      const { me, org } = MN.ctx();
      need(MN.can(me, 'handoff.create'));
      const now = MN.nowISO();
      const rec = Object.assign({ id: MN.uid('h'), orgId: org.id, answers: MN.blankAnswers(), includes: { taskIds: [], meetingIds: [] }, createdBy: me.id, createdAt: now, lastSavedAt: now }, input, { updatedAt: now });
      console.log("[MN DEBUG] createHandoff rec:", JSON.stringify({ id: rec.id, orgId: rec.orgId, createdBy: rec.createdBy, outgoingMemberId: rec.outgoingMemberId, incomingMemberId: rec.incomingMemberId, role: rec.role }));
      return S().put('handoffs', rec).then(() => log('handoff.created', `started the ${rec.role} handoff`, { kind: 'handoff', id: rec.id })).then(() => rec);
    },
    updateHandoffMeta(id, patch) {
      const { me } = MN.ctx();
      const h = S().get('handoffs', id);
      need(MN.can(me, 'handoff.edit', h));
      const now = MN.nowISO();
      return S().put('handoffs', Object.assign({}, h, patch, { updatedAt: now, lastSavedAt: now }), { silent: true });
    },
    /** Autosave of a single answer. Silent: does not re-render the editor. */
    saveAnswer(id, qid, answer) {
      const { me } = MN.ctx();
      const h = S().get('handoffs', id);
      need(MN.can(me, 'handoff.edit', h));
      const now = MN.nowISO();
      const answers = Object.assign({}, h.answers, { [qid]: { text: String(answer.text || '').slice(0, MN.CHAR_LIMIT), status: answer.status } });
      return S().put('handoffs', Object.assign({}, h, { answers, updatedAt: now, lastSavedAt: now }), { silent: true });
    },
    setIncludes(id, includes) {
      const { me } = MN.ctx();
      const h = S().get('handoffs', id);
      need(MN.can(me, 'handoff.edit', h));
      const now = MN.nowISO();
      return S().put('handoffs', Object.assign({}, h, { includes, updatedAt: now, lastSavedAt: now }), { silent: true });
    },
    /** Builds the immutable content captured at submission. */
    buildSnapshot(h) {
      const org = S().get('orgs', h.orgId);
      const name = (mid) => (S().get('members', mid) || {}).name || '';
      const tasks = (h.includes.taskIds || []).map((tid) => S().get('tasks', tid)).filter(Boolean)
        .map((t) => ({ id: t.id, title: t.title, description: t.description, assignee: name(t.assigneeId), dueDate: t.dueDate, status: t.status }));
      const meetings = (h.includes.meetingIds || []).map((mid) => S().get('meetings', mid)).filter(Boolean)
        .map((m) => ({ id: m.id, title: m.title, date: m.date, time: m.time, timezone: m.timezone, location: m.location, agenda: m.agenda.map((a) => a.text), notes: m.notes }));
      return {
        role: h.role, orgName: org ? org.name : '', outgoingName: name(h.outgoingMemberId), incomingName: name(h.incomingMemberId),
        outgoingTerm: h.outgoingTerm, incomingTerm: h.incomingTerm, answers: MN.clone(h.answers), included: { tasks, meetings }
      };
    },
    submitHandoff(id) {
      const { me } = MN.ctx();
      const h = S().get('handoffs', id);
      need(MN.can(me, 'handoff.edit', h));
      const analysis = MN.analyzeAnswers(h.answers);
      if (analysis.missingRequired.length) throw new Error('Answer or mark every required question before submitting.');
      if (!h.incomingMemberId) throw new Error('Choose the incoming officer before submitting.');
      const st = MN.handoffStatus(h);
      if (st.key === 'submitted' && !st.editedSince) throw new Error('This version is already submitted. Edit the handoff to create a new version.');
      const version = st.versions.length + 1;
      const now = MN.nowISO();
      const v = { id: MN.uid('hv'), orgId: h.orgId, handoffId: h.id, version, submittedAt: now, submittedBy: me.id, snapshot: Svc.buildSnapshot(h) };
      return S().put('handoffVersions', v)
        .then(() => S().put('handoffs', Object.assign({}, h, { lastSavedAt: now }), { silent: true }))
        .then(() => log('handoff.submitted', `submitted version ${version} of the ${h.role} handoff`, { kind: 'handoff', id: h.id }))
        .then(() => v);
    },
    reviewHandoff(id, type, message) {
      const { me } = MN.ctx();
      const h = S().get('handoffs', id);
      need(MN.can(me, 'handoff.review', h), 'Only the assigned incoming officer can review this handoff.');
      const st = MN.handoffStatus(h);
      const r = { id: MN.uid('hr'), orgId: h.orgId, handoffId: h.id, version: st.latest.version, type, by: me.id, at: MN.nowISO(), message: (message || '').trim() };
      return S().put('handoffReviews', r).then(() => log(type === 'acknowledged' ? 'handoff.acknowledged' : 'handoff.clarification',
        type === 'acknowledged' ? `acknowledged receipt of the ${h.role} handoff (v${r.version})` : `requested clarification on the ${h.role} handoff (v${r.version})`, { kind: 'handoff', id: h.id }));
    },
    deleteDraft(id) {
      const { me } = MN.ctx();
      const h = S().get('handoffs', id);
      need(MN.can(me, 'handoff.delete', h), 'Only unsubmitted drafts can be deleted.');
      // Tasks that pointed at this draft keep existing; only the link is cleared.
      const linked = S().list('tasks', h.orgId).filter((t) => t.handoffId === id);
      return linked.reduce((p, t) => p.then(() => S().put('tasks', Object.assign({}, t, { handoffId: null }), { silent: true })), Promise.resolve())
        .then(() => S().remove('handoffs', id))
        .then(() => log('handoff.deleted', `deleted the ${h.role} handoff draft`));
    },

    // ----- Members -----
    updateMember(memberId, patch) {
      const { me, org } = MN.ctx();
      need(MN.can(me, 'members.manage'));
      const target = S().get('members', memberId);
      if (patch.permission && MN.wouldRemoveLastAdmin(org.id, memberId, patch.permission)) throw new Error('This is the only administrator. Make someone else an administrator first.');
      return S().put('members', Object.assign({}, target, patch)).then(() => log('member.updated', `updated ${target.name}'s membership`, { kind: 'member', id: memberId }));
    },
    removeMember(memberId) {
      const { me, org } = MN.ctx();
      need(MN.can(me, 'members.manage'));
      const target = S().get('members', memberId);
      if (MN.wouldRemoveLastAdmin(org.id, memberId, null)) throw new Error('This is the only administrator and cannot be removed.');
      // Membership ends; records that reference the person stay readable.
      return S().put('members', Object.assign({}, target, { status: 'former' })).then(() => log('member.removed', `ended ${target.name}'s membership`, { kind: 'member', id: memberId }));
    },
    addContact(input) {
      const { me, org } = MN.ctx();
      need(MN.can(me, 'members.manage'));
      const rec = Object.assign({ id: MN.uid('m'), orgId: org.id, userId: null, email: '', status: 'contact', joinedAt: MN.nowISO() }, input);
      return S().put('members', rec).then(() => rec);
    },
    /** Demo only: creates a pending invitation record. No message is sent anywhere. */
    createDemoInvitation(input) {
      const { me, org } = MN.ctx();
      need(MN.can(me, 'members.manage'));
      const inv = Object.assign({ id: MN.uid('inv'), orgId: org.id, token: MN.uid('tok'), createdBy: me.id, createdAt: MN.nowISO(), acceptedAt: null }, input);
      return S().put('invitations', inv).then(() => log('member.invited', `created an invitation for ${input.name}`)).then(() => inv);
    },
    /** Demo only: simulates the invitee accepting after signing in. */
    simulateAcceptInvitation(invId) {
      const inv = S().get('invitations', invId);
      const now = MN.nowISO();
      const userId = MN.uid('u');
      MN.Store.ws.users.push({ id: userId, name: inv.name, email: inv.email });
      const mem = { id: MN.uid('m'), orgId: inv.orgId, userId, name: inv.name, email: inv.email, title: inv.title, permission: inv.permission, termStart: inv.termStart || '', termEnd: inv.termEnd || '', status: 'active', joinedAt: now };
      return S().put('members', mem, { silent: true })
        .then(() => S().put('invitations', Object.assign({}, inv, { acceptedAt: now, memberId: mem.id })))
        .then(() => log('member.joined', `${inv.name} accepted an invitation (simulated)`));
    },
    revokeInvitation(invId) {
      const { me } = MN.ctx();
      need(MN.can(me, 'members.manage'));
      return S().remove('invitations', invId);
    },

    // ----- Join requests -----
    decideJoinRequest(reqId, approve, perm, title) {
      const { me, mode } = MN.ctx();
      need(MN.can(me, 'members.manage'), 'Only an administrator can decide join requests.');
      if (mode === 'remote') return MN.Remote.decideRequest(reqId, approve, perm, title).then(() => MN.Remote.reload());
      const r = S().get('joinRequests', reqId);
      if (!r || r.status !== 'pending') return Promise.reject(new Error('This request was already decided.'));
      const now = MN.nowISO();
      let p = Promise.resolve();
      if (approve) {
        const userId = r.userId || MN.uid('u');
        if (!MN.Store.ws.users.some((u) => u.id === userId)) MN.Store.ws.users.push({ id: userId, name: r.requesterName, email: r.requesterEmail });
        const mem = { id: MN.uid('m'), orgId: r.orgId, userId, name: r.requesterName, email: r.requesterEmail, title: title || r.desiredTitle, permission: perm, termStart: '', termEnd: '', status: 'active', joinedAt: now };
        p = S().put('members', mem, { silent: true }).then(() => log('member.joined', `approved ${r.requesterName}'s request to join${mode === 'demo' ? ' (simulated)' : ''}`, { kind: 'member', id: mem.id }));
      }
      return p.then(() => S().put('joinRequests', Object.assign({}, r, { status: approve ? 'approved' : 'declined', decidedAt: now, decidedBy: me.id })));
    },

    // ----- Organization -----
    updateOrg(patch) {
      const { me, org } = MN.ctx();
      need(MN.can(me, 'org.settings'));
      const clean = {}; Object.keys(patch).forEach((k) => { if (patch[k] !== undefined) clean[k] = patch[k]; });
      return S().put('orgs', Object.assign({}, org, clean)).then(() => log('org.updated', 'updated organization settings'));
    }
  };
  MN.Svc = Svc;
})();
