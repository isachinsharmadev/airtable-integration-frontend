import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AirtableService } from '../../services/airtable.service';

@Component({
  selector: 'app-scraping',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  templateUrl: './scraping.component.html',
  styleUrls: ['./scraping.component.css'],
})
export class ScrapingComponent implements OnInit {
  loading = false;
  cookieStatus: any = {};
  revisionStats: any = {};
  batchSize = 10;

  constructor(
    private airtableService: AirtableService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadStatus();
  }

  loadStatus() {
    this.airtableService.getCookieStatus().subscribe({
      next: (status) => {
        this.cookieStatus = status;
      },
      error: (err) => console.error('Error loading cookie status:', err),
    });

    this.airtableService.getRevisionHistories().subscribe({
      next: (response) => {
        this.revisionStats = response.stats;
      },
      error: (err) => console.error('Error loading revision stats:', err),
    });
  }

  fetchAllRevisions() {
    if (!this.cookieStatus.valid) {
      this.showMessage(
        'Please authenticate first in the Authentication page',
        'warning'
      );
      return;
    }

    this.loading = true;
    this.showMessage(
      'Starting revision history fetch for 200+ pages...',
      'info'
    );

    this.airtableService.fetchAllRevisions(this.batchSize).subscribe({
      next: (response) => {
        this.showMessage(response.message, 'success');
        this.loading = false;
        setTimeout(() => this.loadStatus(), 2000);
      },
      error: (err) => {
        this.showMessage('Failed to start revision history fetch', 'error');
        this.loading = false;
      },
    });
  }

  validateCookies() {
    this.loading = true;
    this.airtableService.validateCookies().subscribe({
      next: (response) => {
        const message = response.valid
          ? 'Cookies are valid'
          : 'Cookies are invalid';
        this.showMessage(message, response.valid ? 'success' : 'warning');
        this.loadStatus();
        this.loading = false;
      },
      error: (err) => {
        this.showMessage('Failed to validate cookies', 'error');
        this.loading = false;
      },
    });
  }

  refreshStats() {
    this.loadStatus();
  }

  showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    this.snackBar.open(message, 'Close', {
      duration: type === 'info' ? 6000 : 4000,
      panelClass: [`snackbar-${type}`],
    });
  }
}
