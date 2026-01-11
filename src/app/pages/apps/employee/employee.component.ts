import {
  Component,
  Inject,
  Optional,
  ViewChild,
  AfterViewInit,
  OnInit,
} from '@angular/core';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Employee } from 'src/app/pages/apps/employee/employee';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CoreService } from 'src/app/services/core.service';
import { RolePipe } from './role.pipe';
import { Pipe, PipeTransform } from '@angular/core';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { ViewUserinfoComponent } from '../view-userinfo/view-userinfo.component';
import { environment } from 'src/environments/environment';
import { catchError, Observable, of, shareReplay } from 'rxjs';

@Component({
  selector: 'app-employee',
  templateUrl: './employee.component.html',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
    RolePipe
  ],
})
export class EmployeeComponent implements AfterViewInit, OnInit {
  @ViewChild(MatTable, { static: false }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  public baseUrl = environment.apiUrl;

  searchText: string = '';
  displayedColumns: string[] = [
    'identificationNumber',
    'name',
    'phoneNumber',
    'email',
    'isActive',
    'warehouseId', // Aquí está el almacén
    'action',
  ];
  driverStatus: 'active' | 'inactive' | 'all' = 'active'; // por defecto Activos

  selectedWarehouseId: number | null = null;
  dataSource = new MatTableDataSource<Employee>([]);
  warehouses: any[] = []; // Almacenes disponibles
  loading: boolean = false;
  selectedRoleFilter: string = 'all';
  isAdmin = false;
  textFilter: string = '';

  constructor(
    public dialog: MatDialog,
    private employeeService: EmployeeService,
    private warehouseService: WarehouseService, // Agregar el servicio de almacenes
    private settings: CoreService,
    private rolePipe: RolePipe
  ) { }

  ngOnInit(): void {

    this.loadEmployees();
    this.loadWarehouses();

    if (this.settings.getRole() == 'Admin' || this.settings.getRole() == 'CompanyOwner' || this.settings.getRole() == 'Assistant') {
      this.isAdmin = true;
    }

    // 🔹 Un solo predicado de filtro: texto + warehouse + estado
    this.dataSource.filterPredicate = (row: any, filter: string) => {
      const f = JSON.parse(filter || '{}') as {
        text?: string;
        warehouseId?: number | null;
        status?: 'active' | 'inactive' | 'all';
      };

      // Texto
      const t = (f.text || '').toLowerCase();
      const matchesText =
        !t ||
        (row?.identificationNumber?.toString()?.toLowerCase()?.includes(t)) ||
        (row?.name?.toLowerCase()?.includes(t)) ||
        (row?.lastName?.toLowerCase()?.includes(t)) ||
        (row?.email?.toLowerCase()?.includes(t)) ||
        (this.getWarehouseInfo(row?.warehouseId)?.toLowerCase()?.includes(t) ?? false);

      // Warehouse
      const matchesWarehouse =
        f.warehouseId == null || row?.warehouseId === f.warehouseId || row?.warehouse?.id === f.warehouseId;

      // 🔹 Normaliza isActive desde boolean/number/string y variantes
      const normalizeBool = (v: any): boolean => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v === 1;
        if (typeof v === 'string') {
          const s = v.trim().toLowerCase();
          return s === 'true' || s === '1' || s === 'yes';
        }
        return false;
      };

      // Algunos payloads traen isActivate; cubrimos ambos
      const isActive = normalizeBool(row?.isActive ?? row?.isActivate);

      const matchesStatus =
        (f.status === 'all') ||
        (f.status === 'active' && isActive) ||
        (f.status === 'inactive' && !isActive);

      return matchesText && matchesWarehouse && matchesStatus;
    };


    // Filtro inicial: Activos por defecto
    this.applyCompositeFilter();
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

  ngAfterViewInit(): void {

    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }
  loadEmployees(): void {
    this.loading = true;
    const userInfo = this.settings.getUserInfoFromToken();
    const userId = userInfo?.id ?? 0;
    if (userId === 0) {
      this.settings.showError('Usuario no autenticado.');
      this.loading = false; // ← agrega esto para no dejar loading colgado
      return;
    }

    this.employeeService.getEmployees().subscribe({
      next: (res) => {
        this.dataSource.data = res;

        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }

        // ✅ Reaplica el filtro compuesto (Activos por defecto)
        this.applyCompositeFilter();

        this.loading = false;
      },
      error: (err) => {
        this.settings.showError(err?.error?.message || 'Error loading employees.');
        this.loading = false;
      },
    });
  }



  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        this.warehouses = res; // Almacenar la lista de almacenes

      },
      error: (err) => {
        this.settings.showError(err?.error?.message || 'Error loading warehouses.');
      },
    });
  }

  applyFilter(value: string): void {
    this.searchText = (value ?? '').trim().toLowerCase();
    this.applyCompositeFilter();
  }

  onWarehouseChange(warehouseId: number | null): void {
    this.selectedWarehouseId = warehouseId;
    this.applyCompositeFilter();
  }

  onDriverStatusChange(status: 'active' | 'inactive' | 'all'): void {
    this.driverStatus = status;
    this.applyCompositeFilter();
  }

  // ✅ Único punto para aplicar el filtro compuesto
  private applyCompositeFilter(): void {
    const filterObj = {
      text: this.searchText,
      warehouseId: this.selectedWarehouseId,
      status: this.driverStatus,
    };
    this.dataSource.filter = JSON.stringify(filterObj);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // (Opcional) si tenías este método en otros lados, haz que solo delegue:
  applyCombinedFilter(): void {
    this.applyCompositeFilter();
  }

  // 🔹 Obtener la ciudad del almacén por su ID
  getWarehouseInfo(warehouseId: number): string {
    const warehouse = this.warehouses.find(w => w.id === warehouseId);
    return warehouse ? `${warehouse.company} - ${warehouse.city}` : 'N/A';
  }


  openDialog(action: string, employee: Employee | any): void {
    if (action == "View") {
      const dialogRef = this.dialog.open(ViewUserinfoComponent, {
        data: { action, local_data: { ...employee } },
        autoFocus: false,
        width: '65%',
        height: '75%',
        maxWidth: '95vw'
      });
    }
    else {
      const dialogRef = this.dialog.open(AppEmployeeDialogContentComponent, {
        data: { action, local_data: { ...employee } },
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result?.event === 'Refresh' || result?.event === 'Update' || result?.event === 'Delete') {
          this.loadEmployees();
        }
      });
    }
  }
}

