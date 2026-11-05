/**
 * بهای تمام‌شده فروشگاهی (آنالیز منو گاردنیا)
 * واحد پول: ریال — مقدار رسپی × آخرین قیمت خرید
 * جدا از تولید انبوه / محصولات نیمه‌آماده
 */
(function () {
  'use strict';

  var GARDENIA_DISHES = [
    { code: 'G001', name: 'چلو جوجه کباب زعفرانی', note: 'چلو ۴۰۰گ + جوجه ۲۰۰گ + گوجه/فلفل کبابی + آبلیمو' },
    { code: 'G002', name: 'چلو کباب کوبیده', note: 'چلو ۴۰۰گ + کوبیده ۱۵۰گ + گوجه/فلفل + سماق' },
    { code: 'G003', name: 'چلو خورش قورمه سبزی', note: 'چلو ۴۰۰گ + قورمه ۳۰۰گ (گوشت ۵۰گ)' },
    { code: 'G004', name: 'چلو خورش قیمه سیب زمینی', note: 'چلو ۴۰۰گ + قیمه ۳۰۰گ + سیب‌زمینی خلالی' },
    { code: 'G005', name: 'زرشک پلو با مرغ', note: 'چلو ۴۰۰گ + ران مرغ سس‌پز ۳۵۰گ + سیب‌زمینی' },
    { code: 'G006', name: 'چلو خورش فسنجان با مرغ', note: 'چلو ۴۰۰گ + فسنجان ۳۰۰گ (سینه ۱۰۰گ)' },
    { code: 'G007', name: 'سبزی پلو با ماهی', note: 'سبزی‌پلو ۴۰۰گ + قزل‌آلا ۱۵۰گ + آبلیمو' },
    { code: 'G008', name: 'سبزی پلو با تن ماهی', note: 'سبزی‌پلو ۴۰۰گ + تن ۱۲۰گ + آبلیمو' },
    { code: 'G009', name: 'ماکارونی با گوشت و قارچ', note: 'ماکارونی ۴۸۰گ + گوشت/مرغ ۱۰۰گ + کچاپ' },
    { code: 'G010', name: 'ته چین مرغ ویژه', note: 'ته‌چین مرغ' },
    { code: 'G011', name: 'چلو جوجه کباب ترش', note: 'چلو + جوجه طعم‌دار رب انار ۲۰۰گ' },
    { code: 'G012', name: 'عدس پلو با گوشت', note: 'عدس‌پلو ۴۸۰گ + گوشت ۱۰۰گ + کشمش/پیازداغ' },
    { code: 'G013', name: 'لوبیا پلو با گوشت چرخ کرده', note: 'لوبیاپلو ۴۸۰گ + گوشت ۱۰۰گ' },
    { code: 'G014', name: 'استانبولی پلو با سینه مرغ', note: 'استانبولی ۴۸۰گ + سینه ۱۰۰گ' },
    { code: 'G015', name: 'چلو کباب نگین دار', note: 'چلو + کباب نگینی' },
    { code: 'G016', name: 'چلو جوجه کباب حلزونی', note: 'چلو + فیله مرغ زعفرانی ۲۰۰گ' },
    { code: 'G017', name: 'خوراک ران مرغ سس پز', note: 'ران ۳۵۰گ + مخلفات + نان لواش ۲' },
    { code: 'G018', name: 'خوراک کشک بادمجان', note: 'کشک‌بادمجان ۳۵۰گ + نان ۲' },
    { code: 'G019', name: 'خوراک میرزا قاسمی', note: 'میرزا قاسمی ۴۰۰گ + نان لواش ۲' },
    { code: 'G020', name: 'خوراک سوسیس بندری', note: 'بندری ۳۵۰گ + مخلفات + باگت' },
    { code: 'G021', name: 'خوراک ماهی فیله سرخ شده', note: 'قزل‌آلا ۱۵۰گ + مخلفات + نان' },
    { code: 'G022', name: 'خوراک جوجه کباب زعفرانی', note: 'جوجه ۲۰۰گ + مخلفات + نان' },
    { code: 'G023', name: 'خوراک کوبیده', note: 'کوبیده + مخلفات + نان' },
    { code: 'G024', name: 'خوراک چیکن استراگانوف', note: 'استراگانوف + نان' },
    { code: 'G025', name: 'خوراک کوفته مرغ', note: 'کوفته مرغ + نان' },
    { code: 'G026', name: 'ساندویچ هاتداگ', note: 'باگت + هات‌داگ + سس' },
    { code: 'G027', name: 'خوراک ماهی کبابی رژیمی', note: 'ماهی کبابی رژیمی' },
    { code: 'G028', name: 'خوراک ناگت مرغ', note: 'ناگت + مخلفات + نان' },
    { code: 'G029', name: 'خوراک سالاد الویه', note: 'الویه + باگت' },
    { code: 'G030', name: 'ساندویچ ژامبون مرغ و قارچ', note: 'ساندویچ ژامبون' },
    { code: 'G031', name: 'سالاد سزار', note: 'سالاد سزار' },
    { code: 'G032', name: 'سالاد ماکارونی بدون چربی', note: 'سالاد ماکارونی' },
    { code: 'G033', name: 'سالاد پاستا با قارچ', note: 'سالاد پاستا' },
    { code: 'G034', name: 'سالاد کینووا مکزیکی', note: 'کینووا' },
    { code: 'G035', name: 'سالاد فصل تکنفره', note: 'سالاد فصل' },
    { code: 'G036', name: 'سوپ تکنفره', note: 'سوپ' },
    { code: 'G037', name: 'حمص تکنفره', note: 'حمص' },
    { code: 'G038', name: 'بورانی اسفناج تکنفره', note: 'بورانی' },
    { code: 'G039', name: 'ماست و خیار تکنفره', note: 'ماست‌خیار' },
    { code: 'G040', name: 'ترشی مخلوط تکنفره', note: 'ترشی' },
    { code: 'G041', name: 'زیتون پرورده خانگی', note: 'زیتون پرورده ~۲۰۰گ' },
    { code: 'G042', name: 'زیتون ساده ویژه خانگی', note: '~۳۰ عدد زیتون سبز' },
    { code: 'G043', name: 'ماست موسیر شرکتی', note: 'ماست موسیر' }
  ];

  var RIAL = 'ریال';

  function fmt(n) {
    if (n == null || isNaN(n)) return '—';
    return Math.round(Number(n)).toLocaleString('fa-IR');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function ensureDishProducts() {
    var products = (await DB.getAll('products').catch(function () { return []; })) || [];
    var byCode = {};
    var byName = {};
    products.forEach(function (p) {
      if (p.code) byCode[p.code] = p;
      if (p.name) byName[p.name] = p;
    });
    var added = 0;
    for (var i = 0; i < GARDENIA_DISHES.length; i++) {
      var d = GARDENIA_DISHES[i];
      if (byCode[d.code] || byName[d.name]) continue;
      try {
        await Api.add('products', {
          code: d.code,
          name: d.name,
          weight_per_unit: 1,
          description: 'منو فروشگاهی گاردنیا | ' + (d.note || '') + ' | واحد بها: ریال',
          remainder_type: 'حمل به روز بعد',
          active: 1
        });
        added++;
        await new Promise(function (r) { setTimeout(r, 70); });
      } catch (e) {
        console.warn('dish seed', d.code, e);
      }
    }
    return added;
  }

  async function loadCostRows() {
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var priceByName = {};
    var unitByName = {};
    materials.forEach(function (m) {
      if (!m.name) return;
      priceByName[m.name] = Number(m.last_buy_price) || 0;
      unitByName[m.name] = m.unit || '';
    });

    var products = (await DB.getAll('products').catch(function () { return []; })) || [];
    var items = (await DB.getAll('recipe_items').catch(function () { return []; })) || [];

    var itemsByProduct = {};
    items.forEach(function (it) {
      var k = it.product_name;
      if (!itemsByProduct[k]) itemsByProduct[k] = [];
      itemsByProduct[k].push(it);
    });

    var gardeniaCodes = {};
    GARDENIA_DISHES.forEach(function (d) { gardeniaCodes[d.code] = d; });

    var menuProducts = products.filter(function (p) {
      if (p.deleted_at) return false;
      if (p.active === 0) return false;
      if (p.code && /^G\d+/i.test(p.code)) return true;
      if (GARDENIA_DISHES.some(function (d) { return d.name === p.name || d.code === p.code; })) return true;
      if (p.description && String(p.description).indexOf('منو فروشگاهی') >= 0) return true;
      return false;
    });

    if (!menuProducts.length) {
      menuProducts = GARDENIA_DISHES.map(function (d) {
        return { code: d.code, name: d.name, description: d.note, active: 1 };
      });
    }

    return menuProducts.map(function (p) {
      var lines = (itemsByProduct[p.name] || []).slice().sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
      var detail = lines.map(function (ln) {
        var price = priceByName[ln.material_name] || 0;
        var qty = Number(ln.qty) || 0;
        return {
          material_name: ln.material_name,
          qty: qty,
          unit: unitByName[ln.material_name] || '',
          unit_price: price,
          line_cost: qty * price,
          missing: !price
        };
      });
      var total = detail.reduce(function (s, x) { return s + x.line_cost; }, 0);
      var missing = detail.filter(function (x) { return x.missing; }).length;
      var meta = gardeniaCodes[p.code] || GARDENIA_DISHES.find(function (d) { return d.name === p.name; });
      return {
        code: p.code,
        name: p.name,
        note: (meta && meta.note) || p.description || '',
        hasRecipe: detail.length > 0,
        total: total,
        missing: missing,
        lines: detail
      };
    }).sort(function (a, b) {
      return String(a.code || '').localeCompare(String(b.code || ''), 'en');
    });
  }

  Pages.dishCost = async function () {
    var rows = await loadCostRows();
    var withPrice = rows.filter(function (r) { return r.hasRecipe && r.total > 0; }).length;
    var noRecipe = rows.filter(function (r) { return !r.hasRecipe; }).length;

    var cards = rows.map(function (r, idx) {
      var status = !r.hasRecipe
        ? '<span class="text-xs" style="color:#f59e0b">بدون آنالیز</span>'
        : (r.missing
          ? '<span class="text-xs" style="color:#f97316">ناقص قیمت (' + r.missing + ')</span>'
          : '<span class="text-xs" style="color:#34d399">کامل ✓</span>');
      var totalHtml = r.hasRecipe
        ? '<div style="font-size:1.15rem;font-weight:700;color:#a5b4fc">' + fmt(r.total) +
          ' <span style="font-size:0.75rem;font-weight:500">' + RIAL + '</span></div>'
        : '<div style="font-size:0.9rem;color:#94a3b8">—</div>';
      return (
        '<div class="card" style="padding:12px 14px;margin-bottom:10px;border:1px solid rgba(148,163,184,0.15)">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;cursor:pointer" onclick="Pages.dishCostToggle(' + idx + ')">' +
            '<div>' +
              '<div style="font-weight:600">' + esc(r.code) + ' — ' + esc(r.name) + '</div>' +
              '<div class="text-xs text-slate-400" style="margin-top:2px">' + esc(r.note || '') + '</div>' +
              '<div style="margin-top:4px">' + status + '</div>' +
            '</div>' +
            '<div style="text-align:left">' + totalHtml +
              '<div class="text-xs text-slate-500" style="margin-top:2px">' +
                (r.hasRecipe ? r.lines.length + ' قلم' : 'رسپی ندارد') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="dish-cost-detail-' + idx + '" style="display:none;margin-top:10px;border-top:1px solid rgba(148,163,184,0.12);padding-top:8px">' +
            (r.hasRecipe
              ? ('<table class="w-full text-sm"><thead><tr>' +
                  '<th class="text-right p-1">ماده</th>' +
                  '<th class="text-right p-1">مقدار</th>' +
                  '<th class="text-right p-1">قیمت واحد (' + RIAL + ')</th>' +
                  '<th class="text-right p-1">هزینه (' + RIAL + ')</th>' +
                '</tr></thead><tbody>' +
                r.lines.map(function (ln) {
                  return '<tr>' +
                    '<td class="p-1">' + esc(ln.material_name) + '</td>' +
                    '<td class="p-1">' + ln.qty + (ln.unit ? ' ' + esc(ln.unit) : '') + '</td>' +
                    '<td class="p-1">' + (ln.missing ? '<span style="color:#f97316">بدون قیمت</span>' : fmt(ln.unit_price)) + '</td>' +
                    '<td class="p-1">' + (ln.missing ? '—' : fmt(ln.line_cost)) + '</td>' +
                  '</tr>';
                }).join('') +
                '<tr style="font-weight:700;border-top:1px solid rgba(148,163,184,0.2)">' +
                  '<td class="p-1" colspan="3">جمع بهای تمام‌شده یک پرس</td>' +
                  '<td class="p-1">' + fmt(r.total) + ' ' + RIAL + '</td>' +
                '</tr></tbody></table>')
              : '<p class="text-sm text-slate-400">هنوز آنالیز برای این غذا تعریف نشده.</p>') +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="space-y-4" style="padding-bottom:88px">' +
        '<div class="flex flex-wrap items-center justify-between gap-2">' +
          '<div>' +
            '<h2 class="text-lg font-bold">بهای تمام‌شده فروشگاهی</h2>' +
            '<p class="text-sm text-slate-400">منوی گاردنیا — همه مبالغ به <b>' + RIAL + '</b> — جدا از تولید انبوه</p>' +
          '</div>' +
          '<div class="flex gap-2 flex-wrap">' +
            '<button type="button" class="btn-secondary text-sm" onclick="Pages.dishCostSeed()">ثبت لیست غذاها</button>' +
            '<button type="button" class="btn-ghost text-sm" onclick="navigate(\'dishCost\')">بروزرسانی</button>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-3 gap-2" style="max-width:480px">' +
          '<div class="card p-3 text-center"><div class="text-xs text-slate-400">غذاها</div><div class="text-lg font-bold">' + rows.length + '</div></div>' +
          '<div class="card p-3 text-center"><div class="text-xs text-slate-400">دارای قیمت</div><div class="text-lg font-bold" style="color:#34d399">' + withPrice + '</div></div>' +
          '<div class="card p-3 text-center"><div class="text-xs text-slate-400">بدون آنالیز</div><div class="text-lg font-bold" style="color:#f59e0b">' + noRecipe + '</div></div>' +
        '</div>' +
        '<div class="card p-3 text-sm text-slate-300" style="border-right:3px solid #6366f1">' +
          'واحد پول: <b>' + RIAL + '</b>. قیمت واحد = آخرین خرید انبار. ' +
          'همسان‌سازی: روغن←روغن مایع · برنج←برنج مخلوط ایرانی · مایونز←سس مایونز فله.' +
        '</div>' +
        '<div id="dish-cost-list">' + cards + '</div>' +
      '</div>'
    );
  };

  Pages.dishCostToggle = function (idx) {
    var el = document.getElementById('dish-cost-detail-' + idx);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  Pages.dishCostSeed = async function () {
    if (!confirm('لیست ۴۳ غذای منوی گاردنیا ثبت شود؟ (تکراری ساخته نمی‌شود)')) return;
    var n = await ensureDishProducts();
    alert(n ? (n + ' غذا ثبت شد.') : 'همه از قبل ثبت بودند.');
    navigate('dishCost');
  };

  function injectNav() {
    try {
      if (typeof NAV !== 'undefined' && NAV.admin) {
        var exists = NAV.admin.some(function (x) { return x.id === 'dishCost'; });
        if (!exists) {
          var productsIdx = NAV.admin.findIndex(function (x) { return x.id === 'products'; });
          var item = { id: 'dishCost', label: 'بهای فروشگاهی', icon: '💰' };
          if (productsIdx >= 0) NAV.admin.splice(productsIdx + 1, 0, item);
          else NAV.admin.push(item);
        }
      }
      if (typeof buildNav === 'function') buildNav();
    } catch (e) {
      console.warn('dishCost nav', e);
    }
  }

  injectNav();
  setTimeout(injectNav, 400);
  setTimeout(injectNav, 1200);

  window.DishCost = {
    GARDENIA_DISHES: GARDENIA_DISHES,
    ensureDishProducts: ensureDishProducts,
    loadCostRows: loadCostRows,
    CURRENCY: RIAL
  };
})();
