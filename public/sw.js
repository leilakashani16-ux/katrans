/**
 * Service Worker — شبکه اول، همیشه Response معتبر
 * باگ قبلی: caches.match بدون نتیجه → undefined → TypeError و کل JSها fail
 */
const CACHE = 'ansar-v5-safe';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/app-core.css',
  './js/db.js',
  './js/api.js',
  './js/auth.js',
  './js/utils.js',
  './js/pages.js',
  './js/staff-meals.js',
  './js/branch-stock.js',
  './js/recipes-prod.js',
  './js/app.js',
  './logo-ansar.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

function okEmpty() {
  return new Response('', { status: 503, statusText: 'Offline' });
}

function offlineJson() {
  return new Response(JSON.stringify({ ok: false, error: 'offline', code: 'SW_OFFLINE' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return Promise.all(
          PRECACHE.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn('precache skip', url, err);
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
      .catch(function (err) {
        console.warn('sw install', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var url;
  try {
    url = new URL(e.request.url);
  } catch (_) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.indexOf('/api') === 0) {
    e.respondWith(
      fetch(e.request)
        .then(function (res) {
          return res || offlineJson();
        })
        .catch(function () {
          return offlineJson();
        })
    );
    return;
  }

  var path = url.pathname;
  var isCritical =
    path === '/' ||
    path.endsWith('.html') ||
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('manifest.json');

  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) {
            try {
              c.put(e.request, clone);
            } catch (_) {}
          });
        }
        return res || okEmpty();
      })
      .catch(function () {
        return caches.match(e.request).then(function (cached) {
          if (cached) return cached;
          if (isCritical) {
            return new Response('/* offline or missing: ' + path + ' */', {
              status: 503,
              headers: {
                'Content-Type': path.endsWith('.css') ? 'text/css' : 'application/javascript'
              }
            });
          }
          return okEmpty();
        });
      })
  );
});
