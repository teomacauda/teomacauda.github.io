import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const loaderEl = document.getElementById('main-loader');
const lockSection = document.getElementById('section-lock');
const adminCatalogSection = document.getElementById('section-admin-catalog');
const clientPlanSection = document.getElementById('section-client-plan');
const adminIndicator = document.getElementById('admin-indicator');
const authModal = document.getElementById('auth-modal');
const modalContent = authModal.querySelector('.glass-modal');

let currentClientDocId = null;
let editingVideoIndex = null; // Traccia l'indice del contenuto se in fase di modifica

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

async function initRouter(user) {
    loaderEl.classList.remove('hidden');
    lockSection.classList.add('hidden');
    adminCatalogSection.classList.add('hidden');
    clientPlanSection.classList.add('hidden');
    
    if (user) {
        adminIndicator.classList.remove('hidden');
    } else {
        adminIndicator.classList.add('hidden');
    }

    if (clientSlug) {
        try {
            const q = query(collection(db, "pianiEditoriali"), where("slug", "==", clientSlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                const clientData = clientDoc.data();
                currentClientDocId = clientDoc.id;

                document.getElementById('client-title').innerText = `Piano Editoriale: ${clientData.clientName}`;
                
                if (user) {
                    document.getElementById('admin-plan-tools').classList.remove('hidden');
                } else {
                    document.getElementById('admin-plan-tools').classList.add('hidden');
                }

                renderVideoTable(clientData.videos || [], user !== null);
                loaderEl.classList.add('hidden');
                clientPlanSection.classList.remove('hidden');
            } else {
                window.location.href = './';
            }
        } catch (error) {
            console.error("Errore:", error);
            window.location.href = './';
        }
    } else {
        if (user) {
            loadAdminCatalog();
        } else {
            loaderEl.classList.add('hidden');
            lockSection.classList.remove('hidden');
        }
    }
}

function renderVideoTable(videos, isAdmin) {
    const tbody = document.getElementById('video-table-body');
    tbody.innerHTML = '';

    if (videos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-graytext font-light italic">Nessun contenuto programmato al momento.</td></tr>`;
        return;
    }

    videos.forEach((video, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/[0.01] transition-colors group";
        
        // Mappatura dinamica delle EMOJI integrate nello stato richiesto
        let emoji = "💡";
        let badgeStyle = "bg-white/5 text-graytext border-white/5";
        if (video.status === "Scrittura") { emoji = "📝"; badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20"; }
        if (video.status === "In Produzione") { emoji = "🎥"; badgeStyle = "bg-accent/10 text-accent border-accent/20"; }
        if (video.status === "Pronto") { emoji = "✅"; badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"; }
        if (video.status === "Pubblicato") { emoji = "🚀"; badgeStyle = "bg-white/10 text-white border-white/20"; }

        let typeStyle = "bg-white/5 text-graytext border-white/10";
        const format = video.type || "Video YT";
        if (format === "Reel") typeStyle = "bg-pink-500/10 text-pink-400 border-pink-500/20";
        if (format === "TikTok") typeStyle = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
        if (format === "YT Shorts") typeStyle = "bg-red-500/10 text-red-400 border-red-500/20";
        if (format === "Video YT") typeStyle = "bg-red-600/15 text-red-500 border-red-600/30";
        if (format === "Storia") typeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        if (format === "Post") typeStyle = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

        tr.innerHTML = `
            <td class="p-5 font-medium whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${badgeStyle}">
                    <span>${emoji}</span><span>${video.status}</span>
                </span>
            </td>
            <td class="p-5 font-medium whitespace-nowrap">
                <span class="inline-block text-[10px] font-bold tracking-wide border px-2.5 py-0.5 rounded-md ${typeStyle}">
                    ${format}
                </span>
            </td>
            <td class="p-5 font-bold text-white tracking-tight">${video.title}</td>
            <td class="p-5 text-graytext font-medium whitespace-nowrap">${video.date || 'Da definire'}</td>
            <td class="p-5 text-graytext font-light max-w-xs truncate md:whitespace-normal">${video.notes || '-'}</td>
            <td class="p-5 text-right whitespace-nowrap space-x-1.5">
                ${video.scriptLink ? `
                    <a href="${video.scriptLink}" class="inline-flex h-8 px-3 bg-white/5 hover:bg-accent hover:text-white rounded-lg items-center gap-1.5 text-xs text-graytext hover:text-white transition-all">
                        <span>Leggi Script</span> <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                    </a>
                ` : `<span class="text-xs text-graytext/40 italic pr-2">Nessuno Script</span>`}
                
                ${isAdmin ? `
                    <button data-index="${index}" class="btn-edit-single inline-flex h-8 w-8 bg-white/5 hover:bg-accent/20 hover:text-accent border border-white/5 rounded-lg items-center justify-center text-graytext hover:text-white transition-all" title="Modifica Contenuto">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button data-index="${index}" class="btn-delete-single inline-flex h-8 w-8 bg-red-500/10 hover:bg-red-500 border border-red-500/10 text-red-400 hover:text-white rounded-lg items-center justify-center transition-all" title="Elimina Contenuto">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Aggancio dei listener operativi per i bottoni singoli appena generati
    if (isAdmin) {
        document.querySelectorAll('.btn-edit-single').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                openEditVideoModal(idx, videos[idx]);
            });
        });
        document.querySelectorAll('.btn-delete-single').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                if (confirm("Sei sicuro di voler eliminare questo singolo contenuto dal piano?")) {
                    await deleteSingleVideo(idx, videos);
                }
            });
        });
    }

    lucide.createIcons();
}

