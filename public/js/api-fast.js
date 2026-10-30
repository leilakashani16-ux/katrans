/**
 * api-fast — جلوگیری از درخواست‌های تکراری موازی + TTL بهتر
 * بعد از bundle.js لود شود. به منطق کسب‌وکار دست نمی‌زند.
 */
(function () {
  function patch() {
    if (!window.Api || Api.__fastPatched) return false;

    // TTL طولانی‌تر برای داده‌های کم‌تغییر
    var TTL = {
      settings: 60000,
      chat_messages: 12000,
      users: 30000,
      personnel: 20000,
      materials: 15000,
      products: 15000,
      default: 8000
    };

    Api._inflight = Api._inflight || new Map();
    Api._ttlMs = 12000; // default کمی بالاتر

    var origGetCache = Api._getCache.bind(Api);
    var origSetCache = Api._setCache.bind(Api);
    var origGetAll = Api.getAll.bind(Api);
    var origRequest = Api.request.bind(Api);

    Api._ttlFor = function (path) {
      var p = String(path || '').split('?')[0].replace(/^\//, '');
      if (TTL[p] != null) return TTL[p];
      return TTL.default;
    };

    Api._getCache = function (path) {
      var k = this._cacheKey(path);
      var hit = this._cache.get(k);
      if (!hit) return null;
      var ttl = this._ttlFor(path);
      if (Date.now() - hit.t > ttl) {
        this._cache.delete(k);
        return null;
      }
      return hit.v;
    };

    /** یک درخواست در حال پرواز برای همان path — بقیه همان Promise را می‌گیرند */
    Api.request = async function (path, options) {
      options = options || {};
      var method = (options.method || 'GET').toUpperCase();
      var clean = String(path || '').replace(/^\//, '');

      // فقط GET بدون body را coalesce کن
      if (method === 'GET' && !options.body) {
        var cached = this._getCache(clean);
        if (cached !== null && cached !== undefined) return cached;

        var key = 'GET:' + clean;
        if (this._inflight.has(key)) {
          return this._inflight.get(key);
        }

        var p = origRequest(path, options)
          .then(function (data) {
            // cache list endpoints ساده
            if (clean && clean.indexOf('/') === -1) {
              try {
                Api._setCache(clean, data);
              } catch (_) {}
            }
            if (clean === 'settings') {
              try {
                Api._setCache('settings', data);
              } catch (_) {}
            }
            return data;
          })
          .finally(function () {
            Api._inflight.delete(key);
          });

        this._inflight.set(key, p);
        return p;
      }

      // mutation → بعداً cache را باطل می‌کند getAll/add/...
      return origRequest(path, options);
    };

    Api.getAll = async function (store) {
      var s = String(store || '');
      var cached = this._getCache(s);
      if (cached) return cached;

      var key = 'GETALL:' + s;
      if (this._inflight.has(key)) {
        return this._inflight.get(key);
      }

      var p = origGetAll(s)
        .then(function (data) {
          try {
            Api._setCache(s, data);
          } catch (_) {}
          return data;
        })
        .finally(function () {
          Api._inflight.delete(key);
        });

      this._inflight.set(key, p);
      return p;
    };

    Api.__fastPatched = true;
    console.log('[api-fast] single-flight + TTL ready');
    return true;
  }

  if (!patch()) {
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (patch() || n > 40) clearInterval(t);
    }, 100);
  }
})();
