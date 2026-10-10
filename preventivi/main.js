import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ===== Preventivi · logica =====
// Sopra (collegamento a Firebase) è copiato dalla versione precedente.
// Qui sotto, IDENTICI alla versione precedente (copiati parola per parola): i pacchetti, formattaPrezzo e generaFlatPDF,
// cioè il codice che scrive i dati nei punti giusti del PDF (template.pdf). Non vanno modificati.
// Dati: collezione "preventivi" { clientName, clientCf, clientVat, clientStreet, clientCityZip, expiryDate, packageType, servizi[{descrizione, prezzo}],
//   totale, durataMesi, durataPeriodo, durata, mensile, createdAt }.

// pdf-lib (versione 1.17.1, la stessa di prima) è salvata nel sito e si carica solo quando serve, al clic su "Scarica": nessun servizio esterno
let PDFDocument, StandardFonts, rgb;
async function caricaPdfLib() { if (!PDFDocument) ({ PDFDocument, StandardFonts, rgb } = await import("./pdf-lib.esm.min.js")); }
function showLoader() { document.getElementById('pdf-attesa').hidden = false; }
function hideLoader() { document.getElementById('pdf-attesa').hidden = true; }

// Data Mapping strutturato dei Pacchetti
const pacchettiPredefiniti = {
    start: {
        titolo: "PACCHETTO START",
        sottotitolo: "DIGITAL CORE",
        descrizione: "L’essenziale per una presenza professionale e costante. Elimini il \"cosa pubblicare\" e garantisci al tuo brand un'immagine curata.",
        voci: [
            "4 Video (Reel/TikTok/Shorts)",
            "Scrittura script completa",
            "5 Foto Pro ottimizzate",
            "ARTIGIANALITÀ PURA (NO AI)"
        ],
        valore: "Elimini il blocco creativo e deleghi la qualità visiva di alto livello.",
        investimentoDefault: "€ 450,00 — € 600,00"
    },
    pro: {
        titolo: "PACCHETTO PRO",
        sottotitolo: "CONVERSION STRATEGY",
        descrizione: "Il sistema strategico per generare contatti. Perfetto per chi vuole scalare e usare i social per vendere ed acquisire clienti.",
        voci: [
            "8 Video (2 contenuti a settimana)",
            "10 Foto Pro (Post/Caroselli)",
            "Strategia e script orientati alla vendita",
            "Analisi della concorrenza",
            "ARTIGIANALITÀ PURA (NO AI)"
        ],
        valore: "Domini l'algoritmo e differenzi nettamente il tuo brand sul mercato.",
        investimentoDefault: "€ 850,00 — € 1.000,00"
    },
    elite: {
        titolo: "PACCHETTO ELITE",
        sottotitolo: "ALL-IN AUTHORITY",
        descrizione: "Delega totale per una leadership assoluta. Trasformo la tua pagina in un punto di riferimento estetico e strategico.",
        voci: [
            "12 video + 10 foto al mese",
            "Strategia e script orientati alla vendita",
            "Analisi della concorrenza",
            "Extreme Page Makeover, restyling della pagina",
            "Gestione full (mi occuperò anche della pubblicazione)",
            "ARTIGIANALITÀ PURA (NO AI)"
        ],
        valore: "Libertà totale. Tu pensi al lavoro, io ti rendo un'autorità premium.",
        investimentoDefault: "€ 1.350,00 — € 1.500,00"
    }
};

