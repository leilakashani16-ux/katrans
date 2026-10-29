دسته‌بندی مواد + رفع باگ هشدار موجودی
=====================================

فایل‌های مهم:
1) src/index.js          ← Worker (ستون category + احترام به alert_enabled)
2) public/index.html
3) public/js/materials-category.js
4) public/js/alert-fix.js
5) public/js/org-sync.js (اگر از قبل بود)

مراحل:
- این فایل‌ها را در ریپو جایگزین/اضافه کن
- Deploy کامل Worker + Pages (نه فقط static)
- Hard Refresh

دسته‌ها:
food | packaging | cleaning | beverage | admin | other

باگ هشدار:
- قبلاً سوییچ تنظیمات فقط ذخیره می‌شد ولی در محاسبه موجودی نادیده گرفته می‌شد
- الان اگر خاموش باشد وضعیت «هشدار» به «عادی» تبدیل می‌شود (تمام‌شد همچنان نمایش داده می‌شود)
