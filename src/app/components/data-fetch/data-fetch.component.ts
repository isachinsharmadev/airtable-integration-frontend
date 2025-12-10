/**
 * Data Fetch Component - Enhanced Version
 *
 * Fetches data from Airtable using OAuth API and stores in MongoDB.
 * Features:
 * - Quick action for fetching all data
 * - Individual operations for bases, tables, and pages
 * - Real-time statistics
 * - Activity log
 * - Loading states and progress tracking
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { AirtableService } from '../../services/airtable.service';
import { Subject, takeUntil, interval } from 'rxjs';

interface ActivityLog {
  type: 'info' | 'success' | 'error';
  icon: string;
  time: string;
  message: string;
}

interface Stats {
  bases: number;
  tables: number;
  pages: number;
}

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
    MatTooltipModule,
    MatBadgeModule,
  ],
  templateUrl: './data-fetch.component.html',
  styleUrls: ['./data-fetch.component.css'],
})
export class DataFetchComponent implements OnInit, OnDestroy {
  // Loading states
  loading = false;
  basesLoading = false;
  tablesLoading = false;
  pagesLoading = false;

  // Data
  stats: Stats = { bases: 0, tables: 0, pages: 0 };
  bases: any[] = [];
  tables: any[] = [];
  pages: any[] = [];
  activityLog: ActivityLog[] = [];

  // UI state
  expandedPanels = {
    bases: false,
    tables: false,
    pages: false,
  };

  // Component lifecycle
  private destroy$ = new Subject<void>();

  constructor(
    private airtableService: AirtableService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('[DataFetch] Initializing...');
    this.refreshStats();
    this.loadStoredData();
    this.startStatsPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Start polling for statistics updates every 30 seconds
   */
  startStatsPolling(): void {
    interval(30000) // 30 seconds
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('[DataFetch] Polling stats...');
        this.refreshStats();
      });
  }

  // ============================================
  // DATA LOADING
  // ============================================

  /**
   * Refresh statistics from backend
   */
  refreshStats(): void {
    console.log('[DataFetch] Refreshing statistics...');

    this.airtableService
      .getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[DataFetch] Stats:', response.stats);
          this.stats = response.stats;
        },
        error: (err: any) => {
          console.error('[DataFetch] Error loading stats:', err);
        },
      });
  }

  /**
   * Load all stored data from backend
   */
  loadStoredData(): void {
    console.log('[DataFetch] Loading stored data...');

    // Load bases
    this.airtableService
      .getBases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.bases = response.bases || [];
          console.log(`[DataFetch] Loaded ${this.bases.length} bases`);
        },
        error: (err: any) => {
          console.error('[DataFetch] Error loading bases:', err);
        },
      });

    // Load tables
    this.airtableService
      .getTables()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.tables = response.tables || [];
          console.log(`[DataFetch] Loaded ${this.tables.length} tables`);
        },
        error: (err: any) => {
          console.error('[DataFetch] Error loading tables:', err);
        },
      });

    // Load pages
    this.airtableService
      .getPages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.pages = response.pages || [];
          console.log(`[DataFetch] Loaded ${this.pages.length} pages`);
        },
        error: (err: any) => {
          console.error('[DataFetch] Error loading pages:', err);
        },
      });
  }

  // ============================================
  // FETCH OPERATIONS
  // ============================================

  /**
   * Fetch all data (bases, tables, and pages) at once
   */
  fetchAllData(): void {
    console.log('[DataFetch] Starting full data fetch...');
    this.loading = true;
    this.addLog('info', 'Started fetching all data...');

    this.airtableService
      .fetchAllData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const summary = response.summary;
          console.log('[DataFetch] Fetch complete:', summary);

          this.showMessage(
            `Successfully fetched: ${summary.bases} bases, ${summary.tables} tables, ${summary.pages} pages`,
            'success'
          );

          this.addLog(
            'success',
            `Fetched ${summary.bases} bases, ${summary.tables} tables, ${summary.pages} pages`
          );

          this.loading = false;
          this.refreshStats();
          this.loadStoredData();
        },
        error: (err: any) => {
          console.error('[DataFetch] Fetch failed:', err);

          this.showMessage(
            'Failed to fetch data: ' + (err.error?.message || 'Unknown error'),
            'error'
          );

          this.addLog('error', 'Failed to fetch all data');
          this.loading = false;
        },
      });
  }

  /**
   * Fetch only bases from Airtable
   */
  fetchBases(): void {
    console.log('[DataFetch] Fetching bases...');
    this.basesLoading = true;
    this.addLog('info', 'Fetching bases...');

    this.airtableService
      .fetchBases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`[DataFetch] Fetched ${response.count} bases`);

          this.showMessage(`Fetched ${response.count} bases`, 'success');
          this.addLog('success', `Fetched ${response.count} bases`);

          this.bases = response.bases;
          this.basesLoading = false;
          this.refreshStats();

          // Auto-expand bases panel to show results
          this.expandedPanels.bases = true;
        },
        error: (err: any) => {
          console.error('[DataFetch] Failed to fetch bases:', err);

          this.showMessage('Failed to fetch bases', 'error');
          this.addLog('error', 'Failed to fetch bases');
          this.basesLoading = false;
        },
      });
  }

  /**
   * Fetch tables for a specific base
   */
  fetchTablesForBase(baseId: string, baseName: string): void {
    console.log(`[DataFetch] Fetching tables for base ${baseId}...`);
    this.tablesLoading = true;
    this.addLog('info', `Fetching tables for "${baseName}"...`);

    this.airtableService
      .fetchTables(baseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`[DataFetch] Fetched ${response.count} tables`);

          this.showMessage(
            `Fetched ${response.count} tables for "${baseName}"`,
            'success'
          );
          this.addLog(
            'success',
            `Fetched ${response.count} tables for "${baseName}"`
          );

          this.tablesLoading = false;
          this.refreshStats();
          this.loadStoredData();

          // Auto-expand tables panel to show results
          this.expandedPanels.tables = true;
        },
        error: (err: any) => {
          console.error('[DataFetch] Failed to fetch tables:', err);

          this.showMessage('Failed to fetch tables', 'error');
          this.addLog('error', `Failed to fetch tables for "${baseName}"`);
          this.tablesLoading = false;
        },
      });
  }

  /**
   * Fetch pages (records) for a specific table
   */
  fetchPagesForTable(baseId: string, tableId: string, tableName: string): void {
    console.log(`[DataFetch] Fetching pages for table ${tableId}...`);
    this.pagesLoading = true;
    this.addLog('info', `Fetching pages for "${tableName}"...`);

    this.airtableService
      .fetchPages(baseId, tableId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`[DataFetch] Fetched ${response.count} pages`);

          this.showMessage(
            `Fetched ${response.count} pages for "${tableName}"`,
            'success'
          );
          this.addLog(
            'success',
            `Fetched ${response.count} pages for "${tableName}"`
          );

          this.pagesLoading = false;
          this.refreshStats();
          this.loadStoredData();

          // Auto-expand pages panel to show results
          this.expandedPanels.pages = true;
        },
        error: (err: any) => {
          console.error('[DataFetch] Failed to fetch pages:', err);

          this.showMessage('Failed to fetch pages', 'error');
          this.addLog('error', `Failed to fetch pages for "${tableName}"`);
          this.pagesLoading = false;
        },
      });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Add entry to activity log
   */
  addLog(type: 'info' | 'success' | 'error', message: string): void {
    const icons = {
      info: 'info',
      success: 'check_circle',
      error: 'error',
    };

    this.activityLog.unshift({
      type,
      icon: icons[type],
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      message,
    });

    // Keep only last 50 logs
    if (this.activityLog.length > 50) {
      this.activityLog = this.activityLog.slice(0, 50);
    }
  }

  /**
   * Clear activity log
   */
  clearLog(): void {
    this.activityLog = [];
    console.log('[DataFetch] Activity log cleared');
  }

  /**
   * Show snackbar message
   */
  showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  /**
   * Get tables for a specific base
   */
  getTablesForBase(baseId: string): any[] {
    return this.tables.filter((table) => table.baseId === baseId);
  }

  /**
   * Check if any operation is loading
   */
  isAnyLoading(): boolean {
    return (
      this.loading ||
      this.basesLoading ||
      this.tablesLoading ||
      this.pagesLoading
    );
  }
}
