import { Routes } from '@angular/router';
import { CatalogComponent } from './components/catalog/catalog.component';
import { DetailComponent } from './components/detail/detail.component';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
  { path: '', redirectTo: '/catalog', pathMatch: 'full' },
  { path: 'catalog', component: CatalogComponent }, // Catalog route
  { path: 'detail/:id', component: DetailComponent }, // Detail route with ID parameter
  { path: 'admin', component: AdminComponent }, // Admin panel
];