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

  /* ---------- gate ---------- */
  var gate = document.getElementById('gate');
  var opened = false;
  function openGate() {
    if (opened) return;
    opened = true;
    gate.classList.add('opening');
    document.body.classList.remove('locked');
    window.scrollTo(0, 0);
    shower(innerWidth > 900 ? 140 : 90, 7000);
    setTimeout(function () { gate.remove(); checkReveal(); }, 1900);
  }
  document.getElementById('openBtn').addEventListener('click', openGate);

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

  /* ---------- calendar ---------- */
  document.getElementById('icsBtn').addEventListener('click', function () {
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SriRamaVarma-DivyaSri//Engagement//TE', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:sriramavarma-divyasri-20261111@invite',
      'DTSTAMP:20261109T000000Z',
      'DTSTART:20261111T044400Z',
      'DTEND:20261111T083000Z',
      'SUMMARY:శ్రీ రామ వర్మ & దివ్య శ్రీ నిశ్చితార్థ మహోత్సవం',
      'DESCRIPTION:సుముహూర్తం ఉదయం 10:14\\nవిందు భోజనం మధ్యాహ్నం 12:30 నుండి',
      'LOCATION:కళ్యాణి హైట్స్\\, ఏలూరు',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:నిశ్చితార్థ మహోత్సవం', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'SriRamaVarma-DivyaSri-Engagement.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  /* ---------- share ---------- */
  document.getElementById('shareBtn').addEventListener('click', function () {
    var url = location.href.split('#')[0];
    var text = 'చి|| చల్లగాలి శ్రీ రామ వర్మ & చి||ల||సౌ|| అంబటి దివ్య శ్రీ నిశ్చితార్థ మహోత్సవానికి సాదర ఆహ్వానం 🌸\nనవంబర్ 11, 2026 · ఉదయం 10:14 · కళ్యాణి హైట్స్, ఏలూరు\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });
})();
