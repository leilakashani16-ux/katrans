/**
 * نیمه‌محصول + فرآوری چندمبدأ
 * مثال: قلوه گاه گوسفندی + قلوه گاه گوساله + سردست گوساله (+ خرده جوجه) → گوشت نخودی
 */
(function () {
  var SEMI_DEFAULTS = [
    { code: 'SM001', name: 'سینه مرینیت جوجه', unit: 'کیلوگرم', parent_material: 'سینه مرغ', material_type: 'semi', min_alert: 5, description: 'سینه مرغ مرینیت‌شده' },
    { code: 'SM002', name: 'سینه فسنجان', unit: 'کیلوگرم', parent_material: 'سینه مرغ', material_type: 'semi', min_alert: 3, description: '' },
    { code: 'SM003', name: 'سینه سالاد', unit: 'کیلوگرم', parent_material: 'سینه مرغ', material_type: 'semi', min_alert: 1.5, description: '' },
    { code: 'SM004', name: 'گوشت نخودی', unit: 'کیلوگرم', parent_material: '', material_type: 'semi', min_alert: 10, description: 'ترکیب چند ماده' },
    { code: 'SM005', name: 'مایه کباب', unit: 'کیلوگرم', parent_material: 'گوشت نخودی', material_type: 'semi', min_alert: 5, description: '' },
    { code: 'SM006', name: 'مایه لوبیا پلو', unit: 'کیلوگرم', parent_material: '', material_type: 'semi', min_alert: 3, description: '' },
    { code: 'SM007', name: 'برنج پخته', unit: 'کیلوگرم', parent_material: 'برنج ایرانی هاشمی', material_type: 'semi', min_alert: 10, description: '' }
  ];
  var RAW_BLEND_DEFAULTS = [
    { code: 'M101', name: 'قلوه گاه گوسفندی', unit: 'کیلوگرم', material_type: 'raw', min_alert: 5 },
    { code: 'M102', name: 'قلوه گاه گوساله', unit: 'کیلوگرم', material_type: 'raw', min_alert: 5 },
    { code: 'M103', name: 'سردست گوساله', unit: 'کیلوگرم', material_type: 'raw', min_alert: 5 },
    { code: 'M104', name: 'خرده جوجه', unit: 'کیلوگرم', material_type: 'raw', min_alert: 2 }
  ];
  var BLEND_PRESETS = {
    'گوشت نخودی': ['قلوه گاه گوسفندی', 'قلوه گاه گوساله', 'سردست گوساله', 'خرده جوجه']
  };

  function fmtPrice(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fa-IR');
  }
  function typeLabel(t) {
    if (t === 'semi') return '<span class="badge badge-ok">نیمه‌محصول</span>';
    return '<span class="badge" style="background:#1e3a5f">خام</span>';
  }
  function parseSources(p) {
    if (p && p.sources_json) {
      try {
        var lines = JSON.parse(p.sources_json);
        if (Array.isArray(lines) && lines.length) return lines;
      } catch (e) {}
    }
    if (p && p.source_material) return [{ material: p.source_material, qty: Number(p.source_qty) || 0 }];
    return [];
  }
  function sourcesLabel(p) {
    var lines = parseSources(p);
    if (!lines.length) return '—';
    return lines.map(function (l) {
      return (l.material || l.material_name || '') + ' ' + fmtNum(l.qty || l.quantity || 0);
    }).join(' + ');
  }

  Pages.ensureSemiMaterials = async function () {
    if (!Auth.isAdmin()) return;
    var materials = (await DB.getAll('materials').catch(function () { return []; })) || [];
    var names = {};
    materials.forEach(function (m) { names[m.name] = m; });
    var all = RAW_BLEND_DEFAULTS.concat(SEMI_DEFAULTS);
    for (var i = 0; i < all.length; i++) {
      var s = all[i];
      if (names[s.name]) {
        if (s.material_type === 'semi' && names[s.name].material_type !== 'semi') {
          try {
            await DB.put('materials', Object.assign({}, names[s.name], {
              material_type: 'semi', parent_material: s.parent_material || '',
              description: names[s.name].description || s.description || ''
            }));
          } catch (e) {}
        }
        continue;
      }
      try {
        await DB.add('materials', {
          code: s.code, name: s.name, unit: s.unit || 'کیلوگرم', initial_stock: 0,
          min_alert: s.min_alert || 0, description: s.description || '',
          material_type: s.material_type || 'raw', parent_material: s.parent_material || '', active: 1
        });
      } catch (e) { console.warn('seed', s.name, e); }
    }
    if (names['گوشت نخودی'] && names['گوشت نخودی'].material_type !== 'semi') {
      try {
        await DB.put('materials', Object.assign({}, names['گوشت نخودی'], {
          material_type: 'semi', parent_material: '', description: 'ترکیب چند ماده'
        }));
      } catch (e2) {}
    }
  };

  Pages.processings = async function () {
    try { await Pages.ensureSemiMaterials(); } catch (e) {}
    var list = (await DB.getAll('processings').catch(function () { return []; })) || [];
    var canEdit = Auth.isAdmin() || (Auth.canProduction && Auth.canProduction());
    var rows = list.slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0);
    }).slice(0, 100).map(function (p) {
      return '<tr><td class="text-slate-400 text-xs">' + (p.date || '') + '</td>' +
        '<td class="text-xs max-w-[240px]">' + sourcesLabel(p) + '</td>' +
        '<td class="text-brand-300">→ ' + (p.target_material || '') + '</td>' +
        '<td class="text-emerald-400">' + fmtNum(p.target_qty) + '</td>' +
        '<td class="text-amber-400">' + (p.waste_qty ? fmtNum(p.waste_qty) : '—') + '</td>' +
        '<td class="text-xs">' + (p.producer_name || '') + '</td>' +
        '<td>' + (Auth.isAdmin()
          ? '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteProcessing(' + p.id + ')">حذف</button>'
          : '') + '</td></tr>';
    }).join('');

    return '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div><h1 class="text-2xl font-bold">فرآوری چندمبدأ</h1>' +
      '<p class="text-slate-400 text-sm">چند ماده خام → یک نیمه‌محصول</p></div>' +
      (canEdit ? '<button class="btn-primary" onclick="Pages.showProcessingForm()">+ ثبت فرآوری</button>' : '') +
      '</div>' +
      '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
      'مثال: قلوه گاه گوسفندی + قلوه گاه گوساله + سردست گوساله (+ خرده جوجه) → <b>گوشت نخودی</b></div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>تاریخ</th><th>مواد مبدأ</th><th>نیمه‌محصول</th><th>خروجی</th><th>پرت</th><th>مسئول</th><th></th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="7" class="text-center text-slate-500 py-8">خالی</td></tr>') +
      '</tbody></table></div></div>';
  };

  Pages.showProcessingForm = async function () {
    if (!Auth.isAdmin() && !(Auth.canProduction && Auth.canProduction())) {
      return toast('دسترسی ندارید', 'error');
    }
    var materials = ((await DB.getAll('materials').catch(function () { return []; })) || []).filter(function (m) {
      return m.active !== false && m.active !== 0;
    });
    var raws = materials.filter(function (m) {
      return (m.material_type || 'raw') === 'raw' || !m.material_type;
    });
    var semis = materials.filter(function (m) { return m.material_type === 'semi'; });
    materials.forEach(function (m) {
      if (m.name === 'گوشت نخودی' && !semis.some(function (s) { return s.name === m.name; })) semis.push(m);
    });
    var personnel = ((await DB.getAll('personnel').catch(function () { return []; })) || []).filter(function (p) {
      return p.active !== false && p.active !== 0;
    });

    function rawOpts(selected) {
      return raws.map(function (m) {
        return '<option value="' + m.name + '"' + (selected === m.name ? ' selected' : '') + '>' + m.name + '</option>';
      }).join('');
    }
    function sourceRow(selectedMat) {
      return '<div class="src-row flex gap-2 mb-2 items-center">' +
        '<select class="input-field src-mat flex-1"><option value="">ماده مبدأ…</option>' + rawOpts(selectedMat || '') + '</select>' +
        '<input type="number" step="0.001" min="0" class="input-field src-qty" placeholder="مقدار" style="max-width:110px" />' +
        '<button type="button" class="btn-ghost text-red-400 src-rm">×</button></div>';
    }
    var semiOpts = semis.map(function (m) {
      return '<option value="' + m.name + '">' + m.name + '</option>';
    }).join('');
    var perOpts = personnel.map(function (p) {
      return '<option value="' + p.name + '">' + p.name + '</option>';
    }).join('');

    showModal(
      '<div class="modal" style="max-width:560px" onclick="event.stopPropagation()">' +
      '<h3 class="text-lg font-bold mb-1">🔄 فرآوری چندمبدأ</h3>' +
      '<p class="text-xs text-slate-400 mb-3">چند ماده مصرف → یک نیمه‌محصول</p>' +
      '<form id="proc-form-multi" class="space-y-3" onsubmit="return false;">' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-400">تاریخ</label>' +
      '<input name="date" class="input-field" value="' + (typeof todayJalali === 'function' ? todayJalali() : '') + '" required /></div>' +
      '<div><label class="text-xs text-slate-400">مسئول</label>' +
      '<select name="producer_name" class="input-field"><option value="">—</option>' + perOpts + '</select></div></div>' +
      '<div><label class="text-xs text-slate-400">نیمه‌محصول مقصد</label>' +
      '<select name="target_material" id="proc-target-multi" class="input-field" required>' +
      '<option value="">— انتخاب —</option>' + semiOpts + '</select>' +
      '<button type="button" id="proc-preset-nakhodi" class="btn-ghost text-xs mt-1 text-brand-300">قالب گوشت نخودی</button></div>' +
      '<div><label class="text-xs text-slate-400">مواد مبدأ</label><div id="proc-sources">' +
      sourceRow() + sourceRow() + '</div>' +
      '<button type="button" id="proc-add-src" class="btn-secondary text-xs mt-1">+ ماده مبدأ</button></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-400">خروجی نیمه‌محصول</label>' +
      '<input name="target_qty" id="proc-tgt-qty" type="number" step="0.001" min="0.001" class="input-field" required /></div>' +
      '<div><label class="text-xs text-slate-400">پرت</label>' +
      '<input name="waste_qty" id="proc-waste" type="number" step="0.001" min="0" class="input-field" value="0" /></div></div>' +
      '<p class="text-[10px] text-slate-500" id="proc-hint">جمع مبدأ − پرت ≈ خروجی</p>' +
      '<div><label class="text-xs text-slate-400">یادداشت</label><input name="notes" class="input-field" /></div>' +
      '<div class="modal-sticky-actions flex gap-2">' +
      '<button type="submit" class="btn-primary flex-1">💾 ثبت</button>' +
      '<button type="button" class="btn-secondary" onclick="closeModal()">بستن</button></div></form></div>'
    );

    var sourcesEl = document.getElementById('proc-sources');
    function sumSources() {
      var s = 0;
      sourcesEl.querySelectorAll('.src-row').forEach(function (row) {
        s += Number(row.querySelector('.src-qty').value) || 0;
      });
      return s;
    }
    function recalc() {
      var src = sumSources();
      var waste = Number(document.getElementById('proc-waste').value) || 0;
      var tgt = document.getElementById('proc-tgt-qty');
      if (src > 0 && (!tgt.value || tgt.dataset.auto === '1')) {
        tgt.value = Math.max(0, Math.round((src - waste) * 1000) / 1000);
        tgt.dataset.auto = '1';
      }
      var hint = document.getElementById('proc-hint');
      if (hint) {
        hint.textContent = 'جمع مبدأ: ' + (Math.round(src * 1000) / 1000) + ' | پرت: ' + waste +
          ' | خروجی: ' + Math.max(0, Math.round((src - waste) * 1000) / 1000);
      }
    }
    function bindSrc(row) {
      row.querySelector('.src-qty').oninput = recalc;
      row.querySelector('.src-rm').onclick = function () {
        if (sourcesEl.querySelectorAll('.src-row').length <= 1) return toast('حداقل یک مبدأ', 'error');
        row.remove();
        recalc();
      };
    }
    sourcesEl.querySelectorAll('.src-row').forEach(bindSrc);
    document.getElementById('proc-add-src').onclick = function () {
      sourcesEl.insertAdjacentHTML('beforeend', sourceRow());
      bindSrc(sourcesEl.lastElementChild);
    };
    document.getElementById('proc-waste').oninput = recalc;
    document.getElementById('proc-tgt-qty').oninput = function () { this.dataset.auto = '0'; };

    document.getElementById('proc-preset-nakhodi').onclick = function () {
      var sel = document.getElementById('proc-target-multi');
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === 'گوشت نخودی') { sel.value = 'گوشت نخودی'; break; }
      }
      var preset = BLEND_PRESETS['گوشت نخودی'] || [];
      sourcesEl.innerHTML = '';
      preset.forEach(function (name) {
        sourcesEl.insertAdjacentHTML('beforeend', sourceRow(name));
      });
      sourcesEl.querySelectorAll('.src-row').forEach(bindSrc);
      recalc();
    };

    document.getElementById('proc-form-multi').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = Object.fromEntries(new FormData(ev.target).entries());
      var target_material = fd.target_material;
      var target_qty = Number(fd.target_qty);
      var waste_qty = Number(fd.waste_qty) || 0;
      if (!target_material) return toast('مقصد را انتخاب کنید', 'error');
      if (!(target_qty > 0)) return toast('خروجی نامعتبر', 'error');
      var sources = [];
      sourcesEl.querySelectorAll('.src-row').forEach(function (row) {
        var material = row.querySelector('.src-mat').value;
        var qty = Number(row.querySelector('.src-qty').value);
        if (material && qty > 0) sources.push({ material: material, qty: qty });
      });
      if (!sources.length) return toast('حداقل یک مبدأ با مقدار', 'error');
      var sourceSum = sources.reduce(function (s, l) { return s + l.qty; }, 0);
      if (target_qty + waste_qty > sourceSum + 0.05) {
        if (!confirm('خروجی+پرت بیشتر از جمع مبدأ است. ادامه؟')) return;
      }
      var payload = {
        date: fd.date,
        source_material: sources[0].material,
        source_qty: sourceSum,
        sources_json: JSON.stringify(sources),
        target_material: target_material,
        target_qty: target_qty,
        waste_qty: waste_qty,
        waste_note: waste_qty > 0 ? 'پرت فرآوری' : '',
        producer_name: fd.producer_name || '',
        notes: fd.notes || ''
      };
      try {
        await DB.add('processings', payload);
        toast('فرآوری چندمبدأ ثبت شد', 'success');
        closeModal();
        navigate('processings');
      } catch (e) {
        toast(e.message || 'خطا', 'error');
      }
    };
  };

  Pages.deleteProcessing = async function (id) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    if (!confirmAction('حذف این فرآوری؟')) return;
    try {
      await DB.remove('processings', id);
      toast('حذف شد', 'success');
      navigate('processings');
    } catch (e) { toast(e.message || 'خطا', 'error'); }
  };

  function injectNav() {
    try {
      if (typeof NAV === 'undefined') return;
      var item = { id: 'processings', label: 'فرآوری', icon: '🔄' };
      ['admin', 'production', 'entry'].forEach(function (role) {
        if (!NAV[role]) return;
        if (NAV[role].some(function (x) { return x.id === 'processings'; })) return;
        var idx = NAV[role].findIndex(function (x) { return x.id === 'materials' || x.id === 'productions'; });
        if (idx >= 0) NAV[role].splice(idx + 1, 0, item);
        else NAV[role].push(item);
      });
      if (typeof buildNav === 'function' && Auth.currentUser) buildNav();
    } catch (e) {}
  }
  injectNav();
  setTimeout(injectNav, 800);
  console.log('[processing] multi-source blend ready');
})();
