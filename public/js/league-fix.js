/**
 * league-fix.js — رفع خطای لیگ پرسنل
 * Pages._buildProdPerformance is not a function
 */
(function () {
  function jalaliInRange(day, from, today) {
    if (!day) return false;
    if (typeof jalaliCompare === 'function') {
      return jalaliCompare(day, from) >= 0 && jalaliCompare(day, today) <= 0;
    }
    return String(day) >= String(from) && String(day) <= String(today);
  }

  function periodFrom(periodDays) {
    if (!periodDays || periodDays <= 0) return null;
    var today = typeof todayJalali === 'function' ? todayJalali() : '';
    if (!today) return null;
    var parts = today.split('/').map(Number);
    var d = parts[2] - (periodDays - 1);
    var m = parts[1];
    var y = parts[0];
    while (d < 1) {
      d += 30;
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
    }
    return {
      from: y + '/' + String(m).padStart(2, '0') + '/' + String(Math.max(1, d)).padStart(2, '0'),
      today: today
    };
  }

  Pages._buildProdPerformance = function (productions, periodDays) {
    var list = productions || [];
    var range = periodFrom(periodDays);
    if (range) {
      list = list.filter(function (p) {
        return jalaliInRange(p.date || p.day || '', range.from, range.today);
      });
    }
    var map = {};
    list.forEach(function (p) {
      var name = (p.producer_name || p.personnel_name || '').trim() || 'نامشخص';
      if (!map[name]) {
        map[name] = { name: name, qty: 0, weight: 0, count: 0, duration: 0 };
      }
      map[name].qty += Number(p.quantity || 0);
      map[name].weight += Number(p.material_weight || 0);
      map[name].count += 1;
      map[name].duration += Number(p.duration_minutes || 0);
    });
    var rows = Object.keys(map).map(function (k) { return map[k]; });
    rows.sort(function (a, b) {
      if (b.qty !== a.qty) return b.qty - a.qty;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.count - a.count;
    });
    rows.forEach(function (r, i) {
      r.rank = i + 1;
    });
    return rows;
  };

  // اگر navigate گیر کرده بود لودر را ببند
  function hideTeLoader() {
    var el = document.getElementById('te-loader');
    if (el) el.classList.remove('show');
  }
  setInterval(hideTeLoader, 3000);

  console.log('[league-fix] Pages._buildProdPerformance ready');
})();
