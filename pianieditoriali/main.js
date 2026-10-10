import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// ===== Piani editoriali · logica =====
// Sopra (import e collegamento a Firebase) è copiato identico dalla versione precedente.
// Stessi dati: collezione "pianiEditoriali", un documento per cliente con { clientName, slug, videos[], createdAt }.
// Ogni video: { title, type, status, date ("7 Ago - 12:30" | "ASAP" | ""), scriptLink }.

const urlParams = new URLSearchParams(window.location.search);
const clientSlug = urlParams.get('v');
const $ = (id) => document.getElementById(id);

let currentClientDocId = null;
let currentClientData = null;   // dati del cliente così come sono su Firebase
let currentPlanId = 'main';      // piano che si sta guardando
let pianoVisualizzato = null;
let editingVideoIndex = null;
let draggedIndex = null;
let activeStatusFilter = 'Tutti';
let currentVideos = [];
let currentIsAdmin = false;
let calItems = [];           // contenuti visibili (con indice originale) per il calendario
let calY = new Date().getFullYear();
let calM = new Date().getMonth();
let calSel = null;           // giorno selezionato nel calendario
let calIniziale = true;      // alla prima apertura il calendario va al mese giusto

// ---------- icone ----------
const P = {
    idea: '<path d="M9 18h6M10 21.5h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    scrittura: '<path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    produzione: '<path d="M22 8l-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="3"/>',
    pronto: '<circle cx="12" cy="12" r="9.5"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>',
    pubblicato: '<path d="M12 20v-10"/><path d="M7.5 14.5L12 10l4.5 4.5"/><path d="M5 4.5h14"/>',
    film: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M7.5 4v16M16.5 4v16M3.5 9h4M16.5 9h4M3.5 15h4M16.5 15h4"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    playCircle: '<circle cx="12" cy="12" r="9.5"/><path d="M10 8.5v7l5.5-3.5z"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
    image: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    grip: '<circle cx="9" cy="6" r="1.1"/><circle cx="15" cy="6" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="9" cy="18" r="1.1"/><circle cx="15" cy="18" r="1.1"/>',
    pencil: '<path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="3"/><path d="M15.5 8.5v-1a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    save: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    chevL: '<path d="M15 5l-7 7 7 7"/>',
    chevR: '<path d="M9 5l7 7-7 7"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.6"/><path d="M2.8 20c.4-3.5 3-5.6 6.2-5.6s5.8 2.1 6.2 5.6"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>'
};
const ic = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Idea=grigio, Scrittura=blu, Produzione=arancio, Pronto=ambra, Pubblicato=verde: si capisce a colpo d'occhio
const STATUS_COLUMNS = [
    { id: "Idea", label: "Idea", color: "#A3A9B5", icon: ic('idea') },
    { id: "Scrittura", label: "Scrittura", color: "#6EA8FE", icon: ic('scrittura') },
    { id: "In Produzione", label: "Produzione", color: "#F2874F", icon: ic('produzione') },
    { id: "Pronto", label: "Pronto", color: "#F5C451", icon: ic('pronto') },
    { id: "Pubblicato", label: "Pubblicato", color: "#4ADE80", icon: ic('pubblicato') }
];
const TYPE_OPTIONS = [
    { id: "Reel", label: "Reel", color: "#F472B6", icon: ic('film') },
    { id: "TikTok", label: "TikTok", color: "#22D3EE", icon: ic('music') },
    { id: "YT Shorts", label: "YT Shorts", color: "#F87171", icon: ic('playCircle') },
    { id: "Video YT", label: "Video YT", color: "#EF4444", icon: ic('play') },
    { id: "Storia", label: "Storia", color: "#FBBF24", icon: ic('clock') },
    { id: "Post", label: "Post", color: "#818CF8", icon: ic('image') }
];

function normStatus(s) { return s === "In Scrittura" ? "Scrittura" : s; }
function denormStatus(id) { return id === "Scrittura" ? "In Scrittura" : id; }
function statusInfo(status) { return STATUS_COLUMNS.find(c => c.id === normStatus(status)) || STATUS_COLUMNS[0]; }
function statusIndex(status) { const i = STATUS_COLUMNS.findIndex(c => c.id === normStatus(status)); return i < 0 ? 0 : i; }
function typeInfo(type) { return TYPE_OPTIONS.find(t => t.id === type) || TYPE_OPTIONS[3]; }

// link allo script: senza "https://" lo si completa, e si accettano solo link web (niente codice nei link)
function urlSicuro(u) {
    const s = String(u || '').trim(); if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
    return 'https://' + s.replace(/^\/+/, '');
}

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

// ---------- conferma e avvisi dentro la pagina ----------
let toastTimer = 0;
function avviso(testo) {
    const t = $('toast'); t.textContent = testo; t.hidden = false; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.hidden = true; }, 300); }, 4200);
}
function conferma(testo, okLabel, titolo) {
    return new Promise((resolve) => {
        $('conf-titolo').textContent = titolo || 'Sei sicuro?';
        $('conf-testo').textContent = testo;
        $('conf-ok').textContent = okLabel || 'Elimina';
        const m = $('conf-modal');
        const chiudi = (v) => { m.classList.remove('on'); m.setAttribute('aria-hidden', 'true'); $('conf-ok').onclick = $('conf-no').onclick = null; document.removeEventListener('keydown', esc); resolve(v); };
        const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); chiudi(false); } };
        $('conf-ok').onclick = () => chiudi(true);
        $('conf-no').onclick = () => chiudi(false);
        m.onmousedown = (e) => { if (e.target === m) chiudi(false); };
        document.addEventListener('keydown', esc, true);
        m.classList.add('on'); m.setAttribute('aria-hidden', 'false');
        setTimeout(() => $('conf-no').focus(), 60);
    });
}
const erroreTesto = (e) => (e && e.code === 'permission-denied') ? 'Firebase non permette questa operazione con il tuo accesso.' : 'Qualcosa non ha funzionato, riprova.';

