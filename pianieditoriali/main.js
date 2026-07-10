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

const btnEditTitle = document.getElementById('btn-edit-title');
const editTitleContainer = document.getElementById('edit-title-container');
const inputClientTitle = document.getElementById('input-client-title');
const btnSaveTitle = document.getElementById('btn-save-title');
const btnCancelTitle = document.getElementById('btn-cancel-title');

let currentClientDocId = null;
let editingVideoIndex = null; 
let draggedIndex = null;

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

    // Gestione pulsante di ritorno all'HUB
    const hubParam = urlParams.get('hub');
    const backToHubBtn = document.getElementById('back-to-hub');
    if (backToHubBtn) {
        if (hubParam) {
            if (window.location.origin.includes('localhost') || window.location.protocol === 'file:') {
                backToHubBtn.href = `../Hub%20clienti/?v=${hubParam}`;
            } else {
                backToHubBtn.href = `https://teomacauda.it/hubclienti/?v=${hubParam}`;
            }
            backToHubBtn.style.display = 'inline-flex';
        } else {
            backToHubBtn.style.display = 'none';
        }
    }

    
    if (clientSlug) {
        try {
            const q = query(collection(db, "pianiEditoriali"), where("slug", "==", clientSlug));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                const clientData = clientDoc.data();

                if (clientData.isHub === true) {
                    window.location.href = './';
                    return;
                }
                
                currentClientDocId = clientDoc.id;

                document.getElementById('client-title').innerText = `Piano Editoriale: ${clientData.clientName}`;
                
                if (user) {
                    document.getElementById('admin-plan-tools').classList.remove('hidden');
                    if (btnEditTitle) btnEditTitle.classList.remove('hidden');
                } else {
                    document.getElementById('admin-plan-tools').classList.add('hidden');
                    if (btnEditTitle) btnEditTitle.classList.add('hidden');
                    if (editTitleContainer) editTitleContainer.classList.add('hidden');
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
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

function renderVideoTable(videos, isAdmin) {
    const tbody = document.getElementById('video-table-body');
    const mobileContainer = document.getElementById('video-cards-container');
    
    tbody.innerHTML = '';
    if (mobileContainer) mobileContainer.innerHTML = '';

    const headerRow = document.getElementById('video-table-header-row');
    if (headerRow) {
        const hasDragHeader = headerRow.querySelector('.drag-header');
        if (isAdmin && !hasDragHeader) {
            const th = document.createElement('th');
            th.className = 'p-5 w-10 text-center drag-header';
            headerRow.insertBefore(th, headerRow.firstChild);
        } else if (!isAdmin && hasDragHeader) {
            hasDragHeader.remove();
        }
    }

    // --- COSTRUZIONE BLOCCHI DI RIEPILOGO PREMIUM (SQUARE & CENTERED) ---
    const statsContainer = document.getElementById('stats-dashboard');
    if (statsContainer) {
        statsContainer.innerHTML = '';
        
        const counts = { "Video YT": 0, "Reel": 0, "TikTok": 0, "YT Shorts": 0, "Storia": 0, "Post": 0 };
        videos.forEach(v => {
            const fmt = v.type || "Video YT";
            if (counts[fmt] !== undefined) counts[fmt]++;
        });

        // Configurazione estetica coerente con l'interfaccia dark/premium e i tag di riga
        const formatsConfig = [
            { id: "Video YT", label: "YT Video", emoji: "📺", styleClass: "bg-red-600/[0.02] border-red-600/20 text-red-500 hover:border-red-500/40" },
            { id: "Reel", label: "Reel", emoji: "📸", styleClass: "bg-pink-500/[0.02] border-pink-500/20 text-pink-400 hover:border-pink-400/40" },
            { id: "TikTok", label: "TikTok", emoji: "🎵", styleClass: "bg-cyan-500/[0.02] border-cyan-500/20 text-cyan-400 hover:border-cyan-400/40" },
            { id: "YT Shorts", label: "Shorts", emoji: "🩳", styleClass: "bg-red-500/[0.02] border-red-500/20 text-red-400 hover:border-red-400/40" },
            { id: "Storia", label: "Storia", emoji: "⏳", styleClass: "bg-amber-500/[0.02] border-amber-500/20 text-amber-400 hover:border-amber-400/40" },
            { id: "Post", label: "Post", emoji: "🖼️", styleClass: "bg-indigo-500/[0.02] border-indigo-500/20 text-indigo-400 hover:border-indigo-400/40" }
        ];

        formatsConfig.forEach(cfg => {
            const count = counts[cfg.id] || 0;
            
            if (count > 0) {
                const card = document.createElement('div');
                card.className = `relative overflow-hidden aspect-square w-24 sm:w-28 rounded-2xl flex flex-col items-center justify-center border text-center transition-all duration-300 group glass-card ${cfg.styleClass}`;
                card.innerHTML = `
                    <div class="text-[10px] font-bold tracking-wider text-graytext uppercase select-none opacity-70 mb-1">
                        ${cfg.label}
                    </div>
                    <div class="text-3xl font-black text-white tracking-tight leading-none select-none z-10">
                        ${count}
                    </div>
                    <div class="absolute right-1.5 bottom-1.5 text-sm opacity-20 group-hover:opacity-40 transition-opacity select-none pointer-events-none">
                        ${cfg.emoji}
                    </div>
                `;
                statsContainer.appendChild(card);
            }
        });
    }
    // -------------------------------------------------------------
    if (videos.length === 0) {
        const emptyStateHtml = `Nessun contenuto programmato al momento.`;
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-graytext font-light italic">${emptyStateHtml}</td></tr>`;
        if (mobileContainer) {
            mobileContainer.innerHTML = `<div class="p-6 text-center text-graytext font-light italic glass-card rounded-xl border border-white/5">${emptyStateHtml}</div>`;
        }
        return;
    }

    videos.forEach((video, index) => {
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

        let finalScriptLink = video.scriptLink || '';
        if (finalScriptLink) {
            const currentPed = new URLSearchParams(window.location.search).get('v');
            if (currentPed) {
                if (finalScriptLink.includes('?')) {
                    finalScriptLink = `${finalScriptLink}&ped=${currentPed}`;
                } else {
                    finalScriptLink = `${finalScriptLink}?ped=${currentPed}`;
                }
            }
        }

        // DESKTOP ROW
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/[0.01] transition-colors group";
        const cleanTitle = (video.title || '').replace(/[^a-zA-Z0-9]/g, '');
        tr.style.viewTransitionName = `row-${cleanTitle || index}`;
        tr.innerHTML = `
            ${isAdmin ? `
                <td class="p-5 text-center whitespace-nowrap drag-handle select-none">
                    <button class="inline-flex h-8 w-8 hover:bg-white/5 hover:text-accent rounded-lg items-center justify-center text-graytext/30 cursor-grab active:cursor-grabbing transition-all" title="Trascina per riordinare">
                        <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                    </button>
                </td>
            ` : ''}
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
                    <a href="${finalScriptLink}" class="inline-flex h-8 px-3 bg-white/5 hover:bg-accent hover:text-white rounded-lg items-center gap-1.5 text-xs text-graytext hover:text-white transition-all">
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

        if (isAdmin) {
            tr.dataset.index = index;
            const handleBtn = tr.querySelector('.drag-handle button');
            
            handleBtn.addEventListener('mousedown', () => {
                tr.setAttribute('draggable', 'true');
            });
            handleBtn.addEventListener('mouseup', () => {
                tr.removeAttribute('draggable');
            });
            
            tr.addEventListener('dragstart', (e) => {
                draggedIndex = index;
                e.dataTransfer.effectAllowed = 'move';
                tr.classList.add('opacity-40');
            });
            
            tr.addEventListener('dragend', () => {
                tr.classList.remove('opacity-40');
                document.querySelectorAll('#video-table-body tr').forEach(row => {
                    row.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                tr.removeAttribute('draggable');
            });
            
            tr.addEventListener('dragover', (e) => {
                e.preventDefault();
                const rect = tr.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                
                document.querySelectorAll('#video-table-body tr').forEach(row => {
                    row.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                
                if (relY < rect.height / 2) {
                    tr.classList.add('drag-over-top');
                } else {
                    tr.classList.add('drag-over-bottom');
                }
            });
            
            tr.addEventListener('drop', async (e) => {
                e.preventDefault();
                const rect = tr.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                let targetIndex = index;
                
                if (relY >= rect.height / 2) {
                    targetIndex = index + 1;
                }
                
                if (draggedIndex !== null && draggedIndex !== targetIndex && draggedIndex !== targetIndex - 1) {
                    const movedItem = videos.splice(draggedIndex, 1)[0];
                    let finalTargetIndex = targetIndex;
                    if (draggedIndex < targetIndex) {
                        finalTargetIndex--;
                    }
                    videos.splice(finalTargetIndex, 0, movedItem);
                    
                    try {
                        const docRef = doc(db, "pianiEditoriali", currentClientDocId);
                        await updateDoc(docRef, { videos: videos });
                        
                        if (document.startViewTransition) {
                            document.startViewTransition(() => {
                                renderVideoTable(videos, isAdmin);
                            });
                        } else {
                            renderVideoTable(videos, isAdmin);
                        }
                    } catch (error) {
                        console.error("Errore nel riordinamento:", error);
                        alert("Errore nel salvataggio dell'ordine.");
                    }
                }
            });
        }

        // MOBILE CARD
        if (mobileContainer) {
            const card = document.createElement('div');
            card.className = "glass-card p-4 rounded-xl border border-white/5 flex flex-col gap-3 transition-all";
            card.innerHTML = `
                <div class="flex items-start justify-between gap-3 select-none cursor-pointer" onclick="document.getElementById('mobile-details-${index}').classList.toggle('hidden'); this.querySelector('.chevron-icon').classList.toggle('rotate-180');">
                    <div class="flex flex-col gap-1.5 max-w-[85%]">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full ${badgeStyle}">
                                <span>${emoji}</span><span>${video.status}</span>
                            </span>
                            <span class="inline-block text-[9px] font-bold tracking-wide border px-2 py-0.5 rounded-md ${typeStyle}">
                                ${format}
                            </span>
                        </div>
                        <h3 class="text-base font-bold text-white tracking-tight leading-snug">${video.title}</h3>
                        <div class="flex items-center gap-1 text-xs text-graytext mt-0.5">
                            <i data-lucide="calendar" class="w-3.5 h-3.5 text-accent"></i>
                            <span>${video.date || 'Da definire'}</span>
                        </div>
                    </div>
                    <div class="pt-1">
                        <i data-lucide="chevron-down" class="chevron-icon w-5 h-5 text-graytext transition-transform duration-200"></i>
                    </div>
                </div>
                <div id="mobile-details-${index}" class="hidden border-t border-white/5 pt-3 mt-1 space-y-3">
                    ${video.notes ? `
                        <div>
                            <span class="block text-[9px] font-bold text-graytext uppercase tracking-wider mb-1">Note / Briefing</span>
                            <p class="text-xs text-graytext font-light leading-relaxed bg-white/[0.01] p-2.5 rounded-lg border border-white/5 whitespace-pre-line">${video.notes}</p>
                        </div>
                    ` : ''}
                    <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div>
                            ${video.scriptLink ? `
                                <a href="${finalScriptLink}" class="inline-flex h-8 px-3 bg-white/5 hover:bg-accent hover:text-white rounded-lg items-center gap-1.5 text-xs text-graytext hover:text-white transition-all">
                                    <span>Leggi Script</span> <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                </a>
                            ` : `<span class="text-xs text-graytext/40 italic">Nessuno Script</span>`}
                        </div>
                        ${isAdmin ? `
                            <div class="flex items-center gap-2">
                                <button data-index="${index}" class="btn-edit-single inline-flex h-8 px-3 bg-white/5 hover:bg-accent/20 hover:text-accent border border-white/5 rounded-lg items-center gap-1.5 text-xs text-graytext hover:text-white transition-all">
                                    <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Modifica
                                </button>
                                <button data-index="${index}" class="btn-delete-single inline-flex h-8 w-8 bg-red-500/10 hover:bg-red-500 border border-red-500/10 text-red-400 hover:text-white rounded-lg items-center justify-center transition-all">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            mobileContainer.appendChild(card);
        }
    });

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
            if (data.isHub === true) return;
            
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

// LOGICA MODIFICA TITOLO PIANO EDITORIALE
if (btnEditTitle) {
    btnEditTitle.addEventListener('click', () => {
        const clientTitleEl = document.getElementById('client-title');
        const currentTitle = clientTitleEl.innerText.replace("Piano Editoriale: ", "");
        inputClientTitle.value = currentTitle;
        editTitleContainer.classList.remove('hidden');
    });
}

if (btnCancelTitle) {
    btnCancelTitle.addEventListener('click', () => {
        editTitleContainer.classList.add('hidden');
    });
}

if (btnSaveTitle) {
    btnSaveTitle.addEventListener('click', async () => {
        const newTitle = inputClientTitle.value.trim();
        if (!newTitle) {
            alert("Il nome del piano non può essere vuoto.");
            return;
        }
        if (!currentClientDocId) return;

        try {
            const docRef = doc(db, "pianiEditoriali", currentClientDocId);
            await updateDoc(docRef, { clientName: newTitle });
            
            document.getElementById('client-title').innerText = `Piano Editoriale: ${newTitle}`;
            editTitleContainer.classList.add('hidden');
        } catch (error) {
            console.error("Errore durante la modifica del titolo:", error);
            alert("Impossibile aggiornare il titolo del piano.");
        }
    });
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
                    currentVideos[editingVideoIndex] = videoData;
                } else {
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
    editingVideoIndex = null; 
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
