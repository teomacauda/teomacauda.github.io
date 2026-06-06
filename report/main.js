import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const reportSlug = urlParams.get('v');

const loaderEl = document.getElementById('main-loader');
const lockSection = document.getElementById('section-lock');
const adminCatalogSection = document.getElementById('section-admin-catalog');
const adminDetailSection = document.getElementById('section-admin-report-detail');
const clientViewSection = document.getElementById('section-client-report-view');
const adminIndicator = document.getElementById('admin-indicator');

let currentReportDocId = null;
let editingItemIndex = null;
let activeAdminSort = 'global'; // 'global' o 'grouped'

function generateSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Router Manager Context
async function initReportRouter(user) {
    loaderEl.classList.remove('hidden');
    lockSection.classList.add('hidden');
    adminCatalogSection.classList.add('hidden');
    adminDetailSection.classList.add('hidden');
    clientViewSection.classList.add('hidden');
    
    if (user) adminIndicator.classList.remove('hidden');
    else adminIndicator.classList.add('hidden');

    if (reportSlug) {
        try {
            const q = query(collection(db, "reportMensili"), where("slug", "==", reportSlug));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnapshot = querySnapshot.docs[0];
                const reportData = docSnapshot.data();
                currentReportDocId = docSnapshot.id;

                if (user) {
                    // Vista Admin Dettaglio
                    document.getElementById('report-title-display').innerText = reportData.title;
                    document.getElementById('followers-instagram').value = reportData.followersIg || 0;
                    document.getElementById('followers-tiktok').value = reportData.followersTt || 0;
                    document.getElementById('followers-youtube').value = reportData.followersYt || 0;
                    
                    renderAdminContentsLayout(reportData.items || []);
                    loaderEl.classList.add('hidden');
                    adminDetailSection.classList.remove('hidden');
                } else {
                    // Vista Cliente Scrollytelling Premium
                    document.getElementById('main-footer').classList.add('hidden');
                    document.getElementById('navbar').classList.add('hidden');
                    
                    renderClientReportView(reportData);
                    loaderEl.classList.add('hidden');
                    clientViewSection.classList.remove('hidden');
                    initIntersectionCounters();
                }
            } else {
                window.location.href = './';
            }
        } catch (err) {
            console.error("Firestore Loading Error:", err);
            window.location.href = './';
        }
    } else {
        if (user) {
            loadAdminCatalogGrid();
        } else {
            loaderEl.classList.add('hidden');
            lockSection.classList.remove('hidden');
        }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Catalogo Iniziale dei Report Creati
async function loadAdminCatalogGrid() {
    const grid = document.getElementById('report-grid');
    grid.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, "reportMensili"));
        if (querySnapshot.empty) {
            grid.innerHTML = `<div class="col-span-full text-center text-graytext italic font-light py-12">Nessun report mensile registrato. Creane uno nuovo.</div>`;
        } else {
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const card = document.createElement('div');
                card.className = "glass-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-40";
                card.innerHTML = `
                    <div>
                        <h3 class="text-lg font-bold text-white tracking-tight">${data.title}</h3>
                        <p class="text-xs text-graytext mt-1 font-light">Elementi: ${(data.items || []).length}</p>
                    </div>
                    <div class="flex items-center justify-between mt-4">
                        <button onclick="window.location.search = '?v=${data.slug}'" class="h-8 px-3 bg-accent hover:bg-accentHover text-white text-xs font-bold rounded-lg transition-all">Apri Report</button>
                        <button data-id="${docSnap.id}" class="btn-delete-report h-8 w-8 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg flex items-center justify-center transition-all"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                `;
                grid.appendChild(card);
            });
            
            document.querySelectorAll('.btn-delete-report').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const docId = btn.getAttribute('data-id');
                    if(confirm("Sei sicuro di voler eliminare definitivamente questo report?")) {
                        await deleteDoc(doc(db, "reportMensili", docId));
                        loadAdminCatalogGrid();
                    }
                });
            });
        }
    } catch(err) {
        console.error("Catalog Loader Error:", err);
    }
    loaderEl.classList.add('hidden');
    adminCatalogSection.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Logica Render Layout Admin (Global vs Grouped) con Condizione Zero Spazzatura
