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
const clientSlug = urlParams.get('v');

// DOM Elements
const loaderEl = document.getElementById('main-loader');
const clientSection = document.getElementById('section-client');
const adminLoginSection = document.getElementById('section-admin-login');
const adminDashboardSection = document.getElementById('section-admin-dashboard');
const navActionZone = document.getElementById('nav-action-zone');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const formActionTitle = document.getElementById('form-action-title');
const btnSubmitAudit = document.getElementById('btn-submit-audit');
const loginForm = document.getElementById('form-admin-login');
const authError = document.getElementById('admin-auth-error');
const loginLoader = document.getElementById('admin-login-loader');

// Cookie Modal elements
const cookieModal = document.getElementById('cookie-modal');
const btnCloseCookie = document.getElementById('btn-close-cookie-modal');
const btnAcceptCookie = document.getElementById('btn-accept-cookie');
const btnRejectCookie = document.getElementById('btn-reject-cookie');
const videoPlaceholder = document.getElementById('video-placeholder');

let editingDocId = null; 
let loadedAudits = []; 
let currentVideoId = "";

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Router
async function initRouter() {
    loaderEl.classList.remove('hidden');
    clientSection.style.display = 'none';
    adminLoginSection.style.display = 'none';
    adminDashboardSection.style.display = 'none';

    if (clientSlug) {
        // CLIENT VIEW
        try {
            // Robust check: try exact clientName, then slug
            let targetDocData = null;
            const qByName = query(collection(db, "videoAudits"), where("clientName", "==", clientSlug));
            const snapByName = await getDocs(qByName);
            
            if (!snapByName.empty) {
                targetDocData = snapByName.docs[0].data();
            } else {
                const qBySlug = query(collection(db, "videoAudits"), where("slug", "==", clientSlug.toLowerCase()));
                const snapBySlug = await getDocs(qBySlug);
                if (!snapBySlug.empty) {
                    targetDocData = snapBySlug.docs[0].data();
                }
            }

            if (targetDocData) {
                renderClientView(targetDocData);
            } else {
                window.location.href = '/videoaudit';
            }
        } catch (error) {
            console.error("Errore routing cliente:", error);
            window.location.href = '/videoaudit';
        }
    } else {
        // ADMIN VIEW
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

// Render Client View
function renderClientView(data) {
    document.title = `Video Audit per ${data.companyName} | Teo Macauda`;
    document.getElementById('client-company-title').innerText = data.companyName;
    document.getElementById('client-greeting-name').innerText = data.clientName;
    
    currentVideoId = data.youtubeId;

    // Show panel button if logged in as admin
    if (auth.currentUser) {
        const basePath = window.location.pathname.startsWith('/videoaudit') ? '/videoaudit' : '';
        navActionZone.innerHTML = `
            <a href="${basePath || '/'}" class="text-xs font-bold text-accent border border-accent/20 bg-accent/5 hover:bg-accent hover:text-white px-4 h-9 rounded-xl flex items-center gap-1.5 transition-all duration-300 active:scale-95 shadow-md shadow-accent/5 group">
                <i data-lucide="arrow-left" class="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"></i>
                <span>Pannello di Controllo</span>
            </a>
        `;
    } else {
        navActionZone.innerHTML = `
            <span class="text-xs text-accent font-bold uppercase tracking-widest px-4 py-2 border border-accent/20 rounded-full bg-accent/5">Documento Riservato</span>
        `;
    }

    // Set up play triggers and cookie modal
    videoPlaceholder.addEventListener('click', handlePlayAttempt);
    btnCloseCookie.addEventListener('click', closeModal);
    btnRejectCookie.addEventListener('click', closeModal);
    btnAcceptCookie.addEventListener('click', acceptAndPlay);

    loaderEl.classList.add('hidden');
    clientSection.style.display = 'block';
    
    // Animate reveals on scroll
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(r => r.classList.add('active')); // Force immediate active or wait for observer

    lucide.createIcons();
}

function handlePlayAttempt() {
    if (localStorage.getItem('videoConsent') === 'true') {
        loadVideo();
    } else {
        cookieModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    cookieModal.classList.remove('visible');
    document.body.style.overflow = '';
}

function acceptAndPlay() {
    localStorage.setItem('videoConsent', 'true');
    closeModal();
    loadVideo();
}

function loadVideo() {
    const placeholder = document.getElementById('video-placeholder');
    const wrapper = document.getElementById('video-iframe-wrapper');

    placeholder.style.display = 'none';
    wrapper.classList.remove('hidden');

    wrapper.innerHTML = `
        <iframe 
            src="https://www.youtube.com/embed/${currentVideoId}?rel=0&modestbranding=1&autoplay=1" 
            class="w-full h-full" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
}

// Show Admin Login
function showAdminLogin() {
    navActionZone.innerHTML = `<span class="text-xs font-semibold text-graytext bg-white/5 px-3 py-1.5 rounded-full uppercase tracking-wider">Dashboard Protetta</span>`;
    adminLoginSection.style.display = 'block';
}

// Show Admin Dashboard
function showAdminDashboard() {
    navActionZone.innerHTML = `
        <button id="btn-logout" class="text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 px-4 h-9 rounded-full transition-all flex items-center gap-1">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Esci
        </button>
    `;
    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
    adminDashboardSection.style.display = 'block';
    resetAdminForm();
    loadAuditRecords();
}

function resetAdminForm() {
    editingDocId = null;
    document.getElementById('form-create-audit').reset();
    formActionTitle.innerHTML = `<i data-lucide="plus-circle" class="text-accent w-5 h-5"></i> Configura Nuovo Audit`;
    btnSubmitAudit.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Salva Video Audit`;
    btnCancelEdit.classList.add('hidden');
    lucide.createIcons();
}

btnCancelEdit.addEventListener('click', resetAdminForm);

// Form Submit (Create/Update Audit)
document.getElementById('form-create-audit').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnSubmitAudit.disabled = true;
    btnSubmitAudit.innerText = `Elaborazione in corso...`;

    const companyName = document.getElementById('input-company-name').value.trim();
    const clientName = document.getElementById('input-client-name').value.trim();
    const youtubeId = document.getElementById('input-youtube-id').value.trim();
    
    // Normalize slug (e.g. MarioRossi or mario-rossi)
    const slug = createSlug(clientName);

    try {
        if (editingDocId) {
            const docRef = doc(db, "videoAudits", editingDocId);
            await updateDoc(docRef, {
                companyName,
                clientName,
                youtubeId,
                slug
            });
        } else {
            await addDoc(collection(db, "videoAudits"), {
                companyName,
                clientName,
                youtubeId,
                slug,
                createdAt: new Date()
            });
        }
        resetAdminForm();
        loadAuditRecords();
    } catch (error) {
        console.error("Errore durante il salvataggio:", error);
        alert("Errore durante il salvataggio.");
    } finally {
        btnSubmitAudit.disabled = false;
    }
});

// Load Records
async function loadAuditRecords() {
    const listContainer = document.getElementById('audit-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="text-xs text-graytext py-4 text-center">Interrogazione database...</div>';

    try {
        const q = query(collection(db, "videoAudits"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        listContainer.innerHTML = '';
        loadedAudits = []; 

        if (querySnapshot.empty) {
            listContainer.innerHTML = '<div class="text-xs text-graytext/40 py-8 text-center border border-white/5 border-dashed rounded-xl">Nessun video audit registrato.</div>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            loadedAudits.push({ id, ...data });

            // Standard URL will be teomacauda.it/videoaudit/?v=clientName
            // Note: clientName can be used directly or we can use the lowercase clean slug.
            // Let's copy the clientName as v parameter since the query handles both.
            const fullUrl = `${window.location.origin}${window.location.pathname}?v=${data.clientName}`;

            const item = document.createElement('div');
            item.className = "p-4 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all hover:bg-white/[0.03]";
            item.innerHTML = `
                <div class="space-y-0.5 text-left">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">SHORTS ID: ${data.youtubeId}</span>
                        <h4 class="text-sm font-bold text-white tracking-tight">${data.companyName}</h4>
                    </div>
                    <p class="text-xs text-graytext font-light">Cliente: <span class="text-white/80">${data.clientName}</span></p>
                </div>
                <div class="flex items-center gap-1.5 justify-end flex-wrap sm:flex-nowrap">
                    <button class="btn-copy h-8 px-2.5 bg-white/5 hover:bg-accent text-graytext hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1" data-url="${fullUrl}">
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

        // Copy Link Action
        listContainer.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                navigator.clipboard.writeText(btn.getAttribute('data-url'));
                const prev = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Copiato`;
                lucide.createIcons();
                setTimeout(() => { btn.innerHTML = prev; lucide.createIcons(); }, 1500);
            });
        });

        // Edit Action
        listContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-id');
                const targetData = loadedAudits.find(d => d.id === docId);
                
                if (!targetData) return;

                editingDocId = docId;
                
                document.getElementById('input-company-name').value = targetData.companyName;
                document.getElementById('input-client-name').value = targetData.clientName;
                document.getElementById('input-youtube-id').value = targetData.youtubeId;

                formActionTitle.innerHTML = `<i data-lucide="edit-3" class="text-blue-400 w-5 h-5"></i> Modifica Audit Attivo`;
                btnSubmitAudit.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Salva Modifiche`;
                btnCancelEdit.classList.remove('hidden');
                
                window.scrollTo({ top: document.getElementById('form-create-audit').offsetTop - 80, behavior: 'smooth' });
                lucide.createIcons();
            });
        });

        // Delete Action
        listContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm("Sei sicuro di voler eliminare permanentemente questo video audit?")) {
                    await deleteDoc(doc(db, "videoAudits", btn.getAttribute('data-id')));
                    loadAuditRecords();
                }
            });
        });

        lucide.createIcons();
    } catch (err) {
        console.error("Errore caricamento audit:", err);
    }
}

// Admin Login handler
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
