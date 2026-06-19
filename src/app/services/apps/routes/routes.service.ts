import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Route, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Warehouse } from 'src/app/pages/apps/warehouse/warehouse';
import { Zone } from 'src/app/pages/apps/warehouse/zone/zone';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Routes } from 'src/app/pages/apps/routes/Routes';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }
  private baseUrl = environment.apiUrl;

  getRoutes() {
    return this.http.get<any>(`${this.baseUrl}/Routes`);
  }
  assignDriverToRoute(routeId: number, userId: number | null) {
    return this.http.put(`${this.baseUrl}/Routes/${routeId}/assign-driver`, { userId });
  }

  bulkAssignDrivers(items: { routeId: number; userId: number | null }[]) {
    return this.http.post(`${this.baseUrl}/Routes/assign-drivers`, items);
  }

  addRoute(routes: Routes) {
    return this.http.post<Routes>(`${this.baseUrl}/Routes`, routes)
  }

  getZonesByWarehouse(warehouseId: number | null | undefined) {
    if (warehouseId == null) {
      throw new Error('warehouseId no puede ser null ni undefined');
    }

    const params = new HttpParams().set('warehouseId', warehouseId.toString());
    return this.http.get<any>(`${this.baseUrl}/Zones/GetZonesByManager`, { params });
  }

  assignRoutes(payload: any[]): Observable<any> {
    console.log(payload)
    return this.http.put(`${this.baseUrl}/Routes/assign-routes`, payload);
  }

  getRoutesByDate(date: string, warehouseId?: number): Observable<any[]> {
    let url = `${this.baseUrl}/Routes/by-date?date=${date}`;

    // Solo agregar warehouseId si está definido (usuario es admin)
    if (warehouseId !== undefined && warehouseId !== null) {
      url += `&warehouseId=${warehouseId}`;
    }

    return this.http.get<any[]>(url);
  }

  getRoutesByDateAndWarehouse(date: string, warehouseId: number): Observable<Route[]> {
    const params = new HttpParams()
      .set('date', date)
      .set('warehouseId', warehouseId.toString());

    return this.http.get<Route[]>(`${this.baseUrl}/Routes/routes-by-date-and-warehouse`, { params });
  }

  addRouteBonus(routeId: number, payload: { type: string; amount: number; note?: string | null }) {
    return this.http.post<any>(`${this.baseUrl}/Routes/routes/${routeId}/bonus`, payload);
  }
  getRoutesByUser(userId: number, startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<any[]>(`${this.baseUrl}/Routes/user/${userId}`, { params });
  }
}

