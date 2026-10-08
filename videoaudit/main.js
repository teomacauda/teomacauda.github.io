import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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


// ===== Video audit · logica =====
// Sopra (import e collegamento a Firebase) è copiato identico dalla versione precedente.
// Dati: collezione "videoAudits" { companyName, clientName (la persona), youtubeId, slug, createdAt,
//   + nuovi, facoltativi: videoLoro, motivi[{titolo, problema, soluzione}], chiusura, stato, aperture, ultimaApertura, clienteId }.
// L'indirizzo (slug) non cambia mai. Per i vecchi link (?v=NomePersona) la ricerca prova ancora il nome.

const { $, esc, avviso, conferma, erroreTesto, copiaTesto, createSlug } = window.RawUI;

const urlParams = new URLSearchParams(window.location.search);
const auditSlug = urlParams.get('v');
const anteprima = urlParams.get('anteprima') === '1';
const WHATSAPP = '393784142773';

const STATI = [
    { id: 'contattato', nome: 'Contattato' },
    { id: 'risposto', nome: 'Ha risposto' },
    { id: 'audit', nome: 'Audit inviato' },
    { id: 'cliente', nome: 'Cliente' },
    { id: 'chiuso', nome: 'Chiuso' }
];
const statoDi = (a) => STATI.find(s => s.id === a.stato) ? a.stato : 'contattato';
const MODELLO = [
    { titolo: 'Hook iniziale', problema: 'Nei primi 3 secondi mancano elementi visivi o parlati dinamici per fermare lo scroll.', soluzione: 'Parti dalla frase più forte del video, scrivila anche sullo schermo e togli saluti e introduzioni.' },
    { titolo: 'Ritmo del montaggio', problema: 'Ci sono tempi morti che fanno calare la retention: chi guarda se ne va prima della fine.', soluzione: 'Taglia pause e ripetizioni e cambia inquadratura o elemento a schermo ogni 2-3 secondi.' },
    { titolo: 'Call to action', problema: 'La chiusura è troppo brusca e non porta lo spettatore verso un passo successivo.', soluzione: 'Chiudi con una sola azione chiara (seguire, commentare o scrivere), detta a voce e scritta.' }
];
const CHIUSURA = 'Questi sono i tre punti più evidenti. Correggerli uno alla volta aiuta, ma i risultati arrivano quando il video è pensato bene dall\'idea al montaggio, e lo è in modo continuo. Se vuoi, me ne occupo io.';

let audit = [], corrente = null, motivi = [], sporco = false, filtro = 'tutti';
let rawCaricato = false;
function caricaRaw() { if (rawCaricato) return; rawCaricato = true; const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s); }

// ---------- utilità ----------
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const dataOgg = (c) => { try { return c && c.toDate ? c.toDate() : (c instanceof Date ? c : null); } catch (e) { return null; } };
function dataDi(c) { const d = dataOgg(c.createdAt); return d ? `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}` : ''; }
const millis = (c) => { const d = dataOgg(c.createdAt); return d ? d.getTime() : 0; };
function fa(c) { const d = dataOgg(c); if (!d) return ''; const g = Math.floor((Date.now() - d.getTime()) / 864e5); return g <= 0 ? 'oggi' : g === 1 ? 'ieri' : `${g} giorni fa`; }
function estraiYT(s) {
    s = String(s || '').trim(); if (!s) return '';
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/v\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
}
const urlSicuro = (u) => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
const motiviDi = (a) => Array.isArray(a.motivi) && a.motivi.length ? a.motivi : MODELLO;

// ---------- router ----------
const SEZIONI = ['section-lock', 'section-home', 'section-editor', 'section-client'];
function mostra(sez) { SEZIONI.forEach(id => { $(id).hidden = id !== sez; }); $('main-loader').hidden = true; }
async function caricaTutti() { const s = await getDocs(collection(db, "videoAudits")); audit = []; s.forEach(d => audit.push({ id: d.id, ...d.data() })); }
async function trovaPerLink(v) {   // prima l'indirizzo vero, poi il vecchio modo (nome della persona)
    let snap = await getDocs(query(collection(db, "videoAudits"), where("slug", "==", String(v).toLowerCase())));
    if (snap.empty) snap = await getDocs(query(collection(db, "videoAudits"), where("clientName", "==", v)));
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}
async function initRouter(user) {
    $('main-loader').hidden = false; SEZIONI.forEach(id => { $(id).hidden = true; });
    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    const vistaCliente = !!auditSlug && (!user || anteprima);
    $('admin-indicator').hidden = !user; $('btnStrumenti').hidden = !user; $('btnRaw').hidden = !user;
    $('bar').hidden = !user || vistaCliente;
    $('anteprima-admin').hidden = !(user && vistaCliente);
    document.body.classList.toggle('vista-cliente', vistaCliente);
    if (user) caricaRaw();
    try {
        if (auditSlug) {
            const d = await trovaPerLink(auditSlug);
            if (!d) { window.location.href = './'; return; }
            if (user && !anteprima) { corrente = d; renderEditor(); mostra('section-editor'); }
            else { renderCliente(d); mostra('section-client'); avviaRivelazioni(); if (user) $('anteprima-torna').href = `?v=${encodeURIComponent(d.slug || auditSlug)}`; else segnaApertura(d); }
        } else if (user) { await caricaTutti(); renderHome(); mostra('section-home'); }
        else mostra('section-lock');
    } catch (error) {
        console.error(error);
        if (auditSlug) window.location.href = './'; else { $('main-loader').hidden = true; avviso('Non riesco a caricare i dati. ' + erroreTesto(error)); }
    }
}
// conta le aperture della pagina (una per visita); se il database non lo permette, semplicemente non conta
async function segnaApertura(d) {
    try {
        const k = 'aperto_' + d.id; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1');
        await updateDoc(doc(db, "videoAudits", d.id), { aperture: (d.aperture || 0) + 1, ultimaApertura: new Date() });
    } catch (e) { /* nessun problema per chi guarda */ }
}

