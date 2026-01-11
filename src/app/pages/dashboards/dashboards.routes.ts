import { Routes } from '@angular/router';

// dashboards
import { AppDashboard1Component } from './dashboard1/dashboard1.component';
import { AppDashboard2Component } from './dashboard2/dashboard2.component';
import { AuthGuard } from 'src/app/guards/auth.guard';

export const DashboardsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard1',
        component: AppDashboard1Component,  canActivate: [AuthGuard],
        data: {
          role: ['Admin', 'Manager','Driver'],
          title: 'Driver Ranking',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Driver Ranking' },
          ],
        },
      },
      {
        path: 'dashboard2',
        component: AppDashboard2Component, canActivate: [AuthGuard],
        data: {
          role: ['Admin', 'Manager','Driver'],
          title: 'General Dashboard',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard2' },
            { title: 'General Dashboard' },
          ],
        },
      },
    ],
  },
];
