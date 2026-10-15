/**
 * star-pop.js — Phase 2: hero star pop interaction
 *
 * Canvas-based particle system scoped to .hero-landing.
 * No longer follows the cursor. It exposes one function,
 * window.novaStarBurst(clientX, clientY, count), which the
 * "run the pipeline" interaction calls when a run finishes.
 * The RAF loop only runs while particles are alive.
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
    let rafId    = null;   // null = loop asleep
    let isActive = true;   // paused when hero leaves viewport

    function tick(now) {
      if (!isActive) {
        particles.length = 0;   // off-screen: drop them and sleep
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafId = null;
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

      // Sleep when nothing is left to draw
      if (particles.length) {
        rafId = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafId = null;
      }
    }

    function wake() {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    }

    // Pause RAF when hero is out of viewport — saves CPU when scrolled away
    const heroObserver = new IntersectionObserver(
      ([entry]) => { isActive = entry.isIntersecting; },
      { threshold: 0 }
    );
    heroObserver.observe(hero);

    // ── Public burst ─────────────────────────────────────────────
    // Called by the pipeline run in main.js when the parser finishes.
    function toCanvas(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    window.novaStarBurst = function (clientX, clientY, count) {
      const { x, y } = toCanvas(clientX, clientY);
      const n = count || 6;
      for (let i = 0; i < n; i++) {
        spawnParticle(x, y, 4 + Math.random() * 4, true);
      }
      wake();
    };

    // ── Cleanup ──────────────────────────────────────────────────
    // If the hero element is ever removed (e.g. SPA navigation),
    // cancel RAF and disconnect observers.
    const cleanupObserver = new MutationObserver(() => {
      if (!document.contains(hero)) {
        if (rafId) cancelAnimationFrame(rafId);
        ro.disconnect();
        heroObserver.disconnect();
        cleanupObserver.disconnect();
      }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });
  }

})();
