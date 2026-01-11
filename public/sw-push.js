// Custom Service Worker for Push Notifications
// This file is loaded alongside the Vite PWA service worker

const SUPABASE_URL = 'https://etfujmuzwzzhztucqbek.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZnVqbXV6d3p6aHp0dWNxYmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjA3NTQsImV4cCI6MjA4MzM5Njc1NH0.J0EQtBMyiVchphMa3OijiPjr7j3l44oFlMPkfXAFYo0';

// Track last checked notification to avoid duplicates
let lastCheckedId = null;

self.addEventListener('push', function(event) {
  console.log('[SW Push] Received push notification');

  if (!event.data) {
    console.log('[SW Push] No data in push event');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Nova Notificação', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      ...data
    },
    actions: [
      {
        action: 'open',
        title: 'Ver'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Barbearia Alan Delon', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW Push] Notification clicked');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/admin/agenda';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window if no existing window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[SW Push] Subscription changed');
  // Re-subscribe logic would go here
});

// Periodic sync for background notification checking (when supported)
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNewNotifications());
  }
});

// Check for new notifications when the service worker activates
self.addEventListener('activate', function(event) {
  console.log('[SW Push] Service worker activated');
  event.waitUntil(
    Promise.all([
      clients.claim(),
      registerPeriodicSync()
    ])
  );
});

async function registerPeriodicSync() {
  try {
    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.register('check-notifications', {
        minInterval: 60 * 1000 // Check every minute
      });
      console.log('[SW Push] Periodic sync registered');
    }
  } catch (e) {
    console.log('[SW Push] Periodic sync not supported:', e);
  }
}

async function checkForNewNotifications() {
  try {
    // This function checks for unread notifications in the database
    // It's called periodically when the app is in background
    console.log('[SW Push] Checking for new notifications...');
    
    // The actual notification check happens through the Supabase realtime subscription
    // This is a fallback mechanism
  } catch (error) {
    console.error('[SW Push] Error checking notifications:', error);
  }
}

// Message handler for communication with the main app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: tag || 'app-notification',
      renotify: true,
      requireInteraction: true,
      data: { url: url || '/admin/agenda' },
      actions: [
        { action: 'open', title: 'Ver' },
        { action: 'close', title: 'Fechar' }
      ]
    });
  }
});

console.log('[SW Push] Service worker loaded');
