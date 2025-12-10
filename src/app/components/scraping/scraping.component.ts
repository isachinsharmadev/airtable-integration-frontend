/**
 * Scraping Component - Enhanced Version with AG Grid
 *
 * Fetches revision history for all pages using custom scraping.
 * Features:
 * - Cookie status monitoring
 * - Bulk revision history fetching (up to 200 pages)
 * - Statistics display
 * - AG Grid table with filtering, sorting, pagination
 * - Export to CSV/Excel
 * - Real-time progress tracking
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSliderModule } from '@angular/material/slider';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { AirtableService } from '../../services/airtable.service';
import { Subject, takeUntil, interval } from 'rxjs';

interface RevisionHistoryRecord {
  pageId: string;
  baseId: string;
  tableName: string;
  revisionCount: number;
  assigneeChanges: number;
  statusChanges: number;
  lastModified: string;
  hasHistory: boolean;
}

interface Stats {
  totalPages: number;
  totalRevisions: number;
  assigneeChanges: number;
  statusChanges: number;
}

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
    MatTooltipModule,
    MatBadgeModule,
    MatSliderModule,
    AgGridAngular,
  ],
  templateUrl: './scraping.component.html',
  styleUrls: ['./scraping.component.css'],
})
export class ScrapingComponent implements OnInit, OnDestroy {
  // Loading states
  loading = false;
  fetchingRevisions = false;

  // Data
  cookieStatus: any = {
    hasCookies: false,
    valid: false,
    lastValidated: null,
  };
  revisionStats: Stats = {
    totalPages: 0,
    totalRevisions: 0,
    assigneeChanges: 0,
    statusChanges: 0,
  };

  // Settings
  batchSize = 10;
  maxBatchSize = 20;
  minBatchSize = 5;

  // AG Grid
  gridApi: any;
  gridColumnApi: any;
  rowData: RevisionHistoryRecord[] = [];

  columnDefs: ColDef[] = [
    {
      field: 'pageId',
      headerName: 'Page ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      pinned: 'left',
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'tableName',
      headerName: 'Table',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
    },
    {
      field: 'revisionCount',
      headerName: 'Total Revisions',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 140,
      cellStyle: (params) => {
        if (params.value > 10) {
          return { color: '#10b981', fontWeight: '500' };
        }
        return null;
      },
    },
    {
      field: 'assigneeChanges',
      headerName: 'Assignee Changes',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 160,
      cellRenderer: (params: any) => {
        if (params.value > 0) {
          return `<span style="color: #3b82f6; font-weight: 500;">${params.value}</span>`;
        }
        return `<span style="color: #9ca3af;">${params.value}</span>`;
      },
    },
    {
      field: 'statusChanges',
      headerName: 'Status Changes',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 150,
      cellRenderer: (params: any) => {
        if (params.value > 0) {
          return `<span style="color: #f59e0b; font-weight: 500;">${params.value}</span>`;
        }
        return `<span style="color: #9ca3af;">${params.value}</span>`;
      },
    },
    {
      field: 'hasHistory',
      headerName: 'Has History',
      sortable: true,
      filter: 'agSetColumnFilter',
      width: 130,
      cellRenderer: (params: any) => {
        if (params.value) {
          return '<span style="color: #10b981;">✓ Yes</span>';
        }
        return '<span style="color: #ef4444;">✗ No</span>';
      },
    },
    {
      field: 'lastModified',
      headerName: 'Last Modified',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 180,
      valueFormatter: (params: any) => {
        if (!params.value) return 'N/A';
        return new Date(params.value).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      field: 'baseId',
      headerName: 'Base ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      hide: true, // Hidden by default
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filter: true,
  };

  gridOptions: GridOptions = {
    pagination: true,
    paginationPageSize: 20,
    paginationPageSizeSelector: [10, 20, 50, 100],
    animateRows: true,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    defaultColDef: this.defaultColDef,
  };

  // Component lifecycle
  private destroy$ = new Subject<void>();

  constructor(
    private airtableService: AirtableService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('[Scraping] Initializing...');
    this.loadStatus();
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
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('[Scraping] Polling status...');
        this.loadStatus();
      });
  }

  // ============================================
  // DATA LOADING
  // ============================================

  /**
   * Load cookie status and revision statistics
   */
  loadStatus(): void {
    console.log('[Scraping] Loading status...');

    // Load cookie status
    this.airtableService
      .getCookieStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          console.log('[Scraping] Cookie status:', status);
          this.cookieStatus = status;
        },
        error: (err) => {
          console.error('[Scraping] Error loading cookie status:', err);
          this.cookieStatus = {
            hasCookies: false,
            valid: false,
            lastValidated: null,
          };
        },
      });

    // Load revision history statistics
    this.airtableService
      .getRevisionHistories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[Scraping] Revision stats:', response.stats);
          this.revisionStats = response.stats;

          // Load grid data if we have revisions
          if (
            response.revisionHistories &&
            response.revisionHistories.length > 0
          ) {
            this.loadGridData(response.revisionHistories);
          }
        },
        error: (err) => {
          console.error('[Scraping] Error loading revision stats:', err);
          this.revisionStats = {
            totalPages: 0,
            totalRevisions: 0,
            assigneeChanges: 0,
            statusChanges: 0,
          };
        },
      });
  }

  /**
   * Load data into AG Grid
   */
  loadGridData(revisionHistories: any[]): void {
    console.log(
      `[Scraping] Loading ${revisionHistories.length} records into grid`
    );

    this.rowData = revisionHistories.map((history: any) => ({
      pageId: history.pageId,
      baseId: history.baseId || 'N/A',
      tableName: history.tableName || 'Unknown',
      revisionCount: history.revisions?.length || 0,
      assigneeChanges:
        history.revisions?.filter((r: any) => r.columnType === 'assignee')
          .length || 0,
      statusChanges:
        history.revisions?.filter((r: any) => r.columnType === 'status')
          .length || 0,
      lastModified: history.lastModified,
      hasHistory: (history.revisions?.length || 0) > 0,
    }));
  }

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Fetch all revision histories
   */
  fetchAllRevisions(): void {
    if (!this.cookieStatus.valid) {
      this.showMessage(
        'Please authenticate first in the Authentication page',
        'warning'
      );
      return;
    }

    console.log('[Scraping] Starting revision history fetch...');
    this.fetchingRevisions = true;
    this.loading = true;

    this.showMessage(
      `Starting revision history fetch for up to 200 pages (batch size: ${this.batchSize})...`,
      'info'
    );

    this.airtableService
      .fetchAllRevisions(this.batchSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[Scraping] Fetch complete:', response);

          this.showMessage(
            response.message || 'Revision history fetch complete!',
            'success'
          );
          this.fetchingRevisions = false;
          this.loading = false;

          // Reload data after a short delay
          setTimeout(() => this.loadStatus(), 2000);
        },
        error: (err) => {
          console.error('[Scraping] Fetch failed:', err);

          this.showMessage(
            err.error?.message || 'Failed to start revision history fetch',
            'error'
          );
          this.fetchingRevisions = false;
          this.loading = false;
        },
      });
  }

  /**
   * Validate cookies
   */
  validateCookies(): void {
    console.log('[Scraping] Validating cookies...');
    this.loading = true;

    this.airtableService
      .validateCookies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[Scraping] Validation result:', response);

          const message = response.valid
            ? 'Cookies are valid'
            : 'Cookies are invalid or expired';
          this.showMessage(message, response.valid ? 'success' : 'warning');

          this.loadStatus();
          this.loading = false;
        },
        error: (err) => {
          console.error('[Scraping] Validation failed:', err);

          this.showMessage('Failed to validate cookies', 'error');
          this.loading = false;
        },
      });
  }

  /**
   * Refresh statistics
   */
  refreshStats(): void {
    console.log('[Scraping] Refreshing statistics...');
    this.loadStatus();
  }

  // ============================================
  // AG GRID ACTIONS
  // ============================================

  /**
   * AG Grid ready event
   */
  onGridReady(params: GridReadyEvent): void {
    console.log('[Scraping] Grid ready');
    this.gridApi = params.api;

    // Auto-size columns
    this.gridApi.sizeColumnsToFit();
  }

  /**
   * Export grid data to CSV
   */
  exportToCSV(): void {
    if (!this.gridApi) return;

    console.log('[Scraping] Exporting to CSV...');
    this.gridApi.exportDataAsCsv({
      fileName: `revision-history-${
        new Date().toISOString().split('T')[0]
      }.csv`,
    });

    this.showMessage('Exported to CSV', 'success');
  }

  /**
   * Export grid data to Excel
   */
  exportToExcel(): void {
    if (!this.gridApi) return;

    console.log('[Scraping] Exporting to Excel...');
    this.gridApi.exportDataAsExcel({
      fileName: `revision-history-${
        new Date().toISOString().split('T')[0]
      }.xlsx`,
    });

    this.showMessage('Exported to Excel', 'success');
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    if (!this.gridApi) return;

    console.log('[Scraping] Clearing filters...');
    this.gridApi.setFilterModel(null);
    this.showMessage('Filters cleared', 'success');
  }

  /**
   * Reset grid to default state
   */
  resetGrid(): void {
    if (!this.gridApi) return;

    console.log('[Scraping] Resetting grid...');
    this.gridApi.setFilterModel(null);
    this.gridColumnApi.resetColumnState();
    this.gridApi.sizeColumnsToFit();

    this.showMessage('Grid reset', 'success');
  }

  /**
   * Get selected rows count
   */
  getSelectedRowsCount(): number {
    if (!this.gridApi) return 0;
    return this.gridApi.getSelectedRows().length;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Format date for display
   */
  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get cookie status color
   */
  getCookieStatusColor(): string {
    if (this.cookieStatus.valid) return 'primary';
    if (this.cookieStatus.hasCookies) return 'warn';
    return 'warn';
  }

  /**
   * Get cookie status text
   */
  getCookieStatusText(): string {
    if (this.cookieStatus.hasCookies) {
      return this.cookieStatus.valid ? 'Valid' : 'Invalid';
    }
    return 'Not Available';
  }

  /**
   * Check if can fetch revisions
   */
  canFetchRevisions(): boolean {
    return this.cookieStatus.valid && !this.loading;
  }

  /**
   * Show snackbar message
   */
  showMessage(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info'
  ): void {
    this.snackBar.open(message, 'Close', {
      duration: type === 'info' ? 6000 : 4000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  /**
   * Format batch size display
   */
  formatBatchSizeLabel(value: number): string {
    return `${value}`;
  }
}
