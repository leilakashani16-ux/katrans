# دیپلوی — نسخه نهایی (Workers + Assets)

این ساختار دقیقاً همان چیزی است که خطای Cloudflare خواست:
`[assets] directory = "./public"`

## روش ۱: از داشبورد Cloudflare (پیشنهادی)

1. کل پوشه را به GitHub پوش کن (محتویات `kitchen-app` باید ریشه ریپو باشد)
2. Cloudflare → **Workers & Pages** → Create → **Create Worker**  
   یا اگر Pages می‌سازی: Framework **None**، Build command **خالی**
3. اگر از Git برای **Worker** وصل می‌کنی، Deploy command پیش‌فرض `npx wrangler deploy` است — الان با wrangler.toml درست کار می‌کند
4. بعد از دیپلوی موفق:
   - Settings → **Bindings** → Add → **D1**
   - Variable name: **`DB`**
   - Database: یکی بساز به نام `kitchen-inventory`
5. Save و یک بار دیگر Deploy

## روش ۲: از ترمینال

```bash
npm install
npx wrangler login
npx wrangler d1 create kitchen-inventory
# database_id را در wrangler.toml در بخش [[d1_databases]] بگذار
npx wrangler deploy
```

## تست
- سایت: `https://kitchen-app.YOUR_SUBDOMAIN.workers.dev`
- API: `https://....workers.dev/api/health` → باید `{"ok":true}` بدهد

## ورود اولیه (بعداً عوض کن)
admin / admin123
