import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addDocLink as addDoc, trovaPerLink, preparaAdmin, mostraUrl } from "../raw/link.js";

// Configurazione Firebase coerente
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

// ===== Script · logica =====
// Sopra (import e collegamento a Firebase) è copiato identico dalla versione precedente.
// Dati: collezione "scripts" { title, slug, category, hook, corpo, cta, createdAt, + clienteId, updatedAt (nuovi, facoltativi) }.
// I clienti sono gli stessi dei Piani editoriali (collezione "pianiEditoriali"): si legge solo, tranne la creazione di un nuovo cliente.

import { getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const { $, esc, avviso, conferma, erroreTesto, copiaTesto, utenteInstagram, fotoDaInstagram, avatarHtml, createSlug } = window.RawUI;

const urlParams = new URLSearchParams(window.location.search);
const videoSlug = urlParams.get('v');     // dettaglio di uno script (lo vede anche il cliente)
const clienteSlugUrl = urlParams.get('c'); // schermata di un cliente (solo admin)
const SENZA = '_senza';

let clienti = [];         // [{ id, slug, clientName, avatar, instagram, data }]
let scripts = [];         // [{ id, ...dati }]
let uso = {};             // slug dello script -> dove esce nei piani
let currentScriptId = null, currentScriptData = null, editingScriptId = null;
let clienteAperto = null; // cliente della schermata aperta (o { id: SENZA })
let filtroFormato = 'Tutti';

const ICON = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    freccia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 16.5h4"/></svg>'
};

