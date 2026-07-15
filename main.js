// ===========================
// Scroll Reveal Animation
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  // Apply scroll-reveal class to timeline entries and project cards
  const revealElements = document.querySelectorAll(
    '.timeline-entry, .project-card'
  );

  revealElements.forEach((el, i) => {
    el.classList.add('scroll-reveal');
    el.style.transitionDelay = `${i * 0.08}s`;
  });

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    observer.observe(el);
  });

  // ===========================
  // Marquee pause on hover
  // ===========================
  const marqueeTrack = document.querySelector('.marquee-track');
  if (marqueeTrack) {
    const marquee = document.querySelector('.marquee');
    marquee.addEventListener('mouseenter', () => {
      marqueeTrack.style.animationPlayState = 'paused';
    });
    marquee.addEventListener('mouseleave', () => {
      marqueeTrack.style.animationPlayState = 'running';
    });
  }
});
