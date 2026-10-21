// ===========================
// about.js — nova. about me page
// ===========================

// ===========================
// PHOTO DATA
// caption  — short personal label (shown on hover desktop, always on mobile)
// meta     — optional location · year line shown below caption
// alt      — descriptive alt text for accessibility + SEO
// ===========================
const PHOTO_DATA = [
  // Captions are visible under each photo now, so they describe what's
  // actually in the frame. Meta is only set where the photo itself shows it.
  {
    src:     'life/img1.webp', w: 900, h: 600,
    alt:     'Darla with friends at a photo booth, wearing party glasses and headbands',
    caption: 'cloud community things',
    meta:    'manila · 2025',
  },
  {
    src:     'life/img2.webp', w: 900, h: 675,
    alt:     'Darla mid-snack at a restaurant table',
    caption: 'snack break',
  },
  {
    src:     'life/img3.webp', w: 900, h: 473,
    alt:     'Darla and a friend at the Soar Through AWS booth at Adamson',
    caption: 'soar through aws',
    meta:    'adamson · 2026',
  },
  {
    src:     'life/img4.webp', w: 900, h: 506,
    alt:     'Large group photo at a cloud community event in a function hall',
    caption: 'community day',
    meta:    'somewhere in ph',
  },
  {
    src:     'life/img5.webp', w: 900, h: 1200,
    alt:     'Darla next to an n8n "Node thyself, go with the flow" event sign',
    caption: 'node thyself',
    meta:    'an n8n event',
  },
  {
    src:     'life/img6.webp', w: 900, h: 411,
    alt:     'Friends walking outside together at night',
    caption: 'rare evidence i went outside',
    meta:    'manila',
  },
  {
    src:     'life/img7.webp', w: 900, h: 411,
    alt:     'Darla working at a table beside a friend',
    caption: 'heads down',
  },
  {
    src:     'life/img8.webp', w: 900, h: 675,
    alt:     'Darla and a friend at an AWS office, in front of the "It\'s still Day One" wall',
    caption: 'it\'s still day one',
    meta:    'aws office',
  },
];

// ===========================
// Guards
// ===========================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isTouchOnly = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const isMobile = () => window.innerWidth <= 768;

// Shared RAF id so resize can cancel before rebuilding
let scrollRafId = null;

// ===========================
// DOM Ready
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  buildGallery();
});

// ===========================
// BUILD GALLERY
// ===========================
function buildGallery() {
  const track = document.getElementById('galleryTrack');
  if (!track) return;

  track.innerHTML = '';

  const touch    = isTouchOnly();
  // Triple the photos so there's always enough scroll buffer regardless of
  // viewport height or content length — loop reset never becomes visible
  const allPhotos = [...PHOTO_DATA, ...PHOTO_DATA, ...PHOTO_DATA];

  // First 3 photos load eagerly (visible on initial viewport)
  // The rest are lazy with async decoding to avoid blocking the main thread
  const EAGER_COUNT = 3;
  const loadPromises = [];

  allPhotos.forEach((photo, idx) => {
    const isEager = idx < EAGER_COUNT;

    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.alt     = photo.alt;
    img.loading = isEager ? 'eager' : 'lazy';
    img.decoding = isEager ? 'sync' : 'async';

    // Only track load promises for eager images — don't block on lazy ones
    if (isEager) {
      const p = new Promise(resolve => {
        img.onload  = () => img.decode ? img.decode().then(resolve).catch(resolve) : resolve();
        img.onerror = resolve;
      });
      loadPromises.push(p);
    }

    if (photo.w) { img.width = photo.w; img.height = photo.h; }
    img.src = photo.src;

    // ---- Caption — task #2 ----
    // Uses two spans: primary caption + optional meta line
    // On mobile (touch): caption is always visible via .gallery-item--touch-visible class
    const captionEl = document.createElement('div');
    captionEl.className  = 'gallery-caption';
    captionEl.setAttribute('aria-hidden', 'true');

    const primaryEl = document.createElement('span');
    primaryEl.className   = 'gallery-caption__primary';
    primaryEl.textContent = photo.caption;

    captionEl.appendChild(primaryEl);

    if (photo.meta) {
      const metaEl = document.createElement('span');
      metaEl.className   = 'gallery-caption__meta';
      metaEl.textContent = photo.meta;
      captionEl.appendChild(metaEl);
    }

    item.appendChild(img);
    item.appendChild(captionEl);

    track.appendChild(item);
  });

  // Start scroll as soon as eager images are ready (≤ 1.5s typical), max 3s fallback
  Promise.race([
    Promise.all(loadPromises),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]).then(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initScrollLoop(track);
      });
    });
  });
}

