// story.js — motion for the story home page (index.html)
//
// 1. hero: the nova moment (a hand-drawn star draws itself once),
//    the "also…" roles, and the star sky fading into the page
// 2. intro: the photo drops in once
// 3. chapters: on wide screens they pin and slide sideways with the
//    scroll, resting on each chapter for a moment. a small
//    constellation under the nav lights one star per chapter. photos
//    settle and its lines come in the first time it's on screen, and
//    each chapter zooms in as it arrives and shrinks back as it leaves.
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

  // ---- 1a. the nova moment ----
  // the star on "Nova" lands once after first paint (story.css)
  if (hero) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.add('is-lit'); });
    });
  }

  // ---- 1b. cycle the roles, only while the hero is on screen ----
  var roleEl = document.querySelector('.story-roles-word');
  if (roleEl && !reduced) {
    var roles = (roleEl.getAttribute('data-roles') || '').split('|');
    var r = 0;
    var timer = null;
    var swap = function () {
      roleEl.classList.add('is-out');
      setTimeout(function () {
        r = (r + 1) % roles.length;
        roleEl.textContent = roles[r];
        roleEl.classList.remove('is-out');
      }, 180);
    };
    var heroObs = new IntersectionObserver(function (entries) {
      var on = entries[0].isIntersecting && !document.hidden;
      if (on && !timer) timer = setInterval(swap, 1800);
      if (!on && timer) { clearInterval(timer); timer = null; }
    });
    heroObs.observe(hero);
  }

  // ---- 2. intro: the photo starts big in the middle of the screen and
  // shrinks into its place as you scroll; the words fade in under it ----
  var intro = document.querySelector('.pol--intro');
  var introText = Array.prototype.slice.call(document.querySelectorAll('.story-intro-lead, .story-stats'));

  function zoomIntro() {
    if (reduced || !intro) return;
    var vh = window.innerHeight;
    var r = intro.getBoundingClientRect();
    // 0 while the photo is low on the screen, 1 once it reaches its spot near the top
    var t = clamp((vh * 0.92 - r.top) / (vh * 0.62), 0, 1);
    var e = 1 - Math.pow(1 - t, 3);                       // ease out
    var big = Math.min(3.2, (vh * 0.62) / (r.height || 1)); // how big it starts
    var s = 1 + (big - 1) * (1 - e);
    // while big, pull it up so it sits in the middle of the screen
    var lift = (1 - e) * (r.top + r.height / 2 - vh / 2) * -0.6;
    intro.style.transform = 'translate3d(0,' + lift.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    var textT = clamp((t - 0.55) / 0.45, 0, 1);
    introText.forEach(function (el) {
      el.style.opacity = textT.toFixed(3);
      el.style.transform = 'translate3d(0,' + ((1 - textT) * 18).toFixed(1) + 'px,0)';
    });
  }

  // ---- 3. chapters ----
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
  var STAR = 'M0,-7 L1.4,-1.4 L7,0 L1.4,1.4 L0,7 L-1.4,1.4 L-7,0 L-1.4,-1.4 Z';
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

  // ---- zoom: the whole chapter zooms as one piece ----
  // sideways: the next chapter arrives zoomed in (close) and settles to its
  // normal size; the chapter you leave zooms out (small) as it slides away.
  // phones: photos grow a little as they reach the middle of the screen.
  var parts = chapters.map(function (ch) {
    return { photos: ch.querySelector('.chapter-photos'), text: ch.querySelector('.chapter-text') };
  });

  function zoomHorizontal(pos) {
    if (reduced) return;
    chapters.forEach(function (ch, k) {
      var d = k - pos;
      if (Math.abs(d) > 1.5) { ch.style.transform = ''; return; }
      var a = Math.min(Math.abs(d), 1);
      var e = a * a * (3 - 2 * a);                 // smooth in and out
      var s = d > 0 ? 1 + 0.26 * e : 1 - 0.25 * e; // coming: close. going: far.
      ch.style.transform = 'scale(' + s.toFixed(4) + ')';
    });
  }

  function zoomVertical() {
    if (reduced) return;
    var vh = window.innerHeight;
    parts.forEach(function (pt) {
      if (!pt.photos) return;
      var r = pt.photos.getBoundingClientRect();
      if (r.bottom < -vh || r.top > 2 * vh) return;
      var d = (r.top + r.height / 2 - vh / 2) / vh;
      var a = Math.min(Math.abs(d) * 1.4, 1);
      pt.photos.style.transform = 'scale(' + (1 - 0.1 * a * a).toFixed(4) + ')';
    });
  }

  function clearZoom() {
    chapters.forEach(function (ch) { ch.style.transform = ''; });
    parts.forEach(function (pt) {
      if (pt.photos) pt.photos.style.transform = '';
      if (pt.text) pt.text.style.transform = '';
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

    zoomIntro();
    if (!horizontal) { zoomVertical(); return; }
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var p = clamp(-rect.top / total, 0, 1);
    var pos = dwell(p * (n - 1));
    track.style.transform = 'translate3d(' + (-pos * window.innerWidth).toFixed(1) + 'px,0,0)';
    activate(chapters[Math.round(pos)]);
    zoomHorizontal(pos);
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
      clearZoom();
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