// ---------- foto profilo del cliente (da Instagram) ----------
function utenteInstagram(s) {
    s = String(s || '').trim(); if (!s) return '';
    const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i) || s.match(/^@?([A-Za-z0-9._]+)$/);
    return m ? m[1].replace(/\/+$/, '') : '';
}
// ritaglia al centro e riduce a 160 px: nel documento resta una miniatura leggerissima
function riduciFoto(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob), img = new Image();
        img.onload = () => {
            const S = 160, c = document.createElement('canvas'); c.width = c.height = S;
            const lato = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - lato) / 2, sy = (img.naturalHeight - lato) / 2;
            c.getContext('2d').drawImage(img, sx, sy, lato, lato, 0, 0, S, S);
            URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', .85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('immagine non valida')); };
        img.src = url;
    });
}
// cerca la foto del profilo: legge la pagina pubblica "embed" del profilo tramite il servizio gratuito r.jina.ai
async function foto_da_instagram(utente) {
    const r = await fetch('https://r.jina.ai/https://www.instagram.com/' + encodeURIComponent(utente) + '/embed/');
    if (!r.ok) throw new Error('profilo non raggiungibile');
    const testo = await r.text();
    const m = testo.match(/!\[[^\]]*profile picture\]\((https:[^)\s]+)\)/i);
    if (!m) throw new Error('foto non trovata');
    const img = await fetch(m[1]);
    if (!img.ok) throw new Error('foto non scaricabile');
    return riduciFoto(await img.blob());
}
function iniziali(nome) { return String(nome || '?').trim().split(/\s+/).filter(w => /^[A-Za-zÀ-ÿ0-9]/.test(w)).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?'; }
function avatarHtml(d, extra) {
    return d && d.avatar ? `<img src="${esc(d.avatar)}" alt="" loading="lazy" decoding="async">` : `<b>${esc(iniziali(d && d.clientName))}</b>`;
}

// ---------- piani del cliente ----------
// Un cliente = un documento. Il piano "principale" resta dov'è sempre stato (campo `videos`, nome in `pianoNome`),
// così i clienti e i link esistenti non cambiano. Gli altri piani stanno nel campo nuovo `piani` [{ id, nome, videos }].
function getPiani(data) {
    const d = data || {}, out = [];
    if ((d.videos && d.videos.length) || d.pianoNome) out.push({ id: 'main', nome: d.pianoNome || 'Piano principale', videos: d.videos || [] });
    (d.piani || []).forEach(p => out.push({ id: p.id, nome: p.nome || 'Piano', videos: p.videos || [] }));
    return out;
}
function tuttiIVideo(data) { return getPiani(data).reduce((a, p) => a.concat(p.videos), []); }
function pianoAttivo() { return getPiani(currentClientData).find(p => p.id === currentPlanId) || null; }
// salva i contenuti del piano che si sta guardando
async function scriviVideos(videos) {
    const docRef = doc(db, "pianiEditoriali", currentClientDocId);
    if (currentPlanId === 'main') {
        await updateDoc(docRef, { videos: videos });
        currentClientData.videos = videos;
    } else {
        const snap = await getDoc(docRef);
        const piani = ((snap.data() || {}).piani || []).map(p => p.id === currentPlanId ? { ...p, videos: videos } : p);
        await updateDoc(docRef, { piani: piani });
        currentClientData.piani = piani;
    }
}
async function leggiVideosFreschi() {
    const snap = await getDoc(doc(db, "pianiEditoriali", currentClientDocId));
    if (!snap.exists()) return null;
    currentClientData = snap.data();
    const p = pianoAttivo();
    return p ? p.videos : [];
}

// ---------- collegamento agli script ----------
const LINK_BASE = 'https://teomacauda.it/script/?v=';
const linkScript = (slug) => LINK_BASE + encodeURIComponent(slug);
function slugDaLink(link) { const m = String(link || '').match(/\/script\/?\?(?:[^#]*&)?v=([^&#]+)/i); return m ? decodeURIComponent(m[1]) : ''; }
let scriptsCache = null;
async function caricaScripts(forza) {
    if (scriptsCache && !forza) return scriptsCache;
    try {
        const snap = await getDocs(query(collection(db, "scripts"), orderBy("createdAt", "desc")));
        scriptsCache = []; snap.forEach(d => scriptsCache.push({ id: d.id, ...d.data() }));
    } catch (e) { console.error(e); scriptsCache = null; avviso('Non riesco a leggere gli script. ' + erroreTesto(e)); return []; }
    return scriptsCache;
}
const scriptDaSlug = (slug) => (scriptsCache || []).find(s => s.slug === slug) || null;
let pickerRitorno = null, pickerSceglie = null, pickerCorrente = '';
async function apriPicker(correnteSlug, ritorno, onPick) {
    pickerRitorno = ritorno; pickerSceglie = onPick; pickerCorrente = correnteSlug || '';
    $('picker-cerca').value = '';
    await caricaScripts();
    renderPicker();
    openCustomStep('picker');
}
function renderPicker() {
    const q = $('picker-cerca').value.trim().toLowerCase();
    const tutti = (scriptsCache || []).filter(s => !q || String(s.title || '').toLowerCase().includes(q));
    const miei = tutti.filter(s => s.clienteId === currentClientDocId), altri = tutti.filter(s => s.clienteId !== currentClientDocId);
    const riga = (s) => `<button type="button" class="pk-riga ${s.slug === pickerCorrente ? 'on' : ''}" data-slug="${esc(s.slug)}"><span class="pk-t"><b>${esc(s.title)}</b><small>${esc(s.category === 'Short Form' ? 'Short Form / Reel' : (s.category || ''))}</small></span>${s.slug === pickerCorrente ? '<em>Collegato</em>' : ''}</button>`;
    let html = '';
    if (pickerCorrente) html += `<button type="button" class="pk-riga pk-nessuno" data-slug="">Nessuno script <small>(togli il collegamento)</small></button>`;
    if (miei.length) html += `<h5 class="pk-g">Di ${esc(currentClientData ? currentClientData.clientName : 'questo cliente')}</h5>` + miei.map(riga).join('');
    if (altri.length) html += `<h5 class="pk-g">${miei.length ? 'Altri script' : 'Tutti gli script'}</h5>` + altri.map(riga).join('');
    if (!tutti.length) html += `<p class="pk-vuoto">${scriptsCache && scriptsCache.length ? 'Nessuno script corrisponde alla ricerca.' : 'Non ci sono ancora script: scrivili dal tool Script.'}</p>`;
    $('picker-lista').innerHTML = html;
}
$('picker-cerca').addEventListener('input', renderPicker);
$('picker-lista').addEventListener('click', (e) => {
    const b = e.target.closest('.pk-riga'); if (!b) return;
    const cb = pickerSceglie; pickerSceglie = null;
    if (cb) cb(b.dataset.slug);
});
$('picker-indietro').addEventListener('click', () => { pickerSceglie = null; if (pickerRitorno) pickerRitorno(); });
// dal modulo del contenuto
$('btn-pick-script').addEventListener('click', () => {
    apriPicker(slugDaLink($('video-script-link').value), () => openCustomStep('add-video'), (slug) => {
        $('video-script-link').value = slug ? linkScript(slug) : '';
        openCustomStep('add-video');
    });
});

// ---------- date ----------
const MESI_ABBR = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const MESI_FULL = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI_SETTIMANA = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const GIORNI_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const DAY = 864e5;
const pad2 = (n) => String(n).padStart(2, '0');
const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const stessoGiorno = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const lunediDi = (d) => { const x = sod(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const diffGiorni = (d) => Math.round((sod(d) - sod(new Date())) / DAY);
function relLabel(n) { if (n === 0) return 'oggi'; if (n === 1) return 'domani'; if (n === -1) return 'ieri'; return n > 1 ? `tra ${n} giorni` : `${-n} giorni fa`; }
const chiaveGiorno = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// "7 Ago - 12:30" | "7 Ago" | "ASAP" | "" -> oggetto (l'anno non è salvato: si sceglie quello più vicino a oggi)
function parseData(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (s.toUpperCase() === 'ASAP') return { asap: true };
    const m = s.match(/^(\d{1,2})\s+([A-Za-zÀ-ù]{3,})\.?\s*(?:-\s*(\d{1,2}):(\d{2}))?$/);
    if (!m) return null;
    const mi = MESI_ABBR.findIndex(x => x.toLowerCase() === m[2].slice(0, 3).toLowerCase());
    if (mi === -1) return null;
    const day = parseInt(m[1], 10), now = new Date();
    let best = null;
    [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].forEach(y => {
        const d = new Date(y, mi, day), diff = Math.abs(d - now);
        if (!best || diff < best.diff) best = { y, diff };
    });
    const h = m[3] !== undefined ? parseInt(m[3], 10) : null, mn = m[4] !== undefined ? parseInt(m[4], 10) : null;
    return { y: best.y, m: mi, d: day, h, min: mn, date: new Date(best.y, mi, day, h || 0, mn || 0) };
}
function etichettaData(video) {
    const p = parseData(video.date);
    if (!video.date) return 'Da definire';
    if (p && p.asap) return 'ASAP';
    return video.date;
}
// "tra 3 giorni" accanto alla data (non per i contenuti già pubblicati)
function relativa(video) {
    const p = parseData(video.date);
    if (!p || p.asap || normStatus(video.status) === 'Pubblicato') return '';
    const n = diffGiorni(p.date);
    return `<em class="${n < 0 ? 'tardi' : ''}">${relLabel(n)}</em>`;
}

// ---------- barra e routing ----------
let rawCaricato = false;
function caricaRaw() {
    if (rawCaricato) return; rawCaricato = true;
    const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s);   // il selettore degli strumenti serve solo a te, non al cliente
}

async function initRouter(user) {
    $('main-loader').hidden = false;
    $('section-lock').hidden = true;
    $('section-admin-catalog').hidden = true;
    $('section-client-plan').hidden = true;
    $('fab-add').classList.remove('mostra');
    closeAllFieldPopovers(true);

    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    $('admin-indicator').hidden = !user;
    $('btnStrumenti').hidden = !user;
    $('btnRaw').hidden = !user;
    $('marchio').href = user ? '../raw/' : '../';
    $('marchio').setAttribute('aria-label', user ? 'RAW OS' : 'Teo Macauda');
    if (user) caricaRaw();

    const hubParam = urlParams.get('hub');
    if (hubParam) localStorage.setItem('activeHub', hubParam);
    const activeHub = hubParam || localStorage.getItem('activeHub');
    const back = $('back-to-hub');
    if (activeHub) { back.href = `../hubclienti/?v=${activeHub}`; back.hidden = false; } else { back.hidden = true; }

    if (clientSlug) {
        try {
            const querySnapshot = await trovaPerLink("pianiEditoriali", clientSlug);

            if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                const clientData = clientDoc.data();

                if (clientData.isHub === true) { window.location.href = './'; return; }

                currentClientDocId = clientDoc.id;
                currentClientData = clientData;
                $('main-loader').hidden = true;
                renderVista(user !== null);
            } else {
                window.location.href = './';
            }
        } catch (error) {
            console.error("Errore:", error);
            window.location.href = './';
        }
    } else {
        document.title = 'Piani editoriali · Teo Macauda';
        if (user) {
            loadAdminCatalog();
        } else {
            $('main-loader').hidden = true;
            $('section-lock').hidden = false;
        }
    }
}

// ---------- navigazione: clienti → piani del cliente → contenuti del piano ----------
function pianoDaUrl() { return new URLSearchParams(window.location.search).get('p'); }
function vaiAPiano(id) {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set('p', id); else u.searchParams.delete('p');
    history.pushState(null, '', u);
    renderVista(!!auth.currentUser);
    window.scrollTo(0, 0);
}
window.addEventListener('popstate', () => { if (currentClientData) renderVista(!!auth.currentUser); });

function renderVista(admin) {
    const piani = getPiani(currentClientData);
    const p = pianoDaUrl();
    let inPiano = !!p && piani.some(x => x.id === p);
    if (inPiano) currentPlanId = p;
    else if (!admin && piani.length === 1) { inPiano = true; currentPlanId = piani[0].id; }   // un solo piano: il cliente lo vede subito
    $('section-client').hidden = inPiano;
    $('section-client-plan').hidden = !inPiano;
    $('fab-add').classList.remove('mostra');
    if (inPiano) mostraPiano(admin, piani); else renderCliente(admin, piani);
    posizionaBolla();
}

// schermata del cliente: l'elenco dei suoi piani
function renderCliente(admin, piani) {
    const d = currentClientData, oggi = sod(new Date());
    $('client-title').innerText = d.clientName;
    $('client-avatar').innerHTML = avatarHtml(d);
    document.title = `${d.clientName} · Piani editoriali`;
    $('crumb-cliente').hidden = !admin;
    $('btn-edit-title').hidden = !admin;
    if (!admin) $('edit-title-container').hidden = true;
    $('btn-copy-link').hidden = !admin;
    $('client-sotto').textContent = piani.length ? `${piani.length} ${piani.length === 1 ? 'piano editoriale' : 'piani editoriali'}` : '';
    const vuoto = piani.length === 0;
    $('piano-vuoto').hidden = !vuoto;
    $('piano-vuoto-admin').hidden = !(vuoto && admin);
    $('piano-vuoto-cliente').hidden = !(vuoto && !admin);
    const grid = $('cat-piani');
    grid.innerHTML = '';
    grid.hidden = vuoto;
    const R = 24, C = 2 * Math.PI * R;
    piani.forEach(p => {
        const videos = p.videos;
        const ready = videos.filter(v => v.status === 'Pronto' || v.status === 'Pubblicato').length;
        const percent = videos.length > 0 ? Math.round((ready / videos.length) * 100) : 0;
        const prossimo = videos.map(v => ({ v, p: parseData(v.date) })).filter(o => o.p && !o.p.asap && normStatus(o.v.status) !== 'Pubblicato' && sod(o.p.date) >= oggi).sort((a, b) => a.p.date - b.p.date)[0];
        const tardi = admin ? videos.filter(v => { const q = parseData(v.date); return q && !q.asap && normStatus(v.status) !== 'Pubblicato' && sod(q.date) < oggi; }).length : 0;
        const card = document.createElement('div');
        card.className = 'cliente vetro';
        card.innerHTML = `
            ${admin ? `<button type="button" class="rnd p c-del btn-del-piano" data-id="${esc(p.id)}" aria-label="Elimina piano">${ic('trash')}</button>` : ''}
            <div class="c-top">
                <div class="anello"><svg viewBox="0 0 58 58"><circle class="f" cx="29" cy="29" r="${R}"/><circle class="v" cx="29" cy="29" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - percent / 100)).toFixed(1)}"/></svg><span>${percent}%</span></div>
                <div style="min-width:0"><h3>${esc(p.nome)}</h3><p class="slug">Piano editoriale</p></div>
            </div>
            <div class="c-info"><span><b>${videos.length}</b> ${videos.length === 1 ? 'contenuto' : 'contenuti'}</span>${prossimo ? `<span>Prossima: <b>${prossimo.p.d} ${MESI_ABBR[prossimo.p.m]}</b></span>` : ''}${tardi ? `<span style="color:#F5C451"><b>${tardi}</b> in ritardo</span>` : ''}</div>
            <div class="c-az">
                <button type="button" class="btn s btn-apri-piano" data-id="${esc(p.id)}">${ic('eye')}Apri piano</button>
                ${admin ? `<button type="button" class="btn v s btn-rinomina-piano" data-id="${esc(p.id)}">${ic('pencil')}Rinomina</button>` : ''}
                ${admin ? `<button type="button" class="btn v s btn-copia-piano" data-id="${esc(p.id)}">${ic('copy')}<span>Link</span></button>` : ''}
            </div>`;
        grid.appendChild(card);
    });
    if (admin && !vuoto) {
        const plus = document.createElement('button');
        plus.type = 'button'; plus.className = 'piu'; plus.id = 'btn-new-plan';
        plus.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Nuovo piano</span>`;
        grid.appendChild(plus);
    }
    $('section-client').hidden = false;
}
$('cat-piani').addEventListener('click', (e) => {
    const apri = e.target.closest('.btn-apri-piano');
    if (apri) { vaiAPiano(apri.dataset.id); return; }
    const ren = e.target.closest('.btn-rinomina-piano');
    if (ren) { apriFormPiano(ren.dataset.id); return; }
    const del = e.target.closest('.btn-del-piano');
    if (del) { eliminaPiano(del.dataset.id); return; }
    const cp = e.target.closest('.btn-copia-piano');
    if (cp) { copiaTesto(`${window.location.origin}${window.location.pathname}?v=${clientSlug}&p=${encodeURIComponent(cp.dataset.id)}`, cp.querySelector('span')); return; }
    if (e.target.closest('#btn-new-plan')) apriFormPiano();
    const card = e.target.closest('.cliente');                      // toccare la scheda apre il piano
    if (card && !e.target.closest('button')) { const b = card.querySelector('.btn-apri-piano'); if (b) vaiAPiano(b.dataset.id); }
});

// schermata del piano: i contenuti
function mostraPiano(admin, piani) {
    const piano = piani.find(p => p.id === currentPlanId);
    $('plan-title').textContent = piano.nome;
    $('plan-eyebrow').textContent = `${currentClientData.clientName} · Piano editoriale`;
    document.title = `${piano.nome} · ${currentClientData.clientName}`;
    $('crumb').hidden = !admin;                                    // i tasti "torna" sono solo per te
    $('crumb-nome').textContent = currentClientData.clientName;
    $('crumb-link').href = `?v=${encodeURIComponent(clientSlug)}`;
    $('admin-plan-tools').hidden = !admin;
    $('btn-copy-plan-link').hidden = !(admin && piani.length > 1);
    $('fab-add').classList.toggle('mostra', !!admin);
    if (pianoVisualizzato !== currentPlanId) { calIniziale = true; activeStatusFilter = 'Tutti'; pianoVisualizzato = currentPlanId; }
    renderVideoTable(piano.videos, admin);
}
$('crumb-link').addEventListener('click', (e) => { e.preventDefault(); vaiAPiano(null); });

// ---------- selettore vista ----------
let activeView = 'calendar';   // si apre sempre sul calendario; si cambia vista solo se si vuole
const mobile = () => window.matchMedia('(max-width: 899px)').matches;
function vistaEffettiva() { return (mobile() && activeView === 'kanban') ? 'list' : activeView; }
function posizionaBolla() {
    const sw = $('view-switcher'), bd = $('bd2'), v = vistaEffettiva();
    const b = sw.querySelector(`button[data-v="${v}"]`);
    sw.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('section-client-plan').dataset.view = v;
    if (!b || !b.offsetWidth) return;
    bd.style.width = b.offsetWidth + 'px';
    bd.style.transform = `translateX(${b.offsetLeft}px)`;
}
$('view-switcher').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    activeView = b.dataset.v;
    posizionaBolla();
});
window.addEventListener('resize', posizionaBolla);

// ---------- menu a comparsa ----------
const FIELD_POPOVER_IDS = ['quick-edit-popover', 'date-picker-popover', 'time-picker-popover'];
function positionPopover(pop, triggerEl) {
    const rect = triggerEl.getBoundingClientRect();
    const popWidth = pop.offsetWidth || 200;
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 12) left = window.innerWidth - popWidth - 12;
    if (left < 12) left = 12;
    let top = rect.bottom + 8;
    const popHeight = pop.offsetHeight || 260;
    let sopra = false;
    if (top + popHeight > window.innerHeight - 12) { top = Math.max(12, rect.top - 8 - popHeight); sopra = true; }
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    const ox = popWidth > 0 ? Math.min(100, Math.max(0, ((rect.left + rect.width / 2 - left) / popWidth) * 100)) : 50;
    pop.style.transformOrigin = `${ox}% ${sopra ? '100%' : '0%'}`;
    requestAnimationFrame(() => pop.classList.add('vis'));
}
function showPopoverEl(id) {
    closeAllFieldPopovers(true);
    const pop = $(id);
    pop.hidden = false; pop.classList.remove('vis');
    const fondo = $('quick-edit-backdrop');
    fondo.hidden = false; fondo.onclick = () => closeAllFieldPopovers();
}
function closeAllFieldPopovers(instant) {
    FIELD_POPOVER_IDS.forEach(id => {
        const el = $(id); if (!el) return;
        el.classList.remove('vis');
        if (instant) el.hidden = true; else setTimeout(() => { if (!el.classList.contains('vis')) el.hidden = true; }, 160);
    });
    const fondo = $('quick-edit-backdrop'); if (fondo) fondo.hidden = true;
}
function openQuickEditPopover(triggerEl, options, currentId, onSelect) {
    const pop = $('quick-edit-popover');
    pop.innerHTML = options.map(o => `<button type="button" class="qo ${o.id === currentId ? 'sel' : ''}" data-id="${o.id}" style="color:${o.color}">${o.icon}<span>${o.label}</span></button>`).join('');
    showPopoverEl('quick-edit-popover');
    positionPopover(pop, triggerEl);
    pop.querySelectorAll('.qo').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); const id = btn.getAttribute('data-id'); closeAllFieldPopovers(); onSelect(id); };
    });
}

async function updateVideoField(index, videosRef, field, value) {
    if (!currentClientDocId) return;
    videosRef[index][field] = value;
    try {
        await scriviVideos(videosRef);
        renderVideoTable(videosRef, true);
    } catch (e) {
        console.error(e);
        avviso("Errore durante l'aggiornamento: " + erroreTesto(e));
    }
}

// ---------- etichette e collegamenti nelle righe ----------
function badgeStato(video, admin) {
    const s = statusInfo(video.status);
    return `<span class="pillola ${admin ? 'cl st-trg' : ''}" style="color:${s.color};background:${s.color}1a;border-color:${s.color}4d">${s.icon}<span>${s.label}</span></span>`;
}
function badgeTipo(video, admin) {
    const t = typeInfo(video.type);
    return `<span class="pillola ${admin ? 'cl ty-trg' : ''}" style="color:${t.color};background:${t.color}1a;border-color:${t.color}4d">${t.icon}<span>${t.label}</span></span>`;
}
function traccia(video) {
    const s = statusInfo(video.status), idx = statusIndex(video.status);
    return `<span class="traccia" style="--c:${s.color}" title="${s.label}">${STATUS_COLUMNS.map((c, i) => `<i class="${i <= idx ? 'on' : ''} ${i === idx ? 'ora' : ''}"></i>`).join('')}</span>`;
}
function bottoneScript(video) {
    if (urlSicuro(video.scriptLink)) return `<a href="${esc(urlSicuro(video.scriptLink))}" target="_blank" rel="noopener" class="script-b">${ic('link')}Script</a>`;
    return `<span class="script-b no" title="Nessun link script impostato">${ic('link')}Script</span>`;
}
function azioniAdmin(index) {
    return `<button type="button" class="rnd btn-edit-single" data-index="${index}" aria-label="Modifica">${ic('pencil')}</button><button type="button" class="rnd p btn-delete-single" data-index="${index}" aria-label="Elimina">${ic('trash')}</button>`;
}
function wireQuickEditTriggers(scopeEl, video, index, videosRef, admin) {
    const titolo = scopeEl.querySelector('.tit-cl');
    if (titolo) titolo.onclick = (e) => { e.stopPropagation(); apriDettaglio(index); };
    if (!admin) return;
    const st = scopeEl.querySelector('.st-trg');
    if (st) st.onclick = (e) => { e.stopPropagation(); openQuickEditPopover(st, STATUS_COLUMNS, normStatus(video.status), (id) => updateVideoField(index, videosRef, 'status', denormStatus(id))); };
    const ty = scopeEl.querySelector('.ty-trg');
    if (ty) ty.onclick = (e) => { e.stopPropagation(); openQuickEditPopover(ty, TYPE_OPTIONS, video.type, (id) => updateVideoField(index, videosRef, 'type', id)); };
}

// ---------- campi formato / stato nel form ----------
function setTypeField(id) {
    const t = typeInfo(id);
    $('video-type-field').dataset.selected = id;
    $('video-type-field-display').innerHTML = `<span style="color:${t.color};display:inline-flex">${t.icon}</span><span>${t.label}</span>`;
}
function setStatusField(id) {
    const s = STATUS_COLUMNS.find(c => c.id === id) || STATUS_COLUMNS[0];
    $('video-status-field').dataset.selected = s.id;
    $('video-status-field-display').innerHTML = `<span style="color:${s.color};display:inline-flex">${s.icon}</span><span>${s.label}</span>`;
}
$('video-type-field').onclick = function () { openQuickEditPopover(this, TYPE_OPTIONS, this.dataset.selected, (id) => setTypeField(id)); };
$('video-status-field').onclick = function () { openQuickEditPopover(this, STATUS_COLUMNS, this.dataset.selected, (id) => setStatusField(id)); };

// ---------- data e ora nel form: calendario e orologio propri ----------
let selectedDate = null; // { year, month(0-11), day }
let selectedTime = null; // { hour, minute }
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth();

function setAsapActive(active) {
    $('video-date-asap-toggle').classList.toggle('active', active);
    $('video-date-fields').classList.toggle('asap-off', active);
}
function updateDateFieldDisplay() { $('video-date-field-display').querySelector('span').textContent = selectedDate ? `${selectedDate.day} ${MESI_ABBR[selectedDate.month]}` : 'Da definire'; }
function updateTimeFieldDisplay() { $('video-time-field-display').querySelector('span').textContent = selectedTime ? `${pad2(selectedTime.hour)}:${pad2(selectedTime.minute)}` : '--:--'; }
function resetDateFields() {
    selectedDate = null; selectedTime = null;
    $('form-add-video').dataset.originalDate = '';
    updateDateFieldDisplay(); updateTimeFieldDisplay(); setAsapActive(false);
}
function prefillDateFields(dateStr) {
    $('form-add-video').dataset.originalDate = dateStr || '';
    selectedDate = null; selectedTime = null;
    const p = parseData(dateStr);
    if (!dateStr) { updateDateFieldDisplay(); updateTimeFieldDisplay(); setAsapActive(false); return; }
    if (p && p.asap) { updateDateFieldDisplay(); updateTimeFieldDisplay(); setAsapActive(true); return; }
    setAsapActive(false);
    if (p) {
        selectedDate = { year: p.y, month: p.m, day: p.d };
        if (p.h !== null) selectedTime = { hour: p.h, minute: p.min };
        calViewYear = p.y; calViewMonth = p.m;
    }
    updateDateFieldDisplay(); updateTimeFieldDisplay();
}
function computeDateString() {
    if ($('video-date-asap-toggle').classList.contains('active')) return 'ASAP';
    if (!selectedDate) return $('form-add-video').dataset.originalDate || '';
    let str = `${selectedDate.day} ${MESI_ABBR[selectedDate.month]}`;
    if (selectedTime) str += ` - ${pad2(selectedTime.hour)}:${pad2(selectedTime.minute)}`;
    return str;
}
$('video-date-asap-toggle').addEventListener('click', () => setAsapActive(!$('video-date-asap-toggle').classList.contains('active')));

function renderCalendar() {
    const pop = $('date-picker-popover');
    const first = new Date(calViewYear, calViewMonth, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const today = new Date();
    let cells = '';
    for (let i = 0; i < startOffset; i++) cells += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = today.getFullYear() === calViewYear && today.getMonth() === calViewMonth && today.getDate() === d;
        const isSel = selectedDate && selectedDate.year === calViewYear && selectedDate.month === calViewMonth && selectedDate.day === d;
        cells += `<button type="button" class="cal-day ${isToday ? 'oggi' : ''} ${isSel ? 'sel' : ''}" data-day="${d}">${d}</button>`;
    }
    pop.innerHTML = `
        <div class="cal-nav"><button type="button" id="cal-prev" aria-label="Mese precedente">${ic('chevL')}</button><b>${MESI_FULL[calViewMonth]} ${calViewYear}</b><button type="button" id="cal-next" aria-label="Mese successivo">${ic('chevR')}</button></div>
        <div class="cal-g7" style="margin-bottom:4px">${GIORNI_SETTIMANA.map(g => `<div class="cal-wd">${g}</div>`).join('')}</div>
        <div class="cal-g7">${cells}</div>
        <button type="button" id="cal-today-btn" class="btn v s blocco" style="margin-top:12px">Oggi</button>`;
    $('cal-prev').onclick = () => { calViewMonth--; if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; } renderCalendar(); };
    $('cal-next').onclick = () => { calViewMonth++; if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; } renderCalendar(); };
    $('cal-today-btn').onclick = () => {
        const t = new Date(); calViewYear = t.getFullYear(); calViewMonth = t.getMonth();
        selectedDate = { year: calViewYear, month: calViewMonth, day: t.getDate() };
        updateDateFieldDisplay(); renderCalendar();
    };
    pop.querySelectorAll('.cal-day').forEach(btn => {
        btn.onclick = () => {
            selectedDate = { year: calViewYear, month: calViewMonth, day: parseInt(btn.getAttribute('data-day'), 10) };
            updateDateFieldDisplay(); closeAllFieldPopovers();
        };
    });
}
function openDatePicker(triggerEl) {
    if (selectedDate) { calViewYear = selectedDate.year; calViewMonth = selectedDate.month; }
    showPopoverEl('date-picker-popover'); renderCalendar(); positionPopover($('date-picker-popover'), triggerEl);
}
function buildWheelColumn(container, values, selectedValue, onSettle) {
    const itemH = 40;
    container.innerHTML = `<div class="ruota-sp"></div>` + values.map(v => `<div class="ruota-it" data-v="${v}">${pad2(v)}</div>`).join('') + `<div class="ruota-sp"></div>`;
    container.scrollTop = Math.max(0, values.indexOf(selectedValue)) * itemH;
    const highlight = () => {
        const idx = Math.max(0, Math.min(values.length - 1, Math.round(container.scrollTop / itemH)));
        container.querySelectorAll('.ruota-it').forEach((el, i) => el.classList.toggle('on', i === idx));
        return idx;
    };
    highlight();
    let t;
    container.onscroll = () => {
        highlight(); clearTimeout(t);
        t = setTimeout(() => {
            const idx = Math.max(0, Math.min(values.length - 1, Math.round(container.scrollTop / itemH)));
            container.scrollTo({ top: idx * itemH, behavior: 'smooth' });
            highlight(); onSettle(values[idx]);
        }, 130);
    };
    container.querySelectorAll('.ruota-it').forEach((el, i) => { el.onclick = () => container.scrollTo({ top: i * itemH, behavior: 'smooth' }); });
}
function renderTimePicker() {
    const pop = $('time-picker-popover');
    const hours = Array.from({ length: 24 }, (_, i) => i), minutes = Array.from({ length: 12 }, (_, i) => i * 5);
    const h = selectedTime ? selectedTime.hour : 12, m = selectedTime ? (Math.round(selectedTime.minute / 5) * 5) % 60 : 0;
    if (!selectedTime) selectedTime = { hour: h, minute: m };
    pop.innerHTML = `<div class="ruote"><div class="ruote-ev"></div><div id="wheel-hours" class="ruota"></div><span class="due">:</span><div id="wheel-minutes" class="ruota"></div></div>
        <button type="button" id="time-picker-done" class="btn s blocco" style="margin-top:12px">Fatto</button>`;
    buildWheelColumn($('wheel-hours'), hours, h, (v) => { selectedTime.hour = v; updateTimeFieldDisplay(); });
    buildWheelColumn($('wheel-minutes'), minutes, m, (v) => { selectedTime.minute = v; updateTimeFieldDisplay(); });
    $('time-picker-done').onclick = () => { updateTimeFieldDisplay(); closeAllFieldPopovers(); };
}
function openTimePicker(triggerEl) { showPopoverEl('time-picker-popover'); renderTimePicker(); positionPopover($('time-picker-popover'), triggerEl); }
$('video-date-field').addEventListener('click', function () { openDatePicker(this); });
$('video-time-field').addEventListener('click', function () { openTimePicker(this); });

// ---------- riepilogo in cima ----------
function renderRiepilogo(videos, admin) {
    const oggi = sod(new Date());
    const items = videos.map((v, i) => ({ v, i, p: parseData(v.date) }));
    const pubb = (x) => normStatus(x.v.status) === 'Pubblicato';
    const datati = items.filter(x => x.p && !x.p.asap);
    const next = datati.filter(x => !pubb(x) && sod(x.p.date) >= oggi).sort((a, b) => a.p.date - b.p.date)[0];
    const lun = lunediDi(new Date());
    const settimana = datati.filter(x => { const d = sod(x.p.date); return d >= lun && d < new Date(lun.getTime() + 7 * DAY); });
    const total = videos.length;
    const ready = videos.filter(v => v.status === 'Pronto' || v.status === 'Pubblicato').length;
    const percent = total > 0 ? Math.round((ready / total) * 100) : 0;

    let primo;
    if (next) {
        const n = diffGiorni(next.p.date), ora = next.p.h !== null ? ` · ${pad2(next.p.h)}:${pad2(next.p.min)}` : '';
        const gs = GIORNI_FULL[(next.p.date.getDay() + 6) % 7].toLowerCase();
        primo = `<div class="kp vetro grande"><div class="k-et"><span>Prossima uscita</span>${ic('spark')}</div>
            <div class="k-data"><div class="k-gg">${next.p.d} ${MESI_ABBR[next.p.m]}<small>${gs}${ora}</small></div><span class="k-quando">${relLabel(n)}</span></div>
            <div class="k-tit">${esc(next.v.title)}</div></div>`;
    } else {
        primo = `<div class="kp vetro grande"><div class="k-et"><span>Prossima uscita</span>${ic('spark')}</div>
            <div class="k-gg" style="font-size:1.6rem">Niente in programma</div><div class="k-tit" style="color:var(--testo-2)">Aggiungi una data a un contenuto per vederla qui.</div></div>`;
    }
    const strip = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lun.getTime() + i * DAY); d.setHours(12);
        const has = datati.some(x => stessoGiorno(x.p.date, d));
        return `<i class="${has ? 'has' : ''} ${stessoGiorno(d, oggi) ? 'oggi' : ''}"><b>${d.getDate()}</b>${GIORNI_SETTIMANA[i]}</i>`;
    }).join('');
    const sett = `<div class="kp vetro"><div class="k-et"><span>Questa settimana</span>${ic('calendar')}</div>
        <div class="k-n">${settimana.length}<small>${settimana.length === 1 ? 'contenuto' : 'contenuti'}</small></div><div class="settimana">${strip}</div></div>`;
    const avanz = `<div class="kp vetro"><div class="k-et"><span>Avanzamento</span>${ic('pronto')}</div>
        <div class="k-perc">${percent}<small>%</small></div></div>`;

    let avviso = '';
    if (admin) {
        const tardi = datati.filter(x => !pubb(x) && sod(x.p.date) < oggi).length;
        const asap = items.filter(x => x.p && x.p.asap && !pubb(x)).length;
        const senza = items.filter(x => !x.p && !pubb(x)).length;
        const tutto = !tardi && !asap && !senza;
        avviso = `<div class="kp vetro avviso ${tutto ? 'ok' : ''}"><div class="k-et"><span>Da sistemare</span>${ic(tutto ? 'check' : 'alert')}</div>
            <div class="avv-l">${tutto ? '<span>Tutto in ordine.</span>' : `${tardi ? `<span><b>${tardi}</b> ${tardi === 1 ? 'in ritardo' : 'in ritardo'}</span>` : ''}${asap ? `<span><b>${asap}</b> ASAP</span>` : ''}${senza ? `<span><b>${senza}</b> senza data</span>` : ''}`}</div></div>`;
    }
    const box = $('riepilogo');
    box.className = 'riepilogo' + (admin ? ' admin' : '');
    box.innerHTML = primo + sett + avanz + avviso;

    const cnt = {
        'Reel': videos.filter(v => v.type === 'Reel').length,
        'Shorts': videos.filter(v => v.type === 'TikTok' || v.type === 'YT Shorts').length,
        'Video': videos.filter(v => v.type === 'Video YT').length,
        'Storie': videos.filter(v => v.type === 'Storia').length,
        'Post': videos.filter(v => v.type === 'Post').length
    };
    const icone = { 'Reel': 'film', 'Shorts': 'play', 'Video': 'playCircle', 'Storie': 'clock', 'Post': 'image' };
    $('contatori').innerHTML = Object.keys(cnt).filter(k => cnt[k] > 0).map(k => `<span>${ic(icone[k])}${k} <b>${cnt[k]}</b></span>`).join('');
}

// ---------- viste ----------
function renderVideoTable(allVideos, isAdmin) {
    closeAllFieldPopovers(true);
    currentVideos = allVideos; currentIsAdmin = isAdmin;
    const deck = $('media-modules-deck'), kanban = $('view-kanban'), stream = $('mobile-stream'), filtersEl = $('status-filters');
    deck.innerHTML = ''; kanban.innerHTML = ''; stream.innerHTML = ''; filtersEl.innerHTML = '';

    renderRiepilogo(allVideos, isAdmin);

    // filtri per stato
    const counts = { 'Tutti': allVideos.length };
    STATUS_COLUMNS.forEach(c => { counts[c.id] = allVideos.filter(v => normStatus(v.status) === c.id).length; });
    const chip = (id, label) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `chipf ${activeStatusFilter === id ? 'on' : ''}`;
        b.innerHTML = `${label} <span>${counts[id] || 0}</span>`;
        b.onclick = () => { activeStatusFilter = id; renderVideoTable(allVideos, isAdmin); };
        return b;
    };
    filtersEl.appendChild(chip('Tutti', 'Tutti'));
    STATUS_COLUMNS.forEach(c => filtersEl.appendChild(chip(c.id, c.label)));

    const indexed = allVideos.map((v, i) => ({ v, i }));
    const visible = activeStatusFilter === 'Tutti' ? indexed : indexed.filter(x => normStatus(x.v.status) === activeStatusFilter);
    calItems = visible;

    const vuoto = (txt) => `<div class="vuoto-p vetro">${txt}</div>`;
    if (allVideos.length === 0) { deck.innerHTML = vuoto('Nessun contenuto programmato al momento.'); stream.innerHTML = vuoto('Nessun contenuto programmato al momento.'); }
    else if (visible.length === 0) { deck.innerHTML = vuoto('Nessun contenuto in questa categoria.'); stream.innerHTML = vuoto('Nessun contenuto in questa categoria.'); }

    // 1. elenco (computer)
    visible.forEach(({ v: video, i: index }) => {
        const s = statusInfo(video.status);
        const row = document.createElement('div');
        row.className = 'rc vetro'; row.style.setProperty('--c', s.color);
        if (isAdmin) row.setAttribute('draggable', 'true');
        row.innerHTML = `
            ${isAdmin ? `<span class="grip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none">${P.grip}</svg></span>` : ''}
            <span class="barra"></span>
            <div class="corpo">
                <div class="tit"><h4 class="tit-cl cl" title="${esc(video.title)}">${esc(video.title)}</h4><div class="data">${ic('calendar')}${esc(etichettaData(video))} ${relativa(video)}</div></div>
                <div>${badgeTipo(video, isAdmin)}</div>
                <div class="stato">${badgeStato(video, isAdmin)}${traccia(video)}</div>
            </div>
            <div class="az">${bottoneScript(video)}${isAdmin ? azioniAdmin(index) : ''}</div>`;
        wireQuickEditTriggers(row, video, index, allVideos, isAdmin);
        if (isAdmin) {
            row.addEventListener('dragstart', (e) => { draggedIndex = index; e.dataTransfer.effectAllowed = 'move'; row.classList.add('trasc'); });
            row.addEventListener('dragend', () => row.classList.remove('trasc'));
            row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('dest'); });
            row.addEventListener('dragleave', () => row.classList.remove('dest'));
            row.addEventListener('drop', async (e) => {
                e.preventDefault(); row.classList.remove('dest');
                if (draggedIndex !== null && draggedIndex !== index) {
                    const moved = allVideos.splice(draggedIndex, 1)[0];
                    allVideos.splice(index, 0, moved);
                    await scriviVideos(allVideos);
                    renderVideoTable(allVideos, isAdmin);
                }
            });
        }
        deck.appendChild(row);
    });

    // 2. kanban (computer)
    STATUS_COLUMNS.forEach(col => {
        const colItems = indexed.filter(x => normStatus(x.v.status) === col.id);
        const colEl = document.createElement('div');
        colEl.className = 'colk vetro'; colEl.dataset.status = col.id; colEl.style.setProperty('--c', col.color);
        colEl.innerHTML = `<div class="k-h"><span>${col.icon}${col.label}</span><span class="n">${colItems.length}</span></div><div class="k-c"></div>`;
        const cont = colEl.querySelector('.k-c');
        colItems.forEach(({ v: video, i: index }) => {
            const card = document.createElement('div');
            card.className = 'kc vetro s'; if (isAdmin) card.setAttribute('draggable', 'true');
            card.innerHTML = `
                <div class="k-r1">${badgeTipo(video, isAdmin)}<span class="dt">${esc((video.date || 'ASAP').split(' - ')[0])}</span></div>
                <h5 class="tit-cl cl">${esc(video.title)}</h5>
                <div class="k-r3">${bottoneScript(video)}${isAdmin ? `<div class="ab">${azioniAdmin(index)}</div>` : ''}</div>`;
            wireQuickEditTriggers(card, video, index, allVideos, isAdmin);
            if (isAdmin) {
                card.addEventListener('dragstart', (e) => { draggedIndex = index; e.dataTransfer.effectAllowed = 'move'; card.classList.add('trasc'); });
                card.addEventListener('dragend', () => card.classList.remove('trasc'));
            }
            cont.appendChild(card);
        });
        if (isAdmin) {
            colEl.addEventListener('dragover', (e) => { e.preventDefault(); colEl.classList.add('dest'); });
            colEl.addEventListener('dragleave', () => colEl.classList.remove('dest'));
            colEl.addEventListener('drop', async (e) => {
                e.preventDefault(); colEl.classList.remove('dest');
                if (draggedIndex !== null) {
                    const v = allVideos[draggedIndex], target = denormStatus(col.id);
                    if (v.status !== target) {
                        v.status = target;
                        await scriviVideos(allVideos);
                        renderVideoTable(allVideos, isAdmin);
                    }
                }
            });
        }
        kanban.appendChild(colEl);
    });

    // 3. flusso (telefono): raggruppato per stato
    const groups = activeStatusFilter === 'Tutti' ? STATUS_COLUMNS : STATUS_COLUMNS.filter(c => c.id === activeStatusFilter);
    groups.forEach(col => {
        const items = indexed.filter(x => normStatus(x.v.status) === col.id);
        if (!items.length) return;
        const g = document.createElement('div'); g.className = 'stream-g'; g.style.setProperty('--c', col.color);
        g.innerHTML = `<div class="stream-h"><i></i>${col.label}<small>${items.length}</small></div>`;
        items.forEach(({ v: video, i: index }) => g.appendChild(cartaMobile(video, index, allVideos, isAdmin)));
        stream.appendChild(g);
    });

    // 4. calendario
    if (calIniziale) {
        calIniziale = false;
        const oggi = sod(new Date());
        const prossimo = indexed.map(x => ({ x, p: parseData(x.v.date) })).filter(o => o.p && !o.p.asap && normStatus(o.x.v.status) !== 'Pubblicato' && sod(o.p.date) >= oggi).sort((a, b) => a.p.date - b.p.date)[0];
        const base = prossimo ? prossimo.p.date : new Date();
        calY = base.getFullYear(); calM = base.getMonth();
        calSel = prossimo ? sod(prossimo.p.date) : sod(new Date());
    }
    renderCalendario();
    if (giornoAperto && !$('modal-step-day').hidden && $('auth-modal').classList.contains('on')) riempiGiorno(giornoAperto);
}

function cartaMobile(video, index, allVideos, isAdmin) {
    const s = statusInfo(video.status);
    const el = document.createElement('div');
    el.className = 'cm vetro'; el.style.setProperty('--c', s.color);
    el.innerHTML = `<span class="barra"></span><div class="in">
        <div class="r1"><span class="dt">${esc(etichettaData(video))} ${relativa(video)}</span>${badgeTipo(video, isAdmin)}</div>
        <h4 class="tit-cl cl">${esc(video.title)}</h4>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">${badgeStato(video, isAdmin)}${traccia(video)}</div>
        <div class="r3">${bottoneScript(video)}${isAdmin ? `<div class="ab">${azioniAdmin(index)}</div>` : ''}</div></div>`;
    wireQuickEditTriggers(el, video, index, allVideos, isAdmin);
    return el;
}

// ---------- calendario mensile ----------
function renderCalendario() {
    const box = $('view-calendar');
    const isAdmin = currentIsAdmin;
    const primoDelMese = new Date(calY, calM, 1);
    const inizio = lunediDi(primoDelMese);
    const oggi = sod(new Date());
    const datati = calItems.map(x => ({ ...x, p: parseData(x.v.date) })).filter(x => x.p && !x.p.asap);
    const senzaData = calItems.filter(x => { const p = parseData(x.v.date); return !p || p.asap; });

    let celle = '';
    const settimane = Math.ceil((((primoDelMese.getDay() + 6) % 7) + new Date(calY, calM + 1, 0).getDate()) / 7);   // niente riga finale vuota
    for (let k = 0; k < settimane * 7; k++) {
        const d = new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate() + k);
        const evs = datati.filter(x => stessoGiorno(x.p.date, d));
        const fuori = d.getMonth() !== calM;
        const chips = evs.slice(0, 2).map(x => {
            const s = statusInfo(x.v.status);
            return `<button type="button" class="ev" data-i="${x.i}" style="--c:${s.color}" ${isAdmin ? 'draggable="true"' : ''} title="${esc(x.v.title)}"><span>${esc(x.v.title)}</span></button>`;
        }).join('');
        const piu = evs.length > 2 ? `<span class="piu-n">+${evs.length - 2}</span>` : '';
        const punti = evs.slice(0, 4).map(x => `<i style="--c:${statusInfo(x.v.status).color}"></i>`).join('');
        celle += `<div class="gg ${fuori ? 'fuori' : ''} ${stessoGiorno(d, oggi) ? 'oggi' : ''} ${calSel && stessoGiorno(d, calSel) ? 'sel' : ''}" data-d="${chiaveGiorno(d)}" role="button" tabindex="0">
            <span class="num">${d.getDate()}</span><div class="chips">${chips}${piu}</div><div class="punti">${punti}</div></div>`;
    }

    box.innerHTML = `
        <div class="cal-barra">
            <h3>${MESI_FULL[calM]}<em>${calY}</em></h3>
            <div class="gr"><button class="rnd" type="button" id="cm-prev" aria-label="Mese precedente">${ic('chevL')}</button><button class="btn v s" type="button" id="cm-oggi">Oggi</button><button class="rnd" type="button" id="cm-next" aria-label="Mese successivo">${ic('chevR')}</button></div>
        </div>
        <div class="cal-grande vetro">
            <div class="cg-wd">${GIORNI_BREVI.map(g => `<span>${g}</span>`).join('')}</div>
            <div class="cg" id="cg">${celle}</div>
        </div>
        <div class="cal-giorno" id="cal-giorno"></div>
        ${senzaData.length ? `<div class="senza-data vetro s"><h4>Senza data o ASAP</h4><div class="lista">${senzaData.map(x => `<button type="button" class="sd" data-i="${x.i}" style="--c:${statusInfo(x.v.status).color}"><span>${esc(x.v.title)}</span><em>${x.v.date ? 'ASAP' : 'da definire'}</em></button>`).join('')}</div></div>` : ''}`;

    $('cm-prev').onclick = () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCalendario(); };
    $('cm-next').onclick = () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCalendario(); };
    $('cm-oggi').onclick = () => { const t = new Date(); calY = t.getFullYear(); calM = t.getMonth(); calSel = sod(t); renderCalendario(); };

    const cg = $('cg');
    cg.querySelectorAll('.gg').forEach(cell => {
        const parti = cell.dataset.d.split('-').map(Number), data = new Date(parti[0], parti[1] - 1, parti[2]);
        const seleziona = () => {
            calSel = data;
            cg.querySelectorAll('.gg').forEach(c => c.classList.toggle('sel', c === cell));
            renderGiornoSelezionato();
        };
        const clic = () => { seleziona(); if (mobile()) apriGiorno(data); };
        cell.addEventListener('click', (e) => { if (e.target.closest('.ev')) return; clic(); });
        cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clic(); } });
        if (isAdmin) {
            cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('dest'); });
            cell.addEventListener('dragleave', () => cell.classList.remove('dest'));
            cell.addEventListener('drop', async (e) => {
                e.preventDefault(); cell.classList.remove('dest');
                if (draggedIndex === null) return;
                const video = currentVideos[draggedIndex]; if (!video) return;
                const p = parseData(video.date);
                let nuova = `${data.getDate()} ${MESI_ABBR[data.getMonth()]}`;
                if (p && !p.asap && p.h !== null) nuova += ` - ${pad2(p.h)}:${pad2(p.min)}`;
                if (nuova !== video.date) { calSel = data; await updateVideoField(draggedIndex, currentVideos, 'date', nuova); }
                draggedIndex = null;
            });
        }
    });
    box.querySelectorAll('.ev, .sd').forEach(b => {
        const i = parseInt(b.dataset.i, 10);
        b.addEventListener('click', (e) => { e.stopPropagation(); apriDettaglio(i); });
        if (isAdmin && b.classList.contains('ev')) {
            b.addEventListener('dragstart', (e) => { draggedIndex = i; e.dataTransfer.effectAllowed = 'move'; b.classList.add('trasc'); });
            b.addEventListener('dragend', () => b.classList.remove('trasc'));
        }
    });
    renderGiornoSelezionato();
}

function renderGiornoSelezionato() {
    const box = $('cal-giorno'); if (!box) return;
    if (!calSel) { box.innerHTML = ''; return; }
    const evs = calItems.map(x => ({ ...x, p: parseData(x.v.date) })).filter(x => x.p && !x.p.asap && stessoGiorno(x.p.date, calSel));
    const titolo = `${GIORNI_FULL[(calSel.getDay() + 6) % 7]} ${calSel.getDate()} ${MESI_FULL[calSel.getMonth()]}`;
    box.innerHTML = `<h4>${titolo} · ${evs.length} ${evs.length === 1 ? 'contenuto' : 'contenuti'}</h4>`;
    const lista = document.createElement('div');
    if (!evs.length) {
        lista.innerHTML = `<div class="vuoto-p vetro s">Niente in programma per questo giorno.</div>`;
        if (currentIsAdmin) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'btn v s'; b.style.marginTop = '12px';
            b.innerHTML = `${ic('plus')}Aggiungi per questo giorno`;
            b.onclick = () => openAddVideoFresh(calSel);
            lista.appendChild(b);
        }
    } else {
        evs.sort((a, b) => a.p.date - b.p.date).forEach(x => lista.appendChild(cartaMobile(x.v, x.i, currentVideos, currentIsAdmin)));
    }
    box.appendChild(lista);
}

// ---------- schermata del giorno (telefono) ----------
let giornoAperto = null;
function riempiGiorno(data) {
    const evs = calItems.map(x => ({ ...x, p: parseData(x.v.date) })).filter(x => x.p && !x.p.asap && stessoGiorno(x.p.date, data)).sort((a, b) => a.p.date - b.p.date);
    $('day-titolo').innerHTML = `${GIORNI_FULL[(data.getDay() + 6) % 7]} <em>${data.getDate()} ${MESI_FULL[data.getMonth()].toLowerCase()}</em>`;
    $('day-sotto').textContent = evs.length ? `${evs.length} ${evs.length === 1 ? 'contenuto in uscita' : 'contenuti in uscita'}` : 'Niente in programma per questo giorno';
    const box = $('day-lista'); box.innerHTML = '';
    evs.forEach(x => box.appendChild(cartaMobile(x.v, x.i, currentVideos, currentIsAdmin)));
    $('day-aggiungi').hidden = !currentIsAdmin;
    $('day-aggiungi').onclick = () => openAddVideoFresh(data);
    return evs.length;
}
function apriGiorno(data) {
    const n = calItems.filter(x => { const p = parseData(x.v.date); return p && !p.asap && stessoGiorno(p.date, data); }).length;
    if (!n && !currentIsAdmin) return;             // al cliente non serve una schermata vuota
    giornoAperto = data; riempiGiorno(data);
    openCustomStep('day');
}

// ---------- dettaglio contenuto ----------
async function apriDettaglio(index) {
    const video = currentVideos[index]; if (!video) return;
    if (currentIsAdmin && !scriptsCache && slugDaLink(video.scriptLink)) await caricaScripts();
    const t = typeInfo(video.type), s = statusInfo(video.status), p = parseData(video.date);
    $('det-icona').innerHTML = t.icon;
    $('det-tipo').textContent = t.label;
    $('det-sotto').textContent = currentClientData ? currentClientData.clientName : '';
    $('det-titolo').textContent = video.title;
    let quando = '';
    if (p && !p.asap && normStatus(video.status) !== 'Pubblicato') quando = relLabel(diffGiorni(p.date));
    $('det-righe').innerHTML = `
        <div class="det-r"><span>Stato${currentIsAdmin ? ' · tocca per cambiare' : ''}</span>${badgeStato(video, currentIsAdmin)}</div>
        <div class="det-r"><span>Avanzamento</span>${traccia(video)}</div>
        <div class="det-r"><span>Uscita</span><b style="font-weight:600">${esc(etichettaData(video))}${quando ? ` · ${quando}` : ''}</b></div>`;
    let az = '';
    if (currentIsAdmin) {
        const sl = slugDaLink(video.scriptLink), sc = sl ? scriptDaSlug(sl) : null;
        $('det-righe').insertAdjacentHTML('beforeend', `<div class="det-r"><span>Script</span><b style="font-weight:600;text-align:right">${sl ? esc(sc ? sc.title : sl) : 'Nessuno'}</b></div>`);
        az += `<button type="button" class="btn v" id="det-collega">${ic('link')}${sl ? 'Cambia script' : 'Collega uno script'}</button>`;
        if (sl) az += `<button type="button" class="btn v" id="det-scollega">Scollega</button>`;
    }
    if (urlSicuro(video.scriptLink)) az += `<a class="btn v" href="${esc(urlSicuro(video.scriptLink))}" target="_blank" rel="noopener">${ic('link')}Apri lo script</a>`;
    if (currentIsAdmin) az += `<button type="button" class="btn" id="det-modifica">${ic('pencil')}Modifica</button>`;
    $('det-az').innerHTML = az;
    if (currentIsAdmin) $('det-modifica').onclick = () => openEditVideoModal(index, video);
    if (currentIsAdmin) {
        const imposta = async (slug) => {
            const sc = slug ? scriptDaSlug(slug) : null;
            await updateVideoField(index, currentVideos, 'scriptLink', slug ? linkScript(slug) : '');
            if (sc && !sc.clienteId && currentClientDocId) {          // lo script non aveva un cliente: prende questo
                try { await updateDoc(doc(db, "scripts", sc.id), { clienteId: currentClientDocId }); sc.clienteId = currentClientDocId; avviso('Script collegato e assegnato al cliente.'); } catch (e) { console.error(e); }
            }
            apriDettaglio(index);
        };
        if ($('det-collega')) $('det-collega').onclick = () => apriPicker(slugDaLink(video.scriptLink), () => apriDettaglio(index), imposta);
        if ($('det-scollega')) $('det-scollega').onclick = () => imposta('');
    }
    if (currentIsAdmin) {                                   // stato modificabile direttamente dal dettaglio
        const trg = $('det-righe').querySelector('.st-trg');
        if (trg) trg.onclick = (e) => {
            e.stopPropagation();
            openQuickEditPopover(trg, STATUS_COLUMNS, normStatus(video.status), async (id) => {
                await updateVideoField(index, currentVideos, 'status', denormStatus(id));
                apriDettaglio(index);
            });
        };
    }
    openCustomStep('detail');
}

function openEditVideoModal(index, video) {
    editingVideoIndex = index;
    $('video-title').value = video.title;
    setTypeField(video.type || "Video YT");
    setStatusField(normStatus(video.status) || "Idea");
    prefillDateFields(video.date || "");
    $('video-script-link').value = video.scriptLink || "";
    $('add-video-icon').innerHTML = ic('pencil');
    $('add-video-title-heading').innerHTML = 'Modifica <em>contenuto</em>';
    $('add-video-submit-btn').textContent = 'Aggiorna contenuto';
    openCustomStep('add-video');
}

async function deleteSingleVideo(index, videos) {
    if (!currentClientDocId) return;
    try {
        videos.splice(index, 1);
        await scriviVideos(videos);
        closeAuthModal();
        initRouter(auth.currentUser);
    } catch (error) {
        avviso("Il contenuto non è stato eliminato. " + erroreTesto(error));
    }
}

// pulsanti modifica / elimina (valgono per tutte le viste)
document.addEventListener('click', async (e) => {
    const ed = e.target.closest('.btn-edit-single');
    if (ed) { const idx = parseInt(ed.getAttribute('data-index'), 10); openEditVideoModal(idx, currentVideos[idx]); return; }
    const del = e.target.closest('.btn-delete-single');
    if (del) {
        const idx = parseInt(del.getAttribute('data-index'), 10);
        if (await conferma("Il contenuto sparirà da questo piano.", "Elimina", "Eliminare il contenuto?")) await deleteSingleVideo(idx, currentVideos);
    }
});

// ---------- catalogo clienti ----------
async function loadAdminCatalog() {
    try {
        const q = query(collection(db, "pianiEditoriali"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const grid = $('client-grid');
        grid.innerHTML = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.isHub === true) return;
            const card = document.createElement('a');
            card.className = 'contatto vetro';
            card.href = `?v=${encodeURIComponent(data.slug)}`;
            card.setAttribute('aria-label', `Apri ${data.clientName}`);
            const utente = utenteInstagram(data.instagram);
            card.innerHTML = `
                <span class="avatar l" aria-hidden="true">${avatarHtml(data)}</span>
                <span class="c-nome"><b>${esc(data.clientName)}</b>${utente ? `<small>@${esc(utente)}</small>` : ''}</span>
                <button type="button" class="rnd p c-del btn-delete-client-trigger" data-id="${docSnap.id}" data-nome="${esc(data.clientName)}" aria-label="Elimina ${esc(data.clientName)}">${ic('trash')}</button>`;
            grid.appendChild(card);
        });

        const plus = document.createElement('button');
        plus.type = 'button'; plus.className = 'piu';
        plus.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Crea nuovo cliente</span>`;
        plus.addEventListener('click', () => openCustomStep('create-client'));
        grid.appendChild(plus);

        const btnNew = $('btn-new-client-top');
        btnNew.hidden = false;
        btnNew.onclick = () => openCustomStep('create-client');

        $('main-loader').hidden = true;
        $('section-admin-catalog').hidden = false;
    } catch (error) {
        console.error("Errore catalogo:", error);
    }
}
document.addEventListener('click', async (e) => {
    const cp = e.target.closest('.btn-copia-link');
    if (cp) { copiaTesto(cp.dataset.url, cp.querySelector('span')); return; }
    const dc = e.target.closest('.btn-delete-client-trigger');
    if (dc) {
        e.preventDefault(); e.stopPropagation();
        const nome = dc.getAttribute('data-nome') || 'questo cliente';
        if (await conferma(`Il cliente "${nome}" e tutti i suoi piani editoriali verranno eliminati. L'azione non si può annullare.`, 'Elimina il cliente', 'Eliminare il cliente?')) {
            try {
                await deleteDoc(doc(db, "pianiEditoriali", dc.getAttribute('data-id')));
                avviso(`Cliente "${nome}" eliminato.`);
                loadAdminCatalog();
            } catch (err) {
                console.error(err);
                avviso('Il cliente non è stato eliminato. ' + erroreTesto(err));
            }
        }
    }
});
function copiaTesto(testo, spanEl) {
    const fatto = () => { if (!spanEl) return; const prima = spanEl.textContent; spanEl.textContent = 'Copiato!'; setTimeout(() => { spanEl.textContent = prima; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(testo).then(fatto, () => avviso(testo));
    else avviso(testo);
}
$('btn-copy-link').addEventListener('click', () => copiaTesto(`${window.location.origin}${window.location.pathname}?v=${clientSlug}`, $('copy-link-t')));

// ---------- titolo del piano ----------
let fotoManuale = null;   // foto caricata a mano (miniatura già pronta)
function notaFoto(txt) { $('nota-foto').textContent = txt || ''; }
$('btn-edit-title').addEventListener('click', () => {
    const d = currentClientData || {};
    $('input-client-title').value = $('client-title').innerText;
    $('input-client-ig').value = d.instagram || '';
    fotoManuale = null; notaFoto(d.avatar ? 'Foto attuale presa dal profilo.' : 'Nessuna foto: incolla il link del profilo e salva, oppure carica una foto.');
    $('edit-title-container').hidden = false; $('input-client-title').focus();
});
$('btn-cancel-title').addEventListener('click', () => { $('edit-title-container').hidden = true; });
$('input-client-foto').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { fotoManuale = await riduciFoto(f); notaFoto('Foto pronta: premi Salva.'); } catch (err) { fotoManuale = null; notaFoto('Quel file non è un\'immagine valida.'); }
    e.target.value = '';
});
$('btn-save-title').addEventListener('click', async () => {
    const nuovo = $('input-client-title').value.trim();
    if (!nuovo) { avviso("Il nome del cliente non può essere vuoto."); return; }
    if (!currentClientDocId) return;
    const btn = $('btn-save-title'); btn.disabled = true;
    try {
        const d = currentClientData || {};
        const igInput = $('input-client-ig').value.trim(), utente = utenteInstagram(igInput);
        const patch = { clientName: nuovo, instagram: utente ? `https://www.instagram.com/${utente}/` : '' };
        let esito = '';
        if (fotoManuale) { patch.avatar = fotoManuale; }
        else if (utente && (utente !== utenteInstagram(d.instagram) || !d.avatar)) {
            notaFoto('Cerco la foto del profilo…');
            try { patch.avatar = await foto_da_instagram(utente); esito = 'Foto del profilo trovata.'; }
            catch (err) { esito = 'Link salvato, ma non sono riuscito a prendere la foto: puoi caricarla a mano.'; }
        } else if (!utente && d.instagram && !fotoManuale) { patch.avatar = ''; }
        await updateDoc(doc(db, "pianiEditoriali", currentClientDocId), patch);
        Object.assign(currentClientData, patch);
        $('client-title').innerText = nuovo; $('crumb-nome').textContent = nuovo;
        $('client-avatar').innerHTML = avatarHtml(currentClientData);
        $('edit-title-container').hidden = true;
        if (esito) avviso(esito);
    } catch (error) {
        console.error("Errore cliente:", error);
        avviso("Impossibile aggiornare il cliente. " + erroreTesto(error));
    } finally { btn.disabled = false; }
});

// ---------- nuovo cliente ----------
$('form-create-client').addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientName = $('client-name-input').value;
    const slug = createSlug(clientName) + "-" + Math.random().toString(36).substring(2, 7);
    const utente = utenteInstagram($('client-ig-input').value);
    const bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true; const testoBtn = bottone.textContent;
    try {
        const nuovoCliente = { clientName: clientName, slug: slug, videos: [], piani: [], createdAt: new Date() };
        let nota = '';
        if (utente) {
            nuovoCliente.instagram = `https://www.instagram.com/${utente}/`;
            bottone.textContent = 'Cerco la foto…';
            try { nuovoCliente.avatar = await foto_da_instagram(utente); } catch (err) { nota = 'Cliente creato, ma non sono riuscito a prendere la foto del profilo: aprilo e caricala a mano.'; }
        }
        await addDoc(collection(db, "pianiEditoriali"), nuovoCliente);
        closeAuthModal();
        $('form-create-client').reset();
        loadAdminCatalog();
        if (nota) avviso(nota);
    } catch (error) {
        avviso("Il cliente non è stato creato. " + erroreTesto(error));
    } finally { bottone.disabled = false; bottone.textContent = testoBtn; }
});

// ---------- aggiungi / modifica contenuto ----------
$('form-add-video').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentClientDocId) return;
    const videoData = {
        title: $('video-title').value,
        type: $('video-type-field').dataset.selected || "Video YT",
        status: denormStatus($('video-status-field').dataset.selected || "Idea"),
        date: computeDateString(),
        scriptLink: $('video-script-link').value
    };
    try {
        const videos = await leggiVideosFreschi();                 // si riparte sempre dai dati più recenti del piano
        if (videos) {
            if (editingVideoIndex !== null) videos[editingVideoIndex] = videoData; else videos.push(videoData);
            await scriviVideos(videos);
            closeAuthModal();
            editingVideoIndex = null;
            initRouter(auth.currentUser);
            $('form-add-video').reset();
        }
    } catch (error) {
        avviso("Salvataggio non riuscito. " + erroreTesto(error));
    }
});

async function eliminaPiano(id) {
    const p = getPiani(currentClientData).find(x => x.id === id); if (!currentClientDocId || !p) return;
    if (!(await conferma(`Il piano "${p.nome}" e tutti i suoi contenuti verranno eliminati. Il cliente resta. L'azione non si può annullare.`, 'Elimina il piano', 'Eliminare il piano?'))) return;
    try {
        const docRef = doc(db, "pianiEditoriali", currentClientDocId);
        if (p.id === 'main') await updateDoc(docRef, { videos: [], pianoNome: '' });
        else {
            const snap = await getDoc(docRef);
            await updateDoc(docRef, { piani: ((snap.data() || {}).piani || []).filter(x => x.id !== p.id) });
        }
        currentPlanId = 'main'; pianoVisualizzato = null;
        const u = new URL(window.location.href); u.searchParams.delete('p'); history.replaceState(null, '', u);   // si torna all'elenco dei piani
        initRouter(auth.currentUser);
    } catch (error) {
        avviso("Il piano non è stato eliminato. " + erroreTesto(error));
    }
}
$('btn-delete-plan').addEventListener('click', () => eliminaPiano(currentPlanId));

// nuovo piano / rinomina
let pianoInModifica = null;
function apriFormPiano(id) {
    pianoInModifica = id || null;
    const p = id ? getPiani(currentClientData).find(x => x.id === id) : null;
    $('plan-name-input').value = p ? p.nome : '';
    $('plan-heading').innerHTML = p ? 'Rinomina <em>piano</em>' : 'Nuovo <em>piano</em>';
    $('plan-submit').textContent = p ? 'Salva nome' : 'Crea piano';
    openCustomStep('plan');
    setTimeout(() => $('plan-name-input').focus(), 80);
}
$('btn-new-plan-vuoto').addEventListener('click', () => apriFormPiano());
$('btn-rename-plan').addEventListener('click', () => { const p = pianoAttivo(); if (p) apriFormPiano(p.id); });
$('form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('plan-name-input').value.trim(); if (!nome || !currentClientDocId) return;
    try {
        const docRef = doc(db, "pianiEditoriali", currentClientDocId);
        const snap = await getDoc(docRef), data = snap.data() || {};
        if (pianoInModifica) {
            if (pianoInModifica === 'main') await updateDoc(docRef, { pianoNome: nome });
            else await updateDoc(docRef, { piani: (data.piani || []).map(p => p.id === pianoInModifica ? { ...p, nome: nome } : p) });
        } else if (!getPiani(data).length) {
            await updateDoc(docRef, { pianoNome: nome, videos: data.videos || [] });       // il primo piano è quello principale
            currentPlanId = 'main';
        } else {
            const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
            await updateDoc(docRef, { piani: (data.piani || []).concat([{ id: id, nome: nome, videos: [] }]) });
            currentPlanId = id;
        }
        pianoVisualizzato = null;
        const u = new URL(window.location.href); u.searchParams.delete('p'); history.replaceState(null, '', u);
        closeAuthModal();
        initRouter(auth.currentUser);
    } catch (error) {
        avviso("Salvataggio del piano non riuscito. " + erroreTesto(error));
    }
});
$('btn-copy-plan-link').addEventListener('click', () => copiaTesto(`${window.location.origin}${window.location.pathname}?v=${clientSlug}&p=${encodeURIComponent(currentPlanId)}`, $('copy-plan-link-t')));

