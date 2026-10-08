// Sito 3.0 · Teo Macauda
// 1) menu mobile  2) intro del logo  3) scrollytelling
(function () {
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- 1. Menu mobile a tutto schermo ---------- */
  var btn = $('menuBtn'), pannello = $('menuPannello');
  if (btn && pannello) {
    var apri = function () {
      pannello.classList.add('aperto'); root.classList.add('menu-aperto');
      btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Chiudi il menu');
      var primo = pannello.querySelector('a'); if (primo) setTimeout(function () { primo.focus({ preventScroll: true }); }, 80);
    };
    var chiudi = function (rimettiFocus) {
      pannello.classList.remove('aperto'); root.classList.remove('menu-aperto');
      btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Apri il menu');
      if (rimettiFocus === true) btn.focus({ preventScroll: true });
    };
    btn.addEventListener('click', function () { if (pannello.classList.contains('aperto')) chiudi(); else apri(); });
    pannello.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { chiudi(); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pannello.classList.contains('aperto')) chiudi(true); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 768) chiudi(); });
  }

  /* ---------- 2. Intro: il logo si disegna, si riempie, va nell'angolo ---------- */
  var intro = $('intro'), svg = $('introLogo'), bg = $('introBg');
  var finito = false;
  function fine() {
    if (finito) return; finito = true;
    root.classList.remove('intro-wait');   // fa comparire logo, menu e hero con le loro transizioni
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    onScroll();
  }
  function avviaIntro() {
    if (!root.classList.contains('intro-wait') || !intro || !svg || !svg.animate) { fine(); return; }
    var paths = svg.querySelectorAll('path');
    var ease = 'cubic-bezier(.65,0,.35,1)';
    var fillOpts = { duration: 600, easing: 'ease-out', fill: 'forwards' };
    intro.addEventListener('click', fine);
    document.addEventListener('keydown', fine, { once: true });
    setTimeout(fine, 8000); // rete di sicurezza

    var disegni = [];
    paths.forEach(function (p, i) {
      disegni.push(p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1500, delay: i * 260, easing: ease, fill: 'forwards' }).finished);
    });
    Promise.all(disegni).then(function () {
      var riempi = [];
      paths.forEach(function (p) { riempi.push(p.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], fillOpts).finished); });
      return Promise.all(riempi);
    }).then(function () {
      return new Promise(function (r) { setTimeout(r, 250); });
    }).then(function () {
      if (finito) return;
      var logo = document.querySelector('.logo');
      var a = svg.getBoundingClientRect(), b = logo.getBoundingClientRect();
      var scala = b.width / a.width;
      var mov = svg.animate([
        { transform: 'translate(0px,0px) scale(1)' },
        { transform: 'translate(' + (b.left - a.left) + 'px,' + (b.top - a.top) + 'px) scale(' + scala + ')' }
      ], { duration: 950, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 750, delay: 200, easing: 'ease', fill: 'forwards' });
      return mov.finished;
    }).then(fine, fine);
  }

  /* ---------- 3. Scrollytelling ---------- */
  var sc = root.classList.contains('sc');
  var progresso = $('progresso');
  var hero = document.querySelector('.hero'), figura = $('figura');
  var metodo = $('metodo'), luce = document.querySelector('.metodo-luce');
  var parole = [];
  var carte = Array.prototype.slice.call(document.querySelectorAll('.carta'));
  var capitoli = Array.prototype.slice.call(document.querySelectorAll('[data-cap]'));
  var capNum = $('capNum'), capNome = $('capNome'), capAttuale = '';

  // Tabellone a lamelle: ogni carattere è una cella che si gira come in un flip clock
  function Tabellone(el, lunghezza, classe) {
    this.celle = [];
    if (classe) el.classList.add(classe);
    for (var i = 0; i < lunghezza; i++) {
      var c = document.createElement('span'); c.className = 'fl vuoto';
      c.innerHTML = '<span class="m t"><b></b></span><span class="m u"><b></b></span><span class="m ft"><b></b></span><span class="m fb"><b></b></span>';
      el.appendChild(c);
      this.celle.push({ el: c, ch: ' ', t: c.querySelector('.t b'), u: c.querySelector('.u b'), ft: c.querySelector('.ft b'), fb: c.querySelector('.fb b'), ftE: c.querySelector('.ft'), fbE: c.querySelector('.fb') });
    }
  }
  Tabellone.prototype.imposta = function (testo, animato) {
    var t = String(testo).toUpperCase();
    this.celle.forEach(function (c, i) {
      var nuovo = t.charAt(i) || ' ';
      if (nuovo === c.ch) return;
      c.ch = nuovo;                                   // lettera che la cella deve mostrare alla fine
      c.tok = (c.tok || 0) + 1; var tok = c.tok;       // ogni nuova richiesta annulla le precedenti ancora in corso
      clearTimeout(c.timer);
      c.ftE.getAnimations().forEach(function (x) { x.cancel(); }); c.fbE.getAnimations().forEach(function (x) { x.cancel(); });
      c.fbE.style.transform = 'rotateX(90deg)';
      var mostrato = c.mostrato === undefined ? ' ' : c.mostrato;
      var fissa = function (ch) {
        c.mostrato = ch; c.t.textContent = ch; c.u.textContent = ch; c.ft.textContent = ch; c.fb.textContent = ch;
        c.el.classList.toggle('vuoto', ch === ' ');
      };
      if (animato === false || !c.ftE.animate) { fissa(nuovo); return; }
      fissa(mostrato);                                // riparte sempre da uno stato pulito
      c.timer = setTimeout(function () {
        if (tok !== c.tok) return;
        c.el.classList.toggle('vuoto', false);
        c.t.textContent = nuovo; c.u.textContent = mostrato; c.ft.textContent = mostrato; c.fb.textContent = nuovo;
        c.ftE.style.opacity = 1; c.fbE.style.opacity = 1;
        var a = c.ftE.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: 190, easing: 'ease-in', fill: 'forwards' });
        a.finished.then(function () {
          if (tok !== c.tok) return;
          var bb = c.fbE.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: 210, easing: 'cubic-bezier(.3,1.5,.6,1)', fill: 'forwards' });
          return bb.finished;
        }).then(function () {
          if (tok !== c.tok) return;
          c.ftE.getAnimations().forEach(function (x) { x.cancel(); }); c.fbE.getAnimations().forEach(function (x) { x.cancel(); });
          c.fbE.style.transform = 'rotateX(90deg)';
          fissa(nuovo);
        }).catch(function () {});
      }, i * 45);
    });
  };
  var tabNum = capNum ? new Tabellone(capNum, 2, 'num') : null;
  var tabNome = capNome ? new Tabellone(capNome, 12) : null;
  var cap0 = document.querySelector('[data-cap]');
  if (tabNum && cap0) { var q0 = cap0.getAttribute('data-cap').split('|'); tabNum.imposta(q0[0], false); tabNome.imposta(q0[1], false); capAttuale = cap0.getAttribute('data-cap'); }

  if (sc) {
    // il testo del metodo diventa una fila di parole che si accendono
    document.querySelectorAll('#metodoTesti p').forEach(function (p) {
      var testo = p.textContent.trim().split(/\s+/);
      p.textContent = '';
      testo.forEach(function (t, i) {
        var s = document.createElement('span'); s.className = 'w'; s.textContent = t;
        p.appendChild(s); if (i < testo.length - 1) p.appendChild(document.createTextNode(' '));
        parole.push(s);
      });
    });
    carte.forEach(function (c, i) { c.style.setProperty('--i', i); });

    // elementi che compaiono quando entrano
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { threshold: .18 });
    document.querySelectorAll('.rv, .rv-cta').forEach(function (e) { io.observe(e); });
    // dopo l'ingresso della hero, il ritratto passa sotto il controllo dello scroll
    if (figura) figura.addEventListener('transitionend', function f(e) { if (e.propertyName === 'transform') { figura.classList.add('fatto'); figura.removeEventListener('transitionend', f); } });
    setTimeout(function () { if (figura) figura.classList.add('fatto'); }, 9000);
  }

  var stick = [];
  function misura() {
    if (!sc || !carte.length) return;
    var gap = parseFloat(getComputedStyle(root).getPropertyValue('--gap-clienti')) || 110;
    stick = carte.map(function (c) { return parseFloat(getComputedStyle(c).top) || 104; });
    root.style.setProperty('--spazio', Math.round(carte[carte.length - 1].offsetHeight + gap + 60) + 'px');
  }
  var tick = false;
  function onScroll() {
    if (!sc || root.classList.contains('intro-wait')) return;
    var y = window.pageYOffset, vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    if (progresso) progresso.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0);

    if (hero) {
      var hp = clamp(y / (vh * .9), 0, 1);
      hero.style.setProperty('--hp', hp.toFixed(4));
      hero.style.setProperty('--ho', clamp(1 - hp * 1.3, 0, 1).toFixed(4));   // il blocco iniziale si dissolve mentre arriva il metodo
    }

    if (metodo) {
      var r = metodo.getBoundingClientRect();
      var mp = clamp(-r.top / (r.height - vh), 0, 1);
      metodo.style.setProperty('--mp', mp.toFixed(4));
      // il metodo compare dissolvendosi in entrata e sparisce dissolvendosi in uscita
      var entra = clamp((vh * .62 - r.top) / (vh * .5), 0, 1), esce = clamp((r.bottom - vh * .3) / (vh * .7), 0, 1);
      metodo.style.setProperty('--mo', Math.min(entra, esce).toFixed(4));
      var n = parole.length, soglia = clamp((mp - .06) / .78, 0, 1) * n;
      for (var i = 0; i < n; i++) parole[i].classList.toggle('on', i < soglia);
    }

    // carte impilate: quella sotto spinge indietro quella sopra
    for (var k = 0; k < carte.length; k++) {
      var h = carte[k].offsetHeight, t;
      // la carta (o la sezione) che arriva dopo spinge indietro questa
      var succ = k < carte.length - 1 ? carte[k + 1] : document.getElementById('clienti');
      t = clamp(1 - (succ.getBoundingClientRect().top - (k < carte.length - 1 ? stick[k + 1] : stick[k])) / h, 0, 1);
      carte[k].style.transform = 'scale(' + (1 - t * .06).toFixed(4) + ')';
      carte[k].style.filter = 'brightness(' + (1 - t * .35).toFixed(3) + ')';
    }

    // capitolo corrente
    var cur = capitoli[0];
    capitoli.forEach(function (c) { if (c.getBoundingClientRect().top <= vh * .45) cur = c; });
    if (cur) {
      var d = cur.getAttribute('data-cap');
      if (d !== capAttuale) { var primo = capAttuale === ''; capAttuale = d; var q = d.split('|'); if (tabNum) { tabNum.imposta(q[0], !primo); tabNome.imposta(q[1], !primo); } }
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; onScroll(); }); } }, { passive: true });
  window.addEventListener('resize', function () { misura(); onScroll(); });
  misura();

  // il tabellone dei capitoli sparisce quando entra il piè di pagina
  var piede = document.querySelector('.footer'), cap = $('capitolo');
  if (sc && piede && cap && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (v) { cap.classList.toggle('nascosto', v[0].isIntersecting); }, { threshold: 0 }).observe(piede);
  }

  // clienti: coverflow 3D infinito (il giro ricomincia da capo, sempre)
  (function () {
    var cf = $('cf'); if (!cf) return;
    var cards = [].slice.call(cf.querySelectorAll('.c')), n = cards.length, idx = 0, prev = [], mosso = false;
    var dots = [].slice.call(document.querySelectorAll('.cf-dots i'));
    var meta = Math.floor(n / 2);
    function off(i) { return (((i - idx + meta) % n) + n) % n - meta; }
    function disegna(primo) {
      cards.forEach(function (c, i) {
        var o = off(i), salto = prev[i] !== undefined && Math.abs(o - prev[i]) > meta;
        if (salto || primo) c.style.transition = 'none';
        c.style.setProperty('--o', o); c.style.setProperty('--ao', Math.abs(o));
        c.classList.toggle('centro', o === 0); c.classList.toggle('fuori', Math.abs(o) > 2);
        c.tabIndex = o === 0 ? 0 : -1; c.setAttribute('aria-hidden', Math.abs(o) > 2 ? 'true' : 'false');
        prev[i] = o;
        if (salto || primo) { void c.offsetWidth; c.style.transition = ''; }
      });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
    }
    function vai(s) { idx = (((idx + s) % n) + n) % n; disegna(); }
    cf.classList.add('attivo'); disegna(true);
    var p = document.querySelector('.cf-p'), nx = document.querySelector('.cf-n');
    if (p) p.addEventListener('click', function () { vai(-1); });
    if (nx) nx.addEventListener('click', function () { vai(1); });
    cards.forEach(function (c, i) {
      c.addEventListener('click', function (e) {
        if (mosso) { e.preventDefault(); return; }
        if (off(i) !== 0) { e.preventDefault(); idx = i; disegna(); }   // le card di lato vanno al centro, quella centrale apre il link
      });
      c.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
    var x0 = null;
    cf.addEventListener('pointerdown', function (e) { x0 = e.clientX; mosso = false; });
    window.addEventListener('pointerup', function (e) {
      if (x0 === null) return; var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 42) { mosso = true; vai(dx < 0 ? 1 : -1); setTimeout(function () { mosso = false; }, 60); }
    });
    cf.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { vai(-1); } else if (e.key === 'ArrowRight') { vai(1); } });
  })();

  // si parte quando font e immagine sono pronti, così il ritratto non salta
  var img = document.querySelector('.cerchio img');
  var pronto = Promise.all([
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
    img && !img.complete ? new Promise(function (r) { img.addEventListener('load', r); img.addEventListener('error', r); }) : Promise.resolve()
  ]);
  pronto.then(avviaIntro, avviaIntro);
})();
