import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';

import {
  Observable,
  combineLatest,
  of
} from 'rxjs';

import {
  catchError,
  debounceTime,
  finalize,
  map,
  startWith
} from 'rxjs/operators';

import {
  Company,
  CompanyService
} from 'src/app/services/company.service';

import { MaterialModule } from 'src/app/material.module';

export interface SelectCompanyResult {
  company: Company;
}

@Component({
  selector: 'app-select-company-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MaterialModule
  ],
  template: `
    <div class="dialog-shell">

      <!-- Header -->
      <div class="dialog-header">

        <div class="header-copy">

          <div class="dialog-icon">
            <mat-icon>domain</mat-icon>
          </div>

          <div>
            <span class="dialog-eyebrow">
              Driver application
            </span>

            <h2>Select a company</h2>

            <p>
              Search for the delivery company you want to apply to.
            </p>
          </div>

        </div>

        <button
          mat-icon-button
          type="button"
          class="close-button"
          aria-label="Close dialog"
          (click)="close()"
        >
          <mat-icon>close</mat-icon>
        </button>

      </div>

      <!-- Search -->
      <div class="search-section">

        <mat-form-field
          appearance="outline"
          class="search-field"
        >
          <mat-icon matPrefix>search</mat-icon>

          <input
            matInput
            type="search"
            [formControl]="searchCtrl"
            placeholder="Search by company name or city"
            autocomplete="off"
          />

          <button
            *ngIf="searchCtrl.value"
            mat-icon-button
            matSuffix
            type="button"
            aria-label="Clear search"
            (click)="searchCtrl.setValue('')"
          >
            <mat-icon>close</mat-icon>
          </button>

        </mat-form-field>

      </div>

      <!-- Loading -->
      <div class="loading-state" *ngIf="loading">
        <mat-spinner diameter="34"></mat-spinner>
        <span>Loading companies...</span>
      </div>

      <!-- Error -->
      <div class="error-state" *ngIf="errorMessage && !loading">
        <mat-icon>error_outline</mat-icon>

        <div>
          <strong>Unable to load companies</strong>
          <span>{{ errorMessage }}</span>
        </div>
      </div>

      <!-- Company list -->
      <ng-container *ngIf="filtered$ | async as companies">

        <div
          class="result-summary"
          *ngIf="!loading && !errorMessage"
        >
          <span>
            {{ companies.length }}
            {{ companies.length === 1 ? 'company found' : 'companies found' }}
          </span>
        </div>

        <div
          class="company-list"
          *ngIf="!loading && companies.length > 0"
        >

          <article
            class="company-card"
            *ngFor="let company of companies"
          >

            <div class="company-avatar">
              {{ getInitials(company.name) }}
            </div>

            <div class="company-information">

              <strong>{{ company.name }}</strong>

              <div
                class="company-location"
                *ngIf="company.city"
              >
                <mat-icon>location_on</mat-icon>
                <span>{{ company.city }}</span>
              </div>

              <span
                class="company-description"
                *ngIf="!company.city"
              >
                Delivery company
              </span>

            </div>

            <button
              mat-flat-button
              type="button"
              class="apply-button"
              (click)="select(company)"
            >
              Apply
              <mat-icon>arrow_forward</mat-icon>
            </button>

          </article>

        </div>

        <!-- Empty -->
        <div
          class="empty-state"
          *ngIf="
            !loading &&
            !errorMessage &&
            companies.length === 0
          "
        >
          <div class="empty-icon">
            <mat-icon>search_off</mat-icon>
          </div>

          <h3>No companies found</h3>

          <p>
            Try searching with a different company name or city.
          </p>

          <button
            mat-stroked-button
            type="button"
            class="clear-button"
            (click)="searchCtrl.setValue('')"
          >
            Clear search
          </button>
        </div>

      </ng-container>

      <!-- Footer -->
      <div class="dialog-footer">

        <div class="footer-notice">
          <mat-icon>info</mat-icon>

          <span>
            You will be redirected to the selected company’s hiring page.
          </span>
        </div>

        <button
          mat-stroked-button
          type="button"
          class="cancel-button"
          (click)="close()"
        >
          Cancel
        </button>

      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    * {
      box-sizing: border-box;
    }

    .dialog-shell {
      width: 100%;
      max-height: min(780px, 90vh);
      display: flex;
      flex-direction: column;
      padding: 28px;
      overflow: hidden;
      background:
        radial-gradient(
          circle at 100% 0,
          rgba(37, 99, 235, 0.045),
          transparent 28%
        ),
        #ffffff;
    }

    /* Header */

    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }

    .header-copy {
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .dialog-icon {
      width: 50px;
      height: 50px;
      flex: 0 0 50px;
      display: grid;
      place-items: center;
      border: 1px solid #dbeafe;
      border-radius: 15px;
      background: #eff6ff;
      color: #2563eb;
    }

    .dialog-icon mat-icon {
      width: 25px;
      height: 25px;
      font-size: 25px;
    }

    .dialog-eyebrow {
      display: block;
      margin-bottom: 5px;
      color: #71717a;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .header-copy h2 {
      margin: 0;
      color: #18181b;
      font-size: 27px;
      line-height: 1.2;
      font-weight: 800;
      letter-spacing: -0.035em;
    }

    .header-copy p {
      margin: 7px 0 0;
      color: #71717a;
      font-size: 12px;
      line-height: 1.5;
    }

    .close-button {
      flex: 0 0 auto;
      color: #71717a;
    }

    .close-button:hover {
      background: #f4f4f5;
      color: #18181b;
    }

    /* Search */

    .search-section {
      margin-bottom: 8px;
    }

    .search-field {
      width: 100%;
    }

    ::ng-deep .search-field {
      .mat-mdc-text-field-wrapper {
        min-height: 56px;
        border-radius: 13px;
        background: #fafafa;
      }

      .mat-mdc-form-field-flex {
        min-height: 56px;
        align-items: center;
      }

      .mdc-notched-outline__leading {
        border-radius: 13px 0 0 13px !important;
      }

      .mdc-notched-outline__trailing {
        border-radius: 0 13px 13px 0 !important;
      }

      .mdc-notched-outline__leading,
      .mdc-notched-outline__notch,
      .mdc-notched-outline__trailing {
        border-color: #dddddf !important;
      }

      &:hover {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: #c7c7cb !important;
        }
      }

      &.mat-focused {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-width: 1.5px !important;
          border-color: #2563eb !important;
        }

        mat-icon[matPrefix] {
          color: #2563eb;
        }
      }

      mat-icon[matPrefix] {
        margin-right: 9px;
        color: #a1a1aa;
      }

      input {
        color: #18181b;
        font-size: 13px;
      }

      input::placeholder {
        color: #a1a1aa;
      }

      .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    /* Summary */

    .result-summary {
      display: flex;
      justify-content: flex-end;
      margin: 6px 2px 12px;
      color: #a1a1aa;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* List */

    .company-list {
      min-height: 0;
      display: grid;
      gap: 10px;
      padding: 2px 3px 4px 0;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #d4d4d8 transparent;
    }

    .company-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      border: 1px solid #e4e4e7;
      border-radius: 15px;
      background: #fafafa;
      transition:
        transform 0.2s ease,
        border-color 0.2s ease,
        background 0.2s ease,
        box-shadow 0.2s ease;
    }

    .company-card:hover {
      transform: translateY(-2px);
      border-color: #bfdbfe;
      background: #ffffff;
      box-shadow: 0 13px 30px rgba(15, 23, 42, 0.06);
    }

    .company-avatar {
      width: 46px;
      height: 46px;
      flex: 0 0 46px;
      display: grid;
      place-items: center;
      border: 1px solid #dbeafe;
      border-radius: 13px;
      background: #eff6ff;
      color: #2563eb;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .company-information {
      flex: 1;
      min-width: 0;
    }

    .company-information > strong {
      display: block;
      overflow: hidden;
      color: #27272a;
      font-size: 13px;
      font-weight: 750;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .company-location {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 5px;
      color: #85858e;
    }

    .company-location mat-icon {
      width: 15px;
      height: 15px;
      font-size: 15px;
    }

    .company-location span,
    .company-description {
      color: #85858e;
      font-size: 11px;
    }

    .company-description {
      display: block;
      margin-top: 5px;
    }

    /* Apply button */

    .apply-button {
      height: 40px;
      padding: 0 17px !important;
      flex: 0 0 auto;
      border-radius: 10px !important;
      background: #2563eb !important;
      color: #ffffff !important;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 8px 18px rgba(37, 99, 235, 0.2);
      transition:
        transform 0.2s ease,
        background 0.2s ease,
        box-shadow 0.2s ease;
    }

    .apply-button:hover {
      transform: translateY(-1px);
      background: #1d4ed8 !important;
      box-shadow: 0 11px 24px rgba(37, 99, 235, 0.27);
    }

    .apply-button mat-icon {
      width: 17px;
      height: 17px;
      margin-left: 6px;
      font-size: 17px;
    }

    /* States */

    .loading-state,
    .error-state,
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-state {
      min-height: 210px;
      flex-direction: column;
      gap: 15px;
      color: #71717a;
      font-size: 12px;
      font-weight: 700;
    }

    ::ng-deep .loading-state {
      .mat-mdc-progress-spinner circle {
        stroke: #2563eb !important;
      }
    }

    .error-state {
      gap: 12px;
      margin: 8px 0;
      padding: 16px;
      border: 1px solid #fecaca;
      border-radius: 13px;
      background: #fef2f2;
      color: #b91c1c;
    }

    .error-state > mat-icon {
      flex: 0 0 auto;
    }

    .error-state strong,
    .error-state span {
      display: block;
    }

    .error-state strong {
      margin-bottom: 3px;
      font-size: 12px;
    }

    .error-state span {
      font-size: 10px;
      line-height: 1.5;
    }

    .empty-state {
      min-height: 260px;
      flex-direction: column;
      padding: 30px;
      text-align: center;
    }

    .empty-icon {
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      margin-bottom: 16px;
      border-radius: 15px;
      background: #f0f0f1;
      color: #71717a;
    }

    .empty-icon mat-icon {
      width: 26px;
      height: 26px;
      font-size: 26px;
    }

    .empty-state h3 {
      margin: 0;
      color: #3f3f46;
      font-size: 15px;
    }

    .empty-state p {
      margin: 7px 0 16px;
      color: #8a8a92;
      font-size: 11px;
    }

    .clear-button {
      border-color: #d4d4d8 !important;
      border-radius: 10px !important;
      color: #52525b !important;
    }

    /* Footer */

    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid #ececef;
    }

    .footer-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #8a8a92;
    }

    .footer-notice mat-icon {
      width: 17px;
      height: 17px;
      flex: 0 0 17px;
      color: #71717a;
      font-size: 17px;
    }

    .footer-notice span {
      font-size: 10px;
      line-height: 1.5;
    }

    .cancel-button {
      height: 40px;
      flex: 0 0 auto;
      border: 1px solid #d4d4d8 !important;
      border-radius: 10px !important;
      background: #ffffff !important;
      color: #52525b !important;
      font-size: 12px;
      font-weight: 700;
    }

    .cancel-button:hover {
      border-color: #bfdbfe !important;
      background: #eff6ff !important;
      color: #2563eb !important;
    }

    /* Responsive */

    @media (max-width: 620px) {
      .dialog-shell {
        max-height: 92vh;
        padding: 22px 17px;
      }

      .dialog-header {
        margin-bottom: 19px;
      }

      .header-copy {
        gap: 11px;
      }

      .dialog-icon {
        width: 44px;
        height: 44px;
        flex-basis: 44px;
      }

      .header-copy h2 {
        font-size: 23px;
      }

      .company-card {
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .company-information {
        width: calc(100% - 62px);
      }

      .apply-button {
        width: 100%;
        margin-top: 3px;
      }

      .dialog-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .cancel-button {
        width: 100%;
      }
    }
  `]
})
export class SelectCompanyDialogComponent implements OnInit {

