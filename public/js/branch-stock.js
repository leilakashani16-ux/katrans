/**
 * ارسال شعبه (گاردنیا) + انبارگردانی
 */
(function () {
  const BRANCH_DEFAULT = 'گاردنیا';
  const TYPE_LABELS = { material: 'ماده اولیه', product: 'محصول', general: 'اقلام عمومی' };

  Pages.showWhatsAppModal = function (title, text, opts) {
    opts = opts || {};
    showModal(
      '<div class="modal max-w-lg" onclick="event.stopPropagation()">' +
        '<h3 class="text-lg font-bold mb-2">📱 ' + title + '</h3>' +
        (opts.subtitle ? '<p class="text-xs text-slate-400 mb-2">' + opts.subtitle + '</p>' : '<p class="text-xs text-slate-400 mb-2">کپی کن و تو گروه واتساپ بذار</p>') +
        '<textarea id="wa-share-text" class="input-field font-mono text-xs h-64" readonly></textarea>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="button" class="btn-primary flex-1" id="btn-wa-copy">📋 کپی متن</button>' +
        '<button type="button" class="btn-secondary" id="btn-wa-share">اشتراک</button>' +
        '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
    var ta = document.getElementById('wa-share-text');
    if (ta) ta.value = text || '';
    document.getElementById('btn-wa-copy').onclick = async function () {
      try {
        await navigator.clipboard.writeText(text);
        toast('کپی شد — برو تو واتساپ پیست کن', 'success');
      } catch (err) {
        if (ta) { ta.focus(); ta.select(); }
        toast('متن را نگه دار و کپی کن', 'info');
      }
    };
    document.getElementById('btn-wa-share').onclick = async function () {
      if (navigator.share) {
        try { await navigator.share({ text: text }); } catch (e) {
          if (e && e.name !== 'AbortError') toast('اشتراک ناموفق', 'error');
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          toast('کپی شد — واتساپ را باز کن', 'success');
        } catch (_) { if (ta) { ta.focus(); ta.select(); } }
      }
    };
  };


  Pages.transfers = async function () {
    const canEdit = Auth.isAdmin() || (Auth.canEntry && Auth.canEntry());
    let transfers = [];
    let items = [];
    try {
      transfers = (await DB.getAll('branch_transfers')) || [];
    } catch (e) {
      transfers = [];
    }
    try {
      items = (await DB.getAll('branch_transfer_items')) || [];
    } catch (e) {
      items = [];
    }
    transfers = transfers
      .filter(function (t) {
        return !t.deleted_at;
      })
      .sort(function (a, b) {
        return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0);
      });

    const countItems = function (tid) {
      return items.filter(function (i) {
        return Number(i.transfer_id) === Number(tid);
      }).length;
    };
    const sumQty = function (tid) {
      return items
        .filter(function (i) {
          return Number(i.transfer_id) === Number(tid);
        })
        .reduce(function (s, i) {
          return s + Number(i.quantity || 0);
        }, 0);
    };

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-4">' +
      '<div><h1 class="text-2xl font-bold">🚚 ارسال شعبه</h1>' +
      '<p class="text-slate-400 text-sm">ارسال ماده / محصول / اقلام عمومی به گاردنیا و شعب</p></div>' +
      '<div class="flex gap-2">' +
      (canEdit
        ? '<button class="btn-primary" onclick="Pages.showTransferForm()">+ ثبت ارسال</button>'
        : '') +
      '<button class="btn-secondary text-sm" onclick="Pages.transferWhatsApp()">📱 واتساپ امروز</button>' +
      '<button class="btn-secondary text-sm" onclick="Pages.transferReportForm()">📑 گزارش</button>' +
      '</div></div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-300 border border-amber-500/20 flex gap-3 items-center">' +
      '<img src="logo-gardenia.png" alt="Gardenia" class="w-10 h-10 rounded-full object-cover border border-amber-600/40" />' +
      '<div>ارسال به <b>گاردنیا</b> از موجودی ماده کم می‌کند. محصولات و اقلام عمومی فقط ثبت گزارشی می‌شوند (موجودی ماده را تغییر نمی‌دهند).</div></div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>تاریخ</th><th>شعبه</th><th>تعداد قلم</th><th>توضیح</th><th></th></tr></thead><tbody>' +
      (transfers.length
        ? transfers
            .map(function (t) {
              return (
                '<tr><td>' +
                (t.date || '') +
                '</td><td class="font-medium">' +
                (t.branch_name || BRANCH_DEFAULT) +
                '</td><td>' +
                countItems(t.id) +
                ' قلم</td><td class="text-xs text-slate-400">' +
                (t.notes || '—') +
                '</td><td class="whitespace-nowrap">' +
                '<button class="btn-ghost text-xs" onclick="Pages.viewTransfer(' +
                t.id +
                ')">جزئیات</button> ' +
                '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.transferWhatsApp(\'' +
                String(t.date || '').replace(/'/g, '') +
                '\')">📱</button> ' +
                (canEdit
                  ? '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteTransfer(' +
                    t.id +
                    ')">حذف</button>'
                  : '') +
                '</td></tr>'
              );
            })
            .join('')
        : '<tr><td colspan="5" class="text-center text-slate-500 py-8">هنوز ارسالی ثبت نشده</td></tr>') +
      '</tbody></table></div></div>'
    );
  };


  Pages.showTransferForm = async function () {
    if (!(Auth.isAdmin() || (Auth.canEntry && Auth.canEntry()))) return toast('دسترسی ندارید', 'error');
    const [materials, products, generals, transfers] = await Promise.all([
      DB.getAll('materials').catch(function () { return []; }),
      DB.getAll('products').catch(function () { return []; }),
      DB.getAll('general_items').catch(function () { return []; }),
      DB.getAll('branch_transfers').catch(function () { return []; })
    ]);

    function activeList(arr) {
      return (arr || []).filter(function (m) { return m.active !== false && m.active !== 0 && !m.deleted_at; });
    }
    var mats = activeList(materials);
    var prods = activeList(products);
    var gens = activeList(generals);

    window.__tfMeta = {
      material: {},
      product: {},
      general: {}
    };
    mats.forEach(function (m) { window.__tfMeta.material[m.name] = m.unit || 'کیلوگرم'; });
    prods.forEach(function (m) { window.__tfMeta.product[m.name] = 'عدد'; });
    gens.forEach(function (m) { window.__tfMeta.general[m.name] = m.unit || 'عدد'; });

    var matOpts = mats.map(function (m) {
      return '<option value="' + m.name + '" data-unit="' + (m.unit || 'کیلوگرم') + '">' + m.name + '</option>';
    }).join('');
    var prodOpts = prods.map(function (m) {
      return '<option value="' + m.name + '" data-unit="عدد">' + m.name + '</option>';
    }).join('');
    var genOpts = gens.map(function (m) {
      return '<option value="' + m.name + '" data-unit="' + (m.unit || 'عدد') + '">' + m.name + '</option>';
    }).join('');

    var quickGens = gens.slice(0, 8).map(function (g) {
      return '<button type="button" class="text-xs px-2 py-1 rounded-full border border-amber-600/40 text-amber-200/90 bg-amber-500/10" onclick="Pages.quickAddGeneral(\'' +
        String(g.name).replace(/'/g, '') + '\',\'' + String(g.unit || 'عدد').replace(/'/g, '') + '\')">' + g.name + '</button>';
    }).join('');

    var lastT = ((transfers || []).filter(function (t) { return !t.deleted_at; })
      .sort(function (a, b) { return (b.id || 0) - (a.id || 0); })[0]) || null;

    showModal(
      '<div class="modal" style="max-width:640px" onclick="event.stopPropagation()">' +
        '<div class="flex items-center gap-3 mb-3">' +
        '<img src="logo-gardenia.png" alt="" class="w-11 h-11 rounded-full object-cover border border-amber-600/50" />' +
        '<div><h3 class="text-lg font-bold leading-tight">ثبت ارسال به شعبه</h3>' +
        '<p class="text-[11px] text-slate-400">گاردنیا · ماده / محصول / اقلام عمومی</p></div></div>' +
        '<form id="transfer-form" class="space-y-3" onsubmit="return false;">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label><input name="date" class="input-field" value="' + todayJalali() + '" required autocomplete="off" /></div>' +
        '<div><label class="text-xs text-slate-400">شعبه</label><input name="branch_name" class="input-field" value="' + BRANCH_DEFAULT + '" required autocomplete="off" /></div></div>' +
        '<div><label class="text-xs text-slate-400">توضیح (راننده / فاکتور)</label><input name="notes" class="input-field" placeholder="اختیاری" autocomplete="off" /></div>' +
        (quickGens
          ? '<div><div class="text-[10px] text-slate-500 mb-1">افزودن سریع اقلام عمومی</div><div class="flex flex-wrap gap-1.5">' + quickGens + '</div></div>'
          : '') +
        '<div class="border border-slate-600/40 rounded-xl p-3 space-y-2 bg-slate-900/20">' +
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-sm font-medium">لیست اقلام <span id="tf-count" class="text-xs text-slate-500">(0)</span></span>' +
        '<div class="flex gap-1">' +
        (lastT ? '<button type="button" class="btn-ghost text-[11px]" onclick="Pages.copyLastTransfer(' + lastT.id + ')">کپی آخرین ارسال</button>' : '') +
        '<button type="button" class="btn-secondary text-xs" onclick="Pages.addTransferRow(); Pages.refreshTfSummary();">+ ردیف</button></div></div>' +
        '<div id="tf-rows" class="tf-rows-scroll space-y-2"></div>' +
        '<div id="tf-summary" class="text-[11px] text-slate-400 border-t border-slate-600/30 pt-2 mt-1">هنوز قلمی نیست</div></div>' +
        '<div class="modal-sticky-actions space-y-2">' +
        '<label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">' +
        '<input type="checkbox" id="tf-open-wa" class="rounded" checked /> بعد از ذخیره، خروجی واتساپ باز شود</label>' +
        '<div class="flex gap-2">' +
        '<button type="submit" class="btn-primary flex-1">💾 ذخیره ارسال</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></div></form></div>'
    );

    window.__tfOpts = { mat: matOpts, prod: prodOpts, gen: genOpts };
    Pages.addTransferRow();
    Pages.refreshTfSummary();

    document.getElementById('transfer-form').onsubmit = async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.__formBusy = true;
      var btn = ev.target.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
      try {
        var fd = Object.fromEntries(new FormData(ev.target).entries());
        var rows = Pages.collectTransferRows();
        if (!rows.length) {
          toast('حداقل یک قلم با مقدار وارد کنید', 'error');
          window.__formBusy = false;
          if (btn) { btn.disabled = false; btn.textContent = '💾 ذخیره ارسال'; }
          return;
        }
        var header = {
          date: fd.date,
          branch_name: fd.branch_name || BRANCH_DEFAULT,
          notes: fd.notes || '',
          created_by: (Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) || '',
          created_at: new Date().toISOString()
        };
        var tid = await DB.add('branch_transfers', header);
        for (var i = 0; i < rows.length; i++) {
          await DB.add('branch_transfer_items', {
            transfer_id: tid,
            item_type: rows[i].item_type,
            item_name: rows[i].item_name,
            quantity: rows[i].quantity,
            unit: rows[i].unit || '',
            created_at: new Date().toISOString()
          });
        }
        var openWa = document.getElementById('tf-open-wa') && document.getElementById('tf-open-wa').checked;
        toast('ارسال ثبت شد (' + rows.length + ' قلم)', 'success');
        closeModal();
        window.__formBusy = false;
        if (openWa) {
          await Pages.transferWhatsApp(header.date);
        } else {
          navigate('transfers');
        }
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ذخیره', 'error');
        window.__formBusy = false;
        if (btn) { btn.disabled = false; btn.textContent = '💾 ذخیره ارسال'; }
      }
    };
  };

  Pages.collectTransferRows = function () {
    var rows = [];
    document.querySelectorAll('#tf-rows .tf-row').forEach(function (row) {
      var type = row.querySelector('[data-f="type"]').value;
      var name = (row.querySelector('[data-f="name"]').value || '').trim();
      var customEl = row.querySelector('[data-f="name_custom"]');
      if (type === 'general' && customEl && customEl.value.trim()) name = customEl.value.trim();
      var qty = Number(row.querySelector('[data-f="qty"]').value);
      var unit = (row.querySelector('[data-f="unit"]').value || '').trim();
      if (name && qty > 0) rows.push({ item_type: type, item_name: name, quantity: qty, unit: unit });
    });
    return rows;
  };

  Pages.refreshTfSummary = function () {
    var rows = Pages.collectTransferRows();
    var el = document.getElementById('tf-summary');
    var cnt = document.getElementById('tf-count');
    if (cnt) cnt.textContent = '(' + rows.length + ')';
    if (!el) return;
    if (!rows.length) {
      el.textContent = 'هنوز قلمی با مقدار معتبر نیست';
      return;
    }
    el.innerHTML = rows.map(function (r, i) {
      return (i + 1) + ') ' + r.item_name + ' <b class="text-slate-200">' + r.quantity + '</b> ' + (r.unit || '');
    }).join(' · ');
  };

  Pages.quickAddGeneral = function (name, unit) {
    Pages.addTransferRow('general', name, unit);
    var box = document.getElementById('tf-rows');
    if (box) {
      var last = box.querySelector('.tf-row:last-child');
      if (last) {
        var qty = last.querySelector('[data-f="qty"]');
        if (qty) { qty.focus(); qty.select && qty.select(); }
      }
    }
    Pages.refreshTfSummary();
  };

  Pages.copyLastTransfer = async function (tid) {
    try {
      var items = ((await DB.getAll('branch_transfer_items').catch(function () { return []; })) || []).filter(function (i) {
        return Number(i.transfer_id) === Number(tid);
      });
      if (!items.length) return toast('آخرین ارسال قلمی ندارد', 'info');
      var box = document.getElementById('tf-rows');
      if (box) box.innerHTML = '';
      items.forEach(function (i) {
        Pages.addTransferRow(i.item_type, i.item_name, i.unit, i.quantity);
      });
      Pages.refreshTfSummary();
      toast('اقلام آخرین ارسال بارگذاری شد — مقدارها را بررسی کن', 'success');
    } catch (e) {
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.addTransferRow = function (presetType, presetName, presetUnit, presetQty) {
    var box = document.getElementById('tf-rows');
    if (!box) return;
    var opts = window.__tfOpts || { mat: '', prod: '', gen: '' };
    var type = presetType || 'material';
    var div = document.createElement('div');
    div.className = 'tf-row border border-slate-600/30 rounded-xl p-2.5 space-y-2 bg-slate-950/30';
    var nameOpts = type === 'product' ? opts.prod : type === 'general' ? opts.gen : opts.mat;
    div.innerHTML =
      '<div class="flex items-center justify-between gap-2">' +
      '<select data-f="type" class="input-field text-sm flex-1">' +
      '<option value="material"' + (type === 'material' ? ' selected' : '') + '>ماده اولیه</option>' +
      '<option value="product"' + (type === 'product' ? ' selected' : '') + '>محصول</option>' +
      '<option value="general"' + (type === 'general' ? ' selected' : '') + '>اقلام عمومی</option></select>' +
      '<button type="button" class="btn-ghost text-xs text-red-400 px-2" title="حذف ردیف">✕</button></div>' +
      '<div><label class="text-[10px] text-slate-500">نام</label>' +
      '<select data-f="name" class="input-field text-sm">' + nameOpts + '</select>' +
      '<input data-f="name_custom" class="input-field text-sm mt-1' + (type === 'general' ? '' : ' hidden') + '" placeholder="نام دستی (اگر در لیست نیست)" autocomplete="off" /></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-[10px] text-slate-500">مقدار</label><input data-f="qty" type="number" step="0.01" min="0" inputmode="decimal" class="input-field text-sm" value="' + (presetQty != null ? presetQty : '') + '" /></div>' +
      '<div><label class="text-[10px] text-slate-500">واحد</label><input data-f="unit" class="input-field text-sm" placeholder="کیلو / عدد" autocomplete="off" value="' + (presetUnit || '') + '" /></div></div>';

    box.appendChild(div);
    var typeSel = div.querySelector('[data-f="type"]');
    var nameSel = div.querySelector('[data-f="name"]');
    var unitInp = div.querySelector('[data-f="unit"]');
    var qtyInp = div.querySelector('[data-f="qty"]');
    var delBtn = div.querySelector('button.btn-ghost');

    function applyUnit() {
      var t = typeSel.value;
      var n = nameSel.value;
      var meta = (window.__tfMeta && window.__tfMeta[t]) || {};
      if (meta[n]) unitInp.value = meta[n];
      else {
        var opt = nameSel.options[nameSel.selectedIndex];
        if (opt && opt.getAttribute('data-unit')) unitInp.value = opt.getAttribute('data-unit');
      }
      Pages.refreshTfSummary();
    }

    typeSel.onchange = function () {
      Pages.onTfTypeChange(typeSel);
      applyUnit();
    };
    nameSel.onchange = applyUnit;
    qtyInp.oninput = function () { Pages.refreshTfSummary(); };
    unitInp.oninput = function () { Pages.refreshTfSummary(); };
    delBtn.onclick = function () {
      div.remove();
      Pages.refreshTfSummary();
    };

    if (presetName) {
      nameSel.value = presetName;
      if (nameSel.value !== presetName && type === 'general') {
        var custom = div.querySelector('[data-f="name_custom"]');
        if (custom) { custom.classList.remove('hidden'); custom.value = presetName; }
      }
    }
    if (!presetUnit) applyUnit();
    box.scrollTop = box.scrollHeight;
  };

  Pages.onTfTypeChange = function (sel) {
    var row = sel.closest('.tf-row');
    var nameSel = row.querySelector('[data-f="name"]');
    var custom = row.querySelector('[data-f="name_custom"]');
    var opts = window.__tfOpts || { mat: '', prod: '', gen: '' };
    if (sel.value === 'material') {
      nameSel.innerHTML = opts.mat;
      nameSel.classList.remove('hidden');
      custom.classList.add('hidden');
      custom.value = '';
    } else if (sel.value === 'product') {
      nameSel.innerHTML = opts.prod;
      nameSel.classList.remove('hidden');
      custom.classList.add('hidden');
      custom.value = '';
    } else {
      nameSel.innerHTML = opts.gen + '<option value="">— سایر (دستی) —</option>';
      nameSel.classList.remove('hidden');
      custom.classList.remove('hidden');
    }
  };

  Pages.viewTransfer = async function (id) {
    const t = await DB.getById('branch_transfers', id);
    if (!t) return toast('یافت نشد', 'error');
    const items = ((await DB.getAll('branch_transfer_items').catch(function () {
      return [];
    })) || []).filter(function (i) {
      return Number(i.transfer_id) === Number(id);
    });
    showModal(
      '<div class="modal" style="max-width:560px"><h3 class="text-lg font-bold mb-2">جزئیات ارسال #' +
        id +
        '</h3>' +
        '<p class="text-sm text-slate-400 mb-3">' +
        (t.date || '') +
        ' · ' +
        (t.branch_name || '') +
        (t.notes ? ' · ' + t.notes : '') +
        '</p>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>نوع</th><th>نام</th><th>مقدار</th><th>واحد</th></tr></thead><tbody>' +
        items
          .map(function (i) {
            return (
              '<tr><td class="text-xs">' +
              (TYPE_LABELS[i.item_type] || i.item_type) +
              '</td><td>' +
              i.item_name +
              '</td><td class="font-bold">' +
              fmtNum(i.quantity) +
              '</td><td>' +
              (i.unit || '—') +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-4">' +
        '<button class="btn-primary flex-1" onclick="closeModal(); Pages.transferWhatsApp(\'' +
        String(t.date || '').replace(/'/g, '') +
        '\')">📱 واتساپ این روز</button>' +
        '<button class="btn-secondary" onclick="closeModal()">بستن</button></div></div>'
    );
  };

  Pages.deleteTransfer = async function (id) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('این ارسال حذف شود؟ (موجودی ماده برمی‌گردد)')) return;
    try {
      const t = await DB.getById('branch_transfers', id);
      if (t) {
        t.deleted_at = new Date().toISOString();
        await DB.put('branch_transfers', t);
      }
      toast('حذف شد', 'success');
      navigate('transfers');
    } catch (e) {
      toast(e.message || 'خطا', 'error');
    }
  };



  Pages.transferWhatsApp = async function (day) {
    day = day || todayJalali();
    try {
      var transfers = ((await DB.getAll('branch_transfers').catch(function () { return []; })) || []).filter(function (t) {
        return !t.deleted_at && t.date === day;
      });
      var allItems = (await DB.getAll('branch_transfer_items').catch(function () { return []; })) || [];
      var ids = {};
      transfers.forEach(function (t) { ids[t.id] = t; });
      var lines = allItems.filter(function (i) { return ids[i.transfer_id]; });

      var company = 'غذای انصار';
      try {
        var local = localStorage.getItem('kitchen_settings');
        if (local) company = JSON.parse(local).company_name || company;
      } catch (_) {}

      var textLines = [
        '🚚 گزارش ارسال شعبه — ' + company,
        '📅 تاریخ: ' + day,
        '══════════════════'
      ];

      if (!transfers.length) {
        textLines.push('برای این تاریخ ارسالی ثبت نشده.');
      } else {
        var byBranch = {};
        transfers.forEach(function (t) {
          var b = t.branch_name || 'گاردنیا';
          if (!byBranch[b]) byBranch[b] = [];
          byBranch[b].push(t);
        });
        Object.keys(byBranch).forEach(function (branch) {
          textLines.push('');
          textLines.push('🌿 شعبه: ' + branch);
          textLines.push('─────────────');
          byBranch[branch].forEach(function (t, idx) {
            var items = lines.filter(function (i) { return Number(i.transfer_id) === Number(t.id); });
            if (transfers.length > 1) textLines.push('ارسال ' + (idx + 1) + (t.notes ? ' (' + t.notes + ')' : '') + ':');
            else if (t.notes) textLines.push('توضیح: ' + t.notes);
            if (!items.length) textLines.push('  (بدون قلم)');
            else {
              items.forEach(function (i, n) {
                var typeL = TYPE_LABELS[i.item_type] || i.item_type;
                textLines.push(
                  (n + 1) + ') ' + i.item_name +
                  ' — ' + (Number(i.quantity) || 0) +
                  (i.unit ? ' ' + i.unit : '') +
                  ' [' + typeL + ']'
                );
              });
            }
          });
        });
        var sum = {};
        lines.forEach(function (i) {
          var k = i.item_name + '|' + (i.unit || '');
          if (!sum[k]) sum[k] = { name: i.item_name, unit: i.unit || '', qty: 0 };
          sum[k].qty += Number(i.quantity || 0);
        });
        var sumRows = Object.keys(sum).map(function (k) { return sum[k]; });
        if (sumRows.length) {
          textLines.push('');
          textLines.push('📊 جمع اقلام روز:');
          textLines.push('─────────────');
          sumRows.sort(function (a, b) { return a.name.localeCompare(b.name, 'fa'); });
          sumRows.forEach(function (r) {
            textLines.push('• ' + r.name + ': ' + r.qty + (r.unit ? ' ' + r.unit : ''));
          });
        }
        textLines.push('');
        textLines.push('تعداد برگه ارسال: ' + transfers.length + ' | ردیف: ' + lines.length);
      }
      textLines.push('══════════════════');
      textLines.push('سیستم گردش مواد — ' + company);

      var text = textLines.join('\n');
      showModal(
        '<div class="modal max-w-lg" onclick="event.stopPropagation()"><h3 class="text-lg font-bold mb-2">📱 گزارش واتساپ — ارسال شعبه</h3>' +
        '<p class="text-xs text-slate-400 mb-2">تاریخ را عوض کن و بارگذاری بزن</p>' +
        '<div class="flex gap-2 mb-2">' +
        '<input id="wa-day" class="input-field text-sm flex-1" value="' + day + '" />' +
        '<button type="button" class="btn-secondary text-sm" id="wa-day-load">بارگذاری</button></div>' +
        '<textarea id="wa-share-text" class="input-field font-mono text-xs h-64" readonly></textarea>' +
        '<div class="modal-sticky-actions flex gap-2">' +
        '<button type="button" class="btn-primary flex-1" id="btn-wa-copy">📋 کپی متن</button>' +
        '<button type="button" class="btn-secondary" id="btn-wa-share">اشتراک</button>' +
        '<button type="button" class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
      );
      var ta = document.getElementById('wa-share-text');
      if (ta) ta.value = text;
      document.getElementById('wa-day-load').onclick = function () {
        Pages.transferWhatsApp(document.getElementById('wa-day').value);
      };
      document.getElementById('btn-wa-copy').onclick = async function () {
        try {
          await navigator.clipboard.writeText(ta.value);
          toast('کپی شد — برو تو واتساپ پیست کن', 'success');
        } catch (err) {
          if (ta) { ta.focus(); ta.select(); }
          toast('متن را نگه دار و کپی کن', 'info');
        }
      };
      document.getElementById('btn-wa-share').onclick = async function () {
        var t = ta ? ta.value : text;
        if (navigator.share) {
          try { await navigator.share({ text: t }); } catch (e) {
            if (e && e.name !== 'AbortError') toast('اشتراک ناموفق', 'error');
          }
        } else {
          try {
            await navigator.clipboard.writeText(t);
            toast('کپی شد', 'success');
          } catch (_) { if (ta) { ta.focus(); ta.select(); } }
        }
      };
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.stocktakeWhatsApp = async function (id) {
    try {
      var st = await DB.getById('stocktakes', id);
      if (!st) return toast('یافت نشد', 'error');
      var lines = ((await DB.getAll('stocktake_lines').catch(function () { return []; })) || []).filter(function (l) {
        return Number(l.stocktake_id) === Number(id);
      });
      lines.sort(function (a, b) { return Math.abs(b.variance) - Math.abs(a.variance); });
      var company = 'غذای انصار';
      try {
        var local = localStorage.getItem('kitchen_settings');
        if (local) company = JSON.parse(local).company_name || company;
      } catch (_) {}
      var totalSys = 0, totalCnt = 0, absVar = 0, shortN = 0, surN = 0, okN = 0;
      lines.forEach(function (l) {
        totalSys += Number(l.system_qty || 0);
        totalCnt += Number(l.counted_qty || 0);
        var v = Number(l.variance || 0);
        absVar += Math.abs(v);
        if (v < 0) shortN++; else if (v > 0) surN++; else okN++;
      });
      var totalVar = Math.round((totalCnt - totalSys) * 100) / 100;
      var accuracy = totalSys !== 0 ? Math.round((1 - absVar / Math.max(Math.abs(totalSys), 0.01)) * 1000) / 10 : 100;
      var textLines = [
        '📋 گزارش انبارگردانی — ' + company,
        '📅 تاریخ: ' + (st.date || ''),
        st.notes ? ('یادداشت: ' + st.notes) : null,
        'ثبت‌کننده: ' + (st.created_by || '—'),
        '══════════════════',
        'جمع سیستم: ' + totalSys,
        'جمع واقعی: ' + totalCnt,
        'اختلاف خالص: ' + (totalVar > 0 ? '+' : '') + totalVar,
        'دقت تقریبی: ' + accuracy + '٪',
        'کسری: ' + shortN + ' | اضافه: ' + surN + ' | مطابق: ' + okN,
        '─────────────'
      ].filter(Boolean);
      lines.forEach(function (l) {
        var v = Number(l.variance || 0);
        var tag = v < 0 ? '❌ کسری' : v > 0 ? '⚠️ اضافه' : '✅';
        textLines.push(
          tag + ' ' + l.material_name +
          '\n   سیستم: ' + l.system_qty + ' | واقعی: ' + l.counted_qty +
          ' | اختلاف: ' + (v > 0 ? '+' : '') + v +
          (l.notes ? (' | ' + l.notes) : '')
        );
      });
      textLines.push('══════════════════');
      textLines.push('سیستم گردش مواد — ' + company);
      Pages.showWhatsAppModal('انبارگردانی — واتساپ', textLines.join('\n'), {
        subtitle: 'تاریخ ' + (st.date || '') + ' — برای مدیر'
      });
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.transferReportForm = function () {
    const d = todayJalali();
    showModal(
      '<div class="modal"><h3 class="text-lg font-bold mb-3">گزارش ارسال شعبه</h3>' +
        '<form id="tr-rep" class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">از</label><input name="from" class="input-field" value="' +
        d +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">تا</label><input name="to" class="input-field" value="' +
        d +
        '" /></div></div>' +
        '<button type="submit" class="btn-primary w-full">نمایش</button></form></div>'
    );
    document.getElementById('tr-rep').onsubmit = async function (ev) {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(ev.target).entries());
      closeModal();
      await Pages.transferReport(fd.from, fd.to);
    };
  };

  Pages.transferReport = async function (from, to) {
    const transfers = ((await DB.getAll('branch_transfers').catch(function () {
      return [];
    })) || []).filter(function (t) {
      if (t.deleted_at) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      return true;
    });
    const items = (await DB.getAll('branch_transfer_items').catch(function () {
      return [];
    })) || [];
    const tidSet = new Set(transfers.map(function (t) {
      return t.id;
    }));
    const lines = items.filter(function (i) {
      return tidSet.has(i.transfer_id);
    });
    const byName = {};
    lines.forEach(function (i) {
      const k = (i.item_type || '') + '|' + i.item_name;
      if (!byName[k]) byName[k] = { type: i.item_type, name: i.item_name, qty: 0, unit: i.unit || '' };
      byName[k].qty += Number(i.quantity || 0);
    });
    const rows = Object.values(byName).sort(function (a, b) {
      return a.name.localeCompare(b.name, 'fa');
    });
    const excelData = lines.map(function (i) {
      const t = transfers.find(function (x) {
        return x.id === i.transfer_id;
      }) || {};
      return {
        تاریخ: t.date,
        شعبه: t.branch_name,
        نوع: TYPE_LABELS[i.item_type] || i.item_type,
        نام: i.item_name,
        مقدار: i.quantity,
        واحد: i.unit || '',
        توضیح: t.notes || ''
      };
    });
    showModal(
      '<div class="modal" style="max-width:640px"><h3 class="text-lg font-bold mb-2">گزارش ارسال</h3>' +
        '<p class="text-sm text-slate-400 mb-3">' +
        from +
        ' تا ' +
        to +
        ' · ' +
        transfers.length +
        ' ارسال · ' +
        lines.length +
        ' ردیف</p>' +
        '<div class="table-wrap max-h-72 overflow-y-auto"><table class="data">' +
        '<thead><tr><th>نوع</th><th>نام</th><th>جمع مقدار</th><th>واحد</th></tr></thead><tbody>' +
        (rows.length
          ? rows
              .map(function (r) {
                return (
                  '<tr><td class="text-xs">' +
                  (TYPE_LABELS[r.type] || r.type) +
                  '</td><td>' +
                  r.name +
                  '</td><td class="font-bold">' +
                  fmtNum(r.qty) +
                  '</td><td>' +
                  (r.unit || '—') +
                  '</td></tr>'
                );
              })
              .join('')
          : '<tr><td colspan="4" class="text-center text-slate-500 py-6">داده‌ای نیست</td></tr>') +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-3">' +
        '<button class="btn-secondary flex-1" onclick=\'Pages._exportTransferExcel(' +
        JSON.stringify(excelData).replace(/'/g, '&#39;') +
        ")'>📥 اکسل</button>" +
        '<button class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
  };

  Pages._exportTransferExcel = function (data) {
    if (!data || !data.length) return toast('خالی', 'error');
    exportToExcel(data, 'branch-transfers');
    toast('خروجی اکسل آماده شد', 'success');
  };

  /* ========== انبارگردانی ========== */
  Pages.stocktake = async function () {
    if (!Auth.isAdmin() && !(Auth.canEntry && Auth.canEntry())) {
      return '<p class="text-red-400">دسترسی محدود</p>';
    }
    let list = [];
    try {
      list = ((await DB.getAll('stocktakes')) || []).filter(function (s) {
        return !s.deleted_at;
      });
    } catch (e) {
      list = [];
    }
    list.sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0);
    });

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-4">' +
      '<div><h1 class="text-2xl font-bold">📋 انبارگردانی</h1>' +
      '<p class="text-slate-400 text-sm">مقایسه موجودی واقعی با سیستم — گزارش اختلاف برای مدیر</p></div>' +
      (Auth.isAdmin()
        ? '<button class="btn-primary" onclick="Pages.showStocktakeForm()">+ انبارگردانی جدید</button>'
        : '') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
      'سیستم موجودی را از روی ورود − تولید − ضایعات − ارسال شعبه حساب می‌کند. شما عدد واقعی انبار را وارد می‌کنید؛ اختلاف (واریانس) و درصد برای گزارش مدیر محاسبه می‌شود.' +
      '</div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>تاریخ</th><th>توضیح</th><th>ثبت‌کننده</th><th></th></tr></thead><tbody>' +
      (list.length
        ? list
            .map(function (s) {
              return (
                '<tr><td>' +
                s.date +
                '</td><td class="text-xs">' +
                (s.notes || '—') +
                '</td><td class="text-xs text-slate-400">' +
                (s.created_by || '—') +
                '</td><td>' +
                '<button class="btn-ghost text-xs" onclick="Pages.viewStocktake(' +
                s.id +
                ')">گزارش</button> ' +
                '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.stocktakeWhatsApp(' +
                s.id +
                ')">📱</button></td></tr>'
              );
            })
            .join('')
        : '<tr><td colspan="4" class="text-center text-slate-500 py-8">هنوز انبارگردانی ثبت نشده</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  Pages.showStocktakeForm = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    let stock = [];
    try {
      stock = await DB.calcStock();
    } catch (e) {
      toast('خطا در موجودی سیستم', 'error');
      return;
    }
    stock = (stock || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });

    const rowsHtml = stock
      .map(function (m) {
        const sys = Number(m.current_stock || 0);
        return (
          '<tr data-name="' +
          String(m.name).replace(/"/g, '&quot;') +
          '" data-sys="' +
          sys +
          '">' +
          '<td class="font-medium">' +
          m.name +
          '</td>' +
          '<td class="text-slate-400">' +
          (m.unit || '') +
          '</td>' +
          '<td class="font-bold text-brand-300">' +
          fmtNum(sys) +
          '</td>' +
          '<td><input type="number" step="0.01" class="input-field text-sm st-count" style="max-width:100px" placeholder="واقعی" /></td>' +
          '<td><input class="input-field text-sm st-note" style="max-width:120px" placeholder="—" /></td></tr>'
        );
      })
      .join('');

    showModal(
      '<div class="modal" style="max-width:720px"><h3 class="text-lg font-bold mb-3">انبارگردانی جدید</h3>' +
        '<div class="grid grid-cols-2 gap-2 mb-3">' +
        '<div><label class="text-xs text-slate-400">تاریخ</label><input id="st-date" class="input-field" value="' +
        todayJalali() +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">توضیح</label><input id="st-notes" class="input-field" placeholder="مثلاً انبارگردانی پایان ماه" /></div></div>' +
        '<p class="text-xs text-slate-500 mb-2">فقط ردیف‌هایی که عدد واقعی پر شده ذخیره می‌شوند. خالی = رد شدن آن ماده.</p>' +
        '<div class="table-wrap max-h-80 overflow-y-auto"><table class="data">' +
        '<thead><tr><th>ماده</th><th>واحد</th><th>سیستم</th><th>شمارش واقعی</th><th>یادداشت</th></tr></thead><tbody id="st-body">' +
        rowsHtml +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-3"><button class="btn-primary flex-1" onclick="Pages.saveStocktake()">ذخیره و گزارش</button>' +
        '<button class="btn-secondary" onclick="closeModal()">انصراف</button></div></div>'
    );
  };

  Pages.saveStocktake = async function () {
    if (!Auth.isAdmin()) return;
    const date = (document.getElementById('st-date') && document.getElementById('st-date').value) || todayJalali();
    const notes = (document.getElementById('st-notes') && document.getElementById('st-notes').value) || '';
    const trs = document.querySelectorAll('#st-body tr');
    const lines = [];
    trs.forEach(function (tr) {
      const inp = tr.querySelector('.st-count');
      if (!inp || inp.value === '' || inp.value == null) return;
      const counted = Number(inp.value);
      const sys = Number(tr.getAttribute('data-sys') || 0);
      const name = tr.getAttribute('data-name');
      const note = (tr.querySelector('.st-note') && tr.querySelector('.st-note').value) || '';
      lines.push({
        material_name: name,
        system_qty: sys,
        counted_qty: counted,
        variance: Math.round((counted - sys) * 100) / 100,
        notes: note
      });
    });
    if (!lines.length) return toast('حداقل یک ماده را شمارش کنید', 'error');
    try {
      const sid = await DB.add('stocktakes', {
        date: date,
        notes: notes,
        created_by: (Auth.currentUser && (Auth.currentUser.full_name || Auth.currentUser.username)) || '',
        created_at: new Date().toISOString()
      });
      for (let i = 0; i < lines.length; i++) {
        await DB.add('stocktake_lines', Object.assign({ stocktake_id: sid }, lines[i]));
      }
      toast('انبارگردانی ذخیره شد', 'success');
      closeModal();
      await Pages.viewStocktake(sid);
      navigate('stocktake');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا', 'error');
    }
  };

  Pages.viewStocktake = async function (id) {
    const st = await DB.getById('stocktakes', id);
    if (!st) return toast('یافت نشد', 'error');
    const lines = ((await DB.getAll('stocktake_lines').catch(function () {
      return [];
    })) || []).filter(function (l) {
      return Number(l.stocktake_id) === Number(id);
    });
    lines.sort(function (a, b) {
      return Math.abs(b.variance) - Math.abs(a.variance);
    });

    const totalSys = lines.reduce(function (s, l) {
      return s + Number(l.system_qty || 0);
    }, 0);
    const totalCnt = lines.reduce(function (s, l) {
      return s + Number(l.counted_qty || 0);
    }, 0);
    const totalVar = Math.round((totalCnt - totalSys) * 100) / 100;
    const absVar = lines.reduce(function (s, l) {
      return s + Math.abs(Number(l.variance || 0));
    }, 0);
    const shortage = lines.filter(function (l) {
      return Number(l.variance) < 0;
    });
    const surplus = lines.filter(function (l) {
      return Number(l.variance) > 0;
    });
    const match = lines.filter(function (l) {
      return Number(l.variance) === 0;
    });
    const accuracy =
      totalSys !== 0 ? Math.round((1 - absVar / Math.max(Math.abs(totalSys), 0.01)) * 1000) / 10 : 100;

    const reportHtml =
      '<div class="modal" style="max-width:720px">' +
      '<h3 class="text-lg font-bold mb-1">گزارش انبارگردانی برای مدیر</h3>' +
      '<p class="text-sm text-slate-400 mb-3">' +
      (st.date || '') +
      (st.notes ? ' · ' + st.notes : '') +
      ' · ' +
      (st.created_by || '') +
      '</p>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center text-sm">' +
      '<div class="stat-card"><div class="text-xs text-slate-400">جمع سیستم</div><b>' +
      fmtNum(totalSys) +
      '</b></div>' +
      '<div class="stat-card"><div class="text-xs text-slate-400">جمع واقعی</div><b>' +
      fmtNum(totalCnt) +
      '</b></div>' +
      '<div class="stat-card"><div class="text-xs text-slate-400">اختلاف خالص</div><b class="' +
      (totalVar < 0 ? 'text-red-300' : totalVar > 0 ? 'text-amber-300' : 'text-brand-300') +
      '">' +
      (totalVar > 0 ? '+' : '') +
      fmtNum(totalVar) +
      '</b></div>' +
      '<div class="stat-card"><div class="text-xs text-slate-400">دقت تقریبی</div><b>' +
      accuracy +
      '٪</b></div></div>' +
      '<div class="grid grid-cols-3 gap-2 mb-4 text-center text-xs">' +
      '<div class="glass-card p-2 rounded-xl">کسری: <b class="text-red-300">' +
      shortage.length +
      '</b> قلم</div>' +
      '<div class="glass-card p-2 rounded-xl">اضافه: <b class="text-amber-300">' +
      surplus.length +
      '</b> قلم</div>' +
      '<div class="glass-card p-2 rounded-xl">مطابق: <b class="text-brand-300">' +
      match.length +
      '</b> قلم</div></div>' +
      '<div class="table-wrap max-h-72 overflow-y-auto"><table class="data">' +
      '<thead><tr><th>ماده</th><th>سیستم</th><th>واقعی</th><th>اختلاف</th><th>٪ اختلاف</th><th>یادداشت</th></tr></thead><tbody>' +
      lines
        .map(function (l) {
          const v = Number(l.variance || 0);
          const pct =
            Number(l.system_qty) !== 0
              ? Math.round((v / Math.abs(Number(l.system_qty))) * 1000) / 10
              : v === 0
                ? 0
                : 100;
          const cls = v < 0 ? 'text-red-300' : v > 0 ? 'text-amber-300' : 'text-brand-300';
          return (
            '<tr><td>' +
            l.material_name +
            '</td><td>' +
            fmtNum(l.system_qty) +
            '</td><td>' +
            fmtNum(l.counted_qty) +
            '</td><td class="font-bold ' +
            cls +
            '">' +
            (v > 0 ? '+' : '') +
            fmtNum(v) +
            '</td><td class="' +
            cls +
            '">' +
            (pct > 0 ? '+' : '') +
            pct +
            '٪</td><td class="text-xs">' +
            (l.notes || '—') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>' +
      '<p class="text-[10px] text-slate-500 mt-2">اختلاف منفی = کسری نسبت به سیستم (ممکن است ضایعات ثبت‌نشده، ارسال بدون ثبت، یا خطای ورود باشد). اختلاف مثبت = موجودی واقعی بیشتر از سیستم.</p>' +
      '<div class="flex gap-2 mt-3">' +
      '<button class="btn-primary flex-1" onclick="Pages.stocktakeWhatsApp(' + id + ')">📱 واتساپ</button>' +
      '<button class="btn-secondary flex-1" onclick="Pages.exportStocktakeExcel(' +
      id +
      ')">📥 اکسل</button>' +
      '<button class="btn-ghost" onclick="closeModal()">بستن</button></div></div>';

    showModal(reportHtml);
  };

  Pages.manageGeneralItems = async function () {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    let list = [];
    try { list = (await DB.getAll('general_items')) || []; } catch (e) { list = []; }
    list = list.filter(function (g) { return !g.deleted_at && g.active !== 0 && g.active !== false; });
    var rows = list.map(function (g) {
      var safe = String(g.name || '').replace(/'/g, '');
      return '<tr><td class="text-xs">' + (g.code || '') + '</td><td>' + g.name + '</td><td>' + (g.unit || '') +
        '</td><td class="whitespace-nowrap">' +
        '<button type="button" class="btn-ghost text-xs" onclick="Pages.editGeneralItem(' + g.id + ')">ویرایش</button> ' +
        '<button type="button" class="btn-ghost text-xs text-red-400" onclick="Pages.deleteGeneralItem(' + g.id + ')">حذف</button>' +
        '</td></tr>';
    }).join('');
    showModal(
      '<div class="modal" style="max-width:520px" onclick="event.stopPropagation()"><h3 class="text-lg font-bold mb-3">اقلام عمومی</h3>' +
      '<div class="table-wrap max-h-56 overflow-y-auto mb-3"><table class="data"><thead><tr><th>کد</th><th>نام</th><th>واحد</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" class="text-center text-slate-500">خالی</td></tr>') +
      '</tbody></table></div>' +
      '<form id="gi-form" class="space-y-2 border-t border-slate-600/40 pt-3">' +
      '<div class="text-xs text-slate-400 mb-1">افزودن قلم جدید</div>' +
      '<div class="grid grid-cols-3 gap-2">' +
      '<input name="code" class="input-field text-sm" placeholder="کد" autocomplete="off" />' +
      '<input name="name" class="input-field text-sm" placeholder="نام" required autocomplete="off" />' +
      '<input name="unit" class="input-field text-sm" placeholder="واحد" value="عدد" autocomplete="off" /></div>' +
      '<div class="modal-sticky-actions flex gap-2">' +
      '<button type="submit" class="btn-primary flex-1 text-sm">+ افزودن</button>' +
      '<button type="button" class="btn-secondary text-sm" onclick="closeModal()">بستن</button></div></form></div>'
    );
    document.getElementById('gi-form').onsubmit = async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      try {
        await DB.add('general_items', data);
        toast('اضافه شد', 'success');
        closeModal();
        Pages.manageGeneralItems();
      } catch (e) { toast(e.message || 'خطا', 'error'); }
    };
  };

  Pages.editGeneralItem = async function (id) {
    if (!Auth.isAdmin()) return;
    var g = await DB.getById('general_items', id);
    if (!g) return toast('یافت نشد', 'error');
    showModal(
      '<div class="modal" onclick="event.stopPropagation()"><h3 class="text-lg font-bold mb-3">ویرایش اقلام عمومی</h3>' +
      '<form id="gi-edit" class="space-y-3">' +
      '<div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="' + (g.code || '') + '" /></div>' +
      '<div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="' + (g.name || '') + '" required /></div>' +
      '<div><label class="text-xs text-slate-400">واحد</label><input name="unit" class="input-field" value="' + (g.unit || '') + '" /></div>' +
      '<div class="modal-sticky-actions flex gap-2">' +
      '<button type="submit" class="btn-primary flex-1">ذخیره</button>' +
      '<button type="button" class="btn-secondary" onclick="Pages.manageGeneralItems()">بازگشت</button></div></form></div>'
    );
    document.getElementById('gi-edit').onsubmit = async function (ev) {
      ev.preventDefault();
      var data = Object.fromEntries(new FormData(ev.target).entries());
      try {
        Object.assign(g, data);
        g.active = 1;
        await DB.put('general_items', g);
        toast('ذخیره شد', 'success');
        Pages.manageGeneralItems();
      } catch (e) { toast(e.message || 'خطا', 'error'); }
    };
  };

  Pages.deleteGeneralItem = async function (id) {
    if (!Auth.isAdmin()) return;
    if (!confirmAction('این قلم حذف شود؟')) return;
    try {
      await DB.remove('general_items', id);
      toast('حذف شد', 'success');
      Pages.manageGeneralItems();
    } catch (e) { toast(e.message || 'خطا', 'error'); }
  };

  Pages.exportStocktakeExcel = async function (id) {
    const st = await DB.getById('stocktakes', id);
    const lines = ((await DB.getAll('stocktake_lines').catch(function () {
      return [];
    })) || []).filter(function (l) {
      return Number(l.stocktake_id) === Number(id);
    });
    const data = lines.map(function (l) {
      const v = Number(l.variance || 0);
      const pct =
        Number(l.system_qty) !== 0 ? Math.round((v / Math.abs(Number(l.system_qty))) * 1000) / 10 : 0;
      return {
        تاریخ: st && st.date,
        ماده: l.material_name,
        'موجودی سیستم': l.system_qty,
        'شمارش واقعی': l.counted_qty,
        اختلاف: v,
        'درصد اختلاف': pct,
        وضعیت: v < 0 ? 'کسری' : v > 0 ? 'اضافه' : 'مطابق',
        یادداشت: l.notes || ''
      };
    });
    exportToExcel(data, 'stocktake-' + ((st && st.date) || id));
    toast('خروجی اکسل آماده شد', 'success');
  };
})();