function openAddVideoFresh(giorno) {
    editingVideoIndex = null;
    $('form-add-video').reset();
    setTypeField("Reel");
    setStatusField("Idea");
    resetDateFields();
    if (giorno instanceof Date) {                       // dal calendario: la data del giorno scelto è già impostata
        selectedDate = { year: giorno.getFullYear(), month: giorno.getMonth(), day: giorno.getDate() };
        calViewYear = selectedDate.year; calViewMonth = selectedDate.month;
        updateDateFieldDisplay();
    }
    $('add-video-icon').innerHTML = ic('plus');
    $('add-video-title-heading').innerHTML = 'Aggiungi <em>contenuto</em>';
    $('add-video-submit-btn').textContent = 'Salva contenuto';
    openCustomStep('add-video');
}
$('btn-add-video').addEventListener('click', () => openAddVideoFresh());
$('fab-add').addEventListener('click', () => openAddVideoFresh());

// ---------- accesso ----------
const authError = $('auth-error');
$('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.hidden = true;
    const email = $('login-email').value, pass = $('login-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeAuthModal();
        $('form-login').reset();
    } catch (error) {
        authError.hidden = false;
        authError.innerText = "Dati di accesso errati.";
    }
});
$('btn-open-login').addEventListener('click', () => openCustomStep('login'));
onAuthStateChanged(auth, (user) => { initRouter(user); });

