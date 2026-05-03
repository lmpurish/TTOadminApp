import type { Time } from '@angular/common';

export interface AuthorizedPerson {
  id: number;
  name: string;
  lastName: string;
  // agrega aquí lo que realmente tengas en el backend
  // email?: string;
  // phone?: string;
}
export interface Metro {
  id: number;
  city: string;

}

export interface Warehouse {
  id: number;
  company: string;
  city: string;
  address: string;
  state: string;
  sendPayroll: boolean;
  isHiring: boolean;
  action?: string;
  zipCode?: string;
  openTime?: Time;
  authorizedPersons?: AuthorizedPerson[];
  companyId?: number;
  metro?: Metro | null;
  metroId?: number | null;
  driveRate?: number | null;
  facilityCode?: string;
}
