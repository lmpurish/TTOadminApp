import { Component, OnDestroy, OnInit } from '@angular/core';
import { MaterialModule } from '../../../material.module';
import { catchError, finalize, interval, Observable, of, shareReplay, Subscription } from 'rxjs';
import { DriverPunchService, ManagerPunchRowDto } from 'src/app/services/driver-punch.service';
import { CoreService } from 'src/app/services/core.service';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-driver-punches',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './punches-summary.component.html',
  styleUrls: ['./punches-summary.component.scss']
})
export class AppPunchesSummary implements OnInit, OnDestroy {
  loading = false;
  loadingSummary = false;
  showSummary = false;
  summary: any | null = null;
  summaryError: string | null = null;
  forcingPunchOut = false;
  // 🔁 Conéctalo a tu selector real si ya existe
  warehouseId = 0;

  managers: ManagerPunchRowDto[] = [];

  private tickSub?: Subscription;
  now = Date.now();

  constructor(private punchService: DriverPunchService, private settings: CoreService,
    private cdr: ChangeDetectorRef, private zone: NgZone, private http: HttpClient, private snack: MatSnackBar,
    private punchesServices: DriverPunchService) { }

  ngOnInit(): void {
    this.loadManagers();

    // refresca contadores cada segundo
    this.tickSub = interval(1000).subscribe(() => {
      // ✅ garantiza que Angular se entere del cambio
      this.zone.run(() => {
        this.now = Date.now();
        this.cdr.markForCheck();
      });
    });
  }
  get isAdmin(): boolean {
    return this.settings.getRole() == 'Admin'; // ajusta a tu app
  }

  hasActiveManagers(): boolean {
    return Array.isArray(this.sortedManagers) && this.sortedManagers.some(m => this.isActive(m));
  }

  toggleSummary(): void {
    const wid = this.warehouseId; // o el que sea


    this.showSummary = !this.showSummary;
    if (this.showSummary) this.loadSummary();
  }

  loadSummary(): void {

    this.loadingSummary = true;
    this.summaryError = null;

    this.punchService.getManagersSummary()
      .pipe(finalize(() => this.loadingSummary = false))
      .subscribe({
        next: (res) => {
          this.summaryError = null;
          this.summary = res;
        },
        error: (err) => {
          console.error(err);
          this.summary = null;
          this.summaryError = err?.error?.message || 'Failed to load summary.';
        }
      });
  }

