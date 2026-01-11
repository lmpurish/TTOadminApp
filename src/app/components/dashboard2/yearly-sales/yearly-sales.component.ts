import { Component, ViewChild } from '@angular/core';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexPlotOptions,
  ApexGrid,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ReportService } from 'src/app/services/report.service';
import { CoreService } from 'src/app/services/core.service';

export interface yearlysaleChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors?: string[]; // ✅ Agregada para evitar errores de tipo
}

@Component({
  selector: 'app-yearly-sales',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule, TablerIconsModule],
  templateUrl: './yearly-sales.component.html',
})
export class AppYearlySalesComponent {
  @ViewChild('chart') chart!: ChartComponent;

  public yearlysaleChart: Partial<yearlysaleChart> & { series: ApexAxisChartSeries } = {
    series: [],
    chart: {
      type: 'bar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#adb0bb',
      toolbar: { show: false },
      height: 280,
    },
    colors: ['#ECF2FF', '#ECF2FF', '#5D87FF', '#ECF2FF', '#ECF2FF', '#ECF2FF'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '45%',
        distributed: true,
        // endingShape: 'rounded' ❌ eliminado porque no es parte del tipo
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: [], // ✅ vacío por defecto
      axisBorder: { show: false },
    },
    yaxis: {
      labels: { show: false },
    },
    tooltip: { theme: 'dark' },
  };

  totalStops: number = 0;
  allRoutes: any[] = [];
  userData: any;
  year: number = new Date().getFullYear();

  constructor(
    private reportService: ReportService,
    private userService: CoreService
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser() {
    this.userData = this.userService.getUserInfoFromToken();
    if (this.userData?.id) {
      this.getDriverIncome(this.userData.id);
    }
  }

  getDriverIncome(id: number) {
    this.reportService.getDriverIncome(id).subscribe({
      next: (data) => {
        if (!data || data.length === 0) return;

        this.year = data[0].year;
        this.totalStops = data.reduce(
          (sum: number, item: any) => sum + item.totalStops,
          0
        );
        this.allRoutes = data;

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const currentMonth = new Date().getMonth() + 1;

        const filteredData = data
          .filter((item: any) => item.month <= currentMonth)
          .sort((a: any, b: any) => a.month - b.month);

        const chartData = filteredData.map((item: any) => item.totalStops);
        const chartLabels = filteredData.map(
          (item: any) => monthNames[item.month - 1]
        );

        this.yearlysaleChart.series = [{
          name: 'Stops',
          data: chartData,
        }];

        this.yearlysaleChart.xaxis = {
          ...this.yearlysaleChart.xaxis,
          categories: chartLabels,
        };

        setTimeout(() => {
          if (this.chart) {
            this.chart.updateOptions({
              series: this.yearlysaleChart.series,
              xaxis: {
                ...this.yearlysaleChart.xaxis,
                categories: chartLabels
              },
              colors: this.yearlysaleChart.colors
            });
          } else {
            console.warn('Chart no disponible aún');
          }
        }, 0);
      },
      error: (err) => {
        console.error('Error al obtener ingresos del conductor', err);
      },
    });
  }
}
