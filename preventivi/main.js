import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { PDFDocument, StandardFonts, rgb } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

// Configurazione Firebase speculare al tuo progetto principale
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

// Elementi DOM globale
const loaderEl = document.getElementById('main-loader');
const authSection = document.getElementById('section-auth');
const adminSection = document.getElementById('section-admin');
const clientSection = document.getElementById('section-client');

// Analisi URL per Routing (?id=...)
const urlParams = new URLSearchParams(window.location.search);
const preventivoId = urlParams.get('id');

let datiPreventivoCorrente = null; // Cache per i dati scaricati lato client

// Controllo Stato Iniziale dell'Applicazione
window.addEventListener('DOMContentLoaded', async () => {
    if (preventivoId) {
        // Modalità Cliente: Carica i dati dal DB
        await caricaVistaCliente(preventivoId);
    } else {
        // Modalità Admin: Verifica Autenticazione
        onAuthStateChanged(auth, (user) => {
            hideLoader();
            if (user) {
                showSection(adminSection);
                setupAdminLogic();
            } else {
                showSection(authSection);
                setupAuthLogic();
            }
        });
    }
});

/* ==========================================================================
   LOGICA DI ROUTING & UI UTILS
   ========================================================================== */
function hideLoader() { loaderEl.classList.add('opacity-0', 'pointer-events-none'); }
function showLoader() { loaderEl.classList.remove('opacity-0', 'pointer-events-none'); }

function showSection(section) {
    authSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    clientSection.classList.add('hidden');
    section.classList.remove('hidden');
}

/* ==========================================================================
   LOGICA AUTH (ADMIN LOGIN)
   ========================================================================== */
function setupAuthLogic() {
    const form = document.getElementById('auth-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Credenziali non valide. Riprova.");
            hideLoader();
        }
    });
}

/* ==========================================================================
   LOGICA STRUTTURA ADMIN (CREAZIONE PREVENTIVI)
   ========================================================================== */