// ===========================
// SCROLL LOOP — pure JS RAF
// ===========================
function initScrollLoop(track) {
  if (prefersReducedMotion) return;

  const pin = document.getElementById('galleryPin') || document.getElementById('galleryWrap');
  if (!pin) return;

  const items     = Array.from(track.querySelectorAll('.gallery-item'));
  const halfCount = PHOTO_DATA.length;

  // loopHeight = vertical distance from start of set-1 to start of set-2
  // When posY reaches this, we jump back to 0 — seamlessly because set-2
  // looks identical to set-1. Third set is the safety buffer.
  const loopHeight = items[halfCount].offsetTop - items[0].offsetTop;

  if (loopHeight < 50) {
    setTimeout(() => initScrollLoop(track), 400);
    return;
  }

  // Cancel any existing RAF before starting a new loop
  if (scrollRafId) {
    cancelAnimationFrame(scrollRafId);
    scrollRafId = null;
  }

  const SPEED             = 0.45;   // px/frame ≈ 27px/s — gentle drift
  const WHEEL_SENSITIVITY = 0.75;
  const RESUME_DELAY      = 1800;   // ms of inactivity before auto-scroll resumes

  let posY        = 0;
  let targetY     = 0;
  let isHovered   = false;
  let resumeTimer = null;

  // Clamp y to [0, loopHeight) without a modulo jump that creates a visual glitch.
  // We use the raw value and only snap when it's clearly past the boundary.
  function clamp(y) {
    // Normalise into [0, loopHeight)
    y = ((y % loopHeight) + loopHeight) % loopHeight;
    return y;
  }

  function tick() {
    if (!isHovered) {
      targetY += SPEED;
    }

    // Normalise both into same [0, loopHeight) space before lerping
    // so the lerp never takes the long way around the loop boundary
    let diff = targetY - posY;

    // Take the short path: if the gap is more than half the loop, wrap it
    if (diff > loopHeight / 2)  diff -= loopHeight;
    if (diff < -loopHeight / 2) diff += loopHeight;

    posY   += diff * 0.06;   // silky smooth lerp
    posY    = clamp(posY);
    targetY = clamp(targetY);

    // translate3d keeps transform on the compositor — no layout/reflow
    track.style.transform = `translate3d(0, -${posY}px, 0)`;
    scrollRafId = requestAnimationFrame(tick);
  }

  tick();

  // Pause auto-scroll on hover, resume after leaving
  pin.addEventListener('mouseenter', () => { isHovered = true;  });
  pin.addEventListener('mouseleave', () => { isHovered = false; });

  // Wheel: adjust targetY directly, pause auto-scroll briefly, then resume
  pin.addEventListener('wheel', e => {
    e.preventDefault();
    isHovered = true;
    targetY   = clamp(targetY + e.deltaY * WHEEL_SENSITIVITY);

    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { isHovered = false; }, RESUME_DELAY);
  }, { passive: false });

  // Touch
  let touchStartY = 0;
  pin.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
    isHovered   = true;
  }, { passive: true });

  pin.addEventListener('touchmove', e => {
    const delta = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;
    targetY     = clamp(targetY + delta * WHEEL_SENSITIVITY);
  }, { passive: true });

  pin.addEventListener('touchend', () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { isHovered = false; }, RESUME_DELAY);
  }, { passive: true });

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(scrollRafId);
    scrollRafId = null;
  });
}

// ===========================
// RESIZE — rebuild gallery if layout changes meaningfully
// ===========================
let resizeTimer;
let lastIsMobile = isMobile();

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const nowMobile = isMobile();
    // Rebuild on mobile/desktop threshold cross OR any significant resize
    // (viewport height change shifts loopHeight and breaks the loop)
    if (nowMobile !== lastIsMobile) {
      lastIsMobile = nowMobile;
      buildGallery();
      return;
    }
    // For desktop resizes, re-init the scroll loop to recalculate loopHeight
    const track = document.getElementById('galleryTrack');
    if (track && !nowMobile) {
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
      initScrollLoop(track);
    }
  }, 300);
});
