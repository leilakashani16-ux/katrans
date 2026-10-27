/**
 * نیمه‌محصول + فرآوری + قیمت آخرین خرید
 * لایه میانی: ماده خام → نیمه‌محصول (با پرت) → محصول نهایی
 */
(function () {
  var SEMI_DEFAULTS = [
    { code: 'SM001', name: 'سینه مرینیت جوجه', unit: 'کیلوگرم', parent_material: 'سینه مرغ', material_type: 'semi', min_alert: 5, description: 'سینه مرغ مرینیت‌شده برای تولید جوجه' },
    { code: 'SM002', name: 'سینه فسنجان', unit: 'کیلوگرم', parent_material: 'سینه مرغ', material_type: 'semi', min_alert: 3, description: 'سینه خردشده برای خورشت فسنجان' },
    { code: 'SM003', name: 'سینه سالاد', unit: 'کیلوگرم', parent_material: 'سینه مرغ', material_type: 'semi', min_alert: 1.5, description: 'سینه برای سالاد ماکارونی' },
    { code: 'SM004', name: 'مایه کباب', unit: 'کیلوگرم', parent_material: 'گوشت نخودی', material_type: 'semi', min_alert: 5, description: 'گوشت چرخ‌کرده آماده کباب (با پیاز و ...)' },
    { code: 'SM005', name: 'مایه لوبیا پلو', unit: 'کیلوگرم', parent_material: 'گوشت چرخ کرده', material_type: 'semi', min_alert: 3, description: 'مایه آماده لوبیاپلو' },
    { code: 'SM006', name: 'برنج پخته', unit: 'کیلوگرم', parent_material: 'برنج ایرانی هاشمی', material_type: 'semi', min_alert: 10, description: 'برنج پخته کیلویی (خروجی برای گاردنیا و چلو)' }
  ];

  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }

  function typeLabel(t) {
    if (t === 'semi') return '<span class="badge badge-ok">نیمه‌محصول</span>';
    if (t === 'packaging') return '<span class="badge" style="background:#334155">بسته‌بندی</span>';
    if (t === 'other') return '<span class="badge" style="background:#475569">سایر</span>';
    return '<span class="badge" style="background:#1e3a5f">خام</span>';
  }

  /** اطمینان از وجود نیمه‌محصول‌های پیش‌فرض */
  Pages.ensureSemiMaterials = async function () {
    if (!Auth.isAdmin()) return;
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var names = {};
    materials.forEach(function (m) { names[m.name] = m; });
    var added = 0;
    for (var i = 0; i < SEMI_DEFAULTS.length; i++) {
      var s = SEMI_DEFAULTS[i];
      if (names[s.name]) {
        // آپدیت نوع اگر لازم باشد
        var existing = names[s.name];
        if (existing.material_type !== 'semi' || existing.parent_material !== s.parent_material) {
          try {
            await DB.put('materials', Object.assign({}, existing, {
              material_type: 'semi',
              parent_material: s.parent_material,
              description: existing.description || s.description
            }));
          } catch (e) {}
        }
        continue;
      }
      try {
        await DB.add('materials', {
          code: s.code,
          name: s.name,
          unit: s.unit,
          initial_stock: 0,
          min_alert: s.min_alert,
          description: s.description,
          material_type: 'semi',
          parent_material: s.parent_material,
          active: 1
        });
        added++;
      } catch (e) {
        console.warn('semi seed', s.name, e);
      }
    }
    // مواد خامی که الان semi هستند را اصلاح کن (سینه فسنجان و سینه سالاد قبلاً به عنوان ماده بودند)
    var toFix = ['سینه فسنجان', 'سینه سالاد', 'مایه لوبیا پلو'];
    for (var j = 0; j < toFix.length; j++) {
      var m = names[toFix[j]];
      if (m && m.material_type !== 'semi') {
        try {
          await DB.put('materials', Object.assign({}, m, {
            material_type: 'semi',
            parent_material: m.parent_material || (toFix[j].indexOf('سینه') >= 0 ? 'سینه مرغ' : '')
          }));
        } catch (e2) {}
      }
    }
    return added;
  };

  /* ========== صفحه فرآوری ========== */
  Pages.processings = async function () {
    await Pages.ensureSemiMaterials();
    var list = (await DB.getAll('processings').catch(function () { return []; })) || [];
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var canEdit = Auth.isAdmin() || Auth.canProduction && Auth.canProduction();

    var rows = list
      .slice()
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0); })
      .slice(0, 100)
      .map(function (p) {
        return (
          '<tr>' +
          '<td class="text-slate-400 text-xs">' + (p.date || '') + '</td>' +
          '<td class="font-medium">' + (p.source_material || '') + '</td>' +
          '<td>' + fmtNum(p.source_qty) + '</td>' +
          '<td class="text-brand-300">→ ' + (p.target_material || '') + '</td>' +
          '<td class="text-emerald-400">' + fmtNum(p.target_qty) + '</td>' +
          '<td class="text-amber-400">' + (p.waste_qty ? fmtNum(p.waste_qty) : '—') + '</td>' +
          '<td class="text-xs text-slate-400">' + (p.producer_name || '') + '</td>' +
          '<td class="whitespace-nowrap">' +
          (Auth.isAdmin()
            ? '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteProcessing(' + p.id + ')">حذف</button>'
            : '') +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">فرآوری و نیمه‌محصول</h1>' +
      '<p class="text-slate-400 text-sm">تبدیل ماده خام به نیمه‌محصول با ثبت پرت</p></div>' +
      (canEdit
        ? '<button class="btn-primary" onclick="Pages.showProcessingForm()">+ ثبت فرآوری</button>'
        : '') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
      'مثال: ۶۰ کیلو <b>سینه مرغ</b> → ۴۸.۲ کیلو <b>سینه مرینیت جوجه</b> + ۱.۸ کیلو پرت. ' +
      'موجودی نیمه‌محصول جدا از ماده خام نگهداری می‌شود.' +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>تاریخ</th><th>ماده مبدأ</th><th>مصرف</th><th>نیمه‌محصول</th><th>خروجی</th><th>پرت</th><th>مسئول</th><th></th></tr></thead>' +
      '<tbody>' +
      (rows || '<tr><td colspan="8" class="text-center text-slate-500 py-8">هنوز فرآوری ثبت نشده</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  Pages.showProcessingForm = async function () {
    if (!Auth.isAdmin() && !(Auth.canProduction && Auth.canProduction())) {
      return toast('دسترسی ندارید', 'error');
    }
    var materials = ((await DB.getAll('materials').catch(function () { return []; })) || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });
    var raws = materials.filter(function (m) {
      return (m.material_type || 'raw') === 'raw' || !m.material_type;
    });
    var semis = materials.filter(function (m) {
      return m.material_type === 'semi';
    });
    var personnel = ((await DB.getAll('personnel').catch(function () { return []; })) || []).filter(function (p) {
      return p.active !== false && p.active !== 0;
    });

    var rawOpts = raws
      .map(function (m) {
        return '<option value="' + m.name + '">' + m.name + (m.unit ? ' (' + m.unit + ')' : '') + '</option>';
      })
      .join('');
    var semiOpts = semis
      .map(function (m) {
        return (
          '<option value="' +
          m.name +
          '" data-parent="' +
          (m.parent_material || '') +
          '">' +
          m.name +
          (m.parent_material ? ' ← ' + m.parent_material : '') +
          '</option>'
        );
      })
      .join('');
    var perOpts = personnel
      .map(function (p) {
        return '<option value="' + p.name + '">' + p.name + '</option>';
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:520px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-3">🔄 ثبت فرآوری</h3>' +
        '<form id="proc-form" class="space-y-3" onsubmit="return false;">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label>' +
        '<input name="date" class="input-field" value="' +
        todayJalali() +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">ماده مبدأ (خام)</label>' +
        '<select name="source_material" id="proc-source" class="input-field" required><option value="">— انتخاب —</option>' +
        rawOpts +
        '</select></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">مقدار مصرف</label>' +
        '<input name="source_qty" id="proc-src-qty" type="number" step="0.001" min="0.001" class="input-field" required /></div>' +
        '<div><label class="text-xs text-slate-400">پرت / ضایعات</label>' +
        '<input name="waste_qty" id="proc-waste" type="number" step="0.001" min="0" class="input-field" value="0" /></div></div>' +
        '<div><label class="text-xs text-slate-400">نیمه‌محصول مقصد</label>' +
        '<select name="target_material" id="proc-target" class="input-field" required><option value="">— انتخاب —</option>' +
        semiOpts +
        '</select></div>' +
        '<div><label class="text-xs text-slate-400">مقدار خروجی نیمه‌محصول</label>' +
        '<input name="target_qty" id="proc-tgt-qty" type="number" step="0.001" min="0.001" class="input-field" required />' +
        '<p class="text-[10px] text-slate-500 mt-1" id="proc-hint">خروجی ≈ مصرف − پرت</p></div>' +
        '<div><label class="text-xs text-slate-400">مسئول</label>' +
        '<select name="producer_name" class="input-field"><option value="">—</option>' +
        perOpts +
        '</select></div>' +
        '<div><label class="text-xs text-slate-400">یادداشت</label>' +
        '<input name="notes" class="input-field" placeholder="مثلاً مرینیت صبح" /></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ثبت فرآوری</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    function recalcTarget() {
      var src = Number(document.getElementById('proc-src-qty').value) || 0;
      var waste = Number(document.getElementById('proc-waste').value) || 0;
      var tgt = document.getElementById('proc-tgt-qty');
      if (src > 0 && (!tgt.value || tgt.dataset.auto === '1')) {
        tgt.value = Math.max(0, Math.round((src - waste) * 1000) / 1000);
        tgt.dataset.auto = '1';
      }
      var hint = document.getElementById('proc-hint');
      if (hint) {
        hint.textContent =
          'خروجی پیشنهادی: ' +
          (Math.max(0, Math.round((src - waste) * 1000) / 1000) || '—') +
          ' (مصرف − پرت)';
      }
    }
    document.getElementById('proc-src-qty').oninput = recalcTarget;
    document.getElementById('proc-waste').oninput = recalcTarget;
    document.getElementById('proc-tgt-qty').oninput = function () {
      this.dataset.auto = '0';
    };

    // پیشنهاد ماده مبدأ بر اساس parent نیمه‌محصول
    document.getElementById('proc-target').onchange = function () {
      var opt = this.options[this.selectedIndex];
      var parent = opt && opt.getAttribute('data-parent');
      if (parent) {
        var sel = document.getElementById('proc-source');
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === parent) {
            sel.value = parent;
            break;
          }
        }
      }
    };

    document.getElementById('proc-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var source_qty = Number(fd.source_qty);
      var target_qty = Number(fd.target_qty);
      var waste_qty = Number(fd.waste_qty) || 0;
      if (!fd.source_material || !fd.target_material) return toast('مبدأ و مقصد را انتخاب کنید', 'error');
      if (source_qty <= 0 || target_qty <= 0) return toast('مقدار نامعتبر', 'error');
      if (target_qty + waste_qty > source_qty + 0.001) {
        if (!confirm('خروجی + پرت بیشتر از مصرف است. ادامه می‌دهید؟')) return;
      }
      try {
        await DB.add('processings', {
          date: fd.date,
          source_material: fd.source_material,
          source_qty: source_qty,
          target_material: fd.target_material,
          target_qty: target_qty,
          waste_qty: waste_qty,
          waste_note: waste_qty > 0 ? 'پرت فرآوری' : '',
          producer_name: fd.producer_name || '',
          notes: fd.notes || ''
        });
        toast('فرآوری ثبت شد', 'success');
        closeModal();
        navigate('processings');
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ثبت', 'error');
      }
    };
  };

  Pages.deleteProcessing = async function (id) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('این فرآوری حذف شود؟ موجودی‌ها تحت تأثیر قرار می‌گیرند.')) return;
    try {
      await DB.remove('processings', id);
      toast('حذف شد', 'success');
      navigate('processings');
    } catch (e) {
      toast(e.message || 'خطا', 'error');
    }
  };

  /* ========== تقویت صفحه مواد: نوع + آخرین قیمت ========== */
  var _origMaterials = Pages.materials;
  Pages.materials = async function () {
    if (Auth.isAdmin()) {
      try {
        await Pages.ensureSemiMaterials();
      } catch (e) {}
    }
    var html = await _origMaterials();
    // اگر صفحه اصلی خیلی پیچیده است، فقط یک نوار اضافه می‌کنیم
    // بهتر: بعد از لود، جدول را با ستون‌های جدید بازسازی می‌کنیم اگر ممکن باشد
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var stock = (await DB.calcStock().catch(function () { return []; })) || [];
    var stockMap = {};
    stock.forEach(function (s) {
      stockMap[s.name] = s;
    });

    var canEdit = Auth.isAdmin();
    var filterType = (location.hash.split('?')[1] && new URLSearchParams(location.hash.split('?')[1]).get('type')) || 'all';

    var filtered = materials.filter(function (m) {
      if (m.active === false || m.active === 0) return false;
      if (filterType === 'raw') return (m.material_type || 'raw') === 'raw' || !m.material_type;
      if (filterType === 'semi') return m.material_type === 'semi';
      if (filterType === 'packaging') return m.material_type === 'packaging';
      return true;
    });

    function chip(id, label) {
      var on = filterType === id;
      return (
        '<button type="button" class="' +
        (on ? 'btn-primary' : 'btn-ghost') +
        ' text-xs" onclick="navigate(\'materials?type=' +
        id +
        '\')">' +
        label +
        '</button>'
      );
    }

    var rows = filtered
      .map(function (m) {
        var st = stockMap[m.name] || {};
        var cur = st.current_stock != null ? st.current_stock : m.initial_stock || 0;
        var status = st.status || 'عادی';
        var statusCls =
          status === 'تمام شد' ? 'text-red-400' : status === 'هشدار' ? 'text-amber-400' : 'text-emerald-400';
        return (
          '<tr>' +
          '<td class="text-slate-400 text-xs">' +
          (m.code || '') +
          '</td>' +
          '<td class="font-medium">' +
          (m.name || '') +
          '</td>' +
          '<td>' +
          typeLabel(m.material_type || 'raw') +
          '</td>' +
          '<td class="text-xs text-slate-400">' +
          (m.parent_material || '—') +
          '</td>' +
          '<td>' +
          (m.unit || '') +
          '</td>' +
          '<td class="' +
          statusCls +
          ' font-medium">' +
          fmtNum(cur) +
          '</td>' +
          '<td class="text-xs">' +
          fmtPrice(m.last_buy_price) +
          '</td>' +
          '<td class="text-[10px] text-slate-500">' +
          (m.last_buy_date || '—') +
          '</td>' +
          '<td class="whitespace-nowrap">' +
          (canEdit
            ? '<button class="btn-ghost text-xs" onclick="Pages.showMaterialForm(' +
              m.id +
              ')">ویرایش</button>'
            : '') +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-4">' +
      '<div><h1 class="text-2xl font-bold">مواد و نیمه‌محصول</h1>' +
      '<p class="text-slate-400 text-sm">موجودی + نوع + آخرین قیمت خرید</p></div>' +
      (canEdit
        ? '<div class="flex gap-2"><button class="btn-secondary text-sm" onclick="navigate(\'processings\')">🔄 فرآوری</button>' +
          '<button class="btn-primary" onclick="Pages.showMaterialForm()">+ ماده / نیمه‌محصول</button></div>'
        : '<button class="btn-secondary text-sm" onclick="navigate(\'processings\')">🔄 فرآوری</button>') +
      '</div>' +
      '<div class="flex flex-wrap gap-2 mb-4">' +
      chip('all', 'همه') +
      chip('raw', 'خام') +
      chip('semi', 'نیمه‌محصول') +
      chip('packaging', 'بسته‌بندی') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>کد</th><th>نام</th><th>نوع</th><th>والد</th><th>واحد</th><th>موجودی</th><th>آخرین قیمت</th><th>تاریخ قیمت</th><th></th></tr></thead>' +
      '<tbody>' +
      (rows || '<tr><td colspan="9" class="text-center text-slate-500 py-8">موردی نیست</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  /* ========== فرم ماده با نوع و قیمت ========== */
  var _origShowMaterialForm = Pages.showMaterialForm;
  Pages.showMaterialForm = async function (id) {
    // اگر نسخه اصلی وجود دارد، اول آن را صدا می‌زنیم و بعد فیلدها را گسترش می‌دهیم
    // برای سادگی نسخه کامل خودمان را می‌نویسیم
    if (!Auth.isAdmin() && id) return toast('فقط مدیر', 'error');
    if (!Auth.isAdmin() && !id) return;

    var item = {
      code: '',
      name: '',
      unit: 'کیلوگرم',
      initial_stock: 0,
      min_alert: 0,
      description: '',
      material_type: 'raw',
      parent_material: '',
      last_buy_price: '',
      last_buy_date: '',
      active: 1
    };
    if (id) {
      item = (await DB.getById('materials', id)) || item;
    }
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var parentOpts = materials
      .filter(function (m) {
        return (m.material_type || 'raw') === 'raw' && m.name !== item.name;
      })
      .map(function (m) {
        return (
          '<option value="' +
          m.name +
          '" ' +
          (item.parent_material === m.name ? 'selected' : '') +
          '>' +
          m.name +
          '</option>'
        );
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:520px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-3">' +
        (id ? 'ویرایش ماده' : 'افزودن ماده / نیمه‌محصول') +
        '</h3>' +
        '<form id="mat-form-ext" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">کد</label>' +
        '<input name="code" class="input-field" value="' +
        (item.code || '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">نوع</label>' +
        '<select name="material_type" id="mat-type" class="input-field">' +
        '<option value="raw" ' +
        ((item.material_type || 'raw') === 'raw' ? 'selected' : '') +
        '>خام</option>' +
        '<option value="semi" ' +
        (item.material_type === 'semi' ? 'selected' : '') +
        '>نیمه‌محصول</option>' +
        '<option value="packaging" ' +
        (item.material_type === 'packaging' ? 'selected' : '') +
        '>بسته‌بندی</option>' +
        '<option value="other" ' +
        (item.material_type === 'other' ? 'selected' : '') +
        '>سایر</option></select></div></div>' +
        '<div><label class="text-xs text-slate-400">نام</label>' +
        '<input name="name" class="input-field" value="' +
        String(item.name || '').replace(/"/g, '&quot;') +
        '" required /></div>' +
        '<div id="mat-parent-wrap" class="' +
        (item.material_type === 'semi' ? '' : 'hidden') +
        '"><label class="text-xs text-slate-400">ماده والد (خام)</label>' +
        '<select name="parent_material" class="input-field"><option value="">—</option>' +
        parentOpts +
        '</select></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">واحد</label>' +
        '<input name="unit" class="input-field" value="' +
        (item.unit || 'کیلوگرم') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">حد هشدار</label>' +
        '<input name="min_alert" type="number" step="0.001" class="input-field" value="' +
        (item.min_alert != null ? item.min_alert : 0) +
        '" /></div></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">آخرین قیمت خرید</label>' +
        '<input name="last_buy_price" type="number" step="1" class="input-field" value="' +
        (item.last_buy_price != null && item.last_buy_price !== '' ? item.last_buy_price : '') +
        '" placeholder="تومان" /></div>' +
        '<div><label class="text-xs text-slate-400">تاریخ قیمت</label>' +
        '<input name="last_buy_date" class="input-field" value="' +
        (item.last_buy_date || '') +
        '" placeholder="1405/07/20" /></div></div>' +
        '<div><label class="text-xs text-slate-400">موجودی اولیه</label>' +
        '<input name="initial_stock" type="number" step="0.001" class="input-field" value="' +
        (item.initial_stock != null ? item.initial_stock : 0) +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">توضیح</label>' +
        '<input name="description" class="input-field" value="' +
        String(item.description || '').replace(/"/g, '&quot;') +
        '" /></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    document.getElementById('mat-type').onchange = function () {
      var w = document.getElementById('mat-parent-wrap');
      if (this.value === 'semi') w.classList.remove('hidden');
      else w.classList.add('hidden');
    };

    document.getElementById('mat-form-ext').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var payload = {
        code: fd.code,
        name: fd.name,
        unit: fd.unit || 'کیلوگرم',
        initial_stock: Number(fd.initial_stock) || 0,
        min_alert: Number(fd.min_alert) || 0,
        description: fd.description || '',
        material_type: fd.material_type || 'raw',
        parent_material: fd.material_type === 'semi' ? fd.parent_material || '' : '',
        last_buy_price: fd.last_buy_price !== '' && fd.last_buy_price != null ? Number(fd.last_buy_price) : null,
        last_buy_date: fd.last_buy_date || null,
        active: 1
      };
      try {
        if (id) {
          payload.id = id;
          var existing = (await DB.getById('materials', id)) || {};
          await DB.put('materials', Object.assign({}, existing, payload));
        } else {
          await DB.add('materials', payload);
        }
        toast('ذخیره شد', 'success');
        closeModal();
        navigate('materials');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };
  };

    // افزودن منوی فرآوری به ناوبری
  function injectNav() {
    try {
      if (typeof NAV === 'undefined') return;
      var item = { id: 'processings', label: 'فرآوری', icon: '🔄' };
      ['admin', 'production', 'entry'].forEach(function (role) {
        if (!NAV[role]) return;
        var exists = NAV[role].some(function (x) { return x.id === 'processings'; });
        if (exists) return;
        var idx = NAV[role].findIndex(function (x) { return x.id === 'materials' || x.id === 'productions'; });
        if (idx >= 0) NAV[role].splice(idx + 1, 0, item);
        else NAV[role].push(item);
      });
      if (typeof buildNav === 'function' && typeof Auth !== 'undefined' && Auth.currentUser) {
        buildNav();
      }
    } catch (e) {
      console.warn('nav inject', e);
    }
  }
  injectNav();
  setTimeout(injectNav, 500);
  setTimeout(injectNav, 2000);

  console.log('[processing] semi-finished + price module loaded');
})();
