// sky.js — the sky over Manila, right now.
//
// A real star chart: every star brighter than magnitude 5, placed where it
// actually is above Manila at this minute, with the constellation lines.
// Zenith in the middle, horizon at the rim, north up, east on the left
// (the way a sky looks when you lie on your back facing north).
//
// - Hover or tap near a star to see its name; its constellation lights up.
// - Drag sideways (or use the arrow keys) to turn the sky through the night.
// - Star data loads only when the section comes near the screen.
// - Nothing animates on its own; it redraws once a minute while visible.
//
// Data: data/sky.json, built from d3-celestial's Hipparcos-based files
// (c) 2015 Olaf Frohn, BSD-3-Clause.
(function () {
  'use strict';

  var root = document.querySelector('.sky');
  if (!root) return;
  var canvas = root.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var tip = root.querySelector('.sky-tip');
  var timeEl = document.querySelector('.sky-time');
  var noteEl = document.querySelector('.sky-note');
  var nowBtn = document.querySelector('.sky-now');
  var hint = document.querySelector('.sky-hint');
  if (!ctx) return;

  // touch screens can't hover, so the hint says tap there
  if (hint && !window.matchMedia('(hover: hover)').matches) {
    hint.textContent = 'tap a star, drag to turn the sky';
  }

  // Manila
  var LAT = 14.5995, LON = 120.9842;
  var RAD = Math.PI / 180;
  var sinLat = Math.sin(LAT * RAD), cosLat = Math.cos(LAT * RAD);

  var data = null;
  var offsetMin = 0;           // how far the visitor has turned the sky
  var W = 0, R = 0, dpr = 1;
  var placed = [];             // stars above the horizon, in canvas px
  var hover = null;            // the star under the pointer
  var visible = false;
  var tick = 0;

  var clock = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true
  });

  // ---- astronomy ----
  function daysSinceJ2000(ms) { return ms / 86400000 + 2440587.5 - 2451545.0; }

  function localSiderealDeg(ms) {
    var d = daysSinceJ2000(ms);
    var gmst = 280.46061837 + 360.98564736629 * d;
    return ((gmst + LON) % 360 + 360) % 360;
  }

  // equatorial (deg) -> horizontal (alt, az in radians; az from north, east positive)
  function toAltAz(raDeg, decDeg, lst) {
    var ha = (lst - raDeg) * RAD, dec = decDeg * RAD;
    var sinAlt = Math.sin(dec) * sinLat + Math.cos(dec) * cosLat * Math.cos(ha);
    var alt = Math.asin(sinAlt);
    var az = Math.atan2(
      -Math.sin(ha) * Math.cos(dec),
      cosLat * Math.sin(dec) - sinLat * Math.cos(dec) * Math.cos(ha)
    );
    return [alt, az];
  }

  // stereographic from the zenith; the horizon lands exactly on the rim
  function project(alt, az) {
    var r = R * Math.tan((Math.PI / 2 - alt) / 2);
    return [W / 2 - r * Math.sin(az), W / 2 - r * Math.cos(az)];
  }

  function sunAltitudeDeg(ms) {
    var n = daysSinceJ2000(ms);
    var L = (280.460 + 0.9856474 * n) * RAD;
    var g = (357.528 + 0.9856003 * n) * RAD;
    var lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    var eps = (23.439 - 0.0000004 * n) * RAD;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / RAD;
    var dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) / RAD;
    return toAltAz(ra, dec, localSiderealDeg(ms))[0] / RAD;
  }

  // ---- drawing ----
  var C = {
    sky: '#2D0012', skyEdge: '#1E000B',
    star: '#FFF0EE', bright: '#FFD580',
    line: 'rgba(232, 146, 159, 0.22)', lineOn: 'rgba(255, 213, 128, 0.9)',
    rim: 'rgba(255, 200, 190, 0.28)', label: 'rgba(255, 220, 210, 0.55)'
  };

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = W * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = W / 2 - 18;   // leaves room for N / E / S / W inside the disc edge
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, W);
    var cx = W / 2;

    // the disc
    var g = ctx.createRadialGradient(cx, cx, R * 0.1, cx, cx, W / 2);
    g.addColorStop(0, C.sky);
    g.addColorStop(1, C.skyEdge);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cx, W / 2, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = C.rim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cx, R, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = C.label;
    ctx.font = '500 10px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, 9); ctx.fillText('S', cx, W - 9);
    ctx.fillText('E', 9, cx); ctx.fillText('W', W - 9, cx);

    if (!data) return;

    var ms = Date.now() + offsetMin * 60000;
    var lst = localSiderealDeg(ms);
    var hoverCons = hover ? hover.cons : null;

    // constellation lines
    ctx.lineCap = 'round';
    for (var l = 0; l < data.lines.length; l++) {
      var seg = data.lines[l];
      var on = seg[0] === hoverCons;
      ctx.strokeStyle = on ? C.lineOn : C.line;
      ctx.lineWidth = on ? 1.4 : 0.8;
      ctx.beginPath();
      var pen = false;
      for (var k = 1; k < seg.length; k += 2) {
        var h = toAltAz(seg[k], seg[k + 1], lst);
        if (h[0] < 0) { pen = false; continue; }
        var p = project(h[0], h[1]);
        if (pen) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
        pen = true;
      }
      ctx.stroke();
    }

    // stars, sized by brightness
    placed = [];
    for (var i = 0; i < data.stars.length; i++) {
      var s = data.stars[i];
      var hz = toAltAz(s[0], s[1], lst);
      if (hz[0] < 0) continue;
      var q = project(hz[0], hz[1]);
      var size = Math.max(0.7, 2.9 - 0.45 * s[2]) * (W < 360 ? 0.85 : 1);
      ctx.globalAlpha = Math.min(1, 1.15 - s[2] * 0.13);
      ctx.fillStyle = s[2] < 0.6 ? C.bright : C.star;
      ctx.beginPath(); ctx.arc(q[0], q[1], size, 0, Math.PI * 2); ctx.fill();
      var name = data.names[i];
      if (name) placed.push({ x: q[0], y: q[1], name: name[0], cons: name[1], mag: s[2] });
    }
    ctx.globalAlpha = 1;

    if (hover) {
      ctx.strokeStyle = C.bright; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hover.x, hover.y, 7, 0, Math.PI * 2); ctx.stroke();
    }

    updateCaption(ms);
  }

  // ---- words under the disc ----
  function updateCaption(ms) {
    var t = clock.format(new Date(ms));
    var sun = sunAltitudeDeg(ms);
    timeEl.textContent = offsetMin === 0
      ? 'the sky over manila, ' + t + '.'
      : 'the sky over manila at ' + t + '.';

    if (sun > 0) noteEl.textContent = "it's daytime, so they're all up there, just drowned out.";
    else if (sun > -12) noteEl.textContent = 'the sun just dipped. the bright ones show up first.';
    else noteEl.textContent = 'if the clouds let you, this is what you’d see straight up.';

    nowBtn.hidden = offsetMin === 0;
    canvas.setAttribute('aria-label',
      'Star chart of the sky over Manila at ' + t + '. Drag or use the arrow keys to turn it.');
  }

  // ---- hover / tap for names ----
  function pick(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * (W / rect.width);
    var y = (clientY - rect.top) * (W / rect.height);
    var best = null, bestD = 16 * 16;
    for (var i = 0; i < placed.length; i++) {
      var dx = placed[i].x - x, dy = placed[i].y - y;
      // brighter stars win ties so the famous ones are easy to land on
      var d = dx * dx + dy * dy + placed[i].mag * 6;
      if (d < bestD) { bestD = d; best = placed[i]; }
    }
    return best;
  }

  function showTip(star) {
    hover = star;
    if (!star) { tip.hidden = true; draw(); return; }
    var same = star.name === star.cons;
    tip.innerHTML = '';
    var a = document.createElement('span'); a.className = 'sky-tip-name'; a.textContent = star.name;
    tip.appendChild(a);
    if (!same) {
      var b = document.createElement('span'); b.className = 'sky-tip-cons'; b.textContent = star.cons;
      tip.appendChild(b);
    }
    var scale = canvas.getBoundingClientRect().width / W;
    tip.style.left = (star.x * scale) + 'px';
    tip.style.top = (star.y * scale) + 'px';
    tip.classList.toggle('is-left', star.x > W * 0.62);
    tip.hidden = false;
    draw();
  }

  // ---- drag to turn the sky ----
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, start: offsetMin, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (drag) {
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      if (drag.moved) {
        // a full drag across the disc is about twelve hours
        offsetMin = Math.round(drag.start - dx * (720 / W));
        tip.hidden = true; hover = null;
        if (hint) hint.classList.add('is-done');
        draw();
        return;
      }
    }
    if (e.pointerType === 'mouse') showTip(pick(e.clientX, e.clientY));
  });
  canvas.addEventListener('pointerup', function (e) {
    if (drag && !drag.moved) showTip(pick(e.clientX, e.clientY));
    drag = null;
  });
  canvas.addEventListener('pointercancel', function () { drag = null; });
  canvas.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse' && !drag) showTip(null);
  });

  canvas.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    offsetMin += e.key === 'ArrowRight' ? -60 : 60;
    if (hint) hint.classList.add('is-done');
    showTip(null);
  });

  nowBtn.addEventListener('click', function () {
    offsetMin = 0;
    showTip(null);
  });

  // ---- loading and upkeep ----
  function load() {
    if (data || load.started) return;
    load.started = true;
    fetch('data/sky.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { data = d; draw(); })
      .catch(function () {
        noteEl.textContent = "the star map didn't load. refresh to try again.";
      });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { load(); draw(); }
    }, { rootMargin: '400px' }).observe(root);
  } else {
    visible = true; load();
  }

  // the sky turns about a quarter degree a minute; keep up while on screen
  tick = setInterval(function () { if (visible && offsetMin === 0) draw(); }, 60000);

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  resize();
})();
