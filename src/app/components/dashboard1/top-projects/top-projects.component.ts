import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MaterialModule } from '../../../material.module';
import { CommonModule } from '@angular/common';
import { ReportService } from 'src/app/services/report.service';
import { CoreService } from 'src/app/services/core.service';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormGroup } from '@angular/forms';

interface DriverData {
  driverId: number;
  driverName: string;
  totalVolume: number;
  totalAttempts: number;
  totalStops: number;
  totalCNL: number;
  totalDaysWorked: number;
  totalBranchOnTime: number;
  totalOnTimeDeliveries: number;
  averageBranchOnTimePerDay: number;
  averageLOSPerDay: number;
  sumLOS: number;
  dpmo: number;
  ranking: number;
  date: string;  // ✅ Agregar la propiedad date
}


interface month {
  value: string;
  viewValue: string;
}


@Component({
  selector: 'app-top-projects',
  imports: [MaterialModule, CommonModule],
  templateUrl: './top-projects.component.html',
})



export class AppTopProjectsComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;

  baseColumns: string[] = [
    'index',
    'driverName',
  ];
  extraColumns: string[] = ['totalVolume', 'totalStops', 'dayWorked',];
  extraColumns2: string[] = [
    'totalAttempts',
    'totalCNL',
    'dpmo',
    'averageBranchOnTimePerDay',
    'averageLOSPerDay',
    'ranking']
  displayedColumns: string[] = [];

  dataSource = new MatTableDataSource<DriverData>();

  managerId: number = 0;
  loading: boolean = false;
  errorMessage: string | null = null;
  dateRangeForm!: FormGroup;
  role: string;



  constructor(private service: ReportService, private core: CoreService, private cdr: ChangeDetectorRef, private fb: FormBuilder) { }

  ngOnInit(): void {
    // ✅ Inicializar el formulario antes de llamar a getDriverStatistics()
    this.dateRangeForm = this.fb.group({
      start: [null],
      end: [null]
    });
    this.role = this.core.getRole();
    this.initDateRange(); // ✅ Configura el rango de fechas predeterminado

    // ✅ Obtener la información del usuario y verificar la autenticación
    const userInfo = this.core.getUserInfoFromToken();
    if (userInfo?.role == 'Driver') {
      this.service.getManagerId(userInfo.id).subscribe({
        next: (data) => {
          this.managerId = data;
        },
        error: (err) => {
          console.log("Manager no encontrado")
        }
      }

      );
    }
    else {
      this.managerId = userInfo?.id ?? 0;
    }


    if (this.managerId > 0) {
      this.getDriverStatistics(); // ✅ Llamar a la función después de la inicialización del formulario
    } else {
      this.errorMessage = "User not authenticated or invalid ID.";
    }

    // ✅ Detectar cambios en el formulario y aplicar filtro de datos automáticamente
    this.dateRangeForm.valueChanges.subscribe(() => {
      if (this.dateRangeForm.valid) {
        this.getDriverStatistics();
      }
    });

    this.displayedColumns = this.role === 'Driver' ? [...this.baseColumns,...this.extraColumns2] : [...this.baseColumns, ...this.extraColumns, ...this.extraColumns2];
    this.cdr.detectChanges();

  }


  ngAfterViewInit(): void {
    setTimeout(() => {
      this.dataSource.sort = this.sort;
      this.setupSorting();
    });
  }
  getIndex(i: number): number {
    if (!this.sort || !this.sort.active) {
      return i + 1; // Si no hay orden, devuelve el índice normal
    }

    const isAscending = this.sort.direction === 'desc';
    const totalItems = this.dataSource.data.length;

    return isAscending ? i + 1 : totalItems - i;
  }

  initDateRange(): void {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.dateRangeForm.patchValue({
      start: startOfMonth,
      end: endOfMonth
    });
  }

  getDriverStatistics(): void {
    this.loading = true;

    if (!this.dateRangeForm) {
      this.errorMessage = 'El formulario no está inicializado.';
      this.loading = false;
      return;
    }

    const { start, end } = this.dateRangeForm.value || {};

    if (!start || !end) {
      this.errorMessage = 'Por favor seleccione un rango de fechas válido.';
      this.loading = false;
      return;
    }

    const startDate = this.formatDate(start);
    const endDate = this.formatDate(end);

    this.service.getRanking(this.managerId, startDate, endDate).subscribe({
      next: (data) => {
        if (!data || !Array.isArray(data)) {
          this.errorMessage = 'Invalid data format.';
          this.loading = false;
          return;
        }

        this.dataSource.data = data.map(driver => {
          const totalVolume = Number(driver.totalVolume) || 1;
          const totalAttempts = Number(driver.totalAttempts) || 0;
          const totalCNL = Number(driver.totalCNL) || 0;
          const totalBranchOnTime = Number(driver.totalBranchOnTime) || 0;
          const totalDaysWorked = Number(driver.totalDaysWorked) || 1;

          // ✅ Asegurar que la propiedad `date` exista
          const driverDate = driver.date ? driver.date : new Date().toISOString().split('T')[0];

          // ✅ Cálculo de LOS %
          const losPercentage = parseFloat((((totalVolume - totalAttempts) / totalVolume) * 100).toFixed(4));

          // ✅ Cálculo de Branch On Time % (Limitado a 100)
          const branchOnTimePercentage = parseFloat((Math.min((totalBranchOnTime / totalDaysWorked) * 100, 100)).toFixed(4));

          // ✅ Cálculo de DPMO
          let dpmo = totalCNL > 0 ? (totalCNL * 1_000_000) / totalVolume : 0;
          dpmo = Math.min(dpmo, 1_000_000);

          // ✅ Aplicar penalización exponencial a DPMO
          const dpmoScore = 120 * Math.exp(-dpmo / 5000);

          // ✅ Cálculo del ranking escalado a 120
          let ranking =
            (losPercentage / 100) * 40 +
            (branchOnTimePercentage / 100) * 10 +
            (dpmoScore / 120) * 70;

          ranking = parseFloat(Math.min(ranking, 120).toFixed(4));

          return {
            driverId: Number(driver.driverId),
            driverName: driver.driverName,
            totalVolume,
            totalAttempts,
            totalStops: Number(driver.totalStops),
            totalCNL,
            totalDaysWorked,
            totalBranchOnTime,
            totalOnTimeDeliveries: Number(driver.totalOnTimeDeliveries),
            averageBranchOnTimePerDay: branchOnTimePercentage,
            averageLOSPerDay: losPercentage,
            dpmo: Math.round(dpmo),
            branchOnTimePercentage,
            ranking,
            sumLOS: Number(driver.sumLOS),
            date: driverDate  // ✅ Se asegura que `date` esté presente en el objeto
          };
        });

        setTimeout(() => {
          this.dataSource.sort = this.sort;
          this.setupSorting();
        });

        this.cdr.detectChanges();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Error retrieving driver statistics.';
        this.loading = false;
      }
    });
  }



  /**
   * Función para formatear fechas en YYYY-MM-DD
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // "2025-02-01"
  }

  filterTable(): void {
    if (!this.dataSource || !this.dataSource.data.length) return;

    const { start, end } = this.dateRangeForm.value;

    if (!start || !end) return;

    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();

    this.dataSource.data = this.dataSource.data.filter(driver => {
      const driverDate = new Date(driver.date).getTime();
      return driverDate >= startDate && driverDate <= endDate;
    });

    this.cdr.detectChanges(); // Forzar actualización de la vista
  }



  setupSorting(): void {
    if (this.sort) {
      this.dataSource.sortingDataAccessor = (data: any, sortHeaderId: string): string | number => {
        switch (sortHeaderId) {
          case 'totalVolume':
          case 'totalAttempts':
          case 'totalStops':
          case 'totalCNL':
          case 'totalDaysWorked':
          case 'totalBranchOnTime':
          case 'totalOnTimeDeliveries':
          case 'averageBranchOnTimePerDay':
          case 'averageLOSPerDay':
          case 'dpmo':
          case 'ranking':
            return Number(data[sortHeaderId]) || 0; // ✅ Convertir a número para orden correcto
          default:
            return (data[sortHeaderId] || '').toString().toLowerCase();
        }
      };
    }
  }


}
