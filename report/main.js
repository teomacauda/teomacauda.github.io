import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addDocLink as addDoc, trovaPerLink } from "../raw/link.js";

const firebaseConfig = {
    apiKey: "AIzaSyDObANtROtJZiReey0mKzwN4m0oKoCrcOY",
    authDomain: "script-sito.firebaseapp.com",
    projectId: "script-sito",
    storageBucket: "script-sito.firebasestorage.app",
    messagingSenderId: "863535754551",
    appId: "G-7YHRQZCNMN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== Report · logica =====
// Sopra (import e collegamento a Firebase) è copiato identico dalla versione precedente.
// Dati: collezione "reportMensili" { title, slug, clientAvatarUrl, followersIg/Tt/Yt, kpiReachedCount, kpiViewsCount, kpiViewsPct,
//   items[{ title, type, link, views, likes, comments, shares, reposts, saves }], + clienteId, avatar, createdAt (nuovi, facoltativi) }.
// Alcuni report vecchi non hanno createdAt: si legge tutta la collezione e si ordina qui. L'indirizzo (slug) di un report non cambia mai.

const { $, esc, avviso, conferma, erroreTesto, copiaTesto, avatarHtml, createSlug, utenteInstagram, fotoDaInstagram } = window.RawUI;

const urlParams = new URLSearchParams(window.location.search);
const reportSlug = urlParams.get('v');            // report: l'admin lo modifica, il cliente lo guarda
const clienteSlugUrl = urlParams.get('c');        // report di un cliente (solo admin)
const anteprima = urlParams.get('anteprima') === '1';
const SENZA = '_senza';
const TIPI = ['Reel', 'Post', 'Storia', 'Video YT', 'YT Shorts', 'TikTok'];

const IC = {
    instagram: '<path fill-rule="evenodd" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.2-3.4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/>',
    tiktok: '<path d="M16.5 3c.3 2.4 1.8 4 4 4.2v3a7.2 7.2 0 0 1-4-1.3v6.4a6 6 0 1 1-6-6c.3 0 .6 0 .9.1v3.2a2.9 2.9 0 1 0 2 2.7V3h3.1z"/>',
    youtube: '<path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/>',
    image: '<path fill-rule="evenodd" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5 18h14l-4.5-6-3.5 4.5-2-2.5z"/>',
    clock: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1 5v6l4.5 2.5.8-1.4-3.8-2.1V7z"/>',
    video: '<path d="M4 6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2.3l5-2.8v13l-5-2.8V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/>',
    su: '<path d="M12 19V5M5 12l7-7 7 7"/>', giu: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    piu: '<path d="M12 5v14M5 12h14"/>'
};
const ICONA_TIPO = { 'Reel': 'instagram', 'Post': 'image', 'Storia': 'clock', 'Video YT': 'youtube', 'YT Shorts': 'video', 'TikTok': 'tiktok' };
const svgFill = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
const svgLinea = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const FRECCIA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

let reports = [], clienti = [];
let reportCorrente = null, righe = [], sporco = false, clienteAperto = null;
let rawCaricato = false;
function caricaRaw() { if (rawCaricato) return; rawCaricato = true; const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s); }

// ---------- utilità ----------
const num = (v) => parseInt(v, 10) || 0;
const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // sempre con il punto delle migliaia, anche da 4 cifre
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
// "Ally - Luglio 26" -> { m: 6, y: 2026, chiave: 202607, nome: "Luglio 26" }
function periodo(titolo) {
    const m = String(titolo || '').match(new RegExp(`(${MESI.join('|')})\\s+(\\d{2,4})`, 'i'));
    if (!m) return null;
    const mi = MESI.indexOf(m[1].toLowerCase()); let y = parseInt(m[2], 10); if (y < 100) y += 2000;
    return { m: mi, y, chiave: y * 100 + mi + 1, nome: `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} ${String(y).slice(2)}` };
}
const negativo = (s) => /^\s*[-−–]/.test(String(s || ''));
const sommaFollower = (r) => num(r.followersIg) + num(r.followersTt) + num(r.followersYt);
const clienteDi = (r) => clienti.find(c => c.id === r.clienteId) || null;
function ordina(lista) {
    return lista.slice().sort((a, b) => {
        const pa = periodo(a.title), pb = periodo(b.title);
        if (pa && pb && pa.chiave !== pb.chiave) return pb.chiave - pa.chiave;
        if (pa && !pb) return -1; if (!pa && pb) return 1;
        return String(b.title || '').localeCompare(String(a.title || ''), 'it');
    });
}
const PED_TIPI_OK = new Set(TIPI);
function getPiani(data) {
    const d = data || {}, out = [];
    if ((d.videos && d.videos.length) || d.pianoNome) out.push({ id: 'main', nome: d.pianoNome || 'Piano principale', videos: d.videos || [] });
    (d.piani || []).forEach(p => out.push({ id: p.id, nome: p.nome || 'Piano', videos: p.videos || [] }));
    return out;
}

