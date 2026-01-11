// src/app/pages/apps/company/complete-profile.component.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MaterialModule } from '../../../material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CoreService } from 'src/app/services/core.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import SignaturePad from 'signature_pad';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CompanyService, DocFieldApi, DocFieldType, DocSignerRole, NormField, TemplateFieldDto } from 'src/app/services/company.service';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export type SignatureBox = { page: number; x: number; y: number; w: number; h: number; originBottomLeft?: boolean };
@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.scss']
})

export class CompleteProfileComponent implements OnInit, AfterViewInit {
  firstFormGroup!: FormGroup;
  secondFormGroup!: FormGroup;
  documentForm!: FormGroup;

  driverLicenseFile: File | null = null;
  socialSecurityFile: File | null = null;
  profilePicture: File | null = null;
  insurancePicture: File | null = null;
  fileUrl: string = environment.fileUrl;
  acceptedTerms = false;
  loading = false;
  // ====== CONTRATO/PLANTILLA ======
  templateId = 0; // ¡ponle el ID real!
  comTempInfo: any;

  pdfUrl = '';



  safePdfUrl!: SafeResourceUrl;

  signerFullName = '';
  signerEmail = '';
  templateSignature: SignatureBox = {
    page: 3, x: 190, y: 408.0, w: 100, h: 35, originBottomLeft: true // defaults por si no llega nada
  };
  // signature pad
  @ViewChild('sigPadCanvas') sigPadCanvas!: ElementRef<HTMLCanvasElement>;
  private sigPad!: SignaturePad;

  submitting = false;
  errorMsg = '';
  done = false;

  // archivos
  private maxBytes = 5 * 1024 * 1024;

  constructor(
    private fb: FormBuilder,
    private settings: CoreService,
    private toastr: ToastrService,
    private router: Router,
    private docs: CompanyService,
    private sanitizer: DomSanitizer
  ) { }

  async ngOnInit(): Promise<void> {
    this.initForms();
    const u: any = this.settings.getUserInfoFromToken?.() || {};

    this.signerFullName =
      (u?.name?.trim?.()) ||
      [u?.given_name, u?.family_name].filter(Boolean).join(' ').trim() ||
      (u?.email ? String(u.email).split('@')[0].replace(/[_\.-]+/g, ' ').trim() : '') ||
      '';

    this.docs.getPdfSigned().subscribe({
      next: async (res) => {
        this.comTempInfo = res
        this.templateId = this.comTempInfo.templateId;
        this.pdfUrl = this.fileUrl + 'storage/companies/' + this.comTempInfo.companyId + '/documents/templates/' + this.comTempInfo.fileUrl;
        if (this.pdfUrl) {
          this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
        }
        if (this.templateId) {
          const t = await firstValueFrom(this.docs.getTemplate(this.templateId));
          // Guarda los fields parseados para usarlos al firmar
          this.comTempInfo.fields = JSON.parse(t.fieldsJson || '[]'); // array de TemplateFieldDto
        }
      },
    })
    // TODO: establece templateId y pdfUrl reales aquí o cárgalos desde la API:
    // this.templateId = 123;
    // const t = await firstValueFrom(this.docs.getTemplate(this.templateId));
    // this.pdfUrl = t.fileUrl;
    // Opcional: precargar nombre/correo del usuario logueado
    // this.signerFullName = '<Nombre>';
    // this.signerEmail = '<email@dominio.com>';

  }

  ngAfterViewInit(): void {
    this.sigPad = new SignaturePad(this.sigPadCanvas.nativeElement, {
      minWidth: 0.8,
      maxWidth: 2.5,
      penColor: 'black',
      backgroundColor: 'rgba(0,0,0,0)'
    });
  }

