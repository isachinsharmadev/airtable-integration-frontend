/**
 * Authentication Component - Enhanced with Return URL Support
 *
 * Now handles:
 * - Return URL from route guards
 * - Auto-redirect after successful authentication
 * - Query parameter hints for required auth types
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AirtableService } from '../../services/airtable.service';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.css',
})
export class AuthenticationComponent implements OnInit, OnDestroy {
  // OAuth State
  authStatus: any = {
    authenticated: false,
    expired: false,
    hasToken: false,
  };
  oauthLoading = false;

  // Scraping State
  cookieStatus: any = {
    hasCookies: false,
    valid: false,
    requiresAuth: true,
  };
  scrapingLoading = false;
  hidePassword = true;
  mfaRequired = false;

  // Form Data
  scrapingCreds = {
    email: '',
    password: '',
    mfaCode: '',
  };

  // Return URL for redirecting after auth
  private returnUrl: string = '/data-fetch';
  private requiresScraping: boolean = false;

  // Component lifecycle
  private destroy$ = new Subject<void>();

  constructor(
    private airtableService: AirtableService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('[AuthComponent] Initializing...');

    // Get return URL from query params (set by auth guard)
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.returnUrl = params['returnUrl'] || '/data-fetch';
        this.requiresScraping = params['requiresScraping'] === 'true';

        if (this.returnUrl) {
          console.log('[AuthComponent] Return URL detected:', this.returnUrl);
        }

        if (this.requiresScraping) {
          console.log('[AuthComponent] Scraping authentication required');
          this.showMessage(
            'This page requires scraping authentication. Please login below.',
            'warning'
          );
        }
      });

    this.loadStatus();
    this.handleOAuthCallback();
    this.startStatusPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Start polling for status updates every 30 seconds
   */
  startStatusPolling(): void {
    interval(30000) // 30 seconds
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('[AuthComponent] Polling status...');
        this.loadStatus();
      });
  }

  /**
   * Handle OAuth callback from Airtable
   */
  handleOAuthCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('description');

    if (success === 'true') {
      console.log('[AuthComponent] OAuth callback - Success');
      this.showMessage('OAuth authentication successful!', 'success');
      this.loadStatus();

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Auto-redirect to return URL after successful auth
      setTimeout(() => {
        console.log('[AuthComponent] Redirecting to:', this.returnUrl);
        this.router.navigate([this.returnUrl]);
      }, 1500);
    } else if (error) {
      console.error('[AuthComponent] OAuth callback - Error:', error);
      const errorMsg = errorDescription
        ? `OAuth error: ${error} - ${errorDescription}`
        : `OAuth error: ${error}`;
      this.showMessage(errorMsg, 'error');

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  /**
   * Load current authentication status
   */
  loadStatus(): void {
    // Load OAuth status
    this.airtableService
      .getAuthStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          console.log('[AuthComponent] OAuth status:', status);
          this.authStatus = status;

          // If authenticated and has return URL, offer to redirect
          if (
            status.authenticated &&
            !status.expired &&
            this.returnUrl !== '/authentication'
          ) {
            // Don't auto-redirect, let user choose
          }
        },
        error: (err) => {
          console.error('[AuthComponent] Error loading auth status:', err);
          this.authStatus = {
            authenticated: false,
            expired: false,
            hasToken: false,
          };
        },
      });

    // Load Cookie status
    this.airtableService
      .getCookieStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          console.log('[AuthComponent] Cookie status:', status);
          this.cookieStatus = status;
        },
        error: (err) => {
          console.error('[AuthComponent] Error loading cookie status:', err);
          this.cookieStatus = {
            hasCookies: false,
            valid: false,
            requiresAuth: true,
          };
        },
      });
  }

  // ============================================
  // OAUTH ACTIONS
  // ============================================

  initiateOAuth(): void {
    console.log('[AuthComponent] Initiating OAuth...');
    this.oauthLoading = true;

    this.airtableService
      .getAuthUrl()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AuthComponent] OAuth URL received, redirecting...');
          window.location.href = response.authUrl;
        },
        error: (err) => {
          console.error('[AuthComponent] OAuth initiation failed:', err);
          this.showMessage('Failed to initiate OAuth', 'error');
          this.oauthLoading = false;
        },
      });
  }

  refreshToken(): void {
    console.log('[AuthComponent] Refreshing token...');
    this.oauthLoading = true;

    this.airtableService
      .refreshToken()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[AuthComponent] Token refreshed successfully');
          this.showMessage('Token refreshed successfully', 'success');
          this.loadStatus();
          this.oauthLoading = false;
        },
        error: (err) => {
          console.error('[AuthComponent] Token refresh failed:', err);
          this.showMessage(
            'Failed to refresh token. Please re-authenticate.',
            'error'
          );
          this.oauthLoading = false;
        },
      });
  }

  // ============================================
  // SCRAPING AUTHENTICATION ACTIONS
  // ============================================

  authenticateScraping(ngForm: NgForm): void {
    console.log('[AuthComponent] Authenticating for scraping...');

    if (!this.scrapingCreds.email || !this.scrapingCreds.password) {
      this.showMessage('Email and password are required', 'warning');
      return;
    }

    if (this.mfaRequired && !this.scrapingCreds.mfaCode) {
      this.showMessage('MFA code is required', 'warning');
      return;
    }

    this.scrapingLoading = true;

    this.airtableService
      .authenticateScraping(this.scrapingCreds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.mfaRequired) {
            console.log('[AuthComponent] MFA code required');
            this.mfaRequired = true;
            this.showMessage(
              response.message ||
                'MFA code required. Please enter the 6-digit code.',
              'warning'
            );
            this.scrapingLoading = false;
            return;
          }

          console.log('[AuthComponent] Scraping authentication successful');
          this.mfaRequired = false;
          this.showMessage('Scraping authentication successful!', 'success');
          this.loadStatus();
          this.scrapingLoading = false;

          // Clear form
          this.scrapingCreds = {
            email: '',
            password: '',
            mfaCode: '',
          };
          ngForm.resetForm(this.scrapingCreds);
          // If scraping was required and now complete, redirect to return URL
          if (this.requiresScraping && this.returnUrl !== '/authentication') {
            setTimeout(() => {
              console.log(
                '[AuthComponent] Scraping auth complete, redirecting to:',
                this.returnUrl
              );
              this.router.navigate([this.returnUrl]);
            }, 1500);
          }
        },
        error: (err) => {
          console.error('[AuthComponent] Scraping authentication failed:', err);

          if (err.error?.mfaRequired) {
            this.mfaRequired = true;
            this.showMessage(
              err.error.message ||
                'MFA code required. Please enter the 6-digit code.',
              'warning'
            );
          } else {
            this.showMessage(
              err.error?.message || err.error?.error || 'Authentication failed',
              'error'
            );
          }
          this.scrapingLoading = false;
        },
      });
  }

  validateCookies(): void {
    console.log('[AuthComponent] Validating cookies...');
    this.scrapingLoading = true;

    this.airtableService
      .validateCookies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AuthComponent] Cookie validation result:', response);
          const message = response.valid
            ? 'Cookies are valid'
            : 'Cookies are invalid or expired';
          this.showMessage(message, response.valid ? 'success' : 'warning');
          this.loadStatus();
          this.scrapingLoading = false;
        },
        error: (err) => {
          console.error('[AuthComponent] Cookie validation failed:', err);
          this.showMessage('Failed to validate cookies', 'error');
          this.scrapingLoading = false;
        },
      });
  }

  clearCookies(): void {
    console.log('[AuthComponent] Clearing cookies...');
    this.scrapingLoading = true;

    this.airtableService
      .clearCookies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[AuthComponent] Cookies cleared successfully');
          this.showMessage('Cookies cleared successfully', 'success');
          this.mfaRequired = false;
          this.loadStatus();
          this.scrapingLoading = false;
        },
        error: (err) => {
          console.error('[AuthComponent] Failed to clear cookies:', err);
          this.showMessage('Failed to clear cookies', 'error');
          this.scrapingLoading = false;
        },
      });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getTimeRemaining(expiresAt: string): string {
    if (!expiresAt) return 'Unknown';

    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  isExpiringSoon(): boolean {
    if (!this.authStatus.expiresAt) return false;

    const now = new Date().getTime();
    const expiry = new Date(this.authStatus.expiresAt).getTime();
    const diff = expiry - now;
    const fiveMinutes = 5 * 60 * 1000;

    return diff > 0 && diff <= fiveMinutes;
  }

  showMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Close', {
      duration: type === 'warning' ? 8000 : 4000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
