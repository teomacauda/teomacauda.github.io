import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Data structure per i 3 pacchetti predefiniti richiesti
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
        investimentoDefault: "€450 — €600"
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
        investimentoDefault: "€850 — €1.000"
    },
    elite: {
        titolo: "PACCHETTO ELITE",
        sottotitolo: "ALL-IN AUTHORITY",
        descrizione: "Delega totale per una leadership assoluta. Trasformo la tua pagina in un punto di riferimento estetico e strategico.",
        voci: [
            "Include tutto il pacchetto PRO",
            "12 Video + 10 Foto al mese",
            "Extreme Page Makeover, restyling della pagina",
            "Gestione Full (mi occuperò anche della pubblicazione)",
            "ARTIGIANALITÀ PURA (NO AI)"
        ],
        valore: "Libertà totale. Tu pensi al lavoro, io ti rendo un'autorità premium.",
        investimentoDefault: "€1.350 — €1.500"
    }
};

const loaderEl = document.getElementById('main-loader');
const authSection = document.getElementById('section-auth');
const adminSection = document.getElementById('section-admin');
const clientSection = document.getElementById('section-client');
const packageTypeSelect = document.getElementById('package-type');
const customServicesSection = document.getElementById('custom-services-section');
const totalPriceInput = document.getElementById('total-price-input');

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
            alert("Errore credenziali.");
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
            totalPriceInput.placeholder = "Totale preventivato complessivo";
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
                <input type="text" placeholder="Descrizione del servizio..." required class="service-desc w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent">
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

    document.querySelector('.btn-remove-row').addEventListener('click', (e) => {
        if(document.querySelectorAll('.service-row').length > 1) {
            e.currentTarget.closest('.service-row').remove();
        } else {
            alert("È richiesta almeno una riga.");
        }
    });

    document.getElementById('preventivo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();

        const clientName = document.getElementById('client-name').value;
        const expiryDate = document.getElementById('expiry-date').value;
        const packageType = packageTypeSelect.value;
        const totaleStr = totalPriceInput.value;

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
                createdAt: new Date().toISOString()
            });

            const shareableUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            document.getElementById('generated-url').value = shareableUrl;
            document.getElementById('output-link-box').classList.remove('hidden');
            document.getElementById('output-link-box').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            alert("Errore salvataggio firestore.");
        } finally {
            hideLoader();
        }
    });

    document.getElementById('btn-copy-link').addEventListener('click', () => {
        const inputUrl = document.getElementById('generated-url');
        inputUrl.select();
        navigator.clipboard.writeText(inputUrl.value);
        alert("Link copiato!");
    });
}

