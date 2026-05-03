import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';

import { CoreService } from 'src/app/services/core.service';
import { finalize } from 'rxjs/operators';
import { LoanDto, LoanService } from 'src/app/services/loan.service';


type LoanStatusFilter = 'all' | 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Cancelled';

@Component({
  selector: 'app-loans',
  templateUrl: './loan.component.html',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
  ],
})
export class LoanComponent implements AfterViewInit, OnInit {
  @ViewChild(MatTable, { static: false }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;

  loading = false;

  // filtros
  searchText = '';
  statusFilter: LoanStatusFilter = 'all';
  driverIdFilter: number | null = null;

  displayedColumns: string[] = [
    'id',
    'driver',
    'principal',
    'balance',
    'status',
    'createdAt',
    'action',
  ];

  // en tu API viene { Loan, Repayments } -> normalizamos a LoanDto para la tabla
  dataSource = new MatTableDataSource<LoanDto>([]);

  constructor(
    public dialog: MatDialog,
    private loansService: LoanService,
    private settings: CoreService
  ) { }

  ngOnInit(): void {
    this.loadLoans();

    // filtro de texto local sobre la data ya cargada
    this.dataSource.filterPredicate = (row: LoanDto, filter: string) => {
      const f = JSON.parse(filter || '{}') as {
        text?: string;
        status?: LoanStatusFilter;
        driverId?: number | null;
      };

      const t = (f.text || '').toLowerCase();

      const matchesText =
        !t ||
        String(row.id).includes(t) ||
        String(row.driverId).includes(t) ||
        String(row.status || '').toLowerCase().includes(t) ||
        String(row.notes || '').toLowerCase().includes(t);

      const matchesStatus =
        !f.status || f.status === 'all' || row.status === f.status;

      const matchesDriver =
        f.driverId == null || f.driverId <= 0 || row.driverId === f.driverId;

      return matchesText && matchesStatus && matchesDriver;
    };

    this.applyCompositeFilter();
  }

  ngAfterViewInit(): void {
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  loadLoans(): void {
    this.loading = true;

    this.loansService
      .getAll(this.driverIdFilter, this.statusFilter === 'all' ? null : this.statusFilter)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          // Soporta: array normal []  o  { $values: [] }
          const rawList: any[] = Array.isArray(res)
            ? res
            : (Array.isArray(res?.$values) ? res.$values : []);

          // Tu API devuelve { Loan, Repayments }
          const rows = rawList
            .map((x: any) => x?.Loan ?? x?.loan)
            .filter(Boolean);
          this.dataSource.data = rows;

          if (this.paginator) this.dataSource.paginator = this.paginator;

          this.applyCompositeFilter();
        },

        error: (err) => {
          console.error(err);
          this.settings.showError(err?.error?.message || 'Error loading loans.');
        },
      });
  }

  applyFilter(value: string): void {
    this.searchText = (value ?? '').trim().toLowerCase();
    this.applyCompositeFilter();
  }

  onStatusChange(status: LoanStatusFilter): void {
    this.statusFilter = status;
    // puedes recargar server-side (recomendado) o filtrar local
    this.loadLoans();
  }

  onDriverIdChange(driverId: number | null): void {
    this.driverIdFilter = driverId;
    this.loadLoans();
  }

  private applyCompositeFilter(): void {
    const filterObj = {
      text: this.searchText,
      status: this.statusFilter,
      driverId: this.driverIdFilter,
    };

    this.dataSource.filter = JSON.stringify(filterObj);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Acciones
  approve(row: LoanDto) {
    this.callAction(() => this.loansService.approve(row.id), 'Approved');
  }
  pause(row: LoanDto) {
    this.callAction(() => this.loansService.pause(row.id), 'Paused');
  }
  resume(row: LoanDto) {
    this.callAction(() => this.loansService.resume(row.id), 'Resumed');
  }
  cancel(row: LoanDto) {
    this.callAction(() => this.loansService.cancel(row.id), 'Cancelled');
  }

  private callAction(action: () => any, msg: string) {
    this.loading = true;
    action()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.settings.showSuccess?.(msg) ?? this.settings.showError(msg); // por si solo tienes showError
          this.loadLoans();
        },
        error: (err: any) => {
          console.error(err);
          this.settings.showError(err?.error?.message || 'Action failed.');
        },
      });
  }

  // helpers UI
  canApprove(r: LoanDto) { return r.status === 'Draft'; }
  canPause(r: LoanDto) { return r.status === 'Active'; }
  canResume(r: LoanDto) { return r.status === 'Paused'; }
  canCancel(r: LoanDto) { return r.status !== 'Completed' && r.status !== 'Cancelled'; }
}
