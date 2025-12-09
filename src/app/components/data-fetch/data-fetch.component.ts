import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { AirtableService } from '../../services/airtable.service';

@Component({
  selector: 'app-data-fetch',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatListModule,
  ],
  providers: [AirtableService],
  templateUrl: './data-fetch.component.html',
  styleUrls: ['./data-fetch.component.css'],
})
export class DataFetchComponent implements OnInit {
  loading = false;
  stats: any = {};
  bases: any[] = [];
  tables: any[] = [];
  pages: any[] = [];
  activityLog: any[] = [];

  constructor(
    private airtableService: AirtableService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.refreshStats();
    this.loadStoredData();
  }

  refreshStats() {
    this.airtableService.getStats().subscribe({
      next: (response: any) => {
        this.stats = response.stats;
      },
      error: (err: any) => {
        console.error('Error loading stats:', err);
      },
    });
  }

  loadStoredData() {
    this.airtableService.getBases().subscribe({
      next: (response: any) => {
        this.bases = response.bases || [];
      },
      error: (err: any) => console.error('Error loading bases:', err),
    });

    this.airtableService.getTables().subscribe({
      next: (response: any) => {
        this.tables = response.tables || [];
      },
      error: (err: any) => console.error('Error loading tables:', err),
    });

    this.airtableService.getPages().subscribe({
      next: (response: any) => {
        this.pages = response.pages || [];
      },
      error: (err: any) => console.error('Error loading pages:', err),
    });
  }

  fetchAllData() {
    this.loading = true;
    this.addLog('info', 'Started fetching all data...');

    this.airtableService.fetchAllData().subscribe({
      next: (response: any) => {
        this.showMessage(
          `Successfully fetched: ${response.summary.bases} bases, ${response.summary.tables} tables, ${response.summary.pages} pages`,
          'success'
        );
        this.addLog(
          'success',
          `Fetched ${response.summary.bases} bases, ${response.summary.tables} tables, ${response.summary.pages} pages`
        );
        this.loading = false;
        this.refreshStats();
        this.loadStoredData();
      },
      error: (err: any) => {
        this.showMessage(
          'Failed to fetch data: ' + (err.error?.message || 'Unknown error'),
          'error'
        );
        this.addLog('error', 'Failed to fetch all data');
        this.loading = false;
      },
    });
  }

  fetchBases() {
    this.loading = true;
    this.addLog('info', 'Fetching bases...');

    this.airtableService.fetchBases().subscribe({
      next: (response: any) => {
        this.showMessage(`Fetched ${response.count} bases`, 'success');
        this.addLog('success', `Fetched ${response.count} bases`);
        this.bases = response.bases;
        this.loading = false;
        this.refreshStats();
      },
      error: (err: any) => {
        this.showMessage('Failed to fetch bases', 'error');
        this.addLog('error', 'Failed to fetch bases');
        this.loading = false;
      },
    });
  }

  fetchTablesForBase(baseId: string) {
    this.loading = true;
    this.addLog('info', `Fetching tables for base ${baseId}...`);

    this.airtableService.fetchTables(baseId).subscribe({
      next: (response: any) => {
        this.showMessage(`Fetched ${response.count} tables`, 'success');
        this.addLog(
          'success',
          `Fetched ${response.count} tables for base ${baseId}`
        );
        this.loading = false;
        this.refreshStats();
        this.loadStoredData();
      },
      error: (err: any) => {
        this.showMessage('Failed to fetch tables', 'error');
        this.addLog('error', `Failed to fetch tables for base ${baseId}`);
        this.loading = false;
      },
    });
  }

  fetchPagesForTable(baseId: string, tableId: string) {
    this.loading = true;
    this.addLog('info', `Fetching pages for table ${tableId}...`);

    this.airtableService.fetchPages(baseId, tableId).subscribe({
      next: (response: any) => {
        this.showMessage(`Fetched ${response.count} pages`, 'success');
        this.addLog(
          'success',
          `Fetched ${response.count} pages for table ${tableId}`
        );
        this.loading = false;
        this.refreshStats();
        this.loadStoredData();
      },
      error: (err: any) => {
        this.showMessage('Failed to fetch pages', 'error');
        this.addLog('error', `Failed to fetch pages for table ${tableId}`);
        this.loading = false;
      },
    });
  }

  addLog(type: 'info' | 'success' | 'error', message: string) {
    const icons = {
      info: 'info',
      success: 'check_circle',
      error: 'error',
    };

    this.activityLog.unshift({
      type,
      icon: icons[type],
      time: new Date().toLocaleTimeString(),
      message,
    });

    // Keep only last 20 logs
    if (this.activityLog.length > 20) {
      this.activityLog = this.activityLog.slice(0, 20);
    }
  }

  showMessage(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: [`snackbar-${type}`],
    });
  }
}
