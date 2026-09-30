/**
 * demoCatalog — the offline demo agent's fallback shelf.
 *
 * DEMO ONLY.  Used by demoTransport when the host page does not answer a
 * `catalog.search` action (a bare embed with no store behind it).  When the
 * host answers, the host's catalog wins.  Every row is tagged
 * `source: 'demo-synthetic'` so it can never be mistaken for store data.
 * Images are generated SVG tiles (no network, no binaries).
 */

const TILE = {
  Dairy: ['#e6f7f6', '#00736d'],
  Bakery: ['#fff4e5', '#8a4b00'],
  Staples: ['#f3efe6', '#5b4a2a'],
  Produce: ['#eaf7ea', '#1f6b2a'],
  Snacks: ['#fdecec', '#9b1c3a'],
  Beverages: ['#e9f0ff', '#1d4ed8'],
};

export function tileImage(glyph, category) {
  const [bg, fg] = TILE[category] || TILE.Staples;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">`
    + `<defs><radialGradient id="g" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#ffffff"/>`
    + `<stop offset="1" stop-color="${bg}"/></radialGradient></defs>`
    + `<rect width="320" height="200" rx="18" fill="url(#g)"/>`
    + `<circle cx="160" cy="100" r="62" fill="${fg}" fill-opacity="0.08"/>`
    + `<text x="160" y="124" font-size="72" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${glyph}</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function p(sku, name, price, category, glyph, tags, rating) {
  return {
    sku, product_id: sku, name, price, currency: 'INR', category,
    image: tileImage(glyph, category), rating, tags,
    source: 'demo-synthetic',
  };
}

export const DEMO_PRODUCTS = Object.freeze([
  p('MLK-AAV-500', 'Aavin Full Cream Milk 500 ml', 30, 'Dairy', '🥛', ['milk', 'full cream'], 4.6),
  p('MLK-AMT-500', 'Amul Taaza Toned Milk 500 ml', 27, 'Dairy', '🥛', ['milk', 'toned'], 4.4),
  p('PNR-AMU-200', 'Amul Fresh Paneer 200 g', 90, 'Dairy', '🧀', ['paneer', 'cottage cheese'], 4.5),
  p('PNR-MLM-200', 'Milky Mist Paneer 200 g', 95, 'Dairy', '🧀', ['paneer', 'cottage cheese'], 4.7),
  p('BTR-AMU-100', 'Amul Butter 100 g', 56, 'Dairy', '🧈', ['butter'], 4.8),
  p('CRD-MTD-400', 'Mother Dairy Curd 400 g', 35, 'Dairy', '🥣', ['curd', 'dahi', 'yogurt'], 4.3),
  p('BRD-BRT-400', 'Britannia Brown Bread 400 g', 50, 'Bakery', '🍞', ['bread', 'brown bread'], 4.2),
  p('EGG-FRM-6', 'Farm Fresh Eggs (6 pcs)', 48, 'Produce', '🥚', ['egg', 'eggs'], 4.4),
  p('TOM-LOC-1K', 'Tomato (Local) 1 kg', 40, 'Produce', '🍅', ['tomato', 'thakkali'], 4.1),
  p('ONI-LOC-1K', 'Onion 1 kg', 35, 'Produce', '🧅', ['onion', 'vengayam'], 4.2),
  p('ATA-ASH-5K', 'Aashirvaad Whole Wheat Atta 5 kg', 265, 'Staples', '🌾', ['atta', 'wheat flour'], 4.6),
  p('RCE-SNM-5K', 'Sona Masoori Rice 5 kg', 340, 'Staples', '🍚', ['rice', 'sona masoori'], 4.5),
  p('DAL-TUR-1K', 'Toor Dal 1 kg', 160, 'Staples', '🫘', ['dal', 'toor', 'lentils'], 4.4),
  p('COF-NAR-200', "Narasu's Filter Coffee 200 g", 120, 'Beverages', '☕', ['coffee', 'filter coffee'], 4.7),
]);

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function singular(w) {
  return w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
}

/** Deterministic ranked search: name/tag token hits, then catalogue order. */
export function searchDemoCatalog(query, limit = 3) {
  const words = norm(query).split(' ').filter(Boolean).map(singular);
  if (words.length === 0) return [];
  const scored = DEMO_PRODUCTS.map((prod, i) => {
    const hay = norm(`${prod.name} ${prod.tags.join(' ')} ${prod.category}`).split(' ').map(singular);
    let score = 0;
    words.forEach((w) => {
      if (hay.includes(w)) score += 3;
      else if (hay.some((h) => h.startsWith(w) || w.startsWith(h))) score += 1;
    });
    return {prod, score, i};
  }).filter((x) => x.score > 0);
  scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  return scored.slice(0, limit).map((x) => x.prod);
}

const CATEGORY_WORDS = [
  ['Dairy', ['milk', 'butter', 'paneer', 'curd', 'dahi', 'cheese', 'ghee', 'cream']],
  ['Bakery', ['bread', 'bun', 'cake', 'rusk']],
  ['Staples', ['atta', 'rice', 'dal', 'flour', 'sugar', 'salt', 'oil']],
  ['Produce', ['tomato', 'onion', 'potato', 'egg', 'banana', 'apple']],
  ['Snacks', ['chips', 'biscuit', 'namkeen', 'murukku', 'chocolate']],
  ['Beverages', ['coffee', 'tea', 'juice', 'water', 'soda']],
];

const GLYPH = {
  Dairy: '🧈', Bakery: '🍞', Staples: '🌾', Produce: '🥬', Snacks: '🍪', Beverages: '☕',
};

export function inferCategory(name) {
  const words = norm(name).split(' ').map(singular);
  const hit = CATEGORY_WORDS.find(([, keys]) => keys.some((k) => words.includes(k)));
  return hit ? hit[0] : 'Staples';
}

export function categoryGlyph(category) {
  return GLYPH[category] || '🛍️';
}
