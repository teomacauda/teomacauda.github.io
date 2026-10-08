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

// ===== Consegna video · logica =====
// Sopra (import e collegamento a Firebase) è copiato identico dalla versione precedente.
// Dati: collezione "consegneVideo" { clientName, deliveryTitle, slug, videos[{ title, resolution, duration, youtubeId, driveLink, aspectRatio }], createdAt,
//   + clienteId, avatar (nuovi, facoltativi) }. L'indirizzo (slug) di una consegna non cambia mai.

const { $, esc, avviso, conferma, erroreTesto, copiaTesto, avatarHtml, createSlug, utenteInstagram, fotoDaInstagram } = window.RawUI;

const urlParams = new URLSearchParams(window.location.search);
const consegnaSlug = urlParams.get('v');           // consegna: l'admin la modifica, il cliente la guarda
const clienteSlugUrl = urlParams.get('c');         // consegne di un cliente (solo admin)
const anteprima = urlParams.get('anteprima') === '1';
const SENZA = '_senza';

const FRECCIA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const SU = '<svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/></svg>', GIU = '<svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6"/></svg>';
const CESTINO = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>';

let consegne = [], clienti = [];
let corrente = null, video = [], sporco = false, clienteAperto = null;
let rawCaricato = false;
function caricaRaw() { if (rawCaricato) return; rawCaricato = true; const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s); }

