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
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { ViewUserinfoComponent } from '../view-userinfo/view-userinfo.component';
import { ToastrService } from 'ngx-toastr';
import { StatusLabelPipe } from 'src/app/pipe/status-label.pipe';
import { environment } from 'src/environments/environment';
import { MatSort } from '@angular/material/sort';
import { HiredDialogContentComponent } from './hired-dialog-content/hired-dialog-content.component';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { RecruiterService } from 'src/app/services/recruiter.service';
import { catchError, Observable, of, shareReplay } from 'rxjs';
export type StatusKey = 'Applicant' | 'PreOnboarding' | 'InitialContact' | 'AwaitingResponse';

@Component({
  selector: 'app-applicant',
  templateUrl: './applicant.component.html',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
    RolePipe,
    StatusLabelPipe,
  ],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class ApplicantComponent implements AfterViewInit, OnInit {
  @ViewChild(MatTable, { static: false }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  searchText = '';
  displayedColumns: string[] = [
    'select',
    'name',

    'email',
    'vehicle',
    'isActive',     // columna Status (editable)
    'stage',
    'metro',
    'warehouseId',
    'recruiterId',
    'action',
  ];
  isAdmin = false;
  dataSource = new MatTableDataSource<any>([]);
  warehouses: any[] = [];
  loading = false;
  textFilter = '';
  selectedWarehouseId: number | null = null;
  selectedRoleFilter = 'all';
  expandedElement: any | null = null;
  selectedStatus: string | null = null;
  public baseUrl = environment.apiUrl;
  // Opciones de status (sin Contracted/Hired)
  statusOptions: { value: StatusKey; label: string }[] = [
    { value: 'Applicant', label: 'Applicant' },
    { value: 'AwaitingResponse', label: 'Job Offer Send' },
    { value: 'PreOnboarding', label: 'Onboarding' },
  ];
  notDetailRow = (row: any) => row?.isDetailRow !== true;
  isExpansionDetailRow = (row: any) => row?.isDetailRow === true;


  detailColumn: string[] = ['detail'];
  constructor(
    public dialog: MatDialog,
    private employeeService: EmployeeService,
    private warehouseService: WarehouseService,
    private settings: CoreService,
    private rolePipe: RolePipe,
    private toastr: ToastrService,
    private recruiterService: RecruiterService
  ) { }
  role: any;
  selectedIds = new Set<number>();

  // Ajusta esto al nombre real de tu PK (id, userId, applicantId, etc.)
  getRowId(row: any): number {
    const id = row?.id; // ajusta si es applicantId
    return Number(id);
  }

  isSelected(row: any): boolean {
    return this.selectedIds.has(this.getRowId(row));
  }

  toggleRow(row: any, checked: boolean): void {
    const id = this.getRowId(row);

    // ✅ regla: no seleccionar si no tiene warehouse
    if (checked && !(Number(row?.warehouseId) > 0)) {
      this.toastr.info('This applicant has no warehouse assigned.', 'Skipped');
      this.selectedIds.delete(id);
      return;
    }

    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }
  getCurrentPageRows(): any[] {
    const rendered = (this.dataSource as any)?._renderData?.value as any[] | undefined;
    const rows = Array.isArray(rendered)
      ? rendered
      : (this.dataSource?.filteredData ?? this.dataSource?.data ?? []);

    // filtra solo rows “normales”
    return rows.filter(r => r && r.isDetailRow !== true);
  }
  ngOnInit(): void {
    this.loadApplicants();
    this.loadWarehouses();
    this.role = this.settings.getRole(); // devuelve 'Admin' | 'CompanyOwner' | 'Manager' ... (asegúrate que sea string)
    this.isAdmin = this.role === 'Admin' || this.role === 'CompanyOwner' || this.role === 'Assistant' || this.role === 'Recruiter';


    // Filtro combinado (texto + warehouse)
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      let parsedFilter: any = {};
      try { parsedFilter = JSON.parse(filter); } catch { return true; }

      const text = (parsedFilter.text ?? '').toLowerCase();
      const warehouseId = parsedFilter.warehouseId;
      const status = parsedFilter.status as StatusKey | null;

      const identificationNumber = data.identificationNumber?.toString().toLowerCase() ?? '';
      const name = data.name?.toLowerCase() ?? '';
      const phoneNumber = data.phoneNumber?.toLowerCase() ?? '';
      const email = data.email?.toLowerCase() ?? '';
      const warehouseInfo = this.getWarehouseInfo(data.warehouseId)?.toLowerCase() ?? '';

      let roleLabel = '';
      if (data.role !== undefined && data.role !== null) {
        roleLabel = this.rolePipe.transform(data.role).toLowerCase();
      }

      const fullSearchString = `${identificationNumber} ${name} ${phoneNumber} ${email} ${warehouseInfo} ${roleLabel}`;
      const matchesText = !text || fullSearchString.includes(text);
      const matchesWarehouse = !warehouseId || data.warehouseId === warehouseId;

      // 👇 filtro por status (usa la propiedad ya derivada o la deriva al vuelo)
      const currentStatus: StatusKey = (data.status as StatusKey) ?? this.getStatus(data);
      const matchesStatus = status == null || currentStatus === status;

      return matchesText && matchesWarehouse && matchesStatus;
    };



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
  // en ngOnDestroy, libera los blobs
  ngOnDestroy() {
    for (const obs$ of this.avatarCache.values()) {
      const sub = obs$.subscribe(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      sub.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    this.dataSource.sort = this.sort;

    // 🔹 Si quieres ordenar por defecto por la fecha más reciente:
    this.sort.active = 'updatedAt';
    this.sort.direction = 'desc';
    this.sort.sortChange.emit({ active: this.sort.active, direction: this.sort.direction });

  }
  isAllSelectedOnPage(): boolean {
    const pageRows = this.getCurrentPageRows().filter(r => Number(r?.warehouseId) > 0);
    return pageRows.length > 0 && pageRows.every(r => this.selectedIds.has(this.getRowId(r)));
  }

  isIndeterminateOnPage(): boolean {
    const pageRows = this.getCurrentPageRows().filter(r => Number(r?.warehouseId) > 0);
    const selectedCount = pageRows.filter(r => this.selectedIds.has(this.getRowId(r))).length;
    return selectedCount > 0 && selectedCount < pageRows.length;
  }
  toggleSelectAllOnPage(checked: boolean) {
    const pageRows = this.getCurrentPageRows();
    pageRows.forEach((r: any) => {
      const id = this.getRowId(r);

      if (checked) {
        if (Number(r?.warehouseId) > 0) this.selectedIds.add(id);
      } else {
        this.selectedIds.delete(id);
      }
    });
  }
  clearSelection(): void {
    this.selectedIds.clear();
  }
  selectAllFiltered(): void {
    const rows = (this.dataSource.filteredData ?? []).filter(r => r?.isDetailRow !== true);
    rows.forEach(r => {
      const id = this.getRowId(r);
      if (Number.isFinite(id)) this.selectedIds.add(id);
    });
  }

  stageClass(stage?: string): string {
    switch ((stage || '').toLowerCase()) {
      case 'New': return 'stage-new';
      case 'Contact_Attempted': return 'stage-contacted';
      case 'Phone_Screen': return 'stage-interview';
      case 'Docs_Pending': return 'stage-hired';
      case 'Approved_For_Hire': return 'stage-rejected';
      case 'Hired':
      case 'Rejected': return 'stage-onhold';
      default: return 'stage-default';
    }
  }

  loadApplicants(): void {
    this.loading = true;

    const userInfo = this.settings.getUserInfoFromToken();
    const userId = userInfo?.id ?? 0;

    if (userId === 0) {
      this.settings.showError('Usuario no autenticado.');
      return;
    }

    this.employeeService.getApplicants().subscribe({
      next: (res) => {
        const applicants: any[] = (res || []).map((e: any) => ({
          ...e,
          status: this.getStatus(e),
          _editingStatus: false,
          _saving: false,
        }));

        this.dataSource.data = applicants;

        if (this.paginator) this.dataSource.paginator = this.paginator;
        if (this.sort) this.dataSource.sort = this.sort;

        this.loading = false;
      },
      error: (err) => {
        this.settings.showError(err?.error?.message || 'Error loading applicants.');
        this.loading = false;
      },
    });
  }
  stageOptions = [
    { value: 'New', label: 'New' },
    { value: 'Contact_Attempted', label: 'Contact Attempted' },
    { value: 'Phone_Screen', label: 'Phone Screen' },
    { value: 'Docs_Pending', label: 'Docs Pending' },
    { value: 'Approved_For_Hire', label: 'Approved For Hire' },
    { value: 'Hired', label: 'Hired' },
    { value: 'Rejected', label: 'Rejected' },

  ];
  onStageChange(applicant: any) {
    if (!applicant?.id) {
      this.toastr.error('Invalid applicant id', 'Error');
      return;
    }

    const payload = {
      id: Number(applicant.id),
      stage: applicant.stage  // <- lo que eligió en el mat-select
    };

    this.loading = true;

    // Guardado optimista: ya cambiamos row.stage en UI porque [(ngModel)] lo hizo

    this.employeeService.updateEmployee(payload).subscribe({
      next: () => {
        this.toastr.success('Stage updated successfully', 'Success');
        this.loading = false;

        // refrescar data para mantener consistencia
        this.loadApplicants();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Error updating stage', 'Error');
        this.loading = false;
        // opcional: si quieres revertirlo al valor anterior, tienes que guardarlo antes
        // en otra prop, similar a como hiciste con status, ej:
        // applicant.stage = applicant._prevStage;
      },
    });
  }

  // Fila normal (siempre se muestra para cada row)
  toggleExpand(row: any) {
    // Si ya está expandido, colapsa
    this.expandedElement = this.expandedElement === row ? null : row;
    console.log('Expanded:', this.expandedElement);
  }
  // siempre devuelve true (para filas normales)
  isMainRow = (index: number, row: any): boolean => true;

  // compara por id (no por referencia)
  isExpandedDetailRow = (index: number, row: any): boolean => {
    const result = !!this.expandedElement && this.expandedElement.id === row.id;
    return result;
  };
  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => { this.warehouses = res; },
      error: (err) => { this.settings.showError(err?.error?.message || 'Error loading warehouses.'); },
    });
  }

  // Mostrar "Empresa - Ciudad" por warehouseId
  getWarehouseInfo(warehouseId: number): string {
    const warehouse = this.warehouses.find(w => w.id === warehouseId);
    return warehouse ? `${warehouse.company} - ${warehouse.city}` : 'N/A';
  }

  applyFilter(filterValue: string): void {
    this.textFilter = filterValue;
    this.applyCombinedFilter();
  }

  applyCombinedFilter(): void {
    const filter = {
      text: this.textFilter.trim().toLowerCase(),
      warehouseId: this.selectedWarehouseId,
      status: this.selectedStatus ?? null,   // 👈 nuevo
    };
    this.dataSource.filter = JSON.stringify(filter);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onWarehouseChange(warehouseId: number | null): void {
    this.selectedWarehouseId = warehouseId;
    this.applyCombinedFilter();
  }
  onStatusFilterChange(status: StatusKey | null): void {
    this.selectedStatus = status;
    this.applyCombinedFilter();
  }

  bulkAction(): void {
    // 1) obtener rows seleccionados
    const selectedRows = (this.dataSource?.data ?? [])
      .filter((r: any) => this.selectedIds.has(Number(r.id)));

    if (selectedRows.length === 0) return;

    // 2) separar los que NO tienen warehouse (skipped local)
    const withWarehouse = selectedRows.filter(r => Number(r.warehouseId) > 0);
    const missingWarehouse = selectedRows.filter(r => !(Number(r.warehouseId) > 0));

    if (withWarehouse.length === 0) {
      this.toastr.info('No selected applicants have a warehouse assigned.', 'Nothing to send');
      return;
    }

    // 3) llamar API batch
    this.loading = true;
    this.employeeService.contactApplicant(withWarehouse).subscribe({
      next: (res) => {
        const sent = res?.sent ?? 0;
        const skippedApi = res?.skipped ?? 0;   // si backend también puede saltar por otra razón
        const failed = res?.failed ?? 0;

        const skippedLocal = missingWarehouse.length;
        const totalSkipped = skippedLocal + skippedApi;

        if (sent > 0) {
          this.toastr.success(
            `Sent: ${sent}${totalSkipped ? ` | Skipped: ${totalSkipped}` : ''}${failed ? ` | Failed: ${failed}` : ''}`,
            'Done'
          );
        } else {
          this.toastr.info(
            `No messages sent.${totalSkipped ? ` Skipped: ${totalSkipped}` : ''}${failed ? ` Failed: ${failed}` : ''}`,
            'Done'
          );
        }

        // opcional: limpiar selección
        this.selectedIds.clear();

        this.loading = false;
        this.loadApplicants();
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Error sending messages', 'Error');
      }
    });
  }


  openDialog(action: string, employee: Employee | any): void {
    if (action === 'View') {
      this.dialog.open(ViewUserinfoComponent, {
        data: { action, local_data: { ...employee } },
        autoFocus: false,
        width: '65%',
        height: '75%',
        maxWidth: '95vw',
      });
    }
    else if (action === 'Hiring') {
      const ref = this.dialog.open(HiredDialogContentComponent, {
        data: { action, local_data: { ...employee } },
        autoFocus: false,

      });
      ref.afterClosed().subscribe(result => {
        // result puede ser undefined si se cancela
        if (result?.changed) {
          this.loadApplicants(); // tu método que rehace el GET y refresca la tabla
          // si usas OnPush y una dataSource:
          // this.cdr.markForCheck();
        }
      });
    }
    else if (action === 'recruiter') {
      this.dialog.open(HiredDialogContentComponent, {
        data: { action, local_data: { ...employee } },
        autoFocus: false,

      })
    }

    else if (action === 'contact') {
      this.loading = true;

      // aquí SIEMPRE es lista
      this.employeeService.contactApplicant([employee]).subscribe({
        next: (res) => {
          const sent = res?.sent ?? 0;
          const skipped = res?.skipped ?? 0;

          if (sent > 0) {
            this.toastr.success(
              `Messages sent: ${sent}${skipped ? `, skipped: ${skipped}` : ''}`,
              'Success'
            );
          }

          this.loading = false;
          this.loadApplicants();
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Error contacting applicants', 'Error');
        }
      });
    }
    else {
      const dialogRef = this.dialog.open(AppEmployeeDialogContentComponent, {
        data: { action, local_data: { ...employee } },
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result?.event === 'Refresh' || result?.event === 'Update' || result?.event === 'Delete') {
          this.loadApplicants();
        }
      });
    }
  }

  // ---------- STATUS helpers ----------

  // Derivar status desde flags (sin Hired/Contracted)
  getStatus(e: any): StatusKey {
    if (e.wasContacted && e.isActive && e.isFirstLogin) return 'AwaitingResponse';
    if (!e.isFirstLogin && e.isActive && e.wasContacted) return 'PreOnboarding';
    return 'Applicant';
  }

  getStatusChipClass(e: any) {
    const s = this.getStatus(e);
    return {
      'bg-light-secondary text-body': s === 'Applicant',
      'bg-light-error text-body': s === 'InitialContact',
      'bg-light-warning text-body': s === 'AwaitingResponse',
      'bg-light-primary text-body': s === 'PreOnboarding',
      'rounded f-w-600 p-x-6 p-y-4 f-s-12': true
    };
  }

  startEditStatus(e: any) {
    if (!this.isAdmin) return; // opcional: bloquear para no-admin
    e._editingStatus = true;
    e._prevFlags = { wasContacted: e.wasContacted, isActive: e.isActive, isFirstLogin: e.isFirstLogin };
  }

  finishEditStatus(e: any) {
    e._editingStatus = false;
    e._prevFlags = null;
  }

  cancelEditStatus(e: any) {
    if (e._prevFlags) {
      e.wasContacted = e._prevFlags.wasContacted;
      e.isActive = e._prevFlags.isActive;
      e.isFirstLogin = e._prevFlags.isFirstLogin;
      e.status = this.getStatus(e);
    }
    this.finishEditStatus(e);
  }

  private mapStatusToFlags(status: StatusKey) {
    switch (status) {

      case 'AwaitingResponse': return { wasContacted: true, isActive: true, isFirstLogin: true };
      case 'PreOnboarding': return { wasContacted: true, isActive: true, isFirstLogin: false };
      case 'Applicant':
      default: return { isActive: false, isFirstLogin: true };
    }
  }
  // Traducir status elegido -> flags
  private applyStatusFlags(e: any, status: StatusKey) {
    switch (status) {

      case 'AwaitingResponse':
        e.wasContacted = true; e.isActive = true; e.isFirstLogin = true; break;
      case 'PreOnboarding':
        e.wasContacted = true; e.isActive = true; e.isFirstLogin = false; break;
      case 'Applicant':
        e.isActive = false; e.isFirstLogin = true; break;
      default:
        e.wasContacted = false; e.isActive = false; e.isFirstLogin = true; break;
    }
  }

  // Guardar cambio de status (desde mat-select)
  onStatusChange(employee: any) {
    if (!employee?.id) {
      this.toastr.error('Invalid employee id', 'Error');
      return;
    }

    // 1) Deriva flags según el status elegido
    const flags = this.mapStatusToFlags(employee.status as StatusKey); // ← asegura booleans

    // 2) Construye payload SOLO con id y flags que cambian
    const payload: any = { id: Number(employee.id) };
    if (employee.isFirstLogin !== flags.isFirstLogin) payload.isFirstLogin = flags.isFirstLogin;
    if (employee.wasContacted !== flags.wasContacted) payload.wasContacted = flags.wasContacted;
    if (employee.isActive !== flags.isActive) payload.isActive = flags.isActive;

    // 3) Si no hay cambios reales, no llames al backend
    if (Object.keys(payload).length === 1) return;

    // 4) Limpia undefined (por si acaso)
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    this.loading = true;

    // Optimista
    const prev = { isFirstLogin: employee.isFirstLogin, wasContacted: employee.wasContacted, isActive: employee.isActive };
    Object.assign(employee, flags);

    this.employeeService.updateEmployee(payload).subscribe({
      next: () => {
        this.toastr.success('Status updated successfully', 'Success');
        this.loadApplicants();
        this.loading = false;
      },
      error: (err) => {
        Object.assign(employee, prev); // revertir
        this.toastr.error(err?.error?.message || 'Error updating status', 'Error');
        this.loading = false;
      }
    });
  }



  getStatusClass(status: string) {
    return {
      'bg-light-error text-body rounded f-w-600 p-x-6 p-y-4 f-s-12': status === 'InitialContact',
      'bg-light-warning text-body rounded f-w-600 p-x-6 p-y-4 f-s-12': status === 'AwaitingResponse',
      'bg-light-secondary text-body rounded f-w-600 p-x-6 p-y-4 f-s-12':
        status === 'PreOnboarding' || status === 'Applicant',
    };
  }

}

// ------------------------------------------------------------

interface DialogData {
  action: string;
  employee: Employee;
}

@Component({
  selector: 'app-applicant-dialog-content',
  templateUrl: './applicant-dialog-content.html',
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
  loading = false;
  isAdmin = false;

  constructor(
    public dialogRef: MatDialogRef<AppEmployeeDialogContentComponent>,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private warehouseService: WarehouseService,
    private settings: CoreService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // 1) Defaults seguros
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

  roles = [
    { value: 'Administrator', viewValue: 'Administrator' },
    { value: 'Manager', viewValue: 'Manager' },
    { value: 'Assistant', viewValue: 'Assistant' },
    { value: 'Driver', viewValue: 'Driver' },
    { value: 'Rsp', viewValue: 'Rsp' },
    { value: 'Applicant', viewValue: 'Applicant' },
    { value: 'Recruiter', viewValue: 'Recruiter' },
  ];

  rolesManager = [
    { value: 'Driver', viewValue: 'Driver' },
    { value: 'Applicant', viewValue: 'Applicant' },
  ];
  ngOnInit(): void {
    this.loadWarehouses();
    const userInfo = this.settings.getUserInfoFromToken();
    const role = this.settings.getRole(); // devuelve 'Admin' | 'CompanyOwner' | 'Manager' ... (asegúrate que sea string)
    this.isAdmin = role === 'Admin' || role === 'CompanyOwner';
    const serverRole = this.local_data.userRole; // o donde lo recibas
    const normalized = this.normalizeRoleName(serverRole || '');
    // Si se pudo normalizar, úsalo; si no, deja null (o un default)
    this.local_data.userRoleName = normalized ?? null;

  }

  loadWarehouses() {
    this.loading = true;
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => { this.warehouses = res; },
      error: (err) => this.handleError(err),
      complete: () => (this.loading = false),
    });
  }

  doAction(): void {
    this.loading = true;

    // Convertir antes de enviar
    this.local_data.warehouseId = Number(this.local_data.warehouseId);
    const name = this.local_data.userRole || '';

    const canonical = this.normalizeRoleName(name);
    const roleId = canonical ? this.RoleNameToId[canonical] : undefined;
    if (roleId == null) {
      this.loading = false;
      return this.handleError({ error: { message: 'Invalid role name' } });
    }
    this.local_data.userRole = roleId;

    if (this.action === 'Add') {
      this.employeeService.addEmployee(this.local_data).subscribe({
        next: () => this.successHandler('Applicant added successfully!', 'Refresh'),
        error: (err) => this.handleError(err),
      });
    } else if (this.action === 'Update') {
      this.employeeService.updateEmployee(this.local_data).subscribe({
        next: () => this.successHandler('Applicant updated successfully!', 'Update'),
        error: (err) => this.handleError(err),
      });
    } else if (this.action === 'Delete') {
      this.employeeService.deleteEmployee(this.local_data.id).subscribe({
        next: () => this.successHandler('Applicant deleted successfully!', 'Delete'),
        error: (err) => this.handleError(err),
      });
    }
  }

  private successHandler(message: string, event: string): void {
    this.openSnackBar(message, 'Close');
    this.loading = false;
    this.dialogRef.close({ event });
  }

  private handleError(err: any): void {
    console.error('Error:', err);
    this.openSnackBar(`Error: ${err.error?.message || err.message}`, 'Close');
    this.loading = false;
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
  RoleNameToId: Record<string, UserRole> = {
    Administrator: UserRole.Administrator,
    Manager: UserRole.Manager,
    Assistant: UserRole.Assistant,
    Driver: UserRole.Driver,
    Rsp: UserRole.Rsp,
    Applicant: UserRole.Applicant,
    Recruiter: UserRole.Recruiter,
  };

  // Por si llega "Assistants" (plural) u otras variantes
  RoleAliases: Record<string, string> = {
    administrators: 'Administrator',
    administrator: 'Administrator',
    managers: 'Manager',
    manager: 'Manager',
    assistants: 'Assistant',
    assistant: 'Assistant',
    drivers: 'Driver',
    driver: 'Driver',
    rsp: 'Rsp',
    applicants: 'Applicant',
    applicant: 'Applicant',
    recruiters: 'Recruiter',
    recruiter: 'Recruiter',
  };
  normalizeRoleName(raw?: string): string | null {
    if (!raw) return null;
    const key = raw.trim().toLowerCase();
    return this.RoleAliases[key] ?? null;
  }

  RoleIdToName: Record<number, string> = Object.fromEntries(
    Object.entries(this.RoleNameToId).map(([name, id]) => [id, name])
  );

}
export enum UserRole {
  Administrator = 0,
  Manager = 1,
  Assistant = 2,
  Driver = 3,
  Rsp = 4,
  Applicant = 5,
  Recruiter = 7,
}