import { Component, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from '../../../material.module';
import { ReportService } from 'src/app/services/report.service';
import { isPlatformBrowser } from '@angular/common';

export interface SalesOverviewChart {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  stroke: ApexStroke;
  noData: any;
}

@Component({
  selector: 'app-warehouse-volumen',
  imports: [MaterialModule, NgApexchartsModule],
  templateUrl: './warehouses-volumen.component.html',
  styleUrls: ['./warehouses-volumen.component.scss']
})
export class AppWarehouseVolumen implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  isBrowser = false;
  public salesoverviewChart!: Partial<SalesOverviewChart> | any;

  warehouses: any[] = [];
  totalVolumeSum = 0;

  constructor(private reportService: ReportService, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.initChart();

    this.reportService.getVolumenCurrentMonth().subscribe({
      next: (res) => {
        const rows = Array.isArray(res) ? res : [];

        this.warehouses = rows
          .filter(x => !!x)
          .map((x: any) => ({
            warehouseCity: x.warehouseCity ?? x.city ?? x.warehouse ?? 'Unknown',
            totalVolume: Number(x.totalVolume ?? x.volume ?? 0)
          }))
          .filter(x => x.totalVolume > 0);

        this.totalVolumeSum = this.warehouses.reduce(
          (sum, warehouse) => sum + warehouse.totalVolume,
          0
        );

        this.salesoverviewChart = {
          ...this.salesoverviewChart,
          series: this.warehouses.map(x => x.totalVolume),
          labels: this.warehouses.map(x => x.warehouseCity || 'Unknown'),
          plotOptions: {
            ...this.salesoverviewChart.plotOptions,
            pie: {
              ...this.salesoverviewChart.plotOptions?.pie,
              donut: {
                ...this.salesoverviewChart.plotOptions?.pie?.donut,
                labels: {
                  ...this.salesoverviewChart.plotOptions?.pie?.donut?.labels,
                  total: {
                    ...this.salesoverviewChart.plotOptions?.pie?.donut?.labels?.total,
                    label: this.totalVolumeSum.toLocaleString()
                  }
                }
              }
            }
          }
        };
      },
      error: (err) => {
        console.error('❌ Error al obtener datos de los almacenes:', err);
      }
    });
  }

  private initChart(): void {
    this.salesoverviewChart = {
      series: [],
      chart: {
        type: 'donut',
        height: 280,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        toolbar: { show: false }
      },
      labels: [],
      colors: ['#2f6df6', '#159889', '#f6b42c', '#7c3aed', '#22c55e', '#0ea5e9'],
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            background: 'transparent',
            labels: {
              show: true,
              name: {
                show: true,
                offsetY: 22,
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 500
              },
              value: {
                show: false
              },
              total: {
                show: true,
                showAlways: true,
                label: '0',
                color: '#0f172a',
                fontSize: '26px',
                fontWeight: 700
              }
            }
          },
          expandOnClick: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: false
      },
      legend: {
        show: true,
        position: 'right',
        fontSize: '13px',
        labels: {
          colors: '#64748b'
        },
        markers: {
          width: 10,
          height: 10,
          radius: 10
        },
        itemMargin: {
          vertical: 5
        }
      },
      tooltip: {
        theme: 'dark',
        fillSeriesColor: false
      },
      noData: {
        text: 'There is no data for that date',
        align: 'center',
        verticalAlign: 'middle',
        style: {
          color: '#999',
          fontSize: '14px'
        }
      }
    };
  }
}