// ---------- piani (stessa logica dei Piani editoriali, solo lettura) ----------
function getPiani(data) {
    const d = data || {}, out = [];
    if ((d.videos && d.videos.length) || d.pianoNome) out.push({ id: 'main', nome: d.pianoNome || 'Piano principale', videos: d.videos || [] });
    (d.piani || []).forEach(p => out.push({ id: p.id, nome: p.nome || 'Piano', videos: p.videos || [] }));
    return out;
}
function scriptSlugDaLink(link) {
    const m = String(link || '').match(/\/script\/?\?(?:[^#]*&)?v=([^&#]+)/i);
    return m ? decodeURIComponent(m[1]) : '';
}
function costruisciUso() {
    uso = {};
    clienti.forEach(c => getPiani(c.data).forEach(p => p.videos.forEach((v, i) => {
        const s = scriptSlugDaLink(v.scriptLink);
        if (!s) return;
        (uso[s] = uso[s] || []).push({ cliente: c, piano: p.nome, pianoId: p.id, indice: i, data: v.date || '', stato: v.status || '', titolo: v.title || '' });
    })));
}

// ---------- caricamento dati (admin) ----------
async function caricaTutto() {
    const [cs, ss] = await Promise.all([
        getDocs(query(collection(db, "pianiEditoriali"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "scripts"), orderBy("createdAt", "desc")))
    ]);
    clienti = []; cs.forEach(d => { const x = d.data(); if (x.isHub === true) return; clienti.push({ id: d.id, slug: x.slug, clientName: x.clientName || 'Cliente', avatar: x.avatar || '', instagram: x.instagram || '', data: x }); });
    scripts = []; ss.forEach(d => scripts.push({ id: d.id, ...d.data() }));
    costruisciUso();
}
const clienteDi = (s) => clienti.find(c => c.id === s.clienteId) || null;

// ---------- schermate ----------
function mostra(sezione) {
    ['section-lock', 'section-home', 'section-cliente', 'section-detail'].forEach(id => { $(id).hidden = id !== sezione; });
    $('main-loader').hidden = true;
}

async function initRouter(user) {
    $('main-loader').hidden = false;
    ['section-lock', 'section-home', 'section-cliente', 'section-detail'].forEach(id => { $(id).hidden = true; });
    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    $('admin-indicator').hidden = !user;
    $('btnStrumenti').hidden = !user;
    $('btnRaw').hidden = !user;
    $('marchio').href = user ? '../raw/' : '../';
    if (user) caricaRaw();

    try {
        if (videoSlug) {
            const snap = await trovaPerLink("scripts", videoSlug, urlParams.get('p'));
            if (snap.empty) { window.location.href = './'; return; }
            const d = snap.docs[0];
            currentScriptId = d.id; currentScriptData = d.data();
            if (user) await caricaTutto();
            if (user) { const x = { id: d.id, ...currentScriptData }; preparaAdmin('scripts', x).then(() => { Object.assign(currentScriptData, { slugCliente: x.slugCliente, slugTitolo: x.slugTitolo }); }); }   // da admin: assegna e mostra l'indirizzo leggibile
            else if (currentScriptData.slugCliente && currentScriptData.slugTitolo) mostraUrl(currentScriptData.slugCliente, currentScriptData.slugTitolo);
            renderDettaglio(!!user);
            mostra('section-detail');
        } else if (user) {
            await caricaTutto();
            if (clienteSlugUrl) {
                const c = clienteSlugUrl === SENZA ? { id: SENZA, slug: SENZA, clientName: 'Senza cliente', avatar: '', data: {} } : clienti.find(x => x.slug === clienteSlugUrl);
                if (!c) { window.location.href = './'; return; }
                clienteAperto = c; renderCliente(); mostra('section-cliente');
            } else { renderHome(); mostra('section-home'); }
        } else {
            mostra('section-lock');
        }
    } catch (error) {
        console.error(error);
        if (videoSlug) window.location.href = './'; else { $('main-loader').hidden = true; avviso('Non riesco a caricare i dati. ' + erroreTesto(error)); }
    }
}

let rawCaricato = false;
function caricaRaw() { if (rawCaricato) return; rawCaricato = true; const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s); }

// ---------- home: i clienti ----------
function contaScript(clienteId) { return scripts.filter(s => (s.clienteId || '') === clienteId).length; }
function senzaCliente() { return scripts.filter(s => !s.clienteId || !clienti.some(c => c.id === s.clienteId)); }
function assegnabili() {
    const out = [];
    senzaCliente().forEach(s => {
        const usi = uso[s.slug] || [];
        const ids = Array.from(new Set(usi.map(u => u.cliente.id)));
        if (ids.length === 1) out.push({ script: s, cliente: usi[0].cliente });
    });
    return out;
}
function renderHome() {
    document.title = 'Script · Teo Macauda';
    const grid = $('cat-clienti'); grid.innerHTML = '';
    const mkCard = (href, avatar, nome, sub) => {
        const a = document.createElement('a'); a.className = 'contatto vetro'; a.href = href;
        a.innerHTML = `<span class="avatar l" aria-hidden="true">${avatar}</span><span class="c-nome"><b>${esc(nome)}</b><small>${esc(sub)}</small></span><span class="freccia">${ICON.freccia}</span>`;
        return a;
    };
    clienti.forEach(c => { const n = contaScript(c.id); grid.appendChild(mkCard(`?c=${encodeURIComponent(c.slug)}`, avatarHtml({ avatar: c.avatar, clientName: c.clientName }), c.clientName, `${n} script`)); });
    const sc = senzaCliente();
    if (sc.length) grid.appendChild(mkCard(`?c=${SENZA}`, `<b>—</b>`, 'Senza cliente', `${sc.length} script`));
    const piu = document.createElement('button'); piu.type = 'button'; piu.className = 'piu';
    piu.innerHTML = `${ICON.plus}<span>Crea nuovo cliente</span>`; piu.onclick = () => openCustomStep('create-client');
    grid.appendChild(piu);
    $('btn-new-client-top').onclick = () => openCustomStep('create-client');

    const ass = assegnabili();
    const banner = $('banner-assegna');
    banner.hidden = !sc.length;
    if (sc.length) {
        $('banner-titolo').textContent = sc.length === 1 ? '1 script senza cliente' : `${sc.length} script senza cliente`;
        $('banner-testo').textContent = ass.length
            ? `Guardando i Piani editoriali, ${ass.length === 1 ? 'ne riconosco 1 già collegato a un cliente: posso assegnarlo' : `ne riconosco ${ass.length} già collegati a un cliente: posso assegnarli`} io in automatico. ${sc.length > ass.length ? 'Gli altri li assegni tu, aprendo lo script e premendo Modifica.' : ''}`
            : 'Non li ho trovati in nessun Piano editoriale: assegnali tu, aprendo lo script e premendo Modifica.';
        $('btn-assegna').hidden = !ass.length;
        $('btn-assegna').onclick = async () => {
            if (!(await conferma(`Assegno ${ass.length} ${ass.length === 1 ? 'script' : 'script'} ai clienti che ${ass.length === 1 ? 'lo usano' : 'li usano'} nei piani. Non cambia altro, e puoi cambiare tutto dopo.`, 'Assegna', 'Assegnare gli script?'))) return;
            const b = $('btn-assegna'); b.disabled = true; let fatti = 0;
            try { for (const x of ass) { await updateDoc(doc(db, "scripts", x.script.id), { clienteId: x.cliente.id }); fatti++; } avviso(fatti === 1 ? '1 script assegnato.' : `${fatti} script assegnati.`); }
            catch (e) { avviso(`Assegnati ${fatti} script, poi si è fermato. ` + erroreTesto(e)); }
            b.disabled = false; initRouter(auth.currentUser);
        };
    }
}

// ---------- schermata del cliente: i suoi script ----------
const FORMATI = ['Tutorial', 'Content Marketing', 'Behind the Scenes', 'Short Form'];
const nomeFormato = (f) => f === 'Short Form' ? 'Short Form / Reel' : f;
function scriptDelCliente() {
    if (!clienteAperto) return [];
    return clienteAperto.id === SENZA ? senzaCliente() : scripts.filter(s => s.clienteId === clienteAperto.id);
}
function renderCliente() {
    const c = clienteAperto;
    document.title = `${c.clientName} · Script`;
    $('cl-nome').textContent = c.clientName;
    $('cl-avatar').innerHTML = c.id === SENZA ? '<b>—</b>' : avatarHtml({ avatar: c.avatar, clientName: c.clientName });
    const tutti = scriptDelCliente();
    $('cl-sotto').textContent = `${tutti.length} script`;
    filtroFormato = 'Tutti'; $('cerca-script').value = '';
    $('btn-new-script').onclick = () => apriFormScript(null);
    renderElencoScript();
}
function renderElencoScript() {
    const tutti = scriptDelCliente();
    const q = $('cerca-script').value.trim().toLowerCase();
    const conteggi = { 'Tutti': tutti.length }; FORMATI.forEach(f => { conteggi[f] = tutti.filter(s => s.category === f).length; });
    const filtri = $('filtri-formato'); filtri.innerHTML = '';
    ['Tutti'].concat(FORMATI.filter(f => conteggi[f] > 0)).forEach(f => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chipf' + (filtroFormato === f ? ' on' : '');
        b.innerHTML = `${esc(f === 'Tutti' ? 'Tutti' : nomeFormato(f))} <span>${conteggi[f]}</span>`;
        b.onclick = () => { filtroFormato = f; renderElencoScript(); };
        filtri.appendChild(b);
    });
    if (filtroFormato !== 'Tutti' && !conteggi[filtroFormato]) filtroFormato = 'Tutti';
    $('cerca-riga').hidden = tutti.length < 3; filtri.hidden = tutti.length < 2;
    const visibili = tutti.filter(s => (filtroFormato === 'Tutti' || s.category === filtroFormato) && (!q || String(s.title || '').toLowerCase().includes(q)));
    const grid = $('cat-script'); grid.innerHTML = '';
    visibili.forEach(s => {
        const a = document.createElement('a'); a.className = 'sc-card vetro'; a.href = `?v=${encodeURIComponent(s.slug)}`;
        const usi = (uso[s.slug] || []).slice().sort((x, y) => String(x.data).localeCompare(String(y.data)));
        const prossimo = usi[0];
        a.innerHTML = `
            <span class="pillola-f">${esc(nomeFormato(s.category || ''))}</span>
            <h3>${esc(s.title)}</h3>
            <p class="anteprima">${esc(s.hook || '')}</p>
            <div class="sc-piede"><span class="uso-mini">${prossimo ? esc(`${prossimo.piano}${prossimo.data ? ' · ' + prossimo.data.split(' - ')[0] : ''}`) : ''}</span><span class="apri">Apri ${ICON.freccia}</span></div>`;
        grid.appendChild(a);
    });
    const vuoto = visibili.length === 0;
    $('script-vuoto').hidden = !vuoto;
    $('script-vuoto-testo').textContent = tutti.length ? 'Nessuno script corrisponde alla ricerca.' : 'Scrivi il primo script per questo cliente.';
}
$('cerca-script').addEventListener('input', renderElencoScript);

// ---------- dettaglio ----------
function renderDettaglio(admin) {
    const d = currentScriptData;
    document.title = `${d.title} · Script`;
    $('detail-title').textContent = d.title;
    $('detail-category').textContent = nomeFormato(d.category || '');
    $('detail-hook').textContent = d.hook || '';
    $('detail-corpo').textContent = d.corpo || '';
    $('detail-cta').textContent = d.cta || '';
    $('admin-script-tools').hidden = !admin;
    $('crumb-detail').hidden = !admin;
    const cl = admin ? clienti.find(c => c.id === d.clienteId) : null;
    if (admin) {
        $('back-cliente').href = cl ? `?c=${encodeURIComponent(cl.slug)}` : './';
        $('back-testo').textContent = cl ? `Torna a ${cl.clientName}` : 'Torna agli script';
        const ped = urlParams.get('ped'), back = $('back-to-ped');
        if (ped) { back.href = `../pianieditoriali/?v=${encodeURIComponent(ped)}`; back.hidden = false; } else back.hidden = true;
    }
    const dc = $('detail-cliente'); dc.hidden = !cl; if (cl) dc.textContent = `Cliente: ${cl.clientName}`;
    // dove esce (solo admin)
    const usi = admin ? (uso[d.slug] || []) : [];
    $('detail-uso').hidden = !usi.length;
    $('detail-uso-lista').innerHTML = usi.map(u => `<div class="uso-riga"><b>${esc(u.cliente.clientName)}</b><span>${esc(u.piano)}${u.data ? ' · ' + esc(u.data) : ''}${u.titolo ? ' · ' + esc(u.titolo) : ''}</span><button type="button" class="btn v s btn-scollega" data-cid="${esc(u.cliente.id)}" data-pid="${esc(u.pianoId)}" data-i="${u.indice}" data-titolo="${esc(u.titolo)}">Scollega</button></div>`).join('');
}
$('btn-copy-link').addEventListener('click', () => copiaTesto(window.location.href, $('btn-copy-link').querySelector('span')));
$('btn-copy-text').addEventListener('click', () => {
    const d = currentScriptData; if (!d) return;
    copiaTesto(`${d.title}\n\nHOOK\n${d.hook || ''}\n\nCONTENUTO CENTRALE\n${d.corpo || ''}\n\nCALL TO ACTION\n${d.cta || ''}\n`, $('btn-copy-text').querySelector('span'));
});

// ---------- collegare lo script a una pubblicazione dei Piani editoriali ----------
const LINK_BASE = 'https://teomacauda.it/script/?v=';
const linkDi = (slug) => LINK_BASE + encodeURIComponent(slug);
// scrive (o toglie) il link allo script di UNA pubblicazione. Rilegge il cliente prima, e controlla che il contenuto sia ancora quello.
async function scriviLink(cid, pid, idx, titolo, valore) {
    const ref = doc(db, "pianiEditoriali", cid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('cliente non trovato');
    const data = snap.data();
    let videos;
    if (pid === 'main') videos = (data.videos || []).slice();
    else { const p = (data.piani || []).find(x => x.id === pid); videos = p ? (p.videos || []).slice() : null; }
    const v = videos && videos[idx];
    if (!v || (v.title || '') !== titolo) throw new Error('piano cambiato');
    videos[idx] = { ...v, scriptLink: valore };
    if (pid === 'main') await updateDoc(ref, { videos: videos });
    else await updateDoc(ref, { piani: (data.piani || []).map(p => p.id === pid ? { ...p, videos: videos } : p) });
}
const statoEtichetta = (s) => ({ 'In Scrittura': 'Scrittura', 'In Produzione': 'Produzione' }[s] || s || 'Idea');
function renderCollega() {
    const slug = currentScriptData.slug, mio = clienti.find(c => c.id === currentScriptData.clienteId);
    const ordine = mio ? [mio].concat(clienti.filter(c => c !== mio)) : clienti;
    $('link-sotto').textContent = mio ? `Pubblicazioni di ${mio.clientName}. Gli altri clienti sono sotto.` : 'Questo script non ha ancora un cliente: lo prende dalla pubblicazione che scegli.';
    const blocco = (c) => {
        const piani = getPiani(c.data);
        if (!piani.length) return `<p class="lk-vuoto">${esc(c.clientName)} non ha ancora piani editoriali.</p>`;
        return piani.map(p => `<div class="lk-piano"><h5>${esc(p.nome)}</h5>${p.videos.length ? p.videos.map((v, i) => {
            const s = scriptSlugDaLink(v.scriptLink), mio_ = s && s === slug, altro = s && s !== slug;
            const azione = mio_ ? `<span class="lk-ok">Collegato</span><button type="button" class="btn v s lk-btn" data-az="scollega" data-cid="${esc(c.id)}" data-pid="${esc(p.id)}" data-i="${i}" data-titolo="${esc(v.title || '')}">Scollega</button>`
                : `<button type="button" class="btn ${altro ? 'v ' : ''}s lk-btn" data-az="collega" data-cid="${esc(c.id)}" data-pid="${esc(p.id)}" data-i="${i}" data-titolo="${esc(v.title || '')}" data-altro="${altro ? '1' : ''}">${altro ? 'Sostituisci' : 'Collega'}</button>`;
            return `<div class="lk-riga ${mio_ ? 'on' : ''}"><div class="lk-t"><b>${esc(v.title || '(senza titolo)')}</b><span>${esc(v.date || 'Da definire')} · ${esc(statoEtichetta(v.status))}${altro ? ' · ha già uno script' : ''}</span></div><div class="lk-az">${azione}</div></div>`;
        }).join('') : '<p class="lk-vuoto">Nessuna pubblicazione in questo piano.</p>'}</div>`).join('');
    };
    $('link-lista').innerHTML = ordine.map((c, k) => k === 0 ? `<div class="lk-cliente"><h4>${esc(c.clientName)}</h4>${blocco(c)}</div>` : `<details class="lk-cliente"><summary>${esc(c.clientName)}</summary>${blocco(c)}</details>`).join('');
}
async function dopoScrittura(testo) {
    await caricaTutto();
    currentScriptData = scripts.find(s => s.id === currentScriptId) || currentScriptData;
    renderDettaglio(true);
    if (!$('modal-step-link').hidden) renderCollega();
    avviso(testo);
}
async function eseguiLink(az, cid, pid, idx, titolo, altro) {
    const slug = currentScriptData.slug;
    try {
        if (az === 'collega') {
            if (altro && !(await conferma('Questa pubblicazione ha già un altro script collegato: lo sostituisco con questo.', 'Sostituisci', 'Sostituire lo script?'))) return;
            await scriviLink(cid, pid, idx, titolo, linkDi(slug));
            let nota = 'Script collegato alla pubblicazione.';
            if (!currentScriptData.clienteId) { await updateDoc(doc(db, "scripts", currentScriptId), { clienteId: cid }); nota = 'Script collegato e assegnato al cliente.'; }
            await dopoScrittura(nota);
        } else {
            await scriviLink(cid, pid, idx, titolo, '');
            await dopoScrittura('Script scollegato dalla pubblicazione.');
        }
    } catch (error) {
        console.error(error);
        avviso(error && error.message === 'piano cambiato' ? 'Il piano è cambiato nel frattempo: ricarica la pagina e riprova.' : 'Operazione non riuscita. ' + erroreTesto(error));
    }
}
$('btn-link-pub').addEventListener('click', () => { renderCollega(); openCustomStep('link'); });
$('link-lista').addEventListener('click', (e) => {
    const b = e.target.closest('.lk-btn'); if (!b) return;
    eseguiLink(b.dataset.az, b.dataset.cid, b.dataset.pid, parseInt(b.dataset.i, 10), b.dataset.titolo, !!b.dataset.altro);
});
$('detail-uso-lista').addEventListener('click', async (e) => {
    const b = e.target.closest('.btn-scollega'); if (!b) return;
    if (!(await conferma('Il contenuto resta nel piano, ma perde il collegamento a questo script.', 'Scollega', 'Scollegare lo script?'))) return;
    eseguiLink('scollega', b.dataset.cid, b.dataset.pid, parseInt(b.dataset.i, 10), b.dataset.titolo, false);
});

// ---------- scrittura degli script ----------
async function slugUnico(titolo, escludiId) {
    const base = createSlug(titolo) || 'script';
    let cand = base, n = 2;
    for (;;) {
        const snap = await getDocs(query(collection(db, "scripts"), where("slug", "==", cand)));
        if (snap.empty || snap.docs.every(d => d.id === escludiId)) return cand;
        cand = `${base}-${n++}`;
    }
}
function riempiClientiSelect(selezionato) {
    const sel = $('script-cliente');
    sel.innerHTML = `<option value="">Nessun cliente</option>` + clienti.map(c => `<option value="${esc(c.id)}">${esc(c.clientName)}</option>`).join('');
    sel.value = selezionato || '';
}
function apriFormScript(script) {
    editingScriptId = script ? script.id : null;
    $('form-create-script').reset();
    riempiClientiSelect(script ? (script.clienteId || '') : (clienteAperto && clienteAperto.id !== SENZA ? clienteAperto.id : ''));
    if (script) {
        $('script-title').value = script.title || ''; $('script-category').value = script.category || 'Tutorial';
        $('form-hook').value = script.hook || ''; $('form-corpo').value = script.corpo || ''; $('form-cta').value = script.cta || '';
    }
    $('script-icon').innerHTML = script ? ICON.pencil : ICON.plus;
    $('modal-create-title').innerHTML = script ? 'Modifica <em>script</em>' : 'Nuovo <em>script</em>';
    $('btn-submit-script').textContent = script ? 'Salva modifiche' : 'Salva script';
    openCustomStep('script');
}
$('btn-edit-script').addEventListener('click', () => { if (currentScriptData) apriFormScript({ id: currentScriptId, ...currentScriptData }); });

$('form-create-script').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bottone = $('btn-submit-script'); bottone.disabled = true;
    const campi = { title: $('script-title').value.trim(), category: $('script-category').value, hook: $('form-hook').value, corpo: $('form-corpo').value, cta: $('form-cta').value, clienteId: $('script-cliente').value || '' };
    try {
        if (editingScriptId) {
            // l'indirizzo dello script NON cambia più quando si cambia il titolo: i link già mandati restano validi
            await updateDoc(doc(db, "scripts", editingScriptId), { ...campi, updatedAt: new Date() });
            const slug = (currentScriptData && currentScriptData.slug) || (scripts.find(s => s.id === editingScriptId) || {}).slug;
            editingScriptId = null; closeAuthModal();
            window.location.href = `?v=${encodeURIComponent(slug)}`;
        } else {
            const slug = await slugUnico(campi.title);
            await addDoc(collection(db, "scripts"), { ...campi, slug: slug, createdAt: new Date() });
            closeAuthModal();
            window.location.href = `?v=${encodeURIComponent(slug)}`;
        }
    } catch (error) {
        console.error(error);
        avviso('Salvataggio non riuscito. ' + erroreTesto(error));
    } finally { bottone.disabled = false; }
});

