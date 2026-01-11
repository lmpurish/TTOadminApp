import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-redirect-dialog',
    standalone: true,                                        // ✅ standalone
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    template: `
    <h2 mat-dialog-title class="f-w-700">Your referral code belongs to <strong>{{ companyName || host }}</strong> web site</h2>
    <mat-dialog-content class="f-s-14">
      <p>
        Serás redirigido a <strong>{{ host }}</strong> en
        <strong>{{ seconds }}</strong> segundos.
      </p>
      <p class="m-0">
        Si no ocurre automáticamente, haz clic en:
        <a [href]="url">{{ url }}</a>
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button color="primary" (click)="goNow()">Ir ahora</button>
      <button mat-button (click)="cancel()">Cancelar</button>
    </mat-dialog-actions>
  `
})
export class RedirectDialogComponent {
    seconds = 5;
    url = '';
    host = '';
    private timerId: any;
    companyName = '';

    constructor(
        private ref: MatDialogRef<RedirectDialogComponent>,      // ✅ MatDialogRef
        @Inject(MAT_DIALOG_DATA) public data: { url: string; seconds?: number; companyName?: string }
    ) { }

    ngOnInit() {
        this.url = this.normalizeUrl(this.data.url);
        this.host = this.getHost(this.url);
        this.seconds = this.data.seconds ?? 5;
        this.companyName = (this.data.companyName || '').trim();
        this.timerId = setInterval(() => {
            this.seconds--;
            if (this.seconds <= 0) this.goNow();
        }, 1000);
    }
    ngOnDestroy() { if (this.timerId) clearInterval(this.timerId); }

    goNow() {
        if (this.timerId) clearInterval(this.timerId);
        window.location.href = this.url;
        this.ref.close(true);
    }
    cancel() {
        if (this.timerId) clearInterval(this.timerId);
        this.ref.close(false);
    }

    private normalizeUrl(u: string) { return /^https?:\/\//i.test(u) ? u : `https://${u}`; }
    private getHost(u: string) { try { return new URL(u).host; } catch { return u; } }
}
