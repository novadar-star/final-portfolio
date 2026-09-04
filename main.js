// ===========================
// nova. — main.js
// Responsibilities:
//   1. Dark mode toggle (persists to localStorage)
//   2. Global heart counter (Supabase, localStorage fallback)
//   3. Scroll reveal (IntersectionObserver, staggered)
//   4. Lazy video play/pause on scroll
// Removed: marquee (no longer used)
// ===========================

// ===========================
// Supabase config
// ===========================
const SUPABASE_URL = 'https://lbmplqohcuthpgrnljxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibXBscW9oY3V0aHBncm5sanh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNzUwNzMsImV4cCI6MjA5OTc1MTA3M30.sRmRnyQAcuywBrtUqA6Nggac2Aj0Wvx3B7ViAHWWb7U';

async function getHeartCount() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hearts?id=eq.1&select=count`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    return data[0]?.count || 0;
  } catch (e) {
    return parseInt(localStorage.getItem('heartCount') || '0', 10);
  }
}

async function incrementHeart() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_heart`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      const current = await getHeartCount();
      await fetch(`${SUPABASE_URL}/rest/v1/hearts?id=eq.1`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ count: current + 1 })
      });
      return current + 1;
    }
    const data = await res.json();
    return data;
  } catch (e) {
    const count = parseInt(localStorage.getItem('heartCount') || '0', 10) + 1;
    localStorage.setItem('heartCount', count.toString());
    return count;
  }
}

// ===========================
// Scroll reveal
// Exposed as window.registerScrollReveal so systems.html
// can call it after JS-rendering the project cards.
// ===========================
window.registerScrollReveal = function () {
  const targets = document.querySelectorAll('.scroll-reveal:not(.reveal-registered)');

  targets.forEach(function (el, i) {
    el.classList.add('reveal-registered');
    // Stagger delay capped at 350ms so the page doesn't feel sluggish
    el.style.transitionDelay = Math.min(i * 0.06, 0.35) + 's';
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
  );

  document.querySelectorAll('.scroll-reveal.reveal-registered:not(.visible)').forEach(function (el) {
    observer.observe(el);
  });
};

// ===========================
// DOM Ready
// ===========================
document.addEventListener('DOMContentLoaded', async function () {

  // ===========================
  // Dark mode toggle
  // ===========================
  const toggle = document.querySelector('.theme-toggle');
  const icon   = document.querySelector('.toggle-icon');

  // Honour saved preference, fall back to system preference, then dark
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme') || (systemDark ? 'dark' : 'light');

  document.body.setAttribute('data-theme', savedTheme);
  updateIcon(savedTheme);

  if (toggle) {
    toggle.addEventListener('click', function () {
      const current = document.body.getAttribute('data-theme');
      const next    = current === 'light' ? 'dark' : 'light';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateIcon(next);
    });
  }

  function updateIcon(theme) {
    if (icon) {
      // ☀ = sun (light mode active indicator), ☾ = crescent (dark mode active indicator)
      icon.innerHTML = theme === 'dark' ? '&#9788;' : '&#9790;';
    }
  }

  // ===========================
  // Heart react — global via Supabase
  // ===========================
  const heartBtn   = document.querySelector('.heart-float');
  const heartCount = document.querySelector('.heart-count');

  if (heartBtn && heartCount) {
    const initialCount = await getHeartCount();
    heartCount.textContent = initialCount;
    if (initialCount > 0) heartBtn.classList.add('liked');

    heartBtn.addEventListener('click', async function () {
      // Optimistic UI
      const displayed = parseInt(heartCount.textContent, 10) + 1;
      heartCount.textContent = displayed;
      heartBtn.classList.add('liked');

      heartBtn.classList.remove('pop');
      void heartBtn.offsetWidth; // force reflow for animation restart
      heartBtn.classList.add('pop');

      const actualCount = await incrementHeart();
      if (actualCount && typeof actualCount === 'number') {
        heartCount.textContent = actualCount;
      }
    });
  }

  // ===========================
  // Lazy video play — play only when in viewport
  // ===========================
  const videos = document.querySelectorAll('video.project-video');
  if (videos.length) {
    const videoObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(function () {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    videos.forEach(function (v) { videoObserver.observe(v); });
  }

  // ===========================
  // Initial scroll reveal registration
  // (systems.html also calls this after rendering cards)
  // ===========================
  window.registerScrollReveal();

});