// ---------- caricamento (admin) ----------
async function caricaAdmin() {
    const [rs, cs] = await Promise.all([getDocs(collection(db, "reportMensili")), getDocs(collection(db, "pianiEditoriali"))]);
    reports = []; rs.forEach(d => reports.push({ id: d.id, ...d.data() }));
    clienti = []; cs.forEach(d => { const x = d.data(); if (x.isHub === true) return; clienti.push({ id: d.id, slug: x.slug, clientName: x.clientName || 'Cliente', avatar: x.avatar || '', data: x }); });
}

// ---------- router ----------
function mostra(sez) { ['section-lock', 'section-home', 'section-cliente', 'section-editor', 'section-client'].forEach(id => { $(id).hidden = id !== sez; }); $('main-loader').hidden = true; }
async function initRouter(user) {
    $('main-loader').hidden = false;
    ['section-lock', 'section-home', 'section-cliente', 'section-editor', 'section-client'].forEach(id => { $(id).hidden = true; });
    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    const vistaCliente = !!reportSlug && (!user || anteprima);
    $('admin-indicator').hidden = !user; $('btnStrumenti').hidden = !user; $('btnRaw').hidden = !user;
    $('bar').hidden = !user || vistaCliente;
    $('anteprima-admin').hidden = !(user && vistaCliente);
    if (user) caricaRaw();
    try {
        if (reportSlug) {
            const snap = await trovaPerLink("reportMensili", reportSlug);
            if (snap.empty) { window.location.href = './'; return; }
            const r = { id: snap.docs[0].id, ...snap.docs[0].data() };
            if (user && !anteprima) { await caricaAdmin(); reportCorrente = reports.find(x => x.id === r.id) || r; renderEditor(); mostra('section-editor'); }
            else { document.body.classList.add('vista-cliente'); renderCliente(r); mostra('section-client'); avviaRivelazioni(); if (user) $('anteprima-torna').href = `?v=${encodeURIComponent(reportSlug)}`; }
        } else if (user) {
            await caricaAdmin();
            if (clienteSlugUrl) {
                const c = clienteSlugUrl === SENZA ? { id: SENZA, slug: SENZA, clientName: 'Senza cliente', avatar: '' } : clienti.find(x => x.slug === clienteSlugUrl);
                if (!c) { window.location.href = './'; return; }
                clienteAperto = c; renderClienteAdmin(); mostra('section-cliente');
            } else { renderHome(); mostra('section-home'); }
        } else mostra('section-lock');
    } catch (error) {
        console.error(error);
        if (reportSlug) window.location.href = './'; else { $('main-loader').hidden = true; avviso('Non riesco a caricare i dati. ' + erroreTesto(error)); }
    }
}

