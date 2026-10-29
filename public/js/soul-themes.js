/**
 * soul-themes.js — تم‌های روح‌دار کنار شیفت شب
 * default | night | orbit | ember
 */
(function () {
  var KEY = 'katrans_soul_theme';
  var THEMES = [
    { id: 'default', icon: '🌿', title: 'عادی سبز' },
    { id: 'night', icon: '🌙', title: 'شیفت شب' },
    { id: 'orbit', icon: '🌌', title: 'مدار روح' },
    { id: 'ember', icon: '🔥', title: 'اخگر' }
  ];

  function current() {
    try {
      return localStorage.getItem(KEY) || 'default';
    } catch (e) {
      return 'default';
    }
  }

  function clearThemeClasses() {
    var root = document.documentElement;
    root.classList.remove('night-shift', 'theme-orbit', 'theme-ember');
  }

  function apply(id, silent) {
    clearThemeClasses();
    if (id === 'night') {
      document.documentElement.classList.add('night-shift');
    } else if (id === 'orbit') {
      document.documentElement.classList.add('theme-orbit');
    } else if (id === 'ember') {
      document.documentElement.classList.add('theme-ember');
    }
    try {
      localStorage.setItem(KEY, id);
      // همگام با فلگ قدیمی شیفت شب
      localStorage.setItem('kitchen_night_shift', id === 'night' ? '1' : '0');
    } catch (e) {}
    document.querySelectorAll('#soul-theme-bar button.soul-chip').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === id);
    });
    if (!silent && typeof toast === 'function') {
      var t = THEMES.find(function (x) { return x.id === id; });
      toast((t && t.title) || id, 'info');
    }
  }

  function buildBar() {
    var bar = document.createElement('div');
    bar.id = 'soul-theme-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'تم ظاهری');
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'soul-chip';
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

  function injectMobile() {
    var actions = document.querySelector('#mobile-topbar .mob-actions');
    if (!actions) return;
    if (document.getElementById('soul-theme-bar')) return;
    // دکمه قدیمی ماه را مخفی کن تا تکراری نباشد
    var old = actions.querySelector('button[onclick*="toggleNightMode"]');
    if (old) old.style.display = 'none';
    var bar = buildBar();
    actions.insertBefore(bar, actions.firstChild);
  }

  function injectSidebar() {
    if (document.getElementById('soul-theme-sidebar')) return;
    // نزدیک دکمه خروج یا پایین سایدبار
    var side = document.querySelector('aside, #sidebar, .sidebar, nav.sidebar');
    var logout = document.querySelector('button[onclick*="logout"], .logout-btn');
    var host = null;
    if (logout && logout.parentElement) host = logout.parentElement;
    else if (side) host = side;

    if (!host) return;
    var wrap = document.createElement('div');
    wrap.id = 'soul-theme-sidebar';
    wrap.innerHTML = '<div class="soul-label">حال و هوا</div>';
    var bar = buildBar();
    // id یکتا برای سایدبار
    bar.id = 'soul-theme-bar-side';
    // کپی دکمه‌ها با همان رفتار
    bar.querySelectorAll('button').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault();
        apply(b.getAttribute('data-theme'));
      };
    });
    wrap.appendChild(bar);
    if (logout && logout.parentElement === host) {
      host.insertBefore(wrap, logout);
    } else {
      host.appendChild(wrap);
    }
  }

  // سازگاری با toggleNightMode قبلی
  function patchNightToggle() {
    if (typeof Pages === 'undefined') return;
    Pages.toggleNightMode = function () {
      var cur = current();
      apply(cur === 'night' ? 'default' : 'night');
    };
  }

  function boot() {
    injectMobile();
    injectSidebar();
    patchNightToggle();
    apply(current(), true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(boot, 600);
  setTimeout(boot, 2000);
  window.SoulThemes = { apply: apply, current: current, list: THEMES };
  console.log('[soul-themes] ready');
})();
