import { Routes } from '@angular/router';
import { CatalogComponent } from './components/catalog/catalog.component';
import { AddPerfumeComponent } from './components/add-perfume/add-perfume.component';
import { ImportLocalPerfumesComponent } from './components/import-local-perfumes/import-local-perfumes.component';
import { BrandManagerComponent } from './components/brand-manager/brand-manager.component';

export const routes: Routes = [
  { path: '', redirectTo: '/catalog', pathMatch: 'full' },
  { path: 'catalog', component: CatalogComponent }, // Catalog route
  { path: 'add-perfume', component: AddPerfumeComponent },
  { path: 'brand-manager', component: BrandManagerComponent },
  { path: 'super-secret-import', component: ImportLocalPerfumesComponent },
];