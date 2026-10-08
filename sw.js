// Service worker minimo: serve solo a rendere il sito installabile come app. Non salva nulla in memoria: le pagine arrivano sempre aggiornate.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
