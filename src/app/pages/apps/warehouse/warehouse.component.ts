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
import { DatePipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Employee } from 'src/app/pages/apps/employee/employee';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { CoreService } from 'src/app/services/core.service';
import { Warehouse } from './warehouse';
import { ZoneComponent } from './zone/zone.component';
import { RouterModule } from '@angular/router';
import type { Time } from '@angular/common';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInput, MatChipInputEvent } from '@angular/material/chips';
import { debounceTime, map, Observable, of, startWith } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  templateUrl: './warehouse.component.html',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
    RouterModule
  ],
})
export class WarehouseComponent implements AfterViewInit {
  @ViewChild(MatTable, { static: true }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  searchText: string = '';

  displayedColumns: string[] = ['company', 'address', 'city', 'state', 'manager', 'sendPayroll', 'isHiring', 'action'];
  dataSource = new MatTableDataSource<WarehouseComponent>([]);
  openTimeStr: string | null = null;
  loading: boolean = false;
  constructor(
    public dialog: MatDialog,
    private warehouseService: WarehouseService,
    private settings: CoreService
  ) { }

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loading = true;
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
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

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openDialog(action: string, warehouse: Warehouse | any): void {
    if (action === 'Route') {
      const dialogRef = this.dialog.open(ZoneComponent, {
        data: { action, local_data: { ...warehouse } },
        autoFocus: false,
      });

      return;
    }

    if (action === 'AddMetro' || action === 'UpdateMetro' || action === 'DeleteMetro') {

      const dialogRef = this.dialog.open(AppMetroDialogContentComponent, {
        data: { action, local_data: { ...warehouse } },
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (
          result?.event === 'Refresh' ||
          result?.event === 'Update' ||
          result?.event === 'Delete'
        ) {
          this.loadWarehouses();
        }
      });

      return;
    }

    const dialogRef = this.dialog.open(AppWarehouseDialogContentComponent, {
      data: { action, local_data: { ...warehouse } },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (
        result?.event === 'Refresh' ||
        result?.event === 'Update' ||
        result?.event === 'Delete'
      ) {
        this.loadWarehouses();
      }
    });
  }
}

function toTimeString(t?: Time): string | null {
  if (!t) return null;
  const hh = String(t.hours).padStart(2, '0');
  const mm = String(t.minutes ?? 0).padStart(2, '0');
  return `${hh}:${mm}`;
}

function fromTimeString(s?: string): Time | null {
  if (!s) return null;
  const [hh, mm] = s.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return { hours: hh, minutes: mm } as Time;
}

interface DialogData {
  action: string;
  employee: Warehouse;
}

@Component({
  selector: 'app-dialog-content',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TablerIconsModule,
  ],
  templateUrl: 'warehouse-dialog-content.html',
})
export class AppWarehouseDialogContentComponent {
  action: string | any;
  local_data: any = {};
  loading: boolean = false;
  openTimeStr: string | null = null;
  authorizedPersons: any[] = [];
  addOnBlur = true;
  allPeople: any[] = [];
  metros: any[] = [];

  companies: string[] = [
    'OnTrac',
    'Speedx',
    'Uni Uni',
    'SwiftX'
  ];

  personCtrl = new FormControl<string | any>('');
  filteredPeople$ = this.personCtrl.valueChanges.pipe(
    startWith(''),
    map(v => {
      const q = (typeof v === 'string' ? v : `${v?.name ?? ''} ${v?.lastName ?? ''}`)
        .toLowerCase()
        .trim();

      return this.allPeople
        .filter(p => (`${p.name} ${p.lastName ?? ''}`).toLowerCase().includes(q))
        .filter(p => !this.authorizedPersons.some(x => x.id === p.id));
    })
  );

  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  constructor(
    public dialogRef: MatDialogRef<AppWarehouseDialogContentComponent>,
    private warehouseService: WarehouseService,
    private snackBar: MatSnackBar,
    private userServices: EmployeeService,
    private coreServices: CoreService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data.action;
    this.local_data = data.local_data || {};
  }

  ngOnInit(): void {
    // Solo cargar datos de warehouse cuando aplique
    if (this.action === 'Add' || this.action === 'Update' || this.action === 'Delete') {
      this.openTimeStr = toTimeString(this.local_data?.openTime);
      this.authorizedPersons = [...(this.local_data?.authorizedPersons ?? [])];

      this.userServices.getEmployees().subscribe(res => {
        this.allPeople = res.map((r: any) => ({
          id: r.id,
          name: r.name ?? r.firstName ?? '',
          lastName: r.lastName ?? r.surname ?? ''
        }));
        this.personCtrl.setValue(this.personCtrl.value || '');
      });

      this.warehouseService
        .getMetros(this.coreServices.getUserInfoFromToken()?.companyId!)
        .subscribe(res => {
          this.metros = res || [];
        });
    }
  }

