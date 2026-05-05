import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { Loan } from 'src/app/models/loan.models';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { CoreService } from 'src/app/services/core.service';
import { LoanService } from 'src/app/services/loan.service';

interface SimpleEmployee {
  id: number;
  fullName: string;
}

@Component({
  selector: 'app-add',
  imports: [MaterialModule],
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss',
})
export class AddComponent {
  private dialogRef = inject(MatDialogRef<AddComponent>);
  private fb = inject(FormBuilder);
  private settings = inject(CoreService);
  private employeeService = inject(EmployeeService);
  private loansService = inject(LoanService);

  form!: FormGroup;
  loading = false;
  
  // Signals for state management and filtering
  allEmployees = signal<SimpleEmployee[]>([]);
  searchQuery = signal<string>('');
  
  // Computed signal that automatically updates when allEmployees or searchQuery changes
  filteredEmployees = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.allEmployees().filter(emp => 
      emp.fullName.toLowerCase().includes(query)
    );
  });

  constructor() {
    this.form = this.fb.nonNullable.group({
      driverId: ['', [Validators.required]],
      principal: [0, [Validators.required, Validators.min(1)]],
      installmentAmount: [0, [Validators.required, Validators.min(1)]],
      maxDeductionPerPayRun: [0, [Validators.required, Validators.min(1)]],
      notes: [''],
    });
  }

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getEmployees().subscribe({
      next: (res: any[]) => {
        const mapped = res.map(emp => ({
          id: emp.id,
          fullName: `${emp.name} ${emp.lastName}`
        }));
        
        this.allEmployees.set(mapped);
        this.loading = false;
      },
      error: (err) => {
        this.settings.showError(err?.error?.message || 'Error loading employees.');
        this.loading = false;
      },
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

submit(): void {
  if (this.form.valid) {
    this.loading = true;
    this.loansService.save(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.settings.showSuccess('Loan created successfully!');
        this.dialogRef.close(true); 
      },
      error: (err) => {
        this.loading = false;
        this.settings.showError('Error: ' + (err.error?.message || 'Server error'));
      }
    });
  }
}

  onCancel(): void {
    this.dialogRef.close();
  }
}