// ---------- home: i clienti ----------
const reportDelCliente = (c) => c.id === SENZA ? reports.filter(r => !r.clienteId || !clienti.some(x => x.id === r.clienteId)) : reports.filter(r => r.clienteId === c.id);
function assegnabili() {
    const out = [];
    reportDelCliente({ id: SENZA }).forEach(r => {
        const t = String(r.title || '').trim().toLowerCase();
        const c = clienti.find(c => { const n = c.clientName.trim().toLowerCase(); return n && (t === n || t.startsWith(n + ' ') || t.startsWith(n + '-')); });
        if (c) out.push({ r, c });
    });
    return out;
}
function renderHome() {
    document.title = 'Report · Teo Macauda';
    const grid = $('cat-clienti'); grid.innerHTML = '';
    const card = (href, av, nome, sub) => { const a = document.createElement('a'); a.className = 'contatto vetro'; a.href = href; a.innerHTML = `<span class="avatar l" aria-hidden="true">${av}</span><span class="c-nome"><b>${esc(nome)}</b><small>${esc(sub)}</small></span><span class="freccia">${FRECCIA}</span>`; return a; };
    clienti.forEach(c => { const n = reportDelCliente(c).length; grid.appendChild(card(`?c=${encodeURIComponent(c.slug)}`, avatarHtml({ avatar: c.avatar, clientName: c.clientName }), c.clientName, `${n} ${n === 1 ? 'report' : 'report'}`)); });
    const sc = reportDelCliente({ id: SENZA });
    if (sc.length) grid.appendChild(card(`?c=${SENZA}`, '<b>—</b>', 'Senza cliente', `${sc.length} report`));
    const piu = document.createElement('button'); piu.type = 'button'; piu.className = 'piu';
    piu.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Crea nuovo cliente</span>`; piu.onclick = () => openCustomStep('client');
    grid.appendChild(piu);
    $('btn-new-client-top').onclick = () => openCustomStep('client');
    const ass = assegnabili(), b = $('banner-assegna');
    b.hidden = !sc.length;
    if (sc.length) {
        $('banner-titolo').textContent = sc.length === 1 ? '1 report senza cliente' : `${sc.length} report senza cliente`;
        $('banner-testo').textContent = ass.length ? `Dal titolo riconosco ${ass.length === 1 ? 'a quale cliente appartiene 1 report: posso assegnarlo io' : `a quale cliente appartengono ${ass.length} report: posso assegnarli io`}, e prendono la foto del cliente. ${sc.length > ass.length ? 'Gli altri li assegni tu, aprendoli.' : ''}` : 'Non riconosco il cliente dal titolo: aprili e assegnali tu.';
        $('btn-assegna').hidden = !ass.length;
        $('btn-assegna').onclick = async () => {
            if (!(await conferma(`Assegno ${ass.length === 1 ? '1 report' : ass.length + ' report'} al cliente indicato dal titolo. Non cambia altro.`, 'Assegna', 'Assegnare i report?'))) return;
            let fatti = 0;
            try { for (const x of ass) { const p = { clienteId: x.c.id }; if (x.c.avatar) p.avatar = x.c.avatar; await updateDoc(doc(db, "reportMensili", x.r.id), p); fatti++; } avviso(fatti === 1 ? '1 report assegnato.' : `${fatti} report assegnati.`); }
            catch (e) { avviso(`Assegnati ${fatti}, poi si è fermato. ` + erroreTesto(e)); }
            initRouter(auth.currentUser);
        };
    }
}

// ---------- i report di un cliente ----------
function renderClienteAdmin() {
    const c = clienteAperto; document.title = `${c.clientName} · Report`;
    $('cl-nome').textContent = c.clientName;
    $('cl-avatar').innerHTML = c.id === SENZA ? '<b>—</b>' : avatarHtml({ avatar: c.avatar, clientName: c.clientName });
    const lista = ordina(reportDelCliente(c));
    $('cl-sotto').textContent = `${lista.length} report`;
    $('btn-new-report').onclick = () => apriNuovoReport();
    const grid = $('cat-report'); grid.innerHTML = '';
    lista.forEach(r => {
        const p = periodo(r.title), a = document.createElement('a'); a.className = 'rp-card vetro'; a.href = `?v=${encodeURIComponent(r.slug)}`;
        const cifre = [`<span><b>${(r.items || []).length}</b> contenuti</span>`];
        if (num(r.kpiViewsCount)) cifre.push(`<span><b>${fmt(r.kpiViewsCount)}</b> views</span>`);
        if (sommaFollower(r)) cifre.push(`<span><b>${sommaFollower(r) > 0 ? '+' : ''}${fmt(sommaFollower(r))}</b> follower</span>`);
        a.innerHTML = `<span class="per">${esc(p ? p.nome : 'Report')}</span><h3>${esc(r.title)}</h3><div class="cifre">${cifre.join('')}</div>`;
        grid.appendChild(a);
    });
    $('report-vuoto').hidden = lista.length > 0;
}
function apriNuovoReport() {
    const c = clienteAperto, d = new Date(), mese = MESI[d.getMonth()];
    $('nr-titolo').value = c && c.id !== SENZA ? `${c.clientName} - ${mese.charAt(0).toUpperCase() + mese.slice(1)} ${String(d.getFullYear()).slice(2)}` : '';
    $('new-sotto').textContent = c && c.id !== SENZA ? `Il report mensile di ${c.clientName}.` : 'Il report mensile di un cliente.';
    openCustomStep('new');
}
$('form-new-report').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titolo = $('nr-titolo').value.trim(), c = clienteAperto, bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true;
    try {
        const slug = createSlug(titolo) + '-' + Math.floor(1000 + Math.random() * 9000);
        const nuovo = { title: titolo, slug, items: [], followersIg: 0, followersTt: 0, followersYt: 0, clientAvatarUrl: '', kpiReachedCount: 0, kpiViewsCount: 0, kpiViewsPct: '', createdAt: new Date() };
        if (c && c.id !== SENZA) { nuovo.clienteId = c.id; if (c.avatar) nuovo.avatar = c.avatar; }
        await addDoc(collection(db, "reportMensili"), nuovo);
        closeAuthModal(); window.location.href = `?v=${encodeURIComponent(slug)}`;
    } catch (err) { console.error(err); avviso('Report non creato. ' + erroreTesto(err)); bottone.disabled = false; }
});

// ---------- editor di un report ----------
function renderEditor() {
    const r = reportCorrente, c = clienteDi(r);
    document.title = `${r.title} · Report`;
    $('ed-titolo').textContent = r.title;
    $('ed-eyebrow').textContent = c ? `Report mensile · ${c.clientName}` : 'Report mensile';
    const av = (c && c.avatar) || r.avatar || '';
    $('ed-avatar').innerHTML = av ? `<img src="${esc(av)}" alt="">` : (r.clientAvatarUrl ? `<img src="${esc(r.clientAvatarUrl)}" alt="">` : `<b>${esc(window.RawUI.iniziali(c ? c.clientName : r.title))}</b>`);
    $('back-cliente').href = c ? `?c=${encodeURIComponent(c.slug)}` : './';
    $('back-testo').textContent = c ? `Torna a ${c.clientName}` : 'Torna ai clienti';
    $('btn-anteprima').href = `?v=${encodeURIComponent(r.slug)}&anteprima=1`;
    $('btn-copia-link').onclick = () => copiaTesto(`${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(r.slug)}`, $('btn-copia-link').querySelector('span'));
    $('f-ig').value = num(r.followersIg); $('f-tt').value = num(r.followersTt); $('f-yt').value = num(r.followersYt);
    $('k-reached').value = num(r.kpiReachedCount); $('k-views').value = num(r.kpiViewsCount); $('k-pct').value = r.kpiViewsPct || '';
    aggiornaSuggerimento();
    righe = (r.items || []).map(i => ({ ...i })); sporco = false; renderTabella();
}
// variazione delle views rispetto al report precedente dello stesso cliente (solo un suggerimento: il valore lo decidi tu)
function precedente() {
    const r = reportCorrente, p = periodo(r.title); if (!r.clienteId || !p) return null;
    return reports.filter(x => x.id !== r.id && x.clienteId === r.clienteId && periodo(x.title) && periodo(x.title).chiave < p.chiave && num(x.kpiViewsCount) > 0).sort((a, b) => periodo(b.title).chiave - periodo(a.title).chiave)[0] || null;
}
function aggiornaSuggerimento() {
    const box = $('sugg-pct'), prev = precedente(), v = num($('k-views').value);
    if (!prev || !v) { box.hidden = true; return; }
    const pct = ((v - num(prev.kpiViewsCount)) / num(prev.kpiViewsCount)) * 100;
    const testo = `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`;
    box.hidden = false;
    box.innerHTML = `Rispetto a ${esc(periodo(prev.title).nome)} (${fmt(prev.kpiViewsCount)} views) sarebbe <b>${testo}</b>. <button type="button" id="usa-sugg">Usa questo valore</button>`;
    $('usa-sugg').onclick = () => { $('k-pct').value = testo.replace('−', '-'); };
}
$('k-views').addEventListener('input', aggiornaSuggerimento);
$('form-numeri').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patch = { followersIg: num($('f-ig').value), followersTt: num($('f-tt').value), followersYt: num($('f-yt').value), kpiReachedCount: num($('k-reached').value), kpiViewsCount: num($('k-views').value), kpiViewsPct: $('k-pct').value.trim() };
    try { await updateDoc(doc(db, "reportMensili", reportCorrente.id), patch); Object.assign(reportCorrente, patch); avviso('Numeri salvati.'); aggiornaSuggerimento(); }
    catch (err) { console.error(err); avviso('Salvataggio non riuscito. ' + erroreTesto(err)); }
});
// titolo (l'indirizzo non cambia)
$('btn-edit-titolo').addEventListener('click', () => { $('ed-titolo-input').value = reportCorrente.title; $('ed-titolo-box').hidden = false; $('ed-titolo-input').focus(); });
$('btn-annulla-titolo').addEventListener('click', () => { $('ed-titolo-box').hidden = true; });
$('btn-salva-titolo').addEventListener('click', async () => {
    const t = $('ed-titolo-input').value.trim(); if (!t) { avviso('Il titolo non può essere vuoto.'); return; }
    try { await updateDoc(doc(db, "reportMensili", reportCorrente.id), { title: t }); reportCorrente.title = t; $('ed-titolo').textContent = t; $('ed-titolo-box').hidden = true; aggiornaSuggerimento(); avviso('Titolo salvato.'); }
    catch (err) { avviso('Titolo non salvato. ' + erroreTesto(err)); }
});

// ---------- tabella dei contenuti ----------
function segnaSporco(v) { sporco = v; $('stato-contenuti').textContent = v ? 'Modifiche non salvate.' : ''; }
window.addEventListener('beforeunload', (e) => { if (sporco) { e.preventDefault(); e.returnValue = ''; } });
const CAMPI_NUM = [['views', 'Views'], ['likes', 'Like'], ['comments', 'Commenti'], ['shares', 'Condiv.'], ['reposts', 'Repost'], ['saves', 'Salvati']];
function renderTabella() {
    const box = $('tab-c');
    if (!righe.length) { box.innerHTML = '<div class="tab-vuoto">Nessun contenuto. Importali dal Piano editoriale oppure aggiungi una riga.</div>'; return; }
    box.innerHTML = `<div class="tab-testa"><span>Titolo</span><span>Formato</span>${CAMPI_NUM.map(c => `<span style="text-align:right">${c[1]}</span>`).join('')}<span>Link</span><span></span></div>` + righe.map((r, i) => `
        <div class="tab-r ${r._nuova ? 'nuova' : ''}" data-i="${i}">
            <div class="c-tit"><span class="eti">Titolo</span><input type="text" data-k="title" value="${esc(r.title || '')}" placeholder="Titolo del contenuto"></div>
            <div class="c-tipo"><span class="eti">Formato</span><select data-k="type">${TIPI.map(t => `<option ${r.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            ${CAMPI_NUM.map(c => `<div><span class="eti">${c[1]}</span><input type="number" min="0" inputmode="numeric" data-k="${c[0]}" value="${num(r[c[0]])}"></div>`).join('')}
            <div class="c-link"><span class="eti">Link</span><input type="url" data-k="link" value="${esc(r.link || '')}" placeholder="https://…"></div>
            <div class="c-del"><button type="button" class="rnd p del" data-del="${i}" aria-label="Elimina la riga"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button></div>
        </div>`).join('');
}
$('tab-c').addEventListener('input', (e) => {
    const row = e.target.closest('.tab-r'); if (!row) return;
    const r = righe[parseInt(row.dataset.i, 10)], k = e.target.dataset.k; if (!r || !k) return;
    r[k] = ['views', 'likes', 'comments', 'shares', 'reposts', 'saves'].includes(k) ? num(e.target.value) : e.target.value;
    segnaSporco(true);
});
$('tab-c').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const i = parseInt(b.dataset.del, 10), r = righe[i];
    if (r && (r.title || num(r.views)) && !(await conferma(`La riga "${r.title || 'senza titolo'}" verrà tolta dal report (si salva quando premi "Salva i contenuti").`, 'Togli', 'Togliere la riga?'))) return;
    righe.splice(i, 1); segnaSporco(true); renderTabella();
});
$('btn-add-riga').addEventListener('click', () => { righe.push({ title: '', type: 'Reel', link: '', views: 0, likes: 0, comments: 0, shares: 0, reposts: 0, saves: 0, _nuova: true }); segnaSporco(true); renderTabella(); const ins = $('tab-c').querySelectorAll('.tab-r:last-child input[data-k="title"]'); if (ins[0]) ins[0].focus(); });
$('btn-salva-contenuti').addEventListener('click', async () => {
    const pulite = righe.filter(r => (r.title && r.title.trim()) || num(r.views) || num(r.likes)).map(r => { const { _nuova, ...x } = r; return { ...x, title: (x.title || '').trim() || '(senza titolo)', views: num(x.views), likes: num(x.likes), comments: num(x.comments), shares: num(x.shares), reposts: num(x.reposts), saves: num(x.saves) }; });
    try { await updateDoc(doc(db, "reportMensili", reportCorrente.id), { items: pulite }); reportCorrente.items = pulite; righe = pulite.map(i => ({ ...i })); segnaSporco(false); renderTabella(); avviso(`${pulite.length} ${pulite.length === 1 ? 'contenuto salvato' : 'contenuti salvati'}.`); }
    catch (err) { console.error(err); avviso('Salvataggio non riuscito. ' + erroreTesto(err)); }
});
$('btn-svuota').addEventListener('click', async () => {
    if (!(await conferma('Tutti i contenuti inseriti in questo report verranno tolti. I numeri del mese restano.', 'Svuota', 'Svuotare i contenuti?'))) return;
    try { await updateDoc(doc(db, "reportMensili", reportCorrente.id), { items: [] }); reportCorrente.items = []; righe = []; segnaSporco(false); renderTabella(); avviso('Contenuti svuotati.'); }
    catch (err) { avviso('Non riuscito. ' + erroreTesto(err)); }
});
$('btn-elimina-report').addEventListener('click', async () => {
    if (!(await conferma(`Il report "${reportCorrente.title}" verrà eliminato e il suo link smetterà di funzionare. L'azione non si può annullare.`, 'Elimina il report', 'Eliminare il report?'))) return;
    try { sporco = false; const c = clienteDi(reportCorrente); await deleteDoc(doc(db, "reportMensili", reportCorrente.id)); window.location.href = c ? `?c=${encodeURIComponent(c.slug)}` : './'; }
    catch (err) { console.error(err); avviso('Report non eliminato. ' + erroreTesto(err)); }
});

