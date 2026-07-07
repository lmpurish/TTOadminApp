import { Component, Inject, Input, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ToastrService } from 'ngx-toastr';

import { PayrollService } from 'src/app/services/payroll.service';
import { PeriodSummaryDto, PayRunDto } from 'src/app/models/payroll.models';
import { RunDetailDialogComponent } from './run-detail-dialog.component';
import { PayrollAdjustmentDialogComponent } from './payroll-adjustment-dialog.component';

// Helper
function todayYmd(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-payroll-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule, TablerIconsModule],
  templateUrl: './payroll-drivers.component.html',
  styleUrls: ['./payroll-drivers.component.scss']
})
export class PayrollDriversComponent implements OnInit {
  private api = inject(PayrollService);
  private toast = inject(ToastrService);
  private dialog = inject(MatDialog);
  driversWhoStoppedWorking: any[] = [];

  /** ENTRADAS desde el padre (p.ej. desde la vista por almacén) */
  @Input() companyId = 1;
  @Input() periodId!: number;                // <- requerido para cargar
  @Input() warehouseId: number | null = null;
  @Input() zoneId: number | null = null;
  @Input() userId = 0;

  // Rango (lo llenamos al leer el summary del período)
  startDateYmd = '';
  endDateYmd = '';

  loading = false;
  filterCtrl = new FormControl<string>('', { nonNullable: true });

  displayedColumns = ['driver', 'gross', 'adjustments', 'net', 'action'];
  dataSource = new MatTableDataSource<any>([]);
  totalNet = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(

    // +++ inyecta los datos del diálogo +++
    @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) {
    // mapear data del diálogo a las props que usa el componente
    if (dialogData) {
      this.companyId = dialogData.companyId ?? this.companyId;
      this.periodId = dialogData.periodId;
      this.warehouseId = dialogData.warehouseId ?? null;
      this.zoneId = dialogData.zoneId ?? null;
      this.userId = dialogData.userId ?? 0;
      this.driversWhoStoppedWorking = dialogData.driversWhoStoppedWorking ?? [];
    }
    
  }
  ngOnInit(): void {
    if (!this.periodId) {
      this.toast.error('Falta periodId para cargar el payroll por driver.');
      return;
    }
    this.loadSummary();

    this.dataSource.filterPredicate = (row, filter) => {
      const f = (filter || '').toLowerCase().trim();

      return (
        row.driverId.toString().includes(f) ||
        (row.driverName || '').toLowerCase().includes(f)
      );
    };

    this.filterCtrl.valueChanges.subscribe(v => {
      this.dataSource.filter = v || '';
      if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    });
  }

  private loadSummary(): void {
    this.loading = true;
    this.api.getPeriodSummary(this.periodId).subscribe({
      next: (dto: PeriodSummaryDto) => {
        this.startDateYmd = dto.startDate;
        this.endDateYmd = dto.endDate;
        const rows = dto.drivers || [];
        this.dataSource.data = rows.map(d => {
  const driverId = Number(d.driverId);

  const stoppedInfo = this.driversWhoStoppedWorking.find(
    x => Number(x.driverId) === driverId
  );

  return {
    driverId,
    driverName: d.driverName ?? '',
    gross: Number(d.gross ?? 0),
    adjustments: Number(d.adjustments ?? 0),
    net: Number(d.net ?? 0),
    run: Number(d.run ?? 0),
    status: d.status ?? '',

    hasStoppedWarning: !!stoppedInfo,
    daysSinceLastRoute: stoppedInfo?.daysSinceLastRoute ?? 0,
    lastRouteDate: stoppedInfo?.lastRouteDate ?? null,
  };
});

        this.totalNet = this.dataSource.data.reduce((s, it) => s + (it.net || 0), 0);

      },
      error: () => this.toast.error('No se pudo cargar el summary por driver.'),
      complete: () => {
        this.loading = false;
        setTimeout(() => {
          if (this.paginator) this.dataSource.paginator = this.paginator;
          if (this.sort) this.dataSource.sort = this.sort;
        });
      }
    });
  }

