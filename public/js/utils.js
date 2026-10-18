/**
 * UI helpers, toast, modal, Excel/PDF export, Jalali dates, crypto hash
 */
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) {
    console.warn('toast:', msg);
    return;
  }
  el.textContent = msg;
  el.className = 'toast ' + (type === 'error' ? 'bg-red-600 text-white' : type === 'success' ? 'bg-brand-600 text-white' : 'bg-slate-700 text-white');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3200);
}

function showModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this) closeModal()">${html}</div>`;
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('fa-IR', { maximumFractionDigits: 2 });
}

function statusBadge(status) {
  if (status === 'عادی') return `<span class="badge badge-ok">${status}</span>`;
  if (status === 'هشدار') return `<span class="badge badge-warn">${status}</span>`;
  return `<span class="badge badge-danger">${status}</span>`;
}

/* ---------- Jalali helpers (jalaali-js) ---------- */
function todayJalali() {
  const d = new Date();
  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
}

function jalaliInput(name, value, required = true) {
  const v = value || todayJalali();
  return `<input name="${name}" type="text" class="input-field" value="${v}" placeholder="1405/07/20" pattern="\\d{4}/\\d{2}/\\d{2}" ${required ? 'required' : ''} title="فرمت: سال/ماه/روز شمسی" />`;
}

function parseJalali(str) {
  if (!str) return null;
  const p = str.split(/[\/\-]/).map(Number);
  if (p.length !== 3) return null;
  return { y: p[0], m: p[1], d: p[2] };
}

function jalaliCompare(a, b) {
  const pa = parseJalali(a), pb = parseJalali(b);
  if (!pa || !pb) return 0;
  if (pa.y !== pb.y) return pa.y - pb.y;
  if (pa.m !== pb.m) return pa.m - pb.m;
  return pa.d - pb.d;
}

/* ---------- Password hashing (Web Crypto SHA-256, with plain fallback) ---------- */
async function hashPassword(plain) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain + 'kitchen-salt-v1'));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { console.warn('hash failed, using plain', e); }
  return plain;
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  if (hash.length === 64 && /^[0-9a-f]+$/.test(hash)) {
    try {
      const h = await hashPassword(plain);
      if (h === hash) return true;
    } catch (e) { /* fall through */ }
    return false;
  }
  return plain === hash;
}

/* ---------- Excel ---------- */
function exportToExcel(rows, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName + '.xlsx');
  toast('فایل اکسل دانلود شد', 'success');
}

function downloadJSON(obj, name) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  toast('پشتیبان دانلود شد', 'success');
}

