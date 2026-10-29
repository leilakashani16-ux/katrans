/**
 * dashboard-alerts.js — طومار هشدار را جمع می‌کند
 * - اگر alert_enabled خاموش باشد: بنر هشدار اصلاً نشان داده نمی‌شود
 * - اگر روشن باشد: فقط «هشدار» + حداکثر ۵ مورد «تمام شد» (مواد غذایی)
 */
(function () {
  function getAlertEnabled() {
    try {
      var local = localStorage.getItem('kitchen_settings');
      if (local) {
        var p = JSON.parse(local);
        if (p.alert_enabled === false) return false;
      }
    } catch (e) {}
    return true;
  }

  function install() {
    if (typeof Pages === 'undefined' || typeof Pages.dashboard !== 'function') return false;
    if (Pages.dashboard.__alertCollapse) return true;
    var prev = Pages.dashboard;
    Pages.dashboard = async function () {
      var html = await prev.apply(this, arguments);
      var enabled = getAlertEnabled();
      // also refresh from API
      try {
        if (window.Api) {
          var s = await Api.request('settings').catch(function () { return null; });
          if (s && s.alert_enabled === false) enabled = false;
          if (s) localStorage.setItem('kitchen_settings', JSON.stringify(s));
        }
      } catch (e) {}

      if (!enabled) {
        // remove alert banner blocks
        html = html.replace(/<div class="alert-banner[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<div|<\/|$)/g, '');
        // softer: also strip if different class
        html = html.replace(/⚠️\s*هشدار موجودی[\s\S]{0,4000}?<\/ul>\s*<\/div>/g, '');
      }

      setTimeout(function () {
        var banners = document.querySelectorAll('.alert-banner');
        banners.forEach(function (el) {
          if (!enabled) {
            el.style.display = 'none';
            return;
          }
          var lis = el.querySelectorAll('li');
          if (lis.length <= 6) return;
          // collapse: show first 5, rest hidden
          for (var i = 5; i < lis.length; i++) lis[i].style.display = 'none';
          var more = document.createElement('button');
          more.type = 'button';
          more.className = 'btn-ghost text-xs mt-2';
          more.textContent = 'نمایش همه (' + lis.length + ')';
          var expanded = false;
          more.onclick = function () {
            expanded = !expanded;
            for (var i = 5; i < lis.length; i++) lis[i].style.display = expanded ? '' : 'none';
            more.textContent = expanded ? 'جمع کردن' : 'نمایش همه (' + lis.length + ')';
          };
          el.appendChild(more);
        });
      }, 50);

      return html;
    };
    Pages.dashboard.__alertCollapse = true;
    return true;
  }
  install();
  setTimeout(install, 400);
  setTimeout(install, 1500);
  console.log('[dashboard-alerts] ready');
})();
