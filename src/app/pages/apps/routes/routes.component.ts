import {
  Component,
  Inject,
  Optional,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { CoreService } from 'src/app/services/core.service';
import { Routes } from './Routes';
import { RoutesService } from 'src/app/services/apps/routes/routes.service';

@Component({
  selector: 'app-routes',
  templateUrl: './routes.component.html',
  styleUrl: './routes.component.scss',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
})

export class RoutesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatTable, { static: true }) table!: MatTable<any>;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'select',
    'date',
    'routeStatus',
    'userId',          // 👈 DRIVER editable solo si 'editable' está marcado
    'cnl',
    'volumen',
    'deliveryStops',
    'zoneId',
    'paymentType',
    'priceRoute'

  ];
  routeStatuses: string[] = ['Available', 'Assigned', 'In Progress', 'Future', 'Completed', 'Loading', 'PendingCompletion', 'Cancelled'];
  dataSource = new MatTableDataSource<any>([]);
  allRoutes: any[] = [];
  selectedRoutes: any[] = [];

  form: FormGroup;
  yesterday: Date = new Date();

  usersMap: Map<number, string> = new Map();
  zones: any[] = [];
  availableZones: any[] = [];
  selectedZones: number[] = [];


  selectedDate: string = '';
  loading: boolean = false;
  warehouses: any[] = [];
  warehouseId: any;
  isAdmin: boolean = false;
  routesLoaded = false;
  driversLoaded = false;
  // Conductores
  drivers: Driver[] = [];
  selectedDriverId: number | null = null; // para asignación MASIVA
  availableDrivers: any[] = [];
  constructor(
    private dialog: MatDialog,
    private routesService: RoutesService,
    private employeeService: EmployeeService,
    private settings: CoreService,
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private warehousesService: WarehouseService,
  ) {
    this.yesterday.setDate(this.yesterday.getDate() - 1);
    this.form = this.fb.group({
      selectedDate: [this.yesterday]
    });
  }
  statusClass(s: string): string {
    switch (s) {
      case 'Available': return 'st-available';
      case 'Assigned': return 'st-assigned';
      case 'In Progress': return 'st-progress';
      case 'Future': return 'st-future';
      case 'Completed': return 'st-completed';
      default: return 'st-default';
    }
  }

  ngOnInit(): void {
    const userInfo = this.settings.getUserInfoFromToken();

    if (!userInfo) {
      this.settings.showError('Usuario no autenticado.');
      return;
    }

    this.isAdmin = userInfo.role === 'Admin' || userInfo.role === 'CompanyOwner';

    // ✅ Fecha inicial
    this.yesterday = new Date();
    this.yesterday.setHours(0, 0, 0, 0);
    this.yesterday.setDate(this.yesterday.getDate() - 1);

    this.form = this.fb.group({
      selectedDate: this.yesterday,
      selectedWarehouse: [this.warehouseId]
    });

    // Primer load
    this.selectedDate = this.formatDate(this.form.get('selectedDate')?.value);
    this.loadRoutesByDate();

    if (this.isAdmin) {
      this.loadWarehouses();
    } else {
      this.loadZones();
    }

    this.form.get('selectedDate')?.valueChanges.subscribe({
      next: (data) => {
        if (data) {
          this.selectedDate = this.formatDate(data);
          this.loadRoutesByDate();
        }
      },
      error: (err) => {
        this.settings.showError('Ocurrió un error al procesar la fecha.');
        console.error('Error en valueChanges:', err);
      }
    });
    if (this.isAdmin) {
      this.form.get('selectedWarehouse')?.valueChanges.subscribe(value => {
        if (this.isAdmin && value) {
          this.warehouseId = value;
          this.loadRoutesByDate();
          this.loadZones();
        }
      });
    }
    else {
      this.warehouseId = this.settings.getUserInfoFromToken()?.WarehouseID;
    }


    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /** ✅ Cargar rutas por fecha */
  loadRoutesByDate(): void {
    this.loading = true;
    const warehouseId = this.isAdmin ? this.form.get('selectedWarehouse')?.value ?? null : null;

    this.routesService.getRoutesByDate(this.selectedDate, warehouseId).subscribe({
      next: (res) => {
        const filtered = (res || []).filter((r: any) => r.volumen !== 0 || r.deliveryStops !== 0);

        this.allRoutes = filtered.map((route: any) => {
          const rawUserId = route.user?.id ?? route.userId ?? route.UserId ?? route.userID ?? null;
          return {
            ...route,
            zoneId: route.zone ? Number(route.zone.id) : null,
            userId: rawUserId != null && Number.isFinite(Number(rawUserId)) ? Number(rawUserId) : null,
            user: route.user ?? null
          };
        });

        this.updateDataSource(this.allRoutes);
        this.ensureAssignedDriversInOptions();
        this.loading = false;
      },
      error: () => { this.allRoutes = []; this.updateDataSource([]); this.loading = false; }
    });
  }


  ensureAssignedDriversInOptions(): void {
    if (!this.allRoutes?.length) return;
    if (!this.drivers) this.drivers = [];

    const byId = new Map(this.drivers.map(d => [d.id, d]));
    let changed = false;

    for (const r of this.allRoutes) {
      const uidRaw = r.user?.id ?? r.userId ?? r.UserId ?? r.userID ?? null;
      const uid = Number(uidRaw);
      if (!Number.isFinite(uid)) continue; // 👈 NO empujar ids malos

      if (!byId.has(uid) && r.user) {
        const candidate = {
          id: uid,
          name: r.user.name ?? 'Driver',
          lastName: r.user.lastName ?? '',
          identificationNumber: r.user.identificationNumber ?? null
        };
        this.drivers.push(candidate);
        byId.set(uid, candidate);
        changed = true;
      }
    }

    if (changed) {
      // ya están normalizados, pero por seguridad:
      this.drivers = this.drivers.filter(d => Number.isFinite(d.id));
    }
  }

  /** 🔹 Actualiza datasource + paginador */
  private updateDataSource(data: any[]): void {
    this.dataSource = new MatTableDataSource(data);
    this.dataSource.paginator = this.paginator;
    this.cdRef.detectChanges();
  }

  /** ✅ Cargar conductores */
  loadUsers(): void {
    this.employeeService.getEmployees().subscribe({
      next: (res: any[]) => {
        // Log crudo para diagnosticar

        // Normaliza: toma id de varias fuentes, recorta, parsea, valida > 0
        this.drivers = (res || [])
          .map(d => {
            const rawId = d?.id ?? d?.Id ?? d?.userId ?? d?.UserId ?? null;
            const idNum = rawId == null ? NaN : parseInt(String(rawId).trim(), 10);
            return {
              id: idNum,
              name: d?.name ?? d?.firstName ?? 'Driver',
              lastName: d?.lastName ?? d?.surname ?? '',
              identificationNumber: d?.identificationNumber ?? d?.driverNumber ?? null
            };
          })
          .filter(d => Number.isFinite(d.id) && d.id > 0); // 🔒 sólo ids válidos (>0)
        this.ensureAssignedDriversInOptions(); // también sanea allí
        const bad = this.drivers.filter(d => !Number.isFinite(d.id));
        if (bad.length) console.warn('Drivers con id inválido:', bad);
      },
      error: (err) => console.error(err)
    });
  }

  mergeAssignedDriversIntoList(): void {
    if (!this.allRoutes?.length) return;
    if (!this.drivers) this.drivers = [];

    const byId = new Map(this.drivers.map(d => [Number(d.id), d]));
    let changed = false;

    for (const r of this.allRoutes) {
      const uid = r.user ? Number(r.user.id) : (r.userId != null ? Number(r.userId) : null);
      if (uid == null) continue;

      if (!byId.has(uid)) {
        // construir opción a partir del user de la ruta (lo que tengas disponible)
        const opt = r.user
          ? { id: uid, name: r.user.name, lastName: r.user.lastName, identificationNumber: r.user.identificationNumber }
          : { id: uid, name: 'Driver', lastName: `#${uid}`, identificationNumber: null };
        this.drivers.push(opt);
        byId.set(uid, opt);
        changed = true;
      }
    }

    if (changed) {
      // refresca select sin recrear el datasource
      this.drivers = this.drivers.map(d => ({ ...d, id: Number(d.id) }));
    }
  }


  getDriverNumber(driverId: number | null | undefined): string | null {
    if (!driverId) return null;
    const d = this.drivers.find(x => x.id === driverId);
    return d?.identificationNumber || null;
  }

  loadWarehouses(): void {
    this.warehousesService.getWarehouses().subscribe({
      next: (res) => {
        this.warehouses = res;
        if (res.length && !this.form.get('selectedWarehouse')?.value) {
          this.form.get('selectedWarehouse')?.setValue(res[0].id);
        }
      },
      error: (err) => this.settings.showError(err?.error?.message || 'Error loading warehouses')
    });
  }

  /** ✅ Zonas */
  loadZones(): void {
    const userInfo = this.settings.getUserInfoFromToken();
    const managerId = userInfo?.id ?? 0;

    if (managerId === 0) {
      this.settings.showError('Usuario no autenticado.');
      return;
    }

    const warehouseId = this.isAdmin
      ? this.form.get('selectedWarehouse')?.value
      : userInfo?.WarehouseID;

    if (this.isAdmin && (warehouseId == null || warehouseId === '')) {
      this.settings.showError('Debe seleccionar un almacén.');
      return;
    }

    this.routesService.getZonesByWarehouse(warehouseId).subscribe({
      next: (res) => {
        this.zones = res;
      },
      error: (err) => {
        this.settings.showError('Error cargando zonas.');
        console.error(err);
      }
    });
  }

  /** ✅ Helpers UI */
  getUserName(id: number): string {
    return this.usersMap.get(id) || "Unknown";
  }

  getAvailableZones(selectedZoneId: number | null): any[] {
    if (!this.zones) return [];
   
    const assignedZones = this.dataSource.data
      .filter((route: any) => route.zoneId !== null && route.zoneId !== selectedZoneId)
      .map((route: any) => route.zoneId);
    return this.zones.filter((zone: any) => !assignedZones.includes(zone.id) || zone.id === selectedZoneId);
  }

  handleZoneChange(element: any, selectedZoneId: number | null): void {
    const previousZoneId = element.zoneId;
    element.zoneId = selectedZoneId;
    element.zone = selectedZoneId ? this.zones.find((z: any) => z.id === selectedZoneId) : null;

    if (!this.isSelected(element)) {
      this.selectedRoutes.push(element);
    }

    if (previousZoneId && previousZoneId !== selectedZoneId) {
      const previousZone = this.zones.find((z: any) => z.id === previousZoneId);
      if (previousZone) this.availableZones.push(previousZone);
    }

    this.availableZones = this.availableZones.filter((z: any) => z.id !== selectedZoneId);
    this.dataSource.data = [...this.dataSource.data];
    this.cdRef.detectChanges();
  }

  /** ✅ Editable toggle por fila */
  onEditableToggle(row: any) {
    // Si deshabilitan edición, no hacemos nada especial.
    // Si habilitan, el select quedará activo; el guardado puede ser inmediato o con botón masivo.
  }
  getDriverById(id: number | string | null | undefined) {
    if (id === null || id === undefined) return null;
    const nid = Number(id);
    return this.drivers?.find(d => Number(d.id) === nid) || null;
  }

  /** ✅ Guardar cambio por fila SOLO si es editable */
  compareIds = (a: any, b: any) => a != null && b != null && Number(a) === Number(b);

  handleDriverChange(element: any, selectedUserId: any): void {
    console.log('selectedUserId (raw):', selectedUserId, typeof selectedUserId);

    // Si viene NaN, revertimos a null y avisamos
    if (Number.isNaN(selectedUserId)) {
      element.userId = null;
      element.user = null;
      this.snackBar.open('Driver inválido. Intenta de nuevo.', 'Close', { duration: 2500 });
      this.dataSource.data = [...this.dataSource.data];
      this.cdRef.detectChanges();
      return;
    }

    const cleaned = (selectedUserId === '' || selectedUserId === 'null' || selectedUserId === undefined)
      ? null
      : selectedUserId;

    const userId = cleaned === null ? null : Number(cleaned);
    element.userId = Number.isFinite(userId) ? userId : null;
    element.user = element.userId != null
      ? (this.drivers.find(d => d.id === element.userId) || null)
      : null;

    if (!this.isSelected(element)) this.selectedRoutes.push(element);

    this.dataSource.data = [...this.dataSource.data];
    this.cdRef.detectChanges();
  }

  isRowEditable(row: any): boolean {
    return row?.routeStatus !== 'Completed';
  }

  getEditableRows(): any[] {
    return this.dataSource.data.filter(r => this.isRowEditable(r));
  }
  /** ✅ Selección de filas */
  toggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.selectedRoutes = [];
    } else {
      this.selectedRoutes = [...this.dataSource.data];
    }
  }

  isAllSelected(): boolean {
    return this.dataSource.data.length > 0 && this.selectedRoutes.length === this.dataSource.data.length;
  }

  toggleSelection(route: any): void {
    const index = this.selectedRoutes.findIndex(r => r.id === route.id);
    if (index === -1) this.selectedRoutes.push(route);
    else this.selectedRoutes.splice(index, 1);
  }

  isSelected(route: any): boolean {
    return this.selectedRoutes.some(r => r.id === route.id);
  }

  /** ✅ Habilita botón principal si hay fecha y al menos una zona asignada */
  get isRoutesEmpty(): boolean {
    const selectedDate = this.form.get('selectedDate')?.value;
    const hasAssignedZone = this.dataSource.data.some((route: any) => route.zoneId !== null && route.zoneId !== undefined);
    return !selectedDate || !hasAssignedZone;
  }

  /** ✅ Asignación masiva:
   *  - Aplica driver masivo solo a filas marcadas como 'isEditable'
   *  - Si no hay driver masivo, toma el userId de cada fila (pero solo si isEditable)
   *  - zoneId y cnl se envían para TODAS las seleccionadas (si lo deseas)
   */
  assignRoutes(): void {
    if (!this.selectedRoutes.length) {
      this.snackBar.open('No routes selected', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
      return;
    }

    if (this.selectedDriverId) {
      this.selectedRoutes.forEach(r => {
        if (r.isEditable) r.userId = this.selectedDriverId;
      });
    }

    const payload = this.selectedRoutes.map(r => ({
      id: r.id,
      zoneId: this.toNumberOrNull(r.zoneId),
      cnl: r.cnl ?? null,
      userId: this.toNumberOrNull(r.userId),
      routeStatus: r.routeStatus ?? 'Available'   // 👈 como string
    }));

    
    this.routesService.assignRoutes(payload).subscribe({
      next: () => {
        this.snackBar.open('Routes updated successfully!', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
        this.selectedRoutes = [];
        this.loadRoutesByDate();
      },
      error: (err) => {
        const p = err?.error;
        const msg = (typeof p === 'string')
          ? p
          : p?.message || 'Error updating routes';
        this.snackBar.open(msg, 'Close', { duration: 6000, verticalPosition: 'top' });
      }
    });
  }

  handleStatusChange(element: any, next: string): void {
    if (!this.routeStatuses.includes(next)) return; // valida valor
    element.routeStatus = next;

    if (!this.isSelected(element)) this.selectedRoutes.push(element);

    this.dataSource.data = [...this.dataSource.data];
    this.cdRef.detectChanges();
  }

  getStatusClass(status: string): string {
    return {
      'Assigned': 'bg-light-error text-error rounded f-w-600 p-x-6 p-y-4 f-s-12',
      'In Progress': 'bg-light-warning text-warning rounded f-w-600 p-x-6 p-y-4 f-s-12',
      'Future': 'bg-light-secondary text-secondary rounded f-w-600 p-x-6 p-y-4 f-s-12',
      'Completed': 'bg-light-success text-success rounded f-w-600 p-x-6 p-y-4 f-s-12',
      'Available': 'bg-light-primary text-primary rounded f-w-600 p-x-6 p-y-4 f-s-12',
    }[status] || 'bg-light-secondary text-secondary rounded f-w-600 p-x-6 p-y-4 f-s-12';
  }
  toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;  // evita NaN
  }
  /** Crear/Editar rutas (sin cambios de tu flujo) */
  createRoute(action: string, route: any): void {
    const warehouseId = this.warehouseId;

    const dialogRef = this.dialog.open(RouteDialogContentComponent, {
      data: { action, warehouseId, local_data: { ...route } },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.event === 'Refresh' || result?.event === 'Update' || result?.event === 'Delete') {
        this.loadRoutesByDate();
      }
    });
  }

  trackByZoneId(index: number, item: any): number {
    return item.id;
  }
}

