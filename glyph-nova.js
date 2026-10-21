// glyph-nova.js — the star at the bottom of the homepage, drawn in characters.
//
// A four-point star (the same shape as the outcome stars on project cards)
// rendered as a grid of glyphs on a canvas. Brightness picks the glyph:
// faint cells are dots, the core is ✦. It shimmers slowly while on screen.
//
// Click or tap it (or press Enter when it's focused) and it goes nova:
// it flashes outward, a ring of light travels across the grid, and the
// star springs back to its usual size.
//
// - Only animates while visible; stops completely when scrolled away.
// - prefers-reduced-motion: draws a still star, clicks do a quick flash only.
// - Colors come from the page's own tokens and follow the theme toggle.
(function () {
  'use strict';

  var button = document.querySelector('.glyph-nova');
  if (!button) return;
  var canvas = button.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // brightness ramp, dim to bright
  var RAMP = ['·', '·', '.', ':', '+', '+', '*', '*', '✦'];

  var cell = 11;          // grid cell size in css px
  var cols = 0, rows = 0;
  var W = 0, H = 0, dpr = 1;
  var phases = [];        // per-cell shimmer offsets
  var sparks = [];        // stray background twinkles
  var bursts = [];        // active novas
  var colors = {};
  var visible = false;
  var raf = 0;
  var start = performance.now();
  var hint = document.querySelector('.glyph-nova-hint');

  // ---- colors from the theme tokens ----
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    colors.body = (cs.getPropertyValue('--nova-accent') || '#C2607A').trim();
    colors.core = dark ? '#FFD580' : '#B0405E';
    colors.faint = (cs.getPropertyValue('--ink-3') || '#8A8A84').trim();
  }

  // ---- sizing ----
  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cell = W < 360 ? 10 : 11;
    cols = Math.floor(W / cell);
    rows = Math.floor(H / cell);

    // stable pseudo-random values so the star looks the same on each load
    phases = new Array(cols * rows);
    var seed = 7;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < phases.length; i++) phases[i] = rand() * Math.PI * 2;
    sparks = [];
    for (var s = 0; s < Math.round(cols * rows * 0.018); s++) {
      sparks.push({ i: Math.floor(rand() * cols), j: Math.floor(rand() * rows), p: rand() * 6.28 });
    }
    ctx.font = '500 ' + Math.round(cell * 0.92) + 'px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    draw(performance.now());
  }

  // ---- the shape ----
  // four-point star: |x|^0.5 + |y|^0.5 gives concave sides and sharp points
  function starField(x, y, r) {
    var ax = Math.abs(x) / r, ay = Math.abs(y) / r;
    var d = Math.pow(Math.sqrt(ax) + Math.sqrt(ay), 2);
    var main = 1 - d;

    // a smaller star turned 45°, so the glow has secondary points
    var rx = (x + y) * 0.7071, ry = (x - y) * 0.7071;
    var bx = Math.abs(rx) / (r * 0.5), by = Math.abs(ry) / (r * 0.5);
    var d2 = Math.pow(Math.sqrt(bx) + Math.sqrt(by), 2);
    var minor = (1 - d2) * 0.75;

    var dist = Math.sqrt(x * x + y * y) / r;
    var glow = Math.exp(-(dist * dist) / 0.05) * 0.55;

    // the power curve stretches brightness out along the points
    return Math.pow(Math.max(main, minor, 0), 0.55) + glow;
  }

  // ---- the nova: a damped spring on the star's size, plus a travelling ring ----
  function novaState(now) {
    var scale = 1, flash = 0;
    for (var b = bursts.length - 1; b >= 0; b--) {
      var t = (now - bursts[b].t0) / 1000;
      if (t > 2.4) { bursts.splice(b, 1); continue; }
      scale += 0.5 * Math.exp(-3.4 * t) * Math.cos(7.5 * t);
      flash += Math.exp(-7 * t);
    }
    return { scale: scale, flash: Math.min(flash, 1.2) };
  }

  function draw(now) {
    var t = (now - start) / 1000;
    var still = reduceMotion.matches;
    var cx = W / 2, cy = H / 2;
    var base = Math.min(W, H) * 0.47;
    var nova = novaState(now);
    var r = base * nova.scale;

    ctx.clearRect(0, 0, W, H);

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var px = i * cell + cell / 2;
        var py = j * cell + cell / 2;
        var x = px - cx, y = py - cy;

        var v = starField(x, y, r);
        v += nova.flash * Math.exp(-((x * x + y * y) / (base * base)) * 2.2) * 0.9;

        // the travelling ring and the outward push
        var ox = 0, oy = 0;
        for (var b = 0; b < bursts.length; b++) {
          var bt = (now - bursts[b].t0) / 1000;
          var dx = px - bursts[b].x, dy = py - bursts[b].y;
          var dd = Math.sqrt(dx * dx + dy * dy) || 1;
          var ringR = bt * 520;
          var ring = Math.exp(-Math.pow((dd - ringR) / 26, 2)) * Math.max(0, 1 - bt / 1.4);
          v += ring * 0.85;
          ox += (dx / dd) * ring * 7;
          oy += (dy / dd) * ring * 7;
        }

        if (!still) v *= 0.88 + 0.12 * Math.sin(t * 1.4 + phases[j * cols + i]);
        if (v < 0.06) continue;

        var level = Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1) * 1.05));
        ctx.globalAlpha = Math.min(1, 0.22 + v * 0.85);
        ctx.fillStyle = v > 0.82 ? colors.core : colors.body;
        ctx.fillText(RAMP[level], px + ox, py + oy);
      }
    }

    // stray twinkles in the empty space
    ctx.fillStyle = colors.faint;
    for (var s = 0; s < sparks.length; s++) {
      var sp = sparks[s];
      var a = still ? 0.35 : 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.9 + sp.p));
      ctx.globalAlpha = a;
      ctx.fillText('·', sp.i * cell + cell / 2, sp.j * cell + cell / 2);
    }
    ctx.globalAlpha = 1;
  }

  // ---- loop: runs only while visible, and only as long as there's motion ----
  function frame(now) {
    draw(now);
    if (visible && (!reduceMotion.matches || bursts.length)) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
    }
  }
  function startLoop() { if (!raf) raf = requestAnimationFrame(frame); }

  // ---- interaction ----
  function goNova(x, y) {
    if (bursts.length >= 4) bursts.shift();
    bursts.push({ t0: performance.now(), x: x, y: y });
    if (hint) hint.classList.add('is-done');
    if (reduceMotion.matches) {
      // no travelling motion: one bright frame, then back to still
      draw(performance.now());
      setTimeout(function () { bursts = []; draw(performance.now()); }, 160);
      return;
    }
    startLoop();
  }

  button.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    // keyboard clicks report 0,0, so those go off from the middle
    var fromPointer = e.detail > 0 && e.clientX;
    goNova(
      fromPointer ? e.clientX - rect.left : W / 2,
      fromPointer ? e.clientY - rect.top : H / 2
    );
  });

  // ---- setup ----
  readColors();
  new MutationObserver(function () { readColors(); draw(performance.now()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) startLoop();
    }, { rootMargin: '80px' }).observe(button);
  } else {
    visible = true;
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }

  // redraw once the real font arrives, so glyph widths are right
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); });
  resize();
  if (visible) startLoop();
})();
