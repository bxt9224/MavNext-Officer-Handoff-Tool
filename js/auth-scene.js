/* MavNext — the desk lamp used on the arrival and sign-in screens.

   Layers (one fixed lamp; nothing about the base or arms moves between states):
     assets/lamp/lamp_off.webp  matte-white lamp, bulb off (cut from the supplied design)
     assets/lamp/lamp_lit.webp  only the lit shade interior and bulb, aligned to the off lamp
     .au-beam / .lp-bloom       CSS light: a feathered beam from the shade opening across the card (behind its text)
     .lp-cord / .lp-ring        live HTML cord and ring, so they can be pulled

   States on the scene root (data-state): arrival → transitioning → signin.
   Interaction (drag, not scroll): drag the ring down; ~72 px max travel with soft resistance;
   release past 40 px to activate; shorter pulls and cancelled gestures spring back. Click, tap,
   Enter and Space on the ring also activate. Once signed-in state is shown, pulling only tugs. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html } = MN;

  const MAX = 72;
  const THRESHOLD = 40;
  // Geometry in lamp image pixels (726 × 835).
  const IMG = { w: 726, h: 835 };
  const CORD = { x: 252.5, top: 332 };
  const RING = { cy: 542.4, d: 57 };
  const OPENING = { x: 134, y: 253 };
  const pct = (n, of) => `${((n / of) * 100).toFixed(3)}%`;

  /** Lamp markup. `lit`: render already on. `hint`: show "Pull to enter your workspace". */
  function lamp({ lit, hint }) {
    const vars = [
      `--cord-x:${pct(CORD.x, IMG.w)}`, `--cord-top:${pct(CORD.top, IMG.h)}`,
      `--ring-cy:${pct(RING.cy, IMG.h)}`, `--ring-d:${(RING.d / IMG.h).toFixed(5)}`,
      `--open-x:${pct(OPENING.x, IMG.w)}`, `--open-y:${pct(OPENING.y, IMG.h)}`,
      // beam box is 3× the lamp, offset 2 lamp-widths left and 1 lamp-height up
      `--beam-x:${(((2 * IMG.w + OPENING.x) / (3 * IMG.w)) * 100).toFixed(3)}%`,
      `--beam-y:${(((IMG.h + OPENING.y) / (3 * IMG.h)) * 100).toFixed(3)}%`
    ].join(';');
    return html`
      <div class="lp" style="${vars}">
        <img class="lp-img" src="assets/lamp/lamp_off.webp" alt="" width="726" height="835" decoding="async">
        <img class="lp-img lp-lit" src="assets/lamp/lamp_lit.webp" alt="" width="726" height="835" decoding="async">
        <div class="lp-bloom" aria-hidden="true"></div>
        <div class="lp-cord" aria-hidden="true"></div>
        <button type="button" class="lp-ring" ${lit ? MN.raw('tabindex="-1" aria-hidden="true"') : MN.raw('aria-label="Turn on the lamp and open sign in" aria-describedby="lp-hint"')}><span class="lp-ring-shape"></span></button>
        ${hint ? html`<p class="lp-hint" id="lp-hint"><span>Pull to enter your workspace</span><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></p>` : ''}
      </div>`;
  }

  const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /** Wires the cord inside `scene`. opts.onActivate() is called on a successful pull/click/key. */
  function mount(scene, opts) {
    const lp = scene && scene.querySelector('.lp');
    const ring = lp && lp.querySelector('.lp-ring');
    if (!lp || !ring) throw new Error('Lamp markup missing');
    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    let drag = null;
    let ignoreClickUntil = 0;
    const setPull = (px) => lp.style.setProperty('--pull', `${Math.round(px * 10) / 10}px`);

    function springHome(fromPx) {
      lp.classList.remove('is-dragging');
      if (reduceMotion()) { setPull(0); return; }
      lp.classList.add('is-springing');
      setPull(fromPx);
      requestAnimationFrame(() => requestAnimationFrame(() => setPull(0)));
      later(() => lp.classList.remove('is-springing'), 480);
    }
    function tug() {
      if (reduceMotion()) return;
      lp.classList.add('is-springing');
      setPull(18);
      later(() => setPull(0), 140);
      later(() => lp.classList.remove('is-springing'), 600);
    }
    function activate(fromPx) {
      if (fromPx) springHome(fromPx); else tug();
      if (opts && opts.onActivate) opts.onActivate();
    }

    function onDown(e) {
      if (e.button > 0 || drag) return;
      drag = { id: e.pointerId, y: e.clientY, pull: 0, moved: false };
      try { ring.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      lp.classList.remove('is-springing');
      lp.classList.add('is-dragging');
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 4) drag.moved = true;
      drag.pull = MAX * (1 - Math.exp(-Math.max(0, dy) / (MAX * 0.9)));
      setPull(drag.pull);
      if (drag.moved) e.preventDefault();
    }
    function finish(e, commit) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag; drag = null;
      try { ring.releasePointerCapture(d.id); } catch (err) { /* ignore */ }
      ignoreClickUntil = performance.now() + 600;  // the click that follows a pointerup is already handled
      if (commit && (!d.moved || d.pull >= THRESHOLD)) activate(d.moved ? d.pull : 0);
      else springHome(d.pull);
    }
    const onUp = (e) => finish(e, true);
    const onCancel = (e) => finish(e, false);
    const onClick = (e) => { if (performance.now() < ignoreClickUntil) { e.preventDefault(); return; } activate(0); };

    ring.addEventListener('pointerdown', onDown);
    ring.addEventListener('pointermove', onMove);
    ring.addEventListener('pointerup', onUp);
    ring.addEventListener('pointercancel', onCancel);
    ring.addEventListener('lostpointercapture', onCancel);
    ring.addEventListener('click', onClick);
    return {
      retire() { ring.setAttribute('tabindex', '-1'); ring.setAttribute('aria-hidden', 'true'); ring.removeAttribute('aria-label'); ring.removeAttribute('aria-describedby'); },
      destroy() {
        timers.forEach(clearTimeout);
        ring.removeEventListener('pointerdown', onDown);
        ring.removeEventListener('pointermove', onMove);
        ring.removeEventListener('pointerup', onUp);
        ring.removeEventListener('pointercancel', onCancel);
        ring.removeEventListener('lostpointercapture', onCancel);
        ring.removeEventListener('click', onClick);
      }
    };
  }

  MN.AuthScene = { lamp, mount, reduceMotion, MAX, THRESHOLD };
})();
