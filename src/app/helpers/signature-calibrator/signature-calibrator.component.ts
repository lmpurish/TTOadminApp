import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TemplateFieldDto } from 'src/app/services/company.service';

@Component({
  selector: 'app-signature-calibrator',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="calibrator">
      <p *ngIf="pdfUrl">Calibrando sobre: <a [href]="pdfUrl" target="_blank">{{ pdfUrl }}</a></p>
      <!-- TODO: aquí va tu overlay con pdf.js; por ahora demo -->
      <button type="button" (click)="emitDemo()">Emitir campos demo</button>
    </div>
  `
})
export class SignatureCalibratorComponent {
  @Input() pdfUrl?: string;
  @Output() fieldsChange = new EventEmitter<TemplateFieldDto[]>(); // ✅ tipado

  emitDemo() {
    // Coordenadas demo (ajústalas con tu calibrador real)
    const fields: TemplateFieldDto[] = [
      { "Type": "Initials", "Role": "Contractor", "Page": 3, "X": 182, "Y": 665, "Width": 90, "Height": 22, "Label": "Initials", "Required": true },
      { "Type": "Signature", "Role": "Contractor", "Page": 3, "X": 190, "Y": 412, "Width": 90, "Height": 28, "Label": "Signature", "Required": true },
      { "Type": "Date", "Role": "Contractor", "Page": 3, "X": 338, "Y": 362, "Width": 90, "Height": 20, "Label": "Date", "Required": true },
      { "Type": "Text", "Role": "Contractor", "Page": 3, "X": 182, "Y": 437, "Width": 100, "Height": 18, "Label": "Name", "Required": true }
    ];
    this.fieldsChange.emit(fields);
  }
}
