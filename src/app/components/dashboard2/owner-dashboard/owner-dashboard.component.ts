import {
  CommonModule,
  CurrencyPipe,
  DecimalPipe
} from '@angular/common';

import {
  Component,
  OnInit
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatCardModule
} from '@angular/material/card';

import {
  MatDatepickerModule
} from '@angular/material/datepicker';

import {
  MatNativeDateModule
} from '@angular/material/core';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import { MatSpinner } from '@angular/material/progress-spinner';
import {
  TablerIconsModule
} from 'angular-tabler-icons';

import {
  FinanceService,
  OwnerDashboardResponse,
  WarehouseFinancialPerformance
} from 'src/app/services/finance.service';

type FinancialPeriod =
  | 'currentWeek'
  | 'lastWeek'
  | 'last4Weeks'
  | 'month'
  | 'custom';

interface WarehouseOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TablerIconsModule
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.scss'
})
export class OwnerDashboardComponent implements OnInit {

  loading = false;
  errorMessage = '';

  /*
   * Fechas enviadas al backend.
   * Formato: YYYY-MM-DD
   */
  startDate = '';
  endDate = '';

  /*
   * Valores usados por Angular Material.
   */
  startDateObj: Date | null = null;
  endDateObj: Date | null = null;

  warehouseId?: number;

  warehouseSearch = '';

  warehouseOptions: WarehouseOption[] = [];

  selectedPeriod: FinancialPeriod = 'currentWeek';

  todayLabel = '';
  periodLabel = '';

  payPeriodCount = 0;

  totalRevenue = 0;
  totalExpenses = 0;
  totalPayroll = 0;
  netProfit = 0;
  margin = 0;
  totalPackages = 0;
  avgPaidPerPackage = 0;
  profitPerPackage = 0;

  warehousePerformance: WarehouseFinancialPerformance[] = [];

  bestWarehouse: WarehouseFinancialPerformance | null = null;
  worstWarehouse: WarehouseFinancialPerformance | null = null;

  constructor(
    private service: FinanceService
  ) { }

  ngOnInit(): void {
    this.setTodayLabel();
    this.setCurrentPayrollWeek();
    this.loadDashboard();
  }

