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
let activeAdminSort = 'global'; 

// Codice Vettoriale SVG Nativo Strutturato Premium (Inclusi i vettori up/down richiesti)
const inlineVectors = {
    instagram: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
    tiktok: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`,
    youtube: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.56 49.56 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/><polygon points="10 15 15 12 10 9"/></svg>`,
    image: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    clock: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    video: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>`,
    pencil: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    trash: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    eye: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    heart: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    arrowUp: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/></svg>`,
    arrowDown: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25"/></svg>`
};

function generateSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\--+/g, '-');
}

function getPlatformTagHtml(type) {
    let customStyle = "bg-white/5 border-white/10 text-white";
    if (type === "Reel") customStyle = "bg-pink-500/10 border-pink-500/20 text-pink-400";
    if (type === "Post") customStyle = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
    if (type === "Storia") customStyle = "bg-amber-500/10 border-amber-500/20 text-amber-400";
    if (type === "Video YT" || type === "YT Shorts") customStyle = "bg-red-500/10 border-red-500/20 text-red-400";
    if (type === "TikTok") customStyle = "bg-cyan-500/10 border-cyan-500/20 text-cyan-400";

    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${customStyle}">${type}</span>`;
}

// Analizzatore di negatività universale (per stringhe come "-5%" e numeri < 0)
function checkIsNegative(value) {
    if (typeof value === 'number') return value < 0;
    if (typeof value === 'string') return value.trim().startsWith('-');
    return false;
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

     // Gestione pulsante di ritorno all'HUB (con persistenza locale)
    const hubParam = urlParams.get('hub');
     if (hubParam) {
        localStorage.setItem('activeHub', hubParam);
    }
    const activeHub = hubParam || localStorage.getItem('activeHub');
    
    const backToHubBtn = document.getElementById('back-to-hub');
    if (backToHubBtn) {
        if (hubParam) {
            if (window.location.origin.includes('localhost') || window.location.protocol === 'file:') {
                backToHubBtn.href = `../Hub%20clienti/?v=${activeHub}`;
            } else {
                backToHubBtn.href = `https://teomacauda.it/hubclienti/?v=${activeHub}`;
            }
            backToHubBtn.style.display = 'inline-flex';
        } else {
            backToHubBtn.style.display = 'none';
        }
    }

    
    
    if (reportSlug) {
        try {
            const q = query(collection(db, "reportMensili"), where("slug", "==", reportSlug));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnapshot = querySnapshot.docs[0];
                const reportData = docSnapshot.data();
                currentReportDocId = docSnapshot.id;

                if (user) {
                    document.getElementById('report-title-display').innerText = reportData.title;
                    document.getElementById('client-avatar-url').value = reportData.clientAvatarUrl || '';
                    document.getElementById('followers-instagram').value = reportData.followersIg || 0;
                    document.getElementById('followers-tiktok').value = reportData.followersTt || 0;
                    document.getElementById('followers-youtube').value = reportData.followersYt || 0;
                    
                    document.getElementById('kpi-reached-count').value = reportData.kpiReachedCount || 0;
                    document.getElementById('kpi-reached-pct').value = reportData.kpiReachedPct || '';
                    document.getElementById('kpi-visits-count').value = reportData.kpiVisitsCount || 0;
                    document.getElementById('kpi-visits-pct').value = reportData.kpiVisitsPct || '';
                    
                    renderAdminContentsLayout(reportData.items || []);
                    loaderEl.classList.add('hidden');
                    adminDetailSection.classList.remove('hidden');
                } else {
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
                        <button data-id="${docSnap.id}" class="btn-delete-report h-8 w-8 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg flex items-center justify-center transition-all">${inlineVectors.trash}</button>
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
}

function renderAdminContentsLayout(items) {
    const container = document.getElementById('admin-report-contents-layout');
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = `<div class="text-center text-graytext font-light italic p-8 glass-card rounded-xl">Nessun contenuto video o post aggiunto a questo report.</div>`;
        return;
    }

    if (activeAdminSort === 'global') {
        const sortedItems = [...items].sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
        container.appendChild(buildAdminTableBlock("Classifica Globale Performance", sortedItems));
    } else {
        const platforms = ["Reel", "Post", "Storia", "Video YT", "YT Shorts", "TikTok"];
        platforms.forEach(platform => {
            const filtered = items.filter(i => i.type === platform)
                                  .sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
            if (filtered.length > 0) {
                container.appendChild(buildAdminTableBlock(`Canale: ${platform}`, filtered, items));
            }
        });
    }
}

function buildAdminTableBlock(title, sortedItems, originalItems = null) {
    const block = document.createElement('div');
    block.className = "glass-card p-5 rounded-2xl border border-white/5 overflow-hidden";
    
    let rowsHtml = sortedItems.map(item => {
        const originalIndex = originalItems ? originalItems.findIndex(orig => orig.title === item.title && orig.views === item.views) : sortedItems.indexOf(item);
        return `
            <tr class="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                <td class="p-4 font-bold text-white text-sm">${item.title}</td>
                <td class="p-4 text-xs">${getPlatformTagHtml(item.type)}</td>
                <td class="p-4 text-sm text-white font-medium">${parseInt(item.views).toLocaleString('it-IT')}</td>
                <td class="p-4 text-sm text-graytext">${parseInt(item.likes).toLocaleString('it-IT')}</td>
                <td class="p-4 text-right space-x-1.5 whitespace-nowrap">
                    <button data-index="${originalIndex}" class="btn-item-edit inline-flex items-center justify-center h-8 w-8 bg-white/5 hover:bg-accent/20 hover:text-accent text-graytext rounded-lg border border-white/5 transition-all">${inlineVectors.pencil}</button>
                    <button data-index="${originalIndex}" class="btn-item-delete inline-flex items-center justify-center h-8 w-8 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg border border-red-500/10 transition-all">${inlineVectors.trash}</button>
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

// ================= RENDER LOGICA CLIENT SCROLLYTELLING COMPLETA =================
function renderClientReportView(data) {
    const items = data.items || [];

    document.title = `Report ${data.title} - Teo Macauda Videomaker`;
    
    document.getElementById('client-hero-title').innerText = data.title;

    // Foto Profilo Cliente Asset
    const wrapperAvatar = document.getElementById('client-avatar-wrapper');
    const imgAvatar = document.getElementById('client-avatar-img');
    if (data.clientAvatarUrl && data.clientAvatarUrl.trim() !== '') {
        imgAvatar.src = data.clientAvatarUrl.trim();
        wrapperAvatar.classList.remove('hidden');
    } else {
        wrapperAvatar.classList.add('hidden');
    }

    document.querySelector('.id-svg-ig').innerHTML = inlineVectors.instagram;
    document.querySelector('.id-svg-tt').innerHTML = inlineVectors.tiktok;
    document.querySelector('.id-svg-yt').innerHTML = inlineVectors.youtube;

    // Calcolo e colorazione dinamica della slide Follower Acquisiti
    const igF = parseInt(data.followersIg) || 0;
    const ttF = parseInt(data.followersTt) || 0;
    const ytF = parseInt(data.followersYt) || 0;
    const totalF = igF + ttF + ytF;

    const slideFollowers = document.getElementById('slide-client-followers');
    if (igF !== 0 || ttF !== 0 || ytF !== 0) {
        slideFollowers.classList.remove('hidden');
        
        // Gestione Macro Card Aggregata (Rosso vs Verde)
        const totalSignEl = document.getElementById('client-stat-total-sign');
        const macroCard = document.getElementById('client-followers-macro-card');
        const macroBadge = document.getElementById('client-followers-macro-badge');
        const macroArrowBox = document.getElementById('client-followers-macro-arrow-box');
        const macroTextStatus = document.getElementById('client-followers-macro-text-status');
        
        // Impostiamo l'obiettivo assoluto per il counter numerico
        document.getElementById('client-stat-total-followers').setAttribute('data-target', Math.abs(totalF));

        if (totalF < 0) {
            totalSignEl.innerText = "-";
            macroCard.className = "glass-card p-6 rounded-3xl text-center mb-5 relative overflow-hidden transition-all border-red-500/20 bg-red-500/[0.01]";
            macroBadge.className = "mt-3 inline-flex items-center justify-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400";
            macroArrowBox.innerHTML = inlineVectors.arrowDown;
            macroTextStatus.innerText = "DECRESCITA";
        } else {
            totalSignEl.innerText = "+";
            macroCard.className = "glass-card p-6 rounded-3xl text-center mb-5 relative overflow-hidden transition-all border-emerald-500/20 bg-emerald-500/[0.01]";
            macroBadge.className = "mt-3 inline-flex items-center justify-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
            macroArrowBox.innerHTML = inlineVectors.arrowUp;
            macroTextStatus.innerText = "CRESCITA";
        }
        
        // Breakdown Singoli Canali (Niente zeri)
        if(igF !== 0) {
            document.getElementById('row-client-ig-followers').classList.remove('hidden');
            const sign = igF < 0 ? '-' : '+';
            const colorClass = igF < 0 ? 'text-red-400' : 'text-white';
            document.querySelector('.id-text-color-ig').innerHTML = `<span class="${colorClass}">${sign}<span class="counter-anim" id="client-stat-ig-followers" data-target="${Math.abs(igF)}">0</span></span>`;
        } else { document.getElementById('row-client-ig-followers').classList.add('hidden'); }
        
        if(ttF !== 0) {
            document.getElementById('row-client-tt-followers').classList.remove('hidden');
            const sign = ttF < 0 ? '-' : '+';
            const colorClass = ttF < 0 ? 'text-red-400' : 'text-white';
            document.querySelector('.id-text-color-tt').innerHTML = `<span class="${colorClass}">${sign}<span class="counter-anim" id="client-stat-tt-followers" data-target="${Math.abs(ttF)}">0</span></span>`;
        } else { document.getElementById('row-client-tt-followers').classList.add('hidden'); }
        
        if(ytF !== 0) {
            document.getElementById('row-client-yt-followers').classList.remove('hidden');
            const sign = ytF < 0 ? '-' : '+';
            const colorClass = ytF < 0 ? 'text-red-400' : 'text-white';
            document.querySelector('.id-text-color-yt').innerHTML = `<span class="${colorClass}">${sign}<span class="counter-anim" id="client-stat-yt-followers" data-target="${Math.abs(ytF)}">0</span></span>`;
        } else { document.getElementById('row-client-yt-followers').classList.add('hidden'); }
    } else {
        slideFollowers.classList.add('hidden');
    }

    // ================= RENDERING CONDIZIONALE + COLORE SULLE NUOVE SLIDE (ACCOUNT & VISITE) =================
    const reachedCount = parseInt(data.kpiReachedCount) || 0;
    const reachedPct = data.kpiReachedPct ? data.kpiReachedPct.trim() : '';
    const slideReached = document.getElementById('slide-client-reached');

    if (reachedCount > 0 && reachedPct !== '') {
        slideReached.classList.remove('hidden');
        document.getElementById('client-stat-reached-count').setAttribute('data-target', reachedCount);
        document.getElementById('client-stat-reached-pct').innerText = reachedPct;
        
        const reachedBadge = document.getElementById('client-stat-reached-badge');
        const reachedArrowBox = document.getElementById('client-stat-reached-arrow-box');
        if (checkIsNegative(reachedPct)) {
            reachedBadge.className = "inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold mx-auto";
            reachedArrowBox.innerHTML = inlineVectors.arrowDown;
        } else {
            reachedBadge.className = "inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold mx-auto";
            reachedArrowBox.innerHTML = inlineVectors.arrowUp;
        }
    } else {
        slideReached.classList.add('hidden');
    }

    const visitsCount = parseInt(data.kpiVisitsCount) || 0;
    const visitsPct = data.kpiVisitsPct ? data.kpiVisitsPct.trim() : '';
    const slideVisits = document.getElementById('slide-client-visits');

    if (visitsCount > 0 && visitsPct !== '') {
        slideVisits.classList.remove('hidden');
        document.getElementById('client-stat-visits-count').setAttribute('data-target', visitsCount);
        document.getElementById('client-stat-visits-pct').innerText = visitsPct;
        
        const visitsBadge = document.getElementById('client-stat-visits-badge');
        const visitsArrowBox = document.getElementById('client-stat-visits-arrow-box');
        if (checkIsNegative(visitsPct)) {
            visitsBadge.className = "inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold mx-auto";
            visitsArrowBox.innerHTML = inlineVectors.arrowDown;
        } else {
            visitsBadge.className = "inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold mx-auto";
            visitsArrowBox.innerHTML = inlineVectors.arrowUp;
        }
    } else {
        slideVisits.classList.add('hidden');
    }

    if(items.length === 0) return;

    const iconMap = {
        'Reel': inlineVectors.instagram, 'Post': inlineVectors.image, 'Storia': inlineVectors.clock,
        'Video YT': inlineVectors.youtube, 'YT Shorts': inlineVectors.video, 'TikTok': inlineVectors.tiktok
    };

    // Video con più VIEWS
    const kingViews = [...items].sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0))[0];
    document.getElementById('client-king-views-title').innerText = kingViews.title;
    document.getElementById('client-king-views-platform').innerText = kingViews.type;
    document.getElementById('client-stat-king-views-count').setAttribute('data-target', kingViews.views);
    document.getElementById('client-king-views-icon').innerHTML = iconMap[kingViews.type] || '';
    document.getElementById('client-views-king-link').href = kingViews.link || '#';

    // Video con più LIKE (Ora con link attivo cliccabile)
    const kingLikes = [...items].sort((a, b) => (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0))[0];
    document.getElementById('client-king-likes-title').innerText = kingLikes.title;
    document.getElementById('client-king-likes-platform').innerText = kingLikes.type;
    document.getElementById('client-stat-king-likes-count').setAttribute('data-target', kingLikes.likes);
    document.getElementById('client-king-likes-icon').innerHTML = iconMap[kingLikes.type] || '';
    document.getElementById('client-likes-king-link').href = kingLikes.link || '#';

    // Slide Finale Breakdown Analitico
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
                        <span class="flex items-center gap-1">${inlineVectors.eye} <b>${parseInt(item.views).toLocaleString('it-IT')}</b> views</span>
                        <span class="flex items-center gap-1">${inlineVectors.heart} <b>${parseInt(item.likes).toLocaleString('it-IT')}</b> like</span>
                    </div>
                `;
                cardWrap.appendChild(rowItem);
            });
            breakdownLayout.appendChild(cardWrap);
        }
    });
}

