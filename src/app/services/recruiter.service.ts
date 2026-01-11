import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

export interface ApplicantActivity {
  id: number;
  applicantId: number;
  recruiterId: number;
  applicantName:string;
  warehouseName: string;
  activity: 'Note' | 'CallScheduled' | 'CallOutcome' | 'DocRequest' | 'StageChange' | 'ContractSent' | 'ContractSigned';
  message: string;
  createAt: string;                 // "YYYY-MM-DD" (DateOnly)
  activityDate?: string | null;     // "YYYY-MM-DDTHH:mm:ss+/-HH:mm" (DateTimeOffset) o null
}

@Injectable({
  providedIn: 'root'
})

export class RecruiterService {
  private baseUrl = environment.apiUrl;
  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }

  submitApplicantActivity(payload: any) {
    return this.http.post<any>(
      `${this.baseUrl}/ApplicantActivities`,
      payload
    );
  }
  getApplicantActivities(applicantId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/ApplicantActivities/${applicantId}`);
  }
  list(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApplicantActivity[]>(`${this.baseUrl}/ApplicantActivities`, { params });
  }
}
