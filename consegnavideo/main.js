import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Firebase coerente con la tua infrastruttura esistente
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

// Elementi DOM Principali
const loaderEl = document.getElementById('main-loader');
const clientSection = document.getElementById('section-client');
const adminLoginSection = document.getElementById('section-admin-login');
const adminDashboardSection = document.getElementById('section-admin-dashboard');
const navActionZone = document.getElementById('nav-action-zone');
const adminVideosInputsList = document.getElementById('admin-videos-inputs-list');
const btnAddVideo = document.getElementById('btn-add-video');

let videoBlockCount = 0;

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Router Iniziale
async function initRouter() {
    loaderEl.classList.remove('hidden');
    clientSection.classList.add('hidden');
    adminLoginSection.classList.add('hidden');
    adminDashboardSection.classList.add('hidden');

    if (deliverySlug) {
        // AREA CLIENTE
        try {
            const q = query(collection(db, "consegneVideo"), where("slug", "==", deliverySlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                renderClientView(data);
            } else {
                window.location.href = '/consegnavideo';
            }
        } catch (error) {
            console.error("Errore fetch cliente:", error);
            window.location.href = '/consegnavideo';
        }
    } else {
        // AREA AMMINISTRATORE
        onAuthStateChanged(auth, (user) => {
            loaderEl.classList.add('hidden');
            if (user) {
                showAdminDashboard();
            } else {
                showAdminLogin();
            }
        });
    }
}

// Rendering della Vista Cliente Multi-Video
function renderClientView(data) {
    document.title = `${data.deliveryTitle} | Consegna Video`;
    
    document.getElementById('client-name-top').innerText = data.clientName;
    document.getElementById('client-delivery-title').innerText = data.deliveryTitle;
    
    const container = document.getElementById('client-videos-container');
    container.innerHTML = '';

    data.videos.forEach((video, index) => {
        const videoCard = document.createElement('div');
        videoCard.className = "glass-card p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col lg:flex-row gap-8 items-center relative overflow-hidden";
        
        // Elemento decorativo laterale basato sul numero del video
        const sideGlow = video.aspectRatio === "9:16" ? "max-w-[340px] aspect-[9/16]" : "w-full aspect-video";

        // Layout condizionale per l'aspetto ottimizzato su Mobile UX
        const playerWrapperClass = video.aspectRatio === "9:16" 
            ? "w-full max-w-[320px] aspect-[9/16] bg-[#090909] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex-shrink-0 mx-auto lg:mx-0"
            : "w-full lg:w-[55%] aspect-video bg-[#090909] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex-shrink-0";

        videoCard.innerHTML = `
            <div class="${playerWrapperClass}">
                <iframe class="w-full h-full absolute inset-0" src="https://www.youtube.com/embed/${video.youtubeId}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            
            <div class="flex-1 w-full flex flex-col justify-between h-full space-y-6">
                <div class="space-y-3">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent">${video.resolution}</span>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-graytext">${video.aspectRatio}</span>
                    </div>
                    <h2 class="text-xl md:text-2xl font-extrabold tracking-tight text-white leading-tight">${video.title}</h2>
                    <p class="text-xs text-graytext flex items-center gap-1.5"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Durata video: <span class="text-white font-medium">${video.duration}</span></p>
                </div>

                <a href="${video.driveLink}" target="_blank" class="w-full h-14 bg-accent hover:bg-accentHover text-white rounded-xl font-bold text-sm transition-all active:scale-95 flex justify-center items-center gap-3 shadow-lg shadow-accent/10 group mt-auto">
                    <i data-lucide="download" class="w-4 h-4 group-hover:translate-y-0.5 transition-transform"></i>
                    <span>Scarica Master Originale</span>
                </a>
            </div>
        `;
        container.appendChild(videoCard);
    });

    if(auth.currentUser) {
        navActionZone.innerHTML = `<a href="/consegnavideo" class="text-xs text-accent border border-accent/20 bg-accent/5 px-4 h-9 flex items-center rounded-full hover:bg-accent hover:text-white transition-all">Pannello Admin</a>`;
    }

    loaderEl.classList.add('hidden');
    clientSection.classList.remove('hidden');
    lucide.createIcons();
}

// Login Amministratore
function showAdminLogin() {
    navActionZone.innerHTML = `<span class="text-xs font-semibold text-graytext bg-white/5 px-3 py-1.5 rounded-full uppercase tracking-wider">Area Riservata</span>`;
    adminLoginSection.classList.remove('hidden');
}

const loginForm = document.getElementById('form-admin-login');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('admin-auth-error');
        const loadEl = document.getElementById('admin-login-loader');
        errEl.classList.add('hidden');
        loadEl.classList.remove('hidden');

        try {
            await signInWithEmailAndPassword(auth, document.getElementById('admin-email').value, document.getElementById('admin-pass').value);
            loadEl.classList.add('hidden');
        } catch (error) {
            loadEl.classList.add('hidden');
            errEl.classList.remove('hidden');
            errEl.innerText = "Accesso negato. Credenziali errate.";
        }
    });
}

