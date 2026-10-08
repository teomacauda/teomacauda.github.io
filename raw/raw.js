/* RAW OS · parte comune (centro + tool)
   - elenco unico degli strumenti (nome, indirizzo, icona)
   - selettore rapido: ⌘K / Ctrl+K / "/" o il bottone "Strumenti" in barra, da qualsiasi pagina
   - ricorda l'ultimo strumento usato
   Nei tool basterà includere raw.css + raw.js e la barra .os-bar. */
(function () {
  var ICO = {
    script: '<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 16.5h4"/><path class="m3" d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4z"/>',
    piani: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 3v3M16 3v3"/><path class="m2" d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
    consegna: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/><path class="m2" d="M10.5 9.5l4 2.5-4 2.5z"/>',
    revisioni: '<path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12z"/><path class="m2" d="M8.4 12.2l2.6 2.6 4.8-5"/>',
    preventivi: '<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2z"/><path class="m2" d="M14 11.2a3 3 0 1 0 0 4.6M9.2 12.6H13M9.2 14.4H13"/>',
    hubclienti: '<circle class="m2" cx="9" cy="8.5" r="3.6"/><path d="M2.8 20c.4-3.5 3-5.6 6.2-5.6s5.8 2.1 6.2 5.6"/><path class="m1" d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 14.8c2 .7 3.3 2.4 3.6 5.2"/>',
    report: '<path d="M3.5 21h17"/><path class="m1" d="M6 21v-6M11 21V9.5M16 21v-9M20.5 21V4.5"/><path class="m2" d="M5 8.5l4.5-3 3.5 2.5 6-4.5"/>',
    videoaudit: '<circle cx="10.5" cy="10.5" r="7"/><path class="m3" d="M16 16l5 5"/><path class="m2" d="M9 8v5l4-2.5z"/>'
  };
  var TOOLS = [
    { id: 'script',     href: '/script',          nome: 'Script',          sub: 'Copywriting',   fase: 'Idea',      desc: 'Scrivi e organizza gli script, video per video.' },
    { id: 'piani',      href: '/pianieditoriali', nome: 'Piani editoriali', sub: 'Editorial grid', fase: 'Idea',      desc: 'Il calendario dei contenuti da pubblicare, condiviso col cliente.' },
    { id: 'consegna',   href: '/consegnavideo',   nome: 'Consegna',        sub: 'Video hub',     fase: 'Consegna',  desc: 'Consegna i video finiti in un link ordinato.' },
    { id: 'revisioni',  href: '/revisioni',       nome: 'Revisioni',       sub: 'Approval',      fase: 'Consegna',  desc: 'Il cliente commenta la bozza e la approva.' },
    { id: 'preventivi', href: '/preventivi',      nome: 'Preventivi',      sub: 'Budgeting',     fase: 'Cliente',   desc: 'Accordi e preventivi che il cliente firma online.' },
    { id: 'hubclienti', href: '/hubclienti',      nome: 'Hub clienti',     sub: 'Workspace',     fase: 'Cliente',   desc: 'Un’area riservata per ogni cliente.' },
    { id: 'report',     href: '/report',          nome: 'Report',          sub: 'Performance',   fase: 'Risultati', desc: 'I report mensili sulle performance.' },
    { id: 'videoaudit', href: '/videoaudit',      nome: 'Video audit',     sub: 'Analysis',      fase: 'Risultati', desc: 'L’analisi di un video, con la pagina per il cliente.' }
  ];
  TOOLS.forEach(function (t, i) { t.n = i + 1; t.ico = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICO[t.id] + '</svg>'; });

  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8.5 7H17v8.5"/></svg>';

  // ---- strumento corrente e ultimo usato ----
  function corrente() {
    var p = location.pathname.replace(/\/+$/, '').toLowerCase();
    for (var i = 0; i < TOOLS.length; i++) if (p === TOOLS[i].href || p.indexOf(TOOLS[i].href + '/') === 0) return TOOLS[i];
    return null;
  }
  var qui = corrente();
  try { if (qui) localStorage.setItem('raw_ultimo', qui.id); } catch (e) {}
  function ultimo() { try { return localStorage.getItem('raw_ultimo') || ''; } catch (e) { return ''; } }

  // ---- selettore rapido ----
  var vel = null, inp = null, lista = null, sel = 0, trovati = TOOLS.slice(), prima = null;
  function costruisci() {
    vel = document.createElement('div'); vel.className = 'cmd'; vel.setAttribute('aria-hidden', 'true');
    vel.innerHTML = '<div class="cmd-box" role="dialog" aria-modal="true" aria-label="Vai a uno strumento">' +
      '<div class="cmd-cerca"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>' +
      '<input type="text" placeholder="Vai a uno strumento…" aria-label="Cerca uno strumento" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>' +
      '<ul class="cmd-lista" role="listbox"></ul>' +
      '<div class="cmd-piede"><span><kbd>↑</kbd><kbd>↓</kbd> scegli</span><span><kbd>↵</kbd> apri</span><span><kbd>1</kbd>–<kbd>8</kbd> salto diretto</span></div></div>';
    document.body.appendChild(vel);
    inp = vel.querySelector('input'); lista = vel.querySelector('.cmd-lista');
    vel.addEventListener('mousedown', function (e) { if (e.target === vel) chiudi(); });
    inp.addEventListener('input', filtra);
    lista.addEventListener('mousemove', function (e) { var li = e.target.closest('li'); if (li) { sel = +li.getAttribute('data-i'); evidenzia(); } });
    lista.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) vai(trovati[+li.getAttribute('data-i')]); });
  }
  function disegna() {
    if (!trovati.length) { lista.innerHTML = '<li class="cmd-vuoto">Nessuno strumento con questo nome.</li>'; return; }
    var u = ultimo();
    lista.innerHTML = trovati.map(function (t, i) {
      var tag = (qui && qui.id === t.id) ? '<em>Sei qui</em>' : (u === t.id ? '<em>Ultimo</em>' : '');
      return '<li role="option" data-i="' + i + '"><span class="ci">' + t.ico + '</span><span class="ct"><b>' + t.nome + '</b><small>' + t.desc + '</small></span>' + tag + '<span class="cn">' + t.n + '</span></li>';
    }).join('');
    evidenzia();
  }
  function evidenzia() {
    Array.prototype.forEach.call(lista.querySelectorAll('li[data-i]'), function (li) {
      var on = +li.getAttribute('data-i') === sel; li.classList.toggle('on', on); li.setAttribute('aria-selected', on);
      if (on && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
    });
  }
  function filtra() {
    var q = inp.value.trim().toLowerCase();
    trovati = TOOLS.filter(function (t) { return !q || (t.nome + ' ' + t.sub + ' ' + t.desc + ' ' + t.fase).toLowerCase().indexOf(q) > -1; });
    sel = 0; disegna();
  }
  function vai(t) { if (!t) return; try { localStorage.setItem('raw_ultimo', t.id); } catch (e) {} location.href = t.href; }
  function apri() {
    if (!vel) costruisci();
    prima = document.activeElement; inp.value = ''; trovati = TOOLS.slice();
    sel = Math.max(0, qui ? TOOLS.indexOf(qui) : 0); disegna();
    vel.classList.add('on'); vel.setAttribute('aria-hidden', 'false'); document.body.classList.add('cmd-aperto');
    setTimeout(function () { inp.focus(); }, 30);
  }
  function chiudi() {
    if (!vel) return;
    vel.classList.remove('on'); vel.setAttribute('aria-hidden', 'true'); document.body.classList.remove('cmd-aperto');
    if (prima && prima.focus) prima.focus();
  }
  function aperto() { return vel && vel.classList.contains('on'); }

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase(), scrivo = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); aperto() ? chiudi() : apri(); return; }
    if (!aperto()) { if (e.key === '/' && !scrivo && !e.metaKey && !e.ctrlKey) { e.preventDefault(); apri(); } return; }
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (trovati.length) { sel = (sel + 1) % trovati.length; evidenzia(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (trovati.length) { sel = (sel - 1 + trovati.length) % trovati.length; evidenzia(); } }
    else if (e.key === 'Enter') { e.preventDefault(); vai(trovati[sel]); }
    else if (/^[1-8]$/.test(e.key) && !inp.value) { e.preventDefault(); vai(TOOLS[+e.key - 1]); }
  });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-raw-strumenti]'); if (b) { e.preventDefault(); apri(); } });

  window.RawOS = { tools: TOOLS, arrow: ARROW, apri: apri, chiudi: chiudi, corrente: qui, ultimo: ultimo, vai: vai };
})();
