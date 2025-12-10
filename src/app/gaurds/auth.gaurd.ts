/**
 * Authentication Guard
 *
 * Protects routes that require OAuth authentication.
 * Redirects unauthenticated users to the authentication page.
 *
 * Usage in routes:
 * { path: 'data-fetch', component: DataFetchComponent, canActivate: [authGuard] }
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AirtableService } from '../services/airtable.service';
import { map, catchError, of } from 'rxjs';

/**
 * Auth Guard - Functional guard for route protection
 * Checks if user is authenticated before allowing access to route
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const airtableService = inject(AirtableService);

  console.log('[AuthGuard] Checking authentication for route:', state.url);

  return airtableService.getAuthStatus().pipe(
    map((status) => {
      console.log('[AuthGuard] Auth status:', status);

      // Check if authenticated and not expired
      if (status.authenticated && !status.expired) {
        console.log('[AuthGuard] Access granted');
        return true;
      }

      // Not authenticated or expired - redirect to authentication page
      console.log('[AuthGuard] Access denied - redirecting to authentication');
      router.navigate(['/authentication'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }),
    catchError((err) => {
      console.error('[AuthGuard] Error checking auth status:', err);
      // On error, redirect to authentication page
      router.navigate(['/authentication']);
      return of(false);
    })
  );
};

/**
 * Scraping Guard - Protects routes that require scraping authentication
 * Use this for revision history routes
 */
export const scrapingGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const airtableService = inject(AirtableService);

  console.log('[ScrapingGuard] Checking cookie status for route:', state.url);

  return airtableService.getCookieStatus().pipe(
    map((status) => {
      console.log('[ScrapingGuard] Cookie status:', status);

      // Check if cookies are valid
      if (status.hasCookies && status.valid) {
        console.log('[ScrapingGuard] Access granted');
        return true;
      }

      // No valid cookies - redirect to authentication page
      console.log(
        '[ScrapingGuard] Access denied - redirecting to authentication'
      );
      router.navigate(['/authentication'], {
        queryParams: {
          returnUrl: state.url,
          requiresScraping: true,
        },
      });
      return false;
    }),
    catchError((err) => {
      console.error('[ScrapingGuard] Error checking cookie status:', err);
      // On error, redirect to authentication page
      router.navigate(['/authentication']);
      return of(false);
    })
  );
};

/**
 * Combined Guard - Requires both OAuth AND Scraping authentication
 * Use this for routes that need both types of authentication
 */
export const combinedGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const airtableService = inject(AirtableService);

  console.log(
    '[CombinedGuard] Checking both authentications for route:',
    state.url
  );

  // Check OAuth first
  return airtableService.getAuthStatus().pipe(
    map((authStatus) => {
      if (!authStatus.authenticated || authStatus.expired) {
        console.log('[CombinedGuard] OAuth not valid - redirecting');
        router.navigate(['/authentication'], {
          queryParams: { returnUrl: state.url },
        });
        return false;
      }

      // OAuth valid, now check cookies
      airtableService.getCookieStatus().subscribe({
        next: (cookieStatus) => {
          if (!cookieStatus.hasCookies || !cookieStatus.valid) {
            console.log('[CombinedGuard] Cookies not valid - redirecting');
            router.navigate(['/authentication'], {
              queryParams: {
                returnUrl: state.url,
                requiresScraping: true,
              },
            });
          }
        },
      });

      return true;
    }),
    catchError((err) => {
      console.error('[CombinedGuard] Error checking authentications:', err);
      router.navigate(['/authentication']);
      return of(false);
    })
  );
};