// Dashboard Admin Setup
function showAdminDashboard() {
    navActionZone.innerHTML = `
        <button id="btn-logout" class="text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 px-4 h-9 rounded-full transition-all flex items-center gap-1">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Esci
        </button>
    `;
    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
    
    adminDashboardSection.classList.remove('hidden');
    
    // Resetta ed inserisce il primo blocco video obbligatorio
    adminVideosInputsList.innerHTML = '';
    addVideoInputBlock();
    
    loadDeliveryRecords();
}

// Inserimento Dinamico Campi Video nell'Admin Form
function addVideoInputBlock() {
    videoBlockCount++;
    const id = videoBlockCount;
    
    const block = document.createElement('div');
    block.id = `video-block-${id}`;
    block.className = "video-input-block p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-3 relative pt-8";
    block.innerHTML = `
        <button type="button" class="btn-remove-video absolute top-2 right-2 text-white/40 hover:text-red-400 transition-colors text-xs flex items-center gap-0.5 ${id === 1 ? 'hidden' : ''}" data-target="video-block-${id}">
            <i data-lucide="x" class="w-3.5 h-3.5"></i> Rimuovi
        </button>
        <div>
            <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Titolo del Video</label>
            <input type="text" class="vid-title w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="Es. Versione Principale 16:9">
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Risoluzione</label>
                <select class="vid-res w-full h-9 bg-[#111] border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-accent">
                    <option value="4K">4K UHD</option>
                    <option value="Full HD">Full HD (1080p)</option>
                </select>
            </div>
            <div>
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Durata (Minutaggio)</label>
                <input type="text" class="vid-duration w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="Es. 01:20">
            </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-1">
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">ID Video YouTube</label>
                <input type="text" class="vid-ytid w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="Es. z77iO77XwY8">
            </div>
            <div class="sm:col-span-2">
                <label class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-0.5">Link Google Drive Master</label>
                <input type="url" class="vid-drive w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-accent" required placeholder="https://drive.google.com/...">
            </div>
        </div>
    `;
    adminVideosInputsList.appendChild(block);
    
    // Listener di rimozione del singolo blocco
    if(id !== 1) {
        block.querySelector('.btn-remove-video').addEventListener('click', () => {
            block.remove();
        });
    }
    lucide.createIcons();
}

if (btnAddVideo) {
    btnAddVideo.addEventListener('click', addVideoInputBlock);
}

