import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addDocLink as addDoc, trovaPerLink } from "../raw/link.js";

// Configurazione Firebase condivisa
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

// ===== Hub clienti · logica =====
// Sopra (import e collegamento a Firebase) è copiato identico dalla versione precedente.
// Dati: collezione "hubClienti" { clientName, slug, avatarUrl, pedUrl, reportUrl, createdAt, + clienteId, avatar, risorse (nuovi, facoltativi) }.
// Vecchi nomi dei campi ancora letti: profileImage, pedLink, reportLink. L'indirizzo (slug) di un hub NON cambia mai.

const { $, esc, avviso, conferma, erroreTesto, copiaTesto, utenteInstagram, fotoDaInstagram, avatarHtml, createSlug } = window.RawUI;

const urlParams = new URLSearchParams(window.location.search);
const clientSlug = urlParams.get('v');   // vista del cliente (pubblica)
const editSlug = urlParams.get('e');     // editor di un hub (admin)
const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
const riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (clientSlug) { try { localStorage.setItem('lastClientSlug', clientSlug); } catch (e) {} }   // per riaprire l'hub dalla Home del telefono

const PED_BASE = 'https://teomacauda.it/pianieditoriali/?v=';
const IC = {
    ped: '<rect x="3.5" y="4.5" width="18" height="16" rx="3"/><path d="M3.5 9.5h18M8 3v3M16 3v3"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
    report: '<path d="M3.5 21h17"/><path d="M6 21v-6M11 21V9.5M16 21v-9M20.5 21V4.5"/><path d="M5 8.5l4.5-3 3.5 2.5 6-4.5"/>',
    consegna: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>',
    revisione: '<path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12z"/><path d="M8.4 12.2l2.6 2.6 4.8-5"/>',
    preventivo: '<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2z"/><path d="M14 11.2a3 3 0 1 0 0 4.6M9.2 12.6H13M9.2 14.4H13"/>',
    audit: '<circle cx="10.5" cy="10.5" r="7"/><path d="M16 16l5 5"/><path d="M9 8v5l4-2.5z"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n] || IC.link}</svg>`;
const FRECCIA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8.5 7H17v8.5"/></svg>';
const TIPI = {
    ped: { nome: 'Piano editoriale', sub: 'Il calendario dei tuoi contenuti' },
    report: { nome: 'Report', sub: 'I risultati del mese' },
    consegna: { nome: 'Consegna video', sub: 'Scarica i tuoi video' },
    revisione: { nome: 'Revisione', sub: 'Commenta e approva le bozze' },
    preventivo: { nome: 'Preventivo', sub: 'Il tuo accordo' },
    audit: { nome: 'Video audit', sub: "L'analisi del tuo video" },
    link: { nome: 'Link', sub: 'Apri' }
};

let hubs = [];      // [{ id, ...dati }]
let clienti = [];   // clienti dei Piani editoriali [{ id, slug, clientName, avatar, instagram }]
let hubCorrente = null;
let risorseLav = [];
let rawCaricato = false;
function caricaRaw() { if (rawCaricato) return; rawCaricato = true; const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s); }

// ---------- dati dell'hub (con i vecchi nomi dei campi) ----------
function risorseDi(d) {
    if (Array.isArray(d.risorse)) return d.risorse.filter(r => r && r.url);
    const out = [];
    const ped = d.pedUrl || d.pedLink, rep = d.reportUrl || d.reportLink;
    if (ped) out.push({ id: 'ped', tipo: 'ped', titolo: 'Piano editoriale', url: ped });
    if (rep) out.push({ id: 'report', tipo: 'report', titolo: 'Report', url: rep });
    return out;
}
const avatarSrc = (d) => d.avatar || d.avatarUrl || d.profileImage || '';
function avatarHub(d) {
    const src = avatarSrc(d);
    return src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" data-nome="${esc(d.clientName)}">` : `<b>${esc(window.RawUI.iniziali(d.clientName))}</b>`;
}
function fixAvatars(root) {
    root.querySelectorAll('img[data-nome]').forEach(img => img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('b'), { textContent: window.RawUI.iniziali(img.dataset.nome) })); }, { once: true }));
}
// ai link dei nostri tool si aggiunge ?hub=: da lì si può tornare all'hub
// un link è accettato solo se è http, https, mailto, tel o un indirizzo interno: niente javascript: e simili
function linkSicuro(u) { const s = String(u || '').trim(); return !s ? '#' : (/^[a-z][a-z0-9+.\-]*:/i.test(s) ? (/^(https?:|mailto:|tel:)/i.test(s) ? s : '#') : s); }
function conHub(url, slug) {
    try {
        const u = new URL(url, window.location.href);
        if (!/(^|\.)teomacauda\.it$/i.test(u.hostname) && u.origin !== window.location.origin) return url;
        u.searchParams.set('hub', slug);
        return u.toString();
    } catch (e) { return url; }
}
const hubUrl = (slug) => `${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(slug)}`;

