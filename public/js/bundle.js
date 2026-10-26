/**
 * IndexedDB wrapper + seed data for Kitchen Inventory System
 */
const DB_NAME = 'kitchen_inventory_v1';
const DB_VERSION = 4;

let db = null;

const STORES = ['users', 'personnel', 'materials', 'products', 'entries', 'wastes', 'productions', 'returns', 'settings', 'daily_plans', 'staff_scores', 'suppliers', 'daily_staff_menu', 'attendance_meals', 'general_items', 'branch_transfers', 'branch_transfer_items', 'stocktakes', 'stocktake_lines', 'recipes', 'recipe_items', 'production_consumptions'];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      STORES.forEach(name => {
        if (!database.objectStoreNames.contains(name)) {
          const store = database.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
          if (name === 'users') store.createIndex('username', 'username', { unique: true });
          if (name === 'materials') store.createIndex('code', 'code', { unique: true });
          if (name === 'products') store.createIndex('code', 'code', { unique: true });
          if (name === 'personnel') store.createIndex('code', 'code', { unique: true });
          if (['entries', 'productions', 'wastes'].includes(name)) store.createIndex('date', 'date');
        }
      });
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

async function getAll(store) {
  return new Promise((res, rej) => {
    const r = tx(store).getAll();
    r.onsuccess = () => {
      const soft = ['entries', 'wastes', 'productions', 'returns', 'materials', 'products', 'personnel', 'suppliers', 'branch_transfers', 'stocktakes', 'general_items'];
      let rows = r.result || [];
      if (soft.includes(store)) {
        rows = rows.filter(x => !x.deleted_at);
      }
      res(rows);
    };
    r.onerror = () => rej(r.error);
  });
}

