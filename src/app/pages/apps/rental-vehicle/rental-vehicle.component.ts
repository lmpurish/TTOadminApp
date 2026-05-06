import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

import { CoreService } from 'src/app/services/core.service';
import { RentalVehicleService } from 'src/app/services/apps/rental/rental-vehicle.service';
import { RentalVehicle } from './rental-vehicle.model';
import { RentalVehicleDialogComponent } from './rental-vehicle-dialog.component';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { AppTopCardsComponent } from './Components/top-cards/top-cards.component';
import { AppTopProjectsComponent } from './Components/top-projects/top-projects.component';
import { MatSpinner } from '@angular/material/progress-spinner';
import { AppRevenueUpdatesComponent } from './Components/revenue-updates/revenue-updates.component';
import { AppVehicleStatusGraphicComponent} from './Components/Vehicle-status-graphic/vehicle-status-graphic.component'
import { RecentRentalsComponent} from './Components/Recent-Rentals/recent-rentals.component'

@Component({
  selector: 'app-rental-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    TablerIconsModule,
    AppTopCardsComponent,
    AppTopProjectsComponent,
    MatSpinner,
    AppRevenueUpdatesComponent,
    AppVehicleStatusGraphicComponent,
    RecentRentalsComponent,


  ],
  templateUrl: './rental-vehicle.component.html'
})
export class RentalVehiclesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(RentalVehicleService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastrService);
  private coreService = inject(CoreService);
  public baseUrl = environment.fileUrl;
  
  isAdmin = false;
  isCompanyOwner = false;
  userCompanyId: number | null = null;

  filterForm: FormGroup = this.fb.group({
    metroId: [null],
    status: ['']
  });
  constructor(
    private warehouseService: WarehouseService
  ) { }
  displayedColumns: string[] = [
    'image',
    'displayName',
    'metro',
    'year',
    'makeModel',
    'dailyPrice',
    'weeklyPrice',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<RentalVehicle>([]);
  statusOptions = ['Draft', 'Available', 'MaintenanceHold', 'Disabled'];

  metros: { id: number; city: string }[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    const role = this.coreService.getRole?.() || '';
    this.isAdmin = role === 'Admin';
    this.isCompanyOwner = role === 'CompanyOwner';
    this.userCompanyId = this.coreService.getCompanyId?.() ?? null;

    this.loadVehicles();
    this.loadMetros(this.userCompanyId);
  }
  loadingVehicles = false;
  loadVehicles(): void {
    this.loadingVehicles = true;
    const { metroId, status } = this.filterForm.value;

    this.api.getVehicles(metroId, status).subscribe({
      next: (res) => {
        console.log(res)
        this.dataSource.data = res || [];
        this.loadingVehicles = false;

        if (this.paginator) this.dataSource.paginator = this.paginator;
        if (this.sort) this.dataSource.sort = this.sort;
      },
      error: () => {
        this.loadingVehicles = false;
        this.toast.error('Error loading vehicles', 'Error');
      }
    });
  }
  
  loadMetros(companyId: number | null) {

    if (!companyId) return;

    this.warehouseService.getMetros(companyId).subscribe({
      next: (res) => {
        this.metros = res;

      },
      error: () => {
        this.toast.error('Error loading metros');
      }
    })
  }
  applyFilters(filer: any): void {
    this.loadVehicles();
  }

  clearFilters(): void {
    this.filterForm.reset({
      metroId: null,
      status: ''
    });
    this.loadVehicles();
  }

  selectedVehicle: any | null = null;

  selectVehicle(vehicle: any): void {
    this.selectedVehicle = vehicle;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(RentalVehicleDialogComponent, {
      width: '950px',
      autoFocus: false,
      data: {
        action: 'Create',
        vehicle: null,
        metros: this.metros,
        isAdmin: this.isAdmin,
        isCompanyOwner: this.isCompanyOwner,
        userCompanyId: this.userCompanyId
      }
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.loadVehicles();
    });
  }

  openEditDialog(vehicle: RentalVehicle): void {
    const dialogRef = this.dialog.open(RentalVehicleDialogComponent, {
      width: '950px',
      autoFocus: false,
      data: {
        action: 'Edit',
        vehicle,
        metros: this.metros,
        isAdmin: this.isAdmin,
        isCompanyOwner: this.isCompanyOwner,
        userCompanyId: this.userCompanyId
      }
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.loadVehicles();
    });
  }

  changeStatus(vehicle: RentalVehicle, status: string): void {
    this.api.updateVehicleStatus(vehicle.id, { status }).subscribe({
      next: () => {
        this.toast.success('Vehicle status updated', 'Success');
        this.loadVehicles();
      },
      error: () => {
        this.toast.error('Error updating vehicle status', 'Error');
      }
    });
  }

  archive(vehicle: RentalVehicle): void {
    const ok = confirm(`Archive vehicle "${vehicle.displayName}"?`);
    if (!ok) return;

    this.api.archiveVehicle(vehicle.id).subscribe({
      next: () => {
        this.toast.success('Vehicle archived successfully', 'Success');
        this.loadVehicles();
      },
      error: () => {
        this.toast.error('Error archiving vehicle', 'Error');
      }
    });
  }

  getCoverImage(vehicle: RentalVehicle): string {
    if (vehicle.mainImageUrl) return vehicle.mainImageUrl;

    const cover = vehicle.images?.find(x => x.isCover);
    if (cover?.imageUrl) return cover.imageUrl;

    return 'assets/images/no-image.png';
  }
}