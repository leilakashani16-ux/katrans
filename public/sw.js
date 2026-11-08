/**
 * Service Worker — شبکه اول برای API، کش برای استاتیک، آفلاین پایدار
 */
const CACHE = 'katrans-offline-v2';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/app-core.css',
  './js/bundle.js',
  './js/app.js',
  './js/api-fast.js',
  './js/offline-sync.js',
  './js/ui-ux-patch.js',
  './js/dish-cost.js',
  './js/materials-price.js',
  './js/pricing-recipes.js',
  './js/recipe-print.js',
  './js/processing.js',
  './js/processing-plus.js',
  './js/invoice-entries.js',
  './js/org-sync.js',
  './js/theme-engine.js',
  './js/ui-final.js',
  './js/currency-rial.js',
  './js/charts-fx.js',
  './js/dashboard-charts-mix.js',
  './logo-ansar.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-96.png'
];

function offlineJson() {
  return new Response(JSON.stringify({ ok: false, error: 'offline', code: 'SW_OFFLINE' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        PRECACHE.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('precache skip', url, err && err.message);
          });
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  // API: network only (offline handled in app offline-sync.js)
  if (url.pathname.indexOf('/api') === 0) {
    e.respondWith(
      fetch(req).then(function (res) { return res; }).catch(function () { return offlineJson(); })
    );
    return;
  }

  // Static: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) {
            try { cache.put(req, res.clone()); } catch (_) {}
          }
          return res;
        }).catch(function () {
          return cached || caches.match('./index.html') || new Response('آفلاین', { status: 503 });
        });
        return cached || network;
      });
    })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
