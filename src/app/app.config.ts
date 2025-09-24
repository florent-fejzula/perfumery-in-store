import {
  ApplicationConfig,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations'; // TEMP: deprecated in 20.2

import { routes } from './app.routes';
import { environment } from '../environments/environment';

// Firebase
import {
  provideFirebaseApp,
  initializeApp,
  FirebaseApp,
} from '@angular/fire/app';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFirestore } from '@angular/fire/firestore';

// Firestore (SDK) - enable persistent cache
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(), // ⚠️ Deprecated in 20.2; OK to keep until you migrate animations.

    // Firebase App
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),

    // Firestore with IndexedDB persistence
    provideFirestore(() => {
      const app = inject(FirebaseApp);
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    }),

    // Storage
    provideStorage(() => getStorage()),
  ],
};
