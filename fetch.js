// يجمع خلفيات رمضانية من Pixabay ويكتب public/wallpapers.json.
// يعمل يومياً عبر GitHub Actions — التطبيق يقرأ الملف الناتج بدل أن يطلب من Pixabay مباشرة،
// فيبقى المفتاح سرياً وتبقى الطلبات بضع عشرات في اليوم مهما كثر المستخدمون.
//
// التشغيل محلياً: PIXABAY_API_KEY=... node fetch.js

const fs = require('fs');

const KEY = process.env.PIXABAY_API_KEY;
if (!KEY) {
  console.error('PIXABAY_API_KEY غير مضبوط');
  process.exit(1);
}

const PER_PAGE = 200;
const MIN_SIDE = 1280;
const MAX_PER_CATEGORY = 150;

const BLOCKED = new Set(`
woman women man men girl girls boy boys baby child children kid kids people person portrait face hijab niqab
father mother family couple bride wedding model fashion selfie tourist tourists prayer praying pray hands hand
dervish dervishes whirling sufi drum
christmas halloween pumpkin chinese china japan japanese buddha buddhism temple church cathedral christian
christianity cross hindu diwali pyramid egypt ancient
food dish meal pasta candy sweets cake dessert drink cocktail beer wine sheep animal dog cat bird elephant
icon icons symbol symbols clipart logo flag turkey cartoon character emoji cute chibi kawaii avatar doll outline
sketch blueprint map sign template frame border aladdin genie hookah shisha market bazaar shop souvenir souvenirs store
nude sexy bikini
`.trim().split(/\s+/));

const RAMADAN = ['ramadan', 'ramazan', 'ramadhan', 'kareem', 'mubarak', 'eid', 'iftar', 'suhoor'];
const CONTEXT = [...RAMADAN, 'islamic', 'islam', 'mosque', 'masjid', 'minaret', 'muslim'];

// المفاتيح تطابق WallpaperRepository.Category في التطبيق
const CATEGORIES = {
  ramadan: {
    queries: ['ramadan kareem', 'ramadan mubarak', 'ramadan', 'eid mubarak'],
    must: RAMADAN, context: null,
  },
  lantern: {
    queries: ['ramadan lantern', 'islamic lantern', 'lantern mosque', 'ramadan lamp'],
    must: ['lantern', 'lanterns', 'fanous', 'fanoos', 'lamp'], context: CONTEXT,
  },
  moon: {
    queries: ['ramadan moon', 'ramadan crescent', 'crescent mosque', 'islamic crescent'],
    must: ['crescent', 'moon'], context: CONTEXT,
  },
  mosque: {
    queries: ['mosque night', 'mosque ramadan', 'mosque sunset', 'minaret night'],
    must: ['mosque', 'masjid', 'minaret'], context: null,
  },
};

function acceptable(cat, hit) {
  if (hit.type.startsWith('vector')) return false; // غالبها أيقونات على خلفية بيضاء
  if (Math.max(hit.imageWidth, hit.imageHeight) < MIN_SIDE) return false;
  let must = false;
  let context = !cat.context;
  for (const raw of hit.tags.split(',')) {
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    for (const w of [tag, ...tag.split(' ')]) {
      if (BLOCKED.has(w)) return false;
      if (cat.must.includes(w)) must = true;
      if (cat.context && cat.context.includes(w)) context = true;
    }
  }
  return must && context;
}

async function search(query) {
  const url = `https://pixabay.com/api/?key=${KEY}&image_type=all&safesearch=true&order=popular`
    + `&per_page=${PER_PAGE}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${query}: HTTP ${res.status}`);
  return (await res.json()).hits || [];
}

(async () => {
  const out = { updated: new Date().toISOString(), categories: {} };
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    const found = new Map();
    for (const q of cat.queries) {
      for (const hit of await search(q)) {
        if (found.has(hit.id) || !acceptable(cat, hit)) continue;
        found.set(hit.id, {
          id: `pixabay_${hit.id}`,
          p: hit.webformatURL,
          f: hit.largeImageURL,
          u: hit.user,
          l: hit.pageURL,
          r: +(hit.imageWidth / hit.imageHeight).toFixed(3),
          s: hit.likes + hit.downloads / 100,
        });
      }
    }
    const list = [...found.values()].sort((a, b) => b.s - a.s).slice(0, MAX_PER_CATEGORY);
    list.forEach((x) => delete x.s);
    out.categories[name] = list;
    console.log(`${name}: ${list.length}`);
  }
  if (Object.values(out.categories).every((l) => l.length === 0)) {
    throw new Error('لا نتائج — لن نستبدل الملف المنشور بملف فارغ');
  }
  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/wallpapers.json', JSON.stringify(out));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
