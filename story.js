// story.js — motion for the story home page (index.html)
//
// 1. hero: the nova moment (a hand-drawn star draws itself once)
//    and the star sky fading into the page
// 2. chapters: on wide screens they pin and slide sideways with the
//    scroll, resting on each chapter for a moment. a small
//    constellation under the nav lights one star per chapter. photos
//    settle and its lines come in the first time it's on screen.
//
// Phones, short screens and reduced motion get a plain vertical stack
// with everything already visible. Only transform and opacity animate.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 900px) and (min-height: 560px)');

  var nav = document.querySelector('.nav');
  var hero = document.querySelector('.story-hero');
  var section = document.querySelector('.chapters');
  var track = section && section.querySelector('.chapters-track');
  var chapters = section ? Array.prototype.slice.call(section.querySelectorAll('.chapter')) : [];
  var sky = document.querySelector('.story-sky');
  var remnants = document.querySelector('.sky-remnants');
  var n = chapters.length;

  if (!reduced) root.classList.add('motion-ok');

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  // ---- nav height, used by the hero and the progress line ----
  function measureNav() {
    if (nav) root.style.setProperty('--nav-h', nav.offsetHeight + 'px');
  }
  measureNav();

  // ---- 1. the nova moment ----
  // the star on "Nova" lands once after first paint (story.css)
  if (hero) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.add('is-lit'); });
    });
  }

  // ---- 2. chapters ----
  // number the lines inside each chapter so they come in one after another
  chapters.forEach(function (ch) {
    var lines = ch.querySelectorAll('h2, .beat, .beat-list li, .snag p');
    Array.prototype.forEach.call(lines, function (el, i) {
      el.classList.add('reveal-line');
      el.style.setProperty('--i', i);
    });
  });

  function activate(ch) {
    if (!ch || ch.classList.contains('is-active')) return;
    ch.classList.add('is-active');
    setTimeout(function () { ch.classList.add('is-settled'); }, 1200);
  }

  // rest on each chapter: the middle 60% of each step moves, the rest holds
  function dwell(x) {
    var i = Math.floor(x);
    if (i >= n - 1) return n - 1;
    var t = clamp((x - i - 0.2) / 0.6, 0, 1);
    return i + t * t * (3 - 2 * t);
  }

  // ---- the constellation: one star per chapter ----
  // the same hand-drawn star as the bullets, small and centred on 0,0
  var STAR = 'M-0.19 -5.46 Q0.68 -3.66 1.55 -1.80 Q3.53 -1.74 5.52 -1.74 Q4.15 -0.37 2.79 0.99 Q3.29 2.91 3.97 4.77 Q2.23 3.84 0.56 2.91 Q-1.18 4.34 -3.10 5.52 Q-2.29 3.35 -1.98 1.12 Q-3.60 -0.25 -5.52 -1.18 Q-3.47 -1.18 -1.55 -1.49 Q-0.37 -2.85 0.68 -4.28';
  var LIFT = [-5, 3, -2, 6, -6, 1, -3, 5, 0, -4, 2, -1];   // fixed, so it's the same sky every time
  var pts = [], cum = [0], skyLit = null, skyStars = [];
  if (sky && n > 1) {
    var ns = 'http://www.w3.org/2000/svg';
    for (var s = 0; s < n; s++) pts.push([14 + s * (372 / (n - 1)), 14 + LIFT[s % LIFT.length]]);
    for (var q = 1; q < n; q++) cum.push(cum[q - 1] + Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]));
    var line = pts.map(function (pt) { return pt.join(','); }).join(' ');
    var base = document.createElementNS(ns, 'polyline');
    base.setAttribute('points', line);
    base.setAttribute('class', 'sky-path');
    skyLit = base.cloneNode();
    skyLit.setAttribute('class', 'sky-path sky-path--lit');
    skyLit.style.strokeDasharray = cum[n - 1];
    skyLit.style.strokeDashoffset = cum[n - 1];
    sky.appendChild(base);
    sky.appendChild(skyLit);
    pts.forEach(function (pt) {
      var gEl = document.createElementNS(ns, 'g');
      gEl.setAttribute('transform', 'translate(' + pt[0] + ' ' + pt[1] + ')');
      var star = document.createElementNS(ns, 'path');
      star.setAttribute('d', STAR);
      star.setAttribute('class', 'sky-star');
      gEl.appendChild(star);
      sky.appendChild(gEl);
      skyStars.push(star);
    });
  }

  function drawSky(pos) {
    if (!skyLit) return;
    var i = Math.min(Math.floor(pos), n - 2);
    var len = cum[i] + (pos - i) * (cum[i + 1] - cum[i]);
    skyLit.style.strokeDashoffset = (cum[n - 1] - len).toFixed(2);
    var here = Math.round(pos);
    skyStars.forEach(function (st, k) {
      st.classList.toggle('is-lit', k <= pos + 0.02);
      st.classList.toggle('is-here', k === here);
    });
  }

  var horizontal = false;
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY;

    // hero: sky fades out, nav turns solid once the hero has passed under it.
    // the remnants fade in as the sky goes, and drift across the whole page
    if (hero) {
      var h = hero.offsetHeight;
      var fade = clamp(y / (h * 0.75), 0, 1);
      if (!reduced) hero.style.setProperty('--fade', fade.toFixed(3));
      if (remnants) {
        remnants.style.setProperty('--fade', fade.toFixed(3));
        if (!reduced) {
          var maxY = document.documentElement.scrollHeight - window.innerHeight;
          remnants.style.setProperty('--pp', clamp(y / (maxY || 1), 0, 1).toFixed(4));
        }
      }
      if (nav) nav.classList.toggle('nav--scrolled', y > h - nav.offsetHeight - 1);
    }

    if (!horizontal) return;
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var p = clamp(-rect.top / total, 0, 1);
    var pos = dwell(p * (n - 1));
    track.style.transform = 'translate3d(' + (-pos * window.innerWidth).toFixed(1) + 'px,0,0)';
    activate(chapters[Math.round(pos)]);
    drawSky(pos);
    if (sky) sky.classList.toggle('is-on', rect.top <= 1 && rect.bottom >= window.innerHeight - 1);
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  // vertical mode: a chapter comes in when a quarter of it is on screen
  var vObs = null;
  function setMode() {
    horizontal = !reduced && wide.matches && n > 1;
    section.classList.toggle('is-horizontal', horizontal);
    if (!horizontal) {
      track.style.transform = '';
      if (sky) sky.classList.remove('is-on');
      if (!vObs) {
        vObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
        }, { threshold: 0.25 });
        chapters.forEach(function (ch) { vObs.observe(ch); });
      }
    }
    update();
  }

  if (section && track && n) {
    setMode();
    if (wide.addEventListener) wide.addEventListener('change', setMode);

    // keyboard: tabbing into a chapter that's off to the side scrolls to it
    section.addEventListener('focusin', function (e) {
      if (!horizontal) return;
      var ch = e.target.closest('.chapter');
      var i = chapters.indexOf(ch);
      if (i < 0) return;
      var total = section.offsetHeight - window.innerHeight;
      var top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (i / (n - 1)) * total);
    });
  } else {
    update();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measureNav(); onScroll(); }, { passive: true });
})();
