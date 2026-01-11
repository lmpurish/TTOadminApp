import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private baseUrl = environment.apiUrl;
  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }

  getNotifications(userId: any) {
    return this.http.get<any>(`${this.baseUrl}/Notification/${userId}`);
  }

  markRead(notification:any){
    return this.http.put<any>(`${this.baseUrl}/Notification/read/${notification.id}`,notification);
  }
}
