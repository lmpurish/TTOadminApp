import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TablerIconComponent } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { RateType, UserRate } from './user-rate';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { CoreService } from 'src/app/services/core.service';
import { environment } from 'src/environments/environment.prod';
import { PayrollService } from 'src/app/services/payroll.service';
import { MatPaginator } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';

type TableFilter = {
  text: string;
  warehouseId: number | null;
};

@Component({
  selector: 'app-user-rate',
  standalone: true,
  imports: [
    MaterialModule,
    ReactiveFormsModule,
    TablerIconComponent,
    CommonModule,
  ],
  templateUrl: './user-rate.component.html',
  styleUrl: './user-rate.component.scss',
})
export class UserRateComponent {
  loading = false;
  selectedWarehouseId: number | null = null;
  textFilter = '';
  isAdmin = false;

  dataSource = new MatTableDataSource<UserRate>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  warehouses: any[] = [];
  public baseUrl = environment.apiUrl;

  selection = new SelectionModel<UserRate>(true, []);

  readonly RATE_TYPES: RateType[] = [
    'PerRoute',
    'PerStop',
    'PerPackage',
    'PerMile',
    'Hourly',
    'Mixed',
  ] as any;

  rowForms = new Map<number, FormGroup>();

  form = this.fb.group({
    rows: this.fb.array<FormGroup>([]),
  });
  get formArray(): FormArray<FormGroup> {
    return this.form.get('rows') as FormArray<FormGroup>;
  }

  displayedColumns: string[] = [
    'select',
    'driverFullName',
    'effectiveFrom',
    'effectiveTo',
    'rateType',
    'baseAmount',
    'extraAmount',
    'dailyAmount',
    // 'failedStopPenalty',
    //  'rescueStopRate',
    'action',
  ];

