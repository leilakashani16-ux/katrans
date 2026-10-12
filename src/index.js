/**
 * Cloudflare Worker + Static Assets + D1
 * wrangler.toml → [assets] directory = "./public"
 */
/**
 * Cloudflare Pages Function — /api/*
 * Requires D1 binding named "DB"
 */

const STORES = new Set(['users', 'personnel', 'materials', 'products', 'entries', 'wastes', 'productions', 'returns']);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

async function hashPassword(plain) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain + 'kitchen-salt-v1'));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  if (hash.length === 64 && /^[0-9a-f]+$/.test(hash)) {
    return (await hashPassword(plain)) === hash;
  }
  return plain === hash;
}

/** Base64 safe for Persian / UTF-8 (btoa alone throws on non-Latin1) */
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseAuth(req) {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    return JSON.parse(b64ToUtf8(h.slice(7)));
  } catch {
    try {
      return JSON.parse(atob(h.slice(7))); // legacy tokens
    } catch {
      return null;
    }
  }
}

async function ensureSchema(db) {
  // Create tables if missing (idempotent)
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      position TEXT,
      active INTEGER DEFAULT 1
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'کیلوگرم',
      initial_stock REAL DEFAULT 0,
      min_alert REAL DEFAULT 0,
      description TEXT,
      active INTEGER DEFAULT 1
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      weight_per_unit REAL NOT NULL,
      material_name TEXT,
      description TEXT,
      remainder_type TEXT DEFAULT 'حمل به روز بعد',
      remainder_note TEXT,
      active INTEGER DEFAULT 1
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      material_name TEXT,
      quantity REAL NOT NULL,
      supplier TEXT,
      invoice_no TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS wastes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      material_name TEXT,
      waste_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS productions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      product_name TEXT,
      quantity REAL NOT NULL,
      material_weight REAL NOT NULL,
      material_name TEXT,
      shift_code TEXT,
      start_time TEXT,
      end_time TEXT,
      duration_minutes REAL,
      producer_name TEXT,
      remainder_count REAL DEFAULT 0,
      remainder_weight REAL DEFAULT 0,
      remainder_type TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      production_id INTEGER,
      product_name TEXT,
      remainder_count REAL,
      return_weight REAL NOT NULL,
      material_name TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
  ]);

  const row = await db.prepare('SELECT COUNT(*) as c FROM users').first();
  if (!row || row.c === 0) {
    const hAdmin = await hashPassword('admin123');
    const hEntry = await hashPassword('entry123');
    const hProd = await hashPassword('prod123');
    await db.batch([
      db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)').bind('admin', hAdmin, 'admin', 'مدیر سیستم'),
      db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)').bind('entry', hEntry, 'entry', 'ثبت‌کننده ورود'),
      db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)').bind('production', hProd, 'production', 'ثبت‌کننده تولید'),
      // seed materials
      db.prepare(`INSERT INTO materials (code,name,unit,initial_stock,min_alert,description) VALUES
        ('M001','سینه مرغ','کیلوگرم',23.5,10,'ماده اصلی جوجه سیخ'),
        ('M002','ران مرغ','عدد',125,50,''),
        ('M003','گوشت نخودی','کیلوگرم',69,50,'برای کباب و سیخ گوشت'),
        ('M004','گوشت خورشتی','کیلوگرم',30.5,10,''),
        ('M005','ماهی','عدد',11,4,''),
        ('M006','سینه فسنجان','کیلوگرم',0,5,'ازسینه ورودی خام جدا میشود'),
        ('M007','سینه سالاد','کیلوگرم',0,1.5,'ازسینه ورودی خام جدا میشود'),
        ('M008','مایه لوبیا پلو','کیلوگرم',0,5,'مایه آماده لوبیاپلو')`),
      db.prepare(`INSERT INTO personnel (code,name,position,active) VALUES
        ('S001','راجا کشمیری','سوشف',1),
        ('S002','میثم خواجه','سرآشپز',1),
        ('S003','مصطفی خوشگفتار','آشپز',1),
        ('S004','مهدی عصمتی','آشپز',1),
        ('S005','صفرملک زاده','تخته کاروکبابپز',1),
        ('S006','مهدی یوسفی','آشپز',1),
        ('S007','عباس مقدسی','کمک آشپز',1),
        ('S008','سیدمحمود میرنظیر','کارگر',1),
        ('S009','شهرام ابوالفتحی','مدیر داخلی',1),
        ('S010','مریم یزدانی','سالادزن',1),
        ('S011','اکبر رضاییان','انبار دار',1)`),
      db.prepare(`INSERT INTO products (code,name,weight_per_unit,material_name,remainder_type,active) VALUES
        ('P001','جوجه معمولی 170 گرمی',170,'سینه مرغ','حمل به روز بعد',1),
        ('P002','جوجه ممتاز ۲۰۰ گرمی',200,'سینه مرغ','حمل به روز بعد',1),
        ('P003','جوجه مجلسی ۲۸۰ گرمی',280,'سینه مرغ','حمل به روز بعد',1),
        ('P004','کوبیده اکو 100گرمی',75,'گوشت نخودی','برگشت به مواد',1),
        ('P005','لقمه معمولی 120گرمی',90,'گوشت نخودی','برگشت به مواد',1),
        ('P006','لقمه مجلسی 150گرمی',113,'گوشت نخودی','برگشت به مواد',1),
        ('P007','ران مرغ زرشک',1000,'ران مرغ','حمل به روز بعد',1),
        ('P008','ماهی قزل',1000,'ماهی','حمل به روز بعد',1),
        ('P009','گوشت خورشت قیمه',1000,'گوشت خورشتی','حمل به روز بعد',1),
        ('P010','گوشت خورشت قورمه',1000,'گوشت خورشتی','حمل به روز بعد',1),
        ('P011','مرغ خورشت فسنجان',1000,'سینه فسنجان','حمل به روز بعد',1),
        ('P012','مرغ سالاد ماکارونی',1500,'سینه سالاد','حمل به روز بعد',1),
        ('P013','گوشت پخته خورشتی',1000,'گوشت خورشتی','حمل به روز بعد',1)`),
    ]);
  }
}

