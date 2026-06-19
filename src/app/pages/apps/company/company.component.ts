import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { CompanyService, CreateTemplateResponse } from 'src/app/services/company.service';
import { TemplateFieldDto } from 'src/app/services/company.service';
import { SignatureCalibratorComponent } from 'src/app/helpers/signature-calibrator/signature-calibrator.component';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SignatureCalibratorComponent,FormsModule],
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
  pdfPreviewUrl: string | null = null;
  previewStampedUrl: SafeResourceUrl | null = null;
  previewStampedBlobUrl: string | null = null;

  constructor(private fb: FormBuilder, private svc: CompanyService, private sanitizer: DomSanitizer) {
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
  }

  // recibe del calibrador y normaliza a número
  onFieldsFromCalibrator(fields: TemplateFieldDto[]) {
    this.fields = (fields || []).map(f => ({
      Type: f.Type,
      Role: f.Role,
      Page: Number(f.Page),
      X: Number(f.X),
      Y: Number(f.Y),
      Width: Number(f.Width),
      Height: Number(f.Height),
      Label: f.Label,
      Required: f.Required ?? true
    }));

  }

  async previewStampedPdf(): Promise<void> {
    const file = this.fileCtrl?.value as File;

    if (!file) {
      this.errorMsg = 'Please select a PDF first.';
      return;
    }

    if (!this.fields.length) {
      this.errorMsg = 'Please add or emit fields first.';
      return;
    }

    const pdfBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const demo = {
      name: 'Luis Miguel Puris',
      initials: 'LMP',
      date: new Date().toISOString().slice(0, 10),
      signature: 'Luis Miguel Puris'
    };

    for (const f of this.fields) {
      const pageIndex = Math.max(0, Number(f.Page) - 1);
      const page = pdfDoc.getPage(pageIndex);
      const { height: pageH } = page.getSize();

      const x = Number(f.X);
      const y = pageH - Number(f.Y) - Number(f.Height);
      const w = Number(f.Width);
      const h = Number(f.Height);

      const label = (f.Label || '').toLowerCase();
      const type = f.Type;

      let text = '';

      if (type === 'Text') {
        if (label.includes('name') || label.includes('contractor')) {
          text = demo.name;
        }
      }

      if (type === 'Initials') {
        text = demo.initials;
      }

      if (type === 'Date') {
        text = demo.date;
      }

      if (type === 'Signature') {
        text = demo.signature;
      }

      if (!text) continue;

      const font = type === 'Signature' ? helvBold : helv;
      let size = type === 'Signature' ? 12 : 10;

      while (size > 7 && font.widthOfTextAtSize(text, size) > w - 4) {
        size -= 0.5;
      }

      page.drawText(text, {
        x: x + 2,
        y: y + (h - size) / 2 + 2,
        size,
        font
      });
    }

    const stampedBytes = await pdfDoc.save();
    const blob = new Blob(
      [stampedBytes.buffer as ArrayBuffer],
      { type: 'application/pdf' }
    );

    if (this.previewStampedBlobUrl) {
      URL.revokeObjectURL(this.previewStampedBlobUrl);
    }

    this.previewStampedBlobUrl = URL.createObjectURL(blob);
    this.previewStampedUrl =
      this.sanitizer.bypassSecurityTrustResourceUrl(this.previewStampedBlobUrl);
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
    this.pdfPreviewUrl = URL.createObjectURL(file);
    this.fileCtrl?.setValue(file);

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
  removeField(index: number): void {
    this.fields.splice(index, 1);
  }

}
