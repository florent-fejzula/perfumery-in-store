import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type Perfume = {
  id: string;
  name: string;
  imageUrl: string; // main image
  categories: string[]; // tags for filtering

  // Optional extras (safe for *ngIf guards in template)
  brand?: string;
  description?: string;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  extraImages?: string[]; // URLs of extra images
};

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss'],
  animations: [
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ opacity: 0, transform: 'scale(0.8)' })
        ),
      ]),
    ]),
  ],
})
export class CatalogComponent implements OnInit {
  private firestore = inject(Firestore);
  private destroyRef = inject(DestroyRef);

  // UI data
  perfumesAll: Perfume[] = [];
  filteredPerfumes: Perfume[] = [];
  selectedPerfume: Perfume | null = null;
  activeFilters: string[] = [];

  // your existing tag buckets
  genderTags: string[] = ['male', 'female'];
  scentFamilyTags: string[] = [
    'fresh',
    'floral',
    'fruity',
    'tropical',
    'woody',
    'spicy',
    'leather',
    'sweet',
    'creamy',
    'gourmand',
    'aquatic',
    'clean',
    'ozonic',
    'green',
    'musky',
    'powdery',
    'white floral',
    'aldehydic',
    'oriental',
    'animalic',
    'smoky',
    'earthy',
  ];
  mainNoteTags: string[] = [
    'vanilla',
    'sandalwood',
    'tobacco',
    'mango',
    'tuberose',
    'jasmine',
    'mineral',
    'amber',
    'oud',
    'citrus',
    'tea',
    'rose',
    'lavender',
    'vetiver',
    'coconut',
    'boozy',
    'patchouli',
    'iris',
    'neroli',
    'cherry',
    'almond',
    'saffron',
    'cinnamon',
    'ylang-ylang',
    'mint',
  ];

  ngOnInit(): void {
    const perfumesCol = collection(this.firestore, 'perfumes');
    collectionData(perfumesCol, { idField: 'id' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((docs: any[]) => {
        this.perfumesAll = docs
          .map((d) => ({
            id: d.id,
            name: d.name,
            imageUrl: d.imageUrl ?? d.image ?? '', // tolerate old field name
            categories: d.categories ?? d.tags ?? [], // tolerate old field name
            brand: d.brand,
            description: d.description,
            topNotes: d.topNotes ?? [],
            heartNotes: d.heartNotes ?? [],
            baseNotes: d.baseNotes ?? [],
            extraImages: d.extraImages ?? [],
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        this.applyCurrentFilters();
      });
  }

  openModal(perfume: Perfume): void {
    this.selectedPerfume = perfume;
  }
  closeModal() {
    this.selectedPerfume = null;
  }

  applyFilter(filter: string): void {
    if (this.activeFilters.includes(filter)) {
      this.activeFilters = this.activeFilters.filter((f) => f !== filter);
    } else {
      this.activeFilters = [...this.activeFilters, filter];
    }
    this.applyCurrentFilters();
  }

  private applyCurrentFilters(): void {
    if (!this.activeFilters.length) {
      this.filteredPerfumes = [...this.perfumesAll];
      return;
    }
    this.filteredPerfumes = this.perfumesAll.filter((p) =>
      this.activeFilters.every((f) => p.categories?.includes(f))
    );
  }

  resetFilters(): void {
    this.activeFilters = [];
    this.filteredPerfumes = [...this.perfumesAll];
  }

  trackByPerfume(index: number, perfume: Perfume): string {
    return perfume.id;
  }

  isTagDisabled(tag: string): boolean {
    if (this.activeFilters.length === 0) return false;
    if (this.activeFilters.includes(tag)) return false;

    const simulated = [...this.activeFilters, tag];
    const matches = this.perfumesAll.filter((p) =>
      simulated.every((f) => p.categories?.includes(f))
    );
    return matches.length === 0;
  }
}
