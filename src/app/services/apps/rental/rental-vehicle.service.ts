import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateRentalVehicleDto, RentalVehicle, UpdateRentalVehicleDto, UpdateRentalVehicleStatusDto } from 'src/app/pages/apps/rental-vehicle/rental-vehicle.model';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RentalVehicleService {
  private apiUrl = `${environment.apiUrl}/RentalVehicles`;

  constructor(private http: HttpClient) { }

  getVehicles(metroId?: number | null, status?: string | null): Observable<RentalVehicle[]> {
    let params = new HttpParams();

    if (metroId) {
      params = params.set('metroId', metroId);
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<RentalVehicle[]>(this.apiUrl, { params });
  }

  getVehicleById(id: number): Observable<RentalVehicle> {
    return this.http.get<RentalVehicle>(`${this.apiUrl}/${id}`);
  }

  createVehicle(data: FormData) {
    return this.http.post<RentalVehicle>(`${this.apiUrl}`, data);
  }

  updateVehicle(id: number, data: FormData) {
    return this.http.put<RentalVehicle>(`${this.apiUrl}/${id}`, data);
  }
  updateVehicleStatus(id: number, dto: UpdateRentalVehicleStatusDto): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, dto);
  }

  archiveVehicle(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}