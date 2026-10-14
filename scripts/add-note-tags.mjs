// Adds new "Main Notes" tags to the kiosk and tags the perfumes where that note dominates on Fragrantica.
//
//   node scripts/add-note-tags.mjs <data.json>            dry run
//   node scripts/add-note-tags.mjs <data.json> --write    apply
//   node scripts/add-note-tags.mjs <data.json> --undo --write
//
// The data file (e.g. scripts/data/new-notes-2026-10.json) lists the new tags and, per perfume, only the
// tags it didn't have yet, so --undo removes exactly what was added. The catalog's filter buttons come from
// mainNoteTags in src/app/components/catalog/catalog.component.ts; add the names there too.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WRITE = process.argv.includes('--write');
const UNDO = process.argv.includes('--undo');
if (!file) throw new Error('Usage: node scripts/add-note-tags.mjs <data.json> [--write] [--undo]');

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const data = json(file);
const db = getFirestore(initializeApp({ credential: cert(json(new URL('./service-account.json', import.meta.url))) }));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

console.log(`${WRITE ? 'WRITING' : 'DRY RUN'}${UNDO ? ' (undo)' : ''}: ${data.notes.length} tags, ${data.perfumes.length} perfumes`);
for (const n of data.notes) console.log(`  tag ${n.name}: ${data.perfumes.filter((p) => p.add.includes(n.name)).length} perfumes`);
if (!WRITE) process.exit(0);

const batch = db.batch();
for (const n of data.notes) {
  const ref = db.doc(`tags/${slug(n.name)}`);
  if (UNDO) batch.delete(ref);
  else batch.set(ref, { name: n.name, group: 'note', order: n.order });
}
for (const p of data.perfumes) {
  const ref = db.doc(`perfumes/${p.id}`);
  const tags = (await ref.get()).data().tags ?? [];
  const next = UNDO ? tags.filter((t) => !p.add.includes(t)) : [...new Set([...tags, ...p.add])];
  // `categories` must mirror the whole of `tags`: the catalog filters on it, and older perfumes have only
  // `tags`, so adding to `categories` alone would leave them with just the new tag.
  batch.update(ref, { tags: next, categories: next, updatedAt: FieldValue.serverTimestamp() });
}
await batch.commit();
console.log('Done.');
process.exit(0);
