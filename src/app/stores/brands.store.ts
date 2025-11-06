import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Brand } from '../data/brand.model';

@Injectable({ providedIn: 'root' })
export class BrandsStore {
  private db = inject(Firestore);
  private col = collection(this.db, 'brands');

  private _brands = signal<Brand[]>([]);
  brands = computed(() => this._brands());
  visibleBrands = computed(() =>
    this._brands().filter((b) => b.visible !== false)
  );

  /** Load once into memory (idempotent) */
  async loadOnce() {
    if (this._brands().length) return;
    const q = query(this.col, orderBy('name'));
    const snap = await getDocs(q);
    const items: Brand[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));
    // keep a stable sort by name
    items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this._brands.set(items);
  }

  /** Add brand with slug id; no-op if it exists */
  async addBrand(name: string) {
    const id = slug(name);
    const b: Brand = {
      id,
      name: name.trim(),
      searchableName: name.toLowerCase().trim(),
      visible: true,
    };

    // write to Firestore
    await setDoc(doc(this.col, id), b, { merge: true });

    // ✅ optimistic cache update (avoid re-fetch)
    const exists = this._brands().some((x) => x.id === id);
    const next = exists
      ? this._brands().map((x) => (x.id === id ? { ...x, ...b } : x))
      : [...this._brands(), b];

    next.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this._brands.set(next);
  }

  /** Toggle a single brand's visibility — optimistic update */
  async setVisible(id: string, visible: boolean) {
    // ✅ optimistic local update
    this._brands.set(
      this._brands().map((b) => (b.id === id ? { ...b, visible } : b))
    );

    try {
      await updateDoc(doc(this.col, id), {
        visible,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      // optional: rollback on error
      this._brands.set(
        this._brands().map((b) =>
          b.id === id ? { ...b, visible: !visible } : b
        )
      );
      throw e;
    }
  }

  /** Bulk toggle all brands — optimistic update + batch write */
  async setAllVisible(visible: boolean) {
    const prev = this._brands();

    // ✅ optimistic local update (so UI flips instantly)
    this._brands.set(prev.map((b) => ({ ...b, visible })));

    try {
      const batch = writeBatch(this.db);
      const now = serverTimestamp();
      for (const b of prev) {
        batch.update(doc(this.col, b.id), { visible, updatedAt: now });
      }
      await batch.commit();
    } catch (e) {
      // rollback on error
      this._brands.set(prev);
      throw e;
    }
  }

  /** Bulk toggle specific brands — useful if you need per-subset control */
  async setManyVisible(ids: string[], visible: boolean) {
    const idSet = new Set(ids);
    const prev = this._brands();

    // ✅ optimistic local update
    this._brands.set(
      prev.map((b) => (idSet.has(b.id) ? { ...b, visible } : b))
    );

    try {
      const batch = writeBatch(this.db);
      const now = serverTimestamp();
      for (const id of idSet) {
        batch.update(doc(this.col, id), { visible, updatedAt: now });
      }
      await batch.commit();
    } catch (e) {
      // rollback on error
      this._brands.set(prev);
      throw e;
    }
  }
}

/** very small slug helper */
function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
