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
const modalContent = authModal.querySelector('.modal-panel');
const fabAdd = document.getElementById('fab-add');
const viewSwitcher = document.getElementById('view-switcher');

const btnEditTitle = document.getElementById('btn-edit-title');
const editTitleContainer = document.getElementById('edit-title-container');
const inputClientTitle = document.getElementById('input-client-title');
const btnSaveTitle = document.getElementById('btn-save-title');
const btnCancelTitle = document.getElementById('btn-cancel-title');

let currentClientDocId = null;
let editingVideoIndex = null;
let draggedIndex = null;
let activeStatusFilter = 'Tutti';

// --- ICONE SVG statiche (mai generate a runtime da librerie esterne: niente rotture o sovrapposizioni) ---
const ICN = {
    idea: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.75c.3.26.5.64.5 1.05V17h7v-1.2c0-.41.2-.79.5-1.05A7 7 0 0 0 12 2z"/></svg>`,
    scrittura: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    produzione: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,
    pronto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
    pubblicato: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M12 20v-8"/><path d="M8.5 15.5a5 5 0 0 1 0-7"/><path d="M15.5 15.5a5 5 0 0 0 0-7"/><path d="M5.5 18.5a9 9 0 0 1 0-13"/><path d="M18.5 18.5a9 9 0 0 0 0-13"/><circle cx="12" cy="9" r="2"/></svg>`,
    film: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`,
    music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    playCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
};

// Idea=grigio, Scrittura=blu, Produzione=arancio brand, Pronto=ambra (quasi pronto), Pubblicato=verde (online, si capisce subito)
const STATUS_COLUMNS = [
    { id: "Idea", label: "Idea", color: "#9CA3AF", icon: ICN.idea },
    { id: "Scrittura", label: "Scrittura", color: "#3B82F6", icon: ICN.scrittura },
    { id: "In Produzione", label: "Produzione", color: "#FF7A00", icon: ICN.produzione },
    { id: "Pronto", label: "Pronto", color: "#F5B400", icon: ICN.pronto },
    { id: "Pubblicato", label: "Pubblicato", color: "#22C55E", icon: ICN.pubblicato }
];

const TYPE_OPTIONS = [
    { id: "Reel", label: "Reel", color: "#EC4899", style: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: ICN.film },
    { id: "TikTok", label: "TikTok", color: "#22D3EE", style: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: ICN.music },
    { id: "YT Shorts", label: "YT Shorts", color: "#F87171", style: "bg-red-500/10 text-red-400 border-red-500/20", icon: ICN.playCircle },
    { id: "Video YT", label: "Video YT", color: "#EF4444", style: "bg-red-600/15 text-red-500 border-red-600/30", icon: ICN.play },
    { id: "Storia", label: "Storia", color: "#FBBF24", style: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ICN.clock },
    { id: "Post", label: "Post", color: "#818CF8", style: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: ICN.image },
];

function normStatus(s) { return s === "In Scrittura" ? "Scrittura" : s; }
function denormStatus(id) { return id === "Scrittura" ? "In Scrittura" : id; }
function statusInfo(status) { return STATUS_COLUMNS.find(c => c.id === normStatus(status)) || STATUS_COLUMNS[0]; }
function typeInfo(type) { return TYPE_OPTIONS.find(t => t.id === type) || TYPE_OPTIONS[3]; }

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
    fabAdd.classList.add('hidden');
    closeQuickEditPopover();

    if (user) {
        adminIndicator.classList.remove('hidden');
        adminIndicator.classList.add('flex');
    } else {
        adminIndicator.classList.add('hidden');
        adminIndicator.classList.remove('flex');
    }

    const hubParam = urlParams.get('hub');
    if (hubParam) localStorage.setItem('activeHub', hubParam);
    const activeHub = hubParam || localStorage.getItem('activeHub');

    const backToHubBtn = document.getElementById('back-to-hub');
    if (backToHubBtn) {
        if (activeHub) {
            if (window.location.origin.includes('localhost') || window.location.protocol === 'file:') {
                backToHubBtn.href = `../../Hub%20clienti/?v=${activeHub}`;
            } else {
                backToHubBtn.href = `https://teomacauda.it/hubclienti/?v=${activeHub}`;
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
                document.getElementById('client-title').innerText = clientData.clientName;

                const adminTools = document.getElementById('admin-plan-tools');
                if (user) {
                    adminTools.className = "hidden md:flex items-center justify-between gap-3 glass glass-sm px-5 py-3.5 border-accent/20";
                    if (btnEditTitle) btnEditTitle.classList.remove('hidden');
                    fabAdd.classList.remove('hidden');
                    fabAdd.classList.add('flex');
                } else {
                    adminTools.className = "hidden";
                    if (btnEditTitle) btnEditTitle.classList.add('hidden');
                    if (editTitleContainer) editTitleContainer.classList.add('hidden');
                }

                activeStatusFilter = 'Tutti';
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

// VIEW SWITCHER (desktop: list/blocchi)
let activeView = localStorage.getItem('ped_active_view_v2') || 'list';

function setupViewSwitcher() {
    const listBtn = document.getElementById('view-list-btn');
    const kanbanBtn = document.getElementById('view-kanban-btn');
    const listContainer = document.getElementById('desktop-list-view');
    const kanbanContainer = document.getElementById('kanban-board-container');

    if (!listBtn || !kanbanBtn) return;

    const updateUI = () => {
        if (activeView === 'list') {
            listBtn.className = "pill px-4 py-2 text-white bg-accent font-bold transition-all flex items-center gap-1.5";
            kanbanBtn.className = "pill px-4 py-2 text-graytext hover:text-white transition-all flex items-center gap-1.5";
            listContainer.className = "hidden md:block";
            kanbanContainer.className = "hidden";
        } else {
            kanbanBtn.className = "pill px-4 py-2 text-white bg-accent font-bold transition-all flex items-center gap-1.5";
            listBtn.className = "pill px-4 py-2 text-graytext hover:text-white transition-all flex items-center gap-1.5";
            listContainer.className = "hidden";
            kanbanContainer.className = "hidden md:grid grid-cols-5 gap-4";
        }
    };

    listBtn.onclick = () => { activeView = 'list'; localStorage.setItem('ped_active_view_v2', 'list'); updateUI(); };
    kanbanBtn.onclick = () => { activeView = 'kanban'; localStorage.setItem('ped_active_view_v2', 'kanban'); updateUI(); };

    updateUI();
}

// --- HELPER GENERICI PER I POPOVER (menu rapido, calendario, orologio) ---
const FIELD_POPOVER_IDS = ['quick-edit-popover', 'date-picker-popover', 'time-picker-popover'];

function positionPopover(pop, triggerEl) {
    const rect = triggerEl.getBoundingClientRect();
    const popWidth = pop.offsetWidth || 200;
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 12) left = window.innerWidth - popWidth - 12;
    if (left < 12) left = 12;
    let top = rect.bottom + 8;
    const popHeight = pop.offsetHeight || 260;
    let flippedAbove = false;
    if (top + popHeight > window.innerHeight - 12) {
        top = Math.max(12, rect.top - 8 - popHeight);
        flippedAbove = true;
    }
    // Posizione impostata subito, senza transizione: niente più scivolamenti da un lato.
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    // L'animazione di comparsa "cresce" dal punto esatto in cui è stato cliccato il pulsante.
    const originX = popWidth > 0 ? Math.min(100, Math.max(0, ((rect.left + rect.width / 2 - left) / popWidth) * 100)) : 50;
    pop.style.transformOrigin = `${originX}% ${flippedAbove ? '100%' : '0%'}`;

    requestAnimationFrame(() => pop.classList.add('pop-visible'));
}

