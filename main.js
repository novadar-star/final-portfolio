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
// Custom cursor — all pages except about (about.js handles its own)
// ===========================
function initGlobalCursor() {
  const cursor = document.getElementById('novaCursor');
  if (!cursor) return;

  // Only run on non-touch desktop devices
  const isTouchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isTouchOnly || prefersReducedMotion) return;
  if (window.innerWidth <= 768) return;

  document.body.classList.add('cursor-active');
  cursor.style.opacity = '0';
  cursor.style.display = 'block';

  let mouseX = -200, mouseY = -200;
  let cursorX = -200, cursorY = -200;
  let started = false;
  const SMOOTHING = 0.35;  // nearly native feel — was 0.22

  // Single mousemove drives position + state
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!started) {
      cursorX = mouseX;
      cursorY = mouseY;
      cursor.style.opacity = '1';
      started = true;
    }

    if (e.target.closest('a, button')) {
      cursor.setAttribute('data-state', 'hover');
    } else {
      cursor.removeAttribute('data-state');
    }
  }, { passive: true });

  (function animateCursor() {
    cursorX += (mouseX - cursorX) * SMOOTHING;
    cursorY += (mouseY - cursorY) * SMOOTHING;
    // translate3d — compositor-only, no left/top layout triggers
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    requestAnimationFrame(animateCursor);
  })();

  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    cursor.removeAttribute('data-state');
  });
  document.addEventListener('mouseenter', () => {
    if (started) cursor.style.opacity = '1';
  });

  document.addEventListener('mousedown', () => {
    cursor.style.scale = '0.6';
  });
  document.addEventListener('mouseup', () => {
    cursor.style.scale = '1';
  });
}

// ===========================
// DOM ready
// ===========================
document.addEventListener('DOMContentLoaded', async () => {

  // Init global cursor on all pages except about
  // (about.js handles its own cursor with photo-state support)
  if (!document.body.classList.contains('about-page')) {
    initGlobalCursor();
  }

  // ===========================
  // Theme toggle
  // ===========================
  const toggle = document.querySelector('.theme-toggle');
  const icon   = document.querySelector('.toggle-icon');

  // Saved preference → system preference → dark
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');

  document.body.setAttribute('data-theme', saved);
  setIcon(saved);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      setIcon(next);
    });
  }

  function setIcon(theme) {
    if (icon) icon.innerHTML = theme === 'dark' ? '&#9788;' : '&#9790;';
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
  // Scroll reveal
  // Targets .reveal elements only.
  // No stagger delay — each element reveals independently.
  // Respects prefers-reduced-motion via CSS transition:none.
  // ===========================
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
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

});
