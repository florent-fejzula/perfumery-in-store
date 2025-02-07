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

  filterTags: string[] = [
    'male',
    'female',
    'fresh',
    'floral',
    'woody',
    'tobacco',
    'spicy',
    'leather',
    'sweet',
    'aquatic',
    'creamy',
    'clean',
    'gourmand',
    'vanilla',
    'sandalwood',
    'fruity',
    'mango',
    'tropical',
    'tuberose',
    'jasmine',
    'ozonic',
    'mineral',
    'amber',
    'oud',
    'animalic',
    'citrus',
    'green',
    'musky',
    'powdery',
    'white floral',
    'aldehydic',
    'tea',
    'rose',
    'lavender',
    'vetiver',
    'smoky',
    'earthy',
    'oriental',
    'coconut',
    'boozy',
    'patchouli',
    'iris',
    'neroli',
    'cherry',
    'almond',
    'saffron',
    'cinnamon',
    'ylang-ylang'
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
}
