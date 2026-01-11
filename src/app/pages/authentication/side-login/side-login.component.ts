import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { BrandingComponent } from '../../../layouts/full/vertical/sidebar/branding.component';
import ValidatorsForms from 'src/app/helpers/validateForms';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDriverDialogComponent } from './confirm-driver-dialog.component';
import { SelectCompanyDialogComponent, SelectCompanyResult } from './select-company-dialog.component';
import { of, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-side-login',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, BrandingComponent],
  templateUrl: './side-login.component.html',

})
export class AppSideLoginComponent {
  options = this.settings.getOptions();
  loginForm!: FormGroup;

  constructor(private settings: CoreService, private router: Router, private fb: FormBuilder, private toastr: ToastrService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: new FormControl('', [Validators.required, Validators.minLength(3)]),
      password: new FormControl('', [Validators.required]),
    })
  }




  get f() {
    return this.loginForm.controls;
  }

  onLogin() {
    if (!this.loginForm.valid) return;

    this.settings.login(this.loginForm.value).subscribe({
      next: () => {
        // 🔹 Obtener datos del usuario después del login
        this.settings.getCurrentUser().subscribe((me) => {
          localStorage.setItem('role', me.role);
          localStorage.setItem('hasCompany', me.hasCompany);

          localStorage.setItem('isFirstLogin', me.isFirstLogin);

          this.toastr.success('Login successful!');
          // ✅ Aquí decidimos UNA sola vez la navegación
          if (me.role === 'CompanyOwner' && !me.hasCompany) {
            this.router.navigate(['/apps/register-company-owner']);
          } else if (me.isFirstLogin) {
            this.router.navigate(['/apps/complete-profile']);
          } else {
            this.router.navigate(['/dashboards/dashboard2']);
          }
        });
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Login failed!');
      }
    });
  }
  onCreateCompanyClick(evt: Event) {
    evt.preventDefault();

    this.dialog.open(ConfirmDriverDialogComponent, { width: '360px', autoFocus: false })
      .afterClosed()
      .pipe(
        switchMap((isDriver: boolean | undefined) => {
          if (isDriver === true) {
            return this.dialog.open(SelectCompanyDialogComponent, { width: '720px', autoFocus: false })
              .afterClosed();
          } else if (isDriver === false) {
            // No es driver → ir al registro de compañías
            this.router.navigate(['/authentication/company-register']);
            return of(undefined);
          }
          return of(undefined);
        })
      )
      .subscribe((res?: SelectCompanyResult) => {
        if (!res) return;


        // 1) Si la compañía tiene careersUrl o website, redirigimos allí
        const targetUrl = `https://${res.company.websiteUrl?.trim()}/hiring`

        // Redirección inmediata
        window.location.href = targetUrl;
      });
  }





}

