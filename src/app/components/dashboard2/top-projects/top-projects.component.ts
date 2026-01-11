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
import { ToastrService } from 'ngx-toastr';
import { MatSnackBar } from '@angular/material/snack-bar';

interface WarehouseStatistics {
  warehouseId: number;
  totalDrivers: number;
  totalVolume: number;
  totalAttempts: number;
  totalStops: number;
  totalOnTimeDeliveries: number;
  totalBranchOnTime: number;
  totalCNL: number;
  totalDaysWorked: number;
  sumLOS: number;
  averageLOSPerDay: number;
  averageBranchOnTimePerDay: number;
  ranking: number;
}


@Component({
  selector: 'app-top-projects',
  imports: [
    NgApexchartsModule,
    MaterialModule,
    TablerIconsModule,
    CommonModule,
  ],
  templateUrl: './top-projects.component.html',
})
export class AppTopProjectsComponent implements AfterViewInit {
  dataSource = new MatTableDataSource<WarehouseStatistics>([]);
  @ViewChild(MatTable) table!: MatTable<any>;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  displayedColumns: string[] = [
    'index',
    'WarehouseId',
    'TotalVolume',
    'TotalStops',
    'TotalAttempts',
    'TotalCNL',
    'DPOM',
    'AverageLOSPerDay',
    'averageBranchOnTimePerDay',
    'Ranking'
  ];
  dpom: number = 0;
  los: number = 0;
  ranking: number = 0;
  branch: number = 0;
  dateRange: FormGroup;
  warehousesMap: Map<number, string> = new Map(); // Mapeo de ID → Nombre
  startDateControl = new FormControl();
  endDateControl = new FormControl();


  constructor(private http: HttpClient,
    private reportService: ReportService,
    private fb: FormBuilder,
    private warehouseService: WarehouseService,
    private toastr: ToastrService,
    private snackBar: MatSnackBar,) {
    this.dateRange = this.fb.group({
      start: [null],
      end: [null],
    });
  }
  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    // Configurar el método de ordenamiento
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'Ranking': return item.ranking; // ✅ Ordena por ranking
        default: return (item as any)[property];
      }
    };

    // ✅ Definir sort inicial antes de que Angular termine de renderizar
    this.sort.active = 'Ranking';
    this.sort.direction = 'desc';
  }


  ngOnInit(): void {
    this.setDefaultWeek();
    this.loadWarehouses();

  }
  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        if (Array.isArray(res) && res.length) {

          // Crear un mapa con ID como clave y nombre como valor
          this.warehousesMap = new Map(res.map(warehouse => [warehouse.id, warehouse.city]));
        }
      },
      error: (err) => {
        console.error("Error fetching warehouses:", err);
      }
    });
  }

  getWarehouseName(id: number): string {
    return this.warehousesMap.get(id) || "Unknown";
  }
  /** 🗓 Establece la semana actual (sábado - viernes) */
  fetchData() {
    const { start, end } = this.dateRange.value;
    if (!start || !end) return;

    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    this.reportService.getWarehouseRanking(startDate, endDate).subscribe({
      next: (res: any) => {
        // 📦 Normalizar respuesta: aceptar array o {success, data}
        const rows = Array.isArray(res) ? res : (res?.data ?? []);

        // ⚠️ Si viene success=false, mostrar mensaje y limpiar tabla
        if (!Array.isArray(res) && res?.success === false) {
          this.openSnackBar(res.message || 'No data found for selected range', 'Close');
        }

        if (!Array.isArray(rows)) {
          this.dataSource.data = [];
          console.error('La API no devolvió un array válido:', res);
          return;
        }

        this.dataSource.data = rows.map((warehouse: any) => {
          const totalVolume = Number(warehouse.totalVolume) || 0;
          const totalAttempts = Number(warehouse.totalAttempts) || 0;
          const totalCNL = Number(warehouse.totalCNL) || 0;
          const totalBranchOnTime = Number(warehouse.totalBranchOnTime) || 0;

          // ✅ LOS%: backend manda "SumLOS" (legacy) → JSON llega como sumLOS
          const losPercentage = Number(warehouse.sumLOS ?? warehouse.losPercentage ?? 0);

          // ✅ Branch On Time % (cap 100)
          const branchOnTimePercentage = Math.min(totalBranchOnTime, 100);

          // ✅ DPMO (evitar división por cero)
          let dpmo = totalVolume > 0 ? (totalCNL * 1_000_000) / totalVolume : 0;
          dpmo = Math.min(dpmo, 1_000_000);

          // ✅ Score por DPMO
          let dpmoScore = 0;
          if (dpmo <= 300) dpmoScore = 120;
          else if (dpmo <= 600) dpmoScore = 120 * 0.75;
          else if (dpmo <= 900) dpmoScore = 120 * 0.5;
          else if (dpmo <= 1200) dpmoScore = 120 * 0.25;

          // ✅ Ranking (escala 0–120)
          let ranking =
            (losPercentage / 100) * 40 +
            (branchOnTimePercentage / 100) * 10 +
            (dpmoScore / 120) * 70;
          ranking = Math.min(Number(ranking.toFixed(4)), 120);

          return {
            ...warehouse,
            dpmo: Math.round(dpmo),
            losPercentage: Number(losPercentage.toFixed(4)),
            branchOnTimePercentage: Number(branchOnTimePercentage.toFixed(4)),
            ranking
          };
        });

        // 🔄 actualizar sort/paginator después de setear los datos
        setTimeout(() => {
          this.dataSource.sort = this.sort;
          this.dataSource.paginator = this.paginator;

        });
      },
      error: (err) => {
        this.toastr.warning(err?.error?.message || 'Error fetching data');
        this.dataSource.data = [];
      },
    });
  }

  calcularRankingConVolumen(
    rankingActual: number,
    volumen: number,
    losPercent: number,
    dpom: number
  ): number {
    let volumenBonus = 0;

    if (losPercent > 99 && dpom < 300) {
      volumenBonus = (volumen / 10000) * 0.2;
    }

    return rankingActual + volumenBonus;
  }

  /** 🗓 Establece la semana actual y carga los datos */
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

  /** 📅 Se activa cuando el usuario cambia la fecha */
  onDateChange() {
    if (this.dateRange.value.start && this.dateRange.value.end) {
      this.fetchData();
    }
  }

  /** 🔢 Obtener el índice para mostrarlo en la tabla */
  getIndex(i: number): number {
    if (!this.sort || !this.sort.active) {
      return i + 1; // Si no hay orden activo, mostrar el índice normal
    }

    const sortedData = this.dataSource.sortData(this.dataSource.data, this.sort);
    const item = this.dataSource.data[i];
    const indexInSortedData = sortedData.indexOf(item);

    return indexInSortedData + 1; // 🔹 Índice basado en el orden real
  }


  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
