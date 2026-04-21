importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

/**
 * Service Worker Manifest Interceptor
 * This part intercepts manifest requests to serve the correct PWA configuration
 * (Admin vs Client) based on the URL that triggered the request.
 * This ensures that "Add to Home Screen" captures the correct app area.
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
  "id": "/admin",
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
  "id": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Intercept manifest requests
  if (url.pathname === "/manifest.json" || url.pathname === "/manifest-admin.json") {
    // Check if the request comes from an admin path or explicitly asks for admin manifest
    const referer = event.request.referrer || "";
    const isAdmin = referer.includes("/admin") || url.pathname === "/manifest-admin.json";

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
