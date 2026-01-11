import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { CompanyService, CreateTemplateResponse } from 'src/app/services/company.service';
import { TemplateFieldDto } from 'src/app/services/company.service';
import { SignatureCalibratorComponent } from 'src/app/helpers/signature-calibrator/signature-calibrator.component';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SignatureCalibratorComponent],
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent {
  form: FormGroup;
  uploading = false;
  progress = 0;
  errorMsg = '';
  lastResponse: CreateTemplateResponse | null = null;

  fields: TemplateFieldDto[] = []; // campos calibrados
  signedUrl: string | null = null;

  constructor(private fb: FormBuilder, private svc: CompanyService) {
    this.form = this.fb.group({
      companyId: [null, [Validators.required, Validators.min(1)]],
      title: [''],
      version: [''],
      file: [null, Validators.required]
    });
  }

  // demo para llenar "fields" manualmente
  useDemoFields() {
    this.fields = [
      { "Type": "Initials", "Role": "Contractor", "Page": 3, "X": 182, "Y": 665, "Width": 90, "Height": 22, "Label": "Initials", "Required": true },
      { "Type": "Signature", "Role": "Contractor", "Page": 3, "X": 190, "Y": 412, "Width": 90, "Height": 28, "Label": "Signature", "Required": true },
      { "Type": "Date", "Role": "Contractor", "Page": 3, "X": 338, "Y": 362, "Width": 90, "Height": 20, "Label": "Date", "Required": true },
      { "Type": "Text", "Role": "Contractor", "Page": 3, "X": 182, "Y": 437, "Width": 100, "Height": 18, "Label": "Name", "Required": true }
    ];
  }

  // recibe del calibrador y normaliza a número
  onFieldsFromCalibrator(fields: TemplateFieldDto[]) {
    this.fields = (fields || []).map(f => ({
      ...f,
      page: Number(f.Page),
      x: Number(f.X),
      y: Number(f.Y),
      width: Number(f.Width),
      height: Number(f.Height),
      required: f.Required ?? true
    }));
  }

  get companyIdCtrl() { return this.form.get('companyId'); }
  get fileCtrl() { return this.form.get('file'); }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.errorMsg = '';
    this.progress = 0;
    this.lastResponse = null;

    if (!file) { this.fileCtrl?.setValue(null); return; }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.errorMsg = 'Solo se permiten archivos PDF.';
      this.fileCtrl?.setValue(null);
      input.value = '';
      return;
    }

    const max = 25 * 1024 * 1024;
    if (file.size > max) {
      this.errorMsg = 'El archivo supera los 25 MB.';
      this.fileCtrl?.setValue(null);
      input.value = '';
      return;
    }

    this.fileCtrl?.setValue(file);
  }

  submit() {
    if (this.form.invalid) {
      this.errorMsg = 'CompanyId y PDF son requeridos.';
      this.form.markAllAsTouched();
      return;
    }

    const companyId = Number(this.companyIdCtrl?.value);
    const file = this.fileCtrl?.value as File;

    this.uploading = true;
    this.progress = 0;
    this.errorMsg = '';
    this.lastResponse = null;
    this.form.disable();

    this.svc.createTemplate(companyId, file, {
      title: this.form.get('title')?.value || undefined,
      version: this.form.get('version')?.value || undefined,
      fields: this.fields.length ? this.fields : undefined
    })
      .subscribe({
        next: evt => {
          if (evt.type === HttpEventType.UploadProgress && evt.total) {
            this.progress = Math.round(100 * evt.loaded / evt.total);
          } else if (evt.type === HttpEventType.Response) {
            this.lastResponse = evt.body ?? null;
            this.uploading = false;
            this.form.enable();
          }
        },
        error: err => {
          this.uploading = false;
          this.form.enable();
          this.errorMsg = err?.error ?? err?.error?.message ?? 'Error al crear la plantilla.';
          console.error('CreateTemplate error:', err);
        }
      });
  }

  signAndStamp(templateId: number) {
    const req = {
      role: 'Contractor' as const,
      initials: 'LM',
      name: 'Luis Miguel Puris',
      date: new Date().toISOString().slice(0, 10),
      signatureImageBase64: 'data:image/png;base64,iVBORw0KGgoAAA...' // reemplaza por base64 real
    };
    this.svc.signAndStamp(templateId, req).subscribe({
      next: r => this.signedUrl = r.url,
      error: err => {
        this.errorMsg = err?.error ?? err?.error?.message ?? 'Error al firmar.';
        console.error(err);
      }
    });
  }
}
