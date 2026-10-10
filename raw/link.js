/* Indice dei link + backup. Modulo comune a tutti i tool.
   - trovaPerLink(): trova il documento di un link leggendo l'indice "link" (lettura diretta, non serve poter sfogliare l'archivio);
     se l'indice non c'è ancora, usa la vecchia ricerca per nome, così nulla si rompe durante il passaggio.
   - addDocLink(): come addDoc, ma per i documenti con un indirizzo (slug) aggiunge da solo la riga nell'indice.
   - sincronizza(): aggiunge all'indice i link che mancano (non modifica nessun documento).
   - backup(): salva sul Mac tutti i dati in un file; non crea copie su Firebase. */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDObANtROtJZiReey0mKzwN4m0oKoCrcOY",
    authDomain: "script-sito.firebaseapp.com",
    projectId: "script-sito",
    storageBucket: "script-sito.firebasestorage.app",
    messagingSenderId: "863535754551",
    appId: "G-7YHRQZCNMN"
};
const RACCOLTE = ['pianiEditoriali', 'scripts', 'hubClienti', 'reportMensili', 'consegneVideo', 'revisions', 'videoAudits'];
const TUTTE = [...RACCOLTE, 'preventivi', 'reviews', 'link'];
const fb = () => { const app = getApps().length ? getApp() : initializeApp(firebaseConfig); return { auth: getAuth(app), db: getFirestore(app) }; };
const chiave = (c, slug) => `${c}__${slug}`;

export async function trovaPerLink(coll, slug) {
    const { db } = fb();
    try {
        const l = await getDoc(doc(db, "link", chiave(coll, slug)));
        if (l.exists() && l.data().id) { const d = await getDoc(doc(db, coll, l.data().id)); if (d.exists()) return { empty: false, docs: [d] }; }
    } catch (e) { /* indice non ancora disponibile: si usa la ricerca per nome */ }
    return getDocs(query(collection(db, coll), where("slug", "==", slug)));
}

export async function addDocLink(c, dati) {
    const ref = await addDoc(c, dati);
    try {
        if (dati && dati.slug && RACCOLTE.includes(c.id)) { const { db } = fb(); await setDoc(doc(db, "link", chiave(c.id, dati.slug)), { c: c.id, id: ref.id }); }
    } catch (e) { console.error('indice link:', e); }
    return ref;
}

function utente() {
    const { auth } = fb();
    return new Promise((res) => { const off = onAuthStateChanged(auth, (u) => { off(); res(u); }); });
}
function avvisa(testo, durata = 5200) {
    let t = document.getElementById('raw-avviso');
    if (!t) { t = document.createElement('div'); t.id = 'raw-avviso'; t.setAttribute('role', 'status'); t.style.cssText = 'position:fixed;z-index:500;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(92vw,520px);padding:14px 22px;border-radius:999px;background:rgba(20,20,20,.9);color:#fff;border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);font:500 .92rem "Instrument Sans",system-ui,sans-serif;text-align:center;box-shadow:0 18px 40px -18px #000'; document.body.appendChild(t); }
    t.textContent = testo; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, durata);
}

export async function sincronizza() {
    const { db } = fb();
    const esistenti = new Set(); (await getDocs(collection(db, "link"))).forEach(d => esistenti.add(d.id));
    let nuovi = 0, totale = 0;
    for (const c of RACCOLTE) {
        const s = await getDocs(collection(db, c));
        for (const d of s.docs) {
            const x = d.data(); if (!x.slug || x.isHub === true) continue; totale++;
            const k = chiave(c, x.slug);
            if (!esistenti.has(k)) { await setDoc(doc(db, "link", k), { c, id: d.id }); esistenti.add(k); nuovi++; }
        }
    }
    return { nuovi, totale };
}
// rete di sicurezza: una volta ogni 12 ore, aggiunge in silenzio i link che mancano (solo se sei loggato)
export async function sincronizzaSeServe() {
    try {
        const u = await utente(); if (!u) return;
        const ultimo = parseInt(localStorage.getItem('link_sync') || '0', 10);
        if (Date.now() - ultimo < 12 * 36e5) return;
        await sincronizza(); localStorage.setItem('link_sync', String(Date.now()));
    } catch (e) { console.error('sincronizzazione link:', e); }
}
export async function eseguiSincronizza() {
    try {
        if (!(await utente())) { avvisa('Prima accedi come admin da uno dei tool.'); return; }
        avvisa('Controllo i link…', 20000);
        const r = await sincronizza(); localStorage.setItem('link_sync', String(Date.now()));
        avvisa(r.nuovi ? `Fatto: ${r.nuovi} link aggiunti all'indice (su ${r.totale}).` : `Tutto a posto: tutti i ${r.totale} link sono già nell'indice.`, 7000);
    } catch (e) { console.error(e); avvisa('Non riuscito: ' + (e && e.code === 'permission-denied' ? 'le regole di Firebase non permettono ancora di scrivere l\'indice (vedi le regole nuove).' : (e && e.message || e))); }
}

export async function eseguiBackup() {
    try {
        if (!(await utente())) { avvisa('Prima accedi come admin da uno dei tool.'); return; }
        const { db } = fb(); avvisa('Preparo il backup…', 60000);
        const fuori = { creato: new Date().toISOString(), progetto: 'script-sito', raccolte: {} }; let n = 0;
        for (const c of TUTTE) {
            try { const s = await getDocs(collection(db, c)); fuori.raccolte[c] = s.docs.map(d => ({ id: d.id, dati: d.data() })); n += s.docs.length; }
            catch (e) { fuori.raccolte[c] = { errore: String(e && e.code || e) }; }
        }
        const testo = JSON.stringify(fuori, (k, v) => (v && typeof v.toDate === 'function') ? v.toDate().toISOString() : v);
        const nome = `backup-raw-${new Date().toLocaleDateString('sv-SE')}.json`;
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([testo], { type: 'application/json' })); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
        avvisa(`Backup salvato: ${n} documenti nel file ${nome}.`, 8000);
    } catch (e) { console.error(e); avvisa('Backup non riuscito: ' + (e && e.message || e)); }
}
