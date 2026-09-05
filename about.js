// ===========================
// about.js — nova. about me page
// ===========================

// ===========================
// PHOTO DATA
// ===========================
const PHOTO_DATA = [
  { src: 'life/img1.png', alt: 'nova — life photo 1', caption: 'somewhere in manila' },
  { src: 'life/img2.png', alt: 'nova — life photo 2', caption: 'camera roll evidence' },
  { src: 'life/img3.jpg', alt: 'nova — life photo 3', caption: 'the team ✦' },
  { src: 'life/img4.png', alt: 'nova — life photo 4', caption: 'community day' },
  { src: 'life/img5.png', alt: 'nova — life photo 5', caption: 'building again' },
  { src: 'life/img6.png', alt: 'nova — life photo 6', caption: 'outside the terminal' },
  { src: 'life/img7.jpg', alt: 'nova — life photo 7', caption: 'one of the rare moments offline' },
  { src: 'life/img8.jpg', alt: 'nova — life photo 8', caption: 'probably thinking about a project' },
];

// ===========================
// Guards
// ===========================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isTouchOnly = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const isMobile = () => window.innerWidth <= 768;

// ===========================
// DOM Ready
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  buildGallery();

  if (!isTouchOnly() && !prefersReducedMotion) {
    initCursor();
  } else {
    document.body.style.cursor = 'auto';
    const cursorEl = document.getElementById('novaCursor');
    if (cursorEl) cursorEl.style.display = 'none';
  }
});

// ===========================
// BUILD GALLERY
// ===========================
function buildGallery() {
  const track = document.getElementById('galleryTrack');
  if (!track) return;

  // Duplicate photos for seamless infinite loop
  const allPhotos = [...PHOTO_DATA, ...PHOTO_DATA];
  const loadPromises = [];

  allPhotos.forEach(photo => {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.alt = photo.alt;
    img.loading = 'eager';

    const p = new Promise(resolve => {
      img.onload  = () => img.decode ? img.decode().then(resolve).catch(resolve) : resolve();
      img.onerror = resolve;
    });
    loadPromises.push(p);
    img.src = photo.src;

    const caption = document.createElement('span');
    caption.className = 'gallery-caption';
    caption.textContent = photo.caption;
    caption.setAttribute('aria-hidden', 'true');

    item.appendChild(img);
    item.appendChild(caption);
    track.appendChild(item);
  });

  // Start scroll once images are ready (4s max fallback)
  Promise.race([
    Promise.all(loadPromises),
    new Promise(resolve => setTimeout(resolve, 4000))
  ]).then(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Double rAF — first ensures layout, second ensures paint
        initScrollLoop(track);
      });
    });
  });
}

