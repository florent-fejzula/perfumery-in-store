import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { perfumes } from '../../data/perfumes';

@Component({
    selector: 'app-catalog',
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
                animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' })),
            ]),
        ]),
    ]
})
export class CatalogComponent implements OnInit {
  filteredPerfumes = [...perfumes];
  selectedPerfume: any = null;
  activeFilters: string[] = [];

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
    console.log(perfumes); // Debug the perfumes array
  }

  openModal(perfume: any): void {
    this.selectedPerfume = perfume;
  }

  closeModal(event?: Event) {
    this.selectedPerfume = null;
  }

  applyFilter(filter: string): void {
  if (this.activeFilters.includes(filter)) {
    this.activeFilters = this.activeFilters.filter((f) => f !== filter);
  } else {
    this.activeFilters.push(filter);
  }

  this.filteredPerfumes = perfumes.filter((perfume) =>
    this.activeFilters.every((activeFilter) =>
      perfume.categories.includes(activeFilter)
    )
  );
}

  resetFilters(): void {
  this.activeFilters = [];
  this.filteredPerfumes = [...perfumes];
}

  trackByPerfume(index: number, perfume: any): number {
    return perfume.id; // Use a unique identifier for perfumes
  }

  isTagDisabled(tag: string): boolean {
    // Tag is always enabled if no filters yet
    if (this.activeFilters.length === 0) return false;

    // Don't disable if tag is already selected
    if (this.activeFilters.includes(tag)) return false;

    // Try applying this tag with current activeFilters
    const simulatedFilters = [...this.activeFilters, tag];
    const matches = perfumes.filter((perfume) =>
      simulatedFilters.every((f) => perfume.categories.includes(f))
    );

    return matches.length === 0; // Disable if no perfumes match with this combo
  }
}
