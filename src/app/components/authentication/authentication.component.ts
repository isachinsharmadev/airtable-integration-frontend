import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AirtableService } from '../../services/airtable.service';

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
  ],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.css',
})
export class AuthenticationComponent implements OnInit {
  authStatus: any = {};
  cookieStatus: any = {};
  oauthLoading = false;
  scrapingLoading = false;
  hidePassword = true;
  mfaRequired = false; // Track if MFA is required

  scrapingCreds = {
    email: '',
    password: '',
    mfaCode: '',
  };

  constructor(
    private airtableService: AirtableService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadStatus();
    this.handleOAuthCallback();
  }

  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'true') {
      this.showMessage('OAuth authentication successful!', 'success');
      this.loadStatus();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      this.showMessage(`OAuth error: ${error}`, 'error');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  loadStatus() {
    this.airtableService.getAuthStatus().subscribe({
      next: (status) => {
        this.authStatus = status;
      },
      error: (err) => console.error('Error loading auth status:', err),
    });

    this.airtableService.getCookieStatus().subscribe({
      next: (status) => {
        this.cookieStatus = status;
      },
      error: (err) => console.error('Error loading cookie status:', err),
    });
  }

  initiateOAuth() {
    this.oauthLoading = true;
    this.airtableService.getAuthUrl().subscribe({
      next: (response) => {
        console.log('response ***** ');
        console.log(response);
        console.log('*****');
        // Redirect browser to Airtable OAuth page
        window.location.href = response.authUrl;
      },
      error: (err) => {
        this.showMessage('Failed to initiate OAuth', 'error');
        this.oauthLoading = false;
      },
    });
  }

  refreshToken() {
    this.oauthLoading = true;
    this.airtableService.refreshToken().subscribe({
      next: () => {
        this.showMessage('Token refreshed successfully', 'success');
        this.loadStatus();
        this.oauthLoading = false;
      },
      error: (err) => {
        this.showMessage('Failed to refresh token', 'error');
        this.oauthLoading = false;
      },
    });
  }

  authenticateScraping() {
    this.scrapingLoading = true;
    this.airtableService.authenticateScraping(this.scrapingCreds).subscribe({
      next: (response) => {
        // Check if MFA is required (response.mfaRequired will be true)
        if (response.mfaRequired) {
          this.mfaRequired = true;
          this.showMessage(
            response.message ||
              'MFA code required. Please enter the 6-digit code from your authenticator app.',
            'warning'
          );
          this.scrapingLoading = false;
          // Keep the form visible so user can enter MFA code
          return;
        }

        // Success - authentication complete
        this.mfaRequired = false;
        this.showMessage('Scraping authentication successful!', 'success');
        this.loadStatus();
        this.scrapingLoading = false;

        // Clear the form
        this.scrapingCreds = {
          email: '',
          password: '',
          mfaCode: '',
        };
      },
      error: (err) => {
        // Check if error response contains MFA requirement
        if (err.error?.mfaRequired) {
          this.mfaRequired = true;
          this.showMessage(
            err.error.message ||
              'MFA code required. Please enter the 6-digit code from your authenticator app.',
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

  validateCookies() {
    this.scrapingLoading = true;
    this.airtableService.validateCookies().subscribe({
      next: (response) => {
        const message = response.valid
          ? 'Cookies are valid'
          : 'Cookies are invalid';
        this.showMessage(message, response.valid ? 'success' : 'warning');
        this.loadStatus();
        this.scrapingLoading = false;
      },
      error: (err) => {
        this.showMessage('Failed to validate cookies', 'error');
        this.scrapingLoading = false;
      },
    });
  }

  clearCookies() {
    this.scrapingLoading = true;
    this.airtableService.clearCookies().subscribe({
      next: () => {
        this.showMessage('Cookies cleared successfully', 'success');
        this.loadStatus();
        this.scrapingLoading = false;
      },
      error: (err) => {
        this.showMessage('Failed to clear cookies', 'error');
        this.scrapingLoading = false;
      },
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  showMessage(message: string, type: 'success' | 'error' | 'warning') {
    this.snackBar.open(message, 'Close', {
      duration: type === 'warning' ? 8000 : 4000, // Show warnings longer
      panelClass: [`snackbar-${type}`],
    });
  }
}
