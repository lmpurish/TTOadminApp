// src/app/models/payroll.models.ts

// ----- PayRun (detalle) -----
export interface PayRunLineDto {
  id: number;
  sourceType: string;
  sourceId?: string | null;
  description?: string | null;
  qty: number;
  rate: number;
  amount: number;
  tags?: string | null;
}

export interface PayrollAdjDto {
  id: number;
  type: string;
  reason?: string | null;
  amount: number;
  createdBy: number;
  createdAt: string; // ISO
}

export interface PayRunDto {
  id: number;
  payPeriodId: number;
  driverId: number;
  grossAmount: number;
  adjustments: number;
  netAmount: number;
  status: string;
  calculatedAt?: string | null;
  calculatedBy?: number | null;
  lines: PayRunLineDto[];
  adjustmentsList: PayrollAdjDto[];
}

// ----- Requests -----
export interface ComputePayrollRequest {
  companyId: number;
  driverId: number;
  weekStart: string; // yyyy-MM-dd
  weekEnd: string;   // yyyy-MM-dd
  warehouseId?: number | null;
  userId: number;
  zoneId?: number | null;
}

export interface CreatePeriodRequest {
  companyId: number;
  warehouseId?: number | null;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  userId: number;
  notes?: string | null;
}

// Opcional, útil para tipar la respuesta del endpoint /periods
export interface PayPeriod {
  id: number;
  companyId: number;
  warehouseId?: number | null;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string | null;
  createdBy: number;
  createdAt: string;
}

// ----- DriverRate -----
export interface DriverRate {
  id?: number;
  driverId: number;
  rateType: 'PerStop' | 'PerRoute' | 'Mixed';
  baseAmount: number;
  minPayPerRoute?: number | null;
  overStopBonusThreshold?: number | null;
  overStopBonusPerStop?: number | null;
  failedStopPenalty?: number | null;
  rescueStopRate?: number | null;
  nightDeliveryBonus?: number | null;
  effectiveFrom: string; // yyyy-MM-dd
  effectiveTo?: string | null;
}

// ----- Summary por driver (dentro del período) -----
export interface PayrollSummary {
  driverId: number;
  driverName?: string;
  gross: number;
  adjustments: number;
  net: number;
  run: number;
}

export interface PeriodSummaryDto {
  payPeriodId: number;
  startDate: string;
  endDate: string;
  drivers: Array<{
    driverId: number;
    driverName?: string;
    gross: number;
    adjustments: number;
    net: number;
    run: number;
    status?: string,
  }>;
  totalNet: number;
}

// ----- Summary por almacén (para la vista de este ticket) -----
export interface WarehouseSummaryRow {
  warehouseId: number;
  warehouseName: string;
  periodId: number;
  startDate: string;
  endDate: string;
  drivers: number;
  gross: number;
  adjustments: number;
  net: number;
}
