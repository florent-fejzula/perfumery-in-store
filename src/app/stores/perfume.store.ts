import { Injectable, signal } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

export type Perfume = {
  id: string;
  name: string;
  imageUrl: string;
  categories: string[];

  // brand linkage (new)
  brandId?: string | null;
  brandName?: string | null;

  // legacy/optional (keep if you already store it)
  brand?: string;

  searchableName: string;

  description?: string;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  extraImages?: string[];
};

@Injectable({ providedIn: 'root' })
export class PerfumeStore {
  private loading = signal(false);
  private loaded = signal(false);
  perfumes = signal<Perfume[]>([]);

  constructor(private fs: Firestore) {}

  async loadOnce() {
    if (this.loaded()) return;
    if (this.loading()) return;
    this.loading.set(true);

    const snap = await getDocs(collection(this.fs, 'perfumes'));
    const rows: Perfume[] = snap.docs
      .map((d) => {
        const x: any = d.data();
        return {
          id: d.id,
          name: x.name,
          imageUrl: x.imageUrl ?? x.image ?? '',
          categories: x.categories ?? x.tags ?? [],

          // ✅ read brand linkage
          brandId: x.brandId ?? null,
          brandName: x.brandName ?? x.brand ?? null, // fall back to legacy 'brand'

          brand: x.brand,
          description: x.description,
          topNotes: x.topNotes ?? [],
          heartNotes: x.heartNotes ?? [],
          baseNotes: x.baseNotes ?? [],
          extraImages: x.extraImages ?? [],
          searchableName: (x.searchableName ?? x.name ?? '').toLowerCase(),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    this.perfumes.set(rows);
    this.loaded.set(true);
    this.loading.set(false);

    // Warm image cache (non-blocking)
    queueMicrotask(() => this.warmImages(rows));
  }

  private warmImages(rows: Perfume[]) {
    for (const p of rows) {
      if (p.imageUrl) {
        const img = new Image();
        img.decoding = 'async';
        img.src = p.imageUrl;
      }
      if (p.extraImages?.length) {
        for (const u of p.extraImages) {
          const i = new Image();
          i.decoding = 'async';
          i.src = u;
        }
      }
    }
  }
}
