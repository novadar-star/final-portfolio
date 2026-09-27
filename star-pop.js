/**
 * star-pop.js — Phase 2: hero star pop interaction
 *
 * Canvas-based particle system scoped to .hero-landing.
 * Small stars appear and pop near the cursor as it moves,
 * with a larger burst on click.
 *
 * Performance constraints (from ui-ux-pro-max audit):
 *   - Single canvas, no DOM node per particle
 *   - Max 40 concurrent particles (pool cap)
 *   - mousemove throttled: fires only every 60ms AND >8px movement
 *   - prefers-reduced-motion: fully disabled
 *   - Touch devices: disabled (no mousemove events anyway)
 *   - Hero out of viewport: RAF paused via IntersectionObserver
 *
 * Colors read from CSS custom properties (nova-tokens.css)
 * so tokens remain the single source of truth.
 */

(function () {
  'use strict';

  // ── Guard: reduced motion ────────────────────────────────────
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── Guard: touch-only devices ────────────────────────────────
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

  // ── Wait for DOM ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const hero = document.querySelector('.hero-landing');
    if (!hero) return;

    // ── Read token colors from CSS ──────────────────────────────
    // Reads once — if theme changes, colors update on next particle spawn
    function getTokenColors() {
      const style = getComputedStyle(document.documentElement);
      return [
        style.getPropertyValue('--nova-particle-color-1').trim() || '#FFD580',
        style.getPropertyValue('--nova-particle-color-2').trim() || '#FFF0EE',
        style.getPropertyValue('--nova-particle-color-3').trim() || '#FFAA50',
        style.getPropertyValue('--nova-particle-color-4').trim() || '#FF8FAB',
      ];
    }

    // ── Canvas setup ────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'z-index:2',           // above vignette layers (z-index 0), below text (z-index 1+)
    ].join(';');
    hero.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Size canvas to hero on load and resize
    function resize() {
      canvas.width  = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(hero);

    // ── Particle pool ───────────────────────────────────────────
    const MAX_PARTICLES = 40;
    const particles = [];    // active pool

    /**
     * Particle shape: a 4-point star (matching the SVG cursor star).
     * Each particle tracks its own position, velocity, scale, opacity,
     * life progress, and color.
     *
     * @param {number} x        canvas-relative x
     * @param {number} y        canvas-relative y
     * @param {number} size     outer radius in px
     * @param {boolean} isBurst true = click burst particle (larger, slower fade)
     */
    function spawnParticle(x, y, size, isBurst) {
      if (particles.length >= MAX_PARTICLES) {
        // Remove the oldest particle to stay under cap
        particles.shift();
      }

      const colors  = getTokenColors();
      const color   = colors[Math.floor(Math.random() * colors.length)];
      const angle   = Math.random() * Math.PI * 2;
      const speed   = isBurst
        ? 0.6 + Math.random() * 1.0
        : 0.3 + Math.random() * 0.6;

      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isBurst ? 0.8 : 0.4), // slight upward bias
        size,
        color,
        // Life runs 0 → 1 over the particle's lifetime
        life: 0,
        // isBurst particles live ~320ms, normal ~220ms (matches --nova-duration-pop-*)
        duration: isBurst ? 320 : 220,
        born: performance.now(),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
      });
    }

    /**
     * Draw a 4-point star at (cx, cy) with given outer radius.
     * Inner radius = outer * 0.4 for the "pointy" look.
     */
    function drawStar(cx, cy, outerR, rotation) {
      const points    = 4;
      const innerR    = outerR * 0.40;
      const step      = Math.PI / points;

      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const r     = i % 2 === 0 ? outerR : innerR;
        const theta = i * step + rotation - Math.PI / 2;
        const px    = cx + Math.cos(theta) * r;
        const py    = cy + Math.sin(theta) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    // ── RAF loop ────────────────────────────────────────────────
    let rafId    = null;
    let isActive = true;   // paused when hero leaves viewport

    function tick(now) {
      if (!isActive) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p        = particles[i];
        const elapsed  = now - p.born;
        p.life         = Math.min(elapsed / p.duration, 1);

        // Remove dead particles
        if (p.life >= 1) {
          particles.splice(i, 1);
          continue;
        }

        // Easing:
        //   scale:   ease-out quad — grows fast, settles
        //   opacity: ease-out on entry (sqrt curve), linear fade-out
        //   Emil: stars should pop instantly — ease-out on entry
        const scaleProgress   = 1 - Math.pow(1 - p.life, 2);  // ease-out quad
        const opacityProgress = p.life < 0.3
          ? Math.pow(p.life / 0.3, 0.5)           // ease-out (sqrt) fade-in: fast burst
          : 1 - ((p.life - 0.3) / 0.7);           // linear fade-out remaining 70%

        const scale   = 0.2 + scaleProgress * 1.1;  // 0.2 → 1.3
        const opacity = Math.max(0, opacityProgress * 0.85);

        // Move
        p.x        += p.vx;
        p.y        += p.vy;
        p.vy       += 0.015;   // gentle gravity
        p.rotation += p.rotSpeed;

        // Draw
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle   = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = p.size * 2.5;
        drawStar(p.x, p.y, p.size * scale, p.rotation);
        ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    // Pause RAF when hero is out of viewport — saves CPU when scrolled away
    const heroObserver = new IntersectionObserver(
      ([entry]) => { isActive = entry.isIntersecting; },
      { threshold: 0 }
    );
    heroObserver.observe(hero);

    // ── Mouse interaction ────────────────────────────────────────

    // Convert page coords → canvas-relative coords
    function toCanvas(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    // mousemove: throttled to 60ms, only fires if cursor moved >8px
    let lastMoveTime = 0;
    let lastMoveX    = -999;
    let lastMoveY    = -999;

    function onMouseMove(e) {
      const now  = performance.now();
      if (now - lastMoveTime < 60) return;

      const dx = e.clientX - lastMoveX;
      const dy = e.clientY - lastMoveY;
      if (Math.sqrt(dx * dx + dy * dy) < 8) return;

      lastMoveTime = now;
      lastMoveX    = e.clientX;
      lastMoveY    = e.clientY;

      const { x, y } = toCanvas(e.clientX, e.clientY);
      const size      = 2.5 + Math.random() * 2.5;  // 2.5–5px radius
      spawnParticle(x, y, size, false);
    }

    // click: burst of 5 larger stars
    function onClick(e) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      const count     = 5;
      for (let i = 0; i < count; i++) {
        const size = 4 + Math.random() * 4;           // 4–8px radius
        spawnParticle(x, y, size, true);
      }
    }

    hero.addEventListener('mousemove', onMouseMove, { passive: true });
    hero.addEventListener('click',     onClick,     { passive: true });

    // ── Cleanup ──────────────────────────────────────────────────
    // If the hero element is ever removed (e.g. SPA navigation),
    // cancel RAF and disconnect observers.
    const cleanupObserver = new MutationObserver(() => {
      if (!document.contains(hero)) {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        heroObserver.disconnect();
        cleanupObserver.disconnect();
      }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });
  }

})();
