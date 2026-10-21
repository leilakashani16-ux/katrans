/**
 * Cloud API client — connects to /api (Cloudflare Pages Functions + D1)
 * All devices share the same D1 database.
 */
const Api = {
  base: '', // same origin → /api
  token: null,
  online: false,
  // Short in-memory cache for list/stock (cuts repeated navigations)
  _cache: new Map(),
  _ttlMs: 8000,

  _cacheKey(path) { return path; },
  _getCache(path) {
    const k = this._cacheKey(path);
    const hit = this._cache.get(k);
    if (!hit) return null;
    if (Date.now() - hit.t > this._ttlMs) {
      this._cache.delete(k);
      return null;
    }
    return hit.v;
  },
  _setCache(path, v) {
    this._cache.set(this._cacheKey(path), { t: Date.now(), v });
  },
  invalidateCache(prefix) {
    if (!prefix) {
      this._cache.clear();
      return;
    }
    for (const k of [...this._cache.keys()]) {
      if (k === prefix || k.startsWith(prefix + '/') || k.startsWith(prefix + '?')) {
        this._cache.delete(k);
      }
    }
    // stock depends on almost everything
    if (['entries', 'productions', 'wastes', 'returns', 'materials', 'products'].some(s => prefix === s || prefix.startsWith(s))) {
      this._cache.delete('stock');
    }
  },

  get headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h.Authorization = 'Bearer ' + this.token;
    return h;
  },

  async request(path, options = {}) {
    const url = (this.base || '') + '/api/' + path.replace(/^\//, '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    let res;
    try {
      res = await fetch(url, {
        ...options,
        signal: ctrl.signal,
        headers: { ...this.headers, ...(options.headers || {}) },
      });
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('زمان پاسخ سرور تمام شد — دوباره تلاش کنید');
      throw new Error('خطای شبکه: ' + (e.message || 'اتصال برقرار نشد'));
    }
    clearTimeout(timer);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = { error: 'invalid response' };
    }
    if (!res.ok) {
      const err = new Error(data.msg || data.error || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  async health() {
    try {
      const d = await this.request('health');
      this.online = !!(d && d.ok);
      return d;
    } catch (e) {
      this.online = false;
      return { ok: false, error: e.message, code: e.data?.code };
    }
  },

  async login(username, password) {
    const d = await this.request('login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (d.ok && d.token) {
      this.token = d.token;
      localStorage.setItem('kitchen_token', d.token);
      localStorage.setItem('kitchen_session', JSON.stringify(d.user));
    }
    return d;
  },

  loadToken() {
    this.token = localStorage.getItem('kitchen_token');
    return this.token;
  },

  logout() {
    this.token = null;
    localStorage.removeItem('kitchen_token');
    localStorage.removeItem('kitchen_session');
  },

  async getAll(store) {
    const cached = this._getCache(store);
    if (cached) return cached;
    const data = await this.request(store);
    this._setCache(store, data);
    return data;
  },

  getById(store, id) {
    return this.request(store + '/' + id);
  },

  async add(store, item) {
    const r = await this.request(store, { method: 'POST', body: JSON.stringify(item) });
    this.invalidateCache(store);
    return r;
  },

  async put(store, item) {
    const id = item.id;
    const body = { ...item };
    delete body.id;
    const r = await this.request(store + '/' + id, { method: 'PUT', body: JSON.stringify(body) });
    this.invalidateCache(store);
    return r;
  },

  async remove(store, id) {
    const r = await this.request(store + '/' + id, { method: 'DELETE' });
    this.invalidateCache(store);
    return r;
  },

  async calcStock() {
    const cached = this._getCache('stock');
    if (cached) return cached;
    const data = await this.request('stock');
    this._setCache('stock', data);
    return data;
  },

  backup() {
    return this.request('backup');
  },
};

window.Api = Api;
