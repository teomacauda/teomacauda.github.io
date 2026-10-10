try { if (window.top !== window.self) { void window.top.location.href; } } catch (e) { document.documentElement.innerHTML = ''; }   // la pagina non si mostra dentro un altro sito
/* RAW OS · funzioni comuni dei tool (si carica prima del programma del tool)
   conferma e avvisi dentro la pagina, foto profilo da Instagram, copia negli appunti, piccole utilità. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ---- avvisi (al posto di alert) ----
  var toastTimer = 0;
  function avviso(testo) {
    var t = $('toast'); if (!t) return;
    t.textContent = testo; t.hidden = false; t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.hidden = true; }, 300); }, 4200);
  }

  // ---- conferma (al posto di confirm): restituisce una promessa true/false ----
  function conferma(testo, okLabel, titolo) {
    return new Promise(function (resolve) {
      $('conf-titolo').textContent = titolo || 'Sei sicuro?';
      $('conf-testo').textContent = testo;
      $('conf-ok').textContent = okLabel || 'Elimina';
      var m = $('conf-modal');
      var chiudi = function (v) { m.classList.remove('on'); m.setAttribute('aria-hidden', 'true'); $('conf-ok').onclick = $('conf-no').onclick = null; document.removeEventListener('keydown', tasto, true); resolve(v); };
      var tasto = function (e) { if (e.key === 'Escape') { e.stopPropagation(); chiudi(false); } };
      $('conf-ok').onclick = function () { chiudi(true); };
      $('conf-no').onclick = function () { chiudi(false); };
      m.onmousedown = function (e) { if (e.target === m) chiudi(false); };
      document.addEventListener('keydown', tasto, true);
      m.classList.add('on'); m.setAttribute('aria-hidden', 'false');
      setTimeout(function () { $('conf-no').focus(); }, 60);
    });
  }
  function erroreTesto(e) { return (e && e.code === 'permission-denied') ? 'Firebase non permette questa operazione con il tuo accesso.' : 'Qualcosa non ha funzionato, riprova.'; }

  // ---- copia negli appunti ----
  function copiaTesto(testo, spanEl) {
    var fatto = function () { if (!spanEl) { avviso('Copiato negli appunti.'); return; } var prima = spanEl.textContent; spanEl.textContent = 'Copiato!'; setTimeout(function () { spanEl.textContent = prima; }, 1800); };
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = testo; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); if (ok) fatto(); else avviso(testo);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(testo).then(fatto, fallback); else fallback();
  }

  // ---- Instagram: nome del profilo e foto ----
  function utenteInstagram(s) {
    s = String(s || '').trim(); if (!s) return '';
    var m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i) || s.match(/^@?([A-Za-z0-9._]+)$/);
    return m ? m[1].replace(/\/+$/, '') : '';
  }
  // ritaglia al centro e riduce a 160 px: nel documento resta una miniatura leggerissima
  function riduciFoto(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob), img = new Image();
      img.onload = function () {
        var S = 160, c = document.createElement('canvas'); c.width = c.height = S;
        var lato = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - lato) / 2, sy = (img.naturalHeight - lato) / 2;
        c.getContext('2d').drawImage(img, sx, sy, lato, lato, 0, 0, S, S);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', .85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('immagine non valida')); };
      img.src = url;
    });
  }
  // legge la pagina pubblica "embed" del profilo con il servizio gratuito r.jina.ai (Instagram non si può leggere direttamente da un sito)
  async function fotoDaInstagram(utente) {
    var r = await fetch('https://r.jina.ai/https://www.instagram.com/' + encodeURIComponent(utente) + '/embed/');
    if (!r.ok) throw new Error('profilo non raggiungibile');
    var testo = await r.text();
    var m = testo.match(/!\[[^\]]*profile picture\]\((https:[^)\s]+)\)/i);
    if (!m) throw new Error('foto non trovata');
    var img = await fetch(m[1]);
    if (!img.ok) throw new Error('foto non scaricabile');
    return riduciFoto(await img.blob());
  }
  function iniziali(nome) { return String(nome || '?').trim().split(/\s+/).filter(function (w) { return /^[A-Za-zÀ-ÿ0-9]/.test(w); }).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase() || '?'; }
  function avatarHtml(d) { return d && d.avatar ? '<img src="' + esc(d.avatar) + '" alt="" loading="lazy" decoding="async">' : '<b>' + esc(iniziali(d && d.clientName)) + '</b>'; }

  // ---- indirizzi leggibili ----
  function createSlug(text) {
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
  }

  window.RawUI = { $: $, esc: esc, avviso: avviso, conferma: conferma, erroreTesto: erroreTesto, copiaTesto: copiaTesto, utenteInstagram: utenteInstagram, riduciFoto: riduciFoto, fotoDaInstagram: fotoDaInstagram, iniziali: iniziali, avatarHtml: avatarHtml, createSlug: createSlug };
})();
