// music.js — a small "♪ music off / on" button beside the theme toggle.
//
// Track: "Satellites" by Sunmoonstar
// (Normalized to -14 LUFS, peaks at -1 dB, 128 kbps.)
//
// How it behaves:
// - Off by default. Nothing downloads until someone turns it on.
// - Loops without a gap: the track is decoded once with Web Audio and the
//   few milliseconds of silence MP3 encoding adds at each end are trimmed
//   from the loop points. Browsers without Web Audio fall back to <audio loop>.
// - Fades in and out instead of cutting.
// - Remembers on/off and roughly where the song was, so moving between
//   pages picks up near the same spot instead of restarting.
// - Browsers sometimes block sound on a fresh page load. If that happens,
//   the music resumes on the visitor's next click or key press.
(function () {
  var SRC = 'audio/satellites.mp3';
  var CREDIT = 'Satellites, by Sunmoonstar';
  var VOLUME = 0.85;         // file is loudness-normalized; this keeps it present but under speech
  var FADE_IN = 0.9;         // seconds: swells in rather than ticking on
  var FADE = 0.45;           // seconds: exits faster than it enters
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
  btn.title = CREDIT;
  btn.innerHTML =
    '<span class="music-note" aria-hidden="true">&#9834;</span>';
  themeToggle.parentNode.insertBefore(btn, themeToggle);

  function setUI(on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on');
    btn.classList.toggle('is-on', on);
  }

  function savedOffset() {
    var t = parseFloat(read(KEY_TIME));
    return t > 0 ? t : 0;
  }

  // ---- engine 1: Web Audio, gapless ----
  function webAudioEngine(Ctx) {
    var ctx = null, gain = null, buffer = null, loading = null;
    var source = null, startedAt = 0, loopStart = 0, loopEnd = 0;

    // find where real sound starts and ends (MP3 pads a little silence)
    function trimPoints(buf) {
      var data = buf.getChannelData(0), n = data.length, limit = Math.round(buf.sampleRate * 0.06);
      var a = 0, b = n - 1;
      while (a < limit && Math.abs(data[a]) < 1e-4) a++;
      while (n - 1 - b < limit && Math.abs(data[b]) < 1e-4) b--;
      return [a / buf.sampleRate, (b + 1) / buf.sampleRate];
    }

    function load() {
      if (loading) return loading;
      ctx = new Ctx();
      gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      loading = fetch(SRC)
        .then(function (r) { if (!r.ok) throw new Error('music ' + r.status); return r.arrayBuffer(); })
        .then(function (bytes) {
          // callback form too, for older Safari
          return new Promise(function (res, rej) {
            var p = ctx.decodeAudioData(bytes, res, rej);
            if (p && p.then) p.then(res, rej);
          });
        })
        .then(function (buf) {
          buffer = buf;
          var t = trimPoints(buf);
          loopStart = t[0]; loopEnd = t[1];
        });
      return loading;
    }

    function length() { return loopEnd - loopStart; }

    return {
      play: function (offset) {
        return load().then(function () {
          // when the browser wants a gesture first, Chrome leaves resume()
          // pending instead of rejecting, so give it a moment and then check
          return Promise.race([ctx.resume(), new Promise(function (r) { setTimeout(r, 400); })]);
        }).then(function () {
          // resume() resolves without unlocking when the browser wants a gesture
          if (ctx.state !== 'running') throw new Error('blocked');
          if (source) return;
          source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.loopStart = loopStart;
          source.loopEnd = loopEnd;
          source.connect(gain);
          var at = loopStart + ((offset || 0) % length());
          source.start(0, at);
          startedAt = ctx.currentTime - (at - loopStart);
          var now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(VOLUME, now + FADE_IN);
        });
      },
      stop: function () {
        if (!source) return;
        var s = source, now = ctx.currentTime;
        source = null;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + FADE);
        s.stop(now + FADE + 0.02);
        // let the device sleep its audio once the fade is done
        setTimeout(function () { if (!source) ctx.suspend(); }, (FADE + 0.1) * 1000);
      },
      playing: function () { return !!source; },
      position: function () {
        if (!source) return null;
        return (ctx.currentTime - startedAt) % length();
      }
    };
  }

  // ---- engine 2: plain <audio loop>, for browsers without Web Audio ----
  function mediaEngine() {
    var audio = null, timer = null;
    function get() {
      if (audio) return audio;
      audio = new Audio(SRC);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      return audio;
    }
    function fadeTo(target, done) {
      clearInterval(timer);
      var a = get(), steps = 12, n = 0, step = (target - a.volume) / steps;
      timer = setInterval(function () {
        n += 1;
        a.volume = Math.min(1, Math.max(0, a.volume + step));
        if (n >= steps) { clearInterval(timer); a.volume = target; if (done) done(); }
      }, (FADE * 1000) / steps);
    }
    return {
      play: function (offset) {
        var a = get();
        if (offset) {
          a.addEventListener('loadedmetadata', function () {
            if (offset < a.duration) a.currentTime = offset;
          }, { once: true });
        }
        var p = a.play();
        return (p && p.then ? p : Promise.resolve()).then(function () { fadeTo(VOLUME); });
      },
      stop: function () { if (audio) fadeTo(0, function () { audio.pause(); }); },
      playing: function () { return !!audio && !audio.paused; },
      position: function () { return audio && !audio.paused ? audio.currentTime : null; }
    };
  }

  var Ctx = window.AudioContext || window.webkitAudioContext;
  var engine = Ctx && window.fetch ? webAudioEngine(Ctx) : mediaEngine();

  function play() { return engine.play(savedOffset()); }

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
      saveTime();
      engine.stop();
    }
  });

  // keep the position so the next page can pick up from here
  function saveTime() {
    var t = engine.position();
    if (t !== null) write(KEY_TIME, String(t));
  }
  window.addEventListener('pagehide', saveTime);
  setInterval(saveTime, 2000);

  // ---- restore on load ----
  var wasOn = read(KEY_ON) === 'on';
  setUI(wasOn);
  if (wasOn) play().catch(resumeOnInteraction);
})();
