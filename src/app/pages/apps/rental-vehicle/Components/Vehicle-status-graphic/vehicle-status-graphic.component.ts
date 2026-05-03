import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexResponsive,
  NgApexchartsModule,
} from 'ng-apexcharts';

import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';

export interface VehicleStatusChart {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  stroke: ApexStroke;
  responsive: ApexResponsive[];
}

@Component({
  selector: 'app-vehicle-status-graphic',
  standalone: true,
  imports: [
    CommonModule,
    NgApexchartsModule,
    MaterialModule,
    TablerIconsModule
  ],
  templateUrl: './vehicle-status-graphic.component.html',
})
export class AppVehicleStatusGraphicComponent {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  public vehicleStatusChart!: Partial<VehicleStatusChart> | any;

  totalVehicles = 28;

  statusSummary = [
    {
      label: 'Available',
      value: 16,
      class: 'text-success'
    },
    {
      label: 'Rented',
      value: 7,
      class: 'text-primary'
    },
    {
      label: 'Maintenance Hold',
      value: 3,
      class: 'text-warning'
    },
   
  ];

  constructor() {
    this.vehicleStatusChart = {
      series: [16, 7, 3],

      labels: [
        'Available',
        'Rented',
        'Maintenance',
       
      ],

      colors: [
        '#13DEB9',
        '#5D87FF',
        '#FFAE1F',
       
      ],

      chart: {
        type: 'donut',
        height: 340,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        foreColor: '#adb0bb',
      },

      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
              },
              value: {
                show: true,
                fontSize: '24px',
                fontWeight: 700,
                formatter: (val: string) => {
                  return val;
                },
              },
              total: {
                show: true,
                label: 'Vehicles',
                fontSize: '14px',
                fontWeight: 600,
                formatter: () => {
                  return this.totalVehicles.toString();
                },
              },
            },
          },
        },
      },

      dataLabels: {
        enabled: false,
      },

      stroke: {
        width: 0,
      },

      legend: {
        show: false,
      },

      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => {
            return `${val} vehicles`;
          },
        },
      },

      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 300,
            },
          },
        },
      ],
    };
  }
}