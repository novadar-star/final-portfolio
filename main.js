// ===========================
// nova. — main.js
//
// 1. Theme toggle (localStorage + prefers-color-scheme fallback)
// 2. Heart counter (Supabase, localStorage fallback)
// 3. Scroll reveal — targets .reveal only, used sparingly
// 4. Lazy video — play/pause on viewport entry
// ===========================

// ===========================
// Supabase
// ===========================
const SUPABASE_URL = 'https://lbmplqohcuthpgrnljxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibXBscW9oY3V0aHBncm5sanh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNzUwNzMsImV4cCI6MjA5OTc1MTA3M30.sRmRnyQAcuywBrtUqA6Nggac2Aj0Wvx3B7ViAHWWb7U';

async function getHeartCount() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/hearts?id=eq.1&select=count`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await res.json();
    return data[0]?.count || 0;
  } catch {
    return parseInt(localStorage.getItem('heartCount') || '0', 10);
  }
}

async function incrementHeart() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/increment_heart`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );
    if (!res.ok) {
      const current = await getHeartCount();
      await fetch(`${SUPABASE_URL}/rest/v1/hearts?id=eq.1`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ count: current + 1 })
      });
      return current + 1;
    }
    return await res.json();
  } catch {
    const count = parseInt(localStorage.getItem('heartCount') || '0', 10) + 1;
    localStorage.setItem('heartCount', String(count));
    return count;
  }
}

