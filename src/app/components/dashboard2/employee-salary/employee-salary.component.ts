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

export interface WarehouseGrossRow {
  warehouseId: number;
  warehouse: string;        // "Houston (OnTrac)"
  payPeriodId: number;
  grossAmountTotal: number; // 10261.4
  date: string;             // "Jan 29 2026"
}

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
  colors?: string[];
}

@Component({
  selector: 'app-employee-salary',
  imports: [NgApexchartsModule, MaterialModule, TablerIconsModule],
  templateUrl: './employee-salary.component.html',
})
export class AppEmployeeSalaryComponent implements OnChanges {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  // ✅ le pasas el JSON aquí (tal cual viene del API)
  @Input() rows: WarehouseGrossRow[] = [];

  public employeeChart!: Partial<employeeChart> | any;

  // (opcionales para mostrar abajo en el card)
  totalGross = 0;
  warehousesCount = 0;
  subtitleDate = '';

  constructor() {
    // ✅ chart base (vacío, se rellena en ngOnChanges)
    this.employeeChart = {
      series: [{ name: 'Gross', data: [] }],

      chart: {
        type: 'bar',
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
        foreColor: '#adb0bb',
        toolbar: { show: false },
        height: 270,
      },

      // mantiene tu estilo "distributed"
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '45%',
          distributed: true,
          endingShape: 'rounded',
        },
      },

      dataLabels: { enabled: false },

      legend: { show: false },

      grid: {
        yaxis: { lines: { show: false } },
      },

      xaxis: {
        categories: [],
        axisBorder: { show: false },
      },

      yaxis: {
        labels: { show: false },
      },

      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) =>
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0),
        },
      },
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this.applyRows(this.rows ?? []);
    }
  }

  private applyRows(rows: WarehouseGrossRow[]) {
    const clean = (rows ?? [])
      .filter(x => !!x && typeof x.grossAmountTotal === 'number')
      .slice()
      .sort((a, b) => (b.grossAmountTotal ?? 0) - (a.grossAmountTotal ?? 0));

    this.totalGross = clean.reduce((sum, r) => sum + (r.grossAmountTotal ?? 0), 0);
    this.warehousesCount = clean.length;

    const dates = Array.from(new Set(clean.map(x => x.date).filter(Boolean)));
    this.subtitleDate =
      dates.length === 1 ? dates[0] : (dates.length ? `${dates[0]} - ${dates[dates.length - 1]}` : '');

    const data = clean.map(r => r.grossAmountTotal);
    const categories = clean.map(r => [r.warehouse]); // 👈 para que quede como tu ejemplo: [['Houston...'], ['Tampa...']]

    // ✅ Colores distribuidos: deja uno "highlight" (el 1ro = mayor)
    const colors = clean.map((_, i) => (i === 0 ? '#5D87FF' : '#ECF2FF'));

    this.employeeChart = {
      ...this.employeeChart,
      colors,
      series: [{ name: 'Gross', data }],
      xaxis: { ...this.employeeChart.xaxis, categories },
    };
  }
}
