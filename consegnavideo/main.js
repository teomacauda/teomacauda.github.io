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

const urlParams = new URLSearchParams(window.location.search);
const deliverySlug = urlParams.get('v');

// Elementi del DOM
const loaderEl = document.getElementById('main-loader');
const clientSection = document.getElementById('section-client');
const adminLoginSection = document.getElementById('section-admin-login');
const adminDashboardSection = document.getElementById('section-admin-dashboard');
const navActionZone = document.getElementById('nav-action-zone');
const adminVideosInputsList = document.getElementById('admin-videos-inputs-list');
const btnAddVideo = document.getElementById('btn-add-video');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const formActionTitle = document.getElementById('form-action-title');
const btnSubmitDelivery = document.getElementById('btn-submit-delivery');
const loginForm = document.getElementById('form-admin-login');
const authError = document.getElementById('admin-auth-error');
const loginLoader = document.getElementById('admin-login-loader');

let videoBlockCount = 0;
let editingDocId = null; 
let loadedDeliveries = []; 

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Router asincrono principale
async function initRouter() {
    loaderEl.classList.remove('hidden');
    clientSection.style.display = 'none';
    adminLoginSection.style.display = 'none';
    adminDashboardSection.style.display = 'none';

    if (deliverySlug) {
        // VISTA CLIENTE
        try {
            const q = query(collection(db, "consegneVideo"), where("slug", "==", deliverySlug));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                renderClientView(querySnapshot.docs[0].data());
            } else {
                window.location.href = '/consegnavideo';
            }
        } catch (error) {
            console.error("Errore routing cliente:", error);
            window.location.href = '/consegnavideo';
        }
    } else {
        // VISTA AMMINISTRATORE
        onAuthStateChanged(auth, (user) => {
            loaderEl.classList.add('hidden');
            if (user) {
                adminLoginSection.style.display = 'none';
                showAdminDashboard();
            } else {
                adminDashboardSection.style.display = 'none';
                showAdminLogin();
            }
        });
    }
}