// ---------- elenco ----------
function renderHome() {
    document.title = 'Video audit · Teo Macauda';
    const conta = (id) => id === 'tutti' ? audit.length : audit.filter(a => statoDi(a) === id).length;
    $('filtri').innerHTML = [{ id: 'tutti', nome: 'Tutti' }, ...STATI].map(s => `<button type="button" class="chipf ${filtro === s.id ? 'on' : ''}" data-f="${s.id}">${esc(s.nome)} <span>${conta(s.id)}</span></button>`).join('');
    const lista = audit.filter(a => filtro === 'tutti' || statoDi(a) === filtro).sort((a, b) => millis(b) - millis(a));
    const grid = $('au-griglia'); grid.innerHTML = '';
    lista.forEach(a => {
        const st = STATI.find(s => s.id === statoDi(a)), el = document.createElement('a'); el.className = 'au-card vetro'; el.href = `?v=${encodeURIComponent(a.slug || a.clientName)}`;
        const ap = a.aperture > 0 ? `<span><b>${a.aperture}</b> ${a.aperture === 1 ? 'apertura' : 'aperture'}${a.ultimaApertura ? ' · ' + fa(a.ultimaApertura) : ''}</span>` : '';
        el.innerHTML = `<span class="stato-tag s-${st.id}">${esc(st.nome)}</span><h3>${esc(a.companyName || 'Senza nome')}</h3><p class="chi">${esc(a.clientName || '')}${dataDi(a) ? ' · ' + esc(dataDi(a)) : ''}</p><div class="cifre"><span>${a.youtubeId ? 'Video pronto' : 'Senza video'}</span>${ap}</div>`;
        grid.appendChild(el);
    });
    $('au-vuoti').hidden = lista.length > 0;
    $('au-vuoti-testo').textContent = audit.length ? 'Nessun audit in questo stato.' : 'Crea il primo audit per un\'azienda che vuoi contattare.';
}
$('filtri').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filtro = b.dataset.f; renderHome(); });
$('btn-new').addEventListener('click', () => { $('form-new').reset(); openCustomStep('new'); });
$('form-new').addEventListener('submit', async (e) => {
    e.preventDefault();
    const azienda = $('n-azienda').value.trim(), nome = $('n-nome').value.trim(), bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true;
    try {
        const slug = createSlug(`${azienda} ${nome}-${Math.floor(1000 + Math.random() * 9000)}`);
        await addDoc(collection(db, "videoAudits"), { companyName: azienda, clientName: nome, youtubeId: '', slug, stato: 'contattato', motivi: MODELLO.map(m => ({ ...m })), createdAt: new Date() });
        closeAuthModal(); window.location.href = `?v=${encodeURIComponent(slug)}`;
    } catch (err) { console.error(err); avviso('Audit non creato. ' + erroreTesto(err)); bottone.disabled = false; }
});

