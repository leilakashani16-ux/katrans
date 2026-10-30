/**
 * theme-engine.js v3
 * - بدون نمودار الکی
 * - انیمیشن روی نمودارهای واقعی داشبورد
 * - نوار پایین فقط موبایل + اسکرول کامل همه بخش‌ها
 * - بدون کلید تکراری
 */
(function () {
  var KEY = 'katrans_theme_engine';
  var THEMES = [
    { id: 'default', icon: '🌿', title: 'سبز انصار' },
    { id: 'night', icon: '🌙', title: 'شیفت شب' },
    { id: 'orbit', icon: '🌌', title: 'مدار روح' },
    { id: 'ember', icon: '🔥', title: 'اخگر' }
  ];
  var ICONS = {
    default: { dashboard:'📊', entries:'📥', wastes:'🗑️', productions:'🍳', processings:'🔄', materials:'📦', products:'🍢', transfers:'🚚', stocktake:'📋', personnel:'👥', chat:'💬', reports:'📑', audit:'📜', settings:'⚙️', users:'🔐' },
    night: { dashboard:'🌑', entries:'📥', wastes:'🗑️', productions:'🍳', processings:'🔄', materials:'📦', products:'🍢', transfers:'🚛', stocktake:'📋', personnel:'👥', chat:'💬', reports:'📑', audit:'📜', settings:'⚙️', users:'🔐' },
    orbit: { dashboard:'🪐', entries:'🚀', wastes:'☄️', productions:'🛰️', processings:'🌀', materials:'🛸', products:'⭐', transfers:'🚀', stocktake:'📡', personnel:'🤖', chat:'📡', reports:'📑', audit:'📜', settings:'⚙️', users:'🔐' },
    ember: { dashboard:'🔥', entries:'📦', wastes:'🗑️', productions:'⚒️', processings:'🔧', materials:'📦', products:'🍢', transfers:'🚚', stocktake:'📋', personnel:'👷', chat:'💬', reports:'📑', audit:'📜', settings:'⚙️', users:'🔐' }
  };
  var LOAD_ICON = { default:'⏳', night:'🌙', orbit:'🚀', ember:'⚙️' };
  var LOAD_TEXT = { default:'در حال بارگذاری…', night:'شیفت شب…', orbit:'پرتاب…', ember:'آچار…' };

  // منوی کامل موبایل (اسکرول افقی)
  var MOBILE_NAV = [
    { page: 'dashboard', label: 'خانه' },
    { page: 'entries', label: 'ورود' },
    { page: 'productions', label: 'تولید' },
    { page: 'materials', label: 'مواد' },
    { page: 'products', label: 'محصولات' },
    { page: 'transfers', label: 'ارسال' },
    { page: 'personnel', label: 'پرسنل' },
    { page: 'chat', label: 'گفتگو' },
    { page: 'processings', label: 'فرآوری' },
    { page: 'wastes', label: 'ضایعات' },
    { page: 'reports', label: 'گزارش' },
    { page: 'settings', label: 'بیشتر' }
  ];

  function getTheme() {
    try { return localStorage.getItem(KEY) || 'default'; } catch (e) { return 'default'; }
  }

  function stripJunk() {
    [
      'theme-engine-bar', 'theme-engine-bar-side', 'theme-engine-side',
      'theme-engine-bar-float', 'te-float-themes',
      'soul-theme-bar', 'soul-theme-bar-side', 'soul-theme-sidebar',
      'orbit-theme-toggle', 'orbit-bottom-nav',
      'te-live-charts', 'te-planet-hero'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('button[onclick*="toggleNightMode"]').forEach(function (b) { b.remove(); });
    var top = document.getElementById('mobile-topbar');
    if (top) {
      top.querySelectorAll('.te-chip, #theme-engine-bar, #theme-engine-side, #theme-engine-bar-side').forEach(function (e) { e.remove(); });
    }
  }

  function applyIcons(id) {
    var map = ICONS[id] || ICONS.default;
    document.querySelectorAll('#nav-links .sidebar-link[data-page], #te-bottom-nav button[data-page]').forEach(function (el) {
      var page = el.getAttribute('data-page');
      if (!map[page]) return;
      var ico = el.querySelector('.ico') || el.querySelector('span');
      if (ico) ico.textContent = map[page];
    });
  }

  function clearCls() {
    document.documentElement.classList.remove('te-default','te-night','te-orbit','te-ember','night-shift','theme-orbit','theme-ember');
  }

  function apply(id, silent) {
    clearCls();
    if (id === 'night') document.documentElement.classList.add('te-night', 'night-shift');
    else if (id === 'orbit') document.documentElement.classList.add('te-orbit');
    else if (id === 'ember') document.documentElement.classList.add('te-ember');
    else { document.documentElement.classList.add('te-default'); id = 'default'; }
    try {
      localStorage.setItem(KEY, id);
      localStorage.setItem('kitchen_night_shift', id === 'night' ? '1' : '0');
    } catch (e) {}
    document.querySelectorAll('.te-chip').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === id);
    });
    applyIcons(id);
    if (!silent && typeof toast === 'function') {
      var t = THEMES.find(function (x) { return x.id === id; });
      toast((t && t.title) || id, 'info');
    }
  }

  function makeBar(id) {
    var bar = document.createElement('div');
    bar.id = id;
    bar.style.cssText = 'display:flex;gap:6px;align-items:center;';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'te-chip';
      b.setAttribute('data-theme', t.id);
      b.title = t.title;
      b.textContent = t.icon;
      b.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        apply(t.id);
      };
      bar.appendChild(b);
    });
    return bar;
  }

  function injectFloat() {
    if (document.getElementById('te-float-themes')) return;
    var float = document.createElement('div');
    float.id = 'te-float-themes';
    float.appendChild(makeBar('theme-engine-bar-float'));
    document.body.appendChild(float);
  }

  function injectSidebar() {
    if (document.getElementById('theme-engine-side')) return;
    var sideLogout = Array.from(document.querySelectorAll('button')).find(function (b) {
      return /خروج/.test(b.textContent || '') && b.closest('#sidebar, aside');
    });
    if (!sideLogout || !sideLogout.parentElement) return;
    var wrap = document.createElement('div');
    wrap.id = 'theme-engine-side';
    wrap.innerHTML = '<div class="te-label">حال و هوا</div>';
    wrap.appendChild(makeBar('theme-engine-bar-side'));
    sideLogout.parentElement.insertBefore(wrap, sideLogout);
  }

  function injectBottom() {
    var old = document.getElementById('te-bottom-nav');
    if (old) old.remove();
    var bottom = document.createElement('nav');
    bottom.id = 'te-bottom-nav';
    bottom.setAttribute('aria-label', 'منوی موبایل');
    MOBILE_NAV.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-page', it.page);
      b.innerHTML = '<span class="ico">•</span><span>' + it.label + '</span>';
      b.onclick = function () {
        document.querySelectorAll('#te-bottom-nav button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        if (typeof navigate === 'function') navigate(it.page);
        else location.hash = '#' + it.page;
      };
      bottom.appendChild(b);
    });
    document.body.appendChild(bottom);
    applyIcons(getTheme());
  }

  function ensureLoader() {
    if (document.getElementById('te-loader')) return;
    var el = document.createElement('div');
    el.id = 'te-loader';
    el.innerHTML = '<div class="te-anim">🚀</div><div class="te-msg">…</div>';
    document.body.appendChild(el);
  }
  function showLoader(id) {
    ensureLoader();
    var el = document.getElementById('te-loader');
    el.querySelector('.te-anim').textContent = LOAD_ICON[id] || '⏳';
    el.querySelector('.te-msg').textContent = LOAD_TEXT[id] || '…';
    el.classList.add('show');
  }
  function hideLoader() {
    var el = document.getElementById('te-loader');
    if (el) el.classList.remove('show');
  }

  /** انیمیشن روی نمودارهای واقعی داشبورد */
  function animateRealCharts() {
    var root = document.getElementById('dash-charts');
    if (!root) return;

    // نوارهای میله‌ای: هر div با width درصدی
    root.querySelectorAll('[style*="width"]').forEach(function (el, idx) {
      var st = el.getAttribute('style') || '';
      if (!/width\s*:\s*[\d.]+%/.test(st)) return;
      // فقط میله‌های رنگی نازک/پر، نه کل کارت
      var h = el.offsetHeight;
      if (h > 40) return;
      el.classList.add('te-bar-anim');
      el.style.animationDelay = (idx * 0.05) + 's';
    });

    // دونات‌ها: معمولاً یک div با background conic-gradient یا border-radius 50%
    root.querySelectorAll('div').forEach(function (el) {
      var st = (el.getAttribute('style') || '') + (el.style && el.style.backgroundImage || '');
      var bg = el.style.background || el.style.backgroundImage || '';
      if (/conic-gradient/i.test(st + bg) || /conic-gradient/i.test(el.getAttribute('style') || '')) {
        el.classList.add('te-donut-anim');
      }
      // بعضی دونات‌ها با کلاس خاص
      if (el.classList.contains('rounded-full') && el.offsetWidth > 60 && el.offsetWidth < 220) {
        el.classList.add('te-donut-anim');
      }
    });

    // fallback: اولین دایره بزرگ در هر کارت دونات
    root.querySelectorAll('.glass-card').forEach(function (card, i) {
      var circle = card.querySelector('[style*="conic"], .rounded-full');
      if (circle) {
        circle.classList.add('te-donut-anim');
        circle.style.animationDelay = (i * 0.08) + 's';
      }
      var bars = card.querySelectorAll('[style*="width"]');
      bars.forEach(function (bar, j) {
        if (bar.offsetHeight <= 28) {
          bar.classList.add('te-bar-anim');
          bar.style.animationDelay = (j * 0.06) + 's';
        }
      });
    });
  }

  function patchDashboard() {
    if (typeof Pages === 'undefined' || typeof Pages.dashboard !== 'function') return;
    if (Pages.dashboard.__teAnim) return;
    var prev = Pages.dashboard;
    Pages.dashboard = async function () {
      var html = await prev.apply(this, arguments);
      setTimeout(animateRealCharts, 80);
      setTimeout(animateRealCharts, 400);
      return html;
    };
    Pages.dashboard.__teAnim = true;
  }

  function patchNavigate() {
    if (typeof window.navigate !== 'function' || window.navigate.__tePatched) return;
    var orig = window.navigate;
    window.navigate = async function (page) {
      var id = getTheme();
      showLoader(id);
      try { return await orig.apply(this, arguments); }
      finally {
        setTimeout(hideLoader, 280);
        setTimeout(function () {
          applyIcons(getTheme());
          var pure = String(page || '').split('?')[0];
          if (pure === 'dashboard' || pure === '') animateRealCharts();
          // highlight bottom nav
          document.querySelectorAll('#te-bottom-nav button').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-page') === pure);
          });
        }, 320);
      }
    };
    window.navigate.__tePatched = true;
  }

  function patchBuildNav() {
    if (typeof window.buildNav !== 'function' || window.buildNav.__tePatched) return;
    var orig = window.buildNav;
    window.buildNav = function () {
      var r = orig.apply(this, arguments);
      applyIcons(getTheme());
      return r;
    };
    window.buildNav.__tePatched = true;
  }

  function boot() {
    stripJunk();
    ensureLoader();
    injectFloat();
    injectSidebar();
    injectBottom();
    patchNavigate();
    patchBuildNav();
    patchDashboard();
    if (typeof Pages !== 'undefined') {
      Pages.toggleNightMode = function () {
        apply(getTheme() === 'night' ? 'default' : 'night');
      };
    }
    apply(getTheme(), true);
    setTimeout(animateRealCharts, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 600);
  setTimeout(function () { applyIcons(getTheme()); animateRealCharts(); }, 1800);

  window.ThemeEngine = { apply: apply, current: getTheme, list: THEMES, animateCharts: animateRealCharts };
  console.log('[theme-engine v3] real charts + full mobile nav');
})();