// Rendering della Vista Cliente Finale (Ottimizzazione Geometrie e Testi)
function renderClientView(data) {
    document.title = `${data.deliveryTitle} | Consegna Video`;
    document.getElementById('client-name-top').innerText = data.clientName;
    document.getElementById('client-delivery-title').innerText = data.deliveryTitle;
    
    const container = document.getElementById('client-videos-container');
    container.innerHTML = '';

    data.videos.forEach((video) => {
        const card = document.createElement('div');
        const isVertical = video.aspectRatio === "9:16";
        
        // Layout flessibile: riga su desktop (max-w-4xl) e colonna su mobile
        card.className = "glass-card p-6 md:p-8 rounded-3xl border border-white/10 max-w-4xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-6";
        
        const playerWrapperClass = isVertical 
            ? "w-[210px] md:w-[240px] aspect-[9/16] bg-[#0c0c0c] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex-shrink-0 mx-auto md:mx-0"
            : "w-full max-w-[340px] md:max-w-none md:w-[320px] aspect-video bg-[#0c0c0c] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex-shrink-0 mx-auto md:mx-0";

        card.innerHTML = `
            <!-- Colonna 1: Anteprima Video YouTube -->
            <div class="${playerWrapperClass}">
                <iframe class="w-full h-full absolute inset-0" src="https://www.youtube.com/embed/${video.youtubeId}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            
            <!-- Colonna 2: Dettagli (sopra) e Pulsante di Download (in basso centrato) -->
            <div class="flex-1 w-full flex flex-col justify-between gap-6 md:px-4">
                <!-- Parte superiore: Testi e Metadati -->
                <div class="w-full flex flex-col items-start text-left gap-3">
                    <div class="flex items-center gap-2 flex-wrap justify-start w-full">
                        <span class="inline-flex items-center justify-center w-fit px-2.5 py-1 rounded-md text-[10px] font-bold bg-accent/10 border border-accent/20 text-accent uppercase tracking-wider">${video.resolution}</span>
                        <span class="inline-flex items-center justify-center w-fit px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/5 border border-white/10 text-graytext uppercase tracking-wider">${video.aspectRatio}</span>
                    </div>
                    <h2 class="text-xl font-bold tracking-tight text-white leading-snug">${video.title}</h2>
                    <p class="text-xs text-graytext flex items-center gap-1.5"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Durata: <span class="text-white font-medium">${video.duration}</span></p>
                    
                    <p class="text-[11px] text-graytext/60 bg-white/[0.01] border border-white/5 p-3 rounded-xl mt-1 leading-relaxed w-full">
                        <span class="text-accent font-semibold">Nota:</span> Se il file è di dimensioni superiori a 100 MB, Google Drive chiederà una conferma di sicurezza prima di avviare il download.
                    </p>
                </div>
                
                <!-- Parte inferiore: Pulsante Download centrato nello spazio rimanente -->
                <div class="w-full flex items-center justify-center">
                    <a href="${video.driveLink}" target="_blank" class="w-auto min-w-[150px] inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-accent hover:bg-accentHover text-white rounded-xl font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/20 group">
                        <i data-lucide="download" class="w-4 h-4 group-hover:translate-y-0.5 transition-transform"></i>
                        <span>Scarica</span>
                    </a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if(auth.currentUser) {
        const basePath = window.location.pathname.startsWith('/consegnavideo') ? '/consegnavideo' : '';
        navActionZone.innerHTML = `
            <a href="${basePath || '/'}" class="text-xs font-bold text-accent border border-accent/20 bg-accent/5 hover:bg-accent hover:text-white px-4 h-9 rounded-xl flex items-center gap-1.5 transition-all duration-300 active:scale-95 shadow-md shadow-accent/5 group">
                <i data-lucide="arrow-left" class="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"></i>
                <span>Pannello di Controllo</span>
            </a>
        `;
    }

    loaderEl.classList.add('hidden');
    clientSection.style.display = 'block';
    lucide.createIcons();
}

function showAdminLogin() {
    navActionZone.innerHTML = `<span class="text-xs font-semibold text-graytext bg-white/5 px-3 py-1.5 rounded-full uppercase tracking-wider">Dashboard Protetta</span>`;
    adminLoginSection.style.display = 'block';
}

function showAdminDashboard() {
    navActionZone.innerHTML = `
        <button id="btn-logout" class="text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 px-4 h-9 rounded-full transition-all flex items-center gap-1">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Esci
        </button>
    `;
    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
    adminDashboardSection.style.display = 'block';
    resetAdminForm();
    loadDeliveryRecords();
}

function addVideoInputBlock(savedData = null) {
    videoBlockCount++;
    const id = videoBlockCount;
    
    const block = document.createElement('div');
    block.id = `video-block-${id}`;
    block.className = "video-input-block p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-3 relative pt-8";
    block.innerHTML = `
        <button type="button" class="btn-remove-video absolute top-2 right-2 text-white/30 hover:text-red-400 transition-colors text-xs flex items-center gap-0.5 ${id === 1 ? 'hidden' : ''}" data-target="video-block-${id}">
            <i data-lucide="x" class="w-3.5 h-3.5"></i> Elimina Slot
        </button>
        <div>
            <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Titolo della Clip</label>
            <input type="text" class="vid-title w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="Es. Versione Orizzontale Main">
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Risoluzione Master</label>
                <select class="vid-res w-full h-9 bg-[#111] border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-accent">
                    <option value="4K">4K Ultra HD</option>
                    <option value="Full HD">Full HD (1080p)</option>
                </select>
            </div>
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Durata (Minutaggio)</label>
                <input type="text" class="vid-duration w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="Es. 01:15">
            </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Aspect Ratio (Proporzioni)</label>
                <select class="vid-aspect w-full h-9 bg-[#111] border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-accent">
                    <option value="auto">Rileva in automatico (oEmbed)</option>
                    <option value="16:9">Orizzontale (16:9)</option>
                    <option value="9:16">Verticale (9:16)</option>
                </select>
            </div>
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">YouTube Video ID</label>
                <input type="text" class="vid-ytid w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="Es. dQw4w9WgXcQ">
            </div>
        </div>
        <div>
            <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Link Google Drive Master</label>
            <input type="url" class="vid-drive w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="https://drive.google.com/...">
        </div>
    `;
    adminVideosInputsList.appendChild(block);
    
    if (savedData) {
        block.querySelector('.vid-title').value = savedData.title || '';
        block.querySelector('.vid-res').value = savedData.resolution || '4K';
        block.querySelector('.vid-duration').value = savedData.duration || '';
        block.querySelector('.vid-aspect').value = savedData.aspectRatio || 'auto';
        block.querySelector('.vid-ytid').value = savedData.youtubeId || '';
        block.querySelector('.vid-drive').value = savedData.driveLink || '';
    }

    block.querySelector('.btn-remove-video')?.addEventListener('click', () => block.remove());
    lucide.createIcons();
}

btnAddVideo.addEventListener('click', () => addVideoInputBlock());

function resetAdminForm() {
    editingDocId = null;
    document.getElementById('form-create-delivery').reset();
    adminVideosInputsList.innerHTML = '';
    formActionTitle.innerHTML = `<i data-lucide="plus-circle" class="text-accent w-5 h-5"></i> Configura Nuova Consegna`;
    btnSubmitDelivery.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Genera Link di Consegna`;
    btnCancelEdit.classList.add('hidden');
    addVideoInputBlock();
    lucide.createIcons();
}

btnCancelEdit.addEventListener('click', resetAdminForm);

document.getElementById('form-create-delivery').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnSubmitDelivery.disabled = true;
    btnSubmitDelivery.innerText = `Analisi ed elaborazione flussi...`;

    const clientName = document.getElementById('input-client-name').value;
    const deliveryTitle = document.getElementById('input-delivery-title').value;
    
    const blockElements = adminVideosInputsList.querySelectorAll('.video-input-block');
    const videosData = [];

    for (let block of blockElements) {
        const youtubeId = block.querySelector('.vid-ytid').value.trim();
        const selectedAspect = block.querySelector('.vid-aspect').value;
        let finalAspectRatio = selectedAspect;

        if (selectedAspect === 'auto') {
            try {
                const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
                const embedData = await response.json();
                if (embedData && embedData.height && embedData.width) {
                    finalAspectRatio = (embedData.height > embedData.width) ? "9:16" : "16:9";
                } else {
                    finalAspectRatio = "16:9";
                }
            } catch (err) {
                finalAspectRatio = "16:9";
            }
        }

        videosData.push({
            title: block.querySelector('.vid-title').value,
            resolution: block.querySelector('.vid-res').value,
            duration: block.querySelector('.vid-duration').value,
            youtubeId: youtubeId,
            driveLink: block.querySelector('.vid-drive').value,
            aspectRatio: finalAspectRatio
        });
    }

    try {
        if (editingDocId) {
            const docRef = doc(db, "consegneVideo", editingDocId);
            await updateDoc(docRef, {
                clientName,
                deliveryTitle,
                videos: videosData
            });
        } else {
            const slug = createSlug(`${clientName} ${deliveryTitle}-${Math.floor(1000 + Math.random() * 9000)}`);
            await addDoc(collection(db, "consegneVideo"), {
                clientName,
                deliveryTitle,
                slug,
                videos: videosData,
                createdAt: new Date()
            });
        }
        resetAdminForm();
        loadDeliveryRecords();
    } catch (error) {
        console.error(error);
        alert("Errore durante il salvataggio.");
    } finally {
        btnSubmitDelivery.disabled = false;
    }
});

