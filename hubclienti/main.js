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
const clientSection = document.getElementById('section-client');
const adminIndicator = document.getElementById('admin-indicator');
const authModal = document.getElementById('auth-modal');
const modalContent = authModal.querySelector('.glass-modal');

let currentEditingClientId = null;

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

function appendHubParam(url, slug) {
    if (!url) return '#';
    try {
        const u = new URL(url);
        u.searchParams.set('hub', slug);
        return u.toString();
    } catch (e) {
        // Fallback for relative paths
        if (url.includes('?')) {
            return `${url}&hub=${slug}`;
        } else {
            return `${url}?hub=${slug}`;
        }
    }
}

async function initRouter(user) {
    loaderEl.classList.remove('hidden');
    lockSection.classList.add('hidden');
    adminCatalogSection.classList.add('hidden');
    clientSection.classList.add('hidden');
    
    if (user) {
        adminIndicator.classList.remove('hidden');
    } else {
        adminIndicator.classList.add('hidden');
    }

    if (clientSlug) {
        // CLIENT VIEW
        try {
            const q = query(collection(db, "hubClienti"), where("slug", "==", clientSlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                const clientData = clientDoc.data();
                
                // Popolo i dati
                document.getElementById('client-greeting').innerText = `Ciao ${clientData.clientName}`;
                
                const avatarImg = document.getElementById('client-avatar-img');
                const avatarPlaceholder = document.getElementById('client-avatar-placeholder');
                
                if (clientData.avatarUrl) {
                    avatarImg.src = clientData.avatarUrl;
                    avatarImg.classList.remove('hidden');
                    avatarPlaceholder.classList.add('hidden');
                } else {
                    avatarImg.classList.add('hidden');
                    avatarPlaceholder.classList.remove('hidden');
                    avatarPlaceholder.innerText = clientData.clientName.charAt(0).toUpperCase();
                }

                // Pulsanti
                const btnPed = document.getElementById('btn-client-ped');
                const btnReport = document.getElementById('btn-client-report');

                if (clientData.pedLink) {
                    btnPed.href = appendHubParam(clientData.pedLink, clientSlug);
                    btnPed.classList.remove('hidden');
                } else {
                    btnPed.classList.add('hidden');
                }

                if (clientData.reportLink) {
                    btnReport.href = appendHubParam(clientData.reportLink, clientSlug);
                    btnReport.classList.remove('hidden');
                } else {
                    btnReport.classList.add('hidden');
                }

                // Mostro la sezione e nascondo il loader
                loaderEl.classList.add('hidden');
                clientSection.classList.remove('hidden');
                
                // GSAP Intro Animation
                runClientIntroAnimation();
                if (typeof lucide !== 'undefined') lucide.createIcons();
                
            } else {
                window.location.href = './';
            }
        } catch (error) {
            console.error("Errore:", error);
            window.location.href = './';
            loaderEl.classList.add('hidden');
        }
    } else {
        // ADMIN OR LOCK VIEW
        if (user) {
            loadAdminCatalog();
        } else {
            loaderEl.classList.add('hidden');
            lockSection.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

function runClientIntroAnimation() {
    // Resetto gli stili per l'animazione
    gsap.set("#client-brand-group", { y: "20vh", scale: 1.2 });
    gsap.set("#client-avatar-container", { width: "7rem", height: "7rem" });
    gsap.set("#client-greeting", { fontSize: "2rem" });
    gsap.set("#client-actions-container", { opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" });

    const tl = gsap.timeline({ delay: 0.6 });

    tl.to("#client-brand-group", {
        y: "0vh",
        scale: 1,
        duration: 1.2,
        ease: "power4.out"
    })
    .to("#client-avatar-container", {
        width: "5.5rem",
        height: "5.5rem",
        duration: 1,
        ease: "power3.inOut"
    }, "-=0.6")
    .to("#client-greeting", {
        fontSize: "1.5rem",
        duration: 1,
        ease: "power3.inOut"
    }, "<")
    .to("#client-actions-container", {
        opacity: 1,
        y: 0,
        scale: 1,
        pointerEvents: "auto",
        duration: 0.8,
        ease: "power3.out"
    }, "-=0.4");
}

async function loadAdminCatalog() {
    try {
        const q = query(collection(db, "hubClienti"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const grid = document.getElementById('client-grid');
        grid.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const clientUrl = `${window.location.origin}${window.location.pathname}?v=${data.slug}`;
            
            const card = document.createElement('div');
            card.className = "glass-card p-6 rounded-2xl text-left flex flex-col justify-between min-h-[180px] relative group";
            card.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                        ${data.avatarUrl ? `<img src="${data.avatarUrl}" class="w-full h-full object-cover">` : `<div class="text-accent font-bold">${data.clientName.charAt(0).toUpperCase()}</div>`}
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-white tracking-tight pr-8">${data.clientName}</h3>
                        <p class="text-xs text-accent mt-0.5">/${data.slug}</p>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 mt-6">
                    <a href="?v=${data.slug}" class="h-8 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg flex items-center gap-1 text-xs font-semibold transition-all">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i> Vedi App
                    </a>
                    <button onclick="navigator.clipboard.writeText('${clientUrl}'); alert('Link copiato!');" class="h-8 px-3 bg-white/5 hover:bg-accent/20 hover:text-accent text-graytext rounded-lg flex items-center gap-1 text-xs font-semibold transition-all">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copia Link
                    </button>
                    <button data-id="${doc.id}" class="btn-edit-client absolute top-5 right-12 text-graytext/40 hover:text-accent transition-colors p-1">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button data-id="${doc.id}" class="btn-delete-client absolute top-5 right-5 text-graytext/40 hover:text-red-500 transition-colors p-1">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

         // Tasto geometrico "+" per l'aggiunta di un nuovo Cliente nel catalogo
        const plusCard = document.createElement('button');
        plusCard.className = "glass-card plus-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[180px] text-graytext hover:text-white cursor-pointer";
        plusCard.innerHTML = `<i data-lucide="plus" class="w-8 h-8 text-graytext/60 group-hover:text-accent transition-transform animate-pulse"></i><span class="text-xs font-bold tracking-tight mt-2">Nuovo Cliente</span>`;
        plusCard.addEventListener('click', () => openCreateClientModal());
        grid.appendChild(plusCard);

        
        // Add client triggers
        document.querySelectorAll('.btn-edit-client').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-id');
                const docRef = doc(db, "hubClienti", docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    openEditClientModal(docId, docSnap.data());
                }
            });
        });

        document.querySelectorAll('.btn-delete-client').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-id');
                if(confirm("Sei sicuro di voler eliminare definitivamente questo cliente dall'Hub?")) {
                    await deleteDoc(doc(db, "hubClienti", docId));
                    loadAdminCatalog();
                }
            });
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
        loaderEl.classList.add('hidden');
        adminCatalogSection.classList.remove('hidden');
    } catch (error) {
        console.error("Errore catalogo:", error);
        alert("Errore nel caricamento del database dei clienti: " + error.message);
        loaderEl.classList.add('hidden');
        adminCatalogSection.classList.remove('hidden');
    }
}

function openCreateClientModal() {
    currentEditingClientId = null;
    document.getElementById('form-client').reset();
    document.getElementById('modal-client-title').innerHTML = 'Nuovo <span class="text-accent">Cliente</span>';
    document.getElementById('btn-submit-client').innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Crea Cliente';
    openCustomStep('client');
}

function openEditClientModal(id, data) {
    currentEditingClientId = id;
    document.getElementById('client-name-input').value = data.clientName || '';
    document.getElementById('client-avatar-input').value = data.avatarUrl || '';
    document.getElementById('client-ped-input').value = data.pedLink || '';
    document.getElementById('client-report-input').value = data.reportLink || '';
    document.getElementById('modal-client-title').innerHTML = 'Modifica <span class="text-accent">Cliente</span>';
    document.getElementById('btn-submit-client').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Aggiorna Cliente';
    openCustomStep('client');
}

const clientForm = document.getElementById('form-client');
if (clientForm) {
    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const clientName = document.getElementById('client-name-input').value.trim();
        const avatarUrl = document.getElementById('client-avatar-input').value.trim();
        const pedLink = document.getElementById('client-ped-input').value.trim();
        const reportLink = document.getElementById('client-report-input').value.trim();
        
        if (currentEditingClientId) {
            // Aggiorna
            try {
                const docRef = doc(db, "hubClienti", currentEditingClientId);
                await updateDoc(docRef, {
                    clientName,
                    avatarUrl,
                    pedLink,
                    reportLink
                });
                closeAuthModal();
                loadAdminCatalog();
            } catch (err) {
                alert("Errore durante l'aggiornamento.");
            }
        } else {
            // Crea
            const slug = createSlug(clientName) + "-" + Math.random().toString(36).substring(2, 7);
            try {
                await addDoc(collection(db, "hubClienti"), {
                    clientName,
                    avatarUrl,
                    pedLink,
                    reportLink,
                    slug,
                    createdAt: new Date()
                });
                closeAuthModal();
                loadAdminCatalog();
            } catch (err) {
                alert("Errore durante il salvataggio.");
            }
        }
    });
}

// LOGICA LOGIN
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
    document.getElementById('modal-step-client').classList.add('hidden');

    if (!auth.currentUser) {
        document.getElementById('modal-step-auth').classList.remove('hidden');
    } else if (step === 'client') {
        document.getElementById('modal-step-client').classList.remove('hidden');
    }
    openAuthModal();
}

function openAuthModal() {
        if (!auth.currentUser) {
        document.getElementById('modal-step-auth').classList.remove('hidden');
        document.getElementById('modal-step-client').classList.add('hidden');
    }
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
window.openCreateClientModal = openCreateClientModal;
window.openCustomStep = openCustomStep;
