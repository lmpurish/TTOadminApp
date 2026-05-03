import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import * as moment from 'moment';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ReportService } from 'src/app/services/report.service';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { MatSort } from '@angular/material/sort';
import { CoreService } from 'src/app/services/core.service';
import { MatDialog } from '@angular/material/dialog';
import { RoutePackagesDialogComponent } from './route-packages-dialog/route-packages-dialog.component';

interface PackageDto {
  id: number;
  tracking: string;
  status: string;
  incidentDate: string;
  address: string;
  zipCode?: string;
  reviewStatus?: string;
}

interface DriverStatsRow {
  date: string | Date;
  zone: { zoneCode: string | null };
  routeId: number;

  volumen: number;
  totalStops: number;
  attempts: number;
  cnl: number;
  averageLOSPerDay: number;

  warehouseId?: number;
  routeStatus?: string;

  packages: PackageDto[]; // ✅
  payRunLines?: any[];
  payrollBySourceType?: Record<string, number>;
  payrollTotal?: number;
  payrollPositive?: number;
  payrollNegative?: number;
}

@Component({
  selector: 'app-driver-routes',
  imports: [
    NgApexchartsModule,
    MaterialModule,
    TablerIconsModule,
    CommonModule,
  ],
  templateUrl: './driver-routes.component.html',
  styleUrl: './driver-routes.component.scss'
})

export class DriverRoutesComponent {
  dataSource = new MatTableDataSource<DriverStatsRow>([]);
  @ViewChild(MatTable) table!: MatTable<DriverStatsRow>;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  displayedColumns: string[] = [
    'date',
    'route',
    'TotalVolume',
    'TotalStops',
    'TotalAttempts',
    'TotalCNL',
    'DPOM',
    'AverageLOSPerDay',

  ];
  dpom: number = 0;
  los: number = 0;
  ranking: number = 0;
  branch: number = 0;
  dateRange: FormGroup;
  warehousesMap: Map<number, string> = new Map(); // Mapeo de ID → Nombre
  startDateControl = new FormControl();
  endDateControl = new FormControl();
  @ViewChild(MatSort) sort!: MatSort;
  userData: any;
  hideVolumenColumn = false;
  hideAttempsColumn = false;
  hideCnlColumn = false;

  constructor(private http: HttpClient, private reportService: ReportService, private fb: FormBuilder, private warehouseService: WarehouseService, private userService: CoreService, private dialog: MatDialog) {
    this.dateRange = this.fb.group({
      start: [null],
      end: [null],
    });
  }
  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    // Configurar el método de ordenamiento


