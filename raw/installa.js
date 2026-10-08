/* Pulsante "Installa l'app" (Android) / "Aggiungi alla Home" (iPhone, con guida).
   Non appare mai se la pagina è già aperta come app installata, né se il browser non può installarla.
   Uso: RawInstall.attiva() quando la pagina vuole mostrarlo. */
(function () {
    if (window.RawInstall) return;
    const standalone = () => navigator.standalone === true || ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(m => window.matchMedia(`(display-mode: ${m})`).matches);
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const dentroApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|musical_ly|LinkedInApp|Twitter|GSA\/|MicroMessenger/i.test(ua);
    const KEY = 'inst_nascosto', GIORNI = 30;
    const nascosto = () => { try { const t = parseInt(localStorage.getItem(KEY) || '0', 10); return t && Date.now() - t < GIORNI * 864e5; } catch (e) { return false; } };
    let evento = null, attiva = false, el = null, guida = null;

    // registra il file di servizio (serve ad Android per offrire l'installazione)
    if ('serviceWorker' in navigator) window.addEventListener('load', () => { try { navigator.serviceWorker.register('/sw.js').catch(() => {}); } catch (e) {} });
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evento = e; aggiorna(); });
    window.addEventListener('appinstalled', () => { evento = null; aggiorna(); });
    ['standalone', 'fullscreen', 'minimal-ui'].forEach(m => { try { window.matchMedia(`(display-mode: ${m})`).addEventListener('change', aggiorna); } catch (e) {} });

    const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M8 7l4-4 4 4"/><path d="M6 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H18"/></svg>';
    const PIU = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/></svg>';
    const SCARICA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/></svg>';

    function stile() {
        if (document.getElementById('inst-stile')) return;
        const s = document.createElement('style'); s.id = 'inst-stile';
        s.textContent = `
.inst-pill{position:fixed;z-index:80;left:0;right:0;bottom:calc(18px + env(safe-area-inset-bottom));margin:0 auto;width:fit-content;max-width:calc(100% - 24px);display:flex;align-items:center;gap:4px;padding:6px 6px 6px 8px;border-radius:999px;background:rgba(20,20,20,.72);border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:0 18px 40px -18px rgba(0,0,0,.95),inset 0 1px 0 rgba(255,255,255,.14);animation:inst-su .6s cubic-bezier(.16,1,.3,1) both}
.inst-pill button{font:inherit;cursor:pointer;border:0;color:#fff}
.inst-vai{display:inline-flex;align-items:center;gap:10px;padding:.78rem 1.3rem;border-radius:999px;background:#DA5512;color:#000!important;font-weight:600;font-size:.95rem;white-space:nowrap}
.inst-vai svg{width:1.15em;height:1.15em;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.inst-x{width:38px;height:38px;border-radius:50%;background:transparent;display:grid;place-items:center;color:rgba(255,255,255,.6)!important}
.inst-x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
@keyframes inst-su{from{opacity:0;transform:translateY(16px)}}
.inst-guida{position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(0,0,0,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:inst-fade .3s both}
.inst-box{width:100%;max-width:420px;padding:26px 22px calc(22px + env(safe-area-inset-bottom));border-radius:34px;background:rgba(18,18,18,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 80px -30px #000;color:#fff;font-family:var(--font-titoli,'Instrument Sans',system-ui,sans-serif)}
.inst-box h3{margin:0 0 4px;font-size:1.35rem;font-weight:700;letter-spacing:-.02em}
.inst-box h3 em{font-family:var(--font-corsivo,'Instrument Serif',serif);font-style:italic;font-weight:400;color:#DA5512;font-size:1.1em}
.inst-box>p{margin:0 0 18px;color:rgba(255,255,255,.6);font-size:.9rem}
.inst-box ol{list-style:none;margin:0 0 20px;padding:0;display:flex;flex-direction:column;gap:12px}
.inst-box li{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:22px;background:rgba(255,255,255,.06);font-size:.95rem;line-height:1.35}
.inst-box li i{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(218,85,18,.2);color:#F58A53;font-style:normal;font-family:var(--font-mono,monospace);font-size:.85rem}
.inst-box li i svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.inst-box li b{font-weight:600}
.inst-ok{width:100%;padding:1rem;border:0;border-radius:999px;background:#DA5512;color:#000;font:600 1rem inherit;cursor:pointer}
@keyframes inst-fade{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.inst-pill,.inst-guida{animation:none}}`;
        document.head.appendChild(s);
    }
    function mostraGuida() {
        if (guida) return;
        stile();
        const passi = dentroApp
            ? [['<i>1</i>', 'Tocca i tre puntini <b>⋯</b> in alto o in basso e scegli <b>Apri nel browser</b> (Safari).'], ['<i>2</i>', 'In Safari tocca <b>Condividi</b> ' + '<span style="display:inline-block;vertical-align:middle;width:18px;color:#F58A53">' + SHARE + '</span>' + '.'], ['<i>3</i>', 'Scegli <b>Aggiungi alla schermata Home</b> e conferma con <b>Aggiungi</b>.']]
            : [['<i>' + SHARE + '</i>', 'Tocca <b>Condividi</b> nella barra del browser (il quadrato con la freccia).'], ['<i>' + PIU + '</i>', 'Scorri e scegli <b>Aggiungi alla schermata Home</b>.'], ['<i>3</i>', 'Conferma con <b>Aggiungi</b>: l\'app compare sulla tua Home.']];
        guida = document.createElement('div'); guida.className = 'inst-guida'; guida.setAttribute('role', 'dialog'); guida.setAttribute('aria-modal', 'true');
        guida.innerHTML = `<div class="inst-box"><h3>Aggiungi alla <em>Home</em></h3><p>${dentroApp ? 'Questa pagina è aperta dentro un\'altra app: per installarla serve Safari.' : 'Tre tocchi e l\'app è sul tuo telefono.'}</p><ol>${passi.map(p => `<li>${p[0].startsWith('<i>') ? p[0] : ''}<span>${p[1]}</span></li>`).join('')}</ol><button class="inst-ok" type="button">Ho capito</button></div>`;
        const chiudi = () => { guida.remove(); guida = null; };
        guida.addEventListener('click', (e) => { if (e.target === guida || e.target.closest('.inst-ok')) chiudi(); });
        document.body.appendChild(guida);
    }
    function pulsante() {
        stile();
        el = document.createElement('div'); el.className = 'inst-pill';
        el.innerHTML = `<button class="inst-vai" type="button">${iOS ? PIU : SCARICA}<span>${iOS ? 'Aggiungi alla Home' : 'Installa l\'app'}</span></button><button class="inst-x" type="button" aria-label="Nascondi"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
        el.querySelector('.inst-vai').addEventListener('click', async () => {
            if (iOS || !evento) { mostraGuida(); return; }
            try { evento.prompt(); const r = await evento.userChoice; if (r && r.outcome === 'accepted') { evento = null; aggiorna(); } } catch (e) {}
        });
        el.querySelector('.inst-x').addEventListener('click', () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} aggiorna(); });
        document.body.appendChild(el);
    }
    function aggiorna() {
        const deve = attiva && !standalone() && !nascosto() && (iOS || !!evento);
        if (deve && !el) pulsante(); else if (!deve && el) { el.remove(); el = null; }
    }
    window.RawInstall = { attiva() { attiva = true; aggiorna(); }, disattiva() { attiva = false; aggiorna(); } };
})();
