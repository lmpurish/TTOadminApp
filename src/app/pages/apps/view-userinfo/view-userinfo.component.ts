import { CommonModule } from '@angular/common';
import { Component, Inject, Input, Optional } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { RolePipe } from '../employee/role.pipe';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { CoreService } from 'src/app/services/core.service';
import { environment } from 'src/environments/environment';
import { catchError, finalize, Observable, of, shareReplay, timeout } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { Clipboard } from '@angular/cdk/clipboard';
import { RoutesService } from 'src/app/services/apps/routes/routes.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-view-userinfo',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
    ClipboardModule,
    RouterModule
  ],
  templateUrl: './view-userinfo.component.html',
  styleUrl: './view-userinfo.component.scss'
})


export class ViewUserinfoComponent {
  action: string;
  local_data: any;
  loading: boolean = false;
  public baseUrl = environment.apiUrl;
  userFromCurrent: any;
  showSsn = false;
  ssnUrl: string = '';
  private ssnAutoHideTimer: any = null;
  loadingDriverLicense: boolean = false;
  @Input() ssnMaskedFromServer?: string; // algo como '***-**-1234' (si ya viene del backend)
  @Input() ssnEncrypted?: string | null; // NO recomendable pasar plain-text por inputs
  @Input() canViewSsn = false; // permiso para ver desencriptado (control de acceso)
  private _fullSsn: string | null = null; // solo llena si traes el SSN real de forma segura
  userRoutes: any[] = [];
  loadingRoutes = false;
  startDate: Date | null = null;
  endDate: Date | null = null;

  routeColumns: string[] = [
    'date',
    'routeCode',
    'zone',
    'stops',
    'volume',
    'attempts',
    'cnl',
    'status'
  ];
  encodeURIComponent = encodeURIComponent;
  constructor(
    public dialogRef: MatDialogRef<ViewUserinfoComponent>,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private warehouseService: WarehouseService,
    private settings: CoreService,
    private toastr: ToastrService,
    private clipboard: Clipboard,
    private routeService: RoutesService,


    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data?.action || '';
    this.local_data = { ...data?.local_data };
    this.local_data.profile = this.local_data.profile || {};
    this.local_data.account = this.local_data.account || {};
    this.local_data.warehouse = this.local_data.warehouse || null;
    // Convertir `userRole` a string para `mat-select`
    if (this.local_data?.userRole !== undefined) {
      this.local_data.userRole = String(this.local_data.userRole);
    }

    // Asignar `warehouseId` correctamente
    if (this.local_data?.warehouse?.id) {
      this.local_data.warehouseId = this.local_data.warehouse.id;
    }
  }
  copy(value?: string) {
    if (!value) return;

    this.clipboard.copy(value);

    this.snackBar.open('Copied to clipboard', 'OK', {
      duration: 1500,
    });
  }
  avatarUrl: string;

  private avatarCache = new Map<string, Observable<string>>();
  private fallback = '/assets/images/profile/user-1.jpg';
  avatarSrc$(row: any): Observable<string> {
    const file = row?.avatarUrl?.trim();
    if (!file) return of(this.fallback);

    if (!this.avatarCache.has(file)) {
      const obs$ = this.settings.getAvatar(file).pipe(
        // si tu getAvatar devuelve Blob, convierte aquí:
        // map(blob => URL.createObjectURL(blob)),
        // Maneja errores: no almacenes un observable fallido
        catchError(err => {
          // elimina del cache para permitir reintento futuro
          this.avatarCache.delete(file);
          return of(this.fallback);
        }),
        shareReplay(1)
      );
      this.avatarCache.set(file, obs$);
    }
    return this.avatarCache.get(file)!;
  }