  /** Ver/recargar el PayRun del driver y abrir detalle */
  viewRun(row: { run: number }): void {

    console.log(row)
    this.loading = true;
    this.api.getRun(row.run).subscribe({
      next: (run: PayRunDto) => {
        this.loading = false;
        this.dialog.open(RunDetailDialogComponent, {
          data: { run },
          width: '960px',
          autoFocus: false
        });
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.error || 'No se pudo cargar el PayRun del driver.');
      }
    });
  }
  get warningDriversCount(): number {
  return this.dataSource.data.filter(row => row.hasStoppedWarning).length;
}

  /** Aprobar el PayRun del driver (se obtiene al vuelo con compute) */
  approve(row: { driverId: number }): void {
    const payload = {
      companyId: this.companyId,
      driverId: row.driverId,
      weekStart: this.startDateYmd,
      weekEnd: this.endDateYmd,
      warehouseId: this.warehouseId,
      userId: this.userId || 0,
      zoneId: this.zoneId ?? null
    };
    this.loading = true;
    this.api.compute(payload).subscribe({
      next: (run: PayRunDto) => {
        this.api.approveRun(run.id).subscribe({
          next: () => {
            this.toast.success(`Run #${run.id} aprobado.`);
            this.loading = false;
            this.loadSummary(); // refresca montos por si cambian
          },
          error: () => { this.loading = false; this.toast.error('No se pudo aprobar el run.'); }
        });
      },
      error: () => { this.loading = false; this.toast.error('No se pudo obtener el run para aprobar.'); }
    });
  }

  /** Exportar CSV del PayRun */
  exportRun(row: { run: number }): void {

    this.loading = true;
    this.api.getRun(row.run).subscribe({
      next: (run: PayRunDto) => {
        const fname = `payrun_${run.id}_${todayYmd()}`;
        this.api.exportRunCsv(run.id, fname).subscribe({
          next: (resp) => {
            this.loading = false;
            const blob = resp.body!;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${fname}.pdf`; a.click();
            window.URL.revokeObjectURL(url);
          },
          error: () => { this.loading = false; this.toast.error('No se pudo exportar el CSV del run.'); }
        });
      },
      error: () => { this.loading = false; this.toast.error('No se pudo obtener el run para exportar.'); }
    });
  }

  exportWarehouseReport(): void {
    if (!this.warehouseId) {
      this.toast.error('WarehouseId is missing', 'Error');
      return;
    }

    if (!this.periodId) {
      this.toast.error('PayPeriodId is missing', 'Error');
      return;
    }

    const fileName = `warehouse_payroll_${this.warehouseId}_${this.startDateYmd}_${this.endDateYmd}.pdf`;

    this.loading = true;

    this.api.exportWarehouseSummaryPdf(this.warehouseId, this.periodId, fileName)
      .subscribe({
        next: (response) => {
          this.loading = false;

          const blob = response.body;
          if (!blob) {
            this.toast.error('Empty file received', 'Error');
            return;
          }

          let downloadFileName = fileName;
          const contentDisposition = response.headers.get('content-disposition');

          if (contentDisposition) {
            const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
            if (match?.[1]) {
              downloadFileName = decodeURIComponent(match[1].replace(/["']/g, ''));
            }
          }

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = downloadFileName;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(
            err?.error?.message || 'Error exporting warehouse PDF',
            'Error'
          );
        }
      });
  }
  openAdjustmentDialog(row: any): void {
    const dialogRef = this.dialog.open(PayrollAdjustmentDialogComponent, {
      width: '500px',
      autoFocus: false,
      data: {
        payRunId: row.run,
        driverName: row.driverName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.api.addAdjustment(result).subscribe({
        next: () => {
          this.toast.success('Adjustment added successfully.');
          this.loadSummary(); // o el método que recarga la tabla
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Could not add adjustment.');
        }
      });
    });
  }
}
