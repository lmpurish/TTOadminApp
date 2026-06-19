import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MaterialModule } from 'src/app/material.module';
import { CoreService } from 'src/app/services/core.service';
import { BrandingComponent } from 'src/app/layouts/full/vertical/sidebar/branding.component';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    BrandingComponent,
  ],
  templateUrl: './set-password.component.html',
  styleUrl: './set-password.component.scss',
})
export class SetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private auth = inject(CoreService);
  private router = inject(Router);

  loading = false;
  token = '';
  passwordMismatch = false;

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  get f() {
    return this.form.controls;
  }

  get tokenMissing(): boolean {
    return !this.token;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit(): void {
    this.passwordMismatch = false;

    if (this.form.invalid || this.tokenMissing) {
      this.form.markAllAsTouched();
      return;
    }

    const password = this.form.value.password!;
    const confirm = this.form.value.confirmPassword!;

    if (password !== confirm) {
      this.passwordMismatch = true;
      return;
    }

    this.loading = true;

    this.auth.setPassword({
      token: this.token,
      newPassword: password,
    }).subscribe({
      next: () => {
        this.router.navigate(['/authentication/login']);
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'Error creating password.');
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}