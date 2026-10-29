/**
 * alert-fix.js — احترام به تنظیمات «فعال بودن هشدار کمبود موجودی»
 */
(function () {
  var _calc = null;

  function install() {
    if (typeof DB === 'undefined' || typeof DB.calcStock !== 'function') return false;
    if (DB.calcStock.__alertPatched) return true;
    _calc = DB.calcStock.bind(DB);
    DB.calcStock = async function () {
      var stock = await _calc();
      var enabled = true;
      try {
        if (window.Api && Api.request) {
          var s = await Api.request('settings').catch(function () { return null; });
          if (s && s.alert_enabled === false) enabled = false;
        } else {
          var local = localStorage.getItem('kitchen_settings');
          if (local) {
            var p = JSON.parse(local);
            if (p.alert_enabled === false) enabled = false;
          }
        }
      } catch (e) {}
      if (!enabled && Array.isArray(stock)) {
        stock.forEach(function (m) {
          if (m.status === 'هشدار') m.status = 'عادی';
        });
      }
      return stock;
    };
    DB.calcStock.__alertPatched = true;
    return true;
  }
  install();
  setTimeout(install, 300);
  setTimeout(install, 1500);
  console.log('[alert-fix] ready');
})();
