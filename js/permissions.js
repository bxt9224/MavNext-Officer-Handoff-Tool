/* MavNext — permission model (application roles, separate from officer titles).
   admin    — manages memberships, roles, term setup, organization settings
   officer  — manages meetings and tasks; edits handoffs they are the outgoing officer on
   incoming — reviews handoffs assigned to them; updates their own tasks
   This mirrors supabase/schema.sql. In the browser it only decides what to show;
   shared data must be protected by the database policies. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});

  MN.PERMISSIONS = {
    admin: { label: 'Organization administrator', short: 'Admin', badge: 'b-blue', desc: 'Manages members, roles, terms, and settings.' },
    officer: { label: 'Officer', short: 'Officer', badge: 'b-gray', desc: 'Manages meetings, tasks, and their own handoffs.' },
    incoming: { label: 'Incoming officer', short: 'Incoming', badge: 'b-purple', desc: 'Reviews handoffs assigned to them.' }
  };

  const active = (me) => !!me && me.status === 'active';
  const perm = (me) => (active(me) ? me.permission : null);

  MN.handoffStatus = function (h) {
    const versions = MN.Store.list('handoffVersions').filter((v) => v.handoffId === h.id).sort((a, b) => a.version - b.version);
    if (!versions.length) return { key: 'draft', versions, latest: null, review: null, editedSince: false };
    const latest = versions[versions.length - 1];
    const reviews = MN.Store.list('handoffReviews').filter((r) => r.handoffId === h.id && r.version === latest.version).sort((a, b) => a.at.localeCompare(b.at));
    const review = reviews[reviews.length - 1] || null;
    const key = review ? (review.type === 'acknowledged' ? 'acknowledged' : 'changes_requested') : 'submitted';
    const editedSince = (h.updatedAt || '') > latest.submittedAt;
    return { key, versions, latest, review, editedSince };
  };

  MN.STATUS_LABELS = {
    draft: { label: 'Draft', badge: 'b-gray' },
    submitted: { label: 'Submitted', badge: 'b-blue' },
    changes_requested: { label: 'Changes requested', badge: 'b-amber' },
    acknowledged: { label: 'Acknowledged', badge: 'b-green' }
  };

  MN.can = function (me, action, rec) {
    const p = perm(me);
    if (!p) return false;
    const admin = p === 'admin';
    const officer = p === 'officer';
    switch (action) {
      case 'meeting.create': return admin || officer;
      case 'meeting.edit': return admin || officer;
      case 'meeting.cancel': return admin || (officer && rec && rec.createdBy === me.id);
      case 'task.create': return admin || officer;
      case 'task.edit': return admin || (officer && rec && (rec.createdBy === me.id || rec.assigneeId === me.id));
      case 'task.status': return admin || officer || (rec && rec.assigneeId === me.id);
      case 'task.delete': return admin || (officer && rec && rec.createdBy === me.id);
      case 'task.viewAll': return admin || officer;
      case 'task.view': return admin || officer || (rec && rec.assigneeId === me.id);
      case 'handoff.create': return admin || officer;
      case 'handoff.view':
        if (!rec) return false;
        if (admin || rec.outgoingMemberId === me.id) return true;
        return rec.incomingMemberId === me.id && MN.handoffStatus(rec).versions.length > 0;
      case 'handoff.edit': return !!rec && (admin || rec.outgoingMemberId === me.id) && p !== 'incoming';
      case 'handoff.delete': return !!rec && (admin || rec.outgoingMemberId === me.id) && MN.handoffStatus(rec).versions.length === 0;
      case 'handoff.review': return !!rec && rec.incomingMemberId === me.id && MN.handoffStatus(rec).key === 'submitted';
      case 'archive.view': return admin || officer || p === 'incoming';
      case 'members.manage': return admin;
      case 'org.settings': return admin;
      default: return false;
    }
  };

  /** Membership changes that would leave the org without an administrator are refused. */
  MN.wouldRemoveLastAdmin = function (orgId, memberId, nextPermission) {
    const admins = MN.Store.list('members', orgId).filter((m) => m.status === 'active' && m.permission === 'admin');
    const target = admins.find((m) => m.id === memberId);
    if (!target) return false;
    if (nextPermission === 'admin') return false;
    return admins.length <= 1;
  };
})();
