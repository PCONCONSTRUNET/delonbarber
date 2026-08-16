// Service Worker — DELONBARBER
// Versão segura: ativa imediatamente sem forçar navegação nos clientes.
// O reload seguro é feito pelo app via controllerchange listener (main.tsx).

self.addEventListener('install', (event) => {
  // Ativa o novo SW imediatamente, sem esperar as abas fecharem
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Toma controle de todas as abas abertas imediatamente
      await self.clients.claim();

      // Limpa caches antigos de versões anteriores
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== 'delon-v1') // mantém só o cache atual
          .map((name) => caches.delete(name))
      );
    })()
  );
});

// Estratégia de cache: network-first para garantir conteúdo sempre atualizado
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e requests para o Supabase/APIs externas
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});