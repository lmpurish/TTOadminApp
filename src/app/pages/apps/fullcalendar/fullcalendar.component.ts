import {
  Component,
  ChangeDetectionStrategy,
  Inject,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT, NgSwitch } from '@angular/common';
import {
  MatDialog,
  MatDialogRef,
  MatDialogConfig,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormGroup,
} from '@angular/forms';
import { CalendarFormDialogComponent } from './calendar-form-dialog/calendar-form-dialog.component';
import {
  startOfDay,
  subDays,
  addDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  addHours,
  subMonths,
  addMonths,
} from 'date-fns';
import { Subject } from 'rxjs';
import {
  CalendarDateFormatter,
  CalendarEvent,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
  CalendarModule,
  CalendarView,
} from 'angular-calendar';
import { MaterialModule } from 'src/app/material.module';
import {
  MatNativeDateModule,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TablerIconsModule } from 'angular-tabler-icons';
import { RecruiterService, ApplicantActivity  } from 'src/app/services/recruiter.service';
import { format } from 'date-fns';

const colors: any = {
  red: {
    primary: '#fa896b',
    secondary: '#fdede8',
  },
  blue: {
    primary: '#5d87ff',
    secondary: '#ecf2ff',
  },
  yellow: {
    primary: '#ffae1f',
    secondary: '#fef5e5',
  },
};

