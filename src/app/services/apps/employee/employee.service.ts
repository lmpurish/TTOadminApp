import { HttpClient,HttpHeaders } from '@angular/common/http';
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

  contacApplicant(employee: any): Observable<any> {
    const payload = {
      id: Number(employee.id),
      warehouseId: employee.warehouseId != null ? Number(employee.warehouseId) : undefined
      // channel: 'email' | 'whatsapp' | 'both'  (si luego quieres)
    };

    // Limpia undefined para no confundir al binder
    Object.keys(payload).forEach(k => (payload as any)[k] === undefined && delete (payload as any)[k]);

    return this.http.post(`${this.baseUrl}/User/sendMessageApplicant`, payload);
  }

  
    getSsn(userId: number | string): Observable<SsnResponse> {
    const url = `${this.baseUrl}/User/${userId}/ssn`;
    const headers = new HttpHeaders({ 'Accept': 'application/json' });
    return this.http.get<SsnResponse>(url, { headers });
  }
}
