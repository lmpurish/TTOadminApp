import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  Optional,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';

import { ToastrService } from 'ngx-toastr';
import { TablerIconsModule } from 'angular-tabler-icons';

import { MaterialModule } from 'src/app/material.module';
import { CoreService } from 'src/app/services/core.service';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import {
  PayrollReadinessResponse,
  RouteAssignmentPayload,
  RoutesService
} from 'src/app/services/apps/routes/routes.service';

import { Routes } from './Routes';

@Component({
  selector: 'app-routes',
  standalone: true,
  templateUrl: './routes.component.html',
  styleUrl: './routes.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TablerIconsModule
  ]
})

export class RoutesComponent implements OnInit, AfterViewInit {

  @ViewChild(MatTable, { static: true })
  table!: MatTable<any>;

  @ViewChild(MatPaginator)
set matPaginator(paginator: MatPaginator) {
  if (!paginator) {
    return;
  }

  this.paginator = paginator;
  this.dataSource.paginator = paginator;
}

paginator!: MatPaginator;

  @ViewChild(MatAutocompleteTrigger)
  autocomplete!: MatAutocompleteTrigger;

  displayedColumns: string[] = [
    'select',
    'date',
    'routeStatus',
    'userId',
    'cnl',
    'volumen',
    'deliveryStops',
    'packagePercent',
    'zoneId',
    'action'
  ];

  routeStatuses: string[] = [
    'Available',
    'Assigned',
    'In Progress',
    'Future',
    'Completed',
    'Loading',
    'PendingCompletion',
    'Cancelled'
  ];

  dataSource = new MatTableDataSource<any>([]);

  allRoutes: any[] = [];
  weeklyRoutes: any[] = [];
  selectedRoutes: any[] = [];

  form: FormGroup;

  yesterday = new Date();
  selectedDate = '';

  loading = false;
  weekLoading = false;

  warehouses: any[] = [];
  warehouseId: number | null = null;
  isAdmin = false;

  zones: any[] = [];
  availableZones: any[] = [];
  selectedZones: number[] = [];

  usersMap = new Map<number, string>();

  drivers: Driver[] = [];
  filteredDrivers: Driver[] = [];
  availableDrivers: Driver[] = [];
  selectedDriverId: number | null = null;

  routesLoaded = false;
  driversLoaded = false;

  totalPackages = 0;
  totalStops = 0;
  activeDrivers = 0;
  avgPackagesPerDriver = 0;

  viewMode: 'calendar' | 'routes' = 'calendar';

  weekStart!: Date;
  weekEnd!: Date;
  weekDays: DailyRouteSummary[] = [];

  selectedOperationalDay?: Date;

  payrollReadiness: PayrollReadiness = this.emptyReadiness();

  constructor(
    private dialog: MatDialog,
    private routesService: RoutesService,
    private employeeService: EmployeeService,
    private settings: CoreService,
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private warehousesService: WarehouseService
  ) {
    this.yesterday.setDate(this.yesterday.getDate() - 1);

    this.form = this.fb.group({
      selectedDate: [this.yesterday],
      selectedWarehouse: [null]
    });
  }

