import { Component, OnInit, AfterViewInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  PayRunDto,
  DriverRate,
  PeriodSummaryDto,
  CreatePeriodRequest,
  WarehouseSummaryRow,
  PayPeriod
} from 'src/app/models/payroll.models';
import { PayrollService } from 'src/app/services/payroll.service';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';

import { forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, finalize } from 'rxjs/operators';

import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ToastrService } from 'ngx-toastr';

import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

import { RolePipe } from '../employee/role.pipe';
import { StatusLabelPipe } from 'src/app/pipe/status-label.pipe';
import { CoreService } from 'src/app/services/core.service';
import { MatDialog } from '@angular/material/dialog';
import { PayrollDriversComponent } from './payroll-drivers/payroll-drivers.component';
import { Router, RouterLink } from '@angular/router';

function toYmd(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
    RolePipe,
    StatusLabelPipe
  ],
  templateUrl: './payroll.component.html',
  styleUrls: ['payroll.component.scss'],
})
export class PayrollComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private api = inject(PayrollService);
  private toast = inject(ToastrService);
  userActive: any = 0;
  loading = false;

  // Warehouses
  isAdmin = true; // ajusta a tu lógica real
  selectedWarehouseId: number | null = null;
  warehouses: Array<{ id: number; name?: string; company?: string; city?: string }> = [];
  ngOnInit(): void {
    this.userActive = this.coreService.getUserInfoFromToken();

    // Inicializa el rango con Date (no strings)
    const wk = this.currentWeekRangeDates();
    this.form.patchValue({ weekStart: wk.start, weekEnd: wk.end });

    // Cargar warehouses
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        this.warehouses = res;

      },
      error: (err: any) => {
        console.error('Error cargando warehouses', err);
        this.toast?.error?.('No se pudieron cargar los warehouses');
      }
    });


    // Filtro por texto en warehouses
    this.dataSourceWh.filterPredicate = (row: WarehouseSummaryRow, filter: string): boolean => {
      const f = filter.trim().toLowerCase();
      return row.warehouseName.toLowerCase().includes(f) || row.warehouseId.toString().includes(f);
    };
  }
  // Form base (Date en los controles de rango)
  form = this.fb.group({
    companyId: [1, Validators.required],
    driverId: [null as number | null, Validators.required],
    weekStart: new FormControl<Date | null>(new Date(), { validators: Validators.required }),
    weekEnd: new FormControl<Date | null>(new Date(), { validators: Validators.required }),
    warehouseId: new FormControl<number | null>(null),
    zoneId: new FormControl<number | null>(null),

  });

  // ======= TABLA por ALMACÉN =======
  displayedColumnsWh: string[] = ['warehouse', 'gross', 'adjustments', 'net', 'action'];
  dataSourceWh = new MatTableDataSource<WarehouseSummaryRow>([]);
  @ViewChild('whPaginator') whPaginator!: MatPaginator;
  @ViewChild('whSort') whSort!: MatSort;

  totalNetWh = 0;
  summaryLoaded = false;
  periodId: number | null = null;

  // ======= DETALLE (último run calculado) opcional =======
  run = signal<PayRunDto | null>(null);
  totalLines = computed(() => this.run()?.lines?.length ?? 0);
  gross = computed(() => this.run()?.grossAmount ?? 0);
  net = computed(() => this.run()?.netAmount ?? 0);

  constructor(private warehouseService: WarehouseService, private coreService: CoreService, private dialog: MatDialog,private router:Router) { }

  // Quick Rate (por si falta)
  showQuickRate = signal(false);
  rateForm = this.fb.group<DriverRate>({
    driverId: this.fb.control(0 as any, { nonNullable: true }),
    rateType: this.fb.control('PerStop' as any, { nonNullable: true }),
    baseAmount: this.fb.control(1.5 as any, { nonNullable: true }),
    minPayPerRoute: this.fb.control<number | null>(120),
    overStopBonusThreshold: this.fb.control<number | null>(100),
    overStopBonusPerStop: this.fb.control<number | null>(0.25 as any),
    failedStopPenalty: this.fb.control<number | null>(0),
    rescueStopRate: this.fb.control<number | null>(null),
    nightDeliveryBonus: this.fb.control<number | null>(null),
    effectiveFrom: this.fb.control(toYmd(new Date()) as any, { nonNullable: true }),
    effectiveTo: this.fb.control<string | null>(null),
  } as any);

  // ==== Helpers de semana (retornan Date) ====
  private startOfWeek(d = new Date()): Date {
    const day = d.getDay(); // 0=Dom
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
  private endOfWeekFrom(start: Date): Date {
    const sunday = new Date(start);
    sunday.setDate(start.getDate() + 6);
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  }
  private currentWeekRangeDates(): { start: Date; end: Date } {
    const s = this.startOfWeek();
    const e = this.endOfWeekFrom(s);
    return { start: s, end: e };
  }



  ngAfterViewInit(): void {
    this.dataSourceWh.paginator = this.whPaginator;
    this.dataSourceWh.sort = this.whSort;
  }

  onWarehouseChange(warehouseId: number | null): void {
    this.selectedWarehouseId = warehouseId;
  }

  // ======= Cargar SUMMARY por ALMACÉN =======
  loadWarehousesSummary(): void {
    const companyId = this.userActive.companyId;
    const startCtrl = this.form.value.weekStart as Date | null;
    const endCtrl = this.form.value.weekEnd as Date | null;
    const userId = this.userActive.id

    if (!startCtrl || !endCtrl) {
      this.toast.error('Selecciona un rango de fechas.');
      return;
    }

    // Normaliza a 'yyyy-MM-dd' para backend
    const start = toYmd(startCtrl);
    const end = toYmd(endCtrl);

    const warehousesToLoad =
      this.selectedWarehouseId
        ? this.warehouses.filter((w: { id: number }) => w.id === this.selectedWarehouseId)
        : this.warehouses;

    if (!warehousesToLoad?.length) {
      this.toast.warning('No hay warehouses cargados.');
      return;
    }

    this.loading = true;

    const requests = warehousesToLoad.map((wh) => {
      const body = {
        companyId,
        warehouseId: wh.id,
        startDate: start,
        endDate: end,
        userId,
        recalculateAll: false
      };

      return this.api.computePeriod(body).pipe(
        map((dto: PeriodSummaryDto) => ({ wh, periodId: dto.payPeriodId, dto })),
        catchError((err) => {
          const whName = wh.name || `${wh.company ?? ''} ${wh.city ?? ''}`.trim() || `Warehouse ${wh.id}`;
          this.toast.error(`Falló ${whName}: ${err?.error?.error || 'error al computar período'}`);
          return of(null);
        })
      );
    });


    forkJoin(requests).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (results) => {
        console.log(results)
        const okResults = (results || []).filter(
          (r): r is { wh: any; periodId: number; dto: PeriodSummaryDto } => !!r
        );

        const rows: WarehouseSummaryRow[] = okResults.map((r) => {
          const gross = r.dto.drivers.reduce((s, d) => s + d.gross, 0);
          const adjustments = r.dto.drivers.reduce((s, d) => s + d.adjustments, 0);
          const net = r.dto.drivers.reduce((s, d) => s + d.net, 0);

          let whName = r.wh.name;
          if (!whName) {
            const parts: string[] = [];
            if (r.wh.company) parts.push(r.wh.company);
            if (r.wh.city) parts.push(r.wh.city);
            whName = parts.join(' - ') || `Warehouse ${r.wh.id}`;
          }

          return {
            warehouseId: r.wh.id,
            warehouseName: whName,
            warehouseCompany: r.wh.company,
            periodId: r.periodId,
            startDate: r.dto.startDate,
            endDate: r.dto.endDate,
            drivers: r.dto.drivers.length,
            gross,
            adjustments,
            net
          };
        });

        this.dataSourceWh.data = rows;
        this.totalNetWh = rows.reduce((s, it) => s + it.net, 0);
        this.summaryLoaded = true;
        this.periodId = rows.length === 1 ? rows[0].periodId : null;

        if (!rows.length) this.toast.info('No hay datos para el rango seleccionado.');
      },
      error: () => {
        this.toast.error('No se pudo cargar el resumen por almacenes.');
      }
    });
  }

  // Acciones por fila
  viewWarehouseDrivers(row: WarehouseSummaryRow): void {
    const data = {
      companyId: this.form.value.companyId!,
      periodId: row.periodId,
      warehouseId: row.warehouseId,
      zoneId: this.form.value.zoneId ?? null,
      userId: this.userActive.id,
      title: `Drivers · ${row.warehouseName || ('Warehouse ' + row.warehouseId)}`
    };

    this.dialog.open(PayrollDriversComponent, {
      data,
      width: '1100px',
      maxWidth: '95vw',
      height: '85vh',
      autoFocus: false,
      restoreFocus: false
    }).afterClosed().subscribe(() => {
      // opcional: refrescar summary por almacén si aprobaste/cambiaste algo
      // this.loadWarehousesSummary();
    });
  }

  lockWarehousePeriod(row: WarehouseSummaryRow): void {
    this.loading = true;
    this.api.lockPeriod(row.periodId).subscribe({
      next: () => { this.toast.success(`Período bloqueado: ${row.warehouseName}`); this.loading = false; },
      error: () => { this.toast.error('No se pudo bloquear este período.'); this.loading = false; }
    });
  }

  linkDriverRate() {
    this.router.navigate(['apps/user-rate']); // o: this.router.navigateByUrl('/user-rate');
  }

  exportWarehousesCsv(): void {
    const rows: WarehouseSummaryRow[] =
      this.dataSourceWh.filteredData.length ? this.dataSourceWh.filteredData : this.dataSourceWh.data;

    const header = ['WarehouseId', 'Warehouse', 'Start', 'End', 'Drivers', 'Gross', 'Adjustments', 'Net'];
    const csv = [
      header.join(','),
      ...rows.map((r: WarehouseSummaryRow) =>
        [
          r.warehouseId,
          `"${(r.warehouseName ?? '').replace(/"/g, '""')}"`,
          r.startDate,
          r.endDate,
          r.drivers,
          r.gross,
          r.adjustments,
          r.net
        ].join(',')
      )
    ].join('\n');

    const ws = toYmd(this.form.value.weekStart as Date);
    const we = toYmd(this.form.value.weekEnd as Date);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fname = `payroll_by_warehouse_${ws}_${we}.csv`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fname; a.click();
    window.URL.revokeObjectURL(url);
  }

  // ======= (Opcional) Detalle de un driver desde esta vista =======
  openRun(driverId: number): void {
    const ws = toYmd(this.form.value.weekStart as Date);
    const we = toYmd(this.form.value.weekEnd as Date);

    const payload = {
      companyId: this.userActive.companyId,
      driverId,
      weekStart: ws, // string yyyy-MM-dd
      weekEnd: we,   // string yyyy-MM-dd
      warehouseId: this.selectedWarehouseId ?? this.form.value.warehouseId ?? null,
      userId: this.userActive.id,

    };

    this.loading = true;
    this.api.compute(payload).subscribe({
      next: (res: PayRunDto) => {
        this.run.set(res);
        this.toast.success(`PayRun #${res.id} listo (Driver ${driverId}).`);
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        if (err?.status === 400 && err?.error?.error?.toString().includes('DriverRate')) {
          this.toast.warning('Falta DriverRate para este driver/período.');
        } else {
          this.toast.error('No se pudo calcular el driver.');
        }
      }
    });
  }

  approve(): void {
    const id = this.run()?.id; if (!id) return;
    this.api.approveRun(id).subscribe({
      next: () => {
        this.toast.success('Run aprobado.');
        this.api.getRun(id).subscribe((r: PayRunDto) => this.run.set(r));
      },
      error: () => this.toast.error('No se pudo aprobar.')
    });
  }

  exportCsv(): void {
    const id = this.run()?.id; if (!id) return;
    const fname = `payrun_${id}_${new Date().toISOString().slice(0, 10)}`;
    this.api.exportRunCsv(id, fname).subscribe({
      next: (resp) => {
        const blob = resp.body!;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${fname}.csv`; a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('No se pudo exportar CSV')
    });
  }

  createRate(): void {
    if (this.rateForm.invalid) { this.toast.error('Completa los campos del rate.'); return; }
    const val = this.rateForm.value as unknown as DriverRate;
    this.api.createRate(val).subscribe({
      next: () => { this.toast.success('DriverRate creado.'); },
      error: () => { this.toast.error('No se pudo crear el rate.'); }
    });
  }
}
