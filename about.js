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
  {
    src:     'life/img1.webp',
    alt:     'Darla Sumanting at an AWS student community event in Manila',
    caption: 'cloud community things',
    meta:    'manila · 2025',
  },
  {
    src:     'life/img2.webp',
    alt:     'Darla with members of the AWS Student Builder Group at Adamson University',
    caption: 'the squad',
    meta:    'adamson · 2025',
  },
  {
    src:     'life/img3.webp',
    alt:     'Group photo at an AWS community event',
    caption: 'the team',
    meta:    'manila · 2025',
  },
  {
    src:     'life/img4.webp',
    alt:     'Darla presenting at a cloud community workshop',
    caption: 'community day',
    meta:    'somewhere in ph',
  },
  {
    src:     'life/img5.webp',
    alt:     'Darla working on a side project setup',
    caption: 'building, again',
    meta:    '2026',
  },
  {
    src:     'life/img6.webp',
    alt:     'Rare photo of Darla outside the terminal',
    caption: 'rare evidence i went outside',
    meta:    'manila',
  },
  {
    src:     'life/img7.webp',
    alt:     'Camera roll moment, Nova offline',
    caption: 'offline for once',
    meta:    'from the archives',
  },
  {
    src:     'life/img8.webp',
    alt:     'Darla between projects',
    caption: 'between projects',
    meta:    '2026',
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
// CUSTOM CURSOR
// Task #3 — translate3d, SMOOTHING 0.35, single mousemove, data-cursor attributes
// ===========================
function initCursor() {
  const cursor = document.getElementById('novaCursor');
  if (!cursor) return;

  cursor.style.opacity = '0';
  cursor.style.display = 'block';

  let mouseX = -200, mouseY = -200;
  let cursorX = -200, cursorY = -200;
  let started = false;

  // 0.35 — nearly native, tiny personality lag (was 0.18)
  const SMOOTHING = 0.35;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!started) {
      cursorX = mouseX;
      cursorY = mouseY;
      cursor.style.opacity = '1';
      started = true;
    }

    // Drive cursor state from data-cursor attribute — no complex logic
    const el = e.target.closest('[data-cursor]');
    if (el) {
      cursor.setAttribute('data-state', el.getAttribute('data-cursor'));
    } else if (e.target.closest('a, button')) {
      cursor.setAttribute('data-state', 'hover');
    } else {
      cursor.removeAttribute('data-state');
    }
  }, { passive: true });

  // Use translate3d — compositor-only, no layout triggers
  function animateCursor() {
    cursorX += (mouseX - cursorX) * SMOOTHING;
    cursorY += (mouseY - cursorY) * SMOOTHING;
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    cursor.removeAttribute('data-state');
  });
  document.addEventListener('mouseenter', () => {
    if (started) cursor.style.opacity = '1';
  });

  document.addEventListener('mousedown', () => {
    cursor.setAttribute('data-state', 'press');
  });
  document.addEventListener('mouseup', () => {
    // Restore hover state if still over an interactive element, else clear
    const el = document.elementFromPoint(mouseX, mouseY);
    if (el && el.closest('[data-cursor]')) {
      cursor.setAttribute('data-state', el.closest('[data-cursor]').getAttribute('data-cursor'));
    } else if (el && el.closest('a, button')) {
      cursor.setAttribute('data-state', 'hover');
    } else {
      cursor.removeAttribute('data-state');
    }
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
