// src/app/services/payroll.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  ComputePayrollRequest,
  CreatePeriodRequest,
  DriverRate,
  PayRunDto,
  PeriodSummaryDto,
  PayPeriod,
} from 'src/app/models/payroll.models';
import { RateType, UserRate } from '../pages/apps/user-rate/user-rate';
export type UpdateDriverRatePayload = {
  id: number;
  driverId: number;
  rateType: RateType | 'PerPackage' | 'PerMile' | 'Hourly' | 'Mixed';
  baseAmount?: number | null;
  minPayPerRoute?: number | null;
  failedStopPenalty?: number | null;
  rescueStopRate?: number | null;
};

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/Payroll`;


  // PayRun (detalle)
  compute(body: ComputePayrollRequest): Observable<PayRunDto> {
    return this.http.post<PayRunDto>(`${this.base}/compute`, body);
  }
  approveRun(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/runs/${id}/approve`, {});
  }
  getRun(id: number): Observable<PayRunDto> {
    return this.http.get<PayRunDto>(`${this.base}/runs/${id}`);
  }
  exportRunCsv(id: number, filename?: string) {
    const params = filename ? new HttpParams().set('filename', filename) : undefined;
    return this.http.get(`${this.base}/runs/${id}/export`, {
      responseType: 'blob',
      observe: 'response',
      params
    });
  }

  // Periodos
  createPeriod(body: CreatePeriodRequest): Observable<PayPeriod> {
    return this.http.post<PayPeriod>(`${this.base}/periods`, body);
  }
  getPeriodSummary(periodId: number): Observable<PeriodSummaryDto> {
    return this.http.get<PeriodSummaryDto>(`${this.base}/periods/${periodId}/summary`);
  }
  lockPeriod(periodId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/periods/${periodId}/lock`, {});
  }
  computePeriod(body: {
    companyId: number;
    warehouseId?: number | null;
    startDate: string;
    endDate: string;
    userId: number;
    zoneId?: number | null;
    recalculateAll?: boolean;
  }) {
    return this.http.post<PeriodSummaryDto>(`${this.base}/periods/compute`, body);
  }

  // DriverRate
  createRate(rate: DriverRate): Observable<DriverRate> {
    return this.http.post<DriverRate>(`${this.base}/rates`, rate);
  }
  getRatesByDriver(driverId: number): Observable<DriverRate[]> {
    return this.http.get<DriverRate[]>(`${this.base}/rates/${driverId}`);
  }

  getRateAllDriver(opts?: {
    driverId?: number;
    rateType?: RateType;      // 'PerRoute' | 'PerStop' | 'Mixed'
    onlyActive?: boolean;
    from?: Date | string;     // 'YYYY-MM-DD' o Date
    to?: Date | string;       // 'YYYY-MM-DD' o Date
  }): Observable<UserRate[]> {
    let params = new HttpParams();

    if (opts?.driverId != null) params = params.set('driverId', String(opts.driverId));
    if (opts?.rateType) params = params.set('rateType', opts.rateType);
    if (opts?.onlyActive !== undefined) params = params.set('onlyActive', String(opts.onlyActive));
    if (opts?.from) params = params.set('from', this.toYmd(opts.from));
    if (opts?.to) params = params.set('to', this.toYmd(opts.to));

    return this.http.get<UserRate[]>(`${this.base}/driverRates`, { params });
  }

  updateDriverRate(payload: UpdateDriverRatePayload): Observable<any> {
    const url = `${this.base}/driverRates/${payload.id}`;
    return this.http.put<any>(url, payload);
  }

  // ====== NUEVO: Bulk Update (PUT) ======
  bulkUpdateDriverRates(payloads: UpdateDriverRatePayload[]): Observable<{ message: string; count: number }> {
    const url = `${this.base}/driverRates/bulk`;
    return this.http.put<{ message: string; count: number }>(url, payloads);
  }

  private toYmd(d: Date | string): string {
    if (typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  generateDefaultRateForWarehouse(warehouseId: number) {
    const url = `${this.base}/generate-missing?warehouseId=${warehouseId}`;
    return this.http.post<any>(url, {}); // body vacío
  }
}