$('btn-duplicate-script').addEventListener('click', async () => {
    const d = currentScriptData; if (!d) return;
    try {
        const titolo = `Copia di ${d.title}`, slug = await slugUnico(titolo);
        await addDoc(collection(db, "scripts"), { title: titolo, slug: slug, category: d.category || 'Tutorial', hook: d.hook || '', corpo: d.corpo || '', cta: d.cta || '', clienteId: d.clienteId || '', createdAt: new Date() });
        window.location.href = `?v=${encodeURIComponent(slug)}`;
    } catch (error) { avviso('Duplicazione non riuscita. ' + erroreTesto(error)); }
});

$('btn-delete-script').addEventListener('click', async () => {
    if (!currentScriptId) return;
    const usi = uso[currentScriptData.slug] || [];
    const avv = usi.length ? ` Attenzione: è collegato a ${usi.length} ${usi.length === 1 ? 'contenuto' : 'contenuti'} nei Piani editoriali, il cui link smetterà di funzionare.` : '';
    if (!(await conferma(`Lo script "${currentScriptData.title}" verrà eliminato.${avv} L'azione non si può annullare.`, 'Elimina lo script', 'Eliminare lo script?'))) return;
    try {
        const cl = clienti.find(c => c.id === currentScriptData.clienteId);
        await deleteDoc(doc(db, "scripts", currentScriptId));
        window.location.href = cl ? `?c=${encodeURIComponent(cl.slug)}` : './';
    } catch (error) { console.error(error); avviso('Lo script non è stato eliminato. ' + erroreTesto(error)); }
});

