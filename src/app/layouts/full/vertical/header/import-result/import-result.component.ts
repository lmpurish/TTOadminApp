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
  result: ImportResultDto;
  constructor(@Inject(MAT_DIALOG_DATA) data: ImportResultDto) {
    this.result = {
      driverNotFound: [],
      driverAmbiguous: [],
      ...data
    };
  }
}