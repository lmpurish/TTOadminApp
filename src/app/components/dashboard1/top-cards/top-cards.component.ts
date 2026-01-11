import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../material.module';
import { ReportService } from 'src/app/services/report.service';
import { CoreService } from 'src/app/services/core.service';
import { T } from '@angular/cdk/keycodes';

interface TopCard {
  id: number;
  img: string;
  color: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-top-cards',
  imports: [MaterialModule],
  templateUrl: './top-cards.component.html',
})
export class AppTopCardsComponent implements OnInit {
  managerId: number;
  employeeCount: number | null = null;
  warehouseId: number | null = null;
  totalVolume: number | null = null;
  totalAttempts: number | null = null;
  loading: boolean = false;
  errorMessage: string | null = null;
  totalCNL: number | null = null;
  topcards: TopCard[] = [];

  constructor(private Service: ReportService, public core: CoreService) { }

  ngOnInit(): void {
    const userInfo = this.core.getUserInfoFromToken();

    // Validar que userInfo exista y tenga un ID válido
    this.managerId = userInfo?.id ?? 0; // Si es undefined/null, se asigna 0

    if (this.managerId > 0) {
      this.getEmployeeData();
    } else {
      this.errorMessage = "Usuario no autenticado o sin ID válido";
    }
  }

  getEmployeeData(): void {
    this.loading = true;

    this.Service.getStats(this.managerId).subscribe({
      next: (data) => {
        this.employeeCount = data.employeeCount;
        this.warehouseId = data.warehouseId;
        this.totalVolume = data.totalVolume;
        this.totalAttempts = data.totalAttempts;
        this.totalCNL = data.totalCNL;
        this.loading = false;
     
        // ✅ Ahora actualizamos `topcards` después de recibir los datos
        this.updateTopCards();
      },
      error: (error) => {
        this.errorMessage = 'Error al obtener los datos';
        this.loading = false;
      }
    });
  }

  updateTopCards(): void {
    this.topcards = [
      {
        id: 1,
        color: 'primary',
        img: '/assets/images/svgs/icon-user-male.svg',
        title: 'Employees',
        subtitle: this.employeeCount?.toString() || '0',
      },
      {
        id: 3,
        color: 'error',
        img: '/assets/images/svgs/icon-mailbox.svg',
        title: 'CNL',
        subtitle: this.totalCNL?.toString() || '0',
      },
      {
        id: 4,
        color: 'success',
        img: '/assets/images/svgs/icon-favorites.svg',
        title: 'Packages',
        subtitle: this.totalVolume?.toString() || '0',
      },
      {
        id: 5,
        color: 'warning',
        img: '/assets/images/svgs/icon-speech-bubble.svg',
        title: 'Attempts',
        subtitle: this.totalAttempts?.toString() || '0',
      },

    ];
  }
}
