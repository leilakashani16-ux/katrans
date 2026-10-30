
/**
 * charts-live-addon — بعد از ورود، دونات و میله‌ها زنده می‌مانند
 */
(function () {
  var aliveTimer = null;

  function markAlive() {
    var root = document.getElementById('dash-charts');
    if (!root) return;

    root.querySelectorAll('.te-donut-core, .te-donut-ring, .te-donut-ring2, .te-bar-fill, .te-space-card')
      .forEach(function (el) { el.classList.add('te-alive'); });

    // نقطهٔ لجند
    root.querySelectorAll('.glass-card span.w-2\\.5, .glass-card span[class*="w-2"]').forEach(function (dot) {
      if (dot.offsetWidth <= 14 && dot.offsetHeight <= 14) {
        dot.classList.add('te-legend-dot', 'te-alive');
      }
    });

    // خط نبض زیر عنوان هر کارت
    root.querySelectorAll('.glass-card').forEach(function (card) {
      if (card.querySelector('.te-chart-pulse-line')) return;
      var h = card.querySelector('h2');
      if (!h) return;
      var line = document.createElement('div');
      line.className = 'te-chart-pulse-line';
      if (h.nextSibling) card.insertBefore(line, h.nextSibling);
      else card.appendChild(line);
    });
  }

  function softReenhance() {
    if (typeof enhanceSpaceCharts === 'function') {
      try { enhanceSpaceCharts(); } catch (e) {}
    } else if (window.ThemeEngine && typeof ThemeEngine.animateCharts === 'function') {
      try { ThemeEngine.animateCharts(); } catch (e) {}
    }
    // کمی صبر تا کلاس‌های ورود اعمال شوند، بعد alive
    setTimeout(markAlive, 200);
    setTimeout(markAlive, 900);
  }

  function onDash() {
    var hash = (location.hash || '#dashboard').replace(/^#/, '').split('?')[0];
    if (hash !== 'dashboard' && hash !== '') return;
    softReenhance();
  }

  // بعد از هر ناوبری به داشبورد
  var origNav = window.navigate;
  if (typeof origNav === 'function' && !origNav.__liveCharts) {
    window.navigate = async function (page) {
      var r = await origNav.apply(this, arguments);
      var pure = String(page || '').split('?')[0];
      if (pure === 'dashboard' || pure === '') {
        setTimeout(onDash, 350);
        setTimeout(onDash, 1000);
      }
      return r;
    };
    window.navigate.__liveCharts = true;
  }

  // شروع
  setTimeout(onDash, 800);
  setTimeout(onDash, 2000);

  // هر چند ثانیه یک‌بار فقط کلاس alive را تازه کن (اگر DOM عوض شد)
  if (aliveTimer) clearInterval(aliveTimer);
  aliveTimer = setInterval(function () {
    var root = document.getElementById('dash-charts');
    if (!root) return;
    if (!root.querySelector('.te-donut-core.te-alive') && root.querySelector('.rounded-full')) {
      softReenhance();
    }
  }, 4000);

  console.log('[charts-live] continuous motion on');
})();
