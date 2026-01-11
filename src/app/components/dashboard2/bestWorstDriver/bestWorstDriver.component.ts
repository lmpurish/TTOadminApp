import { Component, OnInit, ViewChild } from '@angular/core';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  ApexPlotOptions,
  ApexFill,
  ApexMarkers,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ReportService } from 'src/app/services/report.service';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { FormControl } from '@angular/forms';

export interface revenuetwoChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  grid: ApexGrid;
  marker: ApexMarkers;
}

@Component({
  selector: 'app-revenue-updates-two',
  imports: [MaterialModule, NgApexchartsModule, TablerIconsModule],
  templateUrl: './bestWorstDriver.component.html',
})
export class AppRevenueUpdatesTwoComponent implements OnInit {
  selectedDate = new FormControl(new Date(new Date().setDate(new Date().getDate() - 1))); // Fecha de ayer
  driversData: any[] = [];
  revenuetwoChart: any;
  warehousesMap: Map<number, string> = new Map(); // Mapeo de ID → Nombre

  constructor(private reportService: ReportService, private warehouseService: WarehouseService) {
    this.revenuetwoChart = {
      series: [],
      chart: {
        type: 'bar',
        height: 320,
        stacked: false,
      }, noData: {
        text: 'There is no data for that date',
        align: 'center',
        verticalAlign: 'middle',
        style: {
          color: '#999',
          fontSize: '16px'
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '40%',
          borderRadius: [6],
        },
      },
      stroke: { show: false },
      dataLabels: { enabled: true },
      legend: { show: true },
      grid: { show: true },
      yaxis: { min: 110, max: 120, tickAmount: 5 },
      xaxis: { categories: [] },
      tooltip: {
        theme: 'dark',
        fillSeriesColor: false,
        y: {
          formatter: (value: number, options?: { seriesIndex: number; dataPointIndex: number }) => {
            if (!options) return `Score: ${value}`;
            return options.seriesIndex === 0
              ? `Driver: ${this.driversData[options.dataPointIndex].bestDriver.driverName}`
              : `Driver: ${this.driversData[options.dataPointIndex].worstDriver.driverName}`;
          },
        },
      },
    };
  }

  ngOnInit(): void {
    // Calcular la fecha del día anterior
    this.loadWarehouses();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // console.log("🚀 Estableciendo fecha por defecto:", this.formatDate(yesterday));

    // Establecer la fecha en el FormControl y forzar la detección de cambios
    this.selectedDate.setValue(yesterday, { emitEvent: false });

    // Verificar el valor después de establecerlo
    //  console.log("📅 Fecha en el FormControl después de setValue:", this.selectedDate.value);

    // Llamar a fetchDriversData solo después de asegurar que la fecha es correcta
    setTimeout(() => {
      //    console.log("📡 Llamando a fetchDriversData con fecha:", this.formatDate(this.selectedDate.value as Date));
      this.fetchDriversData();
    }, 0); // Permitir que Angular actualice el estado antes de llamar a la API

    // Escuchar cambios en el datepicker y actualizar los datos
    this.selectedDate.valueChanges.subscribe((date) => {
      if (date) {
        //     console.log("🔄 Fecha cambiada por el usuario:", this.formatDate(date));
        this.fetchDriversData();
      }
    });
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
  fetchDriversData(): void {
    if (!this.selectedDate.value) return;

    const selectedDateFormatted = this.formatDate(this.selectedDate.value as Date);

    this.reportService.getBestWorstDriver(selectedDateFormatted).subscribe({
      next: (res) => {
        this.driversData = res;

        const warehouseCategories = [
          ...new Set(this.driversData.map((item) => item.warehouseId)),
        ].map((id) => this.getWarehouseName(id));

        const bestScores = this.driversData.map((item) => item.bestDriver.score);
        const worstScores = this.driversData.map((item) => item.worstDriver.score);

        this.revenuetwoChart = {
          ...this.revenuetwoChart,
          series: [
            { name: 'Best Driver', data: bestScores, color: '#5D87FF' },
            { name: 'Worst Driver', data: worstScores, color: '#49BEFF' },
          ],
          xaxis: { categories: warehouseCategories },
          yaxis: { min: Math.min(...bestScores, ...worstScores) - 5, max: Math.max(...bestScores, ...worstScores) + 5 },
        };
      },
      error: (err) => console.error('Error fetching driver data'),
    });
  }

  // Convertir fecha a formato YYYY-MM-DD
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Meses van de 0-11, por eso sumamos 1
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  // Mapear ID de almacén a ciudad
  getWarehouseCity(warehouseId: number): string {
    const warehouseCityMap: { [key: number]: string } = {

    };
    return warehouseCityMap[warehouseId] || `Warehouse ${warehouseId}`;
  }
}