  get displayedSsn(): string {


    if (this.showSsn && this._fullSsn) {
      return this.formatSsn(this._fullSsn);
    }
    // si backend ya envía la versión enmascarada la usamos; si no, generamos máscara
    return this.ssnMaskedFromServer ?? this.maskFromFull(this._fullSsn) ?? '***-**-' + this.local_data?.profile.ssn;
  }
  async onToggleShow() {
    if (!this.canViewSsn) {
      // no autorizado: puedes mostrar un toast o tooltip
      return;
    }

    if (this.showSsn) {
      // si ya estaba abierto, solo ocultamos
      this.showSsn = false;
      // opcional: borrar _fullSsn para reducir exposición en memoria
      this._fullSsn = null;
      return;
    }

    // si queremos mostrar y no tenemos el SSN, lo solicitamos al backend seguro
    if (!this._fullSsn) {
      try {
        this._fullSsn = await this.fetchFullSsn(this.local_data?.id);
      } catch (err) {
        console.error('Error obteniendo SSN:', err);
        // mostrar notificación al usuario si falla
        return;
      }
    }

    this.showSsn = true;
  }

  private maskFromFull(full?: string | null): string | null {
    if (!full) return null;
    // asume formato 9 dígitos o 'AAA-GG-SSSS' — adapta según tu caso
    const digits = full.replace(/\D/g, '');
    if (digits.length < 4) return '***-**----';
    const last4 = digits.slice(-4);
    return `***-**-${last4}`;
  }

