import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';
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
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' })),
      ]),
    ]),
  ],
})
export class CatalogComponent implements OnInit {
  filteredPerfumes = [...perfumes];
  selectedPerfume: any = null;
  activeFilters: string[] = [];

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
      // If the filter is already active, remove it
      this.activeFilters = this.activeFilters.filter((f) => f !== filter);
    } else {
      // Add the filter to the active list
      this.activeFilters.push(filter);
    }
  
    // Update filtered perfumes
    this.filteredPerfumes = perfumes.filter((perfume) =>
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
      this.filteredPerfumes = [...perfumes]; // Show all perfumes
    }, delay);
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
        this.filteredPerfumes = perfumes.filter(perfume =>
          Array.from(this.activeFilters).every(filter => perfume.categories.includes(filter))
        );
      }
    }, 300); // Match the delay to the duration of your fade-out animation
  }

  trackByPerfume(index: number, perfume: any): number {
    return perfume.id; // Use a unique identifier for perfumes
  }
}