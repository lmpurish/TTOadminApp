export interface ImportResultDto {
  message?: string;
  warehouseId?: number;
  dateRange?: { minDate?: string; maxDate?: string };

  rowsRead?: number;
  routesCreated?: number;
  routesUpdated?: number;
  packagesAdded?: number;
  driverAssignedRoutes?: number;

  driverNotFound?: Array<{
    date?: string;
    routeCode?: string;
    driverName?: string;
    normalized?: string;
  }>;

  driverAmbiguous?: Array<{
    date?: string;
    routeCode?: string;
    driverName?: string;
    normalized?: string;
    candidateUserIds?: number[];
  }>;
}
