import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private baseUrl = environment.apiUrl;
  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }

  getStats(managerId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Report/employeeByManager/${managerId}`);
  }

  getRanking(managerId: number, startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Report/driverStatistics/${managerId}/${startDate}/${endDate}`);
  }

  getWarehouseRanking(startDate: string, endDate: string) {
    return this.http.get<any>(`${this.baseUrl}/Report/warehouseStatistics/${startDate}/${endDate}`);
  }
  getBestWorstDriver(startDate: string) {
    return this.http.get<any>(`${this.baseUrl}/Report/driverStatistics/${startDate}`);
  }
  getVolumenCurrentMonth() {
    return this.http.get<any>(`${this.baseUrl}/Report/warehouseStatistics/currentMonth`);
  }
  getManagerId(id: number) {
    return this.http.get<any>(`${this.baseUrl}/User/getManager/${id}`);
  }

  getDriverIncome(id: number) {
    return this.http.get<any>(`${this.baseUrl}/Report/driverIncome/${id}`);
  }
  getDriverStats(id: number, startDate: string, endDate: string) {
    return this.http.get<any>(`${this.baseUrl}/User/${id}/daily-summary?from=${startDate}&to=${endDate}`);
  }
  getDashboardKpis() {
    return this.http.get<any>(`${this.baseUrl}/Report/dashboard-kpis`);
  }
}
