import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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


// ===== Revisioni video · logica =====
// Sopra (import e collegamento a Firebase) è copiato dalla versione precedente (con in più onSnapshot e serverTimestamp, già usati prima).
// Dati: collezione "revisions" { title, client, youtubeId, slug, createdAt, + clienteId, avatar, aspectRatio (nuovi, facoltativi) }
//       collezione "reviews" (i commenti) { projectId, text, timestamp (secondi), completed, createdAt }. L'indirizzo (slug) di una revisione non cambia mai.

const { $, esc, avviso, conferma, erroreTesto, copiaTesto, avatarHtml, createSlug, utenteInstagram, fotoDaInstagram } = window.RawUI;

const urlParams = new URLSearchParams(window.location.search);
const revSlug = urlParams.get('v');                // revisione: l'admin la gestisce, il cliente la commenta
const clienteSlugUrl = urlParams.get('c');         // revisioni di un cliente (solo admin)
const anteprima = urlParams.get('anteprima') === '1';
const SENZA = '_senza';

const FRECCIA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';
const SPUNTA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CESTINO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>';

let revisioni = [], clienti = [], commentiTutti = [];
let corrente = null, clienteAperto = null, isAdmin = false;
let rawCaricato = false;
function caricaRaw() { if (rawCaricato) return; rawCaricato = true; const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s); }

