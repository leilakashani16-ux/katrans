/**
 * seed-raja-recipes.js — M105+ materials, P016+ products
 */
(function () {
  var DATA = {
  "materials": [
    {
      "code": "M105",
      "name": "ارده",
      "unit": "کیلوگرم",
      "last_buy_price": 1171428,
      "material_type": "raw"
    },
    {
      "code": "M106",
      "name": "ماست",
      "unit": "کیلوگرم",
      "last_buy_price": 129000,
      "material_type": "raw"
    },
    {
      "code": "M107",
      "name": "روغن",
      "unit": "کیلوگرم",
      "last_buy_price": 413500,
      "material_type": "raw"
    },
    {
      "code": "M108",
      "name": "نخود کنسرو",
      "unit": "کیلوگرم",
      "last_buy_price": 199750,
      "material_type": "raw"
    },
    {
      "code": "M109",
      "name": "سیر",
      "unit": "کیلوگرم",
      "last_buy_price": 200000,
      "material_type": "raw"
    },
    {
      "code": "M110",
      "name": "فلفل سیاه",
      "unit": "کیلوگرم",
      "last_buy_price": 3000000,
      "material_type": "raw"
    },
    {
      "code": "M111",
      "name": "فلفل قرمز",
      "unit": "کیلوگرم",
      "last_buy_price": 1300000,
      "material_type": "raw"
    },
    {
      "code": "M112",
      "name": "نمک",
      "unit": "کیلوگرم",
      "last_buy_price": 56250,
      "material_type": "raw"
    },
    {
      "code": "M113",
      "name": "زیتون سبز",
      "unit": "کیلوگرم",
      "last_buy_price": 232500,
      "material_type": "raw"
    },
    {
      "code": "M114",
      "name": "روغن زیتون",
      "unit": "کیلوگرم",
      "last_buy_price": 1222300,
      "material_type": "raw"
    },
    {
      "code": "M115",
      "name": "ظرف ۲۵۰",
      "unit": "عدد",
      "last_buy_price": 17000,
      "material_type": "packaging"
    },
    {
      "code": "M116",
      "name": "خیار",
      "unit": "کیلوگرم",
      "last_buy_price": 40000,
      "material_type": "raw"
    },
    {
      "code": "M117",
      "name": "نعناء خشک",
      "unit": "کیلوگرم",
      "last_buy_price": 1300000,
      "material_type": "raw"
    },
    {
      "code": "M118",
      "name": "تخم مرغ",
      "unit": "کیلوگرم",
      "last_buy_price": 336000,
      "material_type": "raw"
    },
    {
      "code": "M119",
      "name": "گلاب",
      "unit": "کیلوگرم",
      "last_buy_price": 610000,
      "material_type": "raw"
    },
    {
      "code": "M120",
      "name": "عرق هل",
      "unit": "کیلوگرم",
      "last_buy_price": 40000,
      "material_type": "raw"
    },
    {
      "code": "M121",
      "name": "پودر هل",
      "unit": "کیلوگرم",
      "last_buy_price": 11000000,
      "material_type": "raw"
    },
    {
      "code": "M122",
      "name": "دارچین",
      "unit": "کیلوگرم",
      "last_buy_price": 1520000,
      "material_type": "raw"
    },
    {
      "code": "M123",
      "name": "برنج مخلوط ایرانی",
      "unit": "کیلوگرم",
      "last_buy_price": 435000,
      "material_type": "raw"
    },
    {
      "code": "M124",
      "name": "زعفران",
      "unit": "مثقال",
      "last_buy_price": 1400000,
      "material_type": "raw"
    },
    {
      "code": "M125",
      "name": "ظرف ۱۱۲۵",
      "unit": "عدد",
      "last_buy_price": 40500,
      "material_type": "packaging"
    },
    {
      "code": "M126",
      "name": "لوبیا سبز",
      "unit": "کیلوگرم",
      "last_buy_price": 270000,
      "material_type": "raw"
    },
    {
      "code": "M127",
      "name": "پیاز",
      "unit": "کیلوگرم",
      "last_buy_price": 70000,
      "material_type": "raw"
    },
    {
      "code": "M128",
      "name": "رب گوجه فرنگی",
      "unit": "کیلوگرم",
      "last_buy_price": 300000,
      "material_type": "raw"
    },
    {
      "code": "M129",
      "name": "گوشت گوساله",
      "unit": "کیلوگرم",
      "last_buy_price": 1300000,
      "material_type": "raw"
    },
    {
      "code": "M130",
      "name": "سینه مرغ",
      "unit": "کیلوگرم",
      "last_buy_price": 880000,
      "material_type": "raw"
    },
    {
      "code": "M131",
      "name": "زردچوبه",
      "unit": "کیلوگرم",
      "last_buy_price": 720000,
      "material_type": "raw"
    },
    {
      "code": "M132",
      "name": "پودر سیر",
      "unit": "کیلوگرم",
      "last_buy_price": 1250000,
      "material_type": "raw"
    },
    {
      "code": "M133",
      "name": "اسفناج",
      "unit": "کیلوگرم",
      "last_buy_price": 380000,
      "material_type": "raw"
    }
  ],
  "products": [
    {
      "code": "P016",
      "name": "حمص",
      "weight_per_unit": 250,
      "material_name": ""
    },
    {
      "code": "P017",
      "name": "ماست وخیار",
      "weight_per_unit": 250,
      "material_name": ""
    },
    {
      "code": "P018",
      "name": "ته چین ساده",
      "weight_per_unit": 1125,
      "material_name": ""
    },
    {
      "code": "P019",
      "name": "لوبیاپلو با برنج",
      "weight_per_unit": 1125,
      "material_name": ""
    },
    {
      "code": "P020",
      "name": "بورانی اسفناج",
      "weight_per_unit": 250,
      "material_name": ""
    }
  ],
  "recipes": {
    "حمص": [
      {
        "material_name": "ارده",
        "qty": 0.083
      },
      {
        "material_name": "ماست",
        "qty": 0.053
      },
      {
        "material_name": "روغن",
        "qty": 0.012
      },
      {
        "material_name": "نخود کنسرو",
        "qty": 0.235
      },
      {
        "material_name": "سیر",
        "qty": 0.00047
      },
      {
        "material_name": "فلفل سیاه",
        "qty": 0.00024
      },
      {
        "material_name": "فلفل قرمز",
        "qty": 0.00012
      },
      {
        "material_name": "نمک",
        "qty": 0.00075
      },
      {
        "material_name": "زیتون سبز",
        "qty": 0.02
      },
      {
        "material_name": "روغن زیتون",
        "qty": 0.01
      },
      {
        "material_name": "ظرف ۲۵۰",
        "qty": 1
      }
    ],
    "ماست وخیار": [
      {
        "material_name": "ماست",
        "qty": 0.195
      },
      {
        "material_name": "خیار",
        "qty": 0.122
      },
      {
        "material_name": "نعناء خشک",
        "qty": 0.00065
      },
      {
        "material_name": "نمک",
        "qty": 0.0013
      },
      {
        "material_name": "فلفل سیاه",
        "qty": 0.00035
      },
      {
        "material_name": "سیر",
        "qty": 0.00087
      },
      {
        "material_name": "ظرف ۲۵۰",
        "qty": 1
      }
    ],
    "ته چین ساده": [
      {
        "material_name": "تخم مرغ",
        "qty": 0.031
      },
      {
        "material_name": "ماست",
        "qty": 0.077
      },
      {
        "material_name": "روغن",
        "qty": 0.043
      },
      {
        "material_name": "گلاب",
        "qty": 0.00085
      },
      {
        "material_name": "عرق هل",
        "qty": 0.001
      },
      {
        "material_name": "پودر هل",
        "qty": 0.00015
      },
      {
        "material_name": "دارچین",
        "qty": 0.00031
      },
      {
        "material_name": "برنج مخلوط ایرانی",
        "qty": 0.116
      },
      {
        "material_name": "نمک",
        "qty": 0.0027
      },
      {
        "material_name": "زعفران",
        "qty": 0.0045
      },
      {
        "material_name": "ظرف ۱۱۲۵",
        "qty": 1
      }
    ],
    "لوبیاپلو با برنج": [
      {
        "material_name": "لوبیا سبز",
        "qty": 0.11
      },
      {
        "material_name": "پیاز",
        "qty": 0.6
      },
      {
        "material_name": "رب گوجه فرنگی",
        "qty": 0.005
      },
      {
        "material_name": "روغن",
        "qty": 0.02
      },
      {
        "material_name": "گوشت گوساله",
        "qty": 0.05
      },
      {
        "material_name": "سینه مرغ",
        "qty": 0.025
      },
      {
        "material_name": "نمک",
        "qty": 0.002
      },
      {
        "material_name": "زردچوبه",
        "qty": 0.0004
      },
      {
        "material_name": "پودر سیر",
        "qty": 0.0006
      },
      {
        "material_name": "دارچین",
        "qty": 0.001
      },
      {
        "material_name": "فلفل سیاه",
        "qty": 0.0005
      },
      {
        "material_name": "برنج مخلوط ایرانی",
        "qty": 0.14
      },
      {
        "material_name": "زعفران",
        "qty": 0.0005
      },
      {
        "material_name": "ظرف ۱۱۲۵",
        "qty": 1
      }
    ],
    "بورانی اسفناج": [
      {
        "material_name": "ماست",
        "qty": 0.25
      },
      {
        "material_name": "اسفناج",
        "qty": 0.028
      },
      {
        "material_name": "نمک",
        "qty": 0.0014
      },
      {
        "material_name": "فلفل سیاه",
        "qty": 0.0004
      },
      {
        "material_name": "سیر",
        "qty": 0.00087
      },
      {
        "material_name": "ظرف ۲۵۰",
        "qty": 1
      }
    ]
  }
};

  Pages.importRajaRecipes = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('ایمپورت راجا: مواد M105+، محصولات P016+ و رسپی؟\nهم‌نام‌ها فقط قیمت به‌روز می‌شود.')) return;
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
            last_buy_price: s.last_buy_price,
            last_buy_date: ex.last_buy_date || (typeof todayJalali === 'function' ? todayJalali() : ''),
            unit: ex.unit || s.unit,
            material_type: ex.material_type || s.material_type
          }));
          updatedM++;
        } else {
          await DB.add('materials', {
            code: s.code, name: s.name, unit: s.unit, initial_stock: 0, min_alert: 0,
            last_buy_price: s.last_buy_price,
            last_buy_date: typeof todayJalali === 'function' ? todayJalali() : '',
            material_type: s.material_type, active: 1
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
            material_name: '', remainder_type: 'حمل به روز بعد', active: 1
          });
          addedP++;
        } catch (eAdd) {
          console.warn(pr.name, eAdd);
          try {
            await DB.add('products', {
              code: 'P' + (200 + j), name: pr.name, weight_per_unit: pr.weight_per_unit,
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

      toast('راجا: ' + addedM + ' ماده جدید، ' + updatedM + ' قیمت، ' + addedP + ' محصول، ' + recAdded + ' رسپی', 'success');
      navigate('products');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ایمپورت', 'error');
    }
  };

  var _prod = Pages.products;
  Pages.products = async function () {
    var html = await _prod();
    if (Auth.isAdmin()) {
      html = '<div class="mb-3"><button type="button" class="btn-secondary text-sm" onclick="Pages.importRajaRecipes()">ایمپورت رسپی راجا (P016 / M105)</button></div>' + html;
    }
    return html;
  };

  console.log('[seed-raja] M105+ P016+ OK');
})();
