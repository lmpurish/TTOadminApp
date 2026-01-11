import { Warehouse } from "../warehouse/warehouse";

export interface Employee {
  id: number;
  name: string;
  lastName: string;
  userRole: string;
  identificationNumber: number;
  socialSecurityNumber: Date;
  dateOfBirth: Date;
  phoneNumber: number;
  email: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
  avatarUrl: string;
  drivingLicenseUrl: string;
  token: string;
  isActive: boolean;
  warehouse: Warehouse;
  action?: string;
}
