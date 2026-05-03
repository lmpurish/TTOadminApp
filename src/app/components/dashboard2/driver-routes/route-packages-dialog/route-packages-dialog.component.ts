import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CommonModule } from '@angular/common'; // ✅ IMPORTANTE
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
interface PackageDto {
  id: number;
  tracking: string;
  status: string;
  incidentDate: string;
  address: string;
  zipCode?: string;
  reviewStatus?: string;
  weight?:number
}

@Component({
  selector: 'app-route-packages-dialog',
  standalone: true,
  imports: [
    CommonModule,            // ✅ date pipe vive aquí
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './route-packages-dialog.component.html',
  styleUrl: './route-packages-dialog.component.scss'
})
export class RoutePackagesDialogComponent implements AfterViewInit {
  displayedColumns: string[] = ['tracking', 'status', 'zipCode', 'reviewStatus', 'incidentDate', 'address','weight'];
  dataSource = new MatTableDataSource<PackageDto>([]);

  @ViewChild(MatTable) table!: MatTable<PackageDto>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    public dialogRef: MatDialogRef<RoutePackagesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      routeId: number;
      date: string | Date;
      warehouseId?: number;
      zoneCode?: string | null;
      packages: PackageDto[];
      payrollBySourceType?: Record<string, number>;
      payRunLines?: any[];
      payrollTotal?: number;
      payrollPositive?: number;
      payrollNegative?: number;
      weight?:number;
    }
  ) {
    this.dataSource.data = (data?.packages ?? []);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(value: string) {
    this.dataSource.filter = (value ?? '').trim().toLowerCase();
  }

  close() {
    this.dialogRef.close();
  }
  payrollKeys(): string[] {
    const obj = this.data?.payrollBySourceType ?? {};
    return Object.keys(obj);
  }
}