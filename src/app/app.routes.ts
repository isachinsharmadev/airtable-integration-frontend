import { Routes } from '@angular/router';
import { AuthenticationComponent } from './components/authentication/authentication.component';
import { DataFetchComponent } from './components/data-fetch/data-fetch.component';
import { ScrapingComponent } from './components/scraping/scraping.component';
import { DataViewComponent } from './components/data-view/data-view.component';

export const routes: Routes = [
  { path: '', redirectTo: '/authentication', pathMatch: 'full' },
  { path: 'authentication', component: AuthenticationComponent },
  { path: 'data-fetch', component: DataFetchComponent },
  { path: 'scraping', component: ScrapingComponent },
  { path: 'data-view', component: DataViewComponent },
];