function showPopoverEl(id) {
    closeAllFieldPopovers(true);
    const pop = document.getElementById(id);
    pop.classList.remove('hidden');
    pop.classList.remove('pop-visible');
    const backdrop = document.getElementById('quick-edit-backdrop');
    backdrop.classList.remove('hidden');
    backdrop.onclick = () => closeAllFieldPopovers();
}

function closeAllFieldPopovers(instant) {
    FIELD_POPOVER_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('pop-visible');
        if (instant) {
            el.classList.add('hidden');
        } else {
            setTimeout(() => el.classList.add('hidden'), 150);
        }
    });
    const backdrop = document.getElementById('quick-edit-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
}

// --- MINI MENU DI MODIFICA RAPIDA (solo admin) ---
function openQuickEditPopover(triggerEl, options, currentId, onSelect) {
    const pop = document.getElementById('quick-edit-popover');

    pop.innerHTML = options.map(opt => `
        <button type="button" class="quick-option ${opt.id === currentId ? 'selected' : ''}" data-id="${opt.id}">
            <span style="color:${opt.color}; display:flex; align-items:center;">${opt.icon}</span>
            <span style="color:${opt.color};">${opt.label}</span>
        </button>
    `).join('');

    showPopoverEl('quick-edit-popover');
    positionPopover(pop, triggerEl);

    pop.querySelectorAll('.quick-option').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const selectedId = btn.getAttribute('data-id');
            closeAllFieldPopovers();
            onSelect(selectedId);
        };
    });
}

function closeQuickEditPopover() {
    closeAllFieldPopovers();
}

function openContentLink(video) {
    if (video.scriptLink) {
        window.open(video.scriptLink, '_blank', 'noopener');
    }
}

async function updateVideoField(index, videosRef, field, value) {
    if (!currentClientDocId) return;
    videosRef[index][field] = value;
    try {
        const docRef = doc(db, "pianiEditoriali", currentClientDocId);
        await updateDoc(docRef, { videos: videosRef });
        renderVideoTable(videosRef, true);
    } catch (e) {
        console.error(e);
        alert("Errore durante l'aggiornamento.");
    }
}

