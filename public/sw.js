/**
 * Service Worker — کش استاتیک + Background Sync صف آفلاین
 * حتی اگر اپ بسته باشد، بعد از وصل شدن نت outbox را می‌فرستد
 */
const CACHE = 'katrans-offline-v3';
const IDB_NAME = 'katrans-offline-v1';
const IDB_VER = 2;
const STORE_QUEUE = 'outbox';
const STORE_CACHE = 'api_cache';
const STORE_META = 'meta';

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
  './logo-ansar.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
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
          return cache.add(url).catch(function () {});
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

  if (url.pathname.indexOf('/api') === 0) {
    e.respondWith(fetch(req).then(function (res) { return res; }).catch(function () { return offlineJson(); }));
    return;
  }

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

/* ---------- IndexedDB helpers inside SW ---------- */
function swOpenIDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function swGetAll(store) {
  return swOpenIDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, 'readonly');
      var r = tx.objectStore(store).getAll();
      r.onsuccess = function () { resolve(r.result || []); };
      r.onerror = function () { reject(r.error); };
    });
  });
}

function swGet(store, key) {
  return swOpenIDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, 'readonly');
      var r = tx.objectStore(store).get(key);
      r.onsuccess = function () { resolve(r.result || null); };
      r.onerror = function () { reject(r.error); };
    });
  });
}

function swDelete(store, key) {
  return swOpenIDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function swPut(store, value) {
  return swOpenIDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

async function getAuthToken() {
  try {
    var row = await swGet(STORE_META, 'auth');
    if (row && row.token) return row.token;
  } catch (e) {}
  return null;
}

async function processOutbox() {
  var token = await getAuthToken();
  var queue = await swGetAll(STORE_QUEUE);
  var pending = queue
    .filter(function (x) { return x.status === 'pending'; })
    .sort(function (a, b) { return (a.created_at || 0) - (b.created_at || 0); });

  var done = 0;
  var failed = 0;

  for (var i = 0; i < pending.length; i++) {
    var op = pending[i];
    try {
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      var body = undefined;
      if (op.body != null && op.method !== 'DELETE') {
        var b = Object.assign({}, op.body);
        delete b.__offline;
        if (String(b.id || '').indexOf('local_') === 0) delete b.id;
        body = JSON.stringify(b);
      }

      var url = self.location.origin + '/api/' + String(op.path || '').replace(/^\//, '');
      var res = await fetch(url, { method: op.method || 'POST', headers: headers, body: body });

      if (res.ok || (op.method === 'DELETE' && res.status === 404)) {
        await swDelete(STORE_QUEUE, op.id);
        done++;
      } else {
        failed++;
        console.warn('[sw-sync] fail', op.path, res.status);
        // stop on auth errors
        if (res.status === 401 || res.status === 403) break;
      }
    } catch (e) {
      console.warn('[sw-sync] network', e);
      failed++;
      break;
    }
  }

  // notify open clients
  var clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(function (c) {
    c.postMessage({ type: 'OUTBOX_SYNCED', done: done, failed: failed });
  });

  return { done: done, failed: failed };
}

/* Background Sync — حتی با اپ بسته */
self.addEventListener('sync', function (e) {
  if (e.tag === 'katrans-outbox-sync') {
    e.waitUntil(processOutbox());
  }
});

/* پیام از صفحه: همگام فوری یا ذخیره توکن */
self.addEventListener('message', function (e) {
  var data = e.data || {};
  if (data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (data && data.type === 'SYNC_OUTBOX') {
    e.waitUntil(processOutbox());
  }
  if (data && data.type === 'SAVE_TOKEN' && data.token) {
    e.waitUntil(swPut(STORE_META, { key: 'auth', token: data.token, t: Date.now() }));
  }
  if (data && data.type === 'CLEAR_TOKEN') {
    e.waitUntil(swDelete(STORE_META, 'auth'));
  }
});
