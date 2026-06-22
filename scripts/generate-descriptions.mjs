/**
 * Batch-generates artistic perfume descriptions via Claude API
 * and writes them back to Firestore.
 *
 * Setup:
 *   1. npm install firebase-admin @anthropic-ai/sdk --save-dev
 *   2. Download a Firebase service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *      Save it as scripts/service-account.json
 *   3. Set your Anthropic API key:
 *      $env:ANTHROPIC_API_KEY = "sk-ant-..."   (PowerShell)
 *      export ANTHROPIC_API_KEY="sk-ant-..."   (bash)
 *
 * Usage:
 *   npm run generate:descriptions            → generate for all missing descriptions
 *   npm run generate:descriptions -- --all   → regenerate for every perfume
 *   npm run generate:descriptions -- --dry   → preview without writing to Firestore
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');
const REGENERATE_ALL = args.includes('--all');

// ── Firebase Admin ────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'service-account.json'), 'utf8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Anthropic ─────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateDescription(name, brand, tags) {
  const brandLine = brand ? ` by ${brand}` : '';
  const tagLine = tags.length ? `It is tagged as: ${tags.join(', ')}.` : '';

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [
      {
        role: 'user',
        content:
          `Write a 2-sentence artistic description for the perfume "${name}"${brandLine}. ` +
          `${tagLine} ` +
          `Evoke a specific mood, place, or sensory memory — not a generic perfume feeling. ` +
          `Be concrete and surprising. Vary your sentence structure. ` +
          `FORBIDDEN words and phrases (do not use any of these): ` +
          `whisper, unfolds, journey, tapestry, symphony, dance, embrace, veil, linger, ` +
          `beckons, envelops, captivating, alluring, intoxicating, sensual, essence of, ` +
          `olfactory, reminiscent of, like a, as if. ` +
          `Output only the description, no quotes, no preamble.`,
      },
    ],
  });

  return response.content[0].text.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('🔍 DRY RUN — nothing will be written to Firestore.\n');

  console.log('Fetching perfumes from Firestore...');
  const snapshot = await db.collection('perfumes').get();

  const perfumes = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((p) => REGENERATE_ALL || !p.description);

  if (perfumes.length === 0) {
    console.log('All perfumes already have descriptions. Use --all to regenerate.');
    return;
  }

  console.log(
    `${perfumes.length} perfume(s) to process` +
    (REGENERATE_ALL ? ' (--all mode)' : ' (missing descriptions only)') +
    '.\n'
  );

  let processed = 0;
  let errors = 0;

  for (const perfume of perfumes) {
    const label = `[${processed + errors + 1}/${perfumes.length}] ${perfume.name}`;
    try {
      const brand = perfume.brandName || perfume.brand || '';
      const tags = perfume.categories || [];

      process.stdout.write(`${label} ... `);
      const description = await generateDescription(perfume.name, brand, tags);

      if (!DRY_RUN) {
        await db.collection('perfumes').doc(perfume.id).update({
          description,
          updatedAt: new Date(),
        });
      }

      console.log(`✓\n  "${description}"\n`);
      processed++;

      // Brief pause to stay comfortably within API rate limits
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}\n`);
      errors++;
    }
  }

  console.log(`Done. ${processed} generated, ${errors} error(s).`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
