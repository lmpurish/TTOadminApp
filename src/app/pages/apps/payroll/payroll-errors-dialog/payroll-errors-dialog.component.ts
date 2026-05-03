import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type PayrollErrorRow = {
  warehouseId: number;
  warehouseName: string;
  message: string;
  status?: number;
  raw?: any;
};

@Component({
  selector: 'app-payroll-errors-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Errores al calcular nómina</h2>

    <mat-dialog-content>
      <p *ngIf="!rows?.length">No hay errores.</p>

      <div *ngIf="rows?.length">
        <mat-form-field appearance="outline" class="w-100" style="margin-bottom: 12px;">
          <mat-label>Buscar</mat-label>
          <input matInput (input)="onFilter($any($event.target).value)" placeholder="ID o nombre del warehouse" />
        </mat-form-field>

        <div class="table-responsive">
          <table mat-table [dataSource]="filteredRows" class="w-100">

            <ng-container matColumnDef="warehouse">
              <th mat-header-cell *matHeaderCellDef>Warehouse</th>
              <td mat-cell *matCellDef="let r">
                <div>
                  <b>{{ r.warehouseName }}</b>
                  <div class="text-muted">ID: {{ r.warehouseId }}</div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let r">{{ r.status ?? '-' }}</td>
            </ng-container>

            <ng-container matColumnDef="message">
              <th mat-header-cell *matHeaderCellDef>Mensaje</th>
              <td mat-cell *matCellDef="let r">{{ r.message }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
              <td mat-cell *matCellDef="let r" class="text-right">
                <button mat-stroked-button (click)="toggleRaw(r.warehouseId)">Raw</button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>

        <div *ngIf="expandedWarehouseId != null" style="margin-top: 12px;">
          <h4 style="margin: 8px 0;">Detalle (raw)</h4>
          <pre style="white-space: pre-wrap; max-height: 260px; overflow: auto; background: #f6f6f6; padding: 12px; border-radius: 8px;">
{{ getExpandedRaw() | json }}
</pre>
        </div>

        <details style="margin-top: 12px;">
          <summary>Ver JSON completo</summary>
          <pre style="white-space: pre-wrap; max-height: 260px; overflow:auto; background:#f6f6f6; padding: 12px; border-radius: 8px;">
{{ rows | json }}
</pre>
        </details>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `
})
export class PayrollErrorsDialogComponent {
  rows: PayrollErrorRow[] = [];
  filteredRows: PayrollErrorRow[] = [];
  displayedColumns: string[] = ['warehouse', 'status', 'message', 'actions'];

  expandedWarehouseId: number | null = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { rows: PayrollErrorRow[] }) {
    this.rows = data?.rows ?? [];
    this.filteredRows = [...this.rows];
  }

  onFilter(value: string) {
    const f = (value ?? '').trim().toLowerCase();
    if (!f) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter(r =>
      (r.warehouseName ?? '').toLowerCase().includes(f) ||
      String(r.warehouseId).includes(f)
    );
  }

  toggleRaw(warehouseId: number) {
    this.expandedWarehouseId = (this.expandedWarehouseId === warehouseId) ? null : warehouseId;
  }

  getExpandedRaw(): any {
    const row = this.rows.find(r => r.warehouseId === this.expandedWarehouseId);
    return row?.raw ?? null;
  }
}
