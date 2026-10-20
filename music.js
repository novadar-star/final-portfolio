// music.js — a small "♪ music off / on" button beside the theme toggle.
//
// Track: "Dimly Lit" by iamoneabe, CC0 / public domain
// https://opengameart.org/content/dimly-lit
//
// How it behaves:
// - Off by default. Nothing downloads until someone turns it on.
// - Remembers on/off and roughly where the song was, so moving between
//   pages picks up near the same spot instead of restarting.
// - Browsers sometimes block sound on a fresh page load. If that happens,
//   the music resumes on the visitor's next click or key press.
(function () {
  var SRC = 'audio/dimly-lit.mp3';
  var VOLUME = 0.35;
  var KEY_ON = 'music';
  var KEY_TIME = 'musicTime';

  var themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) return;

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  // ---- button ----
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'music-toggle';
  btn.title = 'Dimly Lit, by iamoneabe (CC0)';
  btn.innerHTML =
    '<span class="music-note" aria-hidden="true">&#9834;</span>' +
    '<span class="music-word">music</span><span class="music-state">off</span>';
  themeToggle.parentNode.insertBefore(btn, themeToggle);

  var stateEl = btn.querySelector('.music-state');
  var audio = null;
  var fadeTimer = null;

  function setUI(on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on');
    btn.classList.toggle('is-on', on);
    stateEl.textContent = on ? 'on' : 'off';
  }

  function getAudio() {
    if (audio) return audio;
    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    var saved = parseFloat(read(KEY_TIME));
    if (saved > 0) {
      audio.addEventListener('loadedmetadata', function () {
        if (saved < audio.duration) audio.currentTime = saved;
      }, { once: true });
    }
    return audio;
  }

  // short fade so it never starts or stops abruptly
  function fadeTo(target, done) {
    clearInterval(fadeTimer);
    var a = getAudio();
    var step = (target - a.volume) / 12;
    var n = 0;
    fadeTimer = setInterval(function () {
      n += 1;
      a.volume = Math.min(1, Math.max(0, a.volume + step));
      if (n >= 12) {
        clearInterval(fadeTimer);
        a.volume = target;
        if (done) done();
      }
    }, 40);
  }

  function play() {
    var a = getAudio();
    var p = a.play();
    if (p && typeof p.then === 'function') {
      return p.then(function () { fadeTo(VOLUME); });
    }
    fadeTo(VOLUME);
    return Promise.resolve();
  }

  function stop() {
    if (!audio) return;
    fadeTo(0, function () { audio.pause(); });
  }

  // resume after the first interaction if the browser blocked autoplay
  function resumeOnInteraction() {
    var events = ['pointerdown', 'keydown'];
    function go(e) {
      if (e.target && e.target.closest && e.target.closest('.music-toggle')) return;
      events.forEach(function (ev) { document.removeEventListener(ev, go, true); });
      if (read(KEY_ON) === 'on') play().catch(function () {});
    }
    events.forEach(function (ev) { document.addEventListener(ev, go, true); });
  }

  btn.addEventListener('click', function () {
    var turningOn = read(KEY_ON) !== 'on';
    write(KEY_ON, turningOn ? 'on' : 'off');
    setUI(turningOn);
    if (turningOn) {
      play().catch(function () { setUI(false); write(KEY_ON, 'off'); });
    } else {
      stop();
    }
  });

  // keep the position so the next page can pick up from here
  function saveTime() {
    if (audio && !audio.paused) write(KEY_TIME, String(audio.currentTime));
  }
  window.addEventListener('pagehide', saveTime);
  setInterval(saveTime, 2000);

  // ---- restore on load ----
  var wasOn = read(KEY_ON) === 'on';
  setUI(wasOn);
  if (wasOn) {
    play().catch(resumeOnInteraction);
  }
})();
