importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

/**
 * Service Worker Manifest Interceptor
 */

const ADMIN_MANIFEST = {
  "name": "Delon Admin",
  "short_name": "Delon Admin",
  "description": "Painel administrativo Delon Barber",
  "start_url": "/admin/login",
  "scope": "/admin",
  "display": "standalone",
  "background_color": "#0B0B0B",
  "theme_color": "#D62828",
  "orientation": "portrait-primary",
  "id": "delon-admin-pwa",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
};

const CLIENT_MANIFEST = {
  "name": "Delon Barber",
  "short_name": "Delon Barber",
  "description": "A melhor experiência em cortes masculinos, barba e tratamentos premium",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0B0B0B",
  "theme_color": "#D62828",
  "orientation": "portrait-primary",
  "id": "delon-client-pwa",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Intercept any manifest request (.json or .webmanifest)
  if (url.pathname.endsWith(".webmanifest") || url.pathname.endsWith("manifest.json")) {
    const referer = event.request.referrer || "";
    const isQueryAdmin = url.searchParams.get('v') === 'admin';
    const isAdmin = isQueryAdmin || referer.includes("/admin") || url.pathname.includes("admin");

    const manifest = isAdmin ? ADMIN_MANIFEST : CLIENT_MANIFEST;

    event.respondWith(
      new Response(JSON.stringify(manifest), {
        headers: { 
          "Content-Type": "application/manifest+json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      })
    );
  }
});
