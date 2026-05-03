import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ImportResultDto } from '../importResult/import-result.model';
import { CommonModule } from '@angular/common';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';


@Component({
  selector: 'app-import-result',
  imports: [
    CommonModule,
    TablerIconsModule,
    MaterialModule,
  ],
  templateUrl: './import-result.component.html',

})
export class ImportResultComponent {
  result: any; // o ImportResultDto & { notFoundUsers?: string[]; notFountInUsers?: string[] }

  constructor(@Inject(MAT_DIALOG_DATA) data: any) {
    const notFoundUsers = (data?.notFoundUsers ?? data?.notFountInUsers ?? []) as string[];

    this.result = {
      // defaults para NO OnTrac
      driverNotFound: [],
      driverAmbiguous: [],

      // defaults para OnTrac
      notFoundUsers,

      // resto de propiedades
      ...data
    };

    // Si venía el typo, lo unificamos:
    if (!this.result.notFoundUsers?.length && data?.notFountInUsers?.length) {
      this.result.notFoundUsers = data.notFountInUsers;
    }
  }
}