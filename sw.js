// ─── Service Worker — Darul Falah Admin PWA ───────────
const CACHE_NAME  = 'darul-falah-v2';
const STATIC_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.png',
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_URLS.map(u => new Request(u, { cache: 'reload' })));
    }).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network-first untuk Supabase, cache-first untuk static
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase requests: selalu network, jangan cache
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // CDN scripts (SheetJS, dll): cache-first
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Static app files: Network-first dengan fallback cache
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
