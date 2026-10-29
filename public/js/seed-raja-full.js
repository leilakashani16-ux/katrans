/**
 * seed-raja-full.js — کدهای مطابق اپ + ایمپورت مقاوم در برابر timeout
 * M001 سینه مرغ | M003 گوشت نخودی | M101-M103 | راجا از M105
 */
(function () {
  var DATA = {"materials": [{"code": "M001", "name": "سینه مرغ", "unit": "کیلوگرم", "last_buy_price": 700000, "material_type": "raw"}, {"code": "M003", "name": "گوشت نخودی", "unit": "کیلوگرم", "last_buy_price": 1473000.0, "material_type": "raw"}, {"code": "M101", "name": "قلوه گاه گوسفندی", "unit": "کیلوگرم", "last_buy_price": 1200000, "material_type": "raw"}, {"code": "M102", "name": "قلوه گاه گوساله", "unit": "کیلوگرم", "last_buy_price": 1430000, "material_type": "raw"}, {"code": "M103", "name": "سردست گوساله", "unit": "کیلوگرم", "last_buy_price": 1700000, "material_type": "raw"}, {"code": "M105", "name": "ارده", "unit": "کیلوگرم", "last_buy_price": 1171428, "material_type": "raw"}, {"code": "M106", "name": "ماست", "unit": "کیلوگرم", "last_buy_price": 129000, "material_type": "raw"}, {"code": "M107", "name": "روغن", "unit": "کیلوگرم", "last_buy_price": 413500, "material_type": "raw"}, {"code": "M108", "name": "نخود کنسرو", "unit": "کیلوگرم", "last_buy_price": 199750, "material_type": "raw"}, {"code": "M109", "name": "سیر", "unit": "کیلوگرم", "last_buy_price": 200000, "material_type": "raw"}, {"code": "M110", "name": "فلفل سیاه", "unit": "کیلوگرم", "last_buy_price": 3000000, "material_type": "raw"}, {"code": "M111", "name": "فلفل قرمز", "unit": "کیلوگرم", "last_buy_price": 1300000, "material_type": "raw"}, {"code": "M112", "name": "نمک", "unit": "کیلوگرم", "last_buy_price": 56250, "material_type": "raw"}, {"code": "M113", "name": "زیتون سبز", "unit": "کیلوگرم", "last_buy_price": 232500, "material_type": "raw"}, {"code": "M114", "name": "روغن زیتون", "unit": "کیلوگرم", "last_buy_price": 1222300, "material_type": "raw"}, {"code": "M115", "name": "ظرف ۲۵۰", "unit": "عدد", "last_buy_price": 17000, "material_type": "packaging"}, {"code": "M116", "name": "خیار", "unit": "کیلوگرم", "last_buy_price": 40000, "material_type": "raw"}, {"code": "M117", "name": "نعناء خشک", "unit": "کیلوگرم", "last_buy_price": 1300000, "material_type": "raw"}, {"code": "M118", "name": "تخم مرغ", "unit": "کیلوگرم", "last_buy_price": 336000, "material_type": "raw"}, {"code": "M119", "name": "گلاب", "unit": "کیلوگرم", "last_buy_price": 610000, "material_type": "raw"}, {"code": "M120", "name": "عرق هل", "unit": "کیلوگرم", "last_buy_price": 40000, "material_type": "raw"}, {"code": "M121", "name": "پودر هل", "unit": "کیلوگرم", "last_buy_price": 11000000, "material_type": "raw"}, {"code": "M122", "name": "دارچین", "unit": "کیلوگرم", "last_buy_price": 1520000, "material_type": "raw"}, {"code": "M123", "name": "برنج مخلوط ایرانی", "unit": "کیلوگرم", "last_buy_price": 435000, "material_type": "raw"}, {"code": "M124", "name": "زعفران", "unit": "مثقال", "last_buy_price": 1400000, "material_type": "raw"}, {"code": "M125", "name": "ظرف ۱۱۲۵", "unit": "عدد", "last_buy_price": 40500, "material_type": "packaging"}, {"code": "M126", "name": "لوبیا سبز", "unit": "کیلوگرم", "last_buy_price": 270000, "material_type": "raw"}, {"code": "M127", "name": "پیاز", "unit": "کیلوگرم", "last_buy_price": 70000, "material_type": "raw"}, {"code": "M128", "name": "رب گوجه فرنگی", "unit": "کیلوگرم", "last_buy_price": 300000, "material_type": "raw"}, {"code": "M129", "name": "گوشت گوساله", "unit": "کیلوگرم", "last_buy_price": 1300000, "material_type": "raw"}, {"code": "M130", "name": "زردچوبه", "unit": "کیلوگرم", "last_buy_price": 720000, "material_type": "raw"}, {"code": "M131", "name": "پودر سیر", "unit": "کیلوگرم", "last_buy_price": 1250000, "material_type": "raw"}, {"code": "M132", "name": "اسفناج", "unit": "کیلوگرم", "last_buy_price": 380000, "material_type": "raw"}, {"code": "M133", "name": "پیاز آب گرفته", "unit": "کیلوگرم", "last_buy_price": 210000, "material_type": "raw"}, {"code": "M134", "name": "جوش شیرین", "unit": "کیلوگرم", "last_buy_price": 63000, "material_type": "raw"}, {"code": "M135", "name": "سس خردل", "unit": "کیلوگرم", "last_buy_price": 250000, "material_type": "raw"}, {"code": "M136", "name": "سس مایونز", "unit": "کیلوگرم", "last_buy_price": 212500, "material_type": "raw"}, {"code": "M137", "name": "آبلیمو", "unit": "کیلوگرم", "last_buy_price": 270000, "material_type": "raw"}, {"code": "M138", "name": "پودر زنجبیل", "unit": "کیلوگرم", "last_buy_price": 550000, "material_type": "raw"}, {"code": "M139", "name": "آب پیاز", "unit": "کیلوگرم", "last_buy_price": 1, "material_type": "raw"}], "products": [{"code": "P016", "name": "حمص", "weight_per_unit": 250, "material_name": ""}, {"code": "P017", "name": "ماست وخیار", "weight_per_unit": 250, "material_name": ""}, {"code": "P018", "name": "ته چین ساده", "weight_per_unit": 1125, "material_name": ""}, {"code": "P019", "name": "لوبیاپلو با برنج", "weight_per_unit": 1125, "material_name": ""}, {"code": "P020", "name": "بورانی اسفناج", "weight_per_unit": 250, "material_name": ""}, {"code": "SM004", "name": "مایه کباب", "weight_per_unit": 1000, "material_name": ""}, {"code": "P006", "name": "لقمه مجلسی 150گرمی", "weight_per_unit": 150, "material_name": ""}, {"code": "P005", "name": "لقمه معمولی 120گرمی", "weight_per_unit": 120, "material_name": ""}, {"code": "P004", "name": "کوبیده اکو 100گرمی", "weight_per_unit": 100, "material_name": ""}, {"code": "SM001", "name": "سینه مرینیت جوجه", "weight_per_unit": 1000, "material_name": ""}, {"code": "P003", "name": "جوجه مجلسی ۲۸۰ گرمی", "weight_per_unit": 280, "material_name": ""}, {"code": "P002", "name": "جوجه ممتاز ۲۰۰ گرمی", "weight_per_unit": 200, "material_name": ""}, {"code": "P001", "name": "جوجه معمولی 170 گرمی", "weight_per_unit": 170, "material_name": ""}], "recipes": {"گوشت نخودی": [{"material_name": "سردست گوساله", "qty": 0.5}, {"material_name": "قلوه گاه گوسفندی", "qty": 0.4}, {"material_name": "قلوه گاه گوساله", "qty": 0.1}], "حمص": [{"material_name": "ارده", "qty": 0.083}, {"material_name": "ماست", "qty": 0.053}, {"material_name": "روغن", "qty": 0.012}, {"material_name": "نخود کنسرو", "qty": 0.235}, {"material_name": "سیر", "qty": 0.00047}, {"material_name": "فلفل سیاه", "qty": 0.00024}, {"material_name": "فلفل قرمز", "qty": 0.00012}, {"material_name": "نمک", "qty": 0.00075}, {"material_name": "زیتون سبز", "qty": 0.02}, {"material_name": "روغن زیتون", "qty": 0.01}, {"material_name": "ظرف ۲۵۰", "qty": 1.0}], "ماست وخیار": [{"material_name": "ماست", "qty": 0.195}, {"material_name": "خیار", "qty": 0.122}, {"material_name": "نعناء خشک", "qty": 0.00065}, {"material_name": "نمک", "qty": 0.0013}, {"material_name": "فلفل سیاه", "qty": 0.00035}, {"material_name": "سیر", "qty": 0.00087}, {"material_name": "ظرف ۲۵۰", "qty": 1.0}], "ته چین ساده": [{"material_name": "تخم مرغ", "qty": 0.031}, {"material_name": "ماست", "qty": 0.077}, {"material_name": "روغن", "qty": 0.043}, {"material_name": "گلاب", "qty": 0.00085}, {"material_name": "عرق هل", "qty": 0.001}, {"material_name": "پودر هل", "qty": 0.00015}, {"material_name": "دارچین", "qty": 0.00031}, {"material_name": "برنج مخلوط ایرانی", "qty": 0.116}, {"material_name": "نمک", "qty": 0.0027}, {"material_name": "زعفران", "qty": 0.0045}, {"material_name": "ظرف ۱۱۲۵", "qty": 1.0}], "لوبیاپلو با برنج": [{"material_name": "لوبیا سبز", "qty": 0.11}, {"material_name": "پیاز", "qty": 0.6}, {"material_name": "رب گوجه فرنگی", "qty": 0.005}, {"material_name": "روغن", "qty": 0.02}, {"material_name": "گوشت گوساله", "qty": 0.05}, {"material_name": "سینه مرغ", "qty": 0.025}, {"material_name": "نمک", "qty": 0.002}, {"material_name": "زردچوبه", "qty": 0.0004}, {"material_name": "پودر سیر", "qty": 0.0006}, {"material_name": "دارچین", "qty": 0.001}, {"material_name": "فلفل سیاه", "qty": 0.0005}, {"material_name": "برنج مخلوط ایرانی", "qty": 0.14}, {"material_name": "زعفران", "qty": 0.0005}, {"material_name": "ظرف ۱۱۲۵", "qty": 1.0}], "بورانی اسفناج": [{"material_name": "ماست", "qty": 0.25}, {"material_name": "اسفناج", "qty": 0.028}, {"material_name": "نمک", "qty": 0.0014}, {"material_name": "فلفل سیاه", "qty": 0.0004}, {"material_name": "سیر", "qty": 0.00087}, {"material_name": "ظرف ۲۵۰", "qty": 1.0}], "مایه کباب": [{"material_name": "گوشت نخودی", "qty": 1.0}, {"material_name": "پیاز آب گرفته", "qty": 0.35}, {"material_name": "نمک", "qty": 0.01}, {"material_name": "فلفل سیاه", "qty": 0.002}, {"material_name": "جوش شیرین", "qty": 0.004}], "لقمه مجلسی 150گرمی": [{"material_name": "گوشت نخودی", "qty": 0.113}, {"material_name": "پیاز آب گرفته", "qty": 0.038}, {"material_name": "نمک", "qty": 0.0011}, {"material_name": "فلفل سیاه", "qty": 0.00022}, {"material_name": "جوش شیرین", "qty": 0.00044}], "لقمه معمولی 120گرمی": [{"material_name": "گوشت نخودی", "qty": 0.09}, {"material_name": "پیاز آب گرفته", "qty": 0.031}, {"material_name": "نمک", "qty": 0.00099}, {"material_name": "فلفل سیاه", "qty": 0.0002}, {"material_name": "جوش شیرین", "qty": 0.00042}], "کوبیده اکو 100گرمی": [{"material_name": "گوشت نخودی", "qty": 0.075}, {"material_name": "پیاز آب گرفته", "qty": 0.026}, {"material_name": "نمک", "qty": 0.00092}, {"material_name": "فلفل سیاه", "qty": 0.00018}, {"material_name": "جوش شیرین", "qty": 0.0004}], "سینه مرینیت جوجه": [{"material_name": "سینه مرغ", "qty": 1.0}, {"material_name": "ماست", "qty": 0.02}, {"material_name": "سس خردل", "qty": 0.02}, {"material_name": "روغن", "qty": 0.022}, {"material_name": "سس مایونز", "qty": 0.04}, {"material_name": "نمک", "qty": 0.011}, {"material_name": "آبلیمو", "qty": 0.01}, {"material_name": "پودر سیر", "qty": 0.0003}, {"material_name": "فلفل سیاه", "qty": 0.00015}, {"material_name": "پودر زنجبیل", "qty": 0.0001}, {"material_name": "فلفل قرمز", "qty": 0.00015}, {"material_name": "زعفران", "qty": 0.04}, {"material_name": "آب پیاز", "qty": 0.015}], "جوجه مجلسی ۲۸۰ گرمی": [{"material_name": "سینه مرغ", "qty": 0.28}, {"material_name": "ماست", "qty": 0.0056}, {"material_name": "سس خردل", "qty": 0.0056}, {"material_name": "روغن", "qty": 0.00616}, {"material_name": "سس مایونز", "qty": 0.0112}, {"material_name": "نمک", "qty": 0.00308}, {"material_name": "آبلیمو", "qty": 0.0028}, {"material_name": "پودر سیر", "qty": 8e-05}, {"material_name": "فلفل سیاه", "qty": 4e-05}, {"material_name": "پودر زنجبیل", "qty": 3e-05}, {"material_name": "فلفل قرمز", "qty": 4e-05}, {"material_name": "زعفران", "qty": 0.0112}, {"material_name": "آب پیاز", "qty": 0.0042}], "جوجه ممتاز ۲۰۰ گرمی": [{"material_name": "سینه مرغ", "qty": 0.2}, {"material_name": "ماست", "qty": 0.004}, {"material_name": "سس خردل", "qty": 0.004}, {"material_name": "روغن", "qty": 0.0044}, {"material_name": "سس مایونز", "qty": 0.008}, {"material_name": "نمک", "qty": 0.0022}, {"material_name": "آبلیمو", "qty": 0.002}, {"material_name": "پودر سیر", "qty": 6e-05}, {"material_name": "فلفل سیاه", "qty": 3e-05}, {"material_name": "پودر زنجبیل", "qty": 2e-05}, {"material_name": "فلفل قرمز", "qty": 3e-05}, {"material_name": "زعفران", "qty": 0.008}, {"material_name": "آب پیاز", "qty": 0.003}], "جوجه معمولی 170 گرمی": [{"material_name": "سینه مرغ", "qty": 0.17}, {"material_name": "ماست", "qty": 0.0034}, {"material_name": "سس خردل", "qty": 0.0034}, {"material_name": "روغن", "qty": 0.00374}, {"material_name": "سس مایونز", "qty": 0.0068}, {"material_name": "نمک", "qty": 0.00187}, {"material_name": "آبلیمو", "qty": 0.0017}, {"material_name": "پودر سیر", "qty": 5e-05}, {"material_name": "فلفل سیاه", "qty": 3e-05}, {"material_name": "پودر زنجبیل", "qty": 2e-05}, {"material_name": "فلفل قرمز", "qty": 3e-05}, {"material_name": "زعفران", "qty": 0.0068}, {"material_name": "آب پیاز", "qty": 0.00255}]}};

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /** درخواست با timeout بلند + حداکثر ۳ بار تلاش */
  async function apiWrite(method, path, body, retries) {
    retries = retries == null ? 3 : retries;
    var lastErr;
    for (var attempt = 0; attempt < retries; attempt++) {
      try {
        if (typeof Api !== 'undefined' && Api.request) {
          return await Api.request(path, {
            method: method,
            body: JSON.stringify(body),
            timeoutMs: 60000
          });
        }
        // fallback DB
        if (method === 'POST') return await DB.add(path, body);
        if (method === 'PUT') return await DB.put(path, Object.assign({ id: body.id }, body));
        throw new Error('Api در دسترس نیست');
      } catch (e) {
        lastErr = e;
        var msg = (e && e.message) ? e.message : String(e);
        var isTimeout = msg.indexOf('زمان پاسخ') >= 0 || msg.indexOf('Abort') >= 0 || msg.indexOf('timeout') >= 0;
        console.warn('[seed-raja] attempt', attempt + 1, path, msg);
        if (!isTimeout && attempt >= 1) break;
        await sleep(800 * (attempt + 1));
      }
    }
    throw lastErr;
  }

  Pages.importRajaRecipes = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('ایمپورت کامل راجا؟\\n(با تلاش مجدد در صورت کندی سرور)')) return;

    var statusEl = null;
    try {
      // نوار وضعیت ساده
      var host = document.querySelector('main') || document.body;
      statusEl = document.createElement('div');
      statusEl.id = 'raja-import-status';
      statusEl.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:9999;background:#6C5CE7;color:#fff;padding:12px 16px;border-radius:10px;font-family:Tahoma,sans-serif;font-size:13px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.25)';
      statusEl.textContent = 'شروع ایمپورت…';
      host.appendChild(statusEl);

      function setStatus(t) {
        if (statusEl) statusEl.textContent = t;
      }

      var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
      var byName = {};
      materials.forEach(function (m) { byName[m.name] = m; });

      var addedM = 0, updatedM = 0, errM = 0;
      for (var i = 0; i < DATA.materials.length; i++) {
        var s = DATA.materials[i];
        setStatus('مواد ' + (i + 1) + '/' + DATA.materials.length + ' — ' + s.name);
        try {
          if (byName[s.name]) {
            var ex = byName[s.name];
            var body = Object.assign({}, ex, {
              last_buy_price: s.last_buy_price != null ? s.last_buy_price : ex.last_buy_price,
              last_buy_date: ex.last_buy_date || (typeof todayJalali === 'function' ? todayJalali() : ''),
              unit: ex.unit || s.unit,
              material_type: ex.material_type || s.material_type,
              code: ex.code || s.code
            });
            var id = body.id;
            delete body.id;
            await apiWrite('PUT', 'materials/' + id, body);
            updatedM++;
          } else {
            await apiWrite('POST', 'materials', {
              code: s.code || '',
              name: s.name,
              unit: s.unit || 'کیلوگرم',
              initial_stock: 0,
              min_alert: 0,
              last_buy_price: s.last_buy_price,
              last_buy_date: typeof todayJalali === 'function' ? todayJalali() : '',
              material_type: s.material_type || 'raw',
              active: 1
            });
            addedM++;
          }
        } catch (e1) {
          errM++;
          console.error('material fail', s.name, e1);
        }
        await sleep(120);
      }

      var products = (await DB.getAll('products').catch(function () { return []; })) || [];
      var pByName = {};
      products.forEach(function (p) { pByName[p.name] = p; });
      var addedP = 0, errP = 0;
      for (var j = 0; j < DATA.products.length; j++) {
        var pr = DATA.products[j];
        setStatus('محصولات ' + (j + 1) + '/' + DATA.products.length + ' — ' + pr.name);
        if (pByName[pr.name]) continue;
        try {
          await apiWrite('POST', 'products', {
            code: pr.code,
            name: pr.name,
            weight_per_unit: pr.weight_per_unit,
            material_name: '',
            remainder_type: 'حمل به روز بعد',
            active: 1
          });
          addedP++;
        } catch (e2) {
          errP++;
          console.error('product fail', pr.name, e2);
        }
        await sleep(120);
      }

      var recAdded = 0, errR = 0;
      var names = Object.keys(DATA.recipes);
      for (var r = 0; r < names.length; r++) {
        var productName = names[r];
        var linesR = DATA.recipes[productName];
        if (!linesR || !linesR.length) continue;
        setStatus('رسپی ' + (r + 1) + '/' + names.length + ' — ' + productName);

        try {
          var allR = (await DB.getAll('recipes').catch(function () { return []; })) || [];
          var existing = allR.find(function (x) { return x.product_name === productName; });
          if (existing && existing.id) {
            var rb = Object.assign({}, existing, { mode: 'multi_input', yield_factor: 1, notes: 'ایمپورت راجا' });
            var rid = rb.id;
            delete rb.id;
            await apiWrite('PUT', 'recipes/' + rid, rb);
          } else {
            await apiWrite('POST', 'recipes', {
              product_name: productName,
              mode: 'multi_input',
              yield_factor: 1,
              notes: 'ایمپورت راجا'
            });
          }

          var freshI = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
          for (var ii = 0; ii < freshI.length; ii++) {
            if (freshI[ii].product_name === productName && freshI[ii].id) {
              try {
                if (typeof Api !== 'undefined' && Api.request) {
                  await Api.request('recipe_items/' + freshI[ii].id, { method: 'DELETE', timeoutMs: 60000 });
                } else {
                  await DB.remove('recipe_items', freshI[ii].id);
                }
              } catch (ed) {
                console.warn('delete item', ed);
              }
              await sleep(80);
            }
          }

          for (var k = 0; k < linesR.length; k++) {
            setStatus('رسپی ' + productName + ' قلم ' + (k + 1) + '/' + linesR.length);
            await apiWrite('POST', 'recipe_items', {
              product_name: productName,
              material_name: linesR[k].material_name,
              qty: linesR[k].qty,
              sort_order: k
            });
            await sleep(100);
          }
          recAdded++;
        } catch (e3) {
          errR++;
          console.error('recipe fail', productName, e3);
        }
        await sleep(150);
      }

      if (statusEl && statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
      var msg = 'راجا: ' + addedM + ' ماده جدید، ' + updatedM + ' قیمت، ' + addedP + ' محصول، ' + recAdded + ' رسپی';
      if (errM || errP || errR) msg += ' | خطا: ماده ' + errM + ' محصول ' + errP + ' رسپی ' + errR;
      toast(msg, (errM + errP + errR) ? 'error' : 'success');
      navigate('products');
    } catch (e) {
      console.error(e);
      if (statusEl && statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
      toast(e.message || 'خطا در ایمپورت', 'error');
    }
  };

  var _prod = Pages.products;
  Pages.products = async function () {
    var html = await _prod();
    if (Auth.isAdmin()) {
      html = '<div class="mb-3"><button type="button" class="btn-secondary text-sm" onclick="Pages.importRajaRecipes()">ایمپورت کامل راجا (کد صحیح)</button></div>' + html;
    }
    return html;
  };
  console.log('[seed-raja-full] aligned codes OK + resilient import');
})();
