import { Component, ViewChild } from '@angular/core';
import {
  ApexChart,
  ChartComponent,
  ApexStroke,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexPlotOptions,
  ApexFill,
  ApexGrid,
  ApexDataLabels,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from '../../../material.module';
import { ReportService } from 'src/app/services/report.service';
import { CoreService } from 'src/app/services/core.service';

export interface totalEarnChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  fill: ApexFill;
  grid: ApexGrid;
  dataLabels: ApexDataLabels;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
}

@Component({
  selector: 'app-total-earnings',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule],
  templateUrl: './total-earnings.component.html',
})
export class AppTotalEarningsComponent {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  public totalEarnChart!: Partial<totalEarnChart> | any;
  totalIncome: any;
  allRoutes: any;
  userData: any;
  year: any;

  constructor(private reportService: ReportService, private userService: CoreService) {
    this.totalEarnChart = {
      series: [
        {
          name: 'Ingresos',
          data: [],
        },
      ],

      chart: {
        type: 'bar',
        height: 170,
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
        foreColor: '#adb0bb',
        toolbar: {
          show: false,
        },
        resize: true,
        sparkline: {
          enabled: false, // importante para mostrar ejes y labels
        },
      },

      colors: ['#49BEFF'],

      grid: {
        show: true,
        padding: {
          left: 0,
          right: 0,
          bottom: 0,
          top: 0
        }
      },

      plotOptions: {
        bar: {
          horizontal: false,
          startingShape: 'flat',
          endingShape: 'flat',
          columnWidth: '60%',
          barHeight: '20%',
          borderRadius: 3,
        },
      },

      dataLabels: {
        enabled: false,
      },

      stroke: {
        show: true,
        width: 2.5,
        colors: ['rgba(0,0,0,0.01)'],
      },

      xaxis: {
        categories: [],
        labels: {
          show: true,
          offsetY: 5,
          style: {
            colors: '#adb0bb',
            fontSize: '12px',
          },
        },
        axisBorder: {
          show: true,
        },
        axisTicks: {
          show: true,
        },
      },

      yaxis: {
        labels: {
          show: false,
        },
      },

      fill: {
        opacity: 1,
      },

      tooltip: {
        theme: 'dark',
        x: {
          show: false,
        },
      },
    };
  }

  ngOnInit(): void {
    this.loadUser();
    this.getDriverIncome(this.userData.id);
  }

  loadUser() {
    this.userData = this.userService.getUserInfoFromToken();
  }

  getDriverIncome(id: number) {
    this.reportService.getDriverIncome(id).subscribe({
      next: (data) => {
        this.year = data[0].year;
        this.totalIncome = data.reduce((sum: any, item: any) => sum + item.totalIncome, 0);
        this.allRoutes = data;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Ordenar por mes
        const sortedData = data.sort((a: any, b: any) => a.month - b.month);

        const chartData = sortedData.map((item: any) => item.totalIncome);
        const chartLabels = sortedData.map((item: any) => monthNames[item.month - 1]);

        // Actualizar la serie
        this.totalEarnChart.series = [
          {
            name: 'Ingresos',
            data: chartData,
          },
        ];

        // Actualizar los labels
        this.totalEarnChart.xaxis.categories = chartLabels;

        setTimeout(() => {
          this.chart.updateOptions({
            series: this.totalEarnChart.series,
            xaxis: this.totalEarnChart.xaxis,
          });
        }, 0);
      },
      error: (err) => {
        console.log(err);
      }
    });
  }
}
