import {
  Component,
  Inject,
  Optional,
  ViewChild,
  AfterViewInit,
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
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { CoreService } from 'src/app/services/core.service';
import { Zone } from './zone';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

@Component({
  templateUrl: './zone.component.html',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule
  ],
})
export class ZoneComponent implements AfterViewInit {
  @ViewChild(MatTable, { static: true }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  searchText: string = '';

  displayedColumns: string[] = ['id', 'zoneCode', 'priceStops', 'warehouseId', 'area', 'action'];
  dataSource = new MatTableDataSource<Zone>([]);
  warehousesMap: Map<number, string> = new Map(); // Mapeo de ID → Nombre
  warehouses: any[] = [];
  id: any;
  constructor(
    public dialog: MatDialog,
    private warehouseService: WarehouseService,
    private settings: CoreService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.loadWarehouses();

    if (this.id !== null && this.id !== undefined && this.id.trim() !== '') {
      this.loadZones(+ this.id); // Convertimos a número si es necesario
    } else {
      console.warn('❗ ID de almacén no válido en la URL.');
      // Aquí podrías redirigir, mostrar un error o simplemente omitir la carga
    }
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        if (Array.isArray(res) && res.length) {
          this.warehouses = res;
          // Crear un mapa con ID como clave y nombre como valor
          this.warehousesMap = new Map(res.map(warehouse => [warehouse.id, warehouse.city]));
        }
      },
      error: (err) => {
        console.error("Error fetching warehouses:", err);
      }
    });
  }

  loadZones(id: number): void {
    this.warehouseService.getZonesByWarehouse(this.id).subscribe({
      next: (res) => {
        console.log(res)
        this.dataSource.data = res;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
      },
      error: (err) => {
        this.settings.showError(err?.error.message);
      }
    });
  }

  getWarehouseName(id: number): string {
    return this.warehousesMap.get(id) || "Unknown";
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openDialog(action: string, zone: Zone | any): void {
    const dialogRef = this.dialog.open(AppZoneDialogContentComponent, {
      data: { action, local_data: { ...zone }, warehouseId: this.id },
      autoFocus: false,

    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.event === 'Refresh' || result?.event === 'Update' || result?.event === 'Delete') {
        this.loadZones(this.id);
      }
    });
  }
}

@Component({
  selector: 'app-zone-dialog-content',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: 'zone-dialog-content.html',
})
export class AppZoneDialogContentComponent {
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  addOnBlur = true;
  zipCodes: string[] = [];

  action: string | any;
  local_data: Zone;
  warehouses: any[] = []; // Especificamos el tipo de dato
  id: any | null = null; // ID obtenido de la URL
  selectedWarehouseId: number | null = null; // ID del almacén seleccionado

  ngOnInit(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.warehouses = res;

          // Convertimos a número si viene como string
          const receivedWarehouseId = Number(this.id);

          // Si estás agregando y no hay warehouse asignado aún
          if (this.action === 'Add' && !this.local_data.idWarehouse && receivedWarehouseId) {
            this.local_data.idWarehouse = receivedWarehouseId;

            // 👇 solo para verificar en consola
            console.log('Asignado warehouseId:', this.local_data.idWarehouse);
          }
        } else {
          this.warehouses = [];
        }
      },
      error: (err) => {
        console.error("Error fetching warehouses:", err);
        this.warehouses = [];
      }
    });
    if (this.local_data?.zipCodesSerialized) {
      this.zipCodes = this.local_data.zipCodesSerialized
        .split(',')
        .map(z => z.trim())
        .filter(Boolean);
    }
  }

  constructor(
    public dialogRef: MatDialogRef<AppZoneDialogContentComponent>,
    private warehouseService: WarehouseService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data.action;
    this.local_data = data.local_data || {};
    this.id = data?.warehouseId;
  }
  private isValidZip(zip: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(zip);
  }
  addZip(event: MatChipInputEvent): void {
    const raw = (event.value || '').trim();
    if (raw) {
      // permite pegar varios separados por coma
      for (const z of raw.split(',').map(s => s.trim()).filter(Boolean)) {
        if (this.isValidZip(z) && !this.zipCodes.includes(z)) this.zipCodes.push(z);
      }
      this.syncZipCodesSerialized();
    }
    event.chipInput?.clear();
  }

  removeZip(zip: string): void {
    const i = this.zipCodes.indexOf(zip);
    if (i >= 0) {
      this.zipCodes.splice(i, 1);
      this.syncZipCodesSerialized();
    }
  }

  syncZipCodesSerialized() {
    this.local_data.zipCodesSerialized = this.zipCodes.join(',');
  }
  doAction(): void {
  // 👇 ADD: construir CSV desde los chips y evitar cadena vacía
  const _z = (this.zipCodes ?? [])
    .map(z => (z ?? '').toString().trim())
    .filter(z => z.length > 0);
  this.local_data.zipCodesSerialized = _z.length ? _z.join(',') : null;

  // (opcional recomendado) normalizar numéricos sin tocar tu flujo
  // this.local_data.priceStop = Number(this.local_data?.priceStop ?? 0);
  // this.local_data.idWarehouse = Number(this.local_data?.idWarehouse ?? this.local_data?.warehouseId ?? 0);

  if (this.action === 'Add') {
    console.log(this.local_data)
    this.warehouseService.addZone(this.local_data).subscribe({
      next: () => {
        this.dialogRef.close({ event: 'Refresh' });
        this.openSnackBar('Zone added successfully!', 'Close');
      },
      error: (err) => {
        this.openSnackBar(`Error: ${err.message}`, 'Close');
      }
    });
  } else if (this.action === 'Update') {
    console.log(this.local_data)
    this.warehouseService.updateZone(this.local_data).subscribe({
      next: () => {
        this.dialogRef.close({ event: 'Update' });
        this.openSnackBar('Zone updated successfully!', 'Close');
      },
      error: (err) => {
        this.openSnackBar(`Error: ${err.message}`, 'Close');
      }
    });
  } else if (this.action === 'Delete') {
    this.warehouseService.deleteZones(this.local_data.id).subscribe({
      next: () => {
        this.dialogRef.close({ event: 'Delete' });
        this.openSnackBar('Zone deleted successfully!', 'Close');
      },
      error: (err) => {
        this.openSnackBar(`Error: ${err.message}`, 'Close');
      }
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
}

