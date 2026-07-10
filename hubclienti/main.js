import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Firebase coerente
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
const videoSlug = urlParams.get('v');

const loaderEl = document.getElementById('main-loader');
const lockSection = document.getElementById('section-lock');
const catalogSection = document.getElementById('section-catalog');
const detailSection = document.getElementById('section-detail');
const authModal = document.getElementById('auth-modal');
const modalContent = authModal.querySelector('.glass-modal');

let currentScriptId = null;
let currentScriptData = null;
let editingScriptId = null;

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Router avanzato con controllo accessi biforcato (Admin / Cliente)
async function initRouter(user) {
    if (!loaderEl) return;
    loaderEl.classList.remove('hidden');
    catalogSection.classList.add('hidden');
    detailSection.classList.add('hidden');
    if (lockSection) lockSection.classList.add('hidden');

    if (user) {
        document.getElementById('admin-indicator')?.classList.remove('hidden');
    } else {
        document.getElementById('admin-indicator')?.classList.add('hidden');
    }

    if (videoSlug) {
        // --- VISTA CLIENTE / DETTAGLIO SCRIPT (Accessibile a tutti) ---
        try {
            const q = query(collection(db, "scripts"), where("slug", "==", videoSlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const scriptDoc = querySnapshot.docs[0];
                currentScriptId = scriptDoc.id;
                currentScriptData = scriptDoc.data();
                
                document.getElementById('detail-title').innerText = currentScriptData.title;
                document.getElementById('detail-category').innerText = currentScriptData.category;
                document.getElementById('detail-hook').innerText = currentScriptData.hook;
                document.getElementById('detail-corpo').innerText = currentScriptData.corpo;
                document.getElementById('detail-cta').innerText = currentScriptData.cta;
                
                // Gestione Visibilità Strumenti Admin per il singolo script
                const adminTools = document.getElementById('admin-script-tools');
                if (adminTools) {
                    if (user) {
                        adminTools.classList.remove('hidden');
                    } else {
                        adminTools.classList.add('hidden');
                    }
                }

                // Gestione Visibilità Chiudi Script solo per Admin
                const closeScriptBtn = document.getElementById('btn-close-script');
                if (closeScriptBtn) {
                    if (user) {
                        closeScriptBtn.classList.remove('hidden');
                    } else {
                        closeScriptBtn.classList.add('hidden');
                    }
                }

                loaderEl.classList.add('hidden');
                detailSection.classList.remove('hidden');
            } else {
                window.location.href = '/script';
            }
        } catch (error) {
            console.error(error);
            window.location.href = '/script';
        }
    } else {
        // --- VISTA HOME / CATALOGO COMPLETO (Solo Admin Loggato) ---
        if (user) {
            try {
                const q = query(collection(db, "scripts"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const grid = document.getElementById('catalog-grid');
                grid.innerHTML = '';

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const card = document.createElement('a');
                    card.href = `/script/?v=${data.slug}`;
                    card.className = "glass-card p-6 rounded-2xl text-left flex flex-col justify-between min-h-[160px]";
                    card.innerHTML = `
                        <div>
                            <span class="inline-block text-[9px] font-bold uppercase tracking-wider text-accent bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full mb-3">${data.category}</span>
                            <h3 class="text-lg font-bold text-white tracking-tight line-clamp-2">${data.title}</h3>
                        </div>
                        <div class="flex items-center gap-1 text-xs text-graytext mt-4">
                            <span>Apri struttura</span> <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </div>
                    `;
                    grid.appendChild(card);
                });

                // Tasto geometrico "+" per l'aggiunta di un nuovo Script
                const plusCard = document.createElement('button');
                plusCard.id = "btn-open-auth-trigger";
                plusCard.className = "glass-card plus-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[160px] text-graytext hover:text-white cursor-pointer";
                plusCard.innerHTML = `<i data-lucide="plus" class="w-8 h-8 text-graytext/60 group-hover:text-accent transition-transform"></i>`;
                
                plusCard.addEventListener('click', () => {
                    editingScriptId = null; 
                    document.getElementById('modal-create-title').innerHTML = 'Nuovo <span class="text-accent">Video Script</span>';
                    document.getElementById('btn-submit-script').innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Pubblica nel Sito';
                    document.getElementById('form-create-script').reset();
                    openAuthModal();
                });
                grid.appendChild(plusCard);

                lucide.createIcons();
                loaderEl.classList.add('hidden');
                catalogSection.classList.remove('hidden');
            } catch (error) {
                console.error(error);
            }
        } else {
            // Se non è loggato e si trova sulla home page degli script, mostra la sezione protetta
            loaderEl.classList.add('hidden');
            if (lockSection) lockSection.classList.remove('hidden');
            lucide.createIcons();
        }
    }
}

// MANAGEMENT DEL LOGIN
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
            authError.innerText = "Dati errati.";
        }
    });
}

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

