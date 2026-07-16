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
    // Use RPC or PATCH to increment
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
      // Fallback: direct update with current count + 1
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
    // Fallback to localStorage
    let count = parseInt(localStorage.getItem('heartCount') || '0', 10) + 1;
    localStorage.setItem('heartCount', count.toString());
    return count;
  }
}

// ===========================
// DOM Ready
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  // ===========================
  // Dark mode toggle
  // ===========================
  const toggle = document.querySelector('.theme-toggle');
  const icon = document.querySelector('.toggle-icon');
  const savedTheme = localStorage.getItem('theme') || 'dark';

  document.body.setAttribute('data-theme', savedTheme);
  updateIcon(savedTheme);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateIcon(next);
    });
  }

  function updateIcon(theme) {
    if (icon) {
      icon.innerHTML = theme === 'dark' ? '&#9788;' : '&#9790;';
    }
  }

  // ===========================
  // Heart react — global via Supabase
  // ===========================
  const heartBtn = document.querySelector('.heart-btn');
  const heartCount = document.querySelector('.heart-count');

  if (heartBtn && heartCount) {
    // Load current count from Supabase
    const initialCount = await getHeartCount();
    heartCount.textContent = initialCount;
    if (initialCount > 0) heartBtn.classList.add('liked');

    heartBtn.addEventListener('click', async () => {
      // Optimistic UI update
      const displayed = parseInt(heartCount.textContent, 10) + 1;
      heartCount.textContent = displayed;
      heartBtn.classList.add('liked');

      // Pop animation
      heartBtn.classList.remove('pop');
      void heartBtn.offsetWidth;
      heartBtn.classList.add('pop');

      // Persist to Supabase
      const actualCount = await incrementHeart();
      if (actualCount && typeof actualCount === 'number') {
        heartCount.textContent = actualCount;
      }
    });
  }

  // ===========================
  // Scroll reveal — Stagger List pattern (300-450ms, ease-out)
  // ===========================
  const targets = document.querySelectorAll(
    '.timeline-entry, .project-case, .edu-item, .service-card, .proof-strip, .contact-strip, .hero-photo, .what-i-do'
  );

  targets.forEach((el, i) => {
    el.classList.add('scroll-reveal');
    el.style.transitionDelay = `${i * 0.07}s`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
  );

  document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));

  // ===========================
  // Marquee pause on hover
  // ===========================
  const marquee = document.querySelector('.marquee');
  const track = document.querySelector('.marquee-track');
  if (marquee && track) {
    marquee.addEventListener('mouseenter', () => {
      track.style.animationPlayState = 'paused';
    });
    marquee.addEventListener('mouseleave', () => {
      track.style.animationPlayState = 'running';
    });
  }
});
