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
  for (let i = 0; i < (retries || 3); i++) {
    try {
      last = await Api.health();
      if (last && last.ok) return last;
    } catch (e) {
      last = { ok: false, error: e.message || String(e) };
    }
    await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  return last;
}

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
        statusEl.innerHTML = '<span class="text-brand-400">● اتصال ابری فعال — داده بین همه دستگاه‌ها مشترک است</span>';
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
        statusEl.innerHTML = '<span class="text-amber-400">● حالت محلی — ابری وصل نشد: ' + String(why).slice(0, 80) + '</span>';
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