// ---------- caricamento (admin) ----------
async function caricaAdmin() {
    const [hs, cs] = await Promise.all([
        getDocs(query(collection(db, "hubClienti"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "pianiEditoriali"), orderBy("createdAt", "desc")))
    ]);
    hubs = []; hs.forEach(d => hubs.push({ id: d.id, ...d.data() }));
    clienti = []; cs.forEach(d => { const x = d.data(); if (x.isHub === true) return; clienti.push({ id: d.id, slug: x.slug, slugBreve: x.slugBreve || '', clientName: x.clientName || 'Cliente', avatar: x.avatar || '', instagram: x.instagram || '' }); });
}

// ---------- router ----------
function mostra(sez) {
    ['section-lock', 'section-home', 'section-editor', 'section-client'].forEach(id => { $(id).hidden = id !== sez; });
    $('main-loader').hidden = true;
}
async function initRouter(user) {
    $('main-loader').hidden = false;
    ['section-lock', 'section-home', 'section-editor', 'section-client'].forEach(id => { $(id).hidden = true; });
    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    $('admin-indicator').hidden = !user; $('btnStrumenti').hidden = !user; $('btnRaw').hidden = !user;
    $('bar').hidden = !user || !!clientSlug;                        // la barra non si vede mai nella vista del cliente, nemmeno in anteprima
    $('anteprima-admin').hidden = !(user && clientSlug);
    if (user && clientSlug) $('anteprima-torna').href = `?e=${encodeURIComponent(clientSlug)}`;
    if (user) caricaRaw();

    try {
        if (clientSlug) {
            const snap = await trovaPerLink("hubClienti", clientSlug);
            if (snap.empty) { window.location.href = './'; return; }
            renderCliente({ id: snap.docs[0].id, ...snap.docs[0].data() });
            mostra('section-client');
            avviaAnimazione();
            if (!user && window.RawInstall) window.RawInstall.attiva();     // solo al cliente, e solo se non è già aperto come app
        } else if (user) {
            await caricaAdmin();
            if (editSlug) {
                hubCorrente = hubs.find(h => h.slug === editSlug);
                if (!hubCorrente) { window.location.href = './'; return; }
                renderEditor(); mostra('section-editor');
            } else { renderHome(); mostra('section-home'); }
        } else {
            // app salvata sulla Home del telefono: riapre da sola l'ultimo hub, senza chiedere l'accesso admin
            const salvato = (() => { try { return localStorage.getItem('lastClientSlug'); } catch (e) { return null; } })();
            if (isStandalone && salvato) { window.location.replace(`?v=${encodeURIComponent(salvato)}`); return; }
            const appAdmin = (() => { try { return localStorage.getItem('raw_app') === '1' || localStorage.getItem('ped_admin') === '1'; } catch (e) { return false; } })();
            if (isStandalone && !appAdmin) {      // app di un cliente aperta senza un hub da mostrare: niente accesso admin, un messaggio chiaro (l'app di Raw invece lo mostra)
                const l = $('section-lock'); l.querySelector('h1').innerHTML = 'Il tuo <em>hub</em>'; l.querySelector('p').textContent = 'Non trovo il tuo hub. Apri il link che ti ho mandato dal browser e aggiungilo di nuovo alla Home.'; $('btn-open-login').hidden = true;
            }
            mostra('section-lock');
        }
    } catch (error) {
        console.error(error);
        if (clientSlug) window.location.href = './'; else { $('main-loader').hidden = true; avviso('Non riesco a caricare i dati. ' + erroreTesto(error)); }
    }
}