async function getById(store, id) {
  return new Promise((res, rej) => {
    const r = tx(store).get(id);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function add(store, item) {
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').add(item);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function put(store, item) {
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').put(item);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function remove(store, id) {
  // soft delete for main data stores; hard delete for users/settings
  const soft = ['entries', 'wastes', 'productions', 'returns', 'materials', 'products', 'personnel', 'suppliers', 'branch_transfers', 'stocktakes', 'general_items'];
  if (soft.includes(store)) {
    return new Promise(async (res, rej) => {
      try {
        const item = await getById(store, id);
        if (!item) return res();
        item.deleted_at = new Date().toISOString();
        const r = tx(store, 'readwrite').put(item);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

async function clearStore(store) {
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').clear();
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

// ---------- Seed data from Excel ----------
const SEED = {
  users: [
    { username: 'admin', password: 'admin123', role: 'admin', full_name: 'مدیر سیستم', active: true },
    { username: 'entry', password: 'entry123', role: 'entry', full_name: 'ثبت‌کننده ورود', active: true },
    { username: 'production', password: 'prod123', role: 'production', full_name: 'ثبت‌کننده تولید', active: true }
  ],
  personnel: [
    { code: 'S001', name: 'راجا کشمیری', position: 'سوشف', active: true },
    { code: 'S002', name: 'میثم خواجه', position: 'سرآشپز', active: true },
    { code: 'S003', name: 'مصطفی خوشگفتار', position: 'آشپز', active: true },
    { code: 'S004', name: 'مهدی عصمتی', position: 'آشپز', active: true },
    { code: 'S005', name: 'صفرملک زاده', position: 'تخته کاروکبابپز', active: true },
    { code: 'S006', name: 'مهدی یوسفی', position: 'آشپز', active: true },
    { code: 'S007', name: 'عباس مقدسی', position: 'کمک آشپز', active: true },
    { code: 'S008', name: 'سیدمحمود میرنظیر', position: 'کارگر', active: true },
    { code: 'S009', name: 'شهرام ابوالفتحی', position: 'مدیر داخلی', active: true },
    { code: 'S010', name: 'مریم یزدانی', position: 'سالادزن', active: true },
    { code: 'S011', name: 'اکبر رضاییان', position: 'انبار دار', active: true }
  ],
  materials: [
    { code: 'M001', name: 'سینه مرغ', unit: 'کیلوگرم', initial_stock: 23.5, min_alert: 10, description: 'ماده اصلی جوجه سیخ', active: true },
    { code: 'M002', name: 'ران مرغ', unit: 'عدد', initial_stock: 125, min_alert: 50, description: '', active: true },
    { code: 'M003', name: 'گوشت نخودی', unit: 'کیلوگرم', initial_stock: 69, min_alert: 50, description: 'برای کباب و سیخ گوشت', active: true },
    { code: 'M004', name: 'گوشت خورشتی', unit: 'کیلوگرم', initial_stock: 30.5, min_alert: 10, description: '', active: true },
    { code: 'M005', name: 'ماهی', unit: 'عدد', initial_stock: 11, min_alert: 4, description: '', active: true },
    { code: 'M006', name: 'سینه فسنجان', unit: 'کیلوگرم', initial_stock: 0, min_alert: 5, description: 'ازسینه ورودی خام جدا میشود', active: true },
    { code: 'M007', name: 'سینه سالاد', unit: 'کیلوگرم', initial_stock: 0, min_alert: 1.5, description: 'ازسینه ورودی خام جدا میشود', active: true },
    { code: 'M008', name: 'مایه لوبیا پلو', unit: 'کیلوگرم', initial_stock: 0, min_alert: 5, description: 'مایه آماده لوبیاپلو مصرف روزانه', active: true }
  ],
  products: [
    { code: 'P001', name: 'جوجه معمولی 170 گرمی', weight_per_unit: 170, material_name: 'سینه مرغ', description: '', remainder_type: 'حمل به روز بعد', remainder_note: 'باقیمانده به عنوان محصول نهایی می‌ماند', active: true },
    { code: 'P002', name: 'جوجه ممتاز ۲۰۰ گرمی', weight_per_unit: 200, material_name: 'سینه مرغ', description: '', remainder_type: 'حمل به روز بعد', remainder_note: 'باقیمانده به عنوان محصول نهایی می‌ماند', active: true },
    { code: 'P003', name: 'جوجه مجلسی ۲۸۰ گرمی', weight_per_unit: 280, material_name: 'سینه مرغ', description: '', remainder_type: 'حمل به روز بعد', remainder_note: 'باقیمانده به عنوان محصول نهایی می‌ماند', active: true },
    { code: 'P004', name: 'کوبیده اکو 100گرمی', weight_per_unit: 75, material_name: 'گوشت نخودی', description: '', remainder_type: 'برگشت به مواد', remainder_note: 'باقیمانده از سیخ کشیده و به مایه برمی‌گردد', active: true },
    { code: 'P005', name: 'لقمه معمولی 120گرمی', weight_per_unit: 90, material_name: 'گوشت نخودی', description: '', remainder_type: 'برگشت به مواد', remainder_note: 'باقیمانده از سیخ کشیده و به مایه برمی‌گردد', active: true },
    { code: 'P006', name: 'لقمه مجلسی 150گرمی', weight_per_unit: 113, material_name: 'گوشت نخودی', description: '', remainder_type: 'برگشت به مواد', remainder_note: 'باقیمانده از سیخ کشیده و به مایه برمی‌گردد', active: true },
    { code: 'P007', name: 'ران مرغ زرشک', weight_per_unit: 1000, material_name: 'ران مرغ', description: '', remainder_type: 'حمل به روز بعد', remainder_note: 'باقیمانده به عنوان محصول نهایی می‌ماند', active: true },
    { code: 'P008', name: 'ماهی قزل', weight_per_unit: 1000, material_name: 'ماهی', description: '', remainder_type: 'حمل به روز بعد', remainder_note: 'باقیمانده به عنوان محصول نهایی می‌ماند', active: true },
    { code: 'P009', name: 'گوشت خورشت قیمه', weight_per_unit: 1000, material_name: 'گوشت خورشتی', description: 'گوشت قیمه', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true },
    { code: 'P010', name: 'گوشت خورشت قورمه', weight_per_unit: 1000, material_name: 'گوشت خورشتی', description: 'گوشت قورمه', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true },
    { code: 'P011', name: 'مرغ خورشت فسنجان', weight_per_unit: 1000, material_name: 'سینه فسنجان', description: 'مرغ فسنجان', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true },
    { code: 'P012', name: 'مرغ سالاد ماکارونی', weight_per_unit: 1500, material_name: 'سینه سالاد', description: '', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true },
    { code: 'P013', name: 'گوشت پخته خورشتی', weight_per_unit: 1000, material_name: 'گوشت خورشتی', description: 'تنظیم گوشت خورشتها', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true }
  ],
  entries: [
    { date: '1405/07/15', material_name: 'سینه مرغ', quantity: 49, supplier: 'زربال', invoice_no: 'F-1403-101', notes: 'ورود صبح' },
    { date: '1405/07/15', material_name: 'ران مرغ', quantity: 200, supplier: 'زربال', invoice_no: 'F-1403-101', notes: '' },
    { date: '1405/07/15', material_name: 'سینه فسنجان', quantity: 10, supplier: 'زربال', invoice_no: 'F-1403-102', notes: '' },
    { date: '1405/07/15', material_name: 'سینه سالاد', quantity: 3, supplier: 'زربال', invoice_no: 'F-1403-103', notes: '' },
    { date: '1405/07/15', material_name: 'گوشت نخودی', quantity: 52, supplier: 'شیخی', invoice_no: '', notes: '' },
    { date: '1405/07/16', material_name: 'ماهی', quantity: 10, supplier: 'مقدم', invoice_no: '', notes: '' },
    { date: '1405/07/16', material_name: 'گوشت خورشتی', quantity: 30, supplier: 'شیخی', invoice_no: '', notes: '' },
    { date: '1405/07/16', material_name: 'سینه فسنجان', quantity: 6.4, supplier: 'مرادی', invoice_no: '', notes: 'جهت غذای پرسنل داده شد جایگزین مرغ فسنجان گردید' },
    { date: '1405/07/17', material_name: 'سینه مرغ', quantity: 53.7, supplier: 'زربال', invoice_no: '', notes: '' },
    { date: '1405/07/17', material_name: 'سینه فسنجان', quantity: 4, supplier: '', invoice_no: '', notes: '' },
    { date: '1405/07/18', material_name: 'سینه مرغ', quantity: 57.3, supplier: '', invoice_no: '', notes: '' },
    { date: '1405/07/18', material_name: 'سینه سالاد', quantity: 3, supplier: '', invoice_no: '', notes: '' },
    { date: '1405/07/19', material_name: 'ران مرغ', quantity: 200, supplier: '', invoice_no: '', notes: '' },
    { date: '1405/07/19', material_name: 'سینه مرغ', quantity: 48.5, supplier: '', invoice_no: '', notes: '' },
    { date: '1405/07/19', material_name: 'سینه فسنجان', quantity: 10, supplier: '', invoice_no: '', notes: '' },
    { date: '1405/07/20', material_name: 'گوشت نخودی', quantity: 52, supplier: '', invoice_no: '', notes: '' },
    { date: '1405/07/20', material_name: 'گوشت خورشتی', quantity: 32, supplier: '', invoice_no: '', notes: '' }
  ],
  productions: [
    { date: '1405/07/14', product_name: 'گوشت خورشت قورمه', quantity: 12, material_weight: 12, material_name: 'گوشت خورشتی', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'میثم خواجه', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'جوجه معمولی 170 گرمی', quantity: 50, material_weight: 8.5, material_name: 'سینه مرغ', shift_code: 's2', start_time: '10:45', end_time: '12:30', duration_minutes: 105, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'جوجه ممتاز ۲۰۰ گرمی', quantity: 50, material_weight: 10, material_name: 'سینه مرغ', shift_code: 's2', start_time: '10:45', end_time: '12:30', duration_minutes: null, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'کوبیده اکو 100گرمی', quantity: 28, material_weight: 2.1, material_name: 'گوشت نخودی', shift_code: 's1', start_time: '08:00', end_time: '10:30', duration_minutes: 150, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'لقمه معمولی 120گرمی', quantity: 35, material_weight: 3.15, material_name: 'گوشت نخودی', shift_code: 's1', start_time: '08:00', end_time: '10:30', duration_minutes: null, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'لقمه مجلسی 150گرمی', quantity: 22, material_weight: 2.486, material_name: 'گوشت نخودی', shift_code: 's1', start_time: '08:00', end_time: '10:30', duration_minutes: null, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'ران مرغ زرشک', quantity: 50, material_weight: 50, material_name: 'ران مرغ', shift_code: '', start_time: '08:30', end_time: '11:00', duration_minutes: 150, producer_name: 'راجا کشمیری', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'کوبیده اکو 100گرمی', quantity: 18, material_weight: 1.35, material_name: 'گوشت نخودی', shift_code: 's3', start_time: '17:00', end_time: '18:15', duration_minutes: 75, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'لقمه مجلسی 150گرمی', quantity: 41, material_weight: 4.633, material_name: 'گوشت نخودی', shift_code: 's3', start_time: '17:00', end_time: '18:15', duration_minutes: null, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'لقمه معمولی 120گرمی', quantity: 14, material_weight: 1.26, material_name: 'گوشت نخودی', shift_code: 's3', start_time: '17:00', end_time: '18:15', duration_minutes: null, producer_name: 'صفرملک زاده', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'جوجه معمولی 170 گرمی', quantity: 27, material_weight: 4.59, material_name: 'سینه مرغ', shift_code: 'e1', start_time: '18:00', end_time: '18:25', duration_minutes: 25, producer_name: 'مهدی عصمتی', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'جوجه ممتاز ۲۰۰ گرمی', quantity: 1, material_weight: 0.2, material_name: 'سینه مرغ', shift_code: 'e1', start_time: '18:00', end_time: '18:25', duration_minutes: null, producer_name: 'مهدی عصمتی', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'مرغ خورشت فسنجان', quantity: 6, material_weight: 6, material_name: 'سینه فسنجان', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'مهدی عصمتی', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'گوشت خورشت قیمه', quantity: 4, material_weight: 4, material_name: 'گوشت خورشتی', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'مصطفی خوشگفتار', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/15', product_name: 'کوبیده اکو 100گرمی', quantity: 48, material_weight: 3.6, material_name: 'گوشت نخودی', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'مهدی عصمتی', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'لقمه معمولی 120گرمی', quantity: 28, material_weight: 2.52, material_name: 'گوشت نخودی', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'مهدی عصمتی', remainder_count: 0, remainder_weight: 0, remainder_type: 'برگشت به مواد', notes: '' },
    { date: '1405/07/15', product_name: 'ماهی قزل', quantity: 5, material_weight: 5, material_name: 'ماهی', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'راجا کشمیری', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/16', product_name: 'ران مرغ زرشک', quantity: 40, material_weight: 40, material_name: 'ران مرغ', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'راجا کشمیری', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/16', product_name: 'جوجه معمولی 170 گرمی', quantity: 82, material_weight: 13.94, material_name: 'سینه مرغ', shift_code: 'e2', start_time: '13:00', end_time: '14:30', duration_minutes: 90, producer_name: 'مهدی عصمتی', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/17', product_name: 'ران مرغ زرشک', quantity: 40, material_weight: 40, material_name: 'ران مرغ', shift_code: '', start_time: '08:30', end_time: '11:44', duration_minutes: 194, producer_name: 'راجا کشمیری', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/18', product_name: 'ران مرغ زرشک', quantity: 97, material_weight: 97, material_name: 'ران مرغ', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'میثم خواجه', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/19', product_name: 'جوجه معمولی 170 گرمی', quantity: 100, material_weight: 17, material_name: 'سینه مرغ', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'مهدی عصمتی', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' },
    { date: '1405/07/20', product_name: 'ران مرغ زرشک', quantity: 36, material_weight: 36, material_name: 'ران مرغ', shift_code: '', start_time: '', end_time: '', duration_minutes: null, producer_name: 'راجا کشمیری', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' }
  ],
  wastes: []
};

async function seedIfEmpty() {
  const users = await getAll('users');
  if (users.length > 0) return false;
  for (const u of SEED.users) await add('users', u);
  for (const p of SEED.personnel) await add('personnel', p);
  for (const m of SEED.materials) await add('materials', m);
  for (const p of SEED.products) await add('products', p);
  for (const e of SEED.entries) await add('entries', { ...e, created_at: new Date().toISOString() });
  for (const p of SEED.productions) await add('productions', { ...p, created_at: new Date().toISOString() });
  return true;
}

async function calcStock() {
  const materials = await getAll('materials');
  const entries = await getAll('entries');
  const productions = await getAll('productions');
  const wastes = await getAll('wastes');
  const returns = await getAll('returns');
  let transferItems = [];
  try {
    const transfers = (await getAll('branch_transfers')) || [];
    const items = (await getAll('branch_transfer_items')) || [];
    const activeIds = new Set(transfers.filter(t => !t.deleted_at).map(t => t.id));
    transferItems = items.filter(i => i.item_type === 'material' && activeIds.has(i.transfer_id));
  } catch (e) { transferItems = []; }

  let consumptions = [];
  try { consumptions = (await getAll('production_consumptions')) || []; } catch (e) { consumptions = []; }
  const multiProdIds = new Set(consumptions.map(c => Number(c.production_id)));
  const activeProdIds = new Set(productions.map(p => Number(p.id)));

  return materials.map(m => {
    const totalIn = entries.filter(e => e.material_name === m.name).reduce((s, e) => s + Number(e.quantity || 0), 0);
    const singleOut = productions
      .filter(p => !multiProdIds.has(Number(p.id)) && p.material_name === m.name)
      .reduce((s, p) => s + Number(p.material_weight || 0), 0);
    const multiOut = consumptions
      .filter(c => c.material_name === m.name && activeProdIds.has(Number(c.production_id)))
      .reduce((s, c) => s + Number(c.quantity || 0), 0);
    const totalOut = singleOut + multiOut;
    const totalWaste = wastes.filter(w => w.material_name === m.name).reduce((s, w) => s + Number(w.quantity || 0), 0);
    const totalReturn = returns.filter(r => r.material_name === m.name).reduce((s, r) => s + Number(r.return_weight || 0), 0);
    const totalTransfer = transferItems.filter(i => i.item_name === m.name).reduce((s, i) => s + Number(i.quantity || 0), 0);
    const current = Number(m.initial_stock || 0) + totalIn - totalOut - totalWaste + totalReturn - totalTransfer;
    const status = current <= 0 ? 'تمام شد' : (current < (m.min_alert || 0) ? 'هشدار' : 'عادی');
    return {
      ...m,
      total_in: totalIn,
      total_out: totalOut,
      total_waste: totalWaste,
      total_return: totalReturn,
      total_transfer: totalTransfer,
      current_stock: Math.round(current * 100) / 100,
      status
    };
  });
}

async function exportAllBackup() {
  const data = {};
  for (const s of STORES) {
    if (s === 'settings') continue;
    data[s] = await getAll(s);
  }
  data.exported_at = new Date().toISOString();
  data.version = 1;
  return data;
}

async function importBackup(data) {
  for (const s of STORES) {
    if (s === 'settings' || !data[s]) continue;
    await clearStore(s);
    for (const item of data[s]) {
      const { id, ...rest } = item;
      await add(s, rest);
    }
  }
}


async function addProductionWithReturn(data) {
  const consumptions = data._consumptions || null;
  delete data._consumptions;
  const id = await add("productions", data);
  if (consumptions && consumptions.length) {
    for (const c of consumptions) {
      await add("production_consumptions", {
        production_id: id,
        material_name: c.material_name,
        quantity: Number(c.quantity || 0)
      });
    }
  }
  if (data.remainder_type === "برگشت به مواد" && Number(data.remainder_weight || 0) > 0) {
    await add("returns", {
      date: data.date,
      production_id: id,
      product_name: data.product_name,
      remainder_count: data.remainder_count || 0,
      return_weight: Number(data.remainder_weight),
      material_name: data.material_name,
      notes: "ثبت خودکار از تولید",
      created_at: new Date().toISOString()
    });
  }
  return id;
}

async function updateProductionWithReturn(data) {
  const consumptions = data._consumptions || null;
  delete data._consumptions;
  // remove old returns for this production if any
  const returns = await getAll("returns");
  for (const r of returns) {
    if (r.production_id === data.id) await remove("returns", r.id);
  }
  // replace consumptions
  try {
    const allC = (await getAll("production_consumptions")) || [];
    for (const c of allC) {
      if (Number(c.production_id) === Number(data.id)) await remove("production_consumptions", c.id);
    }
  } catch (e) {}
  await put("productions", data);
  if (consumptions && consumptions.length) {
    for (const c of consumptions) {
      await add("production_consumptions", {
        production_id: data.id,
        material_name: c.material_name,
        quantity: Number(c.quantity || 0)
      });
    }
  }
  if (data.remainder_type === "برگشت به مواد" && Number(data.remainder_weight || 0) > 0) {
    await add("returns", {
      date: data.date,
      production_id: data.id,
      product_name: data.product_name,
      remainder_count: data.remainder_count || 0,
      return_weight: Number(data.remainder_weight),
      material_name: data.material_name,
      notes: "ثبت خودکار از تولید",
      created_at: new Date().toISOString()
    });
  }
}

window.DB = { openDB, getAll, getById, add, put, remove, clearStore, seedIfEmpty, calcStock, exportAllBackup, importBackup, addProductionWithReturn, updateProductionWithReturn };
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
    // health روی اینترنت کند نیاز به زمان بیشتر دارد
    const cleanPath = String(path || '').replace(/^\//, '');
    const isHealthReq = cleanPath === 'health' || cleanPath === '';
    const ms = options.timeoutMs != null ? options.timeoutMs : (isHealthReq ? 45000 : 30000);
    const timer = setTimeout(() => ctrl.abort(), ms);
    const { timeoutMs, ...fetchOpts } = options;
    let res;
    try {
      res = await fetch(url, {
        ...fetchOpts,
        signal: ctrl.signal,
        headers: { ...this.headers, ...(fetchOpts.headers || {}) },
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
      const d = await this.request('health', { timeoutMs: 45000 });
      this.online = !!(d && d.ok);
      return d;
    } catch (e) {
      this.online = false;
      var code = (e.data && e.data.code) || e.status || null;
      return { ok: false, error: e.message || String(e), code: code };
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

/* اگر jalaali از CDN نیامد، تقریب ساده تاریخ شمسی */
(function () {
  if (window.jalaali && jalaali.toJalaali) return;
  window.jalaali = {
    toJalaali: function (gy, gm, gd) {
      var g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
      var gy2 = (gm > 2) ? (gy + 1) : gy;
      var days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
      var jy = -1595 + (33 * Math.floor(days / 12053));
      days %= 12053;
      jy += 4 * Math.floor(days / 1461);
      days %= 1461;
      if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
      }
      var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
      var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
      return { jy: jy, jm: jm, jd: jd };
    }
  };
  window.jalaaliFallback = true;
})();

/**
 * UI helpers, toast, modal, Excel/PDF export, Jalali dates, crypto hash
 */
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) {
    console.warn('toast:', msg);
    return;
  }
  el.textContent = msg;
  el.className = 'toast ' + (type === 'error' ? 'bg-red-600 text-white' : type === 'success' ? 'bg-brand-600 text-white' : 'bg-slate-700 text-white');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3200);
}

function showModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this) closeModal()">${html}</div>`;
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('fa-IR', { maximumFractionDigits: 2 });
}

function statusBadge(status) {
  if (status === 'عادی') return `<span class="badge badge-ok">${status}</span>`;
  if (status === 'هشدار') return `<span class="badge badge-warn">${status}</span>`;
  return `<span class="badge badge-danger">${status}</span>`;
}

/* ---------- Jalali helpers (jalaali-js) ---------- */
function todayJalali() {
  const d = new Date();
  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
}

function jalaliInput(name, value, required = true) {
  const v = value || todayJalali();
  return `<input name="${name}" type="text" class="input-field" value="${v}" placeholder="1405/07/20" pattern="\\d{4}/\\d{2}/\\d{2}" ${required ? 'required' : ''} title="فرمت: سال/ماه/روز شمسی" />`;
}

function parseJalali(str) {
  if (!str) return null;
  const p = str.split(/[\/\-]/).map(Number);
  if (p.length !== 3) return null;
  return { y: p[0], m: p[1], d: p[2] };
}

function jalaliCompare(a, b) {
  const pa = parseJalali(a), pb = parseJalali(b);
  if (!pa || !pb) return 0;
  if (pa.y !== pb.y) return pa.y - pb.y;
  if (pa.m !== pb.m) return pa.m - pb.m;
  return pa.d - pb.d;
}

/* ---------- Password hashing (Web Crypto SHA-256, with plain fallback) ---------- */
async function hashPassword(plain) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain + 'kitchen-salt-v1'));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { console.warn('hash failed, using plain', e); }
  return plain;
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  if (hash.length === 64 && /^[0-9a-f]+$/.test(hash)) {
    try {
      const h = await hashPassword(plain);
      if (h === hash) return true;
    } catch (e) { /* fall through */ }
    return false;
  }
  return plain === hash;
}

/* ---------- Excel ---------- */
function exportToExcel(rows, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName + '.xlsx');
  toast('فایل اکسل دانلود شد', 'success');
}

function downloadJSON(obj, name) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  toast('پشتیبان دانلود شد', 'success');
}

/* ---------- PDF ---------- */
function exportToPDF(title, columns, rows, fileName) {
  // jsPDF فونت فارسی ندارد → خروجی HTML با Vazirmatn + چاپ/ذخیره PDF مرورگر
  const head = columns.map(c => `<th>${escapeHtml(c.header)}</th>`).join('');
  const body = rows.map(r => {
    const tds = columns.map(c => `<td>${escapeHtml(String(r[c.key] ?? ''))}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
      direction: rtl;
      color: #111;
      padding: 16px 20px;
      font-size: 12px;
    }
    h1 { font-size: 18px; margin: 0 0 4px; text-align: center; }
    .meta { text-align: center; color: #555; font-size: 11px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: right;
      vertical-align: top;
    }
    th {
      background: #0d4d2e;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
    }
    tr:nth-child(even) td { background: #f5f5f5; }
    .actions { text-align: center; margin-top: 16px; }
    button {
      font-family: inherit;
      padding: 8px 20px;
      margin: 0 4px;
      border-radius: 8px;
      border: 1px solid #0d4d2e;
      background: #0d4d2e;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
    }
    button.secondary { background: #fff; color: #0d4d2e; }
    @media print {
      .actions { display: none !important; }
      body { padding: 0; }
      th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">غذای انصار — ${new Date().toLocaleString('fa-IR')}</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || '<tr><td colspan="' + columns.length + '">داده‌ای نیست</td></tr>'}</tbody>
  </table>
  <div class="actions">
    <button onclick="window.print()">چاپ / ذخیره PDF</button>
    <button class="secondary" onclick="window.close()">بستن</button>
  </div>
  <script>
    // اگر کاربر خواست مستقیم دیالوگ چاپ باز شود
    setTimeout(function(){ /* window.print(); */ }, 400);
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    toast('پاپ‌آپ مسدود است — اجازه پاپ‌آپ بدهید', 'error');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  toast('گزارش باز شد — از «چاپ / ذخیره PDF» ذخیره کنید', 'success');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function confirmAction(msg) {
  return window.confirm(msg);
}

function filterByDateAndSearch(list, dateFrom, dateTo, search, searchFields) {
  return list.filter(item => {
    if (dateFrom && jalaliCompare(item.date, dateFrom) < 0) return false;
    if (dateTo && jalaliCompare(item.date, dateTo) > 0) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = searchFields.some(f => String(item[f] || '').toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });
}

/** Print a simple production receipt — نسخه پایدار برای پرینتر */
function printReceipt(p) {
  const old = document.getElementById('print-frame');
  if (old) old.remove();

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <title>فیش تولید</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Tahoma, Arial, sans-serif;
      padding: 4mm;
      max-width: 80mm;
      margin: 0 auto;
      font-size: 12px;
      color: #000 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h2 { margin: 0 0 12px; font-size: 16px; text-align: center; color: #000 !important; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 4px; border-bottom: 1px dashed #999; color: #000 !important; vertical-align: top; }
    td.label { color: #333 !important; width: 45%; }
    td.val { font-weight: bold; text-align: left; direction: ltr; unicode-bidi: embed; }
    .footer { margin-top: 14px; text-align: center; font-size: 11px; color: #444 !important; }
    @media print { body { padding: 5mm; } button, .no-print { display: none !important; } }
    @page { size: auto; margin: 8mm; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:8px">
    <img src="/logo-ansar.png" alt="" style="max-width:72px;height:auto" onerror="this.style.display='none'" />
  </div>
  <h2>فیش تولید — غذای انصار</h2>
  <table>
    <tr><td class="label">تاریخ</td><td class="val">${p.date || '—'}</td></tr>
    <tr><td class="label">محصول</td><td class="val">${p.product_name || '—'}</td></tr>
    <tr><td class="label">تعداد</td><td class="val">${p.quantity ?? '—'}</td></tr>
    <tr><td class="label">وزن مصرفی (کیلو)</td><td class="val">${p.material_weight ?? '—'}</td></tr>
    <tr><td class="label">ماده اولیه</td><td class="val">${p.material_name || '—'}</td></tr>
    <tr><td class="label">تولیدکننده</td><td class="val">${p.producer_name || '—'}</td></tr>
    <tr><td class="label">شیفت</td><td class="val">${p.shift_code || '—'}</td></tr>
    <tr><td class="label">مدت (دقیقه)</td><td class="val">${p.duration_minutes ?? '—'}</td></tr>
    <tr><td class="label">باقیمانده</td><td class="val">${p.remainder_count || 0} / ${p.remainder_weight || 0} کیلو</td></tr>
    <tr><td class="label">نوع باقیمانده</td><td class="val">${p.remainder_type || '—'}</td></tr>
  </table>
  <p class="footer">چاپ‌شده در ${new Date().toLocaleString('fa-IR')}</p>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.id = 'print-frame';
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error(e);
      toast('خطا در چاپ — دوباره تلاش کنید', 'error');
    }
    setTimeout(() => iframe.remove(), 5000);
  };

  if (iframe.contentWindow.document.readyState === 'complete') {
    setTimeout(doPrint, 250);
  } else {
    iframe.onload = () => setTimeout(doPrint, 250);
    setTimeout(doPrint, 800);
  }
}

window.UI = {
  toast, showModal, closeModal, fmtNum, statusBadge,
  todayJalali, jalaliInput, parseJalali, jalaliCompare,
  hashPassword, verifyPassword,
  exportToExcel, downloadJSON, exportToPDF, confirmAction,
  filterByDateAndSearch, printReceipt
};
window.toast = toast;
window.showModal = showModal;
window.closeModal = closeModal;
window.fmtNum = fmtNum;
window.statusBadge = statusBadge;
window.todayJalali = todayJalali;
window.jalaliInput = jalaliInput;
window.exportToExcel = exportToExcel;
window.downloadJSON = downloadJSON;
window.exportToPDF = exportToPDF;

/**
 * کد بعدی خودکار: P001, M012, S005, F001, T001
 * prefix بدون عدد؛ از روی لیست موجود بزرگ‌ترین عدد را می‌گیرد
 */
async function nextCode(store, prefix, field) {
  field = field || 'code';
  prefix = String(prefix || '').toUpperCase();
  var list = [];
  try { list = (await DB.getAll(store)) || []; } catch (e) { list = []; }
  var max = 0;
  var re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$', 'i');
  list.forEach(function (item) {
    var c = String(item[field] || '').trim();
    var m = c.match(re);
    if (m) {
      var n = parseInt(m[1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  var next = max + 1;
  var pad = next < 1000 ? 3 : String(next).length;
  return prefix + String(next).padStart(pad, '0');
}
window.nextCode = nextCode;

window.confirmAction = confirmAction;
window.filterByDateAndSearch = filterByDateAndSearch;
window.printReceipt = printReceipt;
/**
 * Auth — cloud-first (D1 via /api), local fallback only if API offline
 */
let currentUser = null;

function getSession() {
  try {
    const s = localStorage.getItem('kitchen_session');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function setSession(user) {
  currentUser = user;
  localStorage.setItem(
    'kitchen_session',
    JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    })
  );
}

function clearSession() {
  currentUser = null;
  localStorage.removeItem('kitchen_session');
  if (window.Api) Api.logout();
}

async function login(username, password) {
  if (window.Api) {
    // چند بار تلاش برای اینترنت کند (مخابرات)
    let health = { ok: false };
    for (let i = 0; i < 4; i++) {
      health = await Api.health();
      if (health && health.ok) break;
      await new Promise(function (r) { setTimeout(r, 700 * (i + 1)); });
    }
    if (health.ok) {
      try {
        const res = await Api.login(username, password);
        if (!res.ok) return { ok: false, msg: res.msg || 'ورود ناموفق' };
        setSession(res.user);
        return { ok: true, user: res.user, mode: 'cloud' };
      } catch (e) {
        return { ok: false, msg: e.message || 'خطا در ورود ابری' };
      }
    }
    if (health.code === 'NO_D1') {
      return {
        ok: false,
        msg: 'دیتابیس ابری (D1) متصل نیست. در Cloudflare یک D1 بسازید و به پروژه bind کنید.',
      };
    }
  }

  if (!window.DB || !DB.getAll) {
    return { ok: false, msg: 'سرور در دسترس نیست' };
  }
  await DB.openDB();
  await DB.seedIfEmpty();
  const users = await DB.getAll('users');
  const user = users.find((u) => u.username === username && u.active !== false);
  if (!user) return { ok: false, msg: 'نام کاربری یا رمز عبور اشتباه است' };
  const ok = await verifyPassword(password, user.password || user.password_hash);
  if (!ok) return { ok: false, msg: 'نام کاربری یا رمز عبور اشتباه است' };
  if (user.password && String(user.password).length !== 64) {
    user.password = await hashPassword(password);
    await DB.put('users', user);
  }
  setSession(user);
  return { ok: true, user, mode: 'local' };
}

function logout() {
  clearSession();
  location.reload();
}

function isAdmin() {
  return currentUser?.role === 'admin'; // viewer cannot edit/delete
}

function isViewer() {
  return currentUser?.role === 'viewer';
}

function canView() {
  return !!currentUser;
}

function canEntry() {
  return currentUser?.role === 'admin' || currentUser?.role === 'entry';
}
function canProduction() {
  return currentUser?.role === 'admin' || currentUser?.role === 'production';
}
function canEditDelete() {
  return currentUser?.role === 'admin';
}

function requireAuth() {
  const s = getSession();
  if (!s) return false;
  currentUser = s;
  if (window.Api) Api.loadToken();
  return true;
}

window.Auth = { isViewer, canView, 
  login,
  logout,
  requireAuth,
  isAdmin,
  canEntry,
  canProduction,
  canEditDelete,
  get currentUser() {
    return currentUser;
  },
};
/**
 * Page renderers – with filters, alerts, PDF, jalali, auto-return
 */
const Pages = {};

Pages.dashboard = async function () {
  // Parallel fetch — was serial (biggest client latency)
  const [stock, entries0, productions0, wastes0, products0, plans0, scores0] = await Promise.all([
    DB.calcStock(),
    DB.getAll('entries'),
    DB.getAll('productions'),
    DB.getAll('wastes'),
    DB.getAll('products').catch(() => []),
    DB.getAll('daily_plans').catch(() => []),
    DB.getAll('staff_scores').catch(() => []),
  ]);
  let entries = entries0 || [];
  let productions = productions0 || [];
  let wastes = wastes0 || [];
  let products = products0 || [];
  let plans = plans0 || [];
  let scores = scores0 || [];
  // advanced dashboard date filter
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '';
  const dt = params.get('dt') || '';
  let cperiod = params.get('cperiod') || 'day';
  if (cperiod !== 'day' && cperiod !== 'month' && cperiod !== 'year') cperiod = 'day';
  if (df || dt) {
    entries = filterByDateAndSearch(entries, df, dt, '', ['date']);
    productions = filterByDateAndSearch(productions, df, dt, '', ['date']);
    wastes = filterByDateAndSearch(wastes, df, dt, '', ['date']);
  }

  const totalWeight = productions.reduce((s, p) => s + Number(p.material_weight || 0), 0);
  const totalQty = productions.reduce((s, p) => s + Number(p.quantity || 0), 0);

  const pStats = {};
  productions.forEach(p => {
    const n = p.producer_name || 'نامشخص';
    if (!pStats[n]) pStats[n] = { count: 0, qty: 0, weight: 0, duration: 0 };
    pStats[n].count++;
    pStats[n].qty += Number(p.quantity || 0);
    pStats[n].weight += Number(p.material_weight || 0);
    pStats[n].duration += Number(p.duration_minutes || 0);
  });

  const unitOf = (name) => {
    const m = stock.find(x => x.name === name);
    return (m && m.unit) ? m.unit : 'کیلوگرم';
  };
  const unitShort = (u) => {
    if (!u) return '';
    if (String(u).includes('عدد')) return 'عدد';
    if (String(u).includes('کیلو')) return 'کیلو';
    return u;
  };

  const COLORS = ['#1a9b55', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#84cc16'];

  const matConsume = {};
  productions.forEach(p => {
    const n = p.material_name || 'نامشخص';
    matConsume[n] = (matConsume[n] || 0) + Number(p.material_weight || 0);
  });
  const topMats = Object.entries(matConsume).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const sumMat = topMats.reduce((s, [, v]) => s + v, 0) || 1;

  // روند تولید بر اساس دوره: روز / ماه / سال
  const periodKeyOf = (dateStr, mode) => {
    if (!dateStr || dateStr === '—') return '—';
    const s = String(dateStr);
    if (mode === 'year') return s.slice(0, 4) || s;
    if (mode === 'month') return s.length >= 7 ? s.slice(0, 7) : s;
    return s;
  };
  const periodLabels = { day: 'روزانه', month: 'ماهانه', year: 'سالانه' };
  const periodSlice = { day: 14, month: 12, year: 10 };
  const trendWeight = {};
  const trendQty = {};
  productions.forEach(p => {
    const key = periodKeyOf(p.date, cperiod);
    trendQty[key] = (trendQty[key] || 0) + Number(p.quantity || 0);
    if (unitShort(unitOf(p.material_name)) === 'عدد') return;
    trendWeight[key] = (trendWeight[key] || 0) + Number(p.material_weight || 0);
  });
  const dayWeight = trendWeight;
  const dayKeys = Object.keys(trendWeight).sort().slice(-(periodSlice[cperiod] || 14));
  const sumDay = dayKeys.reduce((s, d) => s + dayWeight[d], 0) || 1;
  const trendQtyKeys = Object.keys(trendQty).sort().slice(-(periodSlice[cperiod] || 14));
  const trendQtyItems = trendQtyKeys.map((k, i) => ({
    label: k, value: trendQty[k], color: COLORS[i % COLORS.length],
  }));
  const sumTrendQty = trendQtyItems.reduce((s, it) => s + it.value, 0) || 1;
  const maxTrendQty = trendQtyItems.length ? Math.max(...trendQtyItems.map(it => it.value)) : 1;

  const staffList = Object.entries(pStats).sort((a, b) => b[1].weight - a[1].weight).slice(0, 7);
  const sumStaff = staffList.reduce((s, [, v]) => s + v.weight, 0) || 1;

  const stockGroups = [
    { label: 'عادی', value: stock.filter(m => m.status === 'عادی').length, color: '#1a9b55' },
    { label: 'هشدار', value: stock.filter(m => m.status === 'هشدار').length, color: '#f59e0b' },
    { label: 'تمام شد', value: stock.filter(m => m.status === 'تمام شد').length, color: '#ef4444' },
  ].filter(x => x.value > 0);
  const sumStockG = stockGroups.reduce((s, x) => s + x.value, 0) || 1;

  const byUser = {};
  [...entries, ...productions, ...wastes].forEach(r => {
    const u = r.created_by || 'نامشخص';
    byUser[u] = (byUser[u] || 0) + 1;
  });
  const userList = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const sumUser = userList.reduce((s, [, v]) => s + v, 0) || 1;

  const donutGradient = (items, total) => {
    if (!items.length) return '#1e293b';
    let acc = 0;
    const parts = items.map((it) => {
      const start = (acc / total) * 360;
      acc += Number(it.value) || 0;
      const end = (acc / total) * 360;
      return it.color + ' ' + start + 'deg ' + end + 'deg';
    });
    return 'conic-gradient(' + parts.join(', ') + ')';
  };

  const donutCard = (title, sub, items, total, fmtFn) => {
    if (!items.length) {
      return '<div class="glass-card rounded-2xl p-5 min-h-[220px]"><h2 class="font-semibold mb-2">' + title + '</h2><p class="text-slate-500 text-sm">داده‌ای نیست</p></div>';
    }
    const grad = donutGradient(items, total);
    const legend = items.map((it) => {
      const val = fmtFn ? fmtFn(it) : it.value;
      return '<div class="flex items-center gap-2 text-xs mb-1.5">' +
        '<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:' + it.color + '"></span>' +
        '<span class="truncate flex-1 text-slate-300">' + it.label + '</span>' +
        '<span class="text-slate-100 font-medium whitespace-nowrap">' + val + '</span></div>';
    }).join('');
    return '<div class="glass-card rounded-2xl p-5">' +
      '<h2 class="font-semibold mb-0.5">' + title + '</h2>' +
      '<p class="text-xs text-slate-400 mb-4">' + sub + '</p>' +
      '<div class="flex flex-col sm:flex-row items-center gap-5">' +
      '<div class="relative w-36 h-36 flex-shrink-0">' +
      '<div class="w-full h-full rounded-full shadow-lg" style="background:' + grad + '"></div>' +
      '<div class="absolute inset-[22%] rounded-full bg-slate-900 border border-slate-700/40"></div>' +
      '</div><div class="flex-1 w-full min-w-0">' + legend + '</div></div></div>';
  };

  const matItems = topMats.map(([name, w], i) => ({
    label: name, value: w, color: COLORS[i % COLORS.length], unit: unitShort(unitOf(name)),
  }));
  const dayItems = dayKeys.map((d, i) => ({
    label: d, value: dayWeight[d], color: COLORS[i % COLORS.length],
  }));
  const staffItems = staffList.map(([name, s], i) => ({
    label: name, value: s.weight, color: COLORS[i % COLORS.length], count: s.count,
  }));
  const userItems = userList.map(([name, c], i) => ({
    label: name, value: c, color: COLORS[i % COLORS.length],
  }));

  // تعداد تولید هر محصول (جوجه، کوبیده، ماهی، لوبیاپلو و …)
  const prodQty = {};
  productions.forEach(p => {
    const n = p.product_name || 'نامشخص';
    prodQty[n] = (prodQty[n] || 0) + Number(p.quantity || 0);
  });
  const topProducts = Object.entries(prodQty).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sumProdQty = topProducts.reduce((s, [, v]) => s + v, 0) || 1;
  const productItems = topProducts.map(([name, q], i) => ({
    label: name, value: q, color: COLORS[i % COLORS.length],
  }));

  // نوار افقی برای تعداد محصولات (خواناتر از دونات وقتی نام‌ها طولانی‌اند)
  const barCard = (title, sub, items, maxVal) => {
    if (!items.length) {
      return '<div class="glass-card rounded-2xl p-5 min-h-[220px]"><h2 class="font-semibold mb-2">' + title + '</h2><p class="text-slate-500 text-sm">داده‌ای نیست</p></div>';
    }
    const rows = items.map((it) => {
      const pct = maxVal > 0 ? Math.round((it.value / maxVal) * 100) : 0;
      return '<div class="mb-2.5">' +
        '<div class="flex justify-between text-xs mb-1 gap-2">' +
        '<span class="text-slate-300 truncate">' + it.label + '</span>' +
        '<span class="text-slate-100 font-medium whitespace-nowrap">' + fmtNum(it.value) + '</span></div>' +
        '<div class="h-2 rounded-full bg-slate-800 overflow-hidden">' +
        '<div class="h-full rounded-full" style="width:' + pct + '%;background:' + it.color + '"></div>' +
        '</div></div>';
    }).join('');
    return '<div class="glass-card rounded-2xl p-5">' +
      '<h2 class="font-semibold mb-0.5">' + title + '</h2>' +
      '<p class="text-xs text-slate-400 mb-4">' + sub + '</p>' + rows + '</div>';
  };
  const maxProdQty = topProducts.length ? topProducts[0][1] : 1;

  const periodChip = (id, label) => {
    const on = cperiod === id;
    const q = [];
    if (df) q.push('df=' + encodeURIComponent(df));
    if (dt) q.push('dt=' + encodeURIComponent(dt));
    q.push('cperiod=' + id);
    return '<button type="button" class="' + (on ? 'btn-primary' : 'btn-ghost') + ' text-xs" onclick="navigate(\'dashboard?' + q.join('&') + '\')">' + label + '</button>';
  };

  const chartsHtml =
    '<div class="mb-3 flex flex-wrap items-center justify-between gap-2">' +
    '<div class="flex flex-wrap gap-2 items-center">' +
    '<span class="text-xs text-slate-400">نمودار روند:</span>' +
    periodChip('day', 'روز') +
    periodChip('month', 'ماه') +
    periodChip('year', 'سال') +
    '</div>' +
    '<span class="text-[10px] text-slate-500" id="chart-auto-hint">ورق خودکار هر ۱۲ ثانیه · ' + (periodLabels[cperiod] || '') + '</span>' +
    '</div>' +
    '<div class="grid lg:grid-cols-2 gap-6 mb-8" id="dash-charts">' +
    barCard('🍢 تعداد تولید محصولات', 'در بازه فیلتر · تجمیع ' + (periodLabels[cperiod] || ''), productItems, maxProdQty) +
    (trendQtyItems.length ? barCard('📈 تعداد تولید — ' + (periodLabels[cperiod] || ''), 'جمع تعداد در هر ' + (cperiod === 'day' ? 'روز' : cperiod === 'month' ? 'ماه' : 'سال'), trendQtyItems, maxTrendQty) : '') +
    donutCard('📊 سهم تعداد محصولات', 'درصد از کل تعداد تولید', productItems, sumProdQty, (it) => fmtNum(it.value) + ' عدد') +
    donutCard('📦 وضعیت موجودی', 'تعداد اقلام در هر وضعیت', stockGroups, sumStockG, (it) => it.value + ' قلم') +
    donutCard('👨‍🍳 سهم پرسنل', 'بر اساس وزن مصرف', staffItems, sumStaff, (it) => fmtNum(it.value) + ' · ' + (it.count || 0) + ' رکورد') +
    donutCard('✍️ ثبت‌کننده‌ها', 'ورود + تولید + ضایعات', userItems, sumUser, (it) => it.value + ' رکورد') +
    (dayItems.length ? donutCard('📅 مصرف کیلویی — ' + (periodLabels[cperiod] || ''), 'مواد کیلویی تجمیع‌شده', dayItems, sumDay, (it) => fmtNum(it.value) + ' کیلو') : '') +
    '</div>' +
    '<script>(function(){ try { if (window.__dashChartTimer) clearInterval(window.__dashChartTimer); window.__dashChartTimer = setInterval(function(){ if (typeof currentPage !== "undefined" && currentPage !== "dashboard") return; if (document.querySelector(".modal") && !document.getElementById("modal-root").classList.contains("hidden")) return; var order=["day","month","year"]; var h=(location.hash||""); var cur="day"; try { var q=h.indexOf("?")>=0?h.slice(h.indexOf("?")+1):""; cur=new URLSearchParams(q).get("cperiod")||"day"; } catch(e){} var ix=order.indexOf(cur); var next=order[(ix+1)%3]; var df="",dt=""; try { var q2=h.indexOf("?")>=0?h.slice(h.indexOf("?")+1):""; var sp=new URLSearchParams(q2); df=sp.get("df")||""; dt=sp.get("dt")||""; } catch(e){} var parts=["cperiod="+next]; if(df)parts.push("df="+encodeURIComponent(df)); if(dt)parts.push("dt="+encodeURIComponent(dt)); if (typeof navigate==="function") navigate("dashboard?"+parts.join("&")); }, 12000); } catch(e){} })();</script>';


  // —— ویژگی‌های هوشمند ——
  const today = todayJalali();
  // مصرف ۳ روز اخیر برای پیش‌بینی
  const recentDays = [...new Set(productions.map(p => p.date).filter(Boolean))].sort().slice(-3);
  const predictRows = stock.map(m => {
    let used = 0;
    recentDays.forEach(d => {
      used += productions.filter(p => p.date === d && p.material_name === m.name)
        .reduce((s, p) => s + Number(p.material_weight || 0), 0);
    });
    const daily = recentDays.length ? used / recentDays.length : 0;
    const cur = Number(m.current_stock || 0);
    let daysLeft = null;
    if (daily > 0.001) daysLeft = Math.round((cur / daily) * 10) / 10;
    return { ...m, dailyAvg: Math.round(daily * 100) / 100, daysLeft };
  }).filter(m => m.daysLeft != null && m.daysLeft <= 5 && m.current_stock > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // ضریب تبدیل: ماده مصرفی / تعداد برای هر محصول
  const convMap = {};
  productions.forEach(p => {
    const key = p.product_name || '—';
    if (!convMap[key]) convMap[key] = { w: 0, q: 0, n: 0, mat: p.material_name };
    convMap[key].w += Number(p.material_weight || 0);
    convMap[key].q += Number(p.quantity || 0);
    convMap[key].n += 1;
  });
  const conversions = Object.entries(convMap).map(([name, v]) => {
    const actual = v.q > 0 ? v.w / v.q : 0;
    const def = products.find(x => x.name === name);
    const expected = def ? Number(def.weight_per_unit || 0) / 1000 : null; // اگر گرم باشد
    // weight_per_unit در سیستم گرم است؛ material_weight کیلو → actual کیلو per unit
    const expectedKg = def && def.weight_per_unit ? Number(def.weight_per_unit) / 1000 : null;
    return {
      name,
      actual: Math.round(actual * 1000) / 1000,
      expected: expectedKg,
      samples: v.n,
      mat: v.mat,
    };
  }).filter(c => c.samples >= 1).sort((a, b) => b.samples - a.samples).slice(0, 8);

  // جدول افتخار امروز
  const todayProds = productions.filter(p => p.date === today);
  const board = {};
  todayProds.forEach(p => {
    const n = p.producer_name || 'نامشخص';
    if (!board[n]) board[n] = { qty: 0, weight: 0, count: 0 };
    board[n].qty += Number(p.quantity || 0);
    board[n].weight += Number(p.material_weight || 0);
    board[n].count += 1;
  });
  const leaderboard = Object.entries(board).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  const todayScores = scores.filter(s => s.day === today);
  const scoreOf = (name) => {
    const rows = todayScores.filter(s => s.personnel_name === name);
    if (!rows.length) return null;
    return rows[rows.length - 1]; // آخرین نمره
  };
  // میانگین نمرات امروز برای نمایش
  const scoreBoard = todayScores.slice().sort((a, b) => Number(b.score) - Number(a.score));


  // برنامه امروز vs واقعی
  const todayPlans = plans.filter(pl => pl.day === today);
  const planVsActual = todayPlans.map(pl => {
    const done = todayProds.filter(p => p.product_name === pl.product_name)
      .reduce((s, p) => s + Number(p.quantity || 0), 0);
    const target = Number(pl.target_qty || 0);
    return {
      product: pl.product_name,
      target,
      done,
      pct: target > 0 ? Math.round((done / target) * 100) : 0,
    };
  });


  const alerts = stock.filter(m => m.status !== 'عادی');
  const alertHtml = alerts.length ? `
    <div class="alert-banner mb-6 fade-in">
      <div class="font-semibold text-amber-300 mb-2">⚠️ هشدار موجودی</div>
      <ul class="text-sm space-y-1">
        ${alerts.map(m => `<li>• <strong>${m.name}</strong>: موجودی ${fmtNum(m.current_stock)} ${m.unit || ''} — <span class="${m.status === 'تمام شد' ? 'text-red-400' : 'text-amber-400'}">${m.status}</span></li>`).join('')}
      </ul>
    </div>` : '';

  return `
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">داشبورد مدیریتی</h1>
        <p class="text-slate-400 text-sm mt-1">خلاصه موجودی و عملکرد • ${todayJalali()}${df || dt ? ' <span class="text-brand-300">(فیلتر تاریخ فعال)</span>' : ''}</p>
      </div>
      <div class="filter-bar glass-card rounded-xl p-2 flex flex-wrap gap-2 items-center">
        <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:120px" />
        <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:120px" />
        <button class="btn-secondary text-sm" onclick="Pages.applyFilter('dashboard')">اعمال</button>
        <button class="btn-ghost text-sm" onclick="Pages.quickDate('dashboard','today')">امروز</button>
        <button class="btn-ghost text-sm" onclick="Pages.clearFilter('dashboard')">پاک</button>
      </div>
    </div>
    ${alertHtml}

    ${predictRows.length ? `
    <div class="glass-card rounded-2xl p-4 mb-6 border border-amber-500/30">
      <h2 class="font-semibold text-amber-300 mb-2">🔮 پیش‌بینی اتمام موجودی (بر اساس میانگین ۳ روز اخیر)</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        ${predictRows.map(m => `
          <div class="bg-slate-800/50 rounded-xl px-3 py-2 flex justify-between gap-2">
            <span class="font-medium truncate">${m.name}</span>
            <span class="${m.daysLeft <= 1 ? 'text-red-400' : 'text-amber-300'} whitespace-nowrap">≈ ${fmtNum(m.daysLeft)} روز دیگر</span>
          </div>
        `).join('')}
      </div>
      <p class="text-[10px] text-slate-500 mt-2">تخمینی است؛ خرید و ضایعات می‌تواند تغییرش دهد.</p>
    </div>` : ''}

    <div class="grid lg:grid-cols-2 gap-6 mb-8">
      <div class="glass-card rounded-2xl p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 class="font-semibold">🏆 افتخار و نمره شیفت امروز</h2>
          <div class="flex gap-2 flex-wrap">
            ${Auth.isAdmin() ? `<button class="btn-secondary text-xs" onclick="Pages.scoreStaffForm()">نمره‌دهی</button>` : ''}
            <button class="btn-ghost text-xs" onclick="navigate('league')">جدول لیگ</button>
            <button class="btn-ghost text-xs" onclick="Pages.shiftSummary()">خلاصه واتساپ</button>
          </div>
        </div>
        ${leaderboard.length ? `
          <div class="space-y-2 mb-4">
            ${leaderboard.map(([name, s], i) => {
              const sc = scoreOf(name);
              return `
              <div class="flex items-center gap-3 text-sm">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-amber-500 text-slate-900':i===1?'bg-slate-400 text-slate-900':i===2?'bg-amber-800 text-white':'bg-slate-700'}">${i+1}</span>
                <span class="flex-1 font-medium truncate">${name}</span>
                <span class="text-slate-400 text-xs">${s.count} رکورد</span>
                <span class="text-brand-300 font-medium">${fmtNum(s.qty)}</span>
                <span class="text-xs ${sc ? (sc.score>=8?'text-brand-300':sc.score>=5?'text-amber-300':'text-red-300') : 'text-slate-600'}">${sc ? ('⭐' + sc.score) : '—'}</span>
              </div>`;
            }).join('')}
          </div>
        ` : `<p class="text-slate-500 text-sm mb-3">امروز هنوز تولیدی ثبت نشده · ${today}</p>`}
        ${scoreBoard.length ? `
          <div class="border-t border-slate-700/50 pt-3 mt-2">
            <div class="text-xs text-slate-400 mb-2">نمرات ثبت‌شده امروز</div>
            ${scoreBoard.map(s => `
              <div class="flex justify-between text-xs mb-1 gap-2">
                <span class="truncate">${s.personnel_name}</span>
                <span class="font-bold ${s.score>=8?'text-brand-300':s.score>=5?'text-amber-300':'text-red-300'}">${s.score}/10</span>
              </div>
              ${s.note ? `<div class="text-[10px] text-slate-500 mb-1 pr-1">«${s.note}»</div>` : ''}
            `).join('')}
          </div>
        ` : (Auth.isAdmin() ? `<p class="text-xs text-slate-500">هنوز نمره‌ای ثبت نشده — دکمه نمره‌دهی</p>` : '')}
      </div>
    </div>

    <div class="glass-card rounded-2xl p-5 mb-8">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 class="font-semibold">📋 برنامه امروز در برابر واقعیت</h2>
          <p class="text-xs text-slate-400">هدف صبح vs تولید ثبت‌شده · ${today}</p>
        </div>
        ${Auth.isAdmin() ? `<button class="btn-secondary text-sm" onclick="Pages.planForm()">+ هدف روزانه</button>` : ''}
      </div>
      ${planVsActual.length ? `
        <div class="space-y-3">
          ${planVsActual.map(r => `
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium">${r.product}</span>
                <span>${fmtNum(r.done)} / ${fmtNum(r.target)} <span class="text-slate-400">(${r.pct}%)</span></span>
              </div>
              <div class="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full ${r.pct>=100?'bg-brand-500':r.pct>=70?'bg-cyan-500':'bg-amber-500'}" style="width:${Math.min(100,r.pct)}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `<p class="text-slate-500 text-sm">هدفی برای امروز تعریف نشده. مدیر می‌تواند هدف بگذارد.</p>`}
    </div>

    ${Auth.isAdmin() ? `
    <div class="glass-card rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
      <div class="flex-1 min-w-[200px]">
        <div class="font-semibold text-sm">🔒 قفل روز (بستن شیفت)</div>
        <div class="text-xs text-slate-400 mt-1">بعد از قفل، ورود/تولید/ضایعات آن تاریخ تغییر یا حذف نمی‌شود</div>
      </div>
      <button class="btn-secondary text-sm" onclick="Pages.lockToday()">قفل امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.unlockToday()">باز کردن قفل امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.showDayLocks()">لیست قفل‌ها</button>
    </div>` : ''}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="stat-card">
        <div class="text-slate-400 text-xs">رکوردهای تولید</div>
        <div class="text-2xl font-bold text-brand-400">${fmtNum(productions.length)}</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">جمع فیلد مصرف *</div>
        <div class="text-2xl font-bold text-cyan-400">${fmtNum(totalWeight)}</div>
        <div class="text-[10px] text-slate-500 mt-1">* کیلو و عدد مخلوط — نمودار را ببینید</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">تعداد محصولات</div>
        <div class="text-2xl font-bold text-violet-400">${fmtNum(totalQty)}</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">رکورد ورود مواد</div>
        <div class="text-2xl font-bold text-amber-400">${fmtNum(entries.length)}</div>
      </div>
    </div>
    ${chartsHtml}
    <div class="grid lg:grid-cols-2 gap-6 mb-8">
      <div class="glass-card rounded-2xl p-5">
        <h2 class="font-semibold mb-4">📦 خلاصه موجودی مواد اولیه</h2>
        <div class="table-wrap max-h-80 overflow-y-auto">
          <table class="data">
            <thead><tr>
              <th>کد</th><th>نام</th><th>واحد</th><th>اولیه</th><th>ورود</th><th>مصرف</th><th>ضایعات</th><th>برگشت</th><th>فعلی</th><th>وضعیت</th>
            </tr></thead>
            <tbody>
              ${stock.map(m => `
                <tr>
                  <td class="text-slate-400">${m.code}</td>
                  <td class="font-medium">${m.name}</td>
                  <td>${m.unit}</td>
                  <td>${fmtNum(m.initial_stock)}</td>
                  <td class="text-brand-300">${fmtNum(m.total_in)}</td>
                  <td class="text-red-300">${fmtNum(m.total_out)}</td>
                  <td class="text-amber-300">${fmtNum(m.total_waste)}</td>
                  <td class="text-cyan-300">${fmtNum(m.total_return)}</td>
                  <td class="font-bold">${fmtNum(m.current_stock)}</td>
                  <td>${statusBadge(m.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-5">
        <h2 class="font-semibold mb-4">👨‍🍳 عملکرد پرسنل</h2>
        <div class="table-wrap max-h-80 overflow-y-auto">
          <table class="data">
            <thead><tr><th>نام</th><th>رکورد</th><th>تعداد</th><th>مصرف</th><th>مدت (دقیقه)</th></tr></thead>
            <tbody>
              ${Object.entries(pStats).sort((a, b) => b[1].count - a[1].count).map(([name, s]) => `
                <tr>
                  <td class="font-medium">${name}</td>
                  <td>${s.count}</td>
                  <td>${fmtNum(s.qty)}</td>
                  <td>${fmtNum(s.weight)}</td>
                  <td>${fmtNum(s.duration)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="glass-card rounded-2xl p-5">
      <h2 class="font-semibold mb-3">آمار سریع ضایعات</h2>
      <p class="text-slate-400 text-sm">تعداد رکورد: <span class="text-white font-medium">${wastes.length}</span> • مجموع فیلد مقدار: <span class="text-amber-300 font-medium">${fmtNum(wastes.reduce((s, w) => s + Number(w.quantity || 0), 0))}</span></p>
    </div>
  `;
};


/* ========== ENTRIES ========== */
Pages.entries = async function () {
  let entries = (await DB.getAll('entries')).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canEntry();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '';
  const dt = params.get('dt') || '';
  const q = params.get('q') || '';
  if (df || dt || q) entries = filterByDateAndSearch(entries, df, dt, q, ['material_name','supplier','invoice_no','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">ورود مواد اولیه</h1>
        <p class="text-slate-400 text-sm">ثبت ورود روزانه به انبار</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showEntryForm()">+ ثبت ورود جدید</button>` : ''}
        ${canEdit ? `<button class="btn-secondary" onclick="Pages.dedupeEntries()">🧹 پاک‌سازی تکراری‌ها</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportEntries()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfEntries()">خروجی PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو..." value="${q}" style="max-width:160px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('entries')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('entries','today')">امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('entries','week')">۷ روز</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('entries')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>ماده اولیه</th><th>مقدار</th><th>تأمین‌کننده</th><th>شماره فاکتور</th><th>ثبت‌کننده</th><th>توضیحات</th>
            ${canEdit ? '<th>عملیات</th>' : ''}
          </tr></thead>
          <tbody>
            ${entries.length ? entries.map(e => `
              <tr>
                <td>${e.date || '—'}</td>
                <td class="font-medium">${e.material_name}</td>
                <td class="text-brand-300">${fmtNum(e.quantity)}</td>
                <td>${e.supplier || '—'}</td>
                <td class="text-slate-400">${e.invoice_no || '—'}</td>
                <td class="text-brand-300 text-xs">${e.created_by || '—'}</td>
                <td class="text-slate-400 text-xs max-w-[200px] truncate">${e.notes || ''}</td>
                ${canEdit ? `<td class="space-x-1 space-x-reverse">
                  <button class="btn-ghost text-xs" onclick="Pages.showEntryForm(${e.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteEntry(${e.id})">حذف</button>
                </td>` : ''}
              </tr>
            `).join('') : '<tr><td colspan="7" class="text-center text-slate-500 py-8">رکوردی یافت نشد</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.applyFilter = function (page) {
  const df = document.getElementById('f-df')?.value || '';
  const dt = document.getElementById('f-dt')?.value || '';
  const q = document.getElementById('f-q')?.value || '';
  const p = new URLSearchParams();
  if (df) p.set('df', df);
  if (dt) p.set('dt', dt);
  if (q) p.set('q', q);
  location.hash = page + (p.toString() ? '?' + p.toString() : '');
  navigate(page);
};

Pages.clearFilter = function (page) {
  location.hash = page;
  navigate(page);
};

Pages.showEntryForm = async function (id) {
  if (!Auth.canEntry() && !id) return;
  if (id && !Auth.canEditDelete()) return toast('فقط مدیر می‌تواند ویرایش کند', 'error');
  const [materials, suppliers] = await Promise.all([
    DB.getAll('materials'),
    DB.getAll('suppliers').catch(() => []),
  ]);
  let item = { date: todayJalali(), material_name: '', quantity: '', supplier: '', invoice_no: '', notes: '' };
  if (id) item = await DB.getById('entries', id) || item;
  const supplierOpts = (suppliers || []).filter(s => s.active !== false && s.active !== 0)
    .map(s => `<option value="${s.name}" ${item.supplier===s.name?'selected':''}>${s.name}</option>`).join('');

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش ورود' : 'ثبت ورود جدید'}</h3>
      <form id="entry-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date', item.date)}</div>
        <div>
          <label class="text-xs text-slate-400">ماده اولیه</label>
          <select name="material_name" class="input-field" required>
            <option value="">انتخاب کنید</option>
            ${materials.map(m => `<option value="${m.name}" ${item.material_name===m.name?'selected':''}>${m.name} (${m.unit})</option>`).join('')}
          </select>
        </div>
        <div><label class="text-xs text-slate-400">مقدار</label><input name="quantity" type="number" step="0.01" class="input-field" value="${item.quantity || ''}" required /></div>
        <div>
          <label class="text-xs text-slate-400">طرف حساب / تأمین‌کننده</label>
          <select name="supplier" class="input-field">
            <option value="">— انتخاب یا خالی —</option>
            ${supplierOpts}
            ${item.supplier && !(suppliers||[]).some(s => s.name === item.supplier) ? `<option value="${item.supplier}" selected>${item.supplier} (قدیمی)</option>` : ''}
          </select>
          <p class="text-[10px] text-slate-500 mt-1">لیست از منوی «طرف حساب» مدیریت می‌شود</p>
        </div>
        <div><label class="text-xs text-slate-400">شماره فاکتور</label><input name="invoice_no" class="input-field" value="${item.invoice_no || ''}" /></div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes || ''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('entry-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.quantity = Number(data.quantity);
      data.created_at = item.created_at || new Date().toISOString();
      if (id) { data.id = id; await DB.put('entries', data); toast('ویرایش شد', 'success'); }
      else { await DB.add('entries', data); toast('ورود ثبت شد', 'success'); }
      closeModal();
      navigate('entries');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.deleteEntry = async function (id) {
  if (!Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  if (!confirmAction('حذف این رکورد ورود؟ این کار برگشت‌ناپذیر است.')) return;
  await DB.remove('entries', id);
  toast('حذف شد', 'success');
  navigate('entries');
};

/** پاک‌سازی ورودهای تکراری: کلید = تاریخ + ماده + مقدار (+ فاکتور اگر باشد) */
Pages.dedupeEntries = async function () {
  if (!Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  try {
    const entries = await DB.getAll('entries');
    if (!entries || entries.length < 2) {
      toast('رکوردی برای مقایسه نیست', 'info');
      return;
    }
    // group by composite key
    const groups = {};
    entries.forEach(e => {
      const qty = Number(e.quantity);
      const key = [
        String(e.date || '').trim(),
        String(e.material_name || '').trim(),
        String(isNaN(qty) ? e.quantity : qty),
        String(e.invoice_no || '').trim(),
      ].join('||');
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    const toRemove = [];
    const samples = [];
    Object.values(groups).forEach(list => {
      if (list.length < 2) return;
      // keep lowest id (oldest), remove the rest
      list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      const keep = list[0];
      const dups = list.slice(1);
      dups.forEach(d => toRemove.push(d));
      samples.push(keep.date + ' · ' + keep.material_name + ' · ' + keep.quantity + ' (×' + list.length + ')');
    });
    if (!toRemove.length) {
      toast('تکراری پیدا نشد ✓', 'success');
      return;
    }
    const preview = samples.slice(0, 8).join('\n') + (samples.length > 8 ? '\n…' : '');
    if (!confirmAction(
      toRemove.length + ' رکورد تکراری پیدا شد.\n' +
      'از هر گروه قدیمی‌ترین نگه داشته می‌شود.\n\n' +
      preview + '\n\nادامه برای حذف نرم تکراری‌ها؟'
    )) return;

    let ok = 0;
    let fail = 0;
    for (const d of toRemove) {
      try {
        await DB.remove('entries', d.id);
        ok++;
      } catch (err) {
        console.error('dedupe remove', d.id, err);
        fail++;
      }
    }
    toast(
      'پاک‌سازی: ' + ok + ' حذف شد' + (fail ? ' · ' + fail + ' خطا' : ''),
      fail ? 'error' : 'success'
    );
    navigate('entries');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در پاک‌سازی', 'error');
  }
};

Pages.exportEntries = async function () {
  const entries = await DB.getAll('entries');
  exportToExcel(entries.map(e => ({
    'تاریخ': e.date, 'ماده اولیه': e.material_name, 'مقدار': e.quantity, 'ثبت‌کننده': e.created_by || '',
    'تأمین‌کننده': e.supplier, 'شماره فاکتور': e.invoice_no, 'توضیحات': e.notes
  })), 'ورود', 'ورود_مواد_اولیه');
};

Pages.pdfEntries = async function () {
  const entries = await DB.getAll('entries');
  exportToPDF('گزارش ورود مواد', [
    { header: 'تاریخ', key: 'date' }, { header: 'ماده', key: 'material_name' },
    { header: 'مقدار', key: 'quantity' }, { header: 'تأمین‌کننده', key: 'supplier' }
  ], entries, 'ورود_مواد');
};

/* ========== WASTES ========== */
Pages.wastes = async function () {
  let wastes = (await DB.getAll('wastes')).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canEntry();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '', dt = params.get('dt') || '', q = params.get('q') || '';
  if (df || dt || q) wastes = filterByDateAndSearch(wastes, df, dt, q, ['material_name','waste_type','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">ثبت ضایعات</h1>
        <p class="text-slate-400 text-sm">چربی، استخوان، آشغال مرغ و ... از وزن موجودی کم می‌شود</p>
      </div>
      <div class="flex gap-2">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showWasteForm()">+ ثبت ضایعات</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportWastes()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfWastes()">PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو..." value="${q}" style="max-width:160px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('wastes')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('wastes','today')">امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('wastes','week')">۷ روز</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('wastes')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>ماده اولیه</th><th>نوع ضایعات</th><th>وزن (کیلو)</th><th>ثبت‌کننده</th><th>یادداشت</th>
            ${canEdit ? '<th>عملیات</th>' : ''}
          </tr></thead>
          <tbody>
            ${wastes.length ? wastes.map(w => `
              <tr>
                <td>${w.date}</td>
                <td class="font-medium">${w.material_name}</td>
                <td><span class="badge badge-warn">${w.waste_type}</span></td>
                <td class="text-amber-300">${fmtNum(w.quantity)}</td>
                <td class="text-brand-300 text-xs">${w.created_by || '—'}</td>
                <td class="text-slate-400 text-xs">${w.notes || ''}</td>
                ${canEdit ? `<td><button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteWaste(${w.id})">حذف</button></td>` : ''}
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">ضایعاتی ثبت نشده</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showWasteForm = async function () {
  if (!Auth.canEntry()) return;
  const materials = await DB.getAll('materials');
  const wasteTypes = ['چربی', 'استخوان', 'آشغال مرغ', 'پوست', 'خونابه', 'سایر'];

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">ثبت ضایعات</h3>
      <form id="waste-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date')}</div>
        <div>
          <label class="text-xs text-slate-400">ماده اولیه مرتبط</label>
          <select name="material_name" class="input-field" required>
            <option value="">انتخاب</option>
            ${materials.map(m => `<option value="${m.name}">${m.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع ضایعات</label>
          <select name="waste_type" class="input-field" required>
            ${wasteTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div><label class="text-xs text-slate-400">وزن ضایعات (کیلوگرم)</label><input name="quantity" type="number" step="0.01" class="input-field" required /></div>
        <div><label class="text-xs text-slate-400">یادداشت</label><textarea name="notes" class="input-field" rows="2"></textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ثبت</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('waste-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(ev.target).entries());
    data.quantity = Number(data.quantity);
    data.created_at = new Date().toISOString();
    await DB.add('wastes', data);
    toast('ضایعات ثبت شد و از موجودی کسر می‌شود', 'success');
    closeModal();
    navigate('wastes');
  };
};

Pages.deleteWaste = async function (id) {
  if (!Auth.canEditDelete()) return;
  if (!confirmAction('حذف این رکورد؟ برگشت‌ناپذیر است.')) return;
  await DB.remove('wastes', id);
  toast('حذف شد', 'success');
  navigate('wastes');
};

Pages.exportWastes = async function () {
  const wastes = await DB.getAll('wastes');
  exportToExcel(wastes.map(w => ({
    'تاریخ': w.date, 'ماده اولیه': w.material_name, 'نوع ضایعات': w.waste_type, 'ثبت‌کننده': w.created_by || '',
    'وزن': w.quantity, 'یادداشت': w.notes
  })), 'ضایعات', 'گزارش_ضایعات');
};

Pages.pdfWastes = async function () {
  const wastes = await DB.getAll('wastes');
  exportToPDF('گزارش ضایعات', [
    { header: 'تاریخ', key: 'date' }, { header: 'ماده', key: 'material_name' },
    { header: 'نوع', key: 'waste_type' }, { header: 'وزن', key: 'quantity' }
  ], wastes, 'ضایعات');
};

/* ========== PRODUCTIONS ========== */
Pages.productions = async function () {
  let list = (await DB.getAll('productions')).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canProduction();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '', dt = params.get('dt') || '', q = params.get('q') || '';
  if (df || dt || q) list = filterByDateAndSearch(list, df, dt, q, ['product_name','material_name','producer_name','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">تولید روزانه</h1>
        <p class="text-slate-400 text-sm">ثبت سیخ‌ها و محصولات تولید شده</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showProdForm()">+ ثبت تولید</button>` : ''}
        ${canEdit ? `<button class="btn-secondary" onclick="Pages.dedupeProductions()">🧹 پاک‌سازی تکراری‌ها</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportProds()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfProds()">PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو محصول/پرسنل..." value="${q}" style="max-width:180px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('productions')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('productions','today')">امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('productions','week')">۷ روز</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('productions')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>محصول</th><th>تعداد</th><th>وزن مصرفی</th><th>ماده اولیه</th><th>تولیدکننده</th><th>ثبت‌کننده</th><th>مدت</th>
            <th>عملیات</th>
          </tr></thead>
          <tbody>
            ${list.length ? list.map(p => `
              <tr>
                <td>${p.date}</td>
                <td class="font-medium">${p.product_name}</td>
                <td>${fmtNum(p.quantity)}</td>
                <td class="text-red-300">${fmtNum(p.material_weight)}</td>
                <td class="text-slate-400">${p.material_name}</td>
                <td>${p.producer_name || '—'}</td>
                <td class="text-brand-300 text-xs">${p.created_by || '—'}</td>
                <td>${p.duration_minutes ? fmtNum(p.duration_minutes) + ' د' : '—'}</td>
                <td class="whitespace-nowrap">
                  <button class="btn-ghost text-xs" onclick="Pages.printProd(${p.id})">فیش</button>
                  ${canEdit ? `
                  <button class="btn-ghost text-xs" onclick="Pages.showProdForm(${p.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteProd(${p.id})">حذف</button>` : ''}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="text-center text-slate-500 py-8">رکوردی نیست</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showProdForm = async function (id) {
  if (!Auth.canProduction() && !id) return;
  if (id && !Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  let item = { date: todayJalali(), product_name: '', quantity: '', material_weight: '', material_name: '', shift_code: '', start_time: '', end_time: '', duration_minutes: '', producer_name: '', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' };
  const [products, personnel, item0] = await Promise.all([
    DB.getAll('products'),
    DB.getAll('personnel'),
    id ? DB.getById('productions', id) : Promise.resolve(null),
  ]);
  if (id) item = item0 || item;

  showModal(`
    <div class="modal" style="max-width:36rem">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش تولید' : 'ثبت تولید جدید'}</h3>
      <form id="prod-form" class="space-y-3 max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date', item.date)}</div>
          <div>
            <label class="text-xs text-slate-400">محصول</label>
            <select name="product_name" id="prod-product" class="input-field" required>
              <option value="">انتخاب</option>
              ${products.filter(p=>p.active!==false && p.name).map(p => `<option value="${p.name}" data-mat="${p.material_name}" data-w="${p.weight_per_unit}" data-rem="${p.remainder_type}" ${item.product_name===p.name?'selected':''}>${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تعداد تولید</label><input name="quantity" id="prod-qty" type="number" step="0.5" class="input-field" value="${item.quantity||''}" required /></div>
          <div><label class="text-xs text-slate-400">وزن مصرفی مواد (کیلو)</label><input name="material_weight" id="prod-weight" type="number" step="0.001" class="input-field" value="${item.material_weight||''}" required /></div>
        </div>
        <div><label class="text-xs text-slate-400">ماده اولیه (خودکار)</label><input name="material_name" id="prod-mat" class="input-field" value="${item.material_name||''}" readonly /></div>
        <div>
          <label class="text-xs text-slate-400">تولیدکننده</label>
          <select name="producer_name" class="input-field">
            <option value="">—</option>
            ${personnel.filter(p=>p.active!==false && (p.team||'executive')==='executive').map(p => `<option value="${p.name}" ${item.producer_name===p.name?'selected':''}>${p.name} (${p.position||''})</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div><label class="text-xs text-slate-400">کد شیفت</label><input name="shift_code" class="input-field" value="${item.shift_code||''}" /></div>
          <div><label class="text-xs text-slate-400">شروع</label><input name="start_time" type="time" class="input-field" value="${item.start_time||''}" /></div>
          <div><label class="text-xs text-slate-400">پایان</label><input name="end_time" type="time" class="input-field" value="${item.end_time||''}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">مدت (دقیقه)</label><input name="duration_minutes" type="number" class="input-field" value="${item.duration_minutes||''}" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تعداد باقیمانده</label><input name="remainder_count" type="number" class="input-field" value="${item.remainder_count||0}" /></div>
          <div><label class="text-xs text-slate-400">وزن باقیمانده (کیلو)</label><input name="remainder_weight" type="number" step="0.001" class="input-field" value="${item.remainder_weight||0}" /></div>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع باقیمانده</label>
          <select name="remainder_type" id="prod-rem" class="input-field">
            <option value="حمل به روز بعد" ${item.remainder_type==='حمل به روز بعد'?'selected':''}>حمل به روز بعد</option>
            <option value="برگشت به مواد" ${item.remainder_type==='برگشت به مواد'?'selected':''}>برگشت به مواد (ثبت خودکار)</option>
          </select>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  const prodSelect = document.getElementById('prod-product');
  const qtyInput = document.getElementById('prod-qty');
  const weightInput = document.getElementById('prod-weight');
  const matInput = document.getElementById('prod-mat');
  const remSelect = document.getElementById('prod-rem');

  function updateFromProduct() {
    const opt = prodSelect.selectedOptions[0];
    if (!opt || !opt.value) return;
    matInput.value = opt.dataset.mat || '';
    remSelect.value = opt.dataset.rem || 'حمل به روز بعد';
    const wpu = Number(opt.dataset.w || 0);
    const qty = Number(qtyInput.value || 0);
    if (qty && wpu) weightInput.value = (qty * wpu / 1000).toFixed(3);
  }
  prodSelect.onchange = updateFromProduct;
  qtyInput.oninput = updateFromProduct;

  document.getElementById('prod-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.quantity = Number(data.quantity);
      data.material_weight = Number(data.material_weight);
      data.duration_minutes = data.duration_minutes ? Number(data.duration_minutes) : null;
      data.remainder_count = Number(data.remainder_count || 0);
      data.remainder_weight = Number(data.remainder_weight || 0);
      data.created_at = item.created_at || new Date().toISOString();
      if (id) {
        data.id = id;
        await DB.updateProductionWithReturn(data);
        toast('ویرایش شد (برگشت خودکار به‌روز شد)', 'success');
      } else {
        await DB.addProductionWithReturn(data);
        toast('تولید ثبت شد' + (data.remainder_type === 'برگشت به مواد' && data.remainder_weight > 0 ? ' + برگشت به مواد' : ''), 'success');
      }
      closeModal();
      navigate('productions');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره تولید', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.printProd = async function (id) {
  const p = await DB.getById('productions', id);
  if (!p) return toast('یافت نشد', 'error');
  printReceipt(p);
};

Pages.deleteProd = async function (id) {
  if (!Auth.canEditDelete()) return;
  if (!confirmAction('حذف این رکورد؟ برگشت‌ناپذیر است.')) return;
  // also remove linked returns
  const returns = await DB.getAll('returns');
  for (const r of returns) if (r.production_id === id) await DB.remove('returns', r.id);
  await DB.remove('productions', id);
  toast('حذف شد', 'success');
  navigate('productions');
};

/** پاک‌سازی تولیدهای تکراری: تاریخ + محصول + تعداد + وزن ماده + تولیدکننده */
Pages.dedupeProductions = async function () {
  if (!Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  try {
    const list = await DB.getAll('productions');
    if (!list || list.length < 2) {
      toast('رکوردی برای مقایسه نیست', 'info');
      return;
    }
    const groups = {};
    list.forEach(p => {
      const qty = Number(p.quantity);
      const w = Number(p.material_weight);
      const key = [
        String(p.date || '').trim(),
        String(p.product_name || '').trim(),
        String(isNaN(qty) ? p.quantity : qty),
        String(isNaN(w) ? p.material_weight : w),
        String(p.producer_name || '').trim(),
        String(p.material_name || '').trim(),
      ].join('||');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    const toRemove = [];
    const samples = [];
    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      g.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      g.slice(1).forEach(d => toRemove.push(d));
      const keep = g[0];
      samples.push(keep.date + ' · ' + keep.product_name + ' · ' + keep.quantity + ' (×' + g.length + ')');
    });
    if (!toRemove.length) {
      toast('تکراری پیدا نشد ✓', 'success');
      return;
    }
    const preview = samples.slice(0, 8).join('\n') + (samples.length > 8 ? '\n…' : '');
    if (!confirmAction(
      toRemove.length + ' رکورد تولید تکراری پیدا شد.\n' +
      'از هر گروه قدیمی‌ترین نگه داشته می‌شود.\n\n' +
      preview + '\n\nادامه برای حذف نرم تکراری‌ها؟'
    )) return;
    let ok = 0, fail = 0;
    for (const d of toRemove) {
      try {
        const returns = await DB.getAll('returns');
        for (const r of returns) {
          if (r.production_id === d.id) {
            try { await DB.remove('returns', r.id); } catch (_) {}
          }
        }
        await DB.remove('productions', d.id);
        ok++;
      } catch (err) {
        console.error('dedupe prod', d.id, err);
        fail++;
      }
    }
    toast('پاک‌سازی تولید: ' + ok + ' حذف شد' + (fail ? ' · ' + fail + ' خطا' : ''), fail ? 'error' : 'success');
    navigate('productions');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در پاک‌سازی', 'error');
  }
};

Pages.exportProds = async function () {
  const list = await DB.getAll('productions');
  exportToExcel(list.map(p => ({
    'تاریخ': p.date, 'محصول': p.product_name, 'تعداد': p.quantity, 'ثبت‌کننده': p.created_by || '',
    'وزن مصرفی': p.material_weight, 'ماده اولیه': p.material_name,
    'شیفت': p.shift_code, 'شروع': p.start_time, 'پایان': p.end_time,
    'مدت': p.duration_minutes, 'تولیدکننده': p.producer_name,
    'باقیمانده تعداد': p.remainder_count, 'وزن باقیمانده': p.remainder_weight,
    'نوع باقیمانده': p.remainder_type, 'توضیحات': p.notes
  })), 'تولید', 'گزارش_تولید_روزانه');
};

Pages.pdfProds = async function () {
  const list = await DB.getAll('productions');
  exportToPDF('گزارش تولید', [
    { header: 'تاریخ', key: 'date' }, { header: 'محصول', key: 'product_name' },
    { header: 'تعداد', key: 'quantity' }, { header: 'وزن', key: 'material_weight' },
    { header: 'تولیدکننده', key: 'producer_name' }
  ], list, 'تولید');
};

/* ========== MATERIALS ========== */
Pages.materials = async function () {
  const stock = await DB.calcStock();
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">مواد اولیه</h1>
        <p class="text-slate-400 text-sm">لیست و موجودی لحظه‌ای</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn-secondary" onclick="Pages.materialPeriodForm()">📦 گزارش بازه</button>
        ${canEdit ? `<button class="btn-primary" onclick="Pages.showMaterialForm()">+ افزودن ماده</button>` : ''}
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>واحد</th><th>واحد فرعی</th><th>موجودی اولیه</th><th>حداقل هشدار</th>
            <th>کل ورود</th><th>کل مصرف</th><th>ضایعات</th><th>برگشت</th><th>موجودی فعلی</th><th>وضعیت</th>
            ${canEdit ? '<th></th>' : ''}
          </tr></thead>
          <tbody>
            ${stock.map(m => `
              <tr>
                <td class="text-slate-400">${m.code}</td>
                <td class="font-medium">${m.name}</td>
                <td>${m.unit}</td>
                <td class="text-slate-400 text-xs">${m.secondary_unit ? (m.secondary_unit + (m.unit_factor ? ' (×' + m.unit_factor + ')' : '')) : '—'}</td>
                <td>${fmtNum(m.initial_stock)}</td>
                <td>${fmtNum(m.min_alert)}</td>
                <td class="text-brand-300">${fmtNum(m.total_in)}</td>
                <td class="text-red-300">${fmtNum(m.total_out)}</td>
                <td class="text-amber-300">${fmtNum(m.total_waste)}</td>
                <td class="text-cyan-300">${fmtNum(m.total_return)}</td>
                <td class="font-bold text-lg">${fmtNum(m.current_stock)}</td>
                <td>${statusBadge(m.status)}</td>
                ${canEdit ? `<td><button class="btn-ghost text-xs" onclick="Pages.showMaterialForm(${m.id})">ویرایش</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showMaterialForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { code: '', name: '', unit: 'کیلوگرم', secondary_unit: '', unit_factor: '', initial_stock: 0, min_alert: 0, description: '', active: true };
  if (id) item = await DB.getById('materials', id) || item;
  else if (typeof nextCode === 'function') item.code = await nextCode('materials', 'M');

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش ماده' : 'افزودن ماده اولیه'}</h3>
      <form id="mat-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">کد (خودکار)</label><input name="code" class="input-field" value="${item.code||''}" required readonly /></div>
          <div><label class="text-xs text-slate-400">واحد اصلی</label><input name="unit" class="input-field" value="${item.unit||'کیلوگرم'}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="${item.name||''}" required /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">واحد فرعی (اختیاری)</label><input name="secondary_unit" class="input-field" value="${item.secondary_unit||''}" placeholder="مثلاً عدد" /></div>
          <div><label class="text-xs text-slate-400">ضریب تبدیل (۱ اصلی = ؟ فرعی)</label><input name="unit_factor" type="number" step="0.01" class="input-field" value="${item.unit_factor||''}" placeholder="مثلاً 10" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">موجودی اولیه</label><input name="initial_stock" type="number" step="0.01" class="input-field" value="${item.initial_stock||0}" /></div>
          <div><label class="text-xs text-slate-400">حداقل هشدار</label><input name="min_alert" type="number" step="0.01" class="input-field" value="${item.min_alert||0}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="description" class="input-field" rows="2">${item.description||''}</textarea></div>
        <p class="text-[10px] text-slate-500">واحد فرعی فقط برای نمایش است و روی محاسبه موجودی تأثیر ندارد.</p>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('mat-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.initial_stock = Number(data.initial_stock);
      data.min_alert = Number(data.min_alert);
      data.unit_factor = data.unit_factor !== '' ? Number(data.unit_factor) : null;
      data.active = 1;
      if (id) { data.id = id; await DB.put('materials', data); }
      else await DB.add('materials', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('materials');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره ماده', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

/* ========== PRODUCTS ========== */
Pages.products = async function () {
  const list = await DB.getAll('products');
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">انواع محصول</h1>
        <p class="text-slate-400 text-sm">تعریف سیخ‌ها و محصولات</p>
      </div>
      ${canEdit ? `<button class="btn-primary" onclick="Pages.showProductForm()">+ افزودن محصول</button>` : ''}
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>وزن واحد (گرم)</th><th>ماده اولیه</th><th>نوع باقیمانده</th>
            ${canEdit ? '<th></th>' : ''}
          </tr></thead>
          <tbody>
            ${list.filter(p=>p.name).map(p => `
              <tr>
                <td class="text-slate-400">${p.code}</td>
                <td class="font-medium">${p.name}</td>
                <td>${fmtNum(p.weight_per_unit)}</td>
                <td>${p.material_name}</td>
                <td><span class="badge ${p.remainder_type==='برگشت به مواد'?'badge-warn':'badge-ok'}">${p.remainder_type}</span></td>
                ${canEdit ? `<td><button class="btn-ghost text-xs" onclick="Pages.showProductForm(${p.id})">ویرایش</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showProductForm = async function (id) {
  if (!Auth.isAdmin()) return;
  const materials = await DB.getAll('materials');
  let item = { code: '', name: '', weight_per_unit: 100, material_name: '', description: '', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true };
  if (id) item = await DB.getById('products', id) || item;
  else if (typeof nextCode === 'function') item.code = await nextCode('products', 'P');

  let hasRecipe = false;
  try {
    const recipes = (await DB.getAll('recipes')) || [];
    hasRecipe = recipes.some(r => r.product_name === item.name);
  } catch (e) {}
  const isMultiDefault = hasRecipe || item.material_name === 'ترکیبی' || !item.material_name;

  showModal(`
    <div class="modal" style="max-width:36rem">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش محصول' : 'افزودن محصول'}</h3>
      <form id="proddef-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">کد (خودکار)</label><input name="code" class="input-field" value="${item.code||''}" required readonly /></div>
          <div><label class="text-xs text-slate-400">وزن هر عدد (گرم)</label><input name="weight_per_unit" type="number" class="input-field" value="${item.weight_per_unit||100}" required /></div>
        </div>
        <div><label class="text-xs text-slate-400">نام محصول</label><input name="name" class="input-field" value="${item.name||''}" required placeholder="مثلاً خورشت قورمه" /></div>
        <div>
          <label class="text-xs text-slate-400">نوع مصرف مواد</label>
          <select id="prod-consume-type" class="input-field">
            <option value="single" ${!isMultiDefault ? 'selected' : ''}>تک‌ماده‌ای (جوجه، کباب، …)</option>
            <option value="multi" ${isMultiDefault ? 'selected' : ''}>چندماده‌ای — دستور ساخت (قورمه، برنج، …)</option>
          </select>
          <p class="text-[10px] text-slate-500 mt-1">چندماده‌ای: بعد از ذخیره از دکمه «دستور» مواد را تعریف کنید. موجودی فقط از روی دستور/تولید کم می‌شود — دوبار کم نمی‌شود.</p>
        </div>
        <div id="prod-single-mat">
          <label class="text-xs text-slate-400">ماده اولیه مصرفی</label>
          <select name="material_name" id="prod-mat-select" class="input-field">
            <option value="">— انتخاب —</option>
            ${materials.filter(m=>m.active!==false&&m.active!==0).map(m => `<option value="${m.name}" ${item.material_name===m.name?'selected':''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع باقیمانده</label>
          <select name="remainder_type" class="input-field">
            <option value="حمل به روز بعد" ${item.remainder_type==='حمل به روز بعد'?'selected':''}>حمل به روز بعد</option>
            <option value="برگشت به مواد" ${item.remainder_type==='برگشت به مواد'?'selected':''}>برگشت به مواد</option>
          </select>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="description" class="input-field" rows="2">${item.description||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  const typeSel = document.getElementById('prod-consume-type');
  const singleBox = document.getElementById('prod-single-mat');
  const matSel = document.getElementById('prod-mat-select');
  function syncType() {
    if (typeSel.value === 'multi') {
      singleBox.style.opacity = '0.5';
      matSel.removeAttribute('required');
    } else {
      singleBox.style.opacity = '1';
      matSel.setAttribute('required', 'required');
    }
  }
  typeSel.onchange = syncType;
  syncType();

  document.getElementById('proddef-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.weight_per_unit = Number(data.weight_per_unit);
      data.active = 1;
      if (typeSel.value === 'multi') {
        data.material_name = data.material_name || 'ترکیبی';
      } else if (!data.material_name) {
        toast('برای محصول تک‌ماده‌ای، ماده را انتخاب کنید', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
        return;
      }
      if (id) { data.id = id; await DB.put('products', data); }
      else await DB.add('products', data);
      toast(typeSel.value === 'multi' ? 'ذخیره شد — از «دستور» مواد را تعریف کنید' : 'ذخیره شد', 'success');
      closeModal();
      navigate('products');
      if (!id && typeSel.value === 'multi' && data.name && typeof Pages.editRecipe === 'function') {
        setTimeout(function () { Pages.editRecipe(data.name); }, 400);
      }
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره محصول', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

/* ========== PERSONNEL ========== */
Pages.personnel = async function () {
  const list = await DB.getAll('personnel');
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">پرسنل تولید</h1>
        <p class="text-slate-400 text-sm">لیست کارکنان آشپزخانه</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary" onclick="Pages.staffReportPrompt()">گزارش کار پرسنل</button>
        ${canEdit ? `<button class="btn-primary" onclick="Pages.showPersonForm()">+ افزودن پرسنل</button>` : ''}
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>سمت</th><th>فعال</th><th></th>
          </tr></thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td class="text-slate-400">${p.code}</td>
                <td class="font-medium">${p.name}</td>
                <td>${p.position || '—'}</td>
                <td>${p.active !== false ? '<span class="badge badge-ok">بله</span>' : '<span class="badge badge-danger">خیر</span>'}</td>
                <td class="space-x-1 space-x-reverse whitespace-nowrap">
                  <button class="btn-ghost text-xs text-brand-300" onclick="Pages.staffReportPrompt('${String(p.name||'').replace(/'/g, "\\'")}')">گزارش کار</button>
                  ${canEdit ? `<button class="btn-ghost text-xs" onclick="Pages.showPersonForm(${p.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deletePerson(${p.id}, '${String(p.name||'').replace(/'/g, "\\'")}')">حذف</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showPersonForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { code: '', name: '', position: '', active: true };
  if (id) item = await DB.getById('personnel', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش پرسنل' : 'افزودن پرسنل'}</h3>
      <form id="person-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="${item.code||''}" required ${id?'readonly':''} /></div>
        <div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="${item.name||''}" required /></div>
        <div><label class="text-xs text-slate-400">سمت</label><input name="position" class="input-field" value="${item.position||''}" /></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('person-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) { data.id = id; await DB.put('personnel', data); }
      else await DB.add('personnel', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('personnel');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره پرسنل', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};


Pages.deletePerson = async function (id, name) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (!confirmAction('پرسنل «' + (name || id) + '» حذف شود؟')) return;
  try {
    await DB.remove('personnel', id);
    toast('پرسنل حذف شد', 'success');
    navigate('personnel');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در حذف پرسنل', 'error');
  }
};



/* ========== SUPPLIERS / طرف حساب ========== */
Pages.suppliers = async function () {
  let list = [];
  try { list = await DB.getAll('suppliers'); } catch (e) { list = []; }
  const canEdit = Auth.isAdmin() || Auth.canEntry();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">طرف حساب / تأمین‌کننده‌ها</h1>
        <p class="text-slate-400 text-sm">برای انتخاب در فرم ورود مواد</p>
      </div>
      <div class="flex gap-2">
        ${canEdit ? `<button class="btn-primary" onclick="Pages.showSupplierForm()">+ افزودن طرف حساب</button>` : ''}
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>تلفن</th><th>توضیح</th><th>فعال</th><th></th>
          </tr></thead>
          <tbody>
            ${list.length ? list.map(s => `
              <tr>
                <td class="text-slate-400">${s.code || '—'}</td>
                <td class="font-medium">${s.name || '—'}</td>
                <td>${s.phone || '—'}</td>
                <td class="text-slate-400 text-sm">${s.notes || '—'}</td>
                <td>${s.active !== false && s.active !== 0 ? '<span class="badge badge-ok">بله</span>' : '<span class="badge badge-danger">خیر</span>'}</td>
                <td class="whitespace-nowrap">
                  ${canEdit ? `<button class="btn-ghost text-xs" onclick="Pages.showSupplierForm(${s.id})">ویرایش</button>
                  ${Auth.isAdmin() ? `<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteSupplier(${s.id})">حذف</button>` : ''}` : ''}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">هنوز طرف حسابی ثبت نشده</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showSupplierForm = async function (id) {
  if (!Auth.isAdmin() && !Auth.canEntry()) return toast('دسترسی ندارید', 'error');
  let item = { code: '', name: '', phone: '', notes: '', active: 1 };
  if (id) item = await DB.getById('suppliers', id) || item;
  else if (typeof nextCode === 'function') item.code = await nextCode('suppliers', 'SP');

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش طرف حساب' : 'افزودن طرف حساب'}</h3>
      <form id="supplier-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="${item.code||''}" required ${id?'readonly':''} placeholder="مثلاً S-010" /></div>
        <div><label class="text-xs text-slate-400">نام / عنوان</label><input name="name" class="input-field" value="${item.name||''}" required placeholder="مثلاً زربال" /></div>
        <div><label class="text-xs text-slate-400">تلفن</label><input name="phone" class="input-field" value="${item.phone||''}" /></div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('supplier-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) { data.id = id; await DB.put('suppliers', data); }
      else await DB.add('suppliers', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('suppliers');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.deleteSupplier = async function (id) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (!confirmAction('این طرف حساب حذف شود؟')) return;
  try {
    await DB.remove('suppliers', id);
    toast('حذف شد', 'success');
    navigate('suppliers');
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};

/* ========== REPORTS ========== */
Pages.reports = async function () {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold">گزارش‌ها و پشتیبان‌گیری</h1>
      <p class="text-slate-400 text-sm">خروجی اکسل / PDF و بک‌آپ کامل سیستم</p>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="glass-card rounded-2xl p-6 space-y-3">
        <h2 class="font-semibold">گزارش‌های اکسل</h2>
        <button class="btn-secondary w-full" onclick="Pages.exportEntries()">📥 گزارش ورود مواد</button>
        <button class="btn-secondary w-full" onclick="Pages.exportProds()">📥 گزارش تولید</button>
        <button class="btn-secondary w-full" onclick="Pages.exportWastes()">📥 گزارش ضایعات</button>
        <button class="btn-secondary w-full" onclick="Pages.exportStock()">📥 گزارش موجودی تفصیلی</button>
        <button class="btn-secondary w-full" onclick="Pages.staffReportPrompt()">👤 گزارش کار یک پرسنل</button>
        <button class="btn-secondary w-full" onclick="Pages.staffMealReportForm()">🍽️ گزارش حضور و غذای پرسنلی</button>
        <button class="btn-secondary w-full" onclick="Pages.staffMealWhatsApp()">📱 واتساپ حضور و غذا (امروز)</button>
        <button class="btn-secondary w-full" onclick="Pages.transferReportForm()">🚚 گزارش ارسال شعبه</button>
        <button class="btn-secondary w-full" onclick="Pages.transferWhatsApp()">📱 واتساپ ارسال شعبه (امروز)</button>
        <button class="btn-secondary w-full" onclick="navigate('stocktake')">📋 انبارگردانی</button>
        <button class="btn-primary w-full" onclick="Pages.materialPeriodForm()">📦 گزارش بازه ماده (ورود تا اتمام)</button>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3">
        <h2 class="font-semibold">گزارش‌های PDF</h2>
        <button class="btn-secondary w-full" onclick="Pages.pdfEntries()">📄 PDF ورود</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfProds()">📄 PDF تولید</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfWastes()">📄 PDF ضایعات</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfStock()">📄 PDF موجودی</button>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2">
        <h2 class="font-semibold">پشتیبان‌گیری کامل (اشتراک بین دستگاه‌ها)</h2>
        <p class="text-sm text-slate-400">تمام داده‌ها به صورت JSON دانلود می‌شود. روی دستگاه دیگر Import کنید تا همگام شود.</p>
        <div class="flex flex-wrap gap-3">
          <button class="btn-primary" onclick="Pages.doBackup()">💾 دانلود پشتیبان کامل</button>
          <label class="btn-secondary cursor-pointer">
            📤 بازیابی از پشتیبان
            <input type="file" accept=".json" class="hidden" onchange="Pages.doRestore(event)" />
          </label>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2">
        <h2 class="font-semibold">📋 سابقه حذف‌ها (ممیزی)</h2>
        <p class="text-xs text-slate-400">چه کسی چه رکوردی را حذف کرده است — فقط مدیر</p>
        <button class="btn-secondary" onclick="Pages.showAuditLog()">نمایش سابقه حذف</button>
        <div id="audit-box" class="hidden mt-3 max-h-96 overflow-y-auto"></div>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2 border border-brand-500/20">
        <h2 class="font-semibold text-brand-300">☁️ همگام‌سازی Cloudflare (real-time)</h2>
        <p class="text-sm text-slate-400 leading-relaxed">
          برای اشتراک لحظه‌ای بین چند دستگاه، Worker و D1 را دیپلوی کنید (پوشه <code class="text-brand-300">workers/</code>).
          سپس آدرس API را اینجا ذخیره کنید. فعلاً داده‌ها محلی (IndexedDB) هستند.
        </p>
        <div class="flex flex-wrap gap-2 items-center">
          <input id="api-url" class="input-field" style="max-width:320px" placeholder="https://kitchen-api.xxx.workers.dev" value="${localStorage.getItem('kitchen_api_url') || ''}" />
          <button class="btn-secondary text-sm" onclick="localStorage.setItem('kitchen_api_url', document.getElementById('api-url').value); toast('آدرس API ذخیره شد','success')">ذخیره آدرس API</button>
        </div>
        <ol class="text-xs text-slate-500 list-decimal list-inside space-y-1 mt-2">
          <li>در Cloudflare یک D1 بسازید و <code>wrangler d1 execute</code> با <code>shared/schema.sql</code> اجرا کنید</li>
          <li><code>cd workers && npx wrangler deploy</code> (database_id را در wrangler.toml بگذارید)</li>
          <li>آدرس Worker را بالا وارد کنید — نسخه بعدی فرانت به‌صورت خودکار از API می‌خواند</li>
        </ol>
      </div>
    </div>
  `;
};

/* ========== گزارش بازه ماده (از ورود تا اتمام) ========== */
Pages.materialPeriodForm = async function () {
  try {
    const materials = await DB.getAll('materials');
    const active = (materials || []).filter(m => m.active !== false && m.active !== 0);
    const today = todayJalali();
    const opts = active.map(m =>
      `<option value="${String(m.name).replace(/"/g, '&quot;')}">${m.name} (${m.unit || ''})</option>`
    ).join('');
    showModal(`
      <div class="modal max-w-md">
        <h3 class="text-lg font-bold mb-2">📦 گزارش بازه ماده</h3>
        <p class="text-xs text-slate-400 mb-4">از تاریخ ورود تا تاریخ اتمام موجودی — ورود، ضایعات، مصرف تولید و ضریب</p>
        <form id="mat-period-form" class="space-y-3">
          <div>
            <label class="text-xs text-slate-400">ماده اولیه</label>
            <select name="material_name" class="input-field" required>
              <option value="">انتخاب کنید</option>
              ${opts}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-slate-400">از تاریخ</label>${jalaliInput('df', today)}</div>
            <div><label class="text-xs text-slate-400">تا تاریخ</label>${jalaliInput('dt', today)}</div>
          </div>
          <p class="text-[10px] text-slate-500">مثال: ورود ۶۰ کیلو سینه → از تاریخ ورود تا روزی که موجودی تموم شد</p>
          <div class="flex gap-2 pt-1">
            <button type="submit" class="btn-primary flex-1">محاسبه گزارش</button>
            <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
          </div>
        </form>
      </div>
    `);
    document.getElementById('mat-period-form').onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const material = String(fd.get('material_name') || '').trim();
      const df = String(fd.get('df') || '').trim();
      const dt = String(fd.get('dt') || '').trim();
      if (!material) return toast('ماده را انتخاب کنید', 'error');
      closeModal();
      await Pages.materialPeriodReport(material, df, dt);
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.materialPeriodReport = async function (material, df, dt) {
  try {
    const [entries, wastes, productions, returns, materials, products] = await Promise.all([
      DB.getAll('entries'),
      DB.getAll('wastes'),
      DB.getAll('productions'),
      DB.getAll('returns'),
      DB.getAll('materials'),
      DB.getAll('products'),
    ]);
    const mat = (materials || []).find(m => m.name === material);
    const unit = (mat && mat.unit) ? mat.unit : 'کیلوگرم';

    const inRange = (date) => {
      if (!date) return false;
      if (df && jalaliCompare(date, df) < 0) return false;
      if (dt && jalaliCompare(date, dt) > 0) return false;
      return true;
    };

    const eR = (entries || []).filter(e => e.material_name === material && inRange(e.date));
    const wR = (wastes || []).filter(w => w.material_name === material && inRange(w.date));
    const pR = (productions || []).filter(p => p.material_name === material && inRange(p.date));
    const rR = (returns || []).filter(r => r.material_name === material && inRange(r.date));

    const totalIn = eR.reduce((s, e) => s + Number(e.quantity || 0), 0);
    const totalWaste = wR.reduce((s, w) => s + Number(w.quantity || 0), 0);
    const totalOut = pR.reduce((s, p) => s + Number(p.material_weight || 0), 0);
    const totalReturn = rR.reduce((s, r) => s + Number(r.return_weight || 0), 0);
    const usable = totalIn - totalWaste + totalReturn;
    const remaining = usable - totalOut;
    const wastePct = totalIn > 0 ? Math.round((totalWaste / totalIn) * 1000) / 10 : 0;
    const yieldPct = totalIn > 0 ? Math.round((totalOut / totalIn) * 1000) / 10 : 0;

    // per product breakdown
    const byProd = {};
    pR.forEach(p => {
      const name = p.product_name || 'نامشخص';
      if (!byProd[name]) byProd[name] = { qty: 0, weight: 0, n: 0 };
      byProd[name].qty += Number(p.quantity || 0);
      byProd[name].weight += Number(p.material_weight || 0);
      byProd[name].n += 1;
    });
    const prodRows = Object.entries(byProd).map(([name, v]) => {
      const def = (products || []).find(x => x.name === name);
      const expected = def && def.weight_per_unit ? Number(def.weight_per_unit) / 1000 : null;
      const actual = v.qty > 0 ? v.weight / v.qty : 0;
      const theoryW = expected != null ? expected * v.qty : null;
      const diffW = theoryW != null ? Math.round((v.weight - theoryW) * 1000) / 1000 : null;
      return {
        name,
        qty: v.qty,
        weight: Math.round(v.weight * 1000) / 1000,
        actual: Math.round(actual * 1000) / 1000,
        expected,
        theoryW: theoryW != null ? Math.round(theoryW * 1000) / 1000 : null,
        diffW,
        n: v.n,
      };
    }).sort((a, b) => b.weight - a.weight);

    // وزن تئوری کل محصولات در برابر وزن ثبت‌شده تولید
    const theoryTotal = prodRows.reduce((s, r) => s + (r.theoryW != null ? r.theoryW : 0), 0);
    const theoryDiff = Math.round((totalOut - theoryTotal) * 1000) / 1000; // مثبت = بیشتر از تعریف مصرف شده
    const stockDiff = Math.round(remaining * 1000) / 1000; // قابل‌مصرف − مصرف تولید

    let company = 'غذای انصار';
    try {
      const local = localStorage.getItem('kitchen_settings');
      if (local) company = JSON.parse(local).company_name || company;
    } catch (_) {}

    const statusColor = remaining <= 0.05 && remaining >= -0.05 ? 'text-brand-300' : remaining < 0 ? 'text-red-400' : 'text-amber-300';
    const statusText = remaining <= 0.05 && remaining >= -0.05 ? 'تقریباً تمام شده ✓' : remaining < 0 ? 'مصرف بیشتر از موجودی ⚠️' : 'هنوز مانده دارد';
    const theoryDiffColor = Math.abs(theoryDiff) < 0.05 ? 'text-brand-300' : theoryDiff > 0 ? 'text-red-400' : 'text-amber-300';
    const theoryDiffText = Math.abs(theoryDiff) < 0.05
      ? 'مطابق تعریف ✓'
      : (theoryDiff > 0 ? 'بیشتر از تعریف مصرف شده ⚠️' : 'کمتر از تعریف ثبت شده');

    const html = `
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">📦 گزارش بازه — ${material}</h1>
          <p class="text-slate-400 text-sm">از ${df || '—'} تا ${dt || '—'} · واحد: ${unit}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-primary text-sm" onclick="Pages.materialPeriodWhatsApp()">📱 کپی واتساپ</button>
          <button class="btn-secondary text-sm" onclick="Pages.materialPeriodForm()">بازه جدید</button>
          <button class="btn-ghost text-sm" onclick="navigate('reports')">بازگشت</button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div class="stat-card"><div class="text-xs text-slate-400">ورود</div><div class="text-xl font-bold text-brand-300">${fmtNum(totalIn)}</div></div>
        <div class="stat-card"><div class="text-xs text-slate-400">ضایعات</div><div class="text-xl font-bold text-amber-300">${fmtNum(totalWaste)}</div><div class="text-[10px] text-slate-500">${wastePct}٪</div></div>
        <div class="stat-card"><div class="text-xs text-slate-400">قابل‌مصرف</div><div class="text-xl font-bold text-cyan-300">${fmtNum(usable)}</div><div class="text-[10px] text-slate-500">ورود − ضایعات + برگشت</div></div>
        <div class="stat-card"><div class="text-xs text-slate-400">مصرف تولید</div><div class="text-xl font-bold text-violet-300">${fmtNum(totalOut)}</div><div class="text-[10px] text-slate-500">وزن ثبت‌شده در تولید</div></div>
      </div>

      <div class="glass-card rounded-2xl p-4 mb-4 border border-brand-500/20">
        <h2 class="font-semibold mb-3">⚖️ اختلاف‌ها (مهم)</h2>
        <div class="grid sm:grid-cols-2 gap-3 text-sm">
          <div class="bg-slate-800/40 rounded-xl p-3">
            <div class="text-xs text-slate-400 mb-1">قابل‌مصرف − مصرف تولید = مانده</div>
            <div class="text-lg font-bold ${statusColor}">${fmtNum(stockDiff)} ${unit}</div>
            <div class="text-xs ${statusColor} mt-1">${statusText}</div>
            <div class="text-[10px] text-slate-500 mt-1">${fmtNum(usable)} − ${fmtNum(totalOut)} = ${fmtNum(stockDiff)}</div>
          </div>
          <div class="bg-slate-800/40 rounded-xl p-3">
            <div class="text-xs text-slate-400 mb-1">مصرف تولید − وزن تئوری محصولات</div>
            <div class="text-lg font-bold ${theoryDiffColor}">${fmtNum(theoryDiff)} ${unit}</div>
            <div class="text-xs ${theoryDiffColor} mt-1">${theoryDiffText}</div>
            <div class="text-[10px] text-slate-500 mt-1">ثبت‌شده ${fmtNum(totalOut)} · تئوری ${fmtNum(theoryTotal)} (تعداد × گرم تعریف)</div>
          </div>
        </div>
        <p class="text-[10px] text-slate-500 mt-3">تئوری = جمع (تعداد هر محصول × وزن تعریف‌شده در محصولات). اگر اختلاف مثبت بزرگ باشد یعنی بیشتر از استاندارد مصرف شده یا ثبت اشتباه است.</p>
      </div>

      <div class="glass-card rounded-2xl p-4 mb-4">
        <div class="flex flex-wrap justify-between gap-2 text-sm">
          <span>برگشت به مواد: <strong class="text-cyan-300">${fmtNum(totalReturn)}</strong></span>
          <span>بازده از ورود: <strong>${fmtNum(yieldPct)}٪</strong></span>
        </div>
      </div>

      <div class="glass-card rounded-2xl p-4 mb-4">
        <h2 class="font-semibold mb-3">محصولات ساخته‌شده از این ماده در بازه</h2>
        ${prodRows.length ? `
          <div class="table-wrap">
            <table class="data text-sm">
              <thead><tr><th>محصول</th><th>تعداد</th><th>وزن ثبت‌شده</th><th>وزن تئوری</th><th>اختلاف</th><th>رکورد</th></tr></thead>
              <tbody>
                ${prodRows.map(r => {
                  const dc = r.diffW == null ? '' : (Math.abs(r.diffW) < 0.02 ? 'text-brand-300' : r.diffW > 0 ? 'text-red-400' : 'text-amber-300');
                  return `
                  <tr>
                    <td class="font-medium">${r.name}</td>
                    <td>${fmtNum(r.qty)}</td>
                    <td class="text-cyan-300">${fmtNum(r.weight)}</td>
                    <td class="text-slate-400">${r.theoryW != null ? fmtNum(r.theoryW) : '—'}</td>
                    <td class="font-bold ${dc}">${r.diffW != null ? ((r.diffW > 0 ? '+' : '') + fmtNum(r.diffW)) : '—'}</td>
                    <td class="text-slate-500">${r.n}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<p class="text-slate-500 text-sm">در این بازه تولیدی از این ماده ثبت نشده</p>`}
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="glass-card rounded-2xl p-4">
          <h2 class="font-semibold mb-2 text-sm">ورودها (${eR.length})</h2>
          <div class="table-wrap max-h-40 overflow-y-auto">
            <table class="data text-xs">
              <thead><tr><th>تاریخ</th><th>مقدار</th><th>تأمین‌کننده</th></tr></thead>
              <tbody>
                ${eR.length ? eR.map(e => `<tr><td>${e.date}</td><td class="text-brand-300">${fmtNum(e.quantity)}</td><td>${e.supplier || '—'}</td></tr>`).join('') : '<tr><td colspan="3" class="text-slate-500">—</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="glass-card rounded-2xl p-4">
          <h2 class="font-semibold mb-2 text-sm">ضایعات (${wR.length})</h2>
          <div class="table-wrap max-h-40 overflow-y-auto">
            <table class="data text-xs">
              <thead><tr><th>تاریخ</th><th>نوع</th><th>مقدار</th></tr></thead>
              <tbody>
                ${wR.length ? wR.map(w => `<tr><td>${w.date}</td><td>${w.waste_type || '—'}</td><td class="text-amber-300">${fmtNum(w.quantity)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-slate-500">—</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // stash for WhatsApp
    window.__matPeriodReport = {
      company, material, unit, df, dt,
      totalIn, totalWaste, usable, totalOut, totalReturn, remaining,
      wastePct, yieldPct, statusText, prodRows, eR, wR,
      theoryTotal, theoryDiff, theoryDiffText, stockDiff,
    };

    const content = document.getElementById('page-content');
    if (content) {
      content.innerHTML = html;
      content.classList.remove('fade-in');
      void content.offsetWidth;
      content.classList.add('fade-in');
    }
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در گزارش', 'error');
  }
};

Pages.materialPeriodWhatsApp = function () {
  const r = window.__matPeriodReport;
  if (!r) return toast('اول گزارش را محاسبه کنید', 'error');
  const lines = [
    '📦 گزارش بازه ماده — ' + r.company,
    'ماده: ' + r.material + ' (' + r.unit + ')',
    'از ' + (r.df || '—') + ' تا ' + (r.dt || '—'),
    '══════════════════',
    'ورود:         ' + r.totalIn,
    'ضایعات:       ' + r.totalWaste + ' (' + r.wastePct + '٪)',
    'قابل‌مصرف:    ' + r.usable,
    'مصرف تولید:   ' + r.totalOut,
    'برگشت:        ' + r.totalReturn,
    '──────────────────',
    '⚖️ اختلاف‌ها:',
    'مانده (قابل‌مصرف − تولید): ' + (r.stockDiff != null ? r.stockDiff : r.remaining) + ' — ' + r.statusText,
    'وزن تئوری محصولات: ' + (r.theoryTotal != null ? r.theoryTotal : '—'),
    'اختلاف تولید با تئوری: ' + (r.theoryDiff != null ? r.theoryDiff : '—') + ' — ' + (r.theoryDiffText || ''),
    '──────────────────',
    'محصولات:',
  ];
  if (r.prodRows && r.prodRows.length) {
    r.prodRows.forEach(p => {
      const d = p.diffW != null ? ((p.diffW > 0 ? '+' : '') + p.diffW) : '—';
      lines.push('• ' + p.name + ': ' + p.qty + ' عدد · ثبت ' + p.weight +
        ' · تئوری ' + (p.theoryW != null ? p.theoryW : '—') + ' · اختلاف ' + d);
    });
  } else {
    lines.push('• تولیدی ثبت نشده');
  }
  lines.push('──────────────────');
  lines.push('تهیه‌شده در ' + new Date().toLocaleString('fa-IR'));
  const text = lines.join('\n');
  showModal(
    '<div class="modal max-w-lg"><h3 class="text-lg font-bold mb-2">📱 گزارش بازه برای واتساپ</h3>' +
    '<textarea id="mat-period-wa" class="input-field font-mono text-xs h-64" readonly></textarea>' +
    '<div class="flex gap-2 mt-3">' +
    '<button type="button" class="btn-primary flex-1" id="btn-copy-mat-period">کپی متن</button>' +
    '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
  );
  const ta = document.getElementById('mat-period-wa');
  if (ta) ta.value = text;
  const btn = document.getElementById('btn-copy-mat-period');
  if (btn) btn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('کپی شد', 'success');
    } catch (_) {
      if (ta) ta.select();
      toast('دستی کپی کنید', 'info');
    }
  };
};

Pages.exportStock = async function () {
  const stock = await DB.calcStock();
  exportToExcel(stock.map(m => ({
    'کد': m.code, 'نام': m.name, 'واحد': m.unit,
    'موجودی اولیه': m.initial_stock, 'کل ورود': m.total_in,
    'کل مصرف': m.total_out, 'ضایعات': m.total_waste,
    'برگشت': m.total_return, 'موجودی فعلی': m.current_stock, 'وضعیت': m.status
  })), 'موجودی', 'گزارش_موجودی_تفصیلی');
};

Pages.pdfStock = async function () {
  const stock = await DB.calcStock();
  exportToPDF('گزارش موجودی', [
    { header: 'کد', key: 'code' }, { header: 'نام', key: 'name' },
    { header: 'فعلی', key: 'current_stock' }, { header: 'وضعیت', key: 'status' }
  ], stock, 'موجودی');
};

Pages.doBackup = async function () {
  const data = await DB.exportAllBackup();
  downloadJSON(data, `kitchen-backup-${new Date().toISOString().slice(0,10)}.json`);
};

Pages.doRestore = async function (ev) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  const file = ev.target.files[0];
  if (!file) return;
  if (!confirmAction('تمام داده‌های فعلی جایگزین می‌شوند. ادامه؟')) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await DB.importBackup(data);
    toast('بازیابی موفق', 'success');
    setTimeout(() => location.reload(), 800);
  } catch (e) {
    toast('فایل نامعتبر', 'error');
  }
};

/* ========== USERS ========== */
Pages.users = async function () {
  if (!Auth.isAdmin()) return '<p class="text-red-400">دسترسی ندارید</p>';
  const users = await DB.getAll('users');

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">مدیریت کاربران</h1>
        <p class="text-slate-400 text-sm">رمز عبور هش‌شده + نقش</p>
      </div>
      <button class="btn-primary" onclick="Pages.showUserForm()">+ کاربر جدید</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>نام کاربری</th><th>نام کامل</th><th>نقش</th><th>فعال</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td class="font-medium">${u.username}</td>
                <td>${u.full_name || '—'}</td>
                <td><span class="badge badge-ok">${u.role === 'admin' ? 'ادمین' : u.role === 'entry' ? 'ثبت ورود' : u.role === 'viewer' ? 'ناظر' : 'ثبت تولید'}</span></td>
                <td>${u.active !== false ? 'بله' : 'خیر'}</td>
                <td class="space-x-1 space-x-reverse whitespace-nowrap">
                  <button class="btn-ghost text-xs" onclick="Pages.showUserForm(${u.id})">ویرایش</button>
                  ${u.username !== 'admin' ? `<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteUser(${u.id}, '${String(u.username).replace(/'/g, "\\'")}')">حذف</button>` : '<span class="text-xs text-slate-500">—</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showUserForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { username: '', password: '', role: 'entry', full_name: '', active: true };
  if (id) item = await DB.getById('users', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
      <form id="user-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">نام کاربری</label><input name="username" class="input-field" value="${item.username||''}" required ${id?'readonly':''} /></div>
        <div><label class="text-xs text-slate-400">رمز عبور ${id?'(خالی = بدون تغییر)':''}</label><input name="password" type="password" class="input-field" value="" ${id?'':'required'} /></div>
        <div><label class="text-xs text-slate-400">نام کامل</label><input name="full_name" class="input-field" value="${item.full_name||''}" /></div>
        <div>
          <label class="text-xs text-slate-400">نقش</label>
          <select name="role" class="input-field">
            <option value="admin" ${item.role==='admin'?'selected':''}>ادمین (دسترسی کامل)</option>
            <option value="entry" ${item.role==='entry'?'selected':''}>ثبت‌کننده ورود</option>
            <option value="production" ${item.role==='production'?'selected':''}>ثبت‌کننده تولید</option>
            <option value="viewer" ${item.role==='viewer'?'selected':''}>ناظر (فقط مشاهده)</option>
          </select>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('user-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) {
        data.id = id;
        // در حالت ابری: رمز خام بفرست تا سرور هش کند؛ اگر خالی = تغییر نده
        if (!data.password) delete data.password;
        await DB.put('users', data);
      } else {
        if (!data.password) throw new Error('رمز عبور الزامی است');
        await DB.add('users', data);
      }
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('users');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره کاربر', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};


Pages.deleteUser = async function (id, username) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (username === 'admin') return toast('کاربر admin قابل حذف نیست', 'error');
  if (!confirmAction('کاربر «' + username + '» حذف شود؟ این کار برگشت‌ناپذیر است.')) return;
  try {
    await DB.remove('users', id);
    toast('کاربر حذف شد', 'success');
    navigate('users');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در حذف کاربر', 'error');
  }
};


Pages.showAuditLog = async function () {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  const box = document.getElementById('audit-box');
  if (!box) return;
  box.classList.remove('hidden');
  box.innerHTML = '<p class="text-slate-400 text-sm">در حال بارگذاری...</p>';
  try {
    const rows = await Api.request('audit');
    if (!rows || !rows.length) {
      box.innerHTML = '<p class="text-slate-500 text-sm">سابقه‌ای ثبت نشده</p>';
      return;
    }
    box.innerHTML = `
      <table class="data text-xs">
        <thead><tr><th>زمان</th><th>عمل</th><th>بخش</th><th>حذف‌کننده</th><th>خلاصه</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td class="whitespace-nowrap">${(r.created_at || '').replace('T', ' ').slice(0, 19)}</td>
              <td>${r.action === 'delete' ? 'حذف' : r.action}</td>
              <td>${r.store_name || '—'}</td>
              <td class="text-brand-300">${r.full_name || r.username || '—'}</td>
              <td class="max-w-[240px] truncate">${r.summary || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    box.innerHTML = '<p class="text-red-400 text-sm">' + (e.message || 'خطا') + '</p>';
  }
};


Pages.quickDate = function (page, mode) {
  const t = todayJalali();
  if (mode === 'today') {
    location.hash = page + '?df=' + encodeURIComponent(t) + '&dt=' + encodeURIComponent(t);
  } else if (mode === 'week') {
    // 7 days back approx (jalali string compare works for same year/month)
    const parts = t.split('/').map(Number);
    let d = parts[2] - 6;
    let m = parts[1];
    let y = parts[0];
    if (d < 1) { d += 30; m -= 1; if (m < 1) { m = 12; y -= 1; } }
    const from = y + '/' + String(m).padStart(2, '0') + '/' + String(Math.max(1, d)).padStart(2, '0');
    location.hash = page + '?df=' + encodeURIComponent(from) + '&dt=' + encodeURIComponent(t);
  } else if (mode === 'clear') {
    location.hash = page;
  }
  navigate(page);
};

/* ========== AUDIT LOG PAGE ========== */
Pages.audit = async function () {
  if (!Auth.isAdmin()) return '<p class="text-red-400">دسترسی ندارید</p>';
  let rows = [];
  try {
    rows = await Api.request('audit');
  } catch (e) {
    return `<div class="mb-6"><h1 class="text-2xl font-bold">لاگ فعالیت</h1>
      <p class="text-amber-400 mt-4">لاگ فقط در حالت ابری (D1) در دسترس است. ${e.message || ''}</p></div>`;
  }
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const q = (params.get('q') || '').toLowerCase();
  if (q) {
    rows = rows.filter(r =>
      String(r.summary || '').toLowerCase().includes(q) ||
      String(r.store_name || '').toLowerCase().includes(q) ||
      String(r.full_name || r.username || '').toLowerCase().includes(q) ||
      String(r.action || '').toLowerCase().includes(q)
    );
  }
  return `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">📜 لاگ فعالیت</h1>
        <p class="text-slate-400 text-sm">تاریخچه حذف‌ها و عملیات مهم (۵۰۰ رکورد اخیر)</p>
      </div>
      <div class="flex gap-2">
        <input id="f-q" class="input-field" placeholder="جستجو..." value="${params.get('q') || ''}" style="max-width:180px" />
        <button class="btn-secondary text-sm" onclick="const q=document.getElementById('f-q').value; location.hash='audit'+(q?'?q='+encodeURIComponent(q):''); navigate('audit')">جستجو</button>
        <button class="btn-ghost text-sm" onclick="location.hash='audit'; navigate('audit')">پاک</button>
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap max-h-[70vh] overflow-y-auto">
        <table class="data text-xs">
          <thead><tr><th>زمان</th><th>عمل</th><th>بخش</th><th>کاربر</th><th>خلاصه</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td class="whitespace-nowrap text-slate-400">${(r.created_at || '').replace('T',' ').slice(0,19)}</td>
                <td>${r.action === 'delete' ? '<span class="badge badge-danger">حذف</span>' : r.action}</td>
                <td>${r.store_name || '—'}</td>
                <td class="text-brand-300">${r.full_name || r.username || '—'}</td>
                <td class="max-w-[280px] truncate" title="${(r.summary || '').replace(/"/g,'&quot;')}">${r.summary || '—'}</td>
                <td>${r.action === 'delete' && r.store_name && r.record_id ? `<button class="btn-ghost text-xs text-cyan-300" onclick="Pages.restoreSoft('${r.store_name}',${r.record_id})">بازیابی</button>` : ''}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">رکوردی نیست</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.restoreSoft = async function (store, id) {
  if (!Auth.isAdmin()) return;
  if (!confirmAction('بازیابی این رکورد حذف‌شده؟')) return;
  try {
    await Api.request('restore', { method: 'POST', body: JSON.stringify({ store, id }) });
    toast('بازیابی شد', 'success');
    navigate('audit');
  } catch (e) {
    toast(e.message || 'خطا در بازیابی', 'error');
  }
};

/* ========== SETTINGS PAGE ========== */
Pages.settings = async function () {
  if (!Auth.isAdmin()) return '<p class="text-red-400">دسترسی ندارید</p>';
  let s = { company_name: 'غذای انصار', default_min_alert: 5, alert_enabled: true, backup_hint: true };
  try {
    if (window.Api && Api.online !== false) {
      const r = await Api.request('settings');
      if (r) s = { ...s, ...r };
    } else {
      const local = localStorage.getItem('kitchen_settings');
      if (local) s = { ...s, ...JSON.parse(local) };
    }
  } catch (e) {
    const local = localStorage.getItem('kitchen_settings');
    if (local) try { s = { ...s, ...JSON.parse(local) }; } catch (_) {}
  }
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold">⚙️ تنظیمات سیستم</h1>
      <p class="text-slate-400 text-sm">نام کترینگ، هشدارها و پیش‌فرض‌ها</p>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg">
      <form id="settings-form" class="space-y-4">
        <div>
          <label class="text-xs text-slate-400">نام کترینگ / شرکت</label>
          <input name="company_name" class="input-field" value="${(s.company_name || '').replace(/"/g,'&quot;')}" maxlength="80" />
        </div>
        <div>
          <label class="text-xs text-slate-400">حداقل هشدار پیش‌فرض (برای مواد جدید)</label>
          <input name="default_min_alert" type="number" step="0.01" class="input-field" value="${s.default_min_alert ?? 5}" />
        </div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="alert_enabled" ${s.alert_enabled !== false ? 'checked' : ''} class="rounded" />
          فعال بودن هشدار کمبود موجودی
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="backup_hint" ${s.backup_hint !== false ? 'checked' : ''} class="rounded" />
          یادآوری پشتیبان‌گیری در گزارش‌ها
        </label>
        <button type="submit" class="btn-primary w-full">ذخیره تنظیمات</button>
      </form>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg mt-4">
      <h2 class="font-semibold mb-2">اقلام عمومی (ارسال شعبه)</h2>
      <p class="text-sm text-slate-400 mb-3">نوشابه، دوغ، ماست، کره، رب و… برای ارسال به گاردنیا</p>
      <button class="btn-secondary w-full" onclick="Pages.manageGeneralItems()">🧃 مدیریت اقلام عمومی</button>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg mt-4">
      <h2 class="font-semibold mb-2">طرف حساب</h2>
      <p class="text-sm text-slate-400 mb-3">تامین‌کنندگان و طرف‌حساب‌ها از اینجا مدیریت می‌شوند (برای سبک‌ماندن نوار کناری)</p>
      <button class="btn-secondary w-full" onclick="navigate('suppliers')">🤝 مدیریت طرف حساب</button>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg mt-4">
      <h2 class="font-semibold mb-2">ثبت سریع</h2>
      <p class="text-sm text-slate-400 mb-3">میانبر برای ثبت سریع ورود / تولید / ضایعات</p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary text-sm" onclick="Pages.showEntryForm()">+ ورود سریع</button>
        <button class="btn-secondary text-sm" onclick="Pages.showProdForm()">+ تولید سریع</button>
        <button class="btn-secondary text-sm" onclick="Pages.showWasteForm()">+ ضایعات سریع</button>
      </div>
    </div>
  `;
};

// bind settings form after render
const _origNavSettings = typeof navigate === 'function' ? null : null;
(function bindSettingsForm() {
  const obs = new MutationObserver(() => {
    const form = document.getElementById('settings-form');
    if (!form || form.__bound) return;
    form.__bound = true;
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const data = {
        company_name: fd.get('company_name') || 'غذای انصار',
        default_min_alert: Number(fd.get('default_min_alert')) || 5,
        alert_enabled: !!fd.get('alert_enabled'),
        backup_hint: !!fd.get('backup_hint'),
      };
      try {
        localStorage.setItem('kitchen_settings', JSON.stringify(data));
        if (window.Api) {
          try { await Api.request('settings', { method: 'PUT', body: JSON.stringify(data) }); } catch (_) {}
        }
        toast('تنظیمات ذخیره شد', 'success');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.getElementById('page-content');
      if (root) obs.observe(root, { childList: true, subtree: true });
    });
    // also observe now if already loaded
    const root = document.getElementById('page-content');
    if (root) obs.observe(root, { childList: true, subtree: true });
  }
})();


Pages.lockToday = async function () {
  if (!Auth.isAdmin()) return;
  const day = todayJalali();
  if (!confirmAction('قفل کردن تاریخ ' + day + '؟ بعد از آن ورود/تولید/ضایعات این روز قابل تغییر نیست.')) return;
  try {
    await Api.request('day-lock', { method: 'POST', body: JSON.stringify({ day }) });
    toast('روز قفل شد', 'success');
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};

Pages.unlockToday = async function () {
  if (!Auth.isAdmin()) return;
  const day = todayJalali();
  if (!confirmAction('باز کردن قفل ' + day + '؟')) return;
  try {
    await Api.request('day-lock?day=' + encodeURIComponent(day), { method: 'DELETE', body: JSON.stringify({ day }) });
    toast('قفل باز شد', 'success');
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};

Pages.showDayLocks = async function () {
  if (!Auth.isAdmin()) return;
  try {
    const rows = await Api.request('day-locks');
    const html = rows.length ? rows.map(r => `<tr><td>${r.day}</td><td>${r.locked_by||'—'}</td><td>${(r.locked_at||'').slice(0,19)}</td></tr>`).join('') : '<tr><td colspan="3">قفلی نیست</td></tr>';
    showModal(`<div class="modal"><h3 class="text-lg font-bold mb-3">روزهای قفل‌شده</h3>
      <table class="data text-sm"><thead><tr><th>روز</th><th>توسط</th><th>زمان</th></tr></thead><tbody>${html}</tbody></table>
      <button class="btn-secondary mt-3 w-full" onclick="closeModal()">بستن</button></div>`);
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};


Pages.staffReportPrompt = async function (preselectName) {
  try {
    const [personnelRaw, prods] = await Promise.all([
      DB.getAll('personnel'),
      DB.getAll('productions'),
    ]);
    const personnel = (personnelRaw || []).filter(p => p.active !== false && (p.team||'executive')==='executive');
    const names = personnel.map(p => p.name).filter(Boolean);
    prods.forEach(p => {
      if (p.producer_name && !names.includes(p.producer_name)) names.push(p.producer_name);
    });
    names.sort((a, b) => a.localeCompare(b, 'fa'));
    const today = todayJalali();
    const opts = names.map(n => {
      const safe = String(n).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      const sel = preselectName === n ? ' selected' : '';
      return '<option value="' + safe + '"' + sel + '>' + safe + '</option>';
    }).join('');

    showModal(
      '<div class="modal max-w-md">' +
      '<h3 class="text-lg font-bold mb-4">گزارش کار پرسنل</h3>' +
      '<form id="staff-report-form" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">نام پرسنل</label>' +
      '<select name="name" class="input-field" required><option value="">انتخاب کنید</option>' + opts + '</select></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-400">از تاریخ</label><input name="df" class="input-field" value="' + today + '" /></div>' +
      '<div><label class="text-xs text-slate-400">تا تاریخ</label><input name="dt" class="input-field" value="' + today + '" /></div>' +
      '</div>' +
      '<p class="text-xs text-slate-500">برای یک روز، از و تا را یکسان بگذارید.</p>' +
      '<div class="flex gap-2 pt-2">' +
      '<button type="submit" class="btn-primary flex-1">مشاهده و چاپ</button>' +
      '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>' +
      '</div></form></div>'
    );

    document.getElementById('staff-report-form').onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(ev.target).entries());
      if (!fd.name) return toast('پرسنل را انتخاب کنید', 'error');
      closeModal();
      await Pages.printStaffReport(fd.name, fd.df || '', fd.dt || '');
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.printStaffReport = async function (name, df, dt) {
  try {
    let list = await DB.getAll('productions');
    list = list.filter(p => (p.producer_name || '') === name);
    if (df && typeof jalaliCompare === 'function') list = list.filter(p => jalaliCompare(p.date, df) >= 0);
    if (dt && typeof jalaliCompare === 'function') list = list.filter(p => jalaliCompare(p.date, dt) <= 0);
    list.sort((a, b) => String(a.date||'').localeCompare(String(b.date||'')) || (a.id||0) - (b.id||0));

    const sumQty = list.reduce((s, p) => s + Number(p.quantity || 0), 0);
    const sumW = list.reduce((s, p) => s + Number(p.material_weight || 0), 0);
    const sumDur = list.reduce((s, p) => s + Number(p.duration_minutes || 0), 0);
    const rangeLabel = (df && dt) ? (df === dt ? df : df + ' تا ' + dt) : 'همه تاریخ‌ها';
    const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const rows = list.map((p, i) =>
      '<tr><td>' + (i+1) + '</td><td>' + esc(p.date) + '</td><td>' + esc(p.product_name) +
      '</td><td>' + esc(p.quantity) + '</td><td>' + esc(p.material_weight) +
      '</td><td>' + esc(p.material_name) + '</td><td>' + esc(p.shift_code) +
      '</td><td>' + esc(p.duration_minutes) + '</td><td>' + esc(p.notes) + '</td></tr>'
    ).join('');

    const html = '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"/>' +
      '<title>گزارش کار — ' + esc(name) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">' +
      '<style>*{box-sizing:border-box}body{font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;color:#111;padding:16px 20px;font-size:12px}' +
      '.head{text-align:center;margin-bottom:12px;border-bottom:2px solid #0d4d2e;padding-bottom:10px}' +
      '.head img{max-height:56px;margin-bottom:6px}h1{font-size:18px;margin:0 0 4px}.meta{color:#444;font-size:12px;margin:4px 0}' +
      '.sum{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}' +
      '.sum div{background:#f0f7f2;border:1px solid #c5e0d0;border-radius:8px;padding:8px 12px}.sum b{color:#0d4d2e}' +
      'table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:5px 6px;text-align:right}' +
      'th{background:#0d4d2e;color:#fff;font-size:11px}tr:nth-child(even) td{background:#f7f7f7}' +
      '.foot{margin-top:18px;font-size:11px;color:#555;display:flex;justify-content:space-between}' +
      '.sign{margin-top:28px;display:flex;justify-content:space-between}' +
      '.sign div{width:40%;text-align:center;border-top:1px solid #999;padding-top:6px}' +
      '.actions{text-align:center;margin:16px 0}' +
      'button{font-family:inherit;padding:8px 18px;margin:0 4px;border-radius:8px;border:1px solid #0d4d2e;background:#0d4d2e;color:#fff;cursor:pointer}' +
      'button.sec{background:#fff;color:#0d4d2e}' +
      '@media print{.actions{display:none!important}body{padding:0}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
      '</style></head><body>' +
      '<div class="head"><img src="/logo-ansar.png" alt="" onerror="this.style.display=\'none\'"/>' +
      '<h1>گزارش کار پرسنل — غذای انصار</h1>' +
      '<div class="meta">نام: <strong>' + esc(name) + '</strong></div>' +
      '<div class="meta">بازه: ' + esc(rangeLabel) + '</div>' +
      '<div class="meta">تاریخ تهیه: ' + new Date().toLocaleString('fa-IR') + '</div></div>' +
      '<div class="sum">' +
      '<div>تعداد رکورد: <b>' + list.length + '</b></div>' +
      '<div>جمع تعداد تولید: <b>' + sumQty + '</b></div>' +
      '<div>جمع مصرف: <b>' + sumW + '</b></div>' +
      '<div>جمع مدت (دقیقه): <b>' + sumDur + '</b></div></div>' +
      '<table><thead><tr><th>#</th><th>تاریخ</th><th>محصول</th><th>تعداد</th><th>مصرف</th><th>ماده</th><th>شیفت</th><th>مدت</th><th>توضیح</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="9" style="text-align:center">در این بازه رکوردی نیست</td></tr>') +
      '</tbody></table>' +
      '<div class="sign"><div>امضای پرسنل</div><div>امضای مسئول / سرآشپز</div></div>' +
      '<div class="foot"><span>سیستم گردش مواد — غذای انصار</span><span>سوابق تولید</span></div>' +
      '<div class="actions"><button onclick="window.print()">چاپ / ذخیره PDF</button>' +
      '<button class="sec" onclick="window.close()">بستن</button></div></body></html>';

    const w = window.open('', '_blank');
    if (!w) {
      toast('پاپ‌آپ مسدود است — اجازه پاپ‌آپ بدهید', 'error');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast('گزارش باز شد', 'success');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در ساخت گزارش', 'error');
  }
};



Pages.toggleNightMode = function () {
  const on = document.documentElement.classList.toggle('night-shift');
  localStorage.setItem('kitchen_night_shift', on ? '1' : '0');
  toast(on ? 'حالت شیفت شب روشن شد' : 'حالت عادی', 'info');
};


Pages.shiftSummary = async function () {
  try {
    const today = todayJalali();
    const [entries, productions, wastes, stock, allScores0] = await Promise.all([
      DB.getAll('entries'),
      DB.getAll('productions'),
      DB.getAll('wastes'),
      DB.calcStock(),
      DB.getAll('staff_scores').catch(() => []),
    ]);
    const eT = entries.filter(x => x.date === today);
    const pT = productions.filter(x => x.date === today);
    const wT = wastes.filter(x => x.date === today);
    const sumProd = pT.reduce((s, x) => s + Number(x.quantity || 0), 0);
    const sumW = pT.reduce((s, x) => s + Number(x.material_weight || 0), 0);
    const sumWaste = wT.reduce((s, x) => s + Number(x.quantity || 0), 0);
    const alerts = stock.filter(m => m.status !== 'عادی').slice(0, 5);
    const board = {};
    pT.forEach(pr => {
      const n = pr.producer_name || 'نامشخص';
      board[n] = (board[n] || 0) + Number(pr.quantity || 0);
    });
    const top = Object.entries(board).sort((a, b) => b[1] - a[1])[0];
    let scoreRows = ((allScores0 || []).filter(s => s.day === today));
    scoreRows.sort((a, b) => Number(b.score) - Number(a.score));
    const scoreLines = scoreRows.length
      ? scoreRows.map((s, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
          return medal + ' ' + s.personnel_name + ': ' + s.score + '/10' + (s.note ? (' — ' + s.note) : '');
        })
      : ['هنوز نمره‌ای ثبت نشده'];
    // league 30-day snippet for motivation
    let allScores = allScores0 || [];
    const league30 = Pages._buildLeague(allScores, 30);
    const leagueLines = league30.length
      ? league30.slice(0, 8).map(r => {
          const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : (r.rank + '.');
          return medal + ' ' + r.name + ' — ' + r.points + ' امتیاز (میانگین ' + r.avg + ')';
        })
      : ['هنوز جدولی تشکیل نشده'];
    let company = 'غذای انصار';
    try {
      const local = localStorage.getItem('kitchen_settings');
      if (local) company = JSON.parse(local).company_name || company;
    } catch (_) {}
    const lines = [
      '📋 خلاصه شیفت — ' + company,
      'تاریخ: ' + today,
      '——————————',
      'ورود مواد: ' + eT.length + ' رکورد',
      'تولید: ' + pT.length + ' رکورد · تعداد ' + sumProd + ' · مصرف ' + sumW,
      'ضایعات: ' + wT.length + ' رکورد · مقدار ' + sumWaste,
      top ? ('بیشترین تولید امروز: ' + top[0] + ' (' + top[1] + ')') : 'تولید ثبت نشده',
      '——————————',
      '🏅 نمره کاری امروز:',
    ].concat(scoreLines).concat([
      '——————————',
      '🏆 جدول لیگ ۳۰ روزه:',
    ]).concat(leagueLines).concat([
      '——————————',
      'مواد نیازمند توجه:',
    ]).concat(
      alerts.length ? alerts.map(m => '• ' + m.name + ': ' + m.current_stock + ' ' + (m.unit || '') + ' (' + m.status + ')') : ['• مورد بحرانی نیست'],
      ['——————————', 'رقابت سالم = کیفیت بالاتر 💪', 'خسته نباشید 🌿', 'تهیه‌شده در ' + new Date().toLocaleString('fa-IR')]
    );
    const text = lines.join('\n');
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    showModal(
      '<div class="modal max-w-lg"><h3 class="text-lg font-bold mb-2">خلاصه پایان شیفت</h3>' +
      '<p class="text-xs text-slate-400 mb-3">کپی کن و برای مدیر بفرست</p>' +
      '<textarea id="shift-summary-text" class="input-field font-mono text-xs h-56" readonly>' + safe + '</textarea>' +
      '<div class="flex flex-wrap gap-2 mt-3">' +
      '<button type="button" class="btn-primary flex-1" id="btn-copy-shift">کپی متن</button>' +
      '<button type="button" class="btn-secondary" onclick="Pages.printShiftSummary()">چاپ</button>' +
      '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
    document.getElementById('btn-copy-shift').onclick = async function () {
      try {
        await navigator.clipboard.writeText(text);
        toast('کپی شد', 'success');
      } catch (err) {
        document.getElementById('shift-summary-text').select();
        toast('Ctrl+C را بزنید', 'info');
      }
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.printShiftSummary = function () {
  const el = document.getElementById('shift-summary-text');
  if (!el) return;
  const w = window.open('', '_blank');
  if (!w) return toast('پاپ‌آپ مسدود است', 'error');
  w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>خلاصه شیفت</title><style>body{font-family:Tahoma,sans-serif;padding:20px;white-space:pre-wrap;line-height:1.7}</style></head><body>' +
    el.value.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</body></html>');
  w.document.close();
  setTimeout(function () { w.print(); }, 300);
};

Pages.planForm = async function () {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  try {
    const products = await DB.getAll('products');
    const today = todayJalali();
    const opts = products.filter(function (pr) { return pr.active !== false; }).map(function (pr) {
      return '<option value="' + String(pr.name).replace(/"/g, '&quot;') + '">' + pr.name + '</option>';
    }).join('');
    showModal(
      '<div class="modal max-w-md"><h3 class="text-lg font-bold mb-4">هدف تولید روزانه</h3>' +
      '<form id="plan-form" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">تاریخ</label><input name="day" class="input-field" value="' + today + '" required /></div>' +
      '<div><label class="text-xs text-slate-400">محصول</label><select name="product_name" class="input-field" required><option value="">انتخاب</option>' + opts + '</select></div>' +
      '<div><label class="text-xs text-slate-400">تعداد هدف</label><input name="target_qty" type="number" step="0.01" class="input-field" required /></div>' +
      '<div><label class="text-xs text-slate-400">یادداشت</label><input name="notes" class="input-field" /></div>' +
      '<div class="flex gap-2"><button type="submit" class="btn-primary flex-1">ذخیره</button>' +
      '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );
    document.getElementById('plan-form').onsubmit = async function (ev) {
      ev.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(ev.target).entries());
        data.target_qty = Number(data.target_qty);
        await DB.add('daily_plans', data);
        toast('هدف ذخیره شد', 'success');
        closeModal();
        navigate('dashboard');
      } catch (err) {
        toast(err.message || 'خطا', 'error');
      }
    };
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};



/* ========== LEAGUE TABLE (رتبه‌بندی رقابتی پرسنل) ========== */
Pages._buildLeague = function (scores, periodDays) {
  // periodDays: null = all time, number = last N calendar-ish days by jalali string
  const today = todayJalali();
  let filtered = scores || [];
  if (periodDays && periodDays > 0) {
    // keep scores where day is within approx window (string compare works same year)
    const parts = today.split('/').map(Number);
    let d = parts[2] - (periodDays - 1);
    let m = parts[1];
    let y = parts[0];
    while (d < 1) { d += 30; m -= 1; if (m < 1) { m = 12; y -= 1; } }
    const from = y + '/' + String(m).padStart(2, '0') + '/' + String(Math.max(1, d)).padStart(2, '0');
    filtered = filtered.filter(s => s.day && jalaliCompare(s.day, from) >= 0 && jalaliCompare(s.day, today) <= 0);
  }
  // aggregate by person: total points, avg, days played, last score, form (last 5)
  const map = {};
  filtered.forEach(s => {
    const name = s.personnel_name || 'نامشخص';
    if (!map[name]) map[name] = { name, points: 0, count: 0, scores: [], lastDay: '', lastScore: 0 };
    const sc = Number(s.score) || 0;
    map[name].points += sc;
    map[name].count += 1;
    map[name].scores.push({ day: s.day, score: sc, note: s.note || '' });
    if (!map[name].lastDay || jalaliCompare(s.day, map[name].lastDay) >= 0) {
      map[name].lastDay = s.day;
      map[name].lastScore = sc;
    }
  });
  const rows = Object.values(map).map(r => {
    r.avg = r.count ? Math.round((r.points / r.count) * 10) / 10 : 0;
    // form: last 5 scores chronological
    const sorted = r.scores.slice().sort((a, b) => jalaliCompare(a.day, b.day));
    r.form = sorted.slice(-5).map(x => x.score);
    return r;
  });
  // sort: points desc, then avg desc, then count desc
  rows.sort((a, b) => b.points - a.points || b.avg - a.avg || b.count - a.count);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
};

Pages._prevRankMap = function (scores, periodDays) {
  // rank in previous equal-length window for movement arrows
  if (!periodDays) return {};
  const today = todayJalali();
  const parts = today.split('/').map(Number);
  // end of previous period = day before current window start
  let d = parts[2] - periodDays;
  let m = parts[1];
  let y = parts[0];
  while (d < 1) { d += 30; m -= 1; if (m < 1) { m = 12; y -= 1; } }
  const prevEnd = y + '/' + String(m).padStart(2, '0') + '/' + String(Math.max(1, d)).padStart(2, '0');
  let d2 = d - (periodDays - 1);
  let m2 = m;
  let y2 = y;
  while (d2 < 1) { d2 += 30; m2 -= 1; if (m2 < 1) { m2 = 12; y2 -= 1; } }
  const prevFrom = y2 + '/' + String(m2).padStart(2, '0') + '/' + String(Math.max(1, d2)).padStart(2, '0');
  const prevScores = (scores || []).filter(s =>
    s.day && jalaliCompare(s.day, prevFrom) >= 0 && jalaliCompare(s.day, prevEnd) <= 0
  );
  const prev = Pages._buildLeague(prevScores, null);
  const map = {};
  prev.forEach(r => { map[r.name] = r.rank; });
  return map;
};

Pages.league = async function () {
  let scores = [];
  try { scores = (await DB.getAll('staff_scores')) || []; } catch (e) { scores = []; }
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const period = params.get('p') || '30'; // today | 7 | 30 | all
  let periodDays = null;
  let periodLabel = 'کل فصل';
  if (period === 'today') { periodDays = 1; periodLabel = 'امروز'; }
  else if (period === '7') { periodDays = 7; periodLabel = '۷ روز اخیر'; }
  else if (period === '30') { periodDays = 30; periodLabel = '۳۰ روز اخیر'; }
  else { periodDays = null; periodLabel = 'کل فصل'; }

  const table = Pages._buildLeague(scores, periodDays);
  const prevMap = periodDays ? Pages._prevRankMap(scores, periodDays) : {};

  const medal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };
  const moveArrow = (name, rank) => {
    if (!prevMap[name]) return '<span class="text-slate-600 text-xs">—</span>';
    const diff = prevMap[name] - rank;
    if (diff > 0) return `<span class="text-brand-400 text-xs font-bold">▲${diff}</span>`;
    if (diff < 0) return `<span class="text-red-400 text-xs font-bold">▼${Math.abs(diff)}</span>`;
    return `<span class="text-slate-500 text-xs">•</span>`;
  };
  const formDots = (form) => {
    if (!form || !form.length) return '—';
    return form.map(s => {
      const c = s >= 8 ? 'text-brand-400' : s >= 5 ? 'text-amber-400' : 'text-red-400';
      return `<span class="${c} font-bold">${s}</span>`;
    }).join(' ');
  };

  return `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">🏆 جدول لیگ پرسنل</h1>
        <p class="text-slate-400 text-sm">رتبه‌بندی رقابتی بر اساس نمرات کاری · ${periodLabel}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        ${Auth.isAdmin() ? `<button class="btn-primary text-sm" onclick="Pages.scoreStaffForm()">+ ثبت نمره</button>` : ''}
        <button class="btn-secondary text-sm" onclick="Pages.leagueWhatsApp('${period}')">📱 خروجی واتساپ</button>
      </div>
    </div>

    <div class="filter-bar glass-card rounded-xl p-2 mb-4 flex flex-wrap gap-2">
      <button class="btn-ghost text-sm ${period==='today'?'text-brand-300':''}" onclick="location.hash='league?p=today'; navigate('league')">امروز</button>
      <button class="btn-ghost text-sm ${period==='7'?'text-brand-300':''}" onclick="location.hash='league?p=7'; navigate('league')">۷ روز</button>
      <button class="btn-ghost text-sm ${period==='30'?'text-brand-300':''}" onclick="location.hash='league?p=30'; navigate('league')">۳۰ روز</button>
      <button class="btn-ghost text-sm ${period==='all'?'text-brand-300':''}" onclick="location.hash='league?p=all'; navigate('league')">کل فصل</button>
    </div>

    <div class="glass-card rounded-2xl p-4 mb-4">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th class="w-12">رتبه</th>
              <th></th>
              <th>پرسنل</th>
              <th>امتیاز</th>
              <th>میانگین</th>
              <th>تعداد نمره</th>
              <th>فرم اخیر</th>
              <th>آخرین</th>
            </tr>
          </thead>
          <tbody>
            ${table.length ? table.map(r => `
              <tr class="${r.rank<=3 ? 'bg-brand-500/5' : ''}">
                <td class="font-bold text-lg">${medal(r.rank)}</td>
                <td>${moveArrow(r.name, r.rank)}</td>
                <td class="font-medium">${r.name}</td>
                <td class="font-bold text-brand-300 text-lg">${fmtNum(r.points)}</td>
                <td class="${r.avg>=8?'text-brand-300':r.avg>=5?'text-amber-300':'text-red-300'}">${fmtNum(r.avg)}</td>
                <td class="text-slate-400">${r.count}</td>
                <td class="text-xs tracking-wider">${formDots(r.form)}</td>
                <td class="text-xs text-slate-400">${r.lastDay || '—'} · ${r.lastScore}/10</td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="text-center text-slate-500 py-10">هنوز نمره‌ای ثبت نشده — از دکمه نمره‌دهی شروع کن</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="text-[10px] text-slate-500 mt-3">امتیاز = جمع نمرات روزانه · رتبه بر اساس امتیاز (سپس میانگین) · ▲▼ نسبت به دوره قبل</p>
    </div>

    ${table.length >= 1 ? `
    <div class="grid sm:grid-cols-3 gap-4">
      <div class="stat-card border border-amber-500/30">
        <div class="text-xs text-amber-300">🥇 صدر جدول</div>
        <div class="text-xl font-bold mt-1">${table[0].name}</div>
        <div class="text-sm text-slate-400">${fmtNum(table[0].points)} امتیاز · میانگین ${fmtNum(table[0].avg)}</div>
      </div>
      ${table[1] ? `<div class="stat-card">
        <div class="text-xs text-slate-400">🥈 دوم</div>
        <div class="text-lg font-bold mt-1">${table[1].name}</div>
        <div class="text-sm text-slate-400">${fmtNum(table[1].points)} امتیاز</div>
      </div>` : ''}
      ${table[2] ? `<div class="stat-card">
        <div class="text-xs text-slate-400">🥉 سوم</div>
        <div class="text-lg font-bold mt-1">${table[2].name}</div>
        <div class="text-sm text-slate-400">${fmtNum(table[2].points)} امتیاز</div>
      </div>` : ''}
    </div>` : ''}
  `;
};

Pages.leagueWhatsApp = async function (period) {
  try {
    let scores = [];
    try { scores = (await DB.getAll('staff_scores')) || []; } catch (e) {}
    period = period || '30';
    let periodDays = null;
    let periodLabel = 'کل فصل';
    if (period === 'today') { periodDays = 1; periodLabel = 'امروز'; }
    else if (period === '7') { periodDays = 7; periodLabel = '۷ روز اخیر'; }
    else if (period === '30') { periodDays = 30; periodLabel = '۳۰ روز اخیر'; }

    const table = Pages._buildLeague(scores, periodDays);
    const prevMap = periodDays ? Pages._prevRankMap(scores, periodDays) : {};
    const medal = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : (r + '.');
    const move = (name, rank) => {
      if (!prevMap[name]) return '';
      const d = prevMap[name] - rank;
      if (d > 0) return ' ▲' + d;
      if (d < 0) return ' ▼' + Math.abs(d);
      return ' •';
    };

    let company = 'غذای انصار';
    try {
      const local = localStorage.getItem('kitchen_settings');
      if (local) company = JSON.parse(local).company_name || company;
    } catch (_) {}

    const lines = [
      '🏆 جدول لیگ پرسنل — ' + company,
      'بازه: ' + periodLabel,
      'تاریخ گزارش: ' + todayJalali(),
      '══════════════════',
    ];
    if (!table.length) {
      lines.push('هنوز نمره‌ای ثبت نشده');
    } else {
      table.forEach(r => {
        lines.push(
          medal(r.rank) + ' ' + r.name + move(r.name, r.rank) +
          '\n   امتیاز: ' + r.points + ' | میانگین: ' + r.avg + ' | نمرات: ' + r.count +
          (r.form && r.form.length ? (' | فرم: ' + r.form.join('-')) : '')
        );
      });
      lines.push('══════════════════');
      lines.push('🥇 قهرمان فعلی: ' + table[0].name + ' با ' + table[0].points + ' امتیاز');
      if (table[1]) lines.push('🥈 ' + table[1].name + ' — ' + table[1].points);
      if (table[2]) lines.push('🥉 ' + table[2].name + ' — ' + table[2].points);
    }
    lines.push('──────────────────');
    lines.push('هر نمره روزانه روی رتبه اثر می‌گذارد 💪');
    lines.push('خسته نباشید — رقابت سالم = کیفیت بالاتر 🌿');

    const text = lines.join('\n');
    showModal(
      '<div class="modal max-w-lg"><h3 class="text-lg font-bold mb-2">📱 گزارش لیگ برای واتساپ</h3>' +
      '<p class="text-xs text-slate-400 mb-3">کپی کن و تو گروه بذار</p>' +
      '<textarea id="league-wa-text" class="input-field font-mono text-xs h-64" readonly></textarea>' +
      '<div class="flex gap-2 mt-3">' +
      '<button type="button" class="btn-primary flex-1" id="btn-copy-league">کپی متن</button>' +
      '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
    const ta = document.getElementById('league-wa-text');
    if (ta) ta.value = text;
    document.getElementById('btn-copy-league').onclick = async function () {
      try {
        await navigator.clipboard.writeText(text);
        toast('کپی شد — برو تو واتساپ پیست کن', 'success');
      } catch (err) {
        if (ta) ta.select();
        toast('Ctrl+C / نگه دار و کپی', 'info');
      }
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.scoreStaffForm = async function () {
  if (!Auth.isAdmin()) return toast('فقط مدیر می‌تواند نمره بدهد', 'error');
  try {
    const today = todayJalali();
    const personnel = (await DB.getAll('personnel')).filter(p => p.active !== false && (p.team||'executive')==='executive');
    const prods = await DB.getAll('productions');
    const names = personnel.map(p => p.name).filter(Boolean);
    prods.filter(p => p.date === today).forEach(p => {
      if (p.producer_name && !names.includes(p.producer_name)) names.push(p.producer_name);
    });
    names.sort((a, b) => a.localeCompare(b, 'fa'));
    const opts = names.map(n => '<option value="' + String(n).replace(/"/g, '&quot;') + '">' + n + '</option>').join('');
    showModal(
      '<div class="modal max-w-md"><h3 class="text-lg font-bold mb-2">نمره کاری روزانه</h3>' +
      '<p class="text-xs text-slate-400 mb-3">از ۱ تا ۱۰ — در خلاصه واتساپ برای پرسنل می‌آید</p>' +
      '<form id="score-form" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">تاریخ</label><input name="day" class="input-field" value="' + today + '" required /></div>' +
      '<div><label class="text-xs text-slate-400">پرسنل</label><select name="personnel_name" class="input-field" required><option value="">انتخاب</option>' + opts + '</select></div>' +
      '<div><label class="text-xs text-slate-400">نمره (۱ تا ۱۰)</label>' +
      '<input name="score" type="number" min="1" max="10" step="1" class="input-field" required placeholder="مثلاً ۸" /></div>' +
      '<div><label class="text-xs text-slate-400">توضیح کوتاه (اختیاری)</label>' +
      '<input name="note" class="input-field" placeholder="دقت بالا / سرعت خوب / ..." maxlength="120" /></div>' +
      '<div class="flex gap-2"><button type="submit" class="btn-primary flex-1">ثبت نمره</button>' +
      '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );
    document.getElementById('score-form').onsubmit = async function (ev) {
      ev.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(ev.target).entries());
        data.score = Number(data.score);
        if (data.score < 1 || data.score > 10) throw new Error('نمره باید بین ۱ و ۱۰ باشد');
        data.scored_by = (Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) || 'مدیر';
        await DB.add('staff_scores', data);
        toast('نمره ثبت شد — جدول لیگ به‌روز شد 🏆', 'success');
        closeModal();
        location.hash = 'league?p=30';
        navigate('league');
      } catch (err) {
        toast(err.message || 'خطا', 'error');
      }
    };
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};


window.Pages = Pages;
/**
 * Staff teams + attendance + daily staff meals
 * Loaded after pages.js
 */
(function () {
  const TEAM_LABELS = {
    executive: 'تیم اجرایی',
    sales: 'تیم فروش',
    transport: 'تیم ترابری'
  };
  const SHIFT_LABELS = {
    full: 'فول‌تایم (صبح+ناهار+شام)',
    single: 'تک‌شیفت (صبح+ناهار)'
  };

  function hashParam(key, fallback) {
    try {
      const h = (location.hash || '').replace(/^#/, '');
      const q = h.includes('?') ? h.slice(h.indexOf('?') + 1) : '';
      const v = new URLSearchParams(q).get(key);
      return v != null && v !== '' ? v : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function personTeam(p) {
    return (p && p.team) || 'executive';
  }
  function personShift(p) {
    return (p && p.shift_type) || (personTeam(p) === 'executive' ? 'full' : 'single');
  }

  window.TEAM_LABELS = TEAM_LABELS;
  window.SHIFT_LABELS = SHIFT_LABELS;
  window.hashParam = hashParam;
  window.personTeam = personTeam;
  window.personShift = personShift;

  Pages.personnel = async function () {
    const tab = hashParam('tab', 'executive');
    const list = (await DB.getAll('personnel')) || [];
    const canEdit = Auth.isAdmin();
    const filtered = list.filter((p) => personTeam(p) === tab);
    const counts = {
      executive: list.filter((p) => personTeam(p) === 'executive').length,
      sales: list.filter((p) => personTeam(p) === 'sales').length,
      transport: list.filter((p) => personTeam(p) === 'transport').length
    };

    const tabBtn = (id, label) => {
      const active = tab === id;
      return (
        '<button class="' +
        (active ? 'btn-primary' : 'btn-secondary') +
        ' text-sm" onclick="navigate(\'personnel?tab=' +
        id +
        '\')">' +
        label +
        ' <span class="opacity-70">(' +
        (counts[id] || 0) +
        ')</span></button>'
      );
    };

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-4">' +
      '<div><h1 class="text-2xl font-bold">پرسنل</h1>' +
      '<p class="text-slate-400 text-sm">تیم اجرایی · فروش · ترابری — حضور و غذای روزانه</p></div>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button class="btn-primary" onclick="navigate(\'attendance\')">🍽️ حضور و غذای روزانه</button>' +
      (tab === 'executive'
        ? '<button class="btn-secondary" onclick="navigate(\'league\')">🏆 لیگ پرسنل</button>' +
          '<button class="btn-secondary" onclick="Pages.staffReportPrompt()">گزارش کار</button>'
        : '') +
      (canEdit
        ? '<button class="btn-secondary" onclick="Pages.showPersonForm(null,\'' +
          tab +
          '\')">+ افزودن</button>'
        : '') +
      '</div></div>' +
      '<div class="flex flex-wrap gap-2 mb-4">' +
      tabBtn('executive', 'تیم اجرایی') +
      tabBtn('sales', 'تیم فروش') +
      tabBtn('transport', 'تیم ترابری') +
      '</div>' +
      (tab === 'executive'
        ? '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-300 border border-brand-500/20">' +
          'تیم اجرایی در <b>تولید</b>، <b>لیگ</b> و <b>نمره‌دهی</b> شرکت می‌کند. فروش و ترابری فقط در حضور و غذای پرسنلی دیده می‌شوند.' +
          '</div>'
        : '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
          'این تیم فقط برای حضور و وعده غذایی پرسنلی است و در لیگ/تولید تداخل ندارد.' +
          '</div>') +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>کد</th><th>نام</th><th>سمت</th><th>شیفت</th><th>فعال</th><th></th></tr></thead><tbody>' +
      (filtered.length
        ? filtered
            .map(function (p) {
              const safe = String(p.name || '').replace(/'/g, "\\'");
              return (
                '<tr><td class="text-slate-400">' +
                (p.code || '') +
                '</td><td class="font-medium">' +
                (p.name || '') +
                '</td><td>' +
                (p.position || '—') +
                '</td><td class="text-xs">' +
                (SHIFT_LABELS[personShift(p)] || personShift(p)) +
                '</td><td>' +
                (p.active !== false && p.active !== 0
                  ? '<span class="badge badge-ok">بله</span>'
                  : '<span class="badge badge-danger">خیر</span>') +
                '</td><td class="space-x-1 space-x-reverse whitespace-nowrap">' +
                (tab === 'executive'
                  ? '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.staffReportPrompt(\'' +
                    safe +
                    '\')">گزارش کار</button> '
                  : '') +
                (canEdit
                  ? '<button class="btn-ghost text-xs" onclick="Pages.showPersonForm(' +
                    p.id +
                    ')">ویرایش</button> ' +
                    '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deletePerson(' +
                    p.id +
                    ", '" +
                    safe +
                    '\')">حذف</button>'
                  : '') +
                '</td></tr>'
              );
            })
            .join('')
        : '<tr><td colspan="6" class="text-center text-slate-500 py-8">هنوز فردی در این تیم ثبت نشده</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  const _origShowPersonForm = Pages.showPersonForm;
  Pages.showPersonForm = async function (id, defaultTeam) {
    if (!Auth.isAdmin()) return;
    let item = {
      code: '',
      name: '',
      position: '',
      team: defaultTeam || 'executive',
      shift_type: defaultTeam && defaultTeam !== 'executive' ? 'single' : 'full',
      active: true
    };
    if (id) item = (await DB.getById('personnel', id)) || item;
    const team = item.team || defaultTeam || 'executive';
    const shift = item.shift_type || (team === 'executive' ? 'full' : 'single');
    function teamPrefix(t) {
      if (t === 'sales') return 'F';
      if (t === 'transport') return 'T';
      return 'S';
    }
    if (!id && typeof nextCode === 'function') {
      item.code = await nextCode('personnel', teamPrefix(team));
    }

    showModal(
      '<div class="modal"><h3 class="text-lg font-bold mb-4">' +
        (id ? 'ویرایش پرسنل' : 'افزودن پرسنل') +
        '</h3><form id="person-form" class="space-y-3">' +
        '<div><label class="text-xs text-slate-400">کد (خودکار)</label><input name="code" id="person-code" class="input-field" value="' +
        (item.code || '') +
        '" required readonly /></div>' +
        '<div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="' +
        (item.name || '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">سمت</label><input name="position" class="input-field" value="' +
        (item.position || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">تیم</label><select name="team" class="input-field">' +
        '<option value="executive"' +
        (team === 'executive' ? ' selected' : '') +
        '>تیم اجرایی (آشپزخانه)</option>' +
        '<option value="sales"' +
        (team === 'sales' ? ' selected' : '') +
        '>تیم فروش</option>' +
        '<option value="transport"' +
        (team === 'transport' ? ' selected' : '') +
        '>تیم ترابری</option></select></div>' +
        '<div><label class="text-xs text-slate-400">نوع شیفت پیش‌فرض</label><select name="shift_type" class="input-field">' +
        '<option value="full"' +
        (shift === 'full' ? ' selected' : '') +
        '>فول‌تایم — صبح + ناهار + شام</option>' +
        '<option value="single"' +
        (shift === 'single' ? ' selected' : '') +
        '>تک‌شیفت — صبح + ناهار</option></select>' +
        '<p class="text-[10px] text-slate-500 mt-1">بعداً با تقویم کاری قابل override است</p></div>' +
        '<div class="flex gap-2 pt-2"><button type="submit" class="btn-primary flex-1">ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div>' +
        '</form></div>'
    );

    if (!id) {
      var teamSel = document.querySelector('#person-form select[name="team"]');
      if (teamSel) {
        teamSel.addEventListener('change', async function () {
          if (typeof nextCode !== 'function') return;
          var p = teamPrefix(teamSel.value);
          var codeEl = document.getElementById('person-code');
          if (codeEl) codeEl.value = await nextCode('personnel', p);
        });
      }
    }

    document.getElementById('person-form').onsubmit = async function (ev) {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'در حال ذخیره...';
      }
      try {
        const data = Object.fromEntries(new FormData(ev.target).entries());
        data.active = 1;
        data.team = data.team || 'executive';
        data.shift_type = data.shift_type || 'full';
        if (!data.code && typeof nextCode === 'function') {
          data.code = await nextCode('personnel', teamPrefix(data.team));
        }
        if (id) {
          data.id = id;
          const prev = await DB.getById('personnel', id);
          if (prev) Object.assign(prev, data);
          await DB.put('personnel', prev || data);
        } else await DB.add('personnel', data);
        toast('ذخیره شد', 'success');
        closeModal();
        navigate('personnel?tab=' + (data.team || 'executive'));
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ذخیره پرسنل', 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'ذخیره';
        }
      }
    };
  };

  Pages.attendance = async function () {
    const day = hashParam('day', todayJalali());
    const teamFilter = hashParam('team', 'all');
    const canEdit = Auth.isAdmin();

    const people0 = await DB.getAll('personnel').catch(function () {
      return [];
    });
    const menus0 = await DB.getAll('daily_staff_menu').catch(function () {
      return [];
    });
    const att0 = await DB.getAll('attendance_meals').catch(function () {
      return [];
    });

    const people = (people0 || []).filter(function (p) {
      return p.active !== false && p.active !== 0;
    });
    const menu =
      (menus0 || []).find(function (m) {
        return m.date === day;
      }) || { date: day, breakfast_name: '', main_meal_name: '', notes: '' };
    const attRows = (att0 || []).filter(function (a) {
      return a.date === day;
    });
    const attByPerson = {};
    attRows.forEach(function (a) {
      attByPerson[a.person_id] = a;
    });

    let rows = people.map(function (p) {
      const sh = personShift(p);
      const a = attByPerson[p.id] || {};
      return {
        person: p,
        team: personTeam(p),
        shift: sh,
        present: !!Number(a.present),
        breakfast: !!Number(a.breakfast),
        lunch: !!Number(a.lunch),
        dinner: !!Number(a.dinner)
      };
    });
    if (teamFilter !== 'all')
      rows = rows.filter(function (r) {
        return r.team === teamFilter;
      });

    const sum = {
      present: rows.filter(function (r) {
        return r.present;
      }).length,
      breakfast: rows.filter(function (r) {
        return r.breakfast;
      }).length,
      lunch: rows.filter(function (r) {
        return r.lunch;
      }).length,
      dinner: rows.filter(function (r) {
        return r.dinner;
      }).length,
      total: rows.length
    };

    const teamChip = function (id, label) {
      const active = teamFilter === id;
      return (
        '<button class="' +
        (active ? 'btn-primary' : 'btn-ghost') +
        ' text-xs" onclick="navigate(\'attendance?day=' +
        encodeURIComponent(day) +
        '&team=' +
        id +
        '\')">' +
        label +
        '</button>'
      );
    };

    const chk = function (name, pid, checked, disabled) {
      if (disabled) return '<span class="text-slate-600">—</span>';
      return (
        '<input type="checkbox" data-field="' +
        name +
        '" data-pid="' +
        pid +
        '" ' +
        (checked ? 'checked' : '') +
        ' class="att-chk w-4 h-4 accent-emerald-500 cursor-pointer" ' +
        (canEdit ? '' : 'disabled') +
        ' />'
      );
    };

    const body = rows
      .map(function (r) {
        const allowDinner = r.shift === 'full';
        return (
          '<tr data-pid="' +
          r.person.id +
          '" data-name="' +
          String(r.person.name || '').replace(/"/g, '&quot;') +
          '" data-team="' +
          r.team +
          '" data-shift="' +
          r.shift +
          '">' +
          '<td class="font-medium">' +
          r.person.name +
          '</td>' +
          '<td class="text-xs text-slate-400">' +
          (TEAM_LABELS[r.team] || r.team) +
          '</td>' +
          '<td>' +
          chk('present', r.person.id, r.present, false) +
          '</td>' +
          '<td>' +
          chk('breakfast', r.person.id, r.breakfast, false) +
          '</td>' +
          '<td>' +
          chk('lunch', r.person.id, r.lunch, false) +
          '</td>' +
          '<td>' +
          chk('dinner', r.person.id, r.dinner, !allowDinner) +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-4">' +
      '<div><h1 class="text-2xl font-bold">🍽️ حضور و غذای روزانه</h1>' +
      '<p class="text-slate-400 text-sm">صبحانه جدا · ناهار و شام یک غذا · قابل گزارش</p></div>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button class="btn-secondary text-sm" onclick="navigate(\'personnel\')">← پرسنل</button>' +
      '<button class="btn-secondary text-sm" onclick="Pages.staffMealWhatsApp(\'' + day + '\')">📱 واتساپ امروز</button>' +
      '<button class="btn-secondary text-sm" onclick="Pages.staffMealReportForm()">📑 گزارش</button>' +
      '</div></div>' +
      '<div class="glass-card rounded-2xl p-4 mb-4 space-y-3">' +
      '<div class="flex flex-wrap gap-3 items-end"><div>' +
      '<label class="text-xs text-slate-400">تاریخ</label>' +
      '<input id="att-day" class="input-field" value="' +
      day +
      '" style="max-width:140px" onchange="navigate(\'attendance?day=\'+encodeURIComponent(this.value)+\'&team=' +
      teamFilter +
      '\')" /></div>' +
      '<div class="flex gap-1 flex-wrap">' +
      teamChip('all', 'همه') +
      teamChip('executive', 'اجرایی') +
      teamChip('sales', 'فروش') +
      teamChip('transport', 'ترابری') +
      '</div></div>' +
      '<div class="grid sm:grid-cols-2 gap-3"><div>' +
      '<label class="text-xs text-slate-400">نام غذا — صبحانه</label>' +
      '<input id="menu-breakfast" class="input-field" value="' +
      String(menu.breakfast_name || '').replace(/"/g, '&quot;') +
      '" placeholder="مثلاً نیمرو + پنیر" ' +
      (canEdit ? '' : 'readonly') +
      ' /></div><div>' +
      '<label class="text-xs text-slate-400">نام غذا — ناهار / شام (مشترک)</label>' +
      '<input id="menu-main" class="input-field" value="' +
      String(menu.main_meal_name || '').replace(/"/g, '&quot;') +
      '" placeholder="مثلاً عدس پلو" ' +
      (canEdit ? '' : 'readonly') +
      ' /></div></div>' +
      (canEdit
        ? '<button class="btn-primary text-sm" onclick="Pages.saveStaffMenu(\'' +
          day +
          '\')">ذخیره نام غذا</button>'
        : '') +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">حضور</div><div class="text-lg font-bold">' +
      sum.present +
      '/' +
      sum.total +
      '</div></div>' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">صبحانه</div><div class="text-lg font-bold">' +
      sum.breakfast +
      '</div></div>' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">ناهار</div><div class="text-lg font-bold">' +
      sum.lunch +
      '</div></div>' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">شام</div><div class="text-lg font-bold">' +
      sum.dinner +
      '</div></div></div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap">' +
      '<table class="data" id="att-table"><thead><tr><th>نام</th><th>تیم</th><th>حضور</th><th>صبحانه</th><th>ناهار</th><th>شام</th></tr></thead><tbody>' +
      (body ||
        '<tr><td colspan="6" class="text-center text-slate-500 py-8">پرسنل فعالی نیست</td></tr>') +
      '</tbody></table></div>' +
      (canEdit
        ? '<div class="flex flex-wrap gap-2 mt-4">' +
          '<button class="btn-primary" onclick="Pages.saveAttendance(\'' +
          day +
          '\')">💾 ذخیره حضور و وعده‌ها</button>' +
          '<button class="btn-ghost text-sm" onclick="Pages.markAllPresent()">همه حاضر</button>' +
          '<button class="btn-ghost text-sm text-red-400" onclick="Pages.deleteAttendanceDay(\'' +
          day +
          '\')">🗑 حذف این روز</button></div>'
        : '') +
      '</div>'
    );
  };

  Pages.saveStaffMenu = async function (day) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    day = day || (document.getElementById('att-day') && document.getElementById('att-day').value) || todayJalali();
    const breakfast_name = ((document.getElementById('menu-breakfast') && document.getElementById('menu-breakfast').value) || '').trim();
    const main_meal_name = ((document.getElementById('menu-main') && document.getElementById('menu-main').value) || '').trim();
    try {
      const all = (await DB.getAll('daily_staff_menu').catch(function () { return []; })) || [];
      const existing = all.find(function (m) { return m.date === day; });
      const data = { date: day, breakfast_name: breakfast_name, main_meal_name: main_meal_name, updated_at: new Date().toISOString() };
      if (existing && existing.id) {
        data.id = existing.id;
        await DB.put('daily_staff_menu', Object.assign({}, existing, data));
      } else {
        data.created_at = new Date().toISOString();
        await DB.add('daily_staff_menu', data);
      }
      toast('منوی روز ذخیره شد', 'success');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره منو', 'error');
    }
  };

  Pages.markAllPresent = function () {
    document.querySelectorAll('#att-table input[data-field="present"]').forEach(function (el) {
      el.checked = true;
    });
  };

  Pages.saveAttendance = async function (day) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    day = day || (document.getElementById('att-day') && document.getElementById('att-day').value) || todayJalali();
    try {
      await Pages.saveStaffMenu(day);
    } catch (_) {}

    const trs = document.querySelectorAll('#att-table tbody tr[data-pid]');
    try {
      const all = (await DB.getAll('attendance_meals').catch(function () { return []; })) || [];
      let saved = 0;
      for (let i = 0; i < trs.length; i++) {
        const tr = trs[i];
        const pid = Number(tr.getAttribute('data-pid'));
        const name = tr.getAttribute('data-name') || '';
        const team = tr.getAttribute('data-team') || '';
        const shift = tr.getAttribute('data-shift') || 'full';
        const get = function (f) {
          const el = tr.querySelector('input[data-field="' + f + '"]');
          return el && el.checked ? 1 : 0;
        };
        const present = get('present');
        const breakfast = get('breakfast');
        const lunch = get('lunch');
        const dinner = shift === 'full' ? get('dinner') : 0;
        const existing = all.find(function (a) {
          return a.date === day && Number(a.person_id) === pid;
        });
        const data = {
          date: day,
          person_id: pid,
          person_name: name,
          team: team,
          present: present,
          breakfast: breakfast,
          lunch: lunch,
          dinner: dinner,
          updated_at: new Date().toISOString()
        };
        if (existing && existing.id) {
          await DB.put('attendance_meals', Object.assign({}, existing, data, { id: existing.id }));
        } else {
          data.created_at = new Date().toISOString();
          await DB.add('attendance_meals', data);
        }
        saved++;
      }
      toast('حضور و وعده‌ها ذخیره شد (' + saved + ' نفر)', 'success');
      var teamKeep = (typeof hashParam === 'function' ? hashParam('team', 'all') : 'all');
      navigate('attendance?day=' + encodeURIComponent(day) + '&team=' + encodeURIComponent(teamKeep));
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره حضور', 'error');
    }
  };

  Pages.staffMealReportForm = async function () {
    const from = todayJalali();
    showModal(
      '<div class="modal"><h3 class="text-lg font-bold mb-4">گزارش حضور و غذای پرسنلی</h3>' +
        '<form id="meal-report-form" class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">از تاریخ</label><input name="from" class="input-field" value="' +
        from +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">تا تاریخ</label><input name="to" class="input-field" value="' +
        from +
        '" required /></div></div>' +
        '<div><label class="text-xs text-slate-400">تیم</label><select name="team" class="input-field">' +
        '<option value="all">همه</option><option value="executive">تیم اجرایی</option>' +
        '<option value="sales">تیم فروش</option><option value="transport">تیم ترابری</option></select></div>' +
        '<div class="flex gap-2 pt-2"><button type="submit" class="btn-primary flex-1">نمایش گزارش</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );
    document.getElementById('meal-report-form').onsubmit = async function (ev) {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(ev.target).entries());
      closeModal();
      await Pages.staffMealReport(fd.from, fd.to, fd.team || 'all');
    };
  };

  Pages.staffMealReport = async function (from, to, team) {
    const att0 = await DB.getAll('attendance_meals').catch(function () { return []; });
    const menus0 = await DB.getAll('daily_staff_menu').catch(function () { return []; });
    let rows = (att0 || []).filter(function (a) {
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      if (team && team !== 'all' && a.team !== team) return false;
      return true;
    });
    const menuByDate = {};
    (menus0 || []).forEach(function (m) {
      menuByDate[m.date] = m;
    });

    const byDay = {};
    rows.forEach(function (a) {
      if (!byDay[a.date]) byDay[a.date] = { present: 0, breakfast: 0, lunch: 0, dinner: 0 };
      if (Number(a.present)) byDay[a.date].present++;
      if (Number(a.breakfast)) byDay[a.date].breakfast++;
      if (Number(a.lunch)) byDay[a.date].lunch++;
      if (Number(a.dinner)) byDay[a.date].dinner++;
    });
    const days = Object.keys(byDay).sort();

    const totals = rows.reduce(
      function (s, a) {
        s.present += Number(a.present) ? 1 : 0;
        s.breakfast += Number(a.breakfast) ? 1 : 0;
        s.lunch += Number(a.lunch) ? 1 : 0;
        s.dinner += Number(a.dinner) ? 1 : 0;
        return s;
      },
      { present: 0, breakfast: 0, lunch: 0, dinner: 0 }
    );

    showModal(
      '<div class="modal" style="max-width:720px"><h3 class="text-lg font-bold mb-2">گزارش حضور و غذا</h3>' +
        '<p class="text-sm text-slate-400 mb-3">' +
        from +
        ' تا ' +
        to +
        ' · ' +
        (team === 'all' ? 'همه تیم‌ها' : TEAM_LABELS[team] || team) +
        '</p>' +
        '<div class="grid grid-cols-4 gap-2 mb-4 text-center text-sm">' +
        '<div class="stat-card"><div class="text-xs text-slate-400">حضور</div><b>' +
        totals.present +
        '</b></div>' +
        '<div class="stat-card"><div class="text-xs text-slate-400">صبحانه</div><b>' +
        totals.breakfast +
        '</b></div>' +
        '<div class="stat-card"><div class="text-xs text-slate-400">ناهار</div><b>' +
        totals.lunch +
        '</b></div>' +
        '<div class="stat-card"><div class="text-xs text-slate-400">شام</div><b>' +
        totals.dinner +
        '</b></div></div>' +
        '<div class="table-wrap max-h-80 overflow-y-auto"><table class="data">' +
        '<thead><tr><th>تاریخ</th><th>صبحانه</th><th>ناهار/شام</th><th>حضور</th><th>صبح</th><th>ناهار</th><th>شام</th><th></th></tr></thead><tbody>' +
        (days.length
          ? days
              .map(function (d) {
                const m = menuByDate[d] || {};
                const s = byDay[d];
                return (
                  '<tr><td>' +
                  d +
                  '</td><td class="text-xs">' +
                  (m.breakfast_name || '—') +
                  '</td><td class="text-xs">' +
                  (m.main_meal_name || '—') +
                  '</td><td>' +
                  s.present +
                  '</td><td>' +
                  s.breakfast +
                  '</td><td>' +
                  s.lunch +
                  '</td><td>' +
                  s.dinner +
                  '</td><td class="whitespace-nowrap">' +
                  '<button type="button" class="btn-ghost text-xs" onclick="closeModal(); navigate(\'attendance?day=' +
                  encodeURIComponent(d) +
                  '\')">ویرایش</button> ' +
                  (Auth.isAdmin()
                    ? '<button type="button" class="btn-ghost text-xs text-red-400" onclick="Pages.deleteAttendanceDay(\'' +
                      d +
                      '\')">حذف</button>'
                    : '') +
                  '</td></tr>'
                );
              })
              .join('')
          : '<tr><td colspan="8" class="text-center text-slate-500 py-6">داده‌ای نیست</td></tr>') +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-4">' +
        '<button class="btn-secondary flex-1" onclick="Pages.exportStaffMealExcel(\'' +
        from +
        "','" +
        to +
        "','" +
        team +
        '\')">📥 اکسل</button>' +
        '<button class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
  };

  Pages.exportStaffMealExcel = async function (from, to, team) {
    const att0 = await DB.getAll('attendance_meals').catch(function () { return []; });
    const menus0 = await DB.getAll('daily_staff_menu').catch(function () { return []; });
    let rows = (att0 || []).filter(function (a) {
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      if (team && team !== 'all' && a.team !== team) return false;
      return true;
    });
    const menuByDate = {};
    (menus0 || []).forEach(function (m) {
      menuByDate[m.date] = m;
    });
    const data = rows.map(function (a) {
      const m = menuByDate[a.date] || {};
      return {
        تاریخ: a.date,
        نام: a.person_name,
        تیم: TEAM_LABELS[a.team] || a.team,
        حضور: Number(a.present) ? 'بله' : 'خیر',
        صبحانه: Number(a.breakfast) ? 'بله' : 'خیر',
        ناهار: Number(a.lunch) ? 'بله' : 'خیر',
        شام: Number(a.dinner) ? 'بله' : 'خیر',
        'غذای صبحانه': m.breakfast_name || '',
        'غذای ناهار/شام': m.main_meal_name || ''
      };
    });
    if (!data.length) return toast('داده‌ای برای خروجی نیست', 'error');
    exportToExcel(data, 'staff-meals-' + from + '-' + to);
    toast('خروجی اکسل آماده شد', 'success');
  };

  Pages.deleteAttendanceDay = async function (day) {
    if (!Auth.isAdmin()) return toast('فقط مدیر می‌تواند حذف کند', 'error');
    day = day || (document.getElementById('att-day') && document.getElementById('att-day').value) || todayJalali();
    if (!window.confirm('همه حضور و وعده‌های تاریخ «' + day + '» حذف شود؟\nنام غذای آن روز هم پاک می‌شود.')) return;
    try {
      var att = (await DB.getAll('attendance_meals').catch(function () { return []; })) || [];
      var menus = (await DB.getAll('daily_staff_menu').catch(function () { return []; })) || [];
      var nAtt = 0, nMenu = 0;
      for (var i = 0; i < att.length; i++) {
        if (att[i].date === day && att[i].id != null) {
          await DB.remove('attendance_meals', att[i].id);
          nAtt++;
        }
      }
      for (var j = 0; j < menus.length; j++) {
        if (menus[j].date === day && menus[j].id != null) {
          await DB.remove('daily_staff_menu', menus[j].id);
          nMenu++;
        }
      }
      toast('حذف شد: ' + nAtt + ' حضور، ' + nMenu + ' منو', 'success');
      try { closeModal(); } catch (_) {}
      navigate('attendance?day=' + encodeURIComponent(day));
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در حذف — شاید تاریخ قفل باشد', 'error');
    }
  };

  Pages.staffMealWhatsApp = async function (day) {
    day = day || (typeof hashParam === 'function' ? hashParam('day', todayJalali()) : todayJalali());
    try {
      var people = ((await DB.getAll('personnel').catch(function () { return []; })) || []).filter(function (p) {
        return p.active !== false && p.active !== 0;
      });
      var menus = (await DB.getAll('daily_staff_menu').catch(function () { return []; })) || [];
      var att = ((await DB.getAll('attendance_meals').catch(function () { return []; })) || []).filter(function (a) {
        return a.date === day;
      });
      var menu = menus.find(function (m) { return m.date === day; }) || {};
      var company = 'غذای انصار';
      try {
        var local = localStorage.getItem('kitchen_settings');
        if (local) company = JSON.parse(local).company_name || company;
      } catch (_) {}

      var present = 0, br = 0, lu = 0, di = 0;
      att.forEach(function (a) {
        if (Number(a.present)) present++;
        if (Number(a.breakfast)) br++;
        if (Number(a.lunch)) lu++;
        if (Number(a.dinner)) di++;
      });

      var byTeam = { executive: [], sales: [], transport: [] };
      att.forEach(function (a) {
        var t = a.team || 'executive';
        if (!byTeam[t]) byTeam[t] = [];
        byTeam[t].push(a);
      });

      var lines = [
        '🍽️ گزارش حضور و غذای پرسنلی — ' + company,
        '📅 تاریخ: ' + day,
        '══════════════════',
        'صبحانه: ' + (menu.breakfast_name || '—'),
        'ناهار/شام: ' + (menu.main_meal_name || '—'),
        '─────────────',
        '👥 حضور: ' + present + ' از ' + people.length,
        '🥐 صبحانه: ' + br + ' | 🍲 ناهار: ' + lu + ' | 🌙 شام: ' + di
      ];

      ['executive', 'sales', 'transport'].forEach(function (tk) {
        var rows = byTeam[tk] || [];
        if (!rows.length) return;
        lines.push('');
        lines.push((TEAM_LABELS[tk] || tk) + ':');
        rows.forEach(function (a) {
          if (!Number(a.present) && !Number(a.breakfast) && !Number(a.lunch) && !Number(a.dinner)) return;
          var flags = [];
          if (Number(a.present)) flags.push('حاضر');
          if (Number(a.breakfast)) flags.push('صبح');
          if (Number(a.lunch)) flags.push('ناهار');
          if (Number(a.dinner)) flags.push('شام');
          lines.push('• ' + (a.person_name || '') + (flags.length ? (' — ' + flags.join('، ')) : ''));
        });
      });

      lines.push('══════════════════');
      lines.push('سیستم گردش مواد — ' + company);
      var text = lines.join('\n');

      showModal(
        '<div class="modal max-w-lg" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-2">📱 حضور و غذا — واتساپ</h3>' +
        '<p class="text-xs text-slate-400 mb-2">تاریخ: <b>' + day + '</b></p>' +
        '<div class="flex gap-2 mb-2">' +
        '<input id="wa-meal-day" class="input-field text-sm flex-1" value="' + day + '" />' +
        '<button type="button" class="btn-secondary text-sm" id="wa-meal-reload">بارگذاری</button></div>' +
        '<textarea id="wa-meal-text" class="input-field font-mono text-xs h-64" readonly></textarea>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="button" class="btn-primary flex-1" id="btn-wa-meal-copy">📋 کپی متن</button>' +
        '<button type="button" class="btn-secondary" id="btn-wa-meal-share">اشتراک</button>' +
        '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
      );
      var ta = document.getElementById('wa-meal-text');
      if (ta) ta.value = text;
      document.getElementById('wa-meal-reload').onclick = function () {
        var d = document.getElementById('wa-meal-day').value;
        Pages.staffMealWhatsApp(d);
      };
      document.getElementById('btn-wa-meal-copy').onclick = async function () {
        var t = ta ? ta.value : text;
        try {
          await navigator.clipboard.writeText(t);
          toast('کپی شد — برو تو واتساپ پیست کن', 'success');
        } catch (_) {
          if (ta) { ta.focus(); ta.select(); }
          toast('متن را نگه دار و کپی کن', 'info');
        }
      };
      document.getElementById('btn-wa-meal-share').onclick = async function () {
        var t = ta ? ta.value : text;
        if (navigator.share) {
          try { await navigator.share({ text: t }); } catch (e) {
            if (e && e.name !== 'AbortError') toast('اشتراک ناموفق', 'error');
          }
        } else {
          try {
            await navigator.clipboard.writeText(t);
            toast('کپی شد', 'success');
          } catch (_) {
            if (ta) { ta.focus(); ta.select(); }
          }
        }
      };
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ساخت گزارش واتساپ', 'error');
    }
  };

})();
/**
 * ارسال شعبه (گاردنیا) + انبارگردانی
 */
(function () {
  const BRANCH_DEFAULT = 'گاردنیا';
  const TYPE_LABELS = { material: 'ماده اولیه', product: 'محصول', general: 'اقلام عمومی' };

  Pages.showWhatsAppModal = function (title, text, opts) {
    opts = opts || {};
    showModal(
      '<div class="modal max-w-lg" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-2">📱 ' + title + '</h3>' +
        (opts.subtitle ? '<p class="text-xs text-slate-400 mb-2">' + opts.subtitle + '</p>' : '<p class="text-xs text-slate-400 mb-2">کپی کن و تو گروه واتساپ بذار</p>') +
        '<textarea id="wa-share-text" class="input-field font-mono text-xs h-64" readonly></textarea>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="button" class="btn-primary flex-1" id="btn-wa-copy">📋 کپی متن</button>' +
        '<button type="button" class="btn-secondary" id="btn-wa-share">اشتراک</button>' +
        '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
    var ta = document.getElementById('wa-share-text');
    if (ta) ta.value = text || '';
    document.getElementById('btn-wa-copy').onclick = async function () {
      try {
        await navigator.clipboard.writeText(text);
        toast('کپی شد — برو تو واتساپ پیست کن', 'success');
      } catch (err) {
        if (ta) { ta.focus(); ta.select(); }
        toast('متن را نگه دار و کپی کن', 'info');
      }
    };
    document.getElementById('btn-wa-share').onclick = async function () {
      if (navigator.share) {
        try { await navigator.share({ text: text }); } catch (e) {
          if (e && e.name !== 'AbortError') toast('اشتراک ناموفق', 'error');
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          toast('کپی شد — واتساپ را باز کن', 'success');
        } catch (_) { if (ta) { ta.focus(); ta.select(); } }
      }
    };
  };


  Pages.transfers = async function () {
    const canEdit = Auth.isAdmin() || (Auth.canEntry && Auth.canEntry());
    let transfers = [];
    let items = [];
    try {
      transfers = (await DB.getAll('branch_transfers')) || [];
    } catch (e) {
      transfers = [];
    }
    try {
      items = (await DB.getAll('branch_transfer_items')) || [];
    } catch (e) {
      items = [];
    }
    transfers = transfers
      .filter(function (t) {
        return !t.deleted_at;
      })
      .sort(function (a, b) {
        return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0);
      });

    const countItems = function (tid) {
      return items.filter(function (i) {
        return Number(i.transfer_id) === Number(tid);
      }).length;
    };
    const sumQty = function (tid) {
      return items
        .filter(function (i) {
          return Number(i.transfer_id) === Number(tid);
        })
        .reduce(function (s, i) {
          return s + Number(i.quantity || 0);
        }, 0);
    };

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-4">' +
      '<div><h1 class="text-2xl font-bold">🚚 ارسال شعبه</h1>' +
      '<p class="text-slate-400 text-sm">ارسال ماده / محصول / اقلام عمومی به گاردنیا و شعب</p></div>' +
      '<div class="flex gap-2">' +
      (canEdit
        ? '<button class="btn-primary" onclick="Pages.showTransferForm()">+ ثبت ارسال</button>'
        : '') +
      '<button class="btn-secondary text-sm" onclick="Pages.transferWhatsApp()">📱 واتساپ امروز</button>' +
      '<button class="btn-secondary text-sm" onclick="Pages.transferReportForm()">📑 گزارش</button>' +
      '</div></div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-300 border border-amber-500/20 flex gap-3 items-center">' +
      '<img src="logo-gardenia.png" alt="Gardenia" class="w-10 h-10 rounded-full object-cover border border-amber-600/40" />' +
      '<div>ارسال به <b>گاردنیا</b> از موجودی ماده کم می‌کند. محصولات و اقلام عمومی فقط ثبت گزارشی می‌شوند (موجودی ماده را تغییر نمی‌دهند).</div></div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>تاریخ</th><th>شعبه</th><th>تعداد قلم</th><th>توضیح</th><th></th></tr></thead><tbody>' +
      (transfers.length
        ? transfers
            .map(function (t) {
              return (
                '<tr><td>' +
                (t.date || '') +
                '</td><td class="font-medium">' +
                (t.branch_name || BRANCH_DEFAULT) +
                '</td><td>' +
                countItems(t.id) +
                ' قلم</td><td class="text-xs text-slate-400">' +
                (t.notes || '—') +
                '</td><td class="whitespace-nowrap">' +
                '<button class="btn-ghost text-xs" onclick="Pages.viewTransfer(' +
                t.id +
                ')">جزئیات</button> ' +
                '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.transferWhatsApp(\'' +
                String(t.date || '').replace(/'/g, '') +
                '\')">📱</button> ' +
                (canEdit
                  ? '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteTransfer(' +
                    t.id +
                    ')">حذف</button>'
                  : '') +
                '</td></tr>'
              );
            })
            .join('')
        : '<tr><td colspan="5" class="text-center text-slate-500 py-8">هنوز ارسالی ثبت نشده</td></tr>') +
      '</tbody></table></div></div>'
    );
  };


  Pages.showTransferForm = async function () {
    if (!(Auth.isAdmin() || (Auth.canEntry && Auth.canEntry()))) return toast('دسترسی ندارید', 'error');
    const [materials, products, generals, transfers] = await Promise.all([
      DB.getAll('materials').catch(function () { return []; }),
      DB.getAll('products').catch(function () { return []; }),
      DB.getAll('general_items').catch(function () { return []; }),
      DB.getAll('branch_transfers').catch(function () { return []; })
    ]);

    function activeList(arr) {
      return (arr || []).filter(function (m) { return m.active !== false && m.active !== 0 && !m.deleted_at; });
    }
    var mats = activeList(materials);
    var prods = activeList(products);
    var gens = activeList(generals);

    window.__tfMeta = {
      material: {},
      product: {},
      general: {}
    };
    mats.forEach(function (m) { window.__tfMeta.material[m.name] = m.unit || 'کیلوگرم'; });
    prods.forEach(function (m) { window.__tfMeta.product[m.name] = 'عدد'; });
    gens.forEach(function (m) { window.__tfMeta.general[m.name] = m.unit || 'عدد'; });

    var matOpts = mats.map(function (m) {
      return '<option value="' + m.name + '" data-unit="' + (m.unit || 'کیلوگرم') + '">' + m.name + '</option>';
    }).join('');
    var prodOpts = prods.map(function (m) {
      return '<option value="' + m.name + '" data-unit="عدد">' + m.name + '</option>';
    }).join('');
    var genOpts = gens.map(function (m) {
      return '<option value="' + m.name + '" data-unit="' + (m.unit || 'عدد') + '">' + m.name + '</option>';
    }).join('');

    var quickGens = gens.slice(0, 8).map(function (g) {
      return '<button type="button" class="text-xs px-2 py-1 rounded-full border border-amber-600/40 text-amber-200/90 bg-amber-500/10" onclick="Pages.quickAddGeneral(\'' +
        String(g.name).replace(/'/g, '') + '\',\'' + String(g.unit || 'عدد').replace(/'/g, '') + '\')">' + g.name + '</button>';
    }).join('');

    var lastT = ((transfers || []).filter(function (t) { return !t.deleted_at; })
      .sort(function (a, b) { return (b.id || 0) - (a.id || 0); })[0]) || null;

    showModal(
      '<div class="modal" style="max-width:640px" onclick="event.stopPropagation()">' +
        '<div class="flex items-center gap-3 mb-3">' +
        '<img src="logo-gardenia.png" alt="" class="w-11 h-11 rounded-full object-cover border border-amber-600/50" />' +
        '<div><h3 class="text-lg font-bold leading-tight">ثبت ارسال به شعبه</h3>' +
        '<p class="text-[11px] text-slate-400">گاردنیا · ماده / محصول / اقلام عمومی</p></div></div>' +
        '<form id="transfer-form" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label><input name="date" class="input-field" value="' + todayJalali() + '" required autocomplete="off" /></div>' +
        '<div><label class="text-xs text-slate-400">شعبه</label><input name="branch_name" class="input-field" value="' + BRANCH_DEFAULT + '" required autocomplete="off" /></div></div>' +
        '<div><label class="text-xs text-slate-400">توضیح (راننده / فاکتور)</label><input name="notes" class="input-field" placeholder="اختیاری" autocomplete="off" /></div>' +
        (quickGens
          ? '<div><div class="text-[10px] text-slate-500 mb-1">افزودن سریع اقلام عمومی</div><div class="flex flex-wrap gap-1.5">' + quickGens + '</div></div>'
          : '') +
        '<div class="border border-slate-600/40 rounded-xl p-3 space-y-2 bg-slate-900/20">' +
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-sm font-medium">لیست اقلام <span id="tf-count" class="text-xs text-slate-500">(0)</span></span>' +
        '<div class="flex gap-1">' +
        (lastT ? '<button type="button" class="btn-ghost text-[11px]" onclick="Pages.copyLastTransfer(' + lastT.id + ')">کپی آخرین ارسال</button>' : '') +
        '<button type="button" class="btn-secondary text-xs" onclick="Pages.addTransferRow(); Pages.refreshTfSummary();">+ ردیف</button></div></div>' +
        '<div id="tf-rows" class="tf-rows-scroll space-y-2"></div>' +
        '<div id="tf-summary" class="text-[11px] text-slate-400 border-t border-slate-600/30 pt-2 mt-1">هنوز قلمی نیست</div></div>' +
        '<div class="modal-sticky-actions space-y-2">' +
        '<label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">' +
        '<input type="checkbox" id="tf-open-wa" class="rounded" checked /> بعد از ذخیره، خروجی واتساپ باز شود</label>' +
        '<div class="flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ذخیره ارسال</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></div></form></div>'
    );

    window.__tfOpts = { mat: matOpts, prod: prodOpts, gen: genOpts };
    Pages.addTransferRow();
    Pages.refreshTfSummary();

    document.getElementById('transfer-form').onsubmit = async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.__formBusy = true;
      var btn = ev.target.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
      try {
        var fd = Object.fromEntries(new FormData(ev.target).entries());
        var rows = Pages.collectTransferRows();
        if (!rows.length) {
          toast('حداقل یک قلم با مقدار وارد کنید', 'error');
          window.__formBusy = false;
          if (btn) { btn.disabled = false; btn.textContent = '💾 ذخیره ارسال'; }
          return;
        }
        var header = {
          date: fd.date,
          branch_name: fd.branch_name || BRANCH_DEFAULT,
          notes: fd.notes || '',
          created_by: (Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) || '',
          created_at: new Date().toISOString()
        };
        var tid = await DB.add('branch_transfers', header);
        for (var i = 0; i < rows.length; i++) {
          await DB.add('branch_transfer_items', {
            transfer_id: tid,
            item_type: rows[i].item_type,
            item_name: rows[i].item_name,
            quantity: rows[i].quantity,
            unit: rows[i].unit || '',
            created_at: new Date().toISOString()
          });
        }
        var openWa = document.getElementById('tf-open-wa') && document.getElementById('tf-open-wa').checked;
        toast('ارسال ثبت شد (' + rows.length + ' قلم)', 'success');
        closeModal();
        window.__formBusy = false;
        if (openWa) {
          await Pages.transferWhatsApp(header.date);
        } else {
          navigate('transfers');
        }
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ذخیره', 'error');
        window.__formBusy = false;
        if (btn) { btn.disabled = false; btn.textContent = '💾 ذخیره ارسال'; }
      }
    };
  };

  Pages.collectTransferRows = function () {
    var rows = [];
    document.querySelectorAll('#tf-rows .tf-row').forEach(function (row) {
      var type = row.querySelector('[data-f="type"]').value;
      var name = (row.querySelector('[data-f="name"]').value || '').trim();
      var customEl = row.querySelector('[data-f="name_custom"]');
      if (type === 'general' && customEl && customEl.value.trim()) name = customEl.value.trim();
      var qty = Number(row.querySelector('[data-f="qty"]').value);
      var unit = (row.querySelector('[data-f="unit"]').value || '').trim();
      if (name && qty > 0) rows.push({ item_type: type, item_name: name, quantity: qty, unit: unit });
    });
    return rows;
  };

  Pages.refreshTfSummary = function () {
    var rows = Pages.collectTransferRows();
    var el = document.getElementById('tf-summary');
    var cnt = document.getElementById('tf-count');
    if (cnt) cnt.textContent = '(' + rows.length + ')';
    if (!el) return;
    if (!rows.length) {
      el.textContent = 'هنوز قلمی با مقدار معتبر نیست';
      return;
    }
    el.innerHTML = rows.map(function (r, i) {
      return (i + 1) + ') ' + r.item_name + ' <b class="text-slate-200">' + r.quantity + '</b> ' + (r.unit || '');
    }).join(' · ');
  };

  Pages.quickAddGeneral = function (name, unit) {
    Pages.addTransferRow('general', name, unit);
    var box = document.getElementById('tf-rows');
    if (box) {
      var last = box.querySelector('.tf-row:last-child');
      if (last) {
        var qty = last.querySelector('[data-f="qty"]');
        if (qty) { qty.focus(); qty.select && qty.select(); }
      }
    }
    Pages.refreshTfSummary();
  };

  Pages.copyLastTransfer = async function (tid) {
    try {
      var items = ((await DB.getAll('branch_transfer_items').catch(function () { return []; })) || []).filter(function (i) {
        return Number(i.transfer_id) === Number(tid);
      });
      if (!items.length) return toast('آخرین ارسال قلمی ندارد', 'info');
      var box = document.getElementById('tf-rows');
      if (box) box.innerHTML = '';
      items.forEach(function (i) {
        Pages.addTransferRow(i.item_type, i.item_name, i.unit, i.quantity);
      });
      Pages.refreshTfSummary();
      toast('اقلام آخرین ارسال بارگذاری شد — مقدارها را بررسی کن', 'success');
    } catch (e) {
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.addTransferRow = function (presetType, presetName, presetUnit, presetQty) {
    var box = document.getElementById('tf-rows');
    if (!box) return;
    var opts = window.__tfOpts || { mat: '', prod: '', gen: '' };
    var type = presetType || 'material';
    var div = document.createElement('div');
    div.className = 'tf-row border border-slate-600/30 rounded-xl p-2.5 space-y-2 bg-slate-950/30';
    var nameOpts = type === 'product' ? opts.prod : type === 'general' ? opts.gen : opts.mat;
    div.innerHTML =
      '<div class="flex items-center justify-between gap-2">' +
      '<select data-f="type" class="input-field text-sm flex-1">' +
      '<option value="material"' + (type === 'material' ? ' selected' : '') + '>ماده اولیه</option>' +
      '<option value="product"' + (type === 'product' ? ' selected' : '') + '>محصول</option>' +
      '<option value="general"' + (type === 'general' ? ' selected' : '') + '>اقلام عمومی</option></select>' +
      '<button type="button" class="btn-ghost text-xs text-red-400 px-2" title="حذف ردیف">✕</button></div>' +
      '<div><label class="text-[10px] text-slate-500">نام</label>' +
      '<select data-f="name" class="input-field text-sm">' + nameOpts + '</select>' +
      '<input data-f="name_custom" class="input-field text-sm mt-1' + (type === 'general' ? '' : ' hidden') + '" placeholder="نام دستی (اگر در لیست نیست)" autocomplete="off" /></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-[10px] text-slate-500">مقدار</label><input data-f="qty" type="number" step="0.01" min="0" inputmode="decimal" class="input-field text-sm" value="' + (presetQty != null ? presetQty : '') + '" /></div>' +
      '<div><label class="text-[10px] text-slate-500">واحد</label><input data-f="unit" class="input-field text-sm" placeholder="کیلو / عدد" autocomplete="off" value="' + (presetUnit || '') + '" /></div></div>';

    box.appendChild(div);
    var typeSel = div.querySelector('[data-f="type"]');
    var nameSel = div.querySelector('[data-f="name"]');
    var unitInp = div.querySelector('[data-f="unit"]');
    var qtyInp = div.querySelector('[data-f="qty"]');
    var delBtn = div.querySelector('button.btn-ghost');

    function applyUnit() {
      var t = typeSel.value;
      var n = nameSel.value;
      var meta = (window.__tfMeta && window.__tfMeta[t]) || {};
      if (meta[n]) unitInp.value = meta[n];
      else {
        var opt = nameSel.options[nameSel.selectedIndex];
        if (opt && opt.getAttribute('data-unit')) unitInp.value = opt.getAttribute('data-unit');
      }
      Pages.refreshTfSummary();
    }

    typeSel.onchange = function () {
      Pages.onTfTypeChange(typeSel);
      applyUnit();
    };
    nameSel.onchange = applyUnit;
    qtyInp.oninput = function () { Pages.refreshTfSummary(); };
    unitInp.oninput = function () { Pages.refreshTfSummary(); };
    delBtn.onclick = function () {
      div.remove();
      Pages.refreshTfSummary();
    };

    if (presetName) {
      nameSel.value = presetName;
      if (nameSel.value !== presetName && type === 'general') {
        var custom = div.querySelector('[data-f="name_custom"]');
        if (custom) { custom.classList.remove('hidden'); custom.value = presetName; }
      }
    }
    if (!presetUnit) applyUnit();
    box.scrollTop = box.scrollHeight;
  };

  Pages.onTfTypeChange = function (sel) {
    var row = sel.closest('.tf-row');
    var nameSel = row.querySelector('[data-f="name"]');
    var custom = row.querySelector('[data-f="name_custom"]');
    var opts = window.__tfOpts || { mat: '', prod: '', gen: '' };
    if (sel.value === 'material') {
      nameSel.innerHTML = opts.mat;
      nameSel.classList.remove('hidden');
      custom.classList.add('hidden');
      custom.value = '';
    } else if (sel.value === 'product') {
      nameSel.innerHTML = opts.prod;
      nameSel.classList.remove('hidden');
      custom.classList.add('hidden');
      custom.value = '';
    } else {
      nameSel.innerHTML = opts.gen + '<option value="">— سایر (دستی) —</option>';
      nameSel.classList.remove('hidden');
      custom.classList.remove('hidden');
    }
  };

  Pages.viewTransfer = async function (id) {
    const t = await DB.getById('branch_transfers', id);
    if (!t) return toast('یافت نشد', 'error');
    const items = ((await DB.getAll('branch_transfer_items').catch(function () {
      return [];
    })) || []).filter(function (i) {
      return Number(i.transfer_id) === Number(id);
    });
    showModal(
      '<div class="modal" style="max-width:560px"><h3 class="text-lg font-bold mb-2">جزئیات ارسال #' +
        id +
        '</h3>' +
        '<p class="text-sm text-slate-400 mb-3">' +
        (t.date || '') +
        ' · ' +
        (t.branch_name || '') +
        (t.notes ? ' · ' + t.notes : '') +
        '</p>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>نوع</th><th>نام</th><th>مقدار</th><th>واحد</th></tr></thead><tbody>' +
        items
          .map(function (i) {
            return (
              '<tr><td class="text-xs">' +
              (TYPE_LABELS[i.item_type] || i.item_type) +
              '</td><td>' +
              i.item_name +
              '</td><td class="font-bold">' +
              fmtNum(i.quantity) +
              '</td><td>' +
              (i.unit || '—') +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-4">' +
        '<button class="btn-primary flex-1" onclick="closeModal(); Pages.transferWhatsApp(\'' +
        String(t.date || '').replace(/'/g, '') +
        '\')">📱 واتساپ این روز</button>' +
        '<button class="btn-secondary" onclick="closeModal()">بستن</button></div></div>'
    );
  };

  Pages.deleteTransfer = async function (id) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('این ارسال حذف شود؟ (موجودی ماده برمی‌گردد)')) return;
    try {
      const t = await DB.getById('branch_transfers', id);
      if (t) {
        t.deleted_at = new Date().toISOString();
        await DB.put('branch_transfers', t);
      }
      toast('حذف شد', 'success');
      navigate('transfers');
    } catch (e) {
      toast(e.message || 'خطا', 'error');
    }
  };



  Pages.transferWhatsApp = async function (day) {
    day = day || todayJalali();
    try {
      var transfers = ((await DB.getAll('branch_transfers').catch(function () { return []; })) || []).filter(function (t) {
        return !t.deleted_at && t.date === day;
      });
      var allItems = (await DB.getAll('branch_transfer_items').catch(function () { return []; })) || [];
      var ids = {};
      transfers.forEach(function (t) { ids[t.id] = t; });
      var lines = allItems.filter(function (i) { return ids[i.transfer_id]; });

      var company = 'غذای انصار';
      try {
        var local = localStorage.getItem('kitchen_settings');
        if (local) company = JSON.parse(local).company_name || company;
      } catch (_) {}

      var textLines = [
        '🚚 گزارش ارسال شعبه — ' + company,
        '📅 تاریخ: ' + day,
        '══════════════════'
      ];

      if (!transfers.length) {
        textLines.push('برای این تاریخ ارسالی ثبت نشده.');
      } else {
        var byBranch = {};
        transfers.forEach(function (t) {
          var b = t.branch_name || 'گاردنیا';
          if (!byBranch[b]) byBranch[b] = [];
          byBranch[b].push(t);
        });
        Object.keys(byBranch).forEach(function (branch) {
          textLines.push('');
          textLines.push('🌿 شعبه: ' + branch);
          textLines.push('─────────────');
          byBranch[branch].forEach(function (t, idx) {
            var items = lines.filter(function (i) { return Number(i.transfer_id) === Number(t.id); });
            if (transfers.length > 1) textLines.push('ارسال ' + (idx + 1) + (t.notes ? ' (' + t.notes + ')' : '') + ':');
            else if (t.notes) textLines.push('توضیح: ' + t.notes);
            if (!items.length) textLines.push('  (بدون قلم)');
            else {
              items.forEach(function (i, n) {
                var typeL = TYPE_LABELS[i.item_type] || i.item_type;
                textLines.push(
                  (n + 1) + ') ' + i.item_name +
                  ' — ' + (Number(i.quantity) || 0) +
                  (i.unit ? ' ' + i.unit : '') +
                  ' [' + typeL + ']'
                );
              });
            }
          });
        });
        var sum = {};
        lines.forEach(function (i) {
          var k = i.item_name + '|' + (i.unit || '');
          if (!sum[k]) sum[k] = { name: i.item_name, unit: i.unit || '', qty: 0 };
          sum[k].qty += Number(i.quantity || 0);
        });
        var sumRows = Object.keys(sum).map(function (k) { return sum[k]; });
        if (sumRows.length) {
          textLines.push('');
          textLines.push('📊 جمع اقلام روز:');
          textLines.push('─────────────');
          sumRows.sort(function (a, b) { return a.name.localeCompare(b.name, 'fa'); });
          sumRows.forEach(function (r) {
            textLines.push('• ' + r.name + ': ' + r.qty + (r.unit ? ' ' + r.unit : ''));
          });
        }
        textLines.push('');
        textLines.push('تعداد برگه ارسال: ' + transfers.length + ' | ردیف: ' + lines.length);
      }
      textLines.push('══════════════════');
      textLines.push('سیستم گردش مواد — ' + company);

      var text = textLines.join('\n');
      showModal(
        '<div class="modal max-w-lg" onclick="event.stopPropagation()"><h3 class="text-lg font-bold mb-2">📱 گزارش واتساپ — ارسال شعبه</h3>' +
        '<p class="text-xs text-slate-400 mb-2">تاریخ را عوض کن و بارگذاری بزن</p>' +
        '<div class="flex gap-2 mb-2">' +
        '<input id="wa-day" class="input-field text-sm flex-1" value="' + day + '" />' +
        '<button type="button" class="btn-secondary text-sm" id="wa-day-load">بارگذاری</button></div>' +
        '<textarea id="wa-share-text" class="input-field font-mono text-xs h-64" readonly></textarea>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="button" class="btn-primary flex-1" id="btn-wa-copy">📋 کپی متن</button>' +
        '<button type="button" class="btn-secondary" id="btn-wa-share">اشتراک</button>' +
        '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
      );
      var ta = document.getElementById('wa-share-text');
      if (ta) ta.value = text;
      document.getElementById('wa-day-load').onclick = function () {
        Pages.transferWhatsApp(document.getElementById('wa-day').value);
      };
      document.getElementById('btn-wa-copy').onclick = async function () {
        try {
          await navigator.clipboard.writeText(ta.value);
          toast('کپی شد — برو تو واتساپ پیست کن', 'success');
        } catch (err) {
          if (ta) { ta.focus(); ta.select(); }
          toast('متن را نگه دار و کپی کن', 'info');
        }
      };
      document.getElementById('btn-wa-share').onclick = async function () {
        var t = ta ? ta.value : text;
        if (navigator.share) {
          try { await navigator.share({ text: t }); } catch (e) {
            if (e && e.name !== 'AbortError') toast('اشتراک ناموفق', 'error');
          }
        } else {
          try {
            await navigator.clipboard.writeText(t);
            toast('کپی شد', 'success');
          } catch (_) { if (ta) { ta.focus(); ta.select(); } }
        }
      };
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.stocktakeWhatsApp = async function (id) {
    try {
      var st = await DB.getById('stocktakes', id);
      if (!st) return toast('یافت نشد', 'error');
      var lines = ((await DB.getAll('stocktake_lines').catch(function () { return []; })) || []).filter(function (l) {
        return Number(l.stocktake_id) === Number(id);
      });
      lines.sort(function (a, b) { return Math.abs(b.variance) - Math.abs(a.variance); });
      var company = 'غذای انصار';
      try {
        var local = localStorage.getItem('kitchen_settings');
        if (local) company = JSON.parse(local).company_name || company;
      } catch (_) {}
      var totalSys = 0, totalCnt = 0, absVar = 0, shortN = 0, surN = 0, okN = 0;
      lines.forEach(function (l) {
        totalSys += Number(l.system_qty || 0);
        totalCnt += Number(l.counted_qty || 0);
        var v = Number(l.variance || 0);
        absVar += Math.abs(v);
        if (v < 0) shortN++; else if (v > 0) surN++; else okN++;
      });
      var totalVar = Math.round((totalCnt - totalSys) * 100) / 100;
      var accuracy = totalSys !== 0 ? Math.round((1 - absVar / Math.max(Math.abs(totalSys), 0.01)) * 1000) / 10 : 100;
      var textLines = [
        '📋 گزارش انبارگردانی — ' + company,
        '📅 تاریخ: ' + (st.date || ''),
        st.notes ? ('یادداشت: ' + st.notes) : null,
        'ثبت‌کننده: ' + (st.created_by || '—'),
        '══════════════════',
        'جمع سیستم: ' + totalSys,
        'جمع واقعی: ' + totalCnt,
        'اختلاف خالص: ' + (totalVar > 0 ? '+' : '') + totalVar,
        'دقت تقریبی: ' + accuracy + '٪',
        'کسری: ' + shortN + ' | اضافه: ' + surN + ' | مطابق: ' + okN,
        '─────────────'
      ].filter(Boolean);
      lines.forEach(function (l) {
        var v = Number(l.variance || 0);
        var tag = v < 0 ? '❌ کسری' : v > 0 ? '⚠️ اضافه' : '✅';
        textLines.push(
          tag + ' ' + l.material_name +
          '\n   سیستم: ' + l.system_qty + ' | واقعی: ' + l.counted_qty +
          ' | اختلاف: ' + (v > 0 ? '+' : '') + v +
          (l.notes ? (' | ' + l.notes) : '')
        );
      });
      textLines.push('══════════════════');
      textLines.push('سیستم گردش مواد — ' + company);
      Pages.showWhatsAppModal('انبارگردانی — واتساپ', textLines.join('\n'), {
        subtitle: 'تاریخ ' + (st.date || '') + ' — برای مدیر'
      });
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.transferReportForm = function () {
    const d = todayJalali();
    showModal(
      '<div class="modal"><h3 class="text-lg font-bold mb-3">گزارش ارسال شعبه</h3>' +
        '<form id="tr-rep" class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">از</label><input name="from" class="input-field" value="' +
        d +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">تا</label><input name="to" class="input-field" value="' +
        d +
        '" /></div></div>' +
        '<button type="submit" class="btn-primary w-full">نمایش</button></form></div>'
    );
    document.getElementById('tr-rep').onsubmit = async function (ev) {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(ev.target).entries());
      closeModal();
      await Pages.transferReport(fd.from, fd.to);
    };
  };

  Pages.transferReport = async function (from, to) {
    const transfers = ((await DB.getAll('branch_transfers').catch(function () {
      return [];
    })) || []).filter(function (t) {
      if (t.deleted_at) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      return true;
    });
    const items = (await DB.getAll('branch_transfer_items').catch(function () {
      return [];
    })) || [];
    const tidSet = new Set(transfers.map(function (t) {
      return t.id;
    }));
    const lines = items.filter(function (i) {
      return tidSet.has(i.transfer_id);
    });
    const byName = {};
    lines.forEach(function (i) {
      const k = (i.item_type || '') + '|' + i.item_name;
      if (!byName[k]) byName[k] = { type: i.item_type, name: i.item_name, qty: 0, unit: i.unit || '' };
      byName[k].qty += Number(i.quantity || 0);
    });
    const rows = Object.values(byName).sort(function (a, b) {
      return a.name.localeCompare(b.name, 'fa');
    });
    const excelData = lines.map(function (i) {
      const t = transfers.find(function (x) {
        return x.id === i.transfer_id;
      }) || {};
      return {
        تاریخ: t.date,
        شعبه: t.branch_name,
        نوع: TYPE_LABELS[i.item_type] || i.item_type,
        نام: i.item_name,
        مقدار: i.quantity,
        واحد: i.unit || '',
        توضیح: t.notes || ''
      };
    });
    showModal(
      '<div class="modal" style="max-width:640px"><h3 class="text-lg font-bold mb-2">گزارش ارسال</h3>' +
        '<p class="text-sm text-slate-400 mb-3">' +
        from +
        ' تا ' +
        to +
        ' · ' +
        transfers.length +
        ' ارسال · ' +
        lines.length +
        ' ردیف</p>' +
        '<div class="table-wrap max-h-72 overflow-y-auto"><table class="data">' +
        '<thead><tr><th>نوع</th><th>نام</th><th>جمع مقدار</th><th>واحد</th></tr></thead><tbody>' +
        (rows.length
          ? rows
              .map(function (r) {
                return (
                  '<tr><td class="text-xs">' +
                  (TYPE_LABELS[r.type] || r.type) +
                  '</td><td>' +
                  r.name +
                  '</td><td class="font-bold">' +
                  fmtNum(r.qty) +
                  '</td><td>' +
                  (r.unit || '—') +
                  '</td></tr>'
                );
              })
              .join('')
          : '<tr><td colspan="4" class="text-center text-slate-500 py-6">داده‌ای نیست</td></tr>') +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-3">' +
        '<button class="btn-secondary flex-1" onclick=\'Pages._exportTransferExcel(' +
        JSON.stringify(excelData).replace(/'/g, '&#39;') +
        ")'>📥 اکسل</button>" +
        '<button class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
  };

  Pages._exportTransferExcel = function (data) {
    if (!data || !data.length) return toast('خالی', 'error');
    exportToExcel(data, 'branch-transfers');
    toast('خروجی اکسل آماده شد', 'success');
  };

  /* ========== انبارگردانی ========== */
  Pages.stocktake = async function () {
    if (!Auth.isAdmin() && !(Auth.canEntry && Auth.canEntry())) {
      return '<p class="text-red-400">دسترسی محدود</p>';
    }
    let list = [];
    try {
      list = ((await DB.getAll('stocktakes')) || []).filter(function (s) {
        return !s.deleted_at;
      });
    } catch (e) {
      list = [];
    }
    list.sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0);
    });

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-4">' +
      '<div><h1 class="text-2xl font-bold">📋 انبارگردانی</h1>' +
      '<p class="text-slate-400 text-sm">مقایسه موجودی واقعی با سیستم — گزارش اختلاف برای مدیر</p></div>' +
      (Auth.isAdmin()
        ? '<button class="btn-primary" onclick="Pages.showStocktakeForm()">+ انبارگردانی جدید</button>'
        : '') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
      'سیستم موجودی را از روی ورود − تولید − ضایعات − ارسال شعبه حساب می‌کند. شما عدد واقعی انبار را وارد می‌کنید؛ اختلاف (واریانس) و درصد برای گزارش مدیر محاسبه می‌شود.' +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>تاریخ</th><th>توضیح</th><th>ثبت‌کننده</th><th></th></tr></thead><tbody>' +
      (list.length
        ? list
            .map(function (s) {
              return (
                '<tr><td>' +
                s.date +
                '</td><td class="text-xs">' +
                (s.notes || '—') +
                '</td><td class="text-xs text-slate-400">' +
                (s.created_by || '—') +
                '</td><td>' +
                '<button class="btn-ghost text-xs" onclick="Pages.viewStocktake(' +
                s.id +
                ')">گزارش</button> ' +
                '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.stocktakeWhatsApp(' +
                s.id +
                ')">📱</button></td></tr>'
              );
            })
            .join('')
        : '<tr><td colspan="4" class="text-center text-slate-500 py-8">هنوز انبارگردانی ثبت نشده</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  Pages.showStocktakeForm = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    let stock = [];
    try {
      stock = await DB.calcStock();
    } catch (e) {
      toast('خطا در موجودی سیستم', 'error');
      return;
    }
    stock = (stock || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });

    const rowsHtml = stock
      .map(function (m) {
        const sys = Number(m.current_stock || 0);
        return (
          '<tr data-name="' +
          String(m.name).replace(/"/g, '&quot;') +
          '" data-sys="' +
          sys +
          '">' +
          '<td class="font-medium">' +
          m.name +
          '</td>' +
          '<td class="text-slate-400">' +
          (m.unit || '') +
          '</td>' +
          '<td class="font-bold text-brand-300">' +
          fmtNum(sys) +
          '</td>' +
          '<td><input type="number" step="0.01" class="input-field text-sm st-count" style="max-width:100px" placeholder="واقعی" /></td>' +
          '<td><input class="input-field text-sm st-note" style="max-width:120px" placeholder="—" /></td></tr>'
        );
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:720px"><h3 class="text-lg font-bold mb-3">انبارگردانی جدید</h3>' +
        '<div class="grid grid-cols-2 gap-2 mb-3">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label><input id="st-date" class="input-field" value="' +
        todayJalali() +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">توضیح</label><input id="st-notes" class="input-field" placeholder="مثلاً انبارگردانی پایان ماه" /></div></div>' +
        '<p class="text-xs text-slate-500 mb-2">فقط ردیف‌هایی که عدد واقعی پر شده ذخیره می‌شوند. خالی = رد شدن آن ماده.</p>' +
        '<div class="table-wrap max-h-80 overflow-y-auto"><table class="data">' +
        '<thead><tr><th>ماده</th><th>واحد</th><th>سیستم</th><th>شمارش واقعی</th><th>یادداشت</th></tr></thead><tbody id="st-body">' +
        rowsHtml +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-3"><button class="btn-primary flex-1" onclick="Pages.saveStocktake()">ذخیره و گزارش</button>' +
        '<button class="btn-secondary" onclick="closeModal()">انصراف</button></div></div>'
    );
  };

  Pages.saveStocktake = async function () {
    if (!Auth.isAdmin()) return;
    const date = (document.getElementById('st-date') && document.getElementById('st-date').value) || todayJalali();
    const notes = (document.getElementById('st-notes') && document.getElementById('st-notes').value) || '';
    const trs = document.querySelectorAll('#st-body tr');
    const lines = [];
    trs.forEach(function (tr) {
      const inp = tr.querySelector('.st-count');
      if (!inp || inp.value === '' || inp.value == null) return;
      const counted = Number(inp.value);
      const sys = Number(tr.getAttribute('data-sys') || 0);
      const name = tr.getAttribute('data-name');
      const note = (tr.querySelector('.st-note') && tr.querySelector('.st-note').value) || '';
      lines.push({
        material_name: name,
        system_qty: sys,
        counted_qty: counted,
        variance: Math.round((counted - sys) * 100) / 100,
        notes: note
      });
    });
    if (!lines.length) return toast('حداقل یک ماده را شمارش کنید', 'error');
    try {
      const sid = await DB.add('stocktakes', {
        date: date,
        notes: notes,
        created_by: (Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) || '',
        created_at: new Date().toISOString()
      });
      for (let i = 0; i < lines.length; i++) {
        await DB.add('stocktake_lines', Object.assign({ stocktake_id: sid }, lines[i]));
      }
      toast('انبارگردانی ذخیره شد', 'success');
      closeModal();
      await Pages.viewStocktake(sid);
      navigate('stocktake');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.viewStocktake = async function (id) {
    const st = await DB.getById('stocktakes', id);
    if (!st) return toast('یافت نشد', 'error');
    const lines = ((await DB.getAll('stocktake_lines').catch(function () {
      return [];
    })) || []).filter(function (l) {
      return Number(l.stocktake_id) === Number(id);
    });
    lines.sort(function (a, b) {
      return Math.abs(b.variance) - Math.abs(a.variance);
    });

    const totalSys = lines.reduce(function (s, l) {
      return s + Number(l.system_qty || 0);
    }, 0);
    const totalCnt = lines.reduce(function (s, l) {
      return s + Number(l.counted_qty || 0);
    }, 0);
    const totalVar = Math.round((totalCnt - totalSys) * 100) / 100;
    const absVar = lines.reduce(function (s, l) {
      return s + Math.abs(Number(l.variance || 0));
    }, 0);
    const shortage = lines.filter(function (l) {
      return Number(l.variance) < 0;
    });
    const surplus = lines.filter(function (l) {
      return Number(l.variance) > 0;
    });
    const match = lines.filter(function (l) {
      return Number(l.variance) === 0;
    });
    const accuracy =
      totalSys !== 0 ? Math.round((1 - absVar / Math.max(Math.abs(totalSys), 0.01)) * 1000) / 10 : 100;

    const reportHtml =
      '<div class="modal" style="max-width:720px">' +
      '<h3 class="text-lg font-bold mb-1">گزارش انبارگردانی برای مدیر</h3>' +
      '<p class="text-sm text-slate-400 mb-3">' +
      (st.date || '') +
      (st.notes ? ' · ' + st.notes : '') +
      ' · ' +
      (st.created_by || '') +
      '</p>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center text-sm">' +
      '<div class="stat-card"><div class="text-xs text-slate-400">جمع سیستم</div><b>' +
      fmtNum(totalSys) +
      '</b></div>' +
      '<div class="stat-card"><div class="text-xs text-slate-400">جمع واقعی</div><b>' +
      fmtNum(totalCnt) +
      '</b></div>' +
      '<div class="stat-card"><div class="text-xs text-slate-400">اختلاف خالص</div><b class="' +
      (totalVar < 0 ? 'text-red-300' : totalVar > 0 ? 'text-amber-300' : 'text-brand-300') +
      '">' +
      (totalVar > 0 ? '+' : '') +
      fmtNum(totalVar) +
      '</b></div>' +
      '<div class="stat-card"><div class="text-xs text-slate-400">دقت تقریبی</div><b>' +
      accuracy +
      '٪</b></div></div>' +
      '<div class="grid grid-cols-3 gap-2 mb-4 text-center text-xs">' +
      '<div class="glass-card p-2 rounded-xl">کسری: <b class="text-red-300">' +
      shortage.length +
      '</b> قلم</div>' +
      '<div class="glass-card p-2 rounded-xl">اضافه: <b class="text-amber-300">' +
      surplus.length +
      '</b> قلم</div>' +
      '<div class="glass-card p-2 rounded-xl">مطابق: <b class="text-brand-300">' +
      match.length +
      '</b> قلم</div></div>' +
      '<div class="table-wrap max-h-72 overflow-y-auto"><table class="data">' +
      '<thead><tr><th>ماده</th><th>سیستم</th><th>واقعی</th><th>اختلاف</th><th>٪ اختلاف</th><th>یادداشت</th></tr></thead><tbody>' +
      lines
        .map(function (l) {
          const v = Number(l.variance || 0);
          const pct =
            Number(l.system_qty) !== 0
              ? Math.round((v / Math.abs(Number(l.system_qty))) * 1000) / 10
              : v === 0
                ? 0
                : 100;
          const cls = v < 0 ? 'text-red-300' : v > 0 ? 'text-amber-300' : 'text-brand-300';
          return (
            '<tr><td>' +
            l.material_name +
            '</td><td>' +
            fmtNum(l.system_qty) +
            '</td><td>' +
            fmtNum(l.counted_qty) +
            '</td><td class="font-bold ' +
            cls +
            '">' +
            (v > 0 ? '+' : '') +
            fmtNum(v) +
            '</td><td class="' +
            cls +
            '">' +
            (pct > 0 ? '+' : '') +
            pct +
            '٪</td><td class="text-xs">' +
            (l.notes || '—') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>' +
      '<p class="text-[10px] text-slate-500 mt-2">اختلاف منفی = کسری نسبت به سیستم (ممکن است ضایعات ثبت‌نشده، ارسال بدون ثبت، یا خطای ورود باشد). اختلاف مثبت = موجودی واقعی بیشتر از سیستم.</p>' +
      '<div class="flex gap-2 mt-3">' +
      '<button class="btn-primary flex-1" onclick="Pages.stocktakeWhatsApp(' + id + ')">📱 واتساپ</button>' +
      '<button class="btn-secondary flex-1" onclick="Pages.exportStocktakeExcel(' +
      id +
      ')">📥 اکسل</button>' +
      '<button class="btn-ghost" onclick="closeModal()">بستن</button></div></div>';

    showModal(reportHtml);
  };

  Pages.manageGeneralItems = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    let list = [];
    try { list = (await DB.getAll('general_items')) || []; } catch (e) { list = []; }
    list = list.filter(function (g) { return !g.deleted_at && g.active !== 0 && g.active !== false; });
    var rows = list.map(function (g) {
      var safe = String(g.name || '').replace(/'/g, '');
      return '<tr><td class="text-xs">' + (g.code || '') + '</td><td>' + g.name + '</td><td>' + (g.unit || '') +
        '</td><td class="whitespace-nowrap">' +
        '<button type="button" class="btn-ghost text-xs" onclick="Pages.editGeneralItem(' + g.id + ')">ویرایش</button> ' +
        '<button type="button" class="btn-ghost text-xs text-red-400" onclick="Pages.deleteGeneralItem(' + g.id + ')">حذف</button>' +
        '</td></tr>';
    }).join('');
    showModal(
      '<div class="modal" style="max-width:520px" onclick="event.stopPropagation()"><h3 class="text-lg font-bold mb-3">اقلام عمومی</h3>' +
      '<div class="table-wrap max-h-56 overflow-y-auto mb-3"><table class="data"><thead><tr><th>کد</th><th>نام</th><th>واحد</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" class="text-center text-slate-500">خالی</td></tr>') +
      '</tbody></table></div>' +
      '<form id="gi-form" class="space-y-2 border-t border-slate-600/40 pt-3">' +
      '<div class="text-xs text-slate-400 mb-1">افزودن قلم جدید</div>' +
      '<div class="grid grid-cols-3 gap-2">' +
      '<input name="code" class="input-field text-sm" placeholder="کد" autocomplete="off" />' +
      '<input name="name" class="input-field text-sm" placeholder="نام" required autocomplete="off" />' +
      '<input name="unit" class="input-field text-sm" placeholder="واحد" value="عدد" autocomplete="off" /></div>' +
      '<div class="modal-sticky-actions flex gap-2">' +
      '<button type="submit" class="btn-primary flex-1 text-sm">+ افزودن</button>' +
      '<button type="button" class="btn-secondary text-sm" onclick="closeModal()">بستن</button></div></form></div>'
    );
    document.getElementById('gi-form').onsubmit = async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      try {
        await DB.add('general_items', data);
        toast('اضافه شد', 'success');
        closeModal();
        Pages.manageGeneralItems();
      } catch (e) { toast(e.message || 'خطا', 'error'); }
    };
  };

  Pages.editGeneralItem = async function (id) {
    if (!Auth.isAdmin()) return;
    var g = await DB.getById('general_items', id);
    if (!g) return toast('یافت نشد', 'error');
    showModal(
      '<div class="modal" onclick="event.stopPropagation()"><h3 class="text-lg font-bold mb-3">ویرایش اقلام عمومی</h3>' +
      '<form id="gi-edit" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="' + (g.code || '') + '" /></div>' +
      '<div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="' + (g.name || '') + '" required /></div>' +
      '<div><label class="text-xs text-slate-400">واحد</label><input name="unit" class="input-field" value="' + (g.unit || '') + '" /></div>' +
      '<div class="modal-sticky-actions flex gap-2">' +
      '<button type="submit" class="btn-primary flex-1">ذخیره</button>' +
      '<button type="button" class="btn-secondary" onclick="Pages.manageGeneralItems()">بازگشت</button></div></form></div>'
    );
    document.getElementById('gi-edit').onsubmit = async function (ev) {
      ev.preventDefault();
      var data = Object.fromEntries(new FormData(ev.target).entries());
      try {
        Object.assign(g, data);
        g.active = 1;
        await DB.put('general_items', g);
        toast('ذخیره شد', 'success');
        Pages.manageGeneralItems();
      } catch (e) { toast(e.message || 'خطا', 'error'); }
    };
  };

  Pages.deleteGeneralItem = async function (id) {
    if (!Auth.isAdmin()) return;
    if (!confirmAction('این قلم حذف شود؟')) return;
    try {
      await DB.remove('general_items', id);
      toast('حذف شد', 'success');
      Pages.manageGeneralItems();
    } catch (e) { toast(e.message || 'خطا', 'error'); }
  };

  Pages.exportStocktakeExcel = async function (id) {
    const st = await DB.getById('stocktakes', id);
    const lines = ((await DB.getAll('stocktake_lines').catch(function () {
      return [];
    })) || []).filter(function (l) {
      return Number(l.stocktake_id) === Number(id);
    });
    const data = lines.map(function (l) {
      const v = Number(l.variance || 0);
      const pct =
        Number(l.system_qty) !== 0 ? Math.round((v / Math.abs(Number(l.system_qty))) * 1000) / 10 : 0;
      return {
        تاریخ: st && st.date,
        ماده: l.material_name,
        'موجودی سیستم': l.system_qty,
        'شمارش واقعی': l.counted_qty,
        اختلاف: v,
        'درصد اختلاف': pct,
        وضعیت: v < 0 ? 'کسری' : v > 0 ? 'اضافه' : 'مطابق',
        یادداشت: l.notes || ''
      };
    });
    exportToExcel(data, 'stocktake-' + ((st && st.date) || id));
    toast('خروجی اکسل آماده شد', 'success');
  };
})();
/**
 * دستور ساخت چندماده‌ای + تولید با ورودی واقعی / خروجی واقعی یا تخمینی
 */
(function () {
  function companyName() {
    try {
      var local = localStorage.getItem('kitchen_settings');
      if (local) return JSON.parse(local).company_name || 'غذای انصار';
    } catch (_) {}
    return 'غذای انصار';
  }

  async function loadRecipeMap() {
    var recipes = (await DB.getAll('recipes').catch(function () { return []; })) || [];
    var items = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
    var map = {};
    recipes.forEach(function (r) {
      map[r.product_name] = {
        recipe: r,
        items: items
          .filter(function (i) { return i.product_name === r.product_name; })
          .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
      };
    });
    return map;
  }

  /* ========== ویرایش دستور ساخت ========== */
  Pages.editRecipe = async function (productName) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    productName = productName || '';
    var materials = ((await DB.getAll('materials').catch(function () { return []; })) || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });
    var recipes = (await DB.getAll('recipes').catch(function () { return []; })) || [];
    var items = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
    var rec = recipes.find(function (r) { return r.product_name === productName; }) || {
      product_name: productName,
      mode: 'multi_input',
      yield_factor: '',
      notes: ''
    };
    var recItems = items.filter(function (i) { return i.product_name === productName; });

    var matOpts = materials
      .map(function (m) {
        return '<option value="' + m.name + '">' + m.name + (m.unit ? ' (' + m.unit + ')' : '') + '</option>';
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:640px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-1">🧩 دستور ساخت</h3>' +
        '<p class="text-xs text-slate-400 mb-3">' +
        productName +
        ' — الگوی مواد برای یک پخت / ترکیب پایه</p>' +
        '<form id="recipe-form" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">ضریب پخت (اختیاری)</label>' +
        '<input name="yield_factor" id="rc-yield" type="number" step="0.001" class="input-field" value="' +
        (rec.yield_factor != null && rec.yield_factor !== '' ? rec.yield_factor : '') +
        '" placeholder="مثلاً ۲.۴۵ برای برنج" />' +
        '<p class="text-[10px] text-slate-500 mt-1">خروجی ≈ جمع مواد × ضریب (وقتی وزن نمی‌کنید)</p></div>' +
        '<div><label class="text-xs text-slate-400">یادداشت</label>' +
        '<input name="notes" class="input-field" value="' +
        String(rec.notes || '').replace(/"/g, '&quot;') +
        '" placeholder="مثلاً پخت دیگ بزرگ" /></div></div>' +
        '<div class="border border-slate-600/40 rounded-xl p-3 space-y-2">' +
        '<div class="flex justify-between items-center">' +
        '<span class="text-sm font-medium">مواد الگو</span>' +
        '<button type="button" class="btn-secondary text-xs" id="rc-add-row">+ ماده</button></div>' +
        '<div id="rc-rows" class="tf-rows-scroll space-y-2"></div>' +
        '<p class="text-[10px] text-slate-500">مثال قورمه: گوشت ۸ + لوبیا ۷ + سبزی ۷ — خروجی هر بار فرق می‌کند و موقع تولید وارد می‌شود.</p></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ذخیره دستور</button>' +
        '<button type="button" class="btn-ghost text-red-400" id="rc-clear">حذف دستور</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    var box = document.getElementById('rc-rows');
    function addRow(name, qty) {
      var div = document.createElement('div');
      div.className = 'rc-row grid grid-cols-5 gap-2 items-end';
      div.innerHTML =
        '<div class="col-span-3"><label class="text-[10px] text-slate-500">ماده</label>' +
        '<select data-f="mat" class="input-field text-sm"><option value="">—</option>' +
        matOpts +
        '</select></div>' +
        '<div><label class="text-[10px] text-slate-500">مقدار</label>' +
        '<input data-f="qty" type="number" step="0.001" min="0" class="input-field text-sm" value="' +
        (qty != null ? qty : '') +
        '" /></div>' +
        '<div><button type="button" class="btn-ghost text-xs text-red-400 w-full">حذف</button></div>';
      box.appendChild(div);
      if (name) div.querySelector('[data-f="mat"]').value = name;
      div.querySelector('button').onclick = function () {
        div.remove();
      };
    }
    if (recItems.length) {
      recItems.forEach(function (i) {
        addRow(i.material_name, i.qty);
      });
    } else {
      addRow('', '');
      addRow('', '');
    }
    document.getElementById('rc-add-row').onclick = function () {
      addRow('', '');
    };

    document.getElementById('rc-clear').onclick = async function () {
      if (!confirmAction('دستور ساخت این محصول حذف شود؟')) return;
      try {
        var allR = (await DB.getAll('recipes')) || [];
        var allI = (await DB.getAll('recipe_items')) || [];
        for (var i = 0; i < allI.length; i++) {
          if (allI[i].product_name === productName) await DB.remove('recipe_items', allI[i].id);
        }
        for (var j = 0; j < allR.length; j++) {
          if (allR[j].product_name === productName) await DB.remove('recipes', allR[j].id);
        }
        toast('دستور حذف شد', 'success');
        closeModal();
        navigate('products');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };

    document.getElementById('recipe-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var rows = [];
      document.querySelectorAll('#rc-rows .rc-row').forEach(function (row) {
        var mat = row.querySelector('[data-f="mat"]').value;
        var qty = Number(row.querySelector('[data-f="qty"]').value);
        if (mat && qty > 0) rows.push({ material_name: mat, qty: qty });
      });
      if (!rows.length) return toast('حداقل یک ماده با مقدار وارد کنید', 'error');
      try {
        var allR = (await DB.getAll('recipes')) || [];
        var allI = (await DB.getAll('recipe_items')) || [];
        var existing = allR.find(function (r) {
          return r.product_name === productName;
        });
        var payload = {
          product_name: productName,
          mode: 'multi_input',
          yield_factor: fd.yield_factor !== '' && fd.yield_factor != null ? Number(fd.yield_factor) : null,
          notes: fd.notes || ''
        };
        if (existing && existing.id) {
          payload.id = existing.id;
          await DB.put('recipes', Object.assign({}, existing, payload));
        } else {
          await DB.add('recipes', payload);
        }
        for (var i = 0; i < allI.length; i++) {
          if (allI[i].product_name === productName) await DB.remove('recipe_items', allI[i].id);
        }
        for (var k = 0; k < rows.length; k++) {
          await DB.add('recipe_items', {
            product_name: productName,
            material_name: rows[k].material_name,
            qty: rows[k].qty,
            sort_order: k
          });
        }
        toast('دستور ساخت ذخیره شد', 'success');
        closeModal();
        navigate('products');
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا', 'error');
      }
    };
  };

  /* ========== دکمه دستور روی لیست محصولات ========== */
  var _origProducts = Pages.products;
  Pages.products = async function () {
    var html = await _origProducts();
    if (!Auth.isAdmin()) return html;
    // inject recipe buttons via post-process after navigate is hard; instead patch table by re-render
    var list = (await DB.getAll('products')) || [];
    var recipeMap = await loadRecipeMap();
    var canEdit = Auth.isAdmin();
    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">محصولات</h1>' +
      '<p class="text-slate-400 text-sm">تعریف محصول + دستور ساخت چندماده‌ای (اختیاری)</p></div>' +
      (canEdit ? '<button class="btn-primary" onclick="Pages.showProductForm()">+ افزودن محصول</button>' : '') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
      'اگر محصول چند ماده دارد (قورمه، برنج، لوبیاپلو) از <b>دستور ساخت</b> استفاده کنید. جوجه و کباب تک‌ماده‌ای مثل قبل می‌مانند.' +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>کد</th><th>نام</th><th>وزن واحد</th><th>ماده پیش‌فرض</th><th>دستور</th><th></th></tr></thead><tbody>' +
      list
        .map(function (p) {
          var hasR = !!recipeMap[p.name];
          var nItems = hasR ? recipeMap[p.name].items.length : 0;
          var yf = hasR && recipeMap[p.name].recipe.yield_factor != null ? recipeMap[p.name].recipe.yield_factor : null;
          return (
            '<tr><td class="text-slate-400">' +
            (p.code || '') +
            '</td><td class="font-medium">' +
            (p.name || '') +
            '</td><td>' +
            fmtNum(p.weight_per_unit) +
            '</td><td class="text-xs">' +
            (p.material_name || '—') +
            '</td><td class="text-xs">' +
            (hasR
              ? '<span class="badge badge-ok">' + nItems + ' ماده' + (yf ? ' · ضریب ' + yf : '') + '</span>'
              : '<span class="text-slate-500">—</span>') +
            '</td><td class="whitespace-nowrap">' +
            (canEdit
              ? '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.editRecipe(\'' +
                String(p.name || '').replace(/'/g, "\\'") +
                '\')">🧩 دستور</button> ' +
                '<button class="btn-ghost text-xs" onclick="Pages.showProductForm(' +
                p.id +
                ')">ویرایش</button>'
              : '') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div></div>'
    );
  };

  // alias if showProductForm named differently
  if (!Pages.showProductForm && Pages.showProdForm) {
    /* product form is showProductForm in some versions */
  }

  /* ========== تولید با پشتیبانی چندماده‌ای ========== */
  var _origShowProdForm = Pages.showProdForm;
  Pages.showProdForm = async function (id) {
    if (!Auth.canProduction() && !id) return;
    if (id && !Auth.canEditDelete()) return toast('فقط مدیر', 'error');

    var item = {
      date: todayJalali(),
      product_name: '',
      quantity: '',
      material_weight: '',
      material_name: '',
      shift_code: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      producer_name: '',
      remainder_count: 0,
      remainder_weight: 0,
      remainder_type: 'حمل به روز بعد',
      notes: ''
    };

    var products = (await DB.getAll('products')) || [];
    var personnel = (await DB.getAll('personnel')) || [];
    var recipeMap = await loadRecipeMap();
    var consumptions = [];
    if (id) {
      item = (await DB.getById('productions', id)) || item;
      consumptions = ((await DB.getAll('production_consumptions').catch(function () { return []; })) || []).filter(
        function (c) {
          return Number(c.production_id) === Number(id);
        }
      );
    }

    var personnelOpts = personnel
      .filter(function (p) {
        return p.active !== false && p.active !== 0 && (p.team || 'executive') === 'executive';
      })
      .map(function (p) {
        return (
          '<option value="' +
          p.name +
          '" ' +
          (item.producer_name === p.name ? 'selected' : '') +
          '>' +
          p.name +
          (p.position ? ' (' + p.position + ')' : '') +
          '</option>'
        );
      })
      .join('');

    var productOpts = products
      .filter(function (p) {
        return p.active !== false && p.name;
      })
      .map(function (p) {
        var hasR = recipeMap[p.name] ? '1' : '0';
        return (
          '<option value="' +
          p.name +
          '" data-mat="' +
          (p.material_name || '') +
          '" data-w="' +
          (p.weight_per_unit || '') +
          '" data-rem="' +
          (p.remainder_type || 'حمل به روز بعد') +
          '" data-recipe="' +
          hasR +
          '" ' +
          (item.product_name === p.name ? 'selected' : '') +
          '>' +
          p.name +
          (hasR === '1' ? ' 🧩' : '') +
          '</option>'
        );
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:40rem" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-3">' +
        (id ? 'ویرایش تولید' : 'ثبت تولید') +
        '</h3>' +
        '<form id="prod-form" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label>' +
        (typeof jalaliInput === 'function' ? jalaliInput('date', item.date) : '<input name="date" class="input-field" value="' + (item.date || '') + '" />') +
        '</div>' +
        '<div><label class="text-xs text-slate-400">محصول</label>' +
        '<select name="product_name" id="prod-product" class="input-field" required>' +
        '<option value="">انتخاب</option>' +
        productOpts +
        '</select></div></div>' +
        '<div id="prod-single-block">' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-slate-400">تعداد / خروجی</label><input name="quantity" id="prod-qty" type="number" step="0.001" class="input-field" value="' +
        (item.quantity || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">وزن مصرفی ماده (کیلو)</label><input name="material_weight" id="prod-weight" type="number" step="0.001" class="input-field" value="' +
        (item.material_weight || '') +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">ماده اولیه</label><input name="material_name" id="prod-mat" class="input-field" value="' +
        (item.material_name || '') +
        '" readonly /></div></div>' +
        '<div id="prod-multi-block" class="hidden space-y-2">' +
        '<div class="glass-card rounded-xl p-3 border border-brand-500/20">' +
        '<div class="text-sm font-medium mb-1">🧩 مواد مصرفی این پخت</div>' +
        '<p class="text-[10px] text-slate-500 mb-2">مقادیر الگو را می‌توانید مطابق واقعیت تغییر دهید. موجودی از همین اعداد کم می‌شود.</p>' +
        '<div id="prod-recipe-rows" class="space-y-2"></div>' +
        '<button type="button" class="btn-ghost text-xs mt-1" id="prod-add-mat">+ ماده اضافه</button></div>' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-slate-400">خروجی واقعی / نهایی (کیلو یا واحد)</label>' +
        '<input id="prod-qty-multi" type="number" step="0.001" class="input-field" value="' +
        (item.quantity || '') +
        '" placeholder="مثلاً ۴۶" />' +
        '<p class="text-[10px] text-slate-500 mt-1">اگر وزن کردید همین را بزنید</p></div>' +
        '<div class="flex flex-col justify-end gap-1">' +
        '<button type="button" class="btn-secondary text-sm" id="prod-estimate">تخمین خروجی از ضریب</button>' +
        '<p id="prod-yield-hint" class="text-[10px] text-slate-500"></p></div></div></div>' +
        '<div><label class="text-xs text-slate-400">تولیدکننده</label><select name="producer_name" class="input-field"><option value="">—</option>' +
        personnelOpts +
        '</select></div>' +
        '<div class="grid grid-cols-3 gap-2">' +
        '<div><label class="text-xs text-slate-400">شیفت</label><input name="shift_code" class="input-field" value="' +
        (item.shift_code || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">شروع</label><input name="start_time" class="input-field" value="' +
        (item.start_time || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">پایان</label><input name="end_time" class="input-field" value="' +
        (item.end_time || '') +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">مانده</label><select name="remainder_type" id="prod-rem" class="input-field">' +
        '<option value="حمل به روز بعد"' +
        (item.remainder_type !== 'برگشت به مواد' ? ' selected' : '') +
        '>حمل به روز بعد</option>' +
        '<option value="برگشت به مواد"' +
        (item.remainder_type === 'برگشت به مواد' ? ' selected' : '') +
        '>برگشت به مواد</option></select></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">تعداد مانده</label><input name="remainder_count" type="number" step="0.01" class="input-field" value="' +
        (item.remainder_count || 0) +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">وزن مانده</label><input name="remainder_weight" type="number" step="0.001" class="input-field" value="' +
        (item.remainder_weight || 0) +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">' +
        (item.notes || '') +
        '</textarea></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );

    window.__prodRecipeMap = recipeMap;
    window.__prodMaterials = ((await DB.getAll('materials').catch(function () { return []; })) || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });

    var prodSelect = document.getElementById('prod-product');
    var singleBlock = document.getElementById('prod-single-block');
    var multiBlock = document.getElementById('prod-multi-block');
    var recipeRows = document.getElementById('prod-recipe-rows');
    var qtyInput = document.getElementById('prod-qty');
    var weightInput = document.getElementById('prod-weight');
    var matInput = document.getElementById('prod-mat');
    var remSelect = document.getElementById('prod-rem');
    var qtyMulti = document.getElementById('prod-qty-multi');
    var yieldHint = document.getElementById('prod-yield-hint');

    function matSelectHtml(selected) {
      return (
        '<select data-f="mat" class="input-field text-sm">' +
        '<option value="">—</option>' +
        window.__prodMaterials
          .map(function (m) {
            return (
              '<option value="' +
              m.name +
              '"' +
              (selected === m.name ? ' selected' : '') +
              '>' +
              m.name +
              '</option>'
            );
          })
          .join('') +
        '</select>'
      );
    }

    function addRecipeRow(name, qty) {
      var div = document.createElement('div');
      div.className = 'pr-row grid grid-cols-5 gap-2 items-end';
      div.innerHTML =
        '<div class="col-span-3"><label class="text-[10px] text-slate-500">ماده</label>' +
        matSelectHtml(name || '') +
        '</div>' +
        '<div><label class="text-[10px] text-slate-500">مقدار</label>' +
        '<input data-f="qty" type="number" step="0.001" min="0" class="input-field text-sm" value="' +
        (qty != null && qty !== '' ? qty : '') +
        '" /></div>' +
        '<div><button type="button" class="btn-ghost text-xs text-red-400 w-full">✕</button></div>';
      recipeRows.appendChild(div);
      div.querySelector('button').onclick = function () {
        div.remove();
      };
    }

    function fillRecipeRows(productName, fromConsumptions) {
      recipeRows.innerHTML = '';
      if (fromConsumptions && fromConsumptions.length) {
        fromConsumptions.forEach(function (c) {
          addRecipeRow(c.material_name, c.quantity);
        });
        return;
      }
      var rec = recipeMap[productName];
      if (rec && rec.items.length) {
        rec.items.forEach(function (i) {
          addRecipeRow(i.material_name, i.qty);
        });
      } else {
        addRecipeRow('', '');
      }
      var yf = rec && rec.recipe && rec.recipe.yield_factor != null ? Number(rec.recipe.yield_factor) : null;
      yieldHint.textContent = yf
        ? 'ضریب پخت تعریف‌شده: ' + yf + ' — دکمه تخمین = جمع مواد × ضریب'
        : 'ضریب پخت تعریف نشده — خروجی را دستی بزنید';
    }

    function isMulti(name) {
      return !!(recipeMap[name] && recipeMap[name].items && recipeMap[name].items.length);
    }

    function updateMode() {
      var name = prodSelect.value;
      var opt = prodSelect.selectedOptions[0];
      if (!name) {
        singleBlock.classList.remove('hidden');
        multiBlock.classList.add('hidden');
        return;
      }
      if (isMulti(name)) {
        singleBlock.classList.add('hidden');
        multiBlock.classList.remove('hidden');
        if (!id || item.product_name !== name) fillRecipeRows(name, null);
        else if (consumptions.length) fillRecipeRows(name, consumptions);
        else fillRecipeRows(name, null);
      } else {
        singleBlock.classList.remove('hidden');
        multiBlock.classList.add('hidden');
        if (opt) {
          matInput.value = opt.dataset.mat || '';
          remSelect.value = opt.dataset.rem || 'حمل به روز بعد';
          var wpu = Number(opt.dataset.w || 0);
          var qty = Number(qtyInput.value || 0);
          if (qty && wpu) weightInput.value = ((qty * wpu) / 1000).toFixed(3);
        }
      }
    }

    prodSelect.onchange = updateMode;
    qtyInput.oninput = function () {
      var opt = prodSelect.selectedOptions[0];
      if (!opt || isMulti(opt.value)) return;
      var wpu = Number(opt.dataset.w || 0);
      var qty = Number(qtyInput.value || 0);
      if (qty && wpu) weightInput.value = ((qty * wpu) / 1000).toFixed(3);
      matInput.value = opt.dataset.mat || '';
    };

    document.getElementById('prod-add-mat').onclick = function () {
      addRecipeRow('', '');
    };
    document.getElementById('prod-estimate').onclick = function () {
      var name = prodSelect.value;
      var rec = recipeMap[name];
      var yf = rec && rec.recipe && rec.recipe.yield_factor != null ? Number(rec.recipe.yield_factor) : null;
      if (!yf) return toast('برای این محصول ضریب پخت تعریف نشده', 'info');
      var sum = 0;
      document.querySelectorAll('#prod-recipe-rows .pr-row').forEach(function (row) {
        sum += Number(row.querySelector('[data-f="qty"]').value) || 0;
      });
      if (!sum) return toast('اول مواد مصرفی را وارد کنید', 'error');
      qtyMulti.value = (sum * yf).toFixed(3);
      toast('خروجی تخمینی: ' + qtyMulti.value, 'success');
    };

    updateMode();

    document.getElementById('prod-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var btn = ev.target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'در حال ذخیره...';
      }
      try {
        var fd = Object.fromEntries(new FormData(ev.target).entries());
        var name = fd.product_name;
        var data = Object.assign({}, fd);
        data.duration_minutes = data.duration_minutes ? Number(data.duration_minutes) : null;
        data.remainder_count = Number(data.remainder_count || 0);
        data.remainder_weight = Number(data.remainder_weight || 0);
        data.created_at = item.created_at || new Date().toISOString();

        if (isMulti(name)) {
          var cons = [];
          document.querySelectorAll('#prod-recipe-rows .pr-row').forEach(function (row) {
            var mat = row.querySelector('[data-f="mat"]').value;
            var q = Number(row.querySelector('[data-f="qty"]').value);
            if (mat && q > 0) cons.push({ material_name: mat, quantity: q });
          });
          if (!cons.length) {
            toast('حداقل یک ماده مصرفی وارد کنید', 'error');
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'ذخیره';
            }
            return;
          }
          var totalIn = cons.reduce(function (s, c) {
            return s + Number(c.quantity);
          }, 0);
          var outQty = Number(qtyMulti.value);
          if (!outQty && outQty !== 0) {
            toast('خروجی (واقعی یا تخمینی) را وارد کنید', 'error');
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'ذخیره';
            }
            return;
          }
          data.quantity = outQty;
          data.material_weight = totalIn;
          data.material_name = 'ترکیبی';
          data._consumptions = cons;
        } else {
          data.quantity = Number(data.quantity);
          data.material_weight = Number(data.material_weight);
          if (!data.material_name) data.material_name = matInput.value;
          data._consumptions = null;
        }

        if (id) {
          data.id = id;
          await DB.updateProductionWithReturn(data);
          toast('ویرایش شد', 'success');
        } else {
          await DB.addProductionWithReturn(data);
          toast('تولید ثبت شد', 'success');
        }
        closeModal();
        navigate('productions');
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ذخیره تولید', 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'ذخیره';
        }
      }
    };
  };
})();
/**
 * Main application bootstrap & navigation
 */

const NAV = {
  admin: [
    { id: 'dashboard', label: 'داشبورد', icon: '📊' },
    { id: 'entries', label: 'ورود مواد', icon: '📥' },
    { id: 'wastes', label: 'ضایعات', icon: '🗑️' },
    { id: 'productions', label: 'تولید روزانه', icon: '🍳' },
    { id: 'materials', label: 'مواد اولیه', icon: '📦' },
    { id: 'products', label: 'محصولات', icon: '🍢' },
    { id: 'transfers', label: 'ارسال شعبه', icon: '🚚' },
    { id: 'stocktake', label: 'انبارگردانی', icon: '📋' },
    { id: 'personnel', label: 'پرسنل', icon: '👥' },
    { id: 'reports', label: 'گزارش و پشتیبان', icon: '📑' },
    { id: 'audit', label: 'لاگ فعالیت', icon: '📜' },
    { id: 'settings', label: 'تنظیمات', icon: '⚙️' },
    { id: 'users', label: 'کاربران', icon: '🔐' }
  ],
  entry: [
    { id: 'dashboard', label: 'داشبورد', icon: '📊' },
    { id: 'entries', label: 'ورود مواد', icon: '📥' },
    { id: 'wastes', label: 'ضایعات', icon: '🗑️' },
    { id: 'materials', label: 'موجودی مواد', icon: '📦' },
    { id: 'transfers', label: 'ارسال شعبه', icon: '🚚' },
    { id: 'reports', label: 'گزارش‌ها', icon: '📑' }
  ],
  production: [
    { id: 'dashboard', label: 'داشبورد', icon: '📊' },
    { id: 'productions', label: 'تولید روزانه', icon: '🍳' },
    { id: 'products', label: 'محصولات', icon: '🍢' },
    { id: 'personnel', label: 'پرسنل', icon: '👥' },
    { id: 'materials', label: 'موجودی مواد', icon: '📦' },
    { id: 'reports', label: 'گزارش‌ها', icon: '📑' }
  ]
};

let currentPage = 'dashboard';

function buildNav() {
  const role = Auth.currentUser?.role || 'entry';
  const links = NAV[role] || NAV.entry;
  const el = document.getElementById('nav-links');
  const activeId = (currentPage === 'attendance' || currentPage === 'league') ? 'personnel' : currentPage;
  el.innerHTML = links.map(l => `
    <div class="sidebar-link ${activeId === l.id ? 'active' : ''}" data-page="${l.id}" onclick="navigate('${l.id}')">
      <span>${l.icon}</span>
      <span>${l.label}</span>
    </div>
  `).join('');
}

async function navigate(page) {
  // پشتیبانی از query مثل attendance?day=...&team=sales و personnel?tab=sales
  const desired = String(page || '').replace(/^#/, '');
  const pure = desired.split('?')[0] || 'dashboard';
  const currentHash = (location.hash || '').replace(/^#/, '');
  if (currentHash !== desired) {
    location.hash = desired;
  }
  currentPage = pure;
  buildNav();
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="text-center text-slate-400 py-20">در حال بارگذاری...</div>';
  try {
    if (typeof Pages[pure] === 'function') {
      content.innerHTML = await Pages[pure]();
      content.classList.remove('fade-in');
      void content.offsetWidth;
      content.classList.add('fade-in');
    } else {
      content.innerHTML = '<p class="text-red-400">صفحه یافت نشد</p>';
    }
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p class="text-red-400">خطا: ${e.message}</p>`;
  }
}


function updateConnectionStatusUI(mode) {
  // mode: 'cloud' | 'local' | 'offline' | 'no_d1'
  const mobileEl = document.getElementById('mobile-conn-status');
  const mobileText = document.getElementById('mobile-conn-text');
  const roleLabel = document.getElementById('user-role-label');

  const labels = {
    cloud: 'اتصال ابری فعال — داده مشترک',
    local: 'حالت محلی — فقط این دستگاه',
    offline: 'آفلاین — بدون سرور',
    no_d1: 'D1 وصل نیست',
  };
  const shortLabels = {
    cloud: '☁️ ابری — ثبت‌ها ذخیره می‌شود',
    local: '💾 محلی — فقط این دستگاه',
    offline: '🔴 آفلاین',
    no_d1: '⚠️ D1 وصل نیست',
  };
  const cls = mode === 'cloud' ? 'cloud' : (mode === 'local' ? 'local' : 'offline');

  if (mobileEl && mobileText) {
    mobileEl.className = 'conn-status ' + cls;
    mobileText.textContent = shortLabels[mode] || labels[mode] || mode;
  }
  // keep role label in sync when already logged in
  if (roleLabel && Auth.currentUser) {
    const u = Auth.currentUser;
    const modeTag = mode === 'cloud' ? '☁️ ابری' : mode === 'local' ? '💾 محلی' : '⚠️';
    roleLabel.textContent =
      (u.role === 'admin' ? 'مدیر سیستم' : u.role === 'entry' ? 'ثبت‌کننده ورود' : 'ثبت‌کننده تولید') + ' · ' + modeTag;
  }
}

function enableCloudDB() {
  // Redirect all DB calls to Cloudflare D1 via /api — shared across devices
  window.__localDB = window.DB;
  window.DB = {
    openDB: async () => true,
    seedIfEmpty: async () => false,
    getAll: (s) => Api.getAll(s),
    getById: (s, id) => Api.getById(s, id),
    add: async (s, item) => {
      const r = await Api.add(s, item);
      return r.id;
    },
    put: async (s, item) => Api.put(s, item),
    remove: (s, id) => Api.remove(s, id),
    clearStore: async () => {},
    calcStock: () => Api.calcStock(),
    exportAllBackup: () => Api.backup(),
    importBackup: async () => {
      throw new Error('در حالت ابری، بازیابی از JSON را با احتیاط انجام دهید');
    },
    addProductionWithReturn: async (data) => {
      const consumptions = data._consumptions || null;
      delete data._consumptions;
      const r = await Api.add('productions', data);
      const id = r.id;
      if (consumptions && consumptions.length) {
        for (const c of consumptions) {
          await Api.add('production_consumptions', {
            production_id: id,
            material_name: c.material_name,
            quantity: Number(c.quantity || 0)
          });
        }
      }
      return id;
    },
    updateProductionWithReturn: async (data) => {
      const consumptions = data._consumptions !== undefined ? data._consumptions : null;
      delete data._consumptions;
      await Api.put('productions', data);
      if (consumptions) {
        const allC = (await Api.getAll('production_consumptions')) || [];
        for (const c of allC) {
          if (Number(c.production_id) === Number(data.id)) {
            try { await Api.remove('production_consumptions', c.id); } catch (e) {}
          }
        }
        for (const c of consumptions) {
          await Api.add('production_consumptions', {
            production_id: data.id,
            material_name: c.material_name,
            quantity: Number(c.quantity || 0)
          });
        }
      }
      return data.id;
    },
  };
  window.__cloudMode = true;
}

async function probeCloud(retries) {
  let last = { ok: false, error: 'no attempt' };
  const n = retries || 5;
  for (let i = 0; i < n; i++) {
    try {
      last = await Api.health();
      if (last && last.ok) return last;
      last = last || { ok: false, error: 'پاسخ نامعتبر' };
    } catch (e) {
      last = { ok: false, error: e.message || String(e) };
    }
    // فاصله بیشتر برای اینترنت کند (مخابرات)
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  return last;
}

/** تلاش دوباره برای اتصال ابری از صفحه ورود یا داخل اپ */
window.retryCloudConnect = async function () {
  const statusEl = document.getElementById('cloud-status');
  if (statusEl) statusEl.innerHTML = '<span class="text-slate-400">در حال اتصال مجدد به ابر...</span>';
  toast('در حال اتصال به سرور...', 'info');
  const health = await probeCloud(6);
  if (health && health.ok) {
    enableCloudDB();
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-brand-400">● اتصال ابری فعال — داده مشترک است</span>' +
        ' <button type="button" class="btn-ghost text-xs" onclick="retryCloudConnect()">بررسی دوباره</button>';
    }
    updateConnectionStatusUI('cloud');
    toast('اتصال ابری برقرار شد', 'success');
    return true;
  }
  const why = (health && (health.error || health.code)) || 'سرور پاسخ نداد';
  if (statusEl) {
    statusEl.innerHTML = '<span class="text-amber-400">● ابری وصل نشد: ' + String(why).slice(0, 100) +
      '</span><br/><button type="button" class="btn-secondary text-xs mt-2" onclick="retryCloudConnect()">تلاش مجدد اتصال ابری</button>';
  }
  updateConnectionStatusUI('local');
  toast('ابری وصل نشد — ' + String(why).slice(0, 60), 'error');
  return false;
};

async function init() {
  const statusEl = document.getElementById('cloud-status');
  let cloud = false;

  if (window.Api) {
    Api.loadToken();
    const health = await probeCloud(3);
    if (health.ok) {
      cloud = true;
      enableCloudDB();
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-brand-400">● اتصال ابری فعال — داده بین همه دستگاه‌ها مشترک است</span>' +
          ' <button type="button" class="btn-ghost text-xs" onclick="retryCloudConnect()">بررسی</button>';
      }
      updateConnectionStatusUI('cloud');
    } else if (health.code === 'NO_D1') {
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-amber-400">● D1 وصل نیست — Binding نام DB را در Cloudflare چک کنید</span>';
      }
      updateConnectionStatusUI('no_d1');
    } else {
      const why = health.error || health.code || 'پاسخ health نگرفت';
      console.warn('cloud health failed → local', health);
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-amber-400">● حالت محلی — ابری وصل نشد: ' + String(why).slice(0, 90) +
          '</span><br/><button type="button" class="btn-secondary text-xs mt-2" onclick="retryCloudConnect()">تلاش مجدد اتصال ابری</button>' +
          '<p class="text-[10px] text-slate-500 mt-2">روی اینترنت مخابرات چند بار تلاش کنید. آدرس سایت باید همان آدرس Cloudflare باشد (نه فایل محلی).</p>';
      }
      updateConnectionStatusUI('local');
    }
  } else {
    updateConnectionStatusUI('offline');
  }

  if (!cloud) {
    try {
      await DB.openDB();
      await DB.seedIfEmpty();
    } catch (err) {
      console.error('DB init failed', err);
      if (statusEl) statusEl.textContent = 'خطا در دیتابیس محلی';
    }
  }

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    try {
      if (!window.Auth) {
        toast('خطا در بارگذاری برنامه — رفرش کنید', 'error');
        return;
      }
      const res = await Auth.login(user, pass);
      if (!res.ok) {
        toast(res.msg || 'ورود ناموفق', 'error');
        return;
      }
      if (res.mode === 'cloud') enableCloudDB();
      showApp();
      if (res.mode === 'local') {
        toast('حالت محلی: داده فقط روی این دستگاه است', 'info');
      }
    } catch (err) {
      console.error(err);
      toast('خطای ورود: ' + (err.message || String(err)), 'error');
    }
  };

  if (Auth.requireAuth()) {
    if (cloud) enableCloudDB();
    showApp();
  }
}

async function checkStockAlertsAndNotify() {
  try {
    const stock = await DB.calcStock();
    const alerts = stock.filter(m => m.status !== 'عادی');
    if (!alerts.length) return;
    const body = alerts.map(m => `${m.name}: ${m.current_stock} (${m.status})`).join('\n');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('هشدار موجودی کترینگ', { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚠️</text></svg>' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      const p = await Notification.requestPermission();
      if (p === 'granted') {
        new Notification('هشدار موجودی کترینگ', { body });
      }
    }
  } catch (e) { console.warn('notify', e); }
}


/* ---------- همگام‌سازی بین دستگاه‌ها (polling) ---------- */
function isModalOpen() {
  const root = document.getElementById('modal-root');
  return root && root.innerHTML.trim().length > 0;
}

async function softRefreshIfNeeded() {
  if (!window.__cloudMode) return;
  if (document.visibilityState !== 'visible') return;
  if (isModalOpen()) return;
  // وسط فرم / کیبورد موبایل رفرش نکن
  if (window.__formBusy) return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT' || ae.tagName === 'TEXTAREA')) return;
  if (!Auth.currentUser) return;
  try {
    if (window.Api) {
      const v = await Api.request('version');
      const ver = Number(v.version || 0);
      if (window.__dataVersion && ver === window.__dataVersion) return;
      window.__dataVersion = ver;
      if (window.Api && Api.invalidateCache) Api.invalidateCache();
    }
    const keep = (location.hash || '').replace(/^#/, '') || currentPage;
    await navigate(keep);
  } catch (e) {
    console.warn('sync refresh failed', e);
  }
}

function startCloudSync() {
  if (window.__syncStarted) return;
  window.__syncStarted = true;
  // 10 ثانیه — فقط وقتی version عوض شده صفحه رفرش می‌شود
  setInterval(() => softRefreshIfNeeded(), 10000);
  // هر ۳۰ ثانیه وضعیت اتصال به D1 را چک کن
  setInterval(async () => {
    if (!window.Api || document.visibilityState !== 'visible') return;
    try {
      const h = await Api.health();
      if (h.ok) {
        if (!window.__cloudMode) {
          enableCloudDB();
          updateConnectionStatusUI('cloud');
        } else {
          updateConnectionStatusUI('cloud');
        }
      } else if (h.code === 'NO_D1') {
        updateConnectionStatusUI('no_d1');
      } else {
        updateConnectionStatusUI('offline');
      }
    } catch {
      updateConnectionStatusUI('offline');
    }
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') softRefreshIfNeeded();
  });
}

function maybeBackupReminder() {
  try {
    if (!Auth.isAdmin()) return;
    const key = 'kitchen_last_backup_hint';
    const last = Number(localStorage.getItem(key) || 0);
    const week = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - last < week) return;
    setTimeout(() => {
      toast('یادآوری: از گزارش‌ها یک پشتیبان کامل دانلود کنید', 'info');
      localStorage.setItem(key, String(Date.now()));
    }, 4000);
  } catch (e) {}
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const topbar = document.getElementById('mobile-topbar');
  if (topbar) topbar.style.display = ''; // let CSS media query control it

  const u = Auth.currentUser;
  const mode = window.__cloudMode ? '☁️ ابری' : '💾 محلی';
  document.getElementById('user-role-label').textContent =
    (u.role === 'admin' ? 'مدیر سیستم' : u.role === 'entry' ? 'ثبت‌کننده ورود' : 'ثبت‌کننده تولید') + ' · ' + mode;
  document.getElementById('user-name-label').textContent = u.full_name || u.username;
  // وضعیت اتصال روی نوار موبایل
  updateConnectionStatusUI(window.__cloudMode ? 'cloud' : 'local');
  navigate('dashboard');
  if (window.__cloudMode) startCloudSync();
  if (!sessionStorage.getItem('stock_notified')) {
    checkStockAlertsAndNotify().then(() => sessionStorage.setItem('stock_notified', '1'));
  }
}

/* ---------- PWA Install Prompt ---------- */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // show banner if not dismissed this session and not already installed
  if (!sessionStorage.getItem('install_dismissed') && !window.matchMedia('(display-mode: standalone)').matches) {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('hidden');
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('hidden');
  if (typeof toast === 'function') toast('اپ روی گوشی نصب شد ✓', 'success');
});

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('install-btn');
  const dismiss = document.getElementById('install-dismiss');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        // iOS / fallback instructions
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          alert('در Safari:\n۱) دکمه Share (مربع با فلش) را بزنید\n۲) «Add to Home Screen» یا «افزودن به صفحه اصلی» را انتخاب کنید');
        } else {
          alert('از منوی مرورگر گزینه «Install app» یا «نصب برنامه» را انتخاب کنید.\nیا صفحه را در Chrome باز کنید.');
        }
        return;
      }
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      document.getElementById('install-banner')?.classList.add('hidden');
      if (outcome === 'accepted' && typeof toast === 'function') toast('در حال نصب...', 'success');
    });
  }
  if (dismiss) {
    dismiss.addEventListener('click', () => {
      sessionStorage.setItem('install_dismissed', '1');
      document.getElementById('install-banner')?.classList.add('hidden');
    });
  }

  // iOS: show soft prompt if not standalone
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isIOS && !isStandalone && !sessionStorage.getItem('install_dismissed')) {
    setTimeout(() => {
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('hidden');
    }, 2500);
  }
});

// Start
document.addEventListener('DOMContentLoaded', init);

window.navigate = navigate;
window.logout = Auth.logout;