// ---------- importa dal Piano editoriale ----------
let impPiani = [];
$('btn-importa').addEventListener('click', () => {
    const c = clienteDi(reportCorrente);
    const sorgenti = c ? [c] : clienti;
    impPiani = [];
    sorgenti.forEach(cl => getPiani(cl.data).forEach(p => impPiani.push({ etichetta: sorgenti.length > 1 ? `${cl.clientName} · ${p.nome}` : p.nome, videos: p.videos })));
    if (!impPiani.length) { avviso('Questo cliente non ha ancora piani editoriali.'); return; }
    // preseleziono il piano che ha lo stesso periodo del report (es. "Agosto 26")
    const per = periodo(reportCorrente.title); let sel = 0;
    if (per) { const k = impPiani.findIndex(p => (periodo(p.etichetta) || {}).chiave === per.chiave); if (k >= 0) sel = k; }
    $('imp-piano').innerHTML = impPiani.map((p, i) => `<option value="${i}">${esc(p.etichetta)} (${p.videos.length})</option>`).join(''); $('imp-piano').value = String(sel);
    renderImporta(); openCustomStep('importa');
});
function renderImporta() {
    const p = impPiani[parseInt($('imp-piano').value, 10)]; const box = $('imp-lista');
    const presenti = new Set(righe.map(r => String(r.title || '').trim().toLowerCase()));
    if (!p || !p.videos.length) { box.innerHTML = '<p class="imp-vuoto">Questo piano non ha ancora contenuti.</p>'; return; }
    box.innerHTML = p.videos.map((v, i) => { const gia = presenti.has(String(v.title || '').trim().toLowerCase()); return `<label class="imp-riga ${gia ? 'gia' : ''}"><input type="checkbox" data-i="${i}" ${gia ? 'disabled' : 'checked'}><span class="t"><b>${esc(v.title || '(senza titolo)')}</b><small>${esc(v.type || 'Reel')} · ${esc(v.date || 'senza data')}${gia ? ' · già nel report' : ''}</small></span></label>`; }).join('');
}
$('imp-piano').addEventListener('change', renderImporta);
$('imp-tutti').addEventListener('click', () => $('imp-lista').querySelectorAll('input:not(:disabled)').forEach(i => { i.checked = true; }));
$('imp-nessuno').addEventListener('click', () => $('imp-lista').querySelectorAll('input').forEach(i => { i.checked = false; }));
$('imp-conferma').addEventListener('click', () => {
    const p = impPiani[parseInt($('imp-piano').value, 10)]; if (!p) return;
    const scelti = [...$('imp-lista').querySelectorAll('input:checked')].map(i => p.videos[parseInt(i.dataset.i, 10)]);
    if (!scelti.length) { avviso('Non hai scelto nessun contenuto.'); return; }
    scelti.forEach(v => righe.push({ title: v.title || '', type: PED_TIPI_OK.has(v.type) ? v.type : 'Reel', link: '', views: 0, likes: 0, comments: 0, shares: 0, reposts: 0, saves: 0, _nuova: true }));
    segnaSporco(true); renderTabella(); closeAuthModal();
    avviso(`${scelti.length} ${scelti.length === 1 ? 'contenuto aggiunto' : 'contenuti aggiunti'}: scrivi i numeri e salva.`);
});

