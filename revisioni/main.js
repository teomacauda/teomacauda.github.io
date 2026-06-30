import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Firebase
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

// Router State
const urlParams = new URLSearchParams(window.location.search);
const videoSlug = urlParams.get('v');

const loaderEl = document.getElementById('main-loader');
const lockSection = document.getElementById('section-lock');
const adminSection = document.getElementById('section-admin');
const clientSection = document.getElementById('section-client');
const authModal = document.getElementById('auth-modal');
const modalStepAuth = document.getElementById('modal-step-auth');
const modalStepCreate = document.getElementById('modal-step-create');

let currentUser = null;
let currentProjectId = null;
let currentProjectData = null;

// YouTube Player Instance
let ytPlayer = null;
let currentPausedTime = 0;

// ----------------------------------------------------
// UTILS
// ----------------------------------------------------

function createSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

function extractYouTubeId(urlOrId) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);
    return (match && match[2].length === 11) ? match[2] : urlOrId.trim();
}

function formatTime(seconds) {
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s - (hrs * 3600)) / 60);
    const secs = s - (hrs * 3600) - (mins * 60);
    
    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');
    
    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
}

// ----------------------------------------------------
// AUTH & MODALS
// ----------------------------------------------------

window.openAuthModal = function() {
    modalStepAuth.classList.remove('hidden');
    modalStepCreate.classList.add('hidden');
    authModal.classList.remove('pointer-events-none');
    gsap.to(authModal, { opacity: 1, duration: 0.3 });
    gsap.to(authModal.querySelector('.glass-modal'), { y: 0, duration: 0.4, ease: "power3.out" });
};

window.openCreateModal = function() {
    modalStepAuth.classList.add('hidden');
    modalStepCreate.classList.remove('hidden');
    authModal.classList.remove('pointer-events-none');
    gsap.to(authModal, { opacity: 1, duration: 0.3 });
    gsap.to(authModal.querySelector('.glass-modal'), { y: 0, duration: 0.4, ease: "power3.out" });
};

window.closeAuthModal = function() {
    gsap.to(authModal.querySelector('.glass-modal'), { 
        y: "100%", 
        duration: 0.4, 
        ease: "power3.in",
        onComplete: () => {
            authModal.classList.add('pointer-events-none');
            gsap.to(authModal, { opacity: 0, duration: 0.2 });
        }
    });
};

// Form Login Submit
document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('auth-error');
    const loader = document.getElementById('login-loader');
    
    errorEl.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeAuthModal();
    } catch (error) {
        console.error(error);
        errorEl.innerText = "Credenziali non valide.";
        errorEl.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
});

// ----------------------------------------------------
// ROUTER & LIFE CYCLE
// ----------------------------------------------------

