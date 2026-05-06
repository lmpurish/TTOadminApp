import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { MatDialog } from '@angular/material/dialog';
import { navItems } from '../sidebar/sidebar-data';
import { TranslateService } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { HttpErrorResponse } from '@angular/common/http';
import { AppSettings } from 'src/app/config';
import { jwtDecode } from "jwt-decode";
import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from 'src/app/services/notification.service';
import { environment } from 'src/environments/environment';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { ImportResultComponent } from './import-result/import-result.component';
import { ImportResultDto } from './importResult/import-result.model';

interface notifications {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
}

interface profiledd {
  id: number;
  img: string;
  title: string;
  subtitle: string;
  link: string;
}

interface apps {
  id: number;
  img: string;
  title: string;
  subtitle: string;
  link: string;

}

interface quicklinks {
  id: number;
  title: string;
  link: string;
}

@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
  ],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None
})
export class HeaderComponent {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleMobileFilterNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();
  private baseUrl = environment.apiUrl;
  showFiller = false;
  userInfo: any;

  public selectedLanguage: any = {
    language: 'English',
    code: 'en',
    type: 'US',
    icon: '/assets/images/flag/icon-flag-en.svg',
  };

  public languages: any[] = [
    {
      language: 'English',
      code: 'en',
      type: 'US',
      icon: '/assets/images/flag/icon-flag-en.svg',
    },
    {
      language: 'Español',
      code: 'es',
      icon: '/assets/images/flag/icon-flag-es.svg',
    },

  ];

  @Output() optionsChange = new EventEmitter<AppSettings>();
  notifications: notifications[] = []

  constructor(
    private settings: CoreService,
    private vsidenav: CoreService,
    public dialog: MatDialog,
    private translate: TranslateService,
    private router: Router,
    private core: CoreService,
    private notification: NotificationService

  ) {
    translate.setDefaultLang('en');
  }
  ngOnInit(): void {

    this.loadUserInfo();
    this.loadNotifications();
  }

  options = this.settings.getOptions();

