import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { BrandingComponent } from '../../../layouts/full/vertical/sidebar/branding.component';
import ValidatorsForms from 'src/app/helpers/validateForms';
import { ToastrService } from 'ngx-toastr';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // ✅ usar MatDialog
import { RedirectDialogComponent } from './app-redirect-dialog';

@Component({
  selector: 'app-side-register',
  standalone: true,                                // ✅ standalone
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, BrandingComponent, MatDialogModule],
  templateUrl: './side-register.component.html',
  styleUrls: ['./side-register.component.scss']
})
export class AppSideRegisterComponent {
  options = this.settings.getOptions();
  

  loading = false;
  showPassword = false;
  currentYear = new Date().getFullYear();

  constructor(
    private settings: CoreService,
    private router: Router,
    private toastrs: ToastrService,
    private dialog: MatDialog                      // ✅ MatDialog (no CDK Dialog)
  ) { }

  form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
    referralCode: new FormControl('')
  });

  get f() { return this.form.controls; }

  onSingup() {
    if (!this.form.valid) {
      ValidatorsForms.validateAllFormFields(this.form);
      return;
    }

    this.settings.signUp(this.form.value).subscribe({
      next: (res) => {
        if (res?.redirectUrl) {
          this.openRedirectDialog(res.redirectUrl, res.companyName);   // ✅ solo abrir diálogo; NO redirijas aquí
          return;
        }
        this.settings.showSuccess(res.message);
        this.form.reset();
        this.router.navigate(['authentication/login']);
      },
      error: (err) => this.settings.showError(err?.error?.message || 'Error')
    });
  }

  openRedirectDialog(url: string, companyName: string) {
    this.dialog.open(RedirectDialogComponent, {
      width: '420px',
      disableClose: true,
      data: { url, seconds: 5, companyName }
    });
  }
}

