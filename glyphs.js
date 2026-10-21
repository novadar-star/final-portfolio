// glyphs.js — sky objects drawn in characters, one per page.
//
// Every piece is a grid of glyphs on a canvas: faint cells are dots, bright
// cells are ✦. Brightness comes from a "field" that each variant defines.
// Each one shimmers slowly while on screen and does one thing when clicked
// (or Enter when focused), and that one thing explains what the object is:
//
//   nova           (home)       flashes outward, a ring crosses the grid,
//                                then it springs back to size
//   nebula         (about)      gas collapses inward and a new star forms
//                                where you clicked. it stays.
//   constellation  (projects)   the real Southern Cross; a pulse travels
//                                star to star along the lines
//
// The nova is the say-hi closing on every page; the others sit near the
// top of their page.
//
// Markup: <button data-glyph="nova|nebula|constellation"><canvas>
// Optional data-hint="<selector>" fades a hint out after the first click.
//
// Only animates while visible; stops completely when scrolled away.
// prefers-reduced-motion: no travelling motion, clicks jump to the result.
// Colors come from the page's own tokens and follow the theme toggle.
(function () {
  'use strict';

  var pieces = document.querySelectorAll('[data-glyph]');
  if (!pieces.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var RAMP = ['·', '·', '.', ':', '+', '+', '*', '*', '✦'];

  // ---- shared shapes ----

  // four-point star: |x|^0.5 + |y|^0.5 gives concave sides and sharp points
  function starShape(x, y, r) {
    var ax = Math.abs(x) / r, ay = Math.abs(y) / r;
    var main = 1 - Math.pow(Math.sqrt(ax) + Math.sqrt(ay), 2);
    var rx = (x + y) * 0.7071, ry = (x - y) * 0.7071;
    var bx = Math.abs(rx) / (r * 0.5), by = Math.abs(ry) / (r * 0.5);
    var minor = (1 - Math.pow(Math.sqrt(bx) + Math.sqrt(by), 2)) * 0.75;
    var d = Math.sqrt(x * x + y * y) / r;
    var glow = Math.exp(-(d * d) / 0.05) * 0.55;
    return Math.pow(Math.max(main, minor, 0), 0.55) + glow;
  }

  function seeded(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  }

  // smooth value noise, for the nebula
  function makeNoise(seed) {
    var rand = seeded(seed), perm = [];
    for (var i = 0; i < 256; i++) perm[i] = rand();
    function h(x, y) { return perm[(x * 57 + y * 131) & 255]; }
    function smooth(t) { return t * t * (3 - 2 * t); }
    function n(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      var u = smooth(xf), v = smooth(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    return function fbm(x, y) {
      var s = 0, amp = 0.5;
      for (var o = 0; o < 4; o++) { s += amp * n(x, y); x *= 2.03; y *= 2.03; amp *= 0.5; }
      return s;
    };
  }

  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    var cx = ax + t * dx - px, cy = ay + t * dy - py;
    return Math.sqrt(cx * cx + cy * cy);
  }

  // ---- the variants ----
  // each returns { field(px, py, t, now, out), activate(x, y, now), busy(now) }
  // field writes brightness to out.v and an optional nudge to out.ox / out.oy.
  // coordinates are canvas px; g holds the piece's size.

  var VARIANTS = {

    nova: function (g) {
      var bursts = [];
      function state(now) {
        var scale = 1, flash = 0;
        for (var b = bursts.length - 1; b >= 0; b--) {
          var t = (now - bursts[b].t0) / 1000;
          if (t > 2.4) { bursts.splice(b, 1); continue; }
          scale += 0.5 * Math.exp(-3.4 * t) * Math.cos(7.5 * t);
          flash += Math.exp(-7 * t);
        }
        return { scale: scale, flash: Math.min(flash, 1.2) };
      }
      var cur = { scale: 1, flash: 0 };
      return {
        frame: function (now) { cur = state(now); },
        field: function (px, py, t, now, out) {
          var base = Math.min(g.W, g.H) * 0.47;
          var x = px - g.W / 2, y = py - g.H / 2;
          var v = starShape(x, y, base * cur.scale);
          v += cur.flash * Math.exp(-((x * x + y * y) / (base * base)) * 2.2) * 0.9;
          for (var b = 0; b < bursts.length; b++) {
            var bt = (now - bursts[b].t0) / 1000;
            var dx = px - bursts[b].x, dy = py - bursts[b].y;
            var dd = Math.sqrt(dx * dx + dy * dy) || 1;
            var ring = Math.exp(-Math.pow((dd - bt * 520) / 26, 2)) * Math.max(0, 1 - bt / 1.4);
            v += ring * 0.85;
            out.ox += (dx / dd) * ring * 7;
            out.oy += (dy / dd) * ring * 7;
          }
          out.v = v;
        },
        activate: function (x, y, now) {
          if (bursts.length >= 4) bursts.shift();
          bursts.push({ t0: now, x: x, y: y });
        },
        busy: function () { return bursts.length > 0; },
        settle: function () { bursts = []; }
      };
    },

    nebula: function (g) {
      var fbm = makeNoise(11);
      var born = [];   // stars the visitor has made; they stay
      var FORM = 1.3;  // seconds for the gas to collapse
      return {
        field: function (px, py, t, now, out) {
          var nx = px / g.W, ny = py / g.H;
          // the cloud: drifting noise, kept inside a soft, lopsided oval
          var ex = (nx - 0.5) / 0.48, ey = (ny - 0.52) / 0.4;
          var mask = Math.max(0, 1 - Math.pow(ex * ex + ey * ey, 0.8));
          var warp = fbm(nx * 2.2 + 3.1, ny * 2.2) * 1.4;
          var gas = fbm(nx * 3.2 + warp + t * 0.015, ny * 3.2 - warp * 0.5);
          // only the densest ~35% of the gas shows, so it reads as wisps,
          // not a dot grid (measured: this noise has a median near 0.57)
          var dense = Math.max(0, Math.min(1, (gas - 0.6) / 0.13));
          var v = dense * dense * (3 - 2 * dense) * mask * 1.1;

          for (var i = 0; i < born.length; i++) {
            var s = born[i];
            var k = Math.min(1, (now - s.t0) / 1000 / FORM);
            var dx = px - s.x, dy = py - s.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            // gas thins where the star pulled it in
            v *= 1 - 0.7 * k * Math.exp(-(d * d) / (g.W * g.W * 0.006));
            // a ring of gas falling inward while it forms
            if (k < 1) {
              var ringR = (1 - Math.pow(k, 0.7)) * g.W * 0.32;
              v += Math.exp(-Math.pow((d - ringR) / 7, 2)) * 0.55 * (1 - k);
              out.ox -= (dx / (d || 1)) * (1 - k) * 2;
              out.oy -= (dy / (d || 1)) * (1 - k) * 2;
            }
            // the new star, growing in with a little overshoot
            var grow = k < 1 ? k * (1 + 0.25 * Math.sin(k * Math.PI)) : 1;
            v += starShape(dx, dy, g.W * 0.16 * grow) * grow;
          }
          out.v = v;
        },
        activate: function (x, y, now) {
          if (born.length >= 6) born.shift();
          born.push({ t0: reduceMotion.matches ? now - FORM * 1000 : now, x: x, y: y });
        },
        busy: function (now) {
          for (var i = 0; i < born.length; i++) if (now - born[i].t0 < FORM * 1000) return true;
          return false;
        }
      };
    },

    constellation: function (g) {
      // Crux, the Southern Cross. Real positions and magnitudes (Hipparcos),
      // projected flat, east on the left as it looks in the sky.
      var NODES = [[-0.399, 0.018, 1.25], [0.351, -0.155, 2.79], [0.073, 0.62, 0.77], [-0.025, -0.459, 1.59]];
      var EDGES = [[0, 1], [2, 3]];
      var FIELD = [[0.946, 0.352, 4.11], [0.805, 0.808, 4.3], [0.549, 0.687, 4.32], [0.526, 0.658, 4.72],
        [0.451, 0.914, 4.14], [0.232, 0.788, 4.06], [0.288, -0.81, 5.01], [0.196, 0.136, 3.59],
        [0.177, -0.355, 5.38], [0.062, -0.12, 5.38], [-0.268, 0.01, 4.91], [-0.259, 0.619, 5.27],
        [-0.338, 0.247, 4.69], [-0.404, -0.56, 4.62], [-0.597, -0.421, 4.03], [-0.565, -0.067, 4.62],
        [-0.636, -0.479, 5.34], [-0.949, 0.122, 4.58], [0.932, -0.417, 5.56], [0.797, -0.557, 5.44]];
      var LEG = 0.5;      // seconds for the pulse to cross one line
      var runs = [];
      function pos(n) { var s = Math.min(g.W, g.H) * 0.5; return [g.W / 2 + n[0] * s, g.H / 2 + n[1] * s]; }

      function plan(x, y) {
        // start at the star nearest the click, run its line, then the other
        var near = 0, best = 1e9;
        NODES.forEach(function (n, i) {
          var p = pos(n), d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
          if (d < best) { best = d; near = i; }
        });
        var legs = [];
        var first = EDGES.filter(function (e) { return e[0] === near || e[1] === near; })[0];
        legs.push(first[0] === near ? first : [first[1], first[0]]);
        EDGES.forEach(function (e) {
          if (e === first) return;
          var a = pos(NODES[e[0]]), b = pos(NODES[e[1]]);
          var da = (a[0] - x) * (a[0] - x) + (a[1] - y) * (a[1] - y);
          var db = (b[0] - x) * (b[0] - x) + (b[1] - y) * (b[1] - y);
          legs.push(da <= db ? e : [e[1], e[0]]);
        });
        return legs;
      }

      return {
        field: function (px, py, t, now, out) {
          var s = Math.min(g.W, g.H) * 0.5, v = 0, i;
          // the lines, as a trail of dots
          for (i = 0; i < EDGES.length; i++) {
            var a = pos(NODES[EDGES[i][0]]), b = pos(NODES[EDGES[i][1]]);
            if (segDist(px, py, a[0], a[1], b[0], b[1]) < g.cell * 0.55) v = Math.max(v, 0.42);
          }
          // the four named stars, sized by brightness
          for (i = 0; i < NODES.length; i++) {
            var p = pos(NODES[i]);
            v = Math.max(v, starShape(px - p[0], py - p[1], s * (0.36 - NODES[i][2] * 0.065)));
          }
          // their fainter neighbours
          for (i = 0; i < FIELD.length; i++) {
            var q = pos(FIELD[i]);
            var d2 = (px - q[0]) * (px - q[0]) + (py - q[1]) * (py - q[1]);
            v = Math.max(v, Math.exp(-d2 / (g.cell * g.cell * 0.6)) * (0.72 - FIELD[i][2] * 0.1));
          }
          // pulses running along the lines
          for (var r = 0; r < runs.length; r++) {
            var rt = (now - runs[r].t0) / 1000;
            for (var L = 0; L < runs[r].legs.length; L++) {
              var leg = runs[r].legs[L], lt = rt / LEG - L;
              var A = pos(NODES[leg[0]]), B = pos(NODES[leg[1]]);
              if (lt > 0 && lt < 1.3) {
                var k = Math.min(1, lt);
                var hx = A[0] + (B[0] - A[0]) * k, hy = A[1] + (B[1] - A[1]) * k;
                var hd = Math.sqrt((px - hx) * (px - hx) + (py - hy) * (py - hy));
                var fade = lt < 1 ? 1 : 1 - (lt - 1) / 0.3;
                v += Math.exp(-(hd * hd) / (g.cell * g.cell * 1.6)) * 1.1 * fade;
                // the line it has already lit stays bright for a moment
                if (segDist(px, py, A[0], A[1], hx, hy) < g.cell * 0.6) v = Math.max(v, 0.55 * fade);
              }
              // each star flashes when the pulse lands on it
              var landed = lt - 1;
              if (landed > 0 && landed < 0.8) {
                var dB = Math.sqrt((px - B[0]) * (px - B[0]) + (py - B[1]) * (py - B[1]));
                v += Math.exp(-landed * 5) * Math.exp(-(dB * dB) / (s * s * 0.03)) * 0.9;
              }
              if (L === 0 && lt > -0.05 && lt < 0.6) {
                var dA = Math.sqrt((px - A[0]) * (px - A[0]) + (py - A[1]) * (py - A[1]));
                v += Math.exp(-lt * 5) * Math.exp(-(dA * dA) / (s * s * 0.03)) * 0.9;
              }
            }
          }
          out.v = v;
        },
        activate: function (x, y, now) {
          if (runs.length >= 2) runs.shift();
          runs.push({ t0: now, legs: plan(x, y) });
        },
        busy: function (now) {
          runs = runs.filter(function (r) { return (now - r.t0) / 1000 < r.legs.length * LEG + 1.2; });
          return runs.length > 0;
        },
        settle: function () { runs = []; }
      };
    }
  };

  // ---- the shared renderer ----

  function setup(button) {
    var canvas = button.querySelector('canvas');
    var ctx = canvas && canvas.getContext('2d');
    var make = VARIANTS[button.getAttribute('data-glyph')];
    if (!ctx || !make) return;

    var g = { W: 1, H: 1, cell: 11 };
    var variant = make(g);
    var hintSel = button.getAttribute('data-hint');
    var hint = hintSel ? document.querySelector(hintSel) : null;
    var cols = 0, rows = 0, dpr = 1, phases = [], sparks = [];
    var colors = {}, visible = false, raf = 0, start = performance.now();
    var out = { v: 0, ox: 0, oy: 0 };

    function readColors() {
      var cs = getComputedStyle(document.documentElement);
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      colors.body = (cs.getPropertyValue('--nova-accent') || '#C2607A').trim();
      colors.core = dark ? '#FFD580' : (cs.getPropertyValue('--nova-ember') || '#D9702A').trim();
      colors.gold = (cs.getPropertyValue('--nova-gold') || '#C98A12').trim();
      colors.faint = colors.gold;
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      g.W = Math.max(1, Math.round(rect.width));
      g.H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = g.W * dpr;
      canvas.height = g.H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.cell = g.W < 360 ? 10 : 11;
      cols = Math.floor(g.W / g.cell);
      rows = Math.floor(g.H / g.cell);
      var rand = seeded(7);
      phases = new Array(cols * rows);
      for (var i = 0; i < phases.length; i++) phases[i] = rand() * Math.PI * 2;
      sparks = [];
      var n = Math.round(cols * rows * 0.014);
      for (var s = 0; s < n; s++) sparks.push({ i: Math.floor(rand() * cols), j: Math.floor(rand() * rows), p: rand() * 6.28 });
      ctx.font = '500 ' + Math.round(g.cell * 0.92) + 'px "Space Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      draw(performance.now());
    }

    function draw(now) {
      var t = (now - start) / 1000, still = reduceMotion.matches;
      if (variant.frame) variant.frame(now);
      ctx.clearRect(0, 0, g.W, g.H);
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var px = i * g.cell + g.cell / 2, py = j * g.cell + g.cell / 2;
          out.v = 0; out.ox = 0; out.oy = 0;
          variant.field(px, py, t, now, out);
          var v = out.v;
          if (!still) v *= 0.88 + 0.12 * Math.sin(t * 1.4 + phases[j * cols + i]);
          if (v < 0.06) continue;
          var level = Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1) * 1.05));
          ctx.globalAlpha = Math.min(1, 0.22 + v * 0.85);
          // mostly rose, with about one in eight brighter glyphs in gold
          var speck = level >= 4 && phases[j * cols + i] < 0.8;
          ctx.fillStyle = v > 0.82 ? colors.core : (speck ? colors.gold : colors.body);
          ctx.fillText(RAMP[level], px + out.ox, py + out.oy);
        }
      }
      ctx.fillStyle = colors.faint;
      for (var s = 0; s < sparks.length; s++) {
        var sp = sparks[s];
        ctx.globalAlpha = still ? 0.35 : 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.9 + sp.p));
        ctx.fillText('·', sp.i * g.cell + g.cell / 2, sp.j * g.cell + g.cell / 2);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      draw(now);
      var moving = variant.busy(now);
      if (visible && (!reduceMotion.matches || moving)) raf = requestAnimationFrame(frame);
      else raf = 0;
    }
    function startLoop() { if (!raf) raf = requestAnimationFrame(frame); }

    button.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect();
      // keyboard clicks report no position, so those start from the middle
      var fromPointer = e.detail > 0 && e.clientX;
      var x = fromPointer ? (e.clientX - rect.left) * (g.W / rect.width) : g.W / 2;
      var y = fromPointer ? (e.clientY - rect.top) * (g.H / rect.height) : g.H / 2;
      var now = performance.now();
      variant.activate(x, y, now);
      if (hint) hint.classList.add('is-done');
      if (reduceMotion.matches) {
        // no travelling motion: show the result for a beat, then settle
        draw(now);
        setTimeout(function () { if (variant.settle) variant.settle(); draw(performance.now()); }, 220);
        return;
      }
      startLoop();
    });

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

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    resize();
    if (visible) startLoop();
  }

  Array.prototype.forEach.call(pieces, setup);
})();
