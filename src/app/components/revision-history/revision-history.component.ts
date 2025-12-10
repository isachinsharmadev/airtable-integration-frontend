import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CookieService } from '../../services/cookie.service';
import {
  RevisionHistoryService,
  RevisionHistoryActivity,
} from '../../services/revision-history.service';
import { ColDef } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'app-revision-history',
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
    ReactiveFormsModule,
    AgGridAngular,
  ],
  templateUrl: './revision-history.component.html',
  styleUrls: ['./revision-history.component.css'],
})
export class RevisionHistoryComponent implements OnInit {
  authForm: FormGroup;
  scrapeForm: FormGroup;
  isAuthenticated = false;
  isLoading = false;
  showMfaInput = false;

  // AG Grid
  columnDefs: ColDef[] = [
    { field: 'issueId', headerName: 'Issue ID', sortable: true, filter: true },
    { field: 'columnType', headerName: 'Type', sortable: true, filter: true },
    {
      field: 'oldValue',
      headerName: 'Old Value',
      sortable: true,
      filter: true,
    },
    {
      field: 'newValue',
      headerName: 'New Value',
      sortable: true,
      filter: true,
    },
    {
      field: 'createdDate',
      headerName: 'Date',
      sortable: true,
      filter: true,
      valueFormatter: (params: any) => new Date(params.value).toLocaleString(),
    },
    { field: 'authoredBy', headerName: 'Author', sortable: true, filter: true },
  ];

  rowData: RevisionHistoryActivity[] = [];
  defaultColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
  };

  constructor(
    private fb: FormBuilder,
    private cookieService: CookieService,
    private revisionHistoryService: RevisionHistoryService,
    private snackBar: MatSnackBar
  ) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      mfaCode: [''],
    });

    this.scrapeForm = this.fb.group({
      baseId: ['', Validators.required],
      tableId: ['', Validators.required],
      recordIds: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Check if cookies exist
    const cookies = this.cookieService.getCurrentCookies();
    if (cookies) {
      this.validateExistingCookies(cookies);
    }
  }

  async validateExistingCookies(cookies: string): Promise<void> {
    this.cookieService.validateCookies(cookies).subscribe({
      next: (response) => {
        if (response.valid) {
          this.isAuthenticated = true;
          this.showSuccess('Existing cookies are valid');
        } else {
          this.cookieService.clearCookies();
          this.showError('Stored cookies are invalid. Please re-authenticate.');
        }
      },
      error: () => {
        this.cookieService.clearCookies();
      },
    });
  }

  authenticate(): void {
    if (this.authForm.invalid) return;

    this.isLoading = true;
    const { email, password, mfaCode } = this.authForm.value;

    this.cookieService.retrieveCookies(email, password, mfaCode).subscribe({
      next: (response) => {
        this.isAuthenticated = true;
        this.isLoading = false;
        this.showSuccess('Authentication successful!');
        this.authForm.reset();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.error?.message?.includes('MFA')) {
          this.showMfaInput = true;
          this.showError('MFA code required. Please enter your MFA code.');
        } else {
          this.showError(
            'Authentication failed. Please check your credentials.'
          );
        }
      },
    });
  }

  fetchRevisionHistory(): void {
    if (this.scrapeForm.invalid) return;

    const cookies = this.cookieService.getCurrentCookies();
    if (!cookies) {
      this.showError('Please authenticate first');
      return;
    }

    this.isLoading = true;
    const { baseId, tableId, recordIds } = this.scrapeForm.value;

    // Parse record IDs (comma-separated)
    const recordIdArray = recordIds.split(',').map((id: string) => id.trim());

    this.revisionHistoryService
      .fetchRevisionHistory(baseId, tableId, recordIdArray, cookies)
      .subscribe({
        next: (response) => {
          this.rowData = response.activities;
          this.isLoading = false;
          this.showSuccess(
            `Fetched ${response.count} revision history records`
          );
        },
        error: (error) => {
          this.isLoading = false;
          if (error.error?.requiresReauth) {
            this.isAuthenticated = false;
            this.cookieService.clearCookies();
            this.showError('Cookies expired. Please re-authenticate.');
          } else {
            this.showError('Failed to fetch revision history');
          }
        },
      });
  }

  logout(): void {
    this.cookieService.clearCookies();
    this.isAuthenticated = false;
    this.rowData = [];
    this.showSuccess('Logged out successfully');
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }
}
