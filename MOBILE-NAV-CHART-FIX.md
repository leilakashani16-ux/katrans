# رفع نوار دوبل موبایل + انیمیشن نمودار بعد از ورق

## مشکلات
1. **دو نوار پایین روی موبایل**: سایدبار در `@media (max-width: 768px)` به نوار افقی پایین تبدیل می‌شد و هم‌زمان `#te-bottom-nav` هم نمایش داده می‌شد → دو نوار روی هم.
2. **انیمیشن دونات‌ها بعد از ورق خودکار قطع می‌شد**: `applyDashChartPeriod` با `innerHTML` نمودارها را عوض می‌کرد و اسپینرهای `requestAnimationFrame` به المان‌های قدیمی وصل می‌ماندند.

## تغییرات
- `public/index.html` و `index.html`: در موبایل `#sidebar` با `display: none` مخفی شد (نوار بزرگ حذف).
- `public/css/ui-final.css`: قانون `@media (max-width: 1023px)` برای مخفی کردن سایدبار (هم‌تراز با نوار te).
- `public/js/pages.js` + `public/js/bundle.js` + نسخه‌های ریشه: بعد از ورق، `UiFinal.enhanceDonuts()` دوباره صدا زده می‌شود.
- `public/js/ui-final.js`: MutationObserver وقتی `#dash-charts` عوض شود، انیمیشن را برمی‌گرداند.

## استقرار
محتوای این زیپ را روی ریپو بریزید و در Cloudflare Workers دوباره Deploy کنید (یا `npx wrangler deploy`).