// ---------- vista del cliente ----------
function contatore(n, opzioni) { return `<span class="cnt" data-target="${Math.abs(n)}">0</span>`; }
function renderCliente(r) {
    const items = r.items || [], c = null;
    document.title = `Report ${r.title}`;
    const avatar = r.avatar || r.clientAvatarUrl || '';
    const parti = String(r.title || '').split(' - ');
    const titolo = parti.length > 1 ? `${esc(parti[0])} <em>${esc(parti.slice(1).join(' - '))}</em>` : esc(r.title);
    const sezioni = [];
    sezioni.push(`<section class="rc-sez rc-hero"><span class="avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : `<b>${esc(window.RawUI.iniziali(parti[0]))}</b>`}</span><span class="eti">Performance review</span><h1>${titolo}</h1><p>L'analisi dei risultati dei contenuti pubblicati nel mese.</p><div class="rc-scorri"><span>Scorri</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div></section>`);

    const ig = num(r.followersIg), tt = num(r.followersTt), yt = num(r.followersYt), tot = ig + tt + yt;
    if (ig || tt || yt) {
        const neg = tot < 0;
        const canali = [['instagram', 'Instagram', ig], ['tiktok', 'TikTok', tt], ['youtube', 'YouTube', yt]].filter(x => x[2] !== 0).map(x => `<div class="canale rv-e"><span class="ic">${svgFill(x[0])}</span><span class="n">${x[1]}</span><span class="v ${x[2] < 0 ? 'neg' : ''}">${x[2] < 0 ? '−' : '+'}${contatore(x[2])}</span></div>`).join('');
        sezioni.push(`<section class="rc-sez"><span class="eti rv-e">Crescita dei canali</span><h2 class="rv-e">Nuovo pubblico <em>acquisito</em></h2><div class="numero rv-e ${neg ? 'neg' : ''}"><small>${neg ? '−' : '+'}</small>${contatore(tot)}</div><span class="badge-v rv-e ${neg ? 'neg' : ''}">${svgLinea(neg ? 'giu' : 'su')}${neg ? 'Decrescita' : 'Crescita'}</span><div class="canali">${canali}</div></section>`);
    }
    if (num(r.kpiReachedCount) > 0) sezioni.push(`<section class="rc-sez"><span class="eti rv-e">Diffusione del brand</span><h2 class="rv-e">Account <em>raggiunti</em></h2><div class="numero rv-e">${contatore(num(r.kpiReachedCount))}</div></section>`);
    if (num(r.kpiViewsCount) > 0) {
        const pct = (r.kpiViewsPct || '').trim(), neg = negativo(pct);
        sezioni.push(`<section class="rc-sez"><span class="eti rv-e">Visibilità</span><h2 class="rv-e">Visualizzazioni <em>totali</em></h2><div class="numero rv-e">${contatore(num(r.kpiViewsCount))}</div>${pct ? `<span class="badge-v rv-e ${neg ? 'neg' : ''}">${svgLinea(neg ? 'giu' : 'su')}${esc(pct)} rispetto al mese precedente</span>` : ''}</section>`);
    }
    if (items.length) {
        const re = (it, etichetta, valore, extra) => { const t = it.type || 'Reel', inner = `<span class="piat">${svgFill(ICONA_TIPO[t] || 'video')}${esc(t)}</span><h3>${esc(it.title)}</h3><div class="numero">${contatore(valore)}</div><span class="et">${etichetta}</span>${extra || ''}`; return it.link ? `<a class="re-card rv-e" href="${esc(it.link)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="re-card rv-e">${inner}</div>`; };
        const maxPer = (k) => items.slice().sort((a, b) => num(b[k]) - num(a[k]))[0];
        const kv = maxPer('views');
        if (kv && num(kv.views) > 0) sezioni.push(`<section class="rc-sez"><span class="eti rv-e">Il più visto</span><h2 class="rv-e">Contenuto con più <em>views</em></h2>${re(kv, 'visualizzazioni', num(kv.views))}</section>`);
        const kl = maxPer('likes');
        if (kl && num(kl.likes) > 0) sezioni.push(`<section class="rc-sez"><span class="eti rv-e">Il più amato</span><h2 class="rv-e">Contenuto con più <em>like</em></h2>${re(kl, 'like', num(kl.likes))}</section>`);
        const ki = items.map(it => ({ ...it, tot: num(it.likes) + num(it.comments) + num(it.shares) + num(it.reposts) + num(it.saves) })).sort((a, b) => b.tot - a.tot)[0];
        if (ki && ki.tot > 0) {
            const det = [['likes', 'like'], ['comments', 'commenti'], ['shares', 'condivisioni'], ['reposts', 'repost'], ['saves', 'salvataggi']].filter(d => num(ki[d[0]]) > 0).map(d => `<span><b>${fmt(ki[d[0]])}</b> ${d[1]}</span>`).join('');
            sezioni.push(`<section class="rc-sez"><span class="eti rv-e">Il più coinvolgente</span><h2 class="rv-e">Maggiori <em>interazioni</em></h2>${re(ki, 'interazioni totali', ki.tot, `<div class="re-righe">${det}</div>`)}</section>`);
        }
        const gruppi = TIPI.map(t => ({ t, lista: items.filter(i => i.type === t).sort((a, b) => num(b.views) - num(a.views)) })).filter(g => g.lista.length);
        sezioni.push(`<section class="rc-sez compatta"><span class="eti rv-e">Il dettaglio</span><h2 class="rv-e">Riepilogo <em>del mese</em></h2><div class="rc-elenco">${gruppi.map(g => `<div class="rc-gruppo rv-e"><h3>${svgFill(ICONA_TIPO[g.t] || 'video')}${esc(g.t)}</h3>${g.lista.map(it => {
            const m = [`<span><b>${fmt(it.views)}</b> views</span>`, `<span><b>${fmt(it.likes)}</b> like</span>`];
            [['comments', 'commenti'], ['shares', 'condivisioni'], ['reposts', 'repost'], ['saves', 'salvataggi']].forEach(d => { if (num(it[d[0]]) > 0) m.push(`<span><b>${fmt(it[d[0]])}</b> ${d[1]}</span>`); });
            const inner = `<b class="t">${esc(it.title)}</b><div class="m">${m.join('')}</div>`;
            return it.link ? `<a class="rc-voce" href="${esc(it.link)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="rc-voce">${inner}</div>`;
        }).join('')}</div>`).join('')}</div></section>`);
    }
    $('rc-vista').innerHTML = sezioni.join('');
}
// i numeri salgono e le sezioni compaiono quando entrano nello schermo
function conta(el, target) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), durata = 1400;
    const passo = (ora) => { const p = Math.min((ora - t0) / durata, 1), e = p * (2 - p); el.textContent = fmt(Math.floor(e * target)); if (p < 1) requestAnimationFrame(passo); else el.textContent = fmt(target); };
    requestAnimationFrame(passo);
}
function avviaRivelazioni() {
    const io = new IntersectionObserver((voci) => voci.forEach(v => {
        if (!v.isIntersecting) return; const el = v.target; io.unobserve(el);
        el.classList.add('in'); el.querySelectorAll('.cnt').forEach(c => conta(c, parseInt(c.dataset.target, 10) || 0));
    }), { threshold: 0.18 });
    document.querySelectorAll('.rv-e').forEach(e => io.observe(e));
}

