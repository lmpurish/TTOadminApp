import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatDividerModule } from '@angular/material/divider';
import { CoreService } from 'src/app/services/core.service';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { UploadAvatarComponent } from './upload-avatar/upload-avatar.component';
import { PhoneFormatPipe } from 'src/app/pipe/phone-format.pipe';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { ToRelativeUrlPipe } from 'src/app/pipe/ToRelativeUrlPipe ';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-account-setting',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, TablerIconsModule, MatTabsModule, MatFormFieldModule, MatSlideToggleModule, ReactiveFormsModule,
    MatSelectModule, MatInputModule, MatButtonModule, MatDividerModule, ChangePasswordComponent, UploadAvatarComponent, PhoneFormatPipe, PdfViewerModule],
  templateUrl: './account-setting.component.html'
})
export class AppAccountSettingComponent {
  userInfo: any | null = null;
  constructor(private service: CoreService, private userService: EmployeeService, private http: HttpClient, private fb: FormBuilder,
    private toastr: ToastrService,) { }
  avatarUrl: string = '';
  selectedFile: File | null = null;
  role: any;
  firstLogin: any;
  showPdf: boolean = false;
  contract: string;
  bankForm!: FormGroup;
  pdfErrorMsg = '';
  submitting = false;
  ssnUrl: string = '';

  showSsn = false;
  private ssnAutoHideTimer: any = null;
  ngOnInit(): void {
    const id = this.service.getUserInfoFromToken()?.id;
    this.role = this.service.getRole();
    this.firstLogin = this.service.getIsFirstLogin();
    this.bankForm = this.fb.group({
      accountNumber: [''],
      routingNumber: ['']
    });

    if (id) {
      this.userService.getUserInfo().subscribe({
        next: (res) => {
          this.userInfo = res;
          if (this.userInfo.avatar) {
            this.service.getAvatar(this.userInfo.avatar).subscribe(url => {
              this.avatarUrl = url;
            });
          }

          this.bankForm.patchValue({
            accountNumber: this.userInfo.accountNumber || '',
            routingNumber: this.userInfo.routingNumber || ''
          });
          this.bankForm.markAsPristine(); // opcional
        },
        error: (err) => {
          console.error('Error getting user information: ', err);
        }
      });
    } else {
      console.warn('The user ID could not be obtained from the token.');
    }



  }
  saveBankAccount(): void {
    if (this.bankForm.invalid) return;

    const dto = {
      accountNumber: this.bankForm.get('accountNumber')?.value,
      routingNumber: this.bankForm.get('routingNumber')?.value,
      fullName: this.userInfo.name + " " + this.userInfo.lastName,
      isDefault: true
    }
    this.submitting = true;

    // 👇 si no existe accountId en userInfo → crear (POST)
    if (!this.userInfo?.accountId) {
      this.service.createBankAccount(dto).subscribe({
        next: (res: any) => {
          this.toastr.success('Bank account created!');
          // guarda el nuevo id para futuros updates
          this.userInfo.accountId = res.id;
          this.submitting = false;
          this.bankForm.markAsPristine();
        },
        error: () => {
          this.toastr.error('Error creating bank account');
          this.submitting = false;
        }
      });
    } else {
      // 👇 existe → actualizar (PUT)
      this.service.updateBankAccount(this.userInfo.accountId, dto).subscribe({
        next: () => {
          this.toastr.success('Bank account updated!');
          this.submitting = false;
          this.bankForm.markAsPristine();
        },
        error: () => {
          this.toastr.error('Error updating bank account');
          this.submitting = false;
        }
      });
    }
  }
  cancelChanges(): void {
    this.bankForm.reset({
      accountNumber: this.userInfo?.accountNumber || '',
      routingNumber: this.userInfo?.routingNumber || ''
    });
  }
  toggleSsn(): void {
    if (this.userInfo.ssnUrl) {
      this.service.getSsnImageBlob(this.userInfo.ssnUrl).subscribe(url => {
        this.ssnUrl = url
      })
    }
    this.showSsn = !this.showSsn;

    // (Opcional) Auto-ocultar después de 10s por seguridad
    clearTimeout(this.ssnAutoHideTimer);
    if (this.showSsn) {
      this.ssnAutoHideTimer = setTimeout(() => (this.showSsn = false), 10_000);
    }
  }

  showInsurance: boolean = false;
  InsuranceAutoHideTimer: any = null;
  insuranceUrl: string = '';
  toggleInsurance(): void {
    if (this.userInfo.insuranceUrl) {
      this.service.getInsuranceBlob(this.userInfo.insuranceUrl).subscribe(url => {
        this.insuranceUrl = url
      })
    }
    this.showInsurance = !this.showInsurance;
    clearTimeout(this.InsuranceAutoHideTimer);
    if (this.showInsurance) {
      this.InsuranceAutoHideTimer = setTimeout(() => (this.showInsurance = false), 10_000);
    }
  }
  showDriverLicense: boolean = false;
  DriverLicenseAutoHideTimer: any = null;
  DriverLicenseUrl: string = '';
  toggleDriverLicense(): void {
    if (this.userInfo.driverUrl) {
      this.service.getDriverLicenceBlob(this.userInfo.driverUrl).subscribe(url => {
        this.DriverLicenseUrl = url
      })
    }
    this.showDriverLicense = !this.showDriverLicense;
    clearTimeout(this.DriverLicenseAutoHideTimer);
    if (this.showDriverLicense) {
      this.DriverLicenseAutoHideTimer = setTimeout(() => (this.showDriverLicense = false), 10_000);
    }
  }


  onPdfError(err: any) {
    console.error('PDF error', err);
    this.pdfErrorMsg = (err && (err.message || err)) ?? 'Error cargando PDF';
  }





} 
