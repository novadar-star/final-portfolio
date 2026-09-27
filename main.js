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
  if (scrollCue) {
    const heroCueObs = new IntersectionObserver(
      ([entry]) => { scrollCue.style.opacity = entry.isIntersecting ? '' : '0'; },
      { threshold: 0.5 }
    );
    const heroSection = document.querySelector('.hero-landing');
    if (heroSection) heroCueObs.observe(heroSection);
  }

});
