import { Routes } from '@angular/router';
import { CatalogComponent } from './components/catalog/catalog.component';
import { AddPerfumeComponent } from './components/add-perfume/add-perfume.component';
import { ImportLocalPerfumesComponent } from './components/import-local-perfumes/import-local-perfumes.component';
import { BrandManagerComponent } from './components/brand-manager/brand-manager.component';
import { SignInComponent } from './components/sign-in/sign-in.component';
import { adminGuard } from './core/admin-auth';

export const routes: Routes = [
  { path: '', redirectTo: '/catalog', pathMatch: 'full' },
  { path: 'catalog', component: CatalogComponent }, // Catalog route
  { path: 'sign-in', component: SignInComponent },
  // Editing pages: an admin Google account only (see core/admin-auth.ts and firestore.rules)
  { path: 'add-perfume', component: AddPerfumeComponent, canActivate: [adminGuard] },
  { path: 'brand-manager', component: BrandManagerComponent, canActivate: [adminGuard] },
  { path: 'super-secret-import', component: ImportLocalPerfumesComponent, canActivate: [adminGuard] },
];
