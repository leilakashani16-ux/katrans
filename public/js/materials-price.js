/**
 * تب مواد اولیه — فقط نمای انبار (جمع‌ها)
 * کد | نام | واحد | آخرین قیمت | تاریخ آخرین خرید | مجموع ورود | مجموع مصرف | مجموع ضایعات | موجودی لحظه‌ای | وضعیت
 * مبالغ: ریال — به initial_stock دست نمی‌زند
 */
(function () {
  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Math.round(Number(n)).toLocaleString('fa-IR');
  }

  function patchMaterials() {
    if (typeof Pages === 'undefined' || typeof Pages.materials !== 'function') return false;
    if (Pages.materials.__matStockV3) return true;

    Pages.materials = async function () {
      var stock = (await DB.calcStock().catch(function () { return []; })) || [];
      var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
      var byName = {};
      materials.forEach(function (m) {
        byName[m.name] = m;
      });
      stock.forEach(function (s) {
        var m = byName[s.name];
        if (m) {
          if (s.last_buy_price == null && m.last_buy_price != null) s.last_buy_price = m.last_buy_price;
          if (!s.last_buy_date && m.last_buy_date) s.last_buy_date = m.last_buy_date;
          if (s.id == null && m.id != null) s.id = m.id;
        }
      });

      var canEdit = Auth.isAdmin && Auth.isAdmin();
      var rows = stock
        .map(function (m) {
          var badge =
            m.status === 'هشدار'
              ? '<span class="badge badge-warn">هشدار</span>'
              : m.status === 'تمام شد'
                ? '<span class="badge badge-danger">تمام</span>'
                : '<span class="badge badge-ok">عادی</span>';
          return (
            '<tr>' +
            '<td class="text-slate-400 text-xs">' + (m.code || '') + '</td>' +
            '<td class="font-medium">' + (m.name || '') + '</td>' +
            '<td class="text-xs">' + (m.unit || '') + '</td>' +
            '<td class="text-emerald-300 text-xs font-medium">' + fmtPrice(m.last_buy_price) + '</td>' +
            '<td class="text-xs text-slate-400 whitespace-nowrap">' + (m.last_buy_date || '—') + '</td>' +
            '<td class="text-brand-300">' + fmtNum(m.total_in) + '</td>' +
            '<td class="text-red-300">' + fmtNum(m.total_out) + '</td>' +
            '<td class="text-amber-300">' + fmtNum(m.total_waste) + '</td>' +
            '<td class="font-bold">' + fmtNum(m.current_stock) + '</td>' +
            '<td>' + badge + '</td>' +
            (canEdit
              ? '<td><button class="btn-ghost text-xs" onclick="Pages.showMaterialForm && Pages.showMaterialForm(' +
                (m.id || 0) +
                ')">ویرایش</button></td>'
              : '') +
            '</tr>'
          );
        })
        .join('');

      return (
        '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
        '<div><h1 class="text-2xl font-bold">مواد اولیه</h1>' +
        '<p class="text-slate-400 text-sm">موجودی لحظه‌ای · جمع ورود/مصرف/ضایعات · قیمت به ریال</p></div>' +
        '<div class="flex gap-2 flex-wrap">' +
        '<button class="btn-secondary" onclick="Pages.materialPeriodForm && Pages.materialPeriodForm()">📦 گزارش بازه</button>' +
        (canEdit
          ? '<button class="btn-primary" onclick="Pages.showMaterialForm && Pages.showMaterialForm()">+ افزودن ماده</button>'
          : '') +
        '</div></div>' +
        '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
        '<thead><tr>' +
        '<th>کد</th><th>نام</th><th>واحد</th>' +
        '<th>آخرین قیمت (ریال)</th><th>تاریخ آخرین خرید</th>' +
        '<th>مجموع ورود</th><th>مجموع مصرف</th><th>مجموع ضایعات</th>' +
        '<th>موجودی لحظه‌ای</th><th>وضعیت</th>' +
        (canEdit ? '<th></th>' : '') +
        '</tr></thead><tbody>' +
        (rows ||
          '<tr><td colspan="11" class="text-center text-slate-500 py-8">ماده‌ای ثبت نشده</td></tr>') +
        '</tbody></table></div></div>'
      );
    };
    Pages.materials.__matStockV3 = true;

    var _show = Pages.showMaterialForm;
    if (typeof _show === 'function' && !_show.__matPriceHook) {
      Pages.showMaterialForm = async function (id) {
        await _show.apply(this, arguments);
        setTimeout(function () {
          var form =
            document.getElementById('material-form') || document.querySelector('#modal-root form');
          if (!form || form.querySelector('[name="last_buy_price"]')) return;
          var box = document.createElement('div');
          box.className = 'mt-3';
          box.innerHTML =
            '<label class="text-xs text-slate-400">آخرین قیمت خرید (ریال)</label>' +
            '<input name="last_buy_price" type="number" step="1" min="0" class="input-field" placeholder="مثلاً 8800000" />' +
            '<label class="text-xs text-slate-400 mt-2 block">تاریخ آخرین خرید</label>' +
            '<input name="last_buy_date" class="input-field" placeholder="1405/08/01" />';
          form.appendChild(box);
          if (id) {
            DB.getById('materials', id)
              .then(function (m) {
                if (!m) return;
                var p = form.querySelector('[name="last_buy_price"]');
                var d = form.querySelector('[name="last_buy_date"]');
                if (p && m.last_buy_price != null) p.value = m.last_buy_price;
                if (d && m.last_buy_date) d.value = m.last_buy_date;
              })
              .catch(function () {});
          }
        }, 120);
      };
      Pages.showMaterialForm.__matPriceHook = true;
    }
    return true;
  }

  function boot() {
    if (!patchMaterials()) {
      var n = 0;
      var t = setInterval(function () {
        n++;
        if (patchMaterials() || n > 40) clearInterval(t);
      }, 150);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  console.log('[materials-price] v3 stock columns only');
})();
