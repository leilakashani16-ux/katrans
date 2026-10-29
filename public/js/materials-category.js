/**
 * materials-category.js — دسته‌بندی مواد + فیلتر
 * food | packaging | cleaning | beverage | admin | other
 */
(function () {
  var CATS = [
    { id: 'food', label: 'مواد غذایی' },
    { id: 'packaging', label: 'بسته‌بندی / ظرف' },
    { id: 'cleaning', label: 'نظافت' },
    { id: 'beverage', label: 'نوشیدنی' },
    { id: 'admin', label: 'اداری / عمومی' },
    { id: 'other', label: 'سایر' }
  ];
  var LABEL = {};
  CATS.forEach(function (c) { LABEL[c.id] = c.label; });

  function guessCategory(name, code) {
    var n = String(name || '');
    var c = String(code || '');
    if (/ظرف|پاکت|پک قاشق|جعبه|سینی|نایلون|هات دلیوری|آلومینیوم|قابلمه|دیس/.test(n)) return 'packaging';
    if (/اسکاج|الکل|اسپری|باتری|پارچه تنظیف|شوینده|دستکش/.test(n)) return 'cleaning';
    if (/نوشابه|آب معدنی|دوغ|دلستر|ماءالشعیر/.test(n)) return 'beverage';
    if (/رول پرینتر|هزینه|ست یکبار/.test(n)) return 'admin';
    return 'food';
  }

  function catBadge(cat) {
    var id = cat || 'food';
    var label = LABEL[id] || id;
    var colors = {
      food: 'bg-emerald-500/20 text-emerald-300',
      packaging: 'bg-amber-500/20 text-amber-300',
      cleaning: 'bg-sky-500/20 text-sky-300',
      beverage: 'bg-pink-500/20 text-pink-300',
      admin: 'bg-slate-500/20 text-slate-300',
      other: 'bg-violet-500/20 text-violet-300'
    };
    return '<span class="text-[10px] px-1.5 py-0.5 rounded ' + (colors[id] || colors.other) + '">' + label + '</span>';
  }

  // inject category into material form
  var _show = Pages.showMaterialForm;
  if (typeof _show === 'function') {
    Pages.showMaterialForm = async function (id) {
      var r = await _show.apply(this, arguments);
      setTimeout(function () {
        var form = document.querySelector('#material-form, form');
        if (!form || form.querySelector('[name="category"]')) return;
        var wrap = document.createElement('div');
        wrap.className = 'mb-2';
        var opts = CATS.map(function (c) {
          return '<option value="' + c.id + '">' + c.label + '</option>';
        }).join('');
        wrap.innerHTML =
          '<label class="text-xs text-slate-400">دسته‌بندی</label>' +
          '<select name="category" class="input-field">' + opts + '</select>';
        var anchor = form.querySelector('[name="unit"], [name="min_alert"], [name="description"]');
        if (anchor && anchor.parentElement) {
          anchor.parentElement.parentElement.insertBefore(wrap, anchor.parentElement);
        } else {
          form.insertBefore(wrap, form.firstChild);
        }
        if (id) {
          DB.getById('materials', id).then(function (m) {
            if (!m) return;
            var sel = form.querySelector('[name="category"]');
            if (sel) sel.value = m.category || guessCategory(m.name, m.code);
          }).catch(function () {});
        }
      }, 120);
      return r;
    };
  }

  // filter + category column on materials page (wrap after materials-price)
  function installList() {
    if (typeof Pages === 'undefined' || typeof Pages.materials !== 'function') return;
    if (Pages.materials.__catPatched) return;
    var prev = Pages.materials;
    Pages.materials = async function () {
      var html = await prev.apply(this, arguments);
      // add filter bar
      var filter =
        '<div class="mb-3 flex flex-wrap gap-2 items-center" id="cat-filter-bar">' +
        '<span class="text-xs text-slate-400">دسته:</span>' +
        '<button type="button" class="btn-ghost text-xs cat-f active" data-cat="all">همه</button>' +
        CATS.map(function (c) {
          return '<button type="button" class="btn-ghost text-xs cat-f" data-cat="' + c.id + '">' + c.label + '</button>';
        }).join('') +
        '</div>';
      if (html.indexOf('cat-filter-bar') < 0) {
        html = filter + html;
      }
      // after render, attach filter + inject badges
      setTimeout(function () {
        var materials = null;
        DB.getAll('materials').then(function (list) {
          materials = list || [];
          var byCode = {};
          materials.forEach(function (m) { byCode[String(m.code)] = m; });
          document.querySelectorAll('table.data tbody tr').forEach(function (tr) {
            var codeCell = tr.querySelector('td');
            if (!codeCell) return;
            var code = codeCell.textContent.trim();
            var m = byCode[code];
            var cat = (m && m.category) || guessCategory(m && m.name, code);
            tr.setAttribute('data-cat', cat);
            if (!tr.querySelector('.cat-badge')) {
              var nameTd = tr.children[1];
              if (nameTd) {
                var span = document.createElement('div');
                span.className = 'cat-badge mt-0.5';
                span.innerHTML = catBadge(cat);
                nameTd.appendChild(span);
              }
            }
          });
        }).catch(function () {});

        document.querySelectorAll('.cat-f').forEach(function (btn) {
          btn.onclick = function () {
            document.querySelectorAll('.cat-f').forEach(function (b) { b.classList.remove('ring-1', 'ring-brand-400'); });
            btn.classList.add('ring-1', 'ring-brand-400');
            var cat = btn.getAttribute('data-cat');
            document.querySelectorAll('table.data tbody tr').forEach(function (tr) {
              var tc = tr.getAttribute('data-cat') || 'food';
              tr.style.display = (cat === 'all' || tc === cat) ? '' : 'none';
            });
          };
        });
      }, 80);
      return html;
    };
    Pages.materials.__catPatched = true;
  }
  installList();
  setTimeout(installList, 500);
  setTimeout(installList, 2000);

  // when saving material, include category from form - hook form submit if possible
  console.log('[materials-category] ready');
})();