// ---------- nuovo cliente (lo stesso cliente degli altri tool) ----------
$('form-create-client').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('client-name-input').value.trim(), utente = utenteInstagram($('client-ig-input').value);
    const bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true; const t0 = bottone.textContent;
    try {
        const nuovo = { clientName: nome, slug: createSlug(nome) + '-' + Math.random().toString(36).substring(2, 7), videos: [], piani: [], createdAt: new Date() };
        let nota = '';
        if (utente) { nuovo.instagram = `https://www.instagram.com/${utente}/`; bottone.textContent = 'Cerco la foto…'; try { nuovo.avatar = await fotoDaInstagram(utente); } catch (err) { nota = 'Cliente creato, ma non ho trovato la foto: caricala dai Piani editoriali.'; } }
        await addDoc(collection(db, "pianiEditoriali"), nuovo);
        closeAuthModal(); $('form-create-client').reset();
        window.location.href = `?c=${encodeURIComponent(nuovo.slug)}`;
        if (nota) { try { sessionStorage.setItem('nota_report', nota); } catch (x) {} }
    } catch (err) { console.error(err); avviso('Il cliente non è stato creato. ' + erroreTesto(err)); bottone.disabled = false; bottone.textContent = t0; }
});
try { const nn = sessionStorage.getItem('nota_report'); if (nn) { sessionStorage.removeItem('nota_report'); setTimeout(() => avviso(nn), 1500); } } catch (e) {}

