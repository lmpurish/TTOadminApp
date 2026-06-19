import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DriverDashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) { }

  getLastRoute(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/driver/me/last-route`);
  }

  getRoutes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/driver/me/routes`);
  }
}