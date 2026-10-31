// story.js — motion for the story home page (index.html)
//
// 1. hero: the nova moment (a hand-drawn star draws itself once),
//    the "also…" roles, and the star sky fading into the page
// 2. intro: the photo drops in once
// 3. chapters: on wide screens they pin and slide sideways with the
//    scroll, resting on each chapter for a moment. photos
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
  var remnants = document.querySelector('.sky-remnants');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var SKY_TOP = function () { return window.NOVA_SKY_TOP || '#7D0C31'; };   // set by starsky.js for the time of day
  var lastPast = null;
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

  // ---- 2. intro photo settles in once ----
  var intro = document.querySelector('.pol--intro');
  if (intro && !reduced) {
    var introObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        intro.classList.add('is-in');
        introObs.disconnect();
      }
    }, { threshold: 0.4 });
    introObs.observe(intro);
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

  // ---- zoom: each chapter's photos zoom as it arrives and leaves ----
  // sideways: the next chapter's photos arrive very large (spilling off the
  // screen) and shrink to their size as the chapter lands, finishing just
  // after it stops. leaving photos shrink back a little. text never scales.
  // phones: photos grow a little as they reach the middle of the screen.
  var parts = chapters.map(function (ch) {
    return { photos: ch.querySelector('.chapter-photos'), text: ch.querySelector('.chapter-text') };
  });

  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  function zoomHorizontal(raw) {
    if (reduced) return;
    parts.forEach(function (pt, k) {
      if (!pt.photos) return;
      var d = k - raw;                                  // >0: still coming, <0: leaving
      if (Math.abs(d) > 1.5) { pt.photos.style.transform = ''; return; }
      var s = d > 0 ? 1 + 0.9 * smooth(d / 0.8)          // coming: big, then settles
                    : 1 - 0.18 * smooth(-d / 0.8);      // leaving: shrinks back
      pt.photos.style.transform = 'scale(' + s.toFixed(4) + ')';
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
      if (nav) {
        var past = y > h - nav.offsetHeight - 1;
        nav.classList.toggle('nav--scrolled', past);
        // phone status bar: sky colour over the hero, page colour after it
        if (themeMeta && past !== lastPast) {
          lastPast = past;
          themeMeta.setAttribute('content', past ? getComputedStyle(document.body).backgroundColor : SKY_TOP());
        }
      }
    }

    if (!horizontal) { zoomVertical(); return; }
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var p = clamp(-rect.top / total, 0, 1);
    var pos = dwell(p * (n - 1));
    track.style.transform = 'translate3d(' + (-pos * window.innerWidth).toFixed(1) + 'px,0,0)';
    activate(chapters[Math.round(pos)]);
    zoomHorizontal(p * (n - 1));
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
