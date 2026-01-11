import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { CoreService } from 'src/app/services/core.service';


@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatIconModule, TablerIconsModule, MatTabsModule, MatFormFieldModule, MatSlideToggleModule,
    MatSelectModule, MatInputModule, MatButtonModule, MatDividerModule,],
})
export class ChangePasswordComponent implements OnInit {
  form!: FormGroup;
  loading = false;


  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private employeeService: EmployeeService,
    private coreService: CoreService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    const { currentPassword, newPassword, confirmPassword } = this.form.value;

    if (newPassword !== confirmPassword) {
      this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;

    const body = {
      currentPassword,
      newPassword,
      confirmPassword
    };

    this.employeeService.changePassword(body).subscribe({
      next: (res: any) => {
        this.snackBar.open(res.message || 'Password updated successfully', 'Close', { duration: 3000 });
        this.form.reset();
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Something went wrong', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

}
