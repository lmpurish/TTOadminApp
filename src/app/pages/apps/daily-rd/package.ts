

export interface Package {
  id: number;
  tracking: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  [key: string]: any;  
  incidentDate: Date;
  status: string;
  route: Route;
  action?: string;
}

interface Route {
  id: number;
  zone?: { zoneCode?: string };
  user?: { id?: number; name?: string; lastName?: string; warehouseId?:number };
}