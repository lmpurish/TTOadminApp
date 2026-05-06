import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type DocFieldType = 'Signature' | 'Initials' | 'Date' | 'Text' | 'Checkbox';
export type DocSignerRole = 'Contractor' | 'CompanyRep' | 'Manager' | 'Witness';

export interface TemplateFieldDto {
  Type: 'Signature' | 'Initials' | 'Date' | 'Text' | 'Checkbox';
  Role: 'Contractor' | 'CompanyRep' | 'Manager' | 'Witness';
  Page: number; X: number; Y: number; Width: number; Height: number;
  Label?: string; Required?: boolean;
}

export type DocFieldApi = {
  Type: 'Signature' | 'Initials' | 'Date' | 'Text' | 'Checkbox';
  Role: 'Contractor' | 'CompanyRep' | 'Manager' | 'Witness';
  Page: number; X: number; Y: number; Width: number; Height: number;
  Label?: string; Required?: boolean;
};

export type NormField = {
  kind: 'Signature' | 'Initials' | 'Date' | 'Text' | 'Checkbox';
  role: 'Contractor' | 'CompanyRep' | 'Manager' | 'Witness' | ''; // por si viene vacío
  page: number; x: number; y: number; w: number; h: number;
  label: string; required: boolean;
};

export interface CreateTemplateOptions {
  title?: string;
  version?: string;
  fields?: TemplateFieldDto[]; // <- lo serializamos como FieldsJson en el FormData
}

export interface CreateTemplateResponse {
  templateId: number;
  fileUrl: string;
  version: string;
  sha256: string;
}

export interface TemplateViewDto {
  id: number;
  title: string;
  description: string;
  fileUrl: string;
  version: string;
  pageCount: number;
  fieldsJson: string;   // JSON string
}

export interface SignTemplateRequest {
  role: DocSignerRole;
  initials?: string;
  name?: string;
  date?: string;                 // ISO yyyy-MM-dd
  signatureImageBase64?: string; // "data:image/png;base64,..."
  signatureText?: string;
}

export interface CompanyStats {
  totalVolumePackages: number;
  totalStops: number;
  warehouses: number;
  activeDrivers: number;
}
@Injectable({
  providedIn: 'root'
})

export class CompanyService {
  private baseUrl = environment.apiUrl + "/company-docs";
  constructor(private http: HttpClient) { }

  createTemplate(
    companyId: number,
    file: File,
    opts?: CreateTemplateOptions
  ): Observable<HttpEvent<CreateTemplateResponse>> {
    const form = new FormData();
    form.append('PdfFile', file, file.name);
    if (opts?.title) form.append('Title', opts.title);
    if (opts?.version) form.append('Version', opts.version);

    // ✅ normaliza números ANTES de serializar
    if (opts?.fields?.length) {
      const fields = opts.fields.map(f => ({
        ...f,
        page: Number(f.Page),
        x: Number(f.X),
        y: Number(f.Y),
        width: Number(f.Width),
        height: Number(f.Height),
        required: f.Required ?? true
      }));
      form.append('FieldsJson', JSON.stringify(fields));
    }

    return this.http.post<CreateTemplateResponse>(
      `${this.baseUrl}/companies/${companyId}/templates`,
      form,
      { reportProgress: true, observe: 'events' }
    );
  }


  updateTemplateFields(templateId: number, fields: TemplateFieldDto[]) {
    const norm = fields.map(f => ({
      ...f,
      page: Number(f.Page),
      x: Number(f.X),
      y: Number(f.Y),
      width: Number(f.Width),
      height: Number(f.Height),
      required: f.Required ?? true
    }));
    return this.http.put<void>(`${this.baseUrl}/templates/${templateId}/fields`, norm);
  }

  getTemplate(templateId: number) {
    return this.http.get<TemplateViewDto>(`${this.baseUrl}/templates/${templateId}`);
  }

  // Firma y ESTAMPA sobre la plantilla
  signAndStamp(templateId: number, req: SignTemplateRequest) {
    return this.http.post<{ url: string }>(
      `${this.baseUrl}/templates/${templateId}/sign-and-stamp`,
      req
    );
  }

  // (Opcional) asignar plantilla a usuarios
  assignTemplate(companyId: number, templateId: number, body: { toAllUsers: boolean; rolesCsv?: string; dueDateUtc?: string; }) {
    return this.http.post<{ Assigned: number }>(
      `${this.baseUrl}/companies/${companyId}/templates/${templateId}/assign`,
      body
    );
  }

  getPdfSigned() {
    return this.http.get<any[]>(`${this.baseUrl}/company-template`);
  }

  // (Opcional) mis pendientes
  getMyPending() {
    return this.http.get<TemplateViewDto[]>(`${this.baseUrl}/me/pending`);
  }


  createCompany(formData: FormData) {
    return this.http.post(`${this.baseUrl}/Companies/Create`, formData);
  }

  createStripeCustomer(): Observable<any> {
    return this.http.post(`${this.baseUrl}/Companies/create-stripe-customer`, {});
  }

  /** ✅ Asociar PaymentMethod */
  attachPaymentMethod(paymentMethodId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/Companies/attach-payment-method`, {
      paymentMethodId
    });
  }

  updateLogo(logoData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Companies/update-logo`, logoData);
  }


  signTemplateJson(body: SignRequestDto): Observable<SignResponseDto> {
    return this.http.post<SignResponseDto>(`${this.baseUrl}/sign`, body);
  }

  getCompaniesWeb() {
    return this.http.get<Company[]>(`${environment.apiUrl}/companies`)
  }

  getCompanyStats(companyId: number): Observable<CompanyStats> {
    return this.http.get<CompanyStats>(
      `${environment.apiUrl}/Companies/statsCompany/${companyId}/simple`,
    );
  }
}
export interface Company {
  id: number | string;
  name: string;
  city?: string;
  websiteUrl?: string | null;
  careersUrl?: string | null;
  slug?: string | null;
  isHiring?: boolean;
}

export interface SignRequestDto {
  templateId: number;
  signerFullName: string;
  signerEmail: string;
  // opcionales:
  drawnSignatureImageBase64?: string; // SIN el prefijo "data:image/png..."
  signedPdfBase64?: string;           // SIN prefijo
  pdfHashSha256?: string;             // si lo calculas en el front (ver helper abajo)
}

export interface SignResponseDto {
  signatureId: number;
  signedPdfUrl?: string | null;
  signatureImageUrl?: string | null;
}
export interface CreateTemplateResponse {
  templateId: number;
  fileUrl: string;
  version: string;
  sha256: string;
  title: string;

}