  private initForms(): void {
    this.firstFormGroup = this.fb.group({
      PhoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      Address: ['', [Validators.required]],
      City: ['', [Validators.required]],
      State: ['', Validators.required],
      ZipCode: ['', Validators.required],
      SocialSecurityNumber: ['', [Validators.required, Validators.pattern(/^\d{3}-\d{2}-\d{4}$/)]],
      DateOfBirth: ['', [Validators.required, this.minAgeValidator(18)]],

    });

    this.documentForm = this.fb.group({
      DriverExpDate: ['', [Validators.required, this.futureDateValidator()]],
      ExpInsurance: ['', [Validators.required, this.futureDateValidator()]],
      DriverLicenseNumber: ['', [Validators.required]],
      DriverLicenseFile: [null, Validators.required],
      CarInsuranceFile: [null, Validators.required],
      SocialSecurityFile: [null, Validators.required],
      ProfilePhotoFile: [null, Validators.required],
    });

    this.secondFormGroup = this.fb.group({
      AccountHolderName: ['', Validators.required],
      AccountNumber: ['', Validators.required],
      RoutingNumber: ['', Validators.required],

    });


  }
  setFile(controlName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    this.documentForm.get(controlName)?.setValue(file);
    this.documentForm.get(controlName)?.markAsTouched();
    this.documentForm.get(controlName)?.updateValueAndValidity();
  }

