/**
 * dashboard-charts-mix.js v2
 * تنوع داشبورد: ناحیه‌ای زنده‌کش + میله عمودی رشدکننده + دونات
 * فیکس: اعداد فارسی + ساختار واقعی کارت‌ها + داده از __dashRaw
 */
(function () {
  'use strict';

  var COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80', '#2dd4bf', '#c084fc'];

  function injectStyles() {
    if (document.getElementById('dcm-styles')) return;
    var css =
      '#dash-charts .dcm-bar-track{height:10px;border-radius:999px;background:rgba(148,163,184,0.12);overflow:hidden}' +
      '#dash-charts .dcm-bar-fill{height:100%;border-radius:999px;width:0!important;transition:width 1.1s cubic-bezier(.22,1,.36,1);box-shadow:0 0 12px currentColor}' +
      '#dash-charts .dcm-bar-fill.dcm-on{width:var(--dcm-w)!important}' +
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
      '#dash-charts .dcm-vbars{display:flex;align-items:flex-end;gap:6px;height:170px;padding-top:8px;overflow-x:auto}' +
      '#dash-charts .dcm-vcol{flex:1;min-width:28px;max-width:48px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}' +
      '#dash-charts .dcm-vtrack{width:100%;flex:1;display:flex;align-items:flex-end;background:rgba(148,163,184,0.08);border-radius:8px 8px 3px 3px}' +
      '#dash-charts .dcm-vfill{width:100%;border-radius:8px 8px 3px 3px;min-height:3px;height:0;transition:height 1s cubic-bezier(.22,1,.36,1);box-shadow:0 0 14px var(--dcm-glow)}' +
      '#dash-charts .dcm-vfill.dcm-on{height:var(--dcm-h)!important}' +
      '#dash-charts .dcm-vlbl{font-size:9px;color:#64748b;margin-top:4px;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#dash-charts .dcm-vval{font-size:9px;color:#94a3b8;margin-bottom:3px;opacity:0;transition:opacity .2s}' +
      '#dash-charts .dcm-vcol:hover .dcm-vval{opacity:1}' +
      '#dash-charts .dcm-badge{font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(34,211,238,0.15);color:#67e8f9;margin-right:6px;white-space:nowrap}';
    var s = document.createElement('style');
    s.id = 'dcm-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function faToEn(str) {
    return String(str || '')
      .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/,/g, '')
      .replace(/٫/g, '.')
      .replace(/[^\d.-]/g, '');
  }

  function fmtNum(n) {
    if (n == null || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function cardTitle(card) {
    var h = card.querySelector('h2');
    return h ? (h.textContent || '').trim() : '';
  }

  /** خواندن ردیف‌های میله از DOM */
  function readBarItems(card) {
    var items = [];
    // هر ردیفی که flex + دو span + نوار h-2 دارد
    card.querySelectorAll('div').forEach(function (row) {
      var track = row.querySelector('.h-2, .h-2\\.5, [class*="h-2"]');
      if (!track) return;
      var fill = track.querySelector('div[style*="width"], div.h-full, div');
      var labelEl = row.querySelector('.truncate, .text-slate-300, span');
      var spans = row.querySelectorAll('span');
      if (spans.length < 2 && !labelEl) return;
      var label = (spans[0] ? spans[0].textContent : labelEl ? labelEl.textContent : '').trim();
      var valStr = spans.length >= 2 ? spans[spans.length - 1].textContent : '';
      var val = parseFloat(faToEn(valStr));
      if (!label || isNaN(val)) return;
      // جلوگیری از تکرار والد/فرزند
      if (items.some(function (x) { return x.label === label && x.value === val; })) return;
      var color = '#34d399';
      if (fill) {
        var bg = fill.getAttribute('style') || '';
        var m = bg.match(/background\s*:\s*([^;]+)/i);
        if (m) color = m[1].trim();
        else if (fill.style.background) color = fill.style.background;
      }
      items.push({ label: label, value: val, color: color });
    });
    return items;
  }

  /** ساخت از __dashRaw برای روند و محصولات */
  function itemsFromRaw() {
    var raw = window.__dashRaw;
    if (!raw) return { products: [], trend: [] };
    var COLORS = raw.COLORS || COLORS;
    var prods = raw.productions || [];
    // فعلاً همه تولیدها (فیلتر دوره را از چیپ فعال می‌گیریم)
    var mode = 'year';
    var hint = document.getElementById('chart-auto-hint');
    var chipOn = document.querySelector('#dash-charts-wrap button.ring-1, [data-cperiod].ring-1, button.bg-brand-500');
    // تشخیص از متن hint
    var hintText = hint ? hint.textContent || '' : '';
    if (/روز/.test(hintText)) mode = 'day';
    else if (/ماه/.test(hintText)) mode = 'month';
    else mode = 'year';

    var today = raw.today || '';
    function inP(d) {
      if (!d) return false;
      var s = String(d);
      if (mode === 'day') return s === today;
      if (mode === 'month') return s.slice(0, 7) === String(today).slice(0, 7);
      return s.slice(0, 4) === String(today).slice(0, 4);
    }
    var list = prods.filter(function (p) { return inP(p.date); });
    if (!list.length) list = prods; // fallback

    var prodQty = {};
    list.forEach(function (p) {
      var n = p.product_name || 'نامشخص';
      prodQty[n] = (prodQty[n] || 0) + Number(p.quantity || 0);
    });
    var products = Object.entries(prodQty)
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 12)
      .map(function (e, i) {
        return { label: e[0], value: e[1], color: COLORS[i % COLORS.length] };
      });

    // روند بر اساس دوره
    var bucket = {};
    list.forEach(function (p) {
      var d = String(p.date || '');
      var key = mode === 'day' ? d : mode === 'month' ? d.slice(0, 7) : d.slice(0, 4);
      if (!key) return;
      bucket[key] = (bucket[key] || 0) + Number(p.quantity || 0);
    });
    var trend = Object.keys(bucket)
      .sort()
      .map(function (k, i) {
        return { label: k, value: bucket[k], color: COLORS[i % COLORS.length] };
      });

    return { products: products, trend: trend, mode: mode };
  }

  function enhanceHorizontalBars(root) {
    root.querySelectorAll('.h-2').forEach(function (track) {
      if (track.dataset.dcmBar) return;
      track.dataset.dcmBar = '1';
      track.classList.add('dcm-bar-track');
      var fill = track.querySelector('div');
      if (!fill) return;
      var w = '0%';
      var st = fill.getAttribute('style') || '';
      var m = st.match(/width\s*:\s*([^;]+)/i);
      if (m) w = m[1].trim();
      else if (fill.style.width) w = fill.style.width;
      fill.classList.add('dcm-bar-fill');
      fill.style.setProperty('--dcm-w', w);
      var bg = fill.style.background || fill.style.backgroundColor || '#34d399';
      fill.style.color = bg;
      fill.style.width = '0';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fill.classList.add('dcm-on'); });
      });
    });
  }

  function buildAreaSvg(items) {
    if (!items.length) return '<p class="text-slate-500 text-sm p-4">داده‌ای نیست</p>';
    // اگر فقط یک نقطه است، دو نقطه بساز تا خط دیده شود
    if (items.length === 1) {
      items = [
        { label: items[0].label, value: 0, color: items[0].color },
        items[0]
      ];
    }
    var w = 480, h = 190, padL = 8, padR = 8, padT = 14, padB = 28;
    var vals = items.map(function (it) { return Number(it.value) || 0; });
    var min = 0;
    var max = Math.max.apply(null, vals) || 1;
    var span = max - min || 1;
    var n = items.length;
    var pts = items.map(function (it, i) {
      var x = padL + (i / (n - 1)) * (w - padL - padR);
      var y = padT + (1 - (Number(it.value) - min) / span) * (h - padT - padB);
      return { x: x, y: y, it: it };
    });
    var line = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');
    var area = line + ' L' + pts[pts.length - 1].x.toFixed(1) + ',' + (h - padB) + ' L' + pts[0].x.toFixed(1) + ',' + (h - padB) + ' Z';
    var last = pts[pts.length - 1];
    var uid = 'dcm' + Date.now() + Math.floor(Math.random() * 9999);
    var dots = pts.map(function (p, i) {
      var col = p.it.color || COLORS[i % COLORS.length];
      return '<circle class="dcm-dot" style="animation-delay:' + (0.45 + i * 0.06).toFixed(2) + 's" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="' + col + '" stroke="rgba(15,23,42,0.85)" stroke-width="1.5"><title>' + esc(p.it.label) + ' — ' + fmtNum(p.it.value) + '</title></circle>';
    }).join('');
    var labels = pts.map(function (p) {
      var lbl = String(p.it.label);
      if (lbl.length > 10) lbl = lbl.slice(0, 9) + '…';
      return '<text x="' + p.x.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" class="dcm-axis">' + esc(lbl) + '</text>';
    }).join('');
    return (
      '<div class="dcm-area-host"><svg viewBox="0 0 ' + w + ' ' + h + '" class="dcm-svg">' +
      '<defs><linearGradient id="' + uid + 'F" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#22d3ee" stop-opacity="0.42"/>' +
      '<stop offset="55%" stop-color="#a78bfa" stop-opacity="0.12"/>' +
      '<stop offset="100%" stop-color="#34d399" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + uid + 'S" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#34d399"/><stop offset="50%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient>' +
      '<filter id="' + uid + 'G"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<path class="dcm-area" d="' + area + '" fill="url(#' + uid + 'F)"/>' +
      '<path class="dcm-line" d="' + line + '" fill="none" stroke="url(#' + uid + 'S)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#' + uid + 'G)"/>' +
      dots + labels +
      '<circle class="dcm-pulse" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="7" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
      '</svg></div>'
    );
  }

  function buildVerticalBars(items) {
    if (!items.length) return '<p class="text-slate-500 text-sm p-4">داده‌ای نیست</p>';
    var max = Math.max.apply(null, items.map(function (it) { return Number(it.value) || 0; })) || 1;
    var cols = items.map(function (it, i) {
      var pct = Math.max(5, Math.round(((Number(it.value) || 0) / max) * 100));
      var col = it.color || COLORS[i % COLORS.length];
      return (
        '<div class="dcm-vcol" title="' + esc(it.label) + ' — ' + fmtNum(it.value) + '">' +
        '<div class="dcm-vval">' + fmtNum(it.value) + '</div>' +
        '<div class="dcm-vtrack"><div class="dcm-vfill" style="--dcm-h:' + pct + '%;--dcm-glow:' + col + '66;background:linear-gradient(180deg,' + col + ',' + col + '99);transition-delay:' + (i * 0.06).toFixed(2) + 's"></div></div>' +
        '<div class="dcm-vlbl">' + esc(it.label.length > 11 ? it.label.slice(0, 10) + '…' : it.label) + '</div></div>'
      );
    }).join('');
    return '<div class="dcm-vbars">' + cols + '</div>';
  }

  function replaceCard(card, title, badge, bodyHtml) {
    var sub = card.querySelector('p.text-xs, p.text-slate-400');
    var subHtml = sub ? '<p class="text-xs text-slate-400 mb-3">' + esc(sub.textContent || '') + '</p>' : '';
    card.dataset.dcmDone = '1';
    card.innerHTML =
      '<div class="flex flex-wrap items-center gap-2 mb-1">' +
      '<h2 class="font-semibold">' + esc(title) + '</h2>' +
      '<span class="dcm-badge">' + badge + '</span></div>' +
      subHtml + bodyHtml;
  }

  function diversifyCards(root) {
    if (!root) return;
    var rawPack = itemsFromRaw();
    var cards = root.querySelectorAll('.glass-card');
    cards.forEach(function (card) {
      if (card.dataset.dcmDone === '1') return;
      var title = cardTitle(card);
      if (!title) return;

      // ۱) تعداد تولید محصولات → میله عمودی
      if (/🍢|تعداد تولید محصولات/.test(title)) {
        var items = rawPack.products.length ? rawPack.products : readBarItems(card);
        if (items.length) {
          replaceCard(card, title, 'میله‌ای زنده', buildVerticalBars(items));
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              card.querySelectorAll('.dcm-vfill').forEach(function (el) { el.classList.add('dcm-on'); });
            });
          });
          return;
        }
      }

      // ۲) روند 📈 → ناحیه‌ای
      if (/📈|تعداد تولید\s*—/.test(title)) {
        var trend = rawPack.trend.length ? rawPack.trend : readBarItems(card);
        if (trend.length) {
          replaceCard(card, title, 'ناحیه‌ای زنده', buildAreaSvg(trend));
          return;
        }
      }
    });

    enhanceHorizontalBars(root);
  }

  function runEnhance() {
    injectStyles();
    var root = document.getElementById('dash-charts');
    if (!root) root = document.getElementById('dash-charts-wrap');
    if (!root) return;
    // ریست علامت روی کارت‌های تازه ساخته‌شده بعد از تعویض دوره
    root.querySelectorAll('.glass-card').forEach(function (c) {
      if (!c.querySelector('.dcm-area-host, .dcm-vbars')) {
        delete c.dataset.dcmDone;
      }
    });
    diversifyCards(root);
  }

  function patchHooks() {
    if (typeof Pages === 'undefined') return false;
    if (Pages.applyDashChartPeriod && !Pages.applyDashChartPeriod.__dcm2) {
      var prev = Pages.applyDashChartPeriod;
      Pages.applyDashChartPeriod = function () {
        var r = prev.apply(this, arguments);
        setTimeout(runEnhance, 50);
        setTimeout(runEnhance, 300);
        setTimeout(runEnhance, 700);
        return r;
      };
      Pages.applyDashChartPeriod.__dcm2 = true;
    }
    if (typeof Pages.dashboard === 'function' && !Pages.dashboard.__dcm2) {
      var prevD = Pages.dashboard;
      Pages.dashboard = async function () {
        var html = await prevD.apply(this, arguments);
        setTimeout(runEnhance, 80);
        setTimeout(runEnhance, 400);
        setTimeout(runEnhance, 900);
        return html;
      };
      Pages.dashboard.__dcm2 = true;
    }
    return true;
  }

  function boot() {
    injectStyles();
    patchHooks();
    var n = 0;
    var t = setInterval(function () {
      n++;
      patchHooks();
      if (document.getElementById('dash-charts')) runEnhance();
      if (n > 60) clearInterval(t);
    }, 250);

    var obs = new MutationObserver(function () {
      if (document.getElementById('dash-charts')) {
        setTimeout(runEnhance, 100);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[dashboard-charts-mix] v2 ready');
})();
