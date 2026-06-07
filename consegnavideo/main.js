import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Firebase del tuo ecosistema
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

const urlParams = new URLSearchParams(window.location.search);
const clientSlug = urlParams.get('v');

// Elementi DOM macro aree
const loaderEl = document.getElementById('main-loader');
const lockSection = document.getElementById('section-lock');
const adminDashboardSection = document.getElementById('section-admin-dashboard');
const adminFormSection = document.getElementById('section-admin-form');
const clientViewSection = document.getElementById('section-client-view');

// Elementi form login e creazione
const loginForm = document.getElementById('login-form');
const videosContainer = document.getElementById('videos-container');
const deliveryMainForm = document.getElementById('delivery-main-form');

let currentEditingId = null;

// Estrattore universale dell'ID Video di YouTube tramite Regex (supporta Shorts, standard e condivisioni)
function extractYouTubeId(url) {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

// Generatore stringhe casuali pulite per i parametri URL dei clienti
function generateSlug() {
    return Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
}

// Controllo navigazione e Router ad eventi
function initRouter(user) {
    showLoader(true);
    if (clientSlug) {
        loadClientDelivery(clientSlug, user);
    } else {
        if (user) {
            hideAllSections();
            adminDashboardSection.classList.remove('hidden');
            loadAdminDashboard();
            showLoader(false);
        } else {
            hideAllSections();
            lockSection.classList.remove('hidden');
            showLoader(false);
        }
    }
}

function hideAllSections() {
    lockSection.classList.add('hidden');
    adminDashboardSection.classList.add('hidden');
    adminFormSection.classList.add('hidden');
    clientViewSection.classList.add('hidden');
    document.getElementById('admin-top-bar').classList.add('hidden');
}

function showLoader(show) {
    if (show) {
        loaderEl.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        loaderEl.classList.add('opacity-0', 'pointer-events-none');
    }
}

// --- LOGICA AUTENTICAZIONE ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
    } catch (error) {
        alert("Credenziali errate. Riprova.");
        showLoader(false);
    }
});

onAuthStateChanged(auth, (user) => {
    initRouter(user);
});

// --- LOGICA PANNELLO ADMIN (DASHBOARD) ---
async function loadAdminDashboard() {
    const listContainer = document.getElementById('deliveries-list');
    listContainer.innerHTML = '<p class="text-xs text-graytext text-center py-6 animate-pulse">Caricamento delle consegne in corso...</p>';
    
    try {
        const q = query(collection(db, "consegneVideo"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listContainer.innerHTML = `
                <div class="text-center py-12 border border-dashed border-white/10 rounded-xl bg-cardbg">
                    <p class="text-xs text-graytext">Nessuna pagina di consegna creata finora.</p>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id();
            const fullLink = `${window.location.origin}${window.location.pathname}?v=${data.slug}`;
            const count = data.videos ? data.videos.length : 0;
            
            const item = document.createElement('div');
            item.className = "video-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-white/10";
            item.innerHTML = `
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-accent uppercase tracking-wider">${data.cliente}</span>
                        <span class="text-[9px] bg-white/5 text-graytext px-2 py-0.5 rounded-full border border-white/5">${count} ${count === 1 ? 'Video' : 'Video'}</span>
                    </div>
                    <h3 class="text-sm font-semibold text-white mt-1">${data.titolo}</h3>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-center">
                    <button class="btn-copy text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 h-8 px-3 rounded-lg transition-colors flex items-center gap-1.5" data-link="${fullLink}">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copia Link
                    </button>
                    <button class="btn-edit text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 h-8 w-8 rounded-lg transition-colors flex items-center justify-center" data-id="${docId}">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                    </button>
                    <button class="btn-delete text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 h-8 w-8 rounded-lg transition-colors flex items-center justify-center" data-id="${docId}">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            `;
            listContainer.appendChild(item);
        });
        
        lucide.createIcons();
        bindDashboardActions();
        
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<p class="text-xs text-red-400 text-center py-4">Errore nel caricamento del database.</p>';
    }
}

function bindDashboardActions() {
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const link = btn.getAttribute('data-link');
            navigator.clipboard.writeText(link).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-green-400"></i> Copiato`;
                lucide.createIcons();
                setTimeout(() => { btn.innerHTML = originalHTML; lucide.createIcons(); }, 1800);
            });
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
            showLoader(true);
            await openFormForEdit(btn.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm("Confermi l'eliminazione definitiva di questa pagina di consegna?")) {
                showLoader(true);
                await deleteDoc(doc(db, "consegneVideo", id));
                loadAdminDashboard();
                showLoader(false);
            }
        });
    });
}

