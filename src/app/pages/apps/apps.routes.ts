import { Routes } from '@angular/router';
import { EmployeeComponent } from './employee/employee.component';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { WarehouseComponent } from './warehouse/warehouse.component';
import { CompleteProfileComponent } from './complete-profile/complete-profile.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { ZoneComponent } from './warehouse/zone/zone.component';
import { Title } from '@angular/platform-browser';
import { RoutesComponent } from './routes/routes.component';
import { ApplicantComponent } from './applicant/applicant.component';
import { AppAccountSettingComponent } from '../theme-pages/account-setting/account-setting.component';
import { AppEmailComponent } from './email/email.component';
import { DetailComponent } from './email/detail/detail.component';
import { DailyRDComponent } from './daily-rd/daily-rd.component';
import { MessangeContactComponent } from './warehouse/messange-contact/messange-contact.component';
import { RegisterCompanyComponent } from './register-company/register-company.component';
import { CompanyComponent } from './company/company.component';
import { PayrollComponent } from './payroll/payroll.component';
import { UserRateComponent } from './user-rate/user-rate.component';


export const AppsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'employee',
        component: EmployeeComponent, canActivate: [AuthGuard],

        data: {
          role: ['Admin', 'Manager'],
          title: 'Employees',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Employee' },
          ],
        },
      },
      {
        path: 'applicant',
        component: ApplicantComponent, canActivate: [AuthGuard],

        data: {
          role: ['Admin', 'Manager'],
          title: 'Applicants',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Applicants' },
          ],
        },
      },
      {
        path: 'payroll',
        component: PayrollComponent, canActivate: [AuthGuard],

        data: {
          role: ['Admin', 'Assistant'],
          title: 'Payroll',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Payroll' },
          ],
        },
      },
      {
        path: 'user-rate',
        component: UserRateComponent, canActivate: [AuthGuard],

        data: {
          role: ['Admin', 'Assistant'],
          title: 'Employee Rate',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Employee Rate' },
          ],
        },
      },
      {
        path: 'routes',
        component: RoutesComponent, canActivate: [AuthGuard],

        data: {
          role: ['Admin', 'Manager'],
          title: 'Routes',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Routes' },
          ],
        },
      },
      {
        path: 'warehouse',
        component: WarehouseComponent, canActivate: [AuthGuard, RoleGuard],
        data: {
          role: ['CompanyOwner', 'Admin'],
          title: 'Warehouses',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Warehouses' },
          ],
        },
      },
      {
        path: 'company',
        component: CompanyComponent, canActivate: [AuthGuard, RoleGuard],
        data: {
          role: ['CompanyOwner'],
          title: 'Company',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Company' },
          ],
        },
      },
      {
        path: 'complete-profile',
        component: CompleteProfileComponent, canActivate: [AuthGuard],
        data: {

          title: 'Complete Profile',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Complete Profile' },
          ],
        },
      },
      {
        path: 'register-company-owner',
        component: RegisterCompanyComponent, canActivate: [AuthGuard],
        data: {

          title: 'Register Company',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Register Company' },
          ],
        },
      },
      {
        path: 'zoneWarehouse/:id',
        component: ZoneComponent, canActivate: [AuthGuard],
        data: {
          role: 'Admin',
          title: 'Routes',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Warehouse', url: '/apps/warehouse' },
            { title: 'Routes' },
          ],
        },
      },
      {
        path: 'smsContact/:id',
        component: MessangeContactComponent, canActivate: [AuthGuard],
        data: {
          role: 'Admin',
          title: 'SmsContact',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Warehouses', url: '/apps/warehouse' },
            { title: 'SmsContact' },
          ],
        },
      },
      {
        path: 'dailyRd',
        component: DailyRDComponent,
        data: {
          title: 'Daily Delivered Control',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Daily Rd Control' },
          ],
        },
      },
      {
        path: 'account-setting',
        component: AppAccountSettingComponent,
        data: {
          title: 'Account Setting',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Account Setting' },
          ],
        },
      },
      { path: 'email', redirectTo: 'email/inbox', pathMatch: 'full' },
      {
        path: 'email/:type',
        component: AppEmailComponent,
        data: {
          title: 'Email',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Email' },
          ],
        },
        children: [
          {
            path: ':id',
            component: DetailComponent,
            data: {
              title: 'Email Detail',
              urls: [
                { title: 'Dashboard', url: '/dashboards/dashboard1' },
                { title: 'Email Detail' },
              ],
            },
          },
        ],
      },
    ],
  },
];
