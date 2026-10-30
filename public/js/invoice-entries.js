/**
 * ورود مواد — فاکتور
 * جدول: کد | نام | واحد | مقدار اولیه | فی | مبلغ | ضایعات | قیمت تمام‌شده | شماره فاکتور | ثبت‌کننده
 * قیمت تمام‌شده = فی ÷ (۱ − درصدضایعات)  وقتی ضایعات وارد شده باشد
 * مبالغ: ریال
 */
(function () {
  'use strict';

  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Math.round(Number(n)).toLocaleString('fa-IR');
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

  /** قیمت تمام‌شده هر واحد قابل‌مصرف */
  function finishedUnitPrice(unitPrice, qty, wasteQty) {
    var p = Number(unitPrice);
    var q = Number(qty);
    var w = Number(wasteQty) || 0;
    if (!isFinite(p) || p <= 0) return null;
    if (!isFinite(q) || q <= 0) return p;
    if (w <= 0) return p;
    if (w >= q) return null;
    var pct = (w / q) * 100;
    return p / (1 - pct / 100);
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
          ' data-code="' +
          String(m.code || '').replace(/"/g, '&quot;') +
          '" data-unit="' +
          String(m.unit || '').replace(/"/g, '&quot;') +
          '">' +
          m.name +
          (m.unit ? ' (' + m.unit + ')' : '') +
          (m.last_buy_price ? ' · ' + fmtPrice(m.last_buy_price) + 'ر' : '') +
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

  /* ========== لیست ========== */
  Pages.entries = async function () {
    var entries = ((await DB.getAll('entries').catch(function () { return []; })) || []).slice();
    var materials = ((await DB.getAll('materials').catch(function () { return []; })) || []);
    var matByName = {};
    materials.forEach(function (m) {
      matByName[m.name] = m;
    });

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
        var mat = matByName[e.material_name] || {};
        var qty = Number(e.quantity) || 0;
        var waste = e.waste_qty != null && e.waste_qty !== '' ? Number(e.waste_qty) : 0;
        var unitP = e.unit_price != null ? Number(e.unit_price) : null;
        var amount =
          e.total_price != null
            ? Number(e.total_price)
            : unitP != null && qty
              ? unitP * qty
              : null;
        var fin = finishedUnitPrice(unitP, qty, waste);

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
          '<td class="text-slate-400 text-xs">' + (mat.code || '—') + '</td>' +
          '<td class="font-medium">' + (e.material_name || '') + '</td>' +
          '<td class="text-xs">' + (mat.unit || '—') + '</td>' +
          '<td class="text-brand-300">' + fmtNum(qty) + '</td>' +
          '<td class="text-xs">' + fmtPrice(unitP) + '</td>' +
          '<td class="text-xs text-emerald-300">' + fmtPrice(amount) + '</td>' +
          '<td class="text-amber-300 text-xs">' + (waste > 0 ? fmtNum(waste) : '—') + '</td>' +
          '<td class="text-cyan-300 text-xs font-semibold">' + fmtPrice(fin) + '</td>' +
          '<td class="text-slate-400 text-xs">' + (e.invoice_no || '—') + '</td>' +
          '<td class="text-brand-300 text-xs">' + (e.created_by || '—') + '</td>' +
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
      '<p class="text-slate-400 text-sm">مقدار فاکتور · ضایعات · قیمت تمام‌شده (ریال)</p></div>' +
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
      '<div class="glass-card rounded-xl p-3 mb-3 text-[11px] text-slate-400">' +
      '<strong class="text-slate-300">قیمت تمام‌شده:</strong> فی ÷ (۱ − درصد ضایعات) · اگر ضایعات خالی باشد = همان فی · مبالغ ریال' +
      '</div>' +
      '<div class="filter-bar glass-card rounded-xl p-3 mb-4">' +
      '<input id="f-df" class="input-field" placeholder="از تاریخ" value="' + df + '" style="max-width:130px" />' +
      '<input id="f-dt" class="input-field" placeholder="تا تاریخ" value="' + dt + '" style="max-width:130px" />' +
      '<input id="f-q" class="input-field" placeholder="جستجو..." value="' + q + '" style="max-width:160px" />' +
      '<button class="btn-secondary text-sm" onclick="Pages.applyFilter(\'entries\')">فیلتر</button>' +
      '<button class="btn-ghost text-sm" onclick="Pages.quickDate(\'entries\',\'today\')">امروز</button>' +
      '<button class="btn-ghost text-sm" onclick="Pages.clearFilter(\'entries\')">پاک</button>' +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr>' +
      '<th>کد</th><th>نام</th><th>واحد</th><th>مقدار اولیه</th><th>فی (ریال)</th><th>مبلغ (ریال)</th>' +
      '<th>ضایعات</th><th>قیمت تمام‌شده (ریال)</th><th>شماره فاکتور</th><th>ثبت‌کننده</th>' +
      (canEditEntry() || canDeleteEntry() ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      (rows ||
        '<tr><td colspan="11" class="text-center text-slate-500 py-8">رکوردی نیست</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  /* ========== فاکتور چندردیفی ========== */
  Pages.showInvoiceForm = async function () {
    if (!canAddEntry()) return toast('دسترسی ندارید', 'error');

    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var suppliers = (await DB.getAll('suppliers').catch(function () { return []; })) || [];
    var matOpts = materialOptions(materials, '');
    var supOpts = supplierOptions(suppliers, '');

    function rowHtml() {
      return (
        '<div class="inv-row grid gap-2 mb-2 p-2 rounded-xl bg-slate-900/40 border border-slate-700/40" style="grid-template-columns: 1.3fr 0.6fr 0.7fr 0.55fr 0.8fr auto;">' +
        '<select class="input-field inv-mat" required><option value="">ماده…</option>' + matOpts + '</select>' +
        '<input type="number" step="0.001" min="0" class="input-field inv-qty" placeholder="مقدار" required />' +
        '<input type="number" step="1" min="0" class="input-field inv-price" placeholder="فی ریال" />' +
        '<input type="number" step="0.001" min="0" class="input-field inv-waste" placeholder="ضایعات" />' +
        '<input type="text" class="input-field inv-line-total" placeholder="مبلغ" readonly />' +
        '<button type="button" class="btn-ghost text-red-400 inv-remove" title="حذف ردیف">×</button>' +
        '</div>'
      );
    }

    showModal(
      '<div class="modal" style="max-width:720px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-1">🧾 فاکتور ورود مواد</h3>' +
        '<p class="text-xs text-slate-400 mb-3">مقدار · فی · ضایعات · مبلغ به ریال</p>' +
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
        '<div><label class="text-xs text-slate-400">اقلام</label>' +
        '<div id="inv-rows" class="tf-rows-scroll">' + rowHtml() + rowHtml() + '</div>' +
        '<button type="button" id="inv-add-row" class="btn-secondary text-xs mt-2">+ ردیف</button></div>' +
        '<div><label class="text-xs text-slate-400">توضیحات</label>' +
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
      if (sumEl) sumEl.textContent = sum ? sum.toLocaleString('fa-IR') + ' ریال' : '۰';
    }

    rowsEl.addEventListener('input', recalc);
    rowsEl.addEventListener('click', function (ev) {
      if (ev.target.classList.contains('inv-remove')) {
        var row = ev.target.closest('.inv-row');
        if (rowsEl.querySelectorAll('.inv-row').length > 1) row.remove();
        recalc();
      }
    });
    document.getElementById('inv-add-row').onclick = function () {
      rowsEl.insertAdjacentHTML('beforeend', rowHtml());
    };

    document.getElementById('invoice-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var date = fd.date;
      var invoice_no = fd.invoice_no || '';
      var supplier = fd.supplier || '';
      var notes = fd.notes || '';
      var who =
        (window.Auth && Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) ||
        '';
      var lines = [];
      rowsEl.querySelectorAll('.inv-row').forEach(function (row) {
        var material_name = row.querySelector('.inv-mat').value;
        var quantity = Number(row.querySelector('.inv-qty').value);
        var unit_price = row.querySelector('.inv-price').value;
        unit_price = unit_price === '' ? null : Number(unit_price);
        var waste_raw = row.querySelector('.inv-waste').value;
        var waste_qty = waste_raw === '' ? null : Number(waste_raw);
        if (!material_name || !quantity) return;
        var total_price =
          unit_price != null && !isNaN(unit_price) ? unit_price * quantity : null;
        lines.push({
          date: date,
          material_name: material_name,
          quantity: quantity,
          unit_price: unit_price,
          total_price: total_price,
          waste_qty: waste_qty,
          supplier: supplier,
          invoice_no: invoice_no,
          notes: notes,
          created_by: who,
        });
      });
      if (!lines.length) return toast('حداقل یک قلم وارد کنید', 'error');
      try {
        for (var i = 0; i < lines.length; i++) {
          await DB.add('entries', lines[i]);
        }
        if (window.Api && Api.invalidateCache) Api.invalidateCache('entries');
        toast('فاکتور با ' + lines.length + ' قلم ثبت شد', 'success');
        closeModal();
        if (typeof navigate === 'function') navigate('entries');
      } catch (err) {
        toast(err.message || 'خطا در ثبت', 'error');
      }
    };
  };

  /* ========== تک‌قلم ========== */
  Pages.showEntryForm = async function (id) {
    if (!id && !canAddEntry()) return toast('دسترسی ندارید', 'error');
    if (id && !canEditEntry()) return toast('دسترسی ویرایش ندارید', 'error');

    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var suppliers = (await DB.getAll('suppliers').catch(function () { return []; })) || [];
    var item = {
      date: typeof todayJalali === 'function' ? todayJalali() : '',
      material_name: '',
      quantity: '',
      unit_price: '',
      waste_qty: '',
      supplier: '',
      invoice_no: '',
      notes: '',
    };
    if (id) {
      var found = await DB.getById('entries', id).catch(function () { return null; });
      if (found) item = found;
    }

    showModal(
      '<div class="modal" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-3">' +
        (id ? 'ویرایش قلم فاکتور' : 'ثبت تک‌قلم') +
        '</h3>' +
        '<form id="entry-form" class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label>' +
        '<input name="date" class="input-field" value="' +
        (item.date || '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">شماره فاکتور</label>' +
        '<input name="invoice_no" class="input-field" value="' +
        (item.invoice_no || '') +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">ماده</label>' +
        '<select name="material_name" class="input-field" required><option value="">انتخاب…</option>' +
        materialOptions(materials, item.material_name) +
        '</select></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">مقدار اولیه (فاکتور)</label>' +
        '<input name="quantity" type="number" step="0.001" min="0" class="input-field" value="' +
        (item.quantity != null ? item.quantity : '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">ضایعات</label>' +
        '<input name="waste_qty" type="number" step="0.001" min="0" class="input-field" value="' +
        (item.waste_qty != null && item.waste_qty !== '' ? item.waste_qty : '') +
        '" placeholder="اختیاری" /></div></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">فی (ریال)</label>' +
        '<input name="unit_price" type="number" step="1" class="input-field" value="' +
        (item.unit_price != null && item.unit_price !== '' ? item.unit_price : '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">تأمین‌کننده</label>' +
        '<select name="supplier" class="input-field"><option value="">—</option>' +
        supplierOptions(suppliers, item.supplier) +
        '</select></div></div>' +
        '<div><label class="text-xs text-slate-400">توضیحات</label>' +
        '<input name="notes" class="input-field" value="' +
        (item.notes || '') +
        '" /></div>' +
        '<div class="flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );

    document.getElementById('entry-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var quantity = Number(fd.quantity);
      var unit_price =
        fd.unit_price === '' || fd.unit_price == null ? null : Number(fd.unit_price);
      var waste_qty =
        fd.waste_qty === '' || fd.waste_qty == null ? null : Number(fd.waste_qty);
      var total_price =
        unit_price != null && !isNaN(unit_price) ? unit_price * quantity : null;
      var payload = {
        date: fd.date,
        material_name: fd.material_name,
        quantity: quantity,
        unit_price: unit_price,
        total_price: total_price,
        waste_qty: waste_qty,
        supplier: fd.supplier || '',
        invoice_no: fd.invoice_no || '',
        notes: fd.notes || '',
        created_by:
          (window.Auth && Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) ||
          item.created_by ||
          '',
      };
      try {
        if (id) {
          payload.id = id;
          await DB.put('entries', payload);
        } else {
          await DB.add('entries', payload);
        }
        if (window.Api && Api.invalidateCache) Api.invalidateCache('entries');
        toast(id ? 'به‌روز شد' : 'ثبت شد', 'success');
        closeModal();
        if (typeof navigate === 'function') navigate('entries');
      } catch (err) {
        toast(err.message || 'خطا', 'error');
      }
    };
  };

  console.log('[invoice-entries] v2 manager columns + finished cost (Rial)');
})();