  compareMetro = (a: any, b: any) => a && b && a.id === b.id;

  displayFn(p?: Person): string {
    return p ? `${p.name} ${p.lastName ?? ''}`.trim() : '';
  }

  private filterPeople(value: string): any[] {
    const term = value.trim().toLowerCase();
    if (!term) return this.allPeople.filter(p => !this.exists(p));

    return this.allPeople
      .filter(p => (`${p.name} ${p.lastName ?? ''}`).toLowerCase().includes(term))
      .filter(p => !this.exists(p));
  }

  selected(event: MatAutocompleteSelectedEvent) {
    const person = event.option.value as any;
    if (!this.exists(person)) {
      this.authorizedPersons.push(person);
    }
    this.personCtrl.setValue('');
  }

  addFromFreeText(event: any) {
    const raw = (event.value || '').trim();

    if (!raw) {
      this.personCtrl.setValue('');
      return;
    }

    const found = this.allPeople.find(
      p => (`${p.name} ${p.lastName ?? ''}`).toLowerCase() === raw.toLowerCase()
    );

    if (found && !this.exists(found)) {
      this.authorizedPersons.push(found);
    }

    this.personCtrl.setValue('');
  }

  removePerson(p: any) {
    this.authorizedPersons = this.authorizedPersons.filter(x => x.id !== p.id);
  }

  private exists(p: any) {
    return this.authorizedPersons.some(x => x.id === p.id);
  }

  doAction(): void {
    if (this.action === 'Add') {
      this.local_data.openTime = fromTimeString(this.openTimeStr || undefined) || undefined;
      this.local_data.authorizedPersons = this.authorizedPersons;
      this.local_data.metroId = this.local_data.metro?.id ?? this.local_data.metroId ?? null;

      this.warehouseService.addWarehouse(this.local_data).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Refresh' });
          this.openSnackBar('Warehouse added successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
        }
      });
    }


    else if (this.action === 'Update') {
      this.local_data.openTime = fromTimeString(this.openTimeStr || undefined) || undefined;
      this.local_data.authorizedPersons = this.authorizedPersons;
      this.local_data.metroId = this.local_data.metro?.id ?? this.local_data.metroId ?? null;

      this.warehouseService.updateWarehouse(this.local_data).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Update' });
          this.openSnackBar('Warehouse updated successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
        }
      });
    }


    else if (this.action === 'Delete') {
      this.warehouseService.deleteWarehouse(this.local_data.id).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Delete' });
          this.openSnackBar('Warehouse deleted successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
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

  selectFile(event: any): void {
    if (!event.target.files[0] || event.target.files[0].length === 0) {
      return;
    }

    const mimeType = event.target.files[0].type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(event.target.files[0]);
  }
}

interface Person {
  id: number;
  name: string;
  lastName?: string;
}

@Component({
  selector: 'app-metro-dialog-content',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TablerIconsModule,
  ],
  templateUrl: 'metro-dialog.html',
})
export class AppMetroDialogContentComponent {
  action: string | any;
  local_data: any = {};
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<AppMetroDialogContentComponent>,
    private warehouseService: WarehouseService,
    private snackBar: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data.action;
    this.local_data = data.local_data || {};
  }

  doAction(): void {
    this.loading = true;

    if (this.action === 'AddMetro') {
      const payload = { city: this.local_data.city };

      this.warehouseService.addMetro(payload).subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close({ event: 'Refresh' });
          this.openSnackBar('Metro added successfully!', 'Close');
        },
        error: (err) => {
          this.loading = false;
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
        }
      });
    }

    else if (this.action === 'UpdateMetro') {
      const payload = {
        id: this.local_data.id,
        city: this.local_data.city
      };

      this.warehouseService.updateMetro(payload.id, payload).subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close({ event: 'Update' });
          this.openSnackBar('Metro updated successfully!', 'Close');
        },
        error: (err) => {
          this.loading = false;
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
        }
      });
    }

    else if (this.action === 'DeleteMetro') {
      this.warehouseService.deleteMetro(this.local_data.id).subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close({ event: 'Delete' });
          this.openSnackBar('Metro deleted successfully!', 'Close');
        },
        error: (err) => {
          this.loading = false;
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
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