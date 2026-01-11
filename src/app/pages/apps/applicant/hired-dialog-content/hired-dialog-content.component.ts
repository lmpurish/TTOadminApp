import { CommonModule, formatDate } from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TablerIconComponent } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { RolePipe } from '../role.pipe';
import { StatusLabelPipe } from 'src/app/pipe/status-label.pipe';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { CoreService } from 'src/app/services/core.service';
import { ToastrService } from 'ngx-toastr';
import { RecruiterService } from 'src/app/services/recruiter.service';
import { C } from '@angular/cdk/keycodes';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-hired-dialog-content',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconComponent,
    CommonModule,
    RolePipe,
    StatusLabelPipe,
  ],
  providers: [DatePipe],
  templateUrl: './hired-dialog-content.component.html',
  styleUrl: './hired-dialog-content.component.scss',

})
export class HiredDialogContentComponent {
  action: string;
  loading = false;
  isAdmin = false;
  local_data: any;
  activityTypes = [
    { value: 'Note', label: 'Note' },
    { value: 'CallScheduled', label: 'Call Scheduled' },
    { value: 'CallOutcome', label: 'Call Outcome' },
    { value: 'DocRequest', label: 'Doc Request' },
    { value: 'StageChange', label: 'Stage Change' },
    { value: 'ContractSent', label: 'Contract Sent' },
    { value: 'ContractSigned', label: 'Contract Signed' }
  ];
  activityForm!: FormGroup;


  constructor(
    public dialogRef: MatDialogRef<HiredDialogContentComponent>,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private warehouseService: WarehouseService,
    private settings: CoreService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private route: Router,
    private datePipe: DatePipe,

    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data?.action || '';
    this.local_data = { ...data?.local_data };

    // Convertir `userRole` a string para `mat-select`
    if (this.local_data?.userRole !== undefined) {
      this.local_data.userRole = String(this.local_data.userRole);
    }

    // Asignar `warehouseId` correctamente
    if (this.local_data?.warehouse) {
      this.local_data.warehouseId = this.local_data.warehouse.id;
    }
  }
  readonly activitiesRequiringDate = new Set<string>([
    'CallScheduled',        // tu caso
    // 'CallOutcome',        // agrega más si aplica
    // 'startDate',
  ]);

  today = new Date();

  ngOnInit(): void {

    this.activityForm = this.fb.group({
      applicantId: [this.local_data.id, [Validators.required]],
      recruiterId: [Number(this.settings.getUserInfoFromToken()?.id), [Validators.required]],
      activity: [null, [Validators.required]],
      message: ['', [Validators.maxLength(500)]],
      scheduleDate: [{ value: null, disabled: true }],
      scheduleTime: [{ value: '', disabled: true }],
      startDate: [{ value: null, disabled: !this.isHired(this.local_data?.stage) }]
    });
    if (this.isHired(this.local_data?.stage)) {
      this.configureHiredDefaults();
    }

    this.activityForm.get('activity')!.valueChanges.subscribe(val => {
      const needs = this.activitiesRequiringDate.has(val);
      const d = this.activityForm.get('scheduleDate')!;
      const t = this.activityForm.get('scheduleTime')!;
      const m = this.activityForm.get('message')!;

      if (needs) {
        d.enable({ emitEvent: false }); d.setValidators([Validators.required]);
        t.enable({ emitEvent: false }); t.setValidators([Validators.required]);
        m.setValidators([Validators.required, Validators.maxLength(500)]);
      } else {
        d.reset(null, { emitEvent: false }); d.clearValidators(); d.disable({ emitEvent: false });
        t.reset('', { emitEvent: false }); t.clearValidators(); t.disable({ emitEvent: false });
        m.setValidators([Validators.maxLength(500)]);
        // NO limpiamos aquí para no borrar mensajes de Hired
      }
      d.updateValueAndValidity({ emitEvent: false });
      t.updateValueAndValidity({ emitEvent: false });
      m.updateValueAndValidity({ emitEvent: false });

      // Solo actualizar mensaje si es actividad de agenda
      if (needs) this.updateMessage();
    });

    // Cambios de agenda
    this.activityForm.get('scheduleDate')!.valueChanges.subscribe(() => this.updateMessage());
    this.activityForm.get('scheduleTime')!.valueChanges.subscribe(() => this.updateMessage());

    // Hired Note
    this.activityForm.get('startDate')!.valueChanges.subscribe(() => this.updateHiredNoteMessage());


  }

