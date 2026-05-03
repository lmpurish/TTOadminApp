export interface PayrollConf {
    id: number;
    warehouseId: number;
    EnableWeightExtra: boolean;
    EnablePenalties: boolean;
    EnableBonuses: boolean;
    DefaultPenaltyAmount?: number;
    PenaltyCapPerWeek?: number;
    IsActive?: boolean;
   
}