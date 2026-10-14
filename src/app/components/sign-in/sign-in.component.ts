import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAuth, isAdmin } from '../../core/admin-auth';

/** Shown instead of an editing page until an admin Google account is signed in. */
@Component({
  selector: 'app-sign-in',
  standalone: true,
  template: `
    <div class="page">
      <h1>Sign in to edit</h1>

      @if (auth.user() === undefined) {
        <p class="muted">Checking sign-in…</p>
      } @else if (auth.user() && !auth.isAdmin()) {
        <p>{{ auth.user()?.email }} can't edit the catalogue.</p>
        <button class="btn" type="button" (click)="auth.signOut()">Use another account</button>
      } @else {
        <p class="muted">Adding perfumes and managing brands needs the shop's Google account.</p>
        <button class="btn primary" type="button" [disabled]="busy()" (click)="signIn()">
          {{ busy() ? 'Signing in…' : 'Sign in with Google' }}
        </button>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 420px;
      margin: 15vh auto 0;
      padding: 0 16px;
      font-family: 'Baskervville', serif;
      text-align: center;
    }
    h1 {
      font-weight: 400;
    }
    .muted {
      color: var(--muted, #6b7280);
    }
    .btn {
      margin-top: 12px;
      min-height: 44px;
      padding: 0 24px;
      border: 1px solid var(--ink, #0f172a);
      border-radius: 999px;
      background: #fff;
      color: var(--ink, #0f172a);
      font: inherit;
      font-size: 18px;
      cursor: pointer;
    }
    .btn.primary {
      background: var(--ink, #0f172a);
      color: #fff;
    }
    .error {
      color: #b91c1c;
    }
  `,
})
export class SignInComponent {
  protected auth = inject(AdminAuth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected busy = signal(false);
  protected error = signal<string | null>(null);

  async signIn() {
    this.busy.set(true);
    this.error.set(null);
    try {
      const { user } = await this.auth.signIn();
      if (isAdmin(user)) {
        await this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('next') || '/add-perfume');
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        this.error.set(err?.message ?? 'Sign-in failed.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
