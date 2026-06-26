/**
 * Creates (or overwrites) the Summer 2026 collection document in Firestore.
 *
 * Usage:
 *   node scripts/seed-summer-collection.mjs
 *
 * Requires scripts/service-account.json to be present.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'service-account.json'), 'utf8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const perfumeNames = [
  'citrus riviera',
  'ege',
  "feel 'n' chill",
  'queen of the sea',
  "sel d'argent",
  'sahara blue',
  'aqua celestia forte',
  'eau de memo',
  'greenley',
  'ocean leather',
  'ashore',
  'carioca heart',
  'cocktail maracuja',
  'sole',
  'severo',
  'osmanthus',
  'cassili',
];

async function main() {
  // Verify which names actually exist in Firestore before writing
  console.log('Checking perfumes in Firestore...\n');

  const snapshot = await db.collection('perfumes').get();
  const allSearchableNames = new Set(
    snapshot.docs.map((d) => d.data().searchableName).filter(Boolean)
  );

  const found = [];
  const missing = [];

  for (const name of perfumeNames) {
    if (allSearchableNames.has(name)) {
      found.push(name);
      console.log(`  ✓ ${name}`);
    } else {
      missing.push(name);
      console.log(`  ✗ NOT FOUND: ${name}`);
    }
  }

  if (missing.length) {
    console.log(`\n⚠️  ${missing.length} perfume(s) not found in Firestore — they will be skipped.`);
  }

  console.log(`\nWriting collection with ${found.length} perfume(s)...`);

  await db.collection('collections').doc('summer-2026').set({
    perfumeNames: found,
    updatedAt: new Date(),
  });

  console.log('✅ Done — collections/summer-2026 is ready.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
