/* MavNext — password rules, strength estimate, and strong-password suggestions.

   POLICY mirrors the project's Supabase settings (Authentication → Sign In / Providers → Email),
   checked 2026-11-22: minimum length 12; lowercase, uppercase, digits and symbols required.
   Supabase enforces these on the server; this file only gives earlier, friendlier feedback.
   If you change the Supabase settings, change POLICY to match.

   The strength label is an estimate (length, variety, common patterns). It never blocks a password
   that meets POLICY; Supabase decides. "Prevent use of leaked passwords" is a Supabase Pro feature
   and is not enabled on this project. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});

  const POLICY = { minLength: 12, lower: true, upper: true, digit: true, symbol: true };
  // Characters Supabase counts as symbols.
  const SUPABASE_SYMBOLS = '!@#$%^&*()_+-=[]{};\':"|<>?,./`~';
  const isSymbol = (ch) => SUPABASE_SYMBOLS.includes(ch);

  const COMMON = ['password', 'passw0rd', 'mavnext', 'maverick', 'mavericks', 'uta', 'arlington', 'qwerty', 'asdf', 'letmein', 'welcome',
    'admin', 'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'princess', 'sunshine', 'master', 'shadow', 'abc123', 'trustno1', 'changeme'];

  function checks(pw) {
    const s = pw || '';
    const out = [{ key: 'length', label: `${POLICY.minLength}+ characters`, ok: s.length >= POLICY.minLength }];
    if (POLICY.lower || POLICY.upper) out.push({ key: 'case', label: 'Upper & lowercase', ok: (!POLICY.lower || /[a-z]/.test(s)) && (!POLICY.upper || /[A-Z]/.test(s)) });
    if (POLICY.digit) out.push({ key: 'digit', label: 'A number', ok: /\d/.test(s) });
    if (POLICY.symbol) out.push({ key: 'symbol', label: 'A symbol', ok: [...s].some(isSymbol) });
    return out;
  }

  const ruleText = () => `Use at least ${POLICY.minLength} characters with uppercase and lowercase letters, a number, and a symbol.`;

  /** First problem that would make Supabase (or common sense) reject the password, or ''. */
  function problem(pw, ctx) {
    const s = pw || '';
    if (!s) return 'Enter a password.';
    if (s.length < POLICY.minLength) return `Use at least ${POLICY.minLength} characters.`;
    const missing = checks(s).filter((c) => !c.ok && c.key !== 'length').map((c) => ({ case: 'uppercase and lowercase letters', digit: 'a number', symbol: 'a symbol' }[c.key]));
    if (missing.length) return `Add ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`;
    const lower = s.toLowerCase();
    const local = ctx && ctx.email ? String(ctx.email).split('@')[0].toLowerCase() : '';
    if (local.length >= 3 && lower.includes(local)) return 'Don\'t include your email name in your password.';
    return '';
  }

  function hasSequence(s) {
    const l = s.toLowerCase();
    const seqs = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    for (let i = 0; i + 4 <= l.length; i += 1) {
      const part = l.slice(i, i + 4);
      if (seqs.some((q) => q.includes(part) || q.split('').reverse().join('').includes(part))) return true;
    }
    return false;
  }

  /** { score: 0–4, label, tone } — 0 empty, 1 weak, 2 fair, 3 strong, 4 very strong. */
  function strength(pw, ctx) {
    const s = pw || '';
    if (!s) return { score: 0, label: '', tone: '' };
    if (checks(s).some((c) => !c.ok)) return { score: 1, label: 'Weak', tone: 'weak' };
    let pool = 0;
    if (/[a-z]/.test(s)) pool += 26;
    if (/[A-Z]/.test(s)) pool += 26;
    if (/\d/.test(s)) pool += 10;
    if (/[^A-Za-z0-9]/.test(s)) pool += 32;
    const unique = new Set(s).size;
    let bits = Math.min(s.length, unique * 2) * Math.log2(pool || 1);
    const lower = s.toLowerCase();
    if (/(.)\1{2,}/.test(s)) bits -= 12;
    if (hasSequence(s)) bits -= 12;
    if (COMMON.some((w) => lower.includes(w))) bits -= 36;
    if (/(19|20)\d\d/.test(s)) bits -= 6;
    const local = ctx && ctx.email ? String(ctx.email).split('@')[0].toLowerCase() : '';
    const names = ctx && ctx.name ? String(ctx.name).toLowerCase().split(/\s+/).filter((n) => n.length >= 3) : [];
    if ((local.length >= 3 && lower.includes(local)) || names.some((n) => lower.includes(n))) return { score: 1, label: 'Weak', tone: 'weak', reason: 'personal' };
    if (bits < 45) return { score: 1, label: 'Weak', tone: 'weak' };
    if (bits < 60) return { score: 2, label: 'Fair', tone: 'fair' };
    if (bits < 85) return { score: 3, label: 'Strong', tone: 'strong' };
    return { score: 4, label: 'Very strong', tone: 'strong' };
  }

  /** A random password that meets POLICY. Avoids look-alike characters so it can be read aloud or retyped. */
  function generate(len) {
    const n = Math.max(len || 18, POLICY.minLength + 4);
    const sets = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%^&*-_=+?'];
    const all = sets.join('');
    const rand = (max) => {
      const buf = new Uint32Array(1);
      const limit = Math.floor(0xFFFFFFFF / max) * max;
      do { window.crypto.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % max;
    };
    const chars = sets.map((set) => set[rand(set.length)]);
    while (chars.length < n) chars.push(all[rand(all.length)]);
    for (let i = chars.length - 1; i > 0; i -= 1) { const j = rand(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
    return chars.join('');
  }

  MN.Password = { POLICY, checks, problem, strength, generate, ruleText, canGenerate: () => !!(window.crypto && window.crypto.getRandomValues) };
})();
