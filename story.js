// story.js — motion for the story home page (index.html)
//
// 1. hero: types the one-liner once, cycles the "also…" roles,
//    and fades the star sky into the page as you scroll
// 2. intro: the photo drops in once
// 3. chapters: on wide screens they pin and slide sideways with the
//    scroll, resting on each chapter for a moment. a thin line under
//    the nav shows how far through you are. each chapter's photos
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
  var bar = document.querySelector('.story-progress');
  var n = chapters.length;

  if (!reduced) root.classList.add('motion-ok');

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  // ---- nav height, used by the hero and the progress line ----
  function measureNav() {
    if (nav) root.style.setProperty('--nav-h', nav.offsetHeight + 'px');
  }
  measureNav();

  // ---- 1a. type the one-liner ----
  var typeEl = document.querySelector('.type');
  var caret = document.querySelector('.type-caret');
  if (typeEl) {
    var full = typeEl.getAttribute('data-type') || '';
    if (reduced) {
      typeEl.textContent = full;
      if (caret) caret.classList.add('is-done');
    } else {
      var k = 0;
      setTimeout(function step() {
        k++;
        typeEl.textContent = full.slice(0, k);
        if (k < full.length) setTimeout(step, 48 + Math.random() * 40);
        else setTimeout(function () { if (caret) caret.classList.add('is-done'); }, 1400);
      }, 450);
    }
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

  // ---- 2. intro photo ----
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
    var lines = ch.querySelectorAll('h2, .beat, .beat-list li');
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

  var horizontal = false;
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY;

    // hero: sky fades out, nav turns solid once the hero has passed under it
    if (hero) {
      var h = hero.offsetHeight;
      if (!reduced) hero.style.setProperty('--fade', clamp(y / (h * 0.75), 0, 1).toFixed(3));
      if (nav) nav.classList.toggle('nav--scrolled', y > h - nav.offsetHeight - 1);
    }

    if (!horizontal) return;
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var p = clamp(-rect.top / total, 0, 1);
    var pos = dwell(p * (n - 1));
    track.style.transform = 'translate3d(' + (-pos * window.innerWidth).toFixed(1) + 'px,0,0)';
    activate(chapters[Math.round(pos)]);
    if (bar) {
      bar.style.setProperty('--p', p.toFixed(4));
      bar.classList.toggle('is-on', rect.top <= 1 && rect.bottom >= window.innerHeight - 1);
    }
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
      if (bar) bar.classList.remove('is-on');
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