  private formatSsn(full: string): string {

    const d = full.replace(/\D/g, '');
    if (d.length === 9) {
      return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    }
    return full;
  }
  applyRouteDateFilter(): void {
    this.loadUserRoutes();
  }
  private formatDate(date: Date | null): string | undefined {
    if (!date) return undefined;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
  clearRouteDateFilter(): void {
    this.startDate = null;
    this.endDate = null;
    this.loadUserRoutes();
  }

  // Ejemplo de llamada simulada al backend — reemplaza con tu HttpClient real
  private async fetchFullSsn(userId: number): Promise<string> {
    try {
      // Espera la primera emisión y convierte el Observable a Promise
      const res = await firstValueFrom(this.employeeService.getSsn(userId));

      // Si el backend devuelve ssn vacío usamos la máscara
      const toShow = (res.ssn && res.ssn.trim().length > 0) ? res.ssn : res.masked ?? '***-**-----';

      // Normalizar: si vienen 9 dígitos sin guiones, formatear; si ya viene masked/format, devolver tal cual
      const digits = toShow.replace(/\D/g, '');
      if (digits.length === 9) {
        return this.formatSsn(digits);
      }

      return toShow;
    } catch (err) {
      // Manejo de error: puedes re-lanzar o devolver la máscara por defecto
      // No loguear SSN en texto plano
      // console.error(err); // evita loguear PII
      return '***-**-----';
    }
  }

  ngOnInit(): void {

    const id = this.local_data?.id;

    if (id != null) {
      this.loadUserFromApi(id);
      this.loadUserRoutes();
    }

    if (
      this.settings.getRole() === 'Admin' ||
      this.settings.getRole() === 'CompanyOwner'
    ) {
      this.canViewSsn = true;
    }
  }

  private loadUserFromApi(id: number | string): void {
    this.loading = true;
    this.settings.getCurrentUser(id).subscribe({
      next: (res: any) => {
        // Merge + normalización para que el template siga funcionando

        this.userFromCurrent = res;

      },
      error: (err) => {
        console.error('getCurrentUser error', err);
        this.snackBar.open('Error loading user info', 'Close', { duration: 3000 });
      },
      complete: () => (this.loading = false),
    });
  }
  onTabChange(event: any) {
    if (event.index === 2 && this.userRoutes.length === 0) {
      this.loadUserRoutes();
    }
  }

  onDownload(): void {
    // TODO: Implementa tu lógica real de descarga
    // Por ejemplo: this.userService.downloadProfile(this.local_data?.id).subscribe(...)
    // o window.open(url, '_blank');
  }

  showDriverLicense: boolean = false;
  DriverLicenseAutoHideTimer: any = null;
  DriverLicenseUrl: string = '';

  toggleDriverLicense(): void {
    this.showDriverLicense = !this.showDriverLicense;

    // Auto-hide
    clearTimeout(this.DriverLicenseAutoHideTimer);
    if (this.showDriverLicense) {
      this.DriverLicenseAutoHideTimer = setTimeout(() => (this.showDriverLicense = false), 10_000);
    }

    // Si no hay URL, no llamamos al server
    if (!this.userFromCurrent?.driverUrl || !this.showDriverLicense) return;

    // (Opcional) indicador de carga
    this.loadingDriverLicense = true;

    this.settings
      .getDriverLicenceBlob(this.userFromCurrent.driverUrl)
      .pipe(
        // Evita requests colgados
        timeout(15000),
        finalize(() => (this.loadingDriverLicense = false))
      )
      .subscribe({
        next: (url: string) => {
          this.DriverLicenseUrl = url;
        },
        error: (err: any) => {
          // Manejo detallado de HttpErrorResponse
          if (err instanceof HttpErrorResponse) {
            // Caso: el backend envía un Blob con el error (muy común cuando se esperaba un archivo)
            if (err.error instanceof Blob) {
              err.error.text().then((text: string) => {
                try {
                  const json = JSON.parse(text);
                  const msg =
                    json?.message ||
                    json?.error ||
                    `Error ${err.status} ${err.statusText}`;
                  this.toastr.error(msg, 'Driver License');
                } catch {
                  const fallback =
                    text?.trim() ||
                    (err.message || `Error ${err.status} ${err.statusText}`);
                  this.toastr.error(fallback, 'Driver License');
                }
              });
              return;
            }

            // Caso: JSON o texto normal
            const msg =
              err.error?.message ||
              err.error?.error ||
              err.message ||
              `Error ${err.status} ${err.statusText}`;
            this.toastr.error(msg, 'Driver License');
          } else {
            // Errores no-HTTP (RxJS, JS, etc.)
            this.toastr.error(String(err ?? 'Error desconocido'), 'Driver License');
          }
        },
      });
  }
  toggleSsn(): void {
    if (this.userFromCurrent.ssnUrl) {
      this.settings.getSsnImageBlob(this.userFromCurrent.ssnUrl).subscribe(url => {
        this.ssnUrl = url
      })
    }
    this.showSsn = !this.showSsn;

    // (Opcional) Auto-ocultar después de 10s por seguridad
    clearTimeout(this.ssnAutoHideTimer);
    if (this.showSsn) {
      this.ssnAutoHideTimer = setTimeout(() => (this.showSsn = false), 10_000);
    }
  }

  showInsurance: boolean = false;
  InsuranceAutoHideTimer: any = null;
  insuranceUrl: string = '';
  toggleInsurance(): void {
    if (this.userFromCurrent.insuranceUrl) {
      this.settings.getInsuranceBlob(this.userFromCurrent.insuranceUrl).subscribe(url => {
        this.insuranceUrl = url
      })
    }
    this.showInsurance = !this.showInsurance;
    clearTimeout(this.InsuranceAutoHideTimer);
    if (this.showInsurance) {
      this.InsuranceAutoHideTimer = setTimeout(() => (this.showInsurance = false), 10_000);
    }
  }
  get profileCompletion(): number {
    const checks = [
      !!this.local_data?.name,
      !!this.local_data?.lastName,
      !!this.local_data?.email,
      !!this.local_data?.profile?.phoneNumber,
      !!this.local_data?.profile?.ssn,
      !!this.local_data?.profile?.address,
      !!this.local_data?.profile?.city,
      !!this.local_data?.profile?.state,
      !!this.local_data?.profile?.zipcode,
      !!this.local_data?.account?.accountNumber,
      !!this.local_data?.account?.routingNumber,
      !!this.hasWarehouse,
      !!this.userFromCurrent?.driverLicenseNumber,
      !!this.userFromCurrent?.driverUrl,
      !!this.userFromCurrent?.insuranceUrl,
      !!this.userFromCurrent?.contractSigned
    ];

    const completed = checks.filter(Boolean).length;

    return Math.round((completed / checks.length) * 100);
  }
  get hasAnyDocument(): boolean {
    return !!(
      this.userFromCurrent?.contractSigned ||
      this.userFromCurrent?.driverLicenseNumber ||
      this.userFromCurrent?.driverUrl ||
      this.userFromCurrent?.ssnUrl ||
      this.userFromCurrent?.insuranceUrl
    );
  }
  loadUserRoutes(): void {

    const userId = this.local_data?.id;

    if (!userId) {
      this.userRoutes = [];
      return;
    }

    this.loadingRoutes = true;

    this.routeService.getRoutesByUser(
      userId,
      this.formatDate(this.startDate),
      this.formatDate(this.endDate)
    )
      .subscribe({
        next: (res) => {
          this.userRoutes = res || [];
          this.loadingRoutes = false;
        },
        error: (err) => {
          console.error(err);
          this.loadingRoutes = false;
        }
      });
  }
  get hasWarehouse(): boolean {
    const wh = this.local_data?.warehouse;

    return !!(
      wh &&
      (
        wh.id ||
        wh.city ||
        wh.company
      )
    );
  }
  get profileWarnings(): any[] {
    const userId = this.local_data?.id;
    const base = `/apps/complete-profile/${userId}`;

    const warnings: any[] = [];

    if (!this.local_data?.profile?.phoneNumber) {
      warnings.push({
        label: 'Missing phone number',
        link: `${base}?section=personal`
      });
    }

    if (!this.local_data?.profile?.address) {
      warnings.push({
        label: 'Missing address',
        link: `${base}?section=address`
      });
    }

    if (!this.local_data?.account?.accountNumber || !this.local_data?.account?.routingNumber) {
      warnings.push({
        label: 'Missing bank account',
        link: `${base}?section=bank`
      });
    }

    if (!this.userFromCurrent?.driverLicenseNumber || !this.userFromCurrent?.driverUrl) {
      warnings.push({
        label: 'Missing driver license',
        link: `${base}?section=driver-license`
      });
    }

    if (!this.userFromCurrent?.insuranceUrl) {
      warnings.push({
        label: 'Missing insurance',
        link: `${base}?section=insurance`
      });
    }

    if (!this.userFromCurrent?.contractSigned) {
      warnings.push({
        label: 'Missing contractor agreement',
        link: `${base}?section=contract`
      });
    }

    return warnings;
  }
  sendAllMissingLinks(): void {

    if (!this.profileWarnings.length) {
      this.snackBar.open('No missing items found.', 'OK', {
        duration: 2000
      });
      return;
    }

    const phone = this.local_data?.profile?.phoneNumber;

    if (!phone) {
      this.snackBar.open('User does not have a phone number.', 'OK', {
        duration: 3000
      });
      return;
    }

    const message =
      `Hello ${this.local_data?.name},

Please complete the following items:

${this.profileWarnings.map(x => `• ${x.label}`).join('\n')}

Profile Link:
${this.baseUrl}/apps/complete-profile/${this.local_data?.id}

Thank you.`;

    window.open(
      `https://wa.me/1${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  }
  getWhatsappLink(warning: any): string {
    const phone = this.getUserPhone();

    console.log('Phone:', phone);

    if (!phone) return '#';

    let cleanPhone = phone.toString().replace(/\D/g, '');

    if (cleanPhone.length === 10) {
      cleanPhone = '1' + cleanPhone;
    }

    const message = `Hello ${this.local_data?.name},

Please complete this missing item:

${warning.label}

Link:
${warning.link}

Thank you.`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }


  openLink(link: string): void {
    if (!link) return;
    window.open(link, '_blank');
  }

  openWhatsapp(warning: any): void {
    console.log('CLICK WHATSAPP');

    const url = this.getWhatsappLink(warning);

    if (!url || url === '#') {
      this.snackBar.open('This user does not have a phone number.', 'Close', {
        duration: 3000
      });
      return;
    }

    window.open(url, '_blank');
  }

  getUserPhone(): string | null {
    return (
      this.local_data?.profile?.phoneNumber ||
      this.local_data?.profile?.phone ||
      this.local_data?.phoneNumber ||
      this.local_data?.phone ||
      this.local_data?.mobile ||
      this.userFromCurrent?.profile?.phoneNumber ||
      this.userFromCurrent?.phoneNumber ||
      this.userFromCurrent?.phone ||
      null
    );
  }
}
