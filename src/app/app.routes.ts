/**
 * Application Routes with Authentication Guards
 *
 * Route Protection Strategy:
 * - /authentication - Public (always accessible)
 * - /data-fetch - Protected (requires OAuth)
 * - /scraping - Protected (requires OAuth, recommended scraping auth)
 * - /data-view - Protected (requires OAuth)
 */

import { Routes } from '@angular/router';
import { AuthenticationComponent } from './components/authentication/authentication.component';
import { DataFetchComponent } from './components/data-fetch/data-fetch.component';
import { ScrapingComponent } from './components/scraping/scraping.component';
import { DataViewComponent } from './components/data-view/data-view.component';
import { authGuard, scrapingGuard } from './gaurds/auth.gaurd';

export const routes: Routes = [
  // Default route - redirect to authentication
  {
    path: '',
    redirectTo: '/authentication',
    pathMatch: 'full',
  },

  // Authentication page - Always accessible (no guard)
  {
    path: 'authentication',
    component: AuthenticationComponent,
    title: 'Authentication - Airtable Integration',
  },

  // Data Fetch page - Requires OAuth authentication
  {
    path: 'data-fetch',
    component: DataFetchComponent,
    canActivate: [authGuard], // Protected by OAuth
    title: 'Data Fetch - Airtable Integration',
  },

  // Revision History (Scraping) page - Requires OAuth (and ideally scraping auth)
  // Note: We only check OAuth here, but the component should prompt for scraping auth if needed
  {
    path: 'scraping',
    component: ScrapingComponent,
    canActivate: [authGuard], // Protected by OAuth only
    title: 'Revision History - Airtable Integration',
  },

  // Data View page - Requires OAuth authentication
  {
    path: 'data-view',
    component: DataViewComponent,
    canActivate: [authGuard], // Protected by OAuth
    title: 'Data View - Airtable Integration',
  },

  // Wildcard route - redirect to authentication
  {
    path: '**',
    redirectTo: '/authentication',
  },
];
