import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { PayRunDto } from 'src/app/models/payroll.models';

@Component({
  selector: 'app-run-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule],
  templateUrl: './run-detail-dialog.component.html'
})
export class RunDetailDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { run: PayRunDto },
    private ref: MatDialogRef<RunDetailDialogComponent>
  ) {}

  get lines() {
    // ordenar por SourceType e Id
    return [...(this.data.run?.lines || [])]
      .sort((a: any, b: any) => (a.sourceType || '').localeCompare(b.sourceType || '') || (a.id - b.id));
  }

  close() { this.ref.close(); }
}
