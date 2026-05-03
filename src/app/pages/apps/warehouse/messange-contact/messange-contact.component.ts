import {
  Component,
  Inject,
  Optional,
  ViewChild,
  AfterViewInit,
  OnInit,
} from '@angular/core';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WarehouseService } from 'src/app/services/apps/warehouse/warehouse.service';
import { CoreService } from 'src/app/services/core.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface MessangeContact {
  id: number;
  subject: string;
  messageBody: string;
  warehouseId: number;
  isDefault: boolean;
}

@Component({
  selector: 'app-messange-contact',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    QuillModule,
  ],
  templateUrl: './messange-contact.component.html',
  styleUrl: './messange-contact.component.scss',
})
export class MessangeContactComponent implements OnInit, AfterViewInit {
  @ViewChild(MatTable, { static: true }) table: MatTable<any> | null = null;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  searchText = '';
  displayedColumns: string[] = ['subject', 'messageBody', 'warehouseId', 'action'];
  dataSource = new MatTableDataSource<any>();
  warehousesMap: Map<number, string> = new Map();
  warehouses: any[] = [];
  id: any;

  constructor(
    public dialog: MatDialog,
    private warehouseService: WarehouseService,
    private settings: CoreService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.loadWarehouses();

    if (this.id !== null && this.id !== undefined && this.id.toString().trim() !== '') {
      this.loadMassageContact(this.id);
    }

    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const warehouseName = this.getWarehouseName(data.warehouseId).toLowerCase();
      const subject = (data.subject || '').toLowerCase();
      const messageBody = (data.messageBody || '').toLowerCase();

      return (
        subject.includes(filter) ||
        messageBody.includes(filter) ||
        warehouseName.includes(filter)
      );
    };
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        if (Array.isArray(res) && res.length) {
          this.warehouses = res;
          this.warehousesMap = new Map(
            res.map((warehouse) => [warehouse.id, warehouse.city])
          );
        }
      },
      error: (err) => console.error('Error fetching warehouses:', err),
    });
  }

  loadMassageContact(id: number): void {
    this.warehouseService.getMessageContact(id).subscribe({
      next: (res) => {
        this.dataSource.data = res || [];
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
      },
      error: (err) => {
        this.settings.showError(err?.error?.message || 'Error loading message templates');
      },
    });
  }

  getWarehouseName(id: number): string {
    return this.warehousesMap.get(id) || 'Unknown';
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = (filterValue || '').trim().toLowerCase();
  }

  openDialog(action: string, message: MessangeContact | any): void {
    const dialogRef = this.dialog.open(AppMessageDialogContentComponent, {
      data: {
        action,
        local_data: { ...message },
        warehouseId: this.id,
      },
      autoFocus: false,
      width: '85vw',
      maxWidth: '100vw',
      maxHeight: '92vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (['Refresh', 'Update', 'Delete'].includes(result?.event)) {
        this.loadMassageContact(this.id);
      }
    });
  }

  addNew(): void {
    this.openDialog('Add', {
      id: 0,
      subject: '',
      messageBody: '',
      warehouseId: Number(this.id),
      isDefault: false,
    });
  }
}

@Component({
  selector: 'app-message-dialog-content',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    QuillModule,
  ],
  templateUrl: 'messange-dialog-content.html',
})
export class AppMessageDialogContentComponent implements OnInit {
  action: string;
  local_data: MessangeContact;
  warehouses: any[] = [];
  id: any | null = null;

