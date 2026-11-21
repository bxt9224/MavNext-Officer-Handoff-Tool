/* MavNext — shared helpers (escaping, safe HTML templates, dates, ids). */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});

  class Safe { constructor(s) { this.__html = s; } toString() { return this.__html; } }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  MN.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  function part(v) {
    if (v == null) return '';
    if (v === true || v === false) return String(v); // for aria-* attributes; use ternaries for conditional markup
    if (v instanceof Safe) return v.__html;
    if (Array.isArray(v)) return v.map(part).join('');
    return MN.esc(v);
  }
  /** Tagged template: interpolated values are escaped unless produced by html``/raw(). */
  MN.html = (strings, ...vals) => new Safe(strings.reduce((out, s, i) => out + s + (i < vals.length ? part(vals[i]) : ''), ''));
  MN.raw = (s) => new Safe(String(s));

  MN.uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
  MN.clone = (o) => JSON.parse(JSON.stringify(o));
  MN.nowISO = () => new Date().toISOString();

  const pad = (n) => String(n).padStart(2, '0');
  MN.todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  MN.addDays = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  };
  const asUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  MN.fmtDate = (iso, opts) => {
    if (!iso) return '';
    return asUTC(iso).toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, opts || {}));
  };
  MN.monthShort = (iso) => asUTC(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
  MN.dayNum = (iso) => asUTC(iso).getUTCDate();
  MN.fmtTime = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${pad(m)} ${ap}`;
  };
  MN.tzShort = (tz, iso) => {
    if (!tz) return '';
    try {
      const d = iso ? new Date(`${iso}T12:00:00Z`) : new Date();
      const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(d);
      return (p.find((x) => x.type === 'timeZoneName') || {}).value || tz;
    } catch (e) { return tz; }
  };
  MN.localTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'; } catch (e) { return 'America/Chicago'; } };
  MN.fmtDateTime = (isoTs) => {
    if (!isoTs) return '';
    return new Date(isoTs).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  MN.relTime = (isoTs) => {
    if (!isoTs) return '';
    const s = Math.round((Date.now() - new Date(isoTs).getTime()) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
    if (s < 86400 * 7) { const d = Math.round(s / 86400); return `${d} day${d === 1 ? '' : 's'} ago`; }
    return MN.fmtDateTime(isoTs);
  };
  MN.initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  MN.avatarClass = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 6 ? `alt${h % 6}` : ''; };
  MN.plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  MN.byDate = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

  /** Heuristic warning for text that may contain credentials or account numbers. */
  MN.looksSensitive = (text) => /\b(password|passwd|passcode|pin)\s*(is|:|=)|recovery\s+code|backup\s+code|\b\d{9,}\b/i.test(text || '');

  MN.download = (filename, text, type) => {
    const blob = new Blob([text], { type: type || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  };
})();
