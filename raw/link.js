/* Indice dei link + backup. Modulo comune a tutti i tool.
   - trovaPerLink(): trova il documento di un link leggendo l'indice "link" (lettura diretta, non serve poter sfogliare l'archivio);
     se l'indice non c'è ancora, usa la vecchia ricerca per nome, così nulla si rompe durante il passaggio.
   - addDocLink(): come addDoc, ma per i documenti con un indirizzo (slug) aggiunge da solo la riga nell'indice.
   - sincronizza(): aggiunge all'indice i link che mancano (non modifica nessun documento).
   - backup(): salva sul Mac tutti i dati in un file; non crea copie su Firebase. */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

export async function trovaPerLink(coll, slug, titolo) {
    const { db } = fb();
    try {
        // indirizzo corto e leggibile: ?v=cliente&p=titolo  → riga "collezione__cliente__titolo"; altrimenti il vecchio indirizzo → "collezione__indirizzo"
        const k = titolo ? `${coll}__${slug}__${titolo}` : chiave(coll, slug);
        const l = await getDoc(doc(db, "link", k));
        if (l.exists() && l.data().id) { const d = await getDoc(doc(db, l.data().c || coll, l.data().id)); if (d.exists()) return { empty: false, docs: [d] }; }
    } catch (e) { /* indice non ancora disponibile: si usa la ricerca per nome */ }
    if (titolo) return { empty: true, docs: [] };
    return getDocs(query(collection(db, coll), where("slug", "==", slug)));
}

// ---------- indirizzi corti e leggibili: /strumento/?v=cliente&p=titolo ----------
const CAMPO_TITOLO = { reportMensili: 'title', consegneVideo: 'deliveryTitle', revisions: 'title', scripts: 'title' };
export function slugTesto(t, max) {
    let s = String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+|-+$/g, '');
    if (max && s.length > max) { s = s.slice(0, max); const i = s.lastIndexOf('-'); if (i > max * 0.5) s = s.slice(0, i); }
    return s;
}
const unico = (base, usati) => { let t = base, n = 2; while (usati.has(t)) t = `${base}-${n++}`; return t; };
async function indice(db, k, c, id) { try { const r = doc(db, "link", k), x = await getDoc(r); if (!x.exists() || x.data().id !== id) await setDoc(r, { c, id }); } catch (e) { console.error('indice link:', e); } }

async function allineaCliente(db, ref, id, d) {
    if (!d || d.isHub === true) return null;
    let breve = d.slugBreve;
    if (!breve) {
        const base = slugTesto(d.clientName || 'cliente', 40) || 'cliente';
        for (let n = 1; n < 200; n++) {
            const cand = n === 1 ? base : `${base}-${n}`;
            const q = await getDocs(query(collection(db, "pianiEditoriali"), where("slugBreve", "==", cand)));
            const altro = q.docs.some(x => x.id !== id), k = await getDoc(doc(db, "link", chiave('pianiEditoriali', cand)));
            if (!altro && !(k.exists() && k.data().id !== id)) { breve = cand; break; }
        }
        await updateDoc(ref, { slugBreve: breve });
    }
    await indice(db, chiave('pianiEditoriali', breve), 'pianiEditoriali', id);
    return { v: breve };
}
// Per un documento con cliente (report, consegna, revisione, script): assegna cliente + titolo leggibili, aggiorna l'indice e restituisce { v, p }.
// I vecchi indirizzi restano nell'indice, quindi i link già mandati continuano ad aprire lo stesso documento.
export async function allinea(coll, id) {
    try {
        const { db } = fb(), ref = doc(db, coll, id), snap = await getDoc(ref); if (!snap.exists()) return null;
        const d = snap.data();
        if (coll === 'pianiEditoriali') return await allineaCliente(db, ref, id, d);
        if (!CAMPO_TITOLO[coll] || !d.clienteId) return null;
        const cs = await getDoc(doc(db, "pianiEditoriali", d.clienteId)); if (!cs.exists()) return null;
        let breve = cs.data().slugBreve;
        if (!breve) { const r = await allineaCliente(db, cs.ref, cs.id, cs.data()); breve = r && r.v; }
        if (!breve) return null;
        let base = slugTesto(d[CAMPO_TITOLO[coll]], 48);
        if (base.startsWith(breve + '-')) base = base.slice(breve.length + 1);
        if (!base || base === breve) base = 'principale';
        const altri = await getDocs(query(collection(db, coll), where("clienteId", "==", d.clienteId)));
        const usati = new Set(); altri.forEach(x => { if (x.id !== id && x.data().slugTitolo) usati.add(x.data().slugTitolo); });
        let p = d.slugTitolo;
        const coerente = p && d.slugCliente === breve && (p === base || (p.startsWith(base + '-') && /-\d+$/.test(p))) && !usati.has(p);
        if (!coerente) p = unico(base, usati);
        if (d.slugCliente !== breve || d.slugTitolo !== p) await updateDoc(ref, { slugCliente: breve, slugTitolo: p });
        await indice(db, `${coll}__${breve}__${p}`, coll, id);
        return { v: breve, p };
    } catch (e) { console.error('indirizzi leggibili:', e); return null; }
}
// indirizzo leggibile di un documento (se ce l'ha), sulla pagina di quel tool o su una base data
export function urlLeggibile(coll, d, base) {
    const b = base || (window.location.origin + window.location.pathname);
    if (!d) return '';
    if (coll === 'pianiEditoriali') return d.slugBreve ? `${b}?v=${encodeURIComponent(d.slugBreve)}` : '';
    return d.slugCliente && d.slugTitolo ? `${b}?v=${encodeURIComponent(d.slugCliente)}&p=${encodeURIComponent(d.slugTitolo)}` : '';
}
// mostra nella barra del browser l'indirizzo leggibile, senza ricaricare (p non indicato = lascia com'è)
export function mostraUrl(v, p) {
    try { const u = new URL(window.location.href); if (v) u.searchParams.set('v', v); if (p === null) u.searchParams.delete('p'); else if (p) u.searchParams.set('p', p); history.replaceState(null, '', u); } catch (e) {}
}
// da admin: allinea il documento e aggiorna i campi e la barra del browser; restituisce l'indirizzo da copiare
export async function preparaAdmin(coll, d) {
    const r = await allinea(coll, d.id);
    if (r) { if (coll === 'pianiEditoriali') { d.slugBreve = r.v; mostraUrl(r.v); } else { d.slugCliente = r.v; d.slugTitolo = r.p; mostraUrl(r.v, r.p); } }
    return urlLeggibile(coll, d);
}

