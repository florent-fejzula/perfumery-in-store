import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { perfumes } from '../data/perfumes';

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
      // Remove the filter if it's already active
      this.activeFilters = this.activeFilters.filter((f) => f !== filter);
    } else {
      // Add the filter to the active list
      this.activeFilters.push(filter);
    }

    // Filter perfumes based on active filters
    this.filteredPerfumes = perfumes.filter((perfume) =>
      this.activeFilters.every((activeFilter) =>
        perfume.categories.includes(activeFilter)
      )
    );

    // Animation handling (fade-out/fade-in)
    const animationDelay = 300; // Match your CSS animation duration
    const perfumesToDisplay = [...this.filteredPerfumes];
    this.filteredPerfumes = [];
    setTimeout(() => {
      this.filteredPerfumes = perfumesToDisplay;
    }, animationDelay);
  }

  resetFilters(): void {
    this.activeFilters = []; // Clear all active filters

    // Animation handling (fade-out/fade-in)
    const animationDelay = 300;
    this.filteredPerfumes = [];
    setTimeout(() => {
      this.filteredPerfumes = [...perfumes]; // Reset to show all perfumes
    }, animationDelay);
  }

  updateFilteredPerfumes(): void {
    // Start the fade-out animation
    this.filteredPerfumes = [];

    // Delay to allow the fade-out animation to complete before updating the array
    setTimeout(() => {
      if (this.activeFilters.length === 0) {
        // No filters applied, show all perfumes
        this.filteredPerfumes = [...perfumes];
      } else {
        // Apply all active filters
        this.filteredPerfumes = perfumes.filter((perfume) =>
          Array.from(this.activeFilters).every((filter) =>
            perfume.categories.includes(filter)
          )
        );
      }
    }, 300); // Match the delay to the duration of your fade-out animation
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
