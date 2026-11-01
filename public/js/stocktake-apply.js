/**
 * stocktake-apply.js v2
 * - اعمال اختلاف روی موجودی (کسری + اضافه)
 * - اعمال فقط یک‌بار (قفل سخت)
 * - حذف انبارگردانی (+ خطوط و در صورت اعمال‌شده، برگشت اثر با تأیید)
 */
(function () {
  'use strict';

  function fmtNum(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }

  function tagFor(id) {
    return 'ST-APPLY#' + id;
  }

  async function getLines(stocktakeId) {
    return (
      ((await DB.getAll('stocktake_lines').catch(function () {
        return [];
      })) ||
        []).filter(function (l) {
        return Number(l.stocktake_id) === Number(stocktakeId) && !l.deleted_at;
      })
    );
  }

  async function wasApplied(id) {
    var st = await DB.getById('stocktakes', id);
    if (st && (st.applied_to_stock === 1 || st.applied_to_stock === true || st.applied_to_stock === '1')) {
      return true;
    }
    var tag = tagFor(id);
    var wastes = (await DB.getAll('wastes').catch(function () { return []; })) || [];
    if (wastes.some(function (w) { return !w.deleted_at && String(w.notes || '').indexOf(tag) >= 0; })) return true;
    var returns = (await DB.getAll('returns').catch(function () { return []; })) || [];
    if (returns.some(function (r) { return !r.deleted_at && String(r.notes || '').indexOf(tag) >= 0; })) return true;
    return false;
  }

  /**
   * اعمال واریانس — فقط یک‌بار
   * variance < 0 → ضایعات «اختلاف موجودی»
   * variance > 0 → برگشت مواد (افزایش موجودی)
   */
  Pages.applyStocktakeToStock = async function (id) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    var st = await DB.getById('stocktakes', id);
    if (!st) return toast('انبارگردانی یافت نشد', 'error');

    if (await wasApplied(id)) {
      toast('این گزارش قبلاً روی موجودی اعمال شده و قفل است. دوباره اعمال نمی‌شود.', 'error');
      return;
    }

    var lines = await getLines(id);
    if (!lines.length) return toast('ردیفی نیست', 'error');
    var toApply = lines.filter(function (l) {
      return Number(l.variance || 0) !== 0;
    });
    if (!toApply.length) return toast('اختلاف غیرصفر نیست', 'info');

    var nDown = toApply.filter(function (l) { return Number(l.variance) < 0; }).length;
    var nUp = toApply.filter(function (l) { return Number(l.variance) > 0; }).length;

    if (
      !confirm(
        'اعمال روی موجودی (فقط یک‌بار):\n' +
          nDown +
          ' کسری (کم از سیستم)\n' +
          nUp +
          ' اضافه (زیاد به سیستم)\n\nبعد از تأیید، این گزارش قفل می‌شود.'
      )
    )
      return;

    // double-check race
    if (await wasApplied(id)) {
      toast('همین الان اعمال شده — لغو شد', 'error');
      return;
    }

    var tag = tagFor(id);
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
        } else if (v > 0) {
          await DB.add('returns', {
            date: date,
            material_name: l.material_name,
            return_weight: v,
            production_id: null,
            notes:
              tag +
              ' | اختلاف موجودی + | سیستم=' +
              l.system_qty +
              ' شمارش=' +
              l.counted_qty +
              ' | ' +
              (l.notes || st.notes || ''),
            created_at: new Date().toISOString()
          });
        }
      }
      await DB.put(
        'stocktakes',
        Object.assign({}, st, {
          applied_to_stock: 1,
          applied_at: new Date().toISOString()
        })
      );
      toast('اعمال شد و قفل شد: ' + nDown + ' کسری · ' + nUp + ' اضافه', 'success');
      navigate('stocktake');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در اعمال', 'error');
    }
  };

  /** حذف انبارگردانی + خطوط؛ اگر اعمال شده بود اثر را هم برمی‌دارد */
  Pages.deleteStocktake = async function (id) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    var st = await DB.getById('stocktakes', id);
    if (!st) return toast('یافت نشد', 'error');
    var applied = await wasApplied(id);
    var msg = applied
      ? 'این گزارش روی موجودی اعمال شده. با حذف، اثر اعمال (ضایعات/برگشت مربوطه) هم پاک می‌شود و موجودی برمی‌گردد. ادامه؟'
      : 'حذف این انبارگردانی و تمام ردیف‌هایش؟';
    if (!confirmAction(msg)) return;

    try {
      var tag = tagFor(id);
      if (applied) {
        var wastes = (await DB.getAll('wastes').catch(function () { return []; })) || [];
        for (var i = 0; i < wastes.length; i++) {
          if (!wastes[i].deleted_at && String(wastes[i].notes || '').indexOf(tag) >= 0) {
            await DB.remove('wastes', wastes[i].id);
          }
        }
        var returns = (await DB.getAll('returns').catch(function () { return []; })) || [];
        for (var j = 0; j < returns.length; j++) {
          if (!returns[j].deleted_at && String(returns[j].notes || '').indexOf(tag) >= 0) {
            await DB.remove('returns', returns[j].id);
          }
        }
      }
      var lines = await getLines(id);
      for (var k = 0; k < lines.length; k++) {
        await DB.remove('stocktake_lines', lines[k].id);
      }
      await DB.remove('stocktakes', id);
      toast(applied ? 'حذف شد و اثر موجودی برگردانده شد' : 'حذف شد', 'success');
      navigate('stocktake');
    } catch (e) {
      toast(e.message || 'خطا', 'error');
    }
  };

  /* لیست: دکمه اعمال (اگر قفل نیست) + حذف */
  var _list = Pages.stocktake;
  if (typeof _list === 'function') {
    Pages.stocktake = async function () {
      var html = await _list.apply(this, arguments);
      setTimeout(async function () {
        var takes = (await DB.getAll('stocktakes').catch(function () { return []; })) || [];
        var appliedMap = {};
        for (var t = 0; t < takes.length; t++) {
          appliedMap[takes[t].id] = !!(
            takes[t].applied_to_stock === 1 ||
            takes[t].applied_to_stock === true ||
            takes[t].applied_to_stock === '1'
          );
        }
        // also detect from wastes tags
        var wastes = (await DB.getAll('wastes').catch(function () { return []; })) || [];
        wastes.forEach(function (w) {
          var m = String(w.notes || '').match(/ST-APPLY#(\d+)/);
          if (m) appliedMap[Number(m[1])] = true;
        });

        document.querySelectorAll('button').forEach(function (b) {
          if (b.dataset.stHooked) return;
          var oc = b.getAttribute('onclick') || '';
          var m = oc.match(/viewStocktake\((\d+)\)/);
          if (!m) return;
          b.dataset.stHooked = '1';
          var id = Number(m[1]);
          var parent = b.parentElement;
          if (!parent) return;

          if (appliedMap[id]) {
            var lock = document.createElement('span');
            lock.className = 'text-[10px] text-emerald-400 mr-1';
            lock.textContent = '✓ اعمال‌شده';
            parent.appendChild(lock);
          } else {
            var applyBtn = document.createElement('button');
            applyBtn.className = 'btn-ghost text-xs text-amber-300';
            applyBtn.textContent = 'اعمال روی موجودی';
            applyBtn.onclick = function (e) {
              e.stopPropagation();
              Pages.applyStocktakeToStock(id);
            };
            parent.appendChild(applyBtn);
          }

          var delBtn = document.createElement('button');
          delBtn.className = 'btn-ghost text-xs text-red-400';
          delBtn.textContent = 'حذف';
          delBtn.onclick = function (e) {
            e.stopPropagation();
            Pages.deleteStocktake(id);
          };
          parent.appendChild(delBtn);
        });
      }, 120);
      return html;
    };
  }

  /* مشاهده گزارش: دکمه اعمال یا قفل */
  var _view = Pages.viewStocktake;
  if (typeof _view === 'function') {
    Pages.viewStocktake = async function (id) {
      await _view.apply(this, arguments);
      setTimeout(function () {
        injectViewButtons(id);
      }, 100);
      setTimeout(function () {
        injectViewButtons(id);
      }, 350);
    };
  }

  async function injectViewButtons(id) {
    if (document.getElementById('st-apply-btn') || document.getElementById('st-lock-badge')) return;
    var modal = document.querySelector('.modal');
    if (!modal) return;
    var bar = document.createElement('div');
    bar.className = 'flex flex-wrap gap-2 mb-3';
    bar.id = 'st-apply-bar';

    var applied = await wasApplied(id);
    if (applied) {
      var badge = document.createElement('span');
      badge.id = 'st-lock-badge';
      badge.className = 'text-sm text-emerald-400 self-center';
      badge.textContent = '🔒 اعمال‌شده — قفل (دوباره اعمال نمی‌شود)';
      bar.appendChild(badge);
    } else {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'st-apply-btn';
      btn.className = 'btn-primary text-sm';
      btn.textContent = '⚖️ اعمال اختلاف‌ها روی موجودی (یک‌بار)';
      btn.onclick = function () {
        Pages.applyStocktakeToStock(id);
      };
      bar.appendChild(btn);
    }

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-ghost text-sm text-red-400';
    del.textContent = 'حذف گزارش';
    del.onclick = function () {
      Pages.deleteStocktake(id);
    };
    bar.appendChild(del);

    var h = modal.querySelector('h3, h2, h1');
    if (h && h.parentElement) {
      h.parentElement.insertBefore(bar, h.nextSibling);
    } else {
      modal.insertBefore(bar, modal.firstChild);
    }
  }

  /* بعد از ذخیره — پیشنهاد اعمال فقط اگر هنوز اعمال نشده */
  var _save = Pages.saveStocktake;
  if (typeof _save === 'function') {
    Pages.saveStocktake = async function () {
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
            if (confirm('انبارگردانی ذخیره شد. اختلاف‌ها همین الان روی موجودی اعمال شوند؟ (فقط یک‌بار)')) {
              await Pages.applyStocktakeToStock(id);
            }
          }
        } catch (e) {}
      }, 400);
    };
  }

  console.log('[stocktake-apply] v2 lock+delete ready');
})();