// ---------- utilità ----------
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
function dataDi(c) { try { const d = c.createdAt && c.createdAt.toDate ? c.createdAt.toDate() : null; return d ? `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}` : ''; } catch (e) { return ''; } }
const millis = (c) => { try { return c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : 0; } catch (e) { return 0; } };
const clienteDi = (c) => clienti.find(x => x.id === c.clienteId) || null;
const consegneDel = (cl) => cl.id === SENZA ? consegne.filter(c => !c.clienteId || !clienti.some(x => x.id === c.clienteId)) : consegne.filter(c => c.clienteId === cl.id);
// dall'indirizzo o dall'ID di YouTube all'ID (accetta watch, youtu.be, shorts, embed)
function estraiYT(s) {
    s = String(s || '').trim(); if (!s) return '';
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/v\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
}
async function infoYT(id) {   // titolo e proporzioni da noembed (servizio gratuito già usato dalla versione precedente)
    try {
        const r = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`); const d = await r.json();
        return { titolo: d && d.title ? d.title : '', aspetto: d && d.width && d.height ? (d.height > d.width ? '9:16' : '16:9') : '16:9' };
    } catch (e) { return { titolo: '', aspetto: '16:9' }; }
}
// link di condivisione di Google Drive -> link di download diretto (quello che serve al pulsante "Scarica")
function driveDiretto(url) {
    const s = String(url || '').trim();
    if (!/drive\.google\.com/i.test(s)) return s;
    if (/\/uc\?/.test(s) && /export=download/.test(s) && /[?&]id=/.test(s)) return s;
    const m = s.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || s.match(/[?&]id=([A-Za-z0-9_-]+)/);
    return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : s;
}
const èCartellaDrive = (s) => /drive\.google\.com\/drive\/(u\/\d+\/)?folders\//i.test(String(s || ''));

// durata del video: la chiede al lettore ufficiale di YouTube (caricato solo qui, nell'editor, mai nella pagina del cliente)
let ytApiPronta = null;
function caricaYTApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiPronta) return ytApiPronta;
    ytApiPronta = new Promise((res, rej) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
        const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { ytApiPronta = null; rej(new Error('api')); };
        document.head.appendChild(s); setTimeout(() => { if (!(window.YT && window.YT.Player)) { ytApiPronta = null; rej(new Error('timeout')); } }, 10000);
    });
    return ytApiPronta;
}
async function durataYT(id) {
    try { await caricaYTApi(); } catch (e) { return 0; }
    return new Promise((resolve) => {
        const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:120px;opacity:0;pointer-events:none';
        const el = document.createElement('div'); box.appendChild(el); document.body.appendChild(box);
        let fatto = false, p = null;
        const fine = (d) => { if (fatto) return; fatto = true; try { p && p.destroy(); } catch (e) {} box.remove(); resolve(d); };
        try {
            p = new window.YT.Player(el, { videoId: id, width: 200, height: 120, playerVars: { controls: 0, rel: 0, playsinline: 1, mute: 1 }, events: {
                onReady: (e) => { let n = 0; const t = setInterval(() => { const d = e.target.getDuration(); n++; if (d > 0) { clearInterval(t); fine(Math.floor(d)); } else if (n === 6) { try { e.target.mute(); e.target.playVideo(); } catch (x) {} } else if (n >= 32) { clearInterval(t); fine(0); } }, 250); },
                onError: () => fine(0) } });
        } catch (e) { fine(0); }
        setTimeout(() => fine(0), 12000);
    });
}
function formatoDurata(sec) { const h = Math.floor(sec / 3600), mi = Math.floor((sec % 3600) / 60), s = sec % 60, p = (n) => String(n).padStart(2, '0'); return h ? `${h}:${p(mi)}:${p(s)}` : `${p(mi)}:${p(s)}`; }
const miniatura = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

// ---------- caricamento (admin) ----------
async function caricaAdmin() {
    const [cs, ps] = await Promise.all([getDocs(collection(db, "consegneVideo")), getDocs(collection(db, "pianiEditoriali"))]);
    consegne = []; cs.forEach(d => consegne.push({ id: d.id, ...d.data() }));
    clienti = []; ps.forEach(d => { const x = d.data(); if (x.isHub === true) return; clienti.push({ id: d.id, slug: x.slug, clientName: x.clientName || 'Cliente', avatar: x.avatar || '' }); });
}

// ---------- router ----------
function mostra(sez) { ['section-lock', 'section-home', 'section-cliente', 'section-editor', 'section-client'].forEach(id => { $(id).hidden = id !== sez; }); $('main-loader').hidden = true; }
async function initRouter(user) {
    $('main-loader').hidden = false;
    ['section-lock', 'section-home', 'section-cliente', 'section-editor', 'section-client'].forEach(id => { $(id).hidden = true; });
    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    const vistaCliente = !!consegnaSlug && (!user || anteprima);
    $('admin-indicator').hidden = !user; $('btnStrumenti').hidden = !user; $('btnRaw').hidden = !user;
    $('bar').hidden = !user || vistaCliente;
    $('anteprima-admin').hidden = !(user && vistaCliente);
    if (user) caricaRaw();
    try {
        if (consegnaSlug) {
            const snap = await getDocs(query(collection(db, "consegneVideo"), where("slug", "==", consegnaSlug)));
            if (snap.empty) { window.location.href = './'; return; }
            const d = { id: snap.docs[0].id, ...snap.docs[0].data() };
            if (user && !anteprima) { await caricaAdmin(); corrente = consegne.find(x => x.id === d.id) || d; renderEditor(); mostra('section-editor'); }
            else { document.body.classList.add('vista-cliente'); renderCliente(d); mostra('section-client'); avviaRivelazioni(); if (user) $('anteprima-torna').href = `?v=${encodeURIComponent(consegnaSlug)}`; }
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
        if (consegnaSlug) window.location.href = './'; else { $('main-loader').hidden = true; avviso('Non riesco a caricare i dati. ' + erroreTesto(error)); }
    }
}

// ---------- home: i clienti ----------
function assegnabili() {
    const out = [];
    consegneDel({ id: SENZA }).forEach(c => {
        const n = String(c.clientName || '').trim().toLowerCase();
        const cl = n && clienti.find(x => x.clientName.trim().toLowerCase() === n);
        if (cl) out.push({ c, cl });
    });
    return out;
}
function renderHome() {
    document.title = 'Consegna video · Teo Macauda';
    const grid = $('cat-clienti'); grid.innerHTML = '';
    const card = (href, av, nome, sub) => { const a = document.createElement('a'); a.className = 'contatto vetro'; a.href = href; a.innerHTML = `<span class="avatar l" aria-hidden="true">${av}</span><span class="c-nome"><b>${esc(nome)}</b><small>${esc(sub)}</small></span><span class="freccia">${FRECCIA}</span>`; return a; };
    clienti.forEach(cl => { const n = consegneDel(cl).length; grid.appendChild(card(`?c=${encodeURIComponent(cl.slug)}`, avatarHtml({ avatar: cl.avatar, clientName: cl.clientName }), cl.clientName, `${n} ${n === 1 ? 'consegna' : 'consegne'}`)); });
    const sc = consegneDel({ id: SENZA });
    if (sc.length) grid.appendChild(card(`?c=${SENZA}`, '<b>—</b>', 'Senza cliente', `${sc.length} ${sc.length === 1 ? 'consegna' : 'consegne'}`));
    const piu = document.createElement('button'); piu.type = 'button'; piu.className = 'piu';
    piu.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Crea nuovo cliente</span>`; piu.onclick = () => openCustomStep('client'); grid.appendChild(piu);
    $('btn-new-client-top').onclick = () => openCustomStep('client');
    const ass = assegnabili(), b = $('banner-assegna'); b.hidden = !sc.length;
    if (sc.length) {
        $('banner-titolo').textContent = sc.length === 1 ? '1 consegna senza cliente' : `${sc.length} consegne senza cliente`;
        $('banner-testo').textContent = ass.length ? `Dal nome del destinatario riconosco ${ass.length === 1 ? 'a quale cliente appartiene 1 consegna: posso assegnarla io' : `a quale cliente appartengono ${ass.length} consegne: posso assegnarle io`}, e prendono la foto del cliente. ${sc.length > ass.length ? 'Le altre le assegni tu, aprendole.' : ''}` : 'Non riconosco il cliente dal nome: aprile e assegnale tu.';
        $('btn-assegna').hidden = !ass.length;
        $('btn-assegna').onclick = async () => {
            if (!(await conferma(`Assegno ${ass.length === 1 ? '1 consegna' : ass.length + ' consegne'} al cliente con lo stesso nome del destinatario. Non cambia altro.`, 'Assegna', 'Assegnare le consegne?'))) return;
            let fatti = 0;
            try { for (const x of ass) { const p = { clienteId: x.cl.id }; if (x.cl.avatar) p.avatar = x.cl.avatar; await updateDoc(doc(db, "consegneVideo", x.c.id), p); fatti++; } avviso(fatti === 1 ? '1 consegna assegnata.' : `${fatti} consegne assegnate.`); }
            catch (e) { avviso(`Assegnate ${fatti}, poi si è fermato. ` + erroreTesto(e)); }
            initRouter(auth.currentUser);
        };
    }
}

// ---------- le consegne di un cliente ----------
function renderClienteAdmin() {
    const cl = clienteAperto; document.title = `${cl.clientName} · Consegne`;
    $('cl-nome').textContent = cl.clientName;
    $('cl-avatar').innerHTML = cl.id === SENZA ? '<b>—</b>' : avatarHtml({ avatar: cl.avatar, clientName: cl.clientName });
    const lista = consegneDel(cl).sort((a, b) => millis(b) - millis(a));
    $('cl-sotto').textContent = `${lista.length} ${lista.length === 1 ? 'consegna' : 'consegne'}`;
    $('btn-new-consegna').onclick = () => { $('nc-titolo').value = ''; $('new-sotto').textContent = cl.id !== SENZA ? `Un pacchetto di video per ${cl.clientName}.` : 'Un pacchetto di video da consegnare.'; openCustomStep('new'); };
    const grid = $('cat-consegne'); grid.innerHTML = '';
    lista.forEach(c => {
        const a = document.createElement('a'); a.className = 'cs-card vetro'; a.href = `?v=${encodeURIComponent(c.slug)}`;
        const n = (c.videos || []).length;
        a.innerHTML = `<span class="per">${esc(dataDi(c) || 'Consegna')}</span><h3>${esc(c.deliveryTitle)}</h3><div class="cifre"><span><b>${n}</b> ${n === 1 ? 'video' : 'video'}</span></div>`;
        grid.appendChild(a);
    });
    $('consegne-vuote').hidden = lista.length > 0;
}
$('form-new-consegna').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titolo = $('nc-titolo').value.trim(), cl = clienteAperto, bottone = e.target.querySelector('button[type="submit"]'); bottone.disabled = true;
    try {
        const nome = cl && cl.id !== SENZA ? cl.clientName : 'Cliente';
        const slug = createSlug(`${nome} ${titolo}-${Math.floor(1000 + Math.random() * 9000)}`);
        const nuova = { clientName: nome, deliveryTitle: titolo, slug, videos: [], createdAt: new Date() };
        if (cl && cl.id !== SENZA) { nuova.clienteId = cl.id; if (cl.avatar) nuova.avatar = cl.avatar; }
        await addDoc(collection(db, "consegneVideo"), nuova);
        closeAuthModal(); window.location.href = `?v=${encodeURIComponent(slug)}`;
    } catch (err) { console.error(err); avviso('Consegna non creata. ' + erroreTesto(err)); bottone.disabled = false; }
});

