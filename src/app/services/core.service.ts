import { effect, Injectable, signal } from '@angular/core';
import { AppSettings, defaults } from '../config';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Route, Router } from '@angular/router';
import { jwtDecode } from "jwt-decode";
import { catchError, debounceTime, filter, map, Observable, of, shareReplay, Subject, switchMap, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UiPersisted } from '../typesUi/ui.types';
import { ImportResultDto } from '../layouts/full/vertical/header/importResult/import-result.model';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  private optionsSignal = signal<AppSettings>(defaults);
  private baseUrl = environment.apiUrl;
  private readonly LS_KEY = 'app_ui_settings';
  private options: AppSettings = { ...defaults };


  /** Buffer para auto-guardado (opcional) */
  private save$ = new Subject<void>();

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) {
    const cached = localStorage.getItem(this.LS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Partial<AppSettings>;
      this.options = { ...defaults, ...parsed };
      this.optionsSignal.set(this.options);
    }

    // 2) Auto-guardado opcional con debounce (evita PUT en cada clic)
    this.save$
      .pipe(debounceTime(400), switchMap(() => this.safeSave()))
      .subscribe({
        error: () => {/* silencia o muestra toast si quieres */ }
      });

    // 3) Efecto para mantener localStorage en sync con el signal
    effect(() => {
      const current = this.optionsSignal();
      localStorage.setItem(this.LS_KEY, JSON.stringify(current));
    });

  }

  pickPersisted(o: any): UiPersisted {
    return {
      theme: o.theme,
      activeTheme: o.activeTheme,
      horizontal: o.horizontal,
      cardBorder: o.cardBorder,
      boxed: o.boxed,
    };
  }
  loadUserSettings(): Observable<AppSettings> {
    return this.http.get<Partial<UiPersisted>>(`${this.baseUrl}/UserSettings/me`).pipe(
      tap(server => {
        // Mezcla: defaults -> actuales -> lo que viene del server (solo subset)
        this.options = { ...this.options, ...(server || {}) };
        localStorage.setItem(this.LS_KEY, JSON.stringify(this.options));
      }),
      map(() => this.options)
    );
  }
  saveUserSettings(): Observable<AppSettings> {
    const body: UiPersisted = this.pickPersisted(this.options);
    return this.http.put<UiPersisted>(`${this.baseUrl}/UserSettings/me`, body).pipe(
      tap(server => {
        // Actualiza solo lo que persiste el server
        this.options = { ...this.options, ...(server || {}) };
        localStorage.setItem(this.LS_KEY, JSON.stringify(this.options));
      }),
      map(() => this.options)
    );
  }
  private decodePayload(token: string): any | null {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  getCompanyId(): number | null {
    return this.getUserInfoFromToken()?.companyId ?? null;
  }

  isTokenExpired(token?: string): boolean {
    const t = token ?? this.getToken();
    if (!t) return true;
    const payload = this.decodePayload(t);
    if (!payload?.exp) return true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSeconds;
  }
  scheduleAutoLogout(): void {
    const token = this.getToken();
    const payload = token ? this.decodePayload(token) : null;
    if (!payload?.exp) return;

    const now = Date.now();
    const expMs = payload.exp * 1000;
    const lead = 5_000; // 5s antes
    const delay = Math.max(expMs - now - lead, 0);

    window.clearTimeout((window as any).__logoutTimer);
    (window as any).__logoutTimer = window.setTimeout(() => {
      this.logout(true);
    }, delay);
  }
  private safeSave(): Observable<AppSettings> {
    return this.isLoggedIn() ? this.saveUserSettings() : of(this.options);
  }
  options$() {
    return this.optionsSignal;
  }

  getOptions(): AppSettings {
    const cached = localStorage.getItem(this.LS_KEY);
    if (cached) {
      this.options = { ...defaults, ...this.options, ...(JSON.parse(cached) as Partial<AppSettings>) };
    }
    return this.options;
  }

  setOptions(partial: Partial<AppSettings>, persist = true) {
    this.options = { ...this.options, ...partial };
    localStorage.setItem(this.LS_KEY, JSON.stringify(this.options));
    if (persist) this.saveUserSettings().subscribe();
  }
  uploadClaimsFile(formData: FormData) {
    return this.http.post<any>(
      `${this.baseUrl}/PayrollFines/import/details`,
      formData,
      {
        observe: 'events',
        reportProgress: true
      }
    );
  }
  getUserInfoFromToken(): {
    id: number;
    name: string;
    role: string;
    WarehouseID: number | null;
    logoUrl: string | null;
    companyId: number | null;
    email?: string | null;
  } | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded: any = jwtDecode(token);

      const warehouseId =
        decoded.warehouseID ??
        decoded.WarehouseID ??
        decoded.warehouseId ??
        null;

      return {
        id: Number(decoded.nameid ?? decoded.sub),
        name: decoded.unique_name ?? decoded.name ?? 'Unknown',
        role: decoded.role ?? '',
        WarehouseID: warehouseId != null ? Number(warehouseId) : null,
        logoUrl: decoded.CompanyLogo ?? decoded.logoUrl ?? null,
        companyId: decoded.companyId != null ? Number(decoded.companyId) : null,
        email: decoded.email ?? null
      };
    } catch {
      return null;
    }
  }



  logout(fromExpiry: boolean = false): void {
    localStorage.removeItem('token');
    // quita también otros flags si aplica
    // localStorage.removeItem('userRole'); ...

    // Puedes mostrar un mensaje vía Toastr en un sitio central
    this.router.navigate(['/authentication/login'], {
      queryParams: fromExpiry ? { reason: 'expired' } : {}
    });
  }
  getAvatar(filename: string): Observable<string> {
    const token = this.getToken();
    const headers = new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );

    const base = (this.baseUrl || '').replace(/\/+$/, ''); // sin trailing slash
    const safe = encodeURIComponent((filename || '').trim());
    const url = `${base}/User/avatar/${safe}`;

    // Nota: devolvemos URL (string) para usar directo en [src]
    return this.http.get<Blob>(url, { headers, responseType: 'blob' as 'json' }).pipe(
      map(blob => URL.createObjectURL(blob)),
      // en error, devolvemos el asset local
      catchError(() => of('/assets/images/profile/user-1.jpg')),
      // cachea el último valor para múltiples suscriptores
      shareReplay(1)
    );
  }
  getSsnImageBlob(filename: string) {
    return this.http.get(`${this.baseUrl}/User/ssnn/${filename}`, {
      responseType: 'blob'
    }).pipe(
      map(blob => URL.createObjectURL(blob)) // convierte a URL utilizable
    );

  }
  getInsuranceBlob(filename: string) {
    return this.http.get(`${this.baseUrl}/User/insuranceUrl/${filename}`, {
      responseType: 'blob'
    }).pipe(
      map(blob => URL.createObjectURL(blob))
    );

  }
  getDriverLicenceBlob(filename: string) {
    console.log(filename)
    return this.http.get(`${this.baseUrl}/User/driverLicenseUrl/${filename}`, {
      responseType: 'blob'
    }).pipe(
      map(blob => URL.createObjectURL(blob))
    );

  }

  updateBankAccount(id: number, dto: any) {
    return this.http.put(`${this.baseUrl}/Accounts/${id}`, dto);
  }
  createBankAccount(dto: any) {
    return this.http.post(`${this.baseUrl}/Accounts/`, dto)
  }
  completeProfile(formData: FormData, section?: string) {
    let url = `${this.baseUrl}/User/complete-profile`;

    if (section) {
      url += `?section=${encodeURIComponent(section)}`;
    }

    return this.http.post<any>(url, formData);
  }


  setLanguage(lang: string) {
    this.setOptions({ language: lang });
  }

  getLanguage() {
    return this.getOptions().language;
  }

  signUp(userObj: any) {
    return this.http.post<any>(`${this.baseUrl}/User/register`, userObj);
  }

  login(loginObj: any) {
    return this.http.post<any>(
      `${this.baseUrl}/User/authenticate`,
      loginObj
    ).pipe(
      tap(res => localStorage.setItem('token', res.token)),
      switchMap(res =>
        this.loadUserSettings().pipe(
          map(() => res)
        )
      )
    );
  }
  forgotPassword(email: string) {
    return this.http.post<any>(`${this.baseUrl}/User/forgot-password`, {
      email: email
    });
  }
  showSuccess(message: any) {
    this.toastr.success(message, 'Success!');
  }
  showError(message: any) {
    this.toastr.error(message, 'Oops!');
  }

  storeToken(tokenValue: string) {
    localStorage.setItem('token', tokenValue);
  }

  getToken() { return localStorage.getItem('token'); }


  getHasCompany(): boolean {
    return localStorage.getItem("hasCompany") === "true";
  }

  getHasBankInfo(): boolean {
    return localStorage.getItem("hasBankInfo") === "true";
  }

  getIsFirstLogin(): boolean {
    let storedValue = localStorage.getItem('isFirstLogin');
    if (storedValue === null) {
      localStorage.setItem('isFirstLogin', 'true'); // ⚡ Se establece en 'true' solo en el primer login
      return true;
    }

    return storedValue === 'true'; // ✅ Devuelve `true` solo si el valor guardado es el string "true"
  }
  getRole(): string {
    const token = this.getToken();
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1])); // Decodificar el JWT

    return payload.role || '';
  }
  hasRole(role: string): boolean {

    return this.getRole() === role;
  }
  isLoggedIn(): boolean { return !!this.getToken(); }

  getCurrentUser(id?: number | string): Observable<any> {
    const path = id != null
      ? `/User/me?userId=${id}`
      : `/User/me`;

    return this.http.get<any>(`${this.baseUrl}${path}`);
  }

  signOut() {
    localStorage.clear();
    // restablecer estado UI a defaults al salir
    this.options = { ...defaults };
    this.optionsSignal.set(this.options);
    this.router.navigate(['login']);
  }

  uploadXmlFileOntrac(formData: FormData, warehouseId: number): Observable<HttpEvent<ImportResultDto>> {
    return this.http.post<ImportResultDto>(`${this.baseUrl}/Routes/upload/${warehouseId}`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)) // ✅ preserva err.error.message
    );
  }
  uploadSwiftXDspSummary(formData: FormData, warehouseId: number) {
    return this.http.post<any>(
      `${this.baseUrl}/Routes/upload-swiftx-dsp-summary/${warehouseId}`,
      formData,
      {
        observe: 'events',
        reportProgress: true
      }
    );
  }
  uploadRouteManifestPdf(
    files: File[],
    warehouseId: number
  ) {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post(
      `${environment.apiUrl}/Routes/upload-route-manifest-pdf/${warehouseId}`,
      formData,
      {
        observe: 'events',
        reportProgress: true
      }
    );
  }

  importUniUniDailyRoutes(
  file: File,
  warehouseId: number
) {
  const formData = new FormData();

  formData.append('File', file);          // Debe coincidir con la propiedad del Request
  formData.append('WarehouseId', warehouseId.toString());

  return this.http.post(
    `${environment.apiUrl}/Routes/import-UniUni-DailyRoutes`,
    formData,
    {
      observe: 'events',
      reportProgress: true
    }
  );
}

  uploadXmlFileOther(formData: FormData, warehouseId: number): Observable<HttpEvent<ImportResultDto>> {
    formData.append('warehouseId', warehouseId.toString());

    return this.http.post<ImportResultDto>(`${this.baseUrl}/Routes/route-parcel-info`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Mapea los eventos HTTP a mensajes específicos
   */
  private getEventMessage(event: HttpEvent<any>, file: File) {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        const progress = Math.round((100 * event.loaded) / (event.total ?? 1));
        return { status: 'progress', progress };
      case HttpEventType.Response:
        return { status: 'success', body: event.body };
      default:
        return { status: 'unknown' };
    }
  }

  /**
   * Maneja errores HTTP
   */

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Error ${error.status}: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }


  latestGrossAmountByWarehouse(): Observable<WarehouseGrossRow[]> {
    return this.http.get<WarehouseGrossRow[]>(
      `${this.baseUrl}/PayRoll/latestGrossAmountByWarehouse`
    );
  }

  setPassword(data: any) {
    return this.http.post(
      `${this.baseUrl}/user/set-password`,
      data
    );
  }
}

export interface WarehouseGrossRow {
  warehouseId: number;
  warehouse: string;
  payPeriodId: number;
  grossAmountTotal: number;
  date: string;
}