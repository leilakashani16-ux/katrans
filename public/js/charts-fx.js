/**
 * Charts FX — افکت فانتزی دونات/میله (فقط فرانت، بدون D1)
 * بعد از ui-final.js لود شود
 */
(function () {
  var spinRAF = null;
  var spinners = [];
  var PEAK_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80'];

  function stopSpin() {
    if (spinRAF) cancelAnimationFrame(spinRAF);
    spinRAF = null;
    spinners = [];
  }

  function markCards(root) {
    root.querySelectorAll(':scope > div, :scope > .glass-card, :scope > .glass').forEach(function (card) {
      card.classList.add('te-fx-card');
    });
    // fallback: any direct children
    if (!root.querySelector('.te-fx-card')) {
      Array.prototype.forEach.call(root.children, function (c) {
        if (c.nodeType === 1) c.classList.add('te-fx-card');
      });
    }
  }

  function enhanceDonuts(root) {
    root.querySelectorAll('[style*="conic-gradient"]').forEach(function (el) {
      if (el.closest('.te-fx-donut') || el.closest('.te-donut-host')) {
        var host = el.closest('.te-fx-donut') || el.closest('.te-donut-host');
        var spin = host.querySelector('.te-spin') || el;
        spinners.push({
          el: spin,
          angle: Math.random() * 360,
          speed: 0.08 + Math.random() * 0.1
        });
        return;
      }

      var parent = el.parentElement;
      if (!parent) return;

      var host = document.createElement('div');
      host.className = 'te-fx-donut te-donut-host';

      var spin = document.createElement('div');
      spin.className = 'te-spin';
      var st = el.getAttribute('style') || '';
      var m = st.match(/background\s*:\s*([^;]+)/i);
      if (m) spin.style.background = m[1];
      else spin.style.background = el.style.background;

      var hole = document.createElement('div');
      hole.className = 'te-fx-hole te-hole';

      var ring = document.createElement('div');
      ring.className = 'te-fx-ring';
      var ring2 = document.createElement('div');
      ring2.className = 'te-fx-ring2';
      var ticks = document.createElement('div');
      ticks.className = 'te-fx-ticks';
      var glow = document.createElement('div');
      glow.className = 'te-fx-glow';

      host.appendChild(spin);
      host.appendChild(hole);
      host.appendChild(glow);
      host.appendChild(ticks);
      host.appendChild(ring);
      host.appendChild(ring2);

      parent.style.width = '9rem';
      parent.style.height = '9rem';
      parent.style.position = 'relative';
      parent.innerHTML = '';
      parent.appendChild(host);

      spinners.push({
        el: spin,
        angle: Math.random() * 360,
        speed: 0.08 + Math.random() * 0.1
      });
    });
  }

  function enhanceBars(root) {
    root.querySelectorAll('.h-2 div[style*="width"], .h-full.rounded-full[style*="width"]').forEach(function (bar) {
      bar.classList.add('te-bar-fill', 'te-fx-bar');
    });
  }

  /** میله‌های افسانه‌ای کنار legend — اختیاری اگر لیست درصد باشد */
  function enhanceMountainHints(root) {
    root.querySelectorAll('.te-fx-card').forEach(function (card, ci) {
      if (card.querySelector('.te-fx-mountain')) return;
      var rows = card.querySelectorAll('.flex.justify-between, .flex.items-center');
      if (rows.length < 3 || rows.length > 12) return;
      // فقط یک‌بار برای کارت‌هایی که شبیه legend هستند
      var mountain = document.createElement('div');
      mountain.className = 'te-fx-mountain mt-3';
      var n = Math.min(rows.length, 8);
      for (var i = 0; i < n; i++) {
        var peak = document.createElement('div');
        peak.className = 'te-fx-peak';
        var h = 30 + ((i * 17 + ci * 11) % 70);
        peak.style.height = h + '%';
        peak.style.setProperty('--peak', PEAK_COLORS[i % PEAK_COLORS.length]);
        peak.style.animationDelay = (i * 0.12 + ci * 0.05) + 's';
        mountain.appendChild(peak);
      }
      // به انتهای کارت اضافه نکن اگر شلوغ می‌شود — فقط اگر جا باشد
      var body = card.querySelector('.space-y-2, .space-y-1, .mt-3') || card;
      if (body && !card.querySelector('[style*="conic-gradient"]') && !card.querySelector('.te-fx-donut')) {
        // skip mountain on pure list cards without donut to avoid clutter — only when donut present as secondary viz
      }
    });
  }

  function tick() {
    spinners.forEach(function (s) {
      if (!s.el || !s.el.isConnected) return;
      s.angle += s.speed;
      s.el.style.transform = 'rotate(' + s.angle + 'deg)';
    });
    spinRAF = requestAnimationFrame(tick);
  }

  function enhance() {
    var wrap = document.getElementById('dash-charts-wrap');
    var root = document.getElementById('dash-charts');
    if (!root) {
      stopSpin();
      return;
    }
    if (wrap) wrap.classList.add('te-fx-on');
    stopSpin();
    markCards(root);
    enhanceDonuts(root);
    enhanceBars(root);
    if (spinners.length) spinRAF = requestAnimationFrame(tick);
  }

  function onPage() {
    var pure = (location.hash || '#dashboard').replace(/^#/, '').split('?')[0];
    if (pure === 'dashboard' || pure === '') {
      setTimeout(enhance, 80);
      setTimeout(enhance, 400);
      setTimeout(enhance, 1100);
    } else {
      stopSpin();
    }
  }

  // بعد از ورق نمودار
  var obs = new MutationObserver(function (mutations) {
    var need = false;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.target && (m.target.id === 'dash-charts' || m.target.id === 'dash-charts-wrap')) {
        need = true;
        break;
      }
      if (m.addedNodes) {
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.id === 'dash-charts' || (n.querySelector && n.querySelector('#dash-charts, [style*="conic-gradient"]'))) {
            need = true;
            break;
          }
        }
      }
      if (need) break;
    }
    if (need) {
      clearTimeout(window.__teFxRetry);
      window.__teFxRetry = setTimeout(function () {
        var pure = (location.hash || '#dashboard').replace(/^#/, '').split('?')[0];
        if (pure === 'dashboard' || pure === '') enhance();
      }, 50);
    }
  });

  function boot() {
    onPage();
    var pc = document.getElementById('page-content');
    if (pc) obs.observe(pc, { childList: true, subtree: true });
    if (typeof window.navigate === 'function' && !window.navigate.__chartsFx) {
      var orig = window.navigate;
      window.navigate = async function () {
        var r = await orig.apply(this, arguments);
        setTimeout(onPage, 200);
        setTimeout(onPage, 700);
        return r;
      };
      window.navigate.__chartsFx = true;
    }
  }

  // هوک روی applyDashChartPeriod
  function patchApply() {
    if (typeof Pages === 'undefined' || !Pages.applyDashChartPeriod || Pages.applyDashChartPeriod.__fx) return;
    var prev = Pages.applyDashChartPeriod;
    Pages.applyDashChartPeriod = function () {
      var r = prev.apply(this, arguments);
      setTimeout(enhance, 90);
      setTimeout(enhance, 450);
      return r;
    };
    Pages.applyDashChartPeriod.__fx = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 700);
  setTimeout(patchApply, 900);
  setTimeout(patchApply, 2000);

  window.ChartsFx = { enhance: enhance, stop: stopSpin };
  console.log('[charts-fx] fancy layer ready');
})();
