import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Inject, Optional, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { CoreService } from 'src/app/services/core.service';
import { PackageService } from 'src/app/services/package.service';
import { Package } from './package';
import { MatSnackBar } from '@angular/material/snack-bar';
import { requestPackage } from './requestPackage';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { da } from 'date-fns/locale';
import { RoutesService } from 'src/app/services/apps/routes/routes.service';

@Component({
  selector: 'app-daily-rd',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
    RouterModule
  ],
  templateUrl: './daily-rd.component.html',
  styleUrl: './daily-rd.component.scss'
})
export class DailyRDComponent implements AfterViewInit {
  @ViewChild(MatTable, { static: true }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  searchText: string = '';

  displayedColumns: string[] = ['#', 'tracking', 'rsp', 'driver', 'status', 'route', 'address', 'dayElapsed', 'action'];
  dataSource = new MatTableDataSource<DailyRDComponent>([]);
  loading: boolean = false;
  routes: any[] = [];
  isAdmin: boolean = false;
  selectedWarehouseId: number | null = null;
  warehouses: any[] = []; // Almacenes disponibles
  textFilter: string = '';
  allPackages: any[] = [];
  selectedStatus: string = '';
  constructor(
    public dialog: MatDialog,
    private packageService: PackageService,
    private settings: CoreService,
    private warehouseService: WarehouseService


  ) { }

  ngOnInit(): void {
    if (this.settings.getRole() == 'Admin' || this.settings.getRole() == 'CompanyOwner') {
      this.isAdmin = true;
    }
    this.loadWarehouses();
    this.loadPackages()
  }
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }
  loadPackages(): void {
    this.loading = true;
    const user = this.settings.getUserInfoFromToken();
    if (user?.id) {
      this.packageService.getPackagesByWarehouse(user?.id).subscribe({
        next: (res) => {
          this.allPackages = res; // ✅ Guardamos todos los paquetes
          this.dataSource.data = res;

          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
          this.loading = false;
        },
        error: (err) => {
          this.settings.showError(err?.error.message);
          this.loading = false;
        }
      });
    }
  }
  loadWarehouses(): void {
    this.warehouseService.getWarehousesRsp().subscribe({
      next: (res) => {
        this.warehouses = res; // Almacenar la lista de almacenes

      },
      error: (err) => {
        this.settings.showError(err?.error?.message || 'Error loading warehouses.');
      },
    });
  }
  clearFilter(): void {
    this.textFilter = '';
    this.applyFilter('');
  }

  openDialog(action: string, pack: Package | any): void {

    let dialogRef;
    if (action !== 'Delete') {
      console.log(pack)
      dialogRef = this.dialog.open(AppPackageDialogContentComponent, {
        data: { action, local_data: { ...pack } },
        autoFocus: false,

      });
    } else {
      console.log(pack)
      dialogRef = this.dialog.open(AppPackageDialogContentComponent, {
        data: { action, local_data: { ...pack } },
        autoFocus: false
      });
    }

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.event === 'Refresh' || result?.event === 'Update' || result?.event === 'Delete') {
        this.loadPackages(); // 🔄 Recargar la lista después de cualquier cambio
      }
    });
  }


  applyFilter(filterValue: string): void {
    this.textFilter = filterValue;
    this.applyCombinedFilter();
  }

  applyCombinedFilter(): void {
    const filterText = this.textFilter.trim().toLowerCase();
    const warehouse = this.selectedWarehouseId
      ? this.warehouses.find(w => w.id === this.selectedWarehouseId)
      : null;

    let filtered = [...this.allPackages];

    // Filtrar por RSP del warehouse si se seleccionó uno
    if (warehouse && warehouse.driverIdentificationNumber) {
      const rspId = parseInt(warehouse.driverIdentificationNumber, 10);
      filtered = filtered.filter(pkg => Number(pkg.rsp) === rspId);
    }

    // Filtrar por texto si hay texto en el input
    if (filterText) {
      filtered = filtered.filter(pkg => {
        const tracking = pkg.tracking?.toLowerCase() || '';
        const driver = `${pkg.route?.user?.name ?? ''} ${pkg.route?.user?.lastName ?? ''}`.toLowerCase();
        const route = pkg.route?.zone?.zoneCode?.toLowerCase() || '';
        const status = pkg.status?.toString().toLowerCase() || '';
        return (
          tracking.includes(filterText) ||
          driver.includes(filterText) ||
          route.includes(filterText) ||
          status.includes(filterText)
        );
      });
    }

    this.dataSource.data = filtered;
  }


  onWarehouseChange(warehouseId: number | null): void {
    this.selectedWarehouseId = warehouseId;
    this.applyCombinedFilter();
  }


}
interface DialogData {
  action: string;
  package: Package;
}

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'app-dialog-content',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TablerIconsModule,
  ],
  templateUrl: 'package-dialog-content.html',
})
// tslint:disable-next-line: component-class-suffix
export class AppPackageDialogContentComponent {
  action: string | any;
  local_data: Package;
  warehouses: any[] = [];
  warehouseId: any;
  selectedFile: File | null = null;
  requestPackage = { description: '', packageId: 0, uploadedBy: '' };
  loading = false;
  selectedFileName: string | null = null;

  routes: any[] = [];

  incidentForm!: FormGroup;
  statusOptions = ['RD', 'CNL', "CO", "NH", "OD", "WA", "ED", "UG", "HW"];

