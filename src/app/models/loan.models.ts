export interface Loan {
  driverId: number;
  principal: number;
  installmentAmount: number;
  maxDeductionPerPayRun: number;
  notes: string;
}
