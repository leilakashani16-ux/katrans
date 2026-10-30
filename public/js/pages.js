/**
 * Page renderers – with filters, alerts, PDF, jalali, auto-return
 */
const Pages = {};

Pages.startDashChartRotate = function () {
  try {
    if (window.__dashChartTimer) clearInterval(window.__dashChartTimer);
  } catch (e) {}
  window.__dashChartTimer = setInterval(function () {
    try {
      if (typeof currentPage !== 'undefined' && currentPage !== 'dashboard') return;
      var modalRoot = document.getElementById('modal-root');
      if (modalRoot && modalRoot.querySelector('.modal')) return;
      var order = ['day', 'month', 'year'];
      var cur = (window.__dashCperiod || 'day');
      var ix = order.indexOf(cur);
      var next = order[(ix + 1) % 3];
      if (typeof Pages.applyDashChartPeriod === 'function') {
        Pages.applyDashChartPeriod(next, true);
      }
    } catch (e3) {}
  }, 10000);
};

/** فقط نمودارها را عوض می‌کند — کل صفحه رفرش نمی‌شود */
Pages.applyDashChartPeriod = function (cperiod, fromAuto) {
  if (!window.__dashChartBuild) return;
  if (cperiod !== 'day' && cperiod !== 'month' && cperiod !== 'year') cperiod = 'day';
  window.__dashCperiod = cperiod;
  try {
    var h = location.hash || '#dashboard';
    var base = h.split('?')[0] || '#dashboard';
    var sp = new URLSearchParams(h.indexOf('?') >= 0 ? h.slice(h.indexOf('?') + 1) : '');
    sp.set('cperiod', cperiod);
    var nextHash = base.replace(/^#/, '') + '?' + sp.toString();
    if ((location.hash || '').replace(/^#/, '') !== nextHash) {
      // بدون navigate — فقط hash
      history.replaceState(null, '', '#' + nextHash);
    }
  } catch (e) {}
  // آپدیت دکمه‌های فعال
  try {
    document.querySelectorAll('[data-cperiod]').forEach(function (btn) {
      var on = btn.getAttribute('data-cperiod') === cperiod;
      btn.className = (on ? 'btn-primary' : 'btn-ghost') + ' text-xs';
    });
    var hint = document.getElementById('chart-auto-hint');
    if (hint) {
      var labels = { day: 'امروز', month: 'این ماه', year: 'امسال' };
      hint.textContent = (fromAuto ? 'ورق خودکار · ' : '') + 'الان: ' + (labels[cperiod] || cperiod);
    }
  } catch (e2) {}
  var wrap = document.getElementById('dash-charts-wrap');
  if (!wrap) return;
  var html = window.__dashChartBuild(cperiod);
  wrap.innerHTML = html;
  var charts = document.getElementById('dash-charts');
  if (charts) {
    charts.classList.remove('chart-slide-in');
    void charts.offsetWidth;
    charts.classList.add('chart-slide-in');
  }
  // بعد از ورق خوردن، انیمیشن دونات‌ها را دوباره روشن کن
  try {
    if (window.UiFinal && typeof window.UiFinal.enhanceDonuts === 'function') {
      setTimeout(function () { window.UiFinal.enhanceDonuts(); }, 80);
      setTimeout(function () { window.UiFinal.enhanceDonuts(); }, 400);
    }
    if (window.ThemeEngine && typeof window.ThemeEngine.enhanceSpaceCharts === 'function') {
      setTimeout(function () { window.ThemeEngine.enhanceSpaceCharts(); }, 100);
    }
  } catch (eAnim) {}
};


Pages.dashboard = async function () {
  // Parallel fetch — was serial (biggest client latency)
  const [stock, entries0, productions0, wastes0, products0, plans0, scores0] = await Promise.all([
    DB.calcStock(),
    DB.getAll('entries'),
    DB.getAll('productions'),
    DB.getAll('wastes'),
    DB.getAll('products').catch(() => []),
    DB.getAll('daily_plans').catch(() => []),
    DB.getAll('staff_scores').catch(() => []),
  ]);
  let entries = entries0 || [];
  let productions = productions0 || [];
  let wastes = wastes0 || [];
  let products = products0 || [];
  let plans = plans0 || [];
  let scores = scores0 || [];
  // advanced dashboard date filter
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '';
  const dt = params.get('dt') || '';
  let cperiod = params.get('cperiod') || '';
  if (cperiod !== 'day' && cperiod !== 'month' && cperiod !== 'year') {
    // پیش‌فرض: اگر امروز تولید نیست → امسال (تا جدول خالی نماند)
    const t0 = todayJalali();
    const hasToday = (productions0 || []).some(p => p && p.date === t0);
    cperiod = hasToday ? 'day' : 'year';
  }
  if (df || dt) {
    entries = filterByDateAndSearch(entries, df, dt, '', ['date']);
    productions = filterByDateAndSearch(productions, df, dt, '', ['date']);
    wastes = filterByDateAndSearch(wastes, df, dt, '', ['date']);
  }

  // محدوده نمودار: روز=فقط امروز · ماه=همین ماه · سال=همین سال
  const todayForChart = todayJalali();
  const inChartPeriod = (dateStr, mode) => {
    mode = mode || cperiod;
    if (!dateStr) return false;
    const s = String(dateStr);
    if (mode === 'day') return s === todayForChart;
    if (mode === 'month') return s.slice(0, 7) === todayForChart.slice(0, 7);
    if (mode === 'year') return s.slice(0, 4) === todayForChart.slice(0, 4);
    return true;
  };
  // دادهٔ مخصوص نمودار (کارت‌های خلاصه همچنان بازه فیلتر تاریخ را دارند)
  const chartProductions = productions.filter((p) => inChartPeriod(p.date, cperiod));
  const chartEntries = entries.filter((e) => inChartPeriod(e.date, cperiod));
  const chartWastes = wastes.filter((w) => inChartPeriod(w.date, cperiod));

  const totalWeight = productions.reduce((s, p) => s + Number(p.material_weight || 0), 0);
  const totalQty = productions.reduce((s, p) => s + Number(p.quantity || 0), 0);

  const pStats = {};
  chartProductions.forEach(p => {
    const n = p.producer_name || 'نامشخص';
    if (!pStats[n]) pStats[n] = { count: 0, qty: 0, weight: 0, duration: 0 };
    pStats[n].count++;
    pStats[n].qty += Number(p.quantity || 0);
    pStats[n].weight += Number(p.material_weight || 0);
    pStats[n].duration += Number(p.duration_minutes || 0);
  });

  const unitOf = (name) => {
    const m = stock.find(x => x.name === name);
    return (m && m.unit) ? m.unit : 'کیلوگرم';
  };
  const unitShort = (u) => {
    if (!u) return '';
    if (String(u).includes('عدد')) return 'عدد';
    if (String(u).includes('کیلو')) return 'کیلو';
    return u;
  };

  const COLORS = ['#1a9b55', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#84cc16'];
  window.__dashRaw = {
    productions: productions,
    entries: entries,
    wastes: wastes,
    stock: stock,
    today: todayForChart,
    COLORS: COLORS
  };
  window.__dashCperiod = cperiod;

  const matConsume = {};
  chartProductions.forEach(p => {
    const n = p.material_name || 'نامشخص';
    matConsume[n] = (matConsume[n] || 0) + Number(p.material_weight || 0);
  });
  const topMats = Object.entries(matConsume).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const sumMat = topMats.reduce((s, [, v]) => s + v, 0) || 1;

  // روند تولید بر اساس دوره: روز / ماه / سال
  const periodKeyOf = (dateStr, mode) => {
    if (!dateStr || dateStr === '—') return '—';
    const s = String(dateStr);
    if (mode === 'year') return s.slice(0, 4) || s;
    if (mode === 'month') return s.length >= 7 ? s.slice(0, 7) : s;
    return s;
  };
  const periodLabels = { day: 'روزانه', month: 'ماهانه', year: 'سالانه' };
  const periodSlice = { day: 14, month: 12, year: 10 };
  const trendWeight = {};
  const trendQty = {};
  chartProductions.forEach(p => {
    const key = periodKeyOf(p.date, cperiod);
    trendQty[key] = (trendQty[key] || 0) + Number(p.quantity || 0);
    if (unitShort(unitOf(p.material_name)) === 'عدد') return;
    trendWeight[key] = (trendWeight[key] || 0) + Number(p.material_weight || 0);
  });
  const dayWeight = trendWeight;
  const dayKeys = Object.keys(trendWeight).sort().slice(-(periodSlice[cperiod] || 14));
  const sumDay = dayKeys.reduce((s, d) => s + dayWeight[d], 0) || 1;
  const trendQtyKeys = Object.keys(trendQty).sort().slice(-(periodSlice[cperiod] || 14));
  const trendQtyItems = trendQtyKeys.map((k, i) => ({
    label: k, value: trendQty[k], color: COLORS[i % COLORS.length],
  }));
  const sumTrendQty = trendQtyItems.reduce((s, it) => s + it.value, 0) || 1;
  const maxTrendQty = trendQtyItems.length ? Math.max(...trendQtyItems.map(it => it.value)) : 1;

  const staffList = Object.entries(pStats).sort((a, b) => b[1].weight - a[1].weight).slice(0, 7);
  const sumStaff = staffList.reduce((s, [, v]) => s + v.weight, 0) || 1;

  const stockGroups = [
    { label: 'عادی', value: stock.filter(m => m.status === 'عادی').length, color: '#1a9b55' },
    { label: 'هشدار', value: stock.filter(m => m.status === 'هشدار').length, color: '#f59e0b' },
    { label: 'تمام شد', value: stock.filter(m => m.status === 'تمام شد').length, color: '#ef4444' },
  ].filter(x => x.value > 0);
  const sumStockG = stockGroups.reduce((s, x) => s + x.value, 0) || 1;

  const byUser = {};
  [...chartEntries, ...chartProductions, ...chartWastes].forEach(r => {
    const u = r.created_by || 'نامشخص';
    byUser[u] = (byUser[u] || 0) + 1;
  });
  const userList = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const sumUser = userList.reduce((s, [, v]) => s + v, 0) || 1;

  const donutGradient = (items, total) => {
    if (!items.length) return '#1e293b';
    let acc = 0;
    const parts = items.map((it) => {
      const start = (acc / total) * 360;
      acc += Number(it.value) || 0;
      const end = (acc / total) * 360;
      return it.color + ' ' + start + 'deg ' + end + 'deg';
    });
    return 'conic-gradient(' + parts.join(', ') + ')';
  };

  const donutCard = (title, sub, items, total, fmtFn) => {
    if (!items.length) {
      return '<div class="glass-card rounded-2xl p-5 min-h-[220px]"><h2 class="font-semibold mb-2">' + title + '</h2><p class="text-slate-500 text-sm">داده‌ای نیست</p></div>';
    }
    const grad = donutGradient(items, total);
    const legend = items.map((it) => {
      const val = fmtFn ? fmtFn(it) : it.value;
      return '<div class="flex items-center gap-2 text-xs mb-1.5">' +
        '<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:' + it.color + '"></span>' +
        '<span class="truncate flex-1 text-slate-300">' + it.label + '</span>' +
        '<span class="text-slate-100 font-medium whitespace-nowrap">' + val + '</span></div>';
    }).join('');
    return '<div class="glass-card rounded-2xl p-5">' +
      '<h2 class="font-semibold mb-0.5">' + title + '</h2>' +
      '<p class="text-xs text-slate-400 mb-4">' + sub + '</p>' +
      '<div class="flex flex-col sm:flex-row items-center gap-5">' +
      '<div class="relative w-36 h-36 flex-shrink-0">' +
      '<div class="w-full h-full rounded-full shadow-lg" style="background:' + grad + '"></div>' +
      '<div class="absolute inset-[22%] rounded-full bg-slate-900 border border-slate-700/40"></div>' +
      '</div><div class="flex-1 w-full min-w-0">' + legend + '</div></div></div>';
  };

  const matItems = topMats.map(([name, w], i) => ({
    label: name, value: w, color: COLORS[i % COLORS.length], unit: unitShort(unitOf(name)),
  }));
  const dayItems = dayKeys.map((d, i) => ({
    label: d, value: dayWeight[d], color: COLORS[i % COLORS.length],
  }));
  const staffItems = staffList.map(([name, s], i) => ({
    label: name, value: s.weight, color: COLORS[i % COLORS.length], count: s.count,
  }));
  const userItems = userList.map(([name, c], i) => ({
    label: name, value: c, color: COLORS[i % COLORS.length],
  }));

  // تعداد تولید هر محصول (جوجه، کوبیده، ماهی، لوبیاپلو و …)
  const prodQty = {};
  chartProductions.forEach(p => {
    const n = p.product_name || 'نامشخص';
    prodQty[n] = (prodQty[n] || 0) + Number(p.quantity || 0);
  });
  const topProducts = Object.entries(prodQty).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sumProdQty = topProducts.reduce((s, [, v]) => s + v, 0) || 1;
  const productItems = topProducts.map(([name, q], i) => ({
    label: name, value: q, color: COLORS[i % COLORS.length],
  }));

  // نوار افقی برای تعداد محصولات (خواناتر از دونات وقتی نام‌ها طولانی‌اند)
  const barCard = (title, sub, items, maxVal) => {
    if (!items.length) {
      return '<div class="glass-card rounded-2xl p-5 min-h-[220px]"><h2 class="font-semibold mb-2">' + title + '</h2><p class="text-slate-500 text-sm">داده‌ای نیست</p></div>';
    }
    const rows = items.map((it) => {
      const pct = maxVal > 0 ? Math.round((it.value / maxVal) * 100) : 0;
      return '<div class="mb-2.5">' +
        '<div class="flex justify-between text-xs mb-1 gap-2">' +
        '<span class="text-slate-300 truncate">' + it.label + '</span>' +
        '<span class="text-slate-100 font-medium whitespace-nowrap">' + fmtNum(it.value) + '</span></div>' +
        '<div class="h-2 rounded-full bg-slate-800 overflow-hidden">' +
        '<div class="h-full rounded-full" style="width:' + pct + '%;background:' + it.color + '"></div>' +
        '</div></div>';
    }).join('');
    return '<div class="glass-card rounded-2xl p-5">' +
      '<h2 class="font-semibold mb-0.5">' + title + '</h2>' +
      '<p class="text-xs text-slate-400 mb-4">' + sub + '</p>' + rows + '</div>';
  };
  const maxProdQty = topProducts.length ? topProducts[0][1] : 1;

  const periodChip = (id, label) => {
    const on = cperiod === id;
    // کلیک دستی: کل داشبورد با همان بازه (جدول عملکرد هم عوض شود)
    // ورق خودکار: فقط نمودار (applyDashChartPeriod)
    const q = [];
    if (df) q.push('df=' + encodeURIComponent(df));
    if (dt) q.push('dt=' + encodeURIComponent(dt));
    q.push('cperiod=' + id);
    return '<button type="button" data-cperiod="' + id + '" class="' + (on ? 'btn-primary' : 'btn-ghost') + ' text-xs" onclick="navigate(\'dashboard?' + q.join('&') + '\')">' + label + '</button>';
  };

  const chartsHtml =
    '<div class="mb-3 flex flex-wrap items-center justify-between gap-2">' +
    '<div class="flex flex-wrap gap-2 items-center">' +
    '<span class="text-xs text-slate-400">نمودار روند:</span>' +
    periodChip('day', 'امروز') +
    periodChip('month', 'این ماه') +
    periodChip('year', 'امسال') +
    '</div>' +
    '<span class="text-[10px] text-slate-500" id="chart-auto-hint">ورق خودکار با انیمیشن · الان: ' + (periodLabels[cperiod] || '') + '</span>' +
    '</div>' +
    '<div id="dash-charts-wrap"><div class="grid lg:grid-cols-2 gap-6 mb-8 chart-slide-in" id="dash-charts">' +
    barCard('🍢 تعداد تولید محصولات', 'در بازه فیلتر · تجمیع ' + (periodLabels[cperiod] || ''), productItems, maxProdQty) +
    (trendQtyItems.length ? barCard('📈 تعداد تولید — ' + (periodLabels[cperiod] || ''), 'جمع تعداد در هر ' + (cperiod === 'day' ? 'روز' : cperiod === 'month' ? 'ماه' : 'سال'), trendQtyItems, maxTrendQty) : '') +
    donutCard('📊 سهم تعداد محصولات', 'درصد از کل تعداد تولید', productItems, sumProdQty, (it) => fmtNum(it.value) + ' عدد') +
    donutCard('📦 وضعیت موجودی', 'تعداد اقلام در هر وضعیت', stockGroups, sumStockG, (it) => it.value + ' قلم') +
    donutCard('👨‍🍳 سهم پرسنل', 'بر اساس وزن مصرف', staffItems, sumStaff, (it) => fmtNum(it.value) + ' · ' + (it.count || 0) + ' رکورد') +
    donutCard('✍️ ثبت‌کننده‌ها', 'ورود + تولید + ضایعات', userItems, sumUser, (it) => it.value + ' رکورد') +
    (dayItems.length ? donutCard('📅 مصرف کیلویی — ' + (periodLabels[cperiod] || ''), 'مواد کیلویی تجمیع‌شده', dayItems, sumDay, (it) => fmtNum(it.value) + ' کیلو') : '') +
    (chartProductions.length === 0
      ? '<div class="glass-card rounded-2xl p-6 lg:col-span-2 text-center text-slate-400 text-sm">در این بازه (' +
        (periodLabels[cperiod] || '') +
        ') تولیدی ثبت نشده — نمودار خالی است</div>'
      : '') +
    '</div></div>';
  window.__dashChartBuild = function (mode) {
    var raw = window.__dashRaw;
    if (!raw) return '<div class="text-slate-500 text-sm p-4">داده نمودار نیست</div>';
    var COLORS = raw.COLORS || [];
    var today = raw.today;
    var labels = { day: 'امروز', month: 'این ماه', year: 'امسال' };
    var periodLabels = { day: 'روزانه', month: 'ماهانه', year: 'سالانه' };
    function inP(d) {
      if (!d) return false;
      var s = String(d);
      if (mode === 'day') return s === today;
      if (mode === 'month') return s.slice(0, 7) === today.slice(0, 7);
      if (mode === 'year') return s.slice(0, 4) === today.slice(0, 4);
      return true;
    }
    var prods = (raw.productions || []).filter(function (p) { return inP(p.date); });
    var ents = (raw.entries || []).filter(function (e) { return inP(e.date); });
    var wsts = (raw.wastes || []).filter(function (w) { return inP(w.date); });
    var stock = raw.stock || [];
    function unitOf(name) {
      var m = stock.find(function (x) { return x.name === name; });
      return (m && m.unit) ? m.unit : 'کیلوگرم';
    }
    function unitShort(u) {
      if (!u) return '';
      if (String(u).includes('عدد')) return 'عدد';
      if (String(u).includes('کیلو')) return 'کیلو';
      return u;
    }
    var prodQty = {};
    prods.forEach(function (p) {
      var n = p.product_name || 'نامشخص';
      prodQty[n] = (prodQty[n] || 0) + Number(p.quantity || 0);
    });
    var topProducts = Object.entries(prodQty).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10);
    var sumProdQty = topProducts.reduce(function (s, x) { return s + x[1]; }, 0) || 1;
    var productItems = topProducts.map(function (x, i) {
      return { label: x[0], value: x[1], color: COLORS[i % COLORS.length] };
    });
    var maxProdQty = topProducts.length ? topProducts[0][1] : 1;
    var pStats = {};
    prods.forEach(function (p) {
      var n = p.producer_name || 'نامشخص';
      if (!pStats[n]) pStats[n] = { count: 0, weight: 0 };
      pStats[n].count++;
      pStats[n].weight += Number(p.material_weight || 0);
    });
    var staffList = Object.entries(pStats).sort(function (a, b) { return b[1].weight - a[1].weight; }).slice(0, 7);
    var sumStaff = staffList.reduce(function (s, x) { return s + x[1].weight; }, 0) || 1;
    var staffItems = staffList.map(function (x, i) {
      return { label: x[0], value: x[1].weight, color: COLORS[i % COLORS.length], count: x[1].count };
    });
    var byUser = {};
    ents.concat(prods).concat(wsts).forEach(function (r) {
      var u = r.created_by || 'نامشخص';
      byUser[u] = (byUser[u] || 0) + 1;
    });
    var userList = Object.entries(byUser).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 7);
    var sumUser = userList.reduce(function (s, x) { return s + x[1]; }, 0) || 1;
    var userItems = userList.map(function (x, i) {
      return { label: x[0], value: x[1], color: COLORS[i % COLORS.length] };
    });
    var stockGroups = [
      { label: 'عادی', value: stock.filter(function (m) { return m.status === 'عادی'; }).length, color: '#1a9b55' },
      { label: 'هشدار', value: stock.filter(function (m) { return m.status === 'هشدار'; }).length, color: '#f59e0b' },
      { label: 'تمام شد', value: stock.filter(function (m) { return m.status === 'تمام شد'; }).length, color: '#ef4444' }
    ].filter(function (x) { return x.value > 0; });
    var sumStockG = stockGroups.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    var periodKeyOf = function (dateStr) {
      if (!dateStr) return '—';
      var s = String(dateStr);
      if (mode === 'year') return s.slice(0, 4);
      if (mode === 'month') return s.length >= 7 ? s.slice(0, 7) : s;
      return s;
    };
    var trendQty = {};
    var trendWeight = {};
    prods.forEach(function (p) {
      var key = periodKeyOf(p.date);
      trendQty[key] = (trendQty[key] || 0) + Number(p.quantity || 0);
      if (unitShort(unitOf(p.material_name)) === 'عدد') return;
      trendWeight[key] = (trendWeight[key] || 0) + Number(p.material_weight || 0);
    });
    var sliceN = mode === 'day' ? 14 : mode === 'month' ? 12 : 10;
    var dayKeys = Object.keys(trendWeight).sort().slice(-sliceN);
    var dayItems = dayKeys.map(function (d, i) {
      return { label: d, value: trendWeight[d], color: COLORS[i % COLORS.length] };
    });
    var sumDay = dayItems.reduce(function (s, it) { return s + it.value; }, 0) || 1;
    var trendQtyKeys = Object.keys(trendQty).sort().slice(-sliceN);
    var trendQtyItems = trendQtyKeys.map(function (k, i) {
      return { label: k, value: trendQty[k], color: COLORS[i % COLORS.length] };
    });
    var maxTrendQty = trendQtyItems.length ? Math.max.apply(null, trendQtyItems.map(function (it) { return it.value; })) : 1;

    function donutGradient(items, total) {
      if (!items.length) return '#1e293b';
      var acc = 0;
      var parts = items.map(function (it) {
        var start = (acc / total) * 360;
        acc += Number(it.value) || 0;
        var end = (acc / total) * 360;
        return it.color + ' ' + start + 'deg ' + end + 'deg';
      });
      return 'conic-gradient(' + parts.join(', ') + ')';
    }
    function donutCard(title, sub, items, total, fmtFn) {
      if (!items.length) {
        return '<div class="glass-card rounded-2xl p-5 min-h-[220px]"><h2 class="font-semibold mb-2">' + title + '</h2><p class="text-slate-500 text-sm">داده‌ای نیست</p></div>';
      }
      var grad = donutGradient(items, total);
      var legend = items.map(function (it) {
        var val = fmtFn ? fmtFn(it) : it.value;
        return '<div class="flex items-center gap-2 text-xs mb-1.5">' +
          '<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:' + it.color + '"></span>' +
          '<span class="truncate flex-1 text-slate-300">' + it.label + '</span>' +
          '<span class="text-slate-100 font-medium whitespace-nowrap">' + val + '</span></div>';
      }).join('');
      return '<div class="glass-card rounded-2xl p-5">' +
        '<h2 class="font-semibold mb-0.5">' + title + '</h2>' +
        '<p class="text-xs text-slate-400 mb-4">' + sub + '</p>' +
        '<div class="flex flex-col sm:flex-row items-center gap-5">' +
        '<div class="relative w-36 h-36 flex-shrink-0">' +
        '<div class="w-full h-full rounded-full shadow-lg" style="background:' + grad + '"></div>' +
        '<div class="absolute inset-[22%] rounded-full bg-slate-900 border border-slate-700/40"></div>' +
        '</div><div class="flex-1 w-full min-w-0">' + legend + '</div></div></div>';
    }
    function barCard(title, sub, items, maxVal) {
      if (!items.length) {
        return '<div class="glass-card rounded-2xl p-5 min-h-[220px]"><h2 class="font-semibold mb-2">' + title + '</h2><p class="text-slate-500 text-sm">داده‌ای نیست</p></div>';
      }
      var rows = items.map(function (it) {
        var pct = maxVal > 0 ? Math.round((it.value / maxVal) * 100) : 0;
        return '<div class="mb-2.5">' +
          '<div class="flex justify-between text-xs mb-1 gap-2">' +
          '<span class="text-slate-300 truncate">' + it.label + '</span>' +
          '<span class="text-slate-100 font-medium whitespace-nowrap">' + fmtNum(it.value) + '</span></div>' +
          '<div class="h-2 rounded-full bg-slate-800 overflow-hidden">' +
          '<div class="h-full rounded-full" style="width:' + pct + '%;background:' + it.color + '"></div>' +
          '</div></div>';
      }).join('');
      return '<div class="glass-card rounded-2xl p-5">' +
        '<h2 class="font-semibold mb-0.5">' + title + '</h2>' +
        '<p class="text-xs text-slate-400 mb-4">' + sub + '</p>' + rows + '</div>';
    }
    var emptyNote = prods.length === 0
      ? '<div class="glass-card rounded-2xl p-6 lg:col-span-2 text-center text-slate-400 text-sm">در این بازه (' + (labels[mode] || '') + ') تولیدی ثبت نشده — نمودار خالی است</div>'
      : '';
    return '<div class="grid lg:grid-cols-2 gap-6 mb-8 chart-slide-in" id="dash-charts">' +
      barCard('🍢 تعداد تولید محصولات', 'بازه: ' + (labels[mode] || ''), productItems, maxProdQty) +
      (trendQtyItems.length ? barCard('📈 تعداد تولید — ' + (periodLabels[mode] || ''), 'تجمیع ' + (mode === 'day' ? 'روز' : mode === 'month' ? 'ماه' : 'سال'), trendQtyItems, maxTrendQty) : '') +
      donutCard('📊 سهم تعداد محصولات', 'درصد از کل', productItems, sumProdQty, function (it) { return fmtNum(it.value) + ' عدد'; }) +
      donutCard('📦 وضعیت موجودی', 'تعداد اقلام', stockGroups, sumStockG, function (it) { return it.value + ' قلم'; }) +
      donutCard('👨‍🍳 سهم پرسنل', 'وزن مصرف', staffItems, sumStaff, function (it) { return fmtNum(it.value) + ' · ' + (it.count || 0) + ' رکورد'; }) +
      donutCard('✍️ ثبت‌کننده‌ها', 'ورود + تولید + ضایعات', userItems, sumUser, function (it) { return it.value + ' رکورد'; }) +
      (dayItems.length ? donutCard('📅 مصرف کیلویی — ' + (periodLabels[mode] || ''), 'مواد کیلویی', dayItems, sumDay, function (it) { return fmtNum(it.value) + ' کیلو'; }) : '') +
      emptyNote +
      '</div>';
  };



  // —— ویژگی‌های هوشمند ——
  const today = todayJalali();
  // مصرف ۳ روز اخیر برای پیش‌بینی
  const recentDays = [...new Set(productions.map(p => p.date).filter(Boolean))].sort().slice(-3);
  const predictRows = stock.map(m => {
    let used = 0;
    recentDays.forEach(d => {
      used += productions.filter(p => p.date === d && p.material_name === m.name)
        .reduce((s, p) => s + Number(p.material_weight || 0), 0);
    });
    const daily = recentDays.length ? used / recentDays.length : 0;
    const cur = Number(m.current_stock || 0);
    let daysLeft = null;
    if (daily > 0.001) daysLeft = Math.round((cur / daily) * 10) / 10;
    return { ...m, dailyAvg: Math.round(daily * 100) / 100, daysLeft };
  }).filter(m => m.daysLeft != null && m.daysLeft <= 5 && m.current_stock > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // ضریب تبدیل: ماده مصرفی / تعداد برای هر محصول
  const convMap = {};
  productions.forEach(p => {
    const key = p.product_name || '—';
    if (!convMap[key]) convMap[key] = { w: 0, q: 0, n: 0, mat: p.material_name };
    convMap[key].w += Number(p.material_weight || 0);
    convMap[key].q += Number(p.quantity || 0);
    convMap[key].n += 1;
  });
  const conversions = Object.entries(convMap).map(([name, v]) => {
    const actual = v.q > 0 ? v.w / v.q : 0;
    const def = products.find(x => x.name === name);
    const expected = def ? Number(def.weight_per_unit || 0) / 1000 : null; // اگر گرم باشد
    // weight_per_unit در سیستم گرم است؛ material_weight کیلو → actual کیلو per unit
    const expectedKg = def && def.weight_per_unit ? Number(def.weight_per_unit) / 1000 : null;
    return {
      name,
      actual: Math.round(actual * 1000) / 1000,
      expected: expectedKg,
      samples: v.n,
      mat: v.mat,
    };
  }).filter(c => c.samples >= 1).sort((a, b) => b.samples - a.samples).slice(0, 8);

  // جدول عملکرد پرسنل — همان بازه نمودار (امروز / این ماه / امسال)
  const perfProds = productions.filter(p => inChartPeriod(p.date, cperiod));
  const board = {};
  perfProds.forEach(p => {
    const n = (p.producer_name || '').trim() || 'بدون نام';
    if (!board[n]) board[n] = { qty: 0, weight: 0, count: 0 };
    board[n].qty += Number(p.quantity || 0);
    board[n].weight += Number(p.material_weight || 0);
    board[n].count += 1;
  });
  const leaderboard = Object.entries(board).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const periodPerfLabel = cperiod === 'day' ? 'امروز' : cperiod === 'month' ? 'این ماه' : 'امسال';
  const todayScores = scores.filter(s => (s.day || s.date) === today);
  const scoreOf = (name) => {
    const rows = todayScores.filter(s => s.personnel_name === name);
    if (!rows.length) return null;
    return rows[rows.length - 1]; // آخرین نمره
  };
  // میانگین نمرات امروز برای نمایش
  const scoreBoard = todayScores.slice().sort((a, b) => Number(b.score) - Number(a.score));


  // برنامه امروز vs واقعی
  const todayPlans = plans.filter(pl => pl.day === today);
  const planVsActual = todayPlans.map(pl => {
    const done = todayProds.filter(p => p.product_name === pl.product_name)
      .reduce((s, p) => s + Number(p.quantity || 0), 0);
    const target = Number(pl.target_qty || 0);
    return {
      product: pl.product_name,
      target,
      done,
      pct: target > 0 ? Math.round((done / target) * 100) : 0,
    };
  });


  const alerts = stock.filter(m => m.status !== 'عادی');
  const alertHtml = alerts.length ? `
    <div class="alert-banner mb-6 fade-in">
      <div class="font-semibold text-amber-300 mb-2">⚠️ هشدار موجودی</div>
      <ul class="text-sm space-y-1">
        ${alerts.map(m => `<li>• <strong>${m.name}</strong>: موجودی ${fmtNum(m.current_stock)} ${m.unit || ''} — <span class="${m.status === 'تمام شد' ? 'text-red-400' : 'text-amber-400'}">${m.status}</span></li>`).join('')}
      </ul>
    </div>` : '';

  return `
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">داشبورد مدیریتی</h1>
        <p class="text-slate-400 text-sm mt-1">خلاصه موجودی و عملکرد • ${todayJalali()}${df || dt ? ' <span class="text-brand-300">(فیلتر تاریخ فعال)</span>' : ''}</p>
      </div>
      <div class="filter-bar glass-card rounded-xl p-2 flex flex-wrap gap-2 items-center">
        <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:120px" />
        <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:120px" />
        <button class="btn-secondary text-sm" onclick="Pages.applyFilter('dashboard')">اعمال</button>
        <button class="btn-ghost text-sm" onclick="Pages.quickDate('dashboard','today')">امروز</button>
        <button class="btn-ghost text-sm" onclick="Pages.clearFilter('dashboard')">پاک</button>
      </div>
    </div>
    ${alertHtml}

    ${predictRows.length ? `
    <div class="glass-card rounded-2xl p-4 mb-6 border border-amber-500/30">
      <h2 class="font-semibold text-amber-300 mb-2">🔮 پیش‌بینی اتمام موجودی (بر اساس میانگین ۳ روز اخیر)</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        ${predictRows.map(m => `
          <div class="bg-slate-800/50 rounded-xl px-3 py-2 flex justify-between gap-2">
            <span class="font-medium truncate">${m.name}</span>
            <span class="${m.daysLeft <= 1 ? 'text-red-400' : 'text-amber-300'} whitespace-nowrap">≈ ${fmtNum(m.daysLeft)} روز دیگر</span>
          </div>
        `).join('')}
      </div>
      <p class="text-[10px] text-slate-500 mt-2">تخمینی است؛ خرید و ضایعات می‌تواند تغییرش دهد.</p>
    </div>` : ''}

    <div class="grid lg:grid-cols-2 gap-6 mb-8">
      <div class="glass-card rounded-2xl p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 class="font-semibold">🏆 عملکرد پرسنل — ${periodPerfLabel}</h2>
          <div class="flex gap-2 flex-wrap">
            ${Auth.isAdmin() ? `<button class="btn-secondary text-xs" onclick="Pages.scoreStaffForm()">نمره‌دهی</button>` : ''}
            <button class="btn-ghost text-xs" onclick="navigate('league')">جدول لیگ</button>
            <button class="btn-ghost text-xs" onclick="Pages.shiftSummary()">خلاصه واتساپ</button>
          </div>
        </div>
        ${leaderboard.length ? `
          <div class="space-y-2 mb-4">
            ${leaderboard.map(([name, s], i) => {
              const sc = scoreOf(name);
              return `
              <div class="flex items-center gap-3 text-sm">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-amber-500 text-slate-900':i===1?'bg-slate-400 text-slate-900':i===2?'bg-amber-800 text-white':'bg-slate-700'}">${i+1}</span>
                <span class="flex-1 font-medium truncate">${name}</span>
                <span class="text-slate-400 text-xs">${s.count} رکورد</span>
                <span class="text-brand-300 font-medium">${fmtNum(s.qty)}</span>
                <span class="text-cyan-300 text-xs">${fmtNum(s.weight)}</span>
                <span class="text-xs ${sc ? (sc.score>=8?'text-brand-300':sc.score>=5?'text-amber-300':'text-red-300') : 'text-slate-600'}">${sc ? ('⭐' + sc.score) : '—'}</span>
              </div>`;
            }).join('')}
          </div>
        ` : `<p class="text-slate-500 text-sm mb-3">در بازه «${periodPerfLabel}» تولیدی با نام تولیدکننده نیست · ${today}</p>`}
        ${scoreBoard.length ? `
          <div class="border-t border-slate-700/50 pt-3 mt-2">
            <div class="text-xs text-slate-400 mb-2">نمرات ثبت‌شده امروز</div>
            ${scoreBoard.map(s => `
              <div class="flex justify-between text-xs mb-1 gap-2">
                <span class="truncate">${s.personnel_name}</span>
                <span class="font-bold ${s.score>=8?'text-brand-300':s.score>=5?'text-amber-300':'text-red-300'}">${s.score}/10</span>
              </div>
              ${s.note ? `<div class="text-[10px] text-slate-500 mb-1 pr-1">«${s.note}»</div>` : ''}
            `).join('')}
          </div>
        ` : (Auth.isAdmin() ? `<p class="text-xs text-slate-500">هنوز نمره‌ای ثبت نشده — دکمه نمره‌دهی</p>` : '')}
      </div>
    </div>

    <div class="glass-card rounded-2xl p-5 mb-8">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 class="font-semibold">📋 برنامه امروز در برابر واقعیت</h2>
          <p class="text-xs text-slate-400">هدف صبح vs تولید ثبت‌شده · ${today}</p>
        </div>
        ${Auth.isAdmin() ? `<button class="btn-secondary text-sm" onclick="Pages.planForm()">+ هدف روزانه</button>` : ''}
      </div>
      ${planVsActual.length ? `
        <div class="space-y-3">
          ${planVsActual.map(r => `
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium">${r.product}</span>
                <span>${fmtNum(r.done)} / ${fmtNum(r.target)} <span class="text-slate-400">(${r.pct}%)</span></span>
              </div>
              <div class="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full ${r.pct>=100?'bg-brand-500':r.pct>=70?'bg-cyan-500':'bg-amber-500'}" style="width:${Math.min(100,r.pct)}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `<p class="text-slate-500 text-sm">هدفی برای امروز تعریف نشده. مدیر می‌تواند هدف بگذارد.</p>`}
    </div>

    ${Auth.isAdmin() ? `
    <div class="glass-card rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
      <div class="flex-1 min-w-[200px]">
        <div class="font-semibold text-sm">🔒 قفل روز (بستن شیفت)</div>
        <div class="text-xs text-slate-400 mt-1">بعد از قفل، ورود/تولید/ضایعات آن تاریخ تغییر یا حذف نمی‌شود</div>
      </div>
      <button class="btn-secondary text-sm" onclick="Pages.lockToday()">قفل امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.unlockToday()">باز کردن قفل امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.showDayLocks()">لیست قفل‌ها</button>
    </div>` : ''}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="stat-card">
        <div class="text-slate-400 text-xs">رکوردهای تولید</div>
        <div class="text-2xl font-bold text-brand-400">${fmtNum(productions.length)}</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">جمع فیلد مصرف *</div>
        <div class="text-2xl font-bold text-cyan-400">${fmtNum(totalWeight)}</div>
        <div class="text-[10px] text-slate-500 mt-1">* کیلو و عدد مخلوط — نمودار را ببینید</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">تعداد محصولات</div>
        <div class="text-2xl font-bold text-violet-400">${fmtNum(totalQty)}</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">رکورد ورود مواد</div>
        <div class="text-2xl font-bold text-amber-400">${fmtNum(entries.length)}</div>
      </div>
    </div>
    ${chartsHtml}
    <div class="grid lg:grid-cols-2 gap-6 mb-8">
      <div class="glass-card rounded-2xl p-5">
        <h2 class="font-semibold mb-4">📦 خلاصه موجودی مواد اولیه</h2>
        <div class="table-wrap max-h-80 overflow-y-auto">
          <table class="data">
            <thead><tr>
              <th>کد</th><th>نام</th><th>واحد</th><th>اولیه</th><th>ورود</th><th>مصرف</th><th>ضایعات</th><th>برگشت</th><th>فعلی</th><th>وضعیت</th>
            </tr></thead>
            <tbody>
              ${stock.map(m => `
                <tr>
                  <td class="text-slate-400">${m.code}</td>
                  <td class="font-medium">${m.name}</td>
                  <td>${m.unit}</td>
                  <td>${fmtNum(m.initial_stock)}</td>
                  <td class="text-brand-300">${fmtNum(m.total_in)}</td>
                  <td class="text-red-300">${fmtNum(m.total_out)}</td>
                  <td class="text-amber-300">${fmtNum(m.total_waste)}</td>
                  <td class="text-cyan-300">${fmtNum(m.total_return)}</td>
                  <td class="font-bold">${fmtNum(m.current_stock)}</td>
                  <td>${statusBadge(m.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-5">
        <h2 class="font-semibold mb-4">👨‍🍳 عملکرد پرسنل</h2>
        <div class="table-wrap max-h-80 overflow-y-auto">
          <table class="data">
            <thead><tr><th>نام</th><th>رکورد</th><th>تعداد</th><th>مصرف</th><th>مدت (دقیقه)</th></tr></thead>
            <tbody>
              ${Object.entries(pStats).sort((a, b) => b[1].count - a[1].count).map(([name, s]) => `
                <tr>
                  <td class="font-medium">${name}</td>
                  <td>${s.count}</td>
                  <td>${fmtNum(s.qty)}</td>
                  <td>${fmtNum(s.weight)}</td>
                  <td>${fmtNum(s.duration)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="glass-card rounded-2xl p-5">
      <h2 class="font-semibold mb-3">آمار سریع ضایعات</h2>
      <p class="text-slate-400 text-sm">تعداد رکورد: <span class="text-white font-medium">${wastes.length}</span> • مجموع فیلد مقدار: <span class="text-amber-300 font-medium">${fmtNum(wastes.reduce((s, w) => s + Number(w.quantity || 0), 0))}</span></p>
    </div>
  `;
};


/* ========== ENTRIES ========== */
Pages.entries = async function () {
  let entries = (await DB.getAll('entries')).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canEntry();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '';
  const dt = params.get('dt') || '';
  const q = params.get('q') || '';
  if (df || dt || q) entries = filterByDateAndSearch(entries, df, dt, q, ['material_name','supplier','invoice_no','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">ورود مواد اولیه</h1>
        <p class="text-slate-400 text-sm">ثبت ورود روزانه به انبار</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showEntryForm()">+ ثبت ورود جدید</button>` : ''}
        ${canEdit ? `<button class="btn-secondary" onclick="Pages.dedupeEntries()">🧹 پاک‌سازی تکراری‌ها</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportEntries()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfEntries()">خروجی PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو..." value="${q}" style="max-width:160px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('entries')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('entries','today')">امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('entries','week')">۷ روز</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('entries')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>ماده اولیه</th><th>مقدار</th><th>تأمین‌کننده</th><th>شماره فاکتور</th><th>ثبت‌کننده</th><th>توضیحات</th>
            ${canEdit ? '<th>عملیات</th>' : ''}
          </tr></thead>
          <tbody>
            ${entries.length ? entries.map(e => `
              <tr>
                <td>${e.date || '—'}</td>
                <td class="font-medium">${e.material_name}</td>
                <td class="text-brand-300">${fmtNum(e.quantity)}</td>
                <td>${e.supplier || '—'}</td>
                <td class="text-slate-400">${e.invoice_no || '—'}</td>
                <td class="text-brand-300 text-xs">${e.created_by || '—'}</td>
                <td class="text-slate-400 text-xs max-w-[200px] truncate">${e.notes || ''}</td>
                ${canEdit ? `<td class="space-x-1 space-x-reverse">
                  <button class="btn-ghost text-xs" onclick="Pages.showEntryForm(${e.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteEntry(${e.id})">حذف</button>
                </td>` : ''}
              </tr>
            `).join('') : '<tr><td colspan="7" class="text-center text-slate-500 py-8">رکوردی یافت نشد</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.applyFilter = function (page) {
  const df = document.getElementById('f-df')?.value || '';
  const dt = document.getElementById('f-dt')?.value || '';
  const q = document.getElementById('f-q')?.value || '';
  const p = new URLSearchParams();
  if (df) p.set('df', df);
  if (dt) p.set('dt', dt);
  if (q) p.set('q', q);
  location.hash = page + (p.toString() ? '?' + p.toString() : '');
  navigate(page);
};

Pages.clearFilter = function (page) {
  location.hash = page;
  navigate(page);
};

Pages.showEntryForm = async function (id) {
  if (!Auth.canEntry() && !id) return;
  if (id && !Auth.canEditDelete()) return toast('فقط مدیر می‌تواند ویرایش کند', 'error');
  const [materials, suppliers] = await Promise.all([
    DB.getAll('materials'),
    DB.getAll('suppliers').catch(() => []),
  ]);
  let item = { date: todayJalali(), material_name: '', quantity: '', supplier: '', invoice_no: '', notes: '' };
  if (id) item = await DB.getById('entries', id) || item;
  const supplierOpts = (suppliers || []).filter(s => s.active !== false && s.active !== 0)
    .map(s => `<option value="${s.name}" ${item.supplier===s.name?'selected':''}>${s.name}</option>`).join('');

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش ورود' : 'ثبت ورود جدید'}</h3>
      <form id="entry-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date', item.date)}</div>
        <div>
          <label class="text-xs text-slate-400">ماده اولیه</label>
          <select name="material_name" class="input-field" required>
            <option value="">انتخاب کنید</option>
            ${materials.map(m => `<option value="${m.name}" ${item.material_name===m.name?'selected':''}>${m.name} (${m.unit})</option>`).join('')}
          </select>
        </div>
        <div><label class="text-xs text-slate-400">مقدار</label><input name="quantity" type="number" step="0.01" class="input-field" value="${item.quantity || ''}" required /></div>
        <div>
          <label class="text-xs text-slate-400">طرف حساب / تأمین‌کننده</label>
          <select name="supplier" class="input-field">
            <option value="">— انتخاب یا خالی —</option>
            ${supplierOpts}
            ${item.supplier && !(suppliers||[]).some(s => s.name === item.supplier) ? `<option value="${item.supplier}" selected>${item.supplier} (قدیمی)</option>` : ''}
          </select>
          <p class="text-[10px] text-slate-500 mt-1">لیست از منوی «طرف حساب» مدیریت می‌شود</p>
        </div>
        <div><label class="text-xs text-slate-400">شماره فاکتور</label><input name="invoice_no" class="input-field" value="${item.invoice_no || ''}" /></div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes || ''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('entry-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.quantity = Number(data.quantity);
      data.created_at = item.created_at || new Date().toISOString();
      if (id) { data.id = id; await DB.put('entries', data); toast('ویرایش شد', 'success'); }
      else { await DB.add('entries', data); toast('ورود ثبت شد', 'success'); }
      closeModal();
      navigate('entries');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.deleteEntry = async function (id) {
  if (!Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  if (!confirmAction('حذف این رکورد ورود؟ این کار برگشت‌ناپذیر است.')) return;
  await DB.remove('entries', id);
  toast('حذف شد', 'success');
  navigate('entries');
};

/** پاک‌سازی ورودهای تکراری: کلید = تاریخ + ماده + مقدار (+ فاکتور اگر باشد) */
Pages.dedupeEntries = async function () {
  if (!Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  try {
    const entries = await DB.getAll('entries');
    if (!entries || entries.length < 2) {
      toast('رکوردی برای مقایسه نیست', 'info');
      return;
    }
    // group by composite key
    const groups = {};
    entries.forEach(e => {
      const qty = Number(e.quantity);
      const key = [
        String(e.date || '').trim(),
        String(e.material_name || '').trim(),
        String(isNaN(qty) ? e.quantity : qty),
        String(e.invoice_no || '').trim(),
      ].join('||');
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    const toRemove = [];
    const samples = [];
    Object.values(groups).forEach(list => {
      if (list.length < 2) return;
      // keep lowest id (oldest), remove the rest
      list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      const keep = list[0];
      const dups = list.slice(1);
      dups.forEach(d => toRemove.push(d));
      samples.push(keep.date + ' · ' + keep.material_name + ' · ' + keep.quantity + ' (×' + list.length + ')');
    });
    if (!toRemove.length) {
      toast('تکراری پیدا نشد ✓', 'success');
      return;
    }
    const preview = samples.slice(0, 8).join('\n') + (samples.length > 8 ? '\n…' : '');
    if (!confirmAction(
      toRemove.length + ' رکورد تکراری پیدا شد.\n' +
      'از هر گروه قدیمی‌ترین نگه داشته می‌شود.\n\n' +
      preview + '\n\nادامه برای حذف نرم تکراری‌ها؟'
    )) return;

    let ok = 0;
    let fail = 0;
    for (const d of toRemove) {
      try {
        await DB.remove('entries', d.id);
        ok++;
      } catch (err) {
        console.error('dedupe remove', d.id, err);
        fail++;
      }
    }
    toast(
      'پاک‌سازی: ' + ok + ' حذف شد' + (fail ? ' · ' + fail + ' خطا' : ''),
      fail ? 'error' : 'success'
    );
    navigate('entries');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در پاک‌سازی', 'error');
  }
};

Pages.exportEntries = async function () {
  const entries = await DB.getAll('entries');
  exportToExcel(entries.map(e => ({
    'تاریخ': e.date, 'ماده اولیه': e.material_name, 'مقدار': e.quantity, 'ثبت‌کننده': e.created_by || '',
    'تأمین‌کننده': e.supplier, 'شماره فاکتور': e.invoice_no, 'توضیحات': e.notes
  })), 'ورود', 'ورود_مواد_اولیه');
};

Pages.pdfEntries = async function () {
  const entries = await DB.getAll('entries');
  exportToPDF('گزارش ورود مواد', [
    { header: 'تاریخ', key: 'date' }, { header: 'ماده', key: 'material_name' },
    { header: 'مقدار', key: 'quantity' }, { header: 'تأمین‌کننده', key: 'supplier' }
  ], entries, 'ورود_مواد');
};

/* ========== WASTES ========== */
Pages.wastes = async function () {
  let wastes = (await DB.getAll('wastes')).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canEntry();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '', dt = params.get('dt') || '', q = params.get('q') || '';
  if (df || dt || q) wastes = filterByDateAndSearch(wastes, df, dt, q, ['material_name','waste_type','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">ثبت ضایعات</h1>
        <p class="text-slate-400 text-sm">چربی، استخوان، آشغال مرغ و ... از وزن موجودی کم می‌شود</p>
      </div>
      <div class="flex gap-2">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showWasteForm()">+ ثبت ضایعات</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportWastes()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfWastes()">PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو..." value="${q}" style="max-width:160px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('wastes')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('wastes','today')">امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('wastes','week')">۷ روز</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('wastes')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>ماده اولیه</th><th>نوع ضایعات</th><th>وزن (کیلو)</th><th>ثبت‌کننده</th><th>یادداشت</th>
            ${canEdit ? '<th>عملیات</th>' : ''}
          </tr></thead>
          <tbody>
            ${wastes.length ? wastes.map(w => `
              <tr>
                <td>${w.date}</td>
                <td class="font-medium">${w.material_name}</td>
                <td><span class="badge badge-warn">${w.waste_type}</span></td>
                <td class="text-amber-300">${fmtNum(w.quantity)}</td>
                <td class="text-brand-300 text-xs">${w.created_by || '—'}</td>
                <td class="text-slate-400 text-xs">${w.notes || ''}</td>
                ${canEdit ? `<td><button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteWaste(${w.id})">حذف</button></td>` : ''}
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">ضایعاتی ثبت نشده</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showWasteForm = async function () {
  if (!Auth.canEntry()) return;
  const materials = await DB.getAll('materials');
  const wasteTypes = ['چربی', 'استخوان', 'آشغال مرغ', 'پوست', 'خونابه', 'سایر'];

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">ثبت ضایعات</h3>
      <form id="waste-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date')}</div>
        <div>
          <label class="text-xs text-slate-400">ماده اولیه مرتبط</label>
          <select name="material_name" class="input-field" required>
            <option value="">انتخاب</option>
            ${materials.map(m => `<option value="${m.name}">${m.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع ضایعات</label>
          <select name="waste_type" class="input-field" required>
            ${wasteTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div><label class="text-xs text-slate-400">وزن ضایعات (کیلوگرم)</label><input name="quantity" type="number" step="0.01" class="input-field" required /></div>
        <div><label class="text-xs text-slate-400">یادداشت</label><textarea name="notes" class="input-field" rows="2"></textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ثبت</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('waste-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(ev.target).entries());
    data.quantity = Number(data.quantity);
    data.created_at = new Date().toISOString();
    await DB.add('wastes', data);
    toast('ضایعات ثبت شد و از موجودی کسر می‌شود', 'success');
    closeModal();
    navigate('wastes');
  };
};

Pages.deleteWaste = async function (id) {
  if (!Auth.canEditDelete()) return;
  if (!confirmAction('حذف این رکورد؟ برگشت‌ناپذیر است.')) return;
  await DB.remove('wastes', id);
  toast('حذف شد', 'success');
  navigate('wastes');
};

Pages.exportWastes = async function () {
  const wastes = await DB.getAll('wastes');
  exportToExcel(wastes.map(w => ({
    'تاریخ': w.date, 'ماده اولیه': w.material_name, 'نوع ضایعات': w.waste_type, 'ثبت‌کننده': w.created_by || '',
    'وزن': w.quantity, 'یادداشت': w.notes
  })), 'ضایعات', 'گزارش_ضایعات');
};

Pages.pdfWastes = async function () {
  const wastes = await DB.getAll('wastes');
  exportToPDF('گزارش ضایعات', [
    { header: 'تاریخ', key: 'date' }, { header: 'ماده', key: 'material_name' },
    { header: 'نوع', key: 'waste_type' }, { header: 'وزن', key: 'quantity' }
  ], wastes, 'ضایعات');
};

/* ========== PRODUCTIONS ========== */
Pages.productions = async function () {
  let list = (await DB.getAll('productions')).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canProduction();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '', dt = params.get('dt') || '', q = params.get('q') || '';
  if (df || dt || q) list = filterByDateAndSearch(list, df, dt, q, ['product_name','material_name','producer_name','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">تولید روزانه</h1>
        <p class="text-slate-400 text-sm">ثبت سیخ‌ها و محصولات تولید شده</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showProdForm()">+ ثبت تولید</button>` : ''}
        ${canEdit ? `<button class="btn-secondary" onclick="Pages.dedupeProductions()">🧹 پاک‌سازی تکراری‌ها</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportProds()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfProds()">PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو محصول/پرسنل..." value="${q}" style="max-width:180px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('productions')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('productions','today')">امروز</button>
      <button class="btn-ghost text-sm" onclick="Pages.quickDate('productions','week')">۷ روز</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('productions')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>محصول</th><th>تعداد</th><th>وزن مصرفی</th><th>ماده اولیه</th><th>تولیدکننده</th><th>ثبت‌کننده</th><th>مدت</th>
            <th>عملیات</th>
          </tr></thead>
          <tbody>
            ${list.length ? list.map(p => `
              <tr>
                <td>${p.date}</td>
                <td class="font-medium">${p.product_name}</td>
                <td>${fmtNum(p.quantity)}</td>
                <td class="text-red-300">${fmtNum(p.material_weight)}</td>
                <td class="text-slate-400">${p.material_name}</td>
                <td>${p.producer_name || '—'}</td>
                <td class="text-brand-300 text-xs">${p.created_by || '—'}</td>
                <td>${p.duration_minutes ? fmtNum(p.duration_minutes) + ' د' : '—'}</td>
                <td class="whitespace-nowrap">
                  <button class="btn-ghost text-xs" onclick="Pages.printProd(${p.id})">فیش</button>
                  ${canEdit ? `
                  <button class="btn-ghost text-xs" onclick="Pages.showProdForm(${p.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteProd(${p.id})">حذف</button>` : ''}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="text-center text-slate-500 py-8">رکوردی نیست</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showProdForm = async function (id) {
  if (!Auth.canProduction() && !id) return;
  if (id && !Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  let item = { date: todayJalali(), product_name: '', quantity: '', material_weight: '', material_name: '', shift_code: '', start_time: '', end_time: '', duration_minutes: '', producer_name: '', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' };
  const [products, personnel, item0] = await Promise.all([
    DB.getAll('products'),
    DB.getAll('personnel'),
    id ? DB.getById('productions', id) : Promise.resolve(null),
  ]);
  if (id) item = item0 || item;

  showModal(`
    <div class="modal" style="max-width:36rem">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش تولید' : 'ثبت تولید جدید'}</h3>
      <form id="prod-form" class="space-y-3 max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date', item.date)}</div>
          <div>
            <label class="text-xs text-slate-400">محصول</label>
            <select name="product_name" id="prod-product" class="input-field" required>
              <option value="">انتخاب</option>
              ${products.filter(p=>p.active!==false && p.name).map(p => `<option value="${p.name}" data-mat="${p.material_name}" data-w="${p.weight_per_unit}" data-rem="${p.remainder_type}" ${item.product_name===p.name?'selected':''}>${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تعداد تولید</label><input name="quantity" id="prod-qty" type="number" step="0.5" class="input-field" value="${item.quantity||''}" required /></div>
          <div><label class="text-xs text-slate-400">وزن مصرفی مواد (کیلو)</label><input name="material_weight" id="prod-weight" type="number" step="0.001" class="input-field" value="${item.material_weight||''}" required /></div>
        </div>
        <div><label class="text-xs text-slate-400">ماده اولیه (خودکار)</label><input name="material_name" id="prod-mat" class="input-field" value="${item.material_name||''}" readonly /></div>
        <div>
          <label class="text-xs text-slate-400">تولیدکننده</label>
          <select name="producer_name" class="input-field">
            <option value="">—</option>
            ${personnel.filter(p=>p.active!==false && (p.team||'executive')==='executive').map(p => `<option value="${p.name}" ${item.producer_name===p.name?'selected':''}>${p.name} (${p.position||''})</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div><label class="text-xs text-slate-400">کد شیفت</label><input name="shift_code" class="input-field" value="${item.shift_code||''}" /></div>
          <div><label class="text-xs text-slate-400">شروع</label><input name="start_time" type="time" class="input-field" value="${item.start_time||''}" /></div>
          <div><label class="text-xs text-slate-400">پایان</label><input name="end_time" type="time" class="input-field" value="${item.end_time||''}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">مدت (دقیقه)</label><input name="duration_minutes" type="number" class="input-field" value="${item.duration_minutes||''}" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تعداد باقیمانده</label><input name="remainder_count" type="number" class="input-field" value="${item.remainder_count||0}" /></div>
          <div><label class="text-xs text-slate-400">وزن باقیمانده (کیلو)</label><input name="remainder_weight" type="number" step="0.001" class="input-field" value="${item.remainder_weight||0}" /></div>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع باقیمانده</label>
          <select name="remainder_type" id="prod-rem" class="input-field">
            <option value="حمل به روز بعد" ${item.remainder_type==='حمل به روز بعد'?'selected':''}>حمل به روز بعد</option>
            <option value="برگشت به مواد" ${item.remainder_type==='برگشت به مواد'?'selected':''}>برگشت به مواد (ثبت خودکار)</option>
          </select>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  const prodSelect = document.getElementById('prod-product');
  const qtyInput = document.getElementById('prod-qty');
  const weightInput = document.getElementById('prod-weight');
  const matInput = document.getElementById('prod-mat');
  const remSelect = document.getElementById('prod-rem');

  function updateFromProduct() {
    const opt = prodSelect.selectedOptions[0];
    if (!opt || !opt.value) return;
    matInput.value = opt.dataset.mat || '';
    remSelect.value = opt.dataset.rem || 'حمل به روز بعد';
    const wpu = Number(opt.dataset.w || 0);
    const qty = Number(qtyInput.value || 0);
    if (qty && wpu) weightInput.value = (qty * wpu / 1000).toFixed(3);
  }
  prodSelect.onchange = updateFromProduct;
  qtyInput.oninput = updateFromProduct;

  document.getElementById('prod-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.quantity = Number(data.quantity);
      data.material_weight = Number(data.material_weight);
      data.duration_minutes = data.duration_minutes ? Number(data.duration_minutes) : null;
      data.remainder_count = Number(data.remainder_count || 0);
      data.remainder_weight = Number(data.remainder_weight || 0);
      data.created_at = item.created_at || new Date().toISOString();
      if (id) {
        data.id = id;
        await DB.updateProductionWithReturn(data);
        toast('ویرایش شد (برگشت خودکار به‌روز شد)', 'success');
      } else {
        await DB.addProductionWithReturn(data);
        toast('تولید ثبت شد' + (data.remainder_type === 'برگشت به مواد' && data.remainder_weight > 0 ? ' + برگشت به مواد' : ''), 'success');
      }
      closeModal();
      navigate('productions');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره تولید', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.printProd = async function (id) {
  const p = await DB.getById('productions', id);
  if (!p) return toast('یافت نشد', 'error');
  printReceipt(p);
};

Pages.deleteProd = async function (id) {
  if (!Auth.canEditDelete()) return;
  if (!confirmAction('حذف این رکورد؟ برگشت‌ناپذیر است.')) return;
  // also remove linked returns
  const returns = await DB.getAll('returns');
  for (const r of returns) if (r.production_id === id) await DB.remove('returns', r.id);
  await DB.remove('productions', id);
  toast('حذف شد', 'success');
  navigate('productions');
};

/** پاک‌سازی تولیدهای تکراری: تاریخ + محصول + تعداد + وزن ماده + تولیدکننده */
Pages.dedupeProductions = async function () {
  if (!Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  try {
    const list = await DB.getAll('productions');
    if (!list || list.length < 2) {
      toast('رکوردی برای مقایسه نیست', 'info');
      return;
    }
    const groups = {};
    list.forEach(p => {
      const qty = Number(p.quantity);
      const w = Number(p.material_weight);
      const key = [
        String(p.date || '').trim(),
        String(p.product_name || '').trim(),
        String(isNaN(qty) ? p.quantity : qty),
        String(isNaN(w) ? p.material_weight : w),
        String(p.producer_name || '').trim(),
        String(p.material_name || '').trim(),
      ].join('||');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    const toRemove = [];
    const samples = [];
    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      g.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      g.slice(1).forEach(d => toRemove.push(d));
      const keep = g[0];
      samples.push(keep.date + ' · ' + keep.product_name + ' · ' + keep.quantity + ' (×' + g.length + ')');
    });
    if (!toRemove.length) {
      toast('تکراری پیدا نشد ✓', 'success');
      return;
    }
    const preview = samples.slice(0, 8).join('\n') + (samples.length > 8 ? '\n…' : '');
    if (!confirmAction(
      toRemove.length + ' رکورد تولید تکراری پیدا شد.\n' +
      'از هر گروه قدیمی‌ترین نگه داشته می‌شود.\n\n' +
      preview + '\n\nادامه برای حذف نرم تکراری‌ها؟'
    )) return;
    let ok = 0, fail = 0;
    for (const d of toRemove) {
      try {
        const returns = await DB.getAll('returns');
        for (const r of returns) {
          if (r.production_id === d.id) {
            try { await DB.remove('returns', r.id); } catch (_) {}
          }
        }
        await DB.remove('productions', d.id);
        ok++;
      } catch (err) {
        console.error('dedupe prod', d.id, err);
        fail++;
      }
    }
    toast('پاک‌سازی تولید: ' + ok + ' حذف شد' + (fail ? ' · ' + fail + ' خطا' : ''), fail ? 'error' : 'success');
    navigate('productions');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در پاک‌سازی', 'error');
  }
};

Pages.exportProds = async function () {
  const list = await DB.getAll('productions');
  exportToExcel(list.map(p => ({
    'تاریخ': p.date, 'محصول': p.product_name, 'تعداد': p.quantity, 'ثبت‌کننده': p.created_by || '',
    'وزن مصرفی': p.material_weight, 'ماده اولیه': p.material_name,
    'شیفت': p.shift_code, 'شروع': p.start_time, 'پایان': p.end_time,
    'مدت': p.duration_minutes, 'تولیدکننده': p.producer_name,
    'باقیمانده تعداد': p.remainder_count, 'وزن باقیمانده': p.remainder_weight,
    'نوع باقیمانده': p.remainder_type, 'توضیحات': p.notes
  })), 'تولید', 'گزارش_تولید_روزانه');
};

Pages.pdfProds = async function () {
  const list = await DB.getAll('productions');
  exportToPDF('گزارش تولید', [
    { header: 'تاریخ', key: 'date' }, { header: 'محصول', key: 'product_name' },
    { header: 'تعداد', key: 'quantity' }, { header: 'وزن', key: 'material_weight' },
    { header: 'تولیدکننده', key: 'producer_name' }
  ], list, 'تولید');
};

/* ========== MATERIALS ========== */
Pages.materials = async function () {
  const stock = await DB.calcStock();
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">مواد اولیه</h1>
        <p class="text-slate-400 text-sm">لیست و موجودی لحظه‌ای</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn-secondary" onclick="Pages.materialPeriodForm()">📦 گزارش بازه</button>
        ${canEdit ? `<button class="btn-primary" onclick="Pages.showMaterialForm()">+ افزودن ماده</button>` : ''}
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>واحد</th><th>واحد فرعی</th><th>موجودی اولیه</th><th>حداقل هشدار</th>
            <th>کل ورود</th><th>کل مصرف</th><th>ضایعات</th><th>برگشت</th><th>موجودی فعلی</th><th>وضعیت</th>
            ${canEdit ? '<th></th>' : ''}
          </tr></thead>
          <tbody>
            ${stock.map(m => `
              <tr>
                <td class="text-slate-400">${m.code}</td>
                <td class="font-medium">${m.name}</td>
                <td>${m.unit}</td>
                <td class="text-slate-400 text-xs">${m.secondary_unit ? (m.secondary_unit + (m.unit_factor ? ' (×' + m.unit_factor + ')' : '')) : '—'}</td>
                <td>${fmtNum(m.initial_stock)}</td>
                <td>${fmtNum(m.min_alert)}</td>
                <td class="text-brand-300">${fmtNum(m.total_in)}</td>
                <td class="text-red-300">${fmtNum(m.total_out)}</td>
                <td class="text-amber-300">${fmtNum(m.total_waste)}</td>
                <td class="text-cyan-300">${fmtNum(m.total_return)}</td>
                <td class="font-bold text-lg">${fmtNum(m.current_stock)}</td>
                <td>${statusBadge(m.status)}</td>
                ${canEdit ? `<td><button class="btn-ghost text-xs" onclick="Pages.showMaterialForm(${m.id})">ویرایش</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showMaterialForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { code: '', name: '', unit: 'کیلوگرم', secondary_unit: '', unit_factor: '', initial_stock: 0, min_alert: 0, description: '', active: true };
  if (id) item = await DB.getById('materials', id) || item;
  else if (typeof nextCode === 'function') item.code = await nextCode('materials', 'M');

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش ماده' : 'افزودن ماده اولیه'}</h3>
      <form id="mat-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">کد (خودکار)</label><input name="code" class="input-field" value="${item.code||''}" required readonly /></div>
          <div><label class="text-xs text-slate-400">واحد اصلی</label><input name="unit" class="input-field" value="${item.unit||'کیلوگرم'}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="${item.name||''}" required /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">واحد فرعی (اختیاری)</label><input name="secondary_unit" class="input-field" value="${item.secondary_unit||''}" placeholder="مثلاً عدد" /></div>
          <div><label class="text-xs text-slate-400">ضریب تبدیل (۱ اصلی = ؟ فرعی)</label><input name="unit_factor" type="number" step="0.01" class="input-field" value="${item.unit_factor||''}" placeholder="مثلاً 10" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">موجودی اولیه</label><input name="initial_stock" type="number" step="0.01" class="input-field" value="${item.initial_stock||0}" /></div>
          <div><label class="text-xs text-slate-400">حداقل هشدار</label><input name="min_alert" type="number" step="0.01" class="input-field" value="${item.min_alert||0}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="description" class="input-field" rows="2">${item.description||''}</textarea></div>
        <p class="text-[10px] text-slate-500">واحد فرعی فقط برای نمایش است و روی محاسبه موجودی تأثیر ندارد.</p>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('mat-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.initial_stock = Number(data.initial_stock);
      data.min_alert = Number(data.min_alert);
      data.unit_factor = data.unit_factor !== '' ? Number(data.unit_factor) : null;
      data.active = 1;
      if (id) { data.id = id; await DB.put('materials', data); }
      else await DB.add('materials', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('materials');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره ماده', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

/* ========== PRODUCTS ========== */
Pages.products = async function () {
  const list = await DB.getAll('products');
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">انواع محصول</h1>
        <p class="text-slate-400 text-sm">تعریف سیخ‌ها و محصولات</p>
      </div>
      ${canEdit ? `<button class="btn-primary" onclick="Pages.showProductForm()">+ افزودن محصول</button>` : ''}
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>وزن واحد (گرم)</th><th>ماده اولیه</th><th>نوع باقیمانده</th>
            ${canEdit ? '<th></th>' : ''}
          </tr></thead>
          <tbody>
            ${list.filter(p=>p.name).map(p => `
              <tr>
                <td class="text-slate-400">${p.code}</td>
                <td class="font-medium">${p.name}</td>
                <td>${fmtNum(p.weight_per_unit)}</td>
                <td>${p.material_name}</td>
                <td><span class="badge ${p.remainder_type==='برگشت به مواد'?'badge-warn':'badge-ok'}">${p.remainder_type}</span></td>
                ${canEdit ? `<td><button class="btn-ghost text-xs" onclick="Pages.showProductForm(${p.id})">ویرایش</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showProductForm = async function (id) {
  if (!Auth.isAdmin()) return;
  const materials = await DB.getAll('materials');
  let item = { code: '', name: '', weight_per_unit: 100, material_name: '', description: '', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true };
  if (id) item = await DB.getById('products', id) || item;
  else if (typeof nextCode === 'function') item.code = await nextCode('products', 'P');

  let hasRecipe = false;
  try {
    const recipes = (await DB.getAll('recipes')) || [];
    hasRecipe = recipes.some(r => r.product_name === item.name);
  } catch (e) {}
  const isMultiDefault = hasRecipe || item.material_name === 'ترکیبی' || !item.material_name;

  showModal(`
    <div class="modal" style="max-width:36rem">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش محصول' : 'افزودن محصول'}</h3>
      <form id="proddef-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">کد (خودکار)</label><input name="code" class="input-field" value="${item.code||''}" required readonly /></div>
          <div><label class="text-xs text-slate-400">وزن هر عدد (گرم)</label><input name="weight_per_unit" type="number" class="input-field" value="${item.weight_per_unit||100}" required /></div>
        </div>
        <div><label class="text-xs text-slate-400">نام محصول</label><input name="name" class="input-field" value="${item.name||''}" required placeholder="مثلاً خورشت قورمه" /></div>
        <div>
          <label class="text-xs text-slate-400">نوع مصرف مواد</label>
          <select id="prod-consume-type" class="input-field">
            <option value="single" ${!isMultiDefault ? 'selected' : ''}>تک‌ماده‌ای (جوجه، کباب، …)</option>
            <option value="multi" ${isMultiDefault ? 'selected' : ''}>چندماده‌ای — دستور ساخت (قورمه، برنج، …)</option>
          </select>
          <p class="text-[10px] text-slate-500 mt-1">چندماده‌ای: بعد از ذخیره از دکمه «دستور» مواد را تعریف کنید. موجودی فقط از روی دستور/تولید کم می‌شود — دوبار کم نمی‌شود.</p>
        </div>
        <div id="prod-single-mat">
          <label class="text-xs text-slate-400">ماده اولیه مصرفی</label>
          <select name="material_name" id="prod-mat-select" class="input-field">
            <option value="">— انتخاب —</option>
            ${materials.filter(m=>m.active!==false&&m.active!==0).map(m => `<option value="${m.name}" ${item.material_name===m.name?'selected':''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع باقیمانده</label>
          <select name="remainder_type" class="input-field">
            <option value="حمل به روز بعد" ${item.remainder_type==='حمل به روز بعد'?'selected':''}>حمل به روز بعد</option>
            <option value="برگشت به مواد" ${item.remainder_type==='برگشت به مواد'?'selected':''}>برگشت به مواد</option>
          </select>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="description" class="input-field" rows="2">${item.description||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  const typeSel = document.getElementById('prod-consume-type');
  const singleBox = document.getElementById('prod-single-mat');
  const matSel = document.getElementById('prod-mat-select');
  function syncType() {
    if (typeSel.value === 'multi') {
      singleBox.style.opacity = '0.5';
      matSel.removeAttribute('required');
    } else {
      singleBox.style.opacity = '1';
      matSel.setAttribute('required', 'required');
    }
  }
  typeSel.onchange = syncType;
  syncType();

  document.getElementById('proddef-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.weight_per_unit = Number(data.weight_per_unit);
      data.active = 1;
      if (typeSel.value === 'multi') {
        data.material_name = data.material_name || 'ترکیبی';
      } else if (!data.material_name) {
        toast('برای محصول تک‌ماده‌ای، ماده را انتخاب کنید', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
        return;
      }
      if (id) { data.id = id; await DB.put('products', data); }
      else await DB.add('products', data);
      toast(typeSel.value === 'multi' ? 'ذخیره شد — از «دستور» مواد را تعریف کنید' : 'ذخیره شد', 'success');
      closeModal();
      navigate('products');
      if (!id && typeSel.value === 'multi' && data.name && typeof Pages.editRecipe === 'function') {
        setTimeout(function () { Pages.editRecipe(data.name); }, 400);
      }
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره محصول', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

/* ========== PERSONNEL ========== */
Pages.personnel = async function () {
  const list = await DB.getAll('personnel');
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">پرسنل تولید</h1>
        <p class="text-slate-400 text-sm">لیست کارکنان آشپزخانه</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary" onclick="Pages.staffReportPrompt()">گزارش کار پرسنل</button>
        ${canEdit ? `<button class="btn-primary" onclick="Pages.showPersonForm()">+ افزودن پرسنل</button>` : ''}
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>سمت</th><th>فعال</th><th></th>
          </tr></thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td class="text-slate-400">${p.code}</td>
                <td class="font-medium">${p.name}</td>
                <td>${p.position || '—'}</td>
                <td>${p.active !== false ? '<span class="badge badge-ok">بله</span>' : '<span class="badge badge-danger">خیر</span>'}</td>
                <td class="space-x-1 space-x-reverse whitespace-nowrap">
                  <button class="btn-ghost text-xs text-brand-300" onclick="Pages.staffReportPrompt('${String(p.name||'').replace(/'/g, "\\'")}')">گزارش کار</button>
                  ${canEdit ? `<button class="btn-ghost text-xs" onclick="Pages.showPersonForm(${p.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deletePerson(${p.id}, '${String(p.name||'').replace(/'/g, "\\'")}')">حذف</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showPersonForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { code: '', name: '', position: '', active: true };
  if (id) item = await DB.getById('personnel', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش پرسنل' : 'افزودن پرسنل'}</h3>
      <form id="person-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="${item.code||''}" required ${id?'readonly':''} /></div>
        <div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="${item.name||''}" required /></div>
        <div><label class="text-xs text-slate-400">سمت</label><input name="position" class="input-field" value="${item.position||''}" /></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('person-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) { data.id = id; await DB.put('personnel', data); }
      else await DB.add('personnel', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('personnel');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره پرسنل', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};


Pages.deletePerson = async function (id, name) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (!confirmAction('پرسنل «' + (name || id) + '» حذف شود؟')) return;
  try {
    await DB.remove('personnel', id);
    toast('پرسنل حذف شد', 'success');
    navigate('personnel');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در حذف پرسنل', 'error');
  }
};



/* ========== SUPPLIERS / طرف حساب ========== */
Pages.suppliers = async function () {
  let list = [];
  try { list = await DB.getAll('suppliers'); } catch (e) { list = []; }
  const canEdit = Auth.isAdmin() || Auth.canEntry();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">طرف حساب / تأمین‌کننده‌ها</h1>
        <p class="text-slate-400 text-sm">برای انتخاب در فرم ورود مواد</p>
      </div>
      <div class="flex gap-2">
        ${canEdit ? `<button class="btn-primary" onclick="Pages.showSupplierForm()">+ افزودن طرف حساب</button>` : ''}
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>تلفن</th><th>توضیح</th><th>فعال</th><th></th>
          </tr></thead>
          <tbody>
            ${list.length ? list.map(s => `
              <tr>
                <td class="text-slate-400">${s.code || '—'}</td>
                <td class="font-medium">${s.name || '—'}</td>
                <td>${s.phone || '—'}</td>
                <td class="text-slate-400 text-sm">${s.notes || '—'}</td>
                <td>${s.active !== false && s.active !== 0 ? '<span class="badge badge-ok">بله</span>' : '<span class="badge badge-danger">خیر</span>'}</td>
                <td class="whitespace-nowrap">
                  ${canEdit ? `<button class="btn-ghost text-xs" onclick="Pages.showSupplierForm(${s.id})">ویرایش</button>
                  ${Auth.isAdmin() ? `<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteSupplier(${s.id})">حذف</button>` : ''}` : ''}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">هنوز طرف حسابی ثبت نشده</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showSupplierForm = async function (id) {
  if (!Auth.isAdmin() && !Auth.canEntry()) return toast('دسترسی ندارید', 'error');
  let item = { code: '', name: '', phone: '', notes: '', active: 1 };
  if (id) item = await DB.getById('suppliers', id) || item;
  else if (typeof nextCode === 'function') item.code = await nextCode('suppliers', 'SP');

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش طرف حساب' : 'افزودن طرف حساب'}</h3>
      <form id="supplier-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="${item.code||''}" required ${id?'readonly':''} placeholder="مثلاً S-010" /></div>
        <div><label class="text-xs text-slate-400">نام / عنوان</label><input name="name" class="input-field" value="${item.name||''}" required placeholder="مثلاً زربال" /></div>
        <div><label class="text-xs text-slate-400">تلفن</label><input name="phone" class="input-field" value="${item.phone||''}" /></div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('supplier-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) { data.id = id; await DB.put('suppliers', data); }
      else await DB.add('suppliers', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('suppliers');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.deleteSupplier = async function (id) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (!confirmAction('این طرف حساب حذف شود؟')) return;
  try {
    await DB.remove('suppliers', id);
    toast('حذف شد', 'success');
    navigate('suppliers');
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};

/* ========== REPORTS ========== */
Pages.reports = async function () {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold">گزارش‌ها و پشتیبان‌گیری</h1>
      <p class="text-slate-400 text-sm">خروجی اکسل / PDF و بک‌آپ کامل سیستم</p>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="glass-card rounded-2xl p-6 space-y-3">
        <h2 class="font-semibold">گزارش‌های اکسل</h2>
        <button class="btn-secondary w-full" onclick="Pages.exportEntries()">📥 گزارش ورود مواد</button>
        <button class="btn-secondary w-full" onclick="Pages.exportProds()">📥 گزارش تولید</button>
        <button class="btn-secondary w-full" onclick="Pages.exportWastes()">📥 گزارش ضایعات</button>
        <button class="btn-secondary w-full" onclick="Pages.exportStock()">📥 گزارش موجودی تفصیلی</button>
        <button class="btn-secondary w-full" onclick="Pages.staffReportPrompt()">👤 گزارش کار یک پرسنل</button>
        <button class="btn-secondary w-full" onclick="Pages.staffMealReportForm()">🍽️ گزارش حضور و غذای پرسنلی</button>
        <button class="btn-secondary w-full" onclick="Pages.staffMealWhatsApp()">📱 واتساپ حضور و غذا (امروز)</button>
        <button class="btn-secondary w-full" onclick="Pages.transferReportForm()">🚚 گزارش ارسال شعبه</button>
        <button class="btn-secondary w-full" onclick="Pages.transferWhatsApp()">📱 واتساپ ارسال شعبه (امروز)</button>
        <button class="btn-secondary w-full" onclick="navigate('stocktake')">📋 انبارگردانی</button>
        <button class="btn-primary w-full" onclick="Pages.materialPeriodForm()">📦 گزارش بازه ماده (ورود تا اتمام)</button>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3">
        <h2 class="font-semibold">گزارش‌های PDF</h2>
        <button class="btn-secondary w-full" onclick="Pages.pdfEntries()">📄 PDF ورود</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfProds()">📄 PDF تولید</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfWastes()">📄 PDF ضایعات</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfStock()">📄 PDF موجودی</button>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2">
        <h2 class="font-semibold">پشتیبان‌گیری کامل (اشتراک بین دستگاه‌ها)</h2>
        <p class="text-sm text-slate-400">تمام داده‌ها به صورت JSON دانلود می‌شود. روی دستگاه دیگر Import کنید تا همگام شود.</p>
        <div class="flex flex-wrap gap-3">
          <button class="btn-primary" onclick="Pages.doBackup()">💾 دانلود پشتیبان کامل</button>
          <label class="btn-secondary cursor-pointer">
            📤 بازیابی از پشتیبان
            <input type="file" accept=".json" class="hidden" onchange="Pages.doRestore(event)" />
          </label>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2">
        <h2 class="font-semibold">📋 سابقه حذف‌ها (ممیزی)</h2>
        <p class="text-xs text-slate-400">چه کسی چه رکوردی را حذف کرده است — فقط مدیر</p>
        <button class="btn-secondary" onclick="Pages.showAuditLog()">نمایش سابقه حذف</button>
        <div id="audit-box" class="hidden mt-3 max-h-96 overflow-y-auto"></div>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2 border border-brand-500/20">
        <h2 class="font-semibold text-brand-300">☁️ همگام‌سازی Cloudflare (real-time)</h2>
        <p class="text-sm text-slate-400 leading-relaxed">
          برای اشتراک لحظه‌ای بین چند دستگاه، Worker و D1 را دیپلوی کنید (پوشه <code class="text-brand-300">workers/</code>).
          سپس آدرس API را اینجا ذخیره کنید. فعلاً داده‌ها محلی (IndexedDB) هستند.
        </p>
        <div class="flex flex-wrap gap-2 items-center">
          <input id="api-url" class="input-field" style="max-width:320px" placeholder="https://kitchen-api.xxx.workers.dev" value="${localStorage.getItem('kitchen_api_url') || ''}" />
          <button class="btn-secondary text-sm" onclick="localStorage.setItem('kitchen_api_url', document.getElementById('api-url').value); toast('آدرس API ذخیره شد','success')">ذخیره آدرس API</button>
        </div>
        <ol class="text-xs text-slate-500 list-decimal list-inside space-y-1 mt-2">
          <li>در Cloudflare یک D1 بسازید و <code>wrangler d1 execute</code> با <code>shared/schema.sql</code> اجرا کنید</li>
          <li><code>cd workers && npx wrangler deploy</code> (database_id را در wrangler.toml بگذارید)</li>
          <li>آدرس Worker را بالا وارد کنید — نسخه بعدی فرانت به‌صورت خودکار از API می‌خواند</li>
        </ol>
      </div>
    </div>
  `;
};

/* ========== گزارش بازه ماده (از ورود تا اتمام) ========== */
Pages.materialPeriodForm = async function () {
  try {
    const materials = await DB.getAll('materials');
    const active = (materials || []).filter(m => m.active !== false && m.active !== 0);
    const today = todayJalali();
    const opts = active.map(m =>
      `<option value="${String(m.name).replace(/"/g, '&quot;')}">${m.name} (${m.unit || ''})</option>`
    ).join('');
    showModal(`
      <div class="modal max-w-md">
        <h3 class="text-lg font-bold mb-2">📦 گزارش بازه ماده</h3>
        <p class="text-xs text-slate-400 mb-4">از تاریخ ورود تا تاریخ اتمام موجودی — ورود، ضایعات، مصرف تولید و ضریب</p>
        <form id="mat-period-form" class="space-y-3">
          <div>
            <label class="text-xs text-slate-400">ماده اولیه</label>
            <select name="material_name" class="input-field" required>
              <option value="">انتخاب کنید</option>
              ${opts}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-slate-400">از تاریخ</label>${jalaliInput('df', today)}</div>
            <div><label class="text-xs text-slate-400">تا تاریخ</label>${jalaliInput('dt', today)}</div>
          </div>
          <p class="text-[10px] text-slate-500">مثال: ورود ۶۰ کیلو سینه → از تاریخ ورود تا روزی که موجودی تموم شد</p>
          <div class="flex gap-2 pt-1">
            <button type="submit" class="btn-primary flex-1">محاسبه گزارش</button>
            <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
          </div>
        </form>
      </div>
    `);
    document.getElementById('mat-period-form').onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const material = String(fd.get('material_name') || '').trim();
      const df = String(fd.get('df') || '').trim();
      const dt = String(fd.get('dt') || '').trim();
      if (!material) return toast('ماده را انتخاب کنید', 'error');
      closeModal();
      await Pages.materialPeriodReport(material, df, dt);
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.materialPeriodReport = async function (material, df, dt) {
  try {
    const [entries, wastes, productions, returns, materials, products] = await Promise.all([
      DB.getAll('entries'),
      DB.getAll('wastes'),
      DB.getAll('productions'),
      DB.getAll('returns'),
      DB.getAll('materials'),
      DB.getAll('products'),
    ]);
    const mat = (materials || []).find(m => m.name === material);
    const unit = (mat && mat.unit) ? mat.unit : 'کیلوگرم';

    const inRange = (date) => {
      if (!date) return false;
      if (df && jalaliCompare(date, df) < 0) return false;
      if (dt && jalaliCompare(date, dt) > 0) return false;
      return true;
    };

    const eR = (entries || []).filter(e => e.material_name === material && inRange(e.date));
    const wR = (wastes || []).filter(w => w.material_name === material && inRange(w.date));
    const pR = (productions || []).filter(p => p.material_name === material && inRange(p.date));
    const rR = (returns || []).filter(r => r.material_name === material && inRange(r.date));

    const totalIn = eR.reduce((s, e) => s + Number(e.quantity || 0), 0);
    const totalWaste = wR.reduce((s, w) => s + Number(w.quantity || 0), 0);
    const totalOut = pR.reduce((s, p) => s + Number(p.material_weight || 0), 0);
    const totalReturn = rR.reduce((s, r) => s + Number(r.return_weight || 0), 0);
    const usable = totalIn - totalWaste + totalReturn;
    const remaining = usable - totalOut;
    const wastePct = totalIn > 0 ? Math.round((totalWaste / totalIn) * 1000) / 10 : 0;
    const yieldPct = totalIn > 0 ? Math.round((totalOut / totalIn) * 1000) / 10 : 0;

    // per product breakdown
    const byProd = {};
    pR.forEach(p => {
      const name = p.product_name || 'نامشخص';
      if (!byProd[name]) byProd[name] = { qty: 0, weight: 0, n: 0 };
      byProd[name].qty += Number(p.quantity || 0);
      byProd[name].weight += Number(p.material_weight || 0);
      byProd[name].n += 1;
    });
    const prodRows = Object.entries(byProd).map(([name, v]) => {
      const def = (products || []).find(x => x.name === name);
      const expected = def && def.weight_per_unit ? Number(def.weight_per_unit) / 1000 : null;
      const actual = v.qty > 0 ? v.weight / v.qty : 0;
      const theoryW = expected != null ? expected * v.qty : null;
      const diffW = theoryW != null ? Math.round((v.weight - theoryW) * 1000) / 1000 : null;
      return {
        name,
        qty: v.qty,
        weight: Math.round(v.weight * 1000) / 1000,
        actual: Math.round(actual * 1000) / 1000,
        expected,
        theoryW: theoryW != null ? Math.round(theoryW * 1000) / 1000 : null,
        diffW,
        n: v.n,
      };
    }).sort((a, b) => b.weight - a.weight);

    // وزن تئوری کل محصولات در برابر وزن ثبت‌شده تولید
    const theoryTotal = prodRows.reduce((s, r) => s + (r.theoryW != null ? r.theoryW : 0), 0);
    const theoryDiff = Math.round((totalOut - theoryTotal) * 1000) / 1000; // مثبت = بیشتر از تعریف مصرف شده
    const stockDiff = Math.round(remaining * 1000) / 1000; // قابل‌مصرف − مصرف تولید

    let company = 'غذای انصار';
    try {
      const local = localStorage.getItem('kitchen_settings');
      if (local) company = JSON.parse(local).company_name || company;
    } catch (_) {}

    const statusColor = remaining <= 0.05 && remaining >= -0.05 ? 'text-brand-300' : remaining < 0 ? 'text-red-400' : 'text-amber-300';
    const statusText = remaining <= 0.05 && remaining >= -0.05 ? 'تقریباً تمام شده ✓' : remaining < 0 ? 'مصرف بیشتر از موجودی ⚠️' : 'هنوز مانده دارد';
    const theoryDiffColor = Math.abs(theoryDiff) < 0.05 ? 'text-brand-300' : theoryDiff > 0 ? 'text-red-400' : 'text-amber-300';
    const theoryDiffText = Math.abs(theoryDiff) < 0.05
      ? 'مطابق تعریف ✓'
      : (theoryDiff > 0 ? 'بیشتر از تعریف مصرف شده ⚠️' : 'کمتر از تعریف ثبت شده');

    const html = `
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">📦 گزارش بازه — ${material}</h1>
          <p class="text-slate-400 text-sm">از ${df || '—'} تا ${dt || '—'} · واحد: ${unit}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-primary text-sm" onclick="Pages.materialPeriodWhatsApp()">📱 کپی واتساپ</button>
          <button class="btn-secondary text-sm" onclick="Pages.materialPeriodForm()">بازه جدید</button>
          <button class="btn-ghost text-sm" onclick="navigate('reports')">بازگشت</button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div class="stat-card"><div class="text-xs text-slate-400">ورود</div><div class="text-xl font-bold text-brand-300">${fmtNum(totalIn)}</div></div>
        <div class="stat-card"><div class="text-xs text-slate-400">ضایعات</div><div class="text-xl font-bold text-amber-300">${fmtNum(totalWaste)}</div><div class="text-[10px] text-slate-500">${wastePct}٪</div></div>
        <div class="stat-card"><div class="text-xs text-slate-400">قابل‌مصرف</div><div class="text-xl font-bold text-cyan-300">${fmtNum(usable)}</div><div class="text-[10px] text-slate-500">ورود − ضایعات + برگشت</div></div>
        <div class="stat-card"><div class="text-xs text-slate-400">مصرف تولید</div><div class="text-xl font-bold text-violet-300">${fmtNum(totalOut)}</div><div class="text-[10px] text-slate-500">وزن ثبت‌شده در تولید</div></div>
      </div>

      <div class="glass-card rounded-2xl p-4 mb-4 border border-brand-500/20">
        <h2 class="font-semibold mb-3">⚖️ اختلاف‌ها (مهم)</h2>
        <div class="grid sm:grid-cols-2 gap-3 text-sm">
          <div class="bg-slate-800/40 rounded-xl p-3">
            <div class="text-xs text-slate-400 mb-1">قابل‌مصرف − مصرف تولید = مانده</div>
            <div class="text-lg font-bold ${statusColor}">${fmtNum(stockDiff)} ${unit}</div>
            <div class="text-xs ${statusColor} mt-1">${statusText}</div>
            <div class="text-[10px] text-slate-500 mt-1">${fmtNum(usable)} − ${fmtNum(totalOut)} = ${fmtNum(stockDiff)}</div>
          </div>
          <div class="bg-slate-800/40 rounded-xl p-3">
            <div class="text-xs text-slate-400 mb-1">مصرف تولید − وزن تئوری محصولات</div>
            <div class="text-lg font-bold ${theoryDiffColor}">${fmtNum(theoryDiff)} ${unit}</div>
            <div class="text-xs ${theoryDiffColor} mt-1">${theoryDiffText}</div>
            <div class="text-[10px] text-slate-500 mt-1">ثبت‌شده ${fmtNum(totalOut)} · تئوری ${fmtNum(theoryTotal)} (تعداد × گرم تعریف)</div>
          </div>
        </div>
        <p class="text-[10px] text-slate-500 mt-3">تئوری = جمع (تعداد هر محصول × وزن تعریف‌شده در محصولات). اگر اختلاف مثبت بزرگ باشد یعنی بیشتر از استاندارد مصرف شده یا ثبت اشتباه است.</p>
      </div>

      <div class="glass-card rounded-2xl p-4 mb-4">
        <div class="flex flex-wrap justify-between gap-2 text-sm">
          <span>برگشت به مواد: <strong class="text-cyan-300">${fmtNum(totalReturn)}</strong></span>
          <span>بازده از ورود: <strong>${fmtNum(yieldPct)}٪</strong></span>
        </div>
      </div>

      <div class="glass-card rounded-2xl p-4 mb-4">
        <h2 class="font-semibold mb-3">محصولات ساخته‌شده از این ماده در بازه</h2>
        ${prodRows.length ? `
          <div class="table-wrap">
            <table class="data text-sm">
              <thead><tr><th>محصول</th><th>تعداد</th><th>وزن ثبت‌شده</th><th>وزن تئوری</th><th>اختلاف</th><th>رکورد</th></tr></thead>
              <tbody>
                ${prodRows.map(r => {
                  const dc = r.diffW == null ? '' : (Math.abs(r.diffW) < 0.02 ? 'text-brand-300' : r.diffW > 0 ? 'text-red-400' : 'text-amber-300');
                  return `
                  <tr>
                    <td class="font-medium">${r.name}</td>
                    <td>${fmtNum(r.qty)}</td>
                    <td class="text-cyan-300">${fmtNum(r.weight)}</td>
                    <td class="text-slate-400">${r.theoryW != null ? fmtNum(r.theoryW) : '—'}</td>
                    <td class="font-bold ${dc}">${r.diffW != null ? ((r.diffW > 0 ? '+' : '') + fmtNum(r.diffW)) : '—'}</td>
                    <td class="text-slate-500">${r.n}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<p class="text-slate-500 text-sm">در این بازه تولیدی از این ماده ثبت نشده</p>`}
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="glass-card rounded-2xl p-4">
          <h2 class="font-semibold mb-2 text-sm">ورودها (${eR.length})</h2>
          <div class="table-wrap max-h-40 overflow-y-auto">
            <table class="data text-xs">
              <thead><tr><th>تاریخ</th><th>مقدار</th><th>تأمین‌کننده</th></tr></thead>
              <tbody>
                ${eR.length ? eR.map(e => `<tr><td>${e.date}</td><td class="text-brand-300">${fmtNum(e.quantity)}</td><td>${e.supplier || '—'}</td></tr>`).join('') : '<tr><td colspan="3" class="text-slate-500">—</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="glass-card rounded-2xl p-4">
          <h2 class="font-semibold mb-2 text-sm">ضایعات (${wR.length})</h2>
          <div class="table-wrap max-h-40 overflow-y-auto">
            <table class="data text-xs">
              <thead><tr><th>تاریخ</th><th>نوع</th><th>مقدار</th></tr></thead>
              <tbody>
                ${wR.length ? wR.map(w => `<tr><td>${w.date}</td><td>${w.waste_type || '—'}</td><td class="text-amber-300">${fmtNum(w.quantity)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-slate-500">—</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // stash for WhatsApp
    window.__matPeriodReport = {
      company, material, unit, df, dt,
      totalIn, totalWaste, usable, totalOut, totalReturn, remaining,
      wastePct, yieldPct, statusText, prodRows, eR, wR,
      theoryTotal, theoryDiff, theoryDiffText, stockDiff,
    };

    const content = document.getElementById('page-content');
    if (content) {
      content.innerHTML = html;
      content.classList.remove('fade-in');
      void content.offsetWidth;
      content.classList.add('fade-in');
    }
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در گزارش', 'error');
  }
};

Pages.materialPeriodWhatsApp = function () {
  const r = window.__matPeriodReport;
  if (!r) return toast('اول گزارش را محاسبه کنید', 'error');
  const lines = [
    '📦 گزارش بازه ماده — ' + r.company,
    'ماده: ' + r.material + ' (' + r.unit + ')',
    'از ' + (r.df || '—') + ' تا ' + (r.dt || '—'),
    '══════════════════',
    'ورود:         ' + r.totalIn,
    'ضایعات:       ' + r.totalWaste + ' (' + r.wastePct + '٪)',
    'قابل‌مصرف:    ' + r.usable,
    'مصرف تولید:   ' + r.totalOut,
    'برگشت:        ' + r.totalReturn,
    '──────────────────',
    '⚖️ اختلاف‌ها:',
    'مانده (قابل‌مصرف − تولید): ' + (r.stockDiff != null ? r.stockDiff : r.remaining) + ' — ' + r.statusText,
    'وزن تئوری محصولات: ' + (r.theoryTotal != null ? r.theoryTotal : '—'),
    'اختلاف تولید با تئوری: ' + (r.theoryDiff != null ? r.theoryDiff : '—') + ' — ' + (r.theoryDiffText || ''),
    '──────────────────',
    'محصولات:',
  ];
  if (r.prodRows && r.prodRows.length) {
    r.prodRows.forEach(p => {
      const d = p.diffW != null ? ((p.diffW > 0 ? '+' : '') + p.diffW) : '—';
      lines.push('• ' + p.name + ': ' + p.qty + ' عدد · ثبت ' + p.weight +
        ' · تئوری ' + (p.theoryW != null ? p.theoryW : '—') + ' · اختلاف ' + d);
    });
  } else {
    lines.push('• تولیدی ثبت نشده');
  }
  lines.push('──────────────────');
  lines.push('تهیه‌شده در ' + new Date().toLocaleString('fa-IR'));
  const text = lines.join('\n');
  showModal(
    '<div class="modal max-w-lg"><h3 class="text-lg font-bold mb-2">📱 گزارش بازه برای واتساپ</h3>' +
    '<textarea id="mat-period-wa" class="input-field font-mono text-xs h-64" readonly></textarea>' +
    '<div class="flex gap-2 mt-3">' +
    '<button type="button" class="btn-primary flex-1" id="btn-copy-mat-period">کپی متن</button>' +
    '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
  );
  const ta = document.getElementById('mat-period-wa');
  if (ta) ta.value = text;
  const btn = document.getElementById('btn-copy-mat-period');
  if (btn) btn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('کپی شد', 'success');
    } catch (_) {
      if (ta) ta.select();
      toast('دستی کپی کنید', 'info');
    }
  };
};

Pages.exportStock = async function () {
  const stock = await DB.calcStock();
  exportToExcel(stock.map(m => ({
    'کد': m.code, 'نام': m.name, 'واحد': m.unit,
    'موجودی اولیه': m.initial_stock, 'کل ورود': m.total_in,
    'کل مصرف': m.total_out, 'ضایعات': m.total_waste,
    'برگشت': m.total_return, 'موجودی فعلی': m.current_stock, 'وضعیت': m.status
  })), 'موجودی', 'گزارش_موجودی_تفصیلی');
};

Pages.pdfStock = async function () {
  const stock = await DB.calcStock();
  exportToPDF('گزارش موجودی', [
    { header: 'کد', key: 'code' }, { header: 'نام', key: 'name' },
    { header: 'فعلی', key: 'current_stock' }, { header: 'وضعیت', key: 'status' }
  ], stock, 'موجودی');
};

Pages.doBackup = async function () {
  const data = await DB.exportAllBackup();
  downloadJSON(data, `kitchen-backup-${new Date().toISOString().slice(0,10)}.json`);
};

Pages.doRestore = async function (ev) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  const file = ev.target.files[0];
  if (!file) return;
  if (!confirmAction('تمام داده‌های فعلی جایگزین می‌شوند. ادامه؟')) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await DB.importBackup(data);
    toast('بازیابی موفق', 'success');
    setTimeout(() => location.reload(), 800);
  } catch (e) {
    toast('فایل نامعتبر', 'error');
  }
};

/* ========== USERS ========== */
Pages.users = async function () {
  if (!Auth.isAdmin()) return '<p class="text-red-400">دسترسی ندارید</p>';
  const users = await DB.getAll('users');

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">مدیریت کاربران</h1>
        <p class="text-slate-400 text-sm">رمز عبور هش‌شده + نقش</p>
      </div>
      <button class="btn-primary" onclick="Pages.showUserForm()">+ کاربر جدید</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>نام کاربری</th><th>نام کامل</th><th>نقش</th><th>فعال</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td class="font-medium">${u.username}</td>
                <td>${u.full_name || '—'}</td>
                <td><span class="badge badge-ok">${u.role === 'admin' ? 'ادمین' : u.role === 'entry' ? 'ثبت ورود' : u.role === 'viewer' ? 'ناظر' : 'ثبت تولید'}</span></td>
                <td>${u.active !== false ? 'بله' : 'خیر'}</td>
                <td class="space-x-1 space-x-reverse whitespace-nowrap">
                  <button class="btn-ghost text-xs" onclick="Pages.showUserForm(${u.id})">ویرایش</button>
                  ${u.username !== 'admin' ? `<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteUser(${u.id}, '${String(u.username).replace(/'/g, "\\'")}')">حذف</button>` : '<span class="text-xs text-slate-500">—</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showUserForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { username: '', password: '', role: 'entry', full_name: '', active: true };
  if (id) item = await DB.getById('users', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
      <form id="user-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">نام کاربری</label><input name="username" class="input-field" value="${item.username||''}" required ${id?'readonly':''} /></div>
        <div><label class="text-xs text-slate-400">رمز عبور ${id?'(خالی = بدون تغییر)':''}</label><input name="password" type="password" class="input-field" value="" ${id?'':'required'} /></div>
        <div><label class="text-xs text-slate-400">نام کامل</label><input name="full_name" class="input-field" value="${item.full_name||''}" /></div>
        <div>
          <label class="text-xs text-slate-400">نقش</label>
          <select name="role" class="input-field">
            <option value="admin" ${item.role==='admin'?'selected':''}>ادمین (دسترسی کامل)</option>
            <option value="entry" ${item.role==='entry'?'selected':''}>ثبت‌کننده ورود</option>
            <option value="production" ${item.role==='production'?'selected':''}>ثبت‌کننده تولید</option>
            <option value="viewer" ${item.role==='viewer'?'selected':''}>ناظر (فقط مشاهده)</option>
          </select>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('user-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) {
        data.id = id;
        // در حالت ابری: رمز خام بفرست تا سرور هش کند؛ اگر خالی = تغییر نده
        if (!data.password) delete data.password;
        await DB.put('users', data);
      } else {
        if (!data.password) throw new Error('رمز عبور الزامی است');
        await DB.add('users', data);
      }
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('users');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره کاربر', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};


Pages.deleteUser = async function (id, username) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (username === 'admin') return toast('کاربر admin قابل حذف نیست', 'error');
  if (!confirmAction('کاربر «' + username + '» حذف شود؟ این کار برگشت‌ناپذیر است.')) return;
  try {
    await DB.remove('users', id);
    toast('کاربر حذف شد', 'success');
    navigate('users');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در حذف کاربر', 'error');
  }
};


Pages.showAuditLog = async function () {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  const box = document.getElementById('audit-box');
  if (!box) return;
  box.classList.remove('hidden');
  box.innerHTML = '<p class="text-slate-400 text-sm">در حال بارگذاری...</p>';
  try {
    const rows = await Api.request('audit');
    if (!rows || !rows.length) {
      box.innerHTML = '<p class="text-slate-500 text-sm">سابقه‌ای ثبت نشده</p>';
      return;
    }
    box.innerHTML = `
      <table class="data text-xs">
        <thead><tr><th>زمان</th><th>عمل</th><th>بخش</th><th>حذف‌کننده</th><th>خلاصه</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td class="whitespace-nowrap">${(r.created_at || '').replace('T', ' ').slice(0, 19)}</td>
              <td>${r.action === 'delete' ? 'حذف' : r.action}</td>
              <td>${r.store_name || '—'}</td>
              <td class="text-brand-300">${r.full_name || r.username || '—'}</td>
              <td class="max-w-[240px] truncate">${r.summary || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    box.innerHTML = '<p class="text-red-400 text-sm">' + (e.message || 'خطا') + '</p>';
  }
};


Pages.quickDate = function (page, mode) {
  const t = todayJalali();
  if (mode === 'today') {
    location.hash = page + '?df=' + encodeURIComponent(t) + '&dt=' + encodeURIComponent(t);
  } else if (mode === 'week') {
    // 7 days back approx (jalali string compare works for same year/month)
    const parts = t.split('/').map(Number);
    let d = parts[2] - 6;
    let m = parts[1];
    let y = parts[0];
    if (d < 1) { d += 30; m -= 1; if (m < 1) { m = 12; y -= 1; } }
    const from = y + '/' + String(m).padStart(2, '0') + '/' + String(Math.max(1, d)).padStart(2, '0');
    location.hash = page + '?df=' + encodeURIComponent(from) + '&dt=' + encodeURIComponent(t);
  } else if (mode === 'clear') {
    location.hash = page;
  }
  navigate(page);
};

/* ========== AUDIT LOG PAGE ========== */
Pages.audit = async function () {
  if (!Auth.isAdmin()) return '<p class="text-red-400">دسترسی ندارید</p>';
  let rows = [];
  try {
    rows = await Api.request('audit');
  } catch (e) {
    return `<div class="mb-6"><h1 class="text-2xl font-bold">لاگ فعالیت</h1>
      <p class="text-amber-400 mt-4">لاگ فقط در حالت ابری (D1) در دسترس است. ${e.message || ''}</p></div>`;
  }
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const q = (params.get('q') || '').toLowerCase();
  if (q) {
    rows = rows.filter(r =>
      String(r.summary || '').toLowerCase().includes(q) ||
      String(r.store_name || '').toLowerCase().includes(q) ||
      String(r.full_name || r.username || '').toLowerCase().includes(q) ||
      String(r.action || '').toLowerCase().includes(q)
    );
  }
  return `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">📜 لاگ فعالیت</h1>
        <p class="text-slate-400 text-sm">تاریخچه حذف‌ها و عملیات مهم (۵۰۰ رکورد اخیر)</p>
      </div>
      <div class="flex gap-2">
        <input id="f-q" class="input-field" placeholder="جستجو..." value="${params.get('q') || ''}" style="max-width:180px" />
        <button class="btn-secondary text-sm" onclick="const q=document.getElementById('f-q').value; location.hash='audit'+(q?'?q='+encodeURIComponent(q):''); navigate('audit')">جستجو</button>
        <button class="btn-ghost text-sm" onclick="location.hash='audit'; navigate('audit')">پاک</button>
      </div>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap max-h-[70vh] overflow-y-auto">
        <table class="data text-xs">
          <thead><tr><th>زمان</th><th>عمل</th><th>بخش</th><th>کاربر</th><th>خلاصه</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td class="whitespace-nowrap text-slate-400">${(r.created_at || '').replace('T',' ').slice(0,19)}</td>
                <td>${r.action === 'delete' ? '<span class="badge badge-danger">حذف</span>' : r.action}</td>
                <td>${r.store_name || '—'}</td>
                <td class="text-brand-300">${r.full_name || r.username || '—'}</td>
                <td class="max-w-[280px] truncate" title="${(r.summary || '').replace(/"/g,'&quot;')}">${r.summary || '—'}</td>
                <td>${r.action === 'delete' && r.store_name && r.record_id ? `<button class="btn-ghost text-xs text-cyan-300" onclick="Pages.restoreSoft('${r.store_name}',${r.record_id})">بازیابی</button>` : ''}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">رکوردی نیست</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.restoreSoft = async function (store, id) {
  if (!Auth.isAdmin()) return;
  if (!confirmAction('بازیابی این رکورد حذف‌شده؟')) return;
  try {
    await Api.request('restore', { method: 'POST', body: JSON.stringify({ store, id }) });
    toast('بازیابی شد', 'success');
    navigate('audit');
  } catch (e) {
    toast(e.message || 'خطا در بازیابی', 'error');
  }
};

/* ========== SETTINGS PAGE ========== */
Pages.settings = async function () {
  if (!Auth.isAdmin()) return '<p class="text-red-400">دسترسی ندارید</p>';
  let s = { company_name: 'غذای انصار', default_min_alert: 5, alert_enabled: true, backup_hint: true };
  try {
    if (window.Api && Api.online !== false) {
      const r = await Api.request('settings');
      if (r) s = { ...s, ...r };
    } else {
      const local = localStorage.getItem('kitchen_settings');
      if (local) s = { ...s, ...JSON.parse(local) };
    }
  } catch (e) {
    const local = localStorage.getItem('kitchen_settings');
    if (local) try { s = { ...s, ...JSON.parse(local) }; } catch (_) {}
  }
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold">⚙️ تنظیمات سیستم</h1>
      <p class="text-slate-400 text-sm">نام کترینگ، هشدارها و پیش‌فرض‌ها</p>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg">
      <form id="settings-form" class="space-y-4">
        <div>
          <label class="text-xs text-slate-400">نام کترینگ / شرکت</label>
          <input name="company_name" class="input-field" value="${(s.company_name || '').replace(/"/g,'&quot;')}" maxlength="80" />
        </div>
        <div>
          <label class="text-xs text-slate-400">حداقل هشدار پیش‌فرض (برای مواد جدید)</label>
          <input name="default_min_alert" type="number" step="0.01" class="input-field" value="${s.default_min_alert ?? 5}" />
        </div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="alert_enabled" ${s.alert_enabled !== false ? 'checked' : ''} class="rounded" />
          فعال بودن هشدار کمبود موجودی
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="backup_hint" ${s.backup_hint !== false ? 'checked' : ''} class="rounded" />
          یادآوری پشتیبان‌گیری در گزارش‌ها
        </label>
        <button type="submit" class="btn-primary w-full">ذخیره تنظیمات</button>
      </form>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg mt-4">
      <h2 class="font-semibold mb-2">اقلام عمومی (ارسال شعبه)</h2>
      <p class="text-sm text-slate-400 mb-3">نوشابه، دوغ، ماست، کره، رب و… برای ارسال به گاردنیا</p>
      <button class="btn-secondary w-full" onclick="Pages.manageGeneralItems()">🧃 مدیریت اقلام عمومی</button>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg mt-4">
      <h2 class="font-semibold mb-2">طرف حساب</h2>
      <p class="text-sm text-slate-400 mb-3">تامین‌کنندگان و طرف‌حساب‌ها از اینجا مدیریت می‌شوند (برای سبک‌ماندن نوار کناری)</p>
      <button class="btn-secondary w-full" onclick="navigate('suppliers')">🤝 مدیریت طرف حساب</button>
    </div>
    <div class="glass-card rounded-2xl p-6 max-w-lg mt-4">
      <h2 class="font-semibold mb-2">ثبت سریع</h2>
      <p class="text-sm text-slate-400 mb-3">میانبر برای ثبت سریع ورود / تولید / ضایعات</p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary text-sm" onclick="Pages.showEntryForm()">+ ورود سریع</button>
        <button class="btn-secondary text-sm" onclick="Pages.showProdForm()">+ تولید سریع</button>
        <button class="btn-secondary text-sm" onclick="Pages.showWasteForm()">+ ضایعات سریع</button>
      </div>
    </div>
  `;
};

// bind settings form after render
const _origNavSettings = typeof navigate === 'function' ? null : null;
(function bindSettingsForm() {
  const obs = new MutationObserver(() => {
    const form = document.getElementById('settings-form');
    if (!form || form.__bound) return;
    form.__bound = true;
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const data = {
        company_name: fd.get('company_name') || 'غذای انصار',
        default_min_alert: Number(fd.get('default_min_alert')) || 5,
        alert_enabled: !!fd.get('alert_enabled'),
        backup_hint: !!fd.get('backup_hint'),
      };
      try {
        localStorage.setItem('kitchen_settings', JSON.stringify(data));
        if (window.Api) {
          try { await Api.request('settings', { method: 'PUT', body: JSON.stringify(data) }); } catch (_) {}
        }
        toast('تنظیمات ذخیره شد', 'success');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.getElementById('page-content');
      if (root) obs.observe(root, { childList: true, subtree: true });
    });
    // also observe now if already loaded
    const root = document.getElementById('page-content');
    if (root) obs.observe(root, { childList: true, subtree: true });
  }
})();


Pages.lockToday = async function () {
  if (!Auth.isAdmin()) return;
  const day = todayJalali();
  if (!confirmAction('قفل کردن تاریخ ' + day + '؟ بعد از آن ورود/تولید/ضایعات این روز قابل تغییر نیست.')) return;
  try {
    await Api.request('day-lock', { method: 'POST', body: JSON.stringify({ day }) });
    toast('روز قفل شد', 'success');
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};

Pages.unlockToday = async function () {
  if (!Auth.isAdmin()) return;
  const day = todayJalali();
  if (!confirmAction('باز کردن قفل ' + day + '؟')) return;
  try {
    await Api.request('day-lock?day=' + encodeURIComponent(day), { method: 'DELETE', body: JSON.stringify({ day }) });
    toast('قفل باز شد', 'success');
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};

Pages.showDayLocks = async function () {
  if (!Auth.isAdmin()) return;
  try {
    const rows = await Api.request('day-locks');
    const html = rows.length ? rows.map(r => `<tr><td>${r.day}</td><td>${r.locked_by||'—'}</td><td>${(r.locked_at||'').slice(0,19)}</td></tr>`).join('') : '<tr><td colspan="3">قفلی نیست</td></tr>';
    showModal(`<div class="modal"><h3 class="text-lg font-bold mb-3">روزهای قفل‌شده</h3>
      <table class="data text-sm"><thead><tr><th>روز</th><th>توسط</th><th>زمان</th></tr></thead><tbody>${html}</tbody></table>
      <button class="btn-secondary mt-3 w-full" onclick="closeModal()">بستن</button></div>`);
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};


Pages.staffReportPrompt = async function (preselectName) {
  try {
    const [personnelRaw, prods] = await Promise.all([
      DB.getAll('personnel'),
      DB.getAll('productions'),
    ]);
    const personnel = (personnelRaw || []).filter(p => p.active !== false && (p.team||'executive')==='executive');
    const names = personnel.map(p => p.name).filter(Boolean);
    prods.forEach(p => {
      if (p.producer_name && !names.includes(p.producer_name)) names.push(p.producer_name);
    });
    names.sort((a, b) => a.localeCompare(b, 'fa'));
    const today = todayJalali();
    const opts = names.map(n => {
      const safe = String(n).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      const sel = preselectName === n ? ' selected' : '';
      return '<option value="' + safe + '"' + sel + '>' + safe + '</option>';
    }).join('');

    showModal(
      '<div class="modal max-w-md">' +
      '<h3 class="text-lg font-bold mb-4">گزارش کار پرسنل</h3>' +
      '<form id="staff-report-form" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">نام پرسنل</label>' +
      '<select name="name" class="input-field" required><option value="">انتخاب کنید</option>' + opts + '</select></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-400">از تاریخ</label><input name="df" class="input-field" value="' + today + '" /></div>' +
      '<div><label class="text-xs text-slate-400">تا تاریخ</label><input name="dt" class="input-field" value="' + today + '" /></div>' +
      '</div>' +
      '<p class="text-xs text-slate-500">برای یک روز، از و تا را یکسان بگذارید.</p>' +
      '<div class="flex gap-2 pt-2">' +
      '<button type="submit" class="btn-primary flex-1">مشاهده و چاپ</button>' +
      '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>' +
      '</div></form></div>'
    );

    document.getElementById('staff-report-form').onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(ev.target).entries());
      if (!fd.name) return toast('پرسنل را انتخاب کنید', 'error');
      closeModal();
      await Pages.printStaffReport(fd.name, fd.df || '', fd.dt || '');
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.printStaffReport = async function (name, df, dt) {
  try {
    let list = await DB.getAll('productions');
    list = list.filter(p => (p.producer_name || '') === name);
    if (df && typeof jalaliCompare === 'function') list = list.filter(p => jalaliCompare(p.date, df) >= 0);
    if (dt && typeof jalaliCompare === 'function') list = list.filter(p => jalaliCompare(p.date, dt) <= 0);
    list.sort((a, b) => String(a.date||'').localeCompare(String(b.date||'')) || (a.id||0) - (b.id||0));

    const sumQty = list.reduce((s, p) => s + Number(p.quantity || 0), 0);
    const sumW = list.reduce((s, p) => s + Number(p.material_weight || 0), 0);
    const sumDur = list.reduce((s, p) => s + Number(p.duration_minutes || 0), 0);
    const rangeLabel = (df && dt) ? (df === dt ? df : df + ' تا ' + dt) : 'همه تاریخ‌ها';
    const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const rows = list.map((p, i) =>
      '<tr><td>' + (i+1) + '</td><td>' + esc(p.date) + '</td><td>' + esc(p.product_name) +
      '</td><td>' + esc(p.quantity) + '</td><td>' + esc(p.material_weight) +
      '</td><td>' + esc(p.material_name) + '</td><td>' + esc(p.shift_code) +
      '</td><td>' + esc(p.duration_minutes) + '</td><td>' + esc(p.notes) + '</td></tr>'
    ).join('');

    const html = '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"/>' +
      '<title>گزارش کار — ' + esc(name) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">' +
      '<style>*{box-sizing:border-box}body{font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;color:#111;padding:16px 20px;font-size:12px}' +
      '.head{text-align:center;margin-bottom:12px;border-bottom:2px solid #0d4d2e;padding-bottom:10px}' +
      '.head img{max-height:56px;margin-bottom:6px}h1{font-size:18px;margin:0 0 4px}.meta{color:#444;font-size:12px;margin:4px 0}' +
      '.sum{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}' +
      '.sum div{background:#f0f7f2;border:1px solid #c5e0d0;border-radius:8px;padding:8px 12px}.sum b{color:#0d4d2e}' +
      'table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:5px 6px;text-align:right}' +
      'th{background:#0d4d2e;color:#fff;font-size:11px}tr:nth-child(even) td{background:#f7f7f7}' +
      '.foot{margin-top:18px;font-size:11px;color:#555;display:flex;justify-content:space-between}' +
      '.sign{margin-top:28px;display:flex;justify-content:space-between}' +
      '.sign div{width:40%;text-align:center;border-top:1px solid #999;padding-top:6px}' +
      '.actions{text-align:center;margin:16px 0}' +
      'button{font-family:inherit;padding:8px 18px;margin:0 4px;border-radius:8px;border:1px solid #0d4d2e;background:#0d4d2e;color:#fff;cursor:pointer}' +
      'button.sec{background:#fff;color:#0d4d2e}' +
      '@media print{.actions{display:none!important}body{padding:0}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
      '</style></head><body>' +
      '<div class="head"><img src="/logo-ansar.png" alt="" onerror="this.style.display=\'none\'"/>' +
      '<h1>گزارش کار پرسنل — غذای انصار</h1>' +
      '<div class="meta">نام: <strong>' + esc(name) + '</strong></div>' +
      '<div class="meta">بازه: ' + esc(rangeLabel) + '</div>' +
      '<div class="meta">تاریخ تهیه: ' + new Date().toLocaleString('fa-IR') + '</div></div>' +
      '<div class="sum">' +
      '<div>تعداد رکورد: <b>' + list.length + '</b></div>' +
      '<div>جمع تعداد تولید: <b>' + sumQty + '</b></div>' +
      '<div>جمع مصرف: <b>' + sumW + '</b></div>' +
      '<div>جمع مدت (دقیقه): <b>' + sumDur + '</b></div></div>' +
      '<table><thead><tr><th>#</th><th>تاریخ</th><th>محصول</th><th>تعداد</th><th>مصرف</th><th>ماده</th><th>شیفت</th><th>مدت</th><th>توضیح</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="9" style="text-align:center">در این بازه رکوردی نیست</td></tr>') +
      '</tbody></table>' +
      '<div class="sign"><div>امضای پرسنل</div><div>امضای مسئول / سرآشپز</div></div>' +
      '<div class="foot"><span>سیستم گردش مواد — غذای انصار</span><span>سوابق تولید</span></div>' +
      '<div class="actions"><button onclick="window.print()">چاپ / ذخیره PDF</button>' +
      '<button class="sec" onclick="window.close()">بستن</button></div></body></html>';

    const w = window.open('', '_blank');
    if (!w) {
      toast('پاپ‌آپ مسدود است — اجازه پاپ‌آپ بدهید', 'error');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast('گزارش باز شد', 'success');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در ساخت گزارش', 'error');
  }
};



Pages.toggleNightMode = function () {
  const on = document.documentElement.classList.toggle('night-shift');
  localStorage.setItem('kitchen_night_shift', on ? '1' : '0');
  toast(on ? 'حالت شیفت شب روشن شد' : 'حالت عادی', 'info');
};


Pages.shiftSummary = async function () {
  try {
    const today = todayJalali();
    const [entries, productions, wastes, stock, allScores0] = await Promise.all([
      DB.getAll('entries'),
      DB.getAll('productions'),
      DB.getAll('wastes'),
      DB.calcStock(),
      DB.getAll('staff_scores').catch(() => []),
    ]);
    const eT = entries.filter(x => x.date === today);
    const pT = productions.filter(x => x.date === today);
    const wT = wastes.filter(x => x.date === today);
    const sumProd = pT.reduce((s, x) => s + Number(x.quantity || 0), 0);
    const sumW = pT.reduce((s, x) => s + Number(x.material_weight || 0), 0);
    const sumWaste = wT.reduce((s, x) => s + Number(x.quantity || 0), 0);
    const alerts = stock.filter(m => m.status !== 'عادی').slice(0, 5);
    const board = {};
    pT.forEach(pr => {
      const n = pr.producer_name || 'نامشخص';
      board[n] = (board[n] || 0) + Number(pr.quantity || 0);
    });
    const top = Object.entries(board).sort((a, b) => b[1] - a[1])[0];
    let scoreRows = ((allScores0 || []).filter(s => s.day === today));
    scoreRows.sort((a, b) => Number(b.score) - Number(a.score));
    const scoreLines = scoreRows.length
      ? scoreRows.map((s, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
          return medal + ' ' + s.personnel_name + ': ' + s.score + '/10' + (s.note ? (' — ' + s.note) : '');
        })
      : ['هنوز نمره‌ای ثبت نشده'];
    // league 30-day snippet for motivation
    let allScores = allScores0 || [];
    const league30 = Pages._buildLeague(allScores, 30);
    const leagueLines = league30.length
      ? league30.slice(0, 8).map(r => {
          const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : (r.rank + '.');
          return medal + ' ' + r.name + ' — ' + r.points + ' امتیاز (میانگین ' + r.avg + ')';
        })
      : ['هنوز جدولی تشکیل نشده'];
    let company = 'غذای انصار';
    try {
      const local = localStorage.getItem('kitchen_settings');
      if (local) company = JSON.parse(local).company_name || company;
    } catch (_) {}
    const lines = [
      '📋 خلاصه شیفت — ' + company,
      'تاریخ: ' + today,
      '——————————',
      'ورود مواد: ' + eT.length + ' رکورد',
      'تولید: ' + pT.length + ' رکورد · تعداد ' + sumProd + ' · مصرف ' + sumW,
      'ضایعات: ' + wT.length + ' رکورد · مقدار ' + sumWaste,
      top ? ('بیشترین تولید امروز: ' + top[0] + ' (' + top[1] + ')') : 'تولید ثبت نشده',
      '——————————',
      '🏅 نمره کاری امروز:',
    ].concat(scoreLines).concat([
      '——————————',
      '🏆 جدول لیگ ۳۰ روزه:',
    ]).concat(leagueLines).concat([
      '——————————',
      'مواد نیازمند توجه:',
    ]).concat(
      alerts.length ? alerts.map(m => '• ' + m.name + ': ' + m.current_stock + ' ' + (m.unit || '') + ' (' + m.status + ')') : ['• مورد بحرانی نیست'],
      ['——————————', 'رقابت سالم = کیفیت بالاتر 💪', 'خسته نباشید 🌿', 'تهیه‌شده در ' + new Date().toLocaleString('fa-IR')]
    );
    const text = lines.join('\n');
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    showModal(
      '<div class="modal max-w-lg"><h3 class="text-lg font-bold mb-2">خلاصه پایان شیفت</h3>' +
      '<p class="text-xs text-slate-400 mb-3">کپی کن و برای مدیر بفرست</p>' +
      '<textarea id="shift-summary-text" class="input-field font-mono text-xs h-56" readonly>' + safe + '</textarea>' +
      '<div class="flex flex-wrap gap-2 mt-3">' +
      '<button type="button" class="btn-primary flex-1" id="btn-copy-shift">کپی متن</button>' +
      '<button type="button" class="btn-secondary" onclick="Pages.printShiftSummary()">چاپ</button>' +
      '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
    document.getElementById('btn-copy-shift').onclick = async function () {
      try {
        await navigator.clipboard.writeText(text);
        toast('کپی شد', 'success');
      } catch (err) {
        document.getElementById('shift-summary-text').select();
        toast('Ctrl+C را بزنید', 'info');
      }
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.printShiftSummary = function () {
  const el = document.getElementById('shift-summary-text');
  if (!el) return;
  const w = window.open('', '_blank');
  if (!w) return toast('پاپ‌آپ مسدود است', 'error');
  w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>خلاصه شیفت</title><style>body{font-family:Tahoma,sans-serif;padding:20px;white-space:pre-wrap;line-height:1.7}</style></head><body>' +
    el.value.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</body></html>');
  w.document.close();
  setTimeout(function () { w.print(); }, 300);
};

Pages.planForm = async function () {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  try {
    const products = await DB.getAll('products');
    const today = todayJalali();
    const opts = products.filter(function (pr) { return pr.active !== false; }).map(function (pr) {
      return '<option value="' + String(pr.name).replace(/"/g, '&quot;') + '">' + pr.name + '</option>';
    }).join('');
    showModal(
      '<div class="modal max-w-md"><h3 class="text-lg font-bold mb-4">هدف تولید روزانه</h3>' +
      '<form id="plan-form" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">تاریخ</label><input name="day" class="input-field" value="' + today + '" required /></div>' +
      '<div><label class="text-xs text-slate-400">محصول</label><select name="product_name" class="input-field" required><option value="">انتخاب</option>' + opts + '</select></div>' +
      '<div><label class="text-xs text-slate-400">تعداد هدف</label><input name="target_qty" type="number" step="0.01" class="input-field" required /></div>' +
      '<div><label class="text-xs text-slate-400">یادداشت</label><input name="notes" class="input-field" /></div>' +
      '<div class="flex gap-2"><button type="submit" class="btn-primary flex-1">ذخیره</button>' +
      '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );
    document.getElementById('plan-form').onsubmit = async function (ev) {
      ev.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(ev.target).entries());
        data.target_qty = Number(data.target_qty);
        await DB.add('daily_plans', data);
        toast('هدف ذخیره شد', 'success');
        closeModal();
        navigate('dashboard');
      } catch (err) {
        toast(err.message || 'خطا', 'error');
      }
    };
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};



/* ========== LEAGUE TABLE (رتبه‌بندی رقابتی پرسنل) ========== */
Pages._buildLeague = function (scores, periodDays) {
  // periodDays: null = all time, number = last N calendar-ish days by jalali string
  const today = todayJalali();
  let filtered = (scores || []).map(s => {
    const day = s.day || s.date || '';
    return Object.assign({}, s, { day: day });
  });
  if (periodDays && periodDays > 0) {
    const parts = today.split('/').map(Number);
    let d = parts[2] - (periodDays - 1);
    let m = parts[1];
    let y = parts[0];
    while (d < 1) { d += 30; m -= 1; if (m < 1) { m = 12; y -= 1; } }
    const from = y + '/' + String(m).padStart(2, '0') + '/' + String(Math.max(1, d)).padStart(2, '0');
    filtered = filtered.filter(s => s.day && jalaliCompare(s.day, from) >= 0 && jalaliCompare(s.day, today) <= 0);
  }
  const map = {};
  filtered.forEach(s => {
    const name = s.personnel_name || 'نامشخص';
    if (!map[name]) map[name] = { name, points: 0, count: 0, scores: [], lastDay: '', lastScore: 0 };
    const sc = Number(s.score) || 0;
    map[name].points += sc;
    map[name].count += 1;
    map[name].scores.push({ day: s.day, score: sc, note: s.note || '' });
    if (!map[name].lastDay || jalaliCompare(s.day, map[name].lastDay) >= 0) {
      map[name].lastDay = s.day;
      map[name].lastScore = sc;
    }
  });
  const rows = Object.values(map).map(r => {
    r.avg = r.count ? Math.round((r.points / r.count) * 10) / 10 : 0;
    // form: last 5 scores chronological
    const sorted = r.scores.slice().sort((a, b) => jalaliCompare(a.day, b.day));
    r.form = sorted.slice(-5).map(x => x.score);
    return r;
  });
  // sort: points desc, then avg desc, then count desc
  rows.sort((a, b) => b.points - a.points || b.avg - a.avg || b.count - a.count);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
};

Pages._prevRankMap = function (scores, periodDays) {
  // rank in previous equal-length window for movement arrows
  if (!periodDays) return {};
  const today = todayJalali();
  const parts = today.split('/').map(Number);
  // end of previous period = day before current window start
  let d = parts[2] - periodDays;
  let m = parts[1];
  let y = parts[0];
  while (d < 1) { d += 30; m -= 1; if (m < 1) { m = 12; y -= 1; } }
  const prevEnd = y + '/' + String(m).padStart(2, '0') + '/' + String(Math.max(1, d)).padStart(2, '0');
  let d2 = d - (periodDays - 1);
  let m2 = m;
  let y2 = y;
  while (d2 < 1) { d2 += 30; m2 -= 1; if (m2 < 1) { m2 = 12; y2 -= 1; } }
  const prevFrom = y2 + '/' + String(m2).padStart(2, '0') + '/' + String(Math.max(1, d2)).padStart(2, '0');
  const prevScores = (scores || []).filter(s =>
    s.day && jalaliCompare(s.day, prevFrom) >= 0 && jalaliCompare(s.day, prevEnd) <= 0
  );
  const prev = Pages._buildLeague(prevScores, null);
  const map = {};
  prev.forEach(r => { map[r.name] = r.rank; });
  return map;
};

Pages.league = async function () {
  let scores = [];
  let productions = [];
  try { scores = (await DB.getAll('staff_scores')) || []; } catch (e) { scores = []; }
  try { productions = (await DB.getAll('productions')) || []; } catch (e) { productions = []; }
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const period = params.get('p') || '30'; // today | 7 | 30 | all
  let periodDays = null;
  let periodLabel = 'کل فصل';
  if (period === 'today') { periodDays = 1; periodLabel = 'امروز'; }
  else if (period === '7') { periodDays = 7; periodLabel = '۷ روز اخیر'; }
  else if (period === '30') { periodDays = 30; periodLabel = '۳۰ روز اخیر'; }
  else { periodDays = null; periodLabel = 'کل فصل'; }

  const table = Pages._buildLeague(scores, periodDays);
  const prevMap = periodDays ? Pages._prevRankMap(scores, periodDays) : {};
  const prodTable = Pages._buildProdPerformance(productions, periodDays);

  const medal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };
  const moveArrow = (name, rank) => {
    if (!prevMap[name]) return '<span class="text-slate-600 text-xs">—</span>';
    const diff = prevMap[name] - rank;
    if (diff > 0) return `<span class="text-brand-400 text-xs font-bold">▲${diff}</span>`;
    if (diff < 0) return `<span class="text-red-400 text-xs font-bold">▼${Math.abs(diff)}</span>`;
    return `<span class="text-slate-500 text-xs">•</span>`;
  };
  const formDots = (form) => {
    if (!form || !form.length) return '—';
    return form.map(s => {
      const c = s >= 8 ? 'text-brand-400' : s >= 5 ? 'text-amber-400' : 'text-red-400';
      return `<span class="${c} font-bold">${s}</span>`;
    }).join(' ');
  };

  return `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">🏆 جدول لیگ پرسنل</h1>
        <p class="text-slate-400 text-sm">رتبه‌بندی رقابتی بر اساس نمرات کاری · ${periodLabel}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        ${Auth.isAdmin() ? `<button class="btn-primary text-sm" onclick="Pages.scoreStaffForm()">+ ثبت نمره</button>` : ''}
        <button class="btn-secondary text-sm" onclick="Pages.leagueWhatsApp('${period}')">📱 خروجی واتساپ</button>
      </div>
    </div>

    <div class="filter-bar glass-card rounded-xl p-2 mb-4 flex flex-wrap gap-2">
      <button class="btn-ghost text-sm ${period==='today'?'text-brand-300':''}" onclick="navigate('league?p=today')">امروز</button>
      <button class="btn-ghost text-sm ${period==='7'?'text-brand-300':''}" onclick="navigate('league?p=7')">۷ روز</button>
      <button class="btn-ghost text-sm ${period==='30'?'text-brand-300':''}" onclick="navigate('league?p=30')">۳۰ روز</button>
      <button class="btn-ghost text-sm ${period==='all'?'text-brand-300':''}" onclick="navigate('league?p=all')">کل فصل</button>
    </div>

    <div class="glass-card rounded-2xl p-4 mb-4">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th class="w-12">رتبه</th>
              <th></th>
              <th>پرسنل</th>
              <th>امتیاز</th>
              <th>میانگین</th>
              <th>تعداد نمره</th>
              <th>فرم اخیر</th>
              <th>آخرین</th>
            </tr>
          </thead>
          <tbody>
            ${table.length ? table.map(r => `
              <tr class="${r.rank<=3 ? 'bg-brand-500/5' : ''}">
                <td class="font-bold text-lg">${medal(r.rank)}</td>
                <td>${moveArrow(r.name, r.rank)}</td>
                <td class="font-medium">${r.name}</td>
                <td class="font-bold text-brand-300 text-lg">${fmtNum(r.points)}</td>
                <td class="${r.avg>=8?'text-brand-300':r.avg>=5?'text-amber-300':'text-red-300'}">${fmtNum(r.avg)}</td>
                <td class="text-slate-400">${r.count}</td>
                <td class="text-xs tracking-wider">${formDots(r.form)}</td>
                <td class="text-xs text-slate-400">${r.lastDay || '—'} · ${r.lastScore}/10</td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="text-center text-slate-500 py-10">هنوز نمره‌ای ثبت نشده — از دکمه نمره‌دهی شروع کن</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="text-[10px] text-slate-500 mt-3">امتیاز = جمع نمرات روزانه · رتبه بر اساس امتیاز (سپس میانگین) · ▲▼ نسبت به دوره قبل</p>
    </div>

    <div class="glass-card rounded-2xl p-4 mb-6 overflow-x-auto">
      <h2 class="font-semibold mb-1">📊 عملکرد تولید پرسنل</h2>
      <p class="text-xs text-slate-400 mb-3">بر اساس فیلد «تولیدکننده» در ثبت تولید · ${periodLabel}</p>
      <table class="data">
        <thead><tr><th>رتبه</th><th>نام</th><th>تعداد تولید</th><th>مصرف (کیلو/واحد)</th><th>رکورد</th><th>مدت (دقیقه)</th></tr></thead>
        <tbody>
          ${prodTable.length ? prodTable.map(r => `
            <tr>
              <td class="font-bold">${r.rank <= 3 ? (r.rank===1?'🥇':r.rank===2?'🥈':'🥉') : r.rank}</td>
              <td class="font-medium">${r.name}</td>
              <td class="text-brand-300 font-bold">${fmtNum(r.qty)}</td>
              <td>${fmtNum(r.weight)}</td>
              <td class="text-slate-400">${r.count}</td>
              <td class="text-slate-400">${fmtNum(r.duration)}</td>
            </tr>`).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">در این بازه تولیدی با نام تولیدکننده ثبت نشده</td></tr>'}
        </tbody>
      </table>
      <p class="text-[10px] text-slate-500 mt-2">اگر خالی است، در ثبت تولید فیلد «نام تولیدکننده» را پر کنید.</p>
    </div>

    ${table.length >= 1 ? `
    <div class="grid sm:grid-cols-3 gap-4">
      <div class="stat-card border border-amber-500/30">
        <div class="text-xs text-amber-300">🥇 صدر جدول</div>
        <div class="text-xl font-bold mt-1">${table[0].name}</div>
        <div class="text-sm text-slate-400">${fmtNum(table[0].points)} امتیاز · میانگین ${fmtNum(table[0].avg)}</div>
      </div>
      ${table[1] ? `<div class="stat-card">
        <div class="text-xs text-slate-400">🥈 دوم</div>
        <div class="text-lg font-bold mt-1">${table[1].name}</div>
        <div class="text-sm text-slate-400">${fmtNum(table[1].points)} امتیاز</div>
      </div>` : ''}
      ${table[2] ? `<div class="stat-card">
        <div class="text-xs text-slate-400">🥉 سوم</div>
        <div class="text-lg font-bold mt-1">${table[2].name}</div>
        <div class="text-sm text-slate-400">${fmtNum(table[2].points)} امتیاز</div>
      </div>` : ''}
    </div>` : ''}
  `;
};

Pages.leagueWhatsApp = async function (period) {
  try {
    let scores = [];
    try { scores = (await DB.getAll('staff_scores')) || []; } catch (e) {}
    period = period || '30';
    let periodDays = null;
    let periodLabel = 'کل فصل';
    if (period === 'today') { periodDays = 1; periodLabel = 'امروز'; }
    else if (period === '7') { periodDays = 7; periodLabel = '۷ روز اخیر'; }
    else if (period === '30') { periodDays = 30; periodLabel = '۳۰ روز اخیر'; }

    const table = Pages._buildLeague(scores, periodDays);
    const prevMap = periodDays ? Pages._prevRankMap(scores, periodDays) : {};
    const medal = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : (r + '.');
    const move = (name, rank) => {
      if (!prevMap[name]) return '';
      const d = prevMap[name] - rank;
      if (d > 0) return ' ▲' + d;
      if (d < 0) return ' ▼' + Math.abs(d);
      return ' •';
    };

    let company = 'غذای انصار';
    try {
      const local = localStorage.getItem('kitchen_settings');
      if (local) company = JSON.parse(local).company_name || company;
    } catch (_) {}

    const lines = [
      '🏆 جدول لیگ پرسنل — ' + company,
      'بازه: ' + periodLabel,
      'تاریخ گزارش: ' + todayJalali(),
      '══════════════════',
    ];
    if (!table.length) {
      lines.push('هنوز نمره‌ای ثبت نشده');
    } else {
      table.forEach(r => {
        lines.push(
          medal(r.rank) + ' ' + r.name + move(r.name, r.rank) +
          '\n   امتیاز: ' + r.points + ' | میانگین: ' + r.avg + ' | نمرات: ' + r.count +
          (r.form && r.form.length ? (' | فرم: ' + r.form.join('-')) : '')
        );
      });
      lines.push('══════════════════');
      lines.push('🥇 قهرمان فعلی: ' + table[0].name + ' با ' + table[0].points + ' امتیاز');
      if (table[1]) lines.push('🥈 ' + table[1].name + ' — ' + table[1].points);
      if (table[2]) lines.push('🥉 ' + table[2].name + ' — ' + table[2].points);
    }
    lines.push('──────────────────');
    lines.push('هر نمره روزانه روی رتبه اثر می‌گذارد 💪');
    lines.push('خسته نباشید — رقابت سالم = کیفیت بالاتر 🌿');

    const text = lines.join('\n');
    showModal(
      '<div class="modal max-w-lg"><h3 class="text-lg font-bold mb-2">📱 گزارش لیگ برای واتساپ</h3>' +
      '<p class="text-xs text-slate-400 mb-3">کپی کن و تو گروه بذار</p>' +
      '<textarea id="league-wa-text" class="input-field font-mono text-xs h-64" readonly></textarea>' +
      '<div class="flex gap-2 mt-3">' +
      '<button type="button" class="btn-primary flex-1" id="btn-copy-league">کپی متن</button>' +
      '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
    const ta = document.getElementById('league-wa-text');
    if (ta) ta.value = text;
    document.getElementById('btn-copy-league').onclick = async function () {
      try {
        await navigator.clipboard.writeText(text);
        toast('کپی شد — برو تو واتساپ پیست کن', 'success');
      } catch (err) {
        if (ta) ta.select();
        toast('Ctrl+C / نگه دار و کپی', 'info');
      }
    };
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا', 'error');
  }
};

Pages.scoreStaffForm = async function () {
  if (!Auth.isAdmin()) return toast('فقط مدیر می‌تواند نمره بدهد', 'error');
  try {
    const today = todayJalali();
    const personnel = (await DB.getAll('personnel')).filter(p => p.active !== false && (p.team||'executive')==='executive');
    const prods = await DB.getAll('productions');
    const names = personnel.map(p => p.name).filter(Boolean);
    prods.filter(p => p.date === today).forEach(p => {
      if (p.producer_name && !names.includes(p.producer_name)) names.push(p.producer_name);
    });
    names.sort((a, b) => a.localeCompare(b, 'fa'));
    const opts = names.map(n => '<option value="' + String(n).replace(/"/g, '&quot;') + '">' + n + '</option>').join('');
    showModal(
      '<div class="modal max-w-md"><h3 class="text-lg font-bold mb-2">نمره کاری روزانه</h3>' +
      '<p class="text-xs text-slate-400 mb-3">از ۱ تا ۱۰ — در خلاصه واتساپ برای پرسنل می‌آید</p>' +
      '<form id="score-form" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">تاریخ</label><input name="day" class="input-field" value="' + today + '" required /></div>' +
      '<div><label class="text-xs text-slate-400">پرسنل</label><select name="personnel_name" class="input-field" required><option value="">انتخاب</option>' + opts + '</select></div>' +
      '<div><label class="text-xs text-slate-400">نمره (۱ تا ۱۰)</label>' +
      '<input name="score" type="number" min="1" max="10" step="1" class="input-field" required placeholder="مثلاً ۸" /></div>' +
      '<div><label class="text-xs text-slate-400">توضیح کوتاه (اختیاری)</label>' +
      '<input name="note" class="input-field" placeholder="دقت بالا / سرعت خوب / ..." maxlength="120" /></div>' +
      '<div class="flex gap-2"><button type="submit" class="btn-primary flex-1">ثبت نمره</button>' +
      '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );
    document.getElementById('score-form').onsubmit = async function (ev) {
      ev.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(ev.target).entries());
        data.score = Number(data.score);
        if (data.score < 1 || data.score > 10) throw new Error('نمره باید بین ۱ و ۱۰ باشد');
        data.scored_by = (Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) || 'مدیر';
        await DB.add('staff_scores', data);
        toast('نمره ثبت شد — جدول لیگ به‌روز شد 🏆', 'success');
        closeModal();
        location.hash = 'league?p=30';
        navigate('league');
      } catch (err) {
        toast(err.message || 'خطا', 'error');
      }
    };
  } catch (e) {
    toast(e.message || 'خطا', 'error');
  }
};


window.Pages = Pages;