// APERTURA MODULO AGGIORNAMENTO DATI
function openEditVideoModal(index, video) {
    editingVideoIndex = index;
    
    document.getElementById('video-title').value = video.title;
    document.getElementById('video-type').value = video.type || "Video YT";
    document.getElementById('video-status').value = video.status;
    document.getElementById('video-date').value = video.date || "";
    document.getElementById('video-notes').value = video.notes || "";
    document.getElementById('video-script-link').value = video.scriptLink || "";
    
    document.querySelector('#modal-step-add-video h3').innerHTML = 'Modifica <span class="text-accent">Contenuto</span>';
    document.querySelector('#form-add-video button[type="submit"]').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Aggiorna Contenuto';
    
    lucide.createIcons();
    openCustomStep('add-video');
}

// ELIMINAZIONE SINGOLO CONTENUTO DALL'ARRAY
async function deleteSingleVideo(index, currentVideos) {
    if (!currentClientDocId) return;
    try {
        currentVideos.splice(index, 1);
        const docRef = doc(db, "pianiEditoriali", currentClientDocId);
        await updateDoc(docRef, { videos: currentVideos });
        initRouter(auth.currentUser);
    } catch (error) {
        alert("Errore rimozione elemento.");
    }
}

async function loadAdminCatalog() {
    try {
        const q = query(collection(db, "pianiEditoriali"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const grid = document.getElementById('client-grid');
        grid.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const clientUrl = `${window.location.origin}${window.location.pathname}?v=${data.slug}`;
            
            const card = document.createElement('div');
            card.className = "glass-card p-6 rounded-2xl text-left flex flex-col justify-between min-h-[160px] relative group";
            card.innerHTML = `
                <div>
                    <h3 class="text-xl font-bold text-white tracking-tight pr-8">${data.clientName}</h3>
                    <p class="text-xs text-accent mt-1">/${data.slug}</p>
                </div>
                <div class="flex items-center gap-2 mt-6">
                    <a href="?v=${data.slug}" class="h-8 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg flex items-center gap-1 text-xs font-semibold transition-all">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i> Vedi Piano
                    </a>
                    <button onclick="navigator.clipboard.writeText('${clientUrl}'); alert('Link copiato!');" class="h-8 px-3 bg-white/5 hover:bg-accent/20 hover:text-accent text-graytext rounded-lg flex items-center gap-1 text-xs font-semibold transition-all">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copia Link
                    </button>
                    <button data-id="${doc.id}" class="btn-delete-client-trigger absolute top-5 right-5 text-graytext/40 hover:text-red-500 transition-colors p-1">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        const plusCard = document.createElement('button');
        plusCard.className = "glass-card plus-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[160px] text-graytext hover:text-white cursor-pointer";
        plusCard.innerHTML = `<i data-lucide="plus" class="w-8 h-8 text-graytext/60 group-hover:text-accent transition-transform"></i><span class="text-xs font-bold tracking-tight mt-2">Crea Nuovo Piano</span>`;
        plusCard.addEventListener('click', () => openCustomStep('create-client'));
        grid.appendChild(plusCard);

        document.querySelectorAll('.btn-delete-client-trigger').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-id');
                if(confirm("Sei sicuro di voler eliminare definitivamente questo cliente e tutto il suo piano?")) {
                    await deleteDoc(doc(db, "pianiEditoriali", docId));
                    loadAdminCatalog();
                }
            });
        });

        lucide.createIcons();
        loaderEl.classList.add('hidden');
        adminCatalogSection.classList.remove('hidden');
    } catch (error) {
        console.error("Errore catalogo:", error);
    }
}

const createClientForm = document.getElementById('form-create-client');
if (createClientForm) {
    createClientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientName = document.getElementById('client-name-input').value;
        const slug = createSlug(clientName) + "-" + Math.random().toString(36).substring(2, 7);

        try {
            await addDoc(collection(db, "pianiEditoriali"), {
                clientName: clientName,
                slug: slug,
                videos: [],
                createdAt: new Date()
            });
            closeAuthModal();
            loadAdminCatalog();
        } catch (error) {
            alert("Errore inserimento.");
        }
    });
}

const addVideoForm = document.getElementById('form-add-video');
if (addVideoForm) {
    addVideoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentClientDocId) return;

        const videoData = {
            title: document.getElementById('video-title').value,
            type: document.getElementById('video-type').value,
            status: document.getElementById('video-status').value,
            date: document.getElementById('video-date').value,
            notes: document.getElementById('video-notes').value,
            scriptLink: document.getElementById('video-script-link').value
        };

        try {
            const docRef = doc(db, "pianiEditoriali", currentClientDocId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                let currentVideos = docSnap.data().videos || [];
                
                if (editingVideoIndex !== null) {
                    // Sovrascrive la riga specifica modificata
                    currentVideos[editingVideoIndex] = videoData;
                } else {
                    // Inserimento standard a coda
                    currentVideos.push(videoData);
                }
                
                await updateDoc(docRef, { videos: currentVideos });
                closeAuthModal();
                editingVideoIndex = null;
                initRouter(auth.currentUser);
                addVideoForm.reset();
            }
        } catch (error) {
            alert("Errore salvataggio dati.");
        }
    });
}

document.getElementById('btn-delete-plan').addEventListener('click', async () => {
    if (!currentClientDocId) return;
    if (confirm("Attenzione: Stai per eliminare questo piano editoriale. L'azione è irreversibile. Procedere?")) {
        try {
            await deleteDoc(doc(db, "pianiEditoriali", currentClientDocId));
            window.location.href = './';
        } catch (error) {
            alert("Errore durante l'eliminazione.");
        }
    }
});

document.getElementById('btn-add-video').addEventListener('click', () => {
    editingVideoIndex = null; // Resetta per l'aggiunta pulita
    document.getElementById('form-add-video').reset();
    document.querySelector('#modal-step-add-video h3').innerHTML = 'Aggiungi <span class="text-accent">al Piano Editoriale</span>';
    document.querySelector('#form-add-video button[type="submit"]').innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Inserisci nel Piano';
    lucide.createIcons();
    openCustomStep('add-video');
});

const loginForm = document.getElementById('form-login');
const authError = document.getElementById('auth-error');
const loginLoader = document.getElementById('login-loader');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        loginLoader.classList.remove('hidden');
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            closeAuthModal();
        } catch (error) {
            loginLoader.classList.add('hidden');
            authError.classList.remove('hidden');
            authError.innerText = "Dati di accesso errati.";
        }
    });
}

onAuthStateChanged(auth, (user) => {
    initRouter(user);
});

function openCustomStep(step) {
    document.getElementById('modal-step-auth').classList.add('hidden');
    document.getElementById('modal-step-create-client').classList.add('hidden');
    document.getElementById('modal-step-add-video').classList.add('hidden');

    if (!auth.currentUser) {
        document.getElementById('modal-step-auth').classList.remove('hidden');
    } else if (step === 'create-client') {
        document.getElementById('modal-step-create-client').classList.remove('hidden');
    } else if (step === 'add-video') {
        document.getElementById('modal-step-add-video').classList.remove('hidden');
    }
    openAuthModal();
}

function openAuthModal() {
    authModal.classList.remove('opacity-0', 'pointer-events-none');
    authModal.classList.add('opacity-100', 'pointer-events-auto');
    if(window.innerWidth < 640) {
        modalContent.classList.replace('translate-y-full', 'translate-y-0');
    } else {
        modalContent.classList.replace('translate-y-10', 'translate-y-0');
    }
}

function closeAuthModal() {
    authModal.classList.add('opacity-0', 'pointer-events-none');
    authModal.classList.remove('opacity-100', 'pointer-events-auto');
    if(window.innerWidth < 640) {
        modalContent.classList.replace('translate-y-0', 'translate-y-full');
    } else {
        modalContent.classList.replace('translate-y-0', 'translate-y-10');
    }
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
