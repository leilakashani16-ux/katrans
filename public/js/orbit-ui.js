/**
 * orbit-ui.js — تم منظومه‌ای + نوار پایین
 */
(function () {
  var KEY = 'katrans_orbit_theme';

  var NAV = [
    { page: 'dashboard', icon: '◈', label: 'خانه' },
    { page: 'materials', icon: '▦', label: 'مواد' },
    { page: 'entries', icon: '⬇', label: 'ورود' },
    { page: 'productions', icon: '⚙', label: 'تولید' },
    { page: 'more', icon: '◉', label: 'بیشتر' }
  ];

  function isOn() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === null) return true; // پیش‌فرض روشن
      return v === '1';
    } catch (e) { return true; }
  }

  function setOn(on) {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('orbit-theme', !!on);
    var t = document.getElementById('orbit-theme-toggle');
    if (t) t.textContent = on ? '🌌' : '🌿';
  }

  function go(page) {
    if (page === 'more') {
      // باز کردن منوی کناری یا صفحه تنظیمات/منو
      var btn = document.querySelector('[data-page="settings"], #menu-toggle, .sidebar-toggle, button[aria-label*="منو"]');
      if (btn) { btn.click(); return; }
      if (typeof navigate === 'function') navigate('settings');
      else location.hash = '#settings';
      return;
    }
    if (typeof navigate === 'function') navigate(page);
    else if (typeof Pages !== 'undefined' && typeof Pages.show === 'function') Pages.show(page);
    else location.hash = '#' + page;
    highlight(page);
  }

  function highlight(page) {
    document.querySelectorAll('#orbit-bottom-nav button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-page') === page);
    });
  }

  function ensureNav() {
    if (document.getElementById('orbit-bottom-nav')) return;
    var nav = document.createElement('nav');
    nav.id = 'orbit-bottom-nav';
    nav.setAttribute('aria-label', 'منوی اصلی');
    var inner = document.createElement('div');
    inner.className = 'orb-nav-inner';
    NAV.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-page', item.page);
      b.innerHTML = '<span class="orb-ico">' + item.icon + '</span><span>' + item.label + '</span>';
      b.onclick = function () { go(item.page); };
      inner.appendChild(b);
    });
    nav.appendChild(inner);
    document.body.appendChild(nav);

    // theme toggle
    if (!document.getElementById('orbit-theme-toggle')) {
      var t = document.createElement('button');
      t.id = 'orbit-theme-toggle';
      t.type = 'button';
      t.title = 'تغییر تم';
      t.onclick = function () { setOn(!isOn()); };
      document.body.appendChild(t);
    }
  }

  function boot() {
    ensureNav();
    setOn(isOn());
    // hash sync
    var hash = (location.hash || '#dashboard').replace('#', '').split('?')[0];
    if (hash) highlight(hash);
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '').split('?')[0];
      highlight(h || 'dashboard');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(boot, 800);
  console.log('[orbit-ui] ready');
})();
