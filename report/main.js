import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Endpoint Firebase
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
const reportSlug = urlParams.get('r'); 

let currentReportDocId = null;

// ROUTER DI STATO E INTERFACCIA
async function appRouter(user) {
    document.getElementById('main-loader').classList.remove('hidden');
    document.getElementById('view-client-report').classList.add('hidden');
    document.getElementById('view-admin-catalog').classList.add('hidden');
    
    if (user) {
        document.getElementById('admin-logged-indicator').classList.remove('hidden');
        document.getElementById('btn-admin-gate').innerHTML = `<i data-lucide="layout-dashboard" class="w-3.5 h-3.5 text-accent"></i> Console Archivio`;
    } else {
        document.getElementById('admin-logged-indicator').classList.add('hidden');
        document.getElementById('btn-admin-gate').innerHTML = `<i data-lucide="lock" class="w-3.5 h-3.5 text-accent"></i> Area Admin`;
    }

    if (reportSlug) {
        await loadClientReport(reportSlug);
    } else {
        if (user) {
            await loadAdminCatalog();
        } else {
            document.getElementById('main-loader').classList.add('hidden');
            openCustomStep('auth');
        }
    }
    lucide.createIcons();
}

function generateSlug(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// RENDERING LATO CLIENTE (HIDES EMPTY FIELDS)
async function loadClientReport(slug) {
    try {
        const q = query(collection(db, "reportMensili"), where("slug", "==", slug));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const docData = snap.docs[0].data();
            document.getElementById('client-report-title').innerText = `Report: ${docData.clientName}`;
            document.getElementById('report-period-badge').innerText = docData.reportMonth.toUpperCase();

            // Macro Totali
            const macroGrid = document.getElementById('macro-stats-grid');
            macroGrid.innerHTML = '';
            
            if (docData.totalViews) {
                macroGrid.innerHTML += `
                    <div class="glass-card px-5 py-3 rounded-2xl border border-white/5 min-w-[120px] text-center md:text-left">
                        <span class="block text-[9px] font-bold text-graytext uppercase tracking-wider select-none">VIEWS TOTALI</span>
                        <span class="text-xl md:text-2xl font-black text-white tracking-tight">${Number(docData.totalViews).toLocaleString('it-IT')}</span>
                    </div>
                `;
            }
            if (docData.totalLikes) {
                macroGrid.innerHTML += `
                    <div class="glass-card px-5 py-3 rounded-2xl border border-white/5 min-w-[120px] text-center md:text-left">
                        <span class="block text-[9px] font-bold text-graytext uppercase tracking-wider select-none">LIKE TOTALI</span>
                        <span class="text-xl md:text-2xl font-black text-accent tracking-tight">${Number(docData.totalLikes).toLocaleString('it-IT')}</span>
                    </div>
                `;
            }

            // Classifica Leaderboard Video
            const leaderboardContainer = document.getElementById('leaderboard-container');
            leaderboardContainer.innerHTML = '';

            const sortedVideos = (docData.videos || []).sort((a, b) => Number(b.views || 0) - Number(a.views || 0));

            if (sortedVideos.length === 0) {
                leaderboardContainer.innerHTML = `<div class="col-span-full text-center py-12 text-graytext italic font-light text-sm">Nessun contenuto inserito per questo mese.</div>`;
            } else {
                sortedVideos.forEach((video, index) => {
                    const position = String(index + 1).padStart(2, '0');
                    
                    let platformIcon = '<i data-lucide="video" class="w-4 h-4"></i>';
                    if (video.platform.includes("Instagram")) platformIcon = '<i data-lucide="instagram" class="w-4 h-4 text-pink-400"></i>';
                    if (video.platform.includes("YouTube")) platformIcon = '<i data-lucide="youtube" class="w-4 h-4 text-red-500"></i>';
                    if (video.platform === "TikTok") platformIcon = '<i data-lucide="music" class="w-4 h-4 text-cyan-400"></i>';

                    // Generazione condizionale delle sole metriche compilate dall'admin
                    let metricsBlockHtml = '';
                    if (video.views) metricsBlockHtml += `<div class="flex justify-between border-b border-white/5 pb-1.5"><span class="text-graytext">Visualizzazioni</span><span class="font-bold text-white">${Number(video.views).toLocaleString('it-IT')}</span></div>`;
                    if (video.likes) metricsBlockHtml += `<div class="flex justify-between border-b border-white/5 pb-1.5"><span class="text-graytext">Mi Piace</span><span class="font-bold text-accent">${Number(video.likes).toLocaleString('it-IT')}</span></div>`;
                    if (video.comments) metricsBlockHtml += `<div class="flex justify-between border-b border-white/5 pb-1.5"><span class="text-graytext">Commenti</span><span class="font-medium text-white">${Number(video.comments).toLocaleString('it-IT')}</span></div>`;
                    if (video.shares) metricsBlockHtml += `<div class="flex justify-between border-b border-white/5 pb-1.5"><span class="text-graytext">Condivisioni</span><span class="font-medium text-white">${Number(video.shares).toLocaleString('it-IT')}</span></div>`;
                    if (video.reposts) metricsBlockHtml += `<div class="flex justify-between border-b border-white/5 pb-1.5"><span class="text-graytext">Repost / Salvataggi</span><span class="font-medium text-white">${Number(video.reposts).toLocaleString('it-IT')}</span></div>`;

                    const videoCard = document.createElement('div');
                    videoCard.className = "glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between group h-full min-h-[300px]";
                    videoCard.innerHTML = `
                        <div>
                            <div class="flex justify-between items-start mb-4">
                                <span class="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-white">
                                    ${platformIcon} <span>${video.platform}</span>
                                </span>
                                <span class="rank-number select-none">${position}</span>
                            </div>
                            <h3 class="text-lg font-extrabold text-white tracking-tight leading-snug mb-6 group-hover:text-accent transition-colors">${video.title || 'Contenuto Video'}</h3>
                        </div>
                        
                        <div class="space-y-2 text-xs w-full mt-auto">
                            ${metricsBlockHtml}
                            ${video.url ? `
                                <a href="${video.url}" target="_blank" class="w-full h-9 bg-white/5 hover:bg-accent hover:text-white rounded-xl flex items-center justify-center gap-2 font-bold tracking-tight text-graytext hover:text-white transition-all text-[11px] uppercase mt-4">
                                    <span>Vedi Video Originale</span> <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                </a>
                            ` : ''}
                        </div>
                    `;
                    leaderboardContainer.appendChild(videoCard);
                });
            }

            document.getElementById('main-loader').classList.add('hidden');
            document.getElementById('view-client-report').classList.remove('hidden');
        } else {
            window.location.href = './';
        }
    } catch (err) {
        window.location.href = './';
    }
}

