import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';

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
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' })),
      ]),
    ]),
  ],
})
export class CatalogComponent implements OnInit {
  perfumes = [
    { id: 1, name: 'Blue Talisman', description: 'Fresh scent for men', image: 'assets/perfume4.jpg', categories: ['fresh', 'male'] },
    { id: 2, name: 'Tuberoza', description: 'Floral scent for women', image: 'assets/perfume6.jpg', categories: ['floral', 'female'] },
    { id: 3, name: 'Layton', description: 'Sweet scent for men', image: 'assets/perfume3.jpg', categories: ['sweet', 'male'] },
    { id: 4, name: 'Delina', description: 'Fresh scent for women', image: 'assets/perfume2.jpg', categories: ['fresh', 'female'] },
    { id: 5, name: 'Baccarat Rouge 540 Extrait', description: 'Floral scent for men', image: 'assets/perfume1.jpg', categories: ['floral', 'male'] },
    { id: 6, name: 'Gold Woman', description: 'Sweet scent for women', image: 'assets/perfume5.jpg', categories: ['sweet', 'female'] },
  ];

  filteredPerfumes = [...this.perfumes];
  selectedPerfume: any = null;
  activeFilters: string[] = [];

  ngOnInit(): void {
    console.log(this.perfumes); // Debug the perfumes array
  }

  openModal(perfume: any): void {
    this.selectedPerfume = perfume;
  }

  closeModal(event?: Event) {
    this.selectedPerfume = null;
  }

  applyFilter(filter: string): void {
    if (this.activeFilters.includes(filter)) {
      // If the filter is already active, remove it
      this.activeFilters = this.activeFilters.filter((f) => f !== filter);
    } else {
      // Add the filter to the active list
      this.activeFilters.push(filter);
    }
  
    // Update filtered perfumes
    this.filteredPerfumes = this.perfumes.filter((perfume) =>
      this.activeFilters.every((activeFilter) =>
        perfume.categories.includes(activeFilter)
      )
    );
  
    // Handle fade-out/fade-in logic for animation
    const delay = 300; // Match this to your animation duration
    const perfumesToDisplay = [...this.filteredPerfumes];
    this.filteredPerfumes = [];
    setTimeout(() => {
      this.filteredPerfumes = perfumesToDisplay;
    }, delay);
  }
  
  resetFilters(): void {
    this.activeFilters = []; // Clear all active filters
    const delay = 300;
    this.filteredPerfumes = [];
    setTimeout(() => {
      this.filteredPerfumes = [...this.perfumes]; // Show all perfumes
    }, delay);
  }

  updateFilteredPerfumes(): void {
    // Start the fade-out animation
    this.filteredPerfumes = [];

    // Delay to allow the fade-out animation to complete before updating the array
    setTimeout(() => {
      if (this.activeFilters.length === 0) {
        // No filters applied, show all perfumes
        this.filteredPerfumes = [...this.perfumes];
      } else {
        // Apply all active filters
        this.filteredPerfumes = this.perfumes.filter(perfume =>
          Array.from(this.activeFilters).every(filter => perfume.categories.includes(filter))
        );
      }
    }, 300); // Match the delay to the duration of your fade-out animation
  }

  trackByPerfume(index: number, perfume: any): number {
    return perfume.id; // Use a unique identifier for perfumes
  }
}