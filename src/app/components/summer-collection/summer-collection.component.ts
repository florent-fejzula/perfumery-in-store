import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Perfume } from '../../stores/perfume.store';

const AUTO_ADVANCE_MS = 30_000;

@Component({
  selector: 'app-summer-collection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summer-collection.component.html',
  styleUrls: ['./summer-collection.component.scss'],
  animations: [
    trigger('slide', [
      transition(':increment', [
        style({ opacity: 0, transform: 'translateX(60px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition(':decrement', [
        style({ opacity: 0, transform: 'translateX(-60px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
})
export class SummerCollectionComponent implements OnInit, OnDestroy {
  @Input() perfumes: Perfume[] = [];
  @Output() closed = new EventEmitter<void>();

  index = signal(0);
  current = computed(() => this.perfumes[this.index()]);
  imageReady = signal(true);

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  onImageLoad(): void {
    this.imageReady.set(true);
  }

  prev(): void {
    this.imageReady.set(false);
    this.index.update((i) => (i > 0 ? i - 1 : this.perfumes.length - 1));
    this.resetTimer();
  }

  next(): void {
    this.imageReady.set(false);
    this.index.update((i) => (i < this.perfumes.length - 1 ? i + 1 : 0));
    this.resetTimer();
  }

  goTo(i: number): void {
    this.imageReady.set(false);
    this.index.set(i);
    this.resetTimer();
  }

  close(): void {
    this.closed.emit();
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.imageReady.set(false);
      this.index.update((i) => (i < this.perfumes.length - 1 ? i + 1 : 0));
    }, AUTO_ADVANCE_MS);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private resetTimer(): void {
    this.clearTimer();
    this.startTimer();
  }
}
