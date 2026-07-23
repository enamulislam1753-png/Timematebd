const CACHE_NAME = 'timemate-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn-icons-png.flaticon.com/512/3602/3602145.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline support assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through all non-GET, API, or live dev/preview requests directly to network
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always bypass Service Worker for API, WebRTC, Firebase, Google, and dev assets
  if (
    url.origin.includes('firestore.googleapis.com') || 
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('firebase') ||
    url.origin.includes('google') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/node_modules/')
  ) {
    return;
  }

  // Network-First strategy
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'TimeMate BD', body: event.data ? event.data.text() : 'নতুন নোটিফিকেশন এসেছে!' };
  }
  
  const options = {
    body: data.body || 'নতুন নোটিফিকেশন এসেছে!',
    icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'TimeMate BD', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
