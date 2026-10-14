import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdateService } from './core/app-update.service';
import { UpdateBannerComponent } from './core/update-banner.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, UpdateBannerComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true
})
export class AppComponent {
  constructor() {
    inject(AppUpdateService).start();
  }
}
