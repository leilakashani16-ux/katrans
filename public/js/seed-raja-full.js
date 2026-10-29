/**
 * seed-raja-full.js — ایمپورت کامل از اکسل راجا (قیمت+رسپی کامل)
 * گوشت نخودی ۱کیلو: ۵۰۰گ سردست + ۴۰۰گ قلوه گوسفندی + ۱۰۰گ قلوه گوساله
 */
(function () {
  var DATA = {"materials": [{"code": "M001", "name": "ارده", "unit": "کیلوگرم", "last_buy_price": 1171428.0, "material_type": "raw"}, {"code": "M002", "name": "ماست", "unit": "کیلوگرم", "last_buy_price": 129000.0, "material_type": "raw"}, {"code": "M003", "name": "روغن", "unit": "کیلوگرم", "last_buy_price": 413500.0, "material_type": "raw"}, {"code": "M004", "name": "نخود کنسرو", "unit": "کیلوگرم", "last_buy_price": 199750.0, "material_type": "raw"}, {"code": "M005", "name": "سیر", "unit": "کیلوگرم", "last_buy_price": 200000.0, "material_type": "raw"}, {"code": "M006", "name": "فلفل سیاه", "unit": "کیلوگرم", "last_buy_price": 3000000.0, "material_type": "raw"}, {"code": "M007", "name": "فلفل قرمز", "unit": "کیلوگرم", "last_buy_price": 1300000.0, "material_type": "raw"}, {"code": "M008", "name": "نمک", "unit": "کیلوگرم", "last_buy_price": 56250.0, "material_type": "raw"}, {"code": "M009", "name": "زیتون سبز", "unit": "کیلوگرم", "last_buy_price": 232500.0, "material_type": "raw"}, {"code": "M010", "name": "روغن زیتون", "unit": "کیلوگرم", "last_buy_price": 1222300.0, "material_type": "raw"}, {"code": "M011", "name": "ظرف ۲۵۰", "unit": "عدد", "last_buy_price": 17000.0, "material_type": "packaging"}, {"code": "M012", "name": "خیار", "unit": "کیلوگرم", "last_buy_price": 40000.0, "material_type": "raw"}, {"code": "M013", "name": "نعناء خشک", "unit": "کیلوگرم", "last_buy_price": 1300000.0, "material_type": "raw"}, {"code": "M014", "name": "تخم مرغ", "unit": "کیلوگرم", "last_buy_price": 336000.0, "material_type": "raw"}, {"code": "M015", "name": "گلاب", "unit": "کیلوگرم", "last_buy_price": 610000.0, "material_type": "raw"}, {"code": "M016", "name": "عرق هل", "unit": "کیلوگرم", "last_buy_price": 40000.0, "material_type": "raw"}, {"code": "M017", "name": "پودر هل", "unit": "کیلوگرم", "last_buy_price": 11000000.0, "material_type": "raw"}, {"code": "M018", "name": "دارچین", "unit": "کیلوگرم", "last_buy_price": 1520000.0, "material_type": "raw"}, {"code": "M019", "name": "برنج مخلوط ایرانی", "unit": "کیلوگرم", "last_buy_price": 435000.0, "material_type": "raw"}, {"code": "M020", "name": "زعفران", "unit": "مثقال", "last_buy_price": 1400000.0, "material_type": "raw"}, {"code": "M021", "name": "ظرف ۱۱۲۵", "unit": "عدد", "last_buy_price": 40500.0, "material_type": "packaging"}, {"code": "M022", "name": "لوبیا سبز", "unit": "کیلوگرم", "last_buy_price": 270000.0, "material_type": "raw"}, {"code": "M023", "name": "پیاز", "unit": "کیلوگرم", "last_buy_price": 70000.0, "material_type": "raw"}, {"code": "M024", "name": "رب گوجه فرنگی", "unit": "کیلوگرم", "last_buy_price": 300000.0, "material_type": "raw"}, {"code": "M025", "name": "گوشت گوساله", "unit": "کیلوگرم", "last_buy_price": 1300000.0, "material_type": "raw"}, {"code": "M001", "name": "سینه مرغ", "unit": "کیلوگرم", "last_buy_price": 880000.0, "material_type": "raw"}, {"code": "M027", "name": "زردچوبه", "unit": "کیلوگرم", "last_buy_price": 720000.0, "material_type": "raw"}, {"code": "M028", "name": "پودر سیر", "unit": "کیلوگرم", "last_buy_price": 1250000.0, "material_type": "raw"}, {"code": "M029", "name": "اسفناج", "unit": "کیلوگرم", "last_buy_price": 380000.0, "material_type": "raw"}, {"code": "M101", "name": "قلوه گاه گوسفندی", "unit": "کیلوگرم", "last_buy_price": 1200000, "material_type": "raw"}, {"code": "M102", "name": "قلوه گاه گوساله", "unit": "کیلوگرم", "last_buy_price": 1430000, "material_type": "raw"}, {"code": "M103", "name": "سردست گوساله", "unit": "کیلوگرم", "last_buy_price": 1700000, "material_type": "raw"}, {"code": "M003", "name": "گوشت نخودی", "unit": "کیلوگرم", "last_buy_price": 1473000, "material_type": "raw"}, {"code": "M130", "name": "جوش شیرین", "unit": "کیلوگرم", "last_buy_price": 63000, "material_type": "raw"}, {"code": "M131", "name": "سس خردل", "unit": "کیلوگرم", "last_buy_price": 250000, "material_type": "raw"}, {"code": "M132", "name": "سس مایونز", "unit": "کیلوگرم", "last_buy_price": 212500, "material_type": "raw"}, {"code": "M133", "name": "آبلیمو", "unit": "کیلوگرم", "last_buy_price": 270000, "material_type": "raw"}, {"code": "M134", "name": "پودر زنجبیل", "unit": "کیلوگرم", "last_buy_price": 550000, "material_type": "raw"}, {"code": "M135", "name": "پیاز آب گرفته", "unit": "کیلوگرم", "last_buy_price": 210000.0, "material_type": "raw"}, {"code": "M136", "name": "آب پیاز", "unit": "کیلوگرم", "last_buy_price": 1.0, "material_type": "raw"}], "products": [{"code": "P016", "name": "حمص", "weight_per_unit": 250, "material_name": ""}, {"code": "P017", "name": "ماست وخیار", "weight_per_unit": 250, "material_name": ""}, {"code": "P018", "name": "ته چین ساده", "weight_per_unit": 1125, "material_name": ""}, {"code": "P019", "name": "لوبیاپلو با برنج", "weight_per_unit": 1125, "material_name": ""}, {"code": "P020", "name": "بورانی اسفناج", "weight_per_unit": 250, "material_name": ""}, {"code": "SM004", "name": "مایه کباب", "weight_per_unit": 1000, "material_name": ""}, {"code": "P006", "name": "لقمه مجلسی 150گرمی", "weight_per_unit": 150, "material_name": ""}, {"code": "P005", "name": "لقمه معمولی 120گرمی", "weight_per_unit": 120, "material_name": ""}, {"code": "P004", "name": "کوبیده اکو 100گرمی", "weight_per_unit": 100, "material_name": ""}, {"code": "SM001", "name": "سینه مرینیت جوجه", "weight_per_unit": 1000, "material_name": ""}, {"code": "P003", "name": "جوجه مجلسی ۲۸۰ گرمی", "weight_per_unit": 280, "material_name": ""}, {"code": "P002", "name": "جوجه ممتاز ۲۰۰ گرمی", "weight_per_unit": 200, "material_name": ""}, {"code": "P001", "name": "جوجه معمولی 170 گرمی", "weight_per_unit": 170, "material_name": ""}], "recipes": {"گوشت نخودی": [{"material_name": "سردست گوساله", "qty": 0.5}, {"material_name": "قلوه گاه گوسفندی", "qty": 0.4}, {"material_name": "قلوه گاه گوساله", "qty": 0.1}], "حمص": [{"material_name": "ارده", "qty": 0.083}, {"material_name": "ماست", "qty": 0.053}, {"material_name": "روغن", "qty": 0.012}, {"material_name": "نخود کنسرو", "qty": 0.235}, {"material_name": "سیر", "qty": 0.00047}, {"material_name": "فلفل سیاه", "qty": 0.00024}, {"material_name": "فلفل قرمز", "qty": 0.00012}, {"material_name": "نمک", "qty": 0.00075}, {"material_name": "زیتون سبز", "qty": 0.02}, {"material_name": "روغن زیتون", "qty": 0.01}, {"material_name": "ظرف ۲۵۰", "qty": 1.0}], "ماست وخیار": [{"material_name": "ماست", "qty": 0.195}, {"material_name": "خیار", "qty": 0.122}, {"material_name": "نعناء خشک", "qty": 0.00065}, {"material_name": "نمک", "qty": 0.0013}, {"material_name": "فلفل سیاه", "qty": 0.00035}, {"material_name": "سیر", "qty": 0.00087}, {"material_name": "ظرف ۲۵۰", "qty": 1.0}], "ته چین ساده": [{"material_name": "تخم مرغ", "qty": 0.031}, {"material_name": "ماست", "qty": 0.077}, {"material_name": "روغن", "qty": 0.043}, {"material_name": "گلاب", "qty": 0.00085}, {"material_name": "عرق هل", "qty": 0.001}, {"material_name": "پودر هل", "qty": 0.00015}, {"material_name": "دارچین", "qty": 0.00031}, {"material_name": "برنج مخلوط ایرانی", "qty": 0.116}, {"material_name": "نمک", "qty": 0.0027}, {"material_name": "زعفران", "qty": 0.0045}, {"material_name": "ظرف ۱۱۲۵", "qty": 1.0}], "لوبیاپلو با برنج": [{"material_name": "لوبیا سبز", "qty": 0.11}, {"material_name": "پیاز", "qty": 0.6}, {"material_name": "رب گوجه فرنگی", "qty": 0.005}, {"material_name": "روغن", "qty": 0.02}, {"material_name": "گوشت گوساله", "qty": 0.05}, {"material_name": "سینه مرغ", "qty": 0.025}, {"material_name": "نمک", "qty": 0.002}, {"material_name": "زردچوبه", "qty": 0.0004}, {"material_name": "پودر سیر", "qty": 0.0006}, {"material_name": "دارچین", "qty": 0.001}, {"material_name": "فلفل سیاه", "qty": 0.0005}, {"material_name": "برنج مخلوط ایرانی", "qty": 0.14}, {"material_name": "زعفران", "qty": 0.0005}, {"material_name": "ظرف ۱۱۲۵", "qty": 1.0}], "بورانی اسفناج": [{"material_name": "ماست", "qty": 0.25}, {"material_name": "اسفناج", "qty": 0.028}, {"material_name": "نمک", "qty": 0.0014}, {"material_name": "فلفل سیاه", "qty": 0.0004}, {"material_name": "سیر", "qty": 0.00087}, {"material_name": "ظرف ۲۵۰", "qty": 1.0}], "مایه کباب": [{"material_name": "گوشت نخودی", "qty": 1.0}, {"material_name": "پیاز آب گرفته", "qty": 0.35}, {"material_name": "نمک", "qty": 0.01}, {"material_name": "فلفل سیاه", "qty": 0.002}, {"material_name": "جوش شیرین", "qty": 0.004}], "لقمه مجلسی 150گرمی": [{"material_name": "گوشت نخودی", "qty": 0.113}, {"material_name": "پیاز آب گرفته", "qty": 0.038}, {"material_name": "نمک", "qty": 0.0011}, {"material_name": "فلفل سیاه", "qty": 0.00022}, {"material_name": "جوش شیرین", "qty": 0.00044}], "لقمه معمولی 120گرمی": [{"material_name": "گوشت نخودی", "qty": 0.09}, {"material_name": "پیاز آب گرفته", "qty": 0.031}, {"material_name": "نمک", "qty": 0.00099}, {"material_name": "فلفل سیاه", "qty": 0.0002}, {"material_name": "جوش شیرین", "qty": 0.00042}], "کوبیده اکو 100گرمی": [{"material_name": "گوشت نخودی", "qty": 0.075}, {"material_name": "پیاز آب گرفته", "qty": 0.026}, {"material_name": "نمک", "qty": 0.00092}, {"material_name": "فلفل سیاه", "qty": 0.00018}, {"material_name": "جوش شیرین", "qty": 0.0004}], "سینه مرینیت جوجه": [{"material_name": "سینه مرغ", "qty": 1.0}, {"material_name": "ماست", "qty": 0.02}, {"material_name": "سس خردل", "qty": 0.02}, {"material_name": "روغن", "qty": 0.022}, {"material_name": "سس مایونز", "qty": 0.04}, {"material_name": "نمک", "qty": 0.011}, {"material_name": "آبلیمو", "qty": 0.01}, {"material_name": "پودر سیر", "qty": 0.0003}, {"material_name": "فلفل سیاه", "qty": 0.00015}, {"material_name": "پودر زنجبیل", "qty": 0.0001}, {"material_name": "فلفل قرمز", "qty": 0.00015}, {"material_name": "زعفران", "qty": 0.04}, {"material_name": "آب پیاز", "qty": 0.015}], "جوجه مجلسی ۲۸۰ گرمی": [{"material_name": "سینه مرغ", "qty": 0.28}, {"material_name": "ماست", "qty": 0.0056}, {"material_name": "سس خردل", "qty": 0.0056}, {"material_name": "روغن", "qty": 0.00616}, {"material_name": "سس مایونز", "qty": 0.0112}, {"material_name": "نمک", "qty": 0.00308}, {"material_name": "آبلیمو", "qty": 0.0028}, {"material_name": "پودر سیر", "qty": 8e-05}, {"material_name": "فلفل سیاه", "qty": 4e-05}, {"material_name": "پودر زنجبیل", "qty": 3e-05}, {"material_name": "فلفل قرمز", "qty": 4e-05}, {"material_name": "زعفران", "qty": 0.0112}, {"material_name": "آب پیاز", "qty": 0.0042}], "جوجه ممتاز ۲۰۰ گرمی": [{"material_name": "سینه مرغ", "qty": 0.2}, {"material_name": "ماست", "qty": 0.004}, {"material_name": "سس خردل", "qty": 0.004}, {"material_name": "روغن", "qty": 0.0044}, {"material_name": "سس مایونز", "qty": 0.008}, {"material_name": "نمک", "qty": 0.0022}, {"material_name": "آبلیمو", "qty": 0.002}, {"material_name": "پودر سیر", "qty": 6e-05}, {"material_name": "فلفل سیاه", "qty": 3e-05}, {"material_name": "پودر زنجبیل", "qty": 2e-05}, {"material_name": "فلفل قرمز", "qty": 3e-05}, {"material_name": "زعفران", "qty": 0.008}, {"material_name": "آب پیاز", "qty": 0.003}], "جوجه معمولی 170 گرمی": [{"material_name": "سینه مرغ", "qty": 0.17}, {"material_name": "ماست", "qty": 0.0034}, {"material_name": "سس خردل", "qty": 0.0034}, {"material_name": "روغن", "qty": 0.00374}, {"material_name": "سس مایونز", "qty": 0.0068}, {"material_name": "نمک", "qty": 0.00187}, {"material_name": "آبلیمو", "qty": 0.0017}, {"material_name": "پودر سیر", "qty": 5e-05}, {"material_name": "فلفل سیاه", "qty": 3e-05}, {"material_name": "پودر زنجبیل", "qty": 2e-05}, {"material_name": "فلفل قرمز", "qty": 3e-05}, {"material_name": "زعفران", "qty": 0.0068}, {"material_name": "آب پیاز", "qty": 0.00255}]}};

  Pages.importRajaRecipes = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('ایمپورت کامل راجا (مواد+قیمت+محصول+رسپی)؟\nهم‌نام‌ها فقط قیمت به‌روز می‌شود.')) return;
    try {
      var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
      var byName = {};
      materials.forEach(function (m) { byName[m.name] = m; });
      var addedM = 0, updatedM = 0;
      for (var i = 0; i < DATA.materials.length; i++) {
        var s = DATA.materials[i];
        if (byName[s.name]) {
          var ex = byName[s.name];
          await DB.put('materials', Object.assign({}, ex, {
            last_buy_price: s.last_buy_price != null ? s.last_buy_price : ex.last_buy_price,
            last_buy_date: ex.last_buy_date || (typeof todayJalali === 'function' ? todayJalali() : ''),
            unit: ex.unit || s.unit,
            material_type: ex.material_type || s.material_type,
            code: ex.code || s.code
          }));
          updatedM++;
        } else {
          await DB.add('materials', {
            code: s.code || '', name: s.name, unit: s.unit || 'کیلوگرم',
            initial_stock: 0, min_alert: 0,
            last_buy_price: s.last_buy_price,
            last_buy_date: typeof todayJalali === 'function' ? todayJalali() : '',
            material_type: s.material_type || 'raw', active: 1
          });
          addedM++;
        }
      }
      var products = (await DB.getAll('products').catch(function () { return []; })) || [];
      var pByName = {};
      products.forEach(function (p) { pByName[p.name] = p; });
      var addedP = 0;
      for (var j = 0; j < DATA.products.length; j++) {
        var pr = DATA.products[j];
        if (pByName[pr.name]) continue;
        try {
          await DB.add('products', {
            code: pr.code, name: pr.name, weight_per_unit: pr.weight_per_unit,
            material_name: pr.material_name || '', remainder_type: 'حمل به روز بعد', active: 1
          });
          addedP++;
        } catch (eAdd) {
          try {
            await DB.add('products', {
              code: 'P' + (300 + j), name: pr.name, weight_per_unit: pr.weight_per_unit,
              material_name: '', remainder_type: 'حمل به روز بعد', active: 1
            });
            addedP++;
          } catch (e2) { console.error(e2); }
        }
      }
      var recAdded = 0;
      var names = Object.keys(DATA.recipes);
      for (var r = 0; r < names.length; r++) {
        var productName = names[r];
        var linesR = DATA.recipes[productName];
        if (!linesR || !linesR.length) continue;
        var allR = (await DB.getAll('recipes').catch(function () { return []; })) || [];
        var existing = allR.find(function (x) { return x.product_name === productName; });
        if (existing && existing.id) {
          await DB.put('recipes', Object.assign({}, existing, { mode: 'multi_input', yield_factor: 1, notes: 'ایمپورت راجا' }));
        } else {
          await DB.add('recipes', { product_name: productName, mode: 'multi_input', yield_factor: 1, notes: 'ایمپورت راجا' });
        }
        var freshI = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
        for (var ii = 0; ii < freshI.length; ii++) {
          if (freshI[ii].product_name === productName) {
            try { await DB.remove('recipe_items', freshI[ii].id); } catch (e) {}
          }
        }
        for (var k = 0; k < linesR.length; k++) {
          await DB.add('recipe_items', {
            product_name: productName,
            material_name: linesR[k].material_name,
            qty: linesR[k].qty,
            sort_order: k
          });
        }
        recAdded++;
      }
      toast('راجا کامل: ' + addedM + ' ماده، ' + updatedM + ' قیمت، ' + addedP + ' محصول، ' + recAdded + ' رسپی', 'success');
      navigate('products');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  var _prod = Pages.products;
  Pages.products = async function () {
    var html = await _prod();
    if (Auth.isAdmin()) {
      html = '<div class="mb-3"><button type="button" class="btn-secondary text-sm" onclick="Pages.importRajaRecipes()">ایمپورت کامل راجا (قیمت+رسپی)</button></div>' + html;
    }
    return html;
  };
  console.log('[seed-raja-full] complete import ready');
})();
