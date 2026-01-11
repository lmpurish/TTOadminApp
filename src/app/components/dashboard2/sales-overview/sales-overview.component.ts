import { Component, OnInit, ViewChild } from '@angular/core';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ReportService } from 'src/app/services/report.service';

export interface salesoverviewChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  stroke: ApexStroke;
}
@Component({
  selector: 'app-sales-overview',
  imports: [MaterialModule, NgApexchartsModule, TablerIconsModule],
  templateUrl: './sales-overview.component.html',
})
export class AppSalesOverviewComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  public salesoverviewChart!: Partial<salesoverviewChart> | any;
  warehouses: any[] = [];
  totalVolumeSum: number = 0; // Variable para almacenar la sumatoria de volúmenes

  constructor(private reportService: ReportService) { }

  ngOnInit(): void {
    this.reportService.getVolumenCurrentMonth().subscribe({
      next: (res) => {
        this.warehouses = res;
        // ✅ Calcular la sumatoria de todos los volúmenes
        this.totalVolumeSum = this.warehouses.reduce((sum, warehouse) => sum + warehouse.totalVolume, 0);

        // ✅ Actualizar el gráfico con los datos de la API
        this.salesoverviewChart.series = this.warehouses.map(warehouse => warehouse.totalVolume);
        this.salesoverviewChart.labels = this.warehouses.map(warehouse => warehouse.warehouseCity);
        this.salesoverviewChart.plotOptions.pie.donut.labels.total.label = `${this.totalVolumeSum.toLocaleString()}`;
      },
      error: (err) => {
        console.error("❌ Error al obtener datos de los almacenes:", err);
      }
    });

    // Inicializar el gráfico con valores vacíos
    this.salesoverviewChart = {
      series: [], // Se llenará cuando lleguen los datos
      chart: {
        type: 'donut',
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
        toolbar: { show: false },
        height: 275,
      },
      noData: {
        text: 'There is no data for that date',
        align: 'center',
        verticalAlign: 'middle',
        style: {
          color: '#999',
          fontSize: '16px'
        }
      },
      labels: [], // Se llenará dinámicamente
      colors: ['#5D87FF', '#57d2fa', '#facb57', '#57fac4', '#45f43A', '#3fec19', '#5e57fa'],
      plotOptions: {
        pie: {
          donut: {
            size: '89%',
            background: 'transparent',
            labels: {
              show: true,
              name: { show: true, offsetY: 7 },
              value: { show: false },
              total: {
                show: true,
                color: '#2A3547',
                fontSize: '20px',
                fontWeight: '600',
                label: '$0', // Se actualizará con la sumatoria
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: false },
      legend: { show: false },
      tooltip: { theme: 'dark', fillSeriesColor: false },
    };
  }
}
