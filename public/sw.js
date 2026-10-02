/*
 * Service worker do Conecta Trindade.
 * Propositalmente mínimo: não guarda páginas nem dados (nada fica
 * desatualizado). Só mostra uma tela amigável quando o celular está sem
 * internet, em vez da página de erro do navegador.
 */
const CACHE = 'conecta-trindade-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE, '/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Só intercepta a abertura de páginas; APIs, imagens e scripts seguem direto.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
