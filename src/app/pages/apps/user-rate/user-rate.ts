export type RateType =
    | 'PerRoute'
    | 'PerStop'
    | 'Mixed';

export interface UserRate {
    id: number;
    driverId: number;
    rateType: RateType;
    baseAmount: number;
    minPayPerRoute?: number;
    overStopBonusThreshold?: number;
    overStopBonusPerStop?: number;
    failedStopPenalty?: number;
    rescueStopRate?: number;
    nightDeliveryBonus?: number;
    effectiveFrom: string;     // 'YYYY-MM-DD'
    effectiveTo?: string;      // 'YYYY-MM-DD' | undefined
    driverFullName: string;
    warehouseId: number;
    dailyAmount: number;
    extraAmount: number;
}