// ---------- vista del cliente ----------
function renderCliente(d) {
    document.body.classList.add('vista-cliente');
    document.title = `Hub · ${d.clientName}`;
    $('cl-avatar').innerHTML = avatarHub(d); fixAvatars($('cl-avatar'));
    $('cl-saluto').innerHTML = `Ciao <em>${esc(d.clientName)}</em>!`;
    $('cl-risorse').innerHTML = risorseDi(d).map((r, i) => {
        const t = TIPI[r.tipo] || TIPI.link;
        return `<a class="risorsa" style="--n:${i}" href="${esc(linkSicuro(conHub(r.url, d.slug)))}" target="_self" rel="noopener"><span class="ic">${svg(r.tipo)}</span><span class="tx"><b>${esc(r.titolo || t.nome)}</b><span>${esc(t.sub)}</span></span><span class="fr">${FRECCIA}</span></a>`;
    }).join('') || '<p style="text-align:center;color:var(--testo-2)">Le tue risorse arriveranno qui.</p>';
    // l'hub si può salvare sulla Home del telefono: il manifest punta proprio a questo hub
    const m = document.querySelector('link[rel="manifest"]');
    if (m) {
        const man = { id: window.location.href, name: `Hub ${d.clientName}`, short_name: 'Hub', start_url: window.location.href, scope: window.location.origin + '/', display: 'standalone', orientation: 'portrait', background_color: '#000000', theme_color: '#000000',
            icons: [{ src: new URL('../img/icon-192.png', window.location.href).href, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: new URL('../img/icon-512.png', window.location.href).href, sizes: '512x512', type: 'image/png', purpose: 'any' }] };
        m.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/json' }));
    }
}
function avviaAnimazione() {
    const splash = $('splash'), vista = $('cl-vista');
    const tempi = [];
    const fine = () => { tempi.forEach(clearTimeout); splash.classList.add('via'); vista.classList.add('testa-on', 'testa-piccola', 'risorse-on'); document.body.classList.add('logo-on'); };
    if (riduci) { fine(); return; }
    splash.addEventListener('click', fine, { once: true });
    tempi.push(setTimeout(() => splash.classList.add('via'), 2300));
    tempi.push(setTimeout(() => vista.classList.add('testa-on'), 2500));
    tempi.push(setTimeout(() => { vista.classList.add('testa-piccola'); document.body.classList.add('logo-on'); }, 3700));
    tempi.push(setTimeout(() => vista.classList.add('risorse-on'), 4500));
}

