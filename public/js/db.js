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
