// Links kiosk perfumes to the shop app's products (maison-loyalty `products`) for the stock sync
// (functions/sync-stock.js). Each perfume gets:
//   shopBases     product names without size, e.g. "MARLY Delina edp", so a new size is picked up
//   shopBarcodes  the products' barcodes, so a product renamed in the shop stays linked
//
//   SHOP_KEY_FILE=<maison-loyalty service account> node scripts/link-shop-products.mjs [--all] [--write]
//
// Only perfumes without a link are looked at, unless --all. Dry run unless --write. The shop is only read.
// Names that don't match on their own go in OVERRIDES.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { baseName, isTesterOrSample, normalize } from '../functions/shop-names.js';

const ALL = process.argv.includes('--all');
const WRITE = process.argv.includes('--write');
if (!process.env.SHOP_KEY_FILE) throw new Error('Set SHOP_KEY_FILE to the maison-loyalty service account JSON.');

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const kiosk = getFirestore(initializeApp({ credential: cert(json(new URL('./service-account.json', import.meta.url))) }, 'kiosk'));
const shop = getFirestore(initializeApp({ credential: cert(json(process.env.SHOP_KEY_FILE)) }, 'shop'));

/** Kiosk brand id -> the shop's `brand` value. */
const BRAND = {
  amouage: 'AMOUAGE', 'anomalia-paris': 'ANOMALIA', bdk: 'BDK', birkholz: 'BIRKHOLZ', 'bon-parfumeur': 'BON PARFUMEUR',
  'd-orsay': "D'ORSAY", diptyque: 'DIPTYQUE', electimus: 'ELECTIMUSS', 'ex-nihilo': 'EX NIHILO', fomowa: 'FOMOWA',
  'frederic-malle': 'FREDERIC MALLE', fugazzi: 'FUGAZZI', 'giardini-di-toscana': 'G.TOSCANA', initio: 'INITIO',
  'jacques-zolty': 'JACQUES ZOLTY', jeroboam: 'JEROBOAM', jusbox: 'JUSBOX', 'le-labo': 'LE LABO',
  'les-eaux-primordiales': 'LES EAUX PRIMORDIALES', 'maison-francis-kurkdijan': 'MFK', 'marc-antoine-barrois': 'MAB',
  'matiere-premiere': 'MATIERE PREMIERE', 'memo-paris': 'MEMO', moresque: 'MORESQUE', 'new-notes': 'NEW NOTES',
  nishane: 'NISHANE', ormaie: 'ORMAIE', 'ormonde-jayne': 'ORMONDE JAYNE', 'parfums-de-marly': 'PARFUMS DE MARLY',
  'perroy-parfum': 'PERROY', 'room-1015': 'ROOM 1015', 'sora-dora': 'SORA DORA', 'spirit-of-kings': 'SPIRIT OF KINGS',
  'stephane-humbert-lucas': 'STEPHANE HUMBERT LUCAS', thameen: 'THAMEEN', xerjoff: 'XERJOFF',
};

/** "brandId|kiosk name" -> shop names without brand code and size, matched exactly. */
const OVERRIDES = {
  'maison-francis-kurkdijan|Baccarat Rouge 540': ['Baccarat Rouge edp'],
  'maison-francis-kurkdijan|Baccarat Rouge 540 Extrait': ['Baccarat Rouge Extrait'],
  'maison-francis-kurkdijan|l’Homme À la Rose': ['A la Rose l’Homme edp'],
  'amouage|Interlude 53': ['Interlude Man 53 Extrait'],
  'amouage|Interlude Black Iris': ['Interlude Man Black Iris'],
  'nishane|Hesperide Colognise': ['Colognise Hesperide Extrait'],
  'nishane|Safran Colognise': ['Colognise Safran Extrait'],
  'les-eaux-primordiales|Abstraction Raisonnée': ['Abstraction Raisonee'],
  'frederic-malle|Rose Tonnerre': ['Rose Tonnere'],
  'ormonde-jayne|Montabaco Verano': ['Verano'],
  "ormonde-jayne|Ta'if": ['Taif'],
  'diptyque|Do Son edp': ['EDP Do Son (Coffret)'],
  'diptyque|Do Son edt': ['EDT Do Son'],
  'diptyque|Philosykos edp': ['EDP Philosykos (Coffret)'],
  'diptyque|Philosykos edt': ['EDT Philosykos'],
  "d-orsay|Jusqu'à Toi P.S.": ['P.S. Jusqu’a Toi', 'P.S. Juscu’a Toi'],
};