// ---------- editor ----------
function segna(v) { sporco = v; $('stato').innerHTML = v ? 'Modifiche non salvate.' : '&nbsp;'; }
window.addEventListener('beforeunload', (e) => { if (sporco) { e.preventDefault(); e.returnValue = ''; } });
function renderEditor() {
    const a = corrente;
    document.title = `${a.companyName} · Video audit`;
    $('ed-titolo').textContent = a.companyName || 'Senza nome';
    $('ed-eyebrow').textContent = 'Audit';
    $('ed-avatar').innerHTML = `<b>${esc(window.RawUI.iniziali(a.companyName))}</b>`;
    const ap = a.aperture > 0 ? ` · aperto ${a.aperture} ${a.aperture === 1 ? 'volta' : 'volte'}${a.ultimaApertura ? ', l\'ultima ' + fa(a.ultimaApertura) : ''}` : '';
    $('ed-info').textContent = `Per ${a.clientName || '—'}${dataDi(a) ? ' · creato il ' + dataDi(a) : ''}${ap}`;
    $('btn-anteprima').href = `?v=${encodeURIComponent(a.slug)}&anteprima=1`;
    $('btn-copia-link').onclick = () => copiaTesto(`${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(a.slug)}`, $('btn-copia-link').querySelector('span'));
    $('f-azienda').value = a.companyName || ''; $('f-nome').value = a.clientName || '';
    $('f-stato').innerHTML = STATI.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join(''); $('f-stato').value = statoDi(a);
    $('f-yt').value = a.youtubeId ? 'https://youtu.be/' + a.youtubeId : ''; $('f-loro').value = a.videoLoro || '';
    $('f-chiusura').value = a.chiusura || ''; $('f-chiusura').placeholder = CHIUSURA;
    motivi = motiviDi(a).map(m => ({ ...m })); renderMotivi();
    const gia = !!a.clienteId; $('btn-cliente').querySelector('span').textContent = gia ? 'È già un cliente' : 'Crea come cliente'; $('btn-cliente').disabled = gia;
    segna(false);
}
function renderMotivi() {
    $('mo-lista').innerHTML = motivi.map((m, i) => `<div class="mo" data-i="${i}"><span class="mo-n">${i + 1}</span><div class="mo-c">
        <div><label class="etich">Titolo</label><input class="campo" type="text" data-k="titolo" value="${esc(m.titolo || '')}" maxlength="80"></div>
        <div><label class="etich">Cosa non funziona</label><textarea class="campo area" data-k="problema" rows="2">${esc(m.problema || '')}</textarea></div>
        <div><label class="etich">Micro-soluzione da applicare subito</label><textarea class="campo area" data-k="soluzione" rows="2">${esc(m.soluzione || '')}</textarea></div></div></div>`).join('');
}
$('mo-lista').addEventListener('input', (e) => { const r = e.target.closest('.mo'), k = e.target.dataset.k; if (!r || !k) return; motivi[parseInt(r.dataset.i, 10)][k] = e.target.value; segna(true); });
['f-azienda', 'f-nome', 'f-stato', 'f-yt', 'f-loro', 'f-chiusura'].forEach(id => { $(id).addEventListener('input', () => segna(true)); $(id).addEventListener('change', () => segna(true)); });
$('btn-modello').addEventListener('click', async () => {
    if (!(await conferma('I 3 motivi tornano al testo di partenza: quello che hai scritto qui sopra va perso (si salva solo quando premi "Salva l\'audit").', 'Rimetti', 'Rimettere il testo di partenza?'))) return;
    motivi = MODELLO.map(m => ({ ...m })); renderMotivi(); segna(true);
});
$('btn-salva').addEventListener('click', async () => {
    const azienda = $('f-azienda').value.trim(), nome = $('f-nome').value.trim(), ytRaw = $('f-yt').value.trim(), yt = estraiYT(ytRaw), loro = $('f-loro').value.trim();
    if (!azienda || !nome) { avviso('Servono il nome dell\'azienda e quello della persona.'); return; }
    if (ytRaw && !yt) { avviso('Non riconosco il link del tuo video: incolla l\'indirizzo di YouTube.'); return; }
    if (loro && !urlSicuro(loro)) { avviso('Il link del loro video deve iniziare con http o https.'); return; }
    const b = $('btn-salva'); b.disabled = true; $('stato').textContent = 'Salvo…';
    try {
        const patch = { companyName: azienda, clientName: nome, youtubeId: yt, videoLoro: loro, stato: $('f-stato').value, chiusura: $('f-chiusura').value.trim(),
            motivi: motivi.map(m => ({ titolo: (m.titolo || '').trim(), problema: (m.problema || '').trim(), soluzione: (m.soluzione || '').trim() })) };
        await updateDoc(doc(db, "videoAudits", corrente.id), patch); Object.assign(corrente, patch);
        $('f-yt').value = yt ? 'https://youtu.be/' + yt : ''; renderEditor(); avviso('Audit salvato.');
    } catch (err) { console.error(err); $('stato').textContent = 'Modifiche non salvate.'; avviso('Salvataggio non riuscito. ' + erroreTesto(err)); }
    finally { b.disabled = false; }
});
$('btn-cliente').addEventListener('click', async () => {
    const a = corrente; if (a.clienteId) return;
    if (!(await conferma(`Creo "${a.companyName}" come cliente: comparirà in Piani editoriali, Script, Report e negli altri tool. L'audit passa allo stato "Cliente".`, 'Crea il cliente', 'Crearlo come cliente?'))) return;
    try {
        const ref = await addDoc(collection(db, "pianiEditoriali"), { clientName: a.companyName, slug: createSlug(a.companyName) + '-' + Math.random().toString(36).substring(2, 7), videos: [], piani: [], createdAt: new Date() });
        const patch = { clienteId: ref.id, stato: 'cliente' }; await updateDoc(doc(db, "videoAudits", a.id), patch); Object.assign(a, patch);
        renderEditor(); avviso('Cliente creato. Lo trovi in tutti i tool.');
    } catch (err) { console.error(err); avviso('Cliente non creato. ' + erroreTesto(err)); }
});
$('btn-elimina').addEventListener('click', async () => {
    if (!(await conferma(`L'audit per "${corrente.companyName}" verrà eliminato e il suo link smetterà di funzionare. L'azione non si può annullare.`, 'Elimina l\'audit', 'Eliminare l\'audit?'))) return;
    try { sporco = false; await deleteDoc(doc(db, "videoAudits", corrente.id)); window.location.href = './'; }
    catch (err) { console.error(err); avviso('Audit non eliminato. ' + erroreTesto(err)); }
});

