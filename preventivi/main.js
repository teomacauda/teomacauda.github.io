import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { PDFDocument, StandardFonts, rgb } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

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

const loaderEl = document.getElementById('main-loader');
const authSection = document.getElementById('section-auth');
const adminSection = document.getElementById('section-admin');
const clientSection = document.getElementById('section-client');
const packageTypeSelect = document.getElementById('package-type');
const customServicesSection = document.getElementById('custom-services-section');
const totalPriceInput = document.getElementById('total-price-input');
const durationInput = document.getElementById('agreement-duration');
const monthlyPriceInput = document.getElementById('monthly-price');

const urlParams = new URLSearchParams(window.location.search);
const preventivoId = urlParams.get('id');

let datiPreventivoCorrente = null; 

window.addEventListener('DOMContentLoaded', async () => {
    if (preventivoId) {
        await caricaVistaCliente(preventivoId);
    } else {
        onAuthStateChanged(auth, (user) => {
            hideLoader();
            if (user) {
                document.getElementById('admin-indicator').classList.remove('hidden');
                showSection(adminSection);
                setupAdminLogic();
            } else {
                document.getElementById('admin-indicator').classList.add('hidden');
                showSection(authSection);
                setupAuthLogic();
            }
        });
    }
});

function hideLoader() { loaderEl.classList.add('opacity-0', 'pointer-events-none'); setTimeout(() => loaderEl.classList.add('hidden'), 300); }
function showLoader() { loaderEl.classList.remove('hidden', 'opacity-0', 'pointer-events-none'); }

function showSection(section) {
    authSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    clientSection.classList.add('hidden');
    section.classList.remove('hidden');
}

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
            alert("Rifiutato.");
            hideLoader();
        }
    });
}