export async function addDocLink(c, dati) {
    const ref = await addDoc(c, dati);
    try {
        if (dati && dati.slug && RACCOLTE.includes(c.id)) { const { db } = fb(); await setDoc(doc(db, "link", chiave(c.id, dati.slug)), { c: c.id, id: ref.id }); }
        if (c.id === 'pianiEditoriali' || CAMPO_TITOLO[c.id]) await allinea(c.id, ref.id);
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
    let nuovi = 0, totale = 0, leggibili = 0;
    // 1) indirizzi corti e leggibili: prima i clienti, poi i loro elementi (aggiunge solo campi nuovi, non cambia nulla del resto)
    const pc = await getDocs(collection(db, "pianiEditoriali"));
    for (const d of pc.docs) { const x = d.data(); if (x.isHub === true || x.slugBreve) continue; if (await allinea('pianiEditoriali', d.id)) leggibili++; }
    for (const c of Object.keys(CAMPO_TITOLO)) {
        const sc = await getDocs(collection(db, c));
        for (const d of sc.docs) { const x = d.data(); if (!x.clienteId) continue; if (await allinea(c, d.id)) { if (!x.slugTitolo) leggibili++; } }
    }
    // 2) indice dei vecchi indirizzi: aggiunge quelli che mancano
    const esist2 = new Set(); (await getDocs(collection(db, "link"))).forEach(d => esist2.add(d.id));
    for (const c of RACCOLTE) {
        const s = await getDocs(collection(db, c));
        for (const d of s.docs) {
            const x = d.data(); if (!x.slug || x.isHub === true) continue; totale++;
            const k = chiave(c, x.slug);
            if (!esist2.has(k)) { await setDoc(doc(db, "link", k), { c, id: d.id }); esist2.add(k); nuovi++; }
        }
    }
    return { nuovi, totale, leggibili };
}
// rete di sicurezza: una volta ogni 12 ore, aggiunge in silenzio i link che mancano (solo se sei loggato)
export async function sincronizzaSeServe() {
    try {
        const u = await utente(); if (!u) return;
        const ultimo = parseInt(localStorage.getItem('link_sync2') || '0', 10);
        if (Date.now() - ultimo < 12 * 36e5) return;
        await sincronizza(); localStorage.setItem('link_sync2', String(Date.now()));
    } catch (e) { console.error('sincronizzazione link:', e); }
}
export async function eseguiSincronizza() {
    try {
        if (!(await utente())) { avvisa('Prima accedi come admin da uno dei tool.'); return; }
        avvisa('Controllo i link…', 20000);
        const r = await sincronizza(); localStorage.setItem('link_sync2', String(Date.now()));
        avvisa(`Fatto. ${r.leggibili ? r.leggibili + ' indirizzi leggibili assegnati. ' : ''}${r.nuovi ? r.nuovi + ' link aggiunti all\'indice. ' : ''}${!r.leggibili && !r.nuovi ? 'Tutto a posto: ' : ''}${r.totale} link nell'indice.`, 8000);
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