// Invio Form di Creazione Consegna (Multi-Video)
const createForm = document.getElementById('form-create-delivery');
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = document.getElementById('btn-submit-delivery');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `Elaborazione Aspect Ratio...`;

        const clientName = document.getElementById('input-client-name').value;
        const deliveryTitle = document.getElementById('input-delivery-title').value;
        const slug = createSlug(`${clientName} ${deliveryTitle}-${Math.floor(1000 + Math.random() * 9000)}`);
        
        const blockElements = adminVideosInputsList.querySelectorAll('.video-input-block');
        const videosData = [];

        // Ciclo asincrono per calcolare l'aspect ratio di ogni video aggiunto
        for (let block of blockElements) {
            const youtubeId = block.querySelector('.vid-ytid').value.trim();
            let aspectRatio = "16:9"; // Fallback di base

            try {
                // Utilizzo di un oEmbed pubblico tramite noembed.com privo di blocchi CORS
                const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
                const embedData = await response.json();
                if (embedData && embedData.height && embedData.width) {
                    if (embedData.height > embedData.width) {
                        aspectRatio = "9:16";
                    }
                }
            } catch (corsErr) {
                console.warn("Impossibile contattare l'oEmbed, applicato standard 16:9:", corsErr);
            }

            videosData.push({
                title: block.querySelector('.vid-title').value,
                resolution: block.querySelector('.vid-res').value,
                duration: block.querySelector('.vid-duration').value,
                youtubeId: youtubeId,
                driveLink: block.querySelector('.vid-drive').value,
                aspectRatio: aspectRatio
            });
        }

        try {
            await addDoc(collection(db, "consegneVideo"), {
                clientName,
                deliveryTitle,
                slug,
                videos: videosData,
                createdAt: new Date()
            });
            
            // Ripristino Form
            createForm.reset();
            adminVideosInputsList.innerHTML = '';
            addVideoInputBlock();
            loadDeliveryRecords();
        } catch (error) {
            alert("Errore nel salvataggio su Firestore.");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Pubblica e Genera Link`;
            lucide.createIcons();
        }
    });
}

// Caricamento storico dei link attivi nel registro admin
async function loadDeliveryRecords() {
    const listContainer = document.getElementById('delivery-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="text-xs text-graytext py-4 text-center">Lettura database...</div>';

    try {
        const q = query(collection(db, "consegneVideo"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        listContainer.innerHTML = '';

        if(querySnapshot.empty) {
            listContainer.innerHTML = '<div class="text-xs text-graytext/40 py-8 text-center border border-white/5 border-dashed rounded-xl">Nessun pacchetto di consegna attivo.</div>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const fullDeliveryUrl = `${window.location.origin}/consegnavideo/?v=${data.slug}`;
            const numVideos = data.videos ? data.videos.length : 1;

            const item = document.createElement('div');
            item.className = "p-4 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/[0.03]";
            item.innerHTML = `
                <div class="space-y-0.5">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">${numVideos} ${numVideos === 1 ? 'VIDEO' : 'VIDEO'}</span>
                        <h4 class="text-sm font-bold text-white tracking-tight">${data.deliveryTitle}</h4>
                    </div>
                    <p class="text-xs text-graytext font-light">Cliente: <span class="text-white/80">${data.clientName}</span></p>
                </div>
                <div class="flex items-center gap-2 justify-end">
                    <button class="btn-copy h-8 px-2.5 bg-white/5 hover:bg-accent text-graytext hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1" data-url="${fullDeliveryUrl}">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copia Link
                    </button>
                    <button class="btn-delete h-8 w-8 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all flex items-center justify-center" data-id="${docId}">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            `;
            listContainer.appendChild(item);
        });

        // Gestione Click nel Registro
        listContainer.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                navigator.clipboard.writeText(btn.getAttribute('data-url'));
                const prev = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Copiato`;
                lucide.createIcons();
                setTimeout(() => { btn.innerHTML = prev; lucide.createIcons(); }, 2000);
            });
        });

        listContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Vuoi rimuovere definitivamente questo pacchetto di consegna? Il cliente non avrà più accesso ai video.")) {
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

document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    lucide.createIcons();
});
