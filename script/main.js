import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. INCOLLA QUI I TUOI DATI PRESI DALLA CONSOLE DI FIREBASE
const firebaseConfig = {
    apiKey: "LA_TUA_API_KEY",
    authDomain: "IL_TUO_AUTH_DOMAIN",
    projectId: "IL_TUO_PROJECT_ID",
    storageBucket: "IL_TUO_STORAGE_BUCKET",
    messagingSenderId: "IL_TUO_MESSAGING_SENDER_ID",
    appId: "IL_TUO_APP_ID"
};

// Inizializzazione
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const videoSlug = urlParams.get('v');

const loaderEl = document.getElementById('main-loader');
const catalogSection = document.getElementById('section-catalog');
const detailSection = document.getElementById('section-detail');
const authModal = document.getElementById('auth-modal');
const modalContent = authModal.querySelector('.glass-modal');

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// CONTROLLO PERCORSI E DISTRIBUZIONE DINAMICA CARD +
async function initRouter() {
    if (!loaderEl) return;
    loaderEl.classList.remove('hidden');
    catalogSection.classList.add('hidden');
    detailSection.classList.add('hidden');

    if (videoSlug) {
        try {
            const q = query(collection(db, "scripts"), where("slug", "==", videoSlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const scriptData = querySnapshot.docs[0].data();
                
                document.getElementById('detail-title').innerText = scriptData.title;
                document.getElementById('detail-category').innerText = scriptData.category;
                document.getElementById('detail-hook').innerText = scriptData.hook;
                document.getElementById('detail-corpo').innerText = scriptData.corpo;
                document.getElementById('detail-cta').innerText = scriptData.cta;
                
                loaderEl.classList.add('hidden');
                detailSection.classList.remove('hidden');
            } else {
                window.location.href = '/script';
            }
        } catch (error) {
            window.location.href = '/script';
        }
    } else {
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

            // Tasto "+" geometrico avanzato
            const plusCard = document.createElement('button');
            plusCard.id = "btn-open-auth-trigger";
            plusCard.className = "glass-card plus-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[160px] text-graytext hover:text-white cursor-pointer";
            plusCard.innerHTML = `<i data-lucide="plus" class="w-8 h-8 text-graytext/60 group-hover:text-accent transition-transform"></i>`;
            
            plusCard.addEventListener('click', openAuthModal);
            grid.appendChild(plusCard);

            lucide.createIcons();
            loaderEl.classList.add('hidden');
            catalogSection.classList.remove('hidden');
        } catch (error) {
            console.error(error);
        }
    }
}

// LOGIN MANAGEMENT
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
    if (!stepAuth || !stepCreate) return;
    
    if (user) {
        stepAuth.classList.add('hidden');
        stepCreate.classList.remove('hidden');
    } else {
        stepAuth.classList.remove('hidden');
        stepCreate.classList.add('hidden');
    }
});

// INVIO SCRIPT A FIRESTORE
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
        } catch (error) {
            alert("Errore Firestore.");
        }
    });
}

// LOGICHE DI INTERFACCIA (ESPOSTE A WINDOW PER I CLICK INFISSI NELL'HTML)
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const menuContent = document.getElementById('mobileMenuContent');
    const iconMenu = document.getElementById('icon-menu');
    const iconX = document.getElementById('icon-x');
    const isOpen = menu.classList.contains('opacity-100');
    if (!isOpen) {
        menu.classList.remove('opacity-0', 'pointer-events-none');
        menu.classList.add('opacity-100', 'pointer-events-auto');
        menuContent.classList.replace('-translate-y-6', 'translate-y-0');
        iconMenu.classList.add('hidden');
        iconX.classList.remove('hidden');
    } else {
        menu.classList.add('opacity-0', 'pointer-events-none');
        menu.classList.remove('opacity-100', 'pointer-events-auto');
        menuContent.classList.replace('translate-y-0', '-translate-y-6');
        iconX.classList.add('hidden');
        iconMenu.classList.remove('hidden');
    }
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

// Esponiamo le funzioni all'oggetto globale Window così i tuoi attributi HTML onclick="Formula()" continuano a funzionare al 100%
window.toggleMobileMenu = toggleMobileMenu;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    lucide.createIcons();
});
