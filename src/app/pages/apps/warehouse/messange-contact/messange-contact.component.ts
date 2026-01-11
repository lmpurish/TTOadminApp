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

import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessangeContact } from './messangeContact';
import { QuillModule } from 'ngx-quill';


@Component({
  selector: 'app-messange-contact',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    QuillModule

  ],
  templateUrl: './messange-contact.component.html',
  styleUrl: './messange-contact.component.scss'
})
export class MessangeContactComponent implements AfterViewInit {
  @ViewChild(MatTable, { static: true }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  searchText: string = '';

  displayedColumns: string[] = ['subject', 'messageBody', 'warehouseId', 'action'];
  dataSource = new MatTableDataSource<any>();
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
      this.loadMassageContact(this.id); // Convertimos a número si es necesario
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

  loadMassageContact(id: number): void {
    this.warehouseService.getMessageContact(this.id).subscribe({
      next: (res) => {
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

  openDialog(action: string, message: MessangeContact | any): void {
    const dialogRef = this.dialog.open(AppMessageDialogContentComponent, {
      data: { action, local_data: { ...message }, warehouseId: this.id },
      autoFocus: false,
      width: '70vw',
      maxWidth: '100vw',
      maxHeight: '90vh',
    
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.event === 'Refresh' || result?.event === 'Update' || result?.event === 'Delete') {
        this.loadMassageContact(this.id);
      }
    });
  }
}

@Component({
  selector: 'app-message-dialog-content',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    QuillModule
  ],
  templateUrl: 'messange-dialog-content.html',
})
export class AppMessageDialogContentComponent {
  action: string | any;
  local_data: MessangeContact;
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
          if (this.action === 'Add' && !this.local_data.warehouseId && receivedWarehouseId) {
            this.local_data.warehouseId = receivedWarehouseId;

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
  }

  constructor(
    public dialogRef: MatDialogRef<AppMessageDialogContentComponent>,
    private warehouseService: WarehouseService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data.action;
    this.local_data = data.local_data || {};
    this.id = data?.warehouseId;
  }

  doAction(): void {
    if (this.action === 'Add') {
      this.warehouseService.AddMessageContact(this.local_data).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Refresh' });
          this.openSnackBar('Message added successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err.message}`, 'Close');
        }
      });
    } else if (this.action === 'Update') {
      this.warehouseService.updateMessageContact(this.local_data).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Update' });
          this.openSnackBar('Message updated successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err.message}`, 'Close');
        }
      });
    } else if (this.action === 'Delete') {
      this.warehouseService.deleteMessageContact(this.local_data.id).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Delete' });
          this.openSnackBar('Message deleted successfully!', 'Close');
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

