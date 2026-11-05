/**
 * واحد پول رسمی اپ برای بها / رسپی / قیمت خرید: ریال
 * بعد از pricing-recipes و materials-price لود شود.
 */
(function () {
  'use strict';
  window.APP_CURRENCY = 'ریال';
  window.APP_CURRENCY_LABEL = 'ریال';

  function toRialLabel(text) {
    if (text == null) return text;
    return String(text)
      .replace(/تومان/g, 'ریال')
      .replace(/Toman/gi, 'ریال');
  }

  // اگر تابع فرمت قیمت سراسری باشد
  if (typeof window.fmtPrice === 'function') {
    var _fmt = window.fmtPrice;
    window.fmtPrice = function (n) {
      var s = _fmt.apply(this, arguments);
      return toRialLabel(s);
    };
  }

  function patchCostDom() {
    try {
      var ids = ['rc-cost-total', 'rc-cost-unit', 'rc-cost-pack', 'mat-last-price-label'];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.textContent) el.textContent = toRialLabel(el.textContent);
      });
      document.querySelectorAll('label, .text-xs, .text-sm, th, td, span, p, div').forEach(function (el) {
        if (!el.childElementCount && el.textContent && el.textContent.indexOf('تومان') >= 0) {
          // فقط برچسب‌های قیمت/فی/بها
          var t = el.textContent;
          if (/قیمت|فی|بها|هزینه|خرید|جمع/.test(t)) {
            el.textContent = toRialLabel(t);
          }
        }
      });
      document.querySelectorAll('input[placeholder*="تومان"]').forEach(function (inp) {
        inp.placeholder = toRialLabel(inp.placeholder);
      });
    } catch (e) {}
  }

  // بعد از رندر هر صفحه
  var _nav = window.navigate;
  if (typeof _nav === 'function') {
    window.navigate = async function () {
      var r = await _nav.apply(this, arguments);
      setTimeout(patchCostDom, 300);
      setTimeout(patchCostDom, 900);
      return r;
    };
  }

  // پچ مستقیم متن‌های pricing-recipes اگر هنوز تومان هاردکد باشد
  function patchPricingRecipesSource() {
    try {
      if (typeof Pages === 'undefined') return;
      // ناظر روی تغییر محتوای هزینه رسپی
      var obs = new MutationObserver(function () {
        var total = document.getElementById('rc-cost-total');
        if (total && /تومان/.test(total.textContent || '')) {
          total.textContent = toRialLabel(total.textContent);
        }
        var unit = document.getElementById('rc-cost-unit');
        if (unit && /تومان/.test(unit.textContent || '')) {
          unit.textContent = toRialLabel(unit.textContent);
        }
      });
      if (document.body) {
        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      patchCostDom();
      patchPricingRecipesSource();
    });
  } else {
    patchCostDom();
    patchPricingRecipesSource();
  }
  setTimeout(patchCostDom, 1500);
})();
