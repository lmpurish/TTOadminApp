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

  @Input() fields: TemplateFieldDto[] = [];


  emitDemo(): void {
    this.fields = [
      {
        Type: 'Text',
        Role: 'Contractor',
        Page: 6,
        X: 20,
        Y: 130,
        Width: 220,
        Height: 24,
        Label: 'Contractor Name',
        Required: true
      },
      {
        Type: 'Date',
        Role: 'Contractor',
        Page: 6,
        X: 310,
        Y: 130,
        Width: 120,
        Height: 24,
        Label: 'Contractor Date',
        Required: true
      },
      {
        Type: 'Signature',
        Role: 'Contractor',
        Page: 6,
        X: 20,
        Y: 178,
        Width: 220,
        Height: 36,
        Label: 'Contractor Signature',
        Required: true
      },
      {
        Type: 'Date',
        Role: 'Contractor',
        Page: 6,
        X: 310,
        Y: 178,
        Width: 120,
        Height: 24,
        Label: 'Contractor Signature Date',
        Required: true
      }
    ];

    this.fieldsChange.emit(this.fields);
  }
}
