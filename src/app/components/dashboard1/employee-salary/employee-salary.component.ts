import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
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

export interface employeeChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
}

@Component({
  selector: 'app-employee-salary',
  imports: [NgApexchartsModule, MaterialModule, TablerIconsModule],
  templateUrl: './employee-salary.component.html',
})
export class AppEmployeeSalaryComponent implements OnChanges {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  @Input() rows: any[] = [];

  public employeeChart!: Partial<employeeChart> | any;

  constructor() {
    this.setChart([20, 15, 30, 25, 10, 15], ['Apr', 'May', 'June', 'July', 'Aug', 'Sept']);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] && this.rows?.length) {
      const labels = this.rows.map(x => x.warehouse ?? x.city ?? x.name ?? 'N/A');
      const values = this.rows.map(x => x.gross ?? x.totalGross ?? x.amount ?? 0);

      this.setChart(values, labels);
    }
  }

  private setChart(data: number[], categories: string[]): void {
    this.employeeChart = {
      series: [
        {
          name: 'Gross',
          data
        }
      ],
      chart: {
        type: 'bar',
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
        foreColor: '#adb0bb',
        toolbar: { show: false },
        height: 270
      },
      colors: ['#ECF2FF', '#ECF2FF', '#5D87FF', '#ECF2FF', '#ECF2FF', '#ECF2FF'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '45%',
          distributed: true,
          endingShape: 'rounded'
        }
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: {
        yaxis: {
          lines: { show: false }
        }
      },
      xaxis: {
        categories,
        axisBorder: { show: false }
      },
      yaxis: {
        labels: { show: false }
      },
      tooltip: {
        theme: 'dark'
      }
    };
  }
}