// --- LOGICA SCHERMATA FORM (INSERIMENTO DINAMICO) ---
document.getElementById('btn-open-create').addEventListener('click', () => {
    currentEditingId = null;
    document.getElementById('form-action-title').innerText = "Crea Consegna";
    deliveryMainForm.reset();
    videosContainer.innerHTML = "";
    addVideoRow();
    adminDashboardSection.classList.add('hidden');
    adminFormSection.classList.remove('hidden');
});

document.getElementById('btn-back-to-dashboard').addEventListener('click', () => {
    adminFormSection.classList.add('hidden');
    adminDashboardSection.classList.remove('hidden');
    loadAdminDashboard();
});

document.getElementById('btn-add-video-item').addEventListener('click', () => addVideoRow());

function addVideoRow(data = null) {
    const currentIndex = videosContainer.children.length;
    const div = document.createElement('div');
    div.className = "video-item-row video-card p-4 rounded-xl border border-white/5 space-y-4 relative orange-glow-sm";
    div.innerHTML = `
        <button type="button" class="btn-remove-row absolute top-3 right-3 text-graytext hover:text-red-400 transition-colors ${currentIndex === 0 ? 'hidden' : ''}">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-1">Link Video YouTube</label>
                <input type="text" placeholder="Incolla l'URL o ID" class="input-yt-url w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" value="${data ? data.youtubeUrl || '' : ''}" required>
            </div>
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-1">Link Google Drive (Pulsante Scarica)</label>
                <input type="text" placeholder="Incolla il link di Drive" class="input-drive-url w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" value="${data ? data.driveUrl || '' : ''}" required>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-1">Proporzioni Layout</label>
                <select class="select-ratio w-full h-10 bg-cardbg border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-accent">
                    <option value="16:9" ${data && data.aspectRatio === '16:9' ? 'selected' : ''}>16:9 (Orizzontale)</option>
                    <option value="9:16" ${data && data.aspectRatio === '9:16' ? 'selected' : ''}>9:16 (Verticale / Reel)</option>
                </select>
            </div>
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-1">Risoluzione File</label>
                <select class="select-res w-full h-10 bg-cardbg border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-accent">
                    <option value="Full HD" ${data && data.risoluzione === 'Full HD' ? 'selected' : ''}>Full HD</option>
                    <option value="4K" ${data && data.risoluzione === '4K' ? 'selected' : ''}>4K</option>
                </select>
            </div>
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-1">Durata / Minutaggio</label>
                <input type="text" placeholder="Es. 0:45 o 3:12" class="input-duration w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" value="${data ? data.durata || '' : ''}" required>
            </div>
        </div>
    `;
    videosContainer.appendChild(div);
    lucide.createIcons();

    div.querySelector('.btn-remove-row').addEventListener('click', () => div.remove());
}

async function openFormForEdit(id) {
    currentEditingId = id;
    document.getElementById('form-action-title').innerText = "Modifica Consegna";
    try {
        const docSnap = await getDoc(doc(db, "consegneVideo", id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('input-client-name').value = data.cliente;
            document.getElementById('input-delivery-title').value = data.titolo;
            
            videosContainer.innerHTML = "";
            if (data.videos && data.videos.length > 0) {
                data.videos.forEach(v => addVideoRow(v));
            } else {
                addVideoRow();
            }
            adminDashboardSection.classList.add('hidden');
            adminFormSection.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        alert("Errore nel recupero della consegna.");
    } finally {
        showLoader(false);
    }
}

deliveryMainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const clientName = document.getElementById('input-client-name').value.trim();
    const deliveryTitle = document.getElementById('input-delivery-title').value.trim();
    const rows = document.querySelectorAll('.video-item-row');
    const videosData = [];

    rows.forEach(row => {
        const ytUrl = row.querySelector('.input-yt-url').value.trim();
        const driveUrl = row.querySelector('.input-drive-url').value.trim();
        const ratio = row.querySelector('.select-ratio').value;
        const res = row.querySelector('.select-res').value;
        const duration = row.querySelector('.input-duration').value.trim();

        videosData.push({
            youtubeUrl: ytUrl,
            youtubeId: extractYouTubeId(ytUrl),
            driveUrl: driveUrl,
            aspectRatio: ratio,
            risoluzione: res,
            durata: duration
        });
    });

    try {
        if (currentEditingId) {
            await updateDoc(doc(db, "consegneVideo", currentEditingId), {
                cliente: clientName,
                titolo: deliveryTitle,
                videos: videosData
            });
        } else {
            await addDoc(collection(db, "consegneVideo"), {
                cliente: clientName,
                titolo: deliveryTitle,
                slug: generateSlug(),
                createdAt: new Date().getTime(),
                videos: videosData
            });
        }
        adminFormSection.classList.add('hidden');
        adminDashboardSection.classList.remove('hidden');
        loadAdminDashboard();
    } catch (err) {
        console.error(err);
        alert("Errore durante il salvataggio su Firestore.");
    } finally {
        showLoader(false);
    }
});