async function caricaVistaCliente(id) {
    try {
        const docRef = doc(db, "preventivi", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            datiPreventivoCorrente = docSnap.data();
            showSection(clientSection);

            document.getElementById('client-view-title').innerText = `Piano Finanziario: ${datiPreventivoCorrente.clientName}`;
            const dataFormattata = new Date(datiPreventivoCorrente.expiryDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('client-view-date').innerText = `Proposta valida fino al ${dataFormattata}`;

            const contentArea = document.getElementById('client-content-area');
            contentArea.innerHTML = '';

            if (datiPreventivoCorrente.packageType === 'custom') {
                let tableHtml = `
                    <div class="border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
                        <div class="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-graytext">
                            <div class="col-span-9">Descrizione Servizio / Fornitura</div>
                            <div class="col-span-3 text-right">Importo</div>
                        </div>
                        <div class="divide-y divide-white/5">
                `;

                datiPreventivoCorrente.servizi.forEach(s => {
                    const prezzoTxt = (s.prezzo !== undefined && s.prezzo !== null) ? `€ ${s.prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : `—`;
                    tableHtml += `
                        <div class="grid grid-cols-12 px-4 py-4 text-sm items-center hover:bg-white/[0.01] transition-colors">
                            <div class="col-span-9 font-medium text-white/90 pr-2">${s.descrizione}</div>
                            <div class="col-span-3 text-right text-graytext font-mono">${prezzoTxt}</div>
                        </div>
                    `;
                });

                tableHtml += `
                        </div>
                        <div class="grid grid-cols-12 px-4 py-4 bg-white/5 font-bold border-t border-white/10">
                            <div class="col-span-9 text-base text-white uppercase tracking-wide">Investimento Totale</div>
                            <div class="col-span-3 text-right text-base text-accent font-mono">${datiPreventivoCorrente.totale.includes('€') ? datiPreventivoCorrente.totale : '€ ' + parseFloat(datiPreventivoCorrente.totale).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                `;
                contentArea.innerHTML = tableHtml;
            } else {
                const pkg = pacchettiPredefiniti[datiPreventivoCorrente.packageType];
                let pkgHtml = `
                    <div class="border border-white/10 rounded-2xl p-6 sm:p-8 bg-white/[0.01] space-y-6">
                        <div class="flex justify-between items-start border-b border-white/5 pb-4">
                            <div>
                                <span class="text-[10px] font-bold tracking-widest text-accent uppercase bg-accent/10 px-3 py-1 rounded-full border border-accent/20">PIÙ SCELTO</span>
                                <h2 class="text-2xl font-black text-white mt-3 tracking-tight">${pkg.titolo}</h2>
                                <p class="text-xs font-semibold text-graytext tracking-wider uppercase mt-0.5">${pkg.sottotitolo}</p>
                            </div>
                        </div>
                        <p class="text-sm text-white/80 italic leading-relaxed font-light">"${pkg.descrizione}"</p>
                        
                        <div class="space-y-3">
                            <p class="text-xs font-bold uppercase tracking-wider text-graytext">Inclusione Fornitura:</p>
                            <ul class="space-y-2">
                `;

                pkg.voci.forEach(v => {
                    pkgHtml += `
                        <li class="flex items-center gap-2.5 text-sm text-white/90">
                            <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                            <span>${v}</span>
                        </li>
                    `;
                });

                pkgHtml += `
                            </ul>
                        </div>

                        <div class="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                            <span class="text-[10px] font-bold tracking-wider text-accent uppercase">Il valore per te</span>
                            <p class="text-sm text-white/95 font-medium">${pkg.valore}</p>
                        </div>

                        <div class="flex items-center justify-between pt-4 border-t border-white/5">
                            <span class="text-xs font-bold uppercase tracking-wider text-graytext">Investimento Richiesto</span>
                            <span class="text-xl font-black text-accent tracking-tight">${datiPreventivoCorrente.totale}</span>
                        </div>
                    </div>
                `;
                contentArea.innerHTML = pkgHtml;
            }

            document.getElementById('btn-download-pdf').addEventListener('click', generaFlatPDF);
        } else {
            alert("Nessun documento trovato.");
            window.location.search = "";
        }
    } catch (error) {
        console.error(error);
        alert("Errore network client side.");
    } finally {
        hideLoader();
    }
}

async function generaFlatPDF() {
    if (!datiPreventivoCorrente) return;
    showLoader();

    try {
        const templateUrl = "template.pdf"; 
        const existingPdfBytes = await fetch(templateUrl).then(res => {
            if (!res.ok) throw new Error("Template non trovato.");
            return res.arrayBuffer();
        });

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Iniezione testi Flat-Overlay
        firstPage.drawText(datiPreventivoCorrente.clientName.toUpperCase(), { x: 75, y: 640, size: 12, font: fontBold, color: rgb(0, 0, 0) });
        const scadenzaTxt = `Scadenza: ${new Date(datiPreventivoCorrente.expiryDate).toLocaleDateString('it-IT')}`;
        firstPage.drawText(scadenzaTxt, { x: 75, y: 625, size: 9, font: fontReg, color: rgb(0.4, 0.4, 0.4) });

        let currentY = 540;
        const rigaSpazio = 22;

        if (datiPreventivoCorrente.packageType === 'custom') {
            datiPreventivoCorrente.servizi.forEach((s) => {
                if (currentY < 180) return;
                const descCorta = s.descrizione.length > 60 ? s.descrizione.substring(0, 57) + "..." : s.descrizione;
                firstPage.drawText(descCorta, { x: 75, y: currentY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
                
                if (s.prezzo !== undefined && s.prezzo !== null) {
                    const prezzoTxt = `€ ${parseFloat(s.prezzo).toFixed(2)}`;
                    firstPage.drawText(prezzoTxt, { x: 480, y: currentY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
                }
                currentY -= rigaSpazio;
            });
        } else {
            const pkg = pacchettiPredefiniti[datiPreventivoCorrente.packageType];
            firstPage.drawText(`${pkg.titolo} — ${pkg.sottotitolo}`, { x: 75, y: currentY, size: 11, font: fontBold, color: rgb(1.0, 0.48, 0.0) });
            currentY -= rigaSpazio + 4;

            const descLines = pkg.descrizione.match(/.{1,65}(\s|$)/g) || [pkg.descrizione];
            descLines.forEach(line => {
                firstPage.drawText(line.trim(), { x: 75, y: currentY, size: 9, font: fontReg, color: rgb(0.3, 0.3, 0.3) });
                currentY -= rigaSpazio - 6;
            });
            currentY -= 6;

            pkg.voci.forEach(v => {
                firstPage.drawText(`• ${v}`, { x: 85, y: currentY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
                currentY -= rigaSpazio;
            });
        }

        const totalTxt = datiPreventivoCorrente.totale.includes('€') ? datiPreventivoCorrente.totale : `€ ${parseFloat(datiPreventivoCorrente.totale).toFixed(2)}`;
        firstPage.drawText(totalTxt, { x: 460, y: 220, size: 13, font: fontBold, color: rgb(1.0, 0.48, 0.0) });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Preventivo_${datiPreventivoCorrente.clientName.replace(/\s+/g, '_')}.pdf`;
        link.click();
    } catch (error) {
        console.error(error);
        alert("Errore rendering PDF.");
    } finally {
        hideLoader();
    }
}
