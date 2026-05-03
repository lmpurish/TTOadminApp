import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSpinner } from '@angular/material/progress-spinner';

import { RentalVehicleService } from 'src/app/services/apps/rental/rental-vehicle.service';
import { RentalVehicle } from './rental-vehicle.model';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-rental-vehicle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSpinner,
    TablerIconsModule
  ],
  templateUrl: './rental-vehicle-dialog.component.html'
})
export class RentalVehicleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(RentalVehicleService);
  private toast = inject(ToastrService);
  private baseUrl = environment.apiUrl;
  loading = false;
  form!: FormGroup;

  statusOptions = ['Draft', 'Available', 'MaintenanceHold', 'Disabled'];
  metros: { id: number; city: string }[] = [];

  constructor(
    public dialogRef: MatDialogRef<RentalVehicleDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      action: 'Create' | 'Edit';
      vehicle: RentalVehicle | null;
      metros: { id: number; city: string }[];
      isAdmin: boolean;
      isCompanyOwner: boolean;
      userCompanyId: number | null;
    },
    private warehouseService: WarehouseService
  ) { }

  ngOnInit(): void {
    const v = this.data.vehicle;
    const isCreate = this.data.action === 'Create';
    const companyId = this.data.userCompanyId ?? v?.companyId ?? null;
    this.loadMetros(companyId);
    if (isCreate) {
      this.metros = [...(this.data.metros ?? [])];
    } else {
      this.metros = [...(this.data.metros ?? [])];
    }

    const defaultMetroId =
      v?.metroId ??
      (this.metros.length ? this.metros[0].id : null);

    this.form = this.fb.group({
      companyId: [this.data.userCompanyId ?? v?.companyId ?? null, Validators.required],
      metroId: [defaultMetroId, Validators.required],
      displayName: [v?.displayName ?? '', Validators.required],
      stockNumber: [v?.stockNumber ?? ''],
      year: [v?.year ?? null, Validators.required],
      make: [v?.make ?? '', Validators.required],
      model: [v?.model ?? '', Validators.required],
      trim: [v?.trim ?? ''],
      color: [v?.color ?? ''],
      transmission: [v?.transmission ?? ''],
      fuelType: [v?.fuelType ?? ''],
      seatingCapacity: [v?.seatingCapacity ?? null],
      trunkNotes: [v?.trunkNotes ?? ''],
      dailyPrice: [v?.dailyPrice ?? 0, Validators.required],
      weeklyPrice: [v?.weeklyPrice ?? 0, Validators.required],
      depositAmount: [v?.depositAmount ?? 0, Validators.required],
      vin: [v?.vin ?? ''],
      plate: [v?.plate ?? ''],
      facilityLocation: [v?.facilityLocation ?? ''],
      notes: [v?.notes ?? ''],
      gpsInstalled: [v?.gpsInstalled ?? false],
      dashCamInstalled: [v?.dashCamInstalled ?? false],
      status: [v?.status ?? 'Draft', Validators.required]
    });

    if (this.data.isCompanyOwner) {
      this.form.get('companyId')?.disable();
    }

    console.log(this.data)
  }

  loadMetros(companyId: number | null) {

    if (!companyId) return;

    this.warehouseService.getMetros(companyId).subscribe({
      next: (res) => {
        this.metros = res;

        if (this.data.action === 'Create' && res.length > 0) {
          this.form.patchValue({
            metroId: res[0].id
          });
        }
      },
      error: () => {
        this.toast.error('Error loading metros');
      }
    })
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const raw = this.form.getRawValue();

    const formData = new FormData();

    Object.keys(raw).forEach(key => {
      formData.append(key, raw[key] ?? '');
    });

    formData.set(
      'companyId',
      String(this.data.userCompanyId ?? raw.companyId)
    );

    this.selectedImages.forEach(file => {
      formData.append('images', file);
    });

    if (this.data.action === 'Create') {
      this.api.createVehicle(formData).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Vehicle created successfully', 'Success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.message || 'Error creating vehicle', 'Error');
        }
      });
    } else if (this.data.vehicle) {
      this.api.updateVehicle(this.data.vehicle.id, formData).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Vehicle updated successfully', 'Success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.message || 'Error updating vehicle', 'Error');
        }
      });
    }
  }

  selectedImages: File[] = [];
  imagePreviews: string[] = [];

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    this.selectedImages = Array.from(input.files);
    this.imagePreviews = [];

    this.selectedImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviews.push(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }
}