@Component({
  selector: 'app-calendar-dialog',
  templateUrl: './dialog.component.html',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatNativeDateModule,
    MatDialogModule,
    MatDatepickerModule, TablerIconsModule
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarDialogComponent {
  options!: UntypedFormGroup;

  constructor(
    public dialogRef: MatDialogRef<CalendarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }
}

@Component({
  selector: 'app-fullcalendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fullcalendar.component.html',
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    NgSwitch,
    CalendarModule,
    CommonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
  ],
  providers: [provideNativeDateAdapter(), CalendarDateFormatter]
})
export class AppFullcalendarComponent {
  dialogRef = signal<MatDialogRef<CalendarDialogComponent> | any>(null);
  dialogRef2 = signal<MatDialogRef<CalendarFormDialogComponent> | any>(null);
  lastCloseResult = signal<string>('');
  actionsAlignment = signal<string>('');
  view = signal<any>('month');
  viewDate = signal<Date>(new Date());
  activeDayIsOpen = signal<boolean>(true);

  config: MatDialogConfig = {
    disableClose: false,
    width: '',
    height: '',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
    data: {
      action: '',
      event: [],
    },
  };
  numTemplateOpens = 0;

  actions: CalendarEventAction[] = [
    {
      label: '<span class="text-white link m-l-5">: Edit</span>',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.handleEvent('Edit', event);
      },
    },
    {
      label: '<span class="text-danger m-l-5">Delete</span>',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.events.set(
          this.events().filter((iEvent: CalendarEvent<any>) => iEvent !== event)
        );
        this.handleEvent('Deleted', event);
      },
    },
  ];

  refresh: Subject<any> = new Subject();

  events = signal<CalendarEvent[] | any>([
    {
      start: subDays(startOfDay(new Date()), 1),
      end: addDays(new Date(), 1),
      title: 'A 3 day event',
      color: colors.red,
      actions: this.actions,
    },
    {
      start: startOfDay(new Date()),
      title: 'An event with no end date',
      color: colors.blue,
      actions: this.actions,
    },
    {
      start: subDays(endOfMonth(new Date()), 3),
      end: addDays(endOfMonth(new Date()), 3),
      title: 'A long event that spans 2 months',
      color: colors.blue,
    },
    {
      start: addHours(startOfDay(new Date()), 2),
      end: new Date(),
      title: 'A draggable and resizable event',
      color: colors.yellow,
      actions: this.actions,
      resizable: {
        beforeStart: true,
        afterEnd: true,
      },
      draggable: true,
    },
  ]);

  constructor(public dialog: MatDialog, @Inject(DOCUMENT) doc: any, private activitySvc: RecruiterService) { }

  private colorByType: Record<string, any> = {
    CallScheduled: { primary: '#5d87ff', secondary: '#ecf2ff' }, // azul
    ContractSent: { primary: '#ffae1f', secondary: '#fef5e5' }, // amarillo
    ContractSigned: { primary: '#28a745', secondary: '#e8f7ee' }, // verde
    StageChange: { primary: '#8e44ad', secondary: '#f3e6f9' }, // púrpura
    DocRequest: { primary: '#fa896b', secondary: '#fdede8' }, // rojo suave
    CallOutcome: { primary: '#00bcd4', secondary: '#e0f7fa' }, // cyan
    Note: { primary: '#607d8b', secondary: '#eceff1' }, // gris
  };

  ngOnInit() {
    this.loadCalendarEvents();
  }

  private loadCalendarEvents() {
    this.activitySvc.list().subscribe(acts => {
      const evs = this.mapActivitiesToEvents(acts);
      this.events.set(evs);
      this.refresh.next(true);
    });
  }

  private mapActivitiesToEvents(acts: ApplicantActivity[]): CalendarEvent[] {
    return acts.map(a => {
      const color = this.colorByType[a.activity] ?? this.colorByType['Note'];
      const title = this.buildTitle(a);
      const start = this.resolveStartDate(a);
      const end = this.resolveEndDate(a, start);

      return {
        start,
        end,
        title,
        color,
        actions: this.actions,
        meta: a,              // por si luego quieres abrir detalle
        draggable: false,     // pon true si quieres mover
        resizable: { beforeStart: false, afterEnd: false }
      } as CalendarEvent;
    });
  }

  // Título amigable
  private buildTitle(a: ApplicantActivity): string {
    const when = this.formatForTitle(a);
   
    switch (a.activity) {
      case 'CallScheduled': return `📞 Call scheduled — ${when} to ${a.applicantName} of ${a.warehouseName}`;
      case 'CallOutcome': return `📋 Call outcome —  ${a.applicantName} of ${a.warehouseName} - ${a.message || 'No details'}`;
      case 'DocRequest': return `📄 Docs requested —  ${a.applicantName} of ${a.warehouseName} - ${a.message || ''}`;
      case 'StageChange': return `🔁 Stage changed —  ${a.applicantName} of ${a.warehouseName} - ${a.message || ''}`;
      case 'ContractSent': return `✉️ Contract sent to ${a.applicantName} of ${a.warehouseName}`;
      case 'ContractSigned': return `✅ Contract signed for ${a.applicantName} of ${a.warehouseName}`;
      case 'Note':
      default: return `📝 ${a.applicantName} of ${a.warehouseName} - ${a.message || 'Note'}`;
    }
  }

  // Fecha inicio del evento
  private resolveStartDate(a: ApplicantActivity): Date {
    // Si tiene activityDate -> úsala (programado con hora)
    if (a.activityDate) {
      // Viene con offset: new Date() la convierte a tu local correctamente
      return new Date(a.activityDate);
    }
    // Si no, usa createAt (DateOnly) a las 09:00 (o a startOfDay)
    const d = new Date(a.createAt + 'T09:00:00'); // ajusta la hora que quieras
    return d;
  }

  // Fecha fin (para “all day” pon startOfDay..endOfDay; aquí 1 hora)
  private resolveEndDate(a: ApplicantActivity, start: Date): Date {
    if (a.activityDate) {
      // evento con hora → 1 hora de duración por defecto
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      return end;
    }
    // evento “pasado/log”: 1 hora por defecto
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return end;
  }

  // Formato corto para título
  private formatForTitle(a: ApplicantActivity): string {
    const d = a.activityDate ? new Date(a.activityDate) : new Date(a.createAt + 'T00:00:00');
    // Ej: "Nov 20, 08:00 AM"
    return format(d, a.activityDate ? 'MMM d, hh:mm a' : 'MMM d');
  }
  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate())) {
      if (
        (isSameDay(this.viewDate(), date) && this.activeDayIsOpen() === true) ||
        events.length === 0
      ) {
        this.activeDayIsOpen.set(false);
      } else {
        this.activeDayIsOpen.set(true);
        this.viewDate.set(date);
      }
    }
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    this.events.set(
      this.events().map((iEvent: CalendarEvent<any>) => {
        if (iEvent === event) {
          return {
            ...event,
            start: newStart,
            end: newEnd,
          };
        }
        return iEvent;
      })
    );

    this.handleEvent('Dropped or resized', event);
  }

  handleEvent(action: string, event: CalendarEvent): void {
    this.config.data = { event, action };
    this.dialogRef.set(this.dialog.open(CalendarDialogComponent, this.config));

    this.dialogRef()
      .afterClosed()
      .subscribe((result: string) => {
        this.lastCloseResult.set(result);
        this.dialogRef.set(null);
        this.refresh.next(result);
      });
  }

  addEvent(): void {
    this.dialogRef2.set(
      this.dialog.open(CalendarFormDialogComponent, {
        panelClass: 'calendar-form-dialog',
        autoFocus: false,
        data: {
          action: 'add',
          date: new Date(),
        },
      })
    );
    this.dialogRef2()
      .afterClosed()
      .subscribe((res: { action: any; event: any }) => {
        if (!res) {
          return;
        }
        const dialogAction = res.action;
        const responseEvent = res.event;
        responseEvent.actions = this.actions;
        this.events.set([...this.events(), responseEvent]);
        this.dialogRef2.set(null);
        this.refresh.next(res);
      });
  }

  deleteEvent(eventToDelete: CalendarEvent): void {
    this.events.set(
      this.events().filter(
        (event: CalendarEvent<any>) => event !== eventToDelete
      )
    );
  }

  setView(view: CalendarView | any): void {
    this.view.set(view);
  }

  goToPreviousMonth(): void {
    this.viewDate.set(subMonths(this.viewDate(), 1));
  }

  goToNextMonth(): void {
    this.viewDate.set(addMonths(this.viewDate(), 1));
  }

  goToToday() {
    this.viewDate.set(new Date());
  }
}
