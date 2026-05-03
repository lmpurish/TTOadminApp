import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ManagerPunchRowDto {
  managerId: number;
  name: string;
  warehouseId: number;
  arrivalAtUtc?: string | null;
  departureAtUtc?: string | null;
  isActive: boolean;
}

export interface ManagerPunchSummaryDto {
  warehouseId: number;
  dateUtc?: string;
  totalManagers: number;
  active: number;
  punchedOut: number;
  noPunch: number;
  totalSeconds: number;
}

@Injectable({
  providedIn: 'root',
})
export class DriverPunchService {
  private baseUrl = `${environment.apiUrl}/DriverPunch`;

  constructor(private http: HttpClient) { }

  /** Vista default: lista de managers */
  getManagersToday(warehouseId: number): Observable<ManagerPunchRowDto[]> {
    const params = new HttpParams().set('warehouseId', warehouseId);
    return this.http.get<ManagerPunchRowDto[]>(
      `${this.baseUrl}/managers/today`,
      { params }
    );
  }

  /** Summary */
  getManagersSummary(

  ): Observable<ManagerPunchSummaryDto> {
    return this.http.get<ManagerPunchSummaryDto>(
      `${this.baseUrl}/managers/summary`,

    );
  }

  forcePunchOutOutsideHours(payload: any) {
    return this.http.post(`${this.baseUrl}/admin/force-punchout`, payload);
  }
}
