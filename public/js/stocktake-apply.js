/**
 * stocktake-apply.js
 * اعمال اختلاف انبارگردانی روی موجودی سیستم
 * (کسری → ضایعات نوع «اختلاف موجودی» | اضافه → برگشت مواد)
 * تب جدا نمی‌سازد — روی همان انبارگردانی کار می‌کند
 */
(function () {
  'use strict';

  function fmtNum(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }

  async function getLines(stocktakeId) {
    var lines =
      ((await DB.getAll('stocktake_lines').catch(function () {
        return [];
      })) ||
        []).filter(function (l) {
        return Number(l.stocktake_id) === Number(stocktakeId) && !l.deleted_at;
      });
    return lines;
  }

  /**
   * اعمال واریانس‌های یک انبارگردانی روی موجودی
   * - variance < 0 → ضایعات (کسر)
   * - variance > 0 → returns (افزایش)
   * از دوباره‌اعمال با notes یکتا جلوگیری می‌شود
   */
  Pages.applyStocktakeToStock = async function (id) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    var st = await DB.getById('stocktakes', id);
    if (!st) return toast('انبارگردانی یافت نشد', 'error');
    var lines = await getLines(id);
    if (!lines.length) return toast('ردیفی نیست', 'error');

    var toApply = lines.filter(function (l) {
      return Number(l.variance || 0) !== 0;
    });
    if (!toApply.length) return toast('اختلاف غیرصفر نیست', 'info');

    if (
      !confirm(
        'اعمال ' +
          toApply.length +
          ' اختلاف روی موجودی سیستم؟\nکسری از موجودی کم و اضافه به موجودی افزوده می‌شود.\nاین عمل قابل برگشت دستی است (حذف ضایعات/برگشت مربوطه).'
      )
    )
      return;

    var tag = 'ST-APPLY#' + id;
    // جلوگیری از دوبار اعمال
    var wastes = (await DB.getAll('wastes').catch(function () { return []; })) || [];
    var already = wastes.some(function (w) {
      return String(w.notes || '').indexOf(tag) >= 0;
    });
    var returns = (await DB.getAll('returns').catch(function () { return []; })) || [];
    var alreadyR = returns.some(function (r) {
      return String(r.notes || '').indexOf(tag) >= 0;
    });
    if (already || alreadyR) {
      if (!confirm('به نظر قبلاً اعمال شده. دوباره اعمال شود؟ (ممکن است موجودی دو بار جابه‌جا شود)')) return;
    }

    var nDown = 0;
    var nUp = 0;
    var date = st.date || '';
    try {
      for (var i = 0; i < toApply.length; i++) {
        var l = toApply[i];
        var v = Number(l.variance || 0);
        if (v < 0) {
          await DB.add('wastes', {
            date: date,
            material_name: l.material_name,
            quantity: Math.abs(v),
            waste_type: 'اختلاف موجودی',
            notes:
              tag +
              ' | سیستم=' +
              l.system_qty +
              ' شمارش=' +
              l.counted_qty +
              ' | ' +
              (l.notes || st.notes || ''),
            created_at: new Date().toISOString()
          });
          nDown++;
        } else if (v > 0) {
          await DB.add('returns', {
            date: date,
            material_name: l.material_name,
            return_weight: v,
            production_id: null,
            notes:
              tag +
              ' | اختلاف موجودی | سیستم=' +
              l.system_qty +
              ' شمارش=' +
              l.counted_qty +
              ' | ' +
              (l.notes || st.notes || ''),
            created_at: new Date().toISOString()
          });
          nUp++;
        }
      }
      // علامت روی خود stocktake
      try {
        await DB.put(
          'stocktakes',
          Object.assign({}, st, {
            applied_to_stock: 1,
            applied_at: new Date().toISOString()
          })
        );
      } catch (e) {}

      toast(
        'اعمال شد: ' + nDown + ' کسری · ' + nUp + ' اضافه — موجودی به‌روز شد',
        'success'
      );
      if (typeof Pages.viewStocktake === 'function') Pages.viewStocktake(id);
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در اعمال', 'error');
    }
  };

  /* دکمه اعمال در مشاهده گزارش */
  var _view = Pages.viewStocktake;
  if (typeof _view === 'function') {
    Pages.viewStocktake = async function (id) {
      await _view.apply(this, arguments);
      // بعد از رندر مودال/صفحه، دکمه اعمال را تزریق کن
      setTimeout(function () {
        injectApplyButton(id);
      }, 80);
      setTimeout(function () {
        injectApplyButton(id);
      }, 300);
    };
  }

  function injectApplyButton(id) {
    if (document.getElementById('st-apply-btn')) return;
    // مودال یا صفحه گزارش
    var hosts = document.querySelectorAll('.modal .modal-sticky-actions, .modal .flex.gap-2, #app .flex.gap-2');
    var host = null;
    hosts.forEach(function (h) {
      if (host) return;
      if (h.innerText && (h.innerText.indexOf('واتساپ') >= 0 || h.innerText.indexOf('Excel') >= 0 || h.innerText.indexOf('اکسل') >= 0 || h.innerText.indexOf('بستن') >= 0)) {
        host = h;
      }
    });
    if (!host) {
      // ساخت نوار دکمه بالای مودال
      var modal = document.querySelector('.modal');
      if (!modal) return;
      var bar = document.createElement('div');
      bar.className = 'flex gap-2 mb-3';
      bar.id = 'st-apply-bar';
      modal.insertBefore(bar, modal.firstChild.nextSibling);
      host = bar;
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'st-apply-btn';
    btn.className = 'btn-primary text-sm';
    btn.textContent = '⚖️ اعمال اختلاف‌ها روی موجودی';
    btn.onclick = function () {
      Pages.applyStocktakeToStock(id);
    };
    host.insertBefore(btn, host.firstChild);
  }

  /* در لیست انبارگردانی هم دکمه اعمال */
  var _list = Pages.stocktake;
  if (typeof _list === 'function') {
    Pages.stocktake = async function () {
      var html = await _list.apply(this, arguments);
      // تزریق دکمه اعمال کنار گزارش
      setTimeout(function () {
        document.querySelectorAll('button').forEach(function (b) {
          if (b.dataset.stApplyHooked) return;
          var oc = b.getAttribute('onclick') || '';
          var m = oc.match(/viewStocktake\((\d+)\)/);
          if (!m) return;
          b.dataset.stApplyHooked = '1';
          var id = m[1];
          var applyBtn = document.createElement('button');
          applyBtn.className = 'btn-ghost text-xs text-amber-300';
          applyBtn.textContent = 'اعمال روی موجودی';
          applyBtn.onclick = function (e) {
            e.stopPropagation();
            Pages.applyStocktakeToStock(Number(id));
          };
          if (b.parentElement) b.parentElement.appendChild(applyBtn);
        });
      }, 100);
      return html;
    };
  }

  /* بعد از ذخیره انبارگردانی جدید — پیشنهاد اعمال */
  var _save = Pages.saveStocktake;
  if (typeof _save === 'function') {
    Pages.saveStocktake = async function () {
      // ردیابی آخرین id با mon قبل/بعد
      var before = ((await DB.getAll('stocktakes').catch(function () { return []; })) || []).map(function (s) {
        return s.id;
      });
      await _save.apply(this, arguments);
      setTimeout(async function () {
        try {
          var after = (await DB.getAll('stocktakes').catch(function () { return []; })) || [];
          var neu = after.filter(function (s) {
            return before.indexOf(s.id) < 0;
          });
          if (neu.length === 1) {
            var id = neu[0].id;
            if (confirm('انبارگردانی ذخیره شد. اختلاف‌ها همین الان روی موجودی اعمال شوند؟')) {
              await Pages.applyStocktakeToStock(id);
            }
          }
        } catch (e) {}
      }, 400);
    };
  }

  console.log('[stocktake-apply] ready');
})();