// CARICA CATALOGO GENERALE AMMINISTRATORE
async function loadAdminCatalog() {
    try {
        const q = query(collection(db, "reportMensili"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const grid = document.getElementById('report-grid');
        grid.innerHTML = '';

        snap.forEach((reportDoc) => {
            const data = reportDoc.data();
            const clientShareUrl = `${window.location.origin}${window.location.pathname}?r=${data.slug}`;

            const card = document.createElement('div');
            card.className = "glass-card p-6 rounded-2xl text-left flex flex-col justify-between min-h-[180px] relative";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="text-xl font-bold text-white tracking-tight pr-6">${data.clientName}</h3>
                        <span class="text-[10px] bg-accent/10 border border-accent/20 text-accent font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">${data.reportMonth}</span>
                    </div>
                    <p class="text-[11px] text-graytext/60 mt-1">Slug: /?r=${data.slug}</p>
                </div>
                <div class="flex items-center gap-2 mt-6">
                    <button class="btn-edit-report h-8 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all" data-id="${reportDoc.id}">
                        <i data-lucide="pencil" class="w-3.5 h-3.5 text-accent"></i> Modifica
                    </button>
                    <button class="btn-copy-url h-8 px-3 bg-white/5 hover:bg-accent/20 hover:text-accent text-graytext rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all" data-url="${clientShareUrl}">
                        <i data-lucide="share-2" class="w-3.5 h-3.5"></i> Copia Link
                    </button>
                    <button class="btn-delete-report absolute bottom-5 right-5 text-graytext/30 hover:text-red-500 transition-colors p-1" data-id="${reportDoc.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Eventi pulsanti dinamici catalogo
        document.querySelectorAll('.btn-delete-report').forEach(b => {
            b.addEventListener('click', async (e) => {
                if(confirm("Eliminare definitivamente questo report?")) {
                    await deleteDoc(doc(db, "reportMensili", b.getAttribute('data-id')));
                    loadAdminCatalog();
                }
            });
        });

        document.querySelectorAll('.btn-copy-url').forEach(b => {
            b.addEventListener('click', () => {
                navigator.clipboard.writeText(b.getAttribute('data-url'));
                alert('Link del report copiato.');
            });
        });

        document.querySelectorAll('.btn-edit-report').forEach(b => {
            b.addEventListener('click', () => openEditReportModal(b.getAttribute('data-id')));
        });

        document.getElementById('main-loader').classList.add('hidden');
        document.getElementById('view-admin-catalog').classList.remove('hidden');
        lucide.createIcons();
    } catch (err) {
        console.error(err);
    }
}

// COMPILATORE RIGHE INPUT VIDEO DINAMICHE
function addVideoRow(data = {}) {
    const container = document.getElementById('dynamic-video-rows');
    const row = document.createElement('div');
    row.className = "video-row p-4 rounded-xl border border-white/5 bg-white/[0.01] relative flex flex-col gap-3 pt-8";
    row.innerHTML = `
        <button type="button" class="btn-remove-row absolute top-2 right-2 text-graytext/40 hover:text-red-500 p-1"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label class="block text-[9px] font-medium text-graytext uppercase tracking-wider mb-1">Titolo Video / Hook</label>
                <input type="text" class="vid-title w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-xs" required value="${data.title || ''}">
            </div>
            <div>
                <label class="block text-[9px] font-medium text-graytext uppercase tracking-wider mb-1">Piattaforma / Formato</label>
                <select class="vid-platform w-full h-9 bg-[#121212] border border-white/10 rounded-lg px-2 text-white text-xs">
                    <option value="Instagram Reel" ${data.platform === 'Instagram Reel' ? 'selected':''}>📸 Instagram Reel</option>
                    <option value="YouTube Shorts" ${data.platform === 'YouTube Shorts' ? 'selected':''}>🩳 YouTube Shorts</option>
                    <option value="YouTube Video" ${data.platform === 'YouTube Video' ? 'selected':''}>📺 YouTube Video</option>
                    <option value="Instagram Post" ${data.platform === 'Instagram Post' ? 'selected':''}>🖼️ Instagram Post</option>
                    <option value="TikTok" ${data.platform === 'TikTok' ? 'selected':''}>🎵 TikTok</option>
                </select>
            </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div>
                <label class="block text-[8px] text-graytext uppercase">Views</label>
                <input type="number" class="vid-views w-full h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-white text-xs" value="${data.views || ''}">
            </div>
            <div>
                <label class="block text-[8px] text-graytext uppercase">Like</label>
                <input type="number" class="vid-likes w-full h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-white text-xs" value="${data.likes || ''}">
            </div>
            <div>
                <label class="block text-[8px] text-graytext uppercase">Commenti</label>
                <input type="number" class="vid-comments w-full h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-white text-xs" value="${data.comments || ''}">
            </div>
            <div>
                <label class="block text-[8px] text-graytext uppercase">Condivisioni</label>
                <input type="number" class="vid-shares w-full h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-white text-xs" value="${data.shares || ''}">
            </div>
            <div class="col-span-2 sm:col-span-1">
                <label class="block text-[8px] text-graytext uppercase">Repost/Salv.</label>
                <input type="number" class="vid-reposts w-full h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-white text-xs" value="${data.reposts || ''}">
            </div>
        </div>
        <div>
            <label class="block text-[9px] font-medium text-graytext uppercase tracking-wider mb-1">Link Diretto Video</label>
            <input type="url" class="vid-url w-full h-8 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-xs" value="${data.url || ''}" placeholder="https://...">
        </div>
    `;
    container.appendChild(row);
    row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
    lucide.createIcons();
}

// INSERIMENTO E AGGIORNAMENTO DB
document.getElementById('form-report').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const clientName = document.getElementById('rep-client-name').value;
    const reportMonth = document.getElementById('rep-month').value;
    const totalViews = document.getElementById('rep-total-views').value;
    const totalLikes = document.getElementById('rep-total-likes').value;

    const videoRows = document.querySelectorAll('.video-row');
    const videosArray = [];

    videoRows.forEach(row => {
        videosArray.push({
            title: row.querySelector('.vid-title').value,
            platform: row.querySelector('.vid-platform').value,
            views: row.querySelector('.vid-views').value || null,
            likes: row.querySelector('.vid-likes').value || null,
            comments: row.querySelector('.vid-comments').value || null,
            shares: row.querySelector('.vid-shares').value || null,
            reposts: row.querySelector('.vid-reposts').value || null,
            url: row.querySelector('.vid-url').value || null
        });
    });

    const reportPayload = {
        clientName, reportMonth,
        totalViews: totalViews || null,
        totalLikes: totalLikes || null,
        videos: videosArray,
        updatedAt: new Date()
    };

    try {
        if (currentReportDocId) {
            await updateDoc(doc(db, "reportMensili", currentReportDocId), reportPayload);
        } else {
            reportPayload.slug = generateSlug(clientName) + "-" + Math.random().toString(36).substring(2, 6);
            reportPayload.createdAt = new Date();
            await addDoc(collection(db, "reportMensili"), reportPayload);
        }
        closeSystemModal();
        appRouter(auth.currentUser);
    } catch (err) {
        alert("Errore durante il salvataggio dei dati.");
    }
});

// APERTURA MODALE EDITING
async function openEditReportModal(docId) {
    currentReportDocId = docId;
    document.getElementById('form-report').reset();
    document.getElementById('dynamic-video-rows').innerHTML = '';
    document.getElementById('report-form-title').innerHTML = 'Modifica <span class="text-accent">Report</span>';

    try {
        const snap = await getDoc(doc(db, "reportMensili", docId));
        if(snap.exists()) {
            const data = snap.data();
            document.getElementById('rep-client-name').value = data.clientName || '';
            document.getElementById('rep-month').value = data.reportMonth || '';
            document.getElementById('rep-total-views').value = data.totalViews || '';
            document.getElementById('rep-total-likes').value = data.totalLikes || '';

            if(data.videos) data.videos.forEach(v => addVideoRow(v));
            openCustomStep('report-form');
        }
    } catch (err) {
        alert("Errore di scaricamento dati.");
    }
}

// CONTROL STEP INTERNO MODALI
function openCustomStep(step) {
    document.getElementById('modal-step-auth').classList.add('hidden');
    document.getElementById('modal-step-report-form').classList.add('hidden');

    if (!auth.currentUser) {
        document.getElementById('modal-step-auth').classList.remove('hidden');
    } else if (step === 'report-form') {
        document.getElementById('modal-step-report-form').classList.remove('hidden');
    }
    
    const modal = document.getElementById('system-modal');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-10', 'translate-y-0');
}

function closeSystemModal() {
    const modal = document.getElementById('system-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.glass-modal').classList.replace('translate-y-0', 'translate-y-10');
}

// AUTENTICAZIONE
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('login-loader').classList.remove('hidden');

    try {
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pass').value);
        closeSystemModal();
    } catch (err) {
        document.getElementById('login-loader').classList.add('hidden');
        document.getElementById('auth-error').classList.remove('hidden');
    }
});

// LISTENERS INTERFACCIA STATICI
document.getElementById('btn-admin-gate').addEventListener('click', () => {
    if(auth.currentUser && reportSlug) {
        window.location.href = './';
    } else {
        openCustomStep('report-form');
    }
});
document.getElementById('btn-create-report').addEventListener('click', () => {
    currentReportDocId = null;
    document.getElementById('form-report').reset();
    document.getElementById('dynamic-video-rows').innerHTML = '';
    document.getElementById('report-form-title').innerHTML = 'Crea <span class="text-accent">Nuovo Report</span>';
    openCustomStep('report-form');
});
document.getElementById('btn-add-video-row').addEventListener('click', () => addVideoRow());
document.getElementById('btn-close-modal').addEventListener('click', closeSystemModal);
document.getElementById('modal-overlay').addEventListener('click', closeSystemModal);

onAuthStateChanged(auth, appRouter);
