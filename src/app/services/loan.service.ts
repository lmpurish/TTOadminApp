import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Loan } from '../models/loan.models';

export interface LoanDto {
  id: number;
  driverId: number;
  driver: string;
  principal: number;
  balance: number;
  installmentAmount?: number | null;
  maxDeductionPerPayRun?: number | null;
  status: string; // Draft|Active|Paused|Completed|Cancelled
  notes?: string | null;
  createdAt: string;
  approvedAt?: string | null;
}

export interface LoanRowVm {
  // tu endpoint devuelve { Loan, Repayments }
  loan: LoanDto;
  repayments?: any[];
}

@Injectable({ providedIn: 'root' })
export class LoanService {
  private base = `${environment.apiUrl}/loans`; // o apiBaseUrl según tu proyecto

  constructor(private http: HttpClient) {}

  getAll(driverId?: number | null, status?: string | null) {
    let params = new HttpParams();

    if (driverId != null && driverId > 0)
      params = params.set('driverId', String(driverId));
    if (status) params = params.set('status', status);

    return this.http.get<any>(this.base, { params });
  }

  getMine(status?: string | null, driverId?: number): Observable<any[]> {
    let params = new HttpParams();

    if (status && status !== 'all') {
      params = params.set('status', status);
    }

    return this.http.get<any[]>(
      `${environment.apiUrl}/loans/driver/${driverId}`,
      { params },
    );
  }

  get(id: number) {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  approve(id: number) {
    return this.http.post<LoanDto>(`${this.base}/${id}/approve`, {});
  }
  pause(id: number) {
    return this.http.post<LoanDto>(`${this.base}/${id}/pause`, {});
  }
  resume(id: number) {
    return this.http.post<LoanDto>(`${this.base}/${id}/resume`, {});
  }
  cancel(id: number) {
    return this.http.post<LoanDto>(`${this.base}/${id}/cancel`, {});
  }

  save(loan: Loan): Observable<Loan> {
    return this.http.post<Loan>(this.base, loan);
  }
}