async function handleApi(request, env) {

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (!env.DB) {
    return json({
      error: 'D1 متصل نیست. در Cloudflare یک D1 بسازید و در Settings → Functions → D1 bindings نام DB را bind کنید.',
      code: 'NO_D1',
    }, 503);
  }

  const url = new URL(request.url);
  // path after /api/
  let path = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  // Pages function catch-all may include "api/" prefix sometimes
  if (path.startsWith('api/')) path = path.slice(4);

  try {
    await ensureSchema(env.DB);

    if (path === 'health' || path === '') {
      const c = await env.DB.prepare('SELECT COUNT(*) as c FROM users').first();
      return json({ ok: true, mode: 'cloud', users: c?.c ?? 0, ts: new Date().toISOString() });
    }

    if (path === 'login' && request.method === 'POST') {
      const body = await request.json();
      const row = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ? AND active = 1'
      ).bind(String(body.username || '').trim()).first();
      if (!row || !(await verifyPassword(body.password || '', row.password_hash))) {
        return json({ ok: false, msg: 'نام کاربری یا رمز عبور اشتباه است' }, 401);
      }
      if ((row.password_hash || '').length !== 64) {
        const h = await hashPassword(body.password);
        await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(h, row.id).run();
      }
      const token = utf8ToB64(JSON.stringify({
        id: row.id, username: row.username, role: row.role, full_name: row.full_name || '',
      }));
      return json({
        ok: true,
        token,
        user: { id: row.id, username: row.username, role: row.role, full_name: row.full_name },
      });
    }

    const user = parseAuth(request);

    if (path === 'stock' && request.method === 'GET') {
      const materials = (await env.DB.prepare('SELECT * FROM materials').all()).results || [];
      const entries = (await env.DB.prepare('SELECT * FROM entries').all()).results || [];
      const productions = (await env.DB.prepare('SELECT * FROM productions').all()).results || [];
      const wastes = (await env.DB.prepare('SELECT * FROM wastes').all()).results || [];
      const returns = (await env.DB.prepare('SELECT * FROM returns').all()).results || [];
      const stock = materials.map((m) => {
        const totalIn = entries.filter((e) => e.material_name === m.name).reduce((s, e) => s + Number(e.quantity || 0), 0);
        const totalOut = productions.filter((p) => p.material_name === m.name).reduce((s, p) => s + Number(p.material_weight || 0), 0);
        const totalWaste = wastes.filter((w) => w.material_name === m.name).reduce((s, w) => s + Number(w.quantity || 0), 0);
        const totalReturn = returns.filter((r) => r.material_name === m.name).reduce((s, r) => s + Number(r.return_weight || 0), 0);
        const current = Number(m.initial_stock || 0) + totalIn - totalOut - totalWaste + totalReturn;
        const status = current <= 0 ? 'تمام شد' : current < (m.min_alert || 0) ? 'هشدار' : 'عادی';
        return {
          ...m,
          total_in: totalIn,
          total_out: totalOut,
          total_waste: totalWaste,
          total_return: totalReturn,
          current_stock: Math.round(current * 100) / 100,
          status,
        };
      });
      return json(stock);
    }

    if (path === 'backup' && request.method === 'GET') {
      if (!user || user.role !== 'admin') return json({ error: 'forbidden' }, 403);
      const data = {};
      for (const s of STORES) {
        data[s] = (await env.DB.prepare(`SELECT * FROM ${s}`).all()).results || [];
      }
      data.exported_at = new Date().toISOString();
      return json(data);
    }

    // Generic CRUD: /api/{store} or /api/{store}/{id}
    const parts = path.split('/').filter(Boolean);
    const store = parts[0];
    const id = parts[1] ? Number(parts[1]) : null;

    if (!STORES.has(store)) {
      return json({ error: 'not found', path }, 404);
    }

    if (request.method === 'GET' && !id) {
      const rows = (await env.DB.prepare(`SELECT * FROM ${store} ORDER BY id DESC`).all()).results || [];
      // never return password hashes to non-admin list is ok for users table - strip
      if (store === 'users') {
        return json(rows.map(({ password_hash, ...r }) => r));
      }
      return json(rows);
    }

    if (request.method === 'GET' && id) {
      const row = await env.DB.prepare(`SELECT * FROM ${store} WHERE id = ?`).bind(id).first();
      if (store === 'users' && row) {
        const { password_hash, ...rest } = row;
        return json(rest);
      }
      return json(row || null);
    }

    if (request.method === 'POST') {
      if (!user) return json({ error: 'auth required' }, 401);
      // role checks
      if (store === 'users' && user.role !== 'admin') return json({ error: 'admin only' }, 403);
      if (['entries', 'wastes'].includes(store) && !['admin', 'entry'].includes(user.role)) {
        return json({ error: 'forbidden' }, 403);
      }
      if (store === 'productions' && !['admin', 'production'].includes(user.role)) {
        return json({ error: 'forbidden' }, 403);
      }
      if (['materials', 'products', 'personnel'].includes(store) && user.role !== 'admin') {
        return json({ error: 'admin only' }, 403);
      }

      const body = await request.json();
      delete body.id;

      if (store === 'users' && body.password) {
        body.password_hash = await hashPassword(body.password);
        delete body.password;
      }

      // map client field password → password_hash already handled
      const keys = Object.keys(body).filter((k) => body[k] !== undefined);
      if (!keys.length) return json({ error: 'empty body' }, 400);
      const placeholders = keys.map(() => '?').join(',');
      const sql = `INSERT INTO ${store} (${keys.join(',')}) VALUES (${placeholders})`;
      const result = await env.DB.prepare(sql).bind(...keys.map((k) => body[k])).run();
      const newId = result.meta.last_row_id;

      if (store === 'productions' && body.remainder_type === 'برگشت به مواد' && Number(body.remainder_weight || 0) > 0) {
        await env.DB.prepare(
          `INSERT INTO returns (date, production_id, product_name, remainder_count, return_weight, material_name, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          body.date,
          newId,
          body.product_name,
          body.remainder_count || 0,
          body.remainder_weight,
          body.material_name,
          'ثبت خودکار از تولید'
        ).run();
      }

      return json({ id: newId, ok: true }, 201);
    }

    if (request.method === 'PUT' && id) {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      const body = await request.json();
      delete body.id;
      if (body.password) {
        body.password_hash = await hashPassword(body.password);
        delete body.password;
      }
      const keys = Object.keys(body).filter((k) => body[k] !== undefined);
      if (!keys.length) return json({ error: 'empty' }, 400);
      const sets = keys.map((k) => `${k} = ?`).join(', ');
      await env.DB.prepare(`UPDATE ${store} SET ${sets} WHERE id = ?`).bind(...keys.map((k) => body[k]), id).run();

      if (store === 'productions') {
        await env.DB.prepare('DELETE FROM returns WHERE production_id = ?').bind(id).run();
        if (body.remainder_type === 'برگشت به مواد' && Number(body.remainder_weight || 0) > 0) {
          await env.DB.prepare(
            `INSERT INTO returns (date, production_id, product_name, remainder_count, return_weight, material_name, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            body.date,
            id,
            body.product_name,
            body.remainder_count || 0,
            body.remainder_weight,
            body.material_name,
            'ثبت خودکار از تولید'
          ).run();
        }
      }
      return json({ ok: true });
    }

    if (request.method === 'DELETE' && id) {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      await env.DB.prepare(`DELETE FROM ${store} WHERE id = ?`).bind(id).run();
      if (store === 'productions') {
        await env.DB.prepare('DELETE FROM returns WHERE production_id = ?').bind(id).run();
      }
      return json({ ok: true });
    }

    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: e.message || String(e) }, 500);
  }
}


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API routes
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // Static files from [assets]
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('ASSETS binding missing', { status: 500 });
  },
};