// ---------- home admin ----------
const clienteDi = (h) => clienti.find(c => c.id === h.clienteId) || null;
function renderHome() {
    document.title = 'Hub clienti · Teo Macauda';
    const grid = $('hub-grid'); grid.innerHTML = '';
    hubs.forEach(h => {
        const n = risorseDi(h).length, c = clienteDi(h);
        const a = document.createElement('a'); a.className = 'contatto vetro'; a.href = `?e=${encodeURIComponent(h.slug)}`;
        a.innerHTML = `<span class="avatar l" aria-hidden="true">${avatarHub({ ...h, avatar: (c && c.avatar) || h.avatar })}</span><span class="c-nome"><b>${esc(h.clientName)}</b><small>${n} ${n === 1 ? 'risorsa' : 'risorse'}</small></span><span class="freccia"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span>`;
        grid.appendChild(a); fixAvatars(a);
    });
    const piu = document.createElement('button'); piu.type = 'button'; piu.className = 'piu';
    piu.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Nuovo hub</span>`; piu.onclick = apriNuovoHub;
    grid.appendChild(piu);
    $('btn-new-hub').onclick = apriNuovoHub;

    // hub vecchi non ancora collegati a un cliente: li riconosco dal nome
    const daCollegare = hubs.filter(h => !h.clienteId).map(h => ({ h, c: clienti.find(c => c.clientName.trim().toLowerCase() === String(h.clientName || '').trim().toLowerCase()) })).filter(x => x.c);
    $('banner-collega').hidden = !daCollegare.length;
    if (daCollegare.length) {
        $('banner-titolo').textContent = daCollegare.length === 1 ? '1 hub si può collegare a un cliente' : `${daCollegare.length} hub si possono collegare a un cliente`;
        $('banner-testo').textContent = 'Hanno lo stesso nome di un cliente dei Piani editoriali. Collegandoli, prendono la sua foto Instagram. I link e le risorse non cambiano.';
        $('btn-collega-auto').onclick = async () => {
            if (!(await conferma('Collego ' + (daCollegare.length === 1 ? 'questo hub' : 'questi hub') + ' al cliente con lo stesso nome e ne prendo la foto. Il link dell\'hub e le risorse restano uguali.', 'Collega', 'Collegare i clienti?'))) return;
            let fatti = 0;
            try { for (const x of daCollegare) { const p = { clienteId: x.c.id }; if (x.c.avatar) p.avatar = x.c.avatar; await updateDoc(doc(db, "hubClienti", x.h.id), p); fatti++; } avviso(fatti === 1 ? '1 hub collegato.' : `${fatti} hub collegati.`); }
            catch (e) { avviso(`Collegati ${fatti}, poi si è fermato. ` + erroreTesto(e)); }
            initRouter(auth.currentUser);
        };
    }
}

// ---------- nuovo hub ----------
function apriNuovoHub() {
    const lista = $('pick-lista');
    lista.innerHTML = clienti.length ? clienti.map(c => {
        const ha = hubs.some(h => h.clienteId === c.id || String(h.clientName || '').trim().toLowerCase() === c.clientName.trim().toLowerCase());
        return `<button type="button" class="pk-riga" data-id="${esc(c.id)}" ${ha ? 'disabled' : ''}><span class="avatar m">${avatarHtml(c)}</span><span><b>${esc(c.clientName)}</b>${c.instagram ? `<small>@${esc(utenteInstagram(c.instagram))}</small>` : ''}</span>${ha ? '<em>Ha già un hub</em>' : ''}</button>`;
    }).join('') : '<p style="color:var(--testo-2)">Non ci sono ancora clienti: creane uno nuovo qui sotto.</p>';
    openCustomStep('pick');
}
function slugHubUnico(nome) {
    const base = createSlug(nome) || 'cliente'; let cand = base, n = 2;
    while (hubs.some(h => h.slug === cand)) cand = `${base}-${n++}`;
    return cand;
}
async function creaHub(c) {
    const slug = slugHubUnico(c.clientName);
    const ped = `${PED_BASE}${c.slugBreve || c.slug}`;
    await addDoc(collection(db, "hubClienti"), { clientName: c.clientName, slug, clienteId: c.id, avatar: c.avatar || '', avatarUrl: '', pedUrl: ped, reportUrl: '', risorse: [{ id: 'ped', tipo: 'ped', titolo: 'Piano editoriale', url: ped }], createdAt: new Date() });
    closeAuthModal();
    window.location.href = `?e=${encodeURIComponent(slug)}`;
}
$('pick-lista').addEventListener('click', async (e) => {
    const b = e.target.closest('.pk-riga'); if (!b || b.disabled) return;
    const c = clienti.find(x => x.id === b.dataset.id); if (!c) return;
    try { await creaHub(c); } catch (err) { console.error(err); avviso('Hub non creato. ' + erroreTesto(err)); }
});
$('btn-cliente-nuovo').addEventListener('click', () => openCustomStep('new'));
$('new-indietro').addEventListener('click', () => openCustomStep('pick'));
$('form-new-client').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('nc-nome').value.trim(), utente = utenteInstagram($('nc-ig').value);
    const bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true; const t0 = bottone.textContent;
    try {
        const nuovo = { clientName: nome, slug: createSlug(nome) + '-' + Math.random().toString(36).substring(2, 7), videos: [], piani: [], createdAt: new Date() };
        let nota = '';
        if (utente) { nuovo.instagram = `https://www.instagram.com/${utente}/`; bottone.textContent = 'Cerco la foto…'; try { nuovo.avatar = await fotoDaInstagram(utente); } catch (err) { nota = 'Cliente creato, ma non ho trovato la foto: caricala dai Piani editoriali.'; } }
        const ref = await addDoc(collection(db, "pianiEditoriali"), nuovo);
        await creaHub({ id: ref.id, slug: nuovo.slug, clientName: nome, avatar: nuovo.avatar || '' });
        if (nota) avviso(nota);
    } catch (err) { console.error(err); avviso('Cliente non creato. ' + erroreTesto(err)); }
    finally { bottone.disabled = false; bottone.textContent = t0; }
});

