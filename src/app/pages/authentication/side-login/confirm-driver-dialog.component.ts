import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-confirm-driver-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MaterialModule
  ],
  template: `
    <div class="dialog-shell">

      <!-- Header -->
      <div class="dialog-header">

        <div class="dialog-icon">
          <mat-icon>local_shipping</mat-icon>
        </div>

        <button
          mat-icon-button
          type="button"
          class="close-button"
          aria-label="Close dialog"
          (click)="dismiss()"
        >
          <mat-icon>close</mat-icon>
        </button>

      </div>

      <!-- Content -->
      <div class="dialog-content">

        <span class="dialog-eyebrow">
          Registration options
        </span>

        <h2>Are you a driver?</h2>

        <p>
          Choose the option that best describes you so we can direct you
          to the correct registration process.
        </p>

        <div class="option-list">

          <!-- Driver option -->
          <button
            type="button"
            class="option-card"
            (click)="close(true)"
          >
            <div class="option-icon driver">
              <mat-icon>person_pin_circle</mat-icon>
            </div>

            <div class="option-copy">
              <strong>Yes, I’m a driver</strong>

              <span>
                Search for an existing delivery company and apply through
                its hiring page.
              </span>
            </div>

            <mat-icon class="option-arrow">
              arrow_forward
            </mat-icon>
          </button>

          <!-- Owner option -->
          <button
            type="button"
            class="option-card"
            (click)="close(false)"
          >
            <div class="option-icon company">
              <mat-icon>apartment</mat-icon>
            </div>

            <div class="option-copy">
              <strong>No, I’m a company owner</strong>

              <span>
                Create a new company account and start managing your
                logistics operation.
              </span>
            </div>

            <mat-icon class="option-arrow">
              arrow_forward
            </mat-icon>
          </button>

        </div>

      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <mat-icon>shield</mat-icon>

        <span>
          Your selection only determines the correct registration flow.
        </span>
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
      position: relative;
      width: 100%;
      padding: 28px;
      overflow: hidden;
      background:
        radial-gradient(
          circle at 100% 0,
          rgba(37, 99, 235, 0.055),
          transparent 30%
        ),
        #ffffff;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
    }

    .dialog-icon {
      width: 50px;
      height: 50px;
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

    .close-button {
      color: #71717a;
    }

    .close-button:hover {
      background: #f4f4f5;
      color: #18181b;
    }

    .dialog-content {
      padding: 0;
    }

    .dialog-eyebrow {
      display: block;
      margin-bottom: 8px;
      color: #71717a;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .dialog-content h2 {
      margin: 0;
      color: #18181b;
      font-size: 27px;
      line-height: 1.2;
      font-weight: 800;
      letter-spacing: -0.035em;
    }

    .dialog-content > p {
      margin: 11px 0 24px;
      color: #71717a;
      font-size: 13px;
      line-height: 1.65;
    }

    .option-list {
      display: grid;
      gap: 12px;
    }

    .option-card {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      border: 1px solid #e4e4e7;
      border-radius: 15px;
      background: #fafafa;
      color: inherit;
      text-align: left;
      cursor: pointer;
      transition:
        transform 0.2s ease,
        border-color 0.2s ease,
        background 0.2s ease,
        box-shadow 0.2s ease;
    }

    .option-card:hover {
      transform: translateY(-2px);
      border-color: #bfdbfe;
      background: #ffffff;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.07);
    }

    .option-card:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .option-icon {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      display: grid;
      place-items: center;
      border-radius: 12px;
    }

    .option-icon.driver {
      border: 1px solid #dbeafe;
      background: #eff6ff;
      color: #2563eb;
    }

    .option-icon.company {
      border: 1px solid #e4e4e7;
      background: #f0f0f1;
      color: #52525b;
    }

    .option-icon mat-icon {
      width: 22px;
      height: 22px;
      font-size: 22px;
    }

    .option-copy {
      flex: 1;
      min-width: 0;
    }

    .option-copy strong,
    .option-copy span {
      display: block;
    }

    .option-copy strong {
      margin-bottom: 4px;
      color: #27272a;
      font-size: 13px;
      font-weight: 750;
    }

    .option-copy span {
      color: #85858e;
      font-size: 11px;
      line-height: 1.5;
    }

    .option-arrow {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
      color: #a1a1aa;
      font-size: 20px;
      transition:
        transform 0.2s ease,
        color 0.2s ease;
    }

    .option-card:hover .option-arrow {
      transform: translateX(3px);
      color: #2563eb;
    }

    .dialog-footer {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      margin-top: 20px;
      padding: 12px 13px;
      border: 1px solid #ececef;
      border-radius: 12px;
      background: #fbfbfb;
      color: #8a8a92;
    }

    .dialog-footer mat-icon {
      width: 17px;
      height: 17px;
      flex: 0 0 17px;
      color: #71717a;
      font-size: 17px;
    }

    .dialog-footer span {
      font-size: 10px;
      line-height: 1.5;
    }

    @media (max-width: 520px) {
      .dialog-shell {
        padding: 22px 18px;
      }

      .dialog-content h2 {
        font-size: 24px;
      }

      .option-card {
        align-items: flex-start;
        padding: 14px;
      }

      .option-arrow {
        margin-top: 10px;
      }
    }
  `]
})
export class ConfirmDriverDialogComponent {

  constructor(
    private ref: MatDialogRef<ConfirmDriverDialogComponent>
  ) {}

  close(value: boolean): void {
    this.ref.close(value);
  }

  dismiss(): void {
    this.ref.close(undefined);
  }
}