/* ---------- PDF ---------- */
function exportToPDF(title, columns, rows, fileName) {
  // jsPDF فونت فارسی ندارد → خروجی HTML با Vazirmatn + چاپ/ذخیره PDF مرورگر
  const head = columns.map(c => `<th>${escapeHtml(c.header)}</th>`).join('');
  const body = rows.map(r => {
    const tds = columns.map(c => `<td>${escapeHtml(String(r[c.key] ?? ''))}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
      direction: rtl;
      color: #111;
      padding: 16px 20px;
      font-size: 12px;
    }
    h1 { font-size: 18px; margin: 0 0 4px; text-align: center; }
    .meta { text-align: center; color: #555; font-size: 11px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: right;
      vertical-align: top;
    }
    th {
      background: #0d4d2e;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
    }
    tr:nth-child(even) td { background: #f5f5f5; }
    .actions { text-align: center; margin-top: 16px; }
    button {
      font-family: inherit;
      padding: 8px 20px;
      margin: 0 4px;
      border-radius: 8px;
      border: 1px solid #0d4d2e;
      background: #0d4d2e;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
    }
    button.secondary { background: #fff; color: #0d4d2e; }
    @media print {
      .actions { display: none !important; }
      body { padding: 0; }
      th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">غذای انصار — ${new Date().toLocaleString('fa-IR')}</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || '<tr><td colspan="' + columns.length + '">داده‌ای نیست</td></tr>'}</tbody>
  </table>
  <div class="actions">
    <button onclick="window.print()">چاپ / ذخیره PDF</button>
    <button class="secondary" onclick="window.close()">بستن</button>
  </div>
  <script>
    // اگر کاربر خواست مستقیم دیالوگ چاپ باز شود
    setTimeout(function(){ /* window.print(); */ }, 400);
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    toast('پاپ‌آپ مسدود است — اجازه پاپ‌آپ بدهید', 'error');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  toast('گزارش باز شد — از «چاپ / ذخیره PDF» ذخیره کنید', 'success');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function confirmAction(msg) {
  return window.confirm(msg);
}

function filterByDateAndSearch(list, dateFrom, dateTo, search, searchFields) {
  return list.filter(item => {
    if (dateFrom && jalaliCompare(item.date, dateFrom) < 0) return false;
    if (dateTo && jalaliCompare(item.date, dateTo) > 0) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = searchFields.some(f => String(item[f] || '').toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });
}

/** Print a simple production receipt — نسخه پایدار برای پرینتر */
function printReceipt(p) {
  const old = document.getElementById('print-frame');
  if (old) old.remove();

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <title>فیش تولید</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Tahoma, Arial, sans-serif;
      padding: 4mm;
      max-width: 80mm;
      margin: 0 auto;
      font-size: 12px;
      color: #000 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h2 { margin: 0 0 12px; font-size: 16px; text-align: center; color: #000 !important; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 4px; border-bottom: 1px dashed #999; color: #000 !important; vertical-align: top; }
    td.label { color: #333 !important; width: 45%; }
    td.val { font-weight: bold; text-align: left; direction: ltr; unicode-bidi: embed; }
    .footer { margin-top: 14px; text-align: center; font-size: 11px; color: #444 !important; }
    @media print { body { padding: 5mm; } button, .no-print { display: none !important; } }
    @page { size: auto; margin: 8mm; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:8px">
    <img src="/logo-ansar.png" alt="" style="max-width:72px;height:auto" onerror="this.style.display='none'" />
  </div>
  <h2>فیش تولید — غذای انصار</h2>
  <table>
    <tr><td class="label">تاریخ</td><td class="val">${p.date || '—'}</td></tr>
    <tr><td class="label">محصول</td><td class="val">${p.product_name || '—'}</td></tr>
    <tr><td class="label">تعداد</td><td class="val">${p.quantity ?? '—'}</td></tr>
    <tr><td class="label">وزن مصرفی (کیلو)</td><td class="val">${p.material_weight ?? '—'}</td></tr>
    <tr><td class="label">ماده اولیه</td><td class="val">${p.material_name || '—'}</td></tr>
    <tr><td class="label">تولیدکننده</td><td class="val">${p.producer_name || '—'}</td></tr>
    <tr><td class="label">شیفت</td><td class="val">${p.shift_code || '—'}</td></tr>
    <tr><td class="label">مدت (دقیقه)</td><td class="val">${p.duration_minutes ?? '—'}</td></tr>
    <tr><td class="label">باقیمانده</td><td class="val">${p.remainder_count || 0} / ${p.remainder_weight || 0} کیلو</td></tr>
    <tr><td class="label">نوع باقیمانده</td><td class="val">${p.remainder_type || '—'}</td></tr>
  </table>
  <p class="footer">چاپ‌شده در ${new Date().toLocaleString('fa-IR')}</p>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.id = 'print-frame';
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error(e);
      toast('خطا در چاپ — دوباره تلاش کنید', 'error');
    }
    setTimeout(() => iframe.remove(), 5000);
  };

  if (iframe.contentWindow.document.readyState === 'complete') {
    setTimeout(doPrint, 250);
  } else {
    iframe.onload = () => setTimeout(doPrint, 250);
    setTimeout(doPrint, 800);
  }
}

window.UI = {
  toast, showModal, closeModal, fmtNum, statusBadge,
  todayJalali, jalaliInput, parseJalali, jalaliCompare,
  hashPassword, verifyPassword,
  exportToExcel, downloadJSON, exportToPDF, confirmAction,
  filterByDateAndSearch, printReceipt
};
window.toast = toast;
window.showModal = showModal;
window.closeModal = closeModal;
window.fmtNum = fmtNum;
window.statusBadge = statusBadge;
window.todayJalali = todayJalali;
window.jalaliInput = jalaliInput;
window.exportToExcel = exportToExcel;
window.downloadJSON = downloadJSON;
window.exportToPDF = exportToPDF;
window.confirmAction = confirmAction;
window.filterByDateAndSearch = filterByDateAndSearch;
window.printReceipt = printReceipt;
