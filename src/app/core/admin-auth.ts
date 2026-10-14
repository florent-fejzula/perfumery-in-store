import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState, signInWithPopup, signOut } from '@angular/fire/auth';
import { GoogleAuthProvider, type User } from 'firebase/auth';

/**
 * The Google accounts that may edit the catalogue (Add Perfume, Brand Manager, imports).
 * firestore.rules and storage.rules hold the same list: that is what actually protects the data,
 * this only decides which pages to show. Change both together.
 */
export const ADMIN_EMAILS = ['fejzula.florent@gmail.com'];

export function isAdmin(user: User | null | undefined): boolean {
  return !!user && user.emailVerified && ADMIN_EMAILS.includes(user.email ?? '');
}

/** Google sign-in for the editing pages. The catalogue itself needs no sign-in. */
@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private auth = inject(Auth);

  /** undefined while Firebase is still restoring a previous sign-in. */
  readonly user = toSignal(authState(this.auth), { initialValue: undefined });
  readonly isAdmin = computed(() => isAdmin(this.user()));

  signIn() {
    return signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  signOut() {
    return signOut(this.auth);
  }
}

/** Sends anyone who isn't signed in with an admin account to the sign-in page, then back. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.authStateReady();
  if (isAdmin(auth.currentUser)) return true;
  return router.createUrlTree(['/sign-in'], { queryParams: { next: state.url } });
};
