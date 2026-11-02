/**
 * processing-marinade-fix.js
 * - مقصد مرینیت: خروجی = وزن ماده اصلی (سینه) − پرت (نه جمع ادویه‌ها)
 * - بارگذاری خودکار اقلام رسپی مرینیت و کسر از موجودی
 * - پرت واقعاً از موجودی کم می‌شود (اصلاح calcStock)
 */
(function () {
  'use strict';

  var MARIN_TARGETS = {
    'سینه مرینیت جوجه': 'سینه مرغ',
    'سینه فسنجان': 'سینه مرغ',
    'سینه سالاد': 'سینه مرغ'
  };

  function isMarinTarget(name) {
    return !!MARIN_TARGETS[name] || /مرینیت/.test(name || '');
  }

  function primaryFor(target) {
    return MARIN_TARGETS[target] || 'سینه مرغ';
  }

  async function loadRecipeLines(productName) {
    var items =
      ((await DB.getAll('recipe_items').catch(function () {
        return [];
      })) ||
        []).filter(function (i) {
        return i.product_name === productName && !i.deleted_at;
      });
    return items.map(function (i) {
      return {
        material: i.material_name,
        qty: Number(i.qty != null ? i.qty : i.quantity) || 0
      };
    });
  }

  /* ——— اصلاح calcStock: پرت فرآوری از موجودی مبدأ اصلی کم شود ——— */
  function patchCalcStock() {
    if (!DB || typeof DB.calcStock !== 'function' || DB.__marinWastePatched) return;
    var orig = DB.calcStock.bind(DB);
    DB.calcStock = async function () {
      var rows = await orig();
      var procs =
        ((await DB.getAll('processings').catch(function () {
          return [];
        })) ||
          []).filter(function (p) {
          return !p.deleted_at;
        });

      // برای هر فرآوری: اگر waste > (جمع مبدأ − خروجی) فقط کسری باقیمانده را اضافه کم کن
      // معمولاً وقتی خروجی دستی = مبدأ باشد و پرت جدا زده شده
      var extraWasteByMat = {};
      procs.forEach(function (pr) {
        var waste = Number(pr.waste_qty || 0);
        if (!(waste > 0)) return;
        var sources = [];
        if (pr.sources_json) {
          try {
            var lines = JSON.parse(pr.sources_json);
            if (Array.isArray(lines)) sources = lines;
          } catch (e) {}
        }
        if (!sources.length && pr.source_material) {
          sources = [{ material: pr.source_material, qty: Number(pr.source_qty) || 0 }];
        }
        var sourceSum = sources.reduce(function (s, l) {
          return s + Number(l.qty || l.quantity || 0);
        }, 0);
        var target = Number(pr.target_qty || 0);
        var gap = Math.max(0, sourceSum - target);
        var missing = Math.round((waste - gap) * 1000) / 1000;
        if (missing <= 0.0001) return; // پرت قبلاً در اختلاف مبدأ/خروجی هست
        // به ماده اصلی (اولین مبدأ یا parent مرینیت) بزن
        var mainMat =
          (isMarinTarget(pr.target_material) ? primaryFor(pr.target_material) : null) ||
          pr.source_material ||
          (sources[0] && (sources[0].material || sources[0].material_name));
        if (!mainMat) return;
        extraWasteByMat[mainMat] = (extraWasteByMat[mainMat] || 0) + missing;
      });

      if (!Object.keys(extraWasteByMat).length) return rows;

      return rows.map(function (m) {
        var extra = extraWasteByMat[m.name] || 0;
        if (!extra) return m;
        var cur = Number(m.current_stock || 0) - extra;
        var tw = Number(m.total_waste || 0) + extra;
        return Object.assign({}, m, {
          total_waste: Math.round(tw * 100) / 100,
          current_stock: Math.round(cur * 100) / 100,
          status: cur <= 0 ? 'تمام شد' : cur < (m.min_alert || 0) ? 'هشدار' : 'عادی'
        });
      });
    };
    DB.__marinWastePatched = true;
  }

  /* ——— فرم فرآوری: حالت مرینیت ——— */
  function patchForm() {
    if (typeof Pages === 'undefined' || Pages.__marinFormPatched) return;
    var orig = Pages.showProcessingForm;
    if (typeof orig !== 'function') return;

    Pages.showProcessingForm = async function (id) {
      // برای ویرایش (id) همان قبلی
      if (id) return orig.apply(this, arguments);

      await orig.apply(this, arguments);

      setTimeout(function () {
        enhanceForm();
      }, 80);
    };
    Pages.__marinFormPatched = true;
  }

  async function enhanceForm() {
    var form = document.getElementById('proc-form-multi');
    if (!form || form.dataset.marinEnhanced) return;
    form.dataset.marinEnhanced = '1';

    var tgtSel =
      form.querySelector('[name="target_material"]') ||
      document.getElementById('proc-target-multi');
    var sourcesEl = document.getElementById('proc-sources');
    var wasteInp = document.getElementById('proc-waste');
    var tgtQty = document.getElementById('proc-tgt-qty');
    var hint = document.getElementById('proc-hint');
    if (!tgtSel || !sourcesEl || !tgtQty) return;

    // همه مواد در انتخاب مبدأ (نه فقط raw)
    var materials =
      ((await DB.getAll('materials').catch(function () {
        return [];
      })) ||
        []).filter(function (m) {
        return m.active !== false && m.active !== 0;
      });
    var allOpts = materials
      .map(function (m) {
        return '<option value="' + m.name + '">' + m.name + '</option>';
      })
      .join('');

    function expandMatSelects() {
      sourcesEl.querySelectorAll('.src-mat').forEach(function (sel) {
        var cur = sel.value;
        if (sel.dataset.expanded) return;
        sel.dataset.expanded = '1';
        var keep = sel.innerHTML;
        // اگر گزینه کم است، همه مواد را بگذار
        if (sel.options.length < materials.length) {
          sel.innerHTML = '<option value="">ماده مبدأ…</option>' + allOpts;
          if (cur) sel.value = cur;
        }
      });
    }
    expandMatSelects();

    var recipeCache = {};
    async function getRecipe(name) {
      if (recipeCache[name]) return recipeCache[name];
      recipeCache[name] = await loadRecipeLines(name);
      return recipeCache[name];
    }

    function primaryQty() {
      var primary = primaryFor(tgtSel.value);
      var q = 0;
      sourcesEl.querySelectorAll('.src-row').forEach(function (row) {
        var mat = row.querySelector('.src-mat') && row.querySelector('.src-mat').value;
        var qty = Number(row.querySelector('.src-qty') && row.querySelector('.src-qty').value) || 0;
        if (mat === primary) q += qty;
      });
      return q;
    }

    function sumAll() {
      var s = 0;
      sourcesEl.querySelectorAll('.src-row').forEach(function (row) {
        s += Number(row.querySelector('.src-qty') && row.querySelector('.src-qty').value) || 0;
      });
      return s;
    }

    function marinRecalc() {
      var waste = Number(wasteInp && wasteInp.value) || 0;
      var targetName = tgtSel.value;
      if (isMarinTarget(targetName)) {
        var pq = primaryQty();
        if (pq > 0 && (!tgtQty.dataset.auto || tgtQty.dataset.auto === '1')) {
          tgtQty.value = Math.max(0, Math.round((pq - waste) * 1000) / 1000);
          tgtQty.dataset.auto = '1';
        }
        if (hint) {
          hint.textContent =
            'حالت مرینیت: خروجی = وزن ' +
            primaryFor(targetName) +
            ' − پرت (' +
            (Math.round((pq - waste) * 1000) / 1000) +
            ') · ادویه‌ها از موجودی کم می‌شوند ولی به وزن خروجی اضافه نمی‌شوند';
          hint.className = 'text-[10px] text-emerald-400/90';
        }
      } else {
        var src = sumAll();
        if (src > 0 && (!tgtQty.dataset.auto || tgtQty.dataset.auto === '1')) {
          tgtQty.value = Math.max(0, Math.round((src - waste) * 1000) / 1000);
          tgtQty.dataset.auto = '1';
        }
        if (hint) {
          hint.textContent =
            'جمع مبدأ: ' +
            (Math.round(src * 1000) / 1000) +
            ' | پرت: ' +
            waste +
            ' | خروجی: ' +
            Math.max(0, Math.round((src - waste) * 1000) / 1000);
          hint.className = 'text-[10px] text-slate-500';
        }
      }
    }

    async function fillRecipeSources() {
      var targetName = tgtSel.value;
      if (!isMarinTarget(targetName)) return;
      var recipe = await getRecipe(targetName);
      if (!recipe.length) {
        // fallback: فقط ماده اصلی
        recipe = [{ material: primaryFor(targetName), qty: 1 }];
      }
      var primary = primaryFor(targetName);
      // مقدار پایه از ردیف فعلی ماده اصلی یا ۱
      var base = primaryQty() || 1;
      var primaryLine = recipe.find(function (r) {
        return r.material === primary;
      });
      var recipePrimaryQty = primaryLine ? primaryLine.qty : 1;
      if (!(recipePrimaryQty > 0)) recipePrimaryQty = 1;
      var scale = base / recipePrimaryQty;

      sourcesEl.innerHTML = '';
      recipe.forEach(function (r) {
        var qty = Math.round(r.qty * scale * 100000) / 100000;
        var row =
          '<div class="src-row flex gap-2 mb-2 items-center">' +
          '<select class="input-field src-mat flex-1"><option value="">ماده مبدأ…</option>' +
          allOpts +
          '</select>' +
          '<input type="number" step="any" min="0" class="input-field src-qty" style="max-width:110px" value="' +
          qty +
          '" />' +
          '<button type="button" class="btn-ghost text-red-400 src-rm">×</button></div>';
        sourcesEl.insertAdjacentHTML('beforeend', row);
        var last = sourcesEl.lastElementChild;
        last.querySelector('.src-mat').value = r.material;
        last.querySelector('.src-qty').oninput = function () {
          // اگر ماده اصلی عوض شد، بقیه را دوباره scale نکن مگر دکمه
          marinRecalc();
        };
        last.querySelector('.src-rm').onclick = function () {
          if (sourcesEl.querySelectorAll('.src-row').length <= 1) return toast('حداقل یک مبدأ', 'error');
          last.remove();
          marinRecalc();
        };
      });
      // فوکوس: ماده اصلی را برجسته — مقدارش base
      sourcesEl.querySelectorAll('.src-row').forEach(function (row) {
        if (row.querySelector('.src-mat').value === primary) {
          row.querySelector('.src-qty').value = base;
        }
      });
      tgtQty.dataset.auto = '1';
      marinRecalc();
      toast('اقلام رسپی مرینیت بارگذاری شد', 'success');
    }

    // دکمه بارگذاری رسپی
    if (!document.getElementById('proc-load-marin-recipe')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'proc-load-marin-recipe';
      btn.className = 'btn-secondary text-xs mt-1 mr-2';
      btn.textContent = '🍗 بارگذاری رسپی مرینیت';
      btn.onclick = function () {
        fillRecipeSources();
      };
      var addBtn = document.getElementById('proc-add-src');
      if (addBtn && addBtn.parentElement) addBtn.parentElement.insertBefore(btn, addBtn);
    }

    tgtSel.addEventListener('change', function () {
      if (isMarinTarget(tgtSel.value)) {
        fillRecipeSources();
      } else {
        marinRecalc();
      }
    });
    if (wasteInp) wasteInp.addEventListener('input', marinRecalc);
    tgtQty.addEventListener('input', function () {
      tgtQty.dataset.auto = '0';
    });

    // bind existing rows
    sourcesEl.querySelectorAll('.src-qty').forEach(function (inp) {
      inp.addEventListener('input', marinRecalc);
    });

    // observer for new source rows
    var addBtn = document.getElementById('proc-add-src');
    if (addBtn) {
      var old = addBtn.onclick;
      addBtn.addEventListener('click', function () {
        setTimeout(function () {
          expandMatSelects();
          sourcesEl.querySelectorAll('.src-qty').forEach(function (inp) {
            inp.oninput = marinRecalc;
          });
        }, 30);
      });
    }
  }

  function boot() {
    patchCalcStock();
    patchForm();
  }
  boot();
  setTimeout(boot, 500);
  setTimeout(boot, 1500);

  console.log('[processing-marinade-fix] ready');
})();