// ================= TIMING COUNTER INTERSECTION OBSERVER =================
function initIntersectionCounters() {
    const targetCounters = document.querySelectorAll('.counter-anim');
    const config = { root: null, threshold: 0.10 };

    const runObserver = new IntersectionObserver((entries, self) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const element = entry.target;
                const limitValue = parseInt(element.getAttribute('data-target'), 10) || 0;
                triggerSmoothCount(element, limitValue);
                self.unobserve(element); 
            }
        });
    }, config);

    targetCounters.forEach(c => runObserver.observe(c));
}

function triggerSmoothCount(element, target) {
    const animationDuration = 1400; 
    const launchTime = performance.now();

    function flow(now) {
        const dynamicTime = now - launchTime;
        const timelineProgress = Math.min(dynamicTime / animationDuration, 1);
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

// Modals Handlers locali ed export a window scope sicuro
function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-10', 'translate-y-0');
}
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-0', 'translate-y-10');
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

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
    
    form.reset();
    if(editingItemIndex !== null) {
        document.getElementById('add-item-modal-title').innerText = "Modifica Contenuto";
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
        document.getElementById('add-item-modal-title').innerText = "Aggiungi Contenuto al Report";
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-10', 'translate-y-0');
};

window.closeAddItemModal = () => {
    const modal = document.getElementById('add-item-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-0', 'translate-y-10');
};

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
    
    await addDoc(collection(db, "reportMensili"), { 
        title: tVal, slug: slug, items: [], 
        followersIg: 0, followersTt: 0, followersYt: 0, 
        clientAvatarUrl: "", kpiReachedCount: 0, kpiReachedPct: "", 
        kpiVisitsCount: 0, kpiVisitsPct: "" 
    });
    window.closeCreateReportModal();
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
        clientAvatarUrl: document.getElementById('client-avatar-url').value.trim(),
        followersIg: parseInt(document.getElementById('followers-instagram').value) || 0,
        followersTt: parseInt(document.getElementById('followers-tiktok').value) || 0,
        followersYt: parseInt(document.getElementById('followers-youtube').value) || 0,
        kpiReachedCount: parseInt(document.getElementById('kpi-reached-count').value) || 0,
        kpiReachedPct: document.getElementById('kpi-reached-pct').value.trim(),
        kpiVisitsCount: parseInt(document.getElementById('kpi-visits-count').value) || 0,
        kpiVisitsPct: document.getElementById('kpi-visits-pct').value.trim()
    });
    alert("Tutte le metriche e configurazioni del report salvate correttamente.");
    initReportRouter(auth.currentUser);
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

onAuthStateChanged(auth, (user) => {
    initReportRouter(user);
});
