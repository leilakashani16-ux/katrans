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
    { id: 'personnel', label: 'پرسنل', icon: '👨‍🍳' },
    { id: 'reports', label: 'گزارش و پشتیبان', icon: '📑' },
    { id: 'users', label: 'کاربران', icon: '🔐' }
  ],
  entry: [
    { id: 'dashboard', label: 'داشبورد', icon: '📊' },
    { id: 'entries', label: 'ورود مواد', icon: '📥' },
    { id: 'wastes', label: 'ضایعات', icon: '🗑️' },
    { id: 'materials', label: 'موجودی مواد', icon: '📦' },
    { id: 'reports', label: 'گزارش‌ها', icon: '📑' }
  ],
  production: [
    { id: 'dashboard', label: 'داشبورد', icon: '📊' },
    { id: 'productions', label: 'تولید روزانه', icon: '🍳' },
    { id: 'products', label: 'محصولات', icon: '🍢' },
    { id: 'personnel', label: 'پرسنل', icon: '👨‍🍳' },
    { id: 'materials', label: 'موجودی مواد', icon: '📦' },
    { id: 'reports', label: 'گزارش‌ها', icon: '📑' }
  ]
};

let currentPage = 'dashboard';

function buildNav() {
  const role = Auth.currentUser?.role || 'entry';
  const links = NAV[role] || NAV.entry;
  const el = document.getElementById('nav-links');
  el.innerHTML = links.map(l => `
    <div class="sidebar-link ${currentPage === l.id ? 'active' : ''}" data-page="${l.id}" onclick="navigate('${l.id}')">
      <span>${l.icon}</span>
      <span>${l.label}</span>
    </div>
  `).join('');
}

async function navigate(page) {
  const pure = page.split("?")[0];
  if (!location.hash.startsWith("#" + pure)) location.hash = page;
  page = pure;
  currentPage = page;
  buildNav();
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="text-center text-slate-400 py-20">در حال بارگذاری...</div>';
  try {
    if (typeof Pages[page] === 'function') {
      content.innerHTML = await Pages[page]();
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
      const r = await Api.add('productions', data);
      return r.id;
    },
    updateProductionWithReturn: async (data) => Api.put('productions', data),
  };
  window.__cloudMode = true;
}

async function init() {
  const statusEl = document.getElementById('cloud-status');
  let cloud = false;

  if (window.Api) {
    Api.loadToken();
    const health = await Api.health();
    if (health.ok) {
      cloud = true;
      enableCloudDB();
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-brand-400">● اتصال ابری فعال — داده بین همه دستگاه‌ها مشترک است</span>';
      }
    } else if (health.code === 'NO_D1') {
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-amber-400">● D1 وصل نیست — به README مراجعه کنید</span>';
      }
    } else {
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-slate-500">● حالت محلی (آفلاین) — فقط همین دستگاه</span>';
      }
    }
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
  if (!Auth.currentUser) return;
  try {
    await navigate(currentPage);
  } catch (e) {
    console.warn('sync refresh failed', e);
  }
}

function startCloudSync() {
  if (window.__syncStarted) return;
  window.__syncStarted = true;
  setInterval(() => softRefreshIfNeeded(), 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') softRefreshIfNeeded();
  });
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const u = Auth.currentUser;
  const mode = window.__cloudMode ? '☁️ ابری' : '💾 محلی';
  document.getElementById('user-role-label').textContent =
    (u.role === 'admin' ? 'مدیر سیستم' : u.role === 'entry' ? 'ثبت‌کننده ورود' : 'ثبت‌کننده تولید') + ' · ' + mode;
  document.getElementById('user-name-label').textContent = u.full_name || u.username;
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