// ---------- editor di una consegna ----------
function renderEditor() {
    const d = corrente, cl = clienteDi(d);
    document.title = `${d.deliveryTitle} · Consegna video`;
    $('ed-titolo').textContent = d.deliveryTitle;
    $('ed-eyebrow').textContent = `Consegna · ${cl ? cl.clientName : (d.clientName || 'senza cliente')}`;
    const av = (cl && cl.avatar) || d.avatar || '';
    $('ed-avatar').innerHTML = av ? `<img src="${esc(av)}" alt="">` : `<b>${esc(window.RawUI.iniziali(cl ? cl.clientName : d.clientName))}</b>`;
    $('back-cliente').href = cl ? `?c=${encodeURIComponent(cl.slug)}` : './';
    $('back-testo').textContent = cl ? `Torna a ${cl.clientName}` : 'Torna ai clienti';
    $('btn-anteprima').href = `?v=${encodeURIComponent(d.slug)}&anteprima=1`;
    $('btn-copia-link').onclick = () => copiaTesto(`${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(d.slug)}`, $('btn-copia-link').querySelector('span'));
    $('ed-cliente').innerHTML = `<option value="">Nessun cliente</option>` + clienti.map(c => `<option value="${esc(c.id)}">${esc(c.clientName)}</option>`).join('');
    $('ed-cliente').value = cl ? cl.id : '';
    video = (d.videos || []).map(v => ({ ...v })); sporco = false; segna(false); renderVideo();
}
$('ed-cliente').addEventListener('change', async () => {
    const cl = clienti.find(c => c.id === $('ed-cliente').value);
    try {
        const patch = cl ? { clienteId: cl.id, clientName: cl.clientName, avatar: cl.avatar || '' } : { clienteId: '' };
        await updateDoc(doc(db, "consegneVideo", corrente.id), patch); Object.assign(corrente, patch);
        renderEditor(); avviso(cl ? `Consegna assegnata a ${cl.clientName}.` : 'Consegna senza cliente.');
    } catch (e) { avviso('Non riuscito. ' + erroreTesto(e)); }
});
$('btn-edit-titolo').addEventListener('click', () => { $('ed-titolo-input').value = corrente.deliveryTitle; $('ed-titolo-box').hidden = false; $('ed-titolo-input').focus(); });
$('btn-annulla-titolo').addEventListener('click', () => { $('ed-titolo-box').hidden = true; });
$('btn-salva-titolo').addEventListener('click', async () => {
    const t = $('ed-titolo-input').value.trim(); if (!t) { avviso('Il titolo non può essere vuoto.'); return; }
    try { await updateDoc(doc(db, "consegneVideo", corrente.id), { deliveryTitle: t }); corrente.deliveryTitle = t; $('ed-titolo').textContent = t; $('ed-titolo-box').hidden = true; avviso('Titolo salvato.'); }
    catch (e) { avviso('Titolo non salvato. ' + erroreTesto(e)); }
});