/** === Dialog (sin cambios relevantes para esta petición) === */
import { NgForm } from '@angular/forms';
@Component({
  selector: 'route-dialog-content',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TablerIconsModule,
  ],
  templateUrl: 'routes-dialog-content.html',
  standalone: true
})
export class RouteDialogContentComponent {
  action: string | any;
  local_data: Routes;
  loading = false;
  wid: any;
  routes: any[] = [];
  warehouses: any[] = [];
  zones: any[] = [];
  userForm!: FormGroup;
  statusOptions = ['RD', 'CNL', "CO", "NH", "OD", "WA", "ED", "UG", "HW"];

  constructor(
    public dialogRef: MatDialogRef<RouteDialogContentComponent>,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private warehouseService: WarehouseService,
    private routeService: RoutesService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data?.action || '';

    this.local_data = { ...data?.local_data };
    this.wid = Number(this.data.warehouseId);
  }

  ngOnInit(): void {
    this.warehouseService.getWarehouses().subscribe(data => {
      this.warehouses = data;
    });

    // Ajusta warehouseId fijo si corresponde
    this.warehouseService.getZonesByWarehouse(this.wid).subscribe(data => {
      this.zones = data;
      
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.userForm = this.fb.group({
      date: [{ value: tomorrow || null, disabled: this.loading }, Validators.required],
      volumen: [{ value: this.local_data?.volumen, disabled: this.loading }, Validators.required],
      deliveryStops: [{ value: this.local_data?.deliveryStops, disabled: this.loading }, Validators.required],
      zoneId: [{ value: this.local_data?.zoneId || null, disabled: this.loading }, Validators.required],
      paymentType: [{ value: this.local_data?.paymentType ?? 'PerStop', disabled: this.loading }, Validators.required],
      priceRoute: [{ value: this.local_data?.priceRoute ?? 0, disabled: this.loading }], // puedes hacerlo required si quieres
    });

    const paymentCtrl = this.userForm.get('paymentType');
    const priceCtrl = this.userForm.get('priceRoute');

    paymentCtrl?.valueChanges.subscribe((value) => {
      const isPerRoute = value === 'perRoute';

      if (isPerRoute) {
        priceCtrl?.enable();
        priceCtrl?.setValidators([Validators.required, Validators.min(0)]);
      } else {
        priceCtrl?.reset(0);
        priceCtrl?.clearValidators();
        priceCtrl?.disable();
      }

      priceCtrl?.updateValueAndValidity();
    });

    // ✅ aplica la regla también al cargar el formulario (por si hay local_data)
    paymentCtrl?.updateValueAndValidity({ emitEvent: true });
  }

  submit() {
    if (!this.userForm?.valid) return;

    const formValue = this.userForm.value;

    const payload = {
      id: formValue.id || 0,
      date: formValue.date || new Date().toISOString(),
      volumen: formValue.volumen || 0,
      zoneId: formValue.zoneId || 0,
      deliveryStops: formValue.deliveryStops || 0,
      // 🔥 FIX
      paymentType: formValue.paymentType ?? 'PerStop',
      priceRoute: formValue.priceRoute ?? 0
    };
    this.loading = true;
    this.routeService.addRoute(payload).subscribe({
      next: () => {

        this.dialogRef.close({ event: 'Refresh' });
        this.openSnackBar('Route created successfully!', 'Close');
        this.loading = false;
      },
      error: (err) => {
        this.openSnackBar(`Error: ${err.message}`, 'Close');
        this.loading = false;
      },
    });
  }

  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  doAction(): void {
    this.loading = true;
    if (this.action === 'Add') {
      this.submit();
    } else if (this.action === 'Update') {
      // TODO
    } else if (this.action === 'Delete') {
      // TODO
    }
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }
}

/** Auxiliar */
interface Driver {
  id: number;
  name: string;
  lastName: string;
  identificationNumber?: string;
}