// ---------- editor di un hub ----------
function renderEditor() {
    const h = hubCorrente, c = clienteDi(h);
    document.title = `Hub · ${h.clientName}`;
    $('ed-nome').textContent = h.clientName;
    $('ed-avatar').innerHTML = avatarHub({ ...h, avatar: (c && c.avatar) || h.avatar }); fixAvatars($('ed-avatar'));
    $('ed-sotto').textContent = c ? `Cliente: ${c.clientName}` : 'Non è collegato a un cliente dei Piani editoriali.';
    $('ed-nome-input').value = h.clientName;
    $('btn-anteprima').href = `?v=${encodeURIComponent(h.slug)}`;
    $('btn-copia-hub').onclick = () => copiaTesto(hubUrl(h.slug), $('btn-copia-hub').querySelector('span'));
    risorseLav = risorseDi(h).map(r => ({ ...r }));
    renderRisorse();
}
function renderRisorse() {
    const box = $('risorse-lista');
    if (!risorseLav.length) { box.innerHTML = '<div class="rs-vuoto">Nessuna risorsa: il cliente vedrebbe un hub vuoto. Aggiungine una.</div>'; return; }
    box.innerHTML = risorseLav.map((r, i) => {
        const t = TIPI[r.tipo] || TIPI.link;
        return `<div class="rs-riga"><span class="rs-ic">${svg(r.tipo)}</span><span class="rs-t"><b>${esc(r.titolo || t.nome)}</b><span>${esc(r.url)}</span></span>
            <span class="rs-az"><button type="button" class="rnd" data-az="su" data-i="${i}" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/></svg></button><button type="button" class="rnd" data-az="giu" data-i="${i}" aria-label="Sposta giù" ${i === risorseLav.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6"/></svg></button><button type="button" class="rnd" data-az="mod" data-i="${i}" aria-label="Modifica"><svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg></button><button type="button" class="rnd p" data-az="del" data-i="${i}" aria-label="Elimina"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button></span></div>`;
    }).join('');
}
// ogni modifica si salva subito; pedUrl e reportUrl restano allineati ai vecchi campi
async function salvaRisorse(testo) {
    const ped = risorseLav.find(r => r.tipo === 'ped'), rep = risorseLav.find(r => r.tipo === 'report');
    try {
        await updateDoc(doc(db, "hubClienti", hubCorrente.id), { risorse: risorseLav, pedUrl: ped ? ped.url : '', reportUrl: rep ? rep.url : '' });
        hubCorrente.risorse = risorseLav.map(r => ({ ...r }));
        $('ed-stato').textContent = 'Salvato.';
        if (testo) avviso(testo);
    } catch (e) { console.error(e); avviso('Salvataggio non riuscito. ' + erroreTesto(e)); }
}
$('risorse-lista').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-az]'); if (!b || b.disabled) return;
    const i = parseInt(b.dataset.i, 10), az = b.dataset.az;
    if (az === 'su' || az === 'giu') {
        const j = az === 'su' ? i - 1 : i + 1; [risorseLav[i], risorseLav[j]] = [risorseLav[j], risorseLav[i]];
        renderRisorse(); salvaRisorse('');
    } else if (az === 'del') {
        const r = risorseLav[i];
        if (!(await conferma(`Il pulsante "${r.titolo}" sparirà dall'hub del cliente.`, 'Elimina', 'Eliminare la risorsa?'))) return;
        risorseLav.splice(i, 1); renderRisorse(); salvaRisorse('Risorsa eliminata.');
    } else if (az === 'mod') apriRisorsa(i);
});
$('ed-nome-input').addEventListener('change', async () => {
    const n = $('ed-nome-input').value.trim(); if (!n || n === hubCorrente.clientName) return;
    try { await updateDoc(doc(db, "hubClienti", hubCorrente.id), { clientName: n }); hubCorrente.clientName = n; $('ed-nome').textContent = n; avviso('Nome salvato.'); }
    catch (e) { avviso('Nome non salvato. ' + erroreTesto(e)); }
});
$('btn-elimina-hub').addEventListener('click', async () => {
    if (!(await conferma(`L'hub di "${hubCorrente.clientName}" verrà eliminato e il suo link smetterà di funzionare. Il cliente nei Piani editoriali resta. L'azione non si può annullare.`, 'Elimina l\'hub', 'Eliminare l\'hub?'))) return;
    try { await deleteDoc(doc(db, "hubClienti", hubCorrente.id)); window.location.href = './'; }
    catch (e) { console.error(e); avviso('Hub non eliminato. ' + erroreTesto(e)); }
});

