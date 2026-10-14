import { Component, inject, signal } from '@angular/core';
import { AppUpdateService } from './app-update.service';

/** "A new version is available" with a Refresh button. Shows over any page once a release is out. */
@Component({
  selector: 'app-update-banner',
  standalone: true,
  template: `
    @if (update.available() && !dismissed()) {
      <div class="banner" role="status">
        <span>A new version is available.</span>
        <button class="refresh" type="button" (click)="update.reload()">Refresh</button>
        <button
          class="close"
          type="button"
          aria-label="Remind me later"
          (click)="dismissed.set(true)"
        >
          ✕
        </button>
      </div>
    }
  `,
  styles: `
    .banner {
      position: fixed;
      left: 50%;
      bottom: calc(24px + env(safe-area-inset-bottom));
      z-index: 2000;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 14px;
      width: max-content;
      max-width: calc(100vw - 32px);
      padding: 10px 10px 10px 22px;
      border-radius: 999px;
      background: var(--ink, #0f172a);
      color: #fff;
      font-family: 'Baskervville', serif;
      font-size: 20px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3);
    }

    .refresh {
      flex: none;
      min-height: 44px;
      padding: 0 22px;
      border: 0;
      border-radius: 999px;
      background: #fff;
      color: var(--ink, #0f172a);
      font: inherit;
      cursor: pointer;
    }

    .close {
      flex: none;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: 50%;
      background: none;
      color: rgba(255, 255, 255, 0.75);
      font-size: 18px;
      cursor: pointer;
    }
  `,
})
export class UpdateBannerComponent {
  protected readonly update = inject(AppUpdateService);
  protected readonly dismissed = signal(false);
}
