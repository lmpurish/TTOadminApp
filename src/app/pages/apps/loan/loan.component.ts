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
import { AddComponent } from './add/add.component';
import { NgApexchartsModule } from 'ng-apexcharts';

type LoanStatusFilter =
  | 'all'
  | 'Draft'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

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
    NgApexchartsModule,
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
    'driver',
    'principal',
    'installmentAmount',
    'balance',
    'paid',
    'status',
    'createdAt',
    'action',
  ];

  // en tu API viene { Loan, Repayments } -> normalizamos a LoanDto para la tabla
  dataSource = new MatTableDataSource<LoanDto>([]);

  constructor(
    public dialog: MatDialog,
    private loansService: LoanService,
    private settings: CoreService,
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
        String(row.status || '')
          .toLowerCase()
          .includes(t) ||
        String(row.notes || '')
          .toLowerCase()
          .includes(t);

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
      .getAll(
        this.driverIdFilter,
        this.statusFilter === 'all' ? null : this.statusFilter,
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          // Soporta: array normal []  o  { $values: [] }
          const rawList: any[] = Array.isArray(res)
            ? res
            : Array.isArray(res?.$values)
              ? res.$values
              : [];

          // Tu API devuelve { Loan, Repayments }
          const rows = rawList
            .map((x: any) => x?.Loan ?? x?.loan)
            .filter(Boolean);
          this.dataSource.data = rows;
          this.buildDashboard(rows);
          this.buildStatusChart(rows);
          if (this.paginator) this.dataSource.paginator = this.paginator;

          this.applyCompositeFilter();
        },

        error: (err) => {
          console.error(err);
          this.settings.showError(
            err?.error?.message || 'Error loading loans.',
          );
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
  private buildStatusChart(loans: any[]): void {

    const statuses = ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled'];

    const counts = statuses.map(status =>
      loans.filter(x => x.status === status).length
    );

    this.statusChart = {
      ...this.statusChart,
      series: counts,
      labels: statuses,
    };
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
          this.settings.showSuccess?.(msg)
          this.loadLoans();
        },
        error: (err: any) => {
          console.error(err);
          this.settings.showError(err.error || 'Action failed.');
        },
      });
  }

  // helpers UI
  canApprove(r: LoanDto) {
    return r.status === 'Draft';
  }
  canPause(r: LoanDto) {
    return r.status === 'Active';
  }
  canResume(r: LoanDto) {
    return r.status === 'Paused';
  }
  canCancel(r: LoanDto) {
    return r.status !== 'Completed' && r.status !== 'Cancelled';
  }

  onCreate() {
    const dialogRef = this.dialog.open(AddComponent, {
      data: null,
      width: '800px',
      maxWidth: '95vw',
      height: '70vh',
      autoFocus: false,
      restoreFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(result)
      if (result === true) {
        this.loadLoans(); // recarga la lista después de crear un nuevo préstamo
      }
    });
  }

  dashboard = {
    totalLoans: 0,
    activeBalance: 0,
    totalPrincipal: 0,
    completedLoans: 0,
    totalToCollect: 0,
    estimatedProfit: 0,
  };

  private buildDashboard(loans: any[]): void {
    const totalPrincipal = loans.reduce(
      (sum, x) => sum + Number(x.principal || 0),
      0
    );

    const totalBalance = loans.reduce(
      (sum, x) => sum + Number(x.balance || 0),
      0
    );

    const activeBalance = loans
      .filter(x => x.status === 'Active' || x.status === 'Paused')
      .reduce((sum, x) => sum + Number(x.balance || 0), 0);

    const completedLoans = loans.filter(x => x.status === 'Completed').length;

    // Ganancia estimada:
    // Si el préstamo original fue 1000 y el total a cobrar es 1250,
    // debes tener un campo como totalAmount, amountToPay, totalRepayment, etc.
    const totalToCollect = loans.reduce(
      (sum, x) => sum + Number(x.installmentAmount || 0),
      0
    );

    const estimatedProfit = totalToCollect - totalPrincipal;

    this.dashboard = {
      totalLoans: loans.length,
      activeBalance,
      totalPrincipal,
      completedLoans,
      totalToCollect,
      estimatedProfit,
    };

    this.buildProfitChart(loans);
  }
  private buildProfitChart(loans: any[]): void {
    const categories = loans.map(x => `Loan #${x.id}`);

    const principal = loans.map(x => Number(x.principal || 0));

    const totalToCollect = loans.map(x =>
      Number(x.installmentAmount || 0)
    );

    const profit = loans.map((x, index) =>
      totalToCollect[index] - principal[index]
    );

    this.profitChart = {
      ...this.profitChart,
      series: [
        {
          name: 'Principal',
          data: principal,
        },
        {
          name: 'Total To Collect',
          data: totalToCollect,
        },
        {
          name: 'Profit',
          data: profit,
        },
      ],
      xaxis: {
        categories,
      },
    };
  }
  statusChart: any = {
    series: [],
    chart: {
      type: 'donut',
      height: 320,
    },
    labels: [],
    legend: {
      position: 'bottom',
    },
  };
  profitChart: any = {
    series: [],
    chart: {
      type: 'bar',
      height: 340,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        borderRadius: 6,
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: [],
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      y: {
        formatter: (val: number) => `$${val.toFixed(2)}`,
      },
    },
  };
}
