/**
 * Adds the perfumes listed in scripts/data/missing-perfumes-2026-10.json to Firestore:
 * creates any brands that don't exist yet, uploads each bottle image to Storage and
 * writes the perfume document (same shape the Add Perfume page writes).
 *
 * Usage:
 *   node scripts/import-missing-perfumes.mjs           → dry run, nothing is written
 *   node scripts/import-missing-perfumes.mjs --write   → write to Firestore + Storage
 *   node scripts/import-missing-perfumes.mjs --undo    → delete everything this batch added
 *
 * Perfumes whose name already exists in Firestore are skipped, so --write can be re-run.
 * Requires scripts/service-account.json to be present.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const UNDO = args.includes('--undo');

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'service-account.json'), 'utf8')
);
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
});
const db = getFirestore();
const bucket = getStorage().bucket();

const data = JSON.parse(
  readFileSync(join(__dirname, 'data', 'missing-perfumes-2026-10.json'), 'utf8')
);

async function uploadImage(sourceUrl, docId) {
  const resp = await fetch(sourceUrl);
  if (!resp.ok) throw new Error(`Image fetch failed: ${sourceUrl} (${resp.status})`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const imagePath = `images/perfumes/${docId}.${ext}`;
  const token = randomUUID();

  await bucket.file(imagePath).save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  const imageUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    `${encodeURIComponent(imagePath)}?alt=media&token=${token}`;
  return { imageUrl, imagePath };
}

async function undo() {
  const perfumes = await db.collection('perfumes').where('importBatch', '==', data.batch).get();
  const brands = await db.collection('brands').where('importBatch', '==', data.batch).get();
  console.log(`Batch "${data.batch}": ${perfumes.size} perfume(s), ${brands.size} brand(s).`);
  if (!WRITE) {
    console.log('Dry run — add --write to actually delete them.');
    return;
  }
  for (const d of perfumes.docs) {
    const { imagePath } = d.data();
    if (imagePath) await bucket.file(imagePath).delete({ ignoreNotFound: true });
    await d.ref.delete();
  }
  for (const d of brands.docs) await d.ref.delete();
  console.log('✅ Deleted.');
}

async function main() {
  if (UNDO) return undo();
  if (!WRITE) console.log('🔍 DRY RUN — nothing will be written. Add --write to import.\n');

  const [perfumeSnap, brandSnap] = await Promise.all([
    db.collection('perfumes').get(),
    db.collection('brands').get(),
  ]);
  const existingNames = new Set(
    perfumeSnap.docs.map((d) => (d.data().searchableName ?? d.data().name ?? '').toLowerCase())
  );
  const existingBrands = new Set(brandSnap.docs.map((d) => d.id));

  // 1) Brands
  for (const b of data.brands) {
    if (existingBrands.has(b.id)) continue;
    console.log(`+ brand ${b.name} (${b.id})`);
    if (WRITE) {
      await db.collection('brands').doc(b.id).set({
        id: b.id,
        name: b.name,
        searchableName: b.name.toLowerCase(),
        visible: true,
        importBatch: data.batch,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 2) Perfumes
  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const p of data.perfumes) {
    const searchableName = p.name.toLocaleLowerCase();
    if (existingNames.has(searchableName)) {
      console.log(`⏭️  exists: ${p.name}`);
      skipped++;
      continue;
    }
    const label = `${p.brandName} — ${p.name} [${p.tags.join(', ')}]`;
    if (!WRITE) {
      console.log(`+ ${label}`);
      added++;
      continue;
    }
    try {
      const ref = db.collection('perfumes').doc();
      const { imageUrl, imagePath } = await uploadImage(p.image, ref.id);
      await ref.set({
        name: p.name,
        tags: p.tags,
        categories: p.tags,
        imageUrl,
        imagePath,
        searchableName,
        brandId: p.brandId,
        brandName: p.brandName,
        description: p.description ?? '',
        importBatch: data.batch,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      existingNames.add(searchableName);
      console.log(`✓ ${label}`);
      added++;
    } catch (err) {
      console.log(`✗ ${p.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(
    `\n${WRITE ? 'Added' : 'Would add'} ${added}, skipped ${skipped} existing` +
      (failed ? `, ${failed} failed` : '') +
      '.'
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
