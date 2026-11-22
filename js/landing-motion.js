/* MavNext — landing page motion (GSAP 3.15 + ScrollTrigger + Lenis 1.3).
   Rules:
   - One loop: Lenis is driven by gsap.ticker (Lenis autoRaf is off), per Lenis's documented
     ScrollTrigger integration. ScrollTrigger is registered once.
   - Everything is readable without this file. Initial "from" states are only applied by GSAP,
     so if a library fails to load, content stays visible and scrolling stays native.
   - prefers-reduced-motion: no Lenis, no parallax, no scrubbed transforms, no entrance motion.
   - Lives only on the landing page: destroy() reverts every tween/trigger and removes Lenis. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});
  let lenis = null;
  let tick = null;
  let mm = null;
  let registered = false;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ready = () => !!(window.gsap && window.ScrollTrigger);
  const headerOffset = () => -((document.querySelector('.lx-header') || {}).offsetHeight || 0);

  MN.LandingMotion = {
    init(root) {
      this.destroy();
      if (!root || !ready()) return; // native scrolling, fully visible content
      const gsap = window.gsap;
      const ST = window.ScrollTrigger;
      if (!registered) { gsap.registerPlugin(ST); registered = true; }

      if (!reduced() && window.Lenis) {
        lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: false });
        lenis.on('scroll', ST.update);
        tick = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
      }

      mm = gsap.matchMedia();
      mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 861px)' }, (ctx) => {
        const { motion, desktop } = ctx.conditions;
        if (!motion) return; // reduced motion: final state as authored in HTML/CSS

        // Hero: text settles in (short, does not block use), image settles from a slight scale.
        gsap.from(root.querySelectorAll('[data-hero-reveal]'), { y: 16, opacity: 0, duration: 1, ease: 'power2.out', stagger: 0.12, delay: 0.05, clearProps: 'transform,opacity' });
        const heroImg = root.querySelector('[data-hero-media] img');
        if (heroImg) gsap.fromTo(heroImg, { scale: 1.06 }, { scale: 1, duration: 1.8, ease: 'power2.out' });
        gsap.fromTo(root.querySelector('.lx-cue'), { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 1 });

        // Hero media drifts slower than the page while leaving (desktop only, max ~60px).
        const media = root.querySelector('[data-hero-media]');
        if (media && desktop) {
          gsap.to(media, { y: 60, ease: 'none', scrollTrigger: { trigger: root.querySelector('.lx-hero'), start: 'top top', end: 'bottom top', scrub: true } });
        }

        // Band image expands within its frame (inner layer only; layout never changes).
        const expand = root.querySelector('[data-expand]');
        if (expand) {
          gsap.fromTo(expand, { scale: desktop ? 0.84 : 0.92, borderRadius: 16 }, {
            scale: 1, borderRadius: 0, ease: 'none',
            scrollTrigger: { trigger: root.querySelector('.lx-band-frame'), start: 'top bottom', end: 'top 20%', scrub: true }
          });
        }

        // Layered photos: two layers, gentle opposite travel (desktop only).
        if (desktop) {
          root.querySelectorAll('[data-parallax]').forEach((el) => {
            const d = parseFloat(el.dataset.parallax) || 0;
            gsap.fromTo(el, { y: -d / 2 }, { y: d / 2, ease: 'none', scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
          });
        }

        // Section reveals: fade + small rise, once.
        root.querySelectorAll('[data-reveal]').forEach((el) => {
          gsap.from(el, { y: 20, opacity: 0, duration: 0.9, ease: 'power2.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });

        // Product sequence: term -> outgoing officer emphasized -> link drawn -> incoming review.
        const stage = root.querySelector('[data-stage]');
        if (stage) {
          const q = (s) => stage.querySelector(s);
          const moments = root.querySelectorAll('[data-moment]');
          const activate = (n) => moments.forEach((m) => m.classList.toggle('is-active', Number(m.dataset.moment) === n));
          const tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 72%', once: true } });
          tl.from(q('[data-step="1"]'), { y: 16, opacity: 0, duration: 0.7, ease: 'power2.out', onStart: () => activate(1) })
            .from(q('[data-step="2"]'), { y: 16, opacity: 0, duration: 0.7, ease: 'power2.out', onStart: () => activate(2) }, '+=0.35')
            .to(q('[data-step="2"]'), { boxShadow: '0 0 0 3px rgba(0,100,177,0.35), 0 18px 40px -18px rgba(0,56,101,0.35)', duration: 0.5 }, '<0.3')
            .from(q('.lx-line'), { scaleX: desktop ? 0 : 1, scaleY: desktop ? 1 : 0, duration: 0.7, ease: 'power2.inOut' }, '+=0.2')
            .from(q('.lx-link-label'), { opacity: 0, duration: 0.4 }, '<0.3')
            .to(q('[data-step="2"]'), { boxShadow: '0 1px 2px rgba(20,38,56,0.06)', duration: 0.6 }, '+=0.2')
            .from(q('[data-step="3"]'), { y: 16, opacity: 0, duration: 0.8, ease: 'power2.out', onStart: () => activate(3) }, '<');
        }
      });
    },

    scrollTo(target) {
      const instant = reduced();
      if (lenis) { lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : headerOffset(), immediate: instant }); return; }
      if (typeof target === 'number') { window.scrollTo({ top: target, behavior: instant ? 'auto' : 'smooth' }); return; }
      const top = target.getBoundingClientRect().top + window.scrollY + headerOffset();
      window.scrollTo({ top, behavior: instant ? 'auto' : 'smooth' });
    },

    destroy() {
      if (mm) { mm.revert(); mm = null; }
      if (tick && window.gsap) { window.gsap.ticker.remove(tick); window.gsap.ticker.lagSmoothing(500, 33); tick = null; }
      if (lenis) { lenis.destroy(); lenis = null; }
    }
  };
})();
