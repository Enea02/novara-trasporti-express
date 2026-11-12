/* Novara Trasporti — interazioni e animazioni (GSAP + ScrollTrigger + SplitText + Lenis)
   Caricato con `defer`: non blocca il primo render. Se GSAP non è disponibile,
   la pagina resta pienamente leggibile (vedi fallback in fondo). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger && window.SplitText);
  const lite = !fine || innerWidth < 900;   // touch / mobile: scroll nativo, meno lavoro per frame

  /* ================= ESSENZIALI (funzionano anche senza GSAP) ================= */

  /* --- sfondi caricati solo vicino alla viewport --- */
  const bgObs = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in'); bgObs.unobserve(en.target);
  }), { rootMargin: '600px 0px' });
  $$('[data-lazybg]').forEach(el => bgObs.observe(el));

  /* --- form contatti -> Web3Forms (gratuito, 250 invii/mese) --- */
  const form = $('#form'), msg = $('#formMsg'), btn = $('button[type=submit]', form);
  const say = (t, ok) => { msg.style.color = ok ? '#9fe09f' : '#ff8a8a'; msg.textContent = t; };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) return say('Compila tutti i campi con un indirizzo email valido.');
    if (form.botcheck.checked) return;                       // bot: ignora in silenzio
    btn.disabled = true; say('Invio in corso…', true);
    try {
      const data = Object.fromEntries(new FormData(form));
      delete data.botcheck;
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.success) throw new Error(out.message || res.status);
      say('Grazie! Abbiamo ricevuto la tua richiesta, ti ricontatteremo a breve.', true);
      form.reset();
    } catch (err) {
      console.error('Invio form fallito:', err);
      say('Invio non riuscito. Riprova tra qualche minuto.');
    } finally { btn.disabled = false; }
  });

  /* --- menu mobile --- */
  const nav = $('#nav'), burger = $('#burger'), mmenu = $('#mmenu');
  let lenis = null, menuOpen = false;
  const toggleMenu = open => {
    menuOpen = open;
    nav.classList.toggle('open', open); mmenu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); mmenu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
    else document.body.style.overflow = open ? 'hidden' : '';
    $$('a', mmenu).forEach((a, k) => a.style.transitionDelay = open ? (0.15 + k * 0.06) + 's' : '0s');
  };
  burger.addEventListener('click', () => toggleMenu(!menuOpen));

  if (!hasGSAP) { root.classList.remove('js'); return; }

  /* ================= GSAP ================= */
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const showAll = () => {
    $$('.rv').forEach(el => el.classList.add('is-in', 'done'));
    $$('[data-split]').forEach(el => el.style.visibility = 'visible');
    $$('[data-count]').forEach(el => el.textContent = el.hasAttribute('data-sep') ? (+el.dataset.count).toLocaleString('it-IT') : el.dataset.count);
  };

  /* --- link interni (con Lenis se attivo) --- */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (menuOpen) toggleMenu(false);
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target === 0 ? scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }) : target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* --- navbar: compatta, si nasconde scendendo, ricompare salendo --- */
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('scrolled', y > 40);
      if (!menuOpen) nav.classList.toggle('hidden', self.direction === 1 && y > 500);
    }
  });

  /* --- pill della voce attiva --- */
  const pill = $('#navPill'), links = $$('#navLinks a');
  let activeLink = null;
  const movePill = a => {
    if (!a) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1; pill.style.left = a.offsetLeft + 'px'; pill.style.width = a.offsetWidth + 'px';
  };
  const setActive = a => { activeLink = a; links.forEach(l => l.classList.toggle('active', l === a)); movePill(a); };
  links.forEach(a => a.addEventListener('mouseenter', () => movePill(a)));
  $('#navLinks').addEventListener('mouseleave', () => movePill(activeLink));
  [['#top', null], ['#chi-siamo', 0], ['#flotta', 1], ['#servizi', 2], ['.services', 2], ['#food', 3], ['#contatti', 4]]
    .forEach(([sel, idx]) => ScrollTrigger.create({
      trigger: sel, start: 'top center', end: 'bottom center',
      onToggle: self => self.isActive && setActive(idx === null ? null : links[idx])
    }));

  if (reduce) { showAll(); return; }

  /* L'inizializzazione è divisa in piccole tappe eseguite quando il browser è libero:
     nessun task lungo durante il caricamento (Total Blocking Time basso). */
  const tasks = [];
  const stage = fn => tasks.push(fn);
  const yieldNow = () => (window.scheduler && scheduler.yield) ? scheduler.yield() : new Promise(r => setTimeout(r, 0));
  const runTasks = async () => { while (tasks.length) { tasks.shift()(); await yieldNow(); } };

  /* ================= MOTION (solo se l'utente non chiede movimento ridotto) ================= */

  /* --- Lenis smooth scroll, sincronizzato con ScrollTrigger --- */
  if (window.Lenis && !lite) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  stage(() => {
  /* --- barra di avanzamento --- */
  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  /* --- cursore personalizzato --- */
  if (fine) {
    const cur = $('#cursor'), dot = $('#cursorDot');
    document.body.classList.add('has-cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });
    addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); dx(e.clientX); dy(e.clientY); });
    document.addEventListener('mouseleave', () => document.body.classList.remove('has-cursor'));
    document.addEventListener('mouseenter', () => document.body.classList.add('has-cursor'));
    $$('a,button,input,textarea,.chip,.areas span').forEach(el => {
      el.addEventListener('mouseenter', () => cur.classList.add('is-link'));
      el.addEventListener('mouseleave', () => cur.classList.remove('is-link'));
    });
    $$('[data-view]').forEach(el => {
      el.addEventListener('mouseenter', () => cur.classList.add('is-view'));
      el.addEventListener('mouseleave', () => cur.classList.remove('is-view'));
    });

    /* --- pulsanti magnetici (React Bits "Magnet") --- */
    $$('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.45);
      });
      el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });

    /* --- tilt 3D + riflesso --- */
    $$('[data-tilt]').forEach(el => {
      const max = +el.dataset.tilt || 8;
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        rx((0.5 - py) * max * 2); ry((px - 0.5) * max * 2);
        el.style.setProperty('--x', px * 100 + '%'); el.style.setProperty('--y', py * 100 + '%');
      });
      el.addEventListener('mouseleave', () => { rx(0); ry(0); });
    });
  }

  });

  /* --- luce che segue il mouse sulle card servizi --- */
  $$('[data-spot]').forEach(el => el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', (e.clientX - r.left) + 'px'); el.style.setProperty('--y', (e.clientY - r.top) + 'px');
  }));

  stage(() => {
  /* --- HERO: parallax col mouse + uscita allo scroll --- */
  const hero = $('.hero'), heroBg = $('#heroBg'), glow = $('#heroGlow');
  gsap.set(heroBg, { scale: 1.06 });
  if (fine) {
    const bx = gsap.quickTo(heroBg, 'x', { duration: 1, ease: 'power3' });
    const by = gsap.quickTo(heroBg, 'y', { duration: 1, ease: 'power3' });
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      bx(((e.clientX - r.left) / r.width - 0.5) * -34);
      by(((e.clientY - r.top) / r.height - 0.5) * -22);
      glow.style.setProperty('--gx', (e.clientX - r.left) + 'px');
      glow.style.setProperty('--gy', (e.clientY - r.top) + 'px');
    });
  }
  gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    .to(heroBg, { yPercent: 14, ease: 'none' }, 0)
    .to('.hero .wrap', { yPercent: -30, opacity: 0.15, ease: 'none' }, 0)
    .to('.scroll-hint', { opacity: 0, ease: 'none', duration: 0.3 }, 0);

  });

  /* --- comparsa a gruppi con stagger --- */
  const reveal = (sel, from, to = {}) => ScrollTrigger.batch(sel, {
    start: 'top 90%', once: true,
    onEnter: els => {
      els.forEach(el => el.classList.add('is-in'));
      gsap.fromTo(els, { autoAlpha: 0, ...from }, {
        autoAlpha: 1, x: 0, y: 0, scale: 1, rotationX: 0, duration: 1, ease: 'power3.out', stagger: 0.12, overwrite: 'auto', ...to,
        onComplete: () => els.forEach(el => { el.classList.add('done'); gsap.set(el, { clearProps: 'opacity,visibility,transform' }); })
      });
    }
  });
  // per primi gli elementi che possono essere già visibili (statistiche sotto l'hero)
  stage(() => reveal('.stats__grid', { y: 40 }));

  /* --- titoli di sezione: lettere che "galleggiano" in posizione (React Bits "ScrollFloat") --- */
  $$('[data-split="float"]').forEach(h => stage(() => {
    const split = SplitText.create(h, { type: 'words,chars', charsClass: 'sc' });
    h.style.visibility = 'visible';
    gsap.fromTo(split.chars,
      { yPercent: 120, scaleY: 2.3, scaleX: 0.7, opacity: 0, transformOrigin: '50% 0%' },
      { yPercent: 0, scaleY: 1, scaleX: 1, opacity: 1, ease: 'back.inOut(2)', stagger: 0.03,
        scrollTrigger: { trigger: h, start: 'top bottom-=8%', end: 'bottom center+=10%', scrub: 1 } });
  }));

  /* --- paragrafo introduttivo: parole che si accendono (React Bits "ScrollReveal") --- */
  $$('[data-split="reveal"]').forEach(p => stage(() => {
    const split = SplitText.create(p, { type: 'words' });
    p.style.visibility = 'visible';
    gsap.fromTo(split.words, { opacity: 0.12 },
      { opacity: 1, ease: 'none', stagger: 0.05,
        scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 50%', scrub: true } });
  }));

  stage(() => reveal('.cards .card', { y: 70, rotationX: -14, transformOrigin: '50% 100%' }));
  stage(() => reveal('.food__cards .fcard', { y: 80, scale: 0.92 }));
  stage(() => reveal('.facts li', { x: 40 }));
  stage(() => reveal($$('.rv').filter(el => !el.matches('.card, .fcard, .facts li, .stats__grid')), { y: 40 }));

  /* --- contatori (React Bits "CountUp") --- */
  stage(() => ScrollTrigger.create({
    trigger: '.stats__grid', start: 'top 92%', once: true,
    onEnter: () => $$('[data-count]').forEach(el => {
      const end = +el.dataset.count, sep = el.hasAttribute('data-sep'), o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out',
        onUpdate: () => { const v = Math.round(o.v); el.textContent = sep ? v.toLocaleString('it-IT') : v; } });
    })
  }));

  /* --- marquee che reagisce alla velocità di scroll (React Bits "ScrollVelocity") --- */
  if (!lite) stage(() => {
  const rows = $$('.marquee__track').map((track, i) => {
    track.style.animation = 'none';
    const tw = gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, ease: 'none', duration: 34, repeat: -1 });
    tw.totalTime(tw.duration() * 1000);           // margine per poter andare all'indietro
    return { tw, sign: i % 2 ? -1 : 1 };
  });
  let mqDir = 1, mqTarget = 1, mqCurrent = 1;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      mqDir = self.direction;
      mqTarget = mqDir * (1 + Math.min(Math.abs(self.getVelocity()) / 250, 7));
    }
  });
  const tick = () => {
    mqTarget += (mqDir - mqTarget) * 0.04;      // torna gradualmente alla velocità base
    mqCurrent += (mqTarget - mqCurrent) * 0.12;
    rows.forEach(r => r.tw.timeScale(mqCurrent * r.sign));
  };
  ScrollTrigger.create({                        // lavora solo mentre il marquee è a schermo
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onToggle: self => {
      rows.forEach(r => self.isActive ? r.tw.resume() : r.tw.pause());
      self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick);
    }
  });
  });

  /* --- flotta: apertura a maschera + parallax --- */
  stage(() => {
  gsap.fromTo('#fleetImg',
    { clipPath: 'inset(14% 10% 14% 10% round 22px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none',
      scrollTrigger: { trigger: '#fleetImg', start: 'top 92%', end: 'center 55%', scrub: true } });
  gsap.fromTo('#fleetImg img', { yPercent: -7 }, { yPercent: 7, ease: 'none',
    scrollTrigger: { trigger: '#fleetImg', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* --- fascia "smart supplier" e contatti: parallax dello sfondo --- */
  stage(() => {
  gsap.fromTo('.band__bg', { yPercent: -9, scale: 1.15 }, { yPercent: 9, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.contact__bg', { yPercent: -6 }, { yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* --- food: sfondo che segue il mouse --- */
  stage(() => {
  const foodBg = $('#foodBg');
  gsap.set(foodBg, { scale: 1.1 });
  if (fine) {
    const fx = gsap.quickTo(foodBg, 'x', { duration: 1.2, ease: 'power3' });
    const fy = gsap.quickTo(foodBg, 'y', { duration: 1.2, ease: 'power3' });
    $('#food').addEventListener('mousemove', e => {
      const r = e.currentTarget.getBoundingClientRect();
      fx(((e.clientX - r.left) / r.width - 0.5) * -26);
      fy(((e.clientY - r.top) / r.height - 0.5) * -26);
    });
  }

  });

  /* avvio: prima tappa al primo momento libero dopo il caricamento */
  const start = () => ('requestIdleCallback' in window) ? requestIdleCallback(runTasks, { timeout: 800 }) : setTimeout(runTasks, 50);
  document.readyState === 'complete' ? start() : addEventListener('load', start, { once: true });
})();
