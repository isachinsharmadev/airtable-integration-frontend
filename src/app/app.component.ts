/**
 * App Component - Main Application Shell
 *
 * Handles:
 * - Layout structure (toolbar, sidebar, content)
 * - Authentication status monitoring
 * - OAuth callback handling
 * - Navigation state management
 * - Route guards for locked navigation items
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AirtableService } from './services/airtable.service';
import { Subject, takeUntil } from 'rxjs';

interface NavigationItem {
  route: string;
  icon: string;
  label: string;
  requiresAuth: boolean;
  requiresData?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  loading = false;
  authStatus: any = {
    authenticated: false,
    expired: false,
    hasToken: false,
  };

  private destroy$ = new Subject<void>();

  // Navigation items with access requirements
  navItems: NavigationItem[] = [
    {
      route: '/authentication',
      icon: 'lock',
      label: 'Dashboard',
      requiresAuth: false, // Always accessible
    },
    {
      route: '/data-fetch',
      icon: 'cloud_download',
      label: 'Data Fetch',
      requiresAuth: true, // Requires OAuth
    },
    {
      route: '/scraping',
      icon: 'find_in_page',
      label: 'Revision History',
      requiresAuth: true, // Requires OAuth
    },
    {
      route: '/data-view',
      icon: 'table_view',
      label: 'Data View',
      requiresAuth: true, // Requires OAuth
      requiresData: true, // Also requires data to be fetched
    },
  ];

  constructor(
    private airtableService: AirtableService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[AppComponent] Initializing...');
    this.checkAuthStatus();
    this.handleOAuthCallback();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check current authentication status
   * Called on app initialization and after OAuth callback
   */
  checkAuthStatus(): void {
    console.log('[AppComponent] Checking authentication status...');

    this.airtableService
      .getAuthStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.authStatus = status;
          console.log('[AppComponent] Auth status:', status);

          // If not authenticated and not on authentication page, redirect
          if (!status.authenticated && this.router.url !== '/authentication') {
            console.log(
              '[AppComponent] Not authenticated, redirecting to authentication page'
            );
            this.router.navigate(['/authentication']);
          }
        },
        error: (err) => {
          console.error('[AppComponent] Error checking auth status:', err);
          this.authStatus = {
            authenticated: false,
            expired: false,
            hasToken: false,
          };
        },
      });
  }

  /**
   * Handle OAuth callback after user authorizes on Airtable
   * Checks URL parameters for success/error and acts accordingly
   */
  handleOAuthCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('description');

    if (success) {
      console.log('[AppComponent] OAuth authentication successful');
      this.checkAuthStatus();

      // Clean URL and redirect to data fetch
      window.history.replaceState({}, document.title, '/data-fetch');
      this.router.navigate(['/data-fetch']);
    } else if (error) {
      console.error('[AppComponent] OAuth error:', error);
      console.error('[AppComponent] Error description:', errorDescription);

      // Clean URL and stay on authentication page
      window.history.replaceState({}, document.title, '/authentication');
      this.router.navigate(['/authentication']);
    }
  }

  /**
   * Check if a navigation item should be locked (not accessible)
   * @param item Navigation item to check
   * @returns true if item should be locked
   */
  isNavItemLocked(item: NavigationItem): boolean {
    // Authentication page is never locked
    if (!item.requiresAuth) {
      return false;
    }

    // If requires authentication but not authenticated, lock it
    if (item.requiresAuth && !this.authStatus.authenticated) {
      return true;
    }

    // If requires data but no data exists, lock it
    // TODO: Add actual data check when implementing data state management
    if (item.requiresData) {
      // For now, data view is always locked unless you implement data checking
      return false; // Change this when you add data state
    }

    return false;
  }

  /**
   * Get tooltip message for locked navigation items
   * @param item Navigation item
   * @returns Tooltip message explaining why item is locked
   */
  getNavItemTooltip(item: NavigationItem): string {
    if (!this.isNavItemLocked(item)) {
      return item.label;
    }

    if (item.requiresAuth && !this.authStatus.authenticated) {
      return 'Please authenticate first';
    }

    if (item.requiresData) {
      return 'Please fetch data first';
    }

    return item.label;
  }

  /**
   * Handle navigation click
   * Prevents navigation to locked items
   * @param item Navigation item clicked
   * @param event Click event
   */
  onNavItemClick(item: NavigationItem, event: Event): void {
    if (this.isNavItemLocked(item)) {
      event.preventDefault();
      event.stopPropagation();
      console.log(
        `[AppComponent] Navigation to ${item.route} blocked - item is locked`
      );
    }
  }

  /**
   * Logout user and clear authentication
   * Redirects to authentication page after logout
   */
  logout(): void {
    console.log('[AppComponent] Logging out...');
    this.loading = true;

    this.airtableService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[AppComponent] Logged out successfully');
          this.authStatus = {
            authenticated: false,
            expired: false,
            hasToken: false,
          };
          this.loading = false;
          this.router.navigate(['/authentication']);
        },
        error: (err) => {
          console.error('[AppComponent] Logout error:', err);
          this.loading = false;
          // Still redirect to authentication even if logout fails
          this.router.navigate(['/authentication']);
        },
      });
  }

  /**
   * Get authentication status display text
   * @returns Status text for badge
   */
  getAuthStatusText(): string {
    if (this.authStatus.authenticated) {
      return this.authStatus.expired ? 'Expired' : 'Connected';
    }
    return 'Not Connected';
  }

  /**
   * Get CSS class for status indicator
   * @returns CSS class name
   */
  getStatusIndicatorClass(): string {
    return this.authStatus.authenticated && !this.authStatus.expired
      ? 'connected'
      : 'disconnected';
  }
}
