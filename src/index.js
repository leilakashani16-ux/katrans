/**
 * Cloudflare Worker + Static Assets + D1
 * wrangler.toml → [assets] directory = "./public"
 */
/**
 * Cloudflare Pages Function — /api/*
 * Requires D1 binding named "DB"
 */

const STORES = new Set(['users', 'personnel', 'materials', 'products', 'entries', 'wastes', 'productions', 'returns', 'daily_plans', 'staff_scores', 'suppliers']);

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


async function ensureColumn(db, table, column, typeSql) {
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`).run();
  } catch (e) {
    // column already exists
  }
}

function actorLabel(user) {
  if (!user) return '';
  return String(user.full_name || user.username || '').trim();
}


async function bumpDataVersion(db) {
  try {
    await db.prepare(
      "UPDATE app_meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'data_version'"
    ).run();
  } catch (e) {}
}

async function isDayLocked(db, day) {
  if (!day) return false;
  const row = await db.prepare('SELECT id FROM day_locks WHERE day = ?').bind(String(day)).first();
  return !!row;
}

// Schema bootstrap — once per Worker isolate (huge win on D1)
let __schemaReady = false;
let __schemaPromise = null;

async function ensureSchema(db) {
  if (__schemaReady) return;
  if (__schemaPromise) return __schemaPromise;
  __schemaPromise = _ensureSchemaOnce(db).then(() => {
    __schemaReady = true;
    __schemaPromise = null;
  }).catch(e => {
    __schemaPromise = null;
    throw e;
  });
  return __schemaPromise;
}

async function _ensureSchemaOnce(db) {
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
    db.prepare(`CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1
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

  // Seed Excel Mehr 1405 entries + productions if empty (restores original data)
  const ec = await db.prepare('SELECT COUNT(*) as c FROM entries').first();
  if (!ec || ec.c === 0) {
    await db.batch([
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/15','سینه مرغ',49.0,'زربال','F-1403-101','ورود صبح'),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/15','ران مرغ',200.0,'زربال','F-1403-101',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/15','سینه فسنجان',10.0,'زربال','F-1403-102',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/15','سینه سالاد',3.0,'زربال','F-1403-103',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/15','گوشت نخودی',52.0,'شیخی','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/16','ماهی',10.0,'مقدم','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/16','گوشت خورشتی',30.0,'شیخی','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/16','سینه فسنجان',6.4,'مرادی','','جهت غذای پرسنل داده شد جایگزین مرغ فسنجان گردید'),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/17','سینه مرغ',53.7,'زربال','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/17','سینه فسنجان',4.0,'','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/18','سینه مرغ',57.3,'','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/18','سینه سالاد',3.0,'','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/19','ران مرغ',200.0,'','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/19','سینه مرغ',48.5,'','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/19','سینه فسنجان',10.0,'','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/20','گوشت نخودی',52.0,'','',''),
db.prepare('INSERT INTO entries (date,material_name,quantity,supplier,invoice_no,notes) VALUES (?,?,?,?,?,?)').bind('1405/07/20','گوشت خورشتی',32.0,'','','')
    ]);
  }
  const pc = await db.prepare('SELECT COUNT(*) as c FROM productions').first();
  if (!pc || pc.c === 0) {
    await db.batch([
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/14','گوشت خورشت قورمه',12.0,12.0,'گوشت خورشتی','','','',null,'میثم خواجه',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','جوجه معمولی 170 گرمی',50.0,8.5,'سینه مرغ','s2','10:45:00','12:30:00',105.00000000000003,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','جوجه ممتاز ۲۰۰ گرمی',50.0,10.0,'سینه مرغ','s2','10:45:00','12:30:00',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','کوبیده اکو 100گرمی',28.0,2.1,'گوشت نخودی','s1','08:00:00','10:30:00',150.00000000000003,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','لقمه معمولی 120گرمی',35.0,3.15,'گوشت نخودی','s1','08:00:00','10:30:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','لقمه مجلسی 150گرمی',22.0,2.486,'گوشت نخودی','s1','08:00:00','10:30:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','ران مرغ زرشک',50.0,50.0,'ران مرغ','','08:30:00','11:00:00',149.99999999999994,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','کوبیده اکو 100گرمی',18.0,1.35,'گوشت نخودی','s3','17:00:00','18:15:00',74.99999999999989,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','لقمه مجلسی 150گرمی',41.0,4.633,'گوشت نخودی','s3','17:00:00','18:15:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','لقمه معمولی 120گرمی',14.0,1.26,'گوشت نخودی','s3','17:00:00','18:15:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','جوجه معمولی 170 گرمی',27.0,4.59,'سینه مرغ','e1','18:00:00','18:25:00',25.00000000000007,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','جوجه ممتاز ۲۰۰ گرمی',1.0,0.2,'سینه مرغ','e1','18:00:00','18:25:00',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','مرغ خورشت فسنجان',6.0,6.0,'سینه فسنجان','','','',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','گوشت خورشت قیمه',4.0,4.0,'گوشت خورشتی','','','',null,'مصطفی خوشگفتار',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','کوبیده اکو 100گرمی',48.0,3.6,'گوشت نخودی','','','',null,'مهدی عصمتی',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','لقمه معمولی 120گرمی',28.0,2.52,'گوشت نخودی','','','',null,'مهدی عصمتی',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','ماهی قزل',5.0,5.0,'ماهی','','','',null,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/15','لقمه مجلسی 150گرمی',3.0,0.339,'گوشت نخودی','','','',null,'مهدی عصمتی',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','ران مرغ زرشک',40.0,40.0,'ران مرغ','','','',null,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','کوبیده اکو 100گرمی',33.0,2.475,'گوشت نخودی','s4','08:00:00','10:10:00',130.00000000000003,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','لقمه معمولی 120گرمی',33.0,2.97,'گوشت نخودی','s4','08:00:00','10:10:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','لقمه مجلسی 150گرمی',23.0,2.599,'گوشت نخودی','s4','08:00:00','10:10:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','جوجه ممتاز ۲۰۰ گرمی',40.0,8.0,'سینه مرغ','','10:45:00','11:30:00',45.0,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','گوشت خورشت قیمه',12.0,12.0,'گوشت خورشتی','','10:45:00','11:30:00',45.0,'میثم خواجه',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','گوشت پخته خورشتی',2.5,2.5,'گوشت خورشتی','','11:45:00','12:30:00',45.00000000000008,'مصطفی خوشگفتار',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','جوجه معمولی 170 گرمی',82.0,13.94,'سینه مرغ','e2','13:00:00','14:30:00',90.0,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','جوجه ممتاز ۲۰۰ گرمی',39.0,7.8,'سینه مرغ','e2','13:00:00','14:30:00',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','مرغ سالاد ماکارونی',1.0,1.5,'سینه سالاد','','','',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','ماهی قزل',4.0,4.0,'ماهی','','','',null,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','لقمه معمولی 120گرمی',10.0,0.9,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/16','کوبیده اکو 100گرمی',14.0,1.05,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','کوبیده اکو 100گرمی',25.0,1.875,'گوشت نخودی','s5','08:00:00','10:35:00',155.00000000000009,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','لقمه مجلسی 150گرمی',22.0,2.486,'گوشت نخودی','s5','08:00:00','10:35:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','لقمه معمولی 120گرمی',30.0,2.7,'گوشت نخودی','s5','08:00:00','10:35:00',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','ران مرغ زرشک',40.0,40.0,'ران مرغ','','08:30:00','11:44:00',193.99999999999994,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','ران مرغ زرشک',10.0,10.0,'ران مرغ','','15:05:00','17:06:00',121.00000000000006,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','جوجه معمولی 170 گرمی',43.0,7.31,'سینه مرغ','','','',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','جوجه ممتاز ۲۰۰ گرمی',40.0,8.0,'سینه مرغ','','','',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','جوجه مجلسی ۲۸۰ گرمی',6.0,1.68,'سینه مرغ','','','',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','گوشت خورشت قیمه',4.0,4.0,'گوشت خورشتی','','','',null,'مصطفی خوشگفتار',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/17','مرغ خورشت فسنجان',4.0,4.0,'سینه فسنجان','','','',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/18','کوبیده اکو 100گرمی',37.0,2.775,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/18','لقمه معمولی 120گرمی',40.0,3.6,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/18','لقمه مجلسی 150گرمی',20.0,2.26,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/18','ران مرغ زرشک',97.0,97.0,'ران مرغ','','','',null,'میثم خواجه',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/18','ران مرغ زرشک',12.0,12.0,'ران مرغ','','','',null,'مصطفی خوشگفتار',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/18','جوجه معمولی 170 گرمی',109.0,18.53,'سینه مرغ','','','',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','ران مرغ زرشک',36.0,36.0,'ران مرغ','','','',null,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','کوبیده اکو 100گرمی',56.0,4.2,'گوشت نخودی','','','',null,'راجا کشمیری',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','لقمه معمولی 120گرمی',85.0,7.65,'گوشت نخودی','','','',null,'راجا کشمیری',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','لقمه مجلسی 150گرمی',10.0,1.13,'گوشت نخودی','','','',null,'راجا کشمیری',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','مرغ خورشت فسنجان',6.0,6.0,'سینه فسنجان','','','',null,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','لقمه مجلسی 150گرمی',4.0,0.452,'گوشت نخودی','','','',null,'شهرام ابوالفتحی',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','لقمه مجلسی 150گرمی',13.0,1.469,'گوشت نخودی','','','',null,'مهدی عصمتی',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','جوجه معمولی 170 گرمی',100.0,17.0,'سینه مرغ','','','',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','جوجه ممتاز ۲۰۰ گرمی',63.0,12.6,'سینه مرغ','','','',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','جوجه مجلسی ۲۸۰ گرمی',10.0,2.8,'سینه مرغ','','','',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','ران مرغ زرشک',10.0,10.0,'ران مرغ','','','',null,'مهدی عصمتی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','گوشت خورشت قیمه',8.0,8.0,'گوشت خورشتی','','','',null,'میثم خواجه',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','گوشت پخته خورشتی',2.0,2.0,'گوشت خورشتی','','','',null,'مصطفی خوشگفتار',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/19','مرغ سالاد ماکارونی',1.0,1.5,'سینه سالاد','','','',null,'مریم یزدانی',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','کوبیده اکو 100گرمی',25.0,1.875,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','لقمه معمولی 120گرمی',60.0,5.4,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','لقمه مجلسی 150گرمی',22.0,2.486,'گوشت نخودی','','','',null,'صفرملک زاده',0,0,'برگشت به مواد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','جوجه معمولی 170 گرمی',23.0,3.91,'سینه مرغ','','','',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','جوجه ممتاز ۲۰۰ گرمی',48.0,9.6,'سینه مرغ','','','',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','جوجه مجلسی ۲۸۰ گرمی',6.0,1.68,'سینه مرغ','','','',null,'صفرملک زاده',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','ران مرغ زرشک',36.0,36.0,'ران مرغ','','','',null,'راجا کشمیری',0,0,'حمل به روز بعد',''),
db.prepare('INSERT INTO productions (date,product_name,quantity,material_weight,material_name,shift_code,start_time,end_time,duration_minutes,producer_name,remainder_count,remainder_weight,remainder_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('1405/07/20','گوشت خورشت قورمه',8.0,8.0,'گوشت خورشتی','','','',null,'میثم خواجه',0,0,'حمل به روز بعد','')
    ]);
  }
  // مواد/پرسنل تکمیلی از اکسل — فقط اگر کد موجود نباشد (داده قبلی پاک نمی‌شود)
  const extraMats = [
    ['M009', 'برنج هاشمی', 'کیلوگرم', 70, 20, ''],
    ['M010', 'برنج ندا', 'کیلوگرم', 77, 20, ''],
  ];
  for (const m of extraMats) {
    const ex = await db.prepare('SELECT id FROM materials WHERE code = ?').bind(m[0]).first();
    if (!ex) {
      await db.prepare(
        'INSERT INTO materials (code,name,unit,initial_stock,min_alert,description,active) VALUES (?,?,?,?,?,?,1)'
      ).bind(m[0], m[1], m[2], m[3], m[4], m[5]).run();
    }
  }
  const extraStaff = [
    ['S012', 'علی زبانگیر', 'کارگر', 1],
  ];
  for (const s of extraStaff) {
    const ex = await db.prepare('SELECT id FROM personnel WHERE code = ?').bind(s[0]).first();
    if (!ex) {
      await db.prepare('INSERT INTO personnel (code,name,position,active) VALUES (?,?,?,?)').bind(s[0], s[1], s[2], s[3]).run();
    }
  }



  await db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    store_name TEXT NOT NULL,
    record_id INTEGER,
    username TEXT,
    full_name TEXT,
    summary TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();

  for (const t of ['entries', 'wastes', 'productions', 'returns']) {
    await ensureColumn(db, t, 'created_by', 'TEXT');
    await ensureColumn(db, t, 'updated_by', 'TEXT');
    await ensureColumn(db, t, 'deleted_at', 'TEXT');
  }
  for (const t of ['materials', 'products', 'personnel', 'suppliers']) {
    await ensureColumn(db, t, 'deleted_at', 'TEXT');
  }
  // optional secondary unit for materials (display only, does not affect stock calc)
  await ensureColumn(db, 'materials', 'secondary_unit', 'TEXT');
  await ensureColumn(db, 'materials', 'unit_factor', 'REAL');




  
  // Seed default suppliers (طرف حساب) if empty
  try {
    const sc = await db.prepare('SELECT COUNT(*) as c FROM suppliers').first();
    if (!sc || sc.c === 0) {
      await db.batch([
        db.prepare("INSERT INTO suppliers (code,name,phone,notes,active) VALUES ('S-001','زربال','','تامین مرغ',1)"),
        db.prepare("INSERT INTO suppliers (code,name,phone,notes,active) VALUES ('S-002','شیخی','','گوشت',1)"),
        db.prepare("INSERT INTO suppliers (code,name,phone,notes,active) VALUES ('S-003','مقدم','','ماهی و متفرقه',1)"),
        db.prepare("INSERT INTO suppliers (code,name,phone,notes,active) VALUES ('S-004','مرادی','','',1)"),
      ]);
    }
  } catch (e) {}

  await db.prepare(`CREATE TABLE IF NOT EXISTS staff_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    personnel_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    note TEXT,
    scored_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS daily_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    product_name TEXT NOT NULL,
    target_qty REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS day_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT UNIQUE NOT NULL,
    locked_by TEXT,
    locked_at TEXT DEFAULT (datetime('now')),
    note TEXT
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`).run();

  try {
    const v = await db.prepare("SELECT value FROM app_meta WHERE key = 'data_version'").first();
    if (!v) {
      await db.prepare("INSERT INTO app_meta (key, value) VALUES ('data_version', '1')").run();
    }
  } catch (e) {}

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

    // بازیابی رمز ادمین — یک‌بار بعد از deploy استفاده شود
    // POST /api/reset-admin  body: {"secret":"ansar-reset-1405","password":"admin123"}
    if (path === 'reset-admin' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (body.secret !== 'ansar-reset-1405') {
        return json({ error: 'forbidden' }, 403);
      }
      const newPass = String(body.password || 'admin123');
      const h = await hashPassword(newPass);
      const row = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind('admin').first();
      if (row) {
        await env.DB.prepare('UPDATE users SET password_hash = ?, active = 1 WHERE username = ?').bind(h, 'admin').run();
      } else {
        await env.DB.prepare(
          'INSERT INTO users (username, password_hash, role, full_name, active) VALUES (?, ?, ?, ?, 1)'
        ).bind('admin', h, 'admin', 'مدیر سیستم').run();
      }
      // اطمینان از کاربران پیش‌فرض entry/production
      for (const u of [
        ['entry', 'entry123', 'entry', 'ثبت‌کننده ورود'],
        ['production', 'prod123', 'production', 'ثبت‌کننده تولید'],
      ]) {
        const exists = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(u[0]).first();
        if (!exists) {
          const ph = await hashPassword(u[1]);
          await env.DB.prepare(
            'INSERT INTO users (username, password_hash, role, full_name, active) VALUES (?, ?, ?, ?, 1)'
          ).bind(u[0], ph, u[2], u[3]).run();
        }
      }
      return json({ ok: true, msg: 'رمز admin بازنشانی شد', password: newPass });
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
      const soft = (t) => {
        try {
          return env.DB.prepare(`SELECT * FROM ${t} WHERE deleted_at IS NULL OR deleted_at = ''`).all();
        } catch {
          return env.DB.prepare(`SELECT * FROM ${t}`).all();
        }
      };
      const materials = (await soft('materials')).results || [];
      const entries = (await soft('entries')).results || [];
      const productions = (await soft('productions')).results || [];
      const wastes = (await soft('wastes')).results || [];
      const returns = (await soft('returns')).results || [];
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


    if (path === 'version' && request.method === 'GET') {
      const row = await env.DB.prepare("SELECT value FROM app_meta WHERE key = 'data_version'").first();
      return json({ version: Number(row?.value || 1), ts: new Date().toISOString() });
    }

    if (path === 'day-locks' && request.method === 'GET') {
      if (!user) return json({ error: 'auth required' }, 401);
      const rows = (await env.DB.prepare('SELECT * FROM day_locks ORDER BY day DESC LIMIT 90').all()).results || [];
      return json(rows);
    }

    if (path === 'day-lock' && request.method === 'POST') {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      const body = await request.json().catch(() => ({}));
      const day = String(body.day || '').trim();
      if (!day) return json({ error: 'day required' }, 400);
      try {
        await env.DB.prepare(
          'INSERT INTO day_locks (day, locked_by, note) VALUES (?, ?, ?)'
        ).bind(day, actorLabel(user), body.note || null).run();
      } catch (e) {
        if (String(e.message || e).includes('UNIQUE')) {
          return json({ ok: true, msg: 'قبلاً قفل شده' });
        }
        throw e;
      }
      await bumpDataVersion(env.DB);
      return json({ ok: true, msg: 'روز قفل شد' });
    }

    if (path === 'day-lock' && request.method === 'DELETE') {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      const body = await request.json().catch(() => ({}));
      const day = String(body.day || url.searchParams.get('day') || '').trim();
      if (!day) return json({ error: 'day required' }, 400);
      await env.DB.prepare('DELETE FROM day_locks WHERE day = ?').bind(day).run();
      await bumpDataVersion(env.DB);
      return json({ ok: true, msg: 'قفل روز باز شد' });
    }


    if (path === 'audit' && request.method === 'GET') {
      if (!user || user.role !== 'admin') return json({ error: 'forbidden' }, 403);
      const rows = (await env.DB.prepare(
        'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500'
      ).all()).results || [];
      return json(rows);
    }

    // System settings (stored in app_meta as JSON under key "settings")
    if (path === 'settings' && request.method === 'GET') {
      if (!user) return json({ error: 'auth required' }, 401);
      try {
        const row = await env.DB.prepare("SELECT value FROM app_meta WHERE key = 'settings'").first();
        const defaults = {
          company_name: 'غذای انصار',
          default_min_alert: 5,
          alert_enabled: true,
          backup_hint: true,
        };
        if (!row || !row.value) return json(defaults);
        return json({ ...defaults, ...JSON.parse(row.value) });
      } catch (e) {
        return json({ company_name: 'غذای انصار', default_min_alert: 5, alert_enabled: true });
      }
    }

    if (path === 'settings' && request.method === 'PUT') {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      const body = await request.json().catch(() => ({}));
      const safe = {
        company_name: String(body.company_name || 'غذای انصار').slice(0, 80),
        default_min_alert: Number(body.default_min_alert) || 5,
        alert_enabled: body.alert_enabled !== false,
        backup_hint: body.backup_hint !== false,
      };
      await env.DB.prepare(
        "INSERT INTO app_meta (key, value) VALUES ('settings', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).bind(JSON.stringify(safe)).run();
      return json({ ok: true, settings: safe });
    }

    // Restore soft-deleted record
    if (path === 'restore' && request.method === 'POST') {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      const body = await request.json().catch(() => ({}));
      const st = String(body.store || '');
      const rid = Number(body.id);
      const allowed = new Set(['entries', 'wastes', 'productions', 'returns', 'materials', 'products', 'personnel', 'suppliers']);
      if (!allowed.has(st) || !rid) return json({ error: 'invalid' }, 400);
      try {
        await env.DB.prepare(`UPDATE ${st} SET deleted_at = NULL WHERE id = ?`).bind(rid).run();
        await bumpDataVersion(env.DB);
        return json({ ok: true, msg: 'بازیابی شد' });
      } catch (e) {
        return json({ error: e.message || 'خطا' }, 500);
      }
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
      // soft-delete: hide deleted rows by default (except audit/users)
      const softStores = new Set(['entries', 'wastes', 'productions', 'returns', 'materials', 'products', 'personnel', 'suppliers']);
      let rows;
      if (softStores.has(store)) {
        try {
          rows = (await env.DB.prepare(
            `SELECT * FROM ${store} WHERE deleted_at IS NULL OR deleted_at = '' ORDER BY id DESC`
          ).all()).results || [];
        } catch (e) {
          // column may not exist yet on very old DB
          rows = (await env.DB.prepare(`SELECT * FROM ${store} ORDER BY id DESC`).all()).results || [];
        }
      } else {
        rows = (await env.DB.prepare(`SELECT * FROM ${store} ORDER BY id DESC`).all()).results || [];
      }
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
      if (['materials', 'products', 'personnel', 'daily_plans', 'staff_scores'].includes(store) && user.role !== 'admin') {
        return json({ error: 'admin only' }, 403);
      }

      const body = await request.json();
      delete body.id;
      delete body.password_hash; // never accept raw hash from client on create except via password

      if (store === 'users' && body.password) {
        body.password_hash = await hashPassword(body.password);
        delete body.password;
      } else if (store === 'users') {
        delete body.password;
      }

      // normalize booleans / active for D1 INTEGER columns
      if ('active' in body) body.active = body.active === false || body.active === 0 || body.active === '0' ? 0 : 1;
      // strip empty strings for optional numeric fields that break SQLite
      for (const k of Object.keys(body)) {
        if (body[k] === '') body[k] = null;
      }

      // ثبت‌کننده: از توکن احراز هویت (کلاینت نمی‌تواند جعل کند)
      if (['entries', 'wastes', 'productions', 'returns'].includes(store)) {
        const who = actorLabel(user);
        body.created_by = who;
        body.updated_by = who;
        if (!body.created_at) body.created_at = new Date().toISOString();
      }

      
      // قفل روز
      if (['entries', 'wastes', 'productions', 'returns'].includes(store) && body.date) {
        if (await isDayLocked(env.DB, body.date)) {
          return json({ error: 'این تاریخ قفل شده و قابل ثبت نیست', code: 'DAY_LOCKED' }, 423);
        }
      }

      // کنترل موجودی برای تولید (غیر از admin با force=1)
      if (store === 'productions' && body.material_name && body.material_weight != null) {
        const force = body.force === true || body.force === 1 || body.force === '1';
        delete body.force;
        if (!force || user.role !== 'admin') {
          try {
            const mats = (await env.DB.prepare('SELECT * FROM materials WHERE active = 1 OR active IS NULL').all()).results || [];
            const m = mats.find((x) => x.name === body.material_name);
            if (m) {
              const entries = (await env.DB.prepare('SELECT * FROM entries').all()).results || [];
              const productions = (await env.DB.prepare('SELECT * FROM productions').all()).results || [];
              const wastes = (await env.DB.prepare('SELECT * FROM wastes').all()).results || [];
              const returns = (await env.DB.prepare('SELECT * FROM returns').all()).results || [];
              const totalIn = entries.filter((e) => e.material_name === m.name).reduce((s, e) => s + Number(e.quantity || 0), 0);
              const totalOut = productions.filter((p) => p.material_name === m.name).reduce((s, p) => s + Number(p.material_weight || 0), 0);
              const totalWaste = wastes.filter((w) => w.material_name === m.name).reduce((s, w) => s + Number(w.quantity || 0), 0);
              const totalReturn = returns.filter((r) => r.material_name === m.name).reduce((s, r) => s + Number(r.return_weight || 0), 0);
              const current = Number(m.initial_stock || 0) + totalIn - totalOut - totalWaste + totalReturn;
              const need = Number(body.material_weight || 0);
              if (need > current + 0.0001) {
                return json({
                  error: `موجودی «${m.name}» کافی نیست. موجودی: ${Math.round(current * 100) / 100} — درخواست: ${need}`,
                  code: 'INSUFFICIENT_STOCK',
                  current_stock: Math.round(current * 100) / 100,
                }, 409);
              }
            }
          } catch (e) {
            console.error('stock check', e);
          }
        }
      }

const keys = Object.keys(body).filter((k) => body[k] !== undefined);
      if (!keys.length) return json({ error: 'empty body' }, 400);
      const placeholders = keys.map(() => '?').join(',');
      const sql = `INSERT INTO ${store} (${keys.join(',')}) VALUES (${placeholders})`;
      let result;
      try {
        result = await env.DB.prepare(sql).bind(...keys.map((k) => body[k])).run();
      } catch (err) {
        const msg = String(err.message || err);
        if (msg.includes('UNIQUE')) return json({ error: 'کد یا نام تکراری است — مقدار دیگری انتخاب کنید' }, 409);
        throw err;
      }
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

      await bumpDataVersion(env.DB);
      return json({ id: newId, ok: true }, 201);
    }

    if (request.method === 'PUT' && id) {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      const body = await request.json();
      delete body.id;
      if (body.password) {
        body.password_hash = await hashPassword(body.password);
        delete body.password;
      } else {
        delete body.password;
        delete body.password_hash;
      }
      if ('active' in body) body.active = body.active === false || body.active === 0 || body.active === '0' ? 0 : 1;
      for (const k of Object.keys(body)) {
        if (body[k] === '') body[k] = null;
      }
      if (['entries', 'wastes', 'productions', 'returns'].includes(store)) {
        body.updated_by = actorLabel(user);
        delete body.created_by; // تغییر ثبت‌کننده اولیه مجاز نیست
      }

      if (['entries', 'wastes', 'productions', 'returns'].includes(store)) {
        const existing = await env.DB.prepare(`SELECT * FROM ${store} WHERE id = ?`).bind(id).first();
        if (existing && existing.date && await isDayLocked(env.DB, existing.date)) {
          return json({ error: 'این تاریخ قفل شده و قابل ویرایش نیست', code: 'DAY_LOCKED' }, 423);
        }
        if (body.date && await isDayLocked(env.DB, body.date)) {
          return json({ error: 'تاریخ مقصد قفل است', code: 'DAY_LOCKED' }, 423);
        }
      }

      const keys = Object.keys(body).filter((k) => body[k] !== undefined);
      if (!keys.length) return json({ error: 'empty' }, 400);
      const sets = keys.map((k) => `${k} = ?`).join(', ');
      try {
        await env.DB.prepare(`UPDATE ${store} SET ${sets} WHERE id = ?`).bind(...keys.map((k) => body[k]), id).run();
      } catch (err) {
        const msg = String(err.message || err);
        if (msg.includes('UNIQUE')) return json({ error: 'کد یا نام تکراری است' }, 409);
        throw err;
      }

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
      await bumpDataVersion(env.DB);
      return json({ ok: true });
    }

    if (request.method === 'DELETE' && id) {
      if (!user || user.role !== 'admin') return json({ error: 'admin only' }, 403);
      const row = await env.DB.prepare(`SELECT * FROM ${store} WHERE id = ?`).bind(id).first();
      if (row && row.date && await isDayLocked(env.DB, row.date)) {
        return json({ error: 'حذف روی تاریخ قفل‌شده مجاز نیست', code: 'DAY_LOCKED' }, 423);
      }
      let summary = store + ' #' + id;
      if (row) {
        summary = [row.date, row.material_name || row.product_name || row.name || row.username, row.quantity || row.material_weight]
          .filter((x) => x != null && x !== '')
          .join(' | ');
      }
      try {
        await env.DB.prepare(
          `INSERT INTO audit_logs (action, store_name, record_id, username, full_name, summary, detail)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          'delete',
          store,
          id,
          user.username || '',
          user.full_name || '',
          summary,
          row ? JSON.stringify(row) : null
        ).run();
      } catch (e) {
        console.error('audit log failed', e);
      }
      // soft delete when column exists; hard delete for users / fallback
      const softStores = new Set(['entries', 'wastes', 'productions', 'returns', 'materials', 'products', 'personnel', 'suppliers']);
      if (softStores.has(store)) {
        try {
          await env.DB.prepare(
            `UPDATE ${store} SET deleted_at = datetime('now') WHERE id = ?`
          ).bind(id).run();
          if (store === 'productions') {
            try {
              await env.DB.prepare(
                `UPDATE returns SET deleted_at = datetime('now') WHERE production_id = ?`
              ).bind(id).run();
            } catch (_) { /* column may not exist */ }
          }
        } catch (e) {
          // fallback hard delete if column missing
          await env.DB.prepare(`DELETE FROM ${store} WHERE id = ?`).bind(id).run();
          if (store === 'productions') {
            await env.DB.prepare('DELETE FROM returns WHERE production_id = ?').bind(id).run();
          }
        }
      } else {
        await env.DB.prepare(`DELETE FROM ${store} WHERE id = ?`).bind(id).run();
      }
      await bumpDataVersion(env.DB);
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
