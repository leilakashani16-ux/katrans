/**
 * theme-engine v4
 * تم داخل تنظیمات | نوار موبایل کامل | هشدار قطع | نمودار 3D واقعی
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
  var LOAD_TEXT = { default:'…', night:'شیفت شب…', orbit:'پرتاب…', ember:'آچار…' };

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
    { page: 'users', label: 'کاربران' },
    { page: 'reports', label: 'گزارش' },
    { page: 'settings', label: 'تنظیمات' }
  ];

  function getTheme() {
    try { return localStorage.getItem(KEY) || 'default'; } catch (e) { return 'default'; }
  }

  function alertsEnabled() {
    try {
      var local = localStorage.getItem('kitchen_settings');
      if (local) {
        var p = JSON.parse(local);
        if (p.alert_enabled === false) return false;
      }
    } catch (e) {}
    return true;
  }

  async function refreshAlertFlag() {
    var on = true;
    try {
      if (window.Api) {
        var s = await Api.request('settings').catch(function () { return null; });
        if (s) {
          localStorage.setItem('kitchen_settings', JSON.stringify(s));
          if (s.alert_enabled === false) on = false;
        }
      } else {
        on = alertsEnabled();
      }
    } catch (e) {
      on = alertsEnabled();
    }
    document.documentElement.classList.toggle('te-alerts-off', !on);
    document.body.classList.toggle('te-alerts-off', !on);
    // DOM purge
    if (!on) {
      document.querySelectorAll('.alert-banner').forEach(function (el) { el.remove(); });
    }
    return on;
  }

  function stripJunk() {
    [
      'te-float-themes', 'theme-engine-bar', 'theme-engine-bar-side', 'theme-engine-side',
      'theme-engine-bar-float', 'soul-theme-bar', 'soul-theme-bar-side', 'soul-theme-sidebar',
      'orbit-theme-toggle', 'orbit-bottom-nav', 'te-live-charts', 'te-planet-hero'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('button[onclick*="toggleNightMode"]').forEach(function (b) { b.remove(); });
    var top = document.getElementById('mobile-topbar');
    if (top) {
      top.querySelectorAll('.te-chip, [id*="theme-engine"], [id*="soul"]').forEach(function (e) { e.remove(); });
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
    document.documentElement.classList.remove('te-default','te-night','te-orbit','te-ember','night-shift');
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

  function makeSettingsThemes() {
    var box = document.createElement('div');
    box.id = 'te-settings-themes';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'te-chip' + (getTheme() === t.id ? ' active' : '');
      b.setAttribute('data-theme', t.id);
      b.title = t.title;
      b.innerHTML = t.icon + '<span style="font-size:9px;display:block;margin-top:2px;color:#94a3b8">' + t.title + '</span>';
      b.style.flexDirection = 'column';
      b.style.width = '72px';
      b.style.height = '64px';
      b.onclick = function (e) {
        e.preventDefault();
        apply(t.id);
      };
      box.appendChild(b);
    });
    return box;
  }

  function injectSettingsPanel() {
    if (document.getElementById('te-settings-panel')) return;
    var form = document.getElementById('settings-form');
    if (!form) return;
    var panel = document.createElement('div');
    panel.id = 'te-settings-panel';
    panel.className = 'mt-4 pt-4 border-t border-slate-700/40';
    panel.innerHTML = '<div class="text-sm font-medium mb-1">حال و هوا / تم</div><p class="text-xs text-slate-400 mb-2">ظاهر برنامه، آیکون‌ها و حس صفحات</p>';
    panel.appendChild(makeSettingsThemes());
    form.appendChild(panel);
  }

  function injectBottom() {
    var old = document.getElementById('te-bottom-nav');
    if (old) old.remove();
    var bottom = document.createElement('nav');
    bottom.id = 'te-bottom-nav';
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

  function animateRealCharts() {
    var root = document.getElementById('dash-charts');
    if (!root) return;
    root.querySelectorAll('.glass-card').forEach(function (card, i) {
      // bars
      card.querySelectorAll('[style*="width"]').forEach(function (bar, j) {
        if (bar.offsetHeight > 30) return;
        var st = bar.getAttribute('style') || '';
        if (!/width\s*:\s*[\d.]+%/.test(st)) return;
        bar.classList.add('te-bar-anim');
        bar.style.animationDelay = (j * 0.07) + 's';
      });
      // donut-like circles
      card.querySelectorAll('div').forEach(function (el) {
        var st = el.getAttribute('style') || '';
        if (/conic-gradient/i.test(st) || (el.classList.contains('rounded-full') && el.offsetWidth >= 70 && el.offsetWidth <= 220)) {
          el.classList.add('te-donut-anim', 'te-live');
          el.style.animationDelay = (i * 0.1) + 's';
        }
      });
    });
  }

  function patchDashboard() {
    if (typeof Pages === 'undefined' || typeof Pages.dashboard !== 'function') return;
    if (Pages.dashboard.__teV4) return;
    var prev = Pages.dashboard;
    Pages.dashboard = async function () {
      await refreshAlertFlag();
      var html = await prev.apply(this, arguments);
      // strip alert banner from HTML if alerts off
      if (!alertsEnabled()) {
        html = html.replace(/<div class="alert-banner[\s\S]*?<\/ul>\s*<\/div>/g, '');
        html = html.replace(/⚠️\s*هشدار موجودی[\s\S]{0,20000}?<\/ul>\s*<\/div>/g, '');
      }
      setTimeout(function () {
        if (!alertsEnabled()) {
          document.querySelectorAll('.alert-banner').forEach(function (el) { el.remove(); });
        }
        animateRealCharts();
      }, 60);
      setTimeout(animateRealCharts, 400);
      return html;
    };
    Pages.dashboard.__teV4 = true;
  }

  function patchSettings() {
    if (typeof Pages === 'undefined' || typeof Pages.settings !== 'function') return;
    if (Pages.settings.__teV4) return;
    var prev = Pages.settings;
    Pages.settings = async function () {
      var html = await prev.apply(this, arguments);
      setTimeout(function () {
        injectSettingsPanel();
        // after settings save, re-read alert flag
        var form = document.getElementById('settings-form');
        if (form && !form.__teAlertHook) {
          form.__teAlertHook = true;
          form.addEventListener('submit', function () {
            setTimeout(refreshAlertFlag, 400);
          });
        }
      }, 50);
      return html;
    };
    Pages.settings.__teV4 = true;
  }

  function patchNavigate() {
    if (typeof window.navigate !== 'function' || window.navigate.__teV4) return;
    var orig = window.navigate;
    window.navigate = async function (page) {
      var id = getTheme();
      showLoader(id);
      try { return await orig.apply(this, arguments); }
      finally {
        setTimeout(hideLoader, 260);
        setTimeout(function () {
          applyIcons(getTheme());
          var pure = String(page || '').split('?')[0];
          if (pure === 'dashboard' || pure === '') {
            refreshAlertFlag().then(animateRealCharts);
          }
          if (pure === 'settings') injectSettingsPanel();
          document.querySelectorAll('#te-bottom-nav button').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-page') === pure);
          });
        }, 300);
      }
    };
    window.navigate.__teV4 = true;
  }

  function patchBuildNav() {
    if (typeof window.buildNav !== 'function' || window.buildNav.__teV4) return;
    var orig = window.buildNav;
    window.buildNav = function () {
      var r = orig.apply(this, arguments);
      applyIcons(getTheme());
      return r;
    };
    window.buildNav.__teV4 = true;
  }

  function boot() {
    stripJunk();
    ensureLoader();
    injectBottom();
    patchNavigate();
    patchBuildNav();
    patchDashboard();
    patchSettings();
    if (typeof Pages !== 'undefined') {
      Pages.toggleNightMode = function () {
        apply(getTheme() === 'night' ? 'default' : 'night');
      };
    }
    apply(getTheme(), true);
    refreshAlertFlag();
    setTimeout(animateRealCharts, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 500);
  setTimeout(function () { refreshAlertFlag(); injectSettingsPanel(); }, 1500);

  window.ThemeEngine = { apply: apply, current: getTheme, list: THEMES, animateCharts: animateRealCharts, refreshAlerts: refreshAlertFlag };
  console.log('[theme-engine v4] settings themes + 3D charts + alerts off');
})();