// ---------- utilità ----------
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
function dataDi(c) { try { const d = c.createdAt && c.createdAt.toDate ? c.createdAt.toDate() : null; return d ? `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}` : ''; } catch (e) { return ''; } }
const millis = (c) => { try { return c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : 0; } catch (e) { return 0; } };
const clienteDi = (r) => clienti.find(x => x.id === r.clienteId) || null;
const revisioniDel = (cl) => cl.id === SENZA ? revisioni.filter(r => !r.clienteId || !clienti.some(x => x.id === r.clienteId)) : revisioni.filter(r => r.clienteId === cl.id);
function estraiYT(s) {
    s = String(s || '').trim(); if (!s) return '';
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/v\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
}
async function infoYT(id) {   // titolo e proporzioni da noembed (servizio gratuito)
    try {
        const r = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`); const d = await r.json();
        return { titolo: d && d.title ? d.title : '', aspetto: d && d.width && d.height ? (d.height > d.width ? '9:16' : '16:9') : '16:9' };
    } catch (e) { return { titolo: '', aspetto: '16:9' }; }
}
function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0)), h = Math.floor(s / 3600), m = Math.floor((s - h * 3600) / 60), x = s - h * 3600 - m * 60, p = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
}
const nomeCliente = (r) => { const cl = clienteDi(r); return (cl && cl.clientName) || r.client || ''; };

// ---------- caricamento (admin) ----------
async function caricaAdmin() {
    const [rs, ps] = await Promise.all([getDocs(collection(db, "revisions")), getDocs(collection(db, "pianiEditoriali"))]);
    revisioni = []; rs.forEach(d => revisioni.push({ id: d.id, ...d.data() }));
    clienti = []; ps.forEach(d => { const x = d.data(); if (x.isHub === true) return; clienti.push({ id: d.id, slug: x.slug, clientName: x.clientName || 'Cliente', avatar: x.avatar || '' }); });
}
async function caricaCommenti() {   // serve solo per i numeri nell'elenco di un cliente
    commentiTutti = []; try { const s = await getDocs(collection(db, "reviews")); s.forEach(d => commentiTutti.push({ id: d.id, ...d.data() })); } catch (e) { console.error(e); }
}

// ---------- router ----------
const SEZIONI = ['section-lock', 'section-home', 'section-cliente', 'section-rev'];
function mostra(sez) { SEZIONI.forEach(id => { $(id).hidden = id !== sez; }); $('main-loader').hidden = true; }
async function initRouter(user) {
    $('main-loader').hidden = false; SEZIONI.forEach(id => { $(id).hidden = true; });
    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    isAdmin = !!user;
    const vistaCliente = !!revSlug && (!user || anteprima);
    $('admin-indicator').hidden = !user; $('btnStrumenti').hidden = !user; $('btnRaw').hidden = !user;
    $('bar').hidden = !user || vistaCliente;
    $('anteprima-admin').hidden = !(user && vistaCliente);
    document.body.classList.toggle('vista-cliente', vistaCliente);
    if (user) caricaRaw();
    try {
        if (revSlug) {
            const snap = await getDocs(query(collection(db, "revisions"), where("slug", "==", revSlug)));
            if (snap.empty) { window.location.href = './'; return; }
            const d = { id: snap.docs[0].id, ...snap.docs[0].data() };
            if (user && !anteprima) { await caricaAdmin(); corrente = revisioni.find(x => x.id === d.id) || d; }
            else { corrente = d; if (user) $('anteprima-torna').href = `?v=${encodeURIComponent(revSlug)}`; }
            renderRevisione(vistaCliente); mostra('section-rev');
            avviaPlayer(corrente.youtubeId, corrente.aspectRatio); ascoltaCommenti(corrente.id);
        } else if (user) {
            await caricaAdmin();
            if (clienteSlugUrl) {
                const c = clienteSlugUrl === SENZA ? { id: SENZA, slug: SENZA, clientName: 'Senza cliente', avatar: '' } : clienti.find(x => x.slug === clienteSlugUrl);
                if (!c) { window.location.href = './'; return; }
                clienteAperto = c; mostra('section-cliente'); renderClienteAdmin(); caricaCommenti().then(() => renderClienteAdmin());
            } else { renderHome(); mostra('section-home'); }
        } else mostra('section-lock');
    } catch (error) {
        console.error(error);
        if (revSlug) window.location.href = './'; else { $('main-loader').hidden = true; avviso('Non riesco a caricare i dati. ' + erroreTesto(error)); }
    }
}

// ---------- home: i clienti ----------
function assegnabili() {
    const out = [];
    revisioniDel({ id: SENZA }).forEach(r => {
        const n = String(r.client || '').trim().toLowerCase();
        const cl = n && clienti.find(x => x.clientName.trim().toLowerCase() === n);
        if (cl) out.push({ r, cl });
    });
    return out;
}
function renderHome() {
    document.title = 'Revisioni · Teo Macauda';
    const grid = $('cat-clienti'); grid.innerHTML = '';
    const card = (href, av, nome, sub) => { const a = document.createElement('a'); a.className = 'contatto vetro'; a.href = href; a.innerHTML = `<span class="avatar l" aria-hidden="true">${av}</span><span class="c-nome"><b>${esc(nome)}</b><small>${esc(sub)}</small></span><span class="freccia">${FRECCIA}</span>`; return a; };
    const conta = (n) => `${n} ${n === 1 ? 'revisione' : 'revisioni'}`;
    clienti.forEach(cl => grid.appendChild(card(`?c=${encodeURIComponent(cl.slug)}`, avatarHtml({ avatar: cl.avatar, clientName: cl.clientName }), cl.clientName, conta(revisioniDel(cl).length))));
    const sc = revisioniDel({ id: SENZA });
    if (sc.length) grid.appendChild(card(`?c=${SENZA}`, '<b>—</b>', 'Senza cliente', conta(sc.length)));
    const piu = document.createElement('button'); piu.type = 'button'; piu.className = 'piu';
    piu.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Crea nuovo cliente</span>`; piu.onclick = () => openCustomStep('client'); grid.appendChild(piu);
    $('btn-new-client-top').onclick = () => openCustomStep('client');
    const ass = assegnabili(), b = $('banner-assegna'); b.hidden = !sc.length;
    if (sc.length) {
        $('banner-titolo').textContent = sc.length === 1 ? '1 revisione senza cliente' : `${sc.length} revisioni senza cliente`;
        $('banner-testo').textContent = ass.length ? `Dal nome del cliente riconosco ${ass.length === 1 ? 'a chi appartiene 1 revisione: posso assegnarla io' : `a chi appartengono ${ass.length} revisioni: posso assegnarle io`}, e prendono la foto del cliente. ${sc.length > ass.length ? 'Le altre le assegni tu, aprendole.' : ''}` : 'Non riconosco il cliente dal nome: aprile e assegnale tu.';
        $('btn-assegna').hidden = !ass.length;
        $('btn-assegna').onclick = async () => {
            if (!(await conferma(`Assegno ${ass.length === 1 ? '1 revisione' : ass.length + ' revisioni'} al cliente con lo stesso nome. Non cambia altro.`, 'Assegna', 'Assegnare le revisioni?'))) return;
            let fatti = 0;
            try { for (const x of ass) { const p = { clienteId: x.cl.id }; if (x.cl.avatar) p.avatar = x.cl.avatar; await updateDoc(doc(db, "revisions", x.r.id), p); fatti++; } avviso(fatti === 1 ? '1 revisione assegnata.' : `${fatti} revisioni assegnate.`); }
            catch (e) { avviso(`Assegnate ${fatti}, poi si è fermato. ` + erroreTesto(e)); }
            initRouter(auth.currentUser);
        };
    }
}

// ---------- le revisioni di un cliente ----------
function renderClienteAdmin() {
    const cl = clienteAperto; document.title = `${cl.clientName} · Revisioni`;
    $('cl-nome').textContent = cl.clientName;
    $('cl-avatar').innerHTML = cl.id === SENZA ? '<b>—</b>' : avatarHtml({ avatar: cl.avatar, clientName: cl.clientName });
    const lista = revisioniDel(cl).sort((a, b) => millis(b) - millis(a));
    $('cl-sotto').textContent = `${lista.length} ${lista.length === 1 ? 'revisione' : 'revisioni'}`;
    $('btn-new-rev').onclick = () => { $('nc-titolo').value = ''; $('nc-yt').value = ''; $('new-sotto').textContent = cl.id !== SENZA ? `Il video da far rivedere a ${cl.clientName}.` : 'Il cliente guarda il video e lascia le correzioni.'; openCustomStep('new'); };
    const grid = $('cat-rev'); grid.innerHTML = '';
    lista.forEach(r => {
        const mie = commentiTutti.filter(c => c.projectId === r.id), aperti = mie.filter(c => c.completed !== true).length, fatti = mie.length - aperti;
        const a = document.createElement('a'); a.className = 'cs-card vetro'; a.href = `?v=${encodeURIComponent(r.slug)}`;
        a.innerHTML = `<span class="per">${esc(dataDi(r) || 'Revisione')}</span><h3>${esc(r.title)}</h3><div class="cifre">${aperti ? `<span class="da-fare"><b>${aperti}</b> da fare</span>` : ''}${fatti ? `<span><b>${fatti}</b> ${fatti === 1 ? 'fatto' : 'fatti'}</span>` : ''}${!mie.length ? '<span>Nessun commento</span>' : ''}</div>`;
        grid.appendChild(a);
    });
    $('rev-vuote').hidden = lista.length > 0;
}
$('form-new-rev').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titolo = $('nc-titolo').value.trim(), id = estraiYT($('nc-yt').value), cl = clienteAperto, bottone = e.target.querySelector('button[type="submit"]');
    if (!id) { avviso('Non riconosco il link: incolla l\'indirizzo del video di YouTube.'); return; }
    bottone.disabled = true;
    try {
        const nome = cl && cl.id !== SENZA ? cl.clientName : 'Cliente';
        const info = await infoYT(id);
        const slug = createSlug(`${nome} ${titolo}-${Math.floor(1000 + Math.random() * 9000)}`);
        const nuova = { title: titolo, client: nome, youtubeId: id, slug, aspectRatio: info.aspetto, createdAt: serverTimestamp() };
        if (cl && cl.id !== SENZA) { nuova.clienteId = cl.id; if (cl.avatar) nuova.avatar = cl.avatar; }
        await addDoc(collection(db, "revisions"), nuova);
        closeAuthModal(); window.location.href = `?v=${encodeURIComponent(slug)}`;
    } catch (err) { console.error(err); avviso('Revisione non creata. ' + erroreTesto(err)); bottone.disabled = false; }
});