  openDialog() {
    const dialogRef = this.dialog.open(AppSearchDialogComponent);

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });
  }

  private emitOptions() {
    this.optionsChange.emit(this.options);
  }
  loadUserInfo(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('⚠️ No hay token en localStorage');
      this.userInfo = null;
      return;
    }

    try {
      const decoded: any = jwtDecode(token);

      // Validación mínima (no seas tan estricto o romperás login)
      if (!decoded) {
        console.error('❌ Token inválido');
        this.userInfo = null;
        return;
      }

      this.userInfo = {
        id: Number(decoded.nameid),                 // sub / nameid
        name: decoded.unique_name ?? decoded.name ?? 'Unknown',
        role: decoded.role,
        email: decoded.email,
        warehouseId: decoded.warehouseID ?? null,   // OJO naming
        companyId: decoded.companyId ?? null,
        avatarUrl: decoded.avatar_url ?? null
      };

    } catch (err) {
      console.error('❌ Error decodificando token', err);
      this.userInfo = null;
    }
  }

  loadNotifications() {
    const id = this.userInfo.id;

    this.notification.getNotifications(id).subscribe({
      next: (res) => {
        this.notifications = res

      }
    }
    )
  }
  get avatarImageUrl(): string {
    if (this.userInfo?.avatarUrl) {
      return `${this.baseUrl}/User/avatar/${this.userInfo.avatarUrl}`;
    }
    return '/assets/images/profile/user-1.jpg';
  }
  markAsRead(notification: any) {
    this.notification.markRead(notification).subscribe({
      next: () => {
        // ✅ Marcar como leído localmente
        notification.isRead = true;

        // ✅ (Opcional) Mostrar una notificación o actualizar el contador
        // this.toastr.success('Notificación marcada como leída');
      },
      error: (err: any) => {
        console.error('Error al marcar notificación como leída', err);
      }
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  setlightDark(theme: string) {
    this.options.theme = theme;
    this.emitOptions();
  }

  changeLanguage(lang: any): void {
    this.translate.use(lang.code);
    this.selectedLanguage = lang;
    this.core
  }

  logout() {
    this.settings.signOut();
    this.router.navigate(['/authentication/login']);
    this.core.showSuccess("Come back soon!!")
  }




  profiledd: profiledd[] = [
    {
      id: 1,
      img: '/assets/images/svgs/icon-account.svg',
      title: 'My Profile',
      subtitle: 'Account Settings',
      link: '/apps/account-setting',
    },
    /*  {
        id: 2,
        img: '/assets/images/svgs/icon-inbox.svg',
        title: 'My Inbox',
        subtitle: 'Messages & Email',
        link: '/apps/email/inbox',
      },
      {
        id: 3,
        img: '/assets/images/svgs/icon-tasks.svg',
        title: 'My Tasks',
        subtitle: 'To-do and Daily Tasks',
        link: '/apps/taskboard',
      },*/
  ];


}

@Component({
  selector: 'search-dialog',
  imports: [RouterModule, MaterialModule, TablerIconsModule, FormsModule],
  templateUrl: 'search-dialog.component.html'
})

export class AppSearchDialogComponent {
  selectedFile: File | null = null;
  isLoading = false;
  userInfo: any;
  fileType: 'report' | 'claims' | null = null;
  constructor(private http: HttpClient, private snackBar: MatSnackBar, private core: CoreService,
    private warehouseService: WarehouseService, private dialog: MatDialog) { }
  warehouses: any[] = [];
  isAdmin = false;
  selectedWarehouseId: number | null = null;
  private getWarehouseId(): number | null {
    if (this.isAdmin) return this.selectedWarehouseId ?? null;
    return this.userInfo?.warehouseID ?? null;
  }

  private getSelectedWarehouse(warehouseId: number | string) {
    const id = Number(warehouseId);
    return this.warehouses?.find(w => Number(w.id) === id) ?? null;
  }
  ngOnInit(): void {
    if (!this.isAdmin) {
      const user = this.core.getUserInfoFromToken();

      if (!user || !user.WarehouseID) {
        console.warn('User has no WarehouseID in token');
        this.selectedWarehouseId = null;
        return;
      }

      this.selectedWarehouseId = Number(user.WarehouseID);
    }
    this.loadUserInfo();
    this.warehouseService.getWarehouses().subscribe(
      res => {
        this.warehouses = res
      }
    )
  }

  loadUserInfo() {
    const token = localStorage.getItem('token'); // Obtiene el token JWT

    if (!token) {
      console.warn("⚠️ No hay token en localStorage");
      return;
    }

    try {

      const decodedToken: any = jwtDecode(token); // Decodifica el token



      if (!decodedToken.unique_name || !decodedToken.role || decodedToken.nameid === undefined || !decodedToken.email) {
        console.error("❌ El token no contiene información válida del usuario");
        return;
      }

      this.userInfo = {
        name: decodedToken.unique_name || 'Unknown',
        id: decodedToken.nameid || 'Unknown',
        role: decodedToken.role,
        email: decodedToken.email,
        warehouseID: decodedToken.WarehouseID || 'Unknown', // 🔍 Verificar que el nombre coincide
      };

      if (this.userInfo.role == 'Admin' || this.userInfo.role == 'CompanyOwner') {
        this.isAdmin = true;
      }

    } catch (error) {
      console.error('❌ Error decodificando el token:', error);
      this.userInfo = null;
    }
  }



  onFileSelected(event: any) {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;

    const allowedMimeTypes = [
      'text/xml',
      'application/xml',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const allowedExtensions = ['xml', 'xls', 'xlsx'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    const isValid =
      allowedMimeTypes.includes(file.type) ||
      allowedExtensions.includes(extension || '');

    if (isValid) {
      this.selectedFile = file;
    } else {
      this.snackBar.open(
        'Por favor, selecciona un archivo válido (.xml, .xls, .xlsx).',
        'Cerrar',
        { duration: 3000 }
      );
      this.selectedFile = null;
      event.target.value = '';
    }
  }


  uploadFile(event: Event) {
    event.preventDefault();

    if (!this.selectedFile) return;

    const warehouseId = this.getWarehouseId();
    if (!warehouseId) {
      this.snackBar.open('Please select a warehouse.', 'Close', { duration: 4000 });
      return;
    }

    if (!this.fileType) {
      this.snackBar.open('Please select a file type.', 'Close', { duration: 4000 });
      return;
    }

    const wh = this.getSelectedWarehouse(warehouseId);
    const company = (wh?.company ?? '').toLowerCase();

    this.isLoading = true;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    let request$;

    if (this.fileType === 'report') {
      request$ =
        company === 'ontrac'
          ? this.core.uploadXmlFileOntrac(formData, warehouseId)
          : this.core.uploadXmlFileOther(formData, warehouseId);
    } else {
      request$ = this.core.uploadClaimsFile(formData);
    }

    request$.subscribe({
      next: (evt: HttpEvent<any>) => {
        if (evt instanceof HttpResponse) {
          const res = evt.body;

          this.selectedFile = null;
          console.log('RES:', res);

          if (this.fileType === 'claims') {
            this.snackBar.open(
              `Claims imported successfully. Created: ${res?.created ?? 0}, Errors: ${res?.errors ?? 0}`,
              'Close',
              { duration: 6000 }
            );

            if (res?.errorRows?.length) {
              this.dialog.open(ImportResultComponent, {
                width: '900px',
                maxWidth: '95vw',
                data: res
              });
            }
          } else {
            this.handleImportResponse(res, company);

            if (company !== 'ontrac' && res) {
              try {
                this.dialog.open(ImportResultComponent, {
                  width: '900px',
                  maxWidth: '95vw',
                  data: res
                });
              } catch (e) {
                console.error('DIALOG ERROR:', e);
                this.snackBar.open('Error opening results modal.', 'Close', { duration: 5000 });
              }
            }
          }
        }
      },
      error: (err: any) => {
        console.log('ERR:', err);

        const payload = err?.error ?? err;

        if (this.fileType === 'claims') {
          const msg =
            typeof payload === 'string'
              ? payload
              : payload?.message || 'Error importing claims file.';

          this.snackBar.open(msg, 'Close', { duration: 5000 });
        } else {
          this.handleImportResponse(payload, company);
        }

        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }


  private handleImportResponse(payload: any, company: string) {
    if (!payload) return;

    const message = payload?.message ?? 'Done.';

    // Soporta ambos nombres (por si hay typo en backend)
    const notFound: string[] =
      payload?.notFoundUsers ??
      payload?.notFountInUsers ??
      payload?.missingIdentificationNumbers ??
      [];

    // Muestra el mensaje
    this.snackBar.open(message, 'Cerrar', { duration: 6000 });

    // ✅ Caso OnTrac: mostrar los no encontrados
    if (company === 'ontrac' && notFound.length > 0) {
      // Opción A: abrir el mismo dialog pero con una data "simple"
      this.dialog.open(ImportResultComponent, {
        width: '900px',
        maxWidth: '95vw',
        data: {
          message,
          notFoundUsers: notFound,
          missingCount: notFound.length,
          warehouseId: 5
        }
      });

      // Opción B (si NO quieres dialog): solo resumen
      // this.snackBar.open(`Missing drivers: ${notFound.length}`, 'Cerrar', { duration: 7000 });
    }

    // (Tu comportamiento actual para NO OnTrac lo mantienes en el next)
  }
}



// filtered = this.navItemsData.find((obj) => {
//   return obj.displayName == this.searchinput;
// });