// ---------- nuovo cliente (stesso cliente dei Piani editoriali) ----------
$('form-create-client').addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientName = $('client-name-input').value.trim();
    const slug = createSlug(clientName) + "-" + Math.random().toString(36).substring(2, 7);
    const utente = utenteInstagram($('client-ig-input').value);
    const bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true; const testoBtn = bottone.textContent;
    try {
        const nuovo = { clientName: clientName, slug: slug, videos: [], piani: [], createdAt: new Date() };
        let nota = '';
        if (utente) {
            nuovo.instagram = `https://www.instagram.com/${utente}/`;
            bottone.textContent = 'Cerco la foto…';
            try { nuovo.avatar = await fotoDaInstagram(utente); } catch (err) { nota = 'Cliente creato, ma non sono riuscito a prendere la foto del profilo: caricala dai Piani editoriali.'; }
        }
        await addDoc(collection(db, "pianiEditoriali"), nuovo);
        closeAuthModal(); $('form-create-client').reset();
        await initRouter(auth.currentUser);
        if (nota) avviso(nota);
    } catch (error) {
        avviso('Il cliente non è stato creato. ' + erroreTesto(error));
    } finally { bottone.disabled = false; bottone.textContent = testoBtn; }
});

// ---------- accesso ----------
$('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('auth-error'); err.hidden = true;
    try {
        await signInWithEmailAndPassword(auth, $('login-email').value, $('login-pass').value);
        closeAuthModal(); $('form-login').reset();
    } catch (error) { err.hidden = false; err.innerText = 'Dati di accesso errati.'; }
});
$('btn-open-login').addEventListener('click', () => openCustomStep('login'));
onAuthStateChanged(auth, (user) => { initRouter(user); });

// ---------- finestre ----------
function openCustomStep(step) {
    ['modal-step-auth', 'modal-step-create-client', 'modal-step-script', 'modal-step-link'].forEach(id => { $(id).hidden = true; });
    if (!auth.currentUser) $('modal-step-auth').hidden = false;
    else if (step === 'create-client') $('modal-step-create-client').hidden = false;
    else if (step === 'script') $('modal-step-script').hidden = false;
    else if (step === 'link') $('modal-step-link').hidden = false;
    openAuthModal();
}
function openAuthModal() { $('auth-modal').classList.add('on'); $('auth-modal').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
function closeAuthModal() { $('auth-modal').classList.remove('on'); $('auth-modal').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
$('auth-modal').addEventListener('mousedown', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });
document.querySelectorAll('[data-chiudi-mod]').forEach(b => b.addEventListener('click', closeAuthModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('auth-modal').classList.contains('on') && !$('conf-modal').classList.contains('on')) closeAuthModal(); });
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
