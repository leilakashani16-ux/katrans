/**
 * ui-ux-patch.js — جستجو + combobox تولید + غیرفعال پرسنل
 */
(function () {
  'use strict';

  function toastMsg(msg, type) {
    try { if (window.toast) return window.toast(msg, type); } catch (e) {}
  }

  function enhanceProdSelect(select) {
    if (!select || select.dataset.uxSearch === '1') return;
    select.dataset.uxSearch = '1';

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%';

    var input = document.createElement('input');
    input.type = 'search';
    input.className = select.className || 'input-field';
    input.placeholder = 'جستجو: کد یا نام محصول را تایپ کنید...';
    input.autocomplete = 'off';
    input.style.width = '100%';

    var list = document.createElement('div');
    list.style.cssText =
      'display:none;position:absolute;z-index:80;left:0;right:0;top:calc(100% + 4px);max-height:240px;overflow:auto;' +
      'background:#0f172a;border:1px solid rgba(148,163,184,.4);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.45)';

    function opts() {
      return Array.prototype.slice.call(select.options || []).filter(function (o) { return o.value; });
    }

    function paint(q) {
      q = String(q || '').trim().toLowerCase();
      list.innerHTML = '';
      var n = 0;
      opts().forEach(function (o) {
        var text = (o.textContent || '').trim();
        var val = o.value;
        if (q && text.toLowerCase().indexOf(q) < 0 && String(val).toLowerCase().indexOf(q) < 0) return;
        var row = document.createElement('div');
        row.style.cssText = 'padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(148,163,184,.1);font-size:14px';
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

    if (select.value) {
      var cur = opts().find(function (o) { return o.value === select.value; });
      if (cur) input.value = (cur.textContent || '').trim();
    }

    input.addEventListener('focus', function () { paint(input.value); });
    input.addEventListener('input', function () { paint(input.value); });
    input.addEventListener('blur', function () { setTimeout(function () { list.style.display = 'none'; }, 200); });

    select.style.position = 'absolute';
    select.style.opacity = '0';
    select.style.pointerEvents = 'none';
    select.style.height = '0';
    select.style.width = '0';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(input);
    wrap.appendChild(list);
    wrap.appendChild(select);
  }

  function scanSelects() {
    document.querySelectorAll('select#prod-product, select[name="product_name"]').forEach(enhanceProdSelect);
  }

  function injectSearchBox(html, placeholder, inputId) {
    if (!html || typeof html !== 'string') return html;
    if (html.indexOf(inputId) >= 0) return html;
    var box =
      '<div class="mb-3" id="' + inputId + '-wrap">' +
        '<input type="search" id="' + inputId + '" class="input-field" ' +
        'placeholder="' + placeholder + '" ' +
        'style="max-width:420px;width:100%" ' +
        'oninput="window.__uxFilterTable && window.__uxFilterTable(\'' + inputId + '\')" />' +
      '</div>';
    if (html.indexOf('glass-card') >= 0) {
      return html.replace('<div class="glass-card', box + '<div class="glass-card');
    }
    return box + html;
  }

  window.__uxFilterTable = function (inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var q = String(input.value || '').trim().toLowerCase();
    var root = document.getElementById('main-content') ||
               document.getElementById('page-content') ||
               document.getElementById('app') ||
               document.body;
    root.querySelectorAll('table.data, table').forEach(function (table) {
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        var t = (tr.textContent || '').toLowerCase();
        tr.style.display = (!q || t.indexOf(q) >= 0) ? '' : 'none';
      });
    });
  };

  function wrapPages() {
    if (!window.Pages) return false;

    if (Pages.materials && !Pages.materials.__uxSearch) {
      var m0 = Pages.materials;
      Pages.materials = async function () {
        var html = await m0.apply(this, arguments);
        html = injectSearchBox(html, 'جستجو کد یا نام ماده اولیه...', 'ux-search-materials');
        html = html.replace(/ورود از اکسل اداره/g, '');
        html = html.replace(/خروجی برای اداره/g, '');
        return html;
      };
      Pages.materials.__uxSearch = true;
    }

    if (Pages.products && !Pages.products.__uxSearch) {
      var p0 = Pages.products;
      Pages.products = async function () {
        var html = await p0.apply(this, arguments);
        html = injectSearchBox(html, 'جستجو کد یا نام محصول...', 'ux-search-products');
        html = html.replace(/ایمپورت کامل راجا[^<]*/g, '');
        return html;
      };
      Pages.products.__uxSearch = true;
    }

    if (Pages.personnel && !Pages.personnel.__uxActive) {
      var s0 = Pages.personnel;
      Pages.personnel = async function () {
        var html = await s0.apply(this, arguments);
        if (html && html.indexOf('togglePersonActive') < 0) {
          html = html.replace(
            /onclick="Pages\.showPersonForm\((\d+)\)">ویرایش<\/button>/g,
            'onclick="Pages.showPersonForm($1)">ویرایش</button>' +
            '<button class="btn-ghost text-xs" style="color:#f87171" onclick="Pages.togglePersonActive($1)">غیرفعال/فعال</button>'
          );
        }
        return html;
      };
      Pages.personnel.__uxActive = true;
    }

    if (!Pages.togglePersonActive) {
      Pages.togglePersonActive = async function (id) {
        try {
          var item = await DB.getById('personnel', id);
          if (!item) return toastMsg('پرسنل پیدا نشد', 'error');
          var next = (item.active === 0 || item.active === false) ? 1 : 0;
          item.active = next;
          await Api.put('personnel', item);
          toastMsg(next ? 'پرسنل فعال شد' : 'پرسنل غیرفعال شد (در غذا و آمار نمی‌آید)', 'success');
          navigate('personnel');
        } catch (e) {
          toastMsg((e && e.message) || 'خطا', 'error');
        }
      };
    }

    if (Pages.showPersonForm && !Pages.showPersonForm.__uxActiveCb) {
      var f0 = Pages.showPersonForm;
      Pages.showPersonForm = async function (id) {
        await f0.apply(this, arguments);
        setTimeout(async function () {
          var form = document.getElementById('person-form');
          if (!form || form.querySelector('[name="active"]')) return;
          var box = document.createElement('label');
          box.className = 'text-xs text-slate-300';
          box.style.cssText = 'display:flex;align-items:center;gap:8px;margin:8px 0';
          box.innerHTML = '<input type="checkbox" name="active" value="1" /> فعال (خاموش = خارج از لیست غذا و آمار)';
          var actions = form.querySelector('.flex.gap-2, .pt-2');
          if (actions) form.insertBefore(box, actions);
          else form.appendChild(box);
          var cb = form.querySelector('[name="active"]');
          if (id) {
            try {
              var item = await DB.getById('personnel', id);
              cb.checked = !item || (item.active !== 0 && item.active !== false);
            } catch (e) { cb.checked = true; }
          } else cb.checked = true;

          form.onsubmit = async function (ev) {
            ev.preventDefault();
            var btn = form.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
            try {
              var data = Object.fromEntries(new FormData(form).entries());
              data.active = cb.checked ? 1 : 0;
              if (id) {
                var prev = await DB.getById('personnel', id);
                await Api.put('personnel', Object.assign({}, prev || {}, data, { id: id }));
              } else {
                await Api.add('personnel', data);
              }
              toastMsg('ذخیره شد', 'success');
              closeModal();
              navigate('personnel');
            } catch (e) {
              toastMsg((e && e.message) || 'خطا', 'error');
              if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
            }
          };
        }, 60);
      };
      Pages.showPersonForm.__uxActiveCb = true;
    }
    return true;
  }

  function hideSyncOnReports() {
    var h1 = document.querySelector('h1');
    if (!h1) return;
    var ht = h1.textContent || '';
    if (ht.indexOf('گزارش') < 0 && ht.indexOf('پشتیبان') < 0) return;
    document.querySelectorAll('p, h2, h3, div').forEach(function (el) {
      var tx = (el.textContent || '').trim();
      if (tx.length < 300 && /همگام.?سازی|چند دستگاه|هر ۲۰ ثانیه|polling/i.test(tx)) {
        if (el.children.length <= 2) el.style.display = 'none';
      }
    });
  }

  function hideImportButtons() {
    document.querySelectorAll('button, a').forEach(function (el) {
      var tx = (el.textContent || '').trim();
      if (/ورود از اکسل اداره|خروجی برای اداره|ایمپورت کامل راجا|ثبت لیست غذاها/i.test(tx)) {
        el.style.display = 'none';
      }
      // empty buttons left after text strip
      if (!tx && el.onclick && String(el.getAttribute('onclick') || '').indexOf('dishCostSeed') >= 0) {
        el.style.display = 'none';
      }
    });
  }

  function tick() {
    try {
      wrapPages();
      scanSelects();
      hideImportButtons();
      hideSyncOnReports();
    } catch (e) {
      console.warn('ui-ux-patch', e);
    }
  }

  function hookNavigate() {
    if (typeof window.navigate !== 'function' || window.navigate.__uxHooked) return;
    var n0 = window.navigate;
    window.navigate = function () {
      var r = n0.apply(this, arguments);
      setTimeout(tick, 50);
      setTimeout(tick, 300);
      setTimeout(tick, 900);
      return r;
    };
    window.navigate.__uxHooked = true;
  }

  var obs = new MutationObserver(function () {
    scanSelects();
    hideImportButtons();
  });

  function boot() {
    tick();
    hookNavigate();
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);
})();