function segna(v) { sporco = v; $('stato').innerHTML = v ? 'Modifiche non salvate.' : '&nbsp;'; }
window.addEventListener('beforeunload', (e) => { if (sporco) { e.preventDefault(); e.returnValue = ''; } });
function renderVideo() {
    const box = $('vd-lista');
    if (!video.length) { box.innerHTML = '<div class="vd-vuoto">Nessun video: aggiungine uno e incolla il link di YouTube.</div>'; return; }
    box.innerHTML = video.map((v, i) => `
        <div class="vd ${v._nuovo ? 'nuovo' : ''}" data-i="${i}">
            <div class="vd-anteprima ${v.aspectRatio === '9:16' ? 'vert' : ''}">${v.youtubeId ? `<img src="${miniatura(v.youtubeId)}" alt="" loading="lazy">` : 'Anteprima'}</div>
            <div class="vd-campi">
                <div class="l1"><span class="eti">Link di YouTube (o solo l'ID)</span><input type="text" data-k="yt" value="${v.youtubeId ? esc('https://youtu.be/' + v.youtubeId) : ''}" placeholder="https://www.youtube.com/watch?v=…" autocapitalize="off" spellcheck="false"></div>
                <div class="l2"><span class="eti">Titolo del video</span><input type="text" data-k="title" value="${esc(v.title || '')}" placeholder="Es. Versione orizzontale"></div>
                <div class="c3"><span class="eti">Risoluzione</span><select data-k="resolution"><option value="4K" ${v.resolution === '4K' ? 'selected' : ''}>4K Ultra HD</option><option value="Full HD" ${v.resolution === 'Full HD' ? 'selected' : ''}>Full HD</option></select></div>
                <div class="c3"><span class="eti">Durata <button type="button" class="rileva" data-dur>Rileva</button></span><input type="text" data-k="duration" value="${esc(v.duration || '')}" placeholder="01:15"></div>
                <div class="c3"><span class="eti">Formato</span><select data-k="aspectRatio"><option value="auto" ${(!v.aspectRatio || v.aspectRatio === 'auto') ? 'selected' : ''}>Rileva da solo</option><option value="16:9" ${v.aspectRatio === '16:9' ? 'selected' : ''}>Orizzontale 16:9</option><option value="9:16" ${v.aspectRatio === '9:16' ? 'selected' : ''}>Verticale 9:16</option></select></div>
                <div class="l2"><span class="eti">Link di Google Drive del file master · facoltativo: senza, il cliente vede solo l'anteprima</span><input type="url" data-k="driveLink" value="${esc(v.driveLink || '')}" placeholder="https://drive.google.com/…"></div>
            </div>
            <div class="vd-az"><button type="button" class="rnd" data-az="su" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">${SU}</button><button type="button" class="rnd" data-az="giu" ${i === video.length - 1 ? 'disabled' : ''} aria-label="Sposta giù">${GIU}</button><button type="button" class="rnd p" data-az="del" aria-label="Elimina il video">${CESTINO}</button></div>
        </div>`).join('');
}
$('vd-lista').addEventListener('change', async (e) => {
    const riga = e.target.closest('.vd'); if (!riga) return;
    const v = video[parseInt(riga.dataset.i, 10)], k = e.target.dataset.k; if (!v || !k) return;
    if (k === 'yt') {
        const id = estraiYT(e.target.value);
        if (!id) { avviso('Non riconosco il link: incolla l\'indirizzo del video di YouTube.'); return; }
        v.youtubeId = id; e.target.value = 'https://youtu.be/' + id; segna(true);
        riga.querySelector('.vd-anteprima').innerHTML = `<img src="${miniatura(id)}" alt="">`;
        if (!v.duration) rilevaDurata(riga, v);                      // la durata si prende da sola dal lettore di YouTube
        const info = await infoYT(id);                               // titolo e proporzioni proposti da soli
        if (!v.title && info.titolo) { v.title = info.titolo; riga.querySelector('[data-k="title"]').value = info.titolo; }
        if (!v.aspectRatio || v.aspectRatio === 'auto') { riga.querySelector('.vd-anteprima').classList.toggle('vert', info.aspetto === '9:16'); v._aspettoRilevato = info.aspetto; }
    } else if (k === 'driveLink') {
        const nuovo = driveDiretto(e.target.value);
        if (èCartellaDrive(e.target.value)) avviso('Questo è il link di una cartella: per il pulsante Scarica serve il link del singolo file.');
        else if (nuovo !== e.target.value.trim()) { e.target.value = nuovo; avviso('Link convertito nel link di download diretto.'); }
        v.driveLink = nuovo; segna(true);
    } else { v[k] = e.target.value; segna(true); if (k === 'aspectRatio') riga.querySelector('.vd-anteprima').classList.toggle('vert', e.target.value === '9:16'); }
});
$('vd-lista').addEventListener('input', (e) => { const riga = e.target.closest('.vd'); if (!riga) return; const k = e.target.dataset.k; if (!k || k === 'yt') return; const v = video[parseInt(riga.dataset.i, 10)]; if (v && e.target.tagName === 'INPUT') { v[k] = e.target.value; segna(true); } });
async function rilevaDurata(riga, v, manuale) {
    const campo = riga.querySelector('[data-k="duration"]'), vecchio = campo.placeholder; campo.placeholder = 'Rilevo…';
    const sec = await durataYT(v.youtubeId);
    campo.placeholder = vecchio;
    if (sec > 0) { v.duration = formatoDurata(sec); campo.value = v.duration; segna(true); if (manuale) avviso(`Durata: ${v.duration}.`); }
    else if (manuale) avviso('Non riesco a leggere la durata di questo video: scrivila a mano.');
}
$('vd-lista').addEventListener('click', async (e) => {
    const rl = e.target.closest('[data-dur]');
    if (rl) { const riga = rl.closest('.vd'), v = video[parseInt(riga.dataset.i, 10)]; if (!v.youtubeId) { avviso('Prima incolla il link di YouTube.'); return; } rilevaDurata(riga, v, true); return; }
    const b = e.target.closest('[data-az]'); if (!b || b.disabled) return;
    const i = parseInt(b.closest('.vd').dataset.i, 10), az = b.dataset.az;
    if (az === 'su' || az === 'giu') { const j = az === 'su' ? i - 1 : i + 1; [video[i], video[j]] = [video[j], video[i]]; segna(true); renderVideo(); }
    else if (az === 'del') {
        const v = video[i];
        if ((v.title || v.youtubeId) && !(await conferma(`Il video "${v.title || 'senza titolo'}" verrà tolto dalla consegna (si salva quando premi "Salva la consegna").`, 'Togli', 'Togliere il video?'))) return;
        video.splice(i, 1); segna(true); renderVideo();
    }
});
$('btn-add-video').addEventListener('click', () => { video.push({ title: '', resolution: '4K', duration: '', youtubeId: '', driveLink: '', aspectRatio: 'auto', _nuovo: true }); segna(true); renderVideo(); const ins = $('vd-lista').querySelectorAll('.vd:last-child input[data-k="yt"]'); if (ins[0]) ins[0].focus(); });
$('btn-salva').addEventListener('click', async () => {
    for (let i = 0; i < video.length; i++) {
        const v = video[i], n = `Il video ${i + 1}`;
        if (!v.youtubeId) { avviso(`${n} non ha il link di YouTube.`); return; }
        if (!(v.title || '').trim()) { avviso(`${n} non ha il titolo.`); return; }
    }
    const b = $('btn-salva'); b.disabled = true; $('stato').textContent = 'Salvo…';
    try {
        const pulite = [];
        for (const v of video) {
            let aspetto = v.aspectRatio;
            if (!aspetto || aspetto === 'auto') aspetto = v._aspettoRilevato || (await infoYT(v.youtubeId)).aspetto;   // il cliente vede il formato già deciso
            const { _nuovo, _aspettoRilevato, ...x } = v;
            pulite.push({ ...x, title: (x.title || '').trim(), youtubeId: x.youtubeId, driveLink: driveDiretto(x.driveLink), duration: (x.duration || '').trim(), resolution: x.resolution || '4K', aspectRatio: aspetto });
        }
        await updateDoc(doc(db, "consegneVideo", corrente.id), { videos: pulite });
        corrente.videos = pulite; video = pulite.map(v => ({ ...v })); segna(false); renderVideo(); avviso('Consegna salvata.');
    } catch (err) { console.error(err); $('stato').textContent = 'Modifiche non salvate.'; avviso('Salvataggio non riuscito. ' + erroreTesto(err)); }
    finally { b.disabled = false; }
});
$('btn-duplica').addEventListener('click', async () => {
    const d = corrente;
    try {
        const titolo = `${d.deliveryTitle} (copia)`, slug = createSlug(`${d.clientName || 'cliente'} ${titolo}-${Math.floor(1000 + Math.random() * 9000)}`);
        const copia = { clientName: d.clientName || '', deliveryTitle: titolo, slug, videos: (d.videos || []).map(v => ({ ...v })), createdAt: new Date() };
        if (d.clienteId) copia.clienteId = d.clienteId; if (d.avatar) copia.avatar = d.avatar;
        await addDoc(collection(db, "consegneVideo"), copia); sporco = false;
        window.location.href = `?v=${encodeURIComponent(slug)}`;
    } catch (err) { console.error(err); avviso('Duplicazione non riuscita. ' + erroreTesto(err)); }
});
$('btn-elimina').addEventListener('click', async () => {
    if (!(await conferma(`La consegna "${corrente.deliveryTitle}" verrà eliminata e il suo link smetterà di funzionare. L'azione non si può annullare.`, 'Elimina la consegna', 'Eliminare la consegna?'))) return;
    try { sporco = false; const cl = clienteDi(corrente); await deleteDoc(doc(db, "consegneVideo", corrente.id)); window.location.href = cl ? `?c=${encodeURIComponent(cl.slug)}` : './'; }
    catch (err) { console.error(err); avviso('Consegna non eliminata. ' + erroreTesto(err)); }
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
        try { if (nota) sessionStorage.setItem('nota_consegna', nota); } catch (x) {}
        closeAuthModal(); $('form-create-client').reset();
        window.location.href = `?c=${encodeURIComponent(nuovo.slug)}`;
    } catch (err) { console.error(err); avviso('Il cliente non è stato creato. ' + erroreTesto(err)); bottone.disabled = false; bottone.textContent = t0; }
});
try { const nn = sessionStorage.getItem('nota_consegna'); if (nn) { sessionStorage.removeItem('nota_consegna'); setTimeout(() => avviso(nn), 1500); } } catch (e) {}

