/**
 * dashboard-charts-mix.js
 * تنوع نمودار داشبورد: ناحیه‌ای زنده‌کش + میله رشدکننده + دونات (مثل قبل)
 * فقط فرانت — بعد از charts-fx.js لود شود
 */
(function () {
  'use strict';

  var PEAK = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80'];
  var COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80', '#2dd4bf', '#c084fc'];

  function injectStyles() {
    if (document.getElementById('dcm-styles')) return;
    var css =
      /* میله افقی — رشد از صفر */
      '#dash-charts .dcm-bar-track{height:10px;border-radius:999px;background:rgba(148,163,184,0.12);overflow:hidden}' +
      '#dash-charts .dcm-bar-fill{height:100%;border-radius:999px;width:0!important;transition:width 1.1s cubic-bezier(.22,1,.36,1);box-shadow:0 0 12px currentColor}' +
      '#dash-charts .dcm-bar-fill.dcm-on{width:var(--dcm-w)!important}' +
      /* کارت ناحیه‌ای */
      '#dash-charts .dcm-area-host{position:relative;min-height:200px}' +
      '#dash-charts .dcm-svg{width:100%;height:200px;display:block;filter:drop-shadow(0 4px 18px rgba(34,211,238,0.1))}' +
      '#dash-charts .dcm-area{opacity:0;animation:dcmAreaIn .8s ease forwards}' +
      '#dash-charts .dcm-line{stroke-dasharray:2000;stroke-dashoffset:2000;animation:dcmDraw 1.4s ease forwards}' +
      '#dash-charts .dcm-dot{opacity:0;animation:dcmDot .35s ease forwards}' +
      '#dash-charts .dcm-pulse{animation:dcmPulse 2.2s ease-out infinite}' +
      '#dash-charts .dcm-axis{fill:#64748b;font-size:9px}' +
      '@keyframes dcmDraw{to{stroke-dashoffset:0}}' +
      '@keyframes dcmAreaIn{to{opacity:1}}' +
      '@keyframes dcmDot{from{opacity:0}to{opacity:1}}' +
      '@keyframes dcmPulse{0%{opacity:.85}65%{opacity:0}100%{opacity:0}}' +
      /* میله عمودی روند */
      '#dash-charts .dcm-vbars{display:flex;align-items:flex-end;gap:6px;height:170px;padding-top:8px;overflow-x:auto}' +
      '#dash-charts .dcm-vcol{flex:1;min-width:28px;max-width:48px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}' +
      '#dash-charts .dcm-vtrack{width:100%;flex:1;display:flex;align-items:flex-end;background:rgba(148,163,184,0.08);border-radius:8px 8px 3px 3px}' +
      '#dash-charts .dcm-vfill{width:100%;border-radius:8px 8px 3px 3px;min-height:3px;height:0;transition:height 1s cubic-bezier(.22,1,.36,1);box-shadow:0 0 14px var(--dcm-glow)}' +
      '#dash-charts .dcm-vfill.dcm-on{height:var(--dcm-h)!important}' +
      '#dash-charts .dcm-vlbl{font-size:9px;color:#64748b;margin-top:4px;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#dash-charts .dcm-vval{font-size:9px;color:#94a3b8;margin-bottom:3px;opacity:0;transition:opacity .2s}' +
      '#dash-charts .dcm-vcol:hover .dcm-vval{opacity:1}' +
      '#dash-charts .dcm-badge{font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(34,211,238,0.12);color:#67e8f9;margin-right:6px}';
    var s = document.createElement('style');
    s.id = 'dcm-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function fmtNum(n) {
    if (n == null || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  /* ——— خواندن آیتم‌های میله افقی از کارت ——— */
  function readHorizontalBarItems(card) {
    var items = [];
    card.querySelectorAll('.mb-2\\.5, .mb-2, [class*="mb-2"]').forEach(function (row) {
      var spans = row.querySelectorAll('span');
      if (spans.length < 2) return;
      var label = (spans[0].textContent || '').trim();
      var valRaw = (spans[1].textContent || '').replace(/[^\d.-]/g, '');
      var val = parseFloat(valRaw);
      if (!label || isNaN(val)) return;
      var bar = row.querySelector('[style*="width"]');
      var color = '#34d399';
      if (bar) {
        var bg = bar.style.background || bar.style.backgroundColor || '';
        if (bg) color = bg;
      }
      items.push({ label: label, value: val, color: color });
    });
    return items;
  }

  /* ——— ارتقای میله‌های افقی به رشد انیمیشنی ——— */
  function enhanceHorizontalBars(root) {
    root.querySelectorAll('.h-2.rounded-full, .h-2').forEach(function (track) {
      if (track.dataset.dcmBar) return;
      track.dataset.dcmBar = '1';
      track.classList.add('dcm-bar-track');
      var fill = track.querySelector('div');
      if (!fill) return;
      var w = fill.style.width || '0%';
      fill.classList.add('dcm-bar-fill');
      fill.style.setProperty('--dcm-w', w);
      fill.style.width = '0';
      fill.style.color = fill.style.background || fill.style.backgroundColor || '#34d399';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fill.classList.add('dcm-on');
        });
      });
    });
  }

  /* ——— ساخت SVG ناحیه‌ای از لیست آیتم ——— */
  function buildAreaSvg(items) {
    if (!items.length) return '<p class="text-slate-500 text-sm">داده‌ای نیست</p>';
    var w = 480;
    var h = 190;
    var padL = 6;
    var padR = 6;
    var padT = 14;
    var padB = 26;
    var vals = items.map(function (it) { return Number(it.value) || 0; });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    if (min === max) { min = 0; max = max || 1; }
    if (min > 0) min = 0; // پایه صفر برای خوانایی داشبورد
    var span = max - min || 1;
    var n = items.length;
    var pts = items.map(function (it, i) {
      var x = padL + (n === 1 ? (w - padL - padR) / 2 : (i / (n - 1)) * (w - padL - padR));
      var y = padT + (1 - (Number(it.value) - min) / span) * (h - padT - padB);
      return { x: x, y: y, it: it };
    });
    // smooth-ish polyline
    var line = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');
    var area = line + ' L' + pts[pts.length - 1].x.toFixed(1) + ',' + (h - padB) + ' L' + pts[0].x.toFixed(1) + ',' + (h - padB) + ' Z';
    var last = pts[pts.length - 1];
    var uid = 'dcm' + Date.now() + Math.floor(Math.random() * 999);
    var dots = pts.map(function (p, i) {
      var col = p.it.color || COLORS[i % COLORS.length];
      return '<circle class="dcm-dot" style="animation-delay:' + (0.5 + i * 0.05).toFixed(2) + 's" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.5" fill="' + col + '" stroke="rgba(15,23,42,0.85)" stroke-width="1.5"><title>' + esc(p.it.label) + ' — ' + fmtNum(p.it.value) + '</title></circle>';
    }).join('');
    var labels = pts.filter(function (_, i) {
      return n <= 7 || i === 0 || i === n - 1 || i % Math.ceil(n / 5) === 0;
    }).map(function (p) {
      var lbl = String(p.it.label);
      if (lbl.length > 8) lbl = lbl.slice(0, 7) + '…';
      return '<text x="' + p.x.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" class="dcm-axis">' + esc(lbl) + '</text>';
    }).join('');
    return (
      '<div class="dcm-area-host">' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" class="dcm-svg" preserveAspectRatio="none">' +
      '<defs>' +
      '<linearGradient id="' + uid + 'F" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#22d3ee" stop-opacity="0.4"/>' +
      '<stop offset="60%" stop-color="#a78bfa" stop-opacity="0.1"/>' +
      '<stop offset="100%" stop-color="#34d399" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid + 'S" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#34d399"/><stop offset="50%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a78bfa"/>' +
      '</linearGradient>' +
      '<filter id="' + uid + 'G"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>' +
      '<path class="dcm-area" d="' + area + '" fill="url(#' + uid + 'F)"/>' +
      '<path class="dcm-line" d="' + line + '" fill="none" stroke="url(#' + uid + 'S)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#' + uid + 'G)"/>' +
      dots + labels +
      '<circle class="dcm-pulse" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="7" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
      '</svg></div>'
    );
  }

  /* ——— میله عمودی رشدکننده ——— */
  function buildVerticalBars(items) {
    if (!items.length) return '<p class="text-slate-500 text-sm">داده‌ای نیست</p>';
    var max = Math.max.apply(null, items.map(function (it) { return Number(it.value) || 0; })) || 1;
    var cols = items.map(function (it, i) {
      var pct = Math.max(4, Math.round(((Number(it.value) || 0) / max) * 100));
      var col = it.color || COLORS[i % COLORS.length];
      var delay = (i * 0.07).toFixed(2);
      return (
        '<div class="dcm-vcol" title="' + esc(it.label) + ' — ' + fmtNum(it.value) + '">' +
        '<div class="dcm-vval">' + fmtNum(it.value) + '</div>' +
        '<div class="dcm-vtrack"><div class="dcm-vfill" style="--dcm-h:' + pct + '%;--dcm-glow:' + col + '66;background:linear-gradient(180deg,' + col + ',' + col + '99);transition-delay:' + delay + 's"></div></div>' +
        '<div class="dcm-vlbl">' + esc(it.label.length > 10 ? it.label.slice(0, 9) + '…' : it.label) + '</div></div>'
      );
    }).join('');
    return '<div class="dcm-vbars">' + cols + '</div>';
  }

  function cardTitle(card) {
    var h = card.querySelector('h2');
    return h ? (h.textContent || '').trim() : '';
  }

  /* تبدیل کارت روند (📈) به ناحیه‌ای + کارت اول تولید به میله عمودی */
  function diversifyCards(root) {
    var cards = root.querySelectorAll('.glass-card, .te-fx-card');
    cards.forEach(function (card, idx) {
      if (card.dataset.dcmDone) return;
      var title = cardTitle(card);
      if (!title) return;

      // روند زمانی → ناحیه‌ای زنده‌کش
      if (/تعداد تولید\s*—|روند|سالانه|ماهانه|روزانه/.test(title) || (title.indexOf('📈') !== -1)) {
        var items = readHorizontalBarItems(card);
        if (items.length >= 2) {
          card.dataset.dcmDone = '1';
          var sub = card.querySelector('p.text-xs, p.text-slate-400');
          var subHtml = sub ? sub.outerHTML : '';
          card.innerHTML =
            '<div class="flex items-center gap-2 mb-0.5"><h2 class="font-semibold">' + esc(title) + '</h2>' +
            '<span class="dcm-badge">ناحیه‌ای زنده</span></div>' +
            subHtml +
            buildAreaSvg(items);
          return;
        }
      }

      // تعداد تولید محصولات (اولین میله) → میله عمودی رشدکننده
      if (/تعداد تولید محصولات|🍢/.test(title) && !card.dataset.dcmDone) {
        var items2 = readHorizontalBarItems(card);
        if (items2.length >= 2) {
          card.dataset.dcmDone = '1';
          var sub2 = card.querySelector('p.text-xs, p.text-slate-400');
          var subHtml2 = sub2 ? sub2.outerHTML : '';
          card.innerHTML =
            '<div class="flex items-center gap-2 mb-0.5"><h2 class="font-semibold">' + esc(title) + '</h2>' +
            '<span class="dcm-badge">میله‌ای</span></div>' +
            subHtml2 +
            buildVerticalBars(items2.slice(0, 12));
          // trigger grow
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              card.querySelectorAll('.dcm-vfill').forEach(function (el) {
                el.classList.add('dcm-on');
              });
            });
          });
          return;
        }
      }
    });

    // بقیه میله‌های افقی (اگر موند) رشد انیمیشنی
    enhanceHorizontalBars(root);
  }

  function runEnhance() {
    injectStyles();
    var root = document.getElementById('dash-charts') || document.getElementById('dash-charts-wrap');
    if (!root) return;
    // کمی صبر تا HTML اصلی جا بیفتد
    diversifyCards(root);
    // دوباره بعد از charts-fx
    setTimeout(function () {
      var r = document.getElementById('dash-charts') || document.getElementById('dash-charts-wrap');
      if (r) diversifyCards(r);
    }, 200);
    setTimeout(function () {
      var r = document.getElementById('dash-charts') || document.getElementById('dash-charts-wrap');
      if (r) {
        // برای کارت‌های جدید بعد از ورق دوره، dcmDone را روی کارت‌های تازه ریست نکن — فقط بدون علامت
        diversifyCards(r);
        r.querySelectorAll('.dcm-vfill:not(.dcm-on)').forEach(function (el) {
          el.classList.add('dcm-on');
        });
        r.querySelectorAll('.dcm-bar-fill:not(.dcm-on)').forEach(function (el) {
          el.classList.add('dcm-on');
        });
      }
    }, 600);
  }

  // هوک ورق خودکار نمودار
  function patchApply() {
    if (typeof Pages === 'undefined') return false;
    if (Pages.applyDashChartPeriod && !Pages.applyDashChartPeriod.__dcm) {
      var prev = Pages.applyDashChartPeriod;
      Pages.applyDashChartPeriod = function () {
        var r = prev.apply(this, arguments);
        setTimeout(runEnhance, 60);
        setTimeout(runEnhance, 350);
        return r;
      };
      Pages.applyDashChartPeriod.__dcm = true;
    }
    if (typeof Pages.dashboard === 'function' && !Pages.dashboard.__dcm) {
      var prevD = Pages.dashboard;
      Pages.dashboard = async function () {
        var html = await prevD.apply(this, arguments);
        setTimeout(runEnhance, 100);
        setTimeout(runEnhance, 500);
        return html;
      };
      Pages.dashboard.__dcm = true;
    }
    return true;
  }

  function boot() {
    injectStyles();
    patchApply();
    var n = 0;
    var t = setInterval(function () {
      n++;
      patchApply();
      if (document.getElementById('dash-charts') || document.getElementById('dash-charts-wrap')) {
        runEnhance();
      }
      if (n > 50) clearInterval(t);
    }, 200);

    // مشاهده تعویض صفحه
    var obs = new MutationObserver(function () {
      if (document.getElementById('dash-charts') || document.getElementById('dash-charts-wrap')) {
        setTimeout(runEnhance, 80);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[dashboard-charts-mix] area + bars + donuts ready');
})();