async function loadDeliveryRecords() {
    const listContainer = document.getElementById('delivery-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="text-xs text-graytext py-4 text-center">Interrogazione database...</div>';

    try {
        const q = query(collection(db, "consegneVideo"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        listContainer.innerHTML = '';
        loadedDeliveries = []; 

        if(querySnapshot.empty) {
            listContainer.innerHTML = '<div class="text-xs text-graytext/40 py-8 text-center border border-white/5 border-dashed rounded-xl">Nessun pacchetto di consegna attivo.</div>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            loadedDeliveries.push({ id, ...data });

            const fullDeliveryUrl = `${window.location.origin}/consegnavideo/?v=${data.slug}`;
            const numVideos = data.videos ? data.videos.length : 0;

            const item = document.createElement('div');
            item.className = "p-4 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all hover:bg-white/[0.03]";
            item.innerHTML = `
                <div class="space-y-0.5">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">${numVideos} MASTER VIDEO</span>
                        <h4 class="text-sm font-bold text-white tracking-tight">${data.deliveryTitle}</h4>
                    </div>
                    <p class="text-xs text-graytext font-light">Destinatario: <span class="text-white/80">${data.clientName}</span></p>
                </div>
                <div class="flex items-center gap-1.5 justify-end flex-wrap sm:flex-nowrap">
                    <button class="btn-copy h-8 px-2.5 bg-white/5 hover:bg-accent text-graytext hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1" data-url="${fullDeliveryUrl}">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copia Link
                    </button>
                    <button class="btn-edit h-8 px-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1" data-id="${id}">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Modifica
                    </button>
                    <button class="btn-delete h-8 w-8 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all flex items-center justify-center" data-id="${id}">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            `;
            listContainer.appendChild(item);
        });

        listContainer.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                navigator.clipboard.writeText(btn.getAttribute('data-url'));
                const prev = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Copiato`;
                lucide.createIcons();
                setTimeout(() => { btn.innerHTML = prev; lucide.createIcons(); }, 1500);
            });
        });

        listContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-id');
                const targetData = loadedDeliveries.find(d => d.id === docId);
                
                if (!targetData) return;

                editingDocId = docId;
                
                document.getElementById('input-client-name').value = targetData.clientName;
                document.getElementById('input-delivery-title').value = targetData.deliveryTitle;
                
                adminVideosInputsList.innerHTML = '';
                if(targetData.videos && targetData.videos.length > 0) {
                    targetData.videos.forEach(video => addVideoInputBlock(video));
                } else {
                    addVideoInputBlock();
                }

                formActionTitle.innerHTML = `<i data-lucide="edit-3" class="text-blue-400 w-5 h-5"></i> Modifica Consegna Attiva`;
                btnSubmitDelivery.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Salva Modifiche`;
                btnCancelEdit.classList.remove('hidden');
                window.scrollTo({ top: document.getElementById('form-create-delivery').offsetTop - 80, behavior: 'smooth' });
                lucide.createIcons();
            });
        });

        listContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Sei sicuro di voler eliminare permanentemente questo pacchetto di consegna?")) {
                    await deleteDoc(doc(db, "consegneVideo", btn.getAttribute('data-id')));
                    loadDeliveryRecords();
                }
            });
        });

        lucide.createIcons();
    } catch (err) {
        console.error(err);
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        loginLoader.classList.remove('hidden');

        try {
            await signInWithEmailAndPassword(auth, document.getElementById('admin-email').value, document.getElementById('admin-pass').value);
        } catch (error) {
            loginLoader.classList.add('hidden');
            authError.classList.remove('hidden');
            authError.innerText = "Credenziali invalide.";
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    lucide.createIcons();
});
