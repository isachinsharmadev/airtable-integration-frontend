import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Needed for pipes, structural directives (though not strictly needed here, it's good practice for standalone components)
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular'; // The standalone AG Grid component

// NOTE: Ensure your AirtableService is available, either by making it 'providedIn: root'
// or ensuring it's imported correctly in your application's routes/providers array.
import { AirtableService } from '../../services/airtable.service'; // Adjust path as necessary

// --- TypeScript Interfaces (Keep these outside or above the component definition) ---

// Interface for a single revision change
interface Revision {
  uuid: string;
  issueId: string;
  columnType: string;
  oldValue: string;
  newValue: string;
  createdDate: string;
  authoredBy: string;
}

// Interface for the history object containing multiple revisions
interface History {
  _id: string;
  pageId: string;
  baseId: string;
  tableId: string;
  createdAt: string;
  revisions: Revision[];
  updatedAt: string;
}

// Interface for the final flattened row to be rendered in AG Grid
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

// --- Standalone Component ---

@Component({
  standalone: true, // Key for Angular 19 Standalone Component
  selector: 'app-data-view',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.css'],
  providers: [AirtableService],
  imports: [
    CommonModule, // Import CommonModule for standard directives/pipes
    AgGridAngular, // Import the AG Grid standalone component
  ],
})
export class DataViewComponent implements OnInit {
  // AG Grid properties
  public columnDefs: ColDef[] = [];
  public rowData: RevisionRow[] = [];
  public defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 150,
  };

  private gridApi!: GridApi<RevisionRow>;

  constructor(private airtableService: AirtableService) {}

  ngOnInit(): void {
    this.setupColumnDefs();
    this.fetchRevisionHistory();
  }

  // Define the columns for AG Grid
  setupColumnDefs(): void {
    this.columnDefs = [
      { headerName: 'Page ID', field: 'pageId', minWidth: 120, pinned: 'left' },
      { headerName: 'Base ID', field: 'baseId', minWidth: 120 },
      {
        headerName: 'Revision Type',
        field: 'revisionType',
        minWidth: 150,
        cellStyle: (params) => {
          if (params.value === 'status') {
            return { backgroundColor: '#e6f7ff' }; // Light blue
          }
          if (params.value === 'assignee') {
            return { backgroundColor: '#fffbe6' }; // Light yellow
          }
          return null;
        },
      },
      { headerName: 'Old Value', field: 'oldValue', minWidth: 150 },
      {
        headerName: 'New Value',
        field: 'newValue',
        minWidth: 150,
        cellStyle: { fontWeight: 'bold' },
      },
      { headerName: 'User', field: 'user', minWidth: 150 },
      {
        headerName: 'Date',
        field: 'date',
        sort: 'desc',
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleString() : '',
      },
    ];
  }

  // Fetch data and prepare it for the grid
  fetchRevisionHistory(): void {
    // NOTE: You must provide the necessary parameters (baseId, tableId, pageId, etc.)
    // to your getRevisionHistories method here.
    this.airtableService.getRevisionHistories(/* parameters here */).subscribe({
      next: (response) => {
        if (response && response.histories) {
          this.rowData = this.flattenRevisions(response.histories);
        }
      },
      error: (err) => {
        console.error('Failed to fetch revision history:', err);
      },
    });
  }

  /**
   * Transforms the nested array of histories into a flat array of individual revision rows.
   */
  flattenRevisions(histories: History[]): RevisionRow[] {
    const flattened: RevisionRow[] = [];

    for (const history of histories) {
      for (const revision of history.revisions) {
        flattened.push({
          pageId: history.pageId,
          baseId: history.baseId,
          tableId: history.tableId,
          historyId: history._id,

          revisionType: revision.columnType,
          oldValue: revision.oldValue,
          newValue: revision.newValue,
          date: revision.createdDate,
          user: revision.authoredBy,
        });
      }
    }

    return flattened;
  }

  onGridReady(params: GridReadyEvent<RevisionRow>): void {
    this.gridApi = params.api;
    // Auto-size columns to fit the content once the grid is ready
    this.gridApi.sizeColumnsToFit();
  }
}
