// Pagina Lavori: finestra video con copertina che vola, numeri animati, sottomenu che segue la lettura
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h) e.innerHTML = h; return e; }

  /* ---------- finestra video ---------- */
  var lbx = document.getElementById('lbx');
  var EASE = 'cubic-bezier(.16,1,.3,1)', KEY = 'consenso_video_teo', aperto = null, chiudendo = false;
  function haConsenso() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function dai() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }

  function player(card, k, titolo) {
    var p = el('div', 'lbx-pl ' + k), src = card.dataset.embed, ig = src.indexOf('instagram.com') > -1;
    var img = card.querySelector('img'); if (img) { var b = el('img', 'bg'); b.src = img.currentSrc || img.src; b.alt = ''; p.appendChild(b); }
    function carica() {
      var vecchio = p.querySelector('.lbx-in'); if (vecchio) vecchio.remove();
      var f = el('iframe'); f.src = src; f.title = titolo; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      f.addEventListener('load', function () { f.classList.add('pronto'); });
      setTimeout(function () { f.classList.add('pronto'); }, 2500);
      p.appendChild(f);
    }
    function chiedi() {
      var c = el('div', 'lbx-in', '<span class="ey"><svg viewBox="0 0 24 24"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/></svg></span><h5>Per guardare, serve il tuo ok</h5><p>Il video arriva da ' + (ig ? 'Instagram' : 'YouTube') + ', che può usare cookie. Lo chiedo una volta sola. <a href="../privacy/#s2" target="_blank" rel="noopener">Informativa</a></p>');
      var ok = el('button', 'btn btn-primario', 'Accetta e guarda'); ok.type = 'button'; ok.onclick = function () { dai(); carica(); };
      var no = el('button', 'no', 'No, grazie'); no.type = 'button'; no.onclick = chiudi;
      c.appendChild(ok); c.appendChild(no); p.appendChild(c);
    }
    if (haConsenso()) carica(); else chiedi();
    return p;
  }
  function testa(titolo) {
    var b = el('div', 'lbx-bar', '<b>' + titolo + '</b>');
    var x = el('button', 'rnd', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'); x.type = 'button'; x.setAttribute('aria-label', 'Chiudi il video'); x.onclick = chiudi; b.appendChild(x); return b;
  }
  // la copertina vola scurendosi come lo sfondo del player: così il passaggio non fa "lampi"
  function k4(r, rad, lum) { return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: rad, filter: 'brightness(' + lum + ')' }; }
  var LUM = .4;
  function ghost(cover, r, lum) {
    var g = el('div', 'lbx-ghost'); g.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;filter:brightness(' + lum + ');background-image:url("' + cover + '")';
    document.body.appendChild(g); return g;
  }
  function apri(card) {
    if (aperto || !lbx) return;
    var k = card.dataset.k, titolo = card.dataset.t, img = card.querySelector('img'), cover = img ? (img.currentSrc || img.src) : '';
    aperto = { card: card, cover: cover };
    root.classList.add('menu-aperto');
    lbx.innerHTML = ''; var bk = el('div', 'lbx-bk'); lbx.appendChild(bk);
    var bx = el('div', 'lbx-box ' + k); bx.appendChild(testa(titolo)); var pl = player(card, k, titolo); bx.appendChild(pl); lbx.appendChild(bx); lbx.classList.add('on');
    if (reduce || !bx.animate) return;
    var r0 = card.querySelector('.vim').getBoundingClientRect();
    card.classList.add('lift'); bx.style.opacity = 0; pl.style.visibility = 'hidden';
    var r1 = pl.getBoundingClientRect(), g = ghost(cover, r0, 1);
    bk.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 560, easing: 'ease', fill: 'both' });
    var a = g.animate([k4(r0, '22px', 1), k4(r1, '18px', LUM)], { duration: 780, easing: EASE, fill: 'forwards' });
    bx.animate([{ opacity: 0, transform: 'translateY(22px) scale(.965)' }, { opacity: 1, transform: 'none' }], { duration: 640, delay: 200, easing: EASE, fill: 'both' });
    a.finished.then(function () {
      if (!aperto) return;
      pl.style.visibility = 'visible';
      requestAnimationFrame(function () { g.remove(); });
      bx.classList.add('shine'); var f = bx.querySelector('.rnd'); if (f) f.focus({ preventScroll: true });
    });
  }
  function fine() {
    var c = aperto && aperto.card;
    if (c) { c.classList.add('snap'); c.classList.remove('lift'); void c.offsetWidth; }   // la scheda riappare di colpo, sotto la copertina che arriva
    requestAnimationFrame(function () {
      document.querySelectorAll('.lbx-ghost').forEach(function (g) { g.remove(); });
      lbx.classList.remove('on'); lbx.innerHTML = '';
      root.classList.remove('menu-aperto');
      if (c) { c.classList.remove('snap'); try { c.focus({ preventScroll: true }); } catch (e) {} }
      aperto = null; chiudendo = false;
    });
  }
  function chiudi() {
    if (!aperto || chiudendo) return;
    var bx = lbx.querySelector('.lbx-box'), pl = bx && bx.querySelector('.lbx-pl'), bk = lbx.querySelector('.lbx-bk');
    var f = pl && pl.querySelector('iframe'); if (f) f.remove();           // ferma subito il video
    if (reduce || !bx || !bx.animate) { fine(); return; }
    chiudendo = true;
    var r1 = pl.getBoundingClientRect(), r0 = aperto.card.querySelector('.vim').getBoundingClientRect();
    var g = ghost(aperto.cover, r1, LUM);
    pl.style.visibility = 'hidden';
    bx.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
    bk.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, delay: 70, easing: 'ease', fill: 'forwards' });
    g.animate([k4(r1, '18px', LUM), k4(r0, '22px', 1)], { duration: 640, easing: EASE, fill: 'forwards' }).finished.then(fine, fine);
  }
  document.querySelectorAll('.vcard[data-embed]').forEach(function (c) {
    c.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; e.preventDefault(); apri(c); });
  });
  if (lbx) {
    lbx.addEventListener('click', function (e) { if (e.target === lbx || e.target.classList.contains('lbx-bk')) chiudi(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudi(); });
  }

  /* ---------- numeri dei casi studio che salgono ---------- */
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }   // punto ogni tre cifre, anche per 1.500
  function conta(num, durata, ritardo) {
    var fin = parseInt(num.dataset.count, 10), pre = num.dataset.pre || '', suf = num.dataset.suf || '';
    var t0 = null;
    function passo(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / durata), e = 1 - Math.pow(1 - p, 4);       // rallenta in arrivo
      num.textContent = pre + fmt(Math.round(fin * e)) + suf;
      if (p < 1) requestAnimationFrame(passo); else num.textContent = pre + fmt(fin) + suf;
    }
    num.textContent = pre + '0' + suf;
    setTimeout(function () { requestAnimationFrame(passo); }, ritardo);
  }
  var casi = document.querySelectorAll('.lv-caso');
  if (!reduce && 'IntersectionObserver' in window && casi.length) {
    var ioc = new IntersectionObserver(function (v) {
      v.forEach(function (x) {
        if (!x.isIntersecting) return; ioc.unobserve(x.target);
        var c = x.target; c.classList.add('conta');
        c.querySelectorAll('.num').forEach(function (n, i) { conta(n, i === 0 ? 2200 : 1800, 250 + i * 220); });
        var barra = c.querySelector('.barra'); if (barra && barra.animate) barra.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 2200, delay: 250, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
        setTimeout(function () { c.classList.add('fatto'); }, 2500);
      });
    }, { threshold: .4 });
    casi.forEach(function (c) {
      c.querySelectorAll('.num').forEach(function (n) { n.textContent = (n.dataset.pre || '') + '0' + (n.dataset.suf || ''); });
      ioc.observe(c);
    });
  } else {
    casi.forEach(function (c) { c.classList.add('conta'); });
  }

})();