function wireQuickEditTriggers(scopeEl, video, index, videosRef, isAdmin) {
    if (!isAdmin) return;

    const statusTrigger = scopeEl.querySelector('.status-badge-trigger');
    if (statusTrigger) {
        statusTrigger.onclick = (e) => {
            e.stopPropagation();
            openQuickEditPopover(statusTrigger, STATUS_COLUMNS, normStatus(video.status), (selectedId) => {
                updateVideoField(index, videosRef, 'status', denormStatus(selectedId));
            });
        };
    }

    const typeTrigger = scopeEl.querySelector('.type-badge-trigger');
    if (typeTrigger) {
        typeTrigger.onclick = (e) => {
            e.stopPropagation();
            openQuickEditPopover(typeTrigger, TYPE_OPTIONS, video.type, (selectedId) => {
                updateVideoField(index, videosRef, 'type', selectedId);
            });
        };
    }

    const titleTrigger = scopeEl.querySelector('.content-title-trigger');
    if (titleTrigger) {
        titleTrigger.onclick = (e) => {
            e.stopPropagation();
            openContentLink(video);
        };
    }
}

function buildStatusBadge(video, isAdmin) {
    const s = statusInfo(video.status);
    const cls = `status-badge ${isAdmin ? 'status-badge-trigger' : ''} pill inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5`;
    return `<span class="${cls}" style="color:${s.color}; border:1px solid ${s.color}45; background:${s.color}16;">${s.icon}<span>${s.label}</span></span>`;
}

function buildTypeBadge(video, isAdmin) {
    const t = typeInfo(video.type);
    const cls = `type-badge ${isAdmin ? 'type-badge-trigger' : ''} pill inline-flex items-center gap-1.5 border ${t.style}`;
    return `<span class="${cls}" style="padding:5px 10px; font-size:12px;">${t.icon}<span>${t.label}</span></span>`;
}

// --- RIGHE FORMATO / STATO nel form Aggiungi/Modifica: tap -> mini menu (coerenti con i badge) ---
function setTypeField(id) {
    const t = typeInfo(id);
    const field = document.getElementById('video-type-field');
    field.dataset.selected = id;
    document.getElementById('video-type-field-display').innerHTML = `<span style="color:${t.color}; display:flex; align-items:center;">${t.icon}</span><span>${t.label}</span>`;
}

function setStatusField(id) {
    const s = STATUS_COLUMNS.find(c => c.id === id) || STATUS_COLUMNS[0];
    const field = document.getElementById('video-status-field');
    field.dataset.selected = s.id;
    document.getElementById('video-status-field-display').innerHTML = `<span style="color:${s.color}; display:flex; align-items:center;">${s.icon}</span><span>${s.label}</span>`;
}

function setupFieldRowPickers() {
    const typeField = document.getElementById('video-type-field');
    const statusField = document.getElementById('video-status-field');

    typeField.onclick = () => {
        openQuickEditPopover(typeField, TYPE_OPTIONS, typeField.dataset.selected, (selectedId) => setTypeField(selectedId));
    };
    statusField.onclick = () => {
        openQuickEditPopover(statusField, STATUS_COLUMNS, statusField.dataset.selected, (selectedId) => setStatusField(selectedId));
    };
}
setupFieldRowPickers();

// --- DATA / ORA: calendario e orologio custom (niente picker nativi del browser) ---
const MESI_ABBR = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const MESI_FULL = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI_SETTIMANA = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

function pad2(n) { return String(n).padStart(2, '0'); }

let selectedDate = null; // { year, month(0-11), day }
let selectedTime = null; // { hour, minute }
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth();

function setAsapActive(active) {
    const toggle = document.getElementById('video-date-asap-toggle');
    const fields = document.getElementById('video-date-fields');
    toggle.classList.toggle('active', active);
    fields.classList.toggle('asap-disabled', active);
}

function updateDateFieldDisplay() {
    const el = document.getElementById('video-date-field-display');
    const span = el.querySelector('span');
    span.textContent = selectedDate ? `${selectedDate.day} ${MESI_ABBR[selectedDate.month]}` : 'Da definire';
}

function updateTimeFieldDisplay() {
    const el = document.getElementById('video-time-field-display');
    const span = el.querySelector('span');
    span.textContent = selectedTime ? `${pad2(selectedTime.hour)}:${pad2(selectedTime.minute)}` : '--:--';
}

function resetDateFields() {
    selectedDate = null;
    selectedTime = null;
    document.getElementById('form-add-video').dataset.originalDate = '';
    updateDateFieldDisplay();
    updateTimeFieldDisplay();
    setAsapActive(false);
}

// Prova a interpretare stringhe tipo "7 Ago - 12:30" per precompilare in modifica
function prefillDateFields(dateStr) {
    document.getElementById('form-add-video').dataset.originalDate = dateStr || '';
    selectedDate = null;
    selectedTime = null;

    if (!dateStr) { updateDateFieldDisplay(); updateTimeFieldDisplay(); setAsapActive(false); return; }
    if (dateStr.trim().toUpperCase() === 'ASAP') { updateDateFieldDisplay(); updateTimeFieldDisplay(); setAsapActive(true); return; }

    setAsapActive(false);
    const match = dateStr.match(/^(\d{1,2})\s+([A-Za-zÀ-ù]{3,})\.?\s*-\s*(\d{1,2}):(\d{2})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const monthAbbr = match[2].slice(0, 3).toLowerCase();
        const monthIndex = MESI_ABBR.findIndex(m => m.toLowerCase() === monthAbbr);
        if (monthIndex !== -1) {
            selectedDate = { year: new Date().getFullYear(), month: monthIndex, day };
            selectedTime = { hour: parseInt(match[3], 10), minute: parseInt(match[4], 10) };
            calViewYear = selectedDate.year;
            calViewMonth = selectedDate.month;
        }
    }
    updateDateFieldDisplay();
    updateTimeFieldDisplay();
}

