import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  animateChild,
  keyframes,
} from '@angular/animations';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss'],
  // animations: [
  //   trigger('listAnimation', [
  //     transition('* => *', [
  //       // Animate elements leaving the DOM
  //       query(
  //         ':leave',
  //         [
  //           animate(
  //             '300ms ease-out',
  //             style({ opacity: 0, transform: 'scale(0.8)' })
  //           ),
  //         ],
  //         { optional: true }
  //       ),
  //       // Animate remaining elements moving to new positions
  //       query(
  //         ':enter',
  //         [
  //           style({ opacity: 0, transform: 'translateY(20px)' }),
  //           animate(
  //             '300ms ease-out',
  //             style({ opacity: 1, transform: 'translateY(0)' })
  //           ),
  //         ],
  //         { optional: true }
  //       ),
  //     ]),
  //   ]),
  // ],
  animations: [
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'scale(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          keyframes([
            style({ transform: 'scale(1)', opacity: 1, offset: 0 }),
            style({ transform: 'scale(0.5)', opacity: 0.5, offset: 0.5 }),
            style({ transform: 'scale(0)', opacity: 0, offset: 1 }),
          ])
        ),
      ]),
    ]),
  ],
})
export class CatalogComponent implements OnInit {
  perfumes = [
    {
      id: 1,
      name: 'Blue Talisman',
      description: 'Fresh scent for men',
      image: 'assets/perfume4.jpg',
      categories: ['fresh', 'male'],
    },
    {
      id: 2,
      name: 'Tuberoza',
      description: 'Floral scent for women',
      image: 'assets/perfume6.jpg',
      categories: ['floral', 'female'],
    },
    {
      id: 3,
      name: 'Layton',
      description: 'Sweet scent for men',
      image: 'assets/perfume3.jpg',
      categories: ['sweet', 'male'],
    },
    {
      id: 4,
      name: 'Delina',
      description: 'Fresh scent for women',
      image: 'assets/perfume2.jpg',
      categories: ['fresh', 'female'],
    },
    {
      id: 5,
      name: 'Baccarat Rouge 540 Extrait',
      description: 'Floral scent for men',
      image: 'assets/perfume1.jpg',
      categories: ['floral', 'male'],
    },
    {
      id: 6,
      name: 'Gold Woman',
      description: 'Sweet scent for women',
      image: 'assets/perfume5.jpg',
      categories: ['sweet', 'female'],
    },
  ];

  filteredPerfumes = [...this.perfumes]; // Default to showing all perfumes
  selectedPerfume: any = null;

  openModal(perfume: any) {
    this.selectedPerfume = perfume;
  }

  closeModal(event?: Event) {
    this.selectedPerfume = null;
  }

  applyFilter(filter: string): void {
    setTimeout(() => {
      this.filteredPerfumes = this.perfumes.filter((perfume) =>
        perfume.categories.includes(filter)
      );
    }, 100);
  }

  resetFilters(): void {
    this.filteredPerfumes = [...this.perfumes];
  }

  trackByPerfume(index: number, perfume: any): number {
    return perfume.id; // Use a unique identifier for perfumes
  }

  ngOnInit(): void {
    console.log(this.perfumes); // Debug the perfumes array
  }
}
