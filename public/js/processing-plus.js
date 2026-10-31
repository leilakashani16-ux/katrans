/**
 * processing-plus.js
 * - ویرایش و چاپ فرآوری
 * - لحاظ فرآوری در آمار پرسنل (producer_name)
 * بعد از processing.js لود شود
 */
(function () {
  'use strict';

  function fmtNum(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }
  function parseSources(p) {
    if (p && p.sources_json) {
      try {
        var lines = JSON.parse(p.sources_json);
        if (Array.isArray(lines) && lines.length) return lines;
      } catch (e) {}
    }
    if (p && p.source_material) return [{ material: p.source_material, qty: Number(p.source_qty) || 0 }];
    return [];
  }
  function sourcesLabel(p) {
    var lines = parseSources(p);
    if (!lines.length) return '—';
    return lines
      .map(function (l) {
        return (l.material || l.material_name || '') + ' ' + fmtNum(l.qty || l.quantity || 0);
      })
      .join(' + ');
  }

  /* ——— لیست با ویرایش + چاپ ——— */
  var _origProcessings = Pages.processings;
  Pages.processings = async function () {
    try {
      await Pages.ensureSemiMaterials();
    } catch (e) {}
    var list = (await DB.getAll('processings').catch(function () {
      return [];
    })) || [];
    var canEdit = Auth.isAdmin() || (Auth.canProduction && Auth.canProduction());
    var rows = list
      .slice()
      .sort(function (a, b) {
        return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0);
      })
      .slice(0, 150)
      .map(function (p) {
        return (
          '<tr><td class="text-slate-400 text-xs">' +
          (p.date || '') +
          '</td>' +
          '<td class="text-xs max-w-[220px]">' +
          sourcesLabel(p) +
          '</td>' +
          '<td class="text-brand-300">→ ' +
          (p.target_material || '') +
          '</td>' +
          '<td class="text-emerald-400">' +
          fmtNum(p.target_qty) +
          '</td>' +
          '<td class="text-amber-400">' +
          (p.waste_qty ? fmtNum(p.waste_qty) : '—') +
          '</td>' +
          '<td class="text-xs">' +
          (p.producer_name || '—') +
          '</td>' +
          '<td class="whitespace-nowrap">' +
          (canEdit
            ? '<button class="btn-ghost text-xs" onclick="Pages.showProcessingForm(' +
              p.id +
              ')">ویرایش</button> '
            : '') +
          '<button class="btn-ghost text-xs" onclick="Pages.printProcessing(' +
          p.id +
          ')">چاپ</button> ' +
          (Auth.isAdmin()
            ? '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteProcessing(' +
              p.id +
              ')">حذف</button>'
            : '') +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">فرآوری</h1>' +
      '<p class="text-slate-400 text-sm">چند ماده → نیمه‌محصول · ویرایش و چاپ</p></div>' +
      '<div class="flex flex-wrap gap-2">' +
      (canEdit
        ? '<button class="btn-primary" onclick="Pages.showProcessingForm()">+ ثبت فرآوری</button>'
        : '') +
      '</div></div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>تاریخ</th><th>مواد مبدأ</th><th>نیمه‌محصول</th><th>خروجی</th><th>پرت</th><th>مسئول</th><th></th></tr></thead>' +
      '<tbody>' +
      (rows || '<tr><td colspan="7" class="text-center text-slate-500 py-8">خالی</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  /* ——— ویرایش: showProcessingForm(id) ——— */
  var _origShow = Pages.showProcessingForm;
  Pages.showProcessingForm = async function (id) {
    if (!id) return _origShow.apply(this, arguments);

    if (!Auth.isAdmin() && !(Auth.canProduction && Auth.canProduction())) {
      return toast('دسترسی ندارید', 'error');
    }
    var item = await DB.getById('processings', id);
    if (!item) return toast('یافت نشد', 'error');

    var materials =
      ((await DB.getAll('materials').catch(function () {
        return [];
      })) ||
        []).filter(function (m) {
        return m.active !== false && m.active !== 0;
      });
    var personnel =
      ((await DB.getAll('personnel').catch(function () {
        return [];
      })) ||
        []).filter(function (p) {
        return p.active !== false && p.active !== 0;
      });
    var matOpts = materials
      .map(function (m) {
        return '<option value="' + m.name + '">' + m.name + '</option>';
      })
      .join('');
    var perOpts = personnel
      .map(function (p) {
        var n = p.name || p.full_name || '';
        var sel = item.producer_name === n ? ' selected' : '';
        return '<option value="' + n + '"' + sel + '>' + n + '</option>';
      })
      .join('');
    var lines = parseSources(item);
    if (!lines.length) lines = [{ material: '', qty: '' }];

    function sourceRow(mat, qty) {
      return (
        '<div class="src-row grid grid-cols-5 gap-2 items-end mb-2">' +
        '<div class="col-span-3"><label class="text-[10px] text-slate-500">مبدأ</label>' +
        '<select class="input-field src-mat text-sm"><option value="">—</option>' +
        materials
          .map(function (m) {
            var s = m.name === mat ? ' selected' : '';
            return '<option value="' + m.name + '"' + s + '>' + m.name + '</option>';
          })
          .join('') +
        '</select></div>' +
        '<div><label class="text-[10px] text-slate-500">مقدار</label>' +
        '<input type="number" step="any" class="input-field src-qty text-sm" value="' +
        (qty != null && qty !== '' ? qty : '') +
        '" /></div>' +
        '<div><button type="button" class="btn-ghost text-xs text-red-400 src-rm w-full">✕</button></div></div>'
      );
    }

    var tgtOpts = materials
      .map(function (m) {
        var s = m.name === item.target_material ? ' selected' : '';
        return '<option value="' + m.name + '"' + s + '>' + m.name + '</option>';
      })
      .join('');

    showModal(
      '<div class="modal max-w-lg"><h3 class="text-lg font-bold mb-3">ویرایش فرآوری #' +
        id +
        '</h3>' +
        '<form id="proc-form-edit" class="space-y-3" onsubmit="return false;">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label>' +
        '<input name="date" class="input-field" value="' +
        (item.date || '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">مواد مبدأ</label><div id="proc-sources-edit">' +
        lines.map(function (l) {
          return sourceRow(l.material || l.material_name, l.qty || l.quantity);
        }).join('') +
        '</div>' +
        '<button type="button" class="btn-ghost text-xs" id="proc-add-src-edit">+ مبدأ</button></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">نیمه‌محصول مقصد</label>' +
        '<select name="target_material" class="input-field" required><option value="">—</option>' +
        tgtOpts +
        '</select></div>' +
        '<div><label class="text-xs text-slate-400">خروجی</label>' +
        '<input name="target_qty" type="number" step="any" class="input-field" value="' +
        (item.target_qty != null ? item.target_qty : '') +
        '" required /></div></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">پرت</label>' +
        '<input name="waste_qty" type="number" step="any" class="input-field" value="' +
        (item.waste_qty || 0) +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">مسئول</label>' +
        '<select name="producer_name" class="input-field"><option value="">—</option>' +
        perOpts +
        '</select></div></div>' +
        '<div><label class="text-xs text-slate-400">توضیحات</label>' +
        '<textarea name="notes" class="input-field" rows="2">' +
        (item.notes || '') +
        '</textarea></div>' +
        '<div class="flex gap-2 pt-2">' +
        '<button type="submit" class="btn-primary flex-1">ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );

    var sourcesEl = document.getElementById('proc-sources-edit');
    function bindRm(row) {
      row.querySelector('.src-rm').onclick = function () {
        if (sourcesEl.querySelectorAll('.src-row').length <= 1) return toast('حداقل یک مبدأ', 'error');
        row.remove();
      };
    }
    sourcesEl.querySelectorAll('.src-row').forEach(bindRm);
    document.getElementById('proc-add-src-edit').onclick = function () {
      sourcesEl.insertAdjacentHTML('beforeend', sourceRow('', ''));
      bindRm(sourcesEl.lastElementChild);
    };

    document.getElementById('proc-form-edit').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var sources = [];
      sourcesEl.querySelectorAll('.src-row').forEach(function (row) {
        var material = row.querySelector('.src-mat').value;
        var qty = Number(row.querySelector('.src-qty').value);
        if (material && qty > 0) sources.push({ material: material, qty: qty });
      });
      if (!sources.length) return toast('حداقل یک مبدأ', 'error');
      var sourceSum = sources.reduce(function (s, l) {
        return s + l.qty;
      }, 0);
      var payload = Object.assign({}, item, {
        date: fd.date,
        source_material: sources[0].material,
        source_qty: sourceSum,
        sources_json: JSON.stringify(sources),
        target_material: fd.target_material,
        target_qty: Number(fd.target_qty),
        waste_qty: Number(fd.waste_qty) || 0,
        producer_name: fd.producer_name || '',
        notes: fd.notes || ''
      });
      try {
        await DB.put('processings', payload);
        toast('فرآوری ویرایش شد', 'success');
        closeModal();
        navigate('processings');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };
  };

  /* ——— چاپ ——— */
  Pages.printProcessing = async function (id) {
    var p = await DB.getById('processings', id);
    if (!p) return toast('یافت نشد', 'error');
    var company = 'غذای انصار';
    try {
      var local = localStorage.getItem('kitchen_settings');
      if (local) company = JSON.parse(local).company_name || company;
    } catch (e) {}
    var html =
      '<html dir="rtl"><head><meta charset="utf-8"><title>فرآوری ' +
      id +
      '</title>' +
      '<style>body{font-family:Tahoma,sans-serif;padding:24px;color:#111}' +
      'h1{font-size:18px;margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:16px}' +
      'td,th{border:1px solid #ccc;padding:8px;text-align:right;font-size:13px}' +
      '.muted{color:#666;font-size:12px}</style></head><body>' +
      '<h1>' +
      company +
      ' — برگه فرآوری</h1>' +
      '<p class="muted">شماره: ' +
      id +
      ' · تاریخ: ' +
      (p.date || '—') +
      '</p>' +
      '<table><tr><th>مواد مبدأ</th><td>' +
      sourcesLabel(p) +
      '</td></tr>' +
      '<tr><th>نیمه‌محصول</th><td>' +
      (p.target_material || '—') +
      '</td></tr>' +
      '<tr><th>خروجی</th><td>' +
      fmtNum(p.target_qty) +
      '</td></tr>' +
      '<tr><th>پرت</th><td>' +
      (p.waste_qty ? fmtNum(p.waste_qty) : '—') +
      '</td></tr>' +
      '<tr><th>مسئول</th><td>' +
      (p.producer_name || '—') +
      '</td></tr>' +
      '<tr><th>توضیحات</th><td>' +
      (p.notes || '—') +
      '</td></tr></table>' +
      '<p class="muted" style="margin-top:24px">امضا مسئول: ………………    امضا انبار: ………………</p>' +
      '<script>window.onload=function(){window.print()}<\/script></body></html>';
    var w = window.open('', '_blank');
    if (!w) return toast('پاپ‌آپ بسته است', 'error');
    w.document.write(html);
    w.document.close();
  };

  /* ——— آمار پرسنل: اضافه کردن وزن فرآوری ——— */
  function patchStaffStats() {
    if (typeof Pages === 'undefined' || Pages.__procStaffPatched) return;
    // هوک ملایم: اگر داشبورد raw دارد، producer از processings هم شمرده شود
    var origDash = Pages.dashboard;
    if (typeof origDash === 'function') {
      Pages.dashboard = async function () {
        var html = await origDash.apply(this, arguments);
        try {
          var procs =
            (await DB.getAll('processings').catch(function () {
              return [];
            })) || [];
          window.__procByStaff = {};
          procs.forEach(function (p) {
            if (p.deleted_at) return;
            var n = p.producer_name || 'نامشخص';
            if (!window.__procByStaff[n]) window.__procByStaff[n] = { weight: 0, count: 0 };
            window.__procByStaff[n].weight += Number(p.source_qty || p.target_qty || 0);
            window.__procByStaff[n].count += 1;
          });
        } catch (e) {}
        return html;
      };
      Pages.__procStaffPatched = true;
    }
  }
  patchStaffStats();
  setTimeout(patchStaffStats, 500);

  console.log('[processing-plus] edit/print/staff ready');
})();