// ---------- accesso ----------
$('form-login').addEventListener('submit', async (e) => {
    e.preventDefault(); const err = $('auth-error'); err.hidden = true;
    try { await signInWithEmailAndPassword(auth, $('login-email').value, $('login-pass').value); closeAuthModal(); $('form-login').reset(); }
    catch (error) { err.hidden = false; err.innerText = 'Dati di accesso errati.'; }
});
$('btn-open-login').addEventListener('click', () => openCustomStep('login'));
onAuthStateChanged(auth, (user) => { initRouter(user); });

// ---------- finestre ----------
function openCustomStep(step) {
    ['modal-step-auth', 'modal-step-new', 'modal-step-importa', 'modal-step-client'].forEach(id => { $(id).hidden = true; });
    if (!auth.currentUser) $('modal-step-auth').hidden = false; else $('modal-step-' + (step === 'login' ? 'auth' : step)).hidden = false;
    $('auth-modal').classList.add('on'); $('auth-modal').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeAuthModal() { $('auth-modal').classList.remove('on'); $('auth-modal').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
$('auth-modal').addEventListener('mousedown', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });
document.querySelectorAll('[data-chiudi-mod]').forEach(b => b.addEventListener('click', closeAuthModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('auth-modal').classList.contains('on') && !$('conf-modal').classList.contains('on')) closeAuthModal(); });
window.openAuthModal = openCustomStep;
window.closeAuthModal = closeAuthModal;
