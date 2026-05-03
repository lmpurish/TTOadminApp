import { Component, OnInit } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';

interface TopCard {
  id: number;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-top-cards',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './top-cards.component.html',
})
export class AppTopCardsComponent implements OnInit {

  topcards: TopCard[] = [];

  ngOnInit(): void {

    this.topcards = [
      {
        id: 1,
        icon: 'car',
        color: 'primary',
        title: 'Total Vehicles',
        subtitle: '1,250'
      },
      {
        id: 2,
        icon: 'key',
        color: 'error',
        title: 'Rented Vehicles',
        subtitle: '320'
      },
      {
        id: 3,
        icon: 'calendar-event',
        color: 'success',
        title: 'Reservations',
        subtitle: '890'
      },
      {
        id: 4,
        icon: 'currency-dollar',
        color: 'warning',
        title: 'Monthly Revenue',
        subtitle: '$45,000'
      }
    ];

  }
}