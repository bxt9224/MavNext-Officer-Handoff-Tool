/* MavNext — data service.
   The UI never touches storage directly. It calls MN.Store (records) and
   MN.Svc (validated, permission-checked operations).

   Storage keys (each isolated; nothing here ever calls localStorage.clear()):
     mavnext.demo.v1      demo workspace (fictional data)
     mavnext.local.v1     browser-only workspace (no account)
     mavnext.session.v1   which mode/org/person is active in this browser
     uta_officer_handoff_data   v1 draft — READ ONLY, never modified or deleted */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});

  const KEYS = {
    demo: 'mavnext.demo.v1',
    local: 'mavnext.local.v1',
    session: 'mavnext.session.v1',
    legacy: 'uta_officer_handoff_data'
  };
  MN.KEYS = KEYS;
  const COLLECTIONS = ['orgs', 'members', 'meetings', 'tasks', 'handoffs', 'handoffVersions', 'handoffReviews', 'activity', 'invitations', 'joinRequests'];
  /** Insert-only collections: records are never updated or deleted once written. */
  const APPEND_ONLY = ['handoffVersions', 'handoffReviews', 'activity'];

  // ---------- Browser storage adapter (demo + local modes) ----------
  class LocalAdapter {
    constructor(key) { this.key = key; this.kind = 'local'; }
    load() {
      try { const raw = localStorage.getItem(this.key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }
    /** Writes the whole workspace. Returns a resolved/rejected promise to match the remote adapter. */
    write(ws) {
      try { localStorage.setItem(this.key, JSON.stringify(ws)); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    }
    clear() { localStorage.removeItem(this.key); }
  }
  MN.LocalAdapter = LocalAdapter;

  // ---------- Session (mode + active org + demo acting user) ----------
  MN.Session = {
    get() { try { return JSON.parse(localStorage.getItem(KEYS.session)) || null; } catch (e) { return null; } },
    set(s) { try { localStorage.setItem(KEYS.session, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } },
    patch(p) { this.set(Object.assign({}, this.get() || {}, p)); },
    end() { localStorage.removeItem(KEYS.session); }
  };

  // ---------- Record store ----------
  const listeners = new Set();
  const Store = {
    mode: null, ws: null, adapter: null,
    saveState: 'idle', saveError: null, lastSavedAt: null,

    open(mode, adapter, ws) {
      this.mode = mode; this.adapter = adapter; this.ws = ws;
      COLLECTIONS.forEach((c) => { if (!Array.isArray(ws[c])) ws[c] = []; });
      this.saveState = 'idle';
    },
    close() { this.mode = null; this.ws = null; this.adapter = null; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(kind) { listeners.forEach((fn) => fn(kind)); },

    list(coll, orgId) { const all = (this.ws && this.ws[coll]) || []; return orgId ? all.filter((r) => r.orgId === orgId) : all.slice(); },
    get(coll, id) { return ((this.ws && this.ws[coll]) || []).find((r) => r.id === id) || null; },

    put(coll, rec, opts) {
      if (APPEND_ONLY.includes(coll) && this.get(coll, rec.id)) throw new Error(`${coll} records cannot be modified`);
      const arr = this.ws[coll];
      const i = arr.findIndex((r) => r.id === rec.id);
      if (i >= 0) arr[i] = rec; else arr.push(rec);
      return this.persist({ op: 'put', coll, rec }, opts);
    },
    remove(coll, id, opts) {
      if (APPEND_ONLY.includes(coll)) throw new Error(`${coll} records cannot be deleted`);
      this.ws[coll] = this.ws[coll].filter((r) => r.id !== id);
      return this.persist({ op: 'remove', coll, id }, opts);
    },
    persist(change, opts) {
      this.saveState = 'saving';
      const p = this.adapter.kind === 'local' ? this.adapter.write(this.ws) : this.adapter.apply(change);
      return p.then(() => {
        this.saveState = 'saved'; this.saveError = null; this.lastSavedAt = MN.nowISO();
        if (!(opts && opts.silent)) this.emit('change'); else this.emit('saved');
      }, (err) => {
        this.saveState = 'error'; this.saveError = err;
        this.emit('error');
        MN.toast && MN.toast('Could not save. Your last change may not be stored — check storage space or your connection.');
        throw err;
      });
    }
  };
  MN.Store = Store;
  MN.APPEND_ONLY = APPEND_ONLY;

  // ---------- Legacy (v1) draft migration ----------
  /** Reads the v1 draft without modifying it. Returns null if absent or empty. */
  MN.readLegacyDraft = function () {
    let raw;
    try { raw = localStorage.getItem(KEYS.legacy); } catch (e) { return null; }
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      const answers = d && d.answers ? d.answers : {};
      const meaningful = (d.meta && d.meta.orgName) || Object.values(answers).some((a) => a && ((a.text || '').trim() || (a.status && a.status !== 'standard')));
      return meaningful ? { data: d, raw } : null;
    } catch (e) { return { data: null, raw, corrupt: true }; }
  };

  const LEGACY_STATUS = { standard: 'answered', unknown: 'unknown', na: 'na', unresolved: 'followup' };

  /** Converts a v1 draft into a handoff record (plus people records) inside a workspace. */
  MN.importLegacyInto = function (ws, legacy, ownerMember) {
    const meta = legacy.meta || {};
    const orgId = ownerMember.orgId;
    const answers = MN.blankAnswers();
    Object.keys(legacy.answers || {}).forEach((qid) => {
      const a = legacy.answers[qid] || {};
      answers[qid] = { text: String(a.text || ''), status: LEGACY_STATUS[a.status] || 'answered' };
    });
    let incomingId = null;
    if ((meta.incomingOfficer || '').trim()) {
      incomingId = MN.uid('m');
      ws.members.push({ id: incomingId, orgId, userId: null, name: meta.incomingOfficer.trim(), email: '', title: 'Incoming officer', permission: 'incoming', termStart: '', termEnd: '', status: 'contact', joinedAt: MN.nowISO() });
    }
    const role = meta.officerRole === 'Other' ? (meta.officerRoleOther || 'Officer') : (meta.officerRole || 'Officer');
    const now = MN.nowISO();
    const h = {
      id: MN.uid('h'), orgId, role, outgoingMemberId: ownerMember.id, incomingMemberId: incomingId,
      outgoingTerm: '', incomingTerm: '', answers, includes: { taskIds: [], meetingIds: [] },
      importedFrom: { key: KEYS.legacy, at: now, lastReviewedDate: meta.lastReviewedDate || '' },
      createdBy: ownerMember.id, createdAt: now, updatedAt: now, lastSavedAt: now
    };
    ws.handoffs.push(h);
    ws.activity.push({ id: MN.uid('a'), orgId, at: now, actorId: ownerMember.id, type: 'handoff.imported', text: `imported the ${role} handoff draft from the previous version`, ref: { kind: 'handoff', id: h.id } });
    return h;
  };

  /** New browser-only workspace. Optionally seeded from the v1 draft. */
  MN.buildLocalWorkspace = function (opts) {
    const now = MN.nowISO();
    const orgId = MN.uid('org');
    const meId = MN.uid('m');
    const legacy = opts && opts.legacy;
    const orgName = (opts && opts.orgName) || (legacy && legacy.meta && legacy.meta.orgName) || 'My organization';
    const myName = (opts && opts.myName) || (legacy && legacy.meta && legacy.meta.outgoingOfficer) || 'You';
    const ws = {
      schemaVersion: 1, mode: 'local', users: [{ id: 'u_local', name: myName, email: '' }],
      orgs: [{ id: orgId, name: orgName, currentTerm: { label: (opts && opts.termLabel) || '', start: '', end: '' }, nextTerm: { label: '', start: '', end: '' }, createdAt: now }],
      members: [{ id: meId, orgId, userId: 'u_local', name: myName, email: '', title: (legacy && legacy.meta && legacy.meta.officerRole) || 'Officer', permission: 'admin', termStart: '', termEnd: '', status: 'active', joinedAt: now }],
      meetings: [], tasks: [], handoffs: [], handoffVersions: [], handoffReviews: [], activity: [], invitations: []
    };
    if (legacy) MN.importLegacyInto(ws, legacy, ws.members[0]);
    return ws;
  };
})();
