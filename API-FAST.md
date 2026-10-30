# سرعت لود — بدون آسیب به منطق اپ

## چه کار می‌کند
1. **single-flight**: اگر همزمان ۳ بار settings/chat درخواست شود، فقط **یک** fetch واقعی می‌رود؛ بقیه همان پاسخ را می‌گیرند.
2. **TTL بهتر**: settings تا ۶۰ث · chat تا ۱۲ث · مواد/محصول ۱۵ث (در حافظه مرورگر).
3. **چت**: poll اول بعد از ۸ث و فقط اگر لاگین باشی؛ poll موازی تکراری نمی‌زند.

## چه کار نمی‌کند
- هیچ API ضروری حذف نشده
- ثبت ورود/تولید/حذف دست نخورده
- بعد از add/put/remove همان invalidate قبلی bundle فعال است

## فایل‌ها
- public/js/api-fast.js (جدید — بعد از bundle)
- public/js/chat.js
- public/js/theme-engine.js
- public/index.html · index.html

Deploy + Hard Refresh