    // 🔹 Ordenar por `ranking` por defecto (de mayor a menor)
    this.sort.active = 'Ranking';
    this.sort.direction = 'desc';
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'TotalVolume': return item.volumen;
        case 'TotalStops': return item.totalStops;
        case 'TotalAttempts': return item.attempts;
        case 'TotalCNL': return item.cnl;
        case 'route': return item.zone?.zoneCode ?? '';
        case 'AverageLOSPerDay': return item.averageLOSPerDay;
        default: return item[property];
      }
    };

    // Forzar actualización del sort
    setTimeout(() => {
      this.sort.sortChange.emit();
      this.table.renderRows();
    });
  }

  ngOnInit(): void {
    this.loadUser();
    this.setDefaultWeek();

  }
  loadUser() {
    this.userData = this.userService.getUserInfoFromToken();

  }

  fetchData() {
    const { start, end } = this.dateRange.value;
    if (start && end) {
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');
      const id = this.userData?.id;
      if (id !== undefined && id !== null) {

        this.reportService.getDriverStats(this.userData.id, startDate, endDate).subscribe({

          next: (res: any) => {
            console.log(res)
            if (!Array.isArray(res)) {
              this.dataSource.data = [];
              return;
            }

            const rows: DriverStatsRow[] = res.flatMap((day: any) => {
              const dayDate = day?.date;
              const routes = Array.isArray(day?.routes) ? day.routes : [];

              return routes.map((r: any): DriverStatsRow => {
                const volumen = Number(r?.volumen ?? 0);
                const attempts = Number(r?.attempts ?? 0);
                const cnl = Number(r?.cnl ?? 0);
                const totalStops = Number(r?.deliveryStops ?? 0);

                const losRaw = Number(r?.los ?? 0);
                const averageLOSPerDay = losRaw <= 1 ? losRaw * 100 : losRaw;

                return {
                  date: dayDate ?? (r?.date ? String(r.date).substring(0, 10) : new Date()),
                  zone: { zoneCode: r?.zoneCode ?? null },
                  routeId: Number(r?.routeId ?? 0),

                  volumen,
                  attempts,
                  cnl,
                  totalStops,
                  averageLOSPerDay,

                  warehouseId: r?.warehouseId,
                  routeStatus: r?.routeStatus,

                  packages: Array.isArray(r?.packages) ? r.packages : [], // ✅ para el modal
                  payRunLines: Array.isArray(day?.payRunLines) ? day.payRunLines : [],
                  payrollBySourceType: day?.payrollBySourceType ?? {},
                  payrollTotal: Number(day?.payrollTotal ?? 0),
                  payrollPositive: Number(day?.payrollPositive ?? 0),
                  payrollNegative: Number(day?.payrollNegative ?? 0),
                };
              });
            });

            const filtered = rows.filter(x =>
              !(x.volumen === 0 && x.attempts === 0 && x.cnl === 0)
            );

            this.dataSource.data = filtered;

            setTimeout(() => {
              this.dataSource.sort = this.sort;
              this.dataSource.paginator = this.paginator;
              this.sort.sortChange.emit();
              this.table.renderRows();
            });
          },
          error: (err) => {
            console.log("Error en la API:", err);
            this.dataSource.data = [];
          }
        });


      } else {
        console.warn('ID de usuario no disponible.');
      }

    }
  }

  setDefaultWeek() {
    const today = new Date();

    // 📆 Día de ayer
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1);

    // 📆 Buscar el sábado anterior a ayer
    const dayOfWeek = endDate.getDay(); // 0 = Domingo, ..., 6 = Sábado
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - ((dayOfWeek + 1) % 7));

    this.dateRange.setValue({
      start: startDate,
      end: endDate,
    });

    this.fetchData();
  }

  getIndex(i: number): number {
    if (!this.sort || !this.sort.active) {
      return i + 1; // Si no hay orden activo, mostrar el índice normal
    }

    const sortedData = this.dataSource.sortData(this.dataSource.data, this.sort);
    const item = this.dataSource.data[i];
    const indexInSortedData = sortedData.indexOf(item);

    return indexInSortedData + 1; // 🔹 Índice basado en el orden real
  }
  openPackages(row: DriverStatsRow) {
    this.dialog.open(RoutePackagesDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '85vh',
      autoFocus: false,
      data: {
        routeId: row.routeId,
        date: row.date,
        zoneCode: row.zone?.zoneCode,
        warehouseId: row.warehouseId,

        packages: row.packages ?? [],

        // ✅ payroll summary
        payrollBySourceType: row.payrollBySourceType ?? {},
        payrollTotal: row.payrollTotal ?? 0,
        payrollPositive: row.payrollPositive ?? 0,
        payrollNegative: row.payrollNegative ?? 0,

        // ✅ detalle (opcional)
        payRunLines: row.payRunLines ?? []
      }
    });
  }
  onDateChange() {
    if (this.dateRange.value.start && this.dateRange.value.end) {
      this.fetchData();
    }
  }

  get totalVolumen(): number {

    return this.dataSource.data.reduce((sum: any, item: any) => sum + item.volumen, 0);
  }

  get totalStops(): number {

    return this.dataSource.data.reduce((sum, item) => sum + item.totalStops, 0);
  }

  get totalAttempts(): number {
    return this.dataSource.data.reduce((sum, item) => sum + item.attempts, 0);
  }

  get totalCNL(): number {
    return this.dataSource.data.reduce((sum, item) => sum + item.cnl, 0);
  }

}