async function initRouter(user) {
    loaderEl.classList.remove('hidden');
    lockSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    clientSection.classList.add('hidden');

    if (user) {
        document.getElementById('admin-indicator')?.classList.remove('hidden');
        document.getElementById('btn-admin-login-direct')?.classList.add('hidden');
    } else {
        document.getElementById('admin-indicator')?.classList.add('hidden');
        document.getElementById('btn-admin-login-direct')?.classList.remove('hidden');
    }

    if (videoSlug) {
        // --- CLIENT SIDE: REVISION FOR A SPECIFIC VIDEO ---
        try {
            const q = query(collection(db, "revisions"), where("slug", "==", videoSlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const projectDoc = querySnapshot.docs[0];
                currentProjectId = projectDoc.id;
                currentProjectData = projectDoc.data();
                
                document.getElementById('client-project-title').innerText = currentProjectData.title;
                document.getElementById('client-project-user').innerText = currentProjectData.client.toUpperCase();
                
                // Initialize YouTube Player
                initYoutubePlayer(currentProjectData.youtubeId);
                
                // Listen to Reviews comments in real-time
                listenToReviews(currentProjectId);

                loaderEl.classList.add('hidden');
                clientSection.classList.remove('hidden');
                lucide.createIcons();
            } else {
                alert("Progetto di revisione non trovato.");
                window.location.search = '';
            }
        } catch (error) {
            console.error("Error loading project:", error);
            alert("Errore nel caricamento del progetto: " + error.message);
            loaderEl.classList.add('hidden');
            lockSection.classList.remove('hidden');
        }
    } else {
        // --- ADMIN SIDE: SHOW DASHBOARD IF LOGGED IN, ELSE SHOW LOCK ---
        loaderEl.classList.add('hidden');
        if (user) {
            adminSection.classList.remove('hidden');
            loadAdminProjects();
        } else {
            lockSection.classList.remove('hidden');
        }
        lucide.createIcons();
    }
}

// ----------------------------------------------------
// YOUTUBE INTEGRATION
// ----------------------------------------------------

function initYoutubePlayer(youtubeId) {
    if (window.YT && window.YT.Player) {
        createYTPlayer(youtubeId);
    } else {
        // Evita problemi di caricamento asincrono della libreria YouTube
        const checkYT = setInterval(() => {
            if (window.YT && window.YT.Player) {
                clearInterval(checkYT);
                createYTPlayer(youtubeId);
            }
        }, 100);
    }
}

function createYTPlayer(youtubeId) {
    try {
        ytPlayer = new YT.Player('yt-player', {
            videoId: youtubeId,
            playerVars: {
                'playsinline': 1,
                'rel': 0,
                'modestbranding': 1
            },
            events: {
                'onStateChange': onPlayerStateChange,
                'onError': (e) => {
                    console.error("YouTube Player Error:", e);
                    alert("Errore nel caricamento del video di YouTube.");
                }
            }
        });
    } catch (e) {
        console.error("Errore creazione player YT:", e);
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PAUSED) {
        currentPausedTime = ytPlayer.getCurrentTime();
        
        const feedbackBox = document.getElementById('feedback-box');
        document.getElementById('feedback-timestamp').innerText = formatTime(currentPausedTime);
        
        feedbackBox.classList.remove('hidden');
        gsap.to(feedbackBox, { 
            scale: 1, 
            opacity: 1, 
            duration: 0.3,
            onComplete: () => {
                document.getElementById('feedback-input').focus();
            }
        });
    }
}

// Submit Feedback logic
async function submitFeedback() {
    const inputEl = document.getElementById('feedback-input');
    const commentText = inputEl.value.trim();
    
    if (!commentText) {
        alert("Inserisci un commento prima di inviare.");
        return;
    }
    if (!currentProjectId) {
        alert("Errore: ID Progetto non valido. Ricarica la pagina.");
        return;
    }
    
    try {
        await addDoc(collection(db, "reviews"), {
            projectId: currentProjectId,
            text: commentText,
            timestamp: currentPausedTime,
            completed: false,
            createdAt: serverTimestamp()
        });
        
        inputEl.value = "";
        
        const feedbackBox = document.getElementById('feedback-box');
        gsap.to(feedbackBox, {
            scale: 0.95,
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                feedbackBox.classList.add('hidden');
                if (ytPlayer && ytPlayer.playVideo) {
                    ytPlayer.playVideo();
                }
            }
        });
    } catch (e) {
        console.error("Errore durante l'invio del feedback:", e);
        alert("Errore nell'inviare il commento: " + e.message);
    }
}

// Handle Enter and Submit click
document.getElementById('feedback-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        submitFeedback();
    }
});
document.getElementById('btn-submit-feedback')?.addEventListener('click', submitFeedback);

// Global jumps function
window.jumpToTime = function(seconds) {
    if (ytPlayer && ytPlayer.seekTo) {
        ytPlayer.seekTo(seconds, true);
        ytPlayer.playVideo();
    }
};

// ----------------------------------------------------
// REALTIME COMMENTS LISTENER
// ----------------------------------------------------

let reviewsUnsubscribe = null;

function listenToReviews(projectId) {
    if (reviewsUnsubscribe) reviewsUnsubscribe();
    
    const q = query(
        collection(db, "reviews"),
        where("projectId", "==", projectId),
        orderBy("timestamp", "asc")
    );
    
    reviewsUnsubscribe = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('reviews-list');
        const counterEl = document.getElementById('comment-counter');
        
        listContainer.innerHTML = '';
        counterEl.innerText = snapshot.size;
        
        if (snapshot.empty) {
            listContainer.innerHTML = `<div class="text-center text-graytext text-sm py-8 font-light">Nessun feedback inviato per questa revisione.</div>`;
            return;
        }
        
        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const docId = docSnapshot.id;
            
            const item = document.createElement('div');
            item.className = "flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 transition-colors";
            
            const isCompleted = data.completed === true;
            const checkboxHTML = currentUser ? `
                <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                       onchange="toggleReviewComplete('${docId}', this.checked)" 
                       class="mt-1.5 w-4 h-4 rounded border-white/20 bg-black/40 text-accent focus:ring-accent accent-accent cursor-pointer">
            ` : '';
            
            item.innerHTML = `
                ${checkboxHTML}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <button onclick="jumpToTime(${data.timestamp})" 
                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 border border-accent/25 hover:bg-accent hover:text-white text-accent text-xs font-semibold transition-colors duration-150">
                            <i data-lucide="play" class="w-2.5 h-2.5"></i>
                            <span>${formatTime(data.timestamp)}</span>
                        </button>
                        <span class="text-[10px] text-graytext">${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                    <p class="text-sm font-light leading-relaxed select-text ${isCompleted ? 'line-through opacity-40' : 'text-white'}">
                        ${data.text}
                    </p>
                </div>
            `;
            listContainer.appendChild(item);
        });
        
        lucide.createIcons();
    }, (error) => {
        console.error("Error listening to reviews: ", error);
    });
}