  ngOnInit(): void {
    const userInfo = this.settings.getUserInfoFromToken();

    if (!userInfo) {
      this.settings.showError('Usuario no autenticado.');
      return;
    }

    this.isAdmin =
      userInfo.role === 'Admin' ||
      userInfo.role === 'CompanyOwner';

    this.warehouseId = this.toNumberOrNull(
      userInfo.WarehouseID ??
      userInfo.WarehouseID
    );

    this.yesterday = new Date();
    this.yesterday.setHours(0, 0, 0, 0);
    this.yesterday.setDate(this.yesterday.getDate() - 1);

    this.form = this.fb.group({
      selectedDate: [this.yesterday, Validators.required],
      selectedWarehouse: [
        this.isAdmin ? null : this.warehouseId
      ]
    });

    this.selectedDate = this.formatDateYmd(this.yesterday);
    this.setSelectedWeek(this.yesterday);

    if (this.isAdmin) {
      this.loadWarehouses();
    } else {
      this.loadUsers();
      this.loadZones();
      this.loadWeeklyRoutes();
    }

    this.form
      .get('selectedDate')
      ?.valueChanges
      .subscribe({
        next: value => {
          if (!value) {
            return;
          }

          const selected = this.normalizeDate(new Date(value));

          this.selectedDate = this.formatDateYmd(selected);
          this.setSelectedWeek(selected);
          this.selectedOperationalDay = selected;

          this.loadWeeklyRoutes();
        },
        error: error => {
          console.error('Error processing selected date:', error);
          this.settings.showError(
            'Ocurrió un error al procesar la fecha.'
          );
        }
      });

    this.form
      .get('selectedWarehouse')
      ?.valueChanges
      .subscribe(value => {
        if (!this.isAdmin) {
          return;
        }

        this.warehouseId = this.toNumberOrNull(value);

        if (!this.warehouseId) {
          this.clearRoutes();
          return;
        }

        this.drivers = [];
        this.filteredDrivers = [];

        this.loadUsers();
        this.loadZones();
        this.loadWeeklyRoutes();
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  private emptyReadiness(): PayrollReadiness {
    return {
      ready: false,
      totalRoutes: 0,
      completedRoutes: 0,
      missingDriverRoutes: 0,
      missingZoneRoutes: 0,
      pendingRoutes: 0,
      emptyRoutes: 0,
      missingDriverRateCount: 0,
      missingRevenueCount: 0,
      progress: 0,
      issues: []
    };
  }

  private clearRoutes(): void {
    this.allRoutes = [];
    this.weeklyRoutes = [];
    this.selectedRoutes = [];
    this.weekDays = [];
    this.payrollReadiness = this.emptyReadiness();

    this.updateDataSource([]);
    this.calculatePackageDistribution();
  }

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private getSaturdayForDate(date: Date): Date {
    const selected = this.normalizeDate(date);
    const currentDay = selected.getDay();

    const daysSinceSaturday =
      currentDay === 6
        ? 0
        : currentDay + 1;

    const saturday = new Date(selected);
    saturday.setDate(
      selected.getDate() - daysSinceSaturday
    );

    return this.normalizeDate(saturday);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return this.normalizeDate(result);
  }

  private normalizeStatus(status: unknown): string {
    return String(status ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  private isCompletedRoute(route: any): boolean {
    return this.normalizeStatus(route?.routeStatus) === 'completed';
  }
driverSearchText = '';


private normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

onDriverSelectOpened(opened: boolean): void {
  if (!opened) {
    this.driverSearchText = '';
  }
}
restoreDriverInput(
  input: HTMLInputElement,
  row: any
): void {
  setTimeout(() => {
    input.value = this.getDriverDisplay(row.userId);
  }, 150);
}
trackByDriverId(index: number, driver: any): number {
  return driver.id;
}
  private normalizeRoute(route: any): any {
    const rawUserId =
      route?.user?.id ??
      route?.userId ??
      route?.UserId ??
      route?.userID ??
      null;

    const rawZoneId =
      route?.zone?.id ??
      route?.zoneId ??
      route?.ZoneId ??
      null;

    const parsedUserId =
      rawUserId === null || rawUserId === undefined
        ? null
        : Number(rawUserId);

    const parsedZoneId =
      rawZoneId === null || rawZoneId === undefined
        ? null
        : Number(rawZoneId);

    return {
      ...route,

      userId:
        parsedUserId !== null &&
        Number.isFinite(parsedUserId)
          ? parsedUserId
          : null,

      zoneId:
        parsedZoneId !== null &&
        Number.isFinite(parsedZoneId)
          ? parsedZoneId
          : null,

      user: route?.user ?? null,
      zone: route?.zone ?? null,

      volumen: Number(route?.volumen ?? 0),
      deliveryStops: Number(
        route?.deliveryStops ?? 0
      ),
      cnl: Number(route?.cnl ?? 0),

      routeStatus:
        route?.routeStatus ??
        route?.status ??
        'Available',

      paymentType:
        route?.paymentType ??
        'PerStop',

      priceRoute: Number(
        route?.priceRoute ?? 0
      )
    };
  }

  setSelectedWeek(date: Date): void {
    this.weekStart = this.getSaturdayForDate(date);
    this.weekEnd = this.addDays(this.weekStart, 6);
  }

  previousWeek(): void {
    const newStart = this.addDays(
      this.weekStart,
      -7
    );

    this.setSelectedWeek(newStart);

    this.form.patchValue(
      {
        selectedDate: newStart
      },
      {
        emitEvent: false
      }
    );

    this.selectedDate = this.formatDateYmd(newStart);
    this.loadWeeklyRoutes();
  }

  nextWeek(): void {
    const newStart = this.addDays(
      this.weekStart,
      7
    );

    this.setSelectedWeek(newStart);

    this.form.patchValue(
      {
        selectedDate: newStart
      },
      {
        emitEvent: false
      }
    );

    this.selectedDate = this.formatDateYmd(newStart);
    this.loadWeeklyRoutes();
  }

  goToCurrentWeek(): void {
    const today = this.normalizeDate(new Date());

    this.setSelectedWeek(today);

    this.form.patchValue(
      {
        selectedDate: today
      },
      {
        emitEvent: false
      }
    );

    this.selectedDate = this.formatDateYmd(today);
    this.loadWeeklyRoutes();
  }

  showCalendar(): void {
    this.viewMode = 'calendar';
    this.selectedOperationalDay = undefined;

    this.updateDataSource([
      ...this.weeklyRoutes
    ]);

    this.calculatePackageDistribution();
    this.buildWeeklySummary();
    this.calculatePayrollReadiness();
  }

  openDay(day: DailyRouteSummary): void {
    this.selectedOperationalDay = day.date;
    this.viewMode = 'routes';

    this.form.patchValue(
      {
        selectedDate: day.date
      },
      {
        emitEvent: false
      }
    );

    this.selectedDate = this.formatDateYmd(day.date);
    this.filterTableBySelectedDay(day.date);
  }

  filterTableBySelectedDay(date: Date): void {
    const selectedYmd = this.formatDateYmd(date);

    const filtered = this.weeklyRoutes.filter(route => {
      if (!route?.date) {
        return false;
      }

      return this.formatDateYmd(
        new Date(route.date)
      ) === selectedYmd;
    });

    this.selectedRoutes = [];
    this.updateDataSource(filtered);
    this.calculatePackageDistribution();
    this.ensureAssignedDriversInOptions();
  }

  loadWeeklyRoutes(): void {
    if (!this.weekStart || !this.weekEnd) {
      return;
    }
const warehouseId = Number(
  this.isAdmin
    ? this.form.get('selectedWarehouse')?.value
    : this.warehouseId
);

if (!warehouseId) {
  this.settings.showError('Please select a warehouse.');
  return;
}

    if (this.isAdmin && !warehouseId) {
      this.clearRoutes();
      return;
    }

    const startDate = this.formatDateYmd(
      this.weekStart
    );

    const endDate = this.formatDateYmd(
      this.weekEnd
    );

    this.loading = true;
    this.weekLoading = true;

    this.routesService
      .getRoutesByRange(
        startDate,
        endDate,
        warehouseId
      )
      .subscribe({
        next: routes => {
          const normalized = (routes ?? [])
            .map(route => this.normalizeRoute(route))
            .filter(route =>
              Number(route.volumen ?? 0) !== 0 ||
              Number(route.deliveryStops ?? 0) !== 0
            );

          this.weeklyRoutes = normalized;
          this.allRoutes = normalized;
          this.selectedRoutes = [];

          if (
            this.viewMode === 'routes' &&
            this.selectedOperationalDay
          ) {
            this.filterTableBySelectedDay(
              this.selectedOperationalDay
            );
          } else {
            this.updateDataSource([
              ...normalized
            ]);
          }

          this.calculatePackageDistribution();
          this.ensureAssignedDriversInOptions();
          this.buildWeeklySummary();
          this.calculatePayrollReadiness();

          this.routesLoaded = true;
          this.loading = false;
          this.weekLoading = false;
        },
        error: error => {
          console.error(
            'Error loading weekly routes:',
            error
          );

          this.clearRoutes();

          this.loading = false;
          this.weekLoading = false;

          this.snackBar.open(
            error?.error?.message ||
            'Error loading weekly routes.',
            'Close',
            {
              duration: 5000,
              verticalPosition: 'top'
            }
          );
        }
      });
  }

  loadRoutesByDate(): void {
    const warehouseId = this.isAdmin
      ? this.toNumberOrNull(
          this.form.get('selectedWarehouse')?.value
        )
      : this.warehouseId;

    if (this.isAdmin && !warehouseId) {
      this.clearRoutes();
      return;
    }

    this.loading = true;

    this.routesService
      .getRoutesByDate(
        this.selectedDate,
        warehouseId
      )
      .subscribe({
        next: response => {
          const normalized = (response ?? [])
            .map(route => this.normalizeRoute(route))
            .filter(route =>
              Number(route.volumen ?? 0) !== 0 ||
              Number(route.deliveryStops ?? 0) !== 0
            );

          this.allRoutes = normalized;

          this.updateDataSource(normalized);
          this.calculatePackageDistribution();
          this.ensureAssignedDriversInOptions();

          this.loading = false;
        },
        error: error => {
          console.error(
            'Error loading routes by date:',
            error
          );

          this.allRoutes = [];
          this.updateDataSource([]);
          this.calculatePackageDistribution();

          this.loading = false;
        }
      });
  }

  buildWeeklySummary(): void {
    if (!this.weekStart) {
      this.weekDays = [];
      return;
    }

    this.weekDays = Array
      .from({ length: 7 })
      .map((_, index) => {
        const date = this.addDays(
          this.weekStart,
          index
        );

        const ymd = this.formatDateYmd(date);

        const dailyRoutes = this.weeklyRoutes.filter(
          route => {
            if (!route?.date) {
              return false;
            }

            return this.formatDateYmd(
              new Date(route.date)
            ) === ymd;
          }
        );

        const totalRoutes = dailyRoutes.length;

        const completedRoutes = dailyRoutes.filter(
          route => this.isCompletedRoute(route)
        ).length;

        const assignedRoutes = dailyRoutes.filter(
          route => !!route.userId
        ).length;

        const missingDriverRoutes = dailyRoutes.filter(
          route =>
            this.isCompletedRoute(route) &&
            !route.userId
        ).length;

        const missingZoneRoutes = dailyRoutes.filter(
          route =>
            this.isCompletedRoute(route) &&
            !route.zoneId
        ).length;

        const pendingRoutes = dailyRoutes.filter(
          route => !this.isCompletedRoute(route)
        ).length;

        const totalPackages = dailyRoutes.reduce(
          (sum, route) =>
            sum + Number(route.volumen ?? 0),
          0
        );

        const totalStops = dailyRoutes.reduce(
          (sum, route) =>
            sum + Number(route.deliveryStops ?? 0),
          0
        );

        const completionPercent =
          totalRoutes > 0
            ? Math.round(
                (completedRoutes / totalRoutes) * 100
              )
            : 0;

        const assignmentPercent =
          totalRoutes > 0
            ? Math.round(
                (assignedRoutes / totalRoutes) * 100
              )
            : 0;

        const payrollReady =
          totalRoutes > 0 &&
          completedRoutes === totalRoutes &&
          missingDriverRoutes === 0 &&
          missingZoneRoutes === 0;

        return {
          date,
          totalPackages,
          totalStops,
          totalRoutes,
          completedRoutes,
          assignedRoutes,
          missingDriverRoutes,
          missingZoneRoutes,
          pendingRoutes,
          completionPercent,
          assignmentPercent,
          payrollReady
        };
      });
  }

  calculatePayrollReadiness(): void {
    const routes = this.weeklyRoutes;

    const completedRoutes = routes.filter(
      route => this.isCompletedRoute(route)
    );

    const missingDriverRoutes = completedRoutes.filter(
      route => !route.userId
    ).length;

    const missingZoneRoutes = completedRoutes.filter(
      route => !route.zoneId
    ).length;

    const pendingRoutes = routes.filter(
      route => !this.isCompletedRoute(route)
    ).length;

    const emptyRoutes = completedRoutes.filter(
      route =>
        Number(route.volumen ?? 0) <= 0 ||
        Number(route.deliveryStops ?? 0) <= 0
    ).length;

    const missingDriverRateCount =
      this.payrollReadiness.missingDriverRateCount ?? 0;

    const missingRevenueCount =
      this.payrollReadiness.missingRevenueCount ?? 0;

    const issues: string[] = [];

    if (routes.length === 0) {
      issues.push(
        'There are no routes for this week.'
      );
    }

    if (missingDriverRoutes > 0) {
      issues.push(
        `${missingDriverRoutes} completed route(s) without driver.`
      );
    }

    if (missingZoneRoutes > 0) {
      issues.push(
        `${missingZoneRoutes} completed route(s) without route or zone.`
      );
    }

    if (pendingRoutes > 0) {
      issues.push(
        `${pendingRoutes} route(s) are not completed.`
      );
    }

    if (emptyRoutes > 0) {
      issues.push(
        `${emptyRoutes} completed route(s) have no packages or stops.`
      );
    }

    if (missingDriverRateCount > 0) {
      issues.push(
        `${missingDriverRateCount} driver(s) do not have a payroll rate.`
      );
    }

    if (missingRevenueCount > 0) {
      issues.push(
        `${missingRevenueCount} warehouse(s) are missing weekly revenue.`
      );
    }

    const checks = [
      routes.length > 0,
      pendingRoutes === 0,
      missingDriverRoutes === 0,
      missingZoneRoutes === 0,
      emptyRoutes === 0,
      missingDriverRateCount === 0,
      missingRevenueCount === 0
    ];

    const passedChecks = checks.filter(Boolean).length;

    this.payrollReadiness = {
      ready: issues.length === 0,
      totalRoutes: routes.length,
      completedRoutes: completedRoutes.length,
      missingDriverRoutes,
      missingZoneRoutes,
      pendingRoutes,
      emptyRoutes,
      missingDriverRateCount,
      missingRevenueCount,
      progress: Math.round(
        (passedChecks / checks.length) * 100
      ),
      issues
    };
  }

  loadPayrollReadinessFromServer(): void {
    if (!this.weekStart || !this.weekEnd) {
      return;
    }

    const warehouseId = this.isAdmin
      ? this.toNumberOrNull(
          this.form.get('selectedWarehouse')?.value
        )
      : this.warehouseId;

    this.routesService
      .getPayrollReadiness(
        this.formatDateYmd(this.weekStart),
        this.formatDateYmd(this.weekEnd),
        warehouseId
      )
      .subscribe({
        next: response => {
          this.payrollReadiness = {
            ready: response.ready,
            totalRoutes: response.totalRoutes,
            completedRoutes: response.completedRoutes,
            missingDriverRoutes:
              response.missingDriverRoutes,
            missingZoneRoutes:
              response.missingZoneRoutes,
            pendingRoutes: response.pendingRoutes,
            emptyRoutes: response.emptyRoutes,
            missingDriverRateCount:
              response.missingDriverRateCount,
            missingRevenueCount:
              response.missingRevenueCount,
            progress: response.progress,
            issues: response.issues ?? []
          };
        },
        error: error => {
          console.error(
            'Error loading payroll readiness:',
            error
          );
        }
      });
  }

  runPayrollForWeek(): void {
    if (!this.payrollReadiness.ready) {
      this.snackBar.open(
        'The week is not ready for payroll.',
        'Close',
        {
          duration: 4000,
          verticalPosition: 'top'
        }
      );
      return;
    }

    this.snackBar.open(
      `Week ${this.formatDateYmd(this.weekStart)} to ${this.formatDateYmd(this.weekEnd)} is ready for payroll.`,
      'Close',
      {
        duration: 4000,
        verticalPosition: 'top'
      }
    );

    /*
     * Aquí puedes navegar al módulo de payroll:
     *
     * this.router.navigate(['/apps/payroll'], {
     *   queryParams: {
     *     startDate: this.formatDateYmd(this.weekStart),
     *     endDate: this.formatDateYmd(this.weekEnd),
     *     warehouseId: this.warehouseId
     *   }
     * });
     */
  }

  getWeeklyPackages(): number {
    return this.weekDays.reduce(
      (sum, day) => sum + day.totalPackages,
      0
    );
  }

  getWeeklyStops(): number {
    return this.weekDays.reduce(
      (sum, day) => sum + day.totalStops,
      0
    );
  }

  formatDate(date: Date): string {
    return this.formatDateYmd(date);
  }

  formatDateYmd(date: Date): string {
    const normalized = new Date(date);

    const year = normalized.getFullYear();
    const month = String(
      normalized.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      normalized.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private updateDataSource(data: any[]): void {
    this.dataSource = new MatTableDataSource<any>(
      data
    );

    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }

    this.cdRef.detectChanges();
  }

  calculatePackageDistribution(): void {
    const routes = this.dataSource.data ?? [];

    this.totalPackages = routes.reduce(
      (sum, route) =>
        sum + Number(route.volumen ?? 0),
      0
    );

    this.totalStops = routes.reduce(
      (sum, route) =>
        sum + Number(route.deliveryStops ?? 0),
      0
    );

    const uniqueDriverIds = new Set<number>(
      routes
        .filter(route => !!route.userId)
        .map(route => Number(route.userId))
        .filter(id => Number.isFinite(id))
    );

    this.activeDrivers = uniqueDriverIds.size;

    this.avgPackagesPerDriver =
      this.activeDrivers > 0
        ? this.totalPackages / this.activeDrivers
        : 0;
  }

  updateSummaryTotals(): void {
    this.calculatePackageDistribution();
  }

  getPackagePercent(route: any): number {
    if (!this.totalPackages) {
      return 0;
    }

    return (
      Number(route.volumen ?? 0) /
      this.totalPackages
    ) * 100;
  }

  loadWarehouses(): void {
    this.warehousesService
      .getWarehouses()
      .subscribe({
        next: response => {
          this.warehouses = response ?? [];

          if (
            this.warehouses.length > 0 &&
            !this.form.get('selectedWarehouse')?.value
          ) {
            this.form
              .get('selectedWarehouse')
              ?.setValue(
                this.warehouses[0].id
              );
          }
        },
        error: error => {
          this.settings.showError(
            error?.error?.message ||
            'Error loading warehouses'
          );
        }
      });
  }

  loadUsers(): void {
    const warehouseId = this.isAdmin
      ? this.toNumberOrNull(
          this.form.get('selectedWarehouse')?.value
        )
      : this.warehouseId;

    if (!warehouseId) {
      this.drivers = [];
      this.filteredDrivers = [];
      return;
    }

    this.employeeService
      .getDriverbyWarehouse(warehouseId)
      .subscribe({
        next: response => {
          this.drivers = (response ?? [])
            .map((driver: any) => {
              const rawId =
                driver?.id ??
                driver?.Id ??
                driver?.userId ??
                driver?.UserId ??
                null;

              const id = rawId === null
                ? NaN
                : Number(
                    String(rawId).trim()
                  );

              return {
                id,
                name:
                  driver?.name ??
                  driver?.firstName ??
                  'Driver',
                lastName:
                  driver?.lastName ??
                  driver?.surname ??
                  '',
                identificationNumber:
                  driver?.identificationNumber ??
                  driver?.driverNumber ??
                  undefined
              };
            })
            .filter(driver =>
              Number.isFinite(driver.id) &&
              driver.id > 0
            );

          this.ensureAssignedDriversInOptions();
          this.filteredDrivers = [
            ...this.drivers
          ];

          this.driversLoaded = true;
        },
        error: error => {
          console.error(
            'Error loading drivers:',
            error
          );

          this.drivers = [];
          this.filteredDrivers = [];
        }
      });
  }

  filterDrivers(search = ''): void {
    const value = String(search ?? '')
      .toLowerCase()
      .trim();

    if (!value) {
      this.filteredDrivers = [
        ...this.drivers
      ];
      return;
    }

    this.filteredDrivers = this.drivers.filter(
      driver =>
        `${driver.name ?? ''} ${driver.lastName ?? ''}`
          .toLowerCase()
          .includes(value) ||
        `${driver.identificationNumber ?? ''}`
          .toLowerCase()
          .includes(value)
    );
  }

  ensureAssignedDriversInOptions(): void {
    if (!this.allRoutes?.length) {
      return;
    }

    const byId = new Map<number, Driver>(
      this.drivers.map(driver => [
        Number(driver.id),
        driver
      ])
    );

    for (const route of this.allRoutes) {
      const rawUserId =
        route?.user?.id ??
        route?.userId ??
        route?.UserId ??
        route?.userID ??
        null;

      const userId = Number(rawUserId);

      if (
        !Number.isFinite(userId) ||
        byId.has(userId) ||
        !route?.user
      ) {
        continue;
      }

      const candidate: Driver = {
        id: userId,
        name:
          route.user.name ??
          'Driver',
        lastName:
          route.user.lastName ??
          '',
        identificationNumber:
          route.user.identificationNumber ??
          undefined
      };

      this.drivers.push(candidate);
      byId.set(userId, candidate);
    }

    this.drivers = this.drivers.filter(
      driver =>
        Number.isFinite(driver.id) &&
        driver.id > 0
    );

    this.filteredDrivers = [
      ...this.drivers
    ];
  }

  mergeAssignedDriversIntoList(): void {
    this.ensureAssignedDriversInOptions();
  }

  loadZones(): void {
    const userInfo =
      this.settings.getUserInfoFromToken();

    if (!userInfo) {
      this.settings.showError(
        'Usuario no autenticado.'
      );
      return;
    }

    const warehouseId = this.isAdmin
      ? this.toNumberOrNull(
          this.form.get('selectedWarehouse')?.value
        )
      : this.toNumberOrNull(
          userInfo.WarehouseID ??
          userInfo.WarehouseID
        );

    if (!warehouseId) {
      if (this.isAdmin) {
        this.settings.showError(
          'Debe seleccionar un almacén.'
        );
      }

      this.zones = [];
      return;
    }

    this.routesService
      .getZonesByWarehouse(warehouseId)
      .subscribe({
        next: response => {
          this.zones = response ?? [];
          this.availableZones = [
            ...this.zones
          ];
        },
        error: error => {
          console.error(
            'Error loading zones:',
            error
          );

          this.zones = [];
          this.availableZones = [];

          this.settings.showError(
            'Error cargando zonas.'
          );
        }
      });
  }

  getAvailableZones(
    selectedZoneId: number | null
  ): any[] {
    return this.zones ?? [];
  }

  getUserName(id: number): string {
    return this.usersMap.get(id) || 'Unknown';
  }

getDriverDisplay(
  userId: number | null
): string {
  if (!userId) {
    return '';
  }

  const driver = this.getDriverById(userId);

  if (!driver) {
    return '';
  }

  const fullName =
    `${driver.name ?? ''} ${driver.lastName ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();

  const number =
    driver.identificationNumber
      ? ` · ${driver.identificationNumber}`
      : '';

  return `${fullName}${number}`;
}

  getDriverById(
    id: number | string | null | undefined
  ): Driver | null {
    if (id === null || id === undefined) {
      return null;
    }

    const numericId = Number(id);

    return this.drivers.find(
      driver => Number(driver.id) === numericId
    ) ?? null;
  }

  getDriverNumber(
    driverId: number | null | undefined
  ): string | null {
    if (!driverId) {
      return null;
    }

    const driver = this.drivers.find(
      item => item.id === driverId
    );

    return driver?.identificationNumber ?? null;
  }

  compareIds = (
    first: any,
    second: any
  ): boolean =>
    first != null &&
    second != null &&
    Number(first) === Number(second);

  handleDriverChange(
    element: any,
    selectedUserId: any
  ): void {
    const cleaned =
      selectedUserId === '' ||
      selectedUserId === 'null' ||
      selectedUserId === undefined
        ? null
        : selectedUserId;

    const userId =
      cleaned === null
        ? null
        : Number(cleaned);

    if (
      userId !== null &&
      !Number.isFinite(userId)
    ) {
      element.userId = null;
      element.user = null;

      this.snackBar.open(
        'Driver inválido. Intenta de nuevo.',
        'Close',
        {
          duration: 2500
        }
      );

      this.refreshCurrentTable();
      return;
    }

    element.userId = userId;

    element.user =
      userId !== null
        ? this.drivers.find(
            driver => driver.id === userId
          ) ?? null
        : null;

    this.selectRouteIfNeeded(element);
    this.syncEditedRoute(element);
  }

  handleZoneChange(
    element: any,
    selectedZoneId: number | null
  ): void {
    element.zoneId =
      this.toNumberOrNull(selectedZoneId);

    element.zone = element.zoneId
      ? this.zones.find(
          zone => Number(zone.id) === element.zoneId
        ) ?? null
      : null;

    this.selectRouteIfNeeded(element);
    this.syncEditedRoute(element);
  }

  handleStatusChange(
    element: any,
    nextStatus: string
  ): void {
    if (
      !this.routeStatuses.includes(nextStatus)
    ) {
      return;
    }

    element.routeStatus = nextStatus;

    this.selectRouteIfNeeded(element);
    this.syncEditedRoute(element);
  }

  handlePaymentTypeChange(
    element: any,
    value: 'PerStop' | 'PerRoute'
  ): void {
    element.paymentType = value;

    if (value !== 'PerRoute') {
      element.priceRoute = 0;
    }

    this.selectRouteIfNeeded(element);
    this.syncEditedRoute(element);
  }

  handlePriceRouteChange(
    element: any
  ): void {
    element.priceRoute =
      Number(element.priceRoute) || 0;

    this.selectRouteIfNeeded(element);
    this.syncEditedRoute(element);
  }

  private selectRouteIfNeeded(
    route: any
  ): void {
    if (!this.isSelected(route)) {
      this.selectedRoutes.push(route);
    }
  }

  private syncEditedRoute(
    updatedRoute: any
  ): void {
    const weeklyIndex =
      this.weeklyRoutes.findIndex(
        route => route.id === updatedRoute.id
      );

    if (weeklyIndex >= 0) {
      this.weeklyRoutes[weeklyIndex] = {
        ...this.weeklyRoutes[weeklyIndex],
        ...updatedRoute
      };
    }

    const allIndex = this.allRoutes.findIndex(
      route => route.id === updatedRoute.id
    );

    if (allIndex >= 0) {
      this.allRoutes[allIndex] = {
        ...this.allRoutes[allIndex],
        ...updatedRoute
      };
    }

    this.refreshCurrentTable();
    this.buildWeeklySummary();
    this.calculatePayrollReadiness();
    this.calculatePackageDistribution();
  }

  private refreshCurrentTable(): void {
    this.dataSource.data = [
      ...this.dataSource.data
    ];

    this.cdRef.detectChanges();
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Available':
        return 'st-available';

      case 'Assigned':
        return 'st-assigned';

      case 'In Progress':
        return 'st-progress';

      case 'Future':
        return 'st-future';

      case 'Completed':
        return 'st-completed';

      default:
        return 'st-default';
    }
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      Assigned:
        'bg-light-error text-error rounded f-w-600 p-x-6 p-y-4 f-s-12',

      'In Progress':
        'bg-light-warning text-warning rounded f-w-600 p-x-6 p-y-4 f-s-12',

      Future:
        'bg-light-secondary text-secondary rounded f-w-600 p-x-6 p-y-4 f-s-12',

      Completed:
        'bg-light-success text-success rounded f-w-600 p-x-6 p-y-4 f-s-12',

      Available:
        'bg-light-primary text-primary rounded f-w-600 p-x-6 p-y-4 f-s-12'
    };

    return classes[status] ??
      'bg-light-secondary text-secondary rounded f-w-600 p-x-6 p-y-4 f-s-12';
  }

  isRowEditable(row: any): boolean {
    return true;
  }

  getEditableRows(): any[] {
    return this.dataSource.data.filter(
      route => this.isRowEditable(route)
    );
  }

  toggleAllSelection(): void {
    const editableRows = this.getEditableRows();

    const allSelected =
      editableRows.length > 0 &&
      editableRows.every(route =>
        this.isSelected(route)
      );

    if (allSelected) {
      const editableIds = new Set(
        editableRows.map(route => route.id)
      );

      this.selectedRoutes =
        this.selectedRoutes.filter(
          route => !editableIds.has(route.id)
        );

      return;
    }

    const selectedIds = new Set(
      this.selectedRoutes.map(
        route => route.id
      )
    );

    for (const route of editableRows) {
      if (!selectedIds.has(route.id)) {
        this.selectedRoutes.push(route);
      }
    }
  }

  isAllSelected(): boolean {
    const editableRows = this.getEditableRows();

    return (
      editableRows.length > 0 &&
      editableRows.every(route =>
        this.isSelected(route)
      )
    );
  }

  toggleSelection(route: any): void {
    const index =
      this.selectedRoutes.findIndex(
        item => item.id === route.id
      );

    if (index === -1) {
      this.selectedRoutes.push(route);
    } else {
      this.selectedRoutes.splice(index, 1);
    }
  }

  isSelected(route: any): boolean {
    return this.selectedRoutes.some(
      item => item.id === route.id
    );
  }

  get isRoutesEmpty(): boolean {
    return this.selectedRoutes.length === 0;
  }

  assignRoutes(): void {
    if (!this.selectedRoutes.length) {
      this.snackBar.open(
        'No routes selected',
        'Close',
        {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'center'
        }
      );
      return;
    }

    if (this.selectedDriverId) {
      this.selectedRoutes.forEach(route => {
        route.userId =
          this.selectedDriverId;
      });
    }

    const payload: RouteAssignmentPayload[] =
      this.selectedRoutes.map(route => ({
        id: Number(route.id),

        zoneId: this.toNumberOrNull(
          route.zoneId
        ),

        cnl:
          route.cnl === null ||
          route.cnl === undefined
            ? null
            : Number(route.cnl),

        userId: this.toNumberOrNull(
          route.userId
        ),

        routeStatus:
          route.routeStatus ??
          'Available',

        paymentType:
          route.paymentType ??
          'PerStop',

        priceRoute:
          route.paymentType === 'PerRoute'
            ? Number(route.priceRoute ?? 0)
            : 0
      }));

    this.loading = true;

    this.routesService
      .assignRoutes(payload)
      .subscribe({
        next: () => {
          this.snackBar.open(
            'Routes updated successfully!',
            'Close',
            {
              duration: 3000,
              verticalPosition: 'top',
              horizontalPosition: 'center'
            }
          );

          this.selectedRoutes = [];
          this.loadWeeklyRoutes();
        },
        error: error => {
          this.loading = false;

          const payloadError = error?.error;

          const message =
            typeof payloadError === 'string'
              ? payloadError
              : payloadError?.message ||
                'Error updating routes';

          this.snackBar.open(
            message,
            'Close',
            {
              duration: 6000,
              verticalPosition: 'top'
            }
          );
        }
      });
  }

  toNumberOrNull(
    value: any
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue)
      ? numberValue
      : null;
  }

  editRoute(row: any): void {
    const dialogRef = this.dialog.open(
      RouteBonusDialogComponent,
      {
        width: '520px',
        autoFocus: false,
        data: {
          route: row
        }
      }
    );

    dialogRef
      .afterClosed()
      .subscribe(saved => {
        if (saved) {
          this.loadWeeklyRoutes();
        }
      });
  }

  createRoute(
    action: string,
    route: any
  ): void {
    const warehouseId = this.isAdmin
      ? this.toNumberOrNull(
          this.form.get('selectedWarehouse')?.value
        )
      : this.warehouseId;

    const dialogRef = this.dialog.open(
      RouteDialogContentComponent,
      {
        data: {
          action,
          warehouseId,
          local_data: {
            ...route
          }
        },
        autoFocus: false
      }
    );

    dialogRef
      .afterClosed()
      .subscribe(result => {
        if (
          result?.event === 'Refresh' ||
          result?.event === 'Update' ||
          result?.event === 'Delete'
        ) {
          this.loadWeeklyRoutes();
        }
      });
  }

  trackByZoneId(
    index: number,
    item: any
  ): number {
    return item.id;
  }

  onEditableToggle(row: any): void {
    // Reservado para edición manual por fila.
  }
}

@Component({
  selector: 'route-dialog-content',
  standalone: true,
  templateUrl: 'routes-dialog-content.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TablerIconsModule
  ]
})
export class RouteDialogContentComponent
  implements OnInit {

  action: string;
  local_data: Routes;

  loading = false;

  warehouseId: number | null;
  routes: any[] = [];
  warehouses: any[] = [];
  zones: any[] = [];

  userForm!: FormGroup;

  statusOptions = [
    'RD',
    'CNL',
    'CO',
    'NH',
    'OD',
    'WA',
    'ED',
    'UG',
    'HW'
  ];

  constructor(
    public dialogRef:
      MatDialogRef<RouteDialogContentComponent>,

    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private warehouseService: WarehouseService,
    private routeService: RoutesService,

    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: any
  ) {
    this.action = data?.action ?? '';
    this.local_data = {
      ...data?.local_data
    };

    this.warehouseId =
      data?.warehouseId !== null &&
      data?.warehouseId !== undefined
        ? Number(data.warehouseId)
        : null;
  }

  ngOnInit(): void {
    this.warehouseService
      .getWarehouses()
      .subscribe({
        next: warehouses => {
          this.warehouses = warehouses ?? [];
        },
        error: error => {
          console.error(
            'Error loading warehouses:',
            error
          );
        }
      });

    if (this.warehouseId) {
      this.warehouseService
        .getZonesByWarehouse(
          this.warehouseId
        )
        .subscribe({
          next: zones => {
            this.zones = zones ?? [];
          },
          error: error => {
            console.error(
              'Error loading zones:',
              error
            );
          }
        });
    }

    const defaultDate =
      this.local_data?.date
        ? new Date(this.local_data.date)
        : this.getTomorrow();

    this.userForm = this.fb.group({
      date: [
        {
          value: defaultDate,
          disabled: this.loading
        },
        Validators.required
      ],

      volumen: [
        {
          value:
            this.local_data?.volumen ?? 0,
          disabled: this.loading
        },
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      deliveryStops: [
        {
          value:
            this.local_data?.deliveryStops ?? 0,
          disabled: this.loading
        },
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      zoneId: [
        {
          value:
            this.local_data?.zoneId ?? null,
          disabled: this.loading
        },
        Validators.required
      ],

      paymentType: [
        {
          value:
            this.local_data?.paymentType ??
            'PerStop',
          disabled: this.loading
        },
        Validators.required
      ],

      priceRoute: [
        {
          value:
            this.local_data?.priceRoute ?? 0,
          disabled: this.loading
        }
      ]
    });

    const paymentControl =
      this.userForm.get('paymentType');

    const priceControl =
      this.userForm.get('priceRoute');

    paymentControl
      ?.valueChanges
      .subscribe(value => {
        const perRoute =
          value === 'PerRoute';

        if (perRoute) {
          priceControl?.enable({
            emitEvent: false
          });

          priceControl?.setValidators([
            Validators.required,
            Validators.min(0)
          ]);
        } else {
          priceControl?.setValue(
            0,
            {
              emitEvent: false
            }
          );

          priceControl?.clearValidators();

          priceControl?.disable({
            emitEvent: false
          });
        }

        priceControl?.updateValueAndValidity({
          emitEvent: false
        });
      });

    paymentControl?.updateValueAndValidity({
      emitEvent: true
    });
  }

  private getTomorrow(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(
      tomorrow.getDate() + 1
    );
    return tomorrow;
  }

  submit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    if (!this.warehouseId) {
      this.openSnackBar(
        'Warehouse is required.',
        'Close'
      );
      return;
    }

    const formValue =
      this.userForm.getRawValue();

    const payload: Routes = {
      ...this.local_data,

      id:
        this.local_data?.id ??
        0,

      date:
        formValue.date ??
        new Date(),

      volumen:
        Number(formValue.volumen ?? 0),

      zoneId:
        Number(formValue.zoneId),

      deliveryStops:
        Number(
          formValue.deliveryStops ?? 0
        ),

      paymentType:
        formValue.paymentType ??
        'PerStop',

      priceRoute:
        formValue.paymentType === 'PerRoute'
          ? Number(formValue.priceRoute ?? 0)
          : 0,

      warehouseId:
        this.warehouseId
    } as Routes;

    this.loading = true;
    this.userForm.disable({
      emitEvent: false
    });

    this.routeService
      .addRoute(payload)
      .subscribe({
        next: () => {
          this.loading = false;

          this.dialogRef.close({
            event: 'Refresh'
          });

          this.openSnackBar(
            'Route created successfully!',
            'Close'
          );
        },
        error: error => {
          this.loading = false;

          this.userForm.enable({
            emitEvent: false
          });

          this.openSnackBar(
            error?.error?.message ||
            error?.message ||
            'Error creating route.',
            'Close'
          );
        }
      });
  }

  doAction(): void {
    if (
      this.action === 'Add' ||
      this.action === 'Update'
    ) {
      this.submit();
      return;
    }

    if (this.action === 'Delete') {
      this.dialogRef.close({
        event: 'Delete'
      });
    }
  }

  openSnackBar(
    message: string,
    action: string
  ): void {
    this.snackBar.open(
      message,
      action,
      {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );
  }

  closeDialog(): void {
    this.dialogRef.close({
      event: 'Cancel'
    });
  }
}

@Component({
  selector: 'app-route-bonus-dialog',
  standalone: true,
  templateUrl: './route-bonus-dialog.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule
  ]
})
export class RouteBonusDialogComponent
  implements OnInit {

  bonusForm!: FormGroup;

  loading = false;
  local_data: any;

  constructor(
    private fb: FormBuilder,
    private routesService: RoutesService,
    private toastr: ToastrService,

    public dialogRef:
      MatDialogRef<RouteBonusDialogComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data: any
  ) {
    this.local_data =
      data?.route ??
      data;
  }

  ngOnInit(): void {
    this.bonusForm = this.fb.group({
      type: [
        'Other',
        Validators.required
      ],

      amount: [
        null,
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ],

      note: ['']
    });
  }

  saveBonus(): void {
    if (this.bonusForm.invalid) {
      this.bonusForm.markAllAsTouched();
      return;
    }

    const routeId =
      this.local_data?.id;

    if (!routeId) {
      this.toastr.error(
        'Route id not found.',
        'Error'
      );
      return;
    }

    const payload = {
      type:
        this.bonusForm.value.type,

      amount:
        Number(
          this.bonusForm.value.amount
        ),

      note:
        this.bonusForm.value.note
          ?.trim() || null
    };

    this.loading = true;

    this.routesService
      .addRouteBonus(
        routeId,
        payload
      )
      .subscribe({
        next: response => {
          this.loading = false;

          this.toastr.success(
            'Route bonus added successfully.',
            'Success'
          );

          this.dialogRef.close(response);
        },
        error: error => {
          this.loading = false;

          this.toastr.error(
            error?.error?.message ||
            'Error adding route bonus.',
            'Error'
          );
        }
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}

interface Driver {
  id: number;
  name: string;
  lastName: string;
  identificationNumber?: string;
}

export interface DailyRouteSummary {
  date: Date;

  totalPackages: number;
  totalStops: number;
  totalRoutes: number;

  completedRoutes: number;
  assignedRoutes: number;

  missingDriverRoutes: number;
  missingZoneRoutes: number;
  pendingRoutes: number;

  completionPercent: number;
  assignmentPercent: number;

  payrollReady: boolean;
}

export interface PayrollReadiness {
  ready: boolean;

  totalRoutes: number;
  completedRoutes: number;

  missingDriverRoutes: number;
  missingZoneRoutes: number;
  pendingRoutes: number;
  emptyRoutes: number;

  missingDriverRateCount: number;
  missingRevenueCount: number;

  progress: number;
  issues: string[];
}