// The same perfume whatever the concentration label, box, edition or SHL prefix says.
const CONCENTRATION = /\b(edp|edt|edc|eau de parfum|eau de toilette|eau de cologne)\b/g;
const matchKey = (s) =>
  normalize(s)
    .replace(/^shl /, '')
    .replace(/\bextrait de parfum\b/g, 'extrait')
    .replace(/\b(coffret|ltd edition|limited edition)\b/g, ' ')
    .replace(CONCENTRATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ new$/, '');

// Each shop brand starts its product names with the same code ("MARLY", "KURKDJIAN", "S.KINGS"):
// the longest prefix that at least 80% of its names share.
function brandCodes(products) {
  const byBrand = {};
  for (const p of products) (byBrand[p.brand] ||= []).push(p.name.split(/\s+/));
  const codes = {};
  for (const [brand, names] of Object.entries(byBrand)) {
    const counts = {};
    for (const words of names)
      for (let n = 1; n <= Math.min(3, words.length - 1); n++) {
        const prefix = words.slice(0, n).join(' ');
        counts[prefix] = (counts[prefix] || 0) + 1;
      }
    codes[brand] = Object.keys(counts).filter((k) => counts[k] >= names.length * 0.8).sort((a, b) => b.length - a.length)[0] ?? '';
  }
  return codes;
}

const products = (await shop.collection('products').select('name', 'brand', 'type').get()).docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((p) => p.name && p.brand && !isTesterOrSample(p));
const codes = brandCodes(products);

// Group by name-without-size: "MARLY Delina edp" -> its 30ml and 75ml.
const bases = new Map();
for (const p of products) {
  const base = baseName(p.name);
  if (!bases.has(base)) {
    const code = codes[p.brand];
    let core = base.toUpperCase().startsWith(code.toUpperCase() + ' ') ? base.slice(code.length + 1) : base;
    if (p.brand === 'MFK') core = core.replace(/^KURKD\w+\s+/i, ''); // one product spells it KURKDIJAN
    bases.set(base, { base, brand: p.brand, core, barcodes: [] });
  }
  bases.get(base).barcodes.push(p.id);
}

// The shop names recorded when the October 2026 batch was imported.
const imported = json(new URL('./data/missing-perfumes-2026-10.json', import.meta.url)).perfumes;

const perfumes = (await kiosk.collection('perfumes').select('name', 'brandId', 'shopBases').get()).docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((p) => ALL || !p.shopBases?.length);

const links = [];
const unmatched = [];
for (const perfume of perfumes) {
  const pool = [...bases.values()].filter((b) => b.brand === BRAND[perfume.brandId]);
  const override = OVERRIDES[`${perfume.brandId}|${perfume.name}`];
  let hits;
  if (override) {
    const wanted = override.map(normalize);
    hits = pool.filter((b) => wanted.includes(normalize(b.core)));
  } else {
    const fromImport = imported.find((x) => x.name === perfume.name && x.brandId === perfume.brandId);
    const wanted = (fromImport ? fromImport.shopNames.split(';') : [perfume.name]).map(matchKey);
    hits = pool.filter((b) => wanted.includes(matchKey(b.core)));
    // The shop sometimes adds the concentration: "Colognise" is "Colognise Extrait" there.
    if (!hits.length) hits = pool.filter((b) => wanted.some((w) => [`${w} extrait`, `${w} parfum`].includes(matchKey(b.core))));
  }
  if (!hits.length) unmatched.push(perfume);
  else links.push({ perfume, shopBases: hits.map((h) => h.base), shopBarcodes: hits.flatMap((h) => h.barcodes) });
}

console.log(`${WRITE ? 'WRITING' : 'DRY RUN'}: ${perfumes.length} perfumes looked at, ${links.length} linked, ${unmatched.length} not matched.`);
for (const l of links.filter((l) => l.shopBases.length > 1)) console.log(`  several: ${l.perfume.name} => ${l.shopBases.join(' + ')}`);
for (const p of unmatched) console.log(`  NOT MATCHED: ${p.brandId} | ${p.name}  (add to OVERRIDES)`);

if (WRITE) {
  for (let i = 0; i < links.length; i += 400) {
    const batch = kiosk.batch();
    for (const l of links.slice(i, i + 400)) {
      batch.update(kiosk.doc(`perfumes/${l.perfume.id}`), { shopBases: l.shopBases, shopBarcodes: l.shopBarcodes });
    }
    await batch.commit();
  }
  console.log(`Saved ${links.length} links.`);
}
process.exit(0);
