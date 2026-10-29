/**
 * theme-engine.js — تم عمیق: آیکون منو + لودینگ + قهرمان داشبورد + بدون کلید تکراری
 */
(function () {
  var KEY = 'katrans_theme_engine';
  var THEMES = [
    { id: 'default', icon: '🌿', title: 'سبز انصار' },
    { id: 'night', icon: '🌙', title: 'شیفت شب' },
    { id: 'orbit', icon: '🌌', title: 'مدار روح' },
    { id: 'ember', icon: '🔥', title: 'اخگر' }
  ];

  // آیکون‌های منو به ازای هر تم
  var ICON_MAP = {
    default: {
      dashboard: '📊', entries: '📥', wastes: '🗑️', productions: '🍳',
      processings: '🔄', materials: '📦', products: '🍢', transfers: '🚚',
      stocktake: '📋', personnel: '👥', chat: '💬', reports: '📑',
      audit: '📜', settings: '⚙️', users: '🔐'
    },
    night: {
      dashboard: '🌑', entries: '📥', wastes: '🗑️', productions: '🍳',
      processings: '🔄', materials: '📦', products: '🍢', transfers: '🚛',
      stocktake: '📋', personnel: '👥', chat: '💬', reports: '📑',
      audit: '📜', settings: '⚙️', users: '🔐'
    },
    orbit: {
      dashboard: '🪐', entries: '🚀', wastes: '☄️', productions: '🛰️',
      processings: '🌀', materials: '🛸', products: '⭐', transfers: '🚀',
      stocktake: '📡', personnel: '🤖', chat: '📡', reports: '📑',
      audit: '📜', settings: '⚙️', users: '🔐'
    },
    ember: {
      dashboard: '🔥', entries: '📦', wastes: '🗑️', productions: '⚒️',
      processings: '🔧', materials: '📦', products: '🍢', transfers: '🚚',
      stocktake: '📋', personnel: '👷', chat: '💬', reports: '📑',
      audit: '📜', settings: '⚙️', users: '🔐'
    }
  };

  var LOAD_ICON = {
    default: '⏳',
    night: '🌙',
    orbit: '🚀',
    ember: '⚙️'
  };
  var LOAD_TEXT = {
    default: 'در حال بارگذاری…',
    night: 'شیفت شب — آماده‌سازی…',
    orbit: 'پرتاب به صفحه…',
    ember: 'جفت‌کردن آچار و مهره…'
  };

  function getTheme() {
    try { return localStorage.getItem(KEY) || 'default'; } catch (e) { return 'default'; }
  }

  function clearClasses() {
    var r = document.documentElement;
    r.classList.remove('te-default', 'te-night', 'te-orbit', 'te-ember', 'night-shift', 'theme-orbit', 'theme-ember');
  }

  function applyIcons(themeId) {
    var map = ICON_MAP[themeId] || ICON_MAP.default;
    // سایدبار
    document.querySelectorAll('#nav-links .sidebar-link[data-page]').forEach(function (el) {
      var page = el.getAttribute('data-page');
      var icon = map[page];
      if (!icon) return;
      var span = el.querySelector('span');
      if (span) span.textContent = icon;
    });
    // نوار پایین
    document.querySelectorAll('#te-bottom-nav button[data-page]').forEach(function (el) {
      var page = el.getAttribute('data-page');
      var icon = map[page] || el.querySelector('.ico')?.textContent;
      var ico = el.querySelector('.ico');
      if (ico && map[page]) ico.textContent = map[page];
    });
  }

  function ensureLoader() {
    if (document.getElementById('te-loader')) return;
    var el = document.createElement('div');
    el.id = 'te-loader';
    el.innerHTML = '<div class="te-anim">🚀</div><div class="te-msg">…</div>';
    document.body.appendChild(el);
  }

  function showLoader(themeId) {
    ensureLoader();
    var el = document.getElementById('te-loader');
    var anim = el.querySelector('.te-anim');
    var msg = el.querySelector('.te-msg');
    if (anim) anim.textContent = LOAD_ICON[themeId] || '⏳';
    if (msg) msg.textContent = LOAD_TEXT[themeId] || 'در حال بارگذاری…';
    el.classList.add('show');
  }
  function hideLoader() {
    var el = document.getElementById('te-loader');
    if (el) el.classList.remove('show');
  }

  function injectPlanetHero() {
    if (document.getElementById('te-planet-hero')) return;
    var hero = document.createElement('div');
    hero.id = 'te-planet-hero';
    hero.innerHTML =
      '<div class="te-planet" aria-hidden="true"></div>' +
      '<div class="te-hero-text">' +
      '<div class="te-hero-title">ارزش تقریبی موجودی (تم مدار)</div>' +
      '<div class="te-hero-value" id="te-hero-value">—</div>' +
      '<div style="font-size:11px;color:#94a3b8;margin-top:4px">سیارهٔ انبار · روح مدار</div>' +
      '</div>';
    // بعد از لود داشبورد جابه‌جا می‌شود
    document.body.appendChild(hero);
  }

  function placePlanetOnDashboard() {
    var hero = document.getElementById('te-planet-hero');
    if (!hero) return;
    var page = document.getElementById('page-content') || document.querySelector('#app main') || document.getElementById('content');
    if (!page) return;
    // فقط وقتی داشبورد است بچسبان به بالای محتوا
    var hash = (location.hash || '#dashboard').replace('#', '').split('?')[0];
    if (hash !== 'dashboard' && hash !== '') {
      hero.style.display = 'none';
      return;
    }
    if (!page.contains(hero)) {
      page.insertBefore(hero, page.firstChild);
    }
    // مقدار از stock اگر باشد
    updateHeroValue();
  }

  async function updateHeroValue() {
    var el = document.getElementById('te-hero-value');
    if (!el) return;
    try {
      var mats = (await DB.getAll('materials')) || [];
      var sum = 0;
      mats.forEach(function (m) {
        var p = Number(m.last_buy_price || 0);
        var s = Number(m.initial_stock || 0);
        // تقریبی — موجودی دقیق از calcStock سنگین است
        if (p > 0) sum += p * Math.max(s, 0);
      });
      if (sum > 0) {
        el.textContent = Math.round(sum).toLocaleString('fa-IR') + ' تومان';
      } else {
        el.textContent = 'با قیمت‌گذاری دقیق‌تر می‌شود';
      }
    } catch (e) {
      el.textContent = '—';
    }
  }

  function apply(themeId, silent) {
    clearClasses();
    if (themeId === 'night') {
      document.documentElement.classList.add('te-night', 'night-shift');
    } else if (themeId === 'orbit') {
      document.documentElement.classList.add('te-orbit');
    } else if (themeId === 'ember') {
      document.documentElement.classList.add('te-ember');
    } else {
      document.documentElement.classList.add('te-default');
      themeId = 'default';
    }
    try {
      localStorage.setItem(KEY, themeId);
      localStorage.setItem('kitchen_night_shift', themeId === 'night' ? '1' : '0');
      localStorage.setItem('katrans_soul_theme', themeId); // سازگاری
    } catch (e) {}

    document.querySelectorAll('#theme-engine-bar button.te-chip, #theme-engine-side button.te-chip').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === themeId);
    });

    applyIcons(themeId);
    placePlanetOnDashboard();

    if (!silent && typeof toast === 'function') {
      var t = THEMES.find(function (x) { return x.id === themeId; });
      toast((t && t.title) || themeId, 'info');
    }
  }

  function buildChips(barId) {
    var bar = document.createElement('div');
    bar.id = barId || 'theme-engine-bar';
    bar.setAttribute('role', 'group');
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

  function stripDuplicates() {
    // نوارهای قدیمی
    ['orbit-theme-toggle', 'orbit-bottom-nav', 'soul-theme-bar', 'soul-theme-bar-side', 'soul-theme-sidebar'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('button[onclick*="toggleNightMode"]').forEach(function (b) {
      b.style.display = 'none';
    });
  }

  function injectUI() {
    stripDuplicates();
    // موبایل تاپ‌بار
    var actions = document.querySelector('#mobile-topbar .mob-actions');
    if (actions && !document.getElementById('theme-engine-bar')) {
      actions.insertBefore(buildChips('theme-engine-bar'), actions.firstChild);
    }
    // سایدبار
    if (!document.getElementById('theme-engine-side')) {
      var logout = document.querySelector('button[onclick*="logout"], .logout-btn');
      var host = logout && logout.parentElement;
      if (host) {
        var wrap = document.createElement('div');
        wrap.id = 'theme-engine-side';
        wrap.innerHTML = '<div class="te-label">حال و هوا · تم کامل</div>';
        var chips = buildChips('theme-engine-bar-side');
        chips.querySelectorAll('button').forEach(function (b) {
          b.onclick = function (e) {
            e.preventDefault();
            apply(b.getAttribute('data-theme'));
          };
        });
        wrap.appendChild(chips);
        host.insertBefore(wrap, logout);
      }
    }
    // نوار پایین
    if (!document.getElementById('te-bottom-nav')) {
      var nav = document.createElement('nav');
      nav.id = 'te-bottom-nav';
      var items = [
        ['dashboard', 'خانه'],
        ['materials', 'مواد'],
        ['entries', 'ورود'],
        ['productions', 'تولید'],
        ['settings', 'بیشتر']
      ];
      items.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-page', it[0]);
        b.innerHTML = '<span class="ico">•</span><span>' + it[1] + '</span>';
        b.onclick = function () {
          if (typeof navigate === 'function') navigate(it[0]);
          else location.hash = '#' + it[0];
        };
        nav.appendChild(b);
      });
      document.body.appendChild(nav);
    }
  }

  // هوک navigate برای لودینگ تم‌دار
  function patchNavigate() {
    if (typeof window.navigate !== 'function') return;
    if (window.navigate.__tePatched) return;
    var orig = window.navigate;
    window.navigate = async function (page) {
      var theme = getTheme();
      showLoader(theme);
      try {
        var r = await orig.apply(this, arguments);
        return r;
      } finally {
        setTimeout(hideLoader, 280);
        setTimeout(function () {
          applyIcons(getTheme());
          placePlanetOnDashboard();
        }, 320);
      }
    };
    window.navigate.__tePatched = true;
  }

  // هوک buildNav برای آیکون بعد از ساخت منو
  function patchBuildNav() {
    if (typeof window.buildNav !== 'function') return;
    if (window.buildNav.__tePatched) return;
    var orig = window.buildNav;
    window.buildNav = function () {
      var r = orig.apply(this, arguments);
      applyIcons(getTheme());
      return r;
    };
    window.buildNav.__tePatched = true;
  }

  function patchNight() {
    if (typeof Pages === 'undefined') return;
    Pages.toggleNightMode = function () {
      apply(getTheme() === 'night' ? 'default' : 'night');
    };
  }

  function boot() {
    ensureLoader();
    injectPlanetHero();
    injectUI();
    patchNavigate();
    patchBuildNav();
    patchNight();
    apply(getTheme(), true);
    applyIcons(getTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(boot, 500);
  setTimeout(boot, 1800);
  setTimeout(function () { applyIcons(getTheme()); placePlanetOnDashboard(); }, 2500);

  window.ThemeEngine = {
    apply: apply,
    current: getTheme,
    list: THEMES,
    showLoader: showLoader,
    hideLoader: hideLoader
  };
  console.log('[theme-engine] deep themes ready');
})();
