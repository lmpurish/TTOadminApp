export interface RentalVehicleImage {
  id: number;
  vehicleId: number;
  companyId: number;
  imageUrl: string;
  fileName?: string;
  isCover: boolean;
  sortOrder: number;
  imageType?: string;
  createdAt: string;
}

export interface RentalVehicle {
  id: number;
  companyId: number;
  company?: {
    id: number;
    name: string;
  };
  metroId: number;
  metro?: {
    id: number;
    city: string;
  };
  displayName: string;
  stockNumber?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  color?: string;
  transmission?: string;
  fuelType?: string;
  seatingCapacity?: number;
  trunkNotes?: string;
  dailyPrice: number;
  weeklyPrice: number;
  depositAmount: number;
  status: string;
  vin?: string;
  plate?: string;
  facilityLocation?: string;
  mainImageUrl?: string;
  notes?: string;
  gpsInstalled: boolean;
  dashCamInstalled: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  images?: RentalVehicleImage[];
}

export interface CreateRentalVehicleDto {
  companyId: number;
  metroId: number;
  displayName: string;
  stockNumber?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  color?: string;
  transmission?: string;
  fuelType?: string;
  seatingCapacity?: number;
  trunkNotes?: string;
  dailyPrice: number;
  weeklyPrice: number;
  depositAmount: number;
  vin?: string;
  plate?: string;
  facilityLocation?: string;
  notes?: string;
  gpsInstalled: boolean;
  dashCamInstalled: boolean;
  status: string;

  // opcional si mandas urls ya guardadas
  mainImageUrl?: string;
}

export interface UpdateRentalVehicleDto extends CreateRentalVehicleDto {}

export interface UpdateRentalVehicleStatusDto {
  status: string;
}