// ===========================
// DOM ready
// ===========================
document.addEventListener('DOMContentLoaded', async () => {

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
  // Heart counter
  // ===========================
  const heartBtn   = document.querySelector('.heart-float');
  const heartCount = document.querySelector('.heart-count');

  if (heartBtn && heartCount) {
    heartCount.textContent = await getHeartCount();

    heartBtn.addEventListener('click', async () => {
      // Optimistic update
      heartCount.textContent = parseInt(heartCount.textContent, 10) + 1;
      heartBtn.classList.add('liked');

      // Pop animation
      heartBtn.classList.remove('pop');
      void heartBtn.offsetWidth;
      heartBtn.classList.add('pop');

      const actual = await incrementHeart();
      if (typeof actual === 'number') heartCount.textContent = actual;
    });
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
  // Film strip drag-to-scroll
  // ===========================
  document.querySelectorAll('.film-track').forEach(track => {
    let isDragging = false;
    let startX     = 0;
    let scrollLeft = 0;

    track.addEventListener('mousedown', e => {
      isDragging = true;
      track.classList.add('is-dragging');
      startX     = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
      e.preventDefault();
    });

    const stopDrag = () => {
      isDragging = false;
      track.classList.remove('is-dragging');
    };
    document.addEventListener('mouseup',    stopDrag);
    document.addEventListener('mouseleave', stopDrag);

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const x    = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.4;
      track.scrollLeft = scrollLeft - walk;
    });
  });

  // ===========================
  // Draggable workflow nodes — hero
  // Nodes from Nova's actual AI job scraper pipeline.
  // Drag to move. Release to spring back.
  // Works on mouse + touch. Disabled by reduced-motion CSS.
  // ===========================
  document.querySelectorAll('.wf-node').forEach(node => {
    let dragging  = false;
    let startX    = 0;
    let startY    = 0;
    let originX   = 0;
    let originY   = 0;
    // Current translate offset
    let curDX = parseFloat(node.dataset.ox || 0);
    let curDY = parseFloat(node.dataset.oy || 0);

    // Apply initial scattered position from data attributes
    node.style.setProperty('--nx', curDX + 'px');
    node.style.setProperty('--ny', curDY + 'px');

    function onDown(e) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      dragging = true;
      node.classList.add('wf-node--dragging');

      const pt = e.touches ? e.touches[0] : e;
      startX = pt.clientX - curDX;
      startY = pt.clientY - curDY;

      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      curDX = pt.clientX - startX;
      curDY = pt.clientY - startY;
      node.style.setProperty('--nx', curDX + 'px');
      node.style.setProperty('--ny', curDY + 'px');
      // Remove transition while dragging so it follows instantly
      node.style.transition = 'box-shadow 80ms ease, border-color 80ms ease';
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      node.classList.remove('wf-node--dragging');
      // Spring back to original position
      curDX = parseFloat(node.dataset.ox || 0);
      curDY = parseFloat(node.dataset.oy || 0);
      node.style.removeProperty('transition'); // restore CSS spring transition
      node.style.setProperty('--nx', curDX + 'px');
      node.style.setProperty('--ny', curDY + 'px');
    }

    node.addEventListener('mousedown',  onDown,  { passive: false });
    node.addEventListener('touchstart', onDown,  { passive: false });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup',   onUp,   { passive: true });
    window.addEventListener('touchend',  onUp,   { passive: true });
  });

  // ===========================
  // Card tilt — home project articles
  // Subtle perspective tilt on cursor position within card.
  // Max 4° rotation. Springs back on mouse leave.
  // ===========================
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch2 = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  if (!isReducedMotion && !isTouch2) {
    document.querySelectorAll('.home-project').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect   = card.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) / (rect.width  / 2); // -1 to 1
        const dy     = (e.clientY - cy) / (rect.height / 2); // -1 to 1
        const MAX    = 4; // degrees
        const tiltX  = (-dy * MAX).toFixed(2); // invert Y so top edge tilts toward cursor
        const tiltY  = ( dx * MAX).toFixed(2);
        card.style.setProperty('--tilt-x', tiltX + 'deg');
        card.style.setProperty('--tilt-y', tiltY + 'deg');
        card.classList.add('is-tilting');
        card.classList.remove('tilt-reset');
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.classList.remove('is-tilting');
        card.classList.add('tilt-reset');
        // Clean up class after spring animation completes (~500ms)
        setTimeout(() => card.classList.remove('tilt-reset'), 520);
      }, { passive: true });
    });
  }

  // ===========================
  // Rotating identity word — hero
  // Fades between identity descriptors in the hero sentence.
  // Inspired by Daisy Fernandez's identity sentence mechanic.
  // Words are in Nova's voice: lowercase, honest, specific.
  // ===========================
  const rotatingWord = document.getElementById('heroRotatingWord');
  if (rotatingWord && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const words = [
      'curiosity',
      'community',
      'automation',
      'stubbornness',
    ];
    let current = 0;

    function cycleWord() {
      const el = rotatingWord;

      // Fade out
      el.classList.add('is-leaving');

      setTimeout(() => {
        // Swap word
        current = (current + 1) % words.length;
        el.textContent = words[current];

        // Brief pause while invisible, then fade in
        el.classList.remove('is-leaving');
        el.classList.add('is-entering');

        // RAF ensures the browser registers the opacity:0 class before removing it
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.classList.remove('is-entering');
          });
        });
      }, 300); // matches transition duration in CSS
    }

    setInterval(cycleWord, 2200); // swap every 2.2 seconds
  }

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

  // ===========================
  // Custom cursor — global, all pages
  // Disabled on touch devices and prefers-reduced-motion.
  // The .nova-cursor element is injected in every page's HTML.
  // JS moves it via transform: translate3d (no left/top) for
  // GPU-composited, jank-free tracking.
  // ===========================
  const cursor = document.getElementById('novaCursor');

  // Only wire up on non-touch, non-reduced-motion desktops
  const isTouch   = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (cursor && !isTouch && !isReduced) {
    // Show cursor, hide system pointer
    cursor.style.display = 'block';
    document.body.classList.add('cursor-active');

    let mouseX = -200;
    let mouseY = -200;
    let curX   = -200;
    let curY   = -200;
    let rafId  = null;

    // Smooth follow — lerps toward actual mouse position each frame
    const LERP = 0.18;

    function animateCursor() {
      curX += (mouseX - curX) * LERP;
      curY += (mouseY - curY) * LERP;

      // Centre the 18px cursor on the hot spot
      const offsetX = curX - 9;
      const offsetY = curY - 9;
      cursor.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;

      rafId = requestAnimationFrame(animateCursor);
    }

    rafId = requestAnimationFrame(animateCursor);

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    // Hover state — enlarge on interactive elements
    const interactiveSelector = 'a, button, [role="button"], label[for], input, textarea, select, summary';

    document.addEventListener('mouseover', e => {
      if (e.target.closest(interactiveSelector)) {
        cursor.setAttribute('data-state', 'hover');
      }
    }, { passive: true });

    document.addEventListener('mouseout', e => {
      if (e.target.closest(interactiveSelector)) {
        cursor.setAttribute('data-state', '');
      }
    }, { passive: true });

    // Press state
    document.addEventListener('mousedown', () => {
      cursor.setAttribute('data-state', 'press');
    }, { passive: true });

    document.addEventListener('mouseup', () => {
      cursor.setAttribute('data-state', '');
    }, { passive: true });

    // Hide cursor when it leaves the window
    document.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
    }, { passive: true });

    document.addEventListener('mouseenter', () => {
      cursor.style.opacity = '';
    }, { passive: true });
  }

});
