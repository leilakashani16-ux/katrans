/**
 * ui-ux-patch.js
 * - جستجوی تایپ‌پذیر برای انتخاب محصول در تولید
 * - جستجو در مواد اولیه و محصولات
 * - حذف دکمه ورود اکسل اداره و ایمپورت راجا
 * - بهای فروشگاهی: افزودن محصول دستی
 * - حذف توضیحات همگام‌سازی از گزارش
 * - غیرفعال‌سازی پرسنل بدون حذف رکورد
 */
(function () {
  'use strict';

  function toast(msg, type) {
    try {
      if (window.toast) return window.toast(msg, type);
    } catch (e) {}
    console.log('[toast]', type, msg);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ========== 1) Searchable product select in production ========== */
  function enhanceProdSelect(select) {
    if (!select || select.dataset.searchable === '1') return;
    select.dataset.searchable = '1';

    var wrap = document.createElement('div');
    wrap.className = 'prod-search-wrap';
    wrap.style.cssText = 'position:relative;width:100%';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = select.className || 'input-field';
    input.placeholder = 'جستجو کد یا نام محصول...';
    input.autocomplete = 'off';
    input.style.cssText = 'width:100%';

    var list = document.createElement('div');
    list.className = 'prod-search-list';
    list.style.cssText =
      'display:none;position:absolute;z-index:50;left:0;right:0;top:100%;max-height:220px;overflow:auto;' +
      'background:var(--card-bg,#0f172a);border:1px solid rgba(148,163,184,.35);border-radius:10px;margin-top:4px;';

    var options = Array.prototype.slice.call(select.options || []).filter(function (o) {
      return o.value;
    });

    function renderList(q) {
      q = (q || '').trim().toLowerCase();
      list.innerHTML = '';
      var n = 0;
      options.forEach(function (o) {
        var text = (o.textContent || '').trim();
        var val = o.value;
        if (q && text.toLowerCase().indexOf(q) < 0 && String(val).toLowerCase().indexOf(q) < 0) return;
        var row = document.createElement('div');
        row.style.cssText = 'padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(148,163,184,.12)';
        row.textContent = text;
        row.onmousedown = function (e) {
          e.preventDefault();
          select.value = val;
          input.value = text;
          list.style.display = 'none';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        };
        list.appendChild(row);
        n++;
      });
      list.style.display = n ? 'block' : 'none';
    }

    // keep selected label
    if (select.value) {
      var sel = options.find(function (o) { return o.value === select.value; });
      if (sel) input.value = (sel.textContent || '').trim();
    }

    input.addEventListener('focus', function () { renderList(input.value); });
    input.addEventListener('input', function () { renderList(input.value); });
    input.addEventListener('blur', function () {
      setTimeout(function () { list.style.display = 'none'; }, 180);
    });

    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(input);
    wrap.appendChild(list);
    wrap.appendChild(select);
  }

  function scanProdSelects() {
    document.querySelectorAll('select#prod-product, select[name="product_name"]').forEach(enhanceProdSelect);
  }

  /* ========== 2) Table search helper ========== */
  function injectTableSearch(root, placeholder) {
    if (!root || root.querySelector('.ux-table-search')) return;
    var table = root.querySelector('table.data, table');
    if (!table) return;
    var box = document.createElement('div');
    box.className = 'ux-table-search mb-3';
    box.innerHTML =
      '<input type="search" class="input-field" placeholder="' +
      esc(placeholder || 'جستجو کد یا نام...') +
      '" style="max-width:360px" />';
    var input = box.querySelector('input');
    var parent = table.closest('.glass-card, .table-wrap, div') || table.parentNode;
    parent.insertBefore(box, parent.firstChild);

    input.addEventListener('input', function () {
      var q = (input.value || '').trim().toLowerCase();
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function (tr) {
        var text = (tr.textContent || '').toLowerCase();
        tr.style.display = !q || text.indexOf(q) >= 0 ? '' : 'none';
      });
    });
  }

  function enhanceMaterialsAndProducts() {
    var title = document.querySelector('h1');
    if (!title) return;
    var t = title.textContent || '';
    var main = document.getElementById('main-content') || document.getElementById('page-content') || document.body;
    if (t.indexOf('مواد اولیه') >= 0) {
      injectTableSearch(main, 'جستجو کد یا نام ماده...');
      // hide org-sync buttons
      document.querySelectorAll('#btn-org-sync, #btn-org-export').forEach(function (el) {
        el.style.display = 'none';
      });
      document.querySelectorAll('button').forEach(function (btn) {
        var tx = (btn.textContent || '').trim();
        if (tx.indexOf('ورود از اکسل اداره') >= 0 || tx.indexOf('خروجی برای اداره') >= 0) {
          btn.style.display = 'none';
        }
      });
    }
    if (t.indexOf('انواع محصول') >= 0 || t.indexOf('محصولات') >= 0) {
      injectTableSearch(main, 'جستجو کد یا نام محصول...');
      document.querySelectorAll('button').forEach(function (btn) {
        var tx = (btn.textContent || '').trim();
        if (tx.indexOf('ایمپورت کامل راجا') >= 0) btn.style.display = 'none';
      });
    }
    if (t.indexOf('بهای') >= 0 || t.indexOf('فروشگاهی') >= 0) {
      enhanceDishCostPage(main);
    }
    if (t.indexOf('گزارش') >= 0 || t.indexOf('پشتیبان') >= 0) {
      stripSyncBlurb(main);
    }
    if (t.indexOf('پرسنل') >= 0) {
      enhancePersonnelPage(main);
    }
  }

  /* ========== 3) Dish cost: add product + no bulk import ========== */
  function enhanceDishCostPage(root) {
    if (!root || root.querySelector('.ux-dish-add')) return;
    // hide any import-ish buttons
    root.querySelectorAll('button').forEach(function (btn) {
      var tx = (btn.textContent || '').trim();
      if (/ایمپورت|ورود لیست|ثبت لیست|seed|گاردنیا کامل/i.test(tx)) {
        btn.style.display = 'none';
      }
    });

    var bar = document.createElement('div');
    bar.className = 'ux-dish-add mb-4 flex flex-wrap gap-2 items-end';
    bar.innerHTML =
      '<div style="flex:1;min-width:120px">' +
      '<label class="text-xs text-slate-400">کد</label>' +
      '<input id="ux-dish-code" class="input-field" placeholder="مثلاً G044" />' +
      '</div>' +
      '<div style="flex:2;min-width:160px">' +
      '<label class="text-xs text-slate-400">نام غذا</label>' +
      '<input id="ux-dish-name" class="input-field" placeholder="نام محصول فروشگاهی" />' +
      '</div>' +
      '<button type="button" class="btn-primary" id="ux-dish-save">+ افزودن به لیست</button>';

    var h1 = root.querySelector('h1');
    if (h1 && h1.parentNode) {
      h1.parentNode.parentNode.insertBefore(bar, h1.parentNode.nextSibling);
    } else {
      root.insertBefore(bar, root.firstChild);
    }

    var saveBtn = document.getElementById('ux-dish-save');
    if (saveBtn) {
      saveBtn.onclick = async function () {
        var code = (document.getElementById('ux-dish-code').value || '').trim();
        var name = (document.getElementById('ux-dish-name').value || '').trim();
        if (!code || !name) return toast('کد و نام الزامی است', 'error');
        try {
          await Api.add('products', {
            code: code,
            name: name,
            weight_per_unit: 1,
            description: 'منو فروشگاهی گاردنیا | واحد بها: ریال',
            remainder_type: 'حمل به روز بعد',
            active: 1
          });
          toast('محصول اضافه شد', 'success');
          if (typeof navigate === 'function') navigate('dishCost');
          else location.reload();
        } catch (e) {
          toast(e.message || 'خطا در افزودن', 'error');
        }
      };
    }
  }

  /* ========== 4) Reports: strip sync explanations ========== */
  function stripSyncBlurb(root) {
    if (!root) return;
    root.querySelectorAll('p, div, section, h2, h3').forEach(function (el) {
      var tx = (el.textContent || '').trim();
      if (!tx) return;
      if (/همگام.?سازی|چند دستگاه|polling|هر ۲۰ ثانیه|sync/i.test(tx) && tx.length < 400) {
        // hide small blurb blocks, not whole page
        if (el.tagName === 'P' || (el.children.length <= 3 && tx.length < 250)) {
          el.style.display = 'none';
        }
      }
    });
    root.querySelectorAll('button, a').forEach(function (el) {
      var tx = (el.textContent || '').trim();
      if (/همگام.?سازی|اجبار همگام|force sync/i.test(tx)) el.style.display = 'none';
    });
  }

  /* ========== 5) Personnel deactivate ========== */
  function enhancePersonnelPage(root) {
    if (!root || root.querySelector('.ux-person-tools')) return;
    // add deactivate buttons next to edit if missing
    root.querySelectorAll('table.data tbody tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('td');
      if (cells.length < 4) return;
      var activeCell = cells[3];
      var actionCell = cells[cells.length - 1];
      if (!actionCell || actionCell.querySelector('.ux-toggle-active')) return;
      var editBtn = actionCell.querySelector('button[onclick*="showPersonForm"]');
      if (!editBtn) return;
      var onclick = editBtn.getAttribute('onclick') || '';
      var m = onclick.match(/showPersonForm\((\d+)\)/);
      if (!m) return;
      var id = m[1];
      var isActive = /badge-ok|بله/.test(activeCell.innerHTML);
      var btn = document.createElement('button');
      btn.className = 'btn-ghost text-xs ux-toggle-active';
      btn.textContent = isActive ? 'غیرفعال کردن' : 'فعال کردن';
      btn.style.color = isActive ? '#f87171' : '#34d399';
      btn.onclick = function () {
        togglePersonActive(Number(id), !isActive);
      };
      actionCell.appendChild(btn);
    });
  }

  async function togglePersonActive(id, makeActive) {
    try {
      var item = await DB.getById('personnel', id);
      if (!item) return toast('پرسنل پیدا نشد', 'error');
      item.active = makeActive ? 1 : 0;
      // boolean variants
      if (item.active === false || item.active === true) item.active = makeActive;
      await Api.put('personnel', item);
      toast(makeActive ? 'پرسنل فعال شد' : 'پرسنل غیرفعال شد — از لیست غذا و آمار کنار گذاشته می‌شود', 'success');
      if (typeof navigate === 'function') navigate('personnel');
      else if (typeof Pages !== 'undefined' && Pages.personnel) {
        // fallback
        location.hash = '#personnel';
        location.reload();
      }
    } catch (e) {
      toast(e.message || 'خطا در تغییر وضعیت', 'error');
    }
  }

  // Patch person form to include active checkbox (always was forced to 1)
  function patchPersonForm() {
    if (!window.Pages || !Pages.showPersonForm || Pages.showPersonForm.__uxPatched) return;
    var orig = Pages.showPersonForm;
    Pages.showPersonForm = async function (id) {
      await orig.apply(this, arguments);
      setTimeout(function () {
        var form = document.getElementById('person-form');
        if (!form || form.querySelector('[name="active"]')) return;
        var box = document.createElement('div');
        box.innerHTML =
          '<label class="text-xs text-slate-400 flex items-center gap-2">' +
          '<input type="checkbox" name="active" value="1" ' +
          (id ? '' : 'checked') +
          ' /> فعال (اگر خاموش باشد در غذای روزانه و آمار محاسبه نمی‌شود)</label>';
        var actions = form.querySelector('.flex.gap-2');
        if (actions) form.insertBefore(box, actions);
        else form.appendChild(box);

        // if editing, set checkbox from current
        if (id) {
          DB.getById('personnel', id).then(function (item) {
            var cb = form.querySelector('[name="active"]');
            if (cb && item) cb.checked = item.active !== false && item.active !== 0;
          });
        }

        form.onsubmit = async function (ev) {
          ev.preventDefault();
          var btn = form.querySelector('button[type="submit"]');
          if (btn) {
            btn.disabled = true;
            btn.textContent = 'در حال ذخیره...';
          }
          try {
            var data = Object.fromEntries(new FormData(form).entries());
            data.active = form.querySelector('[name="active"]').checked ? 1 : 0;
            if (id) {
              data.id = id;
              var prev = await DB.getById('personnel', id);
              await Api.put('personnel', Object.assign({}, prev || {}, data));
            } else {
              await Api.add('personnel', data);
            }
            toast('ذخیره شد', 'success');
            closeModal();
            navigate('personnel');
          } catch (e) {
            toast(e.message || 'خطا', 'error');
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'ذخیره';
            }
          }
        };
      }, 50);
    };
    Pages.showPersonForm.__uxPatched = true;
  }

  /* ========== Disable injectors for import buttons ========== */
  function neutralizeImportInjectors() {
    // org-sync: stop injecting admin excel buttons
    if (window.Pages && Pages.materials) {
      try {
        Pages.materials.__orgSyncPatched = true;
      } catch (e) {}
    }
    // hide if already present
    document.querySelectorAll('#btn-org-sync, #btn-org-export').forEach(function (el) {
      el.remove();
    });
  }

  /* ========== Observer ========== */
  function onDom() {
    try {
      scanProdSelects();
      enhanceMaterialsAndProducts();
      neutralizeImportInjectors();
      patchPersonForm();
    } catch (e) {
      console.warn('ui-ux-patch', e);
    }
  }

  var obs = new MutationObserver(function () {
    onDom();
  });
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      obs.observe(document.body, { childList: true, subtree: true });
      onDom();
    });
  }
  setTimeout(onDom, 400);
  setTimeout(onDom, 1200);
  setTimeout(patchPersonForm, 800);

  // export
  window.UXPatch = { scanProdSelects: scanProdSelects, togglePersonActive: togglePersonActive };
})();
