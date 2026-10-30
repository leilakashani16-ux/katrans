# فیکس: todayProds is not defined

در داشبورد متغیر todayProds قبل از استفاده تعریف نشده بود.
یک خط اضافه شد:
const todayProds = productions.filter(p => p.date === today);

فایل: public/js/bundle.js
Deploy + Hard Refresh
