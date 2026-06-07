document.addEventListener('DOMContentLoaded', () => {
    // Inizializza Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Intersection Observer per animazioni Reveal
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { 
            if (entry.isIntersecting) entry.target.classList.add('active'); 
        });
    }, { threshold: 0.1 });
    reveals.forEach(r => observer.observe(r));

    // Gestione Chat Pill (Espansione automatica su desktop)
    const pill = document.getElementById('chat-pill');
    if (window.innerWidth >= 768) {
        setTimeout(() => {
            if(window.scrollY <= 50) pill.classList.add('expanded');
        }, 2000);
    }

    // Effetti al cambio di scroll (Navbar e Pill)
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(0, 0, 0, 0.8)';
            nav.style.backdropFilter = 'blur(12px)';
            pill.classList.remove('expanded');
        } else {
            nav.style.background = 'transparent';
            nav.style.backdropFilter = 'none';
            if (window.innerWidth >= 768) {
                pill.classList.add('expanded');
            }
        }
    });

    // Pulizia automatica delle estensioni .html dagli URL nei link
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.endsWith('.html') && !href.startsWith('http')) {
            link.setAttribute('href', href.replace('.html', ''));
        }
    });
});

// Funzioni Modale Video
function openVideoModal(source, title, isVertical = false) {
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoModalContent');
    const container = document.getElementById('videoContainer');
    document.getElementById('videoTitle').innerText = title;

    content.className = "relative glass-modal rounded-3xl overflow-hidden transform scale-95 transition-all duration-500 flex flex-col w-full";
    if (isVertical) {
        content.classList.add('max-w-[380px]', 'aspect-[9/16]');
    } else {
        content.classList.add('max-w-5xl', 'aspect-video');
    }

    const consentStatus = localStorage.getItem('video_consent_teo');
    if (consentStatus === 'true') {
        loadIframe(source, container);
    } else {
        container.innerHTML = `
            <div class="flex flex-col items-center gap-6 p-8">
                <div class="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-2"><i data-lucide="eye-off" class="w-8 h-8"></i></div>
                <div class="space-y-3">
                    <h4 class="text-lg md:text-xl font-bold tracking-tight text-white">Cookie di terze parti</h4>
                    <p class="text-graytext text-sm max-w-[320px] mx-auto leading-relaxed">Per vedere questo contenuto devi accettare i cookie. <a href="/privacy.html" class="underline text-white">Privacy Policy</a>.</p>
                </div>
                <div class="flex flex-col w-full gap-3 mt-6">
                    <button onclick="handleConsentDecision(true, '${source}')" class="w-full py-4 bg-accent hover:bg-accentHover text-white rounded-2xl font-bold transition-all text-xs uppercase tracking-widest">Accetta e guarda</button>
                    <button onclick="closeVideoModal()" class="text-[10px] text-graytext hover:text-white uppercase tracking-widest font-bold">No, grazie</button>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => content.classList.replace('scale-95', 'scale-100'), 50);
    document.body.style.overflow = 'hidden';
}

function handleConsentDecision(isAccepted, source = null) {
    if (isAccepted) {
        localStorage.setItem('video_consent_teo', 'true');
        if (source) loadIframe(source, document.getElementById('document.getElementById("videoContainer")'));
        // Ricarica l'iframe istantaneamente
        loadIframe(source, document.getElementById('videoContainer'));
    } else {
        localStorage.setItem('video_consent_teo', 'false');
        closeVideoModal();
    }
}

function loadIframe(source, container) {
    container.innerHTML = `<iframe src="${source}" class="w-full h-full" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
}

// Chiusura Modale Video
function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoModalContent');
    modal.classList.add('opacity-0', 'pointer-events-none');
    content.classList.replace('scale-100', 'scale-95');
    document.body.style.overflow = '';
    setTimeout(() => { document.getElementById('videoContainer').innerHTML = ''; }, 300);
}

// Toggle Menu Mobile
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

// Toggle Modale Contatti
function toggleContactModal() {
    const modal = document.getElementById('contactModal');
    const content = document.getElementById('contactModalContent');
    const isOpen = !modal.classList.contains('opacity-0');
    if (!isOpen) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.replace('translate-y-10', 'translate-y-0');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.replace('translate-y-0', 'translate-y-10');
        document.body.style.overflow = '';
    }
}
