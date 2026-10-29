/**
 * theme-engine.js v2 — تم عمیق بدون کلید تکراری
 * - نوار تم شناور (دسکتاپ همیشه دیده می‌شود)
 * - یک نوار در سایدبار کنار خروج
 * - نوار پایین همیشه
 * - آیکون منو + لودینگ + نمودار زنده متحرک
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
  var LOAD_TEXT = { default:'در حال بارگذاری…', night:'شیفت شب…', orbit:'پرتاب به صفحه…', ember:'جفت‌کردن آچار…' };
  var animTimer = null;

  function getTheme() {
    try { return localStorage.getItem(KEY) || 'default'; } catch (e) { return 'default'; }
  }

  function stripAllOld() {
    [
      'theme-engine-bar', 'theme-engine-bar-side', 'theme-engine-side',
      'theme-engine-bar-float', 'te-float-themes',
      'soul-theme-bar', 'soul-theme-bar-side', 'soul-theme-sidebar',
      'orbit-theme-toggle', 'orbit-bottom-nav'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('button[onclick*="toggleNightMode"]').forEach(function (b) { b.remove(); });
    // هر chip سرگردان داخل topbar مخفی
    var top = document.getElementById('mobile-topbar');
    if (top) {
      top.querySelectorAll('.te-chip, #theme-engine-bar, #theme-engine-side').forEach(function (e) { e.remove(); });
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
    ensureHero(id);
    ensureLiveCharts(id);
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
      bottom.appendChild(b);
    });
    document.body.appendChild(bottom);
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

  function ensureHero(id) {
    var hero = document.getElementById('te-planet-hero');
    if (id !== 'orbit') {
      if (hero) hero.style.display = 'none';
      return;
    }
    if (!hero) {
      hero = document.createElement('div');
      hero.id = 'te-planet-hero';
      hero.innerHTML = '<div class="te-planet"></div><div class="te-hero-text"><div class="te-hero-title">ارزش موجودی · مدار روح</div><div class="te-hero-value" id="te-hero-value">—</div></div>';
    }
    var page = document.getElementById('page-content');
    if (page && !page.contains(hero)) page.insertBefore(hero, page.firstChild);
    hero.style.display = 'flex';
  }

  function ensureLiveCharts(id) {
    var box = document.getElementById('te-live-charts');
    if (id !== 'orbit' && id !== 'ember') {
      if (box) box.style.display = 'none';
      if (animTimer) cancelAnimationFrame(animTimer);
      return;
    }
    if (!box) {
      box = document.createElement('div');
      box.id = 'te-live-charts';
      box.innerHTML =
        '<div class="te-charts-grid">' +
        '<div class="glass-card te-chart-card"><div class="te-chart-label">نمودار زنده موجودی</div><canvas id="te-chart-line" width="360" height="130"></canvas></div>' +
        '<div class="glass-card te-chart-card"><div class="te-chart-label">وضعیت زنده</div><canvas id="te-chart-donut" width="180" height="130"></canvas></div>' +
        '</div>';
    }
    var page = document.getElementById('page-content');
    if (page && !page.contains(box)) {
      var hero = document.getElementById('te-planet-hero');
      if (hero && hero.parentNode === page) page.insertBefore(box, hero.nextSibling);
      else page.insertBefore(box, page.firstChild);
    }
    box.style.display = 'block';
    startAnimCharts(id);
  }

  function startAnimCharts(id) {
    if (animTimer) cancelAnimationFrame(animTimer);
    var line = document.getElementById('te-chart-line');
    var donut = document.getElementById('te-chart-donut');
    if (!line || !donut) return;
    var t0 = performance.now();
    var color = id === 'ember' ? '#fb923c' : '#22d3ee';
    var color2 = id === 'ember' ? '#ea580c' : '#a78bfa';
    function frame(now) {
      var t = (now - t0) / 1000;
      var ctx = line.getContext('2d');
      var w = line.width, h = line.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(148,163,184,0.12)';
      ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) {
        ctx.beginPath(); ctx.moveTo(0, h * g / 4); ctx.lineTo(w, h * g / 4); ctx.stroke();
      }
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      for (var x = 0; x < w; x++) {
        var y = h * 0.55 + Math.sin(x / 42 + t * 1.4) * 20 + Math.sin(x / 16 + t * 2.1) * 9;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      var dx = w * ((t * 0.12) % 1);
      var dy = h * 0.55 + Math.sin(dx / 42 + t * 1.4) * 20 + Math.sin(dx / 16 + t * 2.1) * 9;
      ctx.beginPath(); ctx.fillStyle = color; ctx.globalAlpha = 0.3; ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();

      var dctx = donut.getContext('2d');
      var dw = donut.width, dh = donut.height, cx = dw / 2, cy = dh / 2, r = Math.min(cx, cy) - 14;
      dctx.clearRect(0, 0, dw, dh);
      var parts = [0.4 + Math.sin(t) * 0.025, 0.27, 0.2, 0.13];
      var cols = [color, color2, '#64748b', '#334155'];
      var ang = -Math.PI / 2 + t * 0.2;
      parts.forEach(function (p, i) {
        var a2 = ang + p * Math.PI * 2;
        dctx.beginPath();
        dctx.strokeStyle = cols[i];
        dctx.lineWidth = 11;
        dctx.lineCap = 'round';
        dctx.arc(cx, cy, r, ang, a2);
        dctx.stroke();
        ang = a2;
      });
      dctx.fillStyle = '#e2e8f0';
      dctx.font = 'bold 18px sans-serif';
      dctx.textAlign = 'center';
      dctx.textBaseline = 'middle';
      dctx.fillText(String(12 + Math.floor(Math.sin(t) * 2)), cx, cy);
      animTimer = requestAnimationFrame(frame);
    }
    animTimer = requestAnimationFrame(frame);
  }

  function patchNavigate() {
    if (typeof window.navigate !== 'function' || window.navigate.__tePatched) return;
    var orig = window.navigate;
    window.navigate = async function () {
      var id = getTheme();
      showLoader(id);
      try { return await orig.apply(this, arguments); }
      finally {
        setTimeout(hideLoader, 300);
        setTimeout(function () {
          applyIcons(getTheme());
          ensureHero(getTheme());
          ensureLiveCharts(getTheme());
        }, 350);
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
    stripAllOld();
    ensureLoader();
    injectFloat();
    injectSidebar();
    injectBottom();
    patchNavigate();
    patchBuildNav();
    if (typeof Pages !== 'undefined') {
      Pages.toggleNightMode = function () {
        apply(getTheme() === 'night' ? 'default' : 'night');
      };
    }
    apply(getTheme(), true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 700);
  setTimeout(function () { applyIcons(getTheme()); }, 2000);

  window.ThemeEngine = { apply: apply, current: getTheme, list: THEMES };
  console.log('[theme-engine v2] ready');
})();
