import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Warehouse } from 'src/app/pages/apps/warehouse/warehouse';
import { Zone } from 'src/app/pages/apps/warehouse/zone/zone';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MessangeContact } from 'src/app/pages/apps/warehouse/messange-contact/messangeContact';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }

  getWarehouses() {
    return this.http.get<any>(`${this.baseUrl}/Warehouses`);
  }
  getWarehousesRsp() {
    return this.http.get<any>(`${this.baseUrl}/Warehouses/with-rsp`);
  }

  addWarehouse(warehouse: Warehouse): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.baseUrl}/Warehouses`, warehouse);
  }

  getMetros(companyId: number) {
    return this.http.get<any>(`${this.baseUrl}/Warehouses/metros/${companyId}`)
  }

  updateWarehouse(warehouse: Warehouse): Observable<Warehouse> {

    return this.http.put<Warehouse>(`${this.baseUrl}/Warehouses/${warehouse.id}`, warehouse);
  }

  deleteWarehouse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Warehouses/${id}`);
  }

  addZone(zone: Zone): Observable<Zone> {
    return this.http.post<Zone>(`${this.baseUrl}/Zones`, zone);
  }

  getZones() {
    return this.http.get<any>(`${this.baseUrl}/Zones`,);
  }
  updateZone(zone: Zone): Observable<Zone> {
    return this.http.put<Zone>(`${this.baseUrl}/Zones/${zone.id}`, zone);
  }

  deleteZones(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Zones/${id}`);
  }

  getZonesByWarehouse(id: number) {
    return this.http.get<any>(`${this.baseUrl}/Zones/GetZonesWarehouse/${id}`);
  }

  getMessageContact(id: number) {
    return this.http.get<any>(`${this.baseUrl}/WarehouseMessageTemplates/allMessageByWarehouse/${id}`);
  }
  AddMessageContact(message: MessangeContact): Observable<Zone> {
    return this.http.post<Zone>(`${this.baseUrl}/WarehouseMessageTemplates`, message);
  }
  updateMessageContact(message: MessangeContact): Observable<Zone> {
    return this.http.put<Zone>(`${this.baseUrl}/WarehouseMessageTemplates/${message.id}`, message);
  }

  deleteMessageContact(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/WarehouseMessageTemplates/${id}`);
  }

  addMetro(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Warehouses/metros/add`, data);
  }

  updateMetro(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Warehouses/metros/${id}`, data);
  }

  deleteMetro(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Warehouses/Metro/${id}`);
  }
}