function setupAdminLogic() {
    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

    packageTypeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            customServicesSection.classList.remove('hidden');
            totalPriceInput.value = "";
        } else {
            customServicesSection.classList.add('hidden');
            totalPriceInput.value = pacchettiPredefiniti[val].investimentoDefault;
        }
    });

    const container = document.getElementById('services-container');
    document.getElementById('btn-add-service').addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = "service-row grid grid-cols-12 gap-3 items-center";
        row.innerHTML = `
            <div class="col-span-8 md:col-span-9">
                <input type="text" placeholder="Dettagli attività..." required class="service-desc w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent">
            </div>
            <div class="col-span-3 md:col-span-2">
                <input type="number" step="0.01" placeholder="Opzionale" class="service-price w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent">
            </div>
            <div class="col-span-1 flex justify-center">
                <button type="button" class="btn-remove-row text-red-500 hover:text-red-400 transition-colors">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
        lucide.createIcons();
        row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
    });

    document.getElementById('preventivo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();

        const clientName = document.getElementById('client-name').value;
        const expiryDate = document.getElementById('expiry-date').value;
        const packageType = packageTypeSelect.value;
        const totaleStr = totalPriceInput.value;
        const durataStr = durationInput.value;
        const mensileStr = monthlyPriceInput.value;

        let listaServizi = [];
        if (packageType === 'custom') {
            document.querySelectorAll('.service-row').forEach(row => {
                const desc = row.querySelector('.service-desc').value;
                const pVal = row.querySelector('.service-price').value;
                const price = pVal !== "" ? parseFloat(pVal) : null;
                listaServizi.push({ descrizione: desc, prezzo: price });
            });
        }

        try {
            const docRef = await addDoc(collection(db, "preventivi"), {
                clientName,
                expiryDate,
                packageType,
                servizi: listaServizi,
                totale: totaleStr,
                durata: durataStr,
                mensile: mensileStr,
                createdAt: new Date().toISOString()
            });

            const shareableUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            document.getElementById('generated-url').value = shareableUrl;
            document.getElementById('output-link-box').classList.remove('hidden');
            document.getElementById('output-link-box').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            alert("Errore Firestore.");
        } finally {
            hideLoader();
        }
    });

    document.getElementById('btn-copy-link').addEventListener('click', () => {
        const inputUrl = document.getElementById('generated-url');
        inputUrl.select();
        navigator.clipboard.writeText(inputUrl.value);
        alert("Copiato.");
    });
}

async function caricaVistaCliente(id) {
    try {
        const docRef = doc(db, "preventivi", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dataDoc = docSnap.data();
            
            // Logica di auto-cancellazione nativa richiesta
            const oggiStr = new Date().toISOString().split('T')[0];
            if (dataDoc.expiryDate && oggiStr > dataDoc.expiryDate) {
                await deleteDoc(docRef); // Distrugge il record cloud
                contentArea.innerHTML = `<p class="text-red-500 font-bold text-center">Questo link di proposta commerciale è scaduto ed è stato rimosso.</p>`;
                showSection(clientSection);
                hideLoader();
                return;
            }

            datiPreventivoCorrente = dataDoc;
            showSection(clientSection);

            document.getElementById('client-view-title').innerText = `Proposta per: ${datiPreventivoCorrente.clientName}`;
            const dataFormattata = new Date(datiPreventivoCorrente.expiryDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('client-view-date').innerText = `Termini validi fino al ${dataFormattata}`;

            const contentArea = document.getElementById('client-content-area');
            contentArea.innerHTML = '';

            if (datiPreventivoCorrente.packageType === 'custom') {
                let tableHtml = `
                    <div class="border border-white/10 rounded-xl overflow-hidden bg-white/[0.01] mb-4">
                        <div class="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-graytext">
                            <div class="col-span-9">Descrizione Attività</div>
                            <div class="col-span-3 text-right">Importo</div>
                        </div>
                        <div class="divide-y divide-white/5">
                `;

                datiPreventivoCorrente.servizi.forEach(s => {
                    const prezzoTxt = (s.prezzo !== undefined && s.prezzo !== null) ? `€ ${s.prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : `—`;
                    tableHtml += `
                        <div class="grid grid-cols-12 px-4 py-4 text-sm items-center">
                            <div class="col-span-9 font-medium text-white/90 pr-2">${s.descrizione}</div>
                            <div class="col-span-3 text-right text-graytext font-mono">${prezzoTxt}</div>
                        </div>
                    `;
                });

                tableHtml += `
                        </div>
                    </div>
                `;
                contentArea.innerHTML = tableHtml;
            } else {
                const pkg = pacchettiPredefiniti[datiPreventivoCorrente.packageType];
                let pkgHtml = `
                    <div class="border border-white/10 rounded-2xl p-6 bg-white/[0.01] space-y-4 mb-4">
                        <h2 class="text-xl font-black text-white tracking-tight">${pkg.titolo} — <span class="text-accent">${pkg.sottotitolo}</span></h2>
                        <p class="text-sm text-white/70 italic">"${pkg.descrizione}"</p>
                        <ul class="space-y-2 pt-2">
                `;
                pkg.voci.forEach(v => {
                    pkgHtml += `<li class="text-sm flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent"></span>${v}</li>`;
                });
                pkgHtml += `</ul></div>`;
                contentArea.innerHTML = pkgHtml;
            }

            // Box riassuntivo metriche dell'accordo corrispondente alle voci del PDF
            let summaryBox = `
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-xl text-sm">
                    <div><span class="text-xs text-graytext block uppercase">Durata Accordo</span><strong class="text-white">${datiPreventivoCorrente.durata}</strong></div>
                    <div><span class="text-xs text-graytext block uppercase">Prezzo Mensile</span><strong class="text-white">${datiPreventivoCorrente.mensile}</strong></div>
                    <div><span class="text-xs text-graytext block uppercase">Valore Totale</span><strong class="text-accent text-base">${datiPreventivoCorrente.totale}</strong></div>
                </div>
            `;
            contentArea.insertAdjacentHTML('beforeend', summaryBox);

            document.getElementById('btn-download-pdf').addEventListener('click', generaFlatPDF);
        } else {
            alert("Non trovato.");
        }
    } catch (error) {
        console.error(error);
    } finally {
        hideLoader();
    }
}

