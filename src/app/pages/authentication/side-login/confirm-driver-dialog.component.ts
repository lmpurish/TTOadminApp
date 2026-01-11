// dialogs/confirm-driver-dialog.component.ts
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { BrandingComponent } from 'src/app/layouts/full/vertical/sidebar/branding.component';
import { MaterialModule } from 'src/app/material.module';

@Component({
    standalone: true,
    selector: 'app-confirm-driver-dialog',
    imports: [MatDialogModule,MatButtonModule

    ],
    template: `
    <h2 mat-dialog-title class="m-0">Are you a driver?</h2>
    <mat-dialog-content class="m-t-12">
      If you’re a driver, you can apply to an existing company.
      Otherwise, you can create a new company account.
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="m-t-12">
      <button mat-stroked-button (click)="close(false)">No</button>
      <button mat-flat-button color="primary" (click)="close(true)">Yes, I’m a driver</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDriverDialogComponent {
    constructor(private ref: MatDialogRef<ConfirmDriverDialogComponent>) { }
    close(val: boolean) { this.ref.close(val); }
}
