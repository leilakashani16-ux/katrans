/**
 * offline-sync.js
 * - کش پایدار لیست‌ها در IndexedDB
 * - صف نوشتن آفلاین (add/put/remove)
 * - همگام‌سازی خودکار وقتی نت برگشت
 * - بنر وضعیت آنلاین/آفلاین
 */
(function () {
  'use strict';

  var DB_NAME = 'katrans-offline-v1';
  var DB_VER = 1;
  var STORE_CACHE = 'api_cache';
  var STORE_QUEUE = 'outbox';
  var idb = null;
  var syncing = false;

  function openIDB() {
    return new Promise(function (resolve, reject) {
      if (idb) return resolve(idb);
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function (e) {
        idb = e.target.result;
        resolve(idb);
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbPut(store, value) {
    return openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value);
        tx.oncomplete = function () { resolve(value); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbGet(store, key) {
    return openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, 'readonly');
        var req = tx.objectStore(store).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbGetAll(store) {
    return openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, 'readonly');
        var req = tx.objectStore(store).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbDelete(store, key) {
    return openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function isOnline() {
    return navigator.onLine !== false;
  }

  function cacheKey(path) {
    return String(path || '').replace(/^\//, '').split('?')[0];
  }

  async function saveCache(path, data) {
    try {
      await idbPut(STORE_CACHE, {
        key: cacheKey(path),
        data: data,
        t: Date.now()
      });
    } catch (e) {
      console.warn('offline cache save', e);
    }
  }

  async function loadCache(path) {
    try {
      var row = await idbGet(STORE_CACHE, cacheKey(path));
      return row ? row.data : null;
    } catch (e) {
      return null;
    }
  }

  async function enqueue(op) {
    op.created_at = Date.now();
    op.status = 'pending';
    var row = await idbPut(STORE_QUEUE, op);
    updateBanner();
    return row;
  }

  function toastMsg(msg, type) {
    try { if (window.toast) return window.toast(msg, type); } catch (e) {}
    console.log('[offline]', type, msg);
  }

  /* ---------- banner ---------- */
  function ensureBanner() {
    var el = document.getElementById('offline-banner');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'offline-banner';
    el.style.cssText =
      'display:none;position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px 12px;' +
      'text-align:center;font-size:13px;font-family:Tahoma,sans-serif;direction:rtl';
    document.body.appendChild(el);
    return el;
  }

  async function updateBanner() {
    var el = ensureBanner();
    var queue = [];
    try { queue = await idbGetAll(STORE_QUEUE); } catch (e) {}
    var pending = queue.filter(function (x) { return x.status === 'pending'; });

    if (!isOnline()) {
      el.style.display = 'block';
      el.style.background = '#b45309';
      el.style.color = '#fff';
      el.textContent = pending.length
        ? ('حالت آفلاین — ' + pending.length + ' عملیات در صف انتظار همگام‌سازی')
        : 'حالت آفلاین — از آخرین داده‌های ذخیره‌شده استفاده می‌شود';
      return;
    }
    if (pending.length) {
      el.style.display = 'block';
      el.style.background = '#1d4ed8';
      el.style.color = '#fff';
      el.textContent = 'آنلاین — در حال همگام‌سازی ' + pending.length + ' عملیات...';
      return;
    }
    el.style.display = 'none';
  }

  /* ---------- patch Api ---------- */
  function patchApi() {
    if (!window.Api || Api.__offlinePatched) return false;

    var origRequest = Api.request.bind(Api);
    var origGetAll = Api.getAll.bind(Api);
    var origAdd = Api.add.bind(Api);
    var origPut = Api.put.bind(Api);
    var origRemove = Api.remove.bind(Api);
    var origCalcStock = Api.calcStock ? Api.calcStock.bind(Api) : null;
    var origGetById = Api.getById ? Api.getById.bind(Api) : null;

    Api.request = async function (path, options) {
      options = options || {};
      var method = (options.method || 'GET').toUpperCase();
      var clean = String(path || '').replace(/^\//, '');

      // GET: network first, fallback cache
      if (method === 'GET') {
        if (isOnline()) {
          try {
            var data = await origRequest(path, options);
            // cache list-like responses
            if (clean && clean.indexOf('/') < 0) {
              await saveCache(clean, data);
            } else if (clean === 'stock' || clean.indexOf('stock') === 0) {
              await saveCache('stock', data);
            }
            Api.online = true;
            return data;
          } catch (e) {
            var cached = await loadCache(clean.indexOf('/') < 0 ? clean : clean.split('/')[0]);
            if (clean === 'stock' || clean.indexOf('stock') === 0) {
              cached = await loadCache('stock');
            }
            if (cached != null) {
              toastMsg('نت قطع است — دادهٔ ذخیره‌شده نمایش داده شد', 'info');
              Api.online = false;
              updateBanner();
              return cached;
            }
            throw e;
          }
        } else {
          Api.online = false;
          updateBanner();
          var key = clean.indexOf('/') < 0 ? clean : clean.split('/')[0];
          if (clean === 'stock' || clean.indexOf('stock') === 0) key = 'stock';
          var hit = await loadCache(key);
          if (hit != null) return hit;
          // health offline
          if (key === 'health') return { ok: true, offline: true };
          throw new Error('آفلاین هستید و برای «' + key + '» دادهٔ ذخیره‌شده نیست. یک‌بار با اینترنت وارد شوید.');
        }
      }

      // writes while offline → queue
      if (!isOnline() && method !== 'GET') {
        var body = null;
        try { body = options.body ? JSON.parse(options.body) : null; } catch (e) { body = options.body; }
        await enqueue({
          method: method,
          path: clean,
          body: body
        });
        toastMsg('آفلاین ذخیره شد — با وصل شدن نت همگام می‌شود', 'success');
        updateBanner();
        // optimistic local cache update for lists
        try {
          await optimisticLocal(method, clean, body);
        } catch (e) {}
        return { ok: true, offline_queued: true };
      }

      try {
        var res = await origRequest(path, options);
        Api.online = true;
        return res;
      } catch (e) {
        // network fail on write → queue
        if (method !== 'GET') {
          var body2 = null;
          try { body2 = options.body ? JSON.parse(options.body) : null; } catch (err) { body2 = options.body; }
          await enqueue({ method: method, path: clean, body: body2 });
          toastMsg('ارتباط قطع شد — در صف آفلاین ذخیره شد', 'info');
          updateBanner();
          try { await optimisticLocal(method, clean, body2); } catch (err) {}
          return { ok: true, offline_queued: true };
        }
        throw e;
      }
    };

    Api.getAll = async function (store) {
      // use memory cache first (existing)
      try {
        if (Api._getCache) {
          var mem = Api._getCache(store);
          if (mem) return mem;
        }
      } catch (e) {}

      if (isOnline()) {
        try {
          var data = await origGetAll(store);
          await saveCache(store, data);
          return data;
        } catch (e) {
          var c = await loadCache(store);
          if (c) {
            toastMsg('آفلاین — لیست از حافظه محلی', 'info');
            return c;
          }
          throw e;
        }
      }
      var local = await loadCache(store);
      if (local) return local;
      throw new Error('آفلاین: لیست «' + store + '» هنوز یک‌بار آنلاین دانلود نشده');
    };

    Api.add = async function (store, item) {
      if (!isOnline()) {
        await enqueue({ method: 'POST', path: store, body: item });
        await optimisticLocal('POST', store, item);
        toastMsg('آفلاین ذخیره شد', 'success');
        updateBanner();
        if (Api.invalidateCache) Api.invalidateCache(store);
        return { ok: true, offline_queued: true };
      }
      try {
        var r = await origAdd(store, item);
        // refresh cache in background
        try {
          var list = await origGetAll(store);
          await saveCache(store, list);
        } catch (e) {}
        return r;
      } catch (e) {
        await enqueue({ method: 'POST', path: store, body: item });
        await optimisticLocal('POST', store, item);
        toastMsg('در صف آفلاین ذخیره شد', 'info');
        updateBanner();
        return { ok: true, offline_queued: true };
      }
    };

    Api.put = async function (store, item) {
      if (!isOnline()) {
        await enqueue({ method: 'PUT', path: store + '/' + item.id, body: item });
        await optimisticLocal('PUT', store, item);
        toastMsg('آفلاین ویرایش شد', 'success');
        updateBanner();
        if (Api.invalidateCache) Api.invalidateCache(store);
        return { ok: true, offline_queued: true };
      }
      try {
        return await origPut(store, item);
      } catch (e) {
        await enqueue({ method: 'PUT', path: store + '/' + item.id, body: item });
        await optimisticLocal('PUT', store, item);
        updateBanner();
        return { ok: true, offline_queued: true };
      }
    };

    Api.remove = async function (store, id) {
      if (!isOnline()) {
        await enqueue({ method: 'DELETE', path: store + '/' + id, body: null });
        await optimisticLocal('DELETE', store, { id: id });
        toastMsg('آفلاین حذف در صف قرار گرفت', 'success');
        updateBanner();
        if (Api.invalidateCache) Api.invalidateCache(store);
        return { ok: true, offline_queued: true };
      }
      try {
        return await origRemove(store, id);
      } catch (e) {
        await enqueue({ method: 'DELETE', path: store + '/' + id, body: null });
        updateBanner();
        return { ok: true, offline_queued: true };
      }
    };

    if (origCalcStock) {
      Api.calcStock = async function () {
        if (isOnline()) {
          try {
            var s = await origCalcStock();
            await saveCache('stock', s);
            return s;
          } catch (e) {
            var c = await loadCache('stock');
            if (c) return c;
            throw e;
          }
        }
        var local = await loadCache('stock');
        if (local) return local;
        // compute rough stock offline if materials cached
        return local || {};
      };
    }

    if (origGetById) {
      Api.getById = async function (store, id) {
        try {
          if (isOnline()) return await origGetById(store, id);
        } catch (e) {}
        var list = await loadCache(store);
        if (Array.isArray(list)) {
          var found = list.find(function (x) { return String(x.id) === String(id); });
          if (found) return found;
        }
        if (isOnline()) return origGetById(store, id);
        throw new Error('آفلاین: رکورد پیدا نشد');
      };
    }

    // login: allow offline session if token exists
    var origLogin = Api.login && Api.login.bind(Api);
    if (origLogin) {
      Api.login = async function (username, password) {
        if (!isOnline()) {
          var token = localStorage.getItem('kitchen_token');
          var session = localStorage.getItem('kitchen_session');
          if (token && session) {
            Api.token = token;
            toastMsg('ورود آفلاین با نشست قبلی', 'info');
            return { ok: true, token: token, user: JSON.parse(session), offline: true };
          }
          throw new Error('آفلاین هستید و نشست قبلی نیست. یک‌بار آنلاین وارد شوید.');
        }
        return origLogin(username, password);
      };
    }

    Api.__offlinePatched = true;
    Api.syncOutbox = syncOutbox;
    Api.getOutboxCount = async function () {
      var q = await idbGetAll(STORE_QUEUE);
      return q.filter(function (x) { return x.status === 'pending'; }).length;
    };
    return true;
  }

  async function optimisticLocal(method, path, body) {
    var store = String(path || '').split('/')[0];
    if (!store) return;
    var list = await loadCache(store);
    if (!Array.isArray(list)) return;
    if (method === 'POST' && body) {
      var item = Object.assign({}, body);
      if (!item.id) item.id = 'local_' + Date.now();
      item.__offline = true;
      list = list.concat([item]);
    } else if (method === 'PUT' && body) {
      list = list.map(function (x) {
        if (String(x.id) === String(body.id)) return Object.assign({}, x, body);
        return x;
      });
    } else if (method === 'DELETE' && body && body.id != null) {
      list = list.filter(function (x) { return String(x.id) !== String(body.id); });
    } else if (method === 'DELETE') {
      var id = String(path).split('/')[1];
      if (id) list = list.filter(function (x) { return String(x.id) !== String(id); });
    }
    await saveCache(store, list);
    try {
      if (Api._setCache) Api._setCache(store, list);
      if (Api.invalidateCache) Api.invalidateCache('stock');
    } catch (e) {}
  }

  async function syncOutbox() {
    if (syncing || !isOnline()) return;
    syncing = true;
    updateBanner();
    try {
      var queue = await idbGetAll(STORE_QUEUE);
      var pending = queue.filter(function (x) { return x.status === 'pending'; })
        .sort(function (a, b) { return (a.created_at || 0) - (b.created_at || 0); });
      for (var i = 0; i < pending.length; i++) {
        var op = pending[i];
        try {
          var opts = { method: op.method };
          if (op.body != null && op.method !== 'DELETE') {
            var body = Object.assign({}, op.body);
            // strip local-only flags
            delete body.__offline;
            if (String(body.id || '').indexOf('local_') === 0) delete body.id;
            opts.body = JSON.stringify(body);
          }
          // call raw network (bypass queue)
          var url = (Api.base || '') + '/api/' + String(op.path || '').replace(/^\//, '');
          var res = await fetch(url, {
            method: op.method,
            headers: Api.headers,
            body: opts.body
          });
          if (!res.ok) {
            var errText = await res.text();
            console.warn('sync fail', op, errText);
            // keep pending for retry unless 404 on delete
            if (!(op.method === 'DELETE' && res.status === 404)) continue;
          }
          await idbDelete(STORE_QUEUE, op.id);
        } catch (e) {
          console.warn('sync item error', e);
          break; // stop on network error
        }
      }
      // refresh key stores
      if (isOnline()) {
        var stores = ['materials', 'products', 'personnel', 'entries', 'productions', 'wastes', 'recipe_items', 'recipes'];
        for (var s = 0; s < stores.length; s++) {
          try {
            var data = await fetch((Api.base || '') + '/api/' + stores[s], { headers: Api.headers }).then(function (r) { return r.json(); });
            await saveCache(stores[s], data);
            if (Api._setCache) Api._setCache(stores[s], data);
          } catch (e) {}
        }
        try {
          var stock = await fetch((Api.base || '') + '/api/stock', { headers: Api.headers }).then(function (r) { return r.json(); });
          await saveCache('stock', stock);
        } catch (e) {}
      }
      var left = await Api.getOutboxCount();
      if (left === 0) toastMsg('همگام‌سازی آفلاین کامل شد', 'success');
    } finally {
      syncing = false;
      updateBanner();
    }
  }

  /* ---------- prefetch important stores when online ---------- */
  async function warmCache() {
    if (!isOnline() || !window.Api || !Api.token) return;
    var stores = ['materials', 'products', 'personnel', 'entries', 'productions', 'wastes', 'recipe_items', 'recipes', 'settings'];
    for (var i = 0; i < stores.length; i++) {
      try {
        var data = await Api.request(stores[i]);
        await saveCache(stores[i], data);
      } catch (e) {}
    }
    try {
      var stock = await Api.request('stock');
      await saveCache('stock', stock);
    } catch (e) {}
  }

  function boot() {
    patchApi();
    updateBanner();
    window.addEventListener('online', function () {
      Api.online = true;
      updateBanner();
      toastMsg('اینترنت وصل شد — همگام‌سازی...', 'info');
      syncOutbox();
      warmCache();
    });
    window.addEventListener('offline', function () {
      Api.online = false;
      updateBanner();
      toastMsg('اینترنت قطع شد — حالت آفلاین', 'info');
    });
    // periodic sync
    setInterval(function () {
      if (isOnline()) syncOutbox();
    }, 20000);
    // warm after login/session
    setTimeout(warmCache, 2000);
    setTimeout(warmCache, 8000);
  }

  function tryPatch() {
    if (patchApi()) boot();
    else setTimeout(tryPatch, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPatch);
  } else {
    tryPatch();
  }
  setTimeout(tryPatch, 500);
  setTimeout(tryPatch, 1500);

  

  // Allow app boot in cloud-mode while offline if session exists
  function patchHealthForOfflineBoot() {
    if (!window.Api || Api.__healthOfflinePatched) return;
    var origHealth = Api.health.bind(Api);
    Api.health = async function () {
      if (!isOnline()) {
        var token = localStorage.getItem('kitchen_token');
        if (token) {
          Api.token = token;
          Api.online = false;
          return { ok: true, offline: true, mode: 'offline-cache' };
        }
        return { ok: false, error: 'offline', code: 'SW_OFFLINE' };
      }
      try {
        var h = await origHealth();
        return h;
      } catch (e) {
        var token2 = localStorage.getItem('kitchen_token');
        if (token2) {
          Api.token = token2;
          return { ok: true, offline: true, mode: 'offline-cache', error: String(e.message || e) };
        }
        throw e;
      }
    };
    Api.__healthOfflinePatched = true;
  }

  // After cloud enable, ensure DB uses patched Api
  var _enableTries = 0;
  function ensureCloudBindingOffline() {
    if (typeof enableCloudDB === 'function' && localStorage.getItem('kitchen_token') && !isOnline()) {
      try {
        enableCloudDB();
        var statusEl = document.getElementById('cloud-status');
        if (statusEl) {
          statusEl.innerHTML = '<span class="text-amber-400">● حالت آفلاین ابری — داده از حافظه دستگاه؛ با وصل نت همگام می‌شود</span>';
        }
      } catch (e) {}
    }
    if (_enableTries++ < 10) setTimeout(ensureCloudBindingOffline, 500);
  }

  // hook into existing boot
  var _oldBoot = boot;
  boot = function () {
    patchHealthForOfflineBoot();
    _oldBoot();
    ensureCloudBindingOffline();
  };

  window.OfflineSync = {
    sync: syncOutbox,
    warm: warmCache,
    updateBanner: updateBanner
  };
})();