  previewHtml: SafeHtml = '';
  editorMode: 'html' | 'visual' = 'html';

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: 1 }, { header: 2 }, { header: 3 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      [{ color: [] }, { background: [] }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  constructor(
    public dialogRef: MatDialogRef<AppMessageDialogContentComponent>,
    private warehouseService: WarehouseService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data.action;
    this.local_data = data.local_data || {
      id: 0,
      subject: '',
      messageBody: '',
      warehouseId: 0,
      isDefault: false,
    };
    this.id = data?.warehouseId;
  }

  ngOnInit(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (res) => {
        this.warehouses = Array.isArray(res) ? res : [];

        const receivedWarehouseId = Number(this.id);
        if (this.action === 'Add' && !this.local_data.warehouseId && receivedWarehouseId) {
          this.local_data.warehouseId = receivedWarehouseId;
        }

        this.updatePreview();
      },
      error: () => {
        this.warehouses = [];
        this.updatePreview();
      },
    });
  }

  setMode(mode: 'html' | 'visual'): void {
    this.editorMode = mode;
  }

  onHtmlChange(): void {
    this.updatePreview();
  }

  onVisualChange(): void {
    this.updatePreview();
  }

  onPasteHtml(event: ClipboardEvent): void {
    const pastedHtml = event.clipboardData?.getData('text/html');
    const pastedText = event.clipboardData?.getData('text/plain');

    if (pastedHtml && pastedHtml.trim()) {
      event.preventDefault();
      this.local_data.messageBody = pastedHtml;
      this.updatePreview();
      this.openSnackBar('HTML pasted successfully.', 'Close');
      return;
    }

    if (pastedText && pastedText.trim().startsWith('<')) {
      event.preventDefault();
      this.local_data.messageBody = pastedText;
      this.updatePreview();
      this.openSnackBar('HTML pasted successfully.', 'Close');
    }
  }

  loadRecruitingTemplate(): void {
    this.local_data.subject = 'TTO Logistics is Hiring Delivery Drivers';
    this.local_data.messageBody = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e9e9e9; padding:20px 0;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#ffffff; font-family:Arial, Helvetica, sans-serif; border-radius:10px; overflow:hidden;">
        <tr>
          <td align="center" style="padding:0; margin:0; line-height:0;">
            <a href="https://ttologistics.com/hiring" style="text-decoration:none;">
              <img src="https://i.imgur.com/rLnvcg1.png" alt="TTO Logistics Hiring Delivery Drivers" width="600" border="0" style="display:block; width:100%; max-width:600px; height:auto; border:0;">
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:28px 30px 18px 30px; color:#111111; text-align:center;">
            <h2 style="margin:0 0 18px 0; font-size:28px; line-height:34px; font-weight:700; color:#111111;">
              TTO Logistics is Hiring Delivery Drivers
            </h2>
            <p style="margin:0 0 16px 0; font-size:18px; line-height:28px; color:#111111;">
              Earn <strong>$1,000-$1,500+ per week</strong><br>
              Use your own vehicle - start immediately
            </p>
            <p style="margin:0 0 18px 0; font-size:17px; line-height:28px; color:#111111;">
              No experience needed - simple routes provided<br>
              Weekly pay<br>
              Flexible schedule
            </p>
            <p style="margin:0 0 18px 0; font-size:17px; line-height:28px; color:#d32f2f; font-weight:700;">
              We are onboarding drivers this week due to increased delivery volume<br>
              Most drivers start within 24-48 hours
            </p>
            <p style="margin:0 0 22px 0; font-size:18px; line-height:24px; color:#111111; font-weight:700;">
              Apply in under 2 minutes
            </p>
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px auto;">
              <tr>
                <td align="center" valign="middle" bgcolor="#39ff14" style="border-radius:8px;">
                  <a href="https://ttologistics.com/hiring" style="display:inline-block; padding:16px 30px; font-size:18px; line-height:22px; font-weight:700; color:#000000; text-decoration:none; font-family:Arial, Helvetica, sans-serif;">
                    APPLY NOW
                  </a>
                </td>
                <td width="14" style="width:14px; font-size:0; line-height:0;">&nbsp;</td>
                <td align="center" valign="middle" bgcolor="#111111" style="border-radius:8px; border:1px solid #39ff14;">
                  <a href="tel:+14076410022" style="display:inline-block; padding:16px 30px; font-size:18px; line-height:22px; font-weight:700; color:#39ff14; text-decoration:none; font-family:Arial, Helvetica, sans-serif;">
                    CALL NOW
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px 0; font-size:18px; line-height:24px; color:#111111; font-weight:700;">
              (407) 641-0022
            </p>
            <p style="margin:0; font-size:12px; line-height:18px; color:#777777;">
              You are receiving this because you previously showed interest in delivery opportunities with us.
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>`;
    this.updatePreview();
  }

  updatePreview(): void {
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(
      this.local_data.messageBody || ''
    );
  }

  doAction(): void {
    if (!this.local_data.subject?.trim()) {
      this.openSnackBar('Subject is required.', 'Close');
      return;
    }

    if (!this.local_data.messageBody?.trim()) {
      this.openSnackBar('Message body is required.', 'Close');
      return;
    }

    if (this.action === 'Add') {
      this.warehouseService.AddMessageContact(this.local_data).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Refresh' });
          this.openSnackBar('Message added successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
        },
      });
    } else if (this.action === 'Update') {
      this.warehouseService.updateMessageContact(this.local_data).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Update' });
          this.openSnackBar('Message updated successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
        },
      });
    } else if (this.action === 'Delete') {
      this.warehouseService.deleteMessageContact(this.local_data.id).subscribe({
        next: () => {
          this.dialogRef.close({ event: 'Delete' });
          this.openSnackBar('Message deleted successfully!', 'Close');
        },
        error: (err) => {
          this.openSnackBar(`Error: ${err?.error?.message || err.message}`, 'Close');
        },
      });
    }
  }

  openSnackBar(message: string, action: string): void {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }
}