import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { RentalVehicle } from '../../rental-vehicle.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-top-projects',
  standalone: true,
  imports: [
    MaterialModule,
    CommonModule,
    FormsModule,
    TablerIconsModule
  ],
  templateUrl: './top-projects.component.html',
})
export class AppTopProjectsComponent implements OnChanges {
  @Input() vehicles: RentalVehicle[] = [];
  @Output() add = new EventEmitter<void>();
 
  public baseUrl = environment.fileUrl;

  displayedColumns: string[] = [
    'vehicle',
    'metro',
    'price',
    'status',
    'actions'
  ];

  dataSource: RentalVehicle[] = [];

  searchText: string = '';
  selectedMetro: string = '';
  selectedStatus: string = '';

  metros: string[] = [];
  statuses: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicles']) {
      this.buildFilters();
      this.applyFilters();
    }
  }

  buildFilters(): void {
    const vehicles = this.vehicles || [];

    this.metros = [
      ...new Set(
        vehicles
          .map(v => v.metro?.city)
          .filter((x): x is string => !!x)
      )
    ];

    this.statuses = [
      ...new Set(
        vehicles
          .map(v => v.status)
          .filter((x): x is string => !!x)
      )
    ];
  }

  applyFilters(): void {
    let result = [...(this.vehicles || [])];

    const search = this.searchText.trim().toLowerCase();

    if (search) {
      result = result.filter(vehicle =>
        `${vehicle.displayName || ''} ${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`
          .toLowerCase()
          .includes(search)
      );
    }

    if (this.selectedMetro) {
      result = result.filter(vehicle =>
        vehicle.metro?.city === this.selectedMetro
      );
    }

    if (this.selectedStatus) {
      result = result.filter(vehicle =>
        vehicle.status === this.selectedStatus
      );
    }

    this.dataSource = result;
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedMetro = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  addVehicle(): void {
    this.add.emit();
  }

  getVehicleImage(vehicle: RentalVehicle): string {
    if (vehicle.mainImageUrl) {
      return this.baseUrl + vehicle.mainImageUrl;
    }

    const cover = vehicle.images?.find(x => x.isCover);

    if (cover?.imageUrl) {
      return this.baseUrl + cover.imageUrl;
    }

    return 'assets/images/no-car.jpg';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Available':
        return 'bg-light-success text-success';
      case 'Draft':
        return 'bg-light-secondary text-secondary';
      case 'MaintenanceHold':
        return 'bg-light-warning text-warning';
      case 'Disabled':
        return 'bg-light-error text-error';
      default:
        return 'bg-light-primary text-primary';
    }
  }
  @Output() edit = new EventEmitter<RentalVehicle>();



  editVehicle(vehicle: RentalVehicle): void {
    this.edit.emit(vehicle);
  }
}