// ---------- la revisione (admin e cliente) ----------
function renderRevisione(vistaCliente) {
    const d = corrente, cl = clienteDi(d), nome = nomeCliente(d);
    document.title = vistaCliente ? `${d.title} | Revisione video` : `${d.title} · Revisioni`;
    $('rv-titolo').textContent = d.title;
    $('rv-eyebrow').textContent = vistaCliente ? `Revisione video${nome ? ' · ' + nome : ''}` : `Revisione · ${nome || 'senza cliente'}`;
    const av = (cl && cl.avatar) || d.avatar || '';
    $('rv-avatar').innerHTML = av ? `<img src="${esc(av)}" alt="">` : `<b>${esc(window.RawUI.iniziali(nome))}</b>`;
    $('rv-player-box').classList.toggle('vert', d.aspectRatio === '9:16');
    if (!vistaCliente) {
        $('back-cliente').href = cl ? `?c=${encodeURIComponent(cl.slug)}` : './';
        $('back-testo').textContent = cl ? `Torna a ${cl.clientName}` : 'Torna ai clienti';
        $('btn-anteprima').href = `?v=${encodeURIComponent(d.slug)}&anteprima=1`;
        $('btn-copia-link').onclick = () => copiaTesto(`${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(d.slug)}`, $('btn-copia-link').querySelector('span'));
        $('rv-cliente').innerHTML = `<option value="">Nessun cliente</option>` + clienti.map(c => `<option value="${esc(c.id)}">${esc(c.clientName)}</option>`).join('');
        $('rv-cliente').value = cl ? cl.id : '';
    }
}
$('rv-cliente').addEventListener('change', async () => {
    const cl = clienti.find(c => c.id === $('rv-cliente').value);
    try {
        const patch = cl ? { clienteId: cl.id, client: cl.clientName, avatar: cl.avatar || '' } : { clienteId: '' };
        await updateDoc(doc(db, "revisions", corrente.id), patch); Object.assign(corrente, patch);
        renderRevisione(false); avviso(cl ? `Revisione assegnata a ${cl.clientName}.` : 'Revisione senza cliente.');
    } catch (e) { avviso('Non riuscito. ' + erroreTesto(e)); }
});
$('btn-edit-titolo').addEventListener('click', () => { $('rv-titolo-input').value = corrente.title; $('rv-titolo-box').hidden = false; $('rv-titolo-input').focus(); });
$('btn-annulla-titolo').addEventListener('click', () => { $('rv-titolo-box').hidden = true; });
$('btn-salva-titolo').addEventListener('click', async () => {
    const t = $('rv-titolo-input').value.trim(); if (!t) { avviso('Il titolo non può essere vuoto.'); return; }
    try { await updateDoc(doc(db, "revisions", corrente.id), { title: t }); corrente.title = t; $('rv-titolo').textContent = t; $('rv-titolo-box').hidden = true; avviso('Titolo salvato.'); }
    catch (e) { avviso('Titolo non salvato. ' + erroreTesto(e)); }
});
$('btn-elimina').addEventListener('click', async () => {
    if (!(await conferma(`La revisione "${corrente.title}" e tutti i suoi commenti verranno eliminati, e il suo link smetterà di funzionare. L'azione non si può annullare.`, 'Elimina la revisione', 'Eliminare la revisione?'))) return;
    try {
        const cl = clienteDi(corrente), id = corrente.id;
        const snap = await getDocs(query(collection(db, "reviews"), where("projectId", "==", id)));
        for (const d of snap.docs) await deleteDoc(d.ref);
        await deleteDoc(doc(db, "revisions", id));
        window.location.href = cl ? `?c=${encodeURIComponent(cl.slug)}` : './';
    } catch (err) { console.error(err); avviso('Revisione non eliminata. ' + erroreTesto(err)); }
});

