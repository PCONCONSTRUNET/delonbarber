const CACHE_CLEANUP_VERSION = "delon-cache-cleanup-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    await Promise.all(clients.map((client) => {
      const url = new URL(client.url);
      if (url.searchParams.get("cache-cleanup") === CACHE_CLEANUP_VERSION) {
        return Promise.resolve();
      }
      url.searchParams.set("cache-cleanup", CACHE_CLEANUP_VERSION);
      return client.navigate(url.toString());
    }));
  })());
});
