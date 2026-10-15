/**
 * Cloud API client — connects to /api (Cloudflare Pages Functions + D1)
 * All devices share the same D1 database.
 */
const Api = {
  base: '', // same origin → /api
  token: null,
  online: false,

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

  getAll(store) {
    return this.request(store);
  },

  getById(store, id) {
    return this.request(store + '/' + id);
  },

  add(store, item) {
    return this.request(store, { method: 'POST', body: JSON.stringify(item) });
  },

  put(store, item) {
    const id = item.id;
    const body = { ...item };
    delete body.id;
    return this.request(store + '/' + id, { method: 'PUT', body: JSON.stringify(body) });
  },

  remove(store, id) {
    return this.request(store + '/' + id, { method: 'DELETE' });
  },

  calcStock() {
    return this.request('stock');
  },

  backup() {
    return this.request('backup');
  },
};

window.Api = Api;
