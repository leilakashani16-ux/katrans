/**
 * قیمت‌گذاری + هزینه رسپی بر اساس آخرین قیمت خرید مواد
 * وابسته به: materials.last_buy_price ، recipes ، recipe_items
 */
(function () {
  'use strict';

  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Math.round(Number(n)).toLocaleString('fa-IR');
  }

  function priceMap(materials) {
    var map = {};
    (materials || []).forEach(function (m) {
      map[m.name] = m.last_buy_price != null ? Number(m.last_buy_price) : null;
    });
    return map;
  }

  /** هزینه یک واحد محصول از روی رسپی */
  async function calcProductCost(productName) {
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var items = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
    var recipes = (await DB.getAll('recipes').catch(function () { return []; })) || [];
    var rec = recipes.find(function (r) { return r.product_name === productName; });
    var lines = items.filter(function (i) { return i.product_name === productName; });
    var pm = priceMap(materials);
    var total = 0;
    var detail = [];
    var missing = 0;
    lines.forEach(function (line) {
      var qty = Number(line.qty || line.quantity || 0);
      var unit = pm[line.material_name];
      var lineCost = unit != null && !isNaN(unit) ? qty * unit : null;
      if (lineCost == null) missing++;
      else total += lineCost;
      detail.push({
        material_name: line.material_name,
        qty: qty,
        unit_price: unit,
        line_cost: lineCost
      });
    });
    var yf = rec && rec.yield_factor != null && Number(rec.yield_factor) > 0 ? Number(rec.yield_factor) : null;
    return {
      product_name: productName,
      lines: detail,
      total_cost: total,
      missing_prices: missing,
      yield_factor: yf,
      cost_per_output: yf ? total / yf : null,
      has_recipe: lines.length > 0
    };
  }

  window.PagesCalcProductCost = calcProductCost;

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

  /* ========== ویرایش رسپی + نمایش هزینه زنده ========== */
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
    var pm = priceMap(materials);

    var matOpts = materials
      .map(function (m) {
        var p = m.last_buy_price != null ? ' · ' + fmtPrice(m.last_buy_price) + 'ت' : '';
        return '<option value="' + m.name + '">' + m.name + (m.unit ? ' (' + m.unit + ')' : '') + p + '</option>';
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:640px" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-1">🧩 رسپی و هزینه</h3>' +
        '<p class="text-xs text-slate-400 mb-3">' +
        productName +
        ' — مواد + مقدار برای یک واحد پایه · هزینه از آخرین قیمت خرید</p>' +
        '<form id="recipe-form-cost" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">ضریب خروجی (اختیاری)</label>' +
        '<input name="yield_factor" id="rc-yield" type="number" step="0.001" class="input-field" value="' +
        (rec.yield_factor != null && rec.yield_factor !== '' ? rec.yield_factor : '') +
        '" placeholder="مثلاً تعداد پرس" /></div>' +
        '<div><label class="text-xs text-slate-400">یادداشت</label>' +
        '<input name="notes" class="input-field" value="' +
        String(rec.notes || '').replace(/"/g, '&quot;') +
        '" /></div></div>' +
        '<div><label class="text-xs text-slate-400">اقلام رسپی</label>' +
        '<div id="rc-rows" class="tf-rows-scroll space-y-2"></div>' +
        '<button type="button" id="rc-add-row" class="btn-secondary text-xs mt-2">+ ماده</button></div>' +
        '<div class="glass-card rounded-xl p-3 text-sm">' +
        '<div class="flex justify-between"><span class="text-slate-400">هزینه مواد (با آخرین قیمت)</span>' +
        '<span id="rc-cost-total" class="font-bold text-emerald-300">—</span></div>' +
        '<div class="flex justify-between mt-1 text-xs"><span class="text-slate-500">هزینه هر واحد خروجی</span>' +
        '<span id="rc-cost-unit" class="text-brand-300">—</span></div>' +
        '<p id="rc-cost-warn" class="text-[10px] text-amber-400 mt-1 hidden">بعضی مواد قیمت خرید ندارند</p></div>' +
        '<div class="modal-sticky-actions flex gap-2 flex-wrap">' +
        '<button type="submit" class="btn-primary flex-1">💾 ذخیره رسپی</button>' +
        '<button type="button" id="rc-clear" class="btn-ghost text-red-400">حذف رسپی</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    var box = document.getElementById('rc-rows');

    function recalcCost() {
      var total = 0;
      var missing = 0;
      box.querySelectorAll('.rc-row').forEach(function (row) {
        var mat = row.querySelector('[data-f="mat"]').value;
        var qty = Number(row.querySelector('[data-f="qty"]').value) || 0;
        var unit = pm[mat];
        var lineEl = row.querySelector('[data-f="linecost"]');
        if (mat && qty > 0 && unit != null && !isNaN(unit)) {
          var lc = qty * unit;
          total += lc;
          if (lineEl) lineEl.textContent = fmtPrice(lc);
        } else {
          if (mat && qty > 0) missing++;
          if (lineEl) lineEl.textContent = '—';
        }
      });
      var yf = Number(document.getElementById('rc-yield').value) || 0;
      document.getElementById('rc-cost-total').textContent = total ? fmtPrice(total) + ' تومان' : '—';
      document.getElementById('rc-cost-unit').textContent =
        total && yf > 0 ? fmtPrice(total / yf) + ' تومان' : total ? fmtPrice(total) + ' (بدون ضریب)' : '—';
      var w = document.getElementById('rc-cost-warn');
      if (w) {
        if (missing) w.classList.remove('hidden');
        else w.classList.add('hidden');
      }
    }

    function addRow(name, qty) {
      var div = document.createElement('div');
      div.className = 'rc-row grid gap-2 items-center';
      div.style.gridTemplateColumns = '1.4fr 0.7fr 0.7fr auto';
      div.innerHTML =
        '<select data-f="mat" class="input-field"><option value="">ماده…</option>' +
        matOpts +
        '</select>' +
        '<input data-f="qty" type="number" step="0.001" min="0" class="input-field" placeholder="مقدار" value="' +
        (qty != null && qty !== '' ? qty : '') +
        '" />' +
        '<span data-f="linecost" class="text-xs text-emerald-300 text-left">—</span>' +
        '<button type="button" class="btn-ghost text-xs text-red-400">×</button>';
      box.appendChild(div);
      if (name) div.querySelector('[data-f="mat"]').value = name;
      div.querySelector('button').onclick = function () {
        div.remove();
        recalcCost();
      };
      div.querySelector('[data-f="mat"]').onchange = recalcCost;
      div.querySelector('[data-f="qty"]').oninput = recalcCost;
    }

    if (recItems.length) {
      recItems.forEach(function (i) {
        addRow(i.material_name, i.qty);
      });
    } else {
      addRow('', '');
      addRow('', '');
    }
    recalcCost();
    document.getElementById('rc-add-row').onclick = function () {
      addRow('', '');
    };
    document.getElementById('rc-yield').oninput = recalcCost;

    document.getElementById('rc-clear').onclick = async function () {
      if (!confirmAction('رسپی این محصول حذف شود؟')) return;
      try {
        var allR = (await DB.getAll('recipes')) || [];
        var allI = (await DB.getAll('recipe_items')) || [];
        for (var i = 0; i < allI.length; i++) {
          if (allI[i].product_name === productName) await DB.remove('recipe_items', allI[i].id);
        }
        for (var j = 0; j < allR.length; j++) {
          if (allR[j].product_name === productName) await DB.remove('recipes', allR[j].id);
        }
        toast('رسپی حذف شد', 'success');
        closeModal();
        navigate('products');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };

    document.getElementById('recipe-form-cost').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var rows = [];
      box.querySelectorAll('.rc-row').forEach(function (row) {
        var mat = row.querySelector('[data-f="mat"]').value;
        var qty = Number(row.querySelector('[data-f="qty"]').value);
        if (mat && qty > 0) rows.push({ material_name: mat, qty: qty });
      });
      if (!rows.length) return toast('حداقل یک ماده با مقدار', 'error');
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
        toast('رسپی ذخیره شد', 'success');
        closeModal();
        navigate('products');
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا', 'error');
      }
    };
  };

  /* ========== لیست محصولات + ستون هزینه ========== */
  Pages.products = async function () {
    var list = ((await DB.getAll('products').catch(function () { return []; })) || []).filter(function (p) {
      return p.active !== false && p.active !== 0;
    });
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var recipeMap = await loadRecipeMap();
    var pm = priceMap(materials);
    var canEdit = Auth.isAdmin();

    function costOf(name) {
      var block = recipeMap[name];
      if (!block || !block.items.length) return { text: '—', warn: false };
      var total = 0;
      var miss = 0;
      block.items.forEach(function (line) {
        var u = pm[line.material_name];
        var q = Number(line.qty || 0);
        if (u != null && !isNaN(u) && q > 0) total += u * q;
        else if (q > 0) miss++;
      });
      var yf = block.recipe && block.recipe.yield_factor != null ? Number(block.recipe.yield_factor) : 0;
      if (!total) return { text: miss ? 'بدون قیمت' : '—', warn: !!miss };
      if (yf > 0) return { text: fmtPrice(total / yf), warn: !!miss };
      return { text: fmtPrice(total), warn: !!miss };
    }

    var rows = list
      .map(function (p) {
        var hasR = !!recipeMap[p.name];
        var nItems = hasR ? recipeMap[p.name].items.length : 0;
        var c = costOf(p.name);
        return (
          '<tr>' +
          '<td class="text-xs text-slate-400">' +
          (p.code || '') +
          '</td>' +
          '<td class="font-medium">' +
          (p.name || '') +
          '</td>' +
          '<td>' +
          fmtNum(p.weight_per_unit) +
          '</td>' +
          '<td class="text-xs">' +
          (p.material_name || '—') +
          '</td>' +
          '<td class="text-xs">' +
          (hasR
            ? '<span class="badge badge-ok">' + nItems + ' ماده</span>'
            : '<span class="text-slate-500">بدون رسپی</span>') +
          '</td>' +
          '<td class="text-emerald-300 text-xs font-medium">' +
          c.text +
          (c.warn ? ' <span class="text-amber-400">*</span>' : '') +
          '</td>' +
          '<td class="whitespace-nowrap">' +
          (canEdit
            ? '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.editRecipe(\'' +
              String(p.name).replace(/'/g, "\\'") +
              '\')">رسپی</button>' +
              '<button class="btn-ghost text-xs" onclick="Pages.showProductForm && Pages.showProductForm(' +
              p.id +
              ')">ویرایش</button>'
            : '') +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">محصولات و رسپی</h1>' +
      '<p class="text-slate-400 text-sm">هزینه از آخرین قیمت خرید مواد · * یعنی بعضی مواد قیمت ندارند</p></div>' +
      (canEdit
        ? '<button class="btn-primary" onclick="Pages.showProductForm && Pages.showProductForm()">+ محصول</button>'
        : '') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>کد</th><th>نام</th><th>وزن واحد</th><th>ماده پیش‌فرض</th><th>رسپی</th><th>هزینه تقریبی</th><th></th></tr></thead>' +
      '<tbody>' +
      (rows || '<tr><td colspan="7" class="text-center text-slate-500 py-8">محصولی نیست</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  console.log('[pricing-recipes] recipe cost module loaded');
})();