// ---------- lettore YouTube ----------
let ytPlayer = null, tempoScelto = null, apiPronta = null;
function caricaYTApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiPronta) return apiPronta;
    apiPronta = new Promise((res, rej) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
        const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { apiPronta = null; rej(new Error('api')); };
        document.head.appendChild(s);
    });
    return apiPronta;
}
async function avviaPlayer(id, aspetto) {
    try { await caricaYTApi(); } catch (e) { avviso('Non riesco a caricare il lettore di YouTube. Ricarica la pagina.'); return; }
    ytPlayer = new window.YT.Player('yt-player', {
        videoId: id, host: 'https://www.youtube-nocookie.com',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: { onStateChange: statoPlayer, onError: () => avviso('Errore nel caricamento del video di YouTube.') }
    });
}
function statoPlayer(ev) {
    if (!window.YT) return;
    if (ev.data === window.YT.PlayerState.PAUSED) {
        tempoScelto = ytPlayer.getCurrentTime(); mostraTempo();
        if (window.matchMedia('(hover: hover)').matches) $('feedback-input').focus();
    } else if (ev.data === window.YT.PlayerState.PLAYING && !$('feedback-input').value.trim()) { tempoScelto = null; mostraTempo(); }
}
function mostraTempo() {
    const on = tempoScelto != null;
    $('feedback-box').classList.toggle('attivo', on);
    $('feedback-timestamp').textContent = formatTime(on ? tempoScelto : (ytPlayer && ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0));
    $('fb-guida').textContent = on ? 'Scrivi cosa c\'è da cambiare in questo punto, poi premi Invio.' : 'Metti in pausa il video dove vuoi segnalare qualcosa.';
}
$('feedback-input').addEventListener('focus', () => {   // se scrive senza mettere in pausa, fermo il video lì
    if (tempoScelto == null && ytPlayer && ytPlayer.getCurrentTime) { tempoScelto = ytPlayer.getCurrentTime(); mostraTempo(); try { ytPlayer.pauseVideo(); } catch (e) {} }
});
async function inviaCommento() {
    const campo = $('feedback-input'), testo = campo.value.trim();
    if (!testo) { avviso('Scrivi il commento prima di inviare.'); return; }
    if (!corrente) { avviso('Revisione non valida: ricarica la pagina.'); return; }
    const t = tempoScelto != null ? tempoScelto : (ytPlayer && ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0);
    const b = $('btn-submit-feedback'); b.disabled = true;
    try {
        await addDoc(collection(db, "reviews"), { projectId: corrente.id, text: testo, timestamp: t, completed: false, createdAt: serverTimestamp() });
        campo.value = ''; tempoScelto = null; mostraTempo(); avviso('Commento inviato.');
        if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
    } catch (e) { console.error(e); avviso('Commento non inviato. ' + erroreTesto(e)); }
    finally { b.disabled = false; }
}
$('feedback-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inviaCommento(); } });
$('btn-submit-feedback').addEventListener('click', inviaCommento);
function vaiA(sec) { if (ytPlayer && ytPlayer.seekTo) { ytPlayer.seekTo(sec, true); ytPlayer.playVideo(); } }

// ---------- commenti in tempo reale ----------
let annulla = null;
function ascoltaCommenti(id) {
    if (annulla) annulla();
    const lista = $('reviews-list'); lista.innerHTML = '<div class="rg-vuoto">Carico i commenti…</div>';
    annulla = onSnapshot(query(collection(db, "reviews"), where("projectId", "==", id)), (snap) => {
        const voci = []; snap.forEach(d => voci.push({ id: d.id, ...d.data() }));
        voci.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const aperti = voci.filter(v => v.completed !== true).length;
        $('comment-counter').textContent = isAdmin && !anteprima && voci.length ? `${aperti} da fare · ${voci.length}` : String(voci.length);
        if (!voci.length) { lista.innerHTML = '<div class="rg-vuoto">Ancora nessun commento. Metti in pausa il video dove vuoi segnalare qualcosa.</div>'; return; }
        lista.innerHTML = voci.map(v => {
            const ok = v.completed === true, ora = v.createdAt && v.createdAt.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
            const sp = isAdmin && !anteprima ? `<button class="rg-spunta" type="button" data-fatto="${esc(v.id)}" aria-label="${ok ? 'Segna da fare' : 'Segna come fatto'}" aria-pressed="${ok}">${SPUNTA}</button>` : '';
            const ce = isAdmin && !anteprima ? `<button class="rg-cestino" type="button" data-del="${esc(v.id)}" aria-label="Elimina il commento">${CESTINO}</button>` : '';
            return `<div class="rg-voce ${ok ? 'fatto' : ''}">${sp}<div class="corpo"><div class="riga"><button class="rg-tempo" type="button" data-vai="${Number(v.timestamp) || 0}">${PLAY}<span>${formatTime(v.timestamp)}</span></button><span class="rg-ora">${esc(ora)}</span>${ok ? '<span class="rg-fatto">Fatto</span>' : ''}</div><p>${esc(v.text)}</p></div>${ce}</div>`;
        }).join('');
    }, (error) => { console.error(error); lista.innerHTML = ''; avviso('Non riesco a caricare i commenti. ' + erroreTesto(error)); });
}
$('reviews-list').addEventListener('click', async (e) => {
    const vai = e.target.closest('[data-vai]'); if (vai) { vaiA(parseFloat(vai.dataset.vai)); return; }
    const f = e.target.closest('[data-fatto]');
    if (f && isAdmin) { const nuovo = f.getAttribute('aria-pressed') !== 'true'; try { await updateDoc(doc(db, "reviews", f.dataset.fatto), { completed: nuovo }); } catch (err) { avviso('Non salvato. ' + erroreTesto(err)); } return; }
    const x = e.target.closest('[data-del]');
    if (x && isAdmin) {
        if (!(await conferma('Il commento verrà eliminato. L\'azione non si può annullare.', 'Elimina', 'Eliminare il commento?'))) return;
        try { await deleteDoc(doc(db, "reviews", x.dataset.del)); } catch (err) { avviso('Non eliminato. ' + erroreTesto(err)); }
    }
});

// ---------- nuovo cliente (lo stesso degli altri tool) ----------
$('form-create-client').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('client-name-input').value.trim(), utente = utenteInstagram($('client-ig-input').value);
    const bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true; const t0 = bottone.textContent;
    try {
        const nuovo = { clientName: nome, slug: createSlug(nome) + '-' + Math.random().toString(36).substring(2, 7), videos: [], piani: [], createdAt: new Date() };
        let nota = '';
        if (utente) { nuovo.instagram = `https://www.instagram.com/${utente}/`; bottone.textContent = 'Cerco la foto…'; try { nuovo.avatar = await fotoDaInstagram(utente); } catch (err) { nota = 'Cliente creato, ma non ho trovato la foto: caricala dai Piani editoriali.'; } }
        await addDoc(collection(db, "pianiEditoriali"), nuovo);
        try { if (nota) sessionStorage.setItem('nota_revisioni', nota); } catch (x) {}
        closeAuthModal(); $('form-create-client').reset();
        window.location.href = `?c=${encodeURIComponent(nuovo.slug)}`;
    } catch (err) { console.error(err); avviso('Il cliente non è stato creato. ' + erroreTesto(err)); bottone.disabled = false; bottone.textContent = t0; }
});
try { const nn = sessionStorage.getItem('nota_revisioni'); if (nn) { sessionStorage.removeItem('nota_revisioni'); setTimeout(() => avviso(nn), 1500); } } catch (e) {}

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
    ['modal-step-auth', 'modal-step-client', 'modal-step-new'].forEach(id => { $(id).hidden = true; });
    if (!auth.currentUser) $('modal-step-auth').hidden = false; else $('modal-step-' + (step === 'login' ? 'auth' : step)).hidden = false;
    $('auth-modal').classList.add('on'); $('auth-modal').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeAuthModal() { $('auth-modal').classList.remove('on'); $('auth-modal').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
$('auth-modal').addEventListener('mousedown', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });
document.querySelectorAll('[data-chiudi-mod]').forEach(b => b.addEventListener('click', closeAuthModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('auth-modal').classList.contains('on') && !$('conf-modal').classList.contains('on')) closeAuthModal(); });
window.openAuthModal = openCustomStep;
window.closeAuthModal = closeAuthModal;