// ===========================
// SCROLL LOOP — pure JS RAF, no CSS animation
//
// Why RAF instead of CSS animation:
// - CSS animation always starts from transform:0, so any reset jumps to top
// - RAF lets us track position continuously and clamp seamlessly
// - Manual wheel scroll just adjusts the same position variable — no restart needed
// ===========================
function initScrollLoop(track) {
  if (prefersReducedMotion) return;

  const wrap = document.getElementById('galleryWrap');
  if (!wrap) return;

  const items = Array.from(track.querySelectorAll('.gallery-item'));
  const halfCount = PHOTO_DATA.length;

  // Measure the loop point: distance from first item top to the duplicate set top
  // Use offsetTop (layout-relative) instead of getBoundingClientRect (viewport-relative)
  // so scroll position at time of measurement doesn't matter.
  const firstOffset = items[0].offsetTop;
  const splitOffset = items[halfCount].offsetTop;
  const loopHeight  = splitOffset - firstOffset;

  if (loopHeight < 50) {
    // Layout not ready yet — retry
    setTimeout(() => initScrollLoop(track), 400);
    return;
  }

  const SPEED = 0.5;           // px per frame at 60fps ≈ 30px/s — slow, elegant
  const WHEEL_SENSITIVITY = 0.8;

  let posY         = 0;        // current scroll position (px, always positive = scroll up)
  let targetY      = 0;        // where we want to be (for wheel ease-in)
  let isHovered    = false;
  let rafId        = null;

  // ---- clamp to loop range seamlessly ----
  function clamp(y) {
    y = y % loopHeight;
    if (y < 0) y += loopHeight;
    return y;
  }

  // ---- RAF loop ----
  function tick() {
    if (!isHovered) {
      // Auto-scroll: advance position
      targetY += SPEED;
    }

    // Ease posY toward targetY
    const diff = targetY - posY;

    // Handle wrap-around: if diff is bigger than half a loop, go the short way
    let delta = diff;
    if (Math.abs(diff) > loopHeight / 2) {
      delta = diff > 0 ? diff - loopHeight : diff + loopHeight;
    }

    posY += delta * 0.12;      // 0.12 = smooth lerp factor
    posY  = clamp(posY);
    targetY = clamp(targetY);

    track.style.transform = `translateY(-${posY}px)`;
    rafId = requestAnimationFrame(tick);
  }

  tick();

  // ---- Pause on hover ----
  wrap.addEventListener('mouseenter', () => { isHovered = true; });
  wrap.addEventListener('mouseleave', () => { isHovered = false; });

  // ---- Wheel scroll — scroll position directly, no timeout restart ----
  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    targetY = clamp(targetY + e.deltaY * WHEEL_SENSITIVITY);
  }, { passive: false });

  // ---- Touch scroll ----
  let touchStartY = 0;
  wrap.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    const delta = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;
    targetY = clamp(targetY + delta * WHEEL_SENSITIVITY);
  }, { passive: true });

  // ---- Cleanup on page unload ----
  window.addEventListener('pagehide', () => cancelAnimationFrame(rafId));
}

// ===========================
// CUSTOM CURSOR
// Improvements:
// - Single mousemove listener drives everything (no mouseover/out per element)
// - State determined by element under cursor via document.elementFromPoint equivalent
// - Uses pointer events for hover detection — far less noisy than mouseover/out bubbling
// ===========================
function initCursor() {
  const cursor = document.getElementById('novaCursor');
  if (!cursor) return;

  cursor.style.opacity = '0';
  cursor.style.display = 'block';

  let mouseX = -200, mouseY = -200;
  let cursorX = -200, cursorY = -200;
  let started = false;
  const SMOOTHING = 0.18;     // slightly tighter than before for crispness

  // ---- Track mouse position ----
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!started) {
      cursorX = mouseX;
      cursorY = mouseY;
      cursor.style.opacity = '1';
      started = true;
    }

    // Determine cursor state from the element under pointer
    // Using closest() on the actual target is more reliable than bubbling over/out
    const el = e.target;
    if (el.closest('.gallery-item')) {
      cursor.setAttribute('data-state', 'photo');
    } else if (el.closest('a, button, .c-tag, .tool-item')) {
      cursor.setAttribute('data-state', 'hover');
    } else {
      cursor.removeAttribute('data-state');
    }
  }, { passive: true });

  // ---- Smooth follow via RAF ----
  function animateCursor() {
    cursorX += (mouseX - cursorX) * SMOOTHING;
    cursorY += (mouseY - cursorY) * SMOOTHING;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top  = `${cursorY}px`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // ---- Hide when pointer leaves viewport ----
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    cursor.removeAttribute('data-state');
  });
  document.addEventListener('mouseenter', () => {
    if (started) cursor.style.opacity = '1';
  });

  // ---- Click pop ----
  document.addEventListener('mousedown', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(0.6)';
  });
  document.addEventListener('mouseup', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
  });
}

// ===========================
// RESIZE — re-init gallery on breakpoint change only
// ===========================
let resizeTimer;
let lastIsMobile = isMobile();

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const nowMobile = isMobile();
    if (nowMobile === lastIsMobile) return;
    lastIsMobile = nowMobile;

    const track = document.getElementById('galleryTrack');
    if (!track) return;
    track.style.transform = '';
    track.innerHTML = '';
    buildGallery();

    if (isTouchOnly()) {
      const cursorEl = document.getElementById('novaCursor');
      if (cursorEl) cursorEl.style.display = 'none';
      document.body.style.cursor = 'auto';
    }
  }, 300);
});
