import { Component } from '@angular/core';

// components
import { AppWelcomeCardComponent } from '../../../components/dashboard2/welcome-card/welcome-card.component';
import { AppPaymentsComponent } from '../../../components/dashboard2/payments/payments.component';
import { DriverDashboardComponent } from '../../../components/dashboard2/driverDashboard/driver-dashboard.component';
import { AppRevenueUpdatesTwoComponent } from '../../../components/dashboard2/bestWorstDriver/bestWorstDriver.component';
import { AppWarehouseVolumen } from '../../../components/dashboard2/warehouseVolumen/warehouses-volumen.component';
import { AppTotalEarningsComponent } from '../../../components/dashboard2/total-earnings/total-earnings.component';
import { AppSalesProfitComponent } from '../../../components/dashboard2/weckly/sales-profit.component';
import { AppMonthlyEarningsTwoComponent } from '../../../components/dashboard2/monthly-earnings/monthly-earnings.component';
import { AppWeeklyStatsComponent } from '../../../components/dashboard1/weekly-stats/weekly-stats.component';
import { AppYearlySalesComponent } from '../../../components/dashboard2/yearly-sales/yearly-sales.component';
import { AppPunchesSummary } from '../../../components/dashboard2/punchesSummary/punches-summary.component';
import { AppRecentTransactionsComponent } from '../../../components/dashboard2/recent-transactions/recent-transactions.component';
import { AppWarehouseRankingComponent } from '../../../components/dashboard2/warehouseRanking/warehouse-ranking.component';
import { CoreService, WarehouseGrossRow } from 'src/app/services/core.service';
import { CommonModule } from '@angular/common';
import { DriverRoutesComponent } from "../../../components/dashboard2/driver-routes/driver-routes.component";
import { AppFullcalendarComponent } from '../../apps/fullcalendar/fullcalendar.component';
import { AppEmployeeSalaryComponent } from 'src/app/components/dashboard2/employee-salary/employee-salary.component';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { ReportService } from 'src/app/services/report.service';

@Component({
  selector: 'app-dashboard2',
  imports: [
    DriverDashboardComponent,
    AppRevenueUpdatesTwoComponent,
    AppWarehouseVolumen,
    AppTotalEarningsComponent,
    AppFullcalendarComponent,
    AppPunchesSummary,
    AppEmployeeSalaryComponent,
    /*AppSalesProfitComponent,
    AppMonthlyEarningsTwoComponent,
   AppWeeklyStatsComponent,
 
   
    AppRecentTransactionsComponent,*/
    AppYearlySalesComponent,
    AppWarehouseRankingComponent,
    CommonModule,
    DriverRoutesComponent,
    TablerIconsModule,
    MaterialModule
  ],
  templateUrl: './dashboard2.component.html',
  styleUrls: ['./dashboard2.component.scss']
})
export class AppDashboard2Component {
  grossByWarehouse: WarehouseGrossRow[] = [];
  totalGross = 0;
  grossPercent = 0;

  activeWarehouses = 0;
  warehousesThisMonth = 0;

  stopsToday = 0;
  stopsPercent = 0;

  avgLos = 0;
  losPercent = 0;
  isAssistant: boolean = false;
  isDriver: boolean = false;

  abs(value: number): number {
    return Math.abs(Number(value || 0));
  }

  constructor(private core: CoreService, private report: ReportService) { }
  role: string;

  ngOnInit(): void {
    this.role = this.core.getRole();
    this.isAssistant = localStorage.getItem('role') === 'Assistant';
    this.isDriver = localStorage.getItem('role') === 'Driver';
    
    
    this.core.latestGrossAmountByWarehouse().subscribe({
      next: (rows) => (this.grossByWarehouse = rows ?? []),
      error: (err) => console.error('latestGrossAmountByWarehouse failed', err),
    });
    this.loadDashboardKpis();
  }


  loadDashboardKpis(): void {
    this.report.getDashboardKpis().subscribe({
      next: (res: any) => {
        this.totalGross = res.totalGross ?? 0;
        this.grossPercent = res.grossPercent ?? 0;

        this.activeWarehouses = res.activeWarehouses ?? 0;
        this.warehousesThisMonth = res.warehousesThisMonth ?? 0;

        this.stopsToday = res.stopsYesterday ?? 0;

        this.stopsPercent = res.stopsPercent ?? 0;

        this.avgLos = res.avgLosYesterday ?? 0;
        this.losPercent = res.losPercent ?? 0;
      },
      error: () => {
        this.totalGross = 0;
        this.grossPercent = 0;
        this.activeWarehouses = 0;
        this.warehousesThisMonth = 0;
        this.stopsToday = 0;
        this.stopsPercent = 0;
        this.avgLos = 0;
        this.losPercent = 0;
      }
    });
  }
}

