import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AirtableService } from './services/airtable.service';

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
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  loading = false;
  authStatus: any = { authenticated: false };

  constructor(private airtableService: AirtableService) {}

  ngOnInit() {
    this.checkAuthStatus();
    this.handleOAuthCallback();
  }

  checkAuthStatus() {
    this.airtableService.getAuthStatus().subscribe({
      next: (status) => {
        this.authStatus = status;
      },
      error: (err) => {
        console.error('Error checking auth status:', err);
      },
    });
  }

  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success) {
      console.log('OAuth authentication successful');
      this.checkAuthStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      console.error('OAuth error:', error);
    }
  }

  logout() {
    this.airtableService.logout().subscribe({
      next: () => {
        this.authStatus = { authenticated: false };
        console.log('Logged out successfully');
      },
      error: (err) => {
        console.error('Logout error:', err);
      },
    });
  }
}
