/**
 * چاپ / PDF رسپی برای آشپزخانه
 */
(function () {
  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Math.round(Number(n)).toLocaleString('fa-IR');
  }
  function fmtQ(n) {
    if (n == null || isNaN(Number(n))) return '—';
    var x = Number(n);
    if (x >= 1) return x.toLocaleString('fa-IR', { maximumFractionDigits: 3 });
    return String(x);
  }
  function companyName() {
    try {
      var local = localStorage.getItem('kitchen_settings');
      if (local) return JSON.parse(local).company_name || 'غذای انصار';
    } catch (e) {}
    return 'غذای انصار';
  }
  function todayStr() {
    return typeof todayJalali === 'function' ? todayJalali() : new Date().toLocaleDateString('fa-IR');
  }

  async function buildRecipeData(productName) {
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var items = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];
    var recipes = (await DB.getAll('recipes').catch(function () { return []; })) || [];
    var products = (await DB.getAll('products').catch(function () { return []; })) || [];
    var rec = recipes.find(function (r) { return r.product_name === productName; });
    var lines = items
      .filter(function (i) { return i.product_name === productName; })
      .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var prod = products.find(function (p) { return p.name === productName; });
    var priceMap = {};
    materials.forEach(function (m) {
      priceMap[m.name] = m.last_buy_price != null ? Number(m.last_buy_price) : null;
    });
    var unitMap = {};
    materials.forEach(function (m) {
      unitMap[m.name] = m.unit || '';
    });
    var total = 0;
    var detail = lines.map(function (line) {
      var qty = Number(line.qty || 0);
      var unitP = priceMap[line.material_name];
      var cost = unitP != null ? qty * unitP : null;
      if (cost != null) total += cost;
      return {
        material_name: line.material_name,
        qty: qty,
        unit: unitMap[line.material_name] || '',
        unit_price: unitP,
        line_cost: cost
      };
    });
    return {
      productName: productName,
      product: prod,
      recipe: rec,
      lines: detail,
      total: total,
      yield_factor: rec && rec.yield_factor != null ? Number(rec.yield_factor) : null,
      notes: (rec && rec.notes) || ''
    };
  }

  function sheetHtml(data, opts) {
    opts = opts || {};
    var showCost = opts.showCost !== false;
    var rows = data.lines
      .map(function (l, i) {
        return (
          '<tr>' +
          '<td style="text-align:center">' +
          (i + 1) +
          '</td>' +
          '<td>' +
          (l.material_name || '') +
          '</td>' +
          '<td style="text-align:center">' +
          fmtQ(l.qty) +
          '</td>' +
          '<td style="text-align:center">' +
          (l.unit || '') +
          '</td>' +
          (showCost
            ? '<td style="text-align:left">' +
              fmtPrice(l.unit_price) +
              '</td><td style="text-align:left">' +
              fmtPrice(l.line_cost) +
              '</td>'
            : '') +
          '</tr>'
        );
      })
      .join('');

    var costBlock = '';
    if (showCost) {
      costBlock =
        '<div class="sum">' +
        '<div>جمع هزینه مواد: <b>' +
        fmtPrice(data.total) +
        ' تومان</b></div>' +
        (data.yield_factor
          ? '<div>هزینه هر واحد خروجی: <b>' +
            fmtPrice(data.total / data.yield_factor) +
            ' تومان</b></div>'
          : '') +
        '</div>';
    }

    return (
      '<section class="sheet">' +
      '<header>' +
      '<div class="brand">' +
      companyName() +
      '</div>' +
      '<h1>دستور ساخت (رسپی)</h1>' +
      '<h2>' +
      data.productName +
      '</h2>' +
      '<div class="meta">' +
      (data.product && data.product.code ? 'کد: ' + data.product.code + ' · ' : '') +
      (data.product && data.product.weight_per_unit
        ? 'وزن واحد: ' + data.product.weight_per_unit + ' · '
        : '') +
      'تاریخ چاپ: ' +
      todayStr() +
      '</div>' +
      '</header>' +
      '<p class="note">طبق این جدول مواد را آماده و ترکیب کنید.</p>' +
      '<table>' +
      '<thead><tr>' +
      '<th>#</th><th>ماده / بسته‌بندی</th><th>مقدار</th><th>واحد</th>' +
      (showCost ? '<th>فی</th><th>مبلغ</th>' : '') +
      '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="6">رسپی تعریف نشده</td></tr>') +
      '</tbody></table>' +
      costBlock +
      (data.notes
        ? '<div class="notes"><b>یادداشت:</b> ' + data.notes + '</div>'
        : '') +
      '<footer>' +
      '<div class="sign">تهیه‌کننده: ............</div>' +
      '<div class="sign">تأیید سرآشپز: ............</div>' +
      '</footer>' +
      '</section>'
    );
  }

  function openPrint(htmlBody, title) {
    var w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      toast('پنجره چاپ مسدود شد — اجازه پاپ‌آپ بدهید', 'error');
      return;
    }
    w.document.write(
      '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" />' +
        '<title>' +
        (title || 'رسپی') +
        '</title>' +
        '<style>' +
        'body{font-family:Tahoma,Vazirmatn,sans-serif;margin:0;padding:16px;color:#111;background:#fff}' +
        '.sheet{max-width:800px;margin:0 auto 24px;page-break-after:always;border:1px solid #ddd;padding:20px;border-radius:8px}' +
        '.sheet:last-child{page-break-after:auto}' +
        'header{text-align:center;margin-bottom:12px}' +
        '.brand{font-size:13px;color:#555}' +
        'h1{font-size:16px;margin:4px 0;font-weight:700}' +
        'h2{font-size:22px;margin:6px 0 4px;color:#0d4d2e}' +
        '.meta{font-size:12px;color:#666}' +
        '.note{font-size:13px;background:#f4f7f5;padding:8px 12px;border-radius:6px;border-right:3px solid #0d4d2e}' +
        'table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}' +
        'th,td{border:1px solid #ccc;padding:8px 10px}' +
        'th{background:#0d4d2e;color:#fff}' +
        'tbody tr:nth-child(even){background:#f8faf9}' +
        '.sum{margin-top:12px;font-size:13px;line-height:1.8}' +
        '.notes{margin-top:10px;font-size:12px;color:#333}' +
        'footer{display:flex;justify-content:space-between;margin-top:28px;font-size:12px;color:#444}' +
        '.sign{min-width:40%}' +
        '.toolbar{position:sticky;top:0;background:#fff;padding:10px;border-bottom:1px solid #eee;display:flex;gap:8px;justify-content:center;z-index:5}' +
        '.toolbar button{padding:8px 16px;border-radius:8px;border:1px solid #0d4d2e;background:#0d4d2e;color:#fff;cursor:pointer;font-family:inherit}' +
        '.toolbar button.sec{background:#fff;color:#0d4d2e}' +
        '@media print{.toolbar{display:none}body{padding:0}.sheet{border:none;padding:0}}' +
        '</style></head><body>' +
        '<div class="toolbar">' +
        '<button onclick="window.print()">🖨 چاپ</button>' +
        '<button class="sec" onclick="window.close()">بستن</button>' +
        '</div>' +
        htmlBody +
        '</body></html>'
    );
    w.document.close();
  }

  /** چاپ یک رسپی */
  Pages.printRecipe = async function (productName, showCost) {
    if (!productName) return toast('محصول مشخص نیست', 'error');
    try {
      var data = await buildRecipeData(productName);
      if (!data.lines.length) return toast('برای این محصول رسپی تعریف نشده', 'error');
      openPrint(sheetHtml(data, { showCost: showCost !== false }), 'رسپی — ' + productName);
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در چاپ', 'error');
    }
  };

  /** چاپ همه رسپی‌ها */
  Pages.printAllRecipes = async function (showCost) {
    try {
      var recipes = (await DB.getAll('recipes').catch(function () { return []; })) || [];
      if (!recipes.length) return toast('رسپی‌ای نیست', 'error');
      var parts = [];
      for (var i = 0; i < recipes.length; i++) {
        var data = await buildRecipeData(recipes[i].product_name);
        if (data.lines.length) parts.push(sheetHtml(data, { showCost: showCost !== false }));
      }
      if (!parts.length) return toast('رسپی معتبری نیست', 'error');
      openPrint(parts.join(''), 'همه رسپی‌ها');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  /** نسخه بدون قیمت (فقط برای آشپزخانه) */
  Pages.printRecipeKitchen = function (productName) {
    return Pages.printRecipe(productName, false);
  };

  // دکمه‌ها روی صفحه محصولات
  var _products = Pages.products;
  Pages.products = async function () {
    var html = await _products();
    html =
      '<div class="mb-3 flex flex-wrap gap-2">' +
      '<button type="button" class="btn-secondary text-sm" onclick="Pages.printAllRecipes(true)">🖨 چاپ همه رسپی‌ها</button>' +
      '<button type="button" class="btn-ghost text-sm" onclick="Pages.printAllRecipes(false)">چاپ آشپزخانه (بدون قیمت)</button>' +
      '</div>' +
      html;
    // add per-row print if editRecipe buttons exist — inject via string replace on رسپی button
    html = html.replace(
      /onclick="Pages\.editRecipe\('([^']+)'\)">رسپی<\/button>/g,
      function (_, name) {
        return (
          'onclick="Pages.editRecipe(\'' +
          name +
          '\')">رسپی</button>' +
          '<button class="btn-ghost text-xs" onclick="Pages.printRecipe(\'' +
          name +
          '\')">چاپ</button>' +
          '<button class="btn-ghost text-xs" onclick="Pages.printRecipeKitchen(\'' +
          name +
          '\')">آشپزخانه</button>'
        );
      }
    );
    return html;
  };

  console.log('[recipe-print] printRecipe ready');
})();