  constructor(
    private warehouseService: WarehouseService,
    private settings: CoreService,
    private payrollService: PayrollService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadDriverRates();

    const role = this.settings.getRole();
    this.isAdmin = role === 'Admin' || role === 'CompanyOwner';

    // ✅ Filtro combinado: texto + warehouseId
    this.dataSource.filterPredicate = (data: UserRate, filterStr: string) => {
      let f: TableFilter = { text: '', warehouseId: null };

      try {
        f = JSON.parse(filterStr || '{}');
      } catch {
        // si alguien setea filter como string normal, lo tratamos como texto
        f.text = (filterStr || '').toLowerCase();
      }

      const text = (f.text || '').trim().toLowerCase();
      const wh = f.warehouseId;

      // filtro por warehouse (si se seleccionó uno)
      const matchWarehouse =
        wh === null || wh === undefined
          ? true
          : Number(data.warehouseId) === Number(wh);

      // filtro por texto (si se escribió algo)
      const matchText =
        !text
          ? true
          : (data.driverFullName || '').toLowerCase().includes(text) ||
          (data.rateType || '').toLowerCase().includes(text);

      return matchWarehouse && matchText;
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  canGenerateDefaultRate(): boolean {
    // Solo admin y con warehouse seleccionado (no null)
    return this.isAdmin && this.selectedWarehouseId != null;
  }


  // === UI ===
  onWarehouseChange(warehouseId: number | null): void {
    this.selectedWarehouseId = warehouseId;
    this.applyCombinedFilter();
    if (this.paginator) this.paginator.firstPage();
  }

  applyFilter(filterValue: string): void {
    this.textFilter = filterValue || '';
    this.applyCombinedFilter();
    if (this.paginator) this.paginator.firstPage();
  }

  private applyCombinedFilter(): void {
    const f: TableFilter = {
      text: this.textFilter || '',
      warehouseId: this.selectedWarehouseId,
    };
    this.dataSource.filter = JSON.stringify(f);
  }

  // === Data load ===
  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        this.warehouses = res;
      },
      error: (err) => {
        this.settings.showError(err?.error?.message || 'Error loading warehouses.');
      },
    });
  }

  loadDriverRates(opts?: {
    driverId?: number;
    rateType?: RateType;
    onlyActive?: boolean;
    from?: Date | string;
    to?: Date | string;
  }): void {
    this.loading = true;

    this.payrollService.getRateAllDriver(opts).subscribe({
      next: (res) => {
        const rows: UserRate[] = (res ?? []).map((r: any) => ({
          id: Number(r.id),
          driverId: Number(r.driverId),
          warehouseId: Number(r.warehouseId), // ✅ IMPORTANTE
          rateType: r.rateType as RateType,
          baseAmount: Number(r.baseAmount),
          minPayPerRoute: r.minPayPerRoute ?? undefined,
          overStopBonusThreshold: r.overStopBonusThreshold ?? undefined,
          overStopBonusPerStop: r.overStopBonusPerStop ?? undefined,
          failedStopPenalty: r.failedStopPenalty ?? undefined,
          rescueStopRate: r.rescueStopRate ?? undefined,
          nightDeliveryBonus: r.nightDeliveryBonus ?? undefined,
          effectiveFrom: r.effectiveFrom,
          effectiveTo: (r as any).effectiveTo ?? undefined,
          driverFullName: r.driverFullName,
          dailyAmount: Number(r.dailyAmount),
          extraAmount: Number(r.extraAmount || 0)
        }));
     
        this.setData(rows);

        // ✅ aplica filtros actuales al refrescar data
        this.applyCombinedFilter();

        this.loading = false;
      },
      error: (err) => {
        this.settings?.showError?.(err?.error?.message || 'Error loading driver rates.');
        this.loading = false;
      },
    });
  }

  private setData(items: UserRate[]) {
    this.dataSource.data = items;

    this.rowForms.clear();

    const groups = items.map((it) => {
      const g = this.fb.group({
        id: new FormControl<number>(it.id, { nonNullable: true }),
        rateType: new FormControl<RateType>(it.rateType, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        baseAmount: new FormControl<number | undefined>(it.baseAmount, {
          validators: [Validators.required, Validators.min(0)],
        }),
        extraAmount: new FormControl<number | undefined>(it.extraAmount, {
          validators: [Validators.required, Validators.min(0)],
        }),
        minPayPerRoute: new FormControl<number | undefined>(it.minPayPerRoute),
        failedStopPenalty: new FormControl<number | undefined>(it.failedStopPenalty),
        rescueStopRate: new FormControl<number | undefined>(it.rescueStopRate),
        dailyAmount: new FormControl<number | undefined>(it.dailyAmount)
      });

      this.rowForms.set(it.id, g);
      return g;
    });

    this.form.setControl('rows', this.fb.array(groups));
    this.selection.clear();

    if (this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort) this.dataSource.sort = this.sort;
  }

  getRowForm(row: UserRate): FormGroup {
    return this.rowForms.get(row.id)!;
  }

  // === Selection helpers ===
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  checkboxLabel(row?: UserRate): string {
    if (!row) return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
  }

  // === Guardado ===
  saveRowByElement(element: UserRate) {
    const g = this.getRowForm(element);
    if (!g.valid) return;

    const payload = {
      id: g.value.id,
      driverId: element.driverId,
      rateType: g.value.rateType,
      baseAmount: this.toNullableNumber(g.value.baseAmount),
      minPayPerRoute: this.toNullableNumber(g.value.minPayPerRoute),
      failedStopPenalty: this.toNullableNumber(g.value.failedStopPenalty),
      rescueStopRate: this.toNullableNumber(g.value.rescueStopRate),
      dailyAmount: this.toNullableNumber(g.value.dailyAmount),
      extraAmount: this.toNullableNumber(g.value.extraAmount)
    };
    console.log(payload)
    this.payrollService.updateDriverRate(payload).subscribe({
      next: () => this.settings.showSuccess?.('Saved'),
      error: (err) => this.settings.showError?.(err?.error?.message || 'Save failed'),
    });
  }

  saveSelected() {
    const payloads = this.selection.selected.map((sel) => {
      const g = this.getRowForm(sel);
      return {
        id: g.value.id,
        driverId: sel.driverId,
        rateType: g.value.rateType,
        baseAmount: this.toNullableNumber(g.value.baseAmount),
        minPayPerRoute: this.toNullableNumber(g.value.minPayPerRoute),
        failedStopPenalty: this.toNullableNumber(g.value.failedStopPenalty),
        rescueStopRate: this.toNullableNumber(g.value.rescueStopRate),
        dailyAmount: this.toNullableNumber(g.value.dailyAmount),
        extraAmount: this.toNullableNumber(g.value.extraAmount)
      };
    });
    console.log(payloads)
    if (payloads.length === 0) return;

    const next = (i: number) => {
      if (i >= payloads.length) {
        this.settings.showSuccess?.('All selected saved');
        return;
      }
      this.payrollService.updateDriverRate(payloads[i]).subscribe({
        next: () => next(i + 1),
        error: (err) =>
          this.settings.showError?.(err?.error?.message || `Save failed on item ${i + 1}`),
      });
    };
    next(0);
  }

  resetRowByElement(element: UserRate) {
    const original = this.dataSource.data.find((x) => x.id === element.id);
    if (!original) return;

    const g = this.getRowForm(element);
    g.reset({
      id: original.id,
      rateType: original.rateType,
      baseAmount: original.baseAmount,
      minPayPerRoute: original.minPayPerRoute,
      failedStopPenalty: original.failedStopPenalty,
      rescueStopRate: original.rescueStopRate,
      dailyAmount: original.dailyAmount,
      extraAmount: original.extraAmount
    });
  }

  generateDefaultRate() {
    if (!this.canGenerateDefaultRate()) return;

    const warehouseId = this.selectedWarehouseId!;

    this.loading = true;
    this.payrollService.generateDefaultRateForWarehouse(warehouseId).subscribe({
      next: (res) => {
        this.snackBar.open(`Created ${res?.created ?? 0} rates.`, 'Cerrar', { duration: 3500 });
        // si quieres refrescar tabla:
        // this.loadRates();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Error generating rates.', 'Cerrar', { duration: 5000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private toNullableNumber(v: any): number | undefined {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
}