function setupAdminLogic() {
    // Gestione Logout
    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

    // Aggiunta dinamica righe servizi
    const container = document.getElementById('services-container');
    document.getElementById('btn-add-service').addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = "service-row grid grid-cols-12 gap-3 items-center animate-fade-in";
        row.innerHTML = `
            <div class="col-span-8 md:col-span-9">
                <input type="text" placeholder="Descrizione del servizio..." required class="service-desc w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent">
            </div>
            <div class="col-span-3 md:col-span-2">
                <input type="number" placeholder="Prezzo" required class="service-price w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent">
            </div>
            <div class="col-span-1 flex justify-center">
                <button type="button" class="btn-remove-row text-red-400 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
        lucide.createIcons();
        
        // Listener eliminazione riga appena creata
        row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
    });

    // Listener eliminazione prima riga di default
    document.querySelector('.btn-remove-row').addEventListener('click', (e) => {
        if(document.querySelectorAll('.service-row').length > 1) {
            e.currentTarget.closest('.service-row').remove();
        } else {
            alert("Devi inserire almeno un servizio.");
        }
    });

    // Invio Form -> Salvataggio su Firestore
    document.getElementById('preventivo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();

        const clientName = document.getElementById('client-name').value;
        const expiryDate = document.getElementById('expiry-date').value;
        
        const rows = document.querySelectorAll('.service-row');
        let listaServizi = [];
        let totale = 0;

        rows.forEach(row => {
            const desc = row.querySelector('.service-desc').value;
            const price = parseFloat(row.querySelector('.service-price').value) || 0;
            listaServizi.push({ descrizione: desc, prezzo: price });
            totale += price;
        });

        try {
            // Invio al database dei preventivi
            const docRef = await addDoc(collection(db, "preventivi"), {
                clientName,
                expiryDate,
                servizi: listaServizi,
                totale: totale,
                createdAt: new Date().toISOString()
            });

            // Generazione URL Cliente
            const shareableUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            document.getElementById('generated-url').value = shareableUrl;
            document.getElementById('output-link-box').classList.remove('hidden');
            
            // Auto-scroll sul link generato
            document.getElementById('output-link-box').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error("Errore salvataggio:", error);
            alert("Errore durante il salvataggio del preventivo.");
        } finally {
            hideLoader();
        }
    });

    // Copia Link rapida negli appunti
    document.getElementById('btn-copy-link').addEventListener('click', () => {
        const inputUrl = document.getElementById('generated-url');
        inputUrl.select();
        navigator.clipboard.writeText(inputUrl.value);
        alert("Link copiato negli appunti!");
    });
}

/* ==========================================================================
   LOGICA STRUTTURA CLIENTE (FETCH & RENDER ANTEPRIMA)
   ========================================================================== */
async function caricaVistaCliente(id) {
    try {
        const docRef = doc(db, "preventivi", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            datiPreventivoCorrente = docSnap.data();
            showSection(clientSection);

            // Popolamento UI ad alta leggibilità
            document.getElementById('client-view-title').innerText = `Piano Finanziario: ${datiPreventivoCorrente.clientName}`;
            
            const dataFormattata = new Date(datiPreventivoCorrente.expiryDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('client-view-date').innerText = `Validità fino al ${dataFormattata}`;
            document.getElementById('client-view-total').innerText = `€ ${datiPreventivoCorrente.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`.replace(/\,/g,'.');

            const listContainer = document.getElementById('client-services-list');
            listContainer.innerHTML = '';
            
            datiPreventivoCorrente.servizi.forEach(servizio => {
                const item = document.createElement('div');
                item.className = "grid grid-cols-12 px-4 py-4 text-sm items-center hover:bg-white/[0.01] transition-colors";
                item.innerHTML = `
                    <div class="col-span-9 font-medium text-white/90 pr-2">${servizio.descrizione}</div>
                    <div class="col-span-3 text-right text-grayText font-mono">€ ${servizio.prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                `;
                listContainer.appendChild(item);
            });

            // Associa evento download al PDF flat overlay
            document.getElementById('btn-download-pdf').addEventListener('click', generaFlatPDF);

        } else {
            alert("Il preventivo richiesto non esiste o è scaduto.");
            window.location.search = ""; // reset router
        }
    } catch (error) {
        console.error("Errore fetch cliente:", error);
        alert("Impossibile caricare il preventivo.");
    } finally {
        hideLoader();
    }
}

/* ==========================================================================
   CORE ENGINE: GENERAZIONE PDF FLAT-OVERLAY (pdf-lib)
   ========================================================================== */
async function generaFlatPDF() {
    if (!datiPreventivoCorrente) return;
    showLoader();

    try {
        // 1. Scarica il template grafico (Assicurati di caricare il file 'template.pdf' nella stessa cartella)
        const templateUrl = "template.pdf"; 
        const existingPdfBytes = await fetch(templateUrl).then(res => {
            if (!res.ok) throw new Error("Template PDF grafico non trovato sul server.");
            return res.arrayBuffer();
        });

        // 2. Inizializza pdf-lib caricando il file immodificabile
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Definizione Font nativi (Standard 14)
        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        /* ==================================================================
           ATTENZIONE: COORDINATE (X, Y)
           Nel sistema pdf-lib l'origine (0,0) si trova in BASSO A SINISTRA.
           Un foglio A4 standard misura circa Larghezza: 595pt, Altezza: 842pt.
           ================================================================== */
        
        // Scrittura Anagrafica Cliente
        firstPage.drawText(datiPreventivoCorrente.clientName.toUpperCase(), { x: 75, y: 640, size: 12, font: fontBold, color: rgb(0.05, 0.05, 0.05) });
        
        const scadenzaTxt = new Date(datiPreventivoCorrente.expiryDate).toLocaleDateString('it-IT');
        firstPage.drawText(scadenzaTxt, { x: 75, y: 620, size: 10, font: fontReg, color: rgb(0.4, 0.4, 0.4) });

        // Scrittura Dinamica delle Voci Servizio
        let currentY = 540; // Punto iniziale di inizio tabella del tuo template grafico
        const rigaSpazio = 25; // Spazio verticale (interlinea) tra le righe

        datiPreventivoCorrente.servizi.forEach((servizio) => {
            // Descrizione Servizio (Truncate se troppo lunga per non rompere il layout)
            const descCorta = servicio.descrizione.length > 55 ? servizio.descrizione.substring(0, 52) + "..." : servizio.descrizione;
            firstPage.drawText(descCorta, { x: 75, y: currentY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
            
            // Prezzo Servizio (allineato a destra, es. coordinata X fissa a 480)
            const prezzoTxt = `€ ${servizio.prezzo.toFixed(2)}`;
            firstPage.drawText(prezzoTxt, { x: 480, y: currentY, size: 10, font: fontReg, color: rgb(0.2, 0.2, 0.2) });

            currentY -= rigaSpazio; // Abbassa il cursore per la prossima riga
        });

        // Scrittura Totale Finale (Posizionata in basso a destra sopra il blocco dedicato del template)
        const totaleTxt = `€ ${datiPreventivoCorrente.totale.toFixed(2)}`;
        firstPage.drawText(totaleTxt, { x: 480, y: 220, size: 14, font: fontBold, color: rgb(0.0, 0.33, 1.0) }); // Colore accent (RGB normalizzato 0-1)

        // 3. Compila, appiattisce ed esporta il Blob finale
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        // 4. Download automatico lato client
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Preventivo_${datiPreventivoCorrente.clientName.replace(/\s+/g, '_')}.pdf`;
        link.click();

    } catch (error) {
        console.error("Errore generazione PDF:", error);
        alert("Errore durante l'iniezione dati nel PDF: " + error.message);
    } finally {
        hideLoader();
    }
}
