/**
 * Page renderers – with filters, alerts, PDF, jalali, auto-return
 */
const Pages = {};

Pages.dashboard = async function () {
  const stock = await DB.calcStock();
  const entries = await DB.getAll('entries');
  const productions = await DB.getAll('productions');
  const wastes = await DB.getAll('wastes');

  const totalWeight = productions.reduce((s, p) => s + Number(p.material_weight || 0), 0);
  const totalQty = productions.reduce((s, p) => s + Number(p.quantity || 0), 0);

  const pStats = {};
  productions.forEach(p => {
    const n = p.producer_name || 'نامشخص';
    if (!pStats[n]) pStats[n] = { count: 0, qty: 0, weight: 0, duration: 0 };
    pStats[n].count++;
    pStats[n].qty += Number(p.quantity || 0);
    pStats[n].weight += Number(p.material_weight || 0);
    pStats[n].duration += Number(p.duration_minutes || 0);
  });

  const alerts = stock.filter(m => m.status !== 'عادی');
  const alertHtml = alerts.length ? `
    <div class="alert-banner mb-6 fade-in">
      <div class="font-semibold text-amber-300 mb-2">⚠️ هشدار موجودی</div>
      <ul class="text-sm space-y-1">
        ${alerts.map(m => `<li>• <strong>${m.name}</strong>: موجودی ${fmtNum(m.current_stock)} ${m.unit} — <span class="${m.status==='تمام شد'?'text-red-400':'text-amber-400'}">${m.status}</span></li>`).join('')}
      </ul>
    </div>` : '';

  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold">داشبورد مدیریتی</h1>
      <p class="text-slate-400 text-sm mt-1">خلاصه موجودی و عملکرد • ${todayJalali()}</p>
    </div>
    ${alertHtml}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="stat-card">
        <div class="text-slate-400 text-xs">رکوردهای تولید</div>
        <div class="text-2xl font-bold text-brand-400">${fmtNum(productions.length)}</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">وزن مواد مصرفی (کیلو)</div>
        <div class="text-2xl font-bold text-cyan-400">${fmtNum(totalWeight)}</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">تعداد محصولات</div>
        <div class="text-2xl font-bold text-violet-400">${fmtNum(totalQty)}</div>
      </div>
      <div class="stat-card">
        <div class="text-slate-400 text-xs">تعداد ورود مواد</div>
        <div class="text-2xl font-bold text-amber-400">${fmtNum(entries.length)}</div>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6 mb-8">
      <div class="glass-card rounded-2xl p-5">
        <h2 class="font-semibold mb-4">📦 خلاصه موجودی مواد اولیه</h2>
        <div class="table-wrap max-h-80 overflow-y-auto">
          <table class="data">
            <thead><tr>
              <th>کد</th><th>نام</th><th>واحد</th><th>اولیه</th><th>ورود</th><th>مصرف</th><th>ضایعات</th><th>برگشت</th><th>فعلی</th><th>وضعیت</th>
            </tr></thead>
            <tbody>
              ${stock.map(m => `
                <tr>
                  <td class="text-slate-400">${m.code}</td>
                  <td class="font-medium">${m.name}</td>
                  <td>${m.unit}</td>
                  <td>${fmtNum(m.initial_stock)}</td>
                  <td class="text-brand-300">${fmtNum(m.total_in)}</td>
                  <td class="text-red-300">${fmtNum(m.total_out)}</td>
                  <td class="text-amber-300">${fmtNum(m.total_waste)}</td>
                  <td class="text-cyan-300">${fmtNum(m.total_return)}</td>
                  <td class="font-bold">${fmtNum(m.current_stock)}</td>
                  <td>${statusBadge(m.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-5">
        <h2 class="font-semibold mb-4">👨‍🍳 عملکرد پرسنل</h2>
        <div class="table-wrap max-h-80 overflow-y-auto">
          <table class="data">
            <thead><tr><th>نام</th><th>رکورد</th><th>تعداد</th><th>وزن (کیلو)</th><th>مدت (دقیقه)</th></tr></thead>
            <tbody>
              ${Object.entries(pStats).sort((a,b)=>b[1].count-a[1].count).map(([name, s]) => `
                <tr>
                  <td class="font-medium">${name}</td>
                  <td>${s.count}</td>
                  <td>${fmtNum(s.qty)}</td>
                  <td>${fmtNum(s.weight)}</td>
                  <td>${fmtNum(s.duration)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="glass-card rounded-2xl p-5">
      <h2 class="font-semibold mb-3">آمار سریع ضایعات</h2>
      <p class="text-slate-400 text-sm">تعداد رکورد: <span class="text-white font-medium">${wastes.length}</span> • مجموع وزن: <span class="text-amber-300 font-medium">${fmtNum(wastes.reduce((s,w)=>s+Number(w.quantity||0),0))} کیلو</span></p>
    </div>
  `;
};

/* ========== ENTRIES ========== */
Pages.entries = async function () {
  let entries = (await DB.getAll('entries')).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canEntry();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '';
  const dt = params.get('dt') || '';
  const q = params.get('q') || '';
  if (df || dt || q) entries = filterByDateAndSearch(entries, df, dt, q, ['material_name','supplier','invoice_no','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">ورود مواد اولیه</h1>
        <p class="text-slate-400 text-sm">ثبت ورود روزانه به انبار</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showEntryForm()">+ ثبت ورود جدید</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportEntries()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfEntries()">خروجی PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو..." value="${q}" style="max-width:160px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('entries')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('entries')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>ماده اولیه</th><th>مقدار</th><th>تأمین‌کننده</th><th>شماره فاکتور</th><th>توضیحات</th>
            ${canEdit ? '<th>عملیات</th>' : ''}
          </tr></thead>
          <tbody>
            ${entries.length ? entries.map(e => `
              <tr>
                <td>${e.date || '—'}</td>
                <td class="font-medium">${e.material_name}</td>
                <td class="text-brand-300">${fmtNum(e.quantity)}</td>
                <td>${e.supplier || '—'}</td>
                <td class="text-slate-400">${e.invoice_no || '—'}</td>
                <td class="text-slate-400 text-xs max-w-[200px] truncate">${e.notes || ''}</td>
                ${canEdit ? `<td class="space-x-1 space-x-reverse">
                  <button class="btn-ghost text-xs" onclick="Pages.showEntryForm(${e.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteEntry(${e.id})">حذف</button>
                </td>` : ''}
              </tr>
            `).join('') : '<tr><td colspan="7" class="text-center text-slate-500 py-8">رکوردی یافت نشد</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.applyFilter = function (page) {
  const df = document.getElementById('f-df')?.value || '';
  const dt = document.getElementById('f-dt')?.value || '';
  const q = document.getElementById('f-q')?.value || '';
  const p = new URLSearchParams();
  if (df) p.set('df', df);
  if (dt) p.set('dt', dt);
  if (q) p.set('q', q);
  location.hash = page + (p.toString() ? '?' + p.toString() : '');
  navigate(page);
};

Pages.clearFilter = function (page) {
  location.hash = page;
  navigate(page);
};

Pages.showEntryForm = async function (id) {
  if (!Auth.canEntry() && !id) return;
  if (id && !Auth.canEditDelete()) return toast('فقط مدیر می‌تواند ویرایش کند', 'error');
  const materials = await DB.getAll('materials');
  let item = { date: todayJalali(), material_name: '', quantity: '', supplier: '', invoice_no: '', notes: '' };
  if (id) item = await DB.getById('entries', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش ورود' : 'ثبت ورود جدید'}</h3>
      <form id="entry-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date', item.date)}</div>
        <div>
          <label class="text-xs text-slate-400">ماده اولیه</label>
          <select name="material_name" class="input-field" required>
            <option value="">انتخاب کنید</option>
            ${materials.map(m => `<option value="${m.name}" ${item.material_name===m.name?'selected':''}>${m.name} (${m.unit})</option>`).join('')}
          </select>
        </div>
        <div><label class="text-xs text-slate-400">مقدار</label><input name="quantity" type="number" step="0.01" class="input-field" value="${item.quantity || ''}" required /></div>
        <div><label class="text-xs text-slate-400">تأمین‌کننده</label><input name="supplier" class="input-field" value="${item.supplier || ''}" /></div>
        <div><label class="text-xs text-slate-400">شماره فاکتور</label><input name="invoice_no" class="input-field" value="${item.invoice_no || ''}" /></div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes || ''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('entry-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.quantity = Number(data.quantity);
      data.created_at = item.created_at || new Date().toISOString();
      if (id) { data.id = id; await DB.put('entries', data); toast('ویرایش شد', 'success'); }
      else { await DB.add('entries', data); toast('ورود ثبت شد', 'success'); }
      closeModal();
      navigate('entries');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.deleteEntry = async function (id) {
  if (!Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  if (!confirmAction('آیا از حذف این رکورد مطمئن هستید؟')) return;
  await DB.remove('entries', id);
  toast('حذف شد', 'success');
  navigate('entries');
};

Pages.exportEntries = async function () {
  const entries = await DB.getAll('entries');
  exportToExcel(entries.map(e => ({
    'تاریخ': e.date, 'ماده اولیه': e.material_name, 'مقدار': e.quantity,
    'تأمین‌کننده': e.supplier, 'شماره فاکتور': e.invoice_no, 'توضیحات': e.notes
  })), 'ورود', 'ورود_مواد_اولیه');
};

Pages.pdfEntries = async function () {
  const entries = await DB.getAll('entries');
  exportToPDF('گزارش ورود مواد', [
    { header: 'تاریخ', key: 'date' }, { header: 'ماده', key: 'material_name' },
    { header: 'مقدار', key: 'quantity' }, { header: 'تأمین‌کننده', key: 'supplier' }
  ], entries, 'ورود_مواد');
};

/* ========== WASTES ========== */
Pages.wastes = async function () {
  let wastes = (await DB.getAll('wastes')).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canEntry();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '', dt = params.get('dt') || '', q = params.get('q') || '';
  if (df || dt || q) wastes = filterByDateAndSearch(wastes, df, dt, q, ['material_name','waste_type','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">ثبت ضایعات</h1>
        <p class="text-slate-400 text-sm">چربی، استخوان، آشغال مرغ و ... از وزن موجودی کم می‌شود</p>
      </div>
      <div class="flex gap-2">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showWasteForm()">+ ثبت ضایعات</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportWastes()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfWastes()">PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو..." value="${q}" style="max-width:160px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('wastes')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('wastes')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>ماده اولیه</th><th>نوع ضایعات</th><th>وزن (کیلو)</th><th>یادداشت</th>
            ${canEdit ? '<th>عملیات</th>' : ''}
          </tr></thead>
          <tbody>
            ${wastes.length ? wastes.map(w => `
              <tr>
                <td>${w.date}</td>
                <td class="font-medium">${w.material_name}</td>
                <td><span class="badge badge-warn">${w.waste_type}</span></td>
                <td class="text-amber-300">${fmtNum(w.quantity)}</td>
                <td class="text-slate-400 text-xs">${w.notes || ''}</td>
                ${canEdit ? `<td><button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteWaste(${w.id})">حذف</button></td>` : ''}
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center text-slate-500 py-8">ضایعاتی ثبت نشده</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showWasteForm = async function () {
  if (!Auth.canEntry()) return;
  const materials = await DB.getAll('materials');
  const wasteTypes = ['چربی', 'استخوان', 'آشغال مرغ', 'پوست', 'خونابه', 'سایر'];

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">ثبت ضایعات</h3>
      <form id="waste-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date')}</div>
        <div>
          <label class="text-xs text-slate-400">ماده اولیه مرتبط</label>
          <select name="material_name" class="input-field" required>
            <option value="">انتخاب</option>
            ${materials.map(m => `<option value="${m.name}">${m.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع ضایعات</label>
          <select name="waste_type" class="input-field" required>
            ${wasteTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div><label class="text-xs text-slate-400">وزن ضایعات (کیلوگرم)</label><input name="quantity" type="number" step="0.01" class="input-field" required /></div>
        <div><label class="text-xs text-slate-400">یادداشت</label><textarea name="notes" class="input-field" rows="2"></textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ثبت</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('waste-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(ev.target).entries());
    data.quantity = Number(data.quantity);
    data.created_at = new Date().toISOString();
    await DB.add('wastes', data);
    toast('ضایعات ثبت شد و از موجودی کسر می‌شود', 'success');
    closeModal();
    navigate('wastes');
  };
};

Pages.deleteWaste = async function (id) {
  if (!Auth.canEditDelete()) return;
  if (!confirmAction('حذف شود؟')) return;
  await DB.remove('wastes', id);
  toast('حذف شد', 'success');
  navigate('wastes');
};

Pages.exportWastes = async function () {
  const wastes = await DB.getAll('wastes');
  exportToExcel(wastes.map(w => ({
    'تاریخ': w.date, 'ماده اولیه': w.material_name, 'نوع ضایعات': w.waste_type,
    'وزن': w.quantity, 'یادداشت': w.notes
  })), 'ضایعات', 'گزارش_ضایعات');
};

Pages.pdfWastes = async function () {
  const wastes = await DB.getAll('wastes');
  exportToPDF('گزارش ضایعات', [
    { header: 'تاریخ', key: 'date' }, { header: 'ماده', key: 'material_name' },
    { header: 'نوع', key: 'waste_type' }, { header: 'وزن', key: 'quantity' }
  ], wastes, 'ضایعات');
};

/* ========== PRODUCTIONS ========== */
Pages.productions = async function () {
  let list = (await DB.getAll('productions')).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const canAdd = Auth.canProduction();
  const canEdit = Auth.canEditDelete();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const df = params.get('df') || '', dt = params.get('dt') || '', q = params.get('q') || '';
  if (df || dt || q) list = filterByDateAndSearch(list, df, dt, q, ['product_name','material_name','producer_name','notes']);

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">تولید روزانه</h1>
        <p class="text-slate-400 text-sm">ثبت سیخ‌ها و محصولات تولید شده</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canAdd ? `<button class="btn-primary" onclick="Pages.showProdForm()">+ ثبت تولید</button>` : ''}
        <button class="btn-secondary" onclick="Pages.exportProds()">خروجی اکسل</button>
        <button class="btn-secondary" onclick="Pages.pdfProds()">PDF</button>
      </div>
    </div>
    <div class="filter-bar glass-card rounded-xl p-3 mb-4">
      <input id="f-df" class="input-field" placeholder="از تاریخ" value="${df}" style="max-width:130px" />
      <input id="f-dt" class="input-field" placeholder="تا تاریخ" value="${dt}" style="max-width:130px" />
      <input id="f-q" class="input-field" placeholder="جستجو محصول/پرسنل..." value="${q}" style="max-width:180px" />
      <button class="btn-secondary text-sm" onclick="Pages.applyFilter('productions')">فیلتر</button>
      <button class="btn-ghost text-sm" onclick="Pages.clearFilter('productions')">پاک</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>تاریخ</th><th>محصول</th><th>تعداد</th><th>وزن مصرفی</th><th>ماده اولیه</th><th>تولیدکننده</th><th>مدت</th>
            <th>عملیات</th>
          </tr></thead>
          <tbody>
            ${list.length ? list.map(p => `
              <tr>
                <td>${p.date}</td>
                <td class="font-medium">${p.product_name}</td>
                <td>${fmtNum(p.quantity)}</td>
                <td class="text-red-300">${fmtNum(p.material_weight)}</td>
                <td class="text-slate-400">${p.material_name}</td>
                <td>${p.producer_name || '—'}</td>
                <td>${p.duration_minutes ? fmtNum(p.duration_minutes) + ' د' : '—'}</td>
                <td class="whitespace-nowrap">
                  <button class="btn-ghost text-xs" onclick="Pages.printProd(${p.id})">فیش</button>
                  ${canEdit ? `
                  <button class="btn-ghost text-xs" onclick="Pages.showProdForm(${p.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteProd(${p.id})">حذف</button>` : ''}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="text-center text-slate-500 py-8">رکوردی نیست</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showProdForm = async function (id) {
  if (!Auth.canProduction() && !id) return;
  if (id && !Auth.canEditDelete()) return toast('فقط مدیر', 'error');
  const products = await DB.getAll('products');
  const personnel = await DB.getAll('personnel');
  let item = { date: todayJalali(), product_name: '', quantity: '', material_weight: '', material_name: '', shift_code: '', start_time: '', end_time: '', duration_minutes: '', producer_name: '', remainder_count: 0, remainder_weight: 0, remainder_type: 'حمل به روز بعد', notes: '' };
  if (id) item = await DB.getById('productions', id) || item;

  showModal(`
    <div class="modal" style="max-width:36rem">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش تولید' : 'ثبت تولید جدید'}</h3>
      <form id="prod-form" class="space-y-3 max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تاریخ شمسی</label>${jalaliInput('date', item.date)}</div>
          <div>
            <label class="text-xs text-slate-400">محصول</label>
            <select name="product_name" id="prod-product" class="input-field" required>
              <option value="">انتخاب</option>
              ${products.filter(p=>p.active!==false && p.name).map(p => `<option value="${p.name}" data-mat="${p.material_name}" data-w="${p.weight_per_unit}" data-rem="${p.remainder_type}" ${item.product_name===p.name?'selected':''}>${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تعداد تولید</label><input name="quantity" id="prod-qty" type="number" step="0.5" class="input-field" value="${item.quantity||''}" required /></div>
          <div><label class="text-xs text-slate-400">وزن مصرفی مواد (کیلو)</label><input name="material_weight" id="prod-weight" type="number" step="0.001" class="input-field" value="${item.material_weight||''}" required /></div>
        </div>
        <div><label class="text-xs text-slate-400">ماده اولیه (خودکار)</label><input name="material_name" id="prod-mat" class="input-field" value="${item.material_name||''}" readonly /></div>
        <div>
          <label class="text-xs text-slate-400">تولیدکننده</label>
          <select name="producer_name" class="input-field">
            <option value="">—</option>
            ${personnel.filter(p=>p.active!==false).map(p => `<option value="${p.name}" ${item.producer_name===p.name?'selected':''}>${p.name} (${p.position})</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div><label class="text-xs text-slate-400">کد شیفت</label><input name="shift_code" class="input-field" value="${item.shift_code||''}" /></div>
          <div><label class="text-xs text-slate-400">شروع</label><input name="start_time" type="time" class="input-field" value="${item.start_time||''}" /></div>
          <div><label class="text-xs text-slate-400">پایان</label><input name="end_time" type="time" class="input-field" value="${item.end_time||''}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">مدت (دقیقه)</label><input name="duration_minutes" type="number" class="input-field" value="${item.duration_minutes||''}" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">تعداد باقیمانده</label><input name="remainder_count" type="number" class="input-field" value="${item.remainder_count||0}" /></div>
          <div><label class="text-xs text-slate-400">وزن باقیمانده (کیلو)</label><input name="remainder_weight" type="number" step="0.001" class="input-field" value="${item.remainder_weight||0}" /></div>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع باقیمانده</label>
          <select name="remainder_type" id="prod-rem" class="input-field">
            <option value="حمل به روز بعد" ${item.remainder_type==='حمل به روز بعد'?'selected':''}>حمل به روز بعد</option>
            <option value="برگشت به مواد" ${item.remainder_type==='برگشت به مواد'?'selected':''}>برگشت به مواد (ثبت خودکار)</option>
          </select>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="notes" class="input-field" rows="2">${item.notes||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  const prodSelect = document.getElementById('prod-product');
  const qtyInput = document.getElementById('prod-qty');
  const weightInput = document.getElementById('prod-weight');
  const matInput = document.getElementById('prod-mat');
  const remSelect = document.getElementById('prod-rem');

  function updateFromProduct() {
    const opt = prodSelect.selectedOptions[0];
    if (!opt || !opt.value) return;
    matInput.value = opt.dataset.mat || '';
    remSelect.value = opt.dataset.rem || 'حمل به روز بعد';
    const wpu = Number(opt.dataset.w || 0);
    const qty = Number(qtyInput.value || 0);
    if (qty && wpu) weightInput.value = (qty * wpu / 1000).toFixed(3);
  }
  prodSelect.onchange = updateFromProduct;
  qtyInput.oninput = updateFromProduct;

  document.getElementById('prod-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.quantity = Number(data.quantity);
      data.material_weight = Number(data.material_weight);
      data.duration_minutes = data.duration_minutes ? Number(data.duration_minutes) : null;
      data.remainder_count = Number(data.remainder_count || 0);
      data.remainder_weight = Number(data.remainder_weight || 0);
      data.created_at = item.created_at || new Date().toISOString();
      if (id) {
        data.id = id;
        await DB.updateProductionWithReturn(data);
        toast('ویرایش شد (برگشت خودکار به‌روز شد)', 'success');
      } else {
        await DB.addProductionWithReturn(data);
        toast('تولید ثبت شد' + (data.remainder_type === 'برگشت به مواد' && data.remainder_weight > 0 ? ' + برگشت به مواد' : ''), 'success');
      }
      closeModal();
      navigate('productions');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره تولید', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

Pages.printProd = async function (id) {
  const p = await DB.getById('productions', id);
  if (!p) return toast('یافت نشد', 'error');
  printReceipt(p);
};

Pages.deleteProd = async function (id) {
  if (!Auth.canEditDelete()) return;
  if (!confirmAction('حذف شود؟')) return;
  // also remove linked returns
  const returns = await DB.getAll('returns');
  for (const r of returns) if (r.production_id === id) await DB.remove('returns', r.id);
  await DB.remove('productions', id);
  toast('حذف شد', 'success');
  navigate('productions');
};

Pages.exportProds = async function () {
  const list = await DB.getAll('productions');
  exportToExcel(list.map(p => ({
    'تاریخ': p.date, 'محصول': p.product_name, 'تعداد': p.quantity,
    'وزن مصرفی': p.material_weight, 'ماده اولیه': p.material_name,
    'شیفت': p.shift_code, 'شروع': p.start_time, 'پایان': p.end_time,
    'مدت': p.duration_minutes, 'تولیدکننده': p.producer_name,
    'باقیمانده تعداد': p.remainder_count, 'وزن باقیمانده': p.remainder_weight,
    'نوع باقیمانده': p.remainder_type, 'توضیحات': p.notes
  })), 'تولید', 'گزارش_تولید_روزانه');
};

Pages.pdfProds = async function () {
  const list = await DB.getAll('productions');
  exportToPDF('گزارش تولید', [
    { header: 'تاریخ', key: 'date' }, { header: 'محصول', key: 'product_name' },
    { header: 'تعداد', key: 'quantity' }, { header: 'وزن', key: 'material_weight' },
    { header: 'تولیدکننده', key: 'producer_name' }
  ], list, 'تولید');
};

/* ========== MATERIALS ========== */
Pages.materials = async function () {
  const stock = await DB.calcStock();
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">مواد اولیه</h1>
        <p class="text-slate-400 text-sm">لیست و موجودی لحظه‌ای</p>
      </div>
      ${canEdit ? `<button class="btn-primary" onclick="Pages.showMaterialForm()">+ افزودن ماده</button>` : ''}
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>واحد</th><th>موجودی اولیه</th><th>حداقل هشدار</th>
            <th>کل ورود</th><th>کل مصرف</th><th>ضایعات</th><th>برگشت</th><th>موجودی فعلی</th><th>وضعیت</th>
            ${canEdit ? '<th></th>' : ''}
          </tr></thead>
          <tbody>
            ${stock.map(m => `
              <tr>
                <td class="text-slate-400">${m.code}</td>
                <td class="font-medium">${m.name}</td>
                <td>${m.unit}</td>
                <td>${fmtNum(m.initial_stock)}</td>
                <td>${fmtNum(m.min_alert)}</td>
                <td class="text-brand-300">${fmtNum(m.total_in)}</td>
                <td class="text-red-300">${fmtNum(m.total_out)}</td>
                <td class="text-amber-300">${fmtNum(m.total_waste)}</td>
                <td class="text-cyan-300">${fmtNum(m.total_return)}</td>
                <td class="font-bold text-lg">${fmtNum(m.current_stock)}</td>
                <td>${statusBadge(m.status)}</td>
                ${canEdit ? `<td><button class="btn-ghost text-xs" onclick="Pages.showMaterialForm(${m.id})">ویرایش</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showMaterialForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { code: '', name: '', unit: 'کیلوگرم', initial_stock: 0, min_alert: 0, description: '', active: true };
  if (id) item = await DB.getById('materials', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش ماده' : 'افزودن ماده اولیه'}</h3>
      <form id="mat-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="${item.code||''}" required ${id?'readonly':''} /></div>
          <div><label class="text-xs text-slate-400">واحد</label><input name="unit" class="input-field" value="${item.unit||'کیلوگرم'}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="${item.name||''}" required /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">موجودی اولیه</label><input name="initial_stock" type="number" step="0.01" class="input-field" value="${item.initial_stock||0}" /></div>
          <div><label class="text-xs text-slate-400">حداقل هشدار</label><input name="min_alert" type="number" step="0.01" class="input-field" value="${item.min_alert||0}" /></div>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="description" class="input-field" rows="2">${item.description||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('mat-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.initial_stock = Number(data.initial_stock);
      data.min_alert = Number(data.min_alert);
      data.active = 1;
      if (id) { data.id = id; await DB.put('materials', data); }
      else await DB.add('materials', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('materials');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره ماده', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

/* ========== PRODUCTS ========== */
Pages.products = async function () {
  const list = await DB.getAll('products');
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">انواع محصول</h1>
        <p class="text-slate-400 text-sm">تعریف سیخ‌ها و محصولات</p>
      </div>
      ${canEdit ? `<button class="btn-primary" onclick="Pages.showProductForm()">+ افزودن محصول</button>` : ''}
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>وزن واحد (گرم)</th><th>ماده اولیه</th><th>نوع باقیمانده</th>
            ${canEdit ? '<th></th>' : ''}
          </tr></thead>
          <tbody>
            ${list.filter(p=>p.name).map(p => `
              <tr>
                <td class="text-slate-400">${p.code}</td>
                <td class="font-medium">${p.name}</td>
                <td>${fmtNum(p.weight_per_unit)}</td>
                <td>${p.material_name}</td>
                <td><span class="badge ${p.remainder_type==='برگشت به مواد'?'badge-warn':'badge-ok'}">${p.remainder_type}</span></td>
                ${canEdit ? `<td><button class="btn-ghost text-xs" onclick="Pages.showProductForm(${p.id})">ویرایش</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showProductForm = async function (id) {
  if (!Auth.isAdmin()) return;
  const materials = await DB.getAll('materials');
  let item = { code: '', name: '', weight_per_unit: 100, material_name: '', description: '', remainder_type: 'حمل به روز بعد', remainder_note: '', active: true };
  if (id) item = await DB.getById('products', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش محصول' : 'افزودن محصول'}</h3>
      <form id="proddef-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="${item.code||''}" required ${id?'readonly':''} /></div>
          <div><label class="text-xs text-slate-400">وزن هر عدد (گرم)</label><input name="weight_per_unit" type="number" class="input-field" value="${item.weight_per_unit||100}" required /></div>
        </div>
        <div><label class="text-xs text-slate-400">نام محصول</label><input name="name" class="input-field" value="${item.name||''}" required /></div>
        <div>
          <label class="text-xs text-slate-400">ماده اولیه مصرفی</label>
          <select name="material_name" class="input-field" required>
            ${materials.map(m => `<option value="${m.name}" ${item.material_name===m.name?'selected':''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400">نوع باقیمانده</label>
          <select name="remainder_type" class="input-field">
            <option value="حمل به روز بعد" ${item.remainder_type==='حمل به روز بعد'?'selected':''}>حمل به روز بعد</option>
            <option value="برگشت به مواد" ${item.remainder_type==='برگشت به مواد'?'selected':''}>برگشت به مواد</option>
          </select>
        </div>
        <div><label class="text-xs text-slate-400">توضیحات</label><textarea name="description" class="input-field" rows="2">${item.description||''}</textarea></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('proddef-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.weight_per_unit = Number(data.weight_per_unit);
      data.active = 1;
      if (id) { data.id = id; await DB.put('products', data); }
      else await DB.add('products', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('products');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره محصول', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};

/* ========== PERSONNEL ========== */
Pages.personnel = async function () {
  const list = await DB.getAll('personnel');
  const canEdit = Auth.isAdmin();

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">پرسنل تولید</h1>
        <p class="text-slate-400 text-sm">لیست کارکنان آشپزخانه</p>
      </div>
      ${canEdit ? `<button class="btn-primary" onclick="Pages.showPersonForm()">+ افزودن پرسنل</button>` : ''}
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>کد</th><th>نام</th><th>سمت</th><th>فعال</th>
            ${canEdit ? '<th></th>' : ''}
          </tr></thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td class="text-slate-400">${p.code}</td>
                <td class="font-medium">${p.name}</td>
                <td>${p.position || '—'}</td>
                <td>${p.active !== false ? '<span class="badge badge-ok">بله</span>' : '<span class="badge badge-danger">خیر</span>'}</td>
                ${canEdit ? `<td class="space-x-1 space-x-reverse whitespace-nowrap">
                  <button class="btn-ghost text-xs" onclick="Pages.showPersonForm(${p.id})">ویرایش</button>
                  <button class="btn-ghost text-xs text-red-400" onclick="Pages.deletePerson(${p.id}, '${String(p.name||'').replace(/'/g, "\\'")}')">حذف</button>
                </td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showPersonForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { code: '', name: '', position: '', active: true };
  if (id) item = await DB.getById('personnel', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش پرسنل' : 'افزودن پرسنل'}</h3>
      <form id="person-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="${item.code||''}" required ${id?'readonly':''} /></div>
        <div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="${item.name||''}" required /></div>
        <div><label class="text-xs text-slate-400">سمت</label><input name="position" class="input-field" value="${item.position||''}" /></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('person-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) { data.id = id; await DB.put('personnel', data); }
      else await DB.add('personnel', data);
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('personnel');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره پرسنل', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};


Pages.deletePerson = async function (id, name) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (!confirmAction('پرسنل «' + (name || id) + '» حذف شود؟')) return;
  try {
    await DB.remove('personnel', id);
    toast('پرسنل حذف شد', 'success');
    navigate('personnel');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در حذف پرسنل', 'error');
  }
};

/* ========== REPORTS ========== */
Pages.reports = async function () {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold">گزارش‌ها و پشتیبان‌گیری</h1>
      <p class="text-slate-400 text-sm">خروجی اکسل / PDF و بک‌آپ کامل سیستم</p>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="glass-card rounded-2xl p-6 space-y-3">
        <h2 class="font-semibold">گزارش‌های اکسل</h2>
        <button class="btn-secondary w-full" onclick="Pages.exportEntries()">📥 گزارش ورود مواد</button>
        <button class="btn-secondary w-full" onclick="Pages.exportProds()">📥 گزارش تولید</button>
        <button class="btn-secondary w-full" onclick="Pages.exportWastes()">📥 گزارش ضایعات</button>
        <button class="btn-secondary w-full" onclick="Pages.exportStock()">📥 گزارش موجودی تفصیلی</button>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3">
        <h2 class="font-semibold">گزارش‌های PDF</h2>
        <button class="btn-secondary w-full" onclick="Pages.pdfEntries()">📄 PDF ورود</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfProds()">📄 PDF تولید</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfWastes()">📄 PDF ضایعات</button>
        <button class="btn-secondary w-full" onclick="Pages.pdfStock()">📄 PDF موجودی</button>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2">
        <h2 class="font-semibold">پشتیبان‌گیری کامل (اشتراک بین دستگاه‌ها)</h2>
        <p class="text-sm text-slate-400">تمام داده‌ها به صورت JSON دانلود می‌شود. روی دستگاه دیگر Import کنید تا همگام شود.</p>
        <div class="flex flex-wrap gap-3">
          <button class="btn-primary" onclick="Pages.doBackup()">💾 دانلود پشتیبان کامل</button>
          <label class="btn-secondary cursor-pointer">
            📤 بازیابی از پشتیبان
            <input type="file" accept=".json" class="hidden" onchange="Pages.doRestore(event)" />
          </label>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-6 space-y-3 md:col-span-2 border border-brand-500/20">
        <h2 class="font-semibold text-brand-300">☁️ همگام‌سازی Cloudflare (real-time)</h2>
        <p class="text-sm text-slate-400 leading-relaxed">
          برای اشتراک لحظه‌ای بین چند دستگاه، Worker و D1 را دیپلوی کنید (پوشه <code class="text-brand-300">workers/</code>).
          سپس آدرس API را اینجا ذخیره کنید. فعلاً داده‌ها محلی (IndexedDB) هستند.
        </p>
        <div class="flex flex-wrap gap-2 items-center">
          <input id="api-url" class="input-field" style="max-width:320px" placeholder="https://kitchen-api.xxx.workers.dev" value="${localStorage.getItem('kitchen_api_url') || ''}" />
          <button class="btn-secondary text-sm" onclick="localStorage.setItem('kitchen_api_url', document.getElementById('api-url').value); toast('آدرس API ذخیره شد','success')">ذخیره آدرس API</button>
        </div>
        <ol class="text-xs text-slate-500 list-decimal list-inside space-y-1 mt-2">
          <li>در Cloudflare یک D1 بسازید و <code>wrangler d1 execute</code> با <code>shared/schema.sql</code> اجرا کنید</li>
          <li><code>cd workers && npx wrangler deploy</code> (database_id را در wrangler.toml بگذارید)</li>
          <li>آدرس Worker را بالا وارد کنید — نسخه بعدی فرانت به‌صورت خودکار از API می‌خواند</li>
        </ol>
      </div>
    </div>
  `;
};

Pages.exportStock = async function () {
  const stock = await DB.calcStock();
  exportToExcel(stock.map(m => ({
    'کد': m.code, 'نام': m.name, 'واحد': m.unit,
    'موجودی اولیه': m.initial_stock, 'کل ورود': m.total_in,
    'کل مصرف': m.total_out, 'ضایعات': m.total_waste,
    'برگشت': m.total_return, 'موجودی فعلی': m.current_stock, 'وضعیت': m.status
  })), 'موجودی', 'گزارش_موجودی_تفصیلی');
};

Pages.pdfStock = async function () {
  const stock = await DB.calcStock();
  exportToPDF('گزارش موجودی', [
    { header: 'کد', key: 'code' }, { header: 'نام', key: 'name' },
    { header: 'فعلی', key: 'current_stock' }, { header: 'وضعیت', key: 'status' }
  ], stock, 'موجودی');
};

Pages.doBackup = async function () {
  const data = await DB.exportAllBackup();
  downloadJSON(data, `kitchen-backup-${new Date().toISOString().slice(0,10)}.json`);
};

Pages.doRestore = async function (ev) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  const file = ev.target.files[0];
  if (!file) return;
  if (!confirmAction('تمام داده‌های فعلی جایگزین می‌شوند. ادامه؟')) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await DB.importBackup(data);
    toast('بازیابی موفق', 'success');
    setTimeout(() => location.reload(), 800);
  } catch (e) {
    toast('فایل نامعتبر', 'error');
  }
};

/* ========== USERS ========== */
Pages.users = async function () {
  if (!Auth.isAdmin()) return '<p class="text-red-400">دسترسی ندارید</p>';
  const users = await DB.getAll('users');

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">مدیریت کاربران</h1>
        <p class="text-slate-400 text-sm">رمز عبور هش‌شده + نقش</p>
      </div>
      <button class="btn-primary" onclick="Pages.showUserForm()">+ کاربر جدید</button>
    </div>
    <div class="glass-card rounded-2xl p-4">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>نام کاربری</th><th>نام کامل</th><th>نقش</th><th>فعال</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td class="font-medium">${u.username}</td>
                <td>${u.full_name || '—'}</td>
                <td><span class="badge badge-ok">${u.role === 'admin' ? 'ادمین' : u.role === 'entry' ? 'ثبت ورود' : 'ثبت تولید'}</span></td>
                <td>${u.active !== false ? 'بله' : 'خیر'}</td>
                <td class="space-x-1 space-x-reverse whitespace-nowrap">
                  <button class="btn-ghost text-xs" onclick="Pages.showUserForm(${u.id})">ویرایش</button>
                  ${u.username !== 'admin' ? `<button class="btn-ghost text-xs text-red-400" onclick="Pages.deleteUser(${u.id}, '${String(u.username).replace(/'/g, "\\'")}')">حذف</button>` : '<span class="text-xs text-slate-500">—</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

Pages.showUserForm = async function (id) {
  if (!Auth.isAdmin()) return;
  let item = { username: '', password: '', role: 'entry', full_name: '', active: true };
  if (id) item = await DB.getById('users', id) || item;

  showModal(`
    <div class="modal">
      <h3 class="text-lg font-bold mb-4">${id ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
      <form id="user-form" class="space-y-3">
        <div><label class="text-xs text-slate-400">نام کاربری</label><input name="username" class="input-field" value="${item.username||''}" required ${id?'readonly':''} /></div>
        <div><label class="text-xs text-slate-400">رمز عبور ${id?'(خالی = بدون تغییر)':''}</label><input name="password" type="password" class="input-field" value="" ${id?'':'required'} /></div>
        <div><label class="text-xs text-slate-400">نام کامل</label><input name="full_name" class="input-field" value="${item.full_name||''}" /></div>
        <div>
          <label class="text-xs text-slate-400">نقش</label>
          <select name="role" class="input-field">
            <option value="admin" ${item.role==='admin'?'selected':''}>ادمین (دسترسی کامل)</option>
            <option value="entry" ${item.role==='entry'?'selected':''}>ثبت‌کننده ورود</option>
            <option value="production" ${item.role==='production'?'selected':''}>ثبت‌کننده تولید</option>
          </select>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">ذخیره</button>
          <button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('user-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره...'; }
    try {
      const data = Object.fromEntries(new FormData(ev.target).entries());
      data.active = 1;
      if (id) {
        data.id = id;
        // در حالت ابری: رمز خام بفرست تا سرور هش کند؛ اگر خالی = تغییر نده
        if (!data.password) delete data.password;
        await DB.put('users', data);
      } else {
        if (!data.password) throw new Error('رمز عبور الزامی است');
        await DB.add('users', data);
      }
      toast('ذخیره شد', 'success');
      closeModal();
      navigate('users');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره کاربر', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ذخیره'; }
    }
  };
};


Pages.deleteUser = async function (id, username) {
  if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
  if (username === 'admin') return toast('کاربر admin قابل حذف نیست', 'error');
  if (!confirmAction('کاربر «' + username + '» حذف شود؟ این کار برگشت‌ناپذیر است.')) return;
  try {
    await DB.remove('users', id);
    toast('کاربر حذف شد', 'success');
    navigate('users');
  } catch (e) {
    console.error(e);
    toast(e.message || 'خطا در حذف کاربر', 'error');
  }
};

window.Pages = Pages;
