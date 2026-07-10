import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Firebase condivisa
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
const clientViewSection = document.getElementById('section-client-view');
const authModal = document.getElementById('auth-modal');
const modalContent = authModal.querySelector('.glass-modal');
const adminIndicator = document.getElementById('admin-indicator');
const btnLogout = document.getElementById('btn-logout');

let editingClientId = null;

// Helper per lo slug
function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Helper per aggiungere il parametro hub al link
function appendHubParam(url, hubSlug) {
    if (!url) return '';
    try {
        if (url.includes('?')) {
            const parts = url.split('?');
            const searchParams = new URLSearchParams(parts[1]);
            searchParams.set('hub', hubSlug);
            return parts[0] + '?' + searchParams.toString();
        } else {
            return url + '?hub=' + encodeURIComponent(hubSlug);
        }
    } catch (e) {
        return url + (url.includes('?') ? '&' : '?') + 'hub=' + encodeURIComponent(hubSlug);
    }
}

// Router Centrale
async function initRouter(user) {
    loaderEl.classList.remove('hidden');
    lockSection.classList.add('hidden');
    adminCatalogSection.classList.add('hidden');
    clientViewSection.classList.add('hidden');
    
    if (user) {
        adminIndicator?.classList.remove('hidden');
        btnLogout?.classList.remove('hidden');
    } else {
        adminIndicator?.classList.add('hidden');
        btnLogout?.classList.add('hidden');
    }

    if (clientSlug) {
        // --- VISTA CLIENTE CON ANIMAZIONI ---
        try {
            const q = query(collection(db, "hubClienti"), where("slug", "==", clientSlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                const clientData = clientDoc.data();
                
                // Popolamento dei dati cliente
                document.getElementById('client-avatar').src = clientData.avatarUrl || 'https://raw.githubusercontent.com/teomacauda/cdn-assets/main/RawIcon.png?v=2';
                document.getElementById('client-greeting').innerText = `Ciao ${clientData.clientName}!`;
                
                // Configurazione pulsanti PED & Report con parametro hub
                const btnPed = document.getElementById('btn-ped');
                if (clientData.pedUrl) {
                    btnPed.href = appendHubParam(clientData.pedUrl, clientSlug);
                    btnPed.style.display = 'flex';
                } else {
                    btnPed.style.display = 'none';
                }

                const btnReport = document.getElementById('btn-report');
                if (clientData.reportUrl) {
                    btnReport.href = appendHubParam(clientData.reportUrl, clientSlug);
                    btnReport.style.display = 'flex';
                } else {
                    btnReport.style.display = 'none';
                }

                // Nascondi Header e Footer per una visualizzazione webapp immersiva
                document.getElementById('navbar').classList.add('hidden');
                document.getElementById('footer').classList.add('hidden');
                
                // Mostra la sezione cliente
                clientViewSection.classList.remove('hidden');
                loaderEl.classList.add('hidden');

                // --- SEQUENZA ANIMAZIONI CLIENTE ---
                const splashOverlay = document.getElementById('teo-logo-overlay');
                const splashLogo = document.getElementById('splash-logo-container');
                const headerContainer = document.getElementById('client-header-container');
                const logoTopLeft = document.getElementById('client-logo-topleft');
                const buttonsContainer = document.getElementById('client-buttons-container');

                // Reset stati
                splashOverlay.style.display = 'flex';
                splashOverlay.style.opacity = '1';
                splashLogo.classList.remove('animate-logo-splash');
                headerContainer.className = 'client-header-transition client-header-centered';
                logoTopLeft.classList.add('opacity-0');
                buttonsContainer.classList.add('opacity-0');
                buttonsContainer.style.transform = 'translate(-50%, 20px)';

                // Fase 1: Animazione Logo Teo Macauda
                setTimeout(() => {
                    splashLogo.classList.add('animate-logo-splash');
                }, 100);

                // Fase 2: Fine splash, apparizione Avatar e Ciao al centro
                setTimeout(() => {
                    // Sfuma e rimuovi l'overlay dello splash
                    splashOverlay.style.transition = 'opacity 0.6s ease';
                    splashOverlay.style.opacity = '0';
                    setTimeout(() => {
                        splashOverlay.style.display = 'none';
                    }, 600);

                    // Mostra l'avatar e il saluto del cliente centrati
                    headerContainer.classList.add('show');
                }, 2600);

                // Fase 3: Rimpicciolimento, salita dell'avatar, comparsa del logo in alto a sx e dei pulsanti
                setTimeout(() => {
                    // Sposta l'header in alto
                    headerContainer.classList.remove('client-header-centered', 'show');
                    headerContainer.classList.add('client-header-top');

                    // Comparsa del logo Teo Macauda in alto a sinistra
                    logoTopLeft.classList.remove('opacity-0');
                    logoTopLeft.classList.add('opacity-100');

                    // Comparsa e salita dei pulsanti risorse
                    buttonsContainer.classList.remove('opacity-0');
                    buttonsContainer.classList.add('opacity-100');
                    buttonsContainer.style.transform = 'translate(-50%, 0)';
                }, 4800);

            } else {
                // Se lo slug non corrisponde a nessun cliente, torna alla home
                window.location.href = './';
            }
        } catch (error) {
            console.error("Errore recupero cliente:", error);
            window.location.href = './';
        }
    } else {
        // --- VISTA HOME: LOCK O CATALOGO ADMIN ---
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('footer').classList.remove('hidden');
        
        if (user) {
            loadAdminCatalog();
        } else {
            loaderEl.classList.add('hidden');
            lockSection.classList.remove('hidden');
        }
    }
    lucide.createIcons();
}

// Caricamento del Catalogo Admin
async function loadAdminCatalog() {
    try {
        const q = query(collection(db, "hubClienti"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const grid = document.getElementById('client-grid');
        grid.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const clientUrl = `${window.location.origin}${window.location.pathname}?v=${data.slug}`;
            
            const card = document.createElement('div');
            card.className = "glass-card p-6 rounded-2xl text-left flex flex-col justify-between min-h-[180px] relative group";
            card.innerHTML = `
                <div>
                    <div class="flex items-center gap-3 mb-3">
                        <img src="${data.avatarUrl || 'https://raw.githubusercontent.com/teomacauda/cdn-assets/main/RawIcon.png?v=2'}" 
                             class="w-10 h-10 rounded-full object-cover border border-white/10" 
                             onerror="this.src='https://raw.githubusercontent.com/teomacauda/cdn-assets/main/RawIcon.png?v=2'">
                        <div>
                            <h3 class="text-lg font-bold text-white tracking-tight leading-tight pr-6">${data.clientName}</h3>
                            <p class="text-[10px] text-accent font-mono mt-0.5">/${data.slug}</p>
                        </div>
                    </div>
                    <div class="text-[10px] text-graytext/70 flex flex-col gap-1 mt-1 font-mono">
                        <div>PED: ${data.pedUrl ? '<span class="text-emerald-400">Configurato</span>' : '<span class="text-red-400">Non inserito</span>'}</div>
                        <div>REP: ${data.reportUrl ? '<span class="text-emerald-400">Configurato</span>' : '<span class="text-red-400">Non inserito</span>'}</div>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 mt-4">
                    <a href="?v=${data.slug}" class="h-8 px-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i> Vedi Hub
                    </a>
                    <button class="btn-copy-link-trigger h-8 px-2.5 bg-white/5 hover:bg-accent/20 hover:text-accent text-graytext rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all"
                            data-url="${clientUrl}">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> <span>Copia Link</span>
                    </button>
                    <button class="btn-edit-client-trigger h-8 px-2.5 bg-white/5 hover:bg-white/10 text-graytext hover:text-white rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all"
                            data-id="${docSnap.id}">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Modifica
                    </button>
                    <button class="btn-delete-client-trigger absolute top-5 right-5 text-graytext/40 hover:text-red-500 transition-colors p-1"
                            data-id="${docSnap.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Bottone geometrico "+" per l'aggiunta di un nuovo Cliente
        const plusCard = document.createElement('button');
        plusCard.className = "glass-card plus-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[180px] text-graytext hover:text-white cursor-pointer group";
        plusCard.innerHTML = `
            <i data-lucide="plus" class="w-8 h-8 text-graytext/60 group-hover:text-accent transition-transform group-hover:scale-110 duration-200"></i>
            <span class="text-xs font-semibold tracking-wider uppercase mt-3 text-graytext/60 group-hover:text-white transition-colors">Nuovo Cliente</span>
        `;
        plusCard.addEventListener('click', () => {
            editingClientId = null;
            document.getElementById('modal-create-title').innerHTML = 'Nuovo <span class="text-accent">Cliente</span>';
            document.getElementById('form-create-client').reset();
            openAuthModal();
        });
        grid.appendChild(plusCard);

        lucide.createIcons();
        attachAdminCardEventListeners();
        loaderEl.classList.add('hidden');
        adminCatalogSection.classList.remove('hidden');
    } catch (error) {
        console.error("Errore caricamento catalogo:", error);
    }
}

// Listener pulsanti schede Admin
function attachAdminCardEventListeners() {
    // Copia Link
    document.querySelectorAll('.btn-copy-link-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const url = button.getAttribute('data-url');
            triggerCopyText(url, button);
        });
    });

    // Modifica
    document.querySelectorAll('.btn-edit-client-trigger').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            editingClientId = id;
            try {
                const clientDoc = await getDoc(doc(db, "hubClienti", id));
                if (clientDoc.exists()) {
                    const data = clientDoc.data();
                    document.getElementById('client-name').value = data.clientName;
                    document.getElementById('client-avatar-input').value = data.avatarUrl;
                    document.getElementById('client-ped-input').value = data.pedUrl || '';
                    document.getElementById('client-report-input').value = data.reportUrl || '';

                    document.getElementById('modal-create-title').innerHTML = 'Modifica <span class="text-accent">Cliente</span>';
                    openAuthModal();
                }
            } catch (err) {
                alert("Errore caricamento dati cliente.");
            }
        });
    });

    // Elimina
    document.querySelectorAll('.btn-delete-client-trigger').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm("Sei sicuro di voler eliminare questo cliente dal database?")) {
                try {
                    await deleteDoc(doc(db, "hubClienti", id));
                    loadAdminCatalog();
                } catch (err) {
                    alert("Errore durante l'eliminazione del cliente.");
                }
            }
        });
    });
}

// Logica di copia link
function triggerCopyText(text, btn) {
    const iconSpan = btn.querySelector('i');
    const textSpan = btn.querySelector('span');
    const originalText = textSpan.innerText;

    const feedback = () => {
        textSpan.innerText = "Copiato!";
        if (iconSpan) {
            iconSpan.setAttribute('data-lucide', 'check');
            lucide.createIcons();
        }
        setTimeout(() => {
            textSpan.innerText = originalText;
            if (iconSpan) {
                iconSpan.setAttribute('data-lucide', 'copy');
                lucide.createIcons();
            }
        }, 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(feedback).catch(err => {
            console.error(err);
            fallbackCopyText(text, feedback);
        });
    } else {
        fallbackCopyText(text, feedback);
    }
}

function fallbackCopyText(text, callback) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        if (document.execCommand('copy')) callback();
    } catch (err) {
        console.error(err);
    }
    document.body.removeChild(textArea);
}

// Gestione Modali
function openAuthModal() {
    authModal.classList.remove('opacity-0', 'pointer-events-none');
    authModal.classList.add('opacity-100', 'pointer-events-auto');
    if (window.innerWidth < 640) {
        modalContent.classList.replace('translate-y-full', 'translate-y-0');
    } else {
        modalContent.classList.replace('translate-y-10', 'translate-y-0');
    }
}

function closeAuthModal() {
    authModal.classList.add('opacity-0', 'pointer-events-none');
    authModal.classList.remove('opacity-100', 'pointer-events-auto');
    if (window.innerWidth < 640) {
        modalContent.classList.replace('translate-y-0', 'translate-y-full');
    } else {
        modalContent.classList.replace('translate-y-0', 'translate-y-10');
    }
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

// Dom Ready Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    
    // Login form submit
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
                loginLoader.classList.add('hidden');
                closeAuthModal();
            } catch (error) {
                loginLoader.classList.add('hidden');
                authError.classList.remove('hidden');
                authError.innerText = "Credenziali non valide.";
            }
        });
    }

    // Logout trigger
    btnLogout?.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.reload();
        });
    });

    // Create / Edit Form submit
    const createForm = document.getElementById('form-create-client');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('client-name').value;
            const avatarUrl = document.getElementById('client-avatar-input').value;
            const pedUrl = document.getElementById('client-ped-input').value;
            const reportUrl = document.getElementById('client-report-input').value;
            const slug = createSlug(name);

            try {
                if (editingClientId) {
                    const clientRef = doc(db, "hubClienti", editingClientId);
                    await updateDoc(clientRef, {
                        clientName: name,
                        slug: slug,
                        avatarUrl: avatarUrl,
                        pedUrl: pedUrl,
                        reportUrl: reportUrl
                    });
                    editingClientId = null;
                } else {
                    await addDoc(collection(db, "hubClienti"), {
                        clientName: name,
                        slug: slug,
                        avatarUrl: avatarUrl,
                        pedUrl: pedUrl,
                        reportUrl: reportUrl,
                        createdAt: new Date()
                    });
                }
                closeAuthModal();
                loadAdminCatalog();
            } catch (error) {
                alert("Errore nel salvataggio su Firestore.");
            }
        });
    }

    // State Auth listener
    onAuthStateChanged(auth, (user) => {
        const stepAuth = document.getElementById('modal-step-auth');
        const stepCreate = document.getElementById('modal-step-create');
        
        if (stepAuth && stepCreate) {
            if (user) {
                stepAuth.classList.add('hidden');
                stepCreate.classList.remove('hidden');
            } else {
                stepAuth.classList.remove('hidden');
                stepCreate.classList.add('hidden');
            }
        }
        initRouter(user);
    });
});
