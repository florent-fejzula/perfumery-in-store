// Marks kiosk perfumes as out of stock when every full bottle linked to them is at 0 in the shop app.
//
// Runs every 30 minutes as the scheduled function `stockSync` (index.js) and writes one document,
// collections/stock-status, that the kiosk listens to. The shop database is only read: the function
// runs as stock-sync@perfume-filtering-app, which may only view maison-loyalty.
//
// Locally: SHOP_KEY_FILE=<shop key> KIOSK_KEY_FILE=<kiosk key> node functions/sync-now.js [--dry-run]

import { Firestore, FieldValue } from '@google-cloud/firestore';
import { baseName, isFullBottle, normalize } from './shop-names.js';

export async function syncStock({ dryRun = false } = {}) {
  const shop = new Firestore({ projectId: 'maison-loyalty-5bc38', keyFilename: process.env.SHOP_KEY_FILE });
  const kiosk = new Firestore({ projectId: 'perfume-filtering-app', keyFilename: process.env.KIOSK_KEY_FILE });

  const [productSnap, perfumeSnap] = await Promise.all([
    shop.collection('products').select('name', 'type', 'stockQty', 'active').get(),
    kiosk.collection('perfumes').select('shopBases', 'shopBarcodes').get(),
  ]);
  if (productSnap.empty) throw new Error('The shop returned no products; the stock status was left as it is.');

  // Full bottles only, reachable by barcode and by name-without-size.
  const byBarcode = new Map();
  const byBase = new Map();
  for (const d of productSnap.docs) {
    const p = d.data();
    if (!p.name || !isFullBottle(p)) continue;
    byBarcode.set(d.id, p);
    const base = normalize(baseName(p.name));
    if (!byBase.has(base)) byBase.set(base, new Map());
    byBase.get(base).set(d.id, p);
  }

  // A product without a stock number counts as available: a gap in the data must not gray out a perfume.
  const isOut = (p) => p.active === false || (typeof p.stockQty === 'number' && p.stockQty <= 0);

  const outOfStock = [];
  const unmatched = [];
  let linked = 0;
  for (const d of perfumeSnap.docs) {
    const { shopBases = [], shopBarcodes = [] } = d.data();
    if (!shopBases.length && !shopBarcodes.length) continue; // not linked: shown as available
    linked++;
    const items = new Map();
    for (const id of shopBarcodes) if (byBarcode.has(id)) items.set(id, byBarcode.get(id));
    for (const base of shopBases) for (const [id, p] of byBase.get(normalize(base)) ?? []) items.set(id, p);
    if (!items.size) unmatched.push(d.id);
    else if ([...items.values()].every(isOut)) outOfStock.push(d.id);
  }

  console.log(`Linked ${linked}, out of stock ${outOfStock.length}, no shop product found ${unmatched.length}.`);

  // Normally around a tenth. Half or more means something is off (a stock reset, a renamed field),
  // and graying out most of the shop would be worse than a stale status.
  if (linked && outOfStock.length > linked / 2) {
    throw new Error(`${outOfStock.length} of ${linked} perfumes would be out of stock. That looks like a data problem, so the stock status was not changed.`);
  }

  if (!dryRun) {
    await kiosk.doc('collections/stock-status').set({
      outOfStock: outOfStock.sort(),
      unmatched: unmatched.sort(),
      linked,
      checkedAt: FieldValue.serverTimestamp(),
    });
  }
  return { linked, outOfStock: outOfStock.length, unmatched: unmatched.length };
}
