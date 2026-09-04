// ===========================
// about.js — nova. about me page
// ===========================

// ===========================
// PHOTO DATA — edit here to change photos and captions
// paths are relative to the site root
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

// Only treat as touch-only if there is NO fine pointer at all.
// This correctly keeps the custom cursor on laptops with touchscreens.
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
    // Restore default cursor
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

  const allPhotos = [...PHOTO_DATA, ...PHOTO_DATA]; // duplicate for infinite loop
  const loadPromises = [];

  allPhotos.forEach(photo => {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.alt = photo.alt;
    img.loading = 'eager';
    // decode() ensures natural dimensions are ready before we measure
    const p = new Promise(resolve => {
      img.onload = () => img.decode ? img.decode().then(resolve).catch(resolve) : resolve();
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

  // Wait for all images decoded, fallback after 4s
  Promise.race([
    Promise.all(loadPromises),
    new Promise(resolve => setTimeout(resolve, 4000))
  ]).then(() => {
    // One more rAF to ensure layout is painted
    requestAnimationFrame(() => {
      if (isMobile()) {
        initHorizontalScroll(track);
      } else {
        initVerticalScroll(track);
      }
    });
  });
}

// ===========================
// VERTICAL SCROLL (desktop)
// ===========================
function initVerticalScroll(track) {
  if (prefersReducedMotion) return;

  const wrap = document.getElementById('galleryWrap');
  if (!wrap) return;

  const items = Array.from(track.querySelectorAll('.gallery-item'));
  const halfCount = PHOTO_DATA.length;

  // Measure true painted height of first set
  let halfHeight = 0;
  for (let i = 0; i < halfCount; i++) {
    halfHeight += items[i].getBoundingClientRect().height;
  }
  halfHeight += halfCount * 5; // gap

  if (halfHeight < 50) {
    // Layout hasn't painted yet — retry
    setTimeout(() => initVerticalScroll(track), 400);
    return;
  }

  // Fade the gallery in smoothly once we know it's ready
  wrap.style.opacity = '0';
  wrap.style.transition = 'opacity 0.6s ease';
  requestAnimationFrame(() => { wrap.style.opacity = '1'; });

  const duration = halfHeight / 55;
  track.style.setProperty('--scroll-distance', `-${halfHeight}px`);
  track.style.animation = `scrollUp ${duration}s linear infinite`;

  let isManualScrolling = false;
  let manualScrollTimeout = null;

  wrap.addEventListener('mouseenter', () => {
    if (!isManualScrolling) track.classList.add('paused');
  });
  wrap.addEventListener('mouseleave', () => {
    if (!isManualScrolling) track.classList.remove('paused');
  });

  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    track.classList.add('paused');
    isManualScrolling = true;

    const matrix = new DOMMatrix(getComputedStyle(track).transform);
    let currentY = matrix.m42;
    currentY -= e.deltaY * 0.6;

    if (currentY < -halfHeight) currentY += halfHeight;
    if (currentY > 0) currentY -= halfHeight;

    track.style.animation = 'none';
    track.style.transform = `translateY(${currentY}px)`;

    clearTimeout(manualScrollTimeout);
    manualScrollTimeout = setTimeout(() => {
      isManualScrolling = false;
      track.style.transform = '';
      track.style.animation = `scrollUp ${duration}s linear infinite`;
      track.classList.remove('paused');
    }, 1200);
  }, { passive: false });
}

// ===========================
// HORIZONTAL SCROLL (mobile)
// ===========================
function initHorizontalScroll(track) {
  if (prefersReducedMotion) return;

  const wrap = document.getElementById('galleryWrap');
  if (!wrap) return;

  const items = Array.from(track.querySelectorAll('.gallery-item'));
  const halfCount = PHOTO_DATA.length;

  let halfWidth = 0;
  for (let i = 0; i < halfCount; i++) {
    halfWidth += items[i].getBoundingClientRect().width;
  }
  halfWidth += halfCount * 8; // gap

  if (halfWidth < 10) {
    setTimeout(() => initHorizontalScroll(track), 500);
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes scrollLeft {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-${halfWidth}px); }
    }
  `;
  document.head.appendChild(styleEl);

  const duration = halfWidth / 35;
  track.style.animation = `scrollLeft ${duration}s linear infinite`;

  wrap.addEventListener('touchstart', () => {
    track.classList.add('paused');
  }, { passive: true });

  wrap.addEventListener('touchend', () => {
    setTimeout(() => track.classList.remove('paused'), 1000);
  }, { passive: true });
}

// ===========================
// CUSTOM CURSOR
// ===========================
function initCursor() {
  const cursor = document.getElementById('novaCursor');
  if (!cursor) return;

  // Show cursor element (starts hidden until mouse moves)
  cursor.style.opacity = '0';
  cursor.style.display = 'block';

  let mouseX = -100;
  let mouseY = -100;
  let cursorX = -100;
  let cursorY = -100;
  let started = false;
  const SMOOTHING = 0.22;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!started) {
      // Snap to position on first move — no swooping in from corner
      cursorX = mouseX;
      cursorY = mouseY;
      cursor.style.opacity = '1';
      started = true;
    }
  });

  function animateCursor() {
    cursorX += (mouseX - cursorX) * SMOOTHING;
    cursorY += (mouseY - cursorY) * SMOOTHING;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Gallery items → "photo" state
  // Use event delegation — items are dynamically rendered
  const galleryWrap = document.getElementById('galleryWrap');
  if (galleryWrap) {
    galleryWrap.addEventListener('mouseover', e => {
      if (e.target.closest('.gallery-item')) {
        cursor.setAttribute('data-state', 'photo');
      }
    });
    galleryWrap.addEventListener('mouseout', e => {
      if (e.target.closest('.gallery-item')) {
        cursor.removeAttribute('data-state');
      }
    });
  }

  // Clickable elements → "hover" state
  document.addEventListener('mouseover', e => {
    const target = e.target.closest('a, button, .c-tag, .tool-item');
    if (target && !cursor.getAttribute('data-state')) {
      cursor.setAttribute('data-state', 'hover');
    }
  });
  document.addEventListener('mouseout', e => {
    const target = e.target.closest('a, button, .c-tag, .tool-item');
    if (target && cursor.getAttribute('data-state') === 'hover') {
      cursor.removeAttribute('data-state');
    }
  });

  // Hide when leaving viewport
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    if (started) cursor.style.opacity = '1';
  });

  // Click pop
  document.addEventListener('mousedown', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(0.65)';
  });
  document.addEventListener('mouseup', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
  });
}

// ===========================
// RESIZE — re-init gallery on breakpoint change
// ===========================
let resizeTimer;
let lastIsMobile = isMobile();

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const nowMobile = isMobile();
    if (nowMobile === lastIsMobile) return; // only re-init on breakpoint cross
    lastIsMobile = nowMobile;

    const track = document.getElementById('galleryTrack');
    if (!track) return;
    track.style.animation = 'none';
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