// ---------- vista del cliente ----------
function renderCliente(d) {
    document.title = `${d.deliveryTitle} | Consegna video`;
    const lista = d.videos || [];
    const nome = d.clientName || '';
    const ico = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/></svg>';
    const avatar = d.avatar || '';
    const testa = `<div class="cv-testa rv-e"><span class="avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : `<b>${esc(window.RawUI.iniziali(nome))}</b>`}</span><span class="eti">Consegna video</span><h1>${esc(d.deliveryTitle)}</h1><p>${nome ? esc(nome) + ' · ' : ''}${lista.length} ${lista.length === 1 ? 'video' : 'video'}</p></div>`;
    const schede = lista.map(v => {
        const vert = v.aspectRatio === '9:16';
        return `<article class="cv-card rv-e"><div class="cv-player ${vert ? 'vert' : ''}"><button class="cv-poster" type="button" data-yt="${esc(v.youtubeId)}" data-t="${esc(v.title)}" aria-label="Guarda il video: ${esc(v.title)}"><span class="cv-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span><small>Premi per guardare · il video si carica da YouTube</small></button></div>
            <div class="cv-info"><div class="tags"><span class="tag">${esc(v.resolution || '')}</span><span class="tag g">${vert ? 'Verticale' : 'Orizzontale'}</span>${v.driveLink ? '' : '<span class="tag g">Solo anteprima</span>'}</div>
            <h2>${esc(v.title)}</h2>${v.duration ? `<p class="dur">Durata: <b>${esc(v.duration)}</b></p>` : ''}
${v.driveLink ? `<p class="cv-nota"><b>Nota:</b> se il file supera i 100 MB, Google Drive chiede una conferma di sicurezza prima di avviare il download.</p>
            <a class="cv-scarica" href="${esc(v.driveLink)}" target="_blank" rel="noopener">${ico}Scarica</a>` : `<p class="cv-nota solo"><b>Anteprima:</b> il file per il download sarà disponibile appena la consegna è pronta.</p>`}</div></article>`;
    }).join('');
    $('cv-vista').innerHTML = testa + (schede || '<p class="cv-vuoto">I tuoi video arriveranno qui.</p>');
}
// il lettore di YouTube si collega a Google solo quando premi play
document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.cv-poster'); if (!b) return;
    const box = b.parentElement; box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.yt)}?rel=0&modestbranding=1&autoplay=1&playsinline=1" title="${esc(b.dataset.t)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
});
function avviaRivelazioni() {
    const io = new IntersectionObserver((voci) => voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } }), { threshold: 0.12 });
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