// Helper per formattare i prezzi in euro con ,00
function formattaPrezzo(val) {
    if (val === undefined || val === null || val === "") return "";
    let s = val.toString().replace(/[\s€]/g, "");
    if (s.includes('-') || s.includes('—')) {
        let parts = s.split(/[-—]/);
        return parts.map(p => formattaPrezzo(p.trim())).join(" — ");
    }
    s = s.replace(/,/g, '.');
    let num = parseFloat(s);
    if (isNaN(num)) return val;
    return "€ " + num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


const { $, esc, avviso, conferma, erroreTesto, copiaTesto } = window.RawUI;

const urlParams = new URLSearchParams(window.location.search);
const preventivoId = urlParams.get('id');
const nuovo = urlParams.get('nuovo') === '1';
const anteprima = urlParams.get('anteprima') === '1';

let datiPreventivoCorrente = null;
let corrente = null, preventivi = [], sporco = false;
let rawCaricato = false;
function caricaRaw() { if (rawCaricato) return; rawCaricato = true; const s = document.createElement('script'); s.src = '../raw/raw.js'; document.head.appendChild(s); }

const NOMI_PACCHETTO = { custom: 'Su misura', start: 'Start', pro: 'Pro', elite: 'Elite' };
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const dataBreve = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${parseInt(m[3], 10)} ${MESI[parseInt(m[2], 10) - 1]} ${m[1]}` : '—'; };
const oggiStr = () => new Date().toLocaleDateString('sv-SE');     // data locale: non scade prima del tempo per il fuso UTC
const scaduto = (p) => !!p.expiryDate && oggiStr() > p.expiryDate;
const GIORNI_RIATTIVAZIONE = 30;
const daEliminare = (p) => { if (!p.expiryDate) return false; const lim = new Date(); lim.setDate(lim.getDate() - GIORNI_RIATTIVAZIONE); return lim.toLocaleDateString('sv-SE') > p.expiryDate; };
const creatoIl = (p) => { const t = Date.parse(p.createdAt && p.createdAt.toDate ? p.createdAt.toDate().toISOString() : p.createdAt); return isNaN(t) ? 0 : t; };
const linkCliente = (id) => `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(id)}`;

// ---------- router ----------
const SEZIONI = ['section-lock', 'section-home', 'section-editor', 'section-client'];
function mostra(sez) { SEZIONI.forEach(id => { $(id).hidden = id !== sez; }); $('main-loader').hidden = true; }
async function initRouter(user) {
    $('main-loader').hidden = false; SEZIONI.forEach(id => { $(id).hidden = true; });
    try { localStorage.setItem('ped_admin', user ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.remove('adm-pre');
    const vistaCliente = !!preventivoId && (!user || anteprima);
    $('admin-indicator').hidden = !user; $('btnStrumenti').hidden = !user; $('btnRaw').hidden = !user;
    $('bar').hidden = !user || vistaCliente;
    $('anteprima-admin').hidden = !(user && vistaCliente);
    document.body.classList.toggle('vista-cliente', vistaCliente);
    if (user) caricaRaw();
    try {
        if (preventivoId) {
            const ref = doc(db, "preventivi", preventivoId), snap = await getDoc(ref);
            if (!snap.exists()) {
                if (vistaCliente) { $('client-view-title').textContent = 'Preventivo non trovato'; $('client-view-date').textContent = ''; $('client-content-area').innerHTML = '<p class="pv-scaduto">Questo link non è valido o il preventivo è stato rimosso.</p>'; $('btn-download-pdf').hidden = true; mostra('section-client'); avviaRivelazioni(); }
                else { avviso('Preventivo non trovato.'); window.location.href = './'; }
                return;
            }
            const d = { id: snap.id, ...snap.data() };
            if (vistaCliente) {
                if (user) $('anteprima-torna').href = `?id=${encodeURIComponent(preventivoId)}`;
                await caricaVistaCliente(d, ref, !!user);
            } else { corrente = d; renderEditor(); mostra('section-editor'); }
        } else if (user) {
            if (nuovo) { corrente = null; renderEditor(); mostra('section-editor'); }
            else {
                await caricaTutti();
                // come prima, i preventivi scaduti spariscono da soli: li elimina il tuo accesso quando apri l'elenco, 30 giorni dopo la scadenza
                // (fino ad allora puoi riattivarli cambiando la data; il cliente non ha più il permesso di cancellare)
                const scad = preventivi.filter(daEliminare); let tolti = 0;
                for (const p of scad) { try { await deleteDoc(doc(db, "preventivi", p.id)); tolti++; } catch (e) { console.error(e); } }
                if (tolti) { preventivi = preventivi.filter(p => !daEliminare(p)); avviso(tolti === 1 ? '1 preventivo scaduto da più di 30 giorni è stato eliminato.' : `${tolti} preventivi scaduti da più di 30 giorni sono stati eliminati.`); }
                renderHome(); mostra('section-home');
            }
        } else mostra('section-lock');
    } catch (error) {
        console.error(error);
        if (preventivoId && !user) { $('main-loader').hidden = true; avviso('Non riesco a caricare il preventivo.'); }
        else { $('main-loader').hidden = true; avviso('Non riesco a caricare i dati. ' + erroreTesto(error)); }
    }
}
async function caricaTutti() { const s = await getDocs(collection(db, "preventivi")); preventivi = []; s.forEach(d => preventivi.push({ id: d.id, ...d.data() })); }

// ---------- elenco ----------
let selezione = new Set(), modoSel = false;
const SPUNTA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function renderHome() {
    document.title = 'Preventivi · Teo Macauda';
    const lista = preventivi.slice().sort((a, b) => creatoIl(b) - creatoIl(a));
    selezione = new Set([...selezione].filter(id => lista.some(p => p.id === id)));
    const grid = $('pv-griglia'); grid.innerHTML = '';
    lista.forEach(p => {
        const sc = scaduto(p), el = document.createElement('a'); el.className = 'au-card vetro' + (modoSel ? ' sel-modo' : '') + (selezione.has(p.id) ? ' sel' : ''); el.href = `?id=${encodeURIComponent(p.id)}`; el.dataset.id = p.id;
        el.innerHTML = `${modoSel ? `<span class="pv-spunta">${SPUNTA}</span>` : ''}<span class="stato-tag ${sc ? 's-scaduto' : 's-risposto'}">${sc ? 'Scaduto' : 'Valido'}</span><h3>${esc(p.clientName || 'Senza nome')}</h3><p class="chi">${esc(NOMI_PACCHETTO[p.packageType] || p.packageType || '')} · scade il ${esc(dataBreve(p.expiryDate))}</p><div class="cifre">${p.mensile ? `<span class="prezzo"><b>${esc(formattaPrezzo(p.mensile))}</b> al mese</span>` : ''}${p.durataMesi ? `<span>${esc(p.durataMesi)}</span>` : ''}</div>`;
        grid.appendChild(el);
    });
    $('pv-vuoti').hidden = lista.length > 0;
    $('btn-seleziona').hidden = !lista.length;
    $('pv-barra').hidden = !modoSel; $('pv-fisso').hidden = !modoSel;
    $('btn-seleziona').querySelector('span').textContent = modoSel ? 'Annulla selezione' : 'Seleziona';
    $('pv-conta').textContent = selezione.size === 1 ? '1 selezionato' : `${selezione.size} selezionati`;
    $('btn-elimina-sel').disabled = !selezione.size; $('btn-elimina-sel').style.opacity = selezione.size ? '' : '.45';
}
function impostaSel(on) { modoSel = on; if (!on) selezione.clear(); renderHome(); }
$('btn-seleziona').addEventListener('click', () => impostaSel(!modoSel));
$('btn-fine-sel').addEventListener('click', () => impostaSel(false));
$('btn-sel-tutti').addEventListener('click', () => { const tutti = preventivi.every(p => selezione.has(p.id)); selezione = new Set(tutti ? [] : preventivi.map(p => p.id)); renderHome(); });
$('btn-sel-scaduti').addEventListener('click', () => { const sc = preventivi.filter(scaduto); if (!sc.length) { avviso('Nessun preventivo scaduto.'); return; } selezione = new Set(sc.map(p => p.id)); renderHome(); });
$('pv-griglia').addEventListener('click', (e) => {
    if (!modoSel) return;
    const c = e.target.closest('.au-card'); if (!c) return; e.preventDefault();
    const id = c.dataset.id; if (selezione.has(id)) selezione.delete(id); else selezione.add(id);
    renderHome();
});
$('btn-elimina-sel').addEventListener('click', async () => {
    const n = selezione.size; if (!n) return;
    const nomi = preventivi.filter(p => selezione.has(p.id)).slice(0, 4).map(p => p.clientName || 'Senza nome').join(', ');
    if (!(await conferma(`${n === 1 ? 'Verrà eliminato 1 preventivo' : `Verranno eliminati ${n} preventivi`} (${nomi}${n > 4 ? '…' : ''}) e i loro link smetteranno di funzionare. L'azione non si può annullare.`, n === 1 ? 'Elimina' : `Elimina ${n}`, 'Eliminare i preventivi?'))) return;
    let fatti = 0;
    try { for (const id of [...selezione]) { await deleteDoc(doc(db, "preventivi", id)); preventivi = preventivi.filter(p => p.id !== id); selezione.delete(id); fatti++; } avviso(fatti === 1 ? '1 preventivo eliminato.' : `${fatti} preventivi eliminati.`); impostaSel(false); }
    catch (err) { console.error(err); avviso(`Eliminati ${fatti}, poi si è fermato. ` + erroreTesto(err)); renderHome(); }
});

