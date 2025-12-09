import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RevisionHistoryActivity {
  uuid: string;
  issueId: string;
  columnType: 'Assignee' | 'Status';
  oldValue: string | null;
  newValue: string | null;
  createdDate: Date;
  authoredBy: string;
}

@Injectable({
  providedIn: 'root',
})
export class RevisionHistoryService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  fetchRevisionHistory(
    baseId: string,
    tableId: string,
    recordIds: string[],
    cookies: string
  ): Observable<{
    success: boolean;
    count: number;
    activities: RevisionHistoryActivity[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/revision-history/fetch`, {
      baseId,
      tableId,
      recordIds,
      cookies,
    });
  }

  getStoredHistory(
    baseId: string,
    tableId: string,
    recordId: string
  ): Observable<{ history: RevisionHistoryActivity[] }> {
    return this.http.get<any>(
      `${this.apiUrl}/revision-history/${baseId}/${tableId}/${recordId}`
    );
  }
}
