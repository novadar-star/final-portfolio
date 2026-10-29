// starsky.js — the hero's star sky, drawn in code instead of a photo.
//
// Each star is a soft five-point shape with glowing bands from the
// outside in: red-orange, yellow, cream, then a pink centre. The whole
// thing is drawn small, blurred, and scaled up by the browser, which
// keeps it soft and cheap. Grain and halftone dots are CSS layers on top
// (story.css), so the texture stays crisp at any size.
//
// Markup:
//   <canvas data-starsky="hero">     the full sky, behind the hero
//   <canvas data-starsky="remnant" data-star="0|1|2">
//                                    one star on a clear background, for
//                                    the remnants that stay as you scroll
//
// Every star is fixed (no randomness per visit), so the sky looks the
// same every time and the first frame is always a good drawing.
(function () {
  'use strict';

  // ---- palette, sampled from the original photo ----
  var SKY = [
    [0.00, 0.00, '#E02A82'],   // top left: magenta
    [1.00, 0.00, '#EE3346'],   // top right: hot red-pink
    [0.00, 1.00, '#F6D6DA'],   // bottom left: pale pink
    [1.00, 1.00, '#EC7C9C'],   // bottom right: pink
  ];
  var BANDS = {
    rim:    '#F03C24',   // red-orange outer glow
    gold:   '#F7BE2C',   // yellow
    cream:  '#FFF8EA',   // near-white
    centre: '#E8708E',   // pink heart
  };

  // the stars: x, y and size as parts of the sky's width; turn in degrees.
  // puff = how round the points are; lean = per-point jitter (fixed).
  var STARS = [
    { x: 0.13, y: 0.66, r: 0.34, turn: -26, inner: 0.44, centre: '#EA92AE',
      lean: [1.16, 0.94, 1.08, 0.9, 1.04] },
    { x: 0.87, y: 0.34, r: 0.3,  turn: 8,   inner: 0.48, centre: '#E8607C',
      lean: [1.02, 1.12, 0.92, 1.08, 0.96] },
    { x: 0.5,  y: 1.02, r: 0.1,  turn: 30,  inner: 0.46, centre: '#E8708E',
      lean: [1, 1, 1, 1, 1] },
  ];

  // ---- shape: a five-point star with softly rounded points ----
  function starPath(ctx, cx, cy, R, s) {
    var pts = [];
    for (var k = 0; k < 10; k++) {
      var outer = k % 2 === 0;
      var a = (s.turn - 90 + k * 36) * Math.PI / 180;
      var rr = outer ? R * s.lean[k / 2] : R * s.inner;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    // round each corner over a short stretch of its two sides:
    // points get a small rounding, the valleys between them a larger one
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var p = pts[i], prev = pts[(i + 9) % 10], next = pts[(i + 1) % 10];
      var c = i % 2 === 0 ? 0.3 : 0.34;
      var A = lerp(p, prev, c), B = lerp(p, next, c);
      if (i === 0) ctx.moveTo(A[0], A[1]); else ctx.lineTo(A[0], A[1]);
      ctx.quadraticCurveTo(p[0], p[1], B[0], B[1]);
    }
    ctx.closePath();
  }

  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

  // bands are the same star at shrinking sizes. that keeps the points
  // gold all the way out, with a small pink heart, like the photo
  function drawStar(ctx, s, W) {
    var cx = s.x * W, cy = s.y * ctx.canvas.height;
    var R = s.r * W;
    [
      [BANDS.rim,   1.00],
      [BANDS.gold,  0.9],
      [BANDS.cream, 0.68],
      [s.centre,    0.44],
    ].forEach(function (l) {
      starPath(ctx, cx, cy, R * l[1], s);
      ctx.fillStyle = l[0];
      ctx.fill();
    });
  }

  // ---- blur: three box passes ≈ a gaussian. works on premultiplied
  // colour so clear edges don't turn grey ----
  function blur(ctx, radius) {
    var w = ctx.canvas.width, h = ctx.canvas.height;
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    var n = w * h, ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    for (var i = 0; i < n; i++) {
      var al = d[i * 4 + 3] / 255;
      ch[0][i] = d[i * 4] * al; ch[1][i] = d[i * 4 + 1] * al; ch[2][i] = d[i * 4 + 2] * al; ch[3][i] = d[i * 4 + 3];
    }
    var tmp = new Float32Array(n);
    for (var c = 0; c < 4; c++) {
      for (var pass = 0; pass < 3; pass++) {
        boxH(ch[c], tmp, w, h, radius);
        boxV(tmp, ch[c], w, h, radius);
      }
    }
    for (var j = 0; j < n; j++) {
      var a = ch[3][j], inv = a > 0 ? 255 / a : 0;
      d[j * 4] = ch[0][j] * inv; d[j * 4 + 1] = ch[1][j] * inv; d[j * 4 + 2] = ch[2][j] * inv; d[j * 4 + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
  }

  function boxH(src, dst, w, h, r) {
    var span = r * 2 + 1;
    for (var y = 0; y < h; y++) {
      var row = y * w, acc = 0;
      for (var k = -r; k <= r; k++) acc += src[row + clampI(k, 0, w - 1)];
      for (var x = 0; x < w; x++) {
        dst[row + x] = acc / span;
        acc += src[row + clampI(x + r + 1, 0, w - 1)] - src[row + clampI(x - r, 0, w - 1)];
      }
    }
  }

  function boxV(src, dst, w, h, r) {
    var span = r * 2 + 1;
    for (var x = 0; x < w; x++) {
      var acc = 0;
      for (var k = -r; k <= r; k++) acc += src[clampI(k, 0, h - 1) * w + x];
      for (var y = 0; y < h; y++) {
        dst[y * w + x] = acc / span;
        acc += src[clampI(y + r + 1, 0, h - 1) * w + x] - src[clampI(y - r, 0, h - 1) * w + x];
      }
    }
  }

  function clampI(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- grain baked into a star, so the texture travels with it.
  // fixed pattern (seeded), so it never shimmers between visits ----
  function grain(ctx, amount) {
    var w = ctx.canvas.width, h = ctx.canvas.height;
    var img = ctx.getImageData(0, 0, w, h), d = img.data, seed = 7;
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      seed = (seed * 16807) % 2147483647;
      var g = ((seed / 2147483647) - 0.5) * amount;
      d[i] += g; d[i + 1] += g; d[i + 2] += g;
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---- the full sky ----
  function paintSky(canvas) {
    var rect = canvas.getBoundingClientRect();
    var aspect = Math.max(0.4, Math.min(2.4, (rect.height || 1) / (rect.width || 1)));
    // drawn at about half the shown size: sharp enough, still cheap
    var W = Math.round(Math.min(640, Math.max(320, (rect.width || 320) / 2.2)));
    var H = Math.round(W * aspect);
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    // four-corner gradient: two vertical ramps, blended across
    var left = ctx.createLinearGradient(0, 0, 0, H);
    left.addColorStop(0, SKY[0][2]); left.addColorStop(1, SKY[2][2]);
    var right = ctx.createLinearGradient(0, 0, 0, H);
    right.addColorStop(0, SKY[1][2]); right.addColorStop(1, SKY[3][2]);
    ctx.fillStyle = left; ctx.fillRect(0, 0, W, H);
    var mask = ctx.createLinearGradient(0, 0, W, 0);
    mask.addColorStop(0, 'rgba(0,0,0,0)'); mask.addColorStop(1, 'rgba(0,0,0,1)');
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var o = off.getContext('2d');
    o.fillStyle = right; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'destination-in';
    o.fillStyle = mask; o.fillRect(0, 0, W, H);
    ctx.drawImage(off, 0, 0);

    // on tall (phone) screens the stars stack instead of sitting side by side
    var stars = aspect > 1.1 ? [
      Object.assign({}, STARS[0], { x: 0.22, y: 0.86, r: 0.6 }),
      Object.assign({}, STARS[1], { x: 0.9,  y: 0.13, r: 0.5 }),
      Object.assign({}, STARS[2], { x: 0.0,  y: 0.04, r: 0.2 }),
    ] : STARS;
    stars.forEach(function (s) { drawStar(ctx, s, W); });
    blur(ctx, Math.max(3, Math.round(W / 110)));
  }

  // ---- one star on a clear background ----
  function paintRemnant(canvas) {
    var s = STARS[+canvas.getAttribute('data-star') || 0];
    var W = 280;
    canvas.width = W; canvas.height = W;
    var ctx = canvas.getContext('2d');
    drawStar(ctx, Object.assign({}, s, { x: 0.5, y: 0.5, r: 0.36 }), W);
    blur(ctx, Math.round(W / 36));
    grain(ctx, 26);
  }

  // the sky first, right after the page first shows; the remnants later,
  // when the browser is free (nobody sees them until they scroll)
  function paintSkyNow() {
    var c = document.querySelector('canvas[data-starsky="hero"]');
    if (c) { paintSky(c); c.classList.add('is-painted'); }
  }

  function paintRemnants() {
    var list = document.querySelectorAll('canvas[data-starsky="remnant"]');
    Array.prototype.forEach.call(list, function (c) { paintRemnant(c); c.classList.add('is-painted'); });
  }

  requestAnimationFrame(function () {
    paintSkyNow();
    var later = window.requestIdleCallback || function (fn) { setTimeout(fn, 300); };
    later(paintRemnants, { timeout: 1500 });
  });

  // repaint the sky only when its shape changes a lot (phone turned)
  var lastAspect = 0;
  window.addEventListener('resize', function () {
    var hero = document.querySelector('canvas[data-starsky="hero"]');
    if (!hero) return;
    var r = hero.getBoundingClientRect(), a = r.height / r.width;
    if (Math.abs(a - lastAspect) > 0.25) { lastAspect = a; paintSky(hero); }
  }, { passive: true });
  var first = document.querySelector('canvas[data-starsky="hero"]');
  if (first) { var fr = first.getBoundingClientRect(); lastAspect = fr.height / fr.width; }
})();