// --- LOGICA RENDER VISTA CLIENTE FINALE ---
async function loadClientDelivery(slug, user) {
    try {
        const q = query(collection(db, "consegneVideo"), where("slug", "==", slug));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            document.body.innerHTML = `
                <div class="min-h-screen flex flex-col items-center justify-center bg-dark text-center px-4">
                    <i data-lucide="alert-circle" class="w-12 h-12 text-accent mb-4"></i>
                    <h1 class="text-md font-bold uppercase tracking-wider text-white">Link di consegna non valido</h1>
                    <p class="text-xs text-graytext mt-1">Verifica l'URL corretto fornito da Teo Macauda.</p>
                </div>`;
            lucide.createIcons();
            showLoader(false);
            return;
        }

        if (user) {
            const adminBar = document.getElementById('admin-top-bar');
            adminBar.classList.remove('hidden');
            document.getElementById('btn-admin-return').addEventListener('click', () => {
                window.history.replaceState({}, document.title, window.location.pathname);
                initRouter(user);
            });
        }

        const data = snapshot.docs[0].data();
        document.getElementById('client-view-subtitle').innerText = data.cliente;
        document.getElementById('client-view-title').innerText = data.titolo;
        document.title = `${data.titolo} | Area Consegne Teo Macauda`;

        const renderContainer = document.getElementById('client-videos-render');
        renderContainer.innerHTML = "";

        data.videos.forEach((video, index) => {
            const block = document.createElement('div');
            block.className = "space-y-4 border-b border-white/5 pb-12 last:border-b-0 last:pb-0";

            let ratioStyle = "aspect-video w-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl";
            let widthWrapper = "w-full";

            // Se il video è verticale, scala e allinea al centro in formato mobile nativo
            if (video.aspectRatio === '9:16') {
                ratioStyle = "aspect-[9/16] w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl";
                widthWrapper = "w-full max-w-[310px] mx-auto";
            }

            block.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-graytext bg-white/5 px-2.5 py-1 rounded-md border border-white/5">Video #${index + 1}</span>
                    <div class="flex items-center gap-3 text-xs text-graytext font-medium">
                        <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5 text-accent"></i> ${video.durata}</span>
                        <span class="flex items-center gap-1"><i data-lucide="monitor" class="w-3.5 h-3.5 text-accent"></i> ${video.risoluzione}</span>
                    </div>
                </div>
                
                <div class="${widthWrapper}">
                    <div class="${ratioStyle}">
                        <iframe class="w-full h-full" src="https://www.youtube.com/embed/${video.youtubeId}?rel=0&modestbranding=1" title="Player Consegna Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
                
                <div class="pt-2 flex justify-center">
                    <a href="${video.driveUrl}" target="_blank" class="h-11 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-5 text-xs font-bold transition-all flex items-center gap-2 active:scale-95 w-full sm:w-auto justify-center">
                        <i data-lucide="download" class="w-4 h-4 text-accent"></i> Scarica in ${video.risoluzione} originale
                    </a>
                </div>
            `;
            renderContainer.appendChild(block);
        });

        clientViewSection.classList.remove('hidden');
        lucide.createIcons();
        showLoader(false);

    } catch (err) {
        console.error(err);
        showLoader(false);
    }
}