function computeDateString() {
    const toggle = document.getElementById('video-date-asap-toggle');
    if (toggle.classList.contains('active')) return 'ASAP';
    if (!selectedDate) return document.getElementById('form-add-video').dataset.originalDate || '';

    let str = `${selectedDate.day} ${MESI_ABBR[selectedDate.month]}`;
    if (selectedTime) str += ` - ${pad2(selectedTime.hour)}:${pad2(selectedTime.minute)}`;
    return str;
}

document.getElementById('video-date-asap-toggle').addEventListener('click', () => {
    const isActive = document.getElementById('video-date-asap-toggle').classList.contains('active');
    setAsapActive(!isActive);
});

// --- CALENDARIO ---
function renderCalendar() {
    const pop = document.getElementById('date-picker-popover');
    const firstOfMonth = new Date(calViewYear, calViewMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunedì = 0
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const today = new Date();

    let cells = '';
    for (let i = 0; i < startOffset; i++) cells += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = today.getFullYear() === calViewYear && today.getMonth() === calViewMonth && today.getDate() === d;
        const isSelected = selectedDate && selectedDate.year === calViewYear && selectedDate.month === calViewMonth && selectedDate.day === d;
        cells += `<button type="button" class="cal-day ${isToday ? 'cal-day-today' : ''} ${isSelected ? 'cal-day-selected' : ''}" data-day="${d}">${d}</button>`;
    }

    pop.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <button type="button" id="cal-prev" class="cal-nav-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="m15 18-6-6 6-6"/></svg></button>
            <span class="text-sm font-bold text-white">${MESI_FULL[calViewMonth]} ${calViewYear}</span>
            <button type="button" id="cal-next" class="cal-nav-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="m9 18 6-6-6-6"/></svg></button>
        </div>
        <div class="grid grid-cols-7 gap-1 mb-1">${GIORNI_SETTIMANA.map(g => `<div class="cal-weekday">${g}</div>`).join('')}</div>
        <div class="grid grid-cols-7 gap-1">${cells}</div>
        <button type="button" id="cal-today-btn" class="pill w-full h-9 mt-3 text-[11px] font-bold text-graytext bg-white/5 hover:bg-white/10 hover:text-white transition-all">Oggi</button>
    `;

    document.getElementById('cal-prev').onclick = () => { calViewMonth--; if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; } renderCalendar(); };
    document.getElementById('cal-next').onclick = () => { calViewMonth++; if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; } renderCalendar(); };
    document.getElementById('cal-today-btn').onclick = () => {
        const t = new Date();
        calViewYear = t.getFullYear(); calViewMonth = t.getMonth();
        selectedDate = { year: calViewYear, month: calViewMonth, day: t.getDate() };
        updateDateFieldDisplay();
        renderCalendar();
    };
    pop.querySelectorAll('.cal-day').forEach(btn => {
        btn.onclick = () => {
            selectedDate = { year: calViewYear, month: calViewMonth, day: parseInt(btn.getAttribute('data-day'), 10) };
            updateDateFieldDisplay();
            closeAllFieldPopovers();
        };
    });
}

function openDatePicker(triggerEl) {
    if (selectedDate) { calViewYear = selectedDate.year; calViewMonth = selectedDate.month; }
    showPopoverEl('date-picker-popover');
    renderCalendar();
    positionPopover(document.getElementById('date-picker-popover'), triggerEl);
}

// --- OROLOGIO A ROTELLE ---
function buildWheelColumn(container, values, selectedValue, onSettle) {
    const itemH = 40;
    container.innerHTML = `<div class="wheel-spacer"></div>` +
        values.map(v => `<div class="wheel-item" data-v="${v}">${pad2(v)}</div>`).join('') +
        `<div class="wheel-spacer"></div>`;

    const idx = Math.max(0, values.indexOf(selectedValue));
    container.scrollTop = idx * itemH;

    const highlightActive = () => {
        const idx = Math.round(container.scrollTop / itemH);
        const clamped = Math.max(0, Math.min(values.length - 1, idx));
        container.querySelectorAll('.wheel-item').forEach((el, i) => el.classList.toggle('active', i === clamped));
        return clamped;
    };
    highlightActive();

    let scrollTimeout;
    container.onscroll = () => {
        highlightActive();
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const idx = Math.round(container.scrollTop / itemH);
            const clamped = Math.max(0, Math.min(values.length - 1, idx));
            container.scrollTo({ top: clamped * itemH, behavior: 'smooth' });
            highlightActive();
            onSettle(values[clamped]);
        }, 130);
    };

    container.querySelectorAll('.wheel-item').forEach((el, i) => {
        el.onclick = () => {
            container.scrollTo({ top: i * itemH, behavior: 'smooth' });
        };
    });
}

function renderTimePicker() {
    const pop = document.getElementById('time-picker-popover');
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    const currentHour = selectedTime ? selectedTime.hour : 12;
    const currentMinute = selectedTime ? (Math.round(selectedTime.minute / 5) * 5) % 60 : 0;
    if (!selectedTime) selectedTime = { hour: currentHour, minute: currentMinute };

    pop.innerHTML = `
        <div class="wheel-wrap">
            <div class="wheel-highlight"></div>
            <div id="wheel-hours" class="wheel-col"></div>
            <span class="text-white font-bold text-lg font-mono">:</span>
            <div id="wheel-minutes" class="wheel-col"></div>
        </div>
        <button type="button" id="time-picker-done" class="btn-primary pill w-full h-10 text-black text-xs font-bold mt-3">Fatto</button>
    `;

    buildWheelColumn(document.getElementById('wheel-hours'), hours, currentHour, (v) => { selectedTime.hour = v; updateTimeFieldDisplay(); });
    buildWheelColumn(document.getElementById('wheel-minutes'), minutes, currentMinute, (v) => { selectedTime.minute = v; updateTimeFieldDisplay(); });

    document.getElementById('time-picker-done').onclick = () => {
        updateTimeFieldDisplay();
        closeAllFieldPopovers();
    };
}

function openTimePicker(triggerEl) {
    showPopoverEl('time-picker-popover');
    renderTimePicker();
    positionPopover(document.getElementById('time-picker-popover'), triggerEl);
}

document.getElementById('video-date-field').addEventListener('click', function () { openDatePicker(this); });
document.getElementById('video-time-field').addEventListener('click', function () { openTimePicker(this); });

function buildScriptLink(video) {
    if (video.scriptLink) {
        return `<a href="${video.scriptLink}" target="_blank" rel="noopener" class="script-link-btn pill h-9 px-3.5 bg-white/5 hover:bg-accent/15 border border-white/5 hover:border-accent/30 text-[11px] text-graytext hover:text-white transition-all flex items-center gap-1.5 font-bold">${ICN.link}Script</a>`;
    }
    return `<span aria-disabled="true" class="script-link-btn pill h-9 px-3.5 bg-white/5 border border-white/5 text-[11px] text-graytext/50 flex items-center gap-1.5 font-bold" title="Nessun link script impostato">${ICN.link}Script</span>`;
}

function renderVideoTable(allVideos, isAdmin) {
    closeQuickEditPopover();

    const desktopDeck = document.getElementById('media-modules-deck');
    const kanbanContainer = document.getElementById('kanban-board-container');
    const mobileStream = document.getElementById('mobile-stream');
    const filtersEl = document.getElementById('status-filters');

    desktopDeck.innerHTML = '';
    kanbanContainer.innerHTML = '';
    mobileStream.innerHTML = '';
    filtersEl.innerHTML = '';

    setupViewSwitcher();

    // --- PROGRESS ---
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const total = allVideos.length;
    const ready = allVideos.filter(v => v.status === 'Pronto' || v.status === 'Pubblicato').length;
    const percent = total > 0 ? Math.round((ready / total) * 100) : 0;
    progressText.innerText = `${ready}/${total} (${percent}%)`;
    progressBar.style.width = `${percent}%`;

    // --- KPI ---
    const statsContainer = document.getElementById('stats-dashboard');
    statsContainer.innerHTML = '';
    const counts = {
        "Reels": allVideos.filter(v => v.type === 'Reel').length,
        "Shorts": allVideos.filter(v => v.type === 'TikTok' || v.type === 'YT Shorts').length,
        "Storie": allVideos.filter(v => v.type === 'Storia').length,
        "Post": allVideos.filter(v => v.type === 'Post').length
    };
    [
        { label: "Reels", icon: "film", count: counts["Reels"] },
        { label: "Shorts", icon: "play", count: counts["Shorts"] },
        { label: "Storie", icon: "clock", count: counts["Storie"] },
        { label: "Post", icon: "image", count: counts["Post"] }
    ].forEach(cfg => {
        const card = document.createElement('div');
        card.className = "glass glass-sm p-3.5 flex flex-col justify-between";
        card.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="text-[9px] font-mono tracking-wider text-graytext uppercase font-bold">${cfg.label}</span>
                <i data-lucide="${cfg.icon}" class="w-3.5 h-3.5 text-accent/70"></i>
            </div>
            <div class="text-2xl font-black font-mono text-white leading-none">${cfg.count}</div>
        `;
        statsContainer.appendChild(card);
    });

    // --- FILTRI STATO ---
    const filterCounts = { 'Tutti': allVideos.length };
    STATUS_COLUMNS.forEach(c => { filterCounts[c.id] = allVideos.filter(v => normStatus(v.status) === c.id).length; });

    const buildChip = (id, label) => {
        const chip = document.createElement('button');
        chip.className = `chip px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1.5 ${activeStatusFilter === id ? 'active' : ''}`;
        chip.innerHTML = `${label} <span class="opacity-60">${filterCounts[id] || 0}</span>`;
        chip.onclick = () => { activeStatusFilter = id; renderVideoTable(allVideos, isAdmin); };
        return chip;
    };
    filtersEl.appendChild(buildChip('Tutti', 'Tutti'));
    STATUS_COLUMNS.forEach(c => filtersEl.appendChild(buildChip(c.id, c.label)));

    // videos filtrati (mantenendo index originale per update/delete/drag)
    const indexed = allVideos.map((v, i) => ({ v, i }));
    const visible = activeStatusFilter === 'Tutti' ? indexed : indexed.filter(item => normStatus(item.v.status) === activeStatusFilter);

    const emptyStateHtml = `<div class="p-8 text-center text-graytext font-light italic glass glass-sm">Nessun contenuto in questa categoria.</div>`;

    if (allVideos.length === 0) {
        const msg = `<div class="p-8 text-center text-graytext font-light italic glass glass-sm">Nessun contenuto programmato al momento.</div>`;
        desktopDeck.innerHTML = msg;
        mobileStream.innerHTML = msg;
    } else if (visible.length === 0) {
        desktopDeck.innerHTML = emptyStateHtml;
        mobileStream.innerHTML = emptyStateHtml;
    }

    // --- 1. DESKTOP LIST (righe glass) ---
    visible.forEach(({ v: video, i: index }) => {
        const s = statusInfo(video.status);

        const row = document.createElement('div');
        row.className = "glass flex items-center gap-4 p-4 group";
        if (isAdmin) row.setAttribute('draggable', 'true');

        row.innerHTML = `
            ${isAdmin ? `<div class="drag-handle text-graytext/30 hover:text-accent cursor-grab active:cursor-grabbing flex-shrink-0"><i data-lucide="grip-vertical" class="w-4 h-4"></i></div>` : ''}
            <div class="w-1 h-10 rounded-full flex-shrink-0" style="background-color:${s.color}; box-shadow: 0 0 8px ${s.color}90;"></div>
            <div class="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                <div class="col-span-6 min-w-0">
                    <h4 class="text-sm font-bold text-white tracking-tight truncate ${isAdmin ? 'content-title-trigger' : ''}">${video.title}</h4>
                    <div class="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-graytext">
                        <i data-lucide="calendar" class="w-3 h-3 text-accent/60"></i>${video.date || 'Da definire'}
                    </div>
                </div>
                <div class="col-span-2">
                    ${buildTypeBadge(video, isAdmin)}
                </div>
                <div class="col-span-4">
                    ${buildStatusBadge(video, isAdmin)}
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${buildScriptLink(video)}
                ${isAdmin ? `
                <button data-index="${index}" class="btn-edit-single h-9 w-9 rounded-full bg-white/5 hover:bg-accent/20 hover:text-accent border border-white/5 flex items-center justify-center text-graytext hover:text-white transition-all" title="Modifica"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button data-index="${index}" class="btn-delete-single h-9 w-9 rounded-full bg-red-500/10 hover:bg-red-500 border border-red-500/10 text-red-400 hover:text-white flex items-center justify-center transition-all" title="Elimina"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                ` : ''}
            </div>
        `;

        wireQuickEditTriggers(row, video, index, allVideos, isAdmin);

        if (isAdmin) {
            row.addEventListener('dragstart', (e) => { draggedIndex = index; e.dataTransfer.effectAllowed = 'move'; row.classList.add('drag-ghost'); });
            row.addEventListener('dragend', () => row.classList.remove('drag-ghost'));
            row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drop-target'); });
            row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
            row.addEventListener('drop', async (e) => {
                e.preventDefault();
                row.classList.remove('drop-target');
                if (draggedIndex !== null && draggedIndex !== index) {
                    const moved = allVideos.splice(draggedIndex, 1)[0];
                    allVideos.splice(index, 0, moved);
                    const docRef = doc(db, "pianiEditoriali", currentClientDocId);
                    await updateDoc(docRef, { videos: allVideos });
                    renderVideoTable(allVideos, isAdmin);
                }
            });
        }

        desktopDeck.appendChild(row);
    });

    // --- 2. BLOCCHI (kanban) ---
    STATUS_COLUMNS.forEach(col => {
        const colItems = indexed.filter(item => normStatus(item.v.status) === col.id);

        const colEl = document.createElement('div');
        colEl.className = "kanban-column flex flex-col gap-2.5 p-3 glass glass-sm min-h-[420px]";
        colEl.dataset.status = col.id;

        colEl.innerHTML = `
            <div class="flex items-center justify-between pb-2.5 border-b border-white/5 mb-1">
                <span class="text-[12px] font-bold flex items-center gap-1.5" style="color:${col.color};">${col.icon}${col.label}</span>
                <span class="pill px-2 py-0.5 text-[10px] font-bold bg-white/5 text-graytext">${colItems.length}</span>
            </div>
            <div class="kanban-cards flex flex-col gap-2.5 flex-grow"></div>
        `;

        const cardsContainer = colEl.querySelector('.kanban-cards');

        colItems.forEach(({ v: video, i: index }) => {
            const card = document.createElement('div');
            card.className = "glass glass-sm p-3.5 flex flex-col gap-2";
            if (isAdmin) card.setAttribute('draggable', 'true');

            card.innerHTML = `
                <div class="flex items-center justify-between gap-2">
                    ${buildTypeBadge(video, isAdmin)}
                    <span class="text-[9px] text-graytext font-mono">${video.date || 'ASAP'}</span>
                </div>
                <h5 class="text-xs font-bold text-white tracking-tight line-clamp-2 ${isAdmin ? 'content-title-trigger' : ''}">${video.title}</h5>
                <div class="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-white/5">
                    ${buildScriptLink(video)}
                    ${isAdmin ? `
                    <div class="flex items-center gap-1">
                        <button data-index="${index}" class="btn-edit-single p-1.5 text-graytext hover:text-white rounded-full hover:bg-white/5"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                        <button data-index="${index}" class="btn-delete-single p-1.5 text-red-400 hover:text-red-500 rounded-full hover:bg-white/5"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                    </div>` : ''}
                </div>
            `;

            wireQuickEditTriggers(card, video, index, allVideos, isAdmin);

            if (isAdmin) {
                card.addEventListener('dragstart', (e) => { draggedIndex = index; e.dataTransfer.effectAllowed = 'move'; card.classList.add('drag-ghost'); });
                card.addEventListener('dragend', () => card.classList.remove('drag-ghost'));
            }

            cardsContainer.appendChild(card);
        });

        if (isAdmin) {
            colEl.addEventListener('dragover', (e) => { e.preventDefault(); colEl.classList.add('drop-target'); });
            colEl.addEventListener('dragleave', () => colEl.classList.remove('drop-target'));
            colEl.addEventListener('drop', async (e) => {
                e.preventDefault();
                colEl.classList.remove('drop-target');
                if (draggedIndex !== null) {
                    const videoToUpdate = allVideos[draggedIndex];
                    const targetStatus = denormStatus(col.id);
                    if (videoToUpdate.status !== targetStatus) {
                        videoToUpdate.status = targetStatus;
                        const docRef = doc(db, "pianiEditoriali", currentClientDocId);
                        await updateDoc(docRef, { videos: allVideos });
                        renderVideoTable(allVideos, isAdmin);
                    }
                }
            });
        }

        kanbanContainer.appendChild(colEl);
    });

    // --- 3. MOBILE STREAM (raggruppato per stato, sticky header + strisciolina colore) ---
    const groups = activeStatusFilter === 'Tutti' ? STATUS_COLUMNS : STATUS_COLUMNS.filter(c => c.id === activeStatusFilter);

    groups.forEach(col => {
        const items = indexed.filter(item => normStatus(item.v.status) === col.id);
        if (items.length === 0) return;

        const groupWrap = document.createElement('div');
        groupWrap.innerHTML = `
            <div class="sticky top-16 z-20 bg-black/80 backdrop-blur-md rounded-full inline-flex py-2 px-3.5 mb-3 items-center gap-2">
                <span class="dot" style="background-color:${col.color};"></span>
                <span class="text-xs font-bold" style="color:${col.color};">${col.label}</span>
                <span class="text-[10px] text-graytext">(${items.length})</span>
            </div>
        `;
        const cardsWrap = document.createElement('div');
        cardsWrap.className = "space-y-3";

        items.forEach(({ v: video, i: index }) => {
            const s = statusInfo(video.status);
            const cardEl = document.createElement('div');
            cardEl.className = "glass overflow-hidden flex";
            cardEl.innerHTML = `
                <div class="w-1 flex-shrink-0" style="background-color:${s.color}; box-shadow: 0 0 8px ${s.color}90;"></div>
                <div class="flex-1 p-4 flex flex-col gap-2.5 min-w-0">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                        <span class="text-[10px] font-mono font-bold text-accent">${video.date || 'Da definire'}</span>
                        ${buildTypeBadge(video, isAdmin)}
                    </div>
                    <h4 class="text-sm font-bold text-white tracking-tight leading-snug ${isAdmin ? 'content-title-trigger' : ''}">${video.title}</h4>
                    <div class="flex items-center justify-between gap-3 mt-1 pt-2.5 border-t border-white/5">
                        ${buildScriptLink(video)}
                        ${isAdmin ? `
                        <div class="flex items-center gap-1.5">
                            <button data-index="${index}" class="btn-edit-single h-9 w-9 rounded-full flex items-center justify-center text-graytext hover:text-white bg-white/5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                            <button data-index="${index}" class="btn-delete-single h-9 w-9 rounded-full flex items-center justify-center text-red-400 hover:text-red-500 bg-red-500/10"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>` : ''}
                    </div>
                </div>
            `;
            wireQuickEditTriggers(cardEl, video, index, allVideos, isAdmin);
            cardsWrap.appendChild(cardEl);
        });

        groupWrap.appendChild(cardsWrap);
        mobileStream.appendChild(groupWrap);
    });

    if (isAdmin) {
        document.querySelectorAll('.btn-edit-single').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                openEditVideoModal(idx, allVideos[idx]);
            });
        });
        document.querySelectorAll('.btn-delete-single').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                if (confirm("Eliminare questo contenuto dal piano?")) {
                    await deleteSingleVideo(idx, allVideos);
                }
            });
        });
    }

    lucide.createIcons();
}

function openEditVideoModal(index, video) {
    editingVideoIndex = index;

    document.getElementById('video-title').value = video.title;
    setTypeField(video.type || "Video YT");
    setStatusField(normStatus(video.status) || "Idea");
    prefillDateFields(video.date || "");
    document.getElementById('video-script-link').value = video.scriptLink || "";

    document.getElementById('add-video-icon').innerHTML = '<i data-lucide="pencil" class="w-5 h-5"></i>';
    document.getElementById('add-video-title-heading').innerHTML = 'Modifica <span class="text-accent">Contenuto</span>';
    document.getElementById('add-video-submit-btn').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Aggiorna Contenuto';

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

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.isHub === true) return;

            const clientUrl = `${window.location.origin}${window.location.pathname}?v=${data.slug}`;
            const videos = data.videos || [];
            const ready = videos.filter(v => v.status === 'Pronto' || v.status === 'Pubblicato').length;
            const percent = videos.length > 0 ? Math.round((ready / videos.length) * 100) : 0;

            const card = document.createElement('div');
            card.className = "glass p-6 text-left flex flex-col justify-between min-h-[160px] relative group";
            card.innerHTML = `
                <div>
                    <h3 class="text-lg font-bold text-white tracking-tight pr-8 truncate">${data.clientName}</h3>
                    <p class="text-xs text-accent mt-1 font-mono">/${data.slug}</p>
                    <div class="mt-3 flex items-center gap-2">
                        <div class="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden"><div class="bg-accent h-full rounded-full" style="width:${percent}%"></div></div>
                        <span class="text-[10px] font-mono text-graytext">${percent}%</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-5">
                    <a href="?v=${data.slug}" class="pill h-9 px-3.5 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 text-xs font-semibold transition-all">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i> Vedi Piano
                    </a>
                    <button onclick="navigator.clipboard.writeText('${clientUrl}'); alert('Link copiato!');" class="pill h-9 px-3.5 bg-white/5 hover:bg-accent/20 hover:text-accent text-graytext flex items-center gap-1.5 text-xs font-semibold transition-all">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copia Link
                    </button>
                    <button data-id="${docSnap.id}" class="btn-delete-client-trigger absolute top-4 right-4 text-graytext/40 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-white/5">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        const plusCard = document.createElement('button');
        plusCard.className = "plus-card p-6 flex flex-col items-center justify-center min-h-[160px] text-graytext hover:text-white cursor-pointer";
        plusCard.innerHTML = `<i data-lucide="plus" class="w-7 h-7 text-graytext/60"></i><span class="text-xs font-bold tracking-tight mt-2">Crea Nuovo Piano</span>`;
        plusCard.addEventListener('click', () => openCustomStep('create-client'));
        grid.appendChild(plusCard);

        document.querySelectorAll('.btn-delete-client-trigger').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-id');
                if (confirm("Eliminare definitivamente questo cliente e tutto il suo piano?")) {
                    await deleteDoc(doc(db, "pianiEditoriali", docId));
                    loadAdminCatalog();
                }
            });
        });

        const btnNewClientTop = document.getElementById('btn-new-client-top');
        if (btnNewClientTop) {
            btnNewClientTop.classList.remove('hidden');
            btnNewClientTop.onclick = () => openCustomStep('create-client');
        }

        lucide.createIcons();
        loaderEl.classList.add('hidden');
        adminCatalogSection.classList.remove('hidden');
    } catch (error) {
        console.error("Errore catalogo:", error);
    }
}