function renderAdminContentsLayout(items) {
    const container = document.getElementById('admin-report-contents-layout');
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = `<div class="text-center text-graytext font-light italic p-8 glass-card rounded-xl">Nessun contenuto video o post aggiunto a questo report.</div>`;
        return;
    }

    if (activeAdminSort === 'global') {
        // Classifica Totale Ordine Decrescente di Views
        const sortedItems = [...items].sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
        container.appendChild(buildAdminTableBlock("Classifica Globale Performance", sortedItems));
    } else {
        // Raggruppati per Piattaforma - Se non presenti, scompaiono totalmente dal DOM
        const platforms = ["Reel", "Post", "Storia", "Video YT", "YT Shorts", "TikTok"];
        platforms.forEach(platform => {
            const filtered = items.filter(i => i.type === platform)
                                  .sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
            if (filtered.length > 0) {
                container.appendChild(buildAdminTableBlock(`Canale: ${platform}`, filtered, items));
            }
        });
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildAdminTableBlock(title, sortedItems, originalItems = null) {
    const block = document.createElement('div');
    block.className = "glass-card p-5 rounded-2xl border border-white/5 overflow-hidden";
    
    let rowsHtml = sortedItems.map(item => {
        // Trova l'indice originario per la modifica/eliminazione sicura
        const originalIndex = originalItems ? originalItems.findIndex(orig => orig.title === item.title && orig.views === item.views) : sortedItems.indexOf(item);
        return `
            <tr class="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                <td class="p-4 font-bold text-white text-sm">${item.title}</td>
                <td class="p-4 text-xs text-accent font-semibold">${item.type}</td>
                <td class="p-4 text-sm text-white font-medium">${parseInt(item.views).toLocaleString('it-IT')}</td>
                <td class="p-4 text-sm text-graytext">${parseInt(item.likes).toLocaleString('it-IT')}</td>
                <td class="p-4 text-right space-x-2">
                    <button data-index="${originalIndex}" class="btn-item-edit h-8 w-8 bg-white/5 hover:bg-accent/20 hover:text-accent rounded-lg border border-white/5 transition-all"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                    <button data-index="${originalIndex}" class="btn-item-delete h-8 w-8 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg border border-red-500/10 transition-all"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    block.innerHTML = `
        <h3 class="text-sm font-bold text-graytext uppercase tracking-wider mb-4 border-b border-white/5 pb-2">${title}</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="text-graytext text-[10px] uppercase font-bold tracking-wider border-b border-white/5">
                        <th class="p-4">Contenuto</th>
                        <th class="p-4">Formato</th>
                        <th class="p-4">Views</th>
                        <th class="p-4">Like</th>
                        <th class="p-4 text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
    `;

    // Event Handlers per azioni interni alla tabella generata
    block.querySelectorAll('.btn-item-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.getAttribute('data-index');
            openAddItemModal(parseInt(idx));
        });
    });

    block.querySelectorAll('.btn-item-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            if(confirm("Rimuovere questo contenuto dal report?")) {
                const reportSnap = await getDoc(doc(db, "reportMensili", currentReportDocId));
                let currentItems = reportSnap.data().items || [];
                currentItems.splice(idx, 1);
                await updateDoc(doc(db, "reportMensili", currentReportDocId), { items: currentItems });
                initReportRouter(auth.currentUser);
            }
        });
    });

    return block;
}

// ================= RENDER LOGICA CLIENT SCROLLYTELLING CON CALCOLI AUTOMATICI =================
function renderClientReportView(data) {
    const items = data.items || [];
    
    // 1. Configurazione Titoli Copertina
    document.getElementById('client-hero-title').innerText = data.title;

    // 2. Calcolo Follower Totali e Gestione Visibilità Righe Condizionali Canali
    const igF = parseInt(data.followersIg) || 0;
    const ttF = parseInt(data.followersTt) || 0;
    const ytF = parseInt(data.followersYt) || 0;
    const totalF = igF + ttF + ytF;

    document.getElementById('client-stat-total-followers').setAttribute('data-target', totalF);
    
    if(igF > 0) {
        document.getElementById('row-client-ig-followers').classList.remove('hidden');
        document.getElementById('client-stat-ig-followers').setAttribute('data-target', igF);
    }
    if(ttF > 0) {
        document.getElementById('row-client-tt-followers').classList.remove('hidden');
        document.getElementById('client-stat-tt-followers').setAttribute('data-target', ttF);
    }
    if(ytF > 0) {
        document.getElementById('row-client-yt-followers').classList.remove('hidden');
        document.getElementById('client-stat-yt-followers').setAttribute('data-target', ytF);
    }

    // Se non ci sono contenuti inseriti, bypassiamo i calcoli di Re o Campioni
    if(items.length === 0) return;

    // Mappatura Icone Lucide
    const iconMap = {
        'Reel': '<i data-lucide="instagram" class="w-4 h-4 text-pink-400"></i>',
        'Post': '<i data-lucide="image" class="w-4 h-4 text-indigo-400"></i>',
        'Storia': '<i data-lucide="clock" class="w-4 h-4 text-amber-400"></i>',
        'Video YT': '<i data-lucide="youtube" class="w-4 h-4 text-red-500"></i>',
        'YT Shorts': '<i data-lucide="video" class="w-4 h-4 text-red-400"></i>',
        'TikTok': '<i data-lucide="music" class="w-4 h-4 text-cyan-400"></i>'
    };

    // 3. Elaborazione Automatica Video con più VIEWS
    const kingViews = [...items].sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0))[0];
    document.getElementById('client-king-views-title').innerText = kingViews.title;
    document.getElementById('client-king-views-platform').innerText = kingViews.type;
    document.getElementById('client-stat-king-views-count').setAttribute('data-target', kingViews.views);
    document.getElementById('client-king-views-icon').innerHTML = iconMap[kingViews.type] || '';
    document.getElementById('client-views-king-link').href = kingViews.link || '#';

    // 4. Elaborazione Automatica Video con più LIKE
    const kingLikes = [...items].sort((a, b) => (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0))[0];
    document.getElementById('client-king-likes-title').innerText = kingLikes.title;
    document.getElementById('client-king-likes-platform').innerText = kingLikes.type;
    document.getElementById('client-stat-king-likes-count').setAttribute('data-target', kingLikes.likes);
    document.getElementById('client-king-likes-icon').innerHTML = iconMap[kingLikes.type] || '';

    // 5. Generazione Slide Finale di Dettaglio Strutturato (Solo Piattaforme Esistenti)
    const breakdownLayout = document.getElementById('client-full-breakdown-layout');
    breakdownLayout.innerHTML = '';

    const activePlatforms = ["Reel", "Post", "Storia", "Video YT", "YT Shorts", "TikTok"];
    activePlatforms.forEach(pform => {
        const platformItems = items.filter(i => i.type === pform).sort((a,b) => b.views - a.views);
        if(platformItems.length > 0) {
            const cardWrap = document.createElement('div');
            cardWrap.className = "space-y-3 w-full";
            cardWrap.innerHTML = `
                <h3 class="text-xs font-bold text-graytext uppercase tracking-widest flex items-center gap-2 px-1">
                    ${iconMap[pform] || ''} Riepilogo ${pform}
                </h3>
            `;
            
            platformItems.forEach(item => {
                const rowItem = document.createElement('div');
                rowItem.className = "glass-card p-4 rounded-xl border border-white/5 flex flex-col gap-1";
                rowItem.innerHTML = `
                    <div class="text-sm font-bold text-white tracking-tight">${item.title}</div>
                    <div class="flex items-center gap-4 text-xs text-graytext mt-2 border-t border-white/5 pt-2">
                        <span class="flex items-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5 text-accent"></i> <b>${parseInt(item.views).toLocaleString('it-IT')}</b> views</span>
                        <span class="flex items-center gap-1"><i data-lucide="heart" class="w-3.5 h-3.5 text-pink-400"></i> <b>${parseInt(item.likes).toLocaleString('it-IT')}</b> like</span>
                    </div>
                `;
                cardWrap.appendChild(rowItem);
            });
            breakdownLayout.appendChild(cardWrap);
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ================= TIMING COUNTER INTERSECTION OBSERVER (TRIGGER AL WORD-OF-SIGHT) =================
function initIntersectionCounters() {
    const targetCounters = document.querySelectorAll('.counter-anim');
    const config = { root: null, threshold: 0.15 };

    const runObserver = new IntersectionObserver((entries, self) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const element = entry.target;
                const limitValue = parseInt(element.getAttribute('data-target'), 10) || 0;
                triggerSmoothCount(element, limitValue);
                self.unobserve(element); // Stoppa ascolto ad animazione eseguita
            }
        });
    }, config);

    targetCounters.forEach(c => runObserver.observe(c));
}

function triggerSmoothCount(element, target) {
    let start = 0;
    const animationDuration = 1600; // Fluidità in 1.6s
    const launchTime = performance.now();

    function flow(now) {
        const dynamicTime = now - launchTime;
        const timelineProgress = Math.min(dynamicTime / animationDuration, 1);
        
        // Easing quadratica out
        const easeOutEffect = timelineProgress * (2 - timelineProgress);
        const intermediateVal = Math.floor(easeOutEffect * target);
        
        element.innerText = intermediateVal.toLocaleString('it-IT');

        if(timelineProgress < 1) {
            requestAnimationFrame(flow);
        } else {
            element.innerText = target.toLocaleString('it-IT');
        }
    }
    requestAnimationFrame(flow);
}

// ================= MODAL HANDLERS ED EVENTI INTERFACCIA GESTIONALE =================
window.openAuthModal = () => {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-10', 'translate-y-0');
};
window.closeAuthModal = () => {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-0', 'translate-y-10');
};
window.openCreateReportModal = () => {
    const modal = document.getElementById('create-report-modal');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-10', 'translate-y-0');
};
window.closeCreateReportModal = () => {
    const modal = document.getElementById('create-report-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-0', 'translate-y-10');
};

window.openAddItemModal = (index = null) => {
    editingItemIndex = index;
    const modal = document.getElementById('add-item-modal');
    const form = document.getElementById('form-report-item');
    const mTitle = document.getElementById('add-item-modal-title');
    
    form.reset();
    if(editingItemIndex !== null) {
        mTitle.innerText = "Modifica Contenuto";
        getDoc(doc(db, "reportMensili", currentReportDocId)).then(snap => {
            const item = snap.data().items[editingItemIndex];
            document.getElementById('item-title').value = item.title;
            document.getElementById('item-type').value = item.type;
            document.getElementById('item-link').value = item.link || '';
            document.getElementById('metric-views').value = item.views || 0;
            document.getElementById('metric-likes').value = item.likes || 0;
            document.getElementById('metric-comments').value = item.comments || 0;
            document.getElementById('metric-shares').value = item.shares || 0;
        });
    } else {
        mTitle.innerText = "Aggiungi Contenuto al Report";
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-10', 'translate-y-0');
};

window.closeAddItemModal = () => {
    const modal = document.getElementById('add-item-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-0', 'translate-y-10');
};

// Listeners dei Form e dei Pulsanti Controllo Sort
document.getElementById('sort-btn-global').addEventListener('click', () => {
    activeAdminSort = 'global';
    document.getElementById('sort-btn-global').className = "px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-accent text-white";
    document.getElementById('sort-btn-grouped').className = "px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-graytext hover:text-white";
    getDoc(doc(db, "reportMensili", currentReportDocId)).then(s => renderAdminContentsLayout(s.data().items || []));
});

document.getElementById('sort-btn-grouped').addEventListener('click', () => {
    activeAdminSort = 'grouped';
    document.getElementById('sort-btn-grouped').className = "px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-accent text-white";
    document.getElementById('sort-btn-global').className = "px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-graytext hover:text-white";
    getDoc(doc(db, "reportMensili", currentReportDocId)).then(s => renderAdminContentsLayout(s.data().items || []));
});

document.getElementById('form-admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
        closeAuthModal();
    } catch(err) { alert("Autenticazione fallita credenziali errate."); }
});

document.getElementById('form-create-report').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tVal = document.getElementById('report-client-name').value;
    const slug = generateSlug(tVal) + "-" + Math.floor(1000 + Math.random() * 9000);
    await addDoc(collection(db, "reportMensili"), { title: tVal, slug: slug, items: [], followersIg: 0, followersTt: 0, followersYt: 0 });
    closeCreateReportModal();
    loadAdminCatalogGrid();
});

document.getElementById('btn-add-item').addEventListener('click', () => openAddItemModal());

document.getElementById('form-report-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemData = {
        title: document.getElementById('item-title').value,
        type: document.getElementById('item-type').value,
        link: document.getElementById('item-link').value,
        views: parseInt(document.getElementById('metric-views').value) || 0,
        likes: parseInt(document.getElementById('metric-likes').value) || 0,
        comments: parseInt(document.getElementById('metric-comments').value) || 0,
        shares: parseInt(document.getElementById('metric-shares').value) || 0
    };

    const docRef = doc(db, "reportMensili", currentReportDocId);
    const snap = await getDoc(docRef);
    let currentItems = snap.data().items || [];

    if(editingItemIndex !== null) {
        currentItems[editingItemIndex] = itemData;
    } else {
        currentItems.push(itemData);
    }

    await updateDoc(docRef, { items: currentItems });
    closeAddItemModal();
    initReportRouter(auth.currentUser);
});

document.getElementById('form-report-followers').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "reportMensili", currentReportDocId), {
        followersIg: parseInt(document.getElementById('followers-instagram').value) || 0,
        followersTt: parseInt(document.getElementById('followers-tiktok').value) || 0,
        followersYt: parseInt(document.getElementById('followers-youtube').value) || 0
    });
    alert("Metriche follower salvate correttamente nel database.");
});

document.getElementById('btn-clear-all').addEventListener('click', async () => {
    if(confirm("Sei sicuro di voler cancellare tutti i contenuti video/post inseriti in questo report?")) {
        await updateDoc(doc(db, "reportMensili", currentReportDocId), { items: [] });
        initReportRouter(auth.currentUser);
    }
});

document.getElementById('btn-copy-link').addEventListener('click', () => {
    const link = `${window.location.origin}${window.location.pathname}?v=${reportSlug}`;
    navigator.clipboard.writeText(link).then(() => alert("Link cliente copiato nei appunti."));
});

// Personalizzazione Titolo Report real-time
document.getElementById('btn-edit-report-title').addEventListener('click', () => {
    document.getElementById('edit-title-field-container').classList.remove('hidden');
    document.getElementById('input-report-title').value = document.getElementById('report-title-display').innerText;
});
document.getElementById('btn-cancel-report-title').addEventListener('click', () => {
    document.getElementById('edit-title-field-container').classList.add('hidden');
});
document.getElementById('btn-save-report-title').addEventListener('click', async () => {
    const newVal = document.getElementById('input-report-title').value;
    await updateDoc(doc(db, "reportMensili", currentReportDocId), { title: newVal });
    document.getElementById('report-title-display').innerText = newVal;
    document.getElementById('edit-title-field-container').classList.add('hidden');
});

// Monitoraggio Stato Auth
onAuthStateChanged(auth, (user) => {
    initReportRouter(user);
});
