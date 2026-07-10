import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
// DOM Elements
const loaderEl = document.getElementById('main-loader');
const lockSection = document.getElementById('section-lock');
const adminCatalogSection = document.getElementById('section-admin-catalog');
const clientGrid = document.getElementById('client-grid');
const adminIndicator = document.getElementById('admin-indicator');
const btnLogout = document.getElementById('btn-logout');
const adminFooter = document.getElementById('admin-footer');
const ambientDecor = document.getElementById('ambient-decor');
// Modal Elements
const authModal = document.getElementById('auth-modal');
const modalStepLogin = document.getElementById('modal-step-login');
const modalStepCreateClient = document.getElementById('modal-step-create-client');
const formLogin = document.getElementById('form-login');
const formCreateClient = document.getElementById('form-create-client');
const authError = document.getElementById('auth-error');
const clientFormError = document.getElementById('client-form-error');
// Client View Animation Elements
const introScreen = document.getElementById('intro-screen');
const introLogo = document.getElementById('intro-logo');
const sectionClientView = document.getElementById('section-client-view');
const clientLogoTop = document.getElementById('client-logo-top');
const profileImgContainer = document.getElementById('profile-img-container');
const clientAvatar = document.getElementById('client-avatar');
const clientGreeting = document.getElementById('client-greeting');
const clientNameSpan = document.getElementById('client-name-span');
const clientActions = document.getElementById('client-actions');
const btnPed = document.getElementById('btn-ped');
const btnReport = document.getElementById('btn-report');
let currentUser = null;
// Helpers
function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}
// Router Initialization
async function initRouter(user) {
    currentUser = user;
    loaderEl.classList.remove('hidden');
    lockSection.classList.add('hidden');
    adminCatalogSection.classList.add('hidden');
    sectionClientView.classList.add('hidden');
    introScreen.classList.add('hidden');
    if (user) {
        adminIndicator.classList.remove('hidden');
        btnLogout.classList.remove('hidden');
        adminFooter.classList.remove('hidden');
    } else {
        adminIndicator.classList.add('hidden');
        btnLogout.classList.add('hidden');
        adminFooter.classList.add('hidden');
    }
    if (clientSlug) {
        // CLIENT PAGE MODE
        try {
            const q = query(collection(db, "hubClienti"), where("slug", "==", clientSlug));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                const clientData = clientDoc.data();
                setupClientView(clientData);
            } else {
                // If client not found, redirect to main hub
                alert("Cliente non trovato.");
                window.location.href = './';
            }
        } catch (error) {
            console.error("Errore recupero cliente:", error);
            alert("Si è verificato un errore durante il recupero dei dati.");
        }
    } else {
        // ADMIN MODE
        loaderEl.classList.add('hidden');
        if (user) {
            adminCatalogSection.classList.remove('hidden');
            loadClientCatalog();
        } else {
            lockSection.classList.remove('hidden');
        }
    }
}
// PWA & UI Setup for Client
function setupClientView(clientData) {
    // 1. Setup PWA Manifest and Apple Meta tags dynamically
    setupDynamicPWA(clientData);
    // 2. Hydrate client details
    clientAvatar.src = clientData.profileImage || "https://cdn.statically.io/gh/teomacauda/cdn-assets/main/Favicon.png";
    clientNameSpan.textContent = clientData.clientName;
    // Configure PED Button
    if (clientData.pedLink && clientData.pedLink.trim() !== '') {
        btnPed.href = clientData.pedLink;
        btnPed.classList.remove('hidden');
    } else {
        btnPed.classList.add('hidden');
    }
    // Configure Report Button
    if (clientData.reportLink && clientData.reportLink.trim() !== '') {
        btnReport.href = clientData.reportLink;
        btnReport.classList.remove('hidden');
    } else {
        btnReport.classList.add('hidden');
    }
    // Hide general page elements
    loaderEl.classList.add('hidden');
    if (ambientDecor) ambientDecor.classList.add('hidden');
    document.getElementById('navbar').classList.add('hidden');
    // 3. Start Intro Animation Flow
    startIntroAnimation();
}
// Generate PWA Dynamic Manifest and Icons
function setupDynamicPWA(clientData) {
    // Manifest configuration
    const manifest = {
        "name": `Hub - ${clientData.clientName}`,
        "short_name": clientData.clientName,
        "start_url": window.location.href,
        "display": "standalone",
        "background_color": "#000000",
        "theme_color": "#000000",
        "orientation": "portrait",
        "icons": [
            {
                "src": clientData.profileImage || "https://cdn.statically.io/gh/teomacauda/cdn-assets/main/Favicon.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ]
    };
    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    
    // Add Manifest link tag
    let link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestURL;
    document.head.appendChild(link);
    // Add iOS specific Apple touch icon
    let appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = clientData.profileImage || "https://cdn.statically.io/gh/teomacauda/cdn-assets/main/Favicon.png";
    document.head.appendChild(appleTouchIcon);
    // Add Web App title
    let appleTitle = document.createElement('meta');
    appleTitle.name = 'apple-mobile-web-app-title';
    appleTitle.content = clientData.clientName;
    document.head.appendChild(appleTitle);
}
// Intro Animation Sequence
function startIntroAnimation() {
    // Step A: Show Intro screen with logo fading in
    introScreen.classList.remove('hidden');
    setTimeout(() => {
        introLogo.classList.remove('opacity-0');
        introLogo.classList.add('opacity-100');
    }, 100);
    // Step B: Fade logo out after 1.8 seconds
    setTimeout(() => {
        introLogo.classList.remove('opacity-100');
        introLogo.classList.add('opacity-0');
    }, 1800);
    // Step C: Transition to Client Interactive View
    setTimeout(() => {
        introScreen.classList.add('opacity-0');
        setTimeout(() => {
            introScreen.classList.add('hidden');
        }, 1000);
        // Show section and fade-in the avatar/greeting
        sectionClientView.classList.remove('hidden');
        setTimeout(() => {
            clientAvatar.classList.remove('opacity-0');
            clientAvatar.classList.add('opacity-100');
            clientGreeting.classList.remove('opacity-0', 'translate-y-4');
            clientGreeting.classList.add('opacity-100', 'translate-y-0');
        }, 100);
    }, 2800);
    // Step D: Minimize Profile Image, Hide greeting, and slide in Action Buttons
    setTimeout(() => {
        // Move & scale profile image container
        profileImgContainer.style.transform = 'translateY(-12vh) scale(0.75)';
        
        // Fade out welcome greeting text
        clientGreeting.style.opacity = '0';
        clientGreeting.style.transform = 'translateY(-10px)';
        // Fade in top left logo and action buttons
        clientLogoTop.classList.remove('opacity-0');
        clientLogoTop.classList.add('opacity-100');
        clientActions.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        clientActions.classList.add('opacity-100', 'scale-100');
    }, 5500);
}
// Load catalog of clients for Admin view
async function loadClientCatalog() {
    clientGrid.innerHTML = '<div class="col-span-full flex justify-center py-10"><div class="loader"></div></div>';
    try {
        const q = query(collection(db, "hubClienti"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        clientGrid.innerHTML = '';
        if (querySnapshot.empty) {
            clientGrid.innerHTML = `
                <div class="col-span-full text-center py-16 glass-card rounded-2xl border-white/5">
                    <p class="text-graytext text-sm">Nessun cliente configurato. Clicca su "Nuovo Cliente" per iniziare.</p>
                </div>
            `;
            return;
        }
        querySnapshot.forEach((doc) => {
            const client = doc.data();
            const clientId = doc.id;
            const clientUrl = `${window.location.origin}${window.location.pathname}?v=${client.slug}`;
            const card = document.createElement('div');
            card.className = 'glass-card rounded-2xl p-6 flex flex-col justify-between border border-white/5';
            card.innerHTML = `
                <div>
                    <div class="flex items-center gap-4 mb-4">
                        <img src="${client.profileImage || 'https://cdn.statically.io/gh/teomacauda/cdn-assets/main/Favicon.png'}" 
                             alt="${client.clientName}" 
                             class="w-14 h-14 rounded-full object-cover border border-accent/30 bg-white/5">
                        <div>
                            <h3 class="text-white font-bold text-lg leading-snug">${client.clientName}</h3>
                            <p class="text-accent text-[11px] font-mono mt-0.5">slug: ${client.slug}</p>
                        </div>
                    </div>
                    <div class="space-y-2 mt-4 mb-6">
                        <div class="flex items-center gap-2 text-xs text-graytext">
                            <i data-lucide="calendar" class="w-3.5 h-3.5 text-accent"></i>
                            <span class="truncate">PED: ${client.pedLink ? client.pedLink : 'Non impostato'}</span>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-graytext">
                            <i data-lucide="bar-chart-3" class="w-3.5 h-3.5 text-accent"></i>
                            <span class="truncate">Report: ${client.reportLink ? client.reportLink : 'Non impostato'}</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-white/5">
                    <button class="btn-copy-link h-9 px-3 bg-white/5 hover:bg-accent hover:text-white text-graytext rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 duration-200" 
                            data-url="${clientUrl}">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> <span>Copia Link</span>
                    </button>
                    <button class="btn-edit-client h-9 px-3 bg-white/5 hover:bg-white hover:text-black text-graytext rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 duration-200" 
                            data-id="${clientId}">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Modifica
                    </button>
                </div>
            `;
            clientGrid.appendChild(card);
        });
        // Initialize Lucide Icons for dynamic content
        if (window.lucide) window.lucide.createIcons();
        // Attach Copy Link Listeners
        document.querySelectorAll('.btn-copy-link').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const url = btn.getAttribute('data-url');
                const label = btn.querySelector('span');
                const icon = btn.querySelector('i');
                
                try {
                    await navigator.clipboard.writeText(url);
                    label.textContent = 'Copiato!';
                    btn.classList.add('bg-emerald-500/20', 'text-emerald-400');
                    if (icon) {
                        icon.setAttribute('data-lucide', 'check');
                        if (window.lucide) window.lucide.createIcons();
                    }
                    setTimeout(() => {
                        label.textContent = 'Copia Link';
                        btn.classList.remove('bg-emerald-500/20', 'text-emerald-400');
                        if (icon) {
                            icon.setAttribute('data-lucide', 'copy');
                            if (window.lucide) window.lucide.createIcons();
                        }
                    }, 2000);
                } catch (err) {
                    console.error("Impossibile copiare il link:", err);
                    alert("Errore durante la copia del link.");
                }
            });
        });
        // Attach Edit Listeners
        document.querySelectorAll('.btn-edit-client').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                openEditClientModal(id);
            });
        });
    } catch (err) {
        console.error("Errore caricamento catalogo:", err);
        clientGrid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <p class="text-red-400 text-sm">Errore durante il caricamento dei dati.</p>
            </div>
        `;
    }
}
// Modal handling
window.openAuthModal = function(step) {
    authModal.classList.remove('opacity-0', 'pointer-events-none');
    const modalContent = authModal.querySelector('.glass-modal');
    modalContent.style.transform = 'translateY(0)';
    modalStepLogin.classList.add('hidden');
    modalStepCreateClient.classList.add('hidden');
    if (step === 'login') {
        modalStepLogin.classList.remove('hidden');
    } else if (step === 'create-client') {
        document.getElementById('client-modal-title').innerHTML = `Configura <span class="text-accent">Nuovo Cliente</span>`;
        formCreateClient.reset();
        document.getElementById('edit-client-id').value = '';
        modalStepCreateClient.classList.remove('hidden');
    }
}
window.closeAuthModal = function() {
    authModal.classList.add('opacity-0', 'pointer-events-none');
    const modalContent = authModal.querySelector('.glass-modal');
    modalContent.style.transform = 'translateY(100%)';
}
async function openEditClientModal(clientId) {
    try {
        const docRef = doc(db, "hubClienti", clientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('edit-client-id').value = clientId;
            document.getElementById('client-name-input').value = data.clientName || '';
            document.getElementById('client-avatar-input').value = data.profileImage || '';
            document.getElementById('client-ped-input').value = data.pedLink || '';
            document.getElementById('client-report-input').value = data.reportLink || '';
            document.getElementById('client-modal-title').innerHTML = `Modifica <span class="text-accent">Cliente</span>`;
            
            authModal.classList.remove('opacity-0', 'pointer-events-none');
            const modalContent = authModal.querySelector('.glass-modal');
            modalContent.style.transform = 'translateY(0)';
            modalStepLogin.classList.add('hidden');
            modalStepCreateClient.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Errore caricamento dettagli cliente per modifica:", err);
    }
}
// Authentication Actions
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const loader = document.getElementById('login-loader');
    loader.classList.remove('hidden');
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeAuthModal();
        formLogin.reset();
    } catch (err) {
        console.error("Errore login:", err);
        authError.textContent = "Credenziali non valide.";
        authError.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
});
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (err) {
        console.error("Errore di disconnessione:", err);
    }
});
// Create or Update Client Action
formCreateClient.addEventListener('submit', async (e) => {
    e.preventDefault();
    clientFormError.classList.add('hidden');
    const clientId = document.getElementById('edit-client-id').value;
    const clientName = document.getElementById('client-name-input').value;
    const profileImage = document.getElementById('client-avatar-input').value;
    const pedLink = document.getElementById('client-ped-input').value;
    const reportLink = document.getElementById('client-report-input').value;
    const slug = createSlug(clientName);
    try {
        if (clientId) {
            // Update mode
            const docRef = doc(db, "hubClienti", clientId);
            await updateDoc(docRef, {
                clientName,
                slug,
                profileImage,
                pedLink,
                reportLink
            });
        } else {
            // Create mode
            await addDoc(collection(db, "hubClienti"), {
                clientName,
                slug,
                profileImage,
                pedLink,
                reportLink,
                createdAt: new Date().toISOString()
            });
        }
        
        closeAuthModal();
        formCreateClient.reset();
        loadClientCatalog();
    } catch (err) {
        console.error("Errore salvataggio cliente:", err);
        clientFormError.textContent = "Errore durante il salvataggio dei dati.";
        clientFormError.classList.remove('hidden');
    }
});
// Firebase Auth Observer
onAuthStateChanged(auth, (user) => {
    initRouter(user);
});
// Initialize Lucide on page load
if (window.lucide) window.lucide.createIcons();
