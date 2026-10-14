import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Tells the staff when a newer version has been deployed.
 *
 * With a service worker the app keeps running the version it was opened with:
 * the new one downloads in the background and only takes over on the next
 * load. The iPad is opened in the morning and then left standing, so without a
 * nudge a fix could take days to arrive.
 *
 * Reloading is left to a tap rather than done automatically, so it never
 * happens while a customer is looking at a perfume.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);

  /** True once a newer version is ready (or the running one can no longer be served). */
  readonly available = signal(false);

  /** Called once from the root component. A no-op when the service worker is off (development). */
  start(): void {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.available.set(true));

    // The cached version can no longer be served, typically because a deploy
    // removed a file this page still needs. Nothing works until a reload.
    this.updates.unrecoverable.subscribe(() => this.available.set(true));

    // The service worker only checks when the page loads. A kiosk that stays
    // open all day never loads again, so ask when the screen wakes up and every
    // half hour; the request is one small JSON file.
    // checkForUpdate() resolves true once a newer version has been found and
    // installed, so it doubles as a trigger: VERSION_READY is only sent to
    // pages the service worker has bookkept as running the old version.
    const check = () =>
      void this.updates
        .checkForUpdate()
        .then((found) => {
          if (found) this.available.set(true);
        })
        .catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, 30 * 60_000);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    });
  }

  async reload(): Promise<void> {
    try {
      await this.updates.activateUpdate();
    } catch {
      // Nothing to activate (unrecoverable state): a plain reload is what's needed.
    }
    document.location.reload();
  }
}
