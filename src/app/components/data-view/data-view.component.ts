/**
 * Data View Component - Enhanced Version with AG Grid
 *
 * Displays data from MongoDB in multiple views:
 * - Bases
 * - Tables
 * - Pages (Records)
 * - Revision History (flattened)
 *
 * Features:
 * - Tab-based navigation between views
 * - AG Grid with filtering, sorting, pagination
 * - Export to CSV/Excel
 * - Statistics for each view
 * - Search and filter capabilities
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { AirtableService } from '../../services/airtable.service';
import { Subject, takeUntil } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// ============================================
// INTERFACES
// ============================================

interface Revision {
  uuid: string;
  issueId: string;
  columnType: string;
  oldValue: string;
  newValue: string;
  createdDate: string;
  authoredBy: string;
}

interface RevisionHistory {
  _id: string;
  pageId: string;
  baseId: string;
  tableId: string;
  createdAt: string;
  revisions: Revision[];
  updatedAt: string;
}

interface RevisionRow {
  pageId: string;
  baseId: string;
  tableId: string;
  revisionType: string;
  oldValue: string;
  newValue: string;
  date: string;
  user: string;
  historyId: string;
}

@Component({
  selector: 'app-data-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    AgGridAngular,
  ],
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.css'],
})
export class DataViewComponent implements OnInit, OnDestroy {
  // Loading states
  loading = false;
  basesLoading = false;
  tablesLoading = false;
  pagesLoading = false;
  revisionsLoading = false;

  // Data
  bases: any[] = [];
  tables: any[] = [];
  pages: any[] = [];
  revisionHistories: RevisionHistory[] = [];

  // AG Grid APIs (one for each tab)
  basesGridApi: any;
  tablesGridApi: any;
  pagesGridApi: any;
  revisionsGridApi: any;

  // Row data for each grid
  basesRowData: any[] = [];
  tablesRowData: any[] = [];
  pagesRowData: any[] = [];
  revisionsRowData: RevisionRow[] = [];

  // Component lifecycle
  private destroy$ = new Subject<void>();

  // ============================================
  // COLUMN DEFINITIONS
  // ============================================

  basesColumnDefs: ColDef[] = [
    {
      field: 'baseId',
      headerName: 'Base ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      pinned: 'left',
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'name',
      headerName: 'Name',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 200,
      cellStyle: { fontWeight: '500' },
    },
    {
      field: 'permissionLevel',
      headerName: 'Permission',
      sortable: true,
      filter: 'agTextColumnFilter', // Changed from agSetColumnFilter
      width: 140,
      cellRenderer: (params: any) => {
        const colors: any = {
          owner: '#10b981',
          create: '#3b82f6',
          edit: '#f59e0b',
          comment: '#8b5cf6',
          read: '#6b7280',
        };
        const color = colors[params.value] || '#6b7280';
        return `<span style="color: ${color}; font-weight: 500;">${
          params.value || 'N/A'
        }</span>`;
      },
    },
    {
      field: 'createdTime',
      headerName: 'Created',
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
  ];

  tablesColumnDefs: ColDef[] = [
    {
      field: 'tableId',
      headerName: 'Table ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      pinned: 'left',
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'name',
      headerName: 'Name',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 180,
      cellStyle: { fontWeight: '500' },
    },
    {
      field: 'baseId',
      headerName: 'Base ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'primaryFieldId',
      headerName: 'Primary Field',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
    },
    {
      field: 'fieldsCount',
      headerName: 'Fields',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100,
      valueGetter: (params: any) => params.data.fields?.length || 0,
      cellStyle: { textAlign: 'center', fontWeight: '500' },
    },
    {
      field: 'viewsCount',
      headerName: 'Views',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100,
      valueGetter: (params: any) => params.data.views?.length || 0,
      cellStyle: { textAlign: 'center', fontWeight: '500' },
    },
  ];

  pagesColumnDefs: ColDef[] = [
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
      field: 'baseId',
      headerName: 'Base ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'tableId',
      headerName: 'Table ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'fieldsCount',
      headerName: 'Fields',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100,
      valueGetter: (params: any) => {
        const fields = params.data.fields;
        return fields ? Object.keys(fields).length : 0;
      },
      cellStyle: { textAlign: 'center', fontWeight: '500' },
    },
    {
      field: 'createdTime',
      headerName: 'Created',
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
  ];

  revisionsColumnDefs: ColDef[] = [
    {
      field: 'pageId',
      headerName: 'Page ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 140,
      pinned: 'left',
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'revisionType',
      headerName: 'Type',
      sortable: true,
      filter: 'agTextColumnFilter', // Changed from agSetColumnFilter
      width: 120,
      cellStyle: (params) => {
        if (params.value === 'status') {
          return {
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            fontWeight: '500',
          };
        }
        if (params.value === 'assignee') {
          return {
            backgroundColor: '#fef3c7',
            color: '#92400e',
            fontWeight: '500',
          };
        }
        return null;
      },
    },
    {
      field: 'oldValue',
      headerName: 'Old Value',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
    },
    {
      field: 'newValue',
      headerName: 'New Value',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
      cellStyle: { fontWeight: '500', color: '#059669' },
    },
    {
      field: 'user',
      headerName: 'User',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 150,
    },
    {
      field: 'date',
      headerName: 'Date',
      sortable: true,
      sort: 'desc',
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
      width: 140,
      hide: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '0.85rem' },
    },
    {
      field: 'tableId',
      headerName: 'Table ID',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 140,
      hide: true,
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
    paginationPageSize: 50,
    paginationPageSizeSelector: [20, 50, 100, 200],
    animateRows: true,
    rowSelection: {
      mode: 'multiRow',
      enableClickSelection: false,
    },
    enableCellTextSelection: true,
    ensureDomOrder: true,
    theme: 'legacy', // Use legacy theme to avoid conflict with ag-grid.css
  };

  constructor(
    private airtableService: AirtableService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('[DataView] Initializing...');
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadAllData(): void {
    this.loadBases();
    this.loadTables();
    this.loadPages();
    this.loadRevisionHistories();
  }

  loadBases(): void {
    console.log('[DataView] Loading bases...');
    this.basesLoading = true;

    this.airtableService
      .getBases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`[DataView] Loaded ${response.bases?.length || 0} bases`);
          this.bases = response.bases || [];
          this.basesRowData = this.bases;
          this.basesLoading = false;
        },
        error: (err: any) => {
          console.error('[DataView] Error loading bases:', err);
          this.basesLoading = false;
          this.showMessage('Failed to load bases', 'error');
        },
      });
  }

  loadTables(): void {
    console.log('[DataView] Loading tables...');
    this.tablesLoading = true;

    this.airtableService
      .getTables()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(
            `[DataView] Loaded ${response.tables?.length || 0} tables`
          );
          this.tables = response.tables || [];
          this.tablesRowData = this.tables;
          this.tablesLoading = false;
        },
        error: (err: any) => {
          console.error('[DataView] Error loading tables:', err);
          this.tablesLoading = false;
          this.showMessage('Failed to load tables', 'error');
        },
      });
  }

  loadPages(): void {
    console.log('[DataView] Loading pages...');
    this.pagesLoading = true;

    this.airtableService
      .getPages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`[DataView] Loaded ${response.pages?.length || 0} pages`);
          this.pages = response.pages || [];
          this.pagesRowData = this.pages;
          this.pagesLoading = false;
        },
        error: (err: any) => {
          console.error('[DataView] Error loading pages:', err);
          this.pagesLoading = false;
          this.showMessage('Failed to load pages', 'error');
        },
      });
  }

  loadRevisionHistories(): void {
    console.log('[DataView] Loading revision histories...');
    this.revisionsLoading = true;

    this.airtableService
      .getRevisionHistories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[DataView] Revision histories response:', response);

          // The API returns { success, count, stats, histories, timestamp }
          const histories: RevisionHistory[] = response.histories || [];

          console.log(
            `[DataView] Loaded ${histories.length} revision histories`
          );
          this.revisionHistories = histories;
          this.revisionsRowData = this.flattenRevisions(this.revisionHistories);
          console.log(
            `[DataView] Flattened to ${this.revisionsRowData.length} revision rows`
          );
          this.revisionsLoading = false;
        },
        error: (err: any) => {
          console.error('[DataView] Error loading revision histories:', err);
          this.revisionsLoading = false;
          this.showMessage('Failed to load revision histories', 'error');
        },
      });
  }

  // ============================================
  // DATA TRANSFORMATION
  // ============================================

  flattenRevisions(histories: RevisionHistory[]): RevisionRow[] {
    console.log(
      '[DataView] Flattening revisions from',
      histories.length,
      'histories'
    );
    const flattened: RevisionRow[] = [];

    for (const history of histories) {
      if (!history.revisions || history.revisions.length === 0) {
        console.log(
          '[DataView] Skipping history with no revisions:',
          history.pageId
        );
        continue;
      }

      console.log(
        `[DataView] Processing ${history.revisions.length} revisions for page ${history.pageId}`
      );

      for (const revision of history.revisions) {
        flattened.push({
          pageId: history.pageId,
          baseId: history.baseId,
          tableId: history.tableId,
          historyId: history._id,
          revisionType: revision.columnType,
          oldValue: revision.oldValue || '-',
          newValue: revision.newValue || '-',
          date: revision.createdDate,
          user: revision.authoredBy || 'Unknown',
        });
      }
    }

    console.log('[DataView] Flattened to', flattened.length, 'revision rows');
    return flattened;
  }

  // ============================================
  // AG GRID EVENTS
  // ============================================

  onBasesGridReady(params: GridReadyEvent): void {
    this.basesGridApi = params.api;
    this.basesGridApi.sizeColumnsToFit();
  }

  onTablesGridReady(params: GridReadyEvent): void {
    this.tablesGridApi = params.api;
    this.tablesGridApi.sizeColumnsToFit();
  }

  onPagesGridReady(params: GridReadyEvent): void {
    this.pagesGridApi = params.api;
    this.pagesGridApi.sizeColumnsToFit();
  }

  onRevisionsGridReady(params: GridReadyEvent): void {
    this.revisionsGridApi = params.api;
    this.revisionsGridApi.sizeColumnsToFit();
  }

  // ============================================
  // EXPORT ACTIONS
  // ============================================

  exportToCSV(gridApi: any, filename: string): void {
    if (!gridApi) return;
    gridApi.exportDataAsCsv({
      fileName: `${filename}-${new Date().toISOString().split('T')[0]}.csv`,
    });
    this.showMessage('Exported to CSV', 'success');
  }

  exportToExcel(gridApi: any, filename: string): void {
    if (!gridApi) return;
    gridApi.exportDataAsExcel({
      fileName: `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`,
    });
    this.showMessage('Exported to Excel', 'success');
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  refreshData(): void {
    this.loadAllData();
    this.showMessage('Data refreshed', 'success');
  }
}