  private updateMessage() {
    const act = this.activityForm.get('activity')?.value;
    const date: Date | null = this.activityForm.get('scheduleDate')?.value;
    const time: string = this.activityForm.get('scheduleTime')?.value || '';
    const msgCtrl = this.activityForm.get('message') as FormControl;

    // ⬇️ Si no es CallScheduled, no modifiques message
    if (!this.activitiesRequiringDate.has(act)) return;

    // Solo borra el mensaje si estabas generando uno de "scheduled call"
    if (!date || !time) {
      const current = (msgCtrl.value || '') as string;
      if (current.startsWith('There is a scheduled call') || current.startsWith('Tienes una llamada programada')) {
        msgCtrl.setValue('', { emitEvent: false });
      }
      return;
    }

    const fechaStr = formatDate(date, "EEEE d 'de' MMMM 'de' y", 'en-US');
    const mensaje = `There is a scheduled call on ${fechaStr} at ${time}.`;
    msgCtrl.setValue(mensaje, { emitEvent: false });
  }
  getAge(dob?: string | Date | null): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  get showScheduleDate(): boolean {
    const val = this.activityForm.get('activity')?.value;
    return this.activitiesRequiringDate.has(val);
  }
  submit(): void {
    this.loading = true;
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }
    const { scheduleDate, scheduleTime, ...rest } = this.activityForm.getRawValue();
    let scheduleAtIso: string | null = null; // 👈 declarar aquí
    if (scheduleDate && scheduleTime) {
      const [hh, mm] = scheduleTime.split(':').map(Number);
      const d = new Date(scheduleDate);
      d.setHours(hh ?? 0, mm ?? 0, 0, 0);

      const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const H = pad(d.getHours());
      const M = pad(d.getMinutes());
      const S = pad(d.getSeconds());

      const offMin = -d.getTimezoneOffset();   // ej: -360 en Houston (UTC-6)
      const sign = offMin >= 0 ? '+' : '-';
      const oh = pad(offMin / 60);
      const om = pad(offMin % 60);

      scheduleAtIso = `${y}-${m}-${day}T${H}:${M}:${S}${sign}${oh}:${om}`;
      // Ej: "2025-11-20T13:58:00-06:00"
    }
    const payload = { ...rest, activityDate: scheduleAtIso };
    console.log(payload)
    this.recruiterService.submitApplicantActivity(payload).subscribe({
      next: (res) => {
        // ✅ Aquí entra si el backend respondió 201 Created sin problema
        // ejemplo: mostrar toast de éxito
        this.toastr.success("activity saved successfully", 'Success');
        // ejemplo: limpiar formulario


        const start: Date | null = payload.startDate;
        const employee = {
          id: Number(this.local_data.id),
          stage: this.local_data.stage,
          initialDate: start ? formatDate(start, 'yyyy-MM-dd', 'en-US') : null
        };
        this.employeeService.updateEmployee(employee)
          .subscribe({
            next: () => {
              this.toastr.success('Stage updated successfully', 'Success')
            },
            error: (err) => this.toastr.error(err?.error?.message || 'Error updating stage', 'Error'),
          });
        this.loading = false;
        this.activityForm.reset();
        this.closeDialog();

        // ejemplo: recargar la lista de actividades del aplicante

      },
      error: (err) => {
        // ❌ Aquí si el servidor devolvió 400/401/500/etc.
        console.log(err)
        this.toastr.warning(err.message, 'Warning');

        console.error('Error saving activity', err);
        this.loading = false;
      },
      complete: () => {
        // 🔄 Opcional: si quieres cerrar un dialog, spinner, etc.
        console.log('submitApplicantActivity terminado');
        this.loading = false;
      }
    });
    // aquí llamarías tu servicio:
    // this.applicantService.addActivity(payload).subscribe(...)
  }
  closeDialog(): void {
    if (!this.loading) {
      this.dialogRef.close({ event: 'Cancel', changed: true });
    }
  }
  stageOptions = [
    { value: 'New', label: 'New' },
    { value: 'Contact_Attempted', label: 'Contact Attempted' },
    { value: 'Phone_Screen', label: 'Phone Screen' },
    { value: 'Docs_Pending', label: 'Docs Pending' },
    { value: 'Approved_For_Hire', label: 'Approved For Hire' },
    { value: 'Hired', label: 'Hired' },
    { value: 'Rejected', label: 'Rejected' },

  ];
  stageClass(stage?: string): string {
    switch ((stage || '').toLowerCase()) {
      case 'New': return 'stage-new';
      case 'Contact_Attempted': return 'stage-contacted';
      case 'Phone_Screen': return 'stage-interview';
      case 'Docs_Pending': return 'stage-hired';
      case 'Approved_For_Hire': return 'stage-rejected';
      case 'Hired':
      case 'Rejected': return 'stage-onhold';
      default: return 'stage-default';
    }
  }

  onStageChange(applicant: any) {
    const startCtrl = this.activityForm.get('startDate')!;
    const actCtrl = this.activityForm.get('activity')!;
    const hired = this.isHired(applicant?.stage);

    if (hired) {
      startCtrl.enable({ emitEvent: false });
      startCtrl.setValidators([Validators.required]);
      startCtrl.updateValueAndValidity({ emitEvent: false });

      // Fuerza actividad = Note (¡importante para no chocar con tu lógica de CallScheduled!)
      actCtrl.setValue('Note', { emitEvent: false });

      this.updateHiredNoteMessage();
    } else {
      startCtrl.reset(null, { emitEvent: false });
      startCtrl.clearValidators();
      startCtrl.disable({ emitEvent: false });
      startCtrl.updateValueAndValidity({ emitEvent: false });
    }

    // Guarda el stage en backend como ya hacías
    /*  this.employeeService.updateEmployee({ id: Number(applicant.id), stage: applicant.stage })
        .subscribe({
          next: () => this.toastr.success('Stage updated successfully', 'Success'),
          error: (err) => this.toastr.error(err?.error?.message || 'Error updating stage', 'Error'),
        });*/
  }
  private configureHiredDefaults() {
    const startCtrl = this.activityForm.get('startDate')!;
    const actCtrl = this.activityForm.get('activity')!;
    startCtrl.enable({ emitEvent: false });
    startCtrl.setValidators([Validators.required]);
    startCtrl.updateValueAndValidity({ emitEvent: false });

    actCtrl.setValue('Note', { emitEvent: false });
    this.updateHiredNoteMessage();
  }

  private updateHiredNoteMessage() {
    if (!this.isHired(this.local_data?.stage)) return;

    const d: Date | null = this.activityForm.get('startDate')?.value;
    const msgCtrl = this.activityForm.get('message') as FormControl;
    if (!d) return;

    const fullName = `${this.local_data?.name ?? ''} ${this.local_data?.lastName ?? ''}`.trim();
    const dateStr = formatDate(d, "EEEE d 'de' MMMM 'de' y", 'en-US');
    const mensaje = `${fullName} will start on ${dateStr}.`;
    msgCtrl.setValue(mensaje, { emitEvent: false });
  }

  isHired(stage: string | null | undefined): boolean {


    return (stage ?? '').toString().toLowerCase() === 'hired';
  }

}




export interface ApplicantActivity {
  id?: number;
  applicantId: number;
  recruiterId: number;
  activity: string; // lo mandamos como string desde el select
  message: string;
  createAt: string; // lo mandamos como 'YYYY-MM-DD'
}