  ngOnInit(): void {

    this.warehouseService.getWarehouses().subscribe(data => {
      this.warehouses = data;
    });

    if (this.local_data) {
      this.warehouseId = this.local_data?.route?.user?.warehouseId ?? null;
    }

    this.incidentForm = this.fb.group({
      selectedDate: [this.local_data?.incidentDate || null, Validators.required],
      warehouse: [this.warehouseId, Validators.required],
      status: [this.local_data?.status || null, Validators.required],
      route: [{ value: this.local_data?.route || null, disabled: true }, Validators.required],
      tracking: [{ value: this.local_data?.tracking || null, disabled: true }, Validators.required],
      address: [{ value: this.local_data?.address || null, disabled: true }],
      city: [{ value: this.local_data?.city || null, disabled: true }],
      state: [{ value: this.local_data?.state || null, disabled: true }],
      zipCode: [{ value: this.local_data?.zipCode || null, disabled: true }],
    });

    // Forzar ejecución inicial en modo edición
    this.checkEnableFields();
    this.loadRoutesIfReady();

    // Subscripciones a cambios del formulario
    this.incidentForm.get('selectedDate')?.valueChanges.subscribe(() => {
      this.checkEnableFields();
      this.loadRoutesIfReady();
    });

    this.incidentForm.get('warehouse')?.valueChanges.subscribe(() => {
      this.checkEnableFields();
      this.loadRoutesIfReady();
    });

    this.incidentForm.get('status')?.valueChanges.subscribe(() => {
      this.checkEnableFields();
    });
  }



  constructor(
    public dialogRef: MatDialogRef<AppPackageDialogContentComponent>,
    private packageService: PackageService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private warehouseService: WarehouseService,
    private routeService: RoutesService,

    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data?.action || '';
    this.local_data = { ...data?.local_data };

  }


  checkEnableFields(): void {
    const date = this.incidentForm.get('selectedDate')?.value;
    const warehouse = this.incidentForm.get('warehouse')?.value;
    const status = this.incidentForm.get('status')?.value;

    const shouldEnable = !!date && !!warehouse && !!status;

    const fields = ['route', 'tracking', 'address', 'city', 'state', 'zipCode'];

    fields.forEach(field => {
      const control = this.incidentForm.get(field);
      if (shouldEnable) {
        control?.enable();
      } else {
        control?.disable();
        control?.reset(); // Limpia valor si se deshabilita
      }
    });

    if (date && warehouse) {
      this.routeService.getRoutesByDateAndWarehouse(this.formatDate(date), warehouse).subscribe({
        next: (data) => {
          this.routes = data;
        },
        error: (err) => {
          console.error('Error al cargar rutas:', err);
        }
      });
    }
  }

  compareWarehouses = (a: any, b: any) => a && b && a.id === b.id;
  compareRoutes = (a: any, b: any) => a && b && a.id === b.id;

  private formatDate(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // yyyy-MM-dd
  }
  private loadRoutesIfReady(): void {
    const date = this.incidentForm.get('selectedDate')?.value;
    const warehouse = this.incidentForm.get('warehouse')?.value;

    if (date && warehouse) {
      this.routeService.getRoutesByDateAndWarehouse(this.formatDate(date), warehouse).subscribe({
        next: (data) => {
          this.routes = data;
        },
        error: (err) => {
          console.error('Error al cargar rutas:', err);
        }
      });
    } else {
      this.routes = []; // limpia si no hay datos válidos
    }
  }


  doAction(): void {
    this.loading = true;

    if (this.action === 'Add') {
      this.submit();
    } else if (this.action === 'Update') {
      this.packageService.updatePackage(this.local_data).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Update' });
          this.openSnackBar('Package updated successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err.message}`, 'Close');
        }
      });
    } else if (this.action === 'Delete') {
      this.packageService.deletePackage(this.local_data.id).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Delete' });
          this.openSnackBar('Package deleted successfully!', 'Close');

        },
        error: (err) => {
          this.openSnackBar(`Error: ${err.message}`, 'Close');
        }
      });
    }
  }
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] ?? null;
  }

  submit() {
    if (this.incidentForm.valid) {
      const formValue = this.incidentForm.getRawValue();

      // Asegúrate de que estos datos existen o los construyes como placeholders si es un mock
      const routeId = typeof formValue.route === 'number' ? formValue.route : formValue.route?.id || 0;
      const payload = {
        id: formValue.id || 0,
        tracking: formValue.tracking || '',
        incidentDate: formValue.selectedDate || new Date().toISOString(),
        status: formValue.status || '',
        address: formValue.address || '',
        city: formValue.city || '',
        state: formValue.state || '',
        zipCode: formValue.zipCode || '',
        reviewStatus: 'Open',
        scanLat: formValue.scanLat || '',
        scanLon: formValue.scanLon || '',
        addrLat: formValue.addrLat || '',
        addrLon: formValue.addrLon || '',
        route: {
          id: routeId,
          zone: {
            id: formValue.zone?.id || 0,
            zoneCode: formValue.zone?.zoneCode || ''
          },
          user: {
            id: formValue.user?.id || 0,
            name: formValue.user?.name || '',
            lastName: formValue.user?.lastName || ''
          }
        }
      };

      console.log('Payload enviado:', payload);

      this.packageService.submitPackage(payload).subscribe({
        next: (res) => {
          this.dialogRef.close({ event: 'Refresh' });
          this.openSnackBar('Package added successfully!', 'Close');
          this.loading = false;
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err.message}`, 'Close');
        },

      });
    }
  }

  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }

  selectFile(event: any): void {
    if (!event.target.files[0] || event.target.files[0].length === 0) {
      return; // No file selected
    }

    const mimeType = event.target.files[0].type;
    if (mimeType.match(/image\/*/) == null) {
      return; // Not an image file
    }

    const reader = new FileReader();
    reader.readAsDataURL(event.target.files[0]);


  }
}