// risorsa: crea / modifica
let risInModifica = null;
$('ris-tipo').innerHTML = Object.keys(TIPI).map(k => `<option value="${k}">${TIPI[k].nome}</option>`).join('');
function apriRisorsa(i) {
    risInModifica = i === undefined ? null : i;
    const r = risInModifica === null ? null : risorseLav[risInModifica];
    $('form-risorsa').reset();
    $('ris-tipo').value = r ? r.tipo : (risorseLav.some(x => x.tipo === 'ped') ? 'link' : 'ped');
    $('ris-titolo').value = r ? r.titolo : TIPI[$('ris-tipo').value].nome;
    $('ris-url').value = r ? r.url : '';
    $('ris-heading').innerHTML = r ? 'Modifica <em>risorsa</em>' : 'Nuova <em>risorsa</em>';
    $('ris-submit').textContent = r ? 'Salva' : 'Aggiungi';
    $('ris-icon').innerHTML = svg($('ris-tipo').value);
    aggiornaPedBtn();
    openCustomStep('risorsa');
}
function aggiornaPedBtn() { $('ris-scegli').hidden = $('ris-tipo').value === 'link'; }
$('btn-add-risorsa').addEventListener('click', () => apriRisorsa());
$('ris-tipo').addEventListener('change', () => {
    const k = $('ris-tipo').value;
    if (!$('ris-titolo').value.trim() || Object.values(TIPI).some(t => t.nome === $('ris-titolo').value)) $('ris-titolo').value = TIPI[k].nome;
    $('ris-icon').innerHTML = svg(k); aggiornaPedBtn();
});
$('form-risorsa').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = { id: risInModifica === null ? 'r' + Date.now().toString(36) : risorseLav[risInModifica].id, tipo: $('ris-tipo').value, titolo: $('ris-titolo').value.trim(), url: $('ris-url').value.trim() };
    if (risInModifica === null) risorseLav.push(r); else risorseLav[risInModifica] = r;
    closeAuthModal(); renderRisorse(); salvaRisorse(risInModifica === null ? 'Risorsa aggiunta.' : 'Risorsa salvata.');
});

