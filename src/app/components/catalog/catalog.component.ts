import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

// Use the store you created
import { PerfumeStore, Perfume } from '../../stores/perfume.store';
import { BrandsStore } from '../../stores/brands.store'; // 👈 add

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
  private brandsStore = inject(BrandsStore);

  // UI data
  perfumesAll: Perfume[] = [];
  filteredPerfumes: Perfume[] = [];
  selectedPerfume: Perfume | null = null;
  activeFilters: string[] = [];

  // existing tag buckets
  genderTags: string[] = ['male', 'female'];
  scentFamilyTags: string[] = [
    'aldehydic',
    'animalic',
    'aquatic',
    'clean',
    'creamy',
    'earthy',
    'floral',
    'fresh',
    'fruity',
    'gourmand',
    'green',
    'leather',
    'musky',
    'oriental',
    'ozonic',
    'powdery',
    'smoky',
    'spicy',
    'sweet',
    'tropical',
    'white floral',
    'woody',
  ];
  mainNoteTags: string[] = [
    'almond',
    'amber',
    'boozy',
    'cherry',
    'cinnamon',
    'citrus',
    'coconut',
    'iris',
    'jasmine',
    'lavender',
    'mango',
    'mineral',
    'mint',
    'neroli',
    'oud',
    'patchouli',
    'rose',
    'saffron',
    'sandalwood',
    'tea',
    'tobacco',
    'tuberose',
    'vanilla',
    'vetiver',
    'ylang-ylang',
  ];

  private readonly scentColorMap: Record<string, string> = {
    // ice blue-green
    fresh: 'scent-aquatic', aquatic: 'scent-aquatic', ozonic: 'scent-aquatic',
    clean: 'scent-aquatic', green: 'scent-aquatic',
    // dusty rose
    floral: 'scent-floral', 'white floral': 'scent-floral',
    // warm tan
    woody: 'scent-woody', earthy: 'scent-woody', smoky: 'scent-woody', leather: 'scent-woody',
    // soft peach
    fruity: 'scent-fruity', tropical: 'scent-fruity', gourmand: 'scent-fruity',
    // amber
    oriental: 'scent-amber', spicy: 'scent-amber', animalic: 'scent-amber',
    sweet: 'scent-amber', creamy: 'scent-amber',
    // pale lavender
    powdery: 'scent-lavender', musky: 'scent-lavender', aldehydic: 'scent-lavender',
  };

  getScentClass(tag: string): string {
    return this.scentColorMap[tag] ?? '';
  }

  // ✅ Run effect in injection context (field initializer), not inside ngOnInit
  private readonly syncFromStore = effect(() => {
    const perfumes = this.store.perfumes();
    const visibleBrandIds = new Set(
      this.brandsStore.visibleBrands().map((b) => b.id) // 👈 which brands are visible
    );
    // Keep a locally filtered base list (respect brand visibility here)
    this.perfumesAll = perfumes.filter(
      (p) => !p.brandId || visibleBrandIds.has(p.brandId)
    );
    this.applyCurrentFilters();
  });

  ngOnInit(): void {
    // Load once from Firestore (subsequent calls no-op)
    this.store.loadOnce();
    this.brandsStore.loadOnce();
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