if (btnEditTitle) {
    btnEditTitle.addEventListener('click', () => {
        const clientTitleEl = document.getElementById('client-title');
        inputClientTitle.value = clientTitleEl.innerText;
        editTitleContainer.classList.remove('hidden');
    });
}
if (btnCancelTitle) btnCancelTitle.addEventListener('click', () => editTitleContainer.classList.add('hidden'));

if (btnSaveTitle) {
    btnSaveTitle.addEventListener('click', async () => {
        const newTitle = inputClientTitle.value.trim();
        if (!newTitle) { alert("Il nome del piano non può essere vuoto."); return; }
        if (!currentClientDocId) return;

        try {
            const docRef = doc(db, "pianiEditoriali", currentClientDocId);
            await updateDoc(docRef, { clientName: newTitle });
            document.getElementById('client-title').innerText = newTitle;
            editTitleContainer.classList.add('hidden');
        } catch (error) {
            console.error("Errore titolo:", error);
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
                clientName: clientName, slug: slug, videos: [], createdAt: new Date()
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
            type: document.getElementById('video-type-field').dataset.selected || "Video YT",
            status: denormStatus(document.getElementById('video-status-field').dataset.selected || "Idea"),
            date: computeDateString(),
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

function openAddVideoFresh() {
    editingVideoIndex = null;
    document.getElementById('form-add-video').reset();
    setTypeField("Reel");
    setStatusField("Idea");
    resetDateFields();
    document.getElementById('add-video-icon').innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i>';
    document.getElementById('add-video-title-heading').innerHTML = 'Aggiungi <span class="text-accent">Contenuto</span>';
    document.getElementById('add-video-submit-btn').innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Salva Contenuto';
    lucide.createIcons();
    openCustomStep('add-video');
}

document.getElementById('btn-add-video').addEventListener('click', openAddVideoFresh);
fabAdd.addEventListener('click', openAddVideoFresh);

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

onAuthStateChanged(auth, (user) => { initRouter(user); });

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