async function generaFlatPDF() {
    if (!datiPreventivoCorrente) return;
    showLoader();

    try {
        const templateUrl = "template.pdf"; 
        const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // NOTA: Per un rendering pixel-perfect con i testi fissi esportati da Affinity,
        // carica e incorpora qui i file Inter-Regular.ttf e Inter-Bold.ttf nativi.
        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        /* ==================================================================
           CONFIGURAZIONE COORDINATE METRICHE FLAT OVERLAY (SISTEMA BASE IN BASSO A SX)
           Foglio A4 standard: 595 x 842 punti tipografici.
           ================================================================== */
        
        // 1. Iniezione dati Anagrafici del Cliente (Spazio Destinatario in Alto a DX)
        // Regola i valori x e y per centrarlo perfettamente sopra la riga di Affinity
        firstPage.drawText(datiPreventivoCorrente.clientName.toUpperCase(), { x: 345, y: 685, size: 10, font: fontBold, color: rgb(0, 0, 0) });
        
        // 2. Iniezione Data di emissione dell'accordo
        const dataOggi = new Date().toLocaleDateString('it-IT');
        firstPage.drawText(dataOggi, { x: 345, y: 642, size: 9, font: fontReg, color: rgb(0.2, 0.2, 0.2) });

        // 3. Rendering del Corpo Centrale (Descrizione Fornitura / Pacchetto)
        let currentY = 515;
        const rigaSpazio = 20;

        if (datiPreventivoCorrente.packageType === 'custom') {
            datiPreventivoCorrente.servizi.forEach((s) => {
                if (currentY < 230) return; // Protezione per non collidere con i blocchi economici in basso
                
                const descCorta = s.descrizione.length > 65 ? s.descrizione.substring(0, 62) + "..." : s.descrizione;
                firstPage.drawText(descCorta, { x: 75, y: currentY, size: 9.5, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
                
                if (s.prezzo !== undefined && s.prezzo !== null) {
                    const prezzoTxt = `€ ${parseFloat(s.prezzo).toFixed(2)}`;
                    firstPage.drawText(prezzoTxt, { x: 475, y: currentY, size: 9.5, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
                }
                currentY -= rigaSpazio;
            });
        } else {
            const pkg = pacchettiPredefiniti[datiPreventivoCorrente.packageType];
            firstPage.drawText(`${pkg.titolo} — ${pkg.sottotitolo}`, { x: 75, y: currentY, size: 11, font: fontBold, color: rgb(1.0, 0.48, 0.0) });
            currentY -= rigaSpazio + 5;

            pkg.voci.forEach(v => {
                if (currentY < 230) return;
                firstPage.drawText(`• ${v}`, { x: 82, y: currentY, size: 9.5, font: fontReg, color: rgb(0.15, 0.15, 0.15) });
                currentY -= rigaSpazio;
            });
        }

        // 4. Iniezione Campi Economici di Chiusura (Allineamento sopra i blocchi in basso a DX del template)
        // Durata complessiva dell'accordo:
        firstPage.drawText(datiPreventivoCorrente.durata, { x: 450, y: 155, size: 10, font: fontBold, color: rgb(0, 0, 0) });
        
        // Totale:
        firstPage.drawText(datiPreventivoCorrente.totale, { x: 450, y: 133, size: 10, font: fontBold, color: rgb(0, 0, 0) });
        
        // Prezzo Mensile (IVA Incl.):
        firstPage.drawText(datiPreventivoCorrente.mensile, { x: 450, y: 110, size: 11, font: fontBold, color: rgb(1.0, 0.48, 0.0) });

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