  // ====== Validadores ======
  private minAgeValidator(minYears: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value ? new Date(control.value) : null;
      if (!val) return null;
      const today = new Date();
      const min = new Date(today.getFullYear() - minYears, today.getMonth(), today.getDate());
      return val <= min ? null : { minAge: true };
    };
  }

  private futureDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value ? new Date(control.value) : null;
      if (!val) return null;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const d = new Date(val); d.setHours(0, 0, 0, 0);
      return d >= today ? null : { pastDate: true };
    };
  }
  private getInitials(fullName: string): string {
    if (!fullName?.trim()) return '';
    return fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)               // máx 3 iniciales
      .map(s => s[0].toUpperCase())
      .join('');
  }

  private formatDateISO(date = new Date()): string {
    // yyyy-MM-dd (común en contratos)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Calcula el fontSize máximo para que el texto quepa dentro de width dado */
  private fitFontSize(font: any, text: string, maxWidth: number, preferred = 12, min = 7): number {
    let size = preferred;
    let width = font.widthOfTextAtSize(text, size);
    if (width <= maxWidth) return size;

    // escala proporcional
    size = Math.floor(preferred * (maxWidth / Math.max(width, 1)));
    size = Math.max(min, Math.min(preferred, size));

    // seguridad: si aun no cabe, reduce un poco más iterando
    while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) {
      size -= 0.5;
    }
    return size;
  }

  private setFileToForm(
    e: Event,
    controlName: 'DriverLicenseFile' | 'SocialSecurityFile' | 'ProfilePhotoFile' | 'CarInsuranceFile',
    allowedMimes?: string[]
  ): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    // Tamaño
    if (file.size > this.maxBytes) {
      this.toastr.error('File is too large (max 5MB).');
      input.value = ''; // limpiar input
      this.documentForm.get(controlName)?.setValue(null);
      this.documentForm.get(controlName)?.markAsTouched();
      this.documentForm.get(controlName)?.updateValueAndValidity();
      return;
    }

    // Tipo (opcional)
    if (allowedMimes && !allowedMimes.some(m => file.type === m || file.type.startsWith(m.replace('/*', '/')))) {
      this.toastr.error('Invalid file type.');
      input.value = '';
      this.documentForm.get(controlName)?.setValue(null);
      this.documentForm.get(controlName)?.markAsTouched();
      this.documentForm.get(controlName)?.updateValueAndValidity();
      return;
    }

    // OK -> guardar en el FormControl
    this.documentForm.get(controlName)?.setValue(file);
    this.documentForm.get(controlName)?.markAsTouched();
    this.documentForm.get(controlName)?.updateValueAndValidity();
  }

  // ====== Archivos ======
  onDriverLicenseSelected(e: Event) {
    this.setFileToForm(e, 'DriverLicenseFile', ['image/*']);
  }

  onSocialSecuritySelected(e: Event) {
    this.setFileToForm(e, 'SocialSecurityFile', ['image/*']);
  }

  onProfilePhotoSelected(e: Event) {
    this.setFileToForm(e, 'ProfilePhotoFile', ['image/*']);
  }

  onCarInsuranceSelected(e: Event) {
    this.setFileToForm(e, 'CarInsuranceFile', ['image/*', 'application/pdf']);
  }


  // ====== Firma ======
  clearSignature() { this.sigPad?.clear(); }

  prefillSignature() {
    this.sigPad?.clear();
    const now = Date.now();
    const group = {
      color: 'black',
      points: [
        { x: 10, y: 80, time: now },
        { x: 120, y: 60, time: now + 10 },
        { x: 210, y: 100, time: now + 20 },
      ],
    };
    (this.sigPad as any).fromData([group]);
  }

  private hasSignature(): boolean { return this.sigPad && !this.sigPad.isEmpty(); }
  private looksLikePdf(u8: Uint8Array) {
    // %PDF-
    return u8.length >= 5 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46 && u8[4] === 0x2d;
  }

  private async fetchPdfBytes(url: string): Promise<Uint8Array> {
    // Si tu PDF requiere cookie/session, usa credentials:'include'
    const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} al pedir PDF: ${url}\n${text.slice(0, 200)}`);
    }
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/pdf') && !this.looksLikePdf(u8)) {
      // No parece PDF: probablemente HTML de error / login / 404
      const head = new TextDecoder().decode(u8.slice(0, 128));
      throw new Error(`La URL no devolvió PDF (CT=${ct}). Primeros bytes:\n${head}`);
    }
    return u8;
  }
  private async buildSignedPdfBase64FromUpperApi(
    pdfUrl: string,
    signaturePngDataUrl: string,
    apiFields: DocFieldApi[],
    values: { name: string; initials: string; date: string },
    originBottomLeft = true,           // pon false si tu Y viene desde ARRIBA
    filterRole: 'Contractor' | '' = '' // '' = no filtra por rol
  ): Promise<string> {

    const [pdfBytes, sigBytes] = await Promise.all([
      this.fetchPdfBytes(pdfUrl),
      fetch(signaturePngDataUrl).then(r => r.arrayBuffer()),
    ]);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const png = await pdfDoc.embedPng(sigBytes);
    const pageCount = pdfDoc.getPageCount();

    const fields = this.normalizeApiFields(apiFields)
      .filter(f => !filterRole || f.role === filterRole);

    for (const f of fields) {
      // índice seguro 0-based
      const idx = Math.max(0, Math.min(pageCount - 1, (f.page || 1) - 1));
      const page = pdfDoc.getPage(idx);
      const { height: pageH } = page.getSize();

      const x = f.x;
      const y = originBottomLeft ? f.y : (pageH - f.y - f.h);
      const w = f.w;
      const h = f.h;

      if (f.kind === 'Signature') {
        const targetH = h > 0 ? h : 35;
        const ratio = png.height / png.width;
        const targetW = w > 0 ? Math.min(w, targetH / ratio) : (targetH / ratio);
        const offsetX = x + Math.max(0, (w - targetW) / 2);
        const offsetY = y + Math.max(0, (h - targetH) / 2);
        page.drawImage(png, { x: offsetX, y: offsetY, width: targetW, height: targetH });
        continue;
      }

      // Texto: Initials / Date / Name(Text)
      const fit = (font: any, text: string, maxW: number, pref = 12, min = 7) => {
        let size = pref;
        if (font.widthOfTextAtSize(text, size) <= maxW) return size;
        size = Math.floor(pref * (maxW / Math.max(font.widthOfTextAtSize(text, pref), 1)));
        size = Math.max(min, Math.min(pref, size));
        while (size > min && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5;
        return size;
      };

      const drawTextCentered = (text: string, bold = false) => {
        if (!text) return;
        const font = bold ? helvBold : helv;
        const size = fit(font, text, Math.max(1, w - 2), bold ? 12 : 11);
        const yText = y + (Math.max(h, size) - size) / 2 + 1;
        page.drawText(text, { x: x + 1, y: yText, size, font });
      };

      if (f.kind === 'Initials') {
        drawTextCentered(values.initials, true);
      } else if (f.kind === 'Date') {
        drawTextCentered(values.date, false);
      } else if (f.kind === 'Text') {
        // si agregas un campo para nombre (Label "Name"/"Nombre")
        const lbl = (f.label || '').toLowerCase();
        if (lbl.includes('name') || lbl.includes('nombre')) {
          drawTextCentered(values.name, false);
        }
      }
    }

    return await pdfDoc.saveAsBase64({ dataUri: false });
  }



  private normalizeApiFields(api: DocFieldApi[]): NormField[] {
    return (api || []).map((f) => {
      const page = Number(f.Page ?? 1);
      const x = Number(f.X ?? 0);
      const y = Number(f.Y ?? 0);
      const w = Number(f.Width ?? 0);
      const h = Number(f.Height ?? 0);

      return {
        kind: (f.Type ?? 'Text') as NormField['kind'],
        role: (f.Role ?? '') as NormField['role'],
        page: Number.isFinite(page) && page > 0 ? page : 1,
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        w: Number.isFinite(w) ? w : 0,
        h: Number.isFinite(h) ? h : 0,
        label: f.Label ?? '',
        required: f.Required ?? true,
      };
    });
  }

  canFinish(): boolean {
    const ok =
      !!this.acceptedTerms &&
      this.hasSignature()


    // si sí quieres exigir templateId válido, descomenta la línea:
    // return ok && this.templateId > 0;
    return ok;
  }


  private stripDataUrl(dataUrl: string): string {
    const idx = dataUrl.indexOf('base64,');
    return idx >= 0 ? dataUrl.substring(idx + 7) : dataUrl;
  }

  private async sha256OfPdfUrl(url: string): Promise<string | undefined> {
    try {
      const buf = await fetch(url, { cache: 'no-store' }).then(r => r.arrayBuffer());
      const hash = await crypto.subtle.digest('SHA-256', buf);
      const bytes = Array.from(new Uint8Array(hash));
      return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { return undefined; }
  }
  // ====== Enviar perfil + firma ======
  async submitProfileAndSign(): Promise<void> {
    this.loading = true;
    if (this.submitting || this.done) {
      this.loading = false;
      return; // <-- evita doble submit o reintentos tras éxito
    }

    if (this.firstFormGroup.invalid || this.secondFormGroup.invalid || this.documentForm.invalid) {
      this.toastr.error('Please complete all required fields.');
      this.loading = false;
      return;
    }
    if (!this.canFinish()) {
      this.toastr.error('Please accept terms and draw signature.');
      this.loading = false;
      return;
    }

    this.submitting = true; this.errorMsg = ''; this.done = false;

    try {
      const sigDataUrl = this.sigPad.toDataURL('image/png');
      const sigBase64 = this.stripDataUrl(sigDataUrl);

      const pdfHash = this.pdfUrl ? await this.sha256OfPdfUrl(this.pdfUrl) : undefined;

      // 🔽 Asegura que tenemos fields (si no los guardaste en comTempInfo, vuelve a pedirlos)
      let fields: TemplateFieldDto[] = this.comTempInfo?.fields || [];
      if (!fields?.length && this.templateId) {
        const t = await firstValueFrom(this.docs.getTemplate(this.templateId));
        fields = JSON.parse(t.fieldsJson || '[]');
      }

      const values = {
        name: this.signerFullName?.trim() || '',
        initials: this.getInitials(this.signerFullName),
        date: this.formatDateISO(new Date())
      };
      const apiFields: DocFieldApi[] = this.comTempInfo?.fields ?? []; // <- tu JSON en mayúsculas

      const signedPdfBase64 = await this.buildSignedPdfBase64FromUpperApi(
        this.pdfUrl,
        sigDataUrl,
        apiFields,
        values,
      /* originBottomLeft= */ true  // pon false si tus Y vienen desde arriba
      );

      const payload: any = {
        templateId: this.templateId,
        signerFullName: this.signerFullName.trim(),
        signerEmail: this.signerEmail.trim(),
        drawnSignatureImageBase64: sigBase64,
        signedPdfBase64,
        ...(pdfHash ? { pdfHashSha256: pdfHash } : {})
      };

      const res = await firstValueFrom(this.docs.signTemplateJson(payload));

      if (res?.signedPdfUrl) {
        const busted = `${res.signedPdfUrl}${res.signedPdfUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(busted);
        this.pdfUrl = res.signedPdfUrl;
      }

      const formData = await this.buildProfileFormData();
      /*   formData.forEach((value, key) => {
           console.log(key, value);
         })*/
      await firstValueFrom(
        this.settings.completeProfile(formData)
      
      
      );

      this.toastr.success('Signed contract and completed profile!');
      this.done = true;
      localStorage.setItem('isFirstLogin', 'false');
      this.firstFormGroup.disable();
      this.secondFormGroup.disable();
      this.documentForm.disable();
      this.loading = false;
    } catch (err: any) {
      console.error(err);
      this.errorMsg = err?.error?.message || 'The signature or profile could not be completed.';
      this.toastr.error(this.errorMsg);
    } finally {
      this.submitting = false;
    }
  }

  goToSettings(): void {
    // Ajusta la ruta a tu módulo de configuraciones
    this.router.navigate(['/apps/account-setting']);
  }

  private async buildProfileFormData(): Promise<FormData> {
    const formData = new FormData();

    const first = this.firstFormGroup?.value ?? {};
    const docs = this.documentForm?.value ?? {};
    const bank = this.secondFormGroup?.value ?? {};

    // Helpers
    const onlyDigits = (v: any) => typeof v === 'string' ? v.replace(/\D+/g, '') : v;
    const toYmd = (d: any): string | null => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const isImage = (f: File | null | undefined) => !!f && f.type.startsWith('image/');

    // --- Campos simples (3 forms) ---
    const simple: Record<string, any> = {
      // Profile (firstFormGroup)
      PhoneNumber: onlyDigits(first.PhoneNumber),
      Address: first.Address,
      City: first.City,
      State: first.State,
      ZipCode: first.ZipCode,
      // SSN en dígitos
      SocialSecurityNumber: onlyDigits(first.SocialSecurityNumber),

      // Document (documentForm)
      DriverLicenseNumber: docs.DriverLicenseNumber,

      // Bank (secondFormGroup)
      AccountHolderName: bank.AccountHolderName,
      AccountNumber: bank.AccountNumber,
      RoutingNumber: bank.RoutingNumber,
    };

    for (const [k, v] of Object.entries(simple)) {
      if (v !== null && v !== undefined && v !== '') {
        formData.append(k, String(v));
      }
    }

    // --- Fechas -> yyyy-MM-dd ---
    const dob = toYmd(first.DateOfBirth);
    const expDrv = toYmd(docs.DriverExpDate);
    const expIns = toYmd(docs.ExpInsurance);

    if (dob) formData.set('DateOfBirth', dob);
    if (expDrv) formData.set('ExpDriverLicense', expDrv); // nombre que espera tu controller
    if (expIns) formData.set('ExpInsurance', expIns);

    // --- Archivos (lee desde el FORM, no desde propiedades de la clase) ---
    const dl = this.documentForm.get('DriverLicenseFile')?.value as File | null;
    const ss = this.documentForm.get('SocialSecurityFile')?.value as File | null;
    const av = this.documentForm.get('ProfilePhotoFile')?.value as File | null;
    const ins = this.documentForm.get('CarInsuranceFile')?.value as File | null;

    const tasks: Promise<void>[] = [];

    // Si es imagen -> comprime/redimensiona; si no (pdf u otro) -> sube tal cual
    if (dl) {
      tasks.push(
        (isImage(dl) ? this.resizeImage(dl) : Promise.resolve(dl))
          .then(f => formData.append('DriverLicense', f, f.name))
      );
    }
    if (ss) {
      tasks.push(
        (isImage(ss) ? this.resizeImage(ss) : Promise.resolve(ss))
          .then(f => formData.append('SocialSecurityUrl', f, f.name))
      );
    }
    if (av) {
      tasks.push(
        (isImage(av) ? this.resizeImage(av) : Promise.resolve(av))
          .then(f => formData.append('AvatarUrl', f, f.name))
      );
    }
    if (ins) {
      tasks.push(
        (isImage(ins) ? this.resizeImage(ins) : Promise.resolve(ins))
          .then(f => formData.append('InsuranceUrl', f, f.name))
      );
    }

    await Promise.all(tasks);

    return formData;
  }



  resizeImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          let width = img.width, height = img.height;

          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }

          canvas.width = width; canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) return reject('Error compressing the image');
            resolve(new File([blob], file.name, { type: file.type }));
          }, file.type, quality);
        };
        img.onerror = () => reject('Invalid image.');
      };
      reader.onerror = () => reject('Reader error.');
    });
  }

  // (Opcional) Si quieres mostrar solo ****-**-1234
  maskSSN(): void {
    const ssn = this.firstFormGroup.get('SocialSecurityNumber')?.value;
    if (ssn && ssn.length === 11) {
      const last4 = ssn.slice(-4);
      this.firstFormGroup.patchValue({ SocialSecurityNumber: `***-**-${last4}` });
    }
  }
}


