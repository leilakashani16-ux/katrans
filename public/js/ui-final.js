/**
 * ui-final.js
 * 1) نوار پایین جمع‌وجور + مخفی هنگام فرم/ثبت
 * 2) دونات‌های واقعی با چرخش مداوم (requestAnimationFrame)
 */
(function () {
  var spinRAF = null;
  var spinners = [];

  /* ---------- Bottom nav ---------- */
  var PRIMARY = [
    { page: 'dashboard', label: 'خانه', icon: '🏠' },
    { page: 'entries', label: 'ورود', icon: '📥' },
    { page: 'productions', label: 'تولید', icon: '🍳' },
    { page: 'materials', label: 'مواد', icon: '📦' },
    { page: 'products', label: 'محصول', icon: '🍢' },
    { page: 'personnel', label: 'پرسنل', icon: '👥' },
    { page: 'transfers', label: 'ارسال', icon: '🚚' },
    { page: 'more', label: 'بیشتر', icon: '⋯' }
  ];
  var MORE_PAGES = ['wastes', 'processings', 'chat', 'reports', 'settings', 'users', 'stocktake', 'audit'];

  function stripOldNav() {
    var old = document.getElementById('te-bottom-nav');
    if (old) old.remove();
    var fab = document.getElementById('te-nav-fab');
    if (fab) fab.remove();
  }

  function injectNav() {
    stripOldNav();
    var nav = document.createElement('nav');
    nav.id = 'te-bottom-nav';
    PRIMARY.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-page', it.page);
      b.innerHTML = '<span class="ico">' + it.icon + '</span><span>' + it.label + '</span>';
      b.onclick = function () {
        if (it.page === 'more') {
          // باز کردن منوی کوتاه
          var extra = MORE_PAGES.map(function (p) {
            return p;
          }).join(',');
          if (typeof navigate === 'function') navigate('settings');
          return;
        }
        if (typeof navigate === 'function') navigate(it.page);
        else location.hash = '#' + it.page;
      };
      nav.appendChild(b);
    });
    document.body.appendChild(nav);

    var fab = document.createElement('button');
    fab.id = 'te-nav-fab';
    fab.type = 'button';
    fab.title = 'منو';
    fab.textContent = '☰';
    fab.onclick = function () {
      showNav();
    };
    document.body.appendChild(fab);
  }

  function hideNav() {
    var nav = document.getElementById('te-bottom-nav');
    if (nav) nav.classList.add('te-nav-hidden');
    document.body.classList.add('te-nav-collapsed');
  }
  function showNav() {
    var nav = document.getElementById('te-bottom-nav');
    if (nav) nav.classList.remove('te-nav-hidden');
    document.body.classList.remove('te-nav-collapsed');
  }

  function shouldHideNav() {
    var pc = document.getElementById('page-content');
    if (!pc) return false;
    // فرم ثبت / مودال / دکمه ذخیره در پایین
    if (pc.querySelector('form')) return true;
    if (document.querySelector('.modal:not(.hidden), [class*="modal"]:not(.hidden)')) return true;
    // صفحات عملیاتی که معمولاً فرم دارند
    var hash = (location.hash || '').replace(/^#/, '').split('?')[0];
    if (['entries', 'productions', 'wastes', 'processings', 'transfers', 'stocktake'].indexOf(hash) >= 0) {
      // اگر فرم یا دکمه ذخیره دیده می‌شود
      if (pc.querySelector('.btn-primary, button[type="submit"]')) return true;
    }
    return false;
  }

  function syncNavVisibility() {
    if (window.innerWidth > 1023) {
      hideNav();
      document.body.classList.remove('te-nav-collapsed');
      var n = document.getElementById('te-bottom-nav');
      if (n) n.style.display = 'none';
      return;
    }
    var n = document.getElementById('te-bottom-nav');
    if (n) n.style.display = '';
    if (shouldHideNav()) hideNav();
    else showNav();

    // highlight
    var pure = (location.hash || '#dashboard').replace(/^#/, '').split('?')[0];
    document.querySelectorAll('#te-bottom-nav button').forEach(function (b) {
      var p = b.getAttribute('data-page');
      b.classList.toggle('active', p === pure || (p === 'more' && MORE_PAGES.indexOf(pure) >= 0));
    });
  }

  /* ---------- Live donuts ---------- */
  function stopSpin() {
    if (spinRAF) cancelAnimationFrame(spinRAF);
    spinRAF = null;
    spinners = [];
  }

  function enhanceDonuts() {
    var root = document.getElementById('dash-charts');
    if (!root) return;

    stopSpin();

    root.querySelectorAll('[style*="conic-gradient"]').forEach(function (el) {
      // اگر قبلاً host شده
      if (el.closest('.te-donut-host')) {
        spinners.push({ el: el.closest('.te-donut-host').querySelector('.te-spin') || el, angle: Math.random() * 360, speed: 0.12 + Math.random() * 0.1 });
        return;
      }

      var parent = el.parentElement;
      if (!parent) return;

      // host با اندازه ثابت تا ارتفاع صفر نشود
      var host = document.createElement('div');
      host.className = 'te-donut-host';

      // spin wrapper
      var spin = document.createElement('div');
      spin.className = 'te-spin';
      spin.style.background = el.style.background || el.getAttribute('style').replace(/^background:\s*/i, '');
      // copy conic from original
      var st = el.getAttribute('style') || '';
      var m = st.match(/background\s*:\s*([^;]+)/i);
      if (m) spin.style.background = m[1];

      var hole = document.createElement('div');
      hole.className = 'te-hole';
      var o1 = document.createElement('div');
      o1.className = 'te-orbit';
      var o2 = document.createElement('div');
      o2.className = 'te-orbit2';

      host.appendChild(spin);
      host.appendChild(hole);
      host.appendChild(o1);
      host.appendChild(o2);

      // جایگزینی: parent معمولاً relative w-36 h-36 است
      parent.style.width = '9rem';
      parent.style.height = '9rem';
      parent.style.position = 'relative';
      parent.innerHTML = '';
      parent.appendChild(host);

      spinners.push({ el: spin, angle: Math.random() * 360, speed: 0.1 + Math.random() * 0.12 });
    });

    // میله‌ها
    root.querySelectorAll('.h-2 div[style*="width"], .h-full.rounded-full[style*="width"]').forEach(function (bar) {
      bar.classList.add('te-bar-fill');
    });

    function tick() {
      spinners.forEach(function (s) {
        if (!s.el || !s.el.isConnected) return;
        s.angle += s.speed;
        s.el.style.transform = 'rotate(' + s.angle + 'deg)';
      });
      spinRAF = requestAnimationFrame(tick);
    }
    if (spinners.length) spinRAF = requestAnimationFrame(tick);
  }

  function onPage() {
    syncNavVisibility();
    var pure = (location.hash || '#dashboard').replace(/^#/, '').split('?')[0];
    if (pure === 'dashboard' || pure === '') {
      setTimeout(enhanceDonuts, 100);
      setTimeout(enhanceDonuts, 500);
      setTimeout(enhanceDonuts, 1200);
    } else {
      stopSpin();
    }
  }

  function patchNav() {
    if (typeof window.navigate !== 'function') return;
    if (window.navigate.__uiFinal) return;
    var orig = window.navigate;
    window.navigate = async function () {
      var r = await orig.apply(this, arguments);
      setTimeout(onPage, 200);
      setTimeout(onPage, 700);
      return r;
    };
    window.navigate.__uiFinal = true;
  }

  // Mutation: وقتی فرم به صفحه اضافه شد نوار را جمع کن + بعد از ورق نمودار انیمیشن را برگردان
  var obs = new MutationObserver(function (mutations) {
    syncNavVisibility();
    var needCharts = false;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.target && (m.target.id === 'dash-charts' || m.target.id === 'dash-charts-wrap' ||
          (m.target.closest && (m.target.closest('#dash-charts') || m.target.closest('#dash-charts-wrap'))))) {
        needCharts = true;
        break;
      }
      if (m.addedNodes) {
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.id === 'dash-charts' || n.id === 'dash-charts-wrap' ||
              (n.querySelector && n.querySelector('#dash-charts, #dash-charts-wrap, [style*="conic-gradient"]'))) {
            needCharts = true;
            break;
          }
        }
      }
      if (needCharts) break;
    }
    if (needCharts) {
      clearTimeout(window.__teDonutRetry);
      window.__teDonutRetry = setTimeout(function () {
        var pure = (location.hash || '#dashboard').replace(/^#/, '').split('?')[0];
        if (pure === 'dashboard' || pure === '') enhanceDonuts();
      }, 60);
    }
  });

  function boot() {
    injectNav();
    patchNav();
    onPage();
    var pc = document.getElementById('page-content');
    if (pc) obs.observe(pc, { childList: true, subtree: true });
    window.addEventListener('resize', syncNavVisibility);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 600);
  setTimeout(onPage, 1500);

  window.UiFinal = { enhanceDonuts: enhanceDonuts, hideNav: hideNav, showNav: showNav };
  console.log('[ui-final] bottom nav collapsible + live donuts');
})();