// GESTIONE SUBMIT FORM (CREAZIONE / MODIFICA BIFORCATA)
const createForm = document.getElementById('form-create-script');
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('script-title').value;
        const category = document.getElementById('script-category').value;
        const hook = document.getElementById('form-hook').value;
        const corpo = document.getElementById('form-corpo').value;
        const cta = document.getElementById('form-cta').value;
        const slug = createSlug(title);

        try {
            if (editingScriptId) {
                // Esecuzione Modifica
                const scriptRef = doc(db, "scripts", editingScriptId);
                await updateDoc(scriptRef, {
                    title: title,
                    slug: slug,
                    category: category,
                    hook: hook,
                    corpo: corpo,
                    cta: cta
                });
                editingScriptId = null;
                closeAuthModal();
                window.location.href = `/script/?v=${slug}`;
            } else {
                // Esecuzione Nuova Pubblicazione
                await addDoc(collection(db, "scripts"), {
                    title: title,
                    slug: slug,
                    category: category,
                    hook: hook,
                    corpo: corpo,
                    cta: cta,
                    createdAt: new Date()
                });
                closeAuthModal();
                window.location.href = '/script';
            }
        } catch (error) {
            alert("Errore Firestore.");
        }
    });
}

// LOGICHE D'INTERFACCIA ED EDITING AVANZATO
function triggerEditScript() {
    if (!currentScriptData) return;
    editingScriptId = currentScriptId;
    
    document.getElementById('script-title').value = currentScriptData.title;
    document.getElementById('script-category').value = currentScriptData.category;
    document.getElementById('form-hook').value = currentScriptData.hook;
    document.getElementById('form-corpo').value = currentScriptData.corpo;
    document.getElementById('form-cta').value = currentScriptData.cta;
    
    document.getElementById('modal-create-title').innerHTML = 'Modifica <span class="text-accent">Video Script</span>';
    document.getElementById('btn-submit-script').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Salva Modifiche';
    
    lucide.createIcons();
    openAuthModal();
}

async function triggerDeleteScript() {
    if (!currentScriptId) return;
    if (confirm("Sei sicuro di voler eliminare definitivamente questo script?")) {
        try {
            await deleteDoc(doc(db, "scripts", currentScriptId));
            window.location.href = '/script';
        } catch (error) {
            alert("Errore durante l'eliminazione dello script.");
        }
    }
}

function triggerCopyLink() {
    const link = window.location.href;
    
    const doFeedback = () => {
        const btn = document.getElementById('btn-copy-link');
        if (!btn) return;
        const iconSpan = btn.querySelector('i');
        const textSpan = btn.querySelector('span');
        
        const originalText = textSpan.innerText;
        
        textSpan.innerText = "Link Copiato!";
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
        navigator.clipboard.writeText(link).then(() => {
            doFeedback();
        }).catch(err => {
            console.error('Errore durante la copia del link:', err);
            fallbackCopyText(link, doFeedback);
        });
    } else {
        fallbackCopyText(link, doFeedback);
    }
}

function fallbackCopyText(text, callback) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            callback();
        } else {
            console.error('Fallback: Copia fallita');
        }
    } catch (err) {
        console.error('Fallback: Impossibile copiare', err);
    }

    document.body.removeChild(textArea);
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-copy-link')?.addEventListener('click', triggerCopyLink);
    document.getElementById('btn-edit-script')?.addEventListener('click', triggerEditScript);
    document.getElementById('btn-delete-script')?.addEventListener('click', triggerDeleteScript);
    
    // Gestione pulsante di ritorno al PED
    const pedParam = urlParams.get('ped');
    const backToPedBtn = document.getElementById('back-to-ped');
    if (backToPedBtn) {
        if (pedParam) {
            backToPedBtn.href = `https://teomacauda.it/pianieditoriali/?v=${pedParam}`;
            backToPedBtn.style.display = 'inline-flex';
        } else {
            backToPedBtn.style.display = 'none';
        }
    }

    lucide.createIcons();
});
