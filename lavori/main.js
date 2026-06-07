/* ==========================================
   LOGICA INTERATTIVA SEZIONE LAVORI (main.js)
   ========================================== */

// Inizializza le icone Lucide
lucide.createIcons();

// --- LOGICA MOBILE MENU ---
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const menuContent = document.getElementById('mobileMenuContent');
    const iconMenu = document.getElementById('icon-menu');
    const iconX = document.getElementById('icon-x');
    
    if (menu.classList.contains('opacity-0')) {
        menu.classList.remove('opacity-0', 'pointer-events-none');
        menuContent.classList.remove('-translate-y-10');
        document.body.style.overflow = 'hidden';
        if(iconMenu) iconMenu.classList.add('hidden');
        if(iconX) iconX.classList.remove('hidden');
    } else {
        menu.classList.add('opacity-0', 'pointer-events-none');
        menuContent.classList.add('-translate-y-10');
        document.body.style.overflow = '';
        if(iconX) iconX.classList.add('hidden');
        if(iconMenu) iconMenu.classList.remove('hidden');
    }
}

// --- CONTROLLO SCROLL NAVBAR E CHAT PILL ---
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('navbar');
    const pill = document.getElementById('chat-pill');
    
    // Espansione iniziale della pillola chat su desktop
    if (pill && window.innerWidth >= 768) {
        setTimeout(() => pill.classList.add('expanded'), 2000);
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            if(nav) {
                nav.style.background = 'rgba(0, 0, 0, 0.8)';
                nav.style.backdropFilter = 'blur(12px)';
            }
            if(pill) pill.classList.remove('expanded');
        } else {
            if(nav) {
                nav.style.background = 'transparent';
                nav.style.backdropFilter = 'none';
            }
            if (pill && window.innerWidth >= 768) {
                pill.classList.add('expanded');
            }
        }
    });
});

// --- URL CLEANUP PER DIRECTORY-BASED ROUTING ---
(function() {
    const currentPath = window.location.pathname;
    if (currentPath.endsWith('.html')) {
        const cleanPath = currentPath.substring(0, currentPath.lastIndexOf('.html'));
        window.history.replaceState(null, '', window.location.origin + cleanPath + window.location.hash);
    }
})();
