import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface CookieResponse {
  success: boolean;
  cookies: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class CookieService {
  private apiUrl = 'http://localhost:3000/api';
  private cookiesSubject = new BehaviorSubject<string | null>(null);
  public cookies$ = this.cookiesSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load cookies from localStorage if available
    const stored = localStorage.getItem('airtable_cookies');
    if (stored) {
      this.cookiesSubject.next(stored);
    }
  }

  retrieveCookies(
    email: string,
    password: string,
    mfaCode?: string
  ): Observable<CookieResponse> {
    return this.http
      .post<CookieResponse>(`${this.apiUrl}/cookies/retrieve`, {
        email,
        password,
        mfaCode,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this.cookiesSubject.next(response.cookies);
            localStorage.setItem('airtable_cookies', response.cookies);
          }
        })
      );
  }

  validateCookies(cookies: string): Observable<{ valid: boolean }> {
    return this.http.post<{ valid: boolean }>(
      `${this.apiUrl}/cookies/validate`,
      {
        cookies,
      }
    );
  }

  getCurrentCookies(): string | null {
    return this.cookiesSubject.value;
  }

  clearCookies(): void {
    this.cookiesSubject.next(null);
    localStorage.removeItem('airtable_cookies');
  }
}
