/**
 * dashboard-charts-mix.js v3
 * — میله عمودی زنده + ناحیه‌ای زنده‌کش + سطح سه‌بعدی ایزومتریک (تولید × زمان)
 * — دونات‌ها دست‌نخورده
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
      '#dash-charts .dcm-badge{font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(34,211,238,0.15);color:#67e8f9;margin-right:6px;white-space:nowrap}' +
      /* ——— سطح سه‌بعدی ایزومتریک ——— */
      '#dash-charts .dcm-iso-wrap{position:relative;height:260px;overflow:hidden;border-radius:1rem;' +
      'background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(34,211,238,0.08),transparent 70%);' +
      'perspective:900px}' +
      '#dash-charts .dcm-iso-stage{position:absolute;left:50%;bottom:18px;width:0;height:0;' +
      'transform-style:preserve-3d;transform:rotateX(58deg) rotateZ(-38deg);' +
      'animation:dcmIsoFloat 7s ease-in-out infinite}' +
      '@keyframes dcmIsoFloat{0%,100%{transform:rotateX(58deg) rotateZ(-38deg) translateY(0)}' +
      '50%{transform:rotateX(56deg) rotateZ(-36deg) translateY(-4px)}}' +
      '#dash-charts .dcm-iso-cell{position:absolute;transform-style:preserve-3d;width:22px;height:22px}' +
      '#dash-charts .dcm-iso-bar{position:absolute;left:0;bottom:0;width:18px;transform-style:preserve-3d;' +
      'transform-origin:bottom center;height:0;transition:height 1.1s cubic-bezier(.22,1,.36,1)}' +
      '#dash-charts .dcm-iso-bar.dcm-on{height:var(--iso-h)!important}' +
      '#dash-charts .dcm-iso-top{position:absolute;left:0;right:0;height:10px;top:-5px;' +
      'background:var(--iso-top);transform:rotateX(90deg);transform-origin:bottom;border-radius:2px;' +
      'box-shadow:0 0 10px var(--iso-glow)}' +
      '#dash-charts .dcm-iso-front{position:absolute;left:0;bottom:0;width:100%;height:100%;' +
      'background:linear-gradient(90deg,var(--iso-front),var(--iso-front2));border-radius:0 0 2px 2px}' +
      '#dash-charts .dcm-iso-side{position:absolute;right:-7px;bottom:0;width:14px;height:100%;' +
      'background:linear-gradient(90deg,var(--iso-side),var(--iso-side2));transform:skewY(-45deg);transform-origin:bottom left;opacity:.9}' +
      '#dash-charts .dcm-iso-legend{display:flex;flex-wrap:wrap;gap:6px 10px;margin-top:8px;justify-content:center}' +
      '#dash-charts .dcm-iso-leg-item{display:flex;align-items:center;gap:4px;font-size:10px;color:#94a3b8}' +
      '#dash-charts .dcm-iso-leg-dot{width:8px;height:8px;border-radius:2px}' +
      '#dash-charts .dcm-iso-hint{font-size:10px;color:#64748b;text-align:center;margin-top:4px}' +
      '#dash-charts .dcm-iso-live{display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399;' +
      'box-shadow:0 0 8px #34d399;animation:dcmLive 1.3s ease-in-out infinite;margin-left:4px}' +
      '@keyframes dcmLive{0%,100%{opacity:1}50%{opacity:.35}}';
    var s = document.createElement('style');
    s.id = 'dcm-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function faToEn(str) {
    return String(str || '')
      .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/,/g, '').replace(/٫/g, '.').replace(/[^\d.-]/g, '');
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
  function hexShift(hex, amt) {
    hex = String(hex || '#34d399').replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length !== 6) return '#' + hex;
    var n = parseInt(hex, 16);
    var r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt));
    var g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
    var b = Math.min(255, Math.max(0, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function readBarItems(card) {
    var items = [];
    card.querySelectorAll('div').forEach(function (row) {
      var track = row.querySelector('.h-2');
      if (!track) return;
      var fill = track.querySelector('div');
      var spans = row.querySelectorAll('span');
      if (spans.length < 2) return;
      var label = (spans[0].textContent || '').trim();
      var val = parseFloat(faToEn(spans[spans.length - 1].textContent));
      if (!label || isNaN(val)) return;
      if (items.some(function (x) { return x.label === label && x.value === val; })) return;
      var color = '#34d399';
      if (fill) {
        var st = fill.getAttribute('style') || '';
        var m = st.match(/background\s*:\s*([^;]+)/i);
        if (m) color = m[1].trim();
      }
      items.push({ label: label, value: val, color: color });
    });
    return items;
  }

  function detectMode() {
    var hint = document.getElementById('chart-auto-hint');
    var t = hint ? hint.textContent || '' : '';
    if (/روز/.test(t)) return 'day';
    if (/ماه/.test(t)) return 'month';
    return 'year';
  }

  function itemsFromRaw() {
    var raw = window.__dashRaw;
    if (!raw) return { products: [], trend: [], matrix: null, mode: 'year' };
    var mode = detectMode();
    var today = raw.today || '';
    var prods = raw.productions || [];
    function inP(d) {
      if (!d) return false;
      var s = String(d);
      if (mode === 'day') return s === today;
      if (mode === 'month') return s.slice(0, 7) === String(today).slice(0, 7);
      return s.slice(0, 4) === String(today).slice(0, 4);
    }
    var list = prods.filter(function (p) { return inP(p.date); });
    if (!list.length) list = prods;

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

    var bucket = {};
    list.forEach(function (p) {
      var d = String(p.date || '');
      var key = mode === 'day' ? d : mode === 'month' ? d.slice(0, 7) : d.slice(0, 4);
      if (!key) return;
      bucket[key] = (bucket[key] || 0) + Number(p.quantity || 0);
    });
    var trend = Object.keys(bucket).sort().map(function (k, i) {
      return { label: k, value: bucket[k], color: COLORS[i % COLORS.length] };
    });

    // ماتریس برای سطح سه‌بعدی: top محصولات × آخرین بازه‌های زمانی
    var topNames = products.slice(0, 6).map(function (p) { return p.label; });
    var timeKeys = Object.keys(bucket).sort();
    // حداکثر ۸ ستون زمان
    if (timeKeys.length > 8) timeKeys = timeKeys.slice(-8);
    // اگر فقط یک کلید زمان داریم، از روزهای واقعی تولید پر کنیم
    if (timeKeys.length <= 1 && list.length) {
      var dayMap = {};
      list.forEach(function (p) {
        var d = String(p.date || '');
        if (d) dayMap[d] = true;
      });
      timeKeys = Object.keys(dayMap).sort();
      if (timeKeys.length > 8) timeKeys = timeKeys.slice(-8);
    }
    var matrix = null;
    if (topNames.length >= 2 && timeKeys.length >= 2) {
      var grid = {};
      var maxZ = 1;
      list.forEach(function (p) {
        var name = p.product_name || 'نامشخص';
        if (topNames.indexOf(name) < 0) return;
        var d = String(p.date || '');
        var tk =
          timeKeys.indexOf(d) >= 0
            ? d
            : timeKeys.indexOf(d.slice(0, 7)) >= 0
              ? d.slice(0, 7)
              : timeKeys.indexOf(d.slice(0, 4)) >= 0
                ? d.slice(0, 4)
                : null;
        if (!tk) return;
        var k = name + '||' + tk;
        grid[k] = (grid[k] || 0) + Number(p.quantity || 0);
        if (grid[k] > maxZ) maxZ = grid[k];
      });
      matrix = { products: topNames, times: timeKeys, grid: grid, maxZ: maxZ };
    }

    return { products: products, trend: trend, matrix: matrix, mode: mode };
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
      fill.classList.add('dcm-bar-fill');
      fill.style.setProperty('--dcm-w', w);
      fill.style.color = fill.style.background || '#34d399';
      fill.style.width = '0';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fill.classList.add('dcm-on'); });
      });
    });
  }

  function buildAreaSvg(items) {
    if (!items.length) return '<p class="text-slate-500 text-sm p-4">داده‌ای نیست</p>';
    if (items.length === 1) {
      items = [{ label: items[0].label, value: 0, color: items[0].color }, items[0]];
    }
    var w = 480, h = 190, padL = 8, padR = 8, padT = 14, padB = 28;
    var vals = items.map(function (it) { return Number(it.value) || 0; });
    var max = Math.max.apply(null, vals) || 1;
    var n = items.length;
    var pts = items.map(function (it, i) {
      var x = padL + (i / (n - 1)) * (w - padL - padR);
      var y = padT + (1 - (Number(it.value) || 0) / max) * (h - padT - padB);
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

  /** سطح سه‌بعدی ایزومتریک زنده: محصول × زمان */
  function buildIsoSurface(matrix) {
    if (!matrix || !matrix.products || matrix.products.length < 2 || matrix.times.length < 2) {
      return null;
    }
    var prods = matrix.products;
    var times = matrix.times;
    var maxZ = matrix.maxZ || 1;
    var cell = 26;
    var maxH = 110;
    var html = '<div class="dcm-iso-wrap"><div class="dcm-iso-stage">';
    // رسم از عقب به جلو برای عمق
    for (var ti = 0; ti < times.length; ti++) {
      for (var pi = 0; pi < prods.length; pi++) {
        var val = matrix.grid[prods[pi] + '||' + times[ti]] || 0;
        var h = Math.max(val > 0 ? 8 : 0, Math.round((val / maxZ) * maxH));
        var col = COLORS[pi % COLORS.length];
        var x = (pi - ti) * cell;
        var y = (pi + ti) * (cell * 0.52);
        var delay = ((pi + ti) * 0.05).toFixed(2);
        html +=
          '<div class="dcm-iso-cell" style="transform:translate(' + x + 'px,' + (-y) + 'px)">' +
          '<div class="dcm-iso-bar" style="--iso-h:' + h + 'px;transition-delay:' + delay + 's;' +
          '--iso-top:' + hexShift(col, 40) + ';--iso-front:' + col + ';--iso-front2:' + hexShift(col, -20) + ';' +
          '--iso-side:' + hexShift(col, -35) + ';--iso-side2:' + hexShift(col, -55) + ';' +
          '--iso-glow:' + col + '55" title="' + esc(prods[pi]) + ' · ' + esc(times[ti]) + ' · ' + fmtNum(val) + '">' +
          '<div class="dcm-iso-front"></div><div class="dcm-iso-side"></div><div class="dcm-iso-top"></div>' +
          '</div></div>';
      }
    }
    html += '</div></div>';
    html += '<div class="dcm-iso-legend">';
    prods.forEach(function (p, i) {
      html +=
        '<span class="dcm-iso-leg-item"><span class="dcm-iso-leg-dot" style="background:' +
        COLORS[i % COLORS.length] +
        '"></span>' +
        esc(p.length > 14 ? p.slice(0, 13) + '…' : p) +
        '</span>';
    });
    html += '</div>';
    html +=
      '<p class="dcm-iso-hint"><span class="dcm-iso-live"></span>سطح سه‌بعدی زنده · محور عمق: زمان · رنگ: محصول · ارتفاع: تعداد تولید</p>';
    return html;
  }

  function replaceCard(card, title, badge, bodyHtml) {
    var sub = card.querySelector('p.text-xs, p.text-slate-400');
    var subHtml = sub ? '<p class="text-xs text-slate-400 mb-3">' + esc(sub.textContent || '') + '</p>' : '';
    card.dataset.dcmDone = '1';
    card.innerHTML =
      '<div class="flex flex-wrap items-center gap-2 mb-1">' +
      '<h2 class="font-semibold">' +
      esc(title) +
      '</h2>' +
      '<span class="dcm-badge">' +
      badge +
      '</span></div>' +
      subHtml +
      bodyHtml;
  }

  function diversifyCards(root) {
    if (!root) return;
    var rawPack = itemsFromRaw();
    var cards = root.querySelectorAll('.glass-card');
    var isoPlaced = false;

    cards.forEach(function (card) {
      if (card.dataset.dcmDone === '1') return;
      var title = cardTitle(card);
      if (!title) return;

      // سطح سه‌بعدی را روی کارت روند بگذار (بهترین جا)
      if (!isoPlaced && (/📈|تعداد تولید\s*—/.test(title))) {
        var iso = buildIsoSurface(rawPack.matrix);
        if (iso) {
          replaceCard(card, '🏔️ سطح تولید × زمان', 'سه‌بعدی زنده', iso);
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              card.querySelectorAll('.dcm-iso-bar').forEach(function (el) {
                el.classList.add('dcm-on');
              });
            });
          });
          isoPlaced = true;
          return;
        }
        // fallback ناحیه‌ای
        var trend = rawPack.trend.length ? rawPack.trend : readBarItems(card);
        if (trend.length) {
          replaceCard(card, title, 'ناحیه‌ای زنده', buildAreaSvg(trend));
          return;
        }
      }

      if (/🍢|تعداد تولید محصولات/.test(title)) {
        var items = rawPack.products.length ? rawPack.products : readBarItems(card);
        if (items.length) {
          replaceCard(card, title, 'میله‌ای زنده', buildVerticalBars(items));
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

    // اگر iso روی روند نرفت و ماتریس داریم، یک کارت اضافه کن
    if (!isoPlaced && rawPack.matrix) {
      var iso2 = buildIsoSurface(rawPack.matrix);
      if (iso2) {
        var extra = document.createElement('div');
        extra.className = 'glass-card rounded-2xl p-5 lg:col-span-2';
        extra.dataset.dcmDone = '1';
        extra.innerHTML =
          '<div class="flex flex-wrap items-center gap-2 mb-1">' +
          '<h2 class="font-semibold">🏔️ سطح تولید × زمان</h2>' +
          '<span class="dcm-badge">سه‌بعدی زنده</span></div>' +
          '<p class="text-xs text-slate-400 mb-3">ارتفاع = تعداد · رنگ = محصول · عمق = زمان</p>' +
          iso2;
        root.appendChild(extra);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            extra.querySelectorAll('.dcm-iso-bar').forEach(function (el) {
              el.classList.add('dcm-on');
            });
          });
        });
      }
    }

    enhanceHorizontalBars(root);
  }

  function runEnhance() {
    injectStyles();
    var root = document.getElementById('dash-charts');
    if (!root) return;
    root.querySelectorAll('.glass-card').forEach(function (c) {
      if (!c.querySelector('.dcm-area-host, .dcm-vbars, .dcm-iso-wrap')) {
        delete c.dataset.dcmDone;
      }
    });
    // کارت iso اضافه‌شده قبلی را پاک کن تا تکراری نشود
    root.querySelectorAll('.glass-card').forEach(function (c) {
      if (c.dataset.dcmDone === '1' && /سطح تولید/.test(cardTitle(c))) {
        // نگه دار مگر اینکه بعد از تعویض دوره خالی شده باشد
      }
    });
    diversifyCards(root);
  }

  function patchHooks() {
    if (typeof Pages === 'undefined') return false;
    if (Pages.applyDashChartPeriod && !Pages.applyDashChartPeriod.__dcm3) {
      var prev = Pages.applyDashChartPeriod;
      Pages.applyDashChartPeriod = function () {
        var r = prev.apply(this, arguments);
        setTimeout(runEnhance, 50);
        setTimeout(runEnhance, 350);
        setTimeout(runEnhance, 800);
        return r;
      };
      Pages.applyDashChartPeriod.__dcm3 = true;
    }
    if (typeof Pages.dashboard === 'function' && !Pages.dashboard.__dcm3) {
      var prevD = Pages.dashboard;
      Pages.dashboard = async function () {
        var html = await prevD.apply(this, arguments);
        setTimeout(runEnhance, 80);
        setTimeout(runEnhance, 450);
        setTimeout(runEnhance, 1000);
        return html;
      };
      Pages.dashboard.__dcm3 = true;
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
      if (document.getElementById('dash-charts')) setTimeout(runEnhance, 120);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[dashboard-charts-mix] v3 iso-surface ready');
})();
