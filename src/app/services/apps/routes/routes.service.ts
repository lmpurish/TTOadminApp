import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { environment } from 'src/environments/environment';
import { Routes } from 'src/app/pages/apps/routes/Routes';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {

  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router
  ) {}

  /**
   * Obtiene todas las rutas disponibles.
   */
  getRoutes(): Observable<Routes[]> {
    return this.http.get<Routes[]>(
      `${this.baseUrl}/Routes`
    );
  }

  /**
   * Obtiene rutas de un día.
   *
   * Para Admin y CompanyOwner se puede enviar warehouseId.
   * Para Manager puede omitirse y el backend debe resolver su almacén.
   */
  getRoutesByDate(
    date: string,
    warehouseId?: number | null
  ): Observable<any[]> {

    let params = new HttpParams()
      .set('date', date);

    if (
      warehouseId !== undefined &&
      warehouseId !== null
    ) {
      params = params.set(
        'warehouseId',
        warehouseId.toString()
      );
    }

    return this.http.get<any[]>(
      `${this.baseUrl}/Routes/by-date`,
      { params }
    );
  }

  /**
   * Obtiene las rutas de un rango de fechas.
   *
   * Se utiliza para cargar la semana operacional
   * sábado-viernes en el calendario.
   */
  getRoutesByRange(
    startDate: string,
    endDate: string,
    warehouseId?: number
) {
    return this.http.get<any[]>(
        `${environment.apiUrl}/Routes/by-range`,
        {
            params: {
                startDate,
                endDate,
                warehouseId: warehouseId?.toString() ?? ''
            }
        }
    );
}

  /**
   * Obtiene rutas de un día y almacén específicos.
   */
  getRoutesByDateAndWarehouse(
    date: string,
    warehouseId: number
  ): Observable<Routes[]> {

    const params = new HttpParams()
      .set('date', date)
      .set(
        'warehouseId',
        warehouseId.toString()
      );

    return this.http.get<Routes[]>(
      `${this.baseUrl}/Routes/routes-by-date-and-warehouse`,
      { params }
    );
  }

  /**
   * Obtiene rutas de un conductor dentro de un rango opcional.
   */
  getRoutesByUser(
    userId: number,
    startDate?: string,
    endDate?: string
  ): Observable<any[]> {

    let params = new HttpParams();

    if (startDate) {
      params = params.set(
        'startDate',
        startDate
      );
    }

    if (endDate) {
      params = params.set(
        'endDate',
        endDate
      );
    }

    return this.http.get<any[]>(
      `${this.baseUrl}/Routes/user/${userId}`,
      { params }
    );
  }

  /**
   * Crea una ruta.
   */
  addRoute(route: Routes): Observable<Routes> {
    return this.http.post<Routes>(
      `${this.baseUrl}/Routes`,
      route
    );
  }

  /**
   * Asigna o remueve un driver de una ruta.
   */
  assignDriverToRoute(
    routeId: number,
    userId: number | null
  ): Observable<any> {

    return this.http.put<any>(
      `${this.baseUrl}/Routes/${routeId}/assign-driver`,
      { userId }
    );
  }

  /**
   * Asigna conductores a varias rutas.
   */
  bulkAssignDrivers(
    items: {
      routeId: number;
      userId: number | null;
    }[]
  ): Observable<any> {

    return this.http.post<any>(
      `${this.baseUrl}/Routes/assign-drivers`,
      items
    );
  }

  /**
   * Guarda cambios masivos de rutas:
   * driver, zona, estado, CNL y tipo de pago.
   */
  assignRoutes(
    payload: RouteAssignmentPayload[]
  ): Observable<any> {

    return this.http.put<any>(
      `${this.baseUrl}/Routes/assign-routes`,
      payload
    );
  }

  /**
   * Obtiene las zonas pertenecientes a un almacén.
   */
  getZonesByWarehouse(
    warehouseId: number | null | undefined
  ): Observable<any[]> {

    if (
      warehouseId === null ||
      warehouseId === undefined
    ) {
      throw new Error(
        'warehouseId no puede ser null ni undefined'
      );
    }

    const params = new HttpParams()
      .set(
        'warehouseId',
        warehouseId.toString()
      );

    return this.http.get<any[]>(
      `${this.baseUrl}/Zones/GetZonesByManager`,
      { params }
    );
  }

  /**
   * Agrega un bonus a una ruta.
   */
  addRouteBonus(
    routeId: number,
    payload: RouteBonusPayload
  ): Observable<any> {

    return this.http.post<any>(
      `${this.baseUrl}/Routes/routes/${routeId}/bonus`,
      payload
    );
  }

  /**
   * Consulta si una semana está lista para payroll.
   *
   * Este método requiere crear el endpoint:
   * GET /Routes/payroll-readiness
   */
  getPayrollReadiness(
    startDate: string,
    endDate: string,
    warehouseId?: number | null
  ): Observable<PayrollReadinessResponse> {

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

    return this.http.get<PayrollReadinessResponse>(
      `${this.baseUrl}/Routes/payroll-readiness`,
      { params }
    );
  }
}

/**
 * Payload para guardar asignaciones y cambios de rutas.
 */
export interface RouteAssignmentPayload {
  id: number;

  zoneId: number | null;
  userId: number | null;

  cnl?: number | null;

  routeStatus: string;

  paymentType?: string;
  priceRoute?: number;
}

/**
 * Payload para agregar un bonus.
 */
export interface RouteBonusPayload {
  type: string;
  amount: number;
  note?: string | null;
}

/**
 * Respuesta del endpoint de validación de payroll.
 */
export interface PayrollReadinessResponse {
  ready: boolean;

  startDate: string;
  endDate: string;

  totalRoutes: number;
  completedRoutes: number;

  missingDriverRoutes: number;
  missingZoneRoutes: number;
  pendingRoutes: number;
  emptyRoutes: number;

  missingDriverRateCount: number;
  missingRevenueCount: number;

  progress: number;
  issues: string[];
}