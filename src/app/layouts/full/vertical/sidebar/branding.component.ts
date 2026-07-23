import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { CompanyService } from 'src/app/services/company.service';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from './ConfirmDialog/confirm-dialog.component'; // 🔹 Debes crearlo
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-branding',
  templateUrl: 'branding.component.html',
  imports: [CommonModule, TablerIconsModule, MaterialModule],
  styleUrls: ['./branding.component.scss']
})
export class BrandingComponent {
  companyLogo: string = './assets/images/logos/logo.png';
  user: any;
  selectedLogo?: File;

  constructor(private settings: CoreService, private companyService: CompanyService, private dialog: MatDialog, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.user = this.settings.getUserInfoFromToken();
    this.loadLogo();

  }

  loadLogo() {
    this.companyLogo =
      this.user?.logoUrl && this.user.logoUrl.trim() !== ''
        ? environment.fileUrl + this.user.logoUrl
        : './assets/images/logos/logo.png';
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.selectedLogo = input.files[0];

      // ✅ Opcional: Mostrar una vista previa antes de confirmar
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.companyLogo = e.target.result; // Vista previa temporal en base64
      };
      reader.readAsDataURL(this.selectedLogo);

      // ✅ Abrir modal de confirmación con botón personalizado
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Update Logo',
          message: 'Do you want to update the Company Logo?',
          confirmText: 'Update'
        }
      }).afterClosed().subscribe(result => {
        if (result === 'confirm') {
          this.uploadLogo(); // ✅ Sube el logo y actualiza el token
        } else {
          this.selectedLogo = undefined; // 🔹 Cancela la selección
          // 🔹 Volver a mostrar el logo anterior si cancela
          this.companyLogo =
            this.user?.logoUrl && this.user.logoUrl.trim() !== ''
              ? environment.fileUrl + this.user.logoUrl
              : './assets/images/logos/logo150.png';
        }
      });
    }
  }
  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  uploadLogo() {
    if (!this.selectedLogo) return;

    const formData = new FormData();
    formData.append('logo', this.selectedLogo);

    this.companyService.updateLogo(formData).subscribe({
      next: (res) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.user = this.settings.getUserInfoFromToken();
          this.companyLogo = environment.fileUrl + this.user.logoUrl;
          this.selectedLogo = undefined;
          this.openSnackBar('Logo updated successfully!', 'Close');
        }
      },
      error: (err) => console.error('Error al actualizar logo', err)
    });
  }
}
