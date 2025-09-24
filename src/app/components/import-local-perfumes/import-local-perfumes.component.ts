import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Firestore, doc, getDoc, setDoc, serverTimestamp, collection } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

// 1) Bring your existing local data
import { perfumes as localPerfumes } from '../../data/perfumes';

// 2) (Optional) Your current tag lists to seed Firestore `tags`
const genderTags = ['male', 'female'];
const scentFamilyTags = [
  'fresh','floral','fruity','tropical','woody','spicy','leather','sweet','creamy','gourmand',
  'aquatic','clean','ozonic','green','musky','powdery','white floral','aldehydic','oriental',
  'animalic','smoky','earthy',
];
const mainNoteTags = [
  'vanilla','sandalwood','tobacco','mango','tuberose','jasmine','mineral','amber','oud','citrus',
  'tea','rose','lavender','vetiver','coconut','boozy','patchouli','iris','neroli','cherry',
  'almond','saffron','cinnamon','ylang-ylang','mint',
];

type PerfumeIn = {
  id: number | string;
  name: string;
  description?: string;
  image: string;            // e.g. "assets/BeatCafe.jpg"
  categories: string[];     // we map this to Firestore "tags"
};

type PerfumeOut = {
  name: string;
  tags: string[];
  imageUrl: string;
  imagePath: string;
  searchableName: string;
  createdAt: any;
  updatedAt: any;
  // optional future fields:
  // brand?: string;
  // line?: string;
};

@Component({
  selector: 'app-import-local-perfumes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './import-local-perfumes.component.html',
  styleUrls: ['./import-local-perfumes.component.scss'],
})
export class ImportLocalPerfumesComponent {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  // UI state
  running = signal(false);
  overwrite = signal(false);
  logs = signal<string[]>([]);
  doneCount = signal(0);
  failCount = signal(0);
  total = localPerfumes.length;

  progress = computed(() => {
    const done = this.doneCount();
    return Math.round((done / this.total) * 100);
  });

  clearLogs() {
    this.logs.set([]);
    this.doneCount.set(0);
    this.failCount.set(0);
  }

  log(line: string) {
    this.logs.update((arr) => [...arr, line]);
  }

  async seedTags() {
    this.running.set(true);
    this.clearLogs();

    try {
      const tagsCol = collection(this.firestore, 'tags');

      const writeTag = async (name: string, group: string, order?: number) => {
        const id = this.slugify(name);
        await setDoc(doc(tagsCol, id), { name, group, order: order ?? null });
        this.log(`Tag seeded: ${name} (${group})`);
      };

      for (let i = 0; i < genderTags.length; i++) {
        await writeTag(genderTags[i], 'gender', i + 1);
      }
      for (let i = 0; i < scentFamilyTags.length; i++) {
        await writeTag(scentFamilyTags[i], 'family', i + 1);
      }
      for (let i = 0; i < mainNoteTags.length; i++) {
        await writeTag(mainNoteTags[i], 'note', i + 1);
      }

      this.log('✅ Tags seeded to Firestore.');
    } catch (e: any) {
      this.log(`❌ Tag seeding failed: ${e?.message || e}`);
    } finally {
      this.running.set(false);
    }
  }

  async importPerfumes() {
    this.running.set(true);
    this.clearLogs();

    for (const p of localPerfumes as PerfumeIn[]) {
      try {
        await this.importOne(p, this.overwrite());
        this.doneCount.set(this.doneCount() + 1);
      } catch (e: any) {
        this.failCount.set(this.failCount() + 1);
        this.log(`❌ ${p.name}: ${e?.message || e}`);
      }
    }

    this.running.set(false);
    this.log(`Finished. ✅ ${this.doneCount()} ok, ❌ ${this.failCount()} failed.`);
  }

  private async importOne(p: PerfumeIn, overwrite: boolean) {
    const id = String(p.id);

    // 1) Check if doc exists
    const docRef = doc(this.firestore, 'perfumes', id);
    const existing = await getDoc(docRef);
    if (existing.exists() && !overwrite) {
      this.log(`⏭️ Skipped existing: ${p.name} (#${id})`);
      return;
    }

    // 2) Fetch the local asset image as Blob
    const assetUrl = p.image.startsWith('/') ? p.image : `/${p.image}`;
    const resp = await fetch(assetUrl);
    if (!resp.ok) {
      throw new Error(`Image fetch failed: ${assetUrl} (${resp.status})`);
    }
    const blob = await resp.blob();

    // 3) Upload to Storage
    const ext = this.extFromUrl(p.image) || this.extFromMime(blob.type) || 'jpg';
    const imagePath = `images/perfumes/${id}.${ext}`;
    const sref = ref(this.storage, imagePath);
    await uploadBytes(sref, blob, { contentType: blob.type || `image/${ext}` });
    const imageUrl = await getDownloadURL(sref);

    // 4) Write Firestore doc
    const out: PerfumeOut = {
      name: p.name,
      tags: p.categories ?? [],
      imageUrl,
      imagePath,
      searchableName: p.name.toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, out);
    this.log(`✅ Imported: ${p.name} (#${id})`);
  }

  private slugify(s: string) {
    return s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extFromUrl(url: string): string | null {
    const q = url.split('?')[0];
    const i = q.lastIndexOf('.');
    if (i < 0) return null;
    return q.substring(i + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || null;
  }

  private extFromMime(mime: string | undefined): string | null {
    if (!mime) return null;
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return null;
  }
}
