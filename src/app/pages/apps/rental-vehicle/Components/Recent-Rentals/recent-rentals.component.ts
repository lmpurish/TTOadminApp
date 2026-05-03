import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';

interface RecentRental {
  image: string;
  vehicle: string;
  customer: string;
  date: string;
  status: string;
}

@Component({
  selector: 'app-recent-rentals',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TablerIconsModule
  ],
  templateUrl: './recent-rentals.component.html',
  styleUrls: ['./recent-rentals.component.scss']
})
export class RecentRentalsComponent {
  rentals: RecentRental[] = [
    {
      image: 'assets/images/no-car.jpg',
      vehicle: 'Toyota Hilux: ABC-123',
      customer: 'John Smith',
      date: 'May 20 - May 25',
      status: 'Active'
    },
    {
      image: 'assets/images/no-car.jpg',
      vehicle: 'Ford Transit: XYZ-789',
      customer: 'Global Solutions',
      date: 'May 19 - May 24',
      status: 'Active'
    },
    {
      image: 'assets/images/no-car.jpg',
      vehicle: 'Mercedes Sprinter: DEF-456',
      customer: 'Quick Delivery Co.',
      date: 'May 20 - May 27',
      status: 'Active'
    },
    {
      image: 'assets/images/no-car.jpg',
      vehicle: 'Nissan NV200: GHI-321',
      customer: 'City Express',
      date: 'May 18 - May 22',
      status: 'Active'
    }
  ];

  viewAllRentals(): void {
    console.log('View all rentals');
  }
}