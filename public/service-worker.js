// Service worker mínimo — cacheia o app shell pra permitir instalação e uma
// experiência básica offline. Não faz cache agressivo de dados (o app usa
// Supabase, que precisa de rede pra funcionar de verdade).
const CACHE_NAME = "viaja-que-rola-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
        );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
          caches.keys().then((keys) =>
                  Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
                                 )
        );
    self.clients.claim();
});

// Estratégia network-first: sempre tenta a rede primeiro (dados atualizados),
// só cai no cache se estiver offline. Evita servir uma versão velha do app
// por engano enquanto há internet.
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(
          fetch(event.request)
            .then((response) => {
                      const copy = response.clone();
                      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
                      return response;
            })
            .catch(() => caches.match(event.request))
        );
});