// ---------- editor ----------
function segna(v) { sporco = v; $('stato').innerHTML = v ? 'Modifiche non salvate.' : '&nbsp;'; }
window.addEventListener('beforeunload', (e) => { if (sporco) { e.preventDefault(); e.returnValue = ''; } });
const CAMPI = { clientName: 'client-name', clientCf: 'client-cf', clientVat: 'client-vat', clientStreet: 'client-street', clientCityZip: 'client-city-zip', expiryDate: 'expiry-date', durataMesi: 'agreement-months', durataPeriodo: 'agreement-period', mensile: 'monthly-price' };
function rigaServizio(desc, prezzo) {
    const r = document.createElement('div'); r.className = 'sv service-row';
    r.innerHTML = `<input class="campo service-desc" type="text" placeholder="Attività…" value="${esc(desc || '')}"><input class="campo service-price sv-prezzo" type="number" step="0.01" placeholder="Prezzo (facoltativo)" value="${prezzo !== undefined && prezzo !== null && prezzo !== '' ? esc(prezzo) : ''}"><button class="rnd p btn-remove-row" type="button" aria-label="Togli la voce"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>`;
    r.querySelector('.btn-remove-row').addEventListener('click', () => { r.remove(); segna(true); });
    $('services-container').appendChild(r);
}
function aggiornaTipo() {
    const v = $('package-type').value, custom = v === 'custom';
    $('custom-services-section').hidden = !custom;
    const pk = pacchettiPredefiniti[v]; $('pk-anteprima').hidden = custom || !pk;
    if (pk && !custom) $('pk-anteprima').innerHTML = `<b>${esc(pk.titolo)} — ${esc(pk.sottotitolo)}</b><p>Nel PDF e nella pagina del cliente compaiono queste voci:</p><ul>${pk.voci.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}
function renderEditor() {
    const p = corrente;
    document.title = p ? `${p.clientName} · Preventivi` : 'Nuovo preventivo · Preventivi';
    $('ed-eyebrow').textContent = p ? 'Preventivo' : 'Nuovo preventivo';
    $('ed-titolo').textContent = p ? (p.clientName || 'Preventivo') : 'Nuovo preventivo';
    $('ed-info').textContent = p ? `${scaduto(p) ? 'Scaduto' : 'Valido'} · il link vale fino al ${dataBreve(p.expiryDate)}` : 'Compila i dati: il PDF si compila da solo.';
    $('ed-azioni').hidden = !p; $('btn-duplica').hidden = !p; $('btn-elimina').hidden = !p;
    if (p) {
        $('btn-anteprima').href = `?id=${encodeURIComponent(p.id)}&anteprima=1`;
        $('btn-copia-link').onclick = () => copiaTesto(linkCliente(p.id), $('btn-copia-link').querySelector('span'));
    }
    Object.entries(CAMPI).forEach(([k, id]) => { $(id).value = p && p[k] !== undefined && p[k] !== null ? p[k] : ''; });
    $('package-type').value = p && pacchettiPredefiniti[p.packageType] ? p.packageType : (p && p.packageType === 'custom' ? 'custom' : 'custom');
    $('services-container').innerHTML = '';
    const sv = p && Array.isArray(p.servizi) ? p.servizi : [];
    if (sv.length) sv.forEach(s => rigaServizio(s.descrizione, s.prezzo)); else rigaServizio('', '');
    aggiornaTipo(); segna(false);
}
$('package-type').addEventListener('change', () => { aggiornaTipo(); segna(true); });
$('btn-add-service').addEventListener('click', () => { rigaServizio('', ''); segna(true); const i = $('services-container').querySelectorAll('.service-desc'); i[i.length - 1].focus(); });
$('preventivo-form').addEventListener('input', () => segna(true));
$('preventivo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const packageType = $('package-type').value, v = (id) => $(id).value;
    const listaServizi = [];
    if (packageType === 'custom') {
        let manca = false;
        document.querySelectorAll('.service-row').forEach(row => {
            const desc = row.querySelector('.service-desc').value.trim(), pVal = row.querySelector('.service-price').value;
            if (!desc) { if (pVal !== '') manca = true; return; }     // le righe vuote si ignorano
            listaServizi.push({ descrizione: desc, prezzo: pVal !== '' ? parseFloat(pVal) : null });
        });
        if (manca) { avviso('Una voce ha il prezzo ma non la descrizione.'); return; }
        if (!listaServizi.length) { avviso('Aggiungi almeno un\'attività.'); return; }
    }
    const dati = {
        clientName: v('client-name'), clientCf: v('client-cf'), clientVat: v('client-vat'), clientStreet: v('client-street'), clientCityZip: v('client-city-zip'),
        expiryDate: v('expiry-date'), packageType, servizi: listaServizi, totale: v('monthly-price'),
        durataMesi: v('agreement-months'), durataPeriodo: v('agreement-period'), durata: `${v('agreement-months')} / ${v('agreement-period')}`, mensile: v('monthly-price')
    };
    const b = $('btn-salva'); b.disabled = true; $('stato').textContent = 'Salvo…';
    try {
        if (corrente) {
            await updateDoc(doc(db, "preventivi", corrente.id), dati); Object.assign(corrente, dati); sporco = false; renderEditor(); avviso('Preventivo salvato.');
        } else {
            const ref = await addDoc(collection(db, "preventivi"), { ...dati, createdAt: new Date().toISOString() });
            sporco = false; window.location.href = `?id=${encodeURIComponent(ref.id)}`;
        }
    } catch (error) { console.error(error); $('stato').textContent = 'Modifiche non salvate.'; avviso('Salvataggio non riuscito. ' + erroreTesto(error)); }
    finally { b.disabled = false; }
});
$('btn-duplica').addEventListener('click', async () => {
    try {
        const { id, ...resto } = corrente;
        const ref = await addDoc(collection(db, "preventivi"), { ...resto, clientName: `${corrente.clientName} (copia)`, createdAt: new Date().toISOString() });
        sporco = false; window.location.href = `?id=${encodeURIComponent(ref.id)}`;
    } catch (err) { console.error(err); avviso('Duplicazione non riuscita. ' + erroreTesto(err)); }
});
$('btn-elimina').addEventListener('click', async () => {
    if (!(await conferma(`Il preventivo per "${corrente.clientName}" verrà eliminato e il suo link smetterà di funzionare. L'azione non si può annullare.`, 'Elimina il preventivo', 'Eliminare il preventivo?'))) return;
    try { sporco = false; await deleteDoc(doc(db, "preventivi", corrente.id)); window.location.href = './'; }
    catch (err) { console.error(err); avviso('Preventivo non eliminato. ' + erroreTesto(err)); }
});

