import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import {
  FormGroup,
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { BrandingComponent } from '../../../layouts/full/vertical/sidebar/branding.component';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-side-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    BrandingComponent,
  ],
  templateUrl: './side-forgot-password.component.html',
  styleUrls:['./side-forgot-pwd.component.scss']
})
export class AppSideForgotPasswordComponent {
  options = this.settings.getOptions();
  loading = false;
currentYear = new Date().getFullYear();
  constructor(
    private settings: CoreService,
    private snackBar: MatSnackBar
  ) {}

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  get f() {
    return this.form.controls;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const email = this.form.value.email ?? '';

    this.settings.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading = false;

        this.snackBar.open(
          res?.message || 'Password reset email sent successfully.',
          'Close',
          { duration: 4000 }
        );
      },
      error: (err) => {
        this.loading = false;

        this.snackBar.open(
          err?.error?.message || 'Email could not be sent.',
          'Close',
          { duration: 4000 }
        );
      },
    });
  }
}