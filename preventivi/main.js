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
const gateSection = document.getElementById('section-gate');
const authSection = document.getElementById('section-auth');
const adminSection = document.getElementById('section-admin');
const clientSection = document.getElementById('section-client');
const packageTypeSelect = document.getElementById('package-type');
const customServicesSection = document.getElementById('custom-services-section');
const durationMonthsInput = document.getElementById('agreement-months');
const durationPeriodInput = document.getElementById('agreement-period');
const monthlyPriceInput = document.getElementById('monthly-price');

const urlParams = new URLSearchParams(window.location.search);
const preventivoId = urlParams.get('id');

let datiPreventivoCorrente = null; 

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
                showSection(gateSection);
                setupAuthLogic();
            }
        });
    }
});

function hideLoader() { loaderEl.classList.add('opacity-0', 'pointer-events-none'); setTimeout(() => loaderEl.classList.add('hidden'), 300); }
function showLoader() { loaderEl.classList.remove('hidden', 'opacity-0', 'pointer-events-none'); }

function showSection(section) {
    gateSection.classList.add('hidden');
    authSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    clientSection.classList.add('hidden');
    section.classList.remove('hidden');
}

function setupAuthLogic() {
    // Gestione passaggio da schermata gate a form di login
    const btnGoToLogin = document.getElementById('btn-go-to-login');
    if (btnGoToLogin) {
        btnGoToLogin.addEventListener('click', () => {
            showSection(authSection);
        });
    }

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
        const descInputs = customServicesSection.querySelectorAll('.service-desc');
        if (val === 'custom') {
            customServicesSection.classList.remove('hidden');
            descInputs.forEach(input => input.setAttribute('required', ''));
        } else {
            customServicesSection.classList.add('hidden');
            descInputs.forEach(input => input.removeAttribute('required'));
        }
    });

    const container = document.getElementById('services-container');
    document.getElementById('btn-add-service').addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = "service-row grid grid-cols-12 gap-3 items-center";
        row.innerHTML = `
            <div class="col-span-7 sm:col-span-9">
                <input type="text" placeholder="Attività..." required class="service-desc w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent">
            </div>
            <div class="col-span-4 sm:col-span-2">
                <input type="number" step="0.01" placeholder="Prezzo" class="service-price w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent">
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
        const clientCf = document.getElementById('client-cf').value;
        const clientVat = document.getElementById('client-vat').value;
        const clientStreet = document.getElementById('client-street').value;
        const clientCityZip = document.getElementById('client-city-zip').value;
        const expiryDate = document.getElementById('expiry-date').value;
        const packageType = packageTypeSelect.value;
        const mensileStr = monthlyPriceInput.value;
        const durataMesi = durationMonthsInput.value;
        const durataPeriodo = durationPeriodInput.value;
        const totaleStr = mensileStr;

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
                clientCf,
                clientVat,
                clientStreet,
                clientCityZip,
                expiryDate,
                packageType,
                servizi: listaServizi,
                totale: totaleStr,
                durataMesi,
                durataPeriodo,
                durata: `${durataMesi} / ${durataPeriodo}`,
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
        const contentArea = document.getElementById('client-content-area');

        if (docSnap.exists()) {
            const dataDoc = docSnap.data();
            
            // Utilizza la data locale (fuso orario italiano) per evitare che scada prima del tempo basandosi sul fuso UTC
            const oggiStr = new Date().toLocaleDateString('sv-SE');
            if (dataDoc.expiryDate && oggiStr > dataDoc.expiryDate) {
                await deleteDoc(docRef);
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

            // Box riepilogativo dati anagrafici Fornitore & Cliente
            let anagraficaHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/[0.01] border border-white/10 rounded-2xl text-sm mb-6">
                    <div class="space-y-2">
                        <span class="text-xs text-accent font-semibold uppercase tracking-wider block">Fornitore</span>
                        <div class="text-white font-semibold">Matteo Maria Macauda</div>
                        <div class="text-graytext text-xs">C.F.: MCDMTM04H18I754Q</div>
                        <div class="text-graytext text-xs">P.IVA: 02153520891</div>
                        <div class="text-graytext text-xs">Via teofane 2, 96100, Siracusa (SR)</div>
                    </div>
                    <div class="space-y-2 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                        <span class="text-xs text-accent font-semibold uppercase tracking-wider block">Cliente</span>
                        <div class="text-white font-semibold">${datiPreventivoCorrente.clientName.toUpperCase()}</div>
                        <div class="text-graytext text-xs">${datiPreventivoCorrente.clientCf ? `C.F.: ${datiPreventivoCorrente.clientCf.toUpperCase()}` : ''}</div>
                        ${datiPreventivoCorrente.clientVat ? `<div class="text-graytext text-xs">P.IVA: ${datiPreventivoCorrente.clientVat.toUpperCase()}</div>` : ''}
                        <div class="text-graytext text-xs">${datiPreventivoCorrente.clientStreet ? datiPreventivoCorrente.clientStreet.toUpperCase() : ''}</div>
                        <div class="text-graytext text-xs">${datiPreventivoCorrente.clientCityZip ? datiPreventivoCorrente.clientCityZip.toUpperCase() : ''}</div>
                    </div>
                </div>
            `;
            contentArea.innerHTML = anagraficaHtml;

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
                    const prezzoTxt = (s.prezzo !== undefined && s.prezzo !== null) ? formattaPrezzo(s.prezzo) : `—`;
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
                contentArea.insertAdjacentHTML('beforeend', tableHtml);
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
                contentArea.insertAdjacentHTML('beforeend', pkgHtml);
            }

            const durataInfo = `${(datiPreventivoCorrente.durataMesi || '').toUpperCase()} / ${(datiPreventivoCorrente.durataPeriodo || '').toUpperCase()}`;
            let summaryBox = `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-xl text-sm">
                    <div><span class="text-xs text-graytext block uppercase font-semibold mb-1">Durata Accordo</span><strong class="text-accent text-lg">${durataInfo}</strong></div>
                    <div><span class="text-xs text-graytext block uppercase font-semibold mb-1">Prezzo Mensile (IVA Incl.)</span><strong class="text-accent text-lg">${formattaPrezzo(datiPreventivoCorrente.mensile)}</strong></div>
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
