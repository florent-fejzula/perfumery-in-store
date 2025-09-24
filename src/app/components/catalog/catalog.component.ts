import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

// Use the store you created
import { PerfumeStore, Perfume } from '../../stores/perfume.store';

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
  private store = inject(PerfumeStore);

  // UI data
  perfumesAll: Perfume[] = [];
  filteredPerfumes: Perfume[] = [];
  selectedPerfume: Perfume | null = null;
  activeFilters: string[] = [];

  // existing tag buckets
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

  // ✅ Run effect in injection context (field initializer), not inside ngOnInit
  private readonly syncFromStore = effect(() => {
    this.perfumesAll = this.store.perfumes();
    this.applyCurrentFilters();
  });

  ngOnInit(): void {
    // Load once from Firestore (subsequent calls no-op)
    this.store.loadOnce();
  }

  openModal(perfume: Perfume): void {
    this.selectedPerfume = perfume;
  }
  closeModal(): void {
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
      this.filteredPerfumes = this.perfumesAll;
      return;
    }
    this.filteredPerfumes = this.perfumesAll.filter((p) =>
      this.activeFilters.every((f) => p.categories?.includes(f))
    );
  }

  resetFilters(): void {
    this.activeFilters = [];
    this.filteredPerfumes = this.perfumesAll;
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
