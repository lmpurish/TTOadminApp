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
  loadUserInfo() {
    const token = localStorage.getItem('token'); // Obtiene el token JWT

    if (!token) {
      console.warn("⚠️ No hay token en localStorage");
      return;
    }

    try {
      //  console.log("🔍 Token JWT recibido:", token); // Verifica el contenido del token
      const decodedToken: any = jwtDecode(token); // Decodifica el token
      // Si el token no contiene la información correcta
      if (!decodedToken.unique_name || !decodedToken.role || decodedToken.nameid === undefined || !decodedToken.email) {
        console.error("❌ El token no contiene información válida del usuario");
        return;
      }
      this.userInfo = {
        name: decodedToken.unique_name || 'Unknown',
        id: decodedToken.nameid || 'Unknown',
        role: decodedToken.role,
        email: decodedToken.email,
        warehouseID: decodedToken.warehouseID,
        avatarUrl: decodedToken.avatar_url,
      };

    } catch (error) {
      console.error('❌ Error decodificando el token:', error);
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
  constructor(private http: HttpClient, private snackBar: MatSnackBar, private core: CoreService,
    private warehouseService: WarehouseService, private dialog: MatDialog) { }
  warehouses: any[] = [];
  isAdmin = false;
  selectedWarehouseId?: number;
  private getWarehouseId(): number | null {
    if (this.isAdmin) return this.selectedWarehouseId ?? null;
    return this.userInfo?.warehouseID ?? null;
  }

  private getSelectedWarehouse(warehouseId: number) {
    return this.warehouses?.find(w => w.id === warehouseId) ?? null;
  }
  ngOnInit(): void {
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
      this.snackBar.open('Seleccione un warehouse.', 'Cerrar', { duration: 4000 });
      return;
    }

    const wh = this.getSelectedWarehouse(warehouseId);
    const company = (wh?.company ?? '').toLowerCase(); // "OnTrac" -> "ontrac"

    this.isLoading = true;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // ✅ Si es OnTrac usa un endpoint; si no, usa otro
    const request$ =
      company === 'ontrac'
        ? this.core.uploadXmlFileOntrac(formData, warehouseId)
        : this.core.uploadXmlFileOther(formData, warehouseId);

    request$.subscribe({
      next: (evt: HttpEvent<ImportResultDto>) => {
        // Progreso
     
        // Respuesta final
        if (evt instanceof HttpResponse) {
          const res = evt.body as ImportResultDto;

          this.snackBar.open('File uploaded successfully.', 'Cerrar', { duration: 3000 });
          this.selectedFile = null;

          // ✅ Solo mostrar vista cuando NO es OnTrac
          if (company !== 'ontrac' && res) {
            this.dialog.open(ImportResultComponent, {
              width: '900px',
              maxWidth: '95vw',
              data: res
            });
          }
        }
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error uploading file.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      
      }
    });
  }





  // filtered = this.navItemsData.find((obj) => {
  //   return obj.displayName == this.searchinput;
  // });
}
