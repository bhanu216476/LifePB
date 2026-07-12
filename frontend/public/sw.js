// LifeOS AI - Service Worker for Push Notifications
const CACHE_NAME = 'lifeos-ai-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'LifeOS AI', message: 'You have a new notification.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'LifeOS AI', message: event.data.text() };
    }
  }

  const options = {
    body: data.message,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: 'lifeos-notification',
    renotify: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: '📊 Open Dashboard' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate('/dashboard');
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
