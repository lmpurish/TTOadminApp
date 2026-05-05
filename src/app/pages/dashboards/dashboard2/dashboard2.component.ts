import { Component } from '@angular/core';

// components
import { AppWelcomeCardComponent } from '../../../components/dashboard2/welcome-card/welcome-card.component';
import { AppPaymentsComponent } from '../../../components/dashboard2/payments/payments.component';
import { AppProductsComponent } from '../../../components/dashboard2/products/products.component';
import { AppRevenueUpdatesTwoComponent } from '../../../components/dashboard2/bestWorstDriver/bestWorstDriver.component';
import { AppSalesOverviewComponent } from '../../../components/dashboard2/sales-overview/sales-overview.component';
import { AppTotalEarningsComponent } from '../../../components/dashboard2/total-earnings/total-earnings.component';
import { AppSalesProfitComponent } from '../../../components/dashboard2/weckly/sales-profit.component';
import { AppMonthlyEarningsTwoComponent } from '../../../components/dashboard2/monthly-earnings/monthly-earnings.component';
import { AppWeeklyStatsComponent } from '../../../components/dashboard1/weekly-stats/weekly-stats.component';
import { AppYearlySalesComponent } from '../../../components/dashboard2/yearly-sales/yearly-sales.component';
import { AppPaymentGatewaysComponent } from '../../../components/dashboard2/payment-gateways/payment-gateways.component';
import { AppRecentTransactionsComponent } from '../../../components/dashboard2/recent-transactions/recent-transactions.component';
import { AppTopProjectsComponent } from '../../../components/dashboard2/top-projects/top-projects.component';
import { CoreService, WarehouseGrossRow } from 'src/app/services/core.service';
import { CommonModule } from '@angular/common';
import { DriverRoutesComponent } from "../../../components/dashboard2/driver-routes/driver-routes.component";
import { AppFullcalendarComponent } from '../../apps/fullcalendar/fullcalendar.component';
import { AppEmployeeSalaryComponent } from 'src/app/components/dashboard2/employee-salary/employee-salary.component';

@Component({
  selector: 'app-dashboard2',
  imports: [
    AppProductsComponent,
    AppRevenueUpdatesTwoComponent,
    AppSalesOverviewComponent,
    AppTotalEarningsComponent,
    AppFullcalendarComponent,
    AppPaymentGatewaysComponent,
    AppEmployeeSalaryComponent,
    /*AppSalesProfitComponent,
    AppMonthlyEarningsTwoComponent,
   AppWeeklyStatsComponent,
 
   
    AppRecentTransactionsComponent,*/
    AppYearlySalesComponent,
    AppTopProjectsComponent,
    CommonModule,
    DriverRoutesComponent
  ],
  templateUrl: './dashboard2.component.html',
})
export class AppDashboard2Component {
  grossByWarehouse: WarehouseGrossRow[] = [];

  constructor(private core: CoreService) { }
  role: string;

  ngOnInit(): void {
    this.role = this.core.getRole();
    this.core.latestGrossAmountByWarehouse().subscribe({
      next: (rows) => (this.grossByWarehouse = rows ?? []),
      error: (err) => console.error('latestGrossAmountByWarehouse failed', err),
    });
  }
}
