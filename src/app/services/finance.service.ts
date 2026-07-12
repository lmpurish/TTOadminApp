import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {

  private readonly api =
    `${environment.apiUrl}/finance`;

  constructor(
    private http: HttpClient
  ) {}

  getOwnerDashboard(
    startDate: string,
    endDate: string,
    warehouseId?: number
  ): Observable<OwnerDashboardResponse> {

    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (
      warehouseId !== undefined &&
      warehouseId !== null
    ) {
      params = params.set(
        'warehouseId',
        warehouseId.toString()
      );
    }

    return this.http.get<OwnerDashboardResponse>(
      `${this.api}/owner-dashboard`,
      {
        params
      }
    );
  }

  saveCompanyRevenue(
    model: CompanyRevenueRequest
  ): Observable<CompanyRevenueResponse> {

    return this.http.post<CompanyRevenueResponse>(
      `${this.api}/company-revenue`,
      model
    );
  }

  updateCompanyRevenue(
    id: number,
    model: CompanyRevenueRequest
  ): Observable<CompanyRevenueResponse> {

    return this.http.put<CompanyRevenueResponse>(
      `${this.api}/company-revenue/${id}`,
      model
    );
  }

  getCompanyRevenue(
    payPeriodId: number
  ): Observable<CompanyRevenueResponse[]> {

    return this.http.get<CompanyRevenueResponse[]>(
      `${this.api}/company-revenue/${payPeriodId}`
    );
  }

  deleteCompanyRevenue(
    id: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.api}/company-revenue/${id}`
    );
  }
}

export interface OwnerDashboardResponse {
  startDate: string;
  endDate: string;
  payPeriodCount: number;

  totalRevenue: number;
  totalExpenses: number;
  totalPayroll: number;

  netProfit: number;
  margin: number;

  totalPackages: number;
  avgPaidPerPackage: number;
  profitPerPackage: number;

  warehousePerformance: WarehouseFinancialPerformance[];

  bestWarehouse?: WarehouseFinancialPerformance | null;
  worstWarehouse?: WarehouseFinancialPerformance | null;
}

export interface WarehouseFinancialPerformance {
  warehouseId: number;
  warehouse: string;

  revenue: number;
  expenses: number;
  payroll: number;

  profit: number;
  margin: number;

  packages: number;

  avgPaidPerPackage: number;
  profitPerPackage: number;
}

export interface CompanyRevenueRequest {
  payPeriodId: number;

  warehouseId?: number | null;

  revenue: number;
  expenses: number;
  adjustments: number;

  revenueType: string;

  notes?: string | null;

  revenueDate?: string | Date | null;
}

export interface CompanyRevenueResponse {
  id: number;

  companyId: number;
  payPeriodId: number;

  warehouseId?: number | null;

  revenue: number;
  expenses: number;
  adjustments: number;

  revenueType: string;

  notes?: string | null;
  attachmentUrl?: string | null;

  revenueDate: string;

  createdBy: number;
  createdAt: string;

  updatedBy?: number | null;
  updatedAt?: string | null;
}