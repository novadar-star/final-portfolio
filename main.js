document.addEventListener('DOMContentLoaded', () => {
  // ===========================
  // Dark mode toggle
  // ===========================
  const toggle = document.querySelector('.theme-toggle');
  const icon = document.querySelector('.toggle-icon');
  const savedTheme = localStorage.getItem('theme') || 'light';

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
  // Heart react — unlimited clicks
  // ===========================
  const heartBtn = document.querySelector('.heart-btn');
  const heartCount = document.querySelector('.heart-count');

  if (heartBtn) {
    let count = parseInt(localStorage.getItem('heartCount') || '0', 10);
    heartCount.textContent = count;
    if (count > 0) heartBtn.classList.add('liked');

    heartBtn.addEventListener('click', () => {
      count++;
      heartCount.textContent = count;
      heartBtn.classList.add('liked');
      localStorage.setItem('heartCount', count.toString());

      // Pop animation
      heartBtn.classList.remove('pop');
      void heartBtn.offsetWidth;
      heartBtn.classList.add('pop');
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
