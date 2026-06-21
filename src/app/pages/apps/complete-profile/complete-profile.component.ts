// src/app/pages/apps/company/complete-profile.component.ts

import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MaterialModule } from '../../../material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CoreService } from 'src/app/services/core.service';
import { ToastrService } from 'ngx-toastr';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import SignaturePad from 'signature_pad';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CompanyService, DocFieldApi, NormField, TemplateFieldDto } from 'src/app/services/company.service';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';

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
  showSsn = false;
  maskedSsn = '';
  private last4Ssn = '';
  fileUrl = environment.fileUrl;

  loading = false;
  submitting = false;
  done = false;
  errorMsg = '';

  sectionMode: string | null = null;
  updateMode = false;

  acceptedTerms = false;


  currentUserId!: number;

  templateId = 0;
  comTempInfo: any;
  pdfUrl = '';
  safePdfUrl!: SafeResourceUrl;

  signerFullName = '';
  signerEmail = '';

ssnLast4 = '';
  hasDriverLicenseFile = false;
  hasInsuranceFile = false;
  hasProfilePhoto = false;
  private maxBytes = 5 * 1024 * 1024;

  @ViewChild('sigPadCanvas') sigPadCanvas!: ElementRef<HTMLCanvasElement>;
  private sigPad!: SignaturePad;

  constructor(
    private fb: FormBuilder,
    private settings: CoreService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private docs: CompanyService,
    private sanitizer: DomSanitizer,
    private employeeService: EmployeeService
  ) { }

  async ngOnInit(): Promise<void> {
    this.initForms();

    this.sectionMode = this.route.snapshot.queryParamMap.get('section');
    this.updateMode = !!this.sectionMode;

    this.configureSectionMode();
    this.loadSavedProfile();

    const u: any = this.settings.getUserInfoFromToken?.() || {};

    this.signerFullName =
      u?.name?.trim?.() ||
      [u?.given_name, u?.family_name].filter(Boolean).join(' ').trim() ||
      (u?.email ? String(u.email).split('@')[0].replace(/[_\.-]+/g, ' ').trim() : '') ||
      '';

    if (!this.updateMode) {
      this.loadContractTemplate();
    }
  }

  ngAfterViewInit(): void {
    if (!this.updateMode && this.sigPadCanvas?.nativeElement) {
      this.sigPad = new SignaturePad(this.sigPadCanvas.nativeElement, {
        minWidth: 0.8,
        maxWidth: 2.5,
        penColor: 'black',
        backgroundColor: 'rgba(0,0,0,0)'
      });
    }
  }

  get pageTitle(): string {
    switch (this.sectionMode) {
      case 'bank': return 'Update Bank Account';
      case 'address': return 'Update Address';
      case 'driver-license': return 'Update Driver License';
      case 'insurance': return 'Update Insurance';
      case 'ssn': return 'Update Social Security';
      default: return 'Complete Profile';
    }
  }

  private initForms(): void {
    this.firstFormGroup = this.fb.group({
      PhoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      Address: ['', Validators.required],
      City: ['', Validators.required],
      State: ['', Validators.required],
      ZipCode: ['', Validators.required],
      SocialSecurityNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(\d{3}-\d{2}-\d{4}|XXX-XX-\d{4})$/)
        ]
      ],
      DateOfBirth: ['', [Validators.required, this.minAgeValidator(18)]]
    });

    this.documentForm = this.fb.group({
      DriverExpDate: ['', [Validators.required, this.futureDateValidator()]],
      ExpInsurance: ['', [Validators.required, this.futureDateValidator()]],
      DriverLicenseNumber: ['', Validators.required],
      DriverLicenseFile: [null, Validators.required],
      CarInsuranceFile: [null, Validators.required],
      ProfilePhotoFile: [null, Validators.required]
    });

    this.secondFormGroup = this.fb.group({
      AccountHolderName: ['', Validators.required],
      AccountNumber: ['', Validators.required],
      RoutingNumber: ['', Validators.required]
    });
  }

  private configureSectionMode(): void {
    if (!this.updateMode) return;

    Object.keys(this.firstFormGroup.controls).forEach(key => {
      this.firstFormGroup.get(key)?.clearValidators();
      this.firstFormGroup.get(key)?.updateValueAndValidity();
    });

    Object.keys(this.documentForm.controls).forEach(key => {
      this.documentForm.get(key)?.clearValidators();
      this.documentForm.get(key)?.updateValueAndValidity();
    });

    Object.keys(this.secondFormGroup.controls).forEach(key => {
      this.secondFormGroup.get(key)?.clearValidators();
      this.secondFormGroup.get(key)?.updateValueAndValidity();
    });

    switch (this.sectionMode) {
      case 'address':
        this.firstFormGroup.get('PhoneNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
        this.firstFormGroup.get('Address')?.setValidators([Validators.required]);
        this.firstFormGroup.get('City')?.setValidators([Validators.required]);
        this.firstFormGroup.get('State')?.setValidators([Validators.required]);
        this.firstFormGroup.get('ZipCode')?.setValidators([Validators.required]);
        break;

      case 'bank':
        this.secondFormGroup.get('AccountHolderName')?.setValidators([Validators.required]);
        this.secondFormGroup.get('AccountNumber')?.setValidators([Validators.required]);
        this.secondFormGroup.get('RoutingNumber')?.setValidators([Validators.required]);
        break;

      case 'driver-license':
        this.documentForm.get('DriverLicenseNumber')?.setValidators([Validators.required]);
        this.documentForm.get('DriverExpDate')?.setValidators([Validators.required, this.futureDateValidator()]);
        break;

      case 'insurance':
        this.documentForm.get('ExpInsurance')?.setValidators([Validators.required, this.futureDateValidator()]);
        break;

      case 'ssn':
        this.firstFormGroup.get('SocialSecurityNumber')?.setValidators([
          Validators.required,
          Validators.pattern(/^\d{3}-\d{2}-\d{4}$/)
        ]);
        break;
    }

    this.firstFormGroup.updateValueAndValidity();
    this.secondFormGroup.updateValueAndValidity();
    this.documentForm.updateValueAndValidity();
  }

  loadSavedProfile(): void {
    this.settings.getCurrentUser().subscribe({
      next: (res) => {
        console.log(res)
        this.currentUserId = res.id;

        this.hasDriverLicenseFile = !!res.driverUrl;
        this.hasInsuranceFile = !!res.insuranceUrl;
        this.hasProfilePhoto = !!res.avatar;

        this.firstFormGroup.patchValue({
          PhoneNumber: res.phone || '',
          Address: res.address || '',
          City: res.city || '',
          State: res.state || '',
          ZipCode: res.zipCode || '',
          DateOfBirth: res.dateOfBirth ? new Date(res.dateOfBirth) : ''
        });
      if (res.ssnn) {
  this.ssnLast4 = String(res.ssnn).replace(/\D/g, '').slice(-4);

  const ssnControl = this.firstFormGroup.get('SocialSecurityNumber');
  ssnControl?.clearValidators();
  ssnControl?.updateValueAndValidity();
} else {
  const ssnControl = this.firstFormGroup.get('SocialSecurityNumber');
  ssnControl?.setValidators([
    Validators.required,
    Validators.pattern(/^\d{3}-\d{2}-\d{4}$/)
  ]);
  ssnControl?.updateValueAndValidity();
}

        this.documentForm.patchValue({
          DriverLicenseNumber: res.driverLicenseNumber || '',
          DriverExpDate: res.expDriverLicense ? new Date(res.expDriverLicense) : '',
          ExpInsurance: res.expInsurance ? new Date(res.expInsurance) : ''
        });

        this.secondFormGroup.patchValue({
          AccountHolderName: `${res.name || ''} ${res.lastName || ''}`.trim(),
          AccountNumber: res.accountNumber || '',
          RoutingNumber: res.routingNumber || ''
        });

        if (this.hasDriverLicenseFile) {
          this.documentForm.get('DriverLicenseFile')?.clearValidators();
          this.documentForm.get('DriverLicenseFile')?.updateValueAndValidity();
        }

        if (this.hasInsuranceFile) {
          this.documentForm.get('CarInsuranceFile')?.clearValidators();
          this.documentForm.get('CarInsuranceFile')?.updateValueAndValidity();
        }

        if (this.hasProfilePhoto) {
          this.documentForm.get('ProfilePhotoFile')?.clearValidators();
          this.documentForm.get('ProfilePhotoFile')?.updateValueAndValidity();
        }

        this.documentForm.updateValueAndValidity();
      },
      error: () => {
        this.toastr.error('Could not load saved profile information.');
      }
    });
  }

  onDriverLicenseSelected(e: Event): void {
    this.setFileToForm(e, 'DriverLicenseFile', [
      'image/*',
      'application/pdf'
    ]);
  }
toggleSsn(): void {
  const ssnControl = this.firstFormGroup.get('SocialSecurityNumber');

  if (!ssnControl) return;

  // Ocultar
  if (this.showSsn) {
    this.showSsn = false;
    return;
  }

  // Mostrar
  if (!this.currentUserId) {
    this.toastr.error('User not found.');
    return;
  }

  this.employeeService.getSsn(this.currentUserId).subscribe({
    next: (res) => {
      const digits = String(res?.ssn || '').replace(/\D/g, '');

      if (digits.length !== 9) {
        this.toastr.error('Invalid SSN.');
        return;
      }

      const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;

      ssnControl.setValidators([
        Validators.required,
        Validators.pattern(/^\d{3}-\d{2}-\d{4}$/)
      ]);

      ssnControl.patchValue(formatted);
      ssnControl.updateValueAndValidity();

      this.ssnLast4 = digits.slice(-4);
      this.showSsn = true;
    },
    error: () => {
      this.toastr.error('Unable to load SSN.');
    }
  });
}  async saveSectionAndNext(stepper: any, section: string): Promise<void> {
    const saved = await this.saveCurrentSection(section);

    if (saved) {
      stepper.next();
    }
  }

  async saveCurrentSection(section: string): Promise<boolean> {
    this.loading = true;

    try {
      const formData = new FormData();

      if (section === 'address') {
        if (this.firstFormGroup.invalid) {
          this.firstFormGroup.markAllAsTouched();
          this.toastr.error('Please complete profile information.');
          return false;
        }

        const first = this.firstFormGroup.value;

        formData.append('PhoneNumber', String(first.PhoneNumber || '').replace(/\D+/g, ''));
        formData.append('Address', first.Address || '');
        formData.append('City', first.City || '');
        formData.append('State', first.State || '');
        formData.append('ZipCode', first.ZipCode || '');

        if (first.DateOfBirth) {
          formData.append('DateOfBirth', this.toYmd(first.DateOfBirth));
        }

     const ssn = String(first.SocialSecurityNumber || '').trim();

if (ssn) {
  formData.append(
    'SocialSecurityNumber',
    ssn.replace(/\D/g, '')
  );
}
      }

      if (section === 'documents') {
        if (this.documentForm.invalid) {
          this.documentForm.markAllAsTouched();
          this.toastr.error('Please complete document information.');
          return false;
        }

        const docs = this.documentForm.value;

        formData.append('DriverLicenseNumber', docs.DriverLicenseNumber);
        formData.append('ExpDriverLicense', this.toYmd(docs.DriverExpDate));
        formData.append('ExpInsurance', this.toYmd(docs.ExpInsurance));

        const dl = this.documentForm.get('DriverLicenseFile')?.value as File | null;
        const ins = this.documentForm.get('CarInsuranceFile')?.value as File | null;
        const av = this.documentForm.get('ProfilePhotoFile')?.value as File | null;

        if (dl) {
          const finalFile = dl.type.startsWith('image/') ? await this.resizeImage(dl) : dl;
          formData.append('DriverLicense', finalFile, finalFile.name);
        }

        if (ins) {
          const finalFile = ins.type.startsWith('image/') ? await this.resizeImage(ins) : ins;
          formData.append('InsuranceUrl', finalFile, finalFile.name);
        }

        if (av) {
          const finalFile = av.type.startsWith('image/') ? await this.resizeImage(av) : av;
          formData.append('AvatarUrl', finalFile, finalFile.name);
        }
      }

      if (section === 'bank') {
        if (this.secondFormGroup.invalid) {
          this.secondFormGroup.markAllAsTouched();
          this.toastr.error('Please complete bank information.');
          return false;
        }

        const bank = this.secondFormGroup.value;

        formData.append('AccountHolderName', bank.AccountHolderName);
        formData.append('AccountNumber', bank.AccountNumber);
        formData.append('RoutingNumber', bank.RoutingNumber);
      }

      await firstValueFrom(this.settings.completeProfile(formData, section));

      if (section === 'finish') {
        localStorage.setItem('isFirstLogin', 'false');
      }

      this.toastr.success('Information saved.');
      return true;

    } catch (err: any) {
      console.error(err);
      this.toastr.error(err?.error?.message || err?.error?.Message || 'Error saving information.');
      return false;
    } finally {
      this.loading = false;
    }
  }

  private loadContractTemplate(): void {
    this.docs.getPdfSigned().subscribe({
      next: async (res) => {
        this.comTempInfo = res;
        this.templateId = this.comTempInfo.templateId;

        this.pdfUrl =
          this.fileUrl +
          'storage/companies/' +
          this.comTempInfo.companyId +
          '/documents/templates/' +
          this.comTempInfo.fileUrl;

        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);

        if (this.templateId) {
          const t = await firstValueFrom(this.docs.getTemplate(this.templateId));
          this.comTempInfo.fields = JSON.parse(t.fieldsJson || '[]');
        }
      }
    });
  }

  setFile(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.documentForm.get(controlName)?.setValue(file);
    this.documentForm.get(controlName)?.markAsTouched();
    this.documentForm.get(controlName)?.updateValueAndValidity();
  }

  onCarInsuranceSelected(e: Event): void {
    this.setFileToForm(e, 'CarInsuranceFile', ['image/*', 'application/pdf']);
  }

  onProfilePhotoSelected(e: Event): void {
    this.setFileToForm(e, 'ProfilePhotoFile', ['image/*']);
  }

  private setFileToForm(
    e: Event,
    controlName: 'DriverLicenseFile' | 'ProfilePhotoFile' | 'CarInsuranceFile',
    allowedMimes?: string[]
  ): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) return;

    if (file.size > this.maxBytes) {
      this.toastr.error('File is too large. Max size is 5MB.');
      input.value = '';
      this.documentForm.get(controlName)?.setValue(null);
      return;
    }

    if (allowedMimes && !allowedMimes.some(m => file.type === m || file.type.startsWith(m.replace('/*', '/')))) {
      this.toastr.error('Invalid file type.');
      input.value = '';
      this.documentForm.get(controlName)?.setValue(null);
      return;
    }

    this.documentForm.get(controlName)?.setValue(file);
    this.documentForm.get(controlName)?.markAsTouched();
    this.documentForm.get(controlName)?.updateValueAndValidity();
  }

  async submitProfileAndSign(): Promise<void> {
    this.loading = true;

    try {
      if (!this.canFinish()) {
        this.toastr.error('Please accept terms and draw signature.');
        return;
      }

      const sigDataUrl = this.sigPad.toDataURL('image/png');
      const sigBase64 = this.stripDataUrl(sigDataUrl);

      const pdfHash = this.pdfUrl ? await this.sha256OfPdfUrl(this.pdfUrl) : undefined;

      const values = {
        name: this.signerFullName?.trim() || '',
        initials: this.getInitials(this.signerFullName),
        date: this.formatDateISO(new Date())
      };

      const apiFields: DocFieldApi[] = this.comTempInfo?.fields ?? [];

      const signedPdfBase64 = await this.buildSignedPdfBase64FromUpperApi(
        this.pdfUrl,
        sigDataUrl,
        apiFields,
        values,
        true
      );

      const payload: any = {
        templateId: this.templateId,
        signerFullName: this.signerFullName.trim(),
        signerEmail: this.signerEmail.trim(),
        drawnSignatureImageBase64: sigBase64,
        signedPdfBase64,
        ...(pdfHash ? { pdfHashSha256: pdfHash } : {})
      };

      await firstValueFrom(this.docs.signTemplateJson(payload));
      await firstValueFrom(this.settings.completeProfile(new FormData(), 'finish'));

      this.done = true;
      localStorage.setItem('isFirstLogin', 'false');

      this.toastr.success('Signed contract and completed profile!');
      this.router.navigate(['/apps/account-setting']);

    } catch (err: any) {
      console.error(err);
      this.toastr.error(err?.error?.message || err?.error?.Message || 'The signature could not be completed.');
    } finally {
      this.loading = false;
    }
  }
  isMaskedSsn(): boolean {
    const value = String(this.firstFormGroup.get('SocialSecurityNumber')?.value || '');
    return value.startsWith('XXX-XX-');
  }

  startSsnEditIfMasked(): void {
    if (this.isMaskedSsn()) {
      this.showSsn = true;
      this.firstFormGroup.patchValue({
        SocialSecurityNumber: ''
      });
    }
  }

  private ssnValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();

    if (!value) return { required: true };

    const validFull = /^\d{3}-\d{2}-\d{4}$/.test(value);
    const validMasked = /^XXX-XX-\d{4}$/.test(value);

    return validFull || validMasked ? null : { invalidSsn: true };
  }

  canFinish(): boolean {
    return !!this.acceptedTerms && this.sigPad && !this.sigPad.isEmpty();
  }

  clearSignature(): void {
    this.sigPad?.clear();
  }

  prefillSignature(): void {
    this.sigPad?.clear();

    const now = Date.now();
    const group = {
      color: 'black',
      points: [
        { x: 10, y: 80, time: now },
        { x: 120, y: 60, time: now + 10 },
        { x: 210, y: 100, time: now + 20 }
      ]
    };

    (this.sigPad as any).fromData([group]);
  }

  goToSettings(): void {
    this.router.navigate(['/apps/account-setting']);
  }

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

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const d = new Date(val);
      d.setHours(0, 0, 0, 0);

      return d >= today ? null : { pastDate: true };
    };
  }

  private toYmd(date: any): string {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

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

  private getInitials(fullName: string): string {
    if (!fullName?.trim()) return '';

    return fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(s => s[0].toUpperCase())
      .join('');
  }

  private formatDateISO(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
    } catch {
      return undefined;
    }
  }

  private async fetchPdfBytes(url: string): Promise<Uint8Array> {
    const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  private normalizeApiFields(api: DocFieldApi[]): NormField[] {
    return (api || []).map((f) => ({
      kind: (f.Type ?? 'Text') as NormField['kind'],
      role: (f.Role ?? '') as NormField['role'],
      page: Number(f.Page ?? 1),
      x: Number(f.X ?? 0),
      y: Number(f.Y ?? 0),
      w: Number(f.Width ?? 0),
      h: Number(f.Height ?? 0),
      label: f.Label ?? '',
      required: f.Required ?? true
    }));
  }

  private async buildSignedPdfBase64FromUpperApi(
    pdfUrl: string,
    signaturePngDataUrl: string,
    apiFields: DocFieldApi[],
    values: { name: string; initials: string; date: string },
    originBottomLeft = true,
    filterRole: 'Contractor' | '' = ''
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
      const idx = Math.max(0, Math.min(pageCount - 1, (f.page || 1) - 1));
      const page = pdfDoc.getPage(idx);
      const { height: pageH } = page.getSize();

      const x = f.x;
      const y = originBottomLeft ? f.y : pageH - f.y - f.h;
      const w = f.w;
      const h = f.h;

      if (f.kind === 'Signature') {
        const targetH = h > 0 ? h : 35;
        const ratio = png.height / png.width;
        const targetW = w > 0 ? Math.min(w, targetH / ratio) : targetH / ratio;
        const offsetX = x + Math.max(0, (w - targetW) / 2);
        const offsetY = y + Math.max(0, (h - targetH) / 2);

        page.drawImage(png, {
          x: offsetX,
          y: offsetY,
          width: targetW,
          height: targetH
        });

        continue;
      }

      const drawTextCentered = (text: string, bold = false) => {
        if (!text) return;

        const font = bold ? helvBold : helv;
        let size = bold ? 12 : 11;

        while (size > 7 && font.widthOfTextAtSize(text, size) > Math.max(1, w - 2)) {
          size -= 0.5;
        }

        const yText = y + (Math.max(h, size) - size) / 2 + 1;

        page.drawText(text, {
          x: x + 1,
          y: yText,
          size,
          font
        });
      };

      if (f.kind === 'Initials') {
        drawTextCentered(values.initials, true);
      }

      if (f.kind === 'Date') {
        drawTextCentered(values.date, false);
      }

      if (f.kind === 'Text') {
        const lbl = (f.label || '').toLowerCase();

        if (
          lbl.includes('name') ||
          lbl.includes('nombre') ||
          lbl.includes('contractor')
        ) {
          drawTextCentered(values.name, false);
        }
      }
    }

    return await pdfDoc.saveAsBase64({ dataUri: false });
  }
}