window.toggleReviewComplete = async function(reviewId, isChecked) {
    if (!currentUser) return;
    try {
        const reviewRef = doc(db, "reviews", reviewId);
        await updateDoc(reviewRef, {
            completed: isChecked
        });
    } catch (e) {
        console.error("Error updating review completed status:", e);
    }
};

// ----------------------------------------------------
// PROJECT CREATION & MANAGEMENT (ADMIN HUB)
// ----------------------------------------------------

async function loadAdminProjects() {
    try {
        const q = query(collection(db, "revisions"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const grid = document.getElementById('projects-grid');
        grid.innerHTML = '';
        
        if (querySnapshot.empty) {
            grid.innerHTML = `
                <div class="col-span-full py-16 text-center text-graytext font-light text-sm">
                    Nessun progetto di revisione creato finora. Clicca su "Nuovo Progetto" in alto a destra.
                </div>
            `;
            return;
        }
        
        querySnapshot.forEach((projectDoc) => {
            const data = projectDoc.data();
            const projId = projectDoc.id;
            const fullLink = `${window.location.origin}${window.location.pathname}?v=${data.slug}`;
            
            const card = document.createElement('div');
            card.className = "glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[180px]";
            card.innerHTML = `
                <div>
                    <span class="inline-block text-[9px] font-bold uppercase tracking-wider text-accent bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full mb-3">${data.client}</span>
                    <h3 class="text-lg font-bold text-white tracking-tight line-clamp-1">${data.title}</h3>
                    <p class="text-xs text-graytext mt-1">ID Video: <span class="font-mono text-white">${data.youtubeId}</span></p>
                </div>
                <div class="flex items-center justify-between gap-3 mt-6">
                    <a href="?v=${data.slug}" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-accent transition-all text-xs font-semibold text-white">
                        <span>Apri</span> <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                    </a>
                    
                    <div class="flex gap-2">
                        <button onclick="copyToClipboard('${fullLink}', this)" class="inline-flex items-center gap-1.5 text-xs h-9 px-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-400 rounded-xl transition-all font-medium">
                            <i data-lucide="copy" class="w-3.5 h-3.5"></i> <span>Copia Link</span>
                        </button>
                        <button onclick="deleteProject('${projId}')" class="inline-flex items-center justify-center text-xs w-9 h-9 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-xl transition-all">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        
        lucide.createIcons();
    } catch (e) {
        console.error("Error loading admin projects:", e);
    }
}

// Copy to Clipboard with micro-feedback
window.copyToClipboard = function(link, buttonEl) {
    navigator.clipboard.writeText(link).then(() => {
        const textSpan = buttonEl.querySelector('span');
        const originalText = textSpan.innerText;
        
        textSpan.innerText = "Copiato!";
        buttonEl.classList.remove('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20');
        buttonEl.classList.add('text-white', 'bg-emerald-500', 'border-emerald-500');
        
        setTimeout(() => {
            textSpan.innerText = originalText;
            buttonEl.classList.remove('text-white', 'bg-emerald-500', 'border-emerald-500');
            buttonEl.classList.add('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20');
        }, 2000);
    }).catch(err => {
        console.error('Could not copy link: ', err);
    });
};

// Delete Project
window.deleteProject = async function(projectId) {
    if (!confirm("Sei sicuro di voler eliminare questo progetto di revisione e tutti i suoi feedback?")) return;
    
    try {
        await deleteDoc(doc(db, "revisions", projectId));
        
        // Also delete associated reviews
        const q = query(collection(db, "reviews"), where("projectId", "==", projectId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (d) => {
            await deleteDoc(d.ref);
        });
        
        loadAdminProjects();
    } catch (e) {
        console.error("Error deleting project:", e);
    }
};

// Create Project submit Form
document.getElementById('form-create-project')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('project-title').value.trim();
    const client = document.getElementById('project-client').value.trim();
    const youtubeInput = document.getElementById('project-youtube').value.trim();
    const slugInput = document.getElementById('project-slug').value.trim();
    
    const youtubeId = extractYouTubeId(youtubeInput);
    const slug = slugInput ? createSlug(slugInput) : createSlug(`${client}-${title}`);
    
    try {
        await addDoc(collection(db, "revisions"), {
            title,
            client,
            youtubeId,
            slug,
            createdAt: serverTimestamp()
        });
        
        document.getElementById('form-create-project').reset();
        closeAuthModal();
        loadAdminProjects();
    } catch (err) {
        console.error("Error creating project:", err);
        alert("Errore durante il salvataggio: " + err.message);
    }
});

// ----------------------------------------------------
// STATE OBSERVER
// ----------------------------------------------------

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    initRouter(user);
});