interface DialogData {
  action: string;
  employee: Employee;
}

@Component({
  selector: 'app-employee-dialog-content',
  templateUrl: './employee-dialog-content.html',

  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TablerIconsModule,
  ],
})
export class AppEmployeeDialogContentComponent implements OnInit {
  action: string;
  local_data: any;
  warehouses: any = [];
  loading: boolean = false;
  isAdmin: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<AppEmployeeDialogContentComponent>,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private warehouseService: WarehouseService,
    private settings: CoreService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data?.action ?? '';
    this.local_data = data?.local_data ? { ...data.local_data } : {}; // ← nunca undefined

    // 2) userRole a string si viene
    if (this.local_data.userRole !== undefined && this.local_data.userRole !== null) {
      this.local_data.userRole = String(this.local_data.userRole);
    }

    // 3) Normaliza warehouseId desde varias formas posibles
    const w = this.local_data.warehouse;
    const wid =
      this.local_data.warehouseId ??
      w?.id ??
      w?.Id ??
      null;

    this.local_data.warehouseId = wid !== null ? Number(wid) : null;

  }
  private pickWarehouseId(src: any): number | null {
    if (!src) return null;

    // a) ya viene directo
    if (src.warehouseId != null) return Number(src.warehouseId);

    // b) viene anidado en warehouse con id o Id
    const w = src.warehouse;
    if (w && (w.id != null || w.Id != null)) {
      return Number(w.id ?? w.Id);
    }

    // c) no hay id disponible
    return null;
  }

  // Lista de roles
  roles = [
    { value: '0', viewValue: 'Administrator' },
    { value: '1', viewValue: 'Manager' },
    { value: '2', viewValue: 'Assistant' },
    { value: '3', viewValue: 'Driver' },
    { value: '4', viewValue: 'Rsp' },
    { value: '5', viewValue: 'Applicant' },
    { value: '7', viewValue: 'Recruiter' }
  ];

  ngOnInit(): void {
    this.loadWarehouses();
    const userInfo = this.settings.getUserInfoFromToken();
    this.isAdmin = userInfo?.role === 'Admin';
  }

  loadWarehouses() {
    this.loading = true;
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        this.warehouses = res;
      },
      error: (err) => this.handleError(err),
      complete: () => (this.loading = false),
    });
  }

  doAction(): void {
    this.loading = true; // 🔄 Activar spinner

    // Convertir valores antes de enviar al backend
    this.local_data.userRole = Number(this.local_data.userRole);
    this.local_data.warehouseId = Number(this.local_data.warehouseId);

    if (this.action === 'Add') {
      this.employeeService.addEmployee(this.local_data).subscribe({
        next: () => this.successHandler('Employee added successfully!', 'Refresh'),
        error: (err) => this.handleError(err),
      });
    } else if (this.action === 'Update') {
      this.employeeService.updateEmployee(this.local_data).subscribe({
        next: () => this.successHandler('Employee updated successfully!', 'Update'),
        error: (err) => this.handleError(err),
      });
    } else if (this.action === 'Delete') {
      this.employeeService.deleteEmployee(this.local_data.id).subscribe({
        next: () => this.successHandler('Employee deleted successfully!', 'Delete'),
        error: (err) => this.handleError(err),
      });
    }
  }

  private successHandler(message: string, event: string): void {
    this.openSnackBar(message, 'Close');
    this.loading = false; // ✅ Desactivar spinner
    this.dialogRef.close({ event });
  }

  private handleError(err: any): void {
    console.error('Error:', err);
    this.openSnackBar(`Error: ${err.error?.message || err.message}`, 'Close');
    this.loading = false; // ✅ Desactivar spinner en caso de error
  }

  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  closeDialog(): void {
    if (!this.loading) {
      this.dialogRef.close({ event: 'Cancel' });
    }
  }
}