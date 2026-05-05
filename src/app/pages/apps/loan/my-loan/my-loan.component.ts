import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { TablerIconsModule } from 'angular-tabler-icons';
import { finalize } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { CoreService } from 'src/app/services/core.service';
import { LoanDto, LoanService } from 'src/app/services/loan.service';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { AddComponent } from '../add/add.component';

type LoanStatusFilter =
  | 'all'
  | 'Draft'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';
@Component({
  selector: 'app-my-loan',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    CommonModule,
  ],
  templateUrl: './my-loan.component.html',
  styleUrl: './my-loan.component.scss',
})
export class MyLoanComponent {
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns = [
    'id',
    'principal',
    'balance',
    'installmentAmount',
    'status',
    'createdAt',
    'action',
  ];
  searchText = '';
  loading = false;
  statusFilter: LoanStatusFilter = 'all';
  @ViewChild(MatTable, { static: false }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  constructor(
    public dialog: MatDialog,
    private loansService: LoanService,
    private settings: CoreService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadMyLoans();
  }
  loadMyLoans(): void {
    this.loading = true;
    const userInfo = this.settings.getUserInfoFromToken();
    const userId = userInfo?.id ?? 0;

    this.loansService
      .getMine(this.statusFilter === 'all' ? null : this.statusFilter, userId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          console.log(res)
          // 🔹 Soporta: [] | { $values: [] }
          const list: any[] = Array.isArray(res)
            ? res
            : Array.isArray(res?.$values)
              ? res.$values
              : [];

          // 🔹 Mapear { loan, repayments } → row usable por la tabla
          console.log('getMine raw response:', res);
          const rows = list.map((item) => {
            const loan = item.loan ?? item.Loan ?? item; // defensivo
            const repaymentsRaw = item.repayments ?? item.Repayments ?? [];

            const repayments: any[] = Array.isArray(repaymentsRaw)
              ? repaymentsRaw
              : Array.isArray(repaymentsRaw?.$values)
                ? repaymentsRaw.$values
                : [];

            return {
              id: loan.id,
              principal: loan.principal,
              balance: loan.balance,
              installmentAmount: loan.installmentAmount,
              maxDeductionPerPayRun: loan.maxDeductionPerPayRun,
              status: loan.status,
              notes: loan.notes,
              createdAt: loan.createdAt,
              approvedAt: loan.approvedAt,
              repayments,
            };
          });

          this.dataSource.data = rows;

          // paginator / sort (si los usas)
          if (this.paginator) this.dataSource.paginator = this.paginator;
        },
        error: (err) => {
          console.error('Error loading my loans', err);
        },
      });
  }

  applyFilter(value: string): void {
    this.searchText = (value ?? '').trim().toLowerCase();
  }

  onStatusChange(status: LoanStatusFilter): void {
    this.statusFilter = status;
    // puedes recargar server-side (recomendado) o filtrar local
    this.loadMyLoans();
  }

  openDetails(row: any): void {
    if (!row?.id) return;
    this.router.navigate(['/apps/loans', row.id]); // ajusta el path a tu routing real
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
      if (result === 'created') {
        this.loadMyLoans(); // recarga la lista después de crear un nuevo préstamo
      }
    });
  }
}
