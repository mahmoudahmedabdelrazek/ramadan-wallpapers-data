# ramadan-wallpapers-data

بيانات خلفيات تطبيق «إمساكية رمضان».

يعمل `fetch.js` مرتين يومياً عبر GitHub Actions: يبحث في Pixabay، يفلتر بالوسوم (فوانيس، هلال، مساجد، رمضان كريم)،
وينشر النتيجة على GitHub Pages:

https://mahmoudahmedabdelrazek.github.io/ramadan-wallpapers-data/wallpapers.json

مفتاح Pixabay محفوظ في Secrets باسم `PIXABAY_API_KEY` ولا يظهر في الكود.
التشغيل اليدوي: تبويب Actions ← «Update wallpapers» ← Run workflow.
