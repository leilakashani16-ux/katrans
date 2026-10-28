/**
 * نمایش آخرین قیمت خرید در لیست مواد
 */
(function () {
  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Math.round(Number(n)).toLocaleString('fa-IR');
  }

  var _orig = typeof Pages.materials === 'function' ? Pages.materials : null;

  Pages.materials = async function () {
    var stock = (await DB.calcStock().catch(function () { return []; })) || [];
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    // merge last_buy from materials if stock row missing it
    var byName = {};
    materials.forEach(function (m) { byName[m.name] = m; });
    stock.forEach(function (s) {
      var m = byName[s.name];
      if (m) {
        if (s.last_buy_price == null && m.last_buy_price != null) s.last_buy_price = m.last_buy_price;
        if (!s.last_buy_date && m.last_buy_date) s.last_buy_date = m.last_buy_date;
      }
    });

    var canEdit = Auth.isAdmin();
    var rows = stock.map(function (m) {
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
        '<td>' + (m.unit || '') + '</td>' +
        '<td class="text-emerald-300 text-xs font-medium">' + fmtPrice(m.last_buy_price) + '</td>' +
        '<td class="text-xs text-slate-400">' + (m.last_buy_date || '—') + '</td>' +
        '<td>' + fmtNum(m.initial_stock) + '</td>' +
        '<td class="text-brand-300">' + fmtNum(m.total_in) + '</td>' +
        '<td>' + fmtNum(m.total_out) + '</td>' +
        '<td>' + fmtNum(m.total_waste) + '</td>' +
        '<td class="font-medium">' + fmtNum(m.current_stock) + '</td>' +
        '<td>' + badge + '</td>' +
        (canEdit
          ? '<td><button class="btn-ghost text-xs" onclick="Pages.showMaterialForm && Pages.showMaterialForm(' + m.id + ')">ویرایش</button></td>'
          : '') +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">مواد اولیه</h1>' +
      '<p class="text-slate-400 text-sm">آخرین قیمت خرید · موجودی لحظه‌ای</p></div>' +
      '<div class="flex gap-2 flex-wrap">' +
      (typeof Pages.materialPeriodForm === 'function'
        ? '<button class="btn-secondary" onclick="Pages.materialPeriodForm()">گزارش بازه</button>'
        : '') +
      (canEdit
        ? '<button class="btn-primary" onclick="Pages.showMaterialForm && Pages.showMaterialForm()">+ افزودن ماده</button>'
        : '') +
      '</div></div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr>' +
      '<th>کد</th><th>نام</th><th>واحد</th><th>آخرین قیمت</th><th>تاریخ خرید</th>' +
      '<th>اولیه</th><th>ورود</th><th>مصرف</th><th>ضایعات</th><th>موجودی</th><th>وضعیت</th>' +
      (canEdit ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="12" class="text-center text-slate-500 py-8">خالی</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  // فرم ماده: فیلد قیمت
  var _form = Pages.showMaterialForm;
  Pages.showMaterialForm = async function (id) {
    if (typeof _form === 'function') {
      await _form(id);
      // inject price field if missing
      setTimeout(function () {
        var form = document.getElementById('material-form') || document.querySelector('#modal-root form');
        if (!form || form.querySelector('[name="last_buy_price"]')) return;
        var wrap = document.createElement('div');
        wrap.innerHTML =
          '<label class="text-xs text-slate-400">آخرین قیمت خرید (تومان)</label>' +
          '<input name="last_buy_price" type="number" step="1" min="0" class="input-field" placeholder="مثلاً 880000" />';
        var notes = form.querySelector('[name="notes"], [name="description"], [name="min_alert"]');
        if (notes && notes.parentElement) {
          notes.parentElement.parentElement.insertBefore(wrap, notes.parentElement);
        } else {
          form.insertBefore(wrap, form.lastElementChild);
        }
        if (id) {
          DB.getById('materials', id).then(function (m) {
            if (m && m.last_buy_price != null) {
              var inp = form.querySelector('[name="last_buy_price"]');
              if (inp) inp.value = m.last_buy_price;
            }
          }).catch(function () {});
        }
      }, 100);
      return;
    }
  };

  console.log('[materials-price] last_buy_price column ready');
})();