// ---------- finestre ----------
function openCustomStep(step) {
    ['modal-step-auth', 'modal-step-create-client', 'modal-step-add-video', 'modal-step-detail', 'modal-step-day', 'modal-step-plan', 'modal-step-picker'].forEach(id => { $(id).hidden = true; });
    if (step === 'day') $('modal-step-day').hidden = false;                       // anche la schermata del giorno è visibile al cliente
    else if (step === 'detail') $('modal-step-detail').hidden = false;                 // il dettaglio lo può aprire anche il cliente
    else if (!auth.currentUser) $('modal-step-auth').hidden = false;
    else if (step === 'create-client') $('modal-step-create-client').hidden = false;
    else if (step === 'plan') $('modal-step-plan').hidden = false;
    else if (step === 'picker') $('modal-step-picker').hidden = false;
    else if (step === 'add-video') $('modal-step-add-video').hidden = false;
    openAuthModal();
}
function openAuthModal() {
    $('auth-modal').classList.add('on'); $('auth-modal').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
function closeAuthModal() {
    closeAllFieldPopovers(true);
    $('auth-modal').classList.remove('on'); $('auth-modal').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
$('auth-modal').addEventListener('mousedown', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });
document.querySelectorAll('[data-chiudi-mod]').forEach(b => b.addEventListener('click', closeAuthModal));
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('quick-edit-backdrop').hidden) closeAllFieldPopovers(); else if ($('auth-modal').classList.contains('on')) closeAuthModal();
});
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