// ---------- scegliere una risorsa tra quelle già presenti negli altri tool ----------
const BASE = 'https://teomacauda.it/';
const SORGENTI = {
    ped: { nome: 'piani editoriali', carica: async () => {
        const s = await getDocs(collection(db, "pianiEditoriali")); const out = [];
        // stesso indirizzo leggibile dei Piani editoriali: cliente + titolo del piano (es. ally-agosto-26)
        const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+|-+$/g, '');
        const sl = (cl, nome) => (norm(nome || 'piano') || 'piano').slice(0, 48);
        const senza = (cl, t) => { const c = norm(cl); return c && String(t || '').startsWith(c + '-') && t.length > c.length + 1 ? t.slice(c.length + 1) : t; };
        s.forEach(d => { const x = d.data(); if (x.isHub === true || !x.slug) return;
            const piani = []; if ((x.videos && x.videos.length) || x.pianoNome) piani.push({ nome: x.pianoNome || 'Piano principale', slug: senza(x.clientName, x.pianoSlug || '') }); (x.piani || []).forEach(p => piani.push({ nome: p.nome || 'Piano', slug: senza(x.clientName, p.slug || '') }));
            const usati = new Set(piani.map(p => p.slug).filter(Boolean));
            piani.forEach(p => { if (!p.slug) { let b = sl(x.clientName, p.nome), t = b, n = 2; while (usati.has(t)) t = `${b}-${n++}`; p.slug = t; usati.add(t); } });
            piani.forEach(p => out.push({ gruppo: x.clientName, t: `${x.clientName} · ${p.nome}`, s: 'Solo questo piano', url: `${BASE}pianieditoriali/?v=${x.slugBreve || x.slug}&p=${encodeURIComponent(p.slug)}`, titolo: 'Piano editoriale' }));
            if (!piani.length) out.push({ gruppo: x.clientName, t: x.clientName, s: 'Ancora nessun piano', url: `${BASE}pianieditoriali/?v=${x.slugBreve || x.slug}`, titolo: 'Piano editoriale' }); });
        return out; } },
    report: { nome: 'report', carica: async () => { const s = await getDocs(collection(db, "reportMensili")); const o = []; s.forEach(d => { const x = d.data(); if (x.slug) o.push({ gruppo: x.title || '', t: x.title || x.slug, s: 'Report mensile', url: (x.slugCliente && x.slugTitolo) ? `${BASE}report/?v=${x.slugCliente}&p=${x.slugTitolo}` : `${BASE}report/?v=${x.slug}`, titolo: 'Report' }); }); return o; } },
    consegna: { nome: 'consegne video', carica: async () => { const s = await getDocs(collection(db, "consegneVideo")); const o = []; s.forEach(d => { const x = d.data(); if (x.slug) o.push({ gruppo: x.clientName || '', t: x.deliveryTitle || x.slug, s: x.clientName || '', url: (x.slugCliente && x.slugTitolo) ? `${BASE}consegnavideo/?v=${x.slugCliente}&p=${x.slugTitolo}` : `${BASE}consegnavideo/?v=${x.slug}`, titolo: 'Consegna video' }); }); return o; } },
    revisione: { nome: 'revisioni', carica: async () => { const s = await getDocs(collection(db, "revisions")); const o = []; s.forEach(d => { const x = d.data(); if (x.slug) o.push({ gruppo: x.client || '', t: x.title || x.slug, s: x.client || '', url: (x.slugCliente && x.slugTitolo) ? `${BASE}revisioni/?v=${x.slugCliente}&p=${x.slugTitolo}` : `${BASE}revisioni/?v=${x.slug}`, titolo: 'Revisione' }); }); return o; } },
    preventivo: { nome: 'preventivi', carica: async () => { const s = await getDocs(collection(db, "preventivi")); const o = []; s.forEach(d => { const x = d.data(); const tot = x.totale !== undefined && x.totale !== '' ? ' · ' + (String(x.totale).includes('€') ? x.totale : '€ ' + x.totale) : ''; o.push({ gruppo: x.clientName || '', t: `${x.clientName || 'Preventivo'}${x.packageType ? ' · ' + x.packageType : ''}`, s: `Scade ${x.expiryDate || '—'}${tot}`, url: `${BASE}preventivi/?id=${d.id}`, titolo: 'Preventivo', ord: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : 0 }); }); return o.sort((a, b) => b.ord - a.ord); } },
    audit: { nome: 'video audit', carica: async () => { const s = await getDocs(collection(db, "videoAudits")); const o = []; s.forEach(d => { const x = d.data(); if (x.slug) o.push({ gruppo: x.clientName || x.companyName || '', t: [x.companyName, x.clientName].filter(Boolean).join(' · ') || x.slug, s: 'Video audit', url: `${BASE}videoaudit/?v=${x.slug}`, titolo: 'Video audit' }); }); return o; } }
};
const sorgenteCache = {};
let rpElementi = [];
async function apriScelta() {
    const tipo = $('ris-tipo').value, src = SORGENTI[tipo]; if (!src) return;
    $('rp-titolo').innerHTML = `Scegli tra i <em>${esc(src.nome)}</em>`;
    $('rp-icon').innerHTML = svg(tipo); $('rp-cerca').value = '';
    $('rp-lista').innerHTML = '<p class="rp-vuoto">Carico…</p>'; openCustomStep('rispick');
    try {
        if (!sorgenteCache[tipo]) sorgenteCache[tipo] = await src.carica();
        rpElementi = sorgenteCache[tipo];
    } catch (e) { console.error(e); rpElementi = []; $('rp-lista').innerHTML = `<p class="rp-vuoto">Non riesco a leggere i ${esc(src.nome)}. ${esc(erroreTesto(e))}</p>`; return; }
    renderScelta();
}
function renderScelta() {
    const q = $('rp-cerca').value.trim().toLowerCase();
    const nomi = [hubCorrente && hubCorrente.clientName, (clienteDi(hubCorrente) || {}).clientName].filter(Boolean).map(n => n.trim().toLowerCase());
    const filtra = rpElementi.map((e, i) => ({ e, i })).filter(({ e }) => !q || (e.t + ' ' + e.s).toLowerCase().includes(q));
    const suoi = (e) => nomi.some(n => (e.gruppo || '').toLowerCase().includes(n) || (e.t || '').toLowerCase().includes(n));
    const miei = filtra.filter(x => suoi(x.e)), altri = filtra.filter(x => !suoi(x.e));
    const riga = ({ e, i }) => `<button type="button" class="pk-riga" data-i="${i}"><span class="rp-t"><b>${esc(e.t)}</b><small>${esc(e.s)}</small></span>${$('ris-url').value.trim() === e.url ? '<em>Scelto</em>' : ''}</button>`;
    let html = '';
    if (miei.length) html += `<h5 class="pk-g">Di ${esc(hubCorrente.clientName)}</h5>` + miei.map(riga).join('');
    if (altri.length) html += `<h5 class="pk-g">${miei.length ? 'Altri' : 'Tutti'}</h5>` + altri.map(riga).join('');
    $('rp-lista').innerHTML = html || '<p class="rp-vuoto">Nessun risultato.</p>';
}
$('ris-scegli').addEventListener('click', apriScelta);
$('rp-cerca').addEventListener('input', renderScelta);
$('rp-indietro').addEventListener('click', () => openCustomStep('risorsa'));
$('rp-lista').addEventListener('click', (e) => {
    const b = e.target.closest('.pk-riga'); if (!b) return;
    const el = rpElementi[parseInt(b.dataset.i, 10)]; if (!el) return;
    $('ris-url').value = el.url;
    if (!$('ris-titolo').value.trim() || Object.values(TIPI).some(t => t.nome === $('ris-titolo').value)) $('ris-titolo').value = el.titolo;
    openCustomStep('risorsa');
});

