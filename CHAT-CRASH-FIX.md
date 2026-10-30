# رفع ترکیدن چت (نوشتن undefined)

## علت
`navigate()` این کار را می‌کند:
```js
content.innerHTML = await Pages.chat();
```
نسخهٔ قبلی `Pages.chat` مستقیم `innerHTML` می‌گذاشت و **چیزی return نمی‌کرد** → صفحه فقط می‌نوشت: `undefined`

## اصلاح
`public/js/chat.js` حالا رشتهٔ HTML را **return** می‌کند.

## استقرار
فقط همین فایل را overwrite کنید → Deploy → Hard Refresh
