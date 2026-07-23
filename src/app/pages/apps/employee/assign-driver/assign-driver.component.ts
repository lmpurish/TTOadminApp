import { CommonModule } from '@angular/common';

import {
  Component,
  Inject
} from '@angular/core';

import {
  FormControl,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

import {
  finalize,
  map,
  Observable,
  startWith
} from 'rxjs';

import {
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  TablerIconsModule
} from 'angular-tabler-icons';

import {
  MaterialModule
} from 'src/app/material.module';

import {
  EmployeeService,
  UserWarehouseAssignment
} from 'src/app/services/apps/employee/employee.service';


export interface AssignDriverWarehouseDialogData {
  /**
   * Aunque se llama drivers para mantener compatibilidad,
   * aquí puedes enviar todos los usuarios de la compañía.
   */
  drivers: any[];

  warehouses: any[];

  /**
   * Compañía del usuario autenticado.
   * Si no se envía, se asume que la lista ya viene
   * filtrada desde la API.
   */
  companyId?: number | null;
}


@Component({
  selector: 'app-assign-driver-warehouse-dialog',
  standalone: true,

  templateUrl: './assign-driver.component.html',
  styleUrl: './assign-driver.component.scss',

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TablerIconsModule
  ]
})
export class AssignDriverComponent {

  /**
   * Conservamos el nombre "drivers" para no romper
   * el HTML actual, pero contiene todos los usuarios
   * activos excepto Applicant.
   */
  drivers: any[] = [];

  warehouses: any[] = [];

  selectedDriverId: number | null = null;

  selectedWarehouseIds: number[] = [];

  primaryWarehouseId: number | null = null;

  warehouseToAdd: number | null = null;

  addAsPrimary = false;

  loadingAssignments = false;

  saving = false;

  driverSearchControl =
    new FormControl<string | any>('');

  filteredDrivers$!: Observable<any[]>;


  constructor(
    public dialogRef:
      MatDialogRef<AssignDriverComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data:
      AssignDriverWarehouseDialogData,

    private employeeService:
      EmployeeService,

    private snackBar:
      MatSnackBar
  ) {
    this.configureUsers();
    this.configureWarehouses();
    this.configureUserSearch();
  }


  // =========================================================
  // INITIAL CONFIGURATION
  // =========================================================

  private configureUsers(): void {
    const dialogCompanyId =
      this.toPositiveNumber(
        this.data?.companyId
      );

    this.drivers = [
      ...(this.data?.drivers ?? [])
    ]
      .filter(user =>
        this.canManageWarehouseAccess(
          user,
          dialogCompanyId
        )
      )
      .sort((a, b) =>
        this.getDriverName(a)
          .localeCompare(
            this.getDriverName(b)
          )
      );
  }


  private configureWarehouses(): void {
    const dialogCompanyId =
      this.toPositiveNumber(
        this.data?.companyId
      );

    this.warehouses = [
      ...(this.data?.warehouses ?? [])
    ]
      .filter(warehouse => {
        const isActive =
          warehouse?.isActive !== false;

        if (!isActive) {
          return false;
        }

        /*
         * Si no se envió companyId, asumimos que
         * la API ya devolvió los warehouses correctos.
         */
        if (!dialogCompanyId) {
          return true;
        }

        const warehouseCompanyId =
          this.extractCompanyId(warehouse);

        /*
         * Si el warehouse no trae companyId, se conserva
         * porque algunas respuestas de tu API no incluyen
         * ese campo.
         */
        return (
          warehouseCompanyId === null ||
          warehouseCompanyId === dialogCompanyId
        );
      })
      .sort((a, b) =>
        this.getWarehouseName(a)
          .localeCompare(
            this.getWarehouseName(b)
          )
      );
  }


  private configureUserSearch(): void {
    this.filteredDrivers$ =
      this.driverSearchControl
        .valueChanges
        .pipe(
          startWith(''),

          map(value => {
            const searchText =
              typeof value === 'string'
                ? value
                : this.getDriverName(value);

            return this.filterUsers(
              searchText
            );
          })
        );
  }


  // =========================================================
  // GETTERS
  // =========================================================

  get selectedDriver(): any | null {
    if (!this.selectedDriverId) {
      return null;
    }

    return (
      this.drivers.find(user =>
        Number(user?.id) ===
        Number(this.selectedDriverId)
      ) ?? null
    );
  }


  get selectedWarehouses(): any[] {
    return this.warehouses.filter(
      warehouse =>
        this.selectedWarehouseIds.includes(
          Number(warehouse?.id)
        )
    );
  }


