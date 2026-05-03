import { Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';

import { PayrollService } from 'src/app/services/payroll.service';
import { PayrollConf } from './payrollConf';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-payroll-conf',
  standalone: true,
  imports: [
    MaterialModule,
 
  ],
  templateUrl: './payroll-conf.component.html',
  styleUrl: './payroll-conf.component.scss'
})
export class PayrollConfComponent {
  loading = false;
  textFilter = '';

  dataSource = new MatTableDataSource<PayrollConf>([]);
  selection = new SelectionModel<PayrollConf>(true, []);

  displayedColumns: string[] = [
    'select',
    'warehouseId',
    'enableWeightExtra',
    'enablePenalties',
    'enableBonuses',
    'defaultPenaltyAmount',
    'penaltyCapPerWeek',
    'isActive',
    'action',
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private payrollServ: PayrollService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // filtro “inteligente”
    this.dataSource.filterPredicate = (row, filter) => {
      const f = (filter ?? '').trim().toLowerCase();
      const text =
        `${row.warehouseId} ` +
        `${row.EnableWeightExtra} ${row.EnablePenalties} ${row.EnableBonuses} ` +
        `${row.DefaultPenaltyAmount ?? ''} ${row.PenaltyCapPerWeek ?? ''} ` +
        `${row.IsActive ?? ''}`.toLowerCase();

      return text.includes(f);
    };

    this.loadPayrollConf();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadPayrollConf(): void {
    this.loading = true;
    this.payrollServ.getPayConf().subscribe({
      next: (res) => {
        console.log(res)
        this.dataSource.data = res ?? [];
        this.selection.clear();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Error loading payroll configs.', 'Cerrar', { duration: 5000 });
      },
      complete: () => (this.loading = false),
    });
  }

  applyFilter(value: string) {
    this.textFilter = value ?? '';
    this.dataSource.filter = this.textFilter;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  // ----- selection helpers -----
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numRows > 0 && numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach(row => this.selection.select(row));
  }

  checkboxLabel(row?: PayrollConf): string {
    if (!row) return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`;
  }

  // placeholders para tus botones (si aún no tienes backend)
  saveSelected() {
    this.snackBar.open(`Selected: ${this.selection.selected.length}`, 'Cerrar', { duration: 2500 });
  }

  saveRowByElement(element: PayrollConf) {
    this.snackBar.open(`Save row WarehouseId=${element.warehouseId}`, 'Cerrar', { duration: 2500 });
  }

  resetRowByElement(element: PayrollConf) {
    // aquí normalmente restauras el valor original desde un backup
    this.snackBar.open(`Reset row WarehouseId=${element.warehouseId}`, 'Cerrar', { duration: 2500 });
  }
}
