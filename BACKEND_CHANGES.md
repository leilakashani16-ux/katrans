# تغییرات بک‌اند برای نیمه‌محصول + قیمت + فرآوری

## ۱. اضافه کردن به STORES
```js
const STORES = new Set([..., 'processings']);
```

## ۲. در _ensureSchemaOnce بعد از ساخت جداول اصلی:

```js
await ensureColumn(db, 'materials', 'material_type', "TEXT DEFAULT 'raw'");
await ensureColumn(db, 'materials', 'parent_material', 'TEXT');
await ensureColumn(db, 'materials', 'last_buy_price', 'REAL');
await ensureColumn(db, 'materials', 'last_buy_date', 'TEXT');

await ensureColumn(db, 'entries', 'unit_price', 'REAL');
await ensureColumn(db, 'entries', 'total_price', 'REAL');

await db.prepare(`CREATE TABLE IF NOT EXISTS processings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  source_material TEXT NOT NULL,
  source_qty REAL NOT NULL,
  target_material TEXT NOT NULL,
  target_qty REAL NOT NULL,
  waste_qty REAL DEFAULT 0,
  waste_note TEXT,
  producer_name TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
)`).run();
```

## ۳. بعد از POST entries — آپدیت last_buy_price
وقتی store === 'entries' و body.unit_price موجود است:
```js
if (store === 'entries' && body.unit_price != null && body.material_name) {
  const price = Number(body.unit_price);
  if (price > 0) {
    await env.DB.prepare(
      `UPDATE materials SET last_buy_price = ?, last_buy_date = ? WHERE name = ?`
    ).bind(price, body.date || null, body.material_name).run();
    if (body.quantity != null) {
      body.total_price = price * Number(body.quantity);
    }
  }
}
```

## ۴. محاسبه موجودی (stock) — اضافه کردن processings
در مسیر GET /api/stock:

```js
let processings = [];
try {
  processings = (await env.DB.prepare(
    `SELECT * FROM processings WHERE deleted_at IS NULL OR deleted_at = ''`
  ).all()).results || [];
} catch (e) { processings = []; }

// برای هر ماده:
// totalIn += entries + processings که target_material == name (target_qty)
// totalOut += productions + wastes + processings که source_material == name (source_qty)
```

## ۵. نقش دسترسی
processings مثل productions: admin یا production می‌توانند ثبت کنند.
materials با material_type فقط admin.

## ۶. فرانت
- اسکریپت processing.js بعد از pages.js لود شود
- در NAV ادمین و production آیتم «فرآوری» اضافه شود: { id: 'processings', label: 'فرآوری', icon: '🔄' }
