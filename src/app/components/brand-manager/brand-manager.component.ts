import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

import {
  Firestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp,
} from '@angular/fire/firestore';

import { BrandsStore } from '../../stores/brands.store';
import { Perfume, PerfumeStore } from '../../stores/perfume.store';

@Component({
  selector: 'app-brand-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './brand-manager.component.html',
  styleUrls: ['./brand-manager.component.scss'],
})
export class BrandManagerComponent {
  private fb = inject(FormBuilder);
  private db = inject(Firestore);
  private brandsStore = inject(BrandsStore);
  private perfumeStore = inject(PerfumeStore);

  constructor() {
    this.brandsStore.loadOnce();
    this.perfumeStore.loadOnce?.();
  }

  // Stores → signals
  brands = this.brandsStore.brands;
  visibleBrands = this.brandsStore.visibleBrands;
  perfumes = computed<Perfume[]>(() => this.perfumeStore.perfumes?.() ?? []);
  unassigned = computed(() => this.perfumes().filter((p) => !p.brandId));

  // UI state
  busy = signal(false);
  toast = signal<string | null>(null);

  // Forms
  brandForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  assignForm = this.fb.group({
    brandId: ['', Validators.required],
    search: [''],
    onlyUnassigned: [true],
  });

  // Bridge form controls → signals so UI reacts instantly
  private searchSig = toSignal(
    this.assignForm.controls.search.valueChanges.pipe(
      startWith(this.assignForm.controls.search.value ?? '')
    ),
    { initialValue: this.assignForm.controls.search.value ?? '' }
  );

  private onlyUnassignedSig = toSignal(
    this.assignForm.controls.onlyUnassigned.valueChanges.pipe(
      startWith(this.assignForm.controls.onlyUnassigned.value ?? true)
    ),
    {
      initialValue: (this.assignForm.controls.onlyUnassigned.value ??
        true) as boolean,
    }
  );

  // Selection
  selectedIds = signal<Set<string>>(new Set());

  // Derived list based on signals
  filteredPerfumes = computed(() => {
    const q = (this.searchSig() || '').toLowerCase().trim();
    const onlyUn = !!this.onlyUnassignedSig();

    let list = this.perfumes();
    if (onlyUn) list = list.filter((p) => !p.brandId);
    if (q) {
      list = list.filter((p) => {
        const sn = p.searchableName ?? p.name?.toLowerCase?.() ?? '';
        return sn.includes(q) || p.name.toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Selection helpers
  toggleAll(currentList: Perfume[], on: boolean) {
    const next = new Set(this.selectedIds());
    if (on) currentList.forEach((p) => next.add(p.id));
    else currentList.forEach((p) => next.delete(p.id));
    this.selectedIds.set(next);
  }

  toggleOne(id: string, on: boolean) {
    const next = new Set(this.selectedIds());
    if (on) next.add(id);
    else next.delete(id);
    this.selectedIds.set(next);
  }

  isSelected(id: string) {
    return this.selectedIds().has(id);
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  // Actions
  async addBrand() {
    if (this.brandForm.invalid) return;
    const name = this.brandForm.value.name!.trim();
    if (!name) return;

    this.busy.set(true);
    try {
      await this.brandsStore.addBrand(name);
      this.brandForm.reset({ name: '' });
      this.toast.set('Brand added.');
    } catch (e: any) {
      console.error(e);
      this.toast.set(e?.message ?? 'Failed to add brand.');
    } finally {
      this.busy.set(false);
    }
  }

  async setBrandVisibility(id: string, visible: boolean) {
    this.busy.set(true);
    try {
      await this.brandsStore.setVisible(id, visible);
      this.toast.set(visible ? 'Brand shown.' : 'Brand hidden.');
    } catch (e: any) {
      console.error(e);
      this.toast.set(e?.message ?? 'Failed to update visibility.');
    } finally {
      this.busy.set(false);
    }
  }

  async bulkAssignBrand() {
    if (this.assignForm.invalid) return;
    const brandId = this.assignForm.value.brandId!;
    const brand = this.brands().find((b) => b.id === brandId);
    if (!brand) return;

    const ids = Array.from(this.selectedIds());
    if (!ids.length) {
      this.toast.set('No perfumes selected.');
      return;
    }

    this.busy.set(true);
    try {
      const batch = writeBatch(this.db);
      const col = collection(this.db, 'perfumes');
      const now = serverTimestamp();

      ids.forEach((id) => {
        const ref = doc(col, id);
        batch.update(ref, {
          brandId: brand.id,
          brandName: brand.name,
          updatedAt: now,
        });
      });

      await batch.commit();

      this.toast.set(`Assigned "${brand.name}" to ${ids.length} perfume(s).`);
      this.clearSelection();
    } catch (e: any) {
      console.error(e);
      this.toast.set(e?.message ?? 'Bulk assign failed.');
    } finally {
      this.busy.set(false);
    }
  }
}
