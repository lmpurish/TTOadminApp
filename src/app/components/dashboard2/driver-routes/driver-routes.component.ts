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

interface driverStats {
  date: Date,
  route: string,
  volume: number;
  attempts: number;
  totalStops: number;
  cnl: number;
  los: number;

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
  dataSource = new MatTableDataSource<driverStats>([]);
  @ViewChild(MatTable) table!: MatTable<any>;
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

  constructor(private http: HttpClient, private reportService: ReportService, private fb: FormBuilder, private warehouseService: WarehouseService, private userService: CoreService) {
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

          next: (res) => {
            if (Array.isArray(res)) {
              // 🔍 Filtrar filas donde volumen, attempts y cnl sean todos 0
              const filtered = res.filter(item =>
                !(item.volumen === 0 && item.attempts === 0 && item.cnl === 0) &&
                item.zone?.zoneCode != null
              );

              console.log(res)
              this.dataSource.data = filtered;

              // Asignar columnas normalmente
              this.displayedColumns = [
                'date',
                'route',
                'TotalVolume',
                'TotalStops',
                'TotalAttempts',
                'TotalCNL',
                'DPOM',
                'AverageLOSPerDay'
              ];

              setTimeout(() => {
                this.dataSource.sort = this.sort;
                this.dataSource.paginator = this.paginator;
                this.sort.sortChange.emit();
                this.table.renderRows();
              });
            } else {
              this.dataSource.data = [];
            }
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
