/** Print a simple production receipt — نسخه پایدار برای پرینتر */
function printReceipt(p) {
  // حذف iframe قبلی اگر مانده
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
      padding: 12mm 10mm;
      font-size: 13px;
      color: #000 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 16px;
      text-align: center;
      color: #000 !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 6px 4px;
      border-bottom: 1px dashed #999;
      color: #000 !important;
      vertical-align: top;
    }
    td.label { color: #333 !important; width: 45%; }
    td.val { font-weight: bold; text-align: left; direction: ltr; unicode-bidi: embed; }
    .footer {
      margin-top: 14px;
      text-align: center;
      font-size: 11px;
      color: #444 !important;
    }
    @media print {
      body { padding: 5mm; }
      button, .no-print { display: none !important; }
    }
    @page {
      size: auto;
      margin: 8mm;
    }
  </style>
</head>
<body>
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

  // صبر کن تا محتوا کامل لود شود، بعد چاپ
  const doPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error(e);
      toast('خطا در چاپ — دوباره تلاش کنید', 'error');
    }
    // بعد از چند ثانیه iframe را پاک کن
    setTimeout(() => iframe.remove(), 5000);
  };

  // اگر iframe از قبل لود شده
  if (iframe.contentWindow.document.readyState === 'complete') {
    setTimeout(doPrint, 250);
  } else {
    iframe.onload = () => setTimeout(doPrint, 250);
    // fallback اگر onload نیامد
    setTimeout(doPrint, 800);
  }
}
