/**
 * ورود مواد به صورت فاکتور چندردیفی
 * - انباردار (entry): ثبت + ویرایش
 * - حذف: فقط مدیر
 * - قیمت واحد / مبلغ / آخرین قیمت خرید
 * داشبورد و بقیه صفحات دست نخورده می‌مانند
 */
(function () {
  'use strict';

  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }

  function canAddEntry() {
    return typeof Auth !== 'undefined' && Auth.canEntry && Auth.canEntry();
  }
  function canEditEntry() {
    return typeof Auth !== 'undefined' && Auth.canEntry && Auth.canEntry();
  }
  function canDeleteEntry() {
    return typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin();
  }

  function materialOptions(materials, selected) {
    return (materials || [])
      .filter(function (m) {
        return m.active !== false && m.active !== 0;
      })
      .map(function (m) {
        var sel = selected === m.name ? ' selected' : '';
        return (
          '<option value="' +
          String(m.name).replace(/"/g, '&quot;') +
          '"' +
          sel +
          '>' +
          m.name +
          (m.unit ? ' (' + m.unit + ')' : '') +
          (m.last_buy_price ? ' · ' + fmtPrice(m.last_buy_price) + 'ت' : '') +
          '</option>'
        );
      })
      .join('');
  }

  function supplierOptions(suppliers, selected) {
    var opts = (suppliers || [])
      .filter(function (s) {
        return s.active !== false && s.active !== 0;
      })
      .map(function (s) {
        return (
          '<option value="' +
          String(s.name).replace(/"/g, '&quot;') +
          '"' +
          (selected === s.name ? ' selected' : '') +
          '>' +
          s.name +
          '</option>'
        );
      })
      .join('');
    if (selected && !(suppliers || []).some(function (s) { return s.name === selected; })) {
      opts +=
        '<option value="' +
        String(selected).replace(/"/g, '&quot;') +
        '" selected>' +
        selected +
        ' (قدیمی)</option>';
    }
    return opts;
  }

  /* ========== لیست ورودها ========== */
  Pages.entries = async function () {
    var entries = ((await DB.getAll('entries').catch(function () { return []; })) || []).slice();
    entries.sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0);
    });

    var params = new URLSearchParams(location.hash.split('?')[1] || '');
    var df = params.get('df') || '';
    var dt = params.get('dt') || '';
    var q = params.get('q') || '';
    if (df || dt || q) {
      entries = filterByDateAndSearch(entries, df, dt, q, [
        'material_name',
        'supplier',
        'invoice_no',
        'notes',
      ]);
    }

    var rows = entries
      .map(function (e) {
        var ops = '';
        if (canEditEntry()) {
          ops +=
            '<button class="btn-ghost text-xs" onclick="Pages.showEntryForm(' +
            e.id +
            ')">ویرایش</button>';
        }
        if (canDeleteEntry()) {
          ops +=
            '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteEntry(' +
            e.id +
            ')">حذف</button>';
        }
        return (
          '<tr>' +
          '<td>' +
          (e.date || '—') +
          '</td>' +
          '<td class="font-medium">' +
          (e.material_name || '') +
          '</td>' +
          '<td class="text-brand-300">' +
          fmtNum(e.quantity) +
          '</td>' +
          '<td class="text-xs">' +
          fmtPrice(e.unit_price) +
          '</td>' +
          '<td class="text-xs text-emerald-300">' +
          fmtPrice(e.total_price != null ? e.total_price : e.unit_price != null && e.quantity != null ? Number(e.unit_price) * Number(e.quantity) : null) +
          '</td>' +
          '<td>' +
          (e.supplier || '—') +
          '</td>' +
          '<td class="text-slate-400 text-xs">' +
          (e.invoice_no || '—') +
          '</td>' +
          '<td class="text-brand-300 text-xs">' +
          (e.created_by || '—') +
          '</td>' +
          (canEditEntry() || canDeleteEntry()
            ? '<td class="whitespace-nowrap">' + ops + '</td>'
            : '') +
          '</tr>'
        );
      })
      .join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">ورود مواد — فاکتور</h1>' +
      '<p class="text-slate-400 text-sm">ثبت چند قلم در یک فاکتور · قیمت واحد · آخرین خرید</p></div>' +
      '<div class="flex gap-2 flex-wrap">' +
      (canAddEntry()
        ? '<button class="btn-primary" onclick="Pages.showInvoiceForm()">+ فاکتور جدید</button>'
        : '') +
      (canAddEntry()
        ? '<button class="btn-secondary" onclick="Pages.showEntryForm()">+ تک‌قلم</button>'
        : '') +
      (typeof Pages.exportEntries === 'function'
        ? '<button class="btn-secondary" onclick="Pages.exportEntries()">خروجی اکسل</button>'
        : '') +
      '</div></div>' +
      '<div class="filter-bar glass-card rounded-xl p-3 mb-4">' +
      '<input id="f-df" class="input-field" placeholder="از تاریخ" value="' +
      df +
      '" style="max-width:130px" />' +
      '<input id="f-dt" class="input-field" placeholder="تا تاریخ" value="' +
      dt +
      '" style="max-width:130px" />' +
      '<input id="f-q" class="input-field" placeholder="جستجو..." value="' +
      q +
      '" style="max-width:160px" />' +
      '<button class="btn-secondary text-sm" onclick="Pages.applyFilter(\'entries\')">فیلتر</button>' +
      '<button class="btn-ghost text-sm" onclick="Pages.quickDate(\'entries\',\'today\')">امروز</button>' +
      '<button class="btn-ghost text-sm" onclick="Pages.clearFilter(\'entries\')">پاک</button>' +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr>' +
      '<th>تاریخ</th><th>ماده</th><th>مقدار</th><th>فی</th><th>مبلغ</th><th>تأمین‌کننده</th><th>فاکتور</th><th>ثبت‌کننده</th>' +
      (canEditEntry() || canDeleteEntry() ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      (rows ||
        '<tr><td colspan="9" class="text-center text-slate-500 py-8">رکوردی نیست</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  /* ========== فاکتور چندردیفی (ثبت جدید) ========== */
  Pages.showInvoiceForm = async function () {
    if (!canAddEntry()) return toast('دسترسی ندارید', 'error');

    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var suppliers = (await DB.getAll('suppliers').catch(function () { return []; })) || [];
    var matOpts = materialOptions(materials, '');
    var supOpts = supplierOptions(suppliers, '');

    function rowHtml() {
      return (
        '<div class="inv-row grid gap-2 mb-2 p-2 rounded-xl bg-slate-900/40 border border-slate-700/40" style="grid-template-columns: 1.4fr 0.7fr 0.9fr 0.9fr auto;">' +
        '<select class="input-field inv-mat" required><option value="">ماده…</option>' +
        matOpts +
        '</select>' +
        '<input type="number" step="0.001" min="0" class="input-field inv-qty" placeholder="مقدار" required />' +
        '<input type="number" step="1" min="0" class="input-field inv-price" placeholder="فی (تومان)" />' +
        '<input type="text" class="input-field inv-line-total" placeholder="مبلغ" readonly />' +
        '<button type="button" class="btn-ghost text-red-400 inv-remove" title="حذف ردیف">×</button>' +
        '</div>'
      );
    }

    showModal(
      '<div class="modal" style="max-width:640px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-1">🧾 فاکتور ورود مواد</h3>' +
        '<p class="text-xs text-slate-400 mb-3">چند قلم با یک شماره فاکتور · قیمت اختیاری است</p>' +
        '<form id="invoice-form" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label>' +
        '<input name="date" class="input-field" value="' +
        (typeof todayJalali === 'function' ? todayJalali() : '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">شماره فاکتور</label>' +
        '<input name="invoice_no" class="input-field" placeholder="مثلاً F-1405-88" /></div></div>' +
        '<div><label class="text-xs text-slate-400">تأمین‌کننده</label>' +
        '<select name="supplier" class="input-field"><option value="">—</option>' +
        supOpts +
        '</select></div>' +
        '<div><label class="text-xs text-slate-400">اقلام فاکتور</label>' +
        '<div id="inv-rows" class="tf-rows-scroll">' +
        rowHtml() +
        rowHtml() +
        '</div>' +
        '<button type="button" id="inv-add-row" class="btn-secondary text-xs mt-2">+ ردیف</button></div>' +
        '<div><label class="text-xs text-slate-400">توضیحات فاکتور</label>' +
        '<input name="notes" class="input-field" placeholder="اختیاری" /></div>' +
        '<div class="flex justify-between items-center text-sm">' +
        '<span class="text-slate-400">جمع فاکتور</span>' +
        '<span id="inv-sum" class="font-bold text-emerald-300">۰</span></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ثبت فاکتور</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    var rowsEl = document.getElementById('inv-rows');

    function recalc() {
      var sum = 0;
      rowsEl.querySelectorAll('.inv-row').forEach(function (row) {
        var q = Number(row.querySelector('.inv-qty').value) || 0;
        var p = Number(row.querySelector('.inv-price').value) || 0;
        var t = q * p;
        row.querySelector('.inv-line-total').value = t ? t.toLocaleString('fa-IR') : '';
        sum += t;
      });
      var sumEl = document.getElementById('inv-sum');
      if (sumEl) sumEl.textContent = sum ? sum.toLocaleString('fa-IR') + ' تومان' : '۰';
    }

    function bindRow(row) {
      row.querySelector('.inv-qty').oninput = recalc;
      row.querySelector('.inv-price').oninput = recalc;
      row.querySelector('.inv-remove').onclick = function () {
        if (rowsEl.querySelectorAll('.inv-row').length <= 1) {
          return toast('حداقل یک ردیف لازم است', 'error');
        }
        row.remove();
        recalc();
      };
      row.querySelector('.inv-mat').onchange = function () {
        var name = this.value;
        var m = materials.find(function (x) {
          return x.name === name;
        });
        if (m && m.last_buy_price && !row.querySelector('.inv-price').value) {
          row.querySelector('.inv-price').value = m.last_buy_price;
          recalc();
        }
      };
    }

    rowsEl.querySelectorAll('.inv-row').forEach(bindRow);
    document.getElementById('inv-add-row').onclick = function () {
      rowsEl.insertAdjacentHTML('beforeend', rowHtml());
      bindRow(rowsEl.lastElementChild);
    };

    document.getElementById('invoice-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var date = fd.date;
      var supplier = fd.supplier || '';
      var invoice_no = fd.invoice_no || '';
      var notes = fd.notes || '';
      if (!date) return toast('تاریخ را وارد کنید', 'error');

      var lines = [];
      rowsEl.querySelectorAll('.inv-row').forEach(function (row) {
        var material_name = row.querySelector('.inv-mat').value;
        var quantity = Number(row.querySelector('.inv-qty').value);
        var unit_price = row.querySelector('.inv-price').value;
        unit_price = unit_price === '' ? null : Number(unit_price);
        if (!material_name || !(quantity > 0)) return;
        var total_price =
          unit_price != null && !isNaN(unit_price) ? unit_price * quantity : null;
        lines.push({
          date: date,
          material_name: material_name,
          quantity: quantity,
          unit_price: unit_price,
          total_price: total_price,
          supplier: supplier,
          invoice_no: invoice_no,
          notes: notes,
        });
      });

      if (!lines.length) return toast('حداقل یک قلم معتبر وارد کنید', 'error');

      var btn = ev.target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'در حال ثبت...';
      }
      try {
        for (var i = 0; i < lines.length; i++) {
          await DB.add('entries', lines[i]);
        }
        toast(lines.length + ' قلم با موفقیت ثبت شد', 'success');
        closeModal();
        navigate('entries');
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ثبت فاکتور', 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = '💾 ثبت فاکتور';
        }
      }
    };
  };

  /* ========== تک‌قلم / ویرایش ========== */
  Pages.showEntryForm = async function (id) {
    if (!id && !canAddEntry()) return toast('دسترسی ندارید', 'error');
    if (id && !canEditEntry()) return toast('اجازه ویرایش ندارید', 'error');

    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var suppliers = (await DB.getAll('suppliers').catch(function () { return []; })) || [];
    var item = {
      date: typeof todayJalali === 'function' ? todayJalali() : '',
      material_name: '',
      quantity: '',
      unit_price: '',
      total_price: '',
      supplier: '',
      invoice_no: '',
      notes: '',
    };
    if (id) {
      item = (await DB.getById('entries', id)) || item;
    }

    showModal(
      '<div class="modal" style="max-width:480px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-3">' +
        (id ? 'ویرایش قلم ورود' : 'ثبت تک‌قلم') +
        '</h3>' +
        '<form id="entry-form-inv" class="space-y-3" onsubmit="return false;">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label>' +
        '<input name="date" class="input-field" value="' +
        (item.date || '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">ماده</label>' +
        '<select name="material_name" class="input-field" required>' +
        '<option value="">انتخاب…</option>' +
        materialOptions(materials, item.material_name) +
        '</select></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">مقدار</label>' +
        '<input name="quantity" type="number" step="0.001" class="input-field" value="' +
        (item.quantity != null ? item.quantity : '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">فی (تومان)</label>' +
        '<input name="unit_price" type="number" step="1" class="input-field" value="' +
        (item.unit_price != null && item.unit_price !== '' ? item.unit_price : '') +
        '" placeholder="اختیاری" /></div></div>' +
        '<div><label class="text-xs text-slate-400">تأمین‌کننده</label>' +
        '<select name="supplier" class="input-field"><option value="">—</option>' +
        supplierOptions(suppliers, item.supplier) +
        '</select></div>' +
        '<div><label class="text-xs text-slate-400">شماره فاکتور</label>' +
        '<input name="invoice_no" class="input-field" value="' +
        (item.invoice_no || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">توضیحات</label>' +
        '<input name="notes" class="input-field" value="' +
        String(item.notes || '').replace(/"/g, '&quot;') +
        '" /></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    document.getElementById('entry-form-inv').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var quantity = Number(fd.quantity);
      var unit_price =
        fd.unit_price === '' || fd.unit_price == null ? null : Number(fd.unit_price);
      var total_price =
        unit_price != null && !isNaN(unit_price) ? unit_price * quantity : null;
      var data = {
        date: fd.date,
        material_name: fd.material_name,
        quantity: quantity,
        unit_price: unit_price,
        total_price: total_price,
        supplier: fd.supplier || '',
        invoice_no: fd.invoice_no || '',
        notes: fd.notes || '',
      };
      try {
        if (id) {
          data.id = id;
          var existing = (await DB.getById('entries', id)) || {};
          await DB.put('entries', Object.assign({}, existing, data));
          toast('ویرایش شد', 'success');
        } else {
          await DB.add('entries', data);
          toast('ثبت شد', 'success');
        }
        closeModal();
        navigate('entries');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };
  };

  /* ========== حذف فقط مدیر ========== */
  var _origDeleteEntry = Pages.deleteEntry;
  Pages.deleteEntry = async function (id) {
    if (!canDeleteEntry()) {
      return toast('حذف فقط برای مدیر مجاز است', 'error');
    }
    if (typeof _origDeleteEntry === 'function') {
      return _origDeleteEntry(id);
    }
    if (!confirmAction || !confirmAction('این رکورد ورود حذف شود؟')) return;
    try {
      await DB.remove('entries', id);
      toast('حذف شد', 'success');
      navigate('entries');
    } catch (e) {
      toast(e.message || 'خطا', 'error');
    }
  };

  console.log('[invoice-entries] multi-line invoice module loaded');
})();
