import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';

@Component({
    selector: 'app-payroll-adjustment-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MaterialModule],
    templateUrl: './payroll-adjustment-dialog.component.html'
})
export class PayrollAdjustmentDialogComponent {
    private fb = inject(FormBuilder);

    form = this.fb.group({
        type: ['Manual', Validators.required],
        reason: ['', Validators.required],
        amount: [0, Validators.required]
    });

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: {
            payRunId: number;
            driverName: string;
        },
        private dialogRef: MatDialogRef<PayrollAdjustmentDialogComponent>
    ) { }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.dialogRef.close({
            payRunId: this.data.payRunId,
            type: this.form.value.type,
            reason: this.form.value.reason,
            amount: Number(this.form.value.amount)
        });
    }

    close(): void {
        this.dialogRef.close();
    }

}