  formatSeconds(total: number): string {
    const sec = Math.max(0, total || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.tickSub?.unsubscribe();
  }

  loadManagers(): void {
    this.loading = true;

    this.punchService.getManagersToday(this.warehouseId).subscribe({
      next: (res) => {
        this.managers = (res ?? []).map(m => ({
          ...m,
          arrivalAtUtc: m.arrivalAtUtc ? new Date(m.arrivalAtUtc).toISOString() : null,
          departureAtUtc: m.departureAtUtc ? new Date(m.departureAtUtc).toISOString() : null,
        }));


        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  avatarUrl: string;

  private avatarCache = new Map<string, Observable<string>>();
  private fallback = '/assets/images/profile/user-1.jpg';
  avatarSrc$(row: any): Observable<string> {
    const file = row?.avatarUrl?.trim();
    if (!file) return of(this.fallback);

    if (!this.avatarCache.has(file)) {
      const obs$ = this.settings.getAvatar(file).pipe(
        // si tu getAvatar devuelve Blob, convierte aquí:
        // map(blob => URL.createObjectURL(blob)),
        // Maneja errores: no almacenes un observable fallido
        catchError(err => {
          // elimina del cache para permitir reintento futuro
          this.avatarCache.delete(file);
          return of(this.fallback);
        }),
        shareReplay(1)
      );
      this.avatarCache.set(file, obs$);
    }
    return this.avatarCache.get(file)!;
  }
  // ---------------- UI helpers ----------------

  get sortedManagers(): ManagerPunchRowDto[] {
    return [...this.managers].sort((a, b) => {
      const aActive = this.isActive(a) ? 1 : 0;
      const bActive = this.isActive(b) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      const aNoPunch = !a.arrivalAtUtc ? 1 : 0;
      const bNoPunch = !b.arrivalAtUtc ? 1 : 0;
      if (aNoPunch !== bNoPunch) return aNoPunch - bNoPunch;

      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }

  isActive(m: ManagerPunchRowDto): boolean {
    return !!m.arrivalAtUtc && !m.departureAtUtc;
  }

  isPunchedOut(m: ManagerPunchRowDto): boolean {
    return !!m.departureAtUtc;
  }

  hasNoPunch(m: ManagerPunchRowDto): boolean {
    return !m.arrivalAtUtc;
  }

  private parseAsLocal(value: string): number {
    // Si viene con Z, lo tratamos como hora local eliminando la Z
    // Ej: '2026-01-23T08:41:52.015Z' -> '2026-01-23T08:41:52.015'
    const v = value.endsWith('Z') ? value.slice(0, -1) : value;
    return new Date(v).getTime();
  }

  getElapsedText(m: ManagerPunchRowDto): string {
    if (!m.arrivalAtUtc) return '--:--:--';

    const startMs = Date.parse(m.arrivalAtUtc);
    const endMs = m.departureAtUtc ? Date.parse(m.departureAtUtc) : this.now;

    const diffSec = Math.floor((endMs - startMs) / 1000);

    if (this.isActive(m)) {
      //  console.log('TIMER', m.name, { arrivalAtUtc: m.arrivalAtUtc, now: new Date(this.now).toISOString(), diffSec });
    }

    if (startMs > endMs) return '00:00:00';
    return this.msToHhMmSs(endMs - startMs);
  }
  private msToHhMmSs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  hasCoords(m: any): boolean {
    const lat = m.arrivalLat ?? m.departureLat;
    const lng = m.arrivalLng ?? m.departureLng;
    return typeof lat === 'number' && typeof lng === 'number';
  }

  openMaps(m: any): void {
    const lat = m.arrivalLat ?? m.departureLat;
    const lng = m.arrivalLng ?? m.departureLng;

    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  onWarehouseChanged(id: number) {
    this.warehouseId = id;
    if (this.showSummary) this.loadSummary();
  }
  async forcePunchOut() {
    try {
      this.forcingPunchOut = true;

      // Puedes ajustar reglas aquí
      const body = {
        warehouseId: this.warehouseId ?? 0,     // si tienes filtro
        cutoffLocalTime: '20:00',
        maxShiftHours: 12,
        notes: 'Auto punchout after hours (Admin)'
      };

      const res: any = await this.punchService.forcePunchOutOutsideHours(body).toPromise();

      // refresca lista y summary
      await this.loadManagers();
      if (this.showSummary) await this.loadSummary();

      this.snack.open(`Closed: ${res?.closedCount ?? 0} • Skipped: ${res?.skippedCount ?? 0}`, 'OK', { duration: 3500 });
    } catch (e: any) {
      this.snack.open(e?.error?.message ?? 'Error forcing punchout', 'OK', { duration: 3500 });
    } finally {
      this.forcingPunchOut = false;
    }
  }
  async forcePunchOutOne(m: any) {
    try {
      this.forcingPunchOut = true;

      const body = {
        warehouseId: m.warehouseId ?? this.warehouseId ?? 0,
        targetUserIds: [m.managerId],
        // puedes poner reglas suaves para que siempre cierre si está activo:
        maxShiftHours: 0,              // fuerza por horas (0 => siempre “over”)
        cutoffLocalTime: '00:00',      // fuerza por cutoff
        notes: `Manual punchout by Admin for ${m.name}`
      };

      const res: any = await this.punchService.forcePunchOutOutsideHours(body).toPromise();

      await this.loadManagers();
      if (this.showSummary) await this.loadSummary();

      this.snack.open(`Punch out done: ${res?.closedCount ?? 0}`, 'OK', { duration: 3000 });
    } catch (e: any) {
      this.snack.open(e?.error?.message ?? 'Error punching out', 'OK', { duration: 3500 });
    } finally {
      this.forcingPunchOut = false;
    }
  }


}

export interface ManagerPunchSummaryDto {
  warehouseId: number;
  dateUtc: string;        // viene como ISO
  totalManagers: number;
  active: number;
  punchedOut: number;
  noPunch: number;
  totalSeconds: number;
}