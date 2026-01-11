// dialogs/select-company-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, map, startWith } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';
import { Company, CompanyService } from 'src/app/services/company.service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MaterialModule } from 'src/app/material.module';
import { BrandingComponent } from 'src/app/layouts/full/vertical/sidebar/branding.component';

export interface SelectCompanyResult {
    company: Company;
}

@Component({
    selector: 'app-select-company-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule,MatFormFieldModule,FormsModule,MaterialModule, ReactiveFormsModule

    ],
    template: `
    <h2 mat-dialog-title class="m-0">Select a company to apply</h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-100 m-b-12">
        <mat-label>Search by name or city</mat-label>
        <input matInput [formControl]="searchCtrl" placeholder="e.g., Torres Transportation One" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <div class="table-responsive" *ngIf="filtered$ | async as rows">
        <table mat-table [dataSource]="rows" class="w-100">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Company</th>
            <td mat-cell *matCellDef="let c">
              <div class="f-w-600">{{ c.name }}</div>
              <small class="text-muted" *ngIf="c.city">{{ c.city }}</small>
            </td>
          </ng-container>

          <ng-container matColumnDef="apply">
            <th mat-header-cell *matHeaderCellDef>Action</th>
            <td mat-cell *matCellDef="let c">
              <button mat-flat-button color="primary" (click)="select(c)">Apply</button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="m-t-8" *ngIf="rows.length === 0">
          <small class="text-muted">No companies found.</small>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Cancel</button>
    </mat-dialog-actions>
  `
})
export class SelectCompanyDialogComponent implements OnInit {
    displayedColumns = ['name', 'apply'];
    searchCtrl = new FormControl('');
    filtered$!: Observable<Company[]>;
    private companies: Company[] = [];

    constructor(
        private ref: MatDialogRef<SelectCompanyDialogComponent>,
        private companySvc: CompanyService
    ) { }

    ngOnInit(): void {
        const companies$ = this.companySvc.getCompaniesWeb();
        this.filtered$ = combineLatest([
            companies$,
            this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(200))
        ]).pipe(
            map(([list, term]) => {
                this.companies = list;
                const q = (term ?? '').toString().toLowerCase().trim();
                if (!q) return list;
                return list.filter(c =>
                    (c.name ?? '').toLowerCase().includes(q) ||
                    (c.city ?? '').toLowerCase().includes(q)
                );
            })
        );
    }

    select(company: Company) {
        const result: SelectCompanyResult = { company };
        this.ref.close(result);
    }

    close() { this.ref.close(); }
}
