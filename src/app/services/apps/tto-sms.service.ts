import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SendTtoSmsRequest {
  kind: string;
  to: string;
  lang: 'en' | 'es';
  externalId?: string;
  vars: Record<string, string>;
}

export interface SendTtoSmsResponse {
  status: string;
  id?: number;
  reason?: string;
  body?: string;
  idempotent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TtoSmsService {

  private readonly baseUrl =
    `${environment.apiUrl}/api/Sms`;

  constructor(
    private readonly http: HttpClient
  ) {}

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(
      `${this.baseUrl}/health`
    );
  }

  send(
    request: SendTtoSmsRequest
  ): Observable<SendTtoSmsResponse> {
    return this.http.post<SendTtoSmsResponse>(
      `${this.baseUrl}/send`,
      request
    );
  }
}