// ---------- accesso ----------
$('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('auth-error'); err.hidden = true;
    try { await signInWithEmailAndPassword(auth, $('login-email').value, $('login-pass').value); closeAuthModal(); $('form-login').reset(); }
    catch (error) { err.hidden = false; err.innerText = 'Credenziali non valide.'; }
});
$('btn-open-login').addEventListener('click', () => openCustomStep('login'));
onAuthStateChanged(auth, (user) => { initRouter(user); });

// ---------- finestre ----------
function openCustomStep(step) {
    ['modal-step-auth', 'modal-step-pick', 'modal-step-new', 'modal-step-risorsa', 'modal-step-rispick'].forEach(id => { $(id).hidden = true; });
    if (!auth.currentUser) $('modal-step-auth').hidden = false; else $('modal-step-' + (step === 'login' ? 'auth' : step)).hidden = false;
    $('auth-modal').classList.add('on'); $('auth-modal').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeAuthModal() { $('auth-modal').classList.remove('on'); $('auth-modal').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
$('auth-modal').addEventListener('mousedown', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });
document.querySelectorAll('[data-chiudi-mod]').forEach(b => b.addEventListener('click', closeAuthModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('auth-modal').classList.contains('on') && !$('conf-modal').classList.contains('on')) closeAuthModal(); });
window.openAuthModal = openCustomStep;
window.closeAuthModal = closeAuthModal;
