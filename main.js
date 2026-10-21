// ===========================
// nova. — main.js
//
// Theme toggle, phone nav, plain photo slots, footer date, lazy video,
// scroll reveal, section heading lines, the hero "run the pipeline"
// interaction, and the nav state over the hero.
// ===========================

// ===========================
// DOM ready
// ===========================
document.addEventListener('DOMContentLoaded', () => {

  // ===========================
  // PHONE NAV — one scrollable row (see nova-phase3.css)
  // Opens with the current page in view; the edge fade goes away
  // once there's nothing more to scroll to.
  // ===========================
  const navInner = document.querySelector('.nav-inner');
  if (navInner) {
    const updateNavFade = () => navInner.classList.toggle(
      'is-scrolled-end',
      navInner.scrollLeft + navInner.clientWidth >= navInner.scrollWidth - 2
    );
    const active = navInner.querySelector('.nav-link.active');
    if (active && navInner.scrollWidth > navInner.clientWidth) {
      const a = active.getBoundingClientRect();
      const n = navInner.getBoundingClientRect();
      if (a.right > n.right - 28) navInner.scrollLeft += a.right - n.right + 40;
    }
    updateNavFade();
    navInner.addEventListener('scroll', updateNavFade, { passive: true });
    window.addEventListener('resize', updateNavFade, { passive: true });
  }

  // ===========================
  // PLAIN PHOTO SLOTS
  // Some photos carry event artwork (Cloud9 clouds, mascot, lettering)
  // that clashes with the site palette. Drop a plain version into
  // pics/plain/ with the same file name and it replaces the event
  // version everywhere. Until the file exists, nothing changes.
  // ===========================
  const PLAIN_SLOTS = ['cloud9-workshop.jpg', 'cloud9-team.jpg'];
  PLAIN_SLOTS.forEach(name => {
    const imgs = Array.from(document.querySelectorAll('img'))
      .filter(img => (img.getAttribute('src') || '').endsWith('pics/' + name));
    if (!imgs.length) return;
    const probe = new Image();
    probe.onload = () => imgs.forEach(img => { img.src = 'pics/plain/' + name; });
    probe.src = 'pics/plain/' + name;
  });


  // Theme toggle
  // ===========================
  const toggle = document.querySelector('.theme-toggle');
  const icon   = document.querySelector('.toggle-icon');

  // Saved preference → system preference → dark
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', saved);
  setIcon(saved);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      setIcon(next);
    });
  }

  function setIcon(theme) {
    if (icon) icon.innerHTML = theme === 'dark' ? '&#9788;' : '&#9790;';
  }

  // ===========================
  // Live date — footer
  // Shows the current date so visitors know when they're here.
  // Format: "sunday, 28 sep 2026" — lowercase, conversational.
  // ===========================
  const liveDateEl = document.getElementById('liveDate');
  if (liveDateEl) {
    const now  = new Date();
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const day   = days[now.getDay()];
    const date  = now.getDate();
    const month = months[now.getMonth()];
    const year  = now.getFullYear();
    liveDateEl.textContent = `${day}, ${date} ${month} ${year}`;
  }

  // ===========================
  // Lazy video — play only when in viewport
  // ===========================
  const videos = document.querySelectorAll('video.project-video');
  if (videos.length) {
    const vObs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting
        ? e.target.play().catch(() => {})
        : e.target.pause()
      ),
      { threshold: 0.25 }
    );
    videos.forEach(v => vObs.observe(v));
  }

  // ===========================
  // Scroll reveal — .reveal elements (staggered)
  // ===========================
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    // Assign stagger index per visible group
    // Group elements that share the same parent so siblings stagger together
    const groups = new Map();
    reveals.forEach(el => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach(siblings => {
      siblings.forEach((el, i) => {
        el.style.setProperty('--i', i);
      });
    });

    const rObs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          rObs.unobserve(e.target);
        }
      }),
      { threshold: 0.07, rootMargin: '0px 0px -20px 0px' }
    );
    reveals.forEach(el => rObs.observe(el));
  }

  // ===========================
  // Section heading border reveal
  // Adds .border-revealed when heading enters viewport.
  // CSS animates the gradient line from 0 → 100% width.
  // ===========================
  const sectionHeadings = document.querySelectorAll('.section-heading');
  if (sectionHeadings.length) {
    const hObs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('border-revealed');
          hObs.unobserve(e.target);
        }
      }),
      { threshold: 0.3 }
    );
    sectionHeadings.forEach(el => hObs.observe(el));
  }

  // ===========================
  // RUN THE PIPELINE — hero
  // Nodes from Nova's actual AI job scraper pipeline, wired with
  // connector lines. Click the Slack trigger (or let it run once on
  // load): a pulse travels each connection, every node reports
  // success like an n8n execution, the parser finishes with a star
  // burst, and "things i've built" lights up as the output.
  //
  // Emil: purpose = explanation, frequency = rare, so a longer,
  // delightful sequence is allowed. Drag uses pointer capture and
  // ignores a second finger. Reduced motion: nodes are hidden by CSS
  // and the run never starts.
  // ===========================
  (function initPipeline() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer   = document.querySelector('.hero-nodes');
    const output  = document.getElementById('heroOutput');
    const mini    = document.getElementById('heroPipeMini');
    const nodes   = Array.from(document.querySelectorAll('.wf-node'))
      .sort((x, y) => x.dataset.step - y.dataset.step);
    const links   = Array.from(document.querySelectorAll('.wf-link'));
    const pulses  = Array.from(document.querySelectorAll('.wf-link-pulse'));
    const wait    = ms => new Promise(r => setTimeout(r, ms));
    const EASE_IO = 'cubic-bezier(0.77, 0, 0.175, 1)';

    // ── Connector geometry ──────────────────────────────────────
    function dotCenter(node, cls, base) {
      const dot = node.querySelector(cls);
      if (!dot) return null;
      const r = dot.getBoundingClientRect();
      return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
    }

    function pathBetween(a, b) {
      // n8n-style: leave to the right, enter from the left
      const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
      return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
    }

    function drawLinks() {
      if (!layer || !nodes.length) return;
      const base = layer.getBoundingClientRect();
      links.forEach((link, i) => {
        const from = dotCenter(nodes[+link.dataset.from], '.wf-node-dot--out', base);
        const to   = dotCenter(nodes[+link.dataset.to],   '.wf-node-dot--in',  base);
        if (!from || !to) return;
        const d = pathBetween(from, to);
        link.setAttribute('d', d);
        if (pulses[i]) pulses[i].setAttribute('d', d);
      });
    }

    // Keep lines attached while a node springs back (CSS transition ~480ms)
    let followUntil = 0;
    let followRaf   = null;
    function followFor(ms) {
      followUntil = Math.max(followUntil, performance.now() + ms);
      if (followRaf) return;
      const step = () => {
        drawLinks();
        followRaf = performance.now() < followUntil ? requestAnimationFrame(step) : null;
      };
      followRaf = requestAnimationFrame(step);
    }

    // ── Run sequence ────────────────────────────────────────────
    let running = false;

    function pulse(i) {
      const path = pulses[i];
      if (!path || !path.getTotalLength) return wait(0);
      const len = path.getTotalLength();
      const seg = Math.min(70, len * 0.35);
      path.style.strokeDasharray = `${seg} ${len + seg}`;
      const anim = path.animate(
        [
          { strokeDashoffset: seg,  opacity: 1 },
          { strokeDashoffset: -len, opacity: 1 },
        ],
        { duration: 620, easing: EASE_IO, fill: 'forwards' }
      );
      return anim.finished.then(() => anim.cancel());   // back to hidden
    }

    async function succeed(node, thinkMs) {
      node.classList.add('is-running');
      await wait(thinkMs);
      node.classList.remove('is-running');
      node.classList.add('is-done');
    }

    async function run() {
      if (running || reduced || !nodes.length) return;
      running = true;
      nodes.forEach(n => n.classList.remove('is-done'));
      pulses.forEach(p => p.getAnimations().forEach(a => a.cancel()));
      drawLinks();

      await succeed(nodes[0], 220);
      await pulse(0);
      await succeed(nodes[1], 520);   // the AI step "thinks" a little longer
      await pulse(1);
      await succeed(nodes[2], 260);

      const r = nodes[2].getBoundingClientRect();
      if (window.novaStarBurst) window.novaStarBurst(r.left + r.width / 2, r.top + r.height / 2, 10);
      lightOutput();

      await wait(2200);
      nodes.forEach(n => n.classList.remove('is-done'));
      running = false;
    }

    function lightOutput() {
      if (!output) return;
      output.classList.add('is-output');
      setTimeout(() => output.classList.remove('is-output'), 700);
    }

    // ── Drag (pointer events + capture) ─────────────────────────
    nodes.forEach(node => {
      let pointerId = null;
      let startX = 0, startY = 0, downX = 0, downY = 0;
      let curDX = parseFloat(node.dataset.ox || 0);
      let curDY = parseFloat(node.dataset.oy || 0);

      node.style.setProperty('--nx', curDX + 'px');
      node.style.setProperty('--ny', curDY + 'px');

      node.addEventListener('pointerdown', e => {
        if (reduced || pointerId !== null) return;   // ignore a second finger
        pointerId = e.pointerId;
        node.setPointerCapture(e.pointerId);
        node.classList.add('wf-node--dragging');
        startX = e.clientX - curDX;
        startY = e.clientY - curDY;
        downX  = e.clientX;
        downY  = e.clientY;
        node.style.transition = 'box-shadow 80ms ease, border-color 80ms ease';
        e.preventDefault();
      });

      node.addEventListener('pointermove', e => {
        if (e.pointerId !== pointerId) return;
        curDX = e.clientX - startX;
        curDY = e.clientY - startY;
        node.style.setProperty('--nx', curDX + 'px');
        node.style.setProperty('--ny', curDY + 'px');
        drawLinks();
      });

      function release(e) {
        if (e.pointerId !== pointerId) return;
        pointerId = null;
        node.classList.remove('wf-node--dragging');
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);

        // Spring back to the resting position; lines follow
        curDX = parseFloat(node.dataset.ox || 0);
        curDY = parseFloat(node.dataset.oy || 0);
        node.style.removeProperty('transition');
        node.style.setProperty('--nx', curDX + 'px');
        node.style.setProperty('--ny', curDY + 'px');
        followFor(560);

        // A tap (not a drag) on the trigger runs the pipeline
        if (e.type === 'pointerup' && moved < 5 && node.dataset.step === '0') {
          layer.classList.add('has-run');   // hides the "click to run" hint
          run();
        }
      }
      node.addEventListener('pointerup', release);
      node.addEventListener('pointercancel', release);
    });

    // ── Phone version ───────────────────────────────────────────
    let miniRunning = false;
    function runMini() {
      if (!mini || reduced || miniRunning) return;
      miniRunning = true;
      mini.classList.remove('is-running');
      void mini.offsetWidth;
      mini.classList.add('is-running');
      setTimeout(() => {
        const last = mini.querySelector('.pm-node--last');
        const r = last.getBoundingClientRect();
        if (window.novaStarBurst) window.novaStarBurst(r.left + r.width / 2, r.top + r.height / 2, 6);
        lightOutput();
      }, 1500);
      setTimeout(() => { miniRunning = false; }, 1900);
    }
    if (mini) mini.addEventListener('click', runMini);

    // ── First paint, resize, auto-run once ──────────────────────
    const nodesVisible = () => layer && getComputedStyle(layer).display !== 'none';
    const miniVisible  = () => mini && getComputedStyle(mini).display !== 'none';

    window.addEventListener('resize', drawLinks, { passive: true });
    function onLoaded() {
      drawLinks();
      if (reduced) return;
      // After the hero entrance settles
      setTimeout(() => {
        if (nodesVisible()) { drawLinks(); run(); }
        else if (miniVisible()) runMini();
      }, 1300);
    }
    if (document.readyState === 'complete') onLoaded();
    else window.addEventListener('load', onLoaded);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);
    drawLinks();
  })();

  // ===========================
  // Hero nav — transparent until scrolled past hero
  // Adds .nav--scrolled class once hero leaves viewport
  // ===========================
  const nav = document.querySelector('.nav');
  const heroSection = document.querySelector('.hero-landing');
  if (nav && heroSection) {
    const navObs = new IntersectionObserver(
      ([entry]) => {
        nav.classList.toggle('nav--scrolled', !entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    navObs.observe(heroSection);
  }

});
