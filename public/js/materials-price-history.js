/**
 * materials-price-history.js — تاریخچه قیمت زنده + چند نوع نمودار با جلوه ویژه
 * هم‌سبک charts-fx / داشبورد (SVG + CSS، بدون کتابخانه خارجی)
 *
 * انواع نمودار:
 *  1) area  — خطی/ناحیه‌ای با گرادیان و رسم متحرک
 *  2) bar   — میله‌ای درخشان با رشد انیمیشنی
 *  3) donut — سهم افزایش / کاهش / ثابت
 *  4) wave  — موج نرم (smooth area)
 */
(function () {
  'use strict';

  var PEAK = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80'];
  var currentType = 'area';
  var currentHistory = [];
  var currentMeta = { name: '', code: '' };
  var liveTimer = null;

  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Math.round(Number(n)).toLocaleString('fa-IR');
  }
  function fmtNum(n) {
    if (n == null || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }
  function pctChange(prev, curr) {
    if (!prev || !curr || prev <= 0) return null;
    return ((curr - prev) / prev) * 100;
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function getPriceHistory(materialName) {
    var entries = [];
    try {
      entries = (await DB.getAll('entries')) || [];
    } catch (e) {
      return [];
    }
    var rows = entries
      .filter(function (e) {
        return (
          e &&
          e.material_name === materialName &&
          e.unit_price != null &&
          e.unit_price !== '' &&
          Number(e.unit_price) > 0 &&
          !e.deleted_at
        );
      })
      .map(function (e) {
        return {
          date: e.date || '',
          price: Number(e.unit_price),
          qty: e.quantity != null ? Number(e.quantity) : null,
          invoice: e.invoice_no || e.invoice || '—',
          id: e.id
        };
      })
      .sort(function (a, b) {
        return String(a.date).localeCompare(String(b.date));
      });
    var byDate = {};
    rows.forEach(function (r) {
      byDate[r.date] = r;
    });
    return Object.keys(byDate)
      .sort()
      .map(function (d) {
        return byDate[d];
      });
  }

  function chartArea(history, smooth) {
    if (!history.length) return emptyState();
    var w = 520;
    var h = 200;
    var padL = 8;
    var padR = 8;
    var padT = 16;
    var padB = 28;
    var prices = history.map(function (x) { return x.price; });
    var min = Math.min.apply(null, prices);
    var max = Math.max.apply(null, prices);
    if (min === max) { min = min * 0.95; max = max * 1.05 || 1; }
    var span = max - min || 1;
    var n = history.length;
    var pts = history.map(function (item, i) {
      var x = padL + (n === 1 ? (w - padL - padR) / 2 : (i / (n - 1)) * (w - padL - padR));
      var y = padT + (1 - (item.price - min) / span) * (h - padT - padB);
      return { x: x, y: y, p: item };
    });

    function linePath(points) {
      if (!smooth || points.length < 3) {
        return points.map(function (p, i) {
          return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
        }).join(' ');
      }
      var d = 'M' + points[0].x.toFixed(1) + ',' + points[0].y.toFixed(1);
      for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[i === 0 ? 0 : i - 1];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = points[i + 2] || p2;
        var cp1x = p1.x + (p2.x - p0.x) / 6;
        var cp1y = p1.y + (p2.y - p0.y) / 6;
        var cp2x = p2.x - (p3.x - p1.x) / 6;
        var cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) + ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
      }
      return d;
    }

    var line = linePath(pts);
    var area = line + ' L' + pts[pts.length - 1].x.toFixed(1) + ',' + (h - padB) + ' L' + pts[0].x.toFixed(1) + ',' + (h - padB) + ' Z';
    var last = pts[pts.length - 1];
    var dots = pts.map(function (p, i) {
      var prev = i > 0 ? history[i - 1].price : null;
      var ch = pctChange(prev, p.p.price);
      var col = ch == null ? PEAK[0] : ch > 0 ? '#fb7185' : ch < 0 ? '#34d399' : '#94a3b8';
      return '<circle class="ph-dot" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="' + col + '" stroke="rgba(15,23,42,0.8)" stroke-width="2"><title>' + esc(p.p.date) + ' — ' + fmtPrice(p.p.price) + (ch != null ? ' (' + (ch > 0 ? '+' : '') + ch.toFixed(1) + '٪)' : '') + '</title></circle>';
    }).join('');
    var labels = pts.filter(function (_, i) {
      return n <= 8 || i === 0 || i === n - 1 || i % Math.ceil(n / 6) === 0;
    }).map(function (p) {
      return '<text x="' + p.x.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" class="ph-axis">' + esc(String(p.p.date).slice(5)) + '</text>';
    }).join('');
    var uid = 'phg' + Date.now();
    return '<div class="ph-chart-host chart-slide-in"><svg viewBox="0 0 ' + w + ' ' + h + '" class="ph-svg w-full h-auto" style="max-height:220px"><defs><linearGradient id="' + uid + 'Fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22d3ee" stop-opacity="0.45"/><stop offset="55%" stop-color="#a78bfa" stop-opacity="0.12"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></linearGradient><linearGradient id="' + uid + 'Stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#34d399"/><stop offset="50%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient><filter id="' + uid + 'Glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path class="ph-area" d="' + area + '" fill="url(#' + uid + 'Fill)"/><path class="ph-line" d="' + line + '" fill="none" stroke="url(#' + uid + 'Stroke)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#' + uid + 'Glow)"/>' + dots + labels + '<circle class="ph-pulse" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="6" fill="none" stroke="#22d3ee" stroke-width="2"/></svg></div>';
  }

  function chartBar(history) {
    if (!history.length) return emptyState();
    var max = Math.max.apply(null, history.map(function (h) { return h.price; }));
    if (max <= 0) max = 1;
    var bars = history.map(function (h, i) {
      var hPct = Math.max(6, Math.round((h.price / max) * 100));
      var prev = i > 0 ? history[i - 1].price : null;
      var ch = pctChange(prev, h.price);
      var col = ch == null ? PEAK[i % PEAK.length] : ch > 0 ? '#fb7185' : ch < 0 ? '#34d399' : '#94a3b8';
      var delay = (i * 0.06).toFixed(2);
      return '<div class="ph-bar-col" style="animation-delay:' + delay + 's" title="' + esc(h.date) + ' — ' + fmtPrice(h.price) + '"><div class="ph-bar-val">' + fmtPrice(h.price) + '</div><div class="ph-bar-track"><div class="ph-bar-fill" style="height:' + hPct + '%;background:linear-gradient(180deg,' + col + ',' + col + '88);box-shadow:0 0 14px ' + col + '66"></div></div><div class="ph-bar-label">' + esc(String(h.date).slice(5)) + '</div></div>';
    }).join('');
    return '<div class="ph-chart-host chart-slide-in"><div class="ph-bars">' + bars + '</div><p class="ph-hint">میله سبز = کاهش · قرمز = افزایش نسبت به خرید قبلی</p></div>';
  }

  function chartDonut(history) {
    if (history.length < 2) {
      return '<div class="ph-chart-host chart-slide-in text-center py-8 text-slate-500 text-sm">برای نمودار دونات حداقل ۲ قیمت ثبت‌شده لازم است</div>';
    }
    var up = 0, down = 0, flat = 0;
    for (var i = 1; i < history.length; i++) {
      var ch = pctChange(history[i - 1].price, history[i].price);
      if (ch == null || Math.abs(ch) < 0.05) flat++;
      else if (ch > 0) up++;
      else down++;
    }
    var total = up + down + flat || 1;
    var a1 = (up / total) * 360;
    var a2 = (down / total) * 360;
    var grad = 'conic-gradient(#fb7185 0deg ' + a1 + 'deg, #34d399 ' + a1 + 'deg ' + (a1 + a2) + 'deg, #64748b ' + (a1 + a2) + 'deg 360deg)';
    return '<div class="ph-chart-host chart-slide-in flex flex-col sm:flex-row items-center gap-6 justify-center py-2"><div class="ph-donut-wrap"><div class="ph-donut-spin te-spin" style="background:' + grad + '"></div><div class="ph-donut-hole"><span class="text-lg font-bold text-cyan-300">' + (history.length - 1) + '</span><span class="text-[10px] text-slate-500">تغییر</span></div><div class="ph-donut-ring"></div></div><div class="space-y-2 text-sm"><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-rose-400"></span> افزایش قیمت: <b class="text-rose-300">' + up + '</b> (' + ((up / total) * 100).toFixed(0) + '٪)</div><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-emerald-400"></span> کاهش قیمت: <b class="text-emerald-300">' + down + '</b> (' + ((down / total) * 100).toFixed(0) + '٪)</div><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-slate-500"></span> بدون تغییر: <b class="text-slate-300">' + flat + '</b> (' + ((flat / total) * 100).toFixed(0) + '٪)</div></div></div>';
  }

  function emptyState() {
    return '<div class="ph-chart-host text-center py-10 text-slate-500 text-sm">هنوز فاکتور ورودی با فی برای این ماده ثبت نشده.<br>با ثبت ورود و فی، نمودار زنده ساخته می‌شود.</div>';
  }

  function renderTable(history) {
    if (!history.length) return '';
    var rows = history.slice().reverse().map(function (h, i, arr) {
      var prev = arr[i + 1] ? arr[i + 1].price : null;
      var ch = pctChange(prev, h.price);
      var chHtml = ch == null ? '<span class="text-slate-500">—</span>' : ch > 0 ? '<span class="text-rose-400">+' + ch.toFixed(1) + '٪</span>' : ch < 0 ? '<span class="text-emerald-400">' + ch.toFixed(1) + '٪</span>' : '<span class="text-slate-400">۰٪</span>';
      return '<tr><td class="text-xs whitespace-nowrap">' + esc(h.date) + '</td><td class="text-emerald-300 font-medium text-xs">' + fmtPrice(h.price) + '</td><td class="text-xs">' + chHtml + '</td><td class="text-xs text-slate-400">' + (h.qty != null ? fmtNum(h.qty) : '—') + '</td><td class="text-xs text-slate-500">' + esc(h.invoice) + '</td></tr>';
    }).join('');
    return '<div class="table-wrap max-h-52 overflow-auto mt-3"><table class="data text-sm"><thead><tr><th>تاریخ</th><th>فی (ریال)</th><th>تغییر</th><th>مقدار</th><th>فاکتور</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function summaryCards(history) {
    if (!history.length) return '';
    var last = history[history.length - 1];
    var prev = history.length > 1 ? history[history.length - 2] : null;
    var ch = prev ? pctChange(prev.price, last.price) : null;
    var min = Math.min.apply(null, history.map(function (h) { return h.price; }));
    var max = Math.max.apply(null, history.map(function (h) { return h.price; }));
    return '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">' +
      card('آخرین', fmtPrice(last.price), 'text-cyan-300') +
      card('آخرین تغییر', ch == null ? '—' : (ch > 0 ? '+' : '') + ch.toFixed(1) + '٪', ch == null ? 'text-slate-400' : ch > 0 ? 'text-rose-400' : 'text-emerald-400') +
      card('کمینه', fmtPrice(min), 'text-emerald-300') +
      card('بیشینه', fmtPrice(max), 'text-violet-300') + '</div>';
  }
  function card(label, val, cls) {
    return '<div class="glass-card rounded-xl p-2 text-center ph-stat"><div class="text-[10px] text-slate-500">' + label + '</div><div class="font-bold text-sm ' + cls + '">' + val + '</div></div>';
  }

  function typeSwitcher(active) {
    var types = [
      { id: 'area', label: '📈 ناحیه‌ای' },
      { id: 'wave', label: '🌊 موجی' },
      { id: 'bar', label: '📊 میله‌ای' },
      { id: 'donut', label: '🍩 دونات' }
    ];
    return '<div class="flex flex-wrap gap-1.5 mb-3" id="ph-type-bar">' +
      types.map(function (t) {
        var on = t.id === active;
        return '<button type="button" data-ph-type="' + t.id + '" class="btn-ghost text-xs px-2.5 py-1 ' + (on ? 'ring-1 ring-cyan-400/60 text-cyan-300' : '') + '">' + t.label + '</button>';
      }).join('') +
      '<span class="text-[10px] text-slate-500 self-center mr-auto flex items-center gap-1"><span class="ph-live-dot"></span> زنده از فاکتورها</span></div>';
  }

  function renderChart(history, type) {
    if (type === 'bar') return chartBar(history);
    if (type === 'donut') return chartDonut(history);
    if (type === 'wave') return chartArea(history, true);
    return chartArea(history, false);
  }

  function injectStyles() {
    if (document.getElementById('ph-styles')) return;
    var css = '.ph-chart-host{position:relative;isolation:isolate}' +
      '.ph-svg{display:block;filter:drop-shadow(0 4px 20px rgba(34,211,238,0.12))}' +
      '.ph-area{opacity:0;animation:phAreaIn .7s ease forwards}' +
      '.ph-line{stroke-dasharray:1200;stroke-dashoffset:1200;animation:phDraw 1.2s ease forwards}' +
      '.ph-dot{opacity:0;animation:phDotIn .4s ease forwards .55s}' +
      '.ph-pulse{animation:phPulse 2s ease-out infinite}' +
      '.ph-axis{fill:#64748b;font-size:9px;font-family:inherit}' +
      '@keyframes phDraw{to{stroke-dashoffset:0}}' +
      '@keyframes phAreaIn{to{opacity:1}}' +
      '@keyframes phDotIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes phPulse{0%{opacity:.9}70%{opacity:0}100%{opacity:0}}' +
      '.ph-bars{display:flex;align-items:flex-end;gap:6px;height:180px;overflow-x:auto;padding:8px 4px 0}' +
      '.ph-bar-col{flex:1;min-width:32px;max-width:52px;display:flex;flex-direction:column;align-items:center;height:100%;animation:phBarIn .5s ease backwards}' +
      '@keyframes phBarIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
      '.ph-bar-track{flex:1;width:100%;display:flex;align-items:flex-end;border-radius:8px 8px 4px 4px;background:rgba(148,163,184,0.08)}' +
      '.ph-bar-fill{width:100%;border-radius:8px 8px 3px 3px;min-height:4px;transition:height .6s cubic-bezier(.22,1,.36,1)}' +
      '.ph-bar-val{font-size:9px;color:#94a3b8;margin-bottom:4px;opacity:0;transition:opacity .2s;white-space:nowrap}' +
      '.ph-bar-col:hover .ph-bar-val{opacity:1}' +
      '.ph-bar-label{font-size:9px;color:#64748b;margin-top:4px;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis}' +
      '.ph-hint{font-size:10px;color:#64748b;margin-top:8px}' +
      '.ph-donut-wrap{position:relative;width:9rem;height:9rem;flex-shrink:0}' +
      '.ph-donut-spin{width:100%;height:100%;border-radius:50%;animation:phSpin 12s linear infinite;box-shadow:0 0 24px rgba(244,114,182,0.25),0 0 40px rgba(52,211,153,0.15)}' +
      '.ph-donut-hole{position:absolute;inset:22%;border-radius:50%;background:rgba(15,23,42,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 0 12px rgba(0,0,0,0.4)}' +
      '.ph-donut-ring{position:absolute;inset:-3px;border-radius:50%;border:1px solid rgba(34,211,238,0.2);animation:phRingPulse 3s ease-in-out infinite;pointer-events:none}' +
      '@keyframes phSpin{to{transform:rotate(360deg)}}' +
      '@keyframes phRingPulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.9;transform:scale(1.03)}}' +
      '.ph-live-dot{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399;animation:phLive 1.4s ease-in-out infinite;display:inline-block}' +
      '@keyframes phLive{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.85)}}' +
      '.ph-stat{animation:phStatIn .45s ease backwards}' +
      '.ph-stat:nth-child(2){animation-delay:.06s}.ph-stat:nth-child(3){animation-delay:.12s}.ph-stat:nth-child(4){animation-delay:.18s}' +
      '@keyframes phStatIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '.chart-slide-in{animation:chartSlideIn .45s ease-out}' +
      '@keyframes chartSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}';
    var s = document.createElement('style');
    s.id = 'ph-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function paintBody() {
    var body = document.getElementById('ph-body');
    if (!body) return;
    var history = currentHistory;
    body.innerHTML = summaryCards(history) + typeSwitcher(currentType) +
      '<div id="ph-chart-slot">' + renderChart(history, currentType) + '</div>' + renderTable(history);
    var bar = document.getElementById('ph-type-bar');
    if (bar) {
      bar.querySelectorAll('[data-ph-type]').forEach(function (btn) {
        btn.onclick = function () {
          currentType = btn.getAttribute('data-ph-type');
          paintBody();
        };
      });
    }
  }

  async function showPriceHistory(materialName, materialCode) {
    if (typeof showModal !== 'function') { alert('مودال در دسترس نیست'); return; }
    injectStyles();
    currentMeta = { name: materialName, code: materialCode || '' };
    currentType = 'area';
    showModal(
      '<div class="modal max-w-xl" id="ph-styles-root">' +
        '<div class="flex items-start justify-between gap-2 mb-1">' +
        '<div><h3 class="text-lg font-bold">تاریخچه قیمت زنده</h3>' +
        '<p class="text-slate-400 text-sm">' + esc(materialCode ? materialCode + ' · ' : '') + esc(materialName || '') + '</p></div>' +
        '<button type="button" class="btn-ghost text-xs" onclick="window.__phRefresh && window.__phRefresh()">🔄 بروزرسانی</button></div>' +
        '<div id="ph-body" class="min-h-[160px] flex items-center justify-center text-slate-500 text-sm">در حال بارگذاری...</div>' +
        '<div class="flex gap-2 pt-4"><button type="button" class="btn-secondary flex-1" onclick="closeModal()">بستن</button></div></div>'
    );
    async function load() {
      currentHistory = await getPriceHistory(materialName);
      var body = document.getElementById('ph-body');
      if (!body) return;
      body.className = '';
      if (!currentHistory.length) { body.innerHTML = emptyState(); return; }
      paintBody();
    }
    window.__phRefresh = load;
    await load();
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(function () {
      if (!document.getElementById('ph-body')) { clearInterval(liveTimer); liveTimer = null; return; }
      load();
    }, 25000);
  }

  window.showMaterialPriceHistory = showPriceHistory;

  function patchMaterialsList() {
    if (typeof Pages === 'undefined' || typeof Pages.materials !== 'function') return false;
    if (Pages.materials.__priceHistPatched) return true;
    var prev = Pages.materials;
    Pages.materials = async function () {
      var html = await prev.apply(this, arguments);
      setTimeout(async function () {
        injectStyles();
        var entries = [];
        try { entries = (await DB.getAll('entries')) || []; } catch (e) { return; }
        var byMat = {};
        entries.filter(function (e) {
          return e && e.material_name && e.unit_price != null && Number(e.unit_price) > 0 && !e.deleted_at;
        }).sort(function (a, b) {
          return String(a.date).localeCompare(String(b.date));
        }).forEach(function (e) {
          var k = e.material_name;
          if (!byMat[k]) byMat[k] = [];
          byMat[k].push(Number(e.unit_price));
        });
        document.querySelectorAll('table.data tbody tr').forEach(function (tr) {
          var tds = tr.querySelectorAll('td');
          if (tds.length < 4) return;
          var code = (tds[0].textContent || '').trim();
          var nameEl = tds[1];
          var name = (nameEl.childNodes[0] ? nameEl.childNodes[0].textContent : nameEl.textContent || '').trim().split('\n')[0].trim();
          var priceTd = tds[3];
          if (!priceTd || priceTd.dataset.phDone) return;
          priceTd.dataset.phDone = '1';
          var hist = byMat[name] || [];
          var last = hist.length ? hist[hist.length - 1] : null;
          var prevP = hist.length > 1 ? hist[hist.length - 2] : null;
          var ch = last && prevP ? pctChange(prevP, last) : null;
          var chBadge = '';
          if (ch != null && Math.abs(ch) >= 0.05) {
            chBadge = '<span class="block text-[10px] mt-0.5 ' + (ch > 0 ? 'text-rose-400' : 'text-emerald-400') + '">' + (ch > 0 ? '↑ +' : '↓ ') + Math.abs(ch).toFixed(1) + '٪</span>';
          }
          var safeName = String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var safeCode = String(code).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var label = priceTd.textContent || '—';
          priceTd.style.cursor = 'pointer';
          priceTd.title = 'تاریخچه قیمت زنده';
          priceTd.innerHTML = '<button type="button" class="text-emerald-300 text-xs font-medium hover:underline bg-transparent border-0 p-0 cursor-pointer" onclick="event.stopPropagation();window.showMaterialPriceHistory(\'' + safeName + '\',\'' + safeCode + '\')">' + label + '</button>' + chBadge;
        });
      }, 120);
      return html;
    };
    Pages.materials.__priceHistPatched = true;
    return true;
  }

  function boot() {
    if (!patchMaterialsList()) {
      var n = 0;
      var t = setInterval(function () {
        n++;
        if (patchMaterialsList() || n > 40) clearInterval(t);
      }, 150);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  console.log('[materials-price-history] live multi-chart ready');
})();
