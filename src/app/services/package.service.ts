import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Package } from '../pages/apps/daily-rd/package';
import { requestPackage } from '../pages/apps/daily-rd/requestPackage';

@Injectable({
  providedIn: 'root'
})
export class PackageService {
private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }

  getPackages() {
    return this.http.get<any>(`${this.baseUrl}/Packages`);
  }

  getPackagesByWarehouse(managerId: number){
    return this.http.get<any>(`${this.baseUrl}/Packages/packageByManager/${managerId}`);
  }

  addPackage(pack: Package): Observable<Package> {
    return this.http.post<Package>(`${this.baseUrl}/Packages`, pack);
  }

  updatePackage(pack: Package): Observable<Package> {
    return this.http.put<Package>(`${this.baseUrl}/Packages/${pack.id}`, pack);
  }

  deletePackage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Packages/${id}`);
  }

  submitReview(data: FormData): Observable <requestPackage>{
    return this.http.post<requestPackage>(`${this.baseUrl}/Packages/requestPackagesReview`, data);
  }
  submitPackage(data: any): Observable <Package>{
    return this.http.post<Package>(`${this.baseUrl}/Packages`, data);
  }
}