  searchCtrl = new FormControl('', {
    nonNullable: true
  });

  filtered$!: Observable<Company[]>;

  loading = false;
  errorMessage = '';

  constructor(
    private ref: MatDialogRef<SelectCompanyDialogComponent>,
    private companySvc: CompanyService
  ) {}

  ngOnInit(): void {
    this.loading = true;

    const companies$ = this.companySvc.getCompaniesWeb().pipe(
      catchError((error) => {
        console.error('Error loading companies', error);

        this.errorMessage =
          error?.error?.message ||
          'Please try again in a few moments.';

        return of([] as Company[]);
      }),
      finalize(() => {
        this.loading = false;
      })
    );

    this.filtered$ = combineLatest([
      companies$,
      this.searchCtrl.valueChanges.pipe(
        startWith(''),
        debounceTime(200)
      )
    ]).pipe(
      map(([companies, searchTerm]) => {
        const query = searchTerm
          .toLowerCase()
          .trim();

        if (!query) {
          return companies;
        }

        return companies.filter((company) => {
          const name = company.name
            ?.toLowerCase() ?? '';

          const city = company.city
            ?.toLowerCase() ?? '';

          return (
            name.includes(query) ||
            city.includes(query)
          );
        });
      })
    );
  }

  getInitials(name?: string): string {
    if (!name?.trim()) {
      return 'CO';
    }

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  select(company: Company): void {
    const result: SelectCompanyResult = {
      company
    };

    this.ref.close(result);
  }

  close(): void {
    this.ref.close();
  }
}