// ---------- pagina di chi riceve l'audit ----------
function renderCliente(d) {
    const azienda = d.companyName || '', nome = d.clientName || '';
    document.title = `Video audit per ${azienda} | Teo Macauda`;
    $('ac-azienda').textContent = azienda;
    const yt = d.youtubeId || '';
    $('ac-saluto').textContent = yt
        ? `Ciao ${nome}, ho guardato i tuoi contenuti e ti ho registrato un video con quello che ho trovato. Qui sotto i 3 motivi, ognuno con una micro-soluzione.`
        : `Ciao ${nome}, ho guardato i tuoi contenuti: ecco i 3 motivi per cui i tuoi video non fanno le views che potrebbero, e da dove iniziare a sistemarli.`;
    document.querySelector('.ac-corpo').classList.toggle('senza-video', !yt);
    $('ac-video-col').hidden = !yt;
    if (yt) {
        $('ac-poster').onclick = () => {   // il lettore di YouTube si carica solo quando premi play
            $('ac-poster').hidden = true; const f = $('ac-iframe'); f.hidden = false;
            f.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(yt)}?rel=0&modestbranding=1&autoplay=1&playsinline=1" title="Video audit" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        };
    }
    const loro = urlSicuro(d.videoLoro); $('ac-loro').hidden = !loro; if (loro) $('ac-loro').href = loro;
    $('ac-motivi').innerHTML = motiviDi(d).filter(m => m && (m.titolo || m.problema)).map((m, i) => `<div class="ac-m"><span class="ac-n">${i + 1}</span><div><h3>${esc(m.titolo)}</h3><p>${esc(m.problema)}</p>${m.soluzione ? `<p class="ac-fix"><b>Come sistemarlo</b>${esc(m.soluzione)}</p>` : ''}</div></div>`).join('');
    $('ac-chiusura').textContent = (d.chiusura || '').trim() || CHIUSURA;
    $('ac-wa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Ciao Matteo, ho visto l'audit che hai preparato per ${azienda} e vorrei saperne di più!`)}`;
}
function avviaRivelazioni() {
    const io = new IntersectionObserver((voci) => voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } }), { threshold: 0.1 });
    document.querySelectorAll('.rv-e').forEach(e => io.observe(e));
}

// ---------- accesso ----------
$('form-login').addEventListener('submit', async (e) => {
    e.preventDefault(); const err = $('auth-error'); err.hidden = true;
    try { await signInWithEmailAndPassword(auth, $('login-email').value, $('login-pass').value); closeAuthModal(); $('form-login').reset(); }
    catch (error) { err.hidden = false; err.innerText = 'Credenziali non valide.'; }
});
$('btn-open-login').addEventListener('click', () => openCustomStep('login'));
onAuthStateChanged(auth, (user) => { initRouter(user); });

// ---------- finestre ----------
function openCustomStep(step) {
    ['modal-step-auth', 'modal-step-new'].forEach(id => { $(id).hidden = true; });
    if (!auth.currentUser) $('modal-step-auth').hidden = false; else $('modal-step-' + (step === 'login' ? 'auth' : step)).hidden = false;
    $('auth-modal').classList.add('on'); $('auth-modal').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeAuthModal() { $('auth-modal').classList.remove('on'); $('auth-modal').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
$('auth-modal').addEventListener('mousedown', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });
document.querySelectorAll('[data-chiudi-mod]').forEach(b => b.addEventListener('click', closeAuthModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('auth-modal').classList.contains('on') && !$('conf-modal').classList.contains('on')) closeAuthModal(); });
window.openAuthModal = openCustomStep;
window.closeAuthModal = closeAuthModal;
