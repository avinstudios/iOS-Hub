// iOS-Hub Service Worker
// This runs separately from the page itself, in the background — it's what
// makes offline support and local notifications possible.

const CACHE_NAME = 'ios-hub-cache-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'download.html',
  'development.html',
  'assets/favicon.png',
  'assets/ios26-icon.png',
  'assets/ios27-icon.png',
  'assets/ios18-icon.png',
  'assets/ios17-icon.png'
];

// Install: pre-cache the core files so the app works offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // If one file is missing/renamed, don't let it block install entirely
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network, so the app still
// loads with no connection
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        // If both cache and network fail (fully offline, uncached page),
        // fall back to the home page so the app doesn't just show an error
        return caches.match('index.html');
      });
    })
  );
});

// Listen for messages from the page — used to trigger a local notification
// (e.g. when the Focus Timer finishes)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title || 'iOS-Hub', {
      body: event.data.body || '',
      icon: 'assets/favicon.png',
      badge: 'assets/favicon.png'
    });
  }
});
