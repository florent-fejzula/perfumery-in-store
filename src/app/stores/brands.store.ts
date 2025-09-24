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
    await setDoc(doc(this.col, id), b, { merge: true });
    // update cache (avoid re-fetch)
    const exists = this._brands().some((x) => x.id === id);
    this._brands.set(
      exists
        ? this._brands().map((x) => (x.id === id ? b : x))
        : [...this._brands(), b]
    );
  }

  async setVisible(id: string, visible: boolean) {
    await updateDoc(doc(this.col, id), { visible });
    this._brands.set(
      this._brands().map((b) => (b.id === id ? { ...b, visible } : b))
    );
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
