(function () {
  'use strict';

  var EVENT_START = Date.UTC(2026, 10, 11, 4, 44, 0); // 11 Nov 2026, 10:14 IST
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- petals ---------- */
  var canvas = document.getElementById('petals');
  var ctx = canvas.getContext('2d');
  var petals = [];
  var running = false;
  var ambientUntil = 0;
  var dpr = 1;
  var COLORS = ['#F28C1E', '#F6A91B', '#FBC245', '#E8651A', '#FFF8EC', '#F4B6C2'];

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(burst) {
    var w = innerWidth;
    var big = w > 900 ? 1.2 : 1;
    petals.push({
      x: burst ? w / 2 + (Math.random() - 0.5) * w * 0.5 : Math.random() * w,
      y: burst ? innerHeight * 0.45 : -20,
      vx: burst ? (Math.random() - 0.5) * 9 : (Math.random() - 0.5) * 0.6,
      vy: burst ? -Math.random() * 9 - 3 : Math.random() * 0.8 + 0.6,
      r: (Math.random() * 5 + 5) * big,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.12,
      sway: Math.random() * Math.PI * 2,
      c: COLORS[(Math.random() * COLORS.length) | 0]
    });
  }

  function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (t < ambientUntil && petals.length < 26 && Math.random() < 0.18) spawn(false);
    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i];
      p.vy = Math.min(p.vy + 0.12, 2.2);
      p.vx *= 0.985;
      p.sway += 0.03;
      p.x += p.vx + Math.sin(p.sway) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > innerHeight + 30) { petals.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.sway)));
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.quadraticCurveTo(p.r * 0.9, 0, 0, p.r);
      ctx.quadraticCurveTo(-p.r * 0.9, 0, 0, -p.r);
      ctx.fill();
      ctx.restore();
    }
    if (petals.length || t < ambientUntil) requestAnimationFrame(frame);
    else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  function shower(count, ambientMs) {
    if (reduced) return;
    for (var i = 0; i < count; i++) spawn(true);
    ambientUntil = performance.now() + (ambientMs || 0);
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  size();
  addEventListener('resize', size);


  /* ---------- music: starts on Tap to Open from 0:13, slow fade in ---------- */
  var song = document.getElementById('song');
  var mBtn = document.getElementById('musicBtn');
  var START = 13, VOL = 0.85;
  var actx = null, gain = null, wantMusic = true, firstFade = true, userOff = false;
  try { if (localStorage.getItem('sdMusicOff') === '1') wantMusic = false; } catch (e) {}

  function fadeTo(v, sec, done) {
    if (gain) {
      var t = actx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(v, t + sec);
      if (done) setTimeout(done, sec * 1000 + 30);
    } else {
      var from = song.volume, steps = Math.max(1, Math.round(sec * 30)), k = 0;
      var iv = setInterval(function () {
        k++; song.volume = Math.min(1, Math.max(0, from + (v - from) * k / steps));
        if (k >= steps) { clearInterval(iv); if (done) done(); }
      }, 1000 / 30);
    }
  }
  function ensureGraph() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      var src = actx.createMediaElementSource(song);
      gain = actx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(actx.destination);
    } catch (e) { actx = null; gain = null; }
  }
  function seekStart() { try { if (song.currentTime < START) song.currentTime = START; } catch (e) {} }
  song.addEventListener('loadedmetadata', seekStart);
  song.addEventListener('ended', function () { song.currentTime = START; song.play(); });
  song.addEventListener('playing', function () {
    if (userOff) { song.pause(); return; }
    if (song.currentTime < START - 0.5) seekStart();
    mBtn.classList.add('playing'); mBtn.classList.remove('off'); mBtn.setAttribute('aria-pressed', 'true');
    if (firstFade) { firstFade = false; fadeTo(VOL, 4.5); }
  });
  song.addEventListener('pause', function () { mBtn.classList.remove('playing'); mBtn.setAttribute('aria-pressed', 'false'); });

  function playMusic() {
    userOff = false;
    ensureGraph();
    if (gain) gain.gain.value = 0; else song.volume = 0;
    firstFade = true;
    seekStart();
    var p = song.play();
    if (p && p.catch) p.catch(function () { mBtn.classList.add('off'); });
  }
  function stopMusic() {
    userOff = true;
    fadeTo(0, 0.6, function () { song.pause(); });
    mBtn.classList.add('off');
  }
  mBtn.addEventListener('click', function () {
    if (song.paused) {
      playMusic();
      try { localStorage.removeItem('sdMusicOff'); } catch (e) {}
    } else {
      stopMusic();
      try { localStorage.setItem('sdMusicOff', '1'); } catch (e) {}
    }
  });
  var pausedByHide = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !song.paused) { pausedByHide = true; song.pause(); }
    else if (!document.hidden && pausedByHide) { pausedByHide = false; song.play(); }
  });

  /* ---------- gate ---------- */
  var gate = document.getElementById('gate');
  var opened = false;
  function openGate() {
    if (opened) return;
    opened = true;
    gate.classList.add('opening');
    mBtn.classList.add('show');
    if (wantMusic) playMusic(); else mBtn.classList.add('off');
    document.body.classList.remove('locked');
    window.scrollTo(0, 0);
    shower(innerWidth > 900 ? 140 : 90, 7000);
    setTimeout(function () { gate.remove(); checkReveal(); startBird(); }, 1900);
  }
  gate.addEventListener('click', openGate);

  /* ---------- reveal ---------- */
  var items = [].slice.call(document.querySelectorAll('.reveal'));
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  function checkReveal() {
    items.forEach(function (el, i) {
      if (io) { el.style.transitionDelay = (el.closest('.hero') ? i * 0.12 : 0) + 's'; io.observe(el); }
      else el.classList.add('in');
    });
  }
  if (!gate) checkReveal();

  /* ---------- scroll cue ---------- */
  [].forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () {
      var el = document.querySelector(b.getAttribute('data-go'));
      if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- countdown ---------- */
  var cd = document.getElementById('countdown');
  var out = {};
  [].forEach.call(cd.querySelectorAll('b'), function (b) { out[b.getAttribute('data-k')] = b; });
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tick() {
    var ms = EVENT_START - Date.now();
    if (ms <= 0) {
      cd.hidden = true;
      document.getElementById('cdDone').hidden = false;
      return;
    }
    var s = Math.floor(ms / 1000);
    out.d.textContent = pad(Math.floor(s / 86400));
    out.h.textContent = pad(Math.floor(s % 86400 / 3600));
    out.m.textContent = pad(Math.floor(s % 3600 / 60));
    out.s.textContent = pad(s % 60);
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();

  /* ---------- parallax ---------- */
  var pars = [].slice.call(document.querySelectorAll('[data-par]'));
  var parQueued = false;
  function parallax() {
    parQueued = false;
    var vh = innerHeight;
    pars.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var c = r.top + r.height / 2 - vh / 2;
      el.style.setProperty('--py', (c * parseFloat(el.getAttribute('data-par'))).toFixed(1) + 'px');
    });
  }
  if (!reduced) {
    addEventListener('scroll', function () { if (!parQueued) { parQueued = true; requestAnimationFrame(parallax); } }, { passive: true });
    addEventListener('resize', parallax);
    parallax();
  }

  /* ---------- parrot: flies only while you scroll, perches at the edge when you stop ---------- */
  var parrot = document.getElementById('parrot');
  var fly = parrot.querySelector('.parrot-fly');
  var cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
  var frameN = 0, acc = 0, lastY = scrollY, idleT = null, resting = false, facing = -1, birdOn = false, looping = false;

  function setFrame(n) { frameN = n % 4; fly.style.backgroundPosition = (frameN * 100 / 3) + '% 0'; }
  function pathTarget() {
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    var w = parrot.offsetWidth, minX = 6, maxX = innerWidth - w - 6;
    return {
      x: minX + (maxX - minX) * (0.5 - 0.5 * Math.cos(p * Math.PI * 7)),
      y: innerHeight * (0.14 + 0.5 * (0.5 - 0.5 * Math.cos(p * Math.PI * 11 + 1.2)))
    };
  }
  function place() {
    parrot.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0)';
    parrot.style.setProperty('--fx', facing);
  }
  function loop() {
    var dx = tgt.x - cur.x, dy = tgt.y - cur.y;
    cur.x += dx * 0.09; cur.y += dy * 0.09;
    if (!resting && Math.abs(dx) > 1.5) facing = dx > 0 ? 1 : -1;
    place();
    if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) requestAnimationFrame(loop);
    else looping = false;
  }
  function kick() { if (!looping) { looping = true; requestAnimationFrame(loop); } }
  function rest() {
    resting = true;
    var w = parrot.offsetWidth;
    var left = cur.x + w / 2 < innerWidth / 2;
    tgt.x = left ? 6 : innerWidth - w - 6;
    facing = left ? 1 : -1;
    parrot.classList.add('rest');
    kick();
  }
  function onBirdScroll() {
    if (!birdOn) return;
    var d = Math.abs(scrollY - lastY); lastY = scrollY;
    acc += d;
    while (acc > 16) { acc -= 16; setFrame(frameN + 1); }
    if (resting) { resting = false; parrot.classList.remove('rest'); }
    tgt = pathTarget();
    kick();
    clearTimeout(idleT);
    idleT = setTimeout(rest, 450);
  }
  function startBird() {
    birdOn = true;
    lastY = scrollY;
    cur = { x: innerWidth - parrot.offsetWidth - 6, y: innerHeight * 0.3 };
    tgt = pathTarget();
    place();
    parrot.classList.add('on');
    if (reduced) { rest(); return; }
    var n = 0, t = setInterval(function () { setFrame(frameN + 1); if (++n > 14) clearInterval(t); }, 85);
    kick();
    idleT = setTimeout(rest, 1300);
  }
  addEventListener('scroll', onBirdScroll, { passive: true });
  addEventListener('resize', function () { if (birdOn) { tgt = resting ? tgt : pathTarget(); if (resting) rest(); } });
})();
