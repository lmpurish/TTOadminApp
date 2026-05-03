import { Component, ViewChild } from '@angular/core';
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

import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';

interface month {
  value: string;
  viewValue: string;
}

export interface revenueChart {
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
  selector: 'app-revenue-updates',
  imports: [NgApexchartsModule, MaterialModule, TablerIconsModule],
  templateUrl: './revenue-updates.component.html',
})
export class AppRevenueUpdatesComponent {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  public revenueChart: any;
  months: month[] = [
    { value: 'mar', viewValue: 'March 2025' },
    { value: 'apr', viewValue: 'April 2025' },
    { value: 'june', viewValue: 'June 2025' },
  ];

  constructor() {
    this.revenueChart = {
      series: [
        {
          name: "Revenue",
          data: [12000, 18000, 15000, 21000, 24000, 30000, 28000],
          color: "#5D87FF"
        },
        {
          name: "Expenses",
          data: [8000, 11000, 9000, 12000, 15000, 17000, 14000],
          color: "#49BEFF"
        }
      ],

      chart: {
        type: "line",
        height: 340,
        toolbar: {
          show: false
        },
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        foreColor: "#adb0bb"
      },

      stroke: {
        curve: "smooth",
        width: 3
      },

      markers: {
        size: 4
      },

      dataLabels: {
        enabled: false
      },

      legend: {
        show: true,
        position: "top"
      },

      grid: {
        borderColor: "rgba(0,0,0,0.08)",
        strokeDashArray: 4
      },

      xaxis: {
        categories: [
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun"
        ],
        axisBorder: {
          show: false
        }
      },

      yaxis: {
        labels: {
          formatter: (val: number) => "$" + (val / 1000) + "k"
        }
      },

      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => "$" + val.toLocaleString()
        }
      }
    };
  }
}
