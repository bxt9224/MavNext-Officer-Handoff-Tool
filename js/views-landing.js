/* MavNext — public landing page (route #/).
   Content is complete and readable without JavaScript animation; js/landing-motion.js adds
   GSAP + ScrollTrigger + Lenis motion when available and motion is allowed.
   Photos live in assets/photos/ (see assets/photos/README.md for sources and permissions).
   Signed-in officers skip this page and go to their workspace. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  const { html, icon } = MN;

  // Swap photos by replacing these files; dimensions are reserved in CSS to avoid layout shift.
  const PHOTOS = {
    hero: { src: 'assets/photos/hero.jpg', alt: 'Students working side by side at a long table, sorting cards and supplies during a volunteer event' },
    activity: { src: 'assets/photos/activity.jpg', pos: '50% 12%', alt: 'Three students laughing as they walk down a campus street during a homecoming festival' },
    conversation: { src: 'assets/photos/conversation.jpg', alt: 'One student points to a page in a binder of club records while another takes notes' },
    notes: { src: 'assets/photos/notes.jpg', pos: '72% 50%', alt: 'Three students around a laptop, one explaining while the others listen and take notes' }
  };
  const photo = (key, cls, eager) => html`<div class="lx-photo ${cls || ''}"><img src="${PHOTOS[key].src}" alt="${PHOTOS[key].alt}" ${PHOTOS[key].pos ? MN.raw('style="object-position:' + PHOTOS[key].pos + '"') : ''} ${eager ? MN.raw('fetchpriority="high"') : MN.raw('loading="lazy"')} decoding="async" onerror="this.parentNode.classList.add('is-missing')"><span class="lx-photo-missing" aria-hidden="true">Photo pending</span></div>`;

  const ORGANIZES = [
    ['Meetings and decisions', 'Agendas, notes, attendees, and the action items that come out of them.'],
    ['Recurring responsibilities', 'Weekly routines, campus contacts, and the registration and booking deadlines that come back every term.'],
    ['Access procedures', 'How accounts and shared files change hands — the steps, never the passwords.'],
    ['Unfinished work', 'Open orders, pending approvals, and the first things the next officer should do.']
  ];
  const MOMENTS = [
    ['Organize the term', 'Plan meetings, record decisions, and turn action items into tasks with owners and due dates.'],
    ['Prepare the handoff', 'The outgoing officer works through six guided sections, marks what is unknown or needs follow-up, and submits a dated version.'],
    ['Review and continue', 'The incoming officer opens that version, acknowledges receipt or asks for clarification, and picks up the open work.']
  ];
  const SECTIONS = [
    ['Responsibilities', '4/4', 'done'],
    ['Account access procedures', '4/4', 'done'],
    ['Recurring deadlines', '4/4', 'flag', 'Unknown'],
    ['Funding procedures', '4/4', 'done'],
    ['Lessons learned', '4/4', 'done'],
    ['Open commitments', '4/4', 'flag', 'Follow-up']
  ];

  function stage() {
    return html`
      <div class="lx-stage" data-stage>
        <div class="lx-stage-head"><span>Riverside Robotics Society · Fall 2026</span><span class="lx-sample">Sample data</span></div>
        <div class="lx-term" data-step="1">
          <div class="lx-term-col">
            <p class="lx-k">Next meeting</p>
            <p class="lx-v">Officer transition meeting</p>
            <p class="lx-m">${icon('calendar', 'icon-sm')}Wed, Dec 2 · 5:00 PM · Library, Room 3</p>
          </div>
          <div class="lx-term-col">
            <p class="lx-k">Action items</p>
            <ul class="lx-tasks">
              <li><span>Update campus org roster</span><em>Maya Lin · To do</em></li>
              <li><span>Confirm vendor delivery</span><em>Jordan Smith · In progress</em></li>
            </ul>
          </div>
        </div>
        <div class="lx-flow">
          <article class="lx-officer lx-out" data-step="2" aria-label="Outgoing officer's handoff">
            <header><span class="avatar" aria-hidden="true">ML</span><div><strong>Maya Lin</strong><small>Outgoing President · Fall 2026</small></div></header>
            <p class="lx-card-title">President handoff</p>
            <ol class="lx-secs">${SECTIONS.map(([t, n, s, flag]) => html`<li class="${s}"><span class="lx-dot" aria-hidden="true">${s === 'done' ? icon('check') : '!'}</span><span>${t}</span>${flag ? html`<em>${flag}</em>` : html`<b>${n}</b>`}</li>`)}</ol>
            <p class="lx-status">${icon('send', 'icon-sm')}Submitted · Version 1</p>
          </article>
          <div class="lx-link" data-step="2b" aria-hidden="true"><span class="lx-line"></span><span class="lx-link-label">Version 1 shared</span></div>
          <article class="lx-officer lx-in" data-step="3" aria-label="Incoming officer's review">
            <header><span class="avatar alt4" aria-hidden="true">DK</span><div><strong>David Kim</strong><small>Incoming President · Spring 2027</small></div></header>
            <p class="lx-card-title">Reviewing version 1</p>
            <ul class="lx-review">
              <li><span class="lx-dot flag" aria-hidden="true">!</span>1 item needs follow-up</li>
              <li><span class="lx-dot flag" aria-hidden="true">?</span>1 item marked unknown</li>
              <li><span class="lx-dot done" aria-hidden="true">${icon('check')}</span>2 related tasks included</li>
            </ul>
            <div class="lx-fake-actions" aria-hidden="true"><span>Acknowledge receipt</span><span>Request clarification</span></div>
          </article>
        </div>
      </div>
      <p class="lx-stage-note">Illustration with sample data. Acknowledging confirms receipt and review — it doesn't certify that every detail is correct or transfer any permissions.</p>`;
  }

  MN.views.entry = {
    title: 'Lead your term. Prepare the next.',
    render() {
      const legacy = MN.readLegacyDraft();
      const hasLocal = !!new MN.LocalAdapter(MN.KEYS.local).load();
      return html`
      <div class="lx" id="lx">
        <header class="lx-header">
          <div class="lx-wrap lx-header-in">
            <a href="#/" class="lx-logo" data-action="lxTop" aria-label="MavNext, back to top"><img src="assets/mavnext-logo-trimmed.png" alt="MavNext" width="175" height="30"></a>
            <nav class="lx-nav" aria-label="Main">
              <button type="button" class="lx-menu-btn" data-action="lxMenu" aria-expanded="false" aria-controls="lx-menu">${icon('menu')}<span>Menu</span></button>
              <ul id="lx-menu" class="lx-menu">
                <li><a href="#lx-product" data-action="lxGo" data-target="lx-product">Product</a></li>
                <li><a href="#lx-how" data-action="lxGo" data-target="lx-how">How it works</a></li>
                <li><a href="#/enter">Sign in</a></li>
                <li><button type="button" class="lx-btn lx-btn-primary lx-btn-sm" data-action="enterDemo">Explore demo</button></li>
              </ul>
            </nav>
          </div>
        </header>

        <main id="main-content" tabindex="-1">
          <section class="lx-hero" aria-labelledby="lx-h1">
            <div class="lx-hero-media" data-hero-media>${photo('hero', 'lx-hero-photo', true)}</div>
            <div class="lx-hero-scrim" aria-hidden="true"></div>
            <div class="lx-wrap lx-hero-in">
              <div class="lx-hero-copy">
                <p class="lx-eyebrow" data-hero-reveal>MavNext · A student-built pilot</p>
                <h1 id="lx-h1" tabindex="-1" data-page-title data-hero-reveal><span class="lx-l">Lead your term.</span> <span class="lx-l">Prepare the next.</span></h1>
                <p class="lx-lede" data-hero-reveal>Organize meetings, document responsibilities, and give your next board a clear place to start.</p>
                <div class="lx-actions" data-hero-reveal>
                  <button type="button" class="lx-btn lx-btn-light" data-action="enterDemo">Explore demo</button>
                  <a class="lx-btn lx-btn-ghost" href="#/enter">Sign in</a>
                </div>
              </div>
            </div>
          </section>

          <section class="lx-band" id="lx-band" aria-label="Student organizations at work">
            <div class="lx-band-frame"><div class="lx-band-inner" data-expand>${photo('activity', 'lx-band-photo')}</div></div>
            <p class="lx-wrap lx-band-caption" data-reveal>Every event, meeting, and decision leaves something the next board needs to know.</p>
          </section>

          <section class="lx-section lx-why" id="lx-product" aria-labelledby="lx-why-h">
            <div class="lx-wrap lx-why-grid">
              <div class="lx-why-media">
                <div class="lx-why-main" data-parallax="-24">${photo('conversation', 'lx-ratio-43')}</div>
                <div class="lx-why-inset" data-parallax="40">${photo('notes', 'lx-ratio-11')}</div>
              </div>
              <div class="lx-why-copy">
                <h2 id="lx-why-h" tabindex="-1" data-reveal>Good leadership should carry forward.</h2>
                <p class="lx-body" data-reveal>Meeting decisions, recurring responsibilities, and unfinished work can become difficult to find when officers change. MavNext gives each board one place to keep them — and a structured way to pass them on.</p>
                <dl class="lx-defs">${ORGANIZES.map(([t, d]) => html`<div data-reveal><dt>${t}</dt><dd>${d}</dd></div>`)}</dl>
              </div>
            </div>
          </section>

          <section class="lx-section lx-how" id="lx-how" aria-labelledby="lx-how-h">
            <div class="lx-wrap">
              <div class="lx-how-head">
                <h2 id="lx-how-h" tabindex="-1" data-reveal>From one board to the next.</h2>
                <p class="lx-body" data-reveal>Three moments, one continuous record.</p>
              </div>
              <div class="lx-how-grid">
                <ol class="lx-moments">${MOMENTS.map(([t, d], i) => html`<li data-moment="${i + 1}"><span class="lx-num" aria-hidden="true">0${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></li>`)}</ol>
                <div class="lx-stage-wrap">${stage()}</div>
              </div>
            </div>
          </section>

          <section class="lx-final" aria-labelledby="lx-final-h">
            <div class="lx-wrap lx-final-in">
              <h2 id="lx-final-h" data-reveal>Give the next board a stronger start.</h2>
              <div class="lx-actions lx-center" data-reveal>
                <button type="button" class="lx-btn lx-btn-light" data-action="enterDemo">Explore demo</button>
                <a class="lx-btn lx-btn-ghost" href="#/enter">Sign in</a>
              </div>
            </div>
          </section>
        </main>

        <footer class="lx-footer">
          <div class="lx-wrap lx-footer-in">
            <img src="assets/mavnext-logo-trimmed.png" alt="MavNext" width="140" height="24" loading="lazy">
            <div class="lx-footer-text">
              <p>An independent student-developed pilot for student organization leadership transitions.</p>
              <p class="lx-footer-fine">Not an official service of, or endorsed by, The University of Texas at Arlington. Event photos courtesy of The University of Texas at Arlington, used with permission.</p>
            </div>
            <nav aria-label="Footer"><ul class="lx-footer-links">
              <li><a href="#/privacy">Privacy notice</a></li>
              <li><a href="#/enter">Sign in</a></li>
              <li><a href="#/" data-action="enterDemo">Explore demo</a></li>
              ${hasLocal ? html`<li><a href="#/" data-action="enterLocal">Open this device's workspace</a></li>` : ''}
            </ul></nav>
          </div>
        </footer>
      </div>`;
    },
    mount(root) {
      if (MN.LandingMotion) {
        MN.LandingMotion.init(document.getElementById('lx'));
        MN.onLeave = () => MN.LandingMotion.destroy();
      }
    }
  };

  // ----- in-page navigation (works with or without Lenis; never changes the app route) -----
  function closeMenu() {
    const b = document.querySelector('.lx-menu-btn');
    if (b && b.getAttribute('aria-expanded') === 'true') { b.setAttribute('aria-expanded', 'false'); document.getElementById('lx-menu').classList.remove('open'); }
  }
  MN.actions.lxMenu = (el) => {
    const open = el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(open));
    document.getElementById('lx-menu').classList.toggle('open', open);
    if (open) { const f = document.querySelector('#lx-menu a, #lx-menu button'); if (f) f.focus(); }
  };
  MN.actions.lxGo = (el) => {
    closeMenu();
    const t = document.getElementById(el.dataset.target);
    if (!t) return;
    if (MN.LandingMotion) MN.LandingMotion.scrollTo(t); else t.scrollIntoView();
    const h = t.querySelector('h2, h1') || t;
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  };
  MN.actions.lxTop = () => { closeMenu(); if (MN.LandingMotion) MN.LandingMotion.scrollTo(0); else window.scrollTo(0, 0); };
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const b = document.querySelector('.lx-menu-btn[aria-expanded="true"]');
    if (b) { closeMenu(); b.focus(); }
  });
})();