  get availableWarehouses(): any[] {
    return this.warehouses.filter(
      warehouse =>
        !this.selectedWarehouseIds.includes(
          Number(warehouse?.id)
        )
    );
  }


  get primaryWarehouseName(): string {
    if (!this.primaryWarehouseId) {
      return 'Not selected';
    }

    const warehouse =
      this.warehouses.find(item =>
        Number(item?.id) ===
        Number(this.primaryWarehouseId)
      );

    return warehouse
      ? this.getWarehouseName(warehouse)
      : 'Not selected';
  }


  // =========================================================
  // DISPLAY METHODS
  // =========================================================

  getDriverName(user: any): string {
    const fullName = [
      user?.name,
      user?.lastName
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || user?.email || 'Unnamed user';
  }


  displayDriver = (
    user: any
  ): string => {
    return user
      ? this.getDriverName(user)
      : '';
  };


  getWarehouseName(
    warehouse: any
  ): string {
    if (!warehouse) {
      return 'Unknown warehouse';
    }

    const companyOrName =
      String(
        warehouse?.company ??
        warehouse?.name ??
        ''
      ).trim();

    const location = [
      warehouse?.city,
      warehouse?.state
    ]
      .filter(Boolean)
      .join(', ');

    return [
      companyOrName,
      location
    ]
      .filter(Boolean)
      .join(' - ') ||
      `Warehouse #${warehouse?.id ?? 'N/A'}`;
  }


  isPrimaryWarehouse(
    warehouseId: number
  ): boolean {
    return (
      Number(this.primaryWarehouseId) ===
      Number(warehouseId)
    );
  }


  // =========================================================
  // USER SEARCH AND SELECTION
  // =========================================================

  onDriverSelected(
    user: any
  ): void {
    const userId =
      this.toPositiveNumber(
        user?.id
      );

    if (!userId) {
      return;
    }

    this.selectedDriverId =
      userId;

    this.warehouseToAdd = null;

    this.addAsPrimary = false;

    /*
     * Warehouse principal guardado directamente
     * en Users.WarehouseId.
     */
    const currentWarehouseId =
      this.extractUserWarehouseId(user);

    this.selectedWarehouseIds =
      currentWarehouseId
        ? [currentWarehouseId]
        : [];

    this.primaryWarehouseId =
      currentWarehouseId;

    /*
     * Luego cargamos las relaciones adicionales
     * desde UserWarehouses.
     */
    this.loadDriverWarehouses(
      userId
    );
  }


  clearDriverSearch(): void {
    this.driverSearchControl.setValue('');

    this.selectedDriverId = null;

    this.selectedWarehouseIds = [];

    this.primaryWarehouseId = null;

    this.warehouseToAdd = null;

    this.addAsPrimary = false;
  }


  private filterUsers(
    searchText: string
  ): any[] {
    const search =
      String(searchText ?? '')
        .trim()
        .toLowerCase();

    if (!search) {
      return [...this.drivers];
    }

    return this.drivers.filter(user => {
      const fullName =
        this.getDriverName(user)
          .toLowerCase();

      const identificationNumber =
        String(
          user?.identificationNumber ?? ''
        )
          .trim()
          .toLowerCase();

      const email =
        String(
          user?.email ?? ''
        )
          .trim()
          .toLowerCase();

      const role =
        this.getRoleText(user);

      return (
        fullName.includes(search) ||
        identificationNumber.includes(search) ||
        email.includes(search) ||
        role.includes(search)
      );
    });
  }


  // =========================================================
  // LOAD USER WAREHOUSES
  // =========================================================

  loadDriverWarehouses(
    userId: number
  ): void {
    this.loadingAssignments = true;

    /*
     * Primary que vino directamente desde Users.WarehouseId.
     */
    const existingPrimaryWarehouseId =
      this.primaryWarehouseId;

    this.employeeService
      .getUserWarehouses(userId)
      .pipe(
        finalize(() => {
          this.loadingAssignments = false;
        })
      )
      .subscribe({
        next: (
          assignments:
            UserWarehouseAssignment[]
        ) => {
          const activeAssignments =
            (assignments ?? [])
              .filter(assignment =>
                assignment?.isActive !== false
              );

          /*
           * Tu API devuelve:
           *
           * assignment.warehouse.id
           */
          const apiWarehouseIds =
            activeAssignments
              .map(assignment =>
                Number(
                  assignment?.warehouse?.id
                )
              )
              .filter(id =>
                Number.isFinite(id) &&
                id > 0
              );

          /*
           * Combina:
           * 1. Users.WarehouseId
           * 2. UserWarehouses activos
           */
          this.selectedWarehouseIds = [
            ...new Set([
              ...(existingPrimaryWarehouseId
                ? [
                    Number(
                      existingPrimaryWarehouseId
                    )
                  ]
                : []),

              ...apiWarehouseIds
            ])
          ];

          const primaryAssignment =
            activeAssignments.find(
              assignment =>
                assignment?.isPrimary === true
            );

          const apiPrimaryWarehouseId =
            this.toPositiveNumber(
              primaryAssignment
                ?.warehouse
                ?.id
            );

          this.primaryWarehouseId =
            apiPrimaryWarehouseId ??
            existingPrimaryWarehouseId ??
            this.selectedWarehouseIds[0] ??
            null;

          /*
           * Seguridad: el primary debe formar parte
           * de la lista de seleccionados.
           */
          if (
            this.primaryWarehouseId &&
            !this.selectedWarehouseIds.includes(
              Number(
                this.primaryWarehouseId
              )
            )
          ) {
            this.selectedWarehouseIds = [
              Number(
                this.primaryWarehouseId
              ),

              ...this.selectedWarehouseIds
            ];
          }
        },

        error: error => {
          console.error(
            'Error loading user warehouses:',
            error
          );

          /*
           * Si falla UserWarehouses, conservamos
           * Users.WarehouseId.
           */
          if (existingPrimaryWarehouseId) {
            this.selectedWarehouseIds = [
              Number(
                existingPrimaryWarehouseId
              )
            ];

            this.primaryWarehouseId =
              Number(
                existingPrimaryWarehouseId
              );
          } else {
            this.selectedWarehouseIds = [];

            this.primaryWarehouseId = null;
          }

          this.showMessage(
            error?.error?.message ??
            'The primary warehouse was loaded, but additional warehouse access could not be retrieved.'
          );
        }
      });
  }


  // =========================================================
  // ADD WAREHOUSE
  // =========================================================

  addWarehouse(): void {
    const userId =
      this.toPositiveNumber(
        this.selectedDriverId
      );

    const warehouseId =
      this.toPositiveNumber(
        this.warehouseToAdd
      );

    if (!userId) {
      this.showMessage(
        'Select a user.'
      );

      return;
    }

    if (!warehouseId) {
      this.showMessage(
        'Select a warehouse.'
      );

      return;
    }

    if (
      this.selectedWarehouseIds.includes(
        warehouseId
      )
    ) {
      this.showMessage(
        'This warehouse is already assigned.'
      );

      return;
    }

    this.saving = true;

    this.employeeService
      .assignWarehouse(
        userId,
        {
          warehouseId,
          isPrimary:
            this.addAsPrimary ||
            !this.primaryWarehouseId,

          startDate: null,

          createdBy: null
        }
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open(
            'Warehouse assigned successfully.',
            'Close',
            {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            }
          );

          this.warehouseToAdd = null;

          this.addAsPrimary = false;

          this.loadDriverWarehouses(
            userId
          );
        },

        error: error => {
          console.error(
            'Error assigning warehouse:',
            error
          );

          this.showMessage(
            error?.error?.message ??
            'Unable to assign warehouse.'
          );
        }
      });
  }


  // =========================================================
  // SET PRIMARY
  // =========================================================

  setPrimary(
    warehouseId: number
  ): void {
    const userId =
      this.toPositiveNumber(
        this.selectedDriverId
      );

    const normalizedWarehouseId =
      this.toPositiveNumber(
        warehouseId
      );

    if (
      !userId ||
      !normalizedWarehouseId
    ) {
      return;
    }

    if (
      this.isPrimaryWarehouse(
        normalizedWarehouseId
      )
    ) {
      return;
    }

    this.saving = true;

    this.employeeService
      .setPrimaryWarehouse(
        userId,
        normalizedWarehouseId
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({
        next: () => {
          this.primaryWarehouseId =
            normalizedWarehouseId;

          this.snackBar.open(
            'Primary warehouse updated successfully.',
            'Close',
            {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            }
          );

          this.loadDriverWarehouses(
            userId
          );
        },

        error: error => {
          console.error(
            'Error setting primary warehouse:',
            error
          );

          this.showMessage(
            error?.error?.message ??
            'Unable to update the primary warehouse.'
          );
        }
      });
  }


  // =========================================================
  // REMOVE WAREHOUSE
  // =========================================================

  removeWarehouse(
    warehouseId: number
  ): void {
    const userId =
      this.toPositiveNumber(
        this.selectedDriverId
      );

    const normalizedWarehouseId =
      this.toPositiveNumber(
        warehouseId
      );

    if (
      !userId ||
      !normalizedWarehouseId
    ) {
      return;
    }

    if (
      this.isPrimaryWarehouse(
        normalizedWarehouseId
      )
    ) {
      this.showMessage(
        'Set another warehouse as primary before removing this one.'
      );

      return;
    }

    const warehouse =
      this.warehouses.find(item =>
        Number(item?.id) ===
        normalizedWarehouseId
      );

    const warehouseName =
      warehouse
        ? this.getWarehouseName(warehouse)
        : 'this warehouse';

    const confirmed =
      window.confirm(
        `Remove ${warehouseName} from this user?`
      );

    if (!confirmed) {
      return;
    }

    this.saving = true;

    this.employeeService
      .removeWarehouse(
        userId,
        normalizedWarehouseId
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open(
            'Warehouse removed successfully.',
            'Close',
            {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            }
          );

          this.loadDriverWarehouses(
            userId
          );
        },

        error: error => {
          console.error(
            'Error removing warehouse:',
            error
          );

          this.showMessage(
            error?.error?.message ??
            'Unable to remove warehouse.'
          );
        }
      });
  }


  // =========================================================
  // DIALOG
  // =========================================================

  close(): void {
    if (
      this.saving ||
      this.loadingAssignments
    ) {
      return;
    }

    this.dialogRef.close({
      updated: true,
      userId: this.selectedDriverId
    });
  }


  // =========================================================
  // USER FILTER HELPERS
  // =========================================================

  private canManageWarehouseAccess(
    user: any,
    expectedCompanyId: number | null
  ): boolean {
    if (!user) {
      return false;
    }

    const isActive =
      this.normalizeBoolean(
        user?.isActive ??
        user?.isActivate
      );

    if (!isActive) {
      return false;
    }

    if (this.isApplicant(user)) {
      return false;
    }

    /*
     * Si no se envió companyId, confiamos en que
     * getEmployees() ya filtró por compañía.
     */
    if (!expectedCompanyId) {
      return true;
    }

    const userCompanyId =
      this.extractCompanyId(user);

    /*
     * Si el payload no trae CompanyId, no lo descartamos.
     * Esto evita dejar la lista vacía con respuestas parciales.
     */
    if (!userCompanyId) {
      return true;
    }

    return (
      userCompanyId === expectedCompanyId
    );
  }


  private isApplicant(
    user: any
  ): boolean {
    const rawRole =
      user?.userRole ??
      user?.role ??
      null;

    const roleText =
      String(rawRole ?? '')
        .trim()
        .toLowerCase();

    /*
     * En tu aplicación Applicant tiene valor 5.
     */
    return (
      roleText === 'applicant' ||
      roleText === '5' ||
      rawRole === 5
    );
  }


  private getRoleText(
    user: any
  ): string {
    const rawRole =
      user?.userRole ??
      user?.role ??
      '';

    const roleMap:
      Record<string, string> = {
        '0': 'administrator',
        '1': 'manager',
        '2': 'assistant',
        '3': 'driver',
        '4': 'rsp',
        '5': 'applicant',
        '7': 'recruiter'
      };

    const normalized =
      String(rawRole)
        .trim()
        .toLowerCase();

    return (
      roleMap[normalized] ??
      normalized
    );
  }


  private extractUserWarehouseId(
    user: any
  ): number | null {
    return this.toPositiveNumber(
      user?.warehouseId ??
      user?.warehouse?.id ??
      user?.warehouse?.Id
    );
  }


  private extractCompanyId(
    source: any
  ): number | null {
    return this.toPositiveNumber(
      source?.companyId ??
      source?.CompanyId ??
      source?.company?.id ??
      source?.company?.Id
    );
  }


  private normalizeBoolean(
    value: any
  ): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized =
        value.trim().toLowerCase();

      return (
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'yes'
      );
    }

    return false;
  }


  private toPositiveNumber(
    value: any
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numberValue =
      Number(value);

    return (
      Number.isFinite(numberValue) &&
      numberValue > 0
    )
      ? numberValue
      : null;
  }


  private showMessage(
    message: string
  ): void {
    this.snackBar.open(
      message,
      'Close',
      {
        duration: 4500,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );
  }
}