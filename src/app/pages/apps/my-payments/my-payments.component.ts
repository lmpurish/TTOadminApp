import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TablerIconComponent } from 'angular-tabler-icons';
import { NgxRolesService, NgxPermissionsService } from 'ngx-permissions';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { PayrollService } from 'src/app/services/payroll.service';

@Component({
  selector: 'app-my-payment',
  templateUrl: './my-payments.component.html',
  styleUrls: ['./my-payments.component.scss'],
  imports: [MaterialModule, CommonModule, FormsModule, ReactiveFormsModule, MatButtonToggleModule, RouterModule, CurrencyPipe, DatePipe],
  providers: []
})
export class AppMyPaymentsComponent implements OnInit {
  currentRole!: string;
  loading = false;
  currentPermissions!: string[];
  summary: any = null;
  history: any[] = [];
  monthly: any = null;

  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  permissionsOfRole: any = {
    ADMIN: ['canAdd', 'canDelete', 'canEdit', 'canRead'],
    MANAGER: ['canAdd', 'canEdit', 'canRead'],
    GUEST: ['canRead'],
  };

  private readonly _destroy$ = new Subject<void>();

  constructor(
    private rolesSrv: NgxRolesService,
    private permissionsSrv: NgxPermissionsService,
    private driverPayrollService: PayrollService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentRole = 'ADMIN';
    this.currentPermissions = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    this.loadDashboard();
  }

  onPermissionChange() {
    this.currentPermissions = this.permissionsOfRole[this.currentRole];
    this.rolesSrv.flushRolesAndPermissions();
    this.rolesSrv.addRoleWithPermissions(
      this.currentRole,
      this.currentPermissions
    );
  }

  loadDashboard(): void {
    this.loading = true;

    this.driverPayrollService.getMyPaidSummary().subscribe({
      next: (res) => {
        this.summary = res;
      },
      error: (err) => {
        console.error('Error loading summary', err);
      }
    });

    this.driverPayrollService.getMyPaidHistory().subscribe({
      next: (res) => {
        this.history = res || [];
      },
      error: (err) => {
        console.error('Error loading history', err);
      }
    });

    this.driverPayrollService
      .getMyPaidMonthly(this.selectedYear, this.selectedMonth)
      .subscribe({
        next: (res) => {
          this.monthly = res;
          this.loading = false;
          console.log(res)
        },
        error: (err) => {
          console.error('Error loading monthly payroll', err);
          this.loading = false;
        }
      });
  }

  get lastPayment() {
    return this.summary?.lastPayment;
  }

  get totalCollected(): number {
    return this.summary?.totalCollected || 0;
  }

  get totalGross(): number {
    return this.summary?.totalGross || 0;
  }

  get totalDeductions(): number {
    return this.summary?.totalDeductions || 0;
  }

  get paidPeriods(): number {
    return this.summary?.paidPeriods || 0;
  }

  get monthlyTotal(): number {
    return this.monthly?.totalCollected || 0;
  }

  get monthlyPayments(): any[] {
    return this.monthly?.payments || [];
  }

  getMonthLabel(month: number): string {
    const date = new Date(this.selectedYear, month - 1, 1);
    return date.toLocaleString('en-US', { month: 'long' });
  }

  downloadReceipt(payRunId: number): void {
    console.log('Download receipt:', payRunId);
  }

  viewDetails(payRunId: number): void {
    this.router.navigate(['/apps/my-payment-details', payRunId]);
  }
}



@Component({
  selector: 'app-driver-payroll-detail',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TablerIconComponent,
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './payroll-detail-dialog.component.html',
  styleUrls: ['./my-payments-details.component.scss']
})
export class EmployeePayrollDetailComponent implements OnInit {

  loading = false;
  payRun: any = null;

  displayedColumns = [
    'routeDate',
    'sourceType',
    'description',
    'qty',
    'rate',
    'amount'
  ];

  constructor(
    private route: ActivatedRoute,
    private payrollService: PayrollService
  ) { }

  ngOnInit(): void {

    const payRunId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!payRunId) {
      return;
    }

    this.loadPayroll(payRunId);
  }

  loadPayroll(payRunId: number): void {

    this.loading = true;

    this.payrollService
      .getMyPaidDetail(payRunId)
      .subscribe({
        next: (res) => {
          this.payRun = res;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  get totalRoutes(): number {

    console.log(this.payRun.lines)
    if (!this.payRun?.lines) {
      return 0;
    }

    return new Set(
      this.payRun.lines
        .filter((x: any) => x.sourceType === 'Earning')
        .map((x: any) => x.sourceId)
    ).size;
  }

  get totalStops(): number {

    if (!this.payRun?.lines) {
      return 0;
    }

    return this.payRun.lines
      .reduce((sum: number, x: any) => sum + (x.qty || 0), 0);
  }

  get totalLines(): number {
    return this.payRun?.lines?.length || 0;
  }

  get totalAdjustments(): number {
    return this.payRun?.adjustments || 0;
  }
}
