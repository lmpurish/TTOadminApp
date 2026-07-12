import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSpinner } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { DriverDashboardService } from 'src/app/services/driver-dashboard.service';


@Component({
  selector: 'app-driver-dashboard',
  templateUrl: './driver-dashboard.component.html',
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    TablerIconsModule,
    MatSpinner,
    MatDialogModule

  ],
  styleUrls: ['./driver-dashboard.component.scss']
})
export class DriverDashboardComponent implements OnInit {

  loading = false;

  driverId!: number;

  lastRoute: any = null;
  recentRoutes: any[] = [];

  packagesDelivered = 0;
  yesterdayStops = 0;
  estimatedEarnings = 0;
  losYesterday = 0;

  operationalDate: Date | null = null;

  attendance = {
    arrival: null as Date | null,
    departure: null as Date | null,
    totalTime: '00:00:00'
  };

  weeklyTotal = 0;
  weeklyDays: any[] = [];

  totals: any = null;

  constructor(private dashboardService: DriverDashboardService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;

    this.dashboardService.getLastRoute().subscribe({
      next: (res) => {
        console.log('LAST ROUTE RESPONSE:', res);

        this.lastRoute = res.route || res.Route;
        this.routePackages = res.packages || res.Packages || [];

        const punch = res.punch || res.Punch;
        this.operationalDate = this.lastRoute?.date
          ? new Date(this.lastRoute.date)
          : this.lastRoute?.Date
            ? new Date(this.lastRoute.Date)
            : null;

        this.yesterdayStops = this.lastRoute?.deliveryStops ?? this.lastRoute?.DeliveryStops ?? 0;
        this.packagesDelivered = this.lastRoute?.volumen ?? this.lastRoute?.Volumen ?? 0;

        const volume = this.lastRoute?.volumen ?? this.lastRoute?.Volumen ?? 0;
        const attempts = this.lastRoute?.attempts ?? this.lastRoute?.Attempts ?? 0;
        const cnl = this.lastRoute?.cnl ?? this.lastRoute?.CNL ?? 0;

        this.losYesterday = this.calculateLos(volume, attempts, cnl);

        this.attendance.arrival = punch?.arrival || punch?.Arrival ? new Date(punch.arrival || punch.Arrival) : null;
        this.attendance.departure = punch?.departure || punch?.Departure ? new Date(punch.departure || punch.Departure) : null;
        this.attendance.totalTime = this.calculateTotalTime(this.attendance.arrival, this.attendance.departure);

        this.loadRoutes();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadRoutes(): void {
    this.dashboardService.getRoutes().subscribe({
      next: (res) => {
        this.recentRoutes = res.routes || res.Routes || [];
        this.totals = res.totals || res.Totals;

        this.estimatedEarnings =
          this.recentRoutes[0]?.chargedAmount ??
          this.recentRoutes[0]?.ChargedAmount ??
          0;

        this.buildWeeklyEarnings();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
  openRouteDetails(): void {

    this.dialog.open(RouteDetailsDialogComponent, {
      width: '1400px',
      maxWidth: '98vw',
      height: '85vh',
      panelClass: 'route-detail-dialog',
      data: {
        route: this.lastRoute,
        packages: this.routePackages
      }
    });

  }

  calculateLos(volume: number, attempts: number, cnl: number): number {
    if (!volume || volume <= 0) return 0;
    return ((volume - (attempts + cnl)) / volume) * 100;
  }

  calculateDeliveredPercent(volume: number, attempts: number): number {
    if (!volume || volume <= 0) return 0;
    return ((volume - attempts) / volume) * 100;
  }

  calculateCnlPercent(volume: number, cnl: number): number {
    if (!volume || volume <= 0) return 0;
    return (cnl / volume) * 100;
  }

  calculateTotalTime(arrival: Date | null, departure: Date | null): string {
    if (!arrival || !departure) return '00:00:00';

    const diffMs = departure.getTime() - arrival.getTime();

    if (diffMs <= 0) return '00:00:00';

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  buildWeeklyEarnings(): void {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);

    const weekRoutes = this.recentRoutes.filter(r => {
      const d = new Date(r.date || r.Date);
      return d >= start;
    });

    this.weeklyTotal = weekRoutes.reduce((sum, r) => {
      return sum + Number(r.chargedAmount ?? r.ChargedAmount ?? 0);
    }, 0);

    this.weeklyDays = weekRoutes.map(r => {
      const d = new Date(r.date || r.Date);

      return {
        day: days[d.getDay()],
        amount: Number(r.chargedAmount ?? r.ChargedAmount ?? 0)
      };
    });
  }

  getRouteValue(route: any, field: string): any {
    return route?.[field] ?? route?.[this.capitalize(field)];
  }

  capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  showRouteDetails = false;
  routePackages: any[] = [];


  closeRouteDetails(): void {
    this.showRouteDetails = false;
  }
}


@Component({
  selector: 'app-route-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule
  ],
  templateUrl: './driver-dashboard-dialog.component.html',
  styleUrls: [ './driver-dashboard-dialog.component.scss']
})
export class RouteDetailsDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }
}