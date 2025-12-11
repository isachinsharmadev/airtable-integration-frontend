import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AirtableService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Authentication
  getAuthUrl(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/authorize`);
  }
  //   startAuth(): void {
  //   window.location.href = `${this.apiUrl}/auth/authorize`;
  // }

  getAuthStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/status`);
  }

  refreshToken(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/refresh`, {});
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {});
  }

  // Data fetching
  fetchBases(): Observable<any> {
    return this.http.post(`${this.apiUrl}/data/fetch-bases`, {});
  }

  fetchTables(baseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/data/fetch-tables/${baseId}`, {});
  }

  fetchPages(baseId: string, tableId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/data/fetch-pages/${baseId}/${tableId}`,
      {}
    );
  }

  fetchAllData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/data/fetch-all-parallel`, {});
  }

  // Get stored data
  getBases(): Observable<any> {
    return this.http.get(`${this.apiUrl}/data/bases`);
  }
  getTables(baseId?: string): Observable<any> {
    let params = new HttpParams();

    if (baseId) {
      params = params.set('baseId', baseId);
    }

    return this.http.get(`${this.apiUrl}/data/tables`, { params });
  }
  getPages(
    baseId?: string,
    tableId?: string,
    limit: number = 1000
  ): Observable<any> {
    const params: any = { limit };
    if (baseId) params.baseId = baseId;
    if (tableId) params.tableId = tableId;
    return this.http.get(`${this.apiUrl}/data/pages`, { params });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/data/stats`);
  }

  // Scraping
  authenticateScraping(credentials: {
    email: string;
    password: string;
    mfaCode?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/scraping/authenticate`, credentials);
  }

  validateCookies(): Observable<any> {
    return this.http.get(`${this.apiUrl}/scraping/validate-cookies`);
  }

  getCookieStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/scraping/cookie-status`);
  }

  fetchRevisionHistory(
    baseId: string,
    tableId: string,
    recordId: string
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/scraping/revision-history/${baseId}/${tableId}/${recordId}`,
      {}
    );
  }

  fetchAllRevisions(batchSize: number = 10): Observable<any> {
    return this.http.post(`${this.apiUrl}/scraping/fetch-all-revisions`, {
      batchSize,
    });
  }

  getRevisionHistories(
    pageId?: string,
    baseId?: string,
    tableId?: string,
    limit: number = 1000
  ): Observable<any> {
    const params: any = { limit };
    if (pageId) params.pageId = pageId;
    if (baseId) params.baseId = baseId;
    if (tableId) params.tableId = tableId;
    return this.http.get(`${this.apiUrl}/scraping/revision-histories`, {
      params,
    });
  }

  clearCookies(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/scraping/cookies`);
  }
}
