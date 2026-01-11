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
  dataSource = new MatTableDataSource<{ driverId: number; gross: number; adjustments: number; net: number }>([]);
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
      return row.driverId.toString().includes(f);
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
        console.log(dto)
        this.startDateYmd = dto.startDate;
        this.endDateYmd = dto.endDate;
        const rows = dto.drivers || [];
        this.dataSource.data = rows.map(d => ({
          driverId: d.driverId as unknown as number,
          driverName: d.driverName as unknown as number,
          gross: d.gross as unknown as number,
          adjustments: d.adjustments as unknown as number,
          net: d.net as unknown as number
        }));
         console.log(this.dataSource)
        this.totalNet = this.dataSource.data.reduce((s, it) => s + (it.net || 0), 0);
        console.log(this.dataSource)
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
  viewRun(row: { driverId: number }): void {
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
  exportRun(row: { driverId: number }): void {
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
        const fname = `payrun_${run.id}_${todayYmd()}`;
        this.api.exportRunCsv(run.id, fname).subscribe({
          next: (resp) => {
            this.loading = false;
            const blob = resp.body!;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${fname}.csv`; a.click();
            window.URL.revokeObjectURL(url);
          },
          error: () => { this.loading = false; this.toast.error('No se pudo exportar el CSV del run.'); }
        });
      },
      error: () => { this.loading = false; this.toast.error('No se pudo obtener el run para exportar.'); }
    });
  }
}
