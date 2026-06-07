// --- PORTFOLIO DATA (DATABASE LOCALE) ---
const portfolioItems = [
    {
        youtubeId: 'ZYBKlJY46wA', // Inserisci qui il codice dell'ID video reale di YouTube
        originalUrl: 'https://www.youtube.com/watch?v=ZYBKlJY46wA', // Link originale (es. il Reel di Instagram)
        title: 'Reel Instagram 2026',
        category: 'Personal Projects',
        coverImg: 'https://raw.githubusercontent.com/teomacauda/cdn-assets/main/video/youtube1.webp',
        views: '2.5K', 
        isVertical: false // true = Reel verticale (9:16), false = Vlog/Video orizzontale (16:9)
    }
];

let activePlayer = null;

// --- RENDERING DINAMICO GRIGLIA ---
function renderPortfolioGrid() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    
    grid.innerHTML = portfolioItems.map(item => {
        const aspectClass = item.isVertical ? 'aspect-[9/16]' : 'aspect-video';
        const badgeHtml = item.views ? `<div class="absolute top-4 left-4 z-30 views-badge">${item.views} Views</div>` : '';
        
        return `
            <div class="work-item group relative ${aspectClass} rounded-3xl overflow-hidden glass-card cursor-pointer" 
                 onclick="openVideoModal('${item.youtubeId}', '${item.originalUrl}', '${item.title.replace(/'/g, "\\'")}', ${item.isVertical})">
                ${badgeHtml}
                <img src="${item.coverImg}" alt="${item.title}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                <div class="absolute inset-0 flex items-center justify-center z-10">
                    <i data-lucide="play-circle" class="w-14 h-14 text-white/80 group-hover:text-accent transition-all"></i>
                </div>
                <div class="work-overlay absolute inset-0 p-6 flex flex-col justify-end z-20">
                    <span class="text-accent text-xs font-bold uppercase tracking-widest mb-2">${item.category}</span>
                    <h4 class="text-xl font-bold text-white">${item.title}</h4>
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
}

// --- LOGICA MODAL ADATTIVA ---
function openVideoModal(youtubeId, originalUrl, title, isVertical = false) {
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoModalContent');
    const container = document.getElementById('videoContainer');
    const titleBar = document.getElementById('videoTitleBar');
    document.getElementById('videoTitle').innerText = title;

    const consentStatus = localStorage.getItem('video_consent_teo');
    
    if (consentStatus === 'true') {
        titleBar.classList.remove('hidden');
        if (isVertical) {
            content.className = "relative glass-modal rounded-3xl overflow-hidden transform scale-95 transition-all duration-500 flex flex-col w-full max-w-[340px] md:max-w-[360px] bg-[#0F0F0F] mx-auto";
            container.className = "w-full aspect-[9/16] bg-black p-0";
        } else {
            content.className = "relative glass-modal rounded-3xl overflow-hidden transform scale-95 transition-all duration-500 flex flex-col w-full max-w-5xl bg-[#0F0F0F] mx-auto";
            container.className = "w-full aspect-video bg-black p-0";
        }
        loadPlyrPlayer(youtubeId, originalUrl, container, isVertical);
    } else {
        content.className = "relative glass-modal rounded-3xl overflow-hidden transform scale-95 transition-all duration-500 flex flex-col w-full max-w-md bg-[#0F0F0F] mx-auto p-6 sm:p-8";
        titleBar.classList.add('hidden');
        container.className = "w-full flex flex-col items-center justify-center text-center py-4";
        
        container.innerHTML = `
            <div class="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-4 shrink-0">
                <i data-lucide="eye-off" class="w-6 h-6"></i>
            </div>
            <div class="space-y-2">
                <h4 class="text-lg font-bold tracking-tight text-white">Cookie di terze parti</h4>
                <p class="text-graytext text-xs sm:text-sm max-w-[280px] mx-auto leading-relaxed">
                    Per vedere questo contenuto devi accettare i cookie di YouTube e Instagram. Leggi la nostra <a href="../privacy.html" class="underline text-white hover:text-accent transition-colors">Privacy Policy</a>.
                </p>
            </div>
            <div class="flex flex-col w-full gap-2.5 mt-6 shrink-0">
                <button onclick="handleConsentDecision(true, '${youtubeId}', '${originalUrl}', ${isVertical})" class="w-full py-3.5 bg-accent hover:bg-accentHover text-white rounded-xl font-bold transition-all shadow-lg shadow-accent/20 uppercase tracking-widest text-[11px] focus:outline-none">Accetta e guarda</button>
                <button onclick="closeVideoModal()" class="text-[10px] text-graytext hover:text-white transition-colors uppercase tracking-widest font-bold py-1.5 focus:outline-none">No, grazie</button>
            </div>
        `;
        lucide.createIcons();
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => content.classList.replace('scale-95', 'scale-100'), 10);
    document.body.style.overflow = 'hidden';
}

function handleConsentDecision(isAccepted, youtubeId = null, originalUrl = null, isVertical = false) {
    if (isAccepted) {
        localStorage.setItem('video_consent_teo', 'true');
        if (youtubeId && originalUrl) {
            const content = document.getElementById('videoModalContent');
            const container = document.getElementById('videoContainer');
            const titleBar = document.getElementById('videoTitleBar');
            
            titleBar.classList.remove('hidden');
            if (isVertical) {
                content.className = "relative glass-modal rounded-3xl overflow-hidden transform scale-100 transition-all duration-500 flex flex-col w-full max-w-[340px] md:max-w-[360px] bg-[#0F0F0F] mx-auto";
                container.className = "w-full aspect-[9/16] bg-black p-0";
            } else {
                content.className = "relative glass-modal rounded-3xl overflow-hidden transform scale-100 transition-all duration-500 flex flex-col w-full max-w-5xl bg-[#0F0F0F] mx-auto";
                container.className = "w-full aspect-video bg-black p-0";
            }
            loadPlyrPlayer(youtubeId, originalUrl, container, isVertical);
        }
    } else {
        localStorage.setItem('video_consent_teo', 'false');
        closeVideoModal();
    }
}

// Generazione e iniezione sicura via DOM
function loadPlyrPlayer(youtubeId, originalUrl, container, isVertical = false) {
    if (activePlayer) {
        activePlayer.destroy();
        activePlayer = null;
    }

    container.innerHTML = `
        <div class="w-full h-full flex items-center justify-center bg-black p-0">
            <div id="plyr-instance" data-plyr-provider="youtube" data-plyr-embed-id="${youtubeId}" class="w-full h-full"></div>
        </div>
    `;

    // Inizializzazione pulita senza oggetti custom nell'array controlli (Evita il crash di Plyr)
    activePlayer = new Plyr('#plyr-instance', {
        ratio: isVertical ? '9:16' : '16:9',
        youtube: { modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3, playsinline: 1 },
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
    });

    // Iniettiamo via DOM il pulsante solo quando Plyr è pronto e stabile
    activePlayer.on('ready', () => {
        const plyrControls = container.querySelector('.plyr__controls');
        if (plyrControls && !plyrControls.querySelector('.plyr-btn-original')) {
            const btnHtml = `
                <button type="button" class="plyr__control plyr-btn-original" onclick="window.open('${originalUrl}', '_blank')">
                    <svg class="w-3.5 h-3.5 mr-1 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Originale
                </button>
            `;
            plyrControls.insertAdjacentHTML('beforeend', btnHtml);
        }
    });
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoModalContent');
    modal.classList.add('opacity-0', 'pointer-events-none');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    document.body.style.overflow = '';
    setTimeout(() => { 
        if (activePlayer) {
            activePlayer.destroy();
            activePlayer = null;
        }
        document.getElementById('videoContainer').innerHTML = ''; 
    }, 300);
}

// --- LOGICA CORE UI ---
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const menuContent = document.getElementById('mobileMenuContent');
    const iconMenu = document.getElementById('icon-menu');
    const iconX = document.getElementById('icon-x');
    const isOpen = !menu.classList.contains('opacity-0');
    if (!isOpen) {
        menu.classList.remove('opacity-0', 'pointer-events-none');
        menuContent.classList.replace('-translate-y-10', 'translate-y-0');
        iconMenu.classList.add('hidden');
        iconX.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        menu.classList.add('opacity-0', 'pointer-events-none');
        menuContent.classList.replace('translate-y-0', '-translate-y-10');
        iconX.classList.add('hidden');
        iconMenu.classList.remove('hidden');
        document.body.style.overflow = '';
    }
}

function toggleContactModal() {
    const modal = document.getElementById('contactModal');
    const content = document.getElementById('contactModalContent');
    const isOpen = !modal.classList.contains('opacity-0');
    if(!isOpen) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.replace('translate-y-10', 'translate-y-0');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.replace('translate-y-0', 'translate-y-10');
        document.body.style.overflow = '';
    }
}

function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
    }, { threshold: 0.1 });
    reveals.forEach(r => observer.observe(r));
}

document.addEventListener('DOMContentLoaded', () => {
    renderPortfolioGrid();
    initScrollAnimations();
    
    const pill = document.getElementById('chat-pill');
    if(pill) {
        if (window.innerWidth > 768) {
            setTimeout(() => { pill.classList.add('expanded'); }, 3000);
        }
        
        window.addEventListener('scroll', () => {
            if (window.innerWidth > 768) {
                if (window.scrollY > 50) pill.classList.remove('expanded');
                else pill.classList.add('expanded');
            } else {
                pill.classList.remove('expanded');
            }
        });
    }
});

window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if(nav) {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(0, 0, 0, 0.85)';
            nav.style.backdropFilter = 'blur(20px)';
            nav.style.webkitBackdropFilter = 'blur(20px)';
        } else {
            nav.style.background = 'transparent';
            nav.style.backdropFilter = 'blur(0px)';
            nav.style.webkitBackdropFilter = 'blur(0px)';
        }
    }
});

(function() {
    const currentPath = window.location.pathname;
    if (currentPath.endsWith('.html')) {
        const cleanPath = currentPath.substring(0, currentPath.lastIndexOf('.html'));
        window.history.replaceState(null, '', window.location.origin + cleanPath + window.location.hash);
    }
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.endsWith('.html') && !href.startsWith('http')) {
            link.setAttribute('href', href.replace('.html', ''));
        }
    });
})();
