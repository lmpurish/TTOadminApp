import { Component, OnInit, AfterViewInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PayrollErrorsDialogComponent, PayrollErrorRow } from './payroll-errors-dialog/payroll-errors-dialog.component';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import {
  NgApexchartsModule
} from 'ng-apexcharts';

function toYmd(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,

    // 👇 estos 4 son los importantes para matDatepickerFilter
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgApexchartsModule,
    MatProgressBarModule,
    TablerIconsModule,
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
  debugResults: any[] = [];
  payrollErrors: PayrollErrorRow[] = [];
  // Warehouses
  isAdmin = true; // ajusta a tu lógica real
  selectedWarehouseId: number | null = null;
  warehouses: Array<{ id: number; name?: string; company?: string; city?: string }> = [];
  ngOnInit(): void {
    this.userActive = this.coreService.getUserInfoFromToken();

    // Inicializa el rango con Date (no strings)
    const wk = this.currentWeekRangeDates();
    this.form.patchValue({ weekStart: wk.start, weekEnd: wk.end });
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        this.warehouses = res;
        this.searchExistingWarehousesSummary();
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
  displayedColumnsWh = [
    'warehouse',
    'drivers',
    'gross',
    'adjustments',
    'net',
    'avgDriverPay',
    'percentage',
    'action'
  ];
  dataSourceWh = new MatTableDataSource<WarehouseSummaryRow>([]);
  @ViewChild('whPaginator') whPaginator!: MatPaginator;
  @ViewChild('whSort') whSort!: MatSort;

  totalNetWh = 0;
  summaryLoaded = false;
  periodId: number | null = null;
  isCurrentPeriodSelected = false;
  totalGrossWh = 0;
  totalAdjustmentsWh = 0;
  totalDriversWh = 0;

  highestPayrollWarehouse: any = null;

  // Charts
  warehousePayrollChart: any;
  warehousePayrollDonutChart: any;

  // Weekly
  weeklySummaryDataSource = new MatTableDataSource<any>([]);

  // Drivers detail
  selectedWarehouseDriversDataSource = new MatTableDataSource<any>([]);

  // ======= DETALLE (último run calculado) opcional =======
  run = signal<PayRunDto | null>(null);
  totalLines = computed(() => this.run()?.lines?.length ?? 0);
  gross = computed(() => this.run()?.grossAmount ?? 0);
  net = computed(() => this.run()?.netAmount ?? 0);

  constructor(private warehouseService: WarehouseService, private coreService: CoreService, private dialog: MatDialog, private router: Router) { }

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

    this.searchExistingWarehousesSummary();
  }

  // ======= Cargar SUMMARY por ALMACÉN =======
  loadWarehousesSummary(): void {
    const companyId = this.userActive.companyId;
    const startCtrl = this.form.value.weekStart as Date | null;
    const endCtrl = this.form.value.weekEnd as Date | null;
    const userId = this.userActive.id;

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
    this.payrollErrors = []; // reset

    const requests = warehousesToLoad.map((wh) => {
      const body = {
        companyId,
        warehouseId: wh.id,
        startDate: start,
        endDate: end,
        userId,
        recalculateAll: true
      };
      console.log("aqui1")
      return this.api.computePeriod(body).pipe(
        map((dto: any) => {
          // ✅ Extrae periodId aunque el backend use otro nombre
          const periodId =
            dto?.payPeriodId ??
            dto?.periodId ??
            dto?.payPeriod?.id ??
            dto?.period?.id ??
            null;

          return { wh, periodId, dto, error: null };
        }),
        catchError((err) => {
          const whName =
            wh.name ||
            `${wh.company ?? ''} ${wh.city ?? ''}`.trim() ||
            `Warehouse ${wh.id}`;

          const message =
            err?.error?.error ||
            err?.error?.message ||
            err?.message ||
            'Error desconocido';

          // 👇 devolvemos el error como item, para mostrarlo en el modal
          console.log("aquí")
          return of({
            wh,
            periodId: null,
            dto: null,
            error: {
              status: err?.status,
              message,
              raw: err
            }
          });
        })
      );
    });

    forkJoin(requests).pipe(
      finalize(() => (this.loading = false))
    ).subscribe({
      next: (results: any[]) => {
        // ✅ Construye lista de errores para el modal
        const failed: PayrollErrorRow[] = (results || [])
          .filter(r => r?.error)
          .map(r => {
            const whName =
              r.wh?.name ||
              `${r.wh?.company ?? ''} ${r.wh?.city ?? ''}`.trim() ||
              `Warehouse ${r.wh?.id}`;

            return {
              warehouseId: r.wh?.id,
              warehouseName: whName,
              status: r.error?.status,
              message: r.error?.message ?? 'Error',
              raw: r.error?.raw
            } as PayrollErrorRow;
          });

        this.payrollErrors = failed;

        // ✅ Abre modal si hay errores
        if (failed.length) {
          this.dialog.open(PayrollErrorsDialogComponent, {
            data: { rows: failed },
            width: '1000px',
            maxWidth: '95vw',
            height: '80vh',
            autoFocus: false,
            restoreFocus: false
          });

          this.toast.warning(`Fallaron ${failed.length} warehouses. Revisa el modal.`);
        }
        console.log('FULL RESULTS:', results);

        const ok = (results || []).filter(r => r && r.dto && !r.error);

        console.log('OK RESULTS:', ok);
        // ✅ OK results (solo los que tienen periodId + dto)
        //const ok = (results || []).filter(r => r && r.periodId != null && r.dto);

        const rows: WarehouseSummaryRow[] = ok.map((r: any) => {
          const drivers = r.dto?.drivers ?? r.dto?.Drivers ?? [];

          const gross = drivers.reduce(
            (s: number, d: any) => s + Number(d.gross ?? d.Gross ?? d.grossAmount ?? d.GrossAmount ?? 0),
            0
          );

          const adjustments = drivers.reduce(
            (s: number, d: any) => s + Number(d.adjustments ?? d.Adjustments ?? 0),
            0
          );

          const net = drivers.reduce(
            (s: number, d: any) => s + Number(d.net ?? d.Net ?? d.netAmount ?? d.NetAmount ?? 0),
            0
          );

          let whName = r.wh?.name;
          if (!whName) {
            const parts: string[] = [];
            if (r.wh?.company) parts.push(r.wh.company);
            if (r.wh?.city) parts.push(r.wh.city);
            whName = parts.join(' - ') || `Warehouse ${r.wh?.id}`;
          }
          console.log(r.periodId)
          console.log('DTO:', r.dto);
          console.log('Drivers:', drivers);
          console.log('Totals:', { gross, adjustments, net });
          return {
            warehouseId: r.wh.id,
            warehouseName: whName,
            warehouseCompany: r.wh.company,
            periodId: r.periodId,
            startDate: r.dto?.startDate ?? start,
            endDate: r.dto?.endDate ?? end,
            drivers: drivers?.length ?? 0,
            gross,
            adjustments,
            net
          };
        });

        this.dataSourceWh.data = rows;
        this.totalNetWh = rows.reduce((s, it) => s + it.net, 0);

        this.totalGrossWh = rows.reduce((s, it) => s + it.gross, 0);

        this.totalAdjustmentsWh = rows.reduce((s, it) => s + it.adjustments, 0);

        this.totalDriversWh = rows.reduce((s, it) => s + it.drivers, 0);

        this.highestPayrollWarehouse =
          rows.length > 0
            ? [...rows].sort((a, b) => b.net - a.net)[0]
            : null;
        this.summaryLoaded = true;
        this.periodId = rows.length === 1 ? rows[0].periodId : null;
        this.buildCharts(rows);

        if (!rows.length) this.toast.info('No hay datos para el rango seleccionado.');
      },
      error: () => {
        this.toast.error('No se pudo cargar el resumen por almacenes.');
      }
    });

  }
  buildCharts(rows: WarehouseSummaryRow[]): void {

    this.warehousePayrollChart = {
      series: [
        {
          name: 'Net Payroll',
          data: rows.map(r => r.net)
        }
      ],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false }
      },
      xaxis: {
        categories: rows.map(r => r.warehouseName)
      },
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `$${val.toFixed(2)}`
        }
      }
    };

    this.warehousePayrollDonutChart = {
      series: rows.map(r => r.net),
      chart: {
        type: 'donut',
        height: 350
      },
      labels: rows.map(r => r.warehouseName),
      dataLabels: {
        enabled: true
      },
      legend: {
        position: 'bottom'
      },
      tooltip: {
        y: {
          formatter: (val: number) => `$${val.toFixed(2)}`
        }
      }
    };
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
  linkPayrollConf() {
    this.router.navigate(['apps/payroll-conf']);
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
          console.log(err)
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

  startDateFilter = (d: Date | null) => {
    if (!d) return false;

    const day = this.normalize(d).getDay();
    if (day !== 5) return false; // 5 = Friday

    const start = this.normalize(d);
    const end = this.addDays(start, 8); // Fri -> next Sat (cierre)
    const today = this.normalize(new Date());

    // 🚫 Esto deshabilita la semana actual (si el sábado todavía es futuro)
    return end <= today;
  };

  // ✅ Fin: solo permite el sábado exacto que corresponde al viernes seleccionado
  // y también debe ser <= hoy para que salga opaco si es de la semana actual
  endDateFilter = (d: Date | null) => {
    if (!d) return false;

    const start = this.form.get('weekStart')?.value;
    const today = this.normalize(new Date());
    const dd = this.normalize(d);

    // Si aún no eligieron start, al menos solo sábados que ya pasaron
    if (!start) return dd.getDay() === 6 && dd <= today; // 6 = Saturday

    const expectedEnd = this.addDays(this.normalize(start), 8);
    return this.isSameDate(dd, expectedEnd) && dd <= today;
  };
  payrollDateFilter = (d: Date | null): boolean => {
    if (!d) return false;

    const date = this.normalize(d);
    const today = this.normalize(new Date());

    // Bloquea futuro
    if (date > today) return false;

    const curStart = this.currentPayrollStart(today);     // sábado de esta semana payroll
    const curEnd = this.addDays(curStart, 6);             // viernes

    // Bloquea cualquier fecha dentro del período actual (incluye sábado..viernes)
    if (date >= curStart && date <= curEnd) return false;

    // Todo lo demás (períodos pasados) permitido
    return true;
  };


  // ✅ Cuando elige un viernes válido, autollenar el sábado
  onStartDateChange() {
    const start = this.form.get('weekStart')?.value;
    if (!start) return;

    const s = this.normalize(start);
    if (s.getDay() !== 5) return; // solo viernes

    const end = this.addDays(s, 8); // viernes -> sábado siguiente
    this.form.patchValue({ weekEnd: end }, { emitEvent: true });
  }
  onAnyDatePicked() {
    const any = this.form.value.weekStart ?? this.form.value.weekEnd;
    if (!any) return;

    const picked = this.normalize(any);
    const start = this.payrollStartFor(picked); // sábado correspondiente al picked
    const end = this.addDays(start, 6);         // viernes

    this.form.patchValue({ weekStart: start, weekEnd: end }, { emitEvent: false });

    // Marca si el rango cae en el período actual (por si quieres hint/boton disabled)
    const today = this.normalize(new Date());
    const curStart = this.currentPayrollStart(today);
    const curEnd = this.addDays(curStart, 6);
    this.isCurrentPeriodSelected = start >= curStart && start <= curEnd;
  }
  // Helpers
  private normalize(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  private addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }
  private isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  private payrollStartFor(d: Date): Date {
    const day = d.getDay(); // 0=Sun ... 6=Sat
    const diffBackToSat = (day - 6 + 7) % 7;
    return this.addDays(d, -diffBackToSat);
  }

  // El período actual es el que contiene "today": sábado más reciente -> viernes
  private currentPayrollStart(today: Date): Date {
    return this.payrollStartFor(today);
  }
  openErrorsModal(): void {
    if (!this.payrollErrors?.length) {
      this.toast.info('No hay errores para mostrar.');
      return;
    }

    this.dialog.open(PayrollErrorsDialogComponent, {
      data: { rows: this.payrollErrors },
      width: '1000px',
      maxWidth: '95vw',
      height: '80vh',
      autoFocus: false,
      restoreFocus: false
    });
  }

  searchExistingWarehousesSummary(): void {
    const companyId = this.userActive.companyId;
    const startCtrl = this.form.value.weekStart as Date | null;
    const endCtrl = this.form.value.weekEnd as Date | null;

    if (!startCtrl || !endCtrl) return;

    const start = toYmd(startCtrl);
    const end = toYmd(endCtrl);

    const warehousesToLoad = this.selectedWarehouseId
      ? this.warehouses.filter(w => w.id === this.selectedWarehouseId)
      : this.warehouses;

    if (!warehousesToLoad?.length) {
      this.dataSourceWh.data = [];
      this.totalNetWh = 0;
      this.totalGrossWh = 0;
      this.totalAdjustmentsWh = 0;
      this.totalDriversWh = 0;
      this.highestPayrollWarehouse = null;
      this.summaryLoaded = false;
      this.periodId = null;
      this.buildCharts([]);
      return;
    }

    this.loading = true;
    this.payrollErrors = [];

    const requests = warehousesToLoad.map((wh) => {
      return this.api.getPeriodByRange(companyId, wh.id, start, end).pipe(
        map((dto: any) => {
          const periodId =
            dto?.payPeriodId ??
            dto?.PayPeriodId ??
            dto?.periodId ??
            dto?.PeriodId ??
            dto?.payPeriod?.id ??
            dto?.PayPeriod?.Id ??
            dto?.period?.id ??
            dto?.Period?.Id ??
            null;

          return { wh, periodId, dto, error: null };
        }),
        catchError((err) => {
          if (err?.status === 404) {
            return of({ wh, periodId: null, dto: null, error: null });
          }

          return of({
            wh,
            periodId: null,
            dto: null,
            error: {
              status: err?.status,
              message:
                err?.error?.error ||
                err?.error?.message ||
                err?.message ||
                'Unknown error',
              raw: err
            }
          });
        })
      );
    });

    forkJoin(requests)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (results: any[]) => {
          const failed: PayrollErrorRow[] = (results || [])
            .filter(r => r?.error)
            .map(r => ({
              warehouseId: r.wh?.id,
              warehouseName:
                r.wh?.name ||
                `${r.wh?.company ?? ''} ${r.wh?.city ?? ''}`.trim() ||
                `Warehouse ${r.wh?.id}`,
              status: r.error?.status,
              message: r.error?.message ?? 'Error',
              raw: r.error?.raw
            }));

          this.payrollErrors = failed;

          const ok = (results || []).filter(r => r && r.dto && !r.error);

          const rows: WarehouseSummaryRow[] = ok.map((r: any) => {
            const drivers = r.dto?.drivers ?? r.dto?.Drivers ?? [];

            const gross = drivers.reduce(
              (s: number, d: any) =>
                s + Number(d.gross ?? d.Gross ?? d.grossAmount ?? d.GrossAmount ?? 0),
              0
            );

            const adjustments = drivers.reduce(
              (s: number, d: any) =>
                s + Number(d.adjustments ?? d.Adjustments ?? 0),
              0
            );

            const net = drivers.reduce(
              (s: number, d: any) =>
                s + Number(d.net ?? d.Net ?? d.netAmount ?? d.NetAmount ?? 0),
              0
            );

            const whName =
              r.wh?.name ||
              [r.wh?.company, r.wh?.city].filter(Boolean).join(' - ') ||
              `Warehouse ${r.wh?.id}`;

            return {
              warehouseId: r.wh.id,
              warehouseName: whName,
              warehouseCompany: r.wh.company,
              periodId: r.periodId,
              startDate: r.dto?.startDate ?? r.dto?.StartDate ?? start,
              endDate: r.dto?.endDate ?? r.dto?.EndDate ?? end,
              drivers: drivers.length,
              gross,
              adjustments,
              net
            };
          });

          this.dataSourceWh.data = rows;

          this.totalNetWh = rows.reduce((s, it) => s + it.net, 0);
          this.totalGrossWh = rows.reduce((s, it) => s + it.gross, 0);
          this.totalAdjustmentsWh = rows.reduce((s, it) => s + it.adjustments, 0);
          this.totalDriversWh = rows.reduce((s, it) => s + it.drivers, 0);

          this.highestPayrollWarehouse =
            rows.length > 0
              ? [...rows].sort((a, b) => b.net - a.net)[0]
              : null;

          this.summaryLoaded = rows.length > 0;
          this.periodId = rows.length === 1 ? rows[0].periodId : null;

          this.buildCharts(rows);
        },
        error: () => {
          this.toast.error('Could not load existing payrolls.');
        }
      });
  }
  onDateRangeChanged(): void {
    // this.onAnyDatePicked();

    const start = this.form.get('weekStart')?.value;
    const end = this.form.get('weekEnd')?.value;

    if (start && end) {
      this.searchExistingWarehousesSummary();
    }
  }


  displayedColumnsWeekly = [
    'period',
    'warehouses',
    'drivers',
    'gross',
    'adjustments',
    'net'
  ];

  displayedColumnsDrivers = [
    'driver',
    'gross',
    'adjustments',
    'net',
    'status',
    'approvedAt'
  ];

}
