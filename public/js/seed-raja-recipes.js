/**
 * ایمپورت رسپی اولیه راجا — مواد + قیمت + محصولات + دستور ساخت
 * فقط مدیر · یک‌بار از صفحه محصولات
 */
(function () {
  var RAJA_MATERIALS = [
    { code: "M001", name: "\u0627\u0631\u062f\u0647", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 1171428, material_type: "raw" },
    { code: "M002", name: "\u0645\u0627\u0633\u062a", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 129000, material_type: "raw" },
    { code: "M003", name: "\u0631\u0648\u063a\u0646", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 413500, material_type: "raw" },
    { code: "M004", name: "\u0646\u062e\u0648\u062f \u06a9\u0646\u0633\u0631\u0648", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 199750, material_type: "raw" },
    { code: "M005", name: "\u0633\u06cc\u0631", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 200000, material_type: "raw" },
    { code: "M006", name: "\u0641\u0644\u0641\u0644 \u0633\u06cc\u0627\u0647", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 3000000, material_type: "raw" },
    { code: "M007", name: "\u0641\u0644\u0641\u0644 \u0642\u0631\u0645\u0632", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 1300000, material_type: "raw" },
    { code: "M008", name: "\u0646\u0645\u06a9", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 56250, material_type: "raw" },
    { code: "M009", name: "\u0632\u06cc\u062a\u0648\u0646 \u0633\u0628\u0632", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 232500, material_type: "raw" },
    { code: "M010", name: "\u0631\u0648\u063a\u0646 \u0632\u06cc\u062a\u0648\u0646", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 1222300, material_type: "raw" },
    { code: "M011", name: "\u0638\u0631\u0641 \u06f2\u06f5\u06f0", unit: "\u0639\u062f\u062f", last_buy_price: 17000, material_type: "packaging" },
    { code: "M012", name: "\u062e\u06cc\u0627\u0631", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 40000, material_type: "raw" },
    { code: "M013", name: "\u0646\u0639\u0646\u0627\u0621 \u062e\u0634\u06a9", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 1300000, material_type: "raw" },
    { code: "M014", name: "\u062a\u062e\u0645 \u0645\u0631\u063a", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 336000, material_type: "raw" },
    { code: "M015", name: "\u06af\u0644\u0627\u0628", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 610000, material_type: "raw" },
    { code: "M016", name: "\u0639\u0631\u0642 \u0647\u0644", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 40000, material_type: "raw" },
    { code: "M017", name: "\u067e\u0648\u062f\u0631 \u0647\u0644", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 11000000, material_type: "raw" },
    { code: "M018", name: "\u062f\u0627\u0631\u0686\u06cc\u0646", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 1520000, material_type: "raw" },
    { code: "M019", name: "\u0628\u0631\u0646\u062c \u0645\u062e\u0644\u0648\u0637 \u0627\u06cc\u0631\u0627\u0646\u06cc", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 435000, material_type: "raw" },
    { code: "M020", name: "\u0632\u0639\u0641\u0631\u0627\u0646", unit: "\u0645\u062b\u0642\u0627\u0644", last_buy_price: 1400000, material_type: "raw" },
    { code: "M021", name: "\u0638\u0631\u0641 \u06f1\u06f1\u06f2\u06f5", unit: "\u0639\u062f\u062f", last_buy_price: 40500, material_type: "packaging" },
    { code: "M022", name: "\u0644\u0648\u0628\u06cc\u0627 \u0633\u0628\u0632", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 270000, material_type: "raw" },
    { code: "M023", name: "\u067e\u06cc\u0627\u0632", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 70000, material_type: "raw" },
    { code: "M024", name: "\u0631\u0628 \u06af\u0648\u062c\u0647 \u0641\u0631\u0646\u06af\u06cc", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 300000, material_type: "raw" },
    { code: "M025", name: "\u06af\u0648\u0634\u062a \u06af\u0648\u0633\u0627\u0644\u0647", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 1300000, material_type: "raw" },
    { code: "M026", name: "\u0633\u06cc\u0646\u0647 \u0645\u0631\u063a", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 880000, material_type: "raw" },
    { code: "M027", name: "\u0632\u0631\u062f\u0686\u0648\u0628\u0647", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 720000, material_type: "raw" },
    { code: "M028", name: "\u067e\u0648\u062f\u0631 \u0633\u06cc\u0631", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 1250000, material_type: "raw" },
    { code: "M029", name: "\u0627\u0633\u0641\u0646\u0627\u062c", unit: "\u06a9\u06cc\u0644\u0648\u06af\u0631\u0645", last_buy_price: 380000, material_type: "raw" }
  ];

  var RAJA_PRODUCTS = [
    { code: "P016", name: "\u062d\u0645\u0635", weight_per_unit: 250, material_name: "" },
    { code: "P017", name: "\u0645\u0627\u0633\u062a \u0648\u062e\u06cc\u0627\u0631", weight_per_unit: 250, material_name: "" },
    { code: "P018", name: "\u062a\u0647 \u0686\u06cc\u0646 \u0633\u0627\u062f\u0647", weight_per_unit: 1125, material_name: "" },
    { code: "P019", name: "\u0644\u0648\u0628\u06cc\u0627\u067e\u0644\u0648 \u0628\u0627 \u0628\u0631\u0646\u062c", weight_per_unit: 1125, material_name: "" },
    { code: "P020", name: "\u0628\u0648\u0631\u0627\u0646\u06cc \u0627\u0633\u0641\u0646\u0627\u062c", weight_per_unit: 250, material_name: "" }
  ];

  var RAJA_RECIPES = {
  "\u062d\u0645\u0635": [{ material_name: "\u0627\u0631\u062f\u0647", qty: 0.083 }, { material_name: "\u0645\u0627\u0633\u062a", qty: 0.053 }, { material_name: "\u0631\u0648\u063a\u0646", qty: 0.012 }, { material_name: "\u0646\u062e\u0648\u062f \u06a9\u0646\u0633\u0631\u0648", qty: 0.235 }, { material_name: "\u0633\u06cc\u0631", qty: 0.00047 }, { material_name: "\u0641\u0644\u0641\u0644 \u0633\u06cc\u0627\u0647", qty: 0.00024 }, { material_name: "\u0641\u0644\u0641\u0644 \u0642\u0631\u0645\u0632", qty: 0.00012 }, { material_name: "\u0646\u0645\u06a9", qty: 0.00075 }, { material_name: "\u0632\u06cc\u062a\u0648\u0646 \u0633\u0628\u0632", qty: 0.02 }, { material_name: "\u0631\u0648\u063a\u0646 \u0632\u06cc\u062a\u0648\u0646", qty: 0.01 }, { material_name: "\u0638\u0631\u0641 \u06f2\u06f5\u06f0", qty: 1 }]
  "\u0645\u0627\u0633\u062a \u0648\u062e\u06cc\u0627\u0631": [{ material_name: "\u0645\u0627\u0633\u062a", qty: 0.195 }, { material_name: "\u062e\u06cc\u0627\u0631", qty: 0.122 }, { material_name: "\u0646\u0639\u0646\u0627\u0621 \u062e\u0634\u06a9", qty: 0.00065 }, { material_name: "\u0646\u0645\u06a9", qty: 0.0013 }, { material_name: "\u0641\u0644\u0641\u0644 \u0633\u06cc\u0627\u0647", qty: 0.00035 }, { material_name: "\u0633\u06cc\u0631", qty: 0.00087 }, { material_name: "\u0638\u0631\u0641 \u06f2\u06f5\u06f0", qty: 1 }]
  "\u062a\u0647 \u0686\u06cc\u0646 \u0633\u0627\u062f\u0647": [{ material_name: "\u062a\u062e\u0645 \u0645\u0631\u063a", qty: 0.031 }, { material_name: "\u0645\u0627\u0633\u062a", qty: 0.077 }, { material_name: "\u0631\u0648\u063a\u0646", qty: 0.043 }, { material_name: "\u06af\u0644\u0627\u0628", qty: 0.00085 }, { material_name: "\u0639\u0631\u0642 \u0647\u0644", qty: 0.001 }, { material_name: "\u067e\u0648\u062f\u0631 \u0647\u0644", qty: 0.00015 }, { material_name: "\u062f\u0627\u0631\u0686\u06cc\u0646", qty: 0.00031 }, { material_name: "\u0628\u0631\u0646\u062c \u0645\u062e\u0644\u0648\u0637 \u0627\u06cc\u0631\u0627\u0646\u06cc", qty: 0.116 }, { material_name: "\u0646\u0645\u06a9", qty: 0.0027 }, { material_name: "\u0632\u0639\u0641\u0631\u0627\u0646", qty: 0.0045 }, { material_name: "\u0638\u0631\u0641 \u06f1\u06f1\u06f2\u06f5", qty: 1 }]
  "\u0644\u0648\u0628\u06cc\u0627\u067e\u0644\u0648 \u0628\u0627 \u0628\u0631\u0646\u062c": [{ material_name: "\u0644\u0648\u0628\u06cc\u0627 \u0633\u0628\u0632", qty: 0.11 }, { material_name: "\u067e\u06cc\u0627\u0632", qty: 0.6 }, { material_name: "\u0631\u0628 \u06af\u0648\u062c\u0647 \u0641\u0631\u0646\u06af\u06cc", qty: 0.005 }, { material_name: "\u0631\u0648\u063a\u0646", qty: 0.02 }, { material_name: "\u06af\u0648\u0634\u062a \u06af\u0648\u0633\u0627\u0644\u0647", qty: 0.05 }, { material_name: "\u0633\u06cc\u0646\u0647 \u0645\u0631\u063a", qty: 0.025 }, { material_name: "\u0646\u0645\u06a9", qty: 0.002 }, { material_name: "\u0632\u0631\u062f\u0686\u0648\u0628\u0647", qty: 0.0004 }, { material_name: "\u067e\u0648\u062f\u0631 \u0633\u06cc\u0631", qty: 0.0006 }, { material_name: "\u062f\u0627\u0631\u0686\u06cc\u0646", qty: 0.001 }, { material_name: "\u0641\u0644\u0641\u0644 \u0633\u06cc\u0627\u0647", qty: 0.0005 }, { material_name: "\u0628\u0631\u0646\u062c \u0645\u062e\u0644\u0648\u0637 \u0627\u06cc\u0631\u0627\u0646\u06cc", qty: 0.14 }, { material_name: "\u0632\u0639\u0641\u0631\u0627\u0646", qty: 0.0005 }, { material_name: "\u0638\u0631\u0641 \u06f1\u06f1\u06f2\u06f5", qty: 1 }]
  "\u0628\u0648\u0631\u0627\u0646\u06cc \u0627\u0633\u0641\u0646\u0627\u062c": [{ material_name: "\u0645\u0627\u0633\u062a", qty: 0.25 }, { material_name: "\u0627\u0633\u0641\u0646\u0627\u062c", qty: 0.028 }, { material_name: "\u0646\u0645\u06a9", qty: 0.0014 }, { material_name: "\u0641\u0644\u0641\u0644 \u0633\u06cc\u0627\u0647", qty: 0.0004 }, { material_name: "\u0633\u06cc\u0631", qty: 0.00087 }, { material_name: "\u0638\u0631\u0641 \u06f2\u06f5\u06f0", qty: 1 }]
  };

  Pages.importRajaRecipes = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('مواد، قیمت‌ها، محصولات و رسپی‌های فایل راجا وارد شوند؟\n(مواد تکراری فقط قیمت‌شان به‌روز می‌شود)')) return;

    try {
      var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
      var byName = {};
      materials.forEach(function (m) { byName[m.name] = m; });
      var addedM = 0, updatedM = 0;

      for (var i = 0; i < RAJA_MATERIALS.length; i++) {
        var s = RAJA_MATERIALS[i];
        if (byName[s.name]) {
          var ex = byName[s.name];
          await DB.put('materials', Object.assign({}, ex, {
            last_buy_price: s.last_buy_price,
            last_buy_date: ex.last_buy_date || (typeof todayJalali === 'function' ? todayJalali() : ''),
            unit: ex.unit || s.unit,
            material_type: ex.material_type || s.material_type,
            code: ex.code || s.code
          }));
          updatedM++;
        } else {
          await DB.add('materials', {
            code: s.code,
            name: s.name,
            unit: s.unit,
            initial_stock: 0,
            min_alert: 0,
            last_buy_price: s.last_buy_price,
            last_buy_date: typeof todayJalali === 'function' ? todayJalali() : '',
            material_type: s.material_type,
            active: 1
          });
          addedM++;
        }
      }

      var products = (await DB.getAll('products').catch(function () { return []; })) || [];
      var pByName = {};
      products.forEach(function (p) { pByName[p.name] = p; });
      var addedP = 0;
      for (var j = 0; j < RAJA_PRODUCTS.length; j++) {
        var pr = RAJA_PRODUCTS[j];
        if (pByName[pr.name]) {
          // محصول هست؛ فقط مطمئن شو فعال است
          try {
            var pe = pByName[pr.name];
            await DB.put('products', Object.assign({}, pe, {
              active: 1,
              weight_per_unit: pe.weight_per_unit || pr.weight_per_unit
            }));
          } catch (e0) {}
          continue;
        }
        try {
          await DB.add('products', {
            code: pr.code,
            name: pr.name,
            weight_per_unit: pr.weight_per_unit,
            material_name: pr.material_name || '',
            remainder_type: 'حمل به روز بعد',
            active: 1
          });
          addedP++;
        } catch (eAdd) {
          console.warn('product add', pr.name, eAdd);
          // fallback: code تصادفی
          try {
            await DB.add('products', {
              code: 'P' + String(100 + j),
              name: pr.name,
              weight_per_unit: pr.weight_per_unit,
              material_name: '',
              remainder_type: 'حمل به روز بعد',
              active: 1
            });
            addedP++;
          } catch (e2) {
            console.error('product fail', pr.name, e2);
          }
        }
      }

      var allR = (await DB.getAll('recipes').catch(function () { return []; })) || [];
      var allI = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
      var recAdded = 0;

      var names = Object.keys(RAJA_RECIPES);
      for (var r = 0; r < names.length; r++) {
        var productName = names[r];
        var lines = RAJA_RECIPES[productName];
        var existing = allR.find(function (x) { return x.product_name === productName; });
        if (existing && existing.id) {
          await DB.put('recipes', Object.assign({}, existing, {
            mode: 'multi_input',
            yield_factor: 1,
            notes: 'ایمپورت راجا'
          }));
        } else {
          await DB.add('recipes', {
            product_name: productName,
            mode: 'multi_input',
            yield_factor: 1,
            notes: 'ایمپورت راجا'
          });
        }
        // clear old items
        var freshI = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
        for (var ii = 0; ii < freshI.length; ii++) {
          if (freshI[ii].product_name === productName) {
            try { await DB.remove('recipe_items', freshI[ii].id); } catch (e) {}
          }
        }
        for (var k = 0; k < lines.length; k++) {
          await DB.add('recipe_items', {
            product_name: productName,
            material_name: lines[k].material_name,
            qty: lines[k].qty,
            sort_order: k
          });
        }
        recAdded++;
      }

      toast('راجا: ' + addedM + ' ماده جدید، ' + updatedM + ' قیمت به‌روز، ' + addedP + ' محصول، ' + recAdded + ' رسپی', 'success');
      navigate('products');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ایمپورت', 'error');
    }
  };

  // دکمه روی صفحه محصولات
  var _prod = Pages.products;
  Pages.products = async function () {
    var html = await _prod();
    if (Auth.isAdmin()) {
      html = html.replace(
        '</h1>',
        '</h1></div><div class="flex gap-2 flex-wrap">'
      );
      // safer: prepend button bar
      html =
        '<div class="mb-3">' +
        '<button type="button" class="btn-secondary text-sm" onclick="Pages.importRajaRecipes()">📥 ایمپورت رسپی راجا (۵ محصول)</button>' +
        '</div>' +
        html;
    }
    return html;
  };

  console.log('[seed-raja] import ready');
})();
