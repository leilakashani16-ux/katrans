/**
 * دستور ساخت چندماده‌ای + تولید با ورودی واقعی / خروجی واقعی یا تخمینی
 */
(function () {
  function companyName() {
    try {
      var local = localStorage.getItem('kitchen_settings');
      if (local) return JSON.parse(local).company_name || 'غذای انصار';
    } catch (_) {}
    return 'غذای انصار';
  }

  async function loadRecipeMap() {
    var recipes = (await DB.getAll('recipes').catch(function () { return []; })) || [];
    var items = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
    var map = {};
    recipes.forEach(function (r) {
      map[r.product_name] = {
        recipe: r,
        items: items
          .filter(function (i) { return i.product_name === r.product_name; })
          .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
      };
    });
    return map;
  }

  /* ========== ویرایش دستور ساخت ========== */
  Pages.editRecipe = async function (productName) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    productName = productName || '';
    var materials = ((await DB.getAll('materials').catch(function () { return []; })) || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });
    var recipes = (await DB.getAll('recipes').catch(function () { return []; })) || [];
    var items = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
    var rec = recipes.find(function (r) { return r.product_name === productName; }) || {
      product_name: productName,
      mode: 'multi_input',
      yield_factor: '',
      notes: ''
    };
    var recItems = items.filter(function (i) { return i.product_name === productName; });

    var matOpts = materials
      .map(function (m) {
        return '<option value="' + m.name + '">' + m.name + (m.unit ? ' (' + m.unit + ')' : '') + '</option>';
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:640px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-1">🧩 دستور ساخت</h3>' +
        '<p class="text-xs text-slate-400 mb-3">' +
        productName +
        ' — الگوی مواد برای یک پخت / ترکیب پایه</p>' +
        '<form id="recipe-form" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">ضریب پخت (اختیاری)</label>' +
        '<input name="yield_factor" id="rc-yield" type="number" step="0.001" class="input-field" value="' +
        (rec.yield_factor != null && rec.yield_factor !== '' ? rec.yield_factor : '') +
        '" placeholder="مثلاً ۲.۴۵ برای برنج" />' +
        '<p class="text-[10px] text-slate-500 mt-1">خروجی ≈ جمع مواد × ضریب (وقتی وزن نمی‌کنید)</p></div>' +
        '<div><label class="text-xs text-slate-400">یادداشت</label>' +
        '<input name="notes" class="input-field" value="' +
        String(rec.notes || '').replace(/"/g, '&quot;') +
        '" placeholder="مثلاً پخت دیگ بزرگ" /></div></div>' +
        '<div class="border border-slate-600/40 rounded-xl p-3 space-y-2">' +
        '<div class="flex justify-between items-center">' +
        '<span class="text-sm font-medium">مواد الگو</span>' +
        '<button type="button" class="btn-secondary text-xs" id="rc-add-row">+ ماده</button></div>' +
        '<div id="rc-rows" class="tf-rows-scroll space-y-2"></div>' +
        '<p class="text-[10px] text-slate-500">مثال قورمه: گوشت ۸ + لوبیا ۷ + سبزی ۷ — خروجی هر بار فرق می‌کند و موقع تولید وارد می‌شود.</p></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ذخیره دستور</button>' +
        '<button type="button" class="btn-ghost text-red-400" id="rc-clear">حذف دستور</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    var box = document.getElementById('rc-rows');
    function addRow(name, qty) {
      var div = document.createElement('div');
      div.className = 'rc-row grid grid-cols-5 gap-2 items-end';
      div.innerHTML =
        '<div class="col-span-3"><label class="text-[10px] text-slate-500">ماده</label>' +
        '<select data-f="mat" class="input-field text-sm"><option value="">—</option>' +
        matOpts +
        '</select></div>' +
        '<div><label class="text-[10px] text-slate-500">مقدار</label>' +
        '<input data-f="qty" type="number" step="0.001" min="0" class="input-field text-sm" value="' +
        (qty != null ? qty : '') +
        '" /></div>' +
        '<div><button type="button" class="btn-ghost text-xs text-red-400 w-full">حذف</button></div>';
      box.appendChild(div);
      if (name) div.querySelector('[data-f="mat"]').value = name;
      div.querySelector('button').onclick = function () {
        div.remove();
      };
    }
    if (recItems.length) {
      recItems.forEach(function (i) {
        addRow(i.material_name, i.qty);
      });
    } else {
      addRow('', '');
      addRow('', '');
    }
    document.getElementById('rc-add-row').onclick = function () {
      addRow('', '');
    };

    document.getElementById('rc-clear').onclick = async function () {
      if (!confirmAction('دستور ساخت این محصول حذف شود؟')) return;
      try {
        var allR = (await DB.getAll('recipes')) || [];
        var allI = (await DB.getAll('recipe_items')) || [];
        for (var i = 0; i < allI.length; i++) {
          if (allI[i].product_name === productName) await DB.remove('recipe_items', allI[i].id);
        }
        for (var j = 0; j < allR.length; j++) {
          if (allR[j].product_name === productName) await DB.remove('recipes', allR[j].id);
        }
        toast('دستور حذف شد', 'success');
        closeModal();
        navigate('products');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };

    document.getElementById('recipe-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var rows = [];
      document.querySelectorAll('#rc-rows .rc-row').forEach(function (row) {
        var mat = row.querySelector('[data-f="mat"]').value;
        var qty = Number(row.querySelector('[data-f="qty"]').value);
        if (mat && qty > 0) rows.push({ material_name: mat, qty: qty });
      });
      if (!rows.length) return toast('حداقل یک ماده با مقدار وارد کنید', 'error');
      try {
        var allR = (await DB.getAll('recipes')) || [];
        var allI = (await DB.getAll('recipe_items')) || [];
        var existing = allR.find(function (r) {
          return r.product_name === productName;
        });
        var payload = {
          product_name: productName,
          mode: 'multi_input',
          yield_factor: fd.yield_factor !== '' && fd.yield_factor != null ? Number(fd.yield_factor) : null,
          notes: fd.notes || ''
        };
        if (existing && existing.id) {
          payload.id = existing.id;
          await DB.put('recipes', Object.assign({}, existing, payload));
        } else {
          await DB.add('recipes', payload);
        }
        for (var i = 0; i < allI.length; i++) {
          if (allI[i].product_name === productName) await DB.remove('recipe_items', allI[i].id);
        }
        for (var k = 0; k < rows.length; k++) {
          await DB.add('recipe_items', {
            product_name: productName,
            material_name: rows[k].material_name,
            qty: rows[k].qty,
            sort_order: k
          });
        }
        toast('دستور ساخت ذخیره شد', 'success');
        closeModal();
        navigate('products');
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا', 'error');
      }
    };
  };

  /* ========== دکمه دستور روی لیست محصولات ========== */
  var _origProducts = Pages.products;
  Pages.products = async function () {
    var html = await _origProducts();
    if (!Auth.isAdmin()) return html;
    // inject recipe buttons via post-process after navigate is hard; instead patch table by re-render
    var list = (await DB.getAll('products')) || [];
    var recipeMap = await loadRecipeMap();
    var canEdit = Auth.isAdmin();
    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">محصولات</h1>' +
      '<p class="text-slate-400 text-sm">تعریف محصول + دستور ساخت چندماده‌ای (اختیاری)</p></div>' +
      (canEdit ? '<button class="btn-primary" onclick="Pages.showProductForm()">+ افزودن محصول</button>' : '') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
      'اگر محصول چند ماده دارد (قورمه، برنج، لوبیاپلو) از <b>دستور ساخت</b> استفاده کنید. جوجه و کباب تک‌ماده‌ای مثل قبل می‌مانند.' +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>کد</th><th>نام</th><th>وزن واحد</th><th>ماده پیش‌فرض</th><th>دستور</th><th></th></tr></thead><tbody>' +
      list
        .map(function (p) {
          var hasR = !!recipeMap[p.name];
          var nItems = hasR ? recipeMap[p.name].items.length : 0;
          var yf = hasR && recipeMap[p.name].recipe.yield_factor != null ? recipeMap[p.name].recipe.yield_factor : null;
          return (
            '<tr><td class="text-slate-400">' +
            (p.code || '') +
            '</td><td class="font-medium">' +
            (p.name || '') +
            '</td><td>' +
            fmtNum(p.weight_per_unit) +
            '</td><td class="text-xs">' +
            (p.material_name || '—') +
            '</td><td class="text-xs">' +
            (hasR
              ? '<span class="badge badge-ok">' + nItems + ' ماده' + (yf ? ' · ضریب ' + yf : '') + '</span>'
              : '<span class="text-slate-500">—</span>') +
            '</td><td class="whitespace-nowrap">' +
            (canEdit
              ? '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.editRecipe(\'' +
                String(p.name || '').replace(/'/g, "\\'") +
                '\')">🧩 دستور</button> ' +
                '<button class="btn-ghost text-xs" onclick="Pages.showProductForm(' +
                p.id +
                ')">ویرایش</button>'
              : '') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div></div>'
    );
  };

  // alias if showProductForm named differently
  if (!Pages.showProductForm && Pages.showProdForm) {
    /* product form is showProductForm in some versions */
  }

  /* ========== تولید با پشتیبانی چندماده‌ای ========== */
  var _origShowProdForm = Pages.showProdForm;
  Pages.showProdForm = async function (id) {
    if (!Auth.canProduction() && !id) return;
    if (id && !Auth.canEditDelete()) return toast('فقط مدیر', 'error');

    var item = {
      date: todayJalali(),
      product_name: '',
      quantity: '',
      material_weight: '',
      material_name: '',
      shift_code: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      producer_name: '',
      remainder_count: 0,
      remainder_weight: 0,
      remainder_type: 'حمل به روز بعد',
      notes: ''
    };

    var products = (await DB.getAll('products')) || [];
    var personnel = (await DB.getAll('personnel')) || [];
    var recipeMap = await loadRecipeMap();
    var consumptions = [];
    if (id) {
      item = (await DB.getById('productions', id)) || item;
      consumptions = ((await DB.getAll('production_consumptions').catch(function () { return []; })) || []).filter(
        function (c) {
          return Number(c.production_id) === Number(id);
        }
      );
    }

    var personnelOpts = personnel
      .filter(function (p) {
        return p.active !== false && p.active !== 0 && (p.team || 'executive') === 'executive';
      })
      .map(function (p) {
        return (
          '<option value="' +
          p.name +
          '" ' +
          (item.producer_name === p.name ? 'selected' : '') +
          '>' +
          p.name +
          (p.position ? ' (' + p.position + ')' : '') +
          '</option>'
        );
      })
      .join('');

    var productOpts = products
      .filter(function (p) {
        return p.active !== false && p.name;
      })
      .map(function (p) {
        var hasR = recipeMap[p.name] ? '1' : '0';
        return (
          '<option value="' +
          p.name +
          '" data-mat="' +
          (p.material_name || '') +
          '" data-w="' +
          (p.weight_per_unit || '') +
          '" data-rem="' +
          (p.remainder_type || 'حمل به روز بعد') +
          '" data-recipe="' +
          hasR +
          '" ' +
          (item.product_name === p.name ? 'selected' : '') +
          '>' +
          p.name +
          (hasR === '1' ? ' 🧩' : '') +
          '</option>'
        );
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:40rem" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-3">' +
        (id ? 'ویرایش تولید' : 'ثبت تولید') +
        '</h3>' +
        '<form id="prod-form" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label>' +
        (typeof jalaliInput === 'function' ? jalaliInput('date', item.date) : '<input name="date" class="input-field" value="' + (item.date || '') + '" />') +
        '</div>' +
        '<div><label class="text-xs text-slate-400">محصول</label>' +
        '<select name="product_name" id="prod-product" class="input-field" required>' +
        '<option value="">انتخاب</option>' +
        productOpts +
        '</select></div></div>' +
        '<div id="prod-single-block">' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-slate-400">تعداد / خروجی</label><input name="quantity" id="prod-qty" type="number" step="0.001" class="input-field" value="' +
        (item.quantity || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">وزن مصرفی ماده (کیلو)</label><input name="material_weight" id="prod-weight" type="number" step="0.001" class="input-field" value="' +
        (item.material_weight || '') +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">ماده اولیه</label><input name="material_name" id="prod-mat" class="input-field" value="' +
        (item.material_name || '') +
        '" readonly /></div></div>' +
        '<div id="prod-multi-block" class="hidden space-y-2">' +
        '<div class="glass-card rounded-xl p-3 border border-brand-500/20">' +
        '<div class="text-sm font-medium mb-1">🧩 مواد مصرفی این پخت</div>' +
        '<p class="text-[10px] text-slate-500 mb-2">مقادیر الگو را می‌توانید مطابق واقعیت تغییر دهید. موجودی از همین اعداد کم می‌شود.</p>' +
        '<div id="prod-recipe-rows" class="space-y-2"></div>' +
        '<button type="button" class="btn-ghost text-xs mt-1" id="prod-add-mat">+ ماده اضافه</button></div>' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-slate-400">خروجی واقعی / نهایی (کیلو یا واحد)</label>' +
        '<input id="prod-qty-multi" type="number" step="0.001" class="input-field" value="' +
        (item.quantity || '') +
        '" placeholder="مثلاً ۴۶" />' +
        '<p class="text-[10px] text-slate-500 mt-1">اگر وزن کردید همین را بزنید</p></div>' +
        '<div class="flex flex-col justify-end gap-1">' +
        '<button type="button" class="btn-secondary text-sm" id="prod-estimate">تخمین خروجی از ضریب</button>' +
        '<p id="prod-yield-hint" class="text-[10px] text-slate-500"></p></div></div></div>' +
        '<div><label class="text-xs text-slate-400">تولیدکننده</label><select name="producer_name" class="input-field"><option value="">—</option>' +
        personnelOpts +
        '</select></div>' +
        '<div class="grid grid-cols-3 gap-2">' +
        '<div><label class="text-xs text-slate-400">شیفت</label><input name="shift_code" class="input-field" value="' +
        (item.shift_code || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">شروع</label><input name="start_time" class="input-field" value="' +
        (item.start_time || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">پایان</label><input name="end_time" class="input-field" value="' +
        (item.end_time || '') +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">مانده</label><select name="remainder_type" id="prod-rem" class="input-field">' +
        '<option value="حمل به روز بعد"' +
        (item.remainder_type !== 'برگشت به مواد' ? ' selected' : '') +
        '>حمل به روز بعد</option>' +
        '<option value="برگشت به مواد"' +
        (item.remainder_type === 'برگشت به مواد' ? ' selected' : '') +
        '>برگشت به مواد</option></select></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">تعداد مانده</label><input name="remainder_count" type="number" step="0.01" class="input-field" value="' +
        (item.remainder_count || 0) +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">وزن مانده</label><input name="remainder_weight" type="number" step="0.001" class="input-field" value="' +
        (item.remainder_weight || 0) +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">' +
        (item.notes || '') +
        '</textarea></div>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );

    window.__prodRecipeMap = recipeMap;
    window.__prodMaterials = ((await DB.getAll('materials').catch(function () { return []; })) || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });

    var prodSelect = document.getElementById('prod-product');
    var singleBlock = document.getElementById('prod-single-block');
    var multiBlock = document.getElementById('prod-multi-block');
    var recipeRows = document.getElementById('prod-recipe-rows');
    var qtyInput = document.getElementById('prod-qty');
    var weightInput = document.getElementById('prod-weight');
    var matInput = document.getElementById('prod-mat');
    var remSelect = document.getElementById('prod-rem');
    var qtyMulti = document.getElementById('prod-qty-multi');
    var yieldHint = document.getElementById('prod-yield-hint');

    function matSelectHtml(selected) {
      return (
        '<select data-f="mat" class="input-field text-sm">' +
        '<option value="">—</option>' +
        window.__prodMaterials
          .map(function (m) {
            return (
              '<option value="' +
              m.name +
              '"' +
              (selected === m.name ? ' selected' : '') +
              '>' +
              m.name +
              '</option>'
            );
          })
          .join('') +
        '</select>'
      );
    }

    function addRecipeRow(name, qty) {
      var div = document.createElement('div');
      div.className = 'pr-row grid grid-cols-5 gap-2 items-end';
      div.innerHTML =
        '<div class="col-span-3"><label class="text-[10px] text-slate-500">ماده</label>' +
        matSelectHtml(name || '') +
        '</div>' +
        '<div><label class="text-[10px] text-slate-500">مقدار</label>' +
        '<input data-f="qty" type="number" step="0.001" min="0" class="input-field text-sm" value="' +
        (qty != null && qty !== '' ? qty : '') +
        '" /></div>' +
        '<div><button type="button" class="btn-ghost text-xs text-red-400 w-full">✕</button></div>';
      recipeRows.appendChild(div);
      div.querySelector('button').onclick = function () {
        div.remove();
      };
    }

    function fillRecipeRows(productName, fromConsumptions) {
      recipeRows.innerHTML = '';
      if (fromConsumptions && fromConsumptions.length) {
        fromConsumptions.forEach(function (c) {
          addRecipeRow(c.material_name, c.quantity);
        });
        return;
      }
      var rec = recipeMap[productName];
      if (rec && rec.items.length) {
        rec.items.forEach(function (i) {
          addRecipeRow(i.material_name, i.qty);
        });
      } else {
        addRecipeRow('', '');
      }
      var yf = rec && rec.recipe && rec.recipe.yield_factor != null ? Number(rec.recipe.yield_factor) : null;
      yieldHint.textContent = yf
        ? 'ضریب پخت تعریف‌شده: ' + yf + ' — دکمه تخمین = جمع مواد × ضریب'
        : 'ضریب پخت تعریف نشده — خروجی را دستی بزنید';
    }

    function isMulti(name) {
      return !!(recipeMap[name] && recipeMap[name].items && recipeMap[name].items.length);
    }

    function updateMode() {
      var name = prodSelect.value;
      var opt = prodSelect.selectedOptions[0];
      if (!name) {
        singleBlock.classList.remove('hidden');
        multiBlock.classList.add('hidden');
        return;
      }
      if (isMulti(name)) {
        singleBlock.classList.add('hidden');
        multiBlock.classList.remove('hidden');
        if (!id || item.product_name !== name) fillRecipeRows(name, null);
        else if (consumptions.length) fillRecipeRows(name, consumptions);
        else fillRecipeRows(name, null);
      } else {
        singleBlock.classList.remove('hidden');
        multiBlock.classList.add('hidden');
        if (opt) {
          matInput.value = opt.dataset.mat || '';
          remSelect.value = opt.dataset.rem || 'حمل به روز بعد';
          var wpu = Number(opt.dataset.w || 0);
          var qty = Number(qtyInput.value || 0);
          if (qty && wpu) weightInput.value = ((qty * wpu) / 1000).toFixed(3);
        }
      }
    }

    prodSelect.onchange = updateMode;
    qtyInput.oninput = function () {
      var opt = prodSelect.selectedOptions[0];
      if (!opt || isMulti(opt.value)) return;
      var wpu = Number(opt.dataset.w || 0);
      var qty = Number(qtyInput.value || 0);
      if (qty && wpu) weightInput.value = ((qty * wpu) / 1000).toFixed(3);
      matInput.value = opt.dataset.mat || '';
    };

    document.getElementById('prod-add-mat').onclick = function () {
      addRecipeRow('', '');
    };
    document.getElementById('prod-estimate').onclick = function () {
      var name = prodSelect.value;
      var rec = recipeMap[name];
      var yf = rec && rec.recipe && rec.recipe.yield_factor != null ? Number(rec.recipe.yield_factor) : null;
      if (!yf) return toast('برای این محصول ضریب پخت تعریف نشده', 'info');
      var sum = 0;
      document.querySelectorAll('#prod-recipe-rows .pr-row').forEach(function (row) {
        sum += Number(row.querySelector('[data-f="qty"]').value) || 0;
      });
      if (!sum) return toast('اول مواد مصرفی را وارد کنید', 'error');
      qtyMulti.value = (sum * yf).toFixed(3);
      toast('خروجی تخمینی: ' + qtyMulti.value, 'success');
    };

    updateMode();

    document.getElementById('prod-form').onsubmit = async function (ev) {
      ev.preventDefault();
      var btn = ev.target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'در حال ذخیره...';
      }
      try {
        var fd = Object.fromEntries(new FormData(ev.target).entries());
        var name = fd.product_name;
        var data = Object.assign({}, fd);
        data.duration_minutes = data.duration_minutes ? Number(data.duration_minutes) : null;
        data.remainder_count = Number(data.remainder_count || 0);
        data.remainder_weight = Number(data.remainder_weight || 0);
        data.created_at = item.created_at || new Date().toISOString();

        if (isMulti(name)) {
          var cons = [];
          document.querySelectorAll('#prod-recipe-rows .pr-row').forEach(function (row) {
            var mat = row.querySelector('[data-f="mat"]').value;
            var q = Number(row.querySelector('[data-f="qty"]').value);
            if (mat && q > 0) cons.push({ material_name: mat, quantity: q });
          });
          if (!cons.length) {
            toast('حداقل یک ماده مصرفی وارد کنید', 'error');
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'ذخیره';
            }
            return;
          }
          var totalIn = cons.reduce(function (s, c) {
            return s + Number(c.quantity);
          }, 0);
          var outQty = Number(qtyMulti.value);
          if (!outQty && outQty !== 0) {
            toast('خروجی (واقعی یا تخمینی) را وارد کنید', 'error');
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'ذخیره';
            }
            return;
          }
          data.quantity = outQty;
          data.material_weight = totalIn;
          data.material_name = 'ترکیبی';
          data._consumptions = cons;
        } else {
          data.quantity = Number(data.quantity);
          data.material_weight = Number(data.material_weight);
          if (!data.material_name) data.material_name = matInput.value;
          data._consumptions = null;
        }

        if (id) {
          data.id = id;
          await DB.updateProductionWithReturn(data);
          toast('ویرایش شد', 'success');
        } else {
          await DB.addProductionWithReturn(data);
          toast('تولید ثبت شد', 'success');
        }
        closeModal();
        navigate('productions');
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ذخیره تولید', 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'ذخیره';
        }
      }
    };
  };
})();
