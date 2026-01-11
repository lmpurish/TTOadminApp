import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { AuthGuard } from '../guards/auth.guard';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent, 
   
    data: {
      title: 'Starter Page',
    },
  },
];