  loadDashboard(): void {
    if (!this.startDate || !this.endDate) {
      this.errorMessage =
        'Start date and end date are required.';

      return;
    }

    if (
      this.startDateObj &&
      this.endDateObj &&
      this.startDateObj > this.endDateObj
    ) {
      this.errorMessage =
        'Start date cannot be greater than end date.';

      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.service
      .getOwnerDashboard(
        this.startDate,
        this.endDate,
        this.warehouseId
      )
      .subscribe({
        next: (res: OwnerDashboardResponse) => {
          this.applyResponse(res);
          this.loading = false;
        },
        error: error => {
          console.error(
            'Error loading owner dashboard:',
            error
          );

          this.resetDashboard();

          this.errorMessage =
            error?.error?.message ??
            'Unable to load the financial dashboard.';

          this.loading = false;
        }
      });
  }

  /*
   * Ejecutado por los botones:
   * This Week, Last Week, Last 4 Weeks y This Month.
   */
  selectPeriod(
    period: FinancialPeriod
  ): void {
    this.selectedPeriod = period;

    switch (period) {
      case 'currentWeek':
        this.setCurrentPayrollWeek();
        break;

      case 'lastWeek':
        this.setLastPayrollWeek();
        break;

      case 'last4Weeks':
        this.setLastFourWeeks();
        break;

      case 'month':
        this.setCurrentMonth();
        break;

      case 'custom':
        return;
    }

    this.loadDashboard();
  }

  /*
   * Ejecutado cuando se cierra el date range picker.
   */
  applyCustomDateRange(): void {
    if (!this.startDateObj || !this.endDateObj) {
      return;
    }

    if (this.startDateObj > this.endDateObj) {
      this.errorMessage =
        'Start date cannot be greater than end date.';

      return;
    }

    this.selectedPeriod = 'custom';
    this.errorMessage = '';

    this.setDateValues(
      this.startDateObj,
      this.endDateObj
    );

    this.loadDashboard();
  }

  /*
   * Puedes mantener este método si también usas
   * date pickers individuales.
   */
  onDateChange(): void {
    this.applyCustomDateRange();
  }

  onWarehouseChange(): void {
    this.loadDashboard();
  }

  changeWarehouse(
    warehouseId?: number
  ): void {
    this.warehouseId = warehouseId;
    this.loadDashboard();
  }

  showAllWarehouses(): void {
    this.warehouseId = undefined;
    this.loadDashboard();
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  exportDashboard(): void {
    console.log(
      'Export financial dashboard:',
      {
        startDate: this.startDate,
        endDate: this.endDate,
        warehouseId: this.warehouseId
      }
    );

    /*
     * Conecta aquí tu endpoint de exportación.
     *
     * Ejemplo:
     *
     * this.service
     *   .exportOwnerDashboard(
     *     this.startDate,
     *     this.endDate,
     *     this.warehouseId
     *   )
     *   .subscribe(...);
     */
  }

  private applyResponse(
    res: OwnerDashboardResponse
  ): void {
    this.startDate = this.normalizeApiDate(
      res.startDate ?? this.startDate
    );

    this.endDate = this.normalizeApiDate(
      res.endDate ?? this.endDate
    );

    this.startDateObj =
      this.fromYmd(this.startDate);

    this.endDateObj =
      this.fromYmd(this.endDate);

    this.updatePeriodLabel();

    this.payPeriodCount = Number(
      res.payPeriodCount ?? 0
    );

    this.totalRevenue = Number(
      res.totalRevenue ?? 0
    );

    this.totalExpenses = Number(
      res.totalExpenses ?? 0
    );

    this.totalPayroll = Number(
      res.totalPayroll ?? 0
    );

    this.netProfit = Number(
      res.netProfit ?? 0
    );

    this.margin = Number(
      res.margin ?? 0
    );

    this.totalPackages = Number(
      res.totalPackages ?? 0
    );

    this.avgPaidPerPackage = Number(
      res.avgPaidPerPackage ?? 0
    );

    this.profitPerPackage = Number(
      res.profitPerPackage ?? 0
    );

    this.warehousePerformance =
      (res.warehousePerformance ?? [])
        .map(row =>
          this.normalizeWarehouse(row)
        );

    this.bestWarehouse = res.bestWarehouse
      ? this.normalizeWarehouse(
        res.bestWarehouse
      )
      : null;

    this.worstWarehouse = res.worstWarehouse
      ? this.normalizeWarehouse(
        res.worstWarehouse
      )
      : null;

    /*
     * Llena el selector usando los almacenes
     * recibidos en el dashboard.
     */
    this.warehouseOptions =
      this.warehousePerformance
        .map(row => ({
          id: row.warehouseId,
          name: row.warehouse
        }))
        .filter(
          (
            warehouse,
            index,
            collection
          ) =>
            collection.findIndex(
              item => item.id === warehouse.id
            ) === index
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name)
        );
  }

  private normalizeWarehouse(
    row: WarehouseFinancialPerformance
  ): WarehouseFinancialPerformance {
    return {
      warehouseId: Number(
        row.warehouseId
      ),

      warehouse:
        row.warehouse ??
        'Unknown Warehouse',

      revenue: Number(
        row.revenue ?? 0
      ),

      expenses: Number(
        row.expenses ?? 0
      ),

      payroll: Number(
        row.payroll ?? 0
      ),

      profit: Number(
        row.profit ?? 0
      ),

      margin: Number(
        row.margin ?? 0
      ),

      packages: Number(
        row.packages ?? 0
      ),

      avgPaidPerPackage: Number(
        row.avgPaidPerPackage ?? 0
      ),

      profitPerPackage: Number(
        row.profitPerPackage ?? 0
      )
    };
  }

  /*
   * Semana actual de TTO:
   * sábado a viernes.
   */
  private setCurrentPayrollWeek(): void {
    const today = this.startOfDay(
      new Date()
    );

    const saturday =
      this.getPayrollWeekSaturday(today);

    const friday = new Date(saturday);

    friday.setDate(
      saturday.getDate() + 6
    );

    this.setDateValues(
      saturday,
      friday
    );
  }

  /*
   * Semana anterior:
   * sábado a viernes.
   */
  private setLastPayrollWeek(): void {
    const today = this.startOfDay(
      new Date()
    );

    const currentSaturday =
      this.getPayrollWeekSaturday(today);

    const previousSaturday =
      new Date(currentSaturday);

    previousSaturday.setDate(
      currentSaturday.getDate() - 7
    );

    const previousFriday =
      new Date(previousSaturday);

    previousFriday.setDate(
      previousSaturday.getDate() + 6
    );

    this.setDateValues(
      previousSaturday,
      previousFriday
    );
  }

  /*
   * Cuatro semanas operativas,
   * incluyendo la semana actual.
   */
  private setLastFourWeeks(): void {
    const today = this.startOfDay(
      new Date()
    );

    const currentSaturday =
      this.getPayrollWeekSaturday(today);

    const start =
      new Date(currentSaturday);

    start.setDate(
      currentSaturday.getDate() - 21
    );

    const end =
      new Date(currentSaturday);

    end.setDate(
      currentSaturday.getDate() + 6
    );

    this.setDateValues(
      start,
      end
    );
  }

  private setCurrentMonth(): void {
    const today = new Date();

    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    this.setDateValues(
      firstDay,
      lastDay
    );
  }

  private getPayrollWeekSaturday(
    date: Date
  ): Date {
    const result =
      this.startOfDay(new Date(date));

    const dayOfWeek =
      result.getDay();

    const daysSinceSaturday =
      dayOfWeek === 6
        ? 0
        : dayOfWeek + 1;

    result.setDate(
      result.getDate() -
      daysSinceSaturday
    );

    return result;
  }

  private setDateValues(
    start: Date,
    end: Date
  ): void {
    const normalizedStart =
      this.startOfDay(new Date(start));

    const normalizedEnd =
      this.startOfDay(new Date(end));

    this.startDateObj =
      normalizedStart;

    this.endDateObj =
      normalizedEnd;

    this.startDate =
      this.toYmd(normalizedStart);

    this.endDate =
      this.toYmd(normalizedEnd);

    this.updatePeriodLabel();
  }

  changeDateRange(
    startDate: string,
    endDate: string
  ): void {
    if (!startDate || !endDate) {
      return;
    }

    const start =
      this.fromYmd(startDate);

    const end =
      this.fromYmd(endDate);

    if (!start || !end) {
      this.errorMessage =
        'Invalid date range.';

      return;
    }

    if (start > end) {
      this.errorMessage =
        'Start date cannot be greater than end date.';

      return;
    }

    this.selectedPeriod = 'custom';

    this.setDateValues(
      start,
      end
    );

    this.loadDashboard();
  }

  getBarHeight(
    profit: number
  ): number {
    if (!this.warehousePerformance.length) {
      return 40;
    }

    const maximumProfit = Math.max(
      ...this.warehousePerformance.map(
        row => Math.abs(row.profit)
      ),
      1
    );

    const normalizedHeight =
      Math.abs(profit) /
      maximumProfit;

    return Math.max(
      45,
      Math.round(
        normalizedHeight * 180
      )
    );
  }

  abs(
    value: number
  ): number {
    return Math.abs(
      value ?? 0
    );
  }

  trackByWarehouseId(
    index: number,
    row: WarehouseFinancialPerformance
  ): number {
    return row.warehouseId;
  }

  private resetDashboard(): void {
    this.payPeriodCount = 0;

    this.totalRevenue = 0;
    this.totalExpenses = 0;
    this.totalPayroll = 0;
    this.netProfit = 0;
    this.margin = 0;
    this.totalPackages = 0;
    this.avgPaidPerPackage = 0;
    this.profitPerPackage = 0;

    this.warehousePerformance = [];

    this.bestWarehouse = null;
    this.worstWarehouse = null;
  }

  private setTodayLabel(): void {
    this.todayLabel =
      new Intl.DateTimeFormat(
        'en-US',
        {
          weekday: 'long',
          month: 'short',
          day: '2-digit'
        }
      ).format(new Date());
  }

  private updatePeriodLabel(): void {
    this.periodLabel =
      `${this.formatDate(this.startDate)} - ` +
      `${this.formatDate(this.endDate)}`;
  }

  /*
   * Date -> YYYY-MM-DD
   *
   * Importante: no uses toISOString(),
   * porque puede cambiar el día por UTC.
   */
  private toYmd(
    date: Date
  ): string {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /*
   * YYYY-MM-DD -> Date local.
   */
  private fromYmd(
    value: string
  ): Date | null {
    if (!value) {
      return null;
    }

    const normalized =
      this.normalizeApiDate(value);

    const [
      year,
      month,
      day
    ] = normalized
      .split('-')
      .map(Number);

    if (!year || !month || !day) {
      return null;
    }

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return this.startOfDay(date);
  }

  private normalizeApiDate(
    value: string
  ): string {
    return value
      ? value.substring(0, 10)
      : '';
  }

  private formatDate(
    value: string
  ): string {
    if (!value) {
      return '';
    }

    const datePart =
      this.normalizeApiDate(value);

    const [
      year,
      month,
      day
    ] = datePart.split('-');

    if (!year || !month || !day) {
      return value;
    }

    return `${month}/${day}/${year}`;
  }

  private startOfDay(
    date: Date
  ): Date {
    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  }
}