// ---------- vista del cliente ----------
async function caricaVistaCliente(dataDoc, docRef, admin) {
    const contentArea = $('client-content-area');
    document.title = `Proposta per ${dataDoc.clientName || ''} | Teo Macauda`;
    if (scaduto(dataDoc)) {
        $('client-view-title').textContent = 'Proposta scaduta'; $('client-view-date').textContent = '';
        contentArea.innerHTML = admin ? '<p class="pv-scaduto">Questo preventivo è scaduto: il cliente non lo vede più. (Dall\'anteprima non lo rimuovo.)</p>' : '<p class="pv-scaduto">Questo link di proposta commerciale è scaduto.</p>';
        $('btn-download-pdf').hidden = true; mostra('section-client'); avviaRivelazioni(); return;
    }
    datiPreventivoCorrente = dataDoc;
    $('client-view-title').textContent = `Proposta per ${dataDoc.clientName}`;
    const dataFormattata = new Date(dataDoc.expiryDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    $('client-view-date').textContent = `Termini validi fino al ${dataFormattata}`;
    const d = dataDoc, up = (s) => esc(String(s || '').toUpperCase());
    let html = `<div class="pv-anag"><div><span class="e">Fornitore</span><b>Matteo Maria Macauda</b><small>C.F.: MCDMTM04H18I754Q</small><small>P.IVA: 02153520891</small><small>Via teofane 2, 96100, Siracusa (SR)</small></div>
        <div><span class="e">Cliente</span><b>${up(d.clientName)}</b>${d.clientCf ? `<small>C.F.: ${up(d.clientCf)}</small>` : ''}${d.clientVat ? `<small>P.IVA: ${up(d.clientVat)}</small>` : ''}${d.clientStreet ? `<small>${up(d.clientStreet)}</small>` : ''}${d.clientCityZip ? `<small>${up(d.clientCityZip)}</small>` : ''}</div></div>`;
    if (d.packageType === 'custom') {
        html += `<div class="pv-tab"><div class="t"><span>Descrizione attività</span><span>Importo</span></div>` + (d.servizi || []).map(s => `<div class="r"><span>${esc(s.descrizione)}</span><span>${(s.prezzo !== undefined && s.prezzo !== null) ? esc(formattaPrezzo(s.prezzo)) : '—'}</span></div>`).join('') + `</div>`;
    } else {
        const pkg = pacchettiPredefiniti[d.packageType];
        if (pkg) html += `<div class="pv-pacchetto"><h2>${esc(pkg.titolo)} — <em>${esc(pkg.sottotitolo)}</em></h2><p>"${esc(pkg.descrizione)}"</p><ul>${pkg.voci.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }
    const durataInfo = `${(d.durataMesi || '').toUpperCase()} / ${(d.durataPeriodo || '').toUpperCase()}`;
    html += `<div class="pv-riepilogo"><div><small>Durata accordo</small><strong>${esc(durataInfo)}</strong></div><div><small>Prezzo mensile (IVA incl.)</small><strong>${esc(formattaPrezzo(d.mensile))}</strong></div></div>`;
    contentArea.innerHTML = html;
    $('btn-download-pdf').hidden = false;
    $('btn-download-pdf').onclick = async () => {
        showLoader();
        try { await caricaPdfLib(); } catch (e) { hideLoader(); avviso('Non riesco a preparare il PDF: controlla la connessione e riprova.'); return; }
        generaFlatPDF();
    };
    mostra('section-client'); avviaRivelazioni();
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
function openCustomStep() {
    $('modal-step-auth').hidden = false;
    $('auth-modal').classList.add('on'); $('auth-modal').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeAuthModal() { $('auth-modal').classList.remove('on'); $('auth-modal').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
$('auth-modal').addEventListener('mousedown', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });
document.querySelectorAll('[data-chiudi-mod]').forEach(b => b.addEventListener('click', closeAuthModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('auth-modal').classList.contains('on') && !$('conf-modal').classList.contains('on')) closeAuthModal(); });
window.openAuthModal = openCustomStep;
window.closeAuthModal = closeAuthModal;

// ===================== da qui in poi: identico alla versione precedente =====================

async function generaFlatPDF() {
    if (!datiPreventivoCorrente) return;
    showLoader();

    try {
        const templateUrl = "template.pdf"; 
        const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        /* ==================================================================
           CONFIGURAZIONE COORDINATE METRICHE FLAT OVERLAY (SISTEMA BASE IN BASSO A SX)
           Foglio A4 standard: 595 x 842 punti tipografici.
           ================================================================== */
        
        // 1. Iniezione dati Anagrafici del Cliente (Spazio Destinatario in Alto a DX - tutti in grassetto)
        // Nome Cliente
        firstPage.drawText(datiPreventivoCorrente.clientName.toUpperCase(), { x: 350, y: 635, size: 11, font: fontBold, color: rgb(1, 1, 1) });
        
        let currentClientY = 610;
        // Codice Fiscale
        if (datiPreventivoCorrente.clientCf) {
            firstPage.drawText(`C.F.: ${datiPreventivoCorrente.clientCf.toUpperCase()}`, { x: 350, y: currentClientY, size: 9.5, font: fontBold, color: rgb(1, 1, 1) });
            currentClientY -= 25;
        }
        // Partita IVA (Opzionale)
        if (datiPreventivoCorrente.clientVat) {
            firstPage.drawText(`P.IVA: ${datiPreventivoCorrente.clientVat.toUpperCase()}`, { x: 350, y: currentClientY, size: 9.5, font: fontBold, color: rgb(1, 1, 1) });
            currentClientY -= 25;
        }
        // Residenza / Sede Legale (Riga 1: Via e Civico)
        if (datiPreventivoCorrente.clientStreet) {
            firstPage.drawText(datiPreventivoCorrente.clientStreet.toUpperCase(), { x: 350, y: currentClientY, size: 9.5, font: fontBold, color: rgb(1, 1, 1) });
            currentClientY -= 25;
        }
        // Residenza / Sede Legale (Riga 2: CAP, Città e Provincia)
        if (datiPreventivoCorrente.clientCityZip) {
            firstPage.drawText(datiPreventivoCorrente.clientCityZip.toUpperCase(), { x: 350, y: currentClientY, size: 9.5, font: fontBold, color: rgb(1, 1, 1) });
        }
        
        // 2. Iniezione Data di emissione dell'accordo (Centrata nel box e in grassetto)
        const dataOggi = new Date().toLocaleDateString('it-IT');
        const dateWidth = fontBold.widthOfTextAtSize(dataOggi, 10);
        const xCentrataDate = 485 - (dateWidth / 2);
        firstPage.drawText(dataOggi, { x: xCentrataDate, y: 718, size: 10, font: fontBold, color: rgb(1, 1, 1) });

        // 3. Rendering del Corpo Centrale (Descrizione Fornitura / Pacchetto)
        let currentY = 415;
        const rigaSpazio = 26; 

        // Il totale nel PDF corrisponde allo stesso valore del prezzo mensile
        const prezzoMensileVal = formattaPrezzo(datiPreventivoCorrente.mensile);
        const totaleValStr = prezzoMensileVal;

        if (datiPreventivoCorrente.packageType === 'custom') {
            firstPage.drawText("PACCHETTO CUSTOM — CONFIGURAZIONE SU MISURA", { x: 75, y: currentY, size: 13, font: fontBold, color: rgb(1.0, 0.48, 0.0) });
            currentY -= rigaSpazio;

            datiPreventivoCorrente.servizi.forEach((s) => {
                if (currentY < 200) return; // Protezione per non collidere con i blocchi economici in basso
                
                const descCorta = s.descrizione.length > 70 ? s.descrizione.substring(0, 67) + "..." : s.descrizione;
                firstPage.drawText(`• ${descCorta}`, { x: 75, y: currentY, size: 11, font: fontBold, color: rgb(1, 1, 1) });
                
                if (s.prezzo !== undefined && s.prezzo !== null) {
                    const prezzoTxt = formattaPrezzo(s.prezzo);
                    const xPrice = 520 - fontBold.widthOfTextAtSize(prezzoTxt, 11);
                    firstPage.drawText(prezzoTxt, { x: xPrice, y: currentY, size: 11, font: fontBold, color: rgb(0.66, 0.66, 0.66) });
                }
                currentY -= rigaSpazio;
            });
        } else {
            const pkg = pacchettiPredefiniti[datiPreventivoCorrente.packageType];
            firstPage.drawText(`${pkg.titolo} — ${pkg.sottotitolo}`, { x: 75, y: currentY, size: 13, font: fontBold, color: rgb(1.0, 0.48, 0.0) });
            currentY -= rigaSpazio;

            pkg.voci.forEach(v => {
                if (currentY < 200) return;
                firstPage.drawText(`• ${v}`, { x: 75, y: currentY, size: 11, font: fontBold, color: rgb(1, 1, 1) });
                currentY -= rigaSpazio;
            });
        }

        // 4. Iniezione Campi Economici di Chiusura
        // Durata complessiva dell'accordo (Centrata orizzontalmente su due righe per evitare overflow)
        // Larghezza box: ~195 pt (da x=55 a x=250), Centro = 152.5
        const durataMesiText = (datiPreventivoCorrente.durataMesi || "").toUpperCase();
        const widthMesi = fontBold.widthOfTextAtSize(durataMesiText, 11);
        const xCentratoMesi = 152.5 - (widthMesi / 2);
        firstPage.drawText(durataMesiText, { x: xCentratoMesi, y: 115, size: 11, font: fontBold, color: rgb(1.0, 0.48, 0.0) });

        const durataPeriodoText = (datiPreventivoCorrente.durataPeriodo || "").toUpperCase();
        const widthPeriodo = fontBold.widthOfTextAtSize(durataPeriodoText, 9.5);
        const xCentratoPeriodo = 152.5 - (widthPeriodo / 2);
        firstPage.drawText(durataPeriodoText, { x: xCentratoPeriodo, y: 98, size: 9.5, font: fontBold, color: rgb(1.0, 0.48, 0.0) });
        
        // Totale:
        const xTotale = 520 - fontBold.widthOfTextAtSize(totaleValStr, 13);
        firstPage.drawText(totaleValStr, { x: xTotale, y: 148, size: 13, font: fontBold, color: rgb(1, 1, 1) });
        
        // Prezzo Mensile (IVA Incl.):
        const xMensile = 520 - fontBold.widthOfTextAtSize(prezzoMensileVal, 14);
        firstPage.drawText(prezzoMensileVal, { x: xMensile, y: 78, size: 14, font: fontBold, color: rgb(1.0, 0.48, 0.0) });

        // Esportazione e Download del Blob flat finale
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Accordo_${datiPreventivoCorrente.clientName.replace(/\s+/g, '_')}.pdf`;
        link.click();
    } catch (error) {
        console.error(error);
        alert("Errore compilazione PDF.");
    } finally {
        hideLoader();
    }
}
