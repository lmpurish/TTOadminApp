import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Route, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { Employee } from 'src/app/pages/apps/employee/employee';
import { employees } from 'src/app/pages/apps/employee/employeeData';
import { environment } from 'src/environments/environment';

export interface SsnResponse {
  masked: string;
  ssn?: string | null;
}

@Injectable({
  providedIn: 'root',
})


export class EmployeeService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }
  getEmployees() {
    return this.http.get<any>(`${this.baseUrl}/User/driversByRol`);
  }

  getDriverbyWarehouse(warehouseId: number) {

    const params = new HttpParams()
      .set('warehouseId', warehouseId);

    return this.http.get<any[]>(`${this.baseUrl}/User/active-by-warehouse`, { params });

  }

  getApplicants() {
    return this.http.get<any>(`${this.baseUrl}/User/applicantByRol/`);
  }

  addEmployee(employee: Employee): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/User`, employee);
  }

  updateEmployee(employee: any) {
    return this.http.put(`${this.baseUrl}/User/update/${employee.id}`, employee);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/User/${id}`);
  }

  getUserInfo() {
    return this.http.get<any>(`${this.baseUrl}/User/me`,);
  }

  changePassword(employee: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/User/password`, employee);
  }

  uploadAvatar(formData: any): Observable<any> {
    return this.http.post<{ avatar: string }>(`${this.baseUrl}/User/upload/avatar`, formData)
  }

  contactApplicant(employees: any[]): Observable<any> {
    const payload = employees.map(e => ({
      id: Number(e.id),
      warehouseId: e.warehouseId != null ? Number(e.warehouseId) : null
    }));
    
    return this.http.post(
      `${this.baseUrl}/User/sendMessageApplicant`,
      payload
    );
  }
  bulkUpdateWarehouse(payload: { applicantIds: number[]; warehouseId: number }) {
    return this.http.put<any>(`${this.baseUrl}/User/applicants/bulk-warehouse`, payload);
  }

  getSsn(userId: number | string): Observable<SsnResponse> {
    const url = `${this.baseUrl}/User/${userId}/ssn`;
    const headers = new HttpHeaders({ 'Accept': 'application/json' });
    return this.http.get<SsnResponse>(url, { headers });
  }
  resendPasswordSetup(id: number) {
    return this.http.post<any>(
      `${this.baseUrl}/User/resend-password-setup/${id}`,
      {}
    );
  }



getUserWarehouses(
  userId: number
): Observable<UserWarehouseAssignment[]> {
  return this.http.get<UserWarehouseAssignment[]>(
    `${this.baseUrl}/users/${userId}/warehouses`
  );
}

assignWarehouse(
  userId: number,
  request: AssignWarehouseRequest
): Observable<any> {
  return this.http.post(
    `${this.baseUrl}/users/${userId}/warehouses`,
    request
  );
}

setPrimaryWarehouse(
  userId: number,
  warehouseId: number
): Observable<any> {
  return this.http.put(
    `${this.baseUrl}/users/${userId}/warehouses/${warehouseId}/set-primary`,
    {}
  );
}

removeWarehouse(
  userId: number,
  warehouseId: number
): Observable<any> {
  return this.http.delete(
    `${this.baseUrl}/users/${userId}/warehouses/${warehouseId}`
  );
}
  
}
export interface UserWarehouseAssignment {
  id: number;
  isPrimary: boolean;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;

  warehouse: {
    id: number;
    name?: string;
    company?: string;
    city?: string;
    state?: string;
    address?: string;
    facilityCode?: string;
  };
}

export interface AssignWarehouseRequest {
  warehouseId: number;
  isPrimary: boolean;
  startDate?: string | null;
  createdBy?: number | null;
}