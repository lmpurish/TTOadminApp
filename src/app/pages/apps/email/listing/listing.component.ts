import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MaterialModule } from 'src/app/material.module';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { NgxPaginationModule } from 'ngx-pagination';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MediaMatcher } from '@angular/cdk/layout';
import { NotificationService } from 'src/app/services/notification.service';
import { CoreService } from 'src/app/services/core.service';

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'Warning' | 'Error' | 'Info' | 'Success';
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  url: string;
  source: string;
  user: any | null;
}

@Component({
  selector: 'app-listing',
  templateUrl: 'listing.component.html',
  styleUrls: ['listing.component.scss'],
  standalone: true,
  imports: [
    MaterialModule,
    CommonModule,
    FormsModule,
    NgScrollbarModule,
    TablerIconsModule,
    NgxPaginationModule,
    MatCheckboxModule,
  ],
})
export class ListingComponent implements OnInit, OnDestroy {
  private changeDetectorRef = inject(ChangeDetectorRef);
  private media = inject(MediaMatcher);

  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  sidePanelOpened = signal(true);
  showDetail = signal(false);

  p = signal(1);
  topLabel = signal('Notifications');

  selectedIndex = signal<number | null>(null);
  selectedNotification = signal<AppNotification | null>(null);
  userInfo: any;
  notifications = signal<AppNotification[]>([]);

  constructor(private router: Router, private notification: NotificationService, private core: CoreService,) {
    this.mobileQuery = this.media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => this.changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);

  }

  ngOnInit(): void {
    console.log('ngOnInit ejecutado');

    this.userInfo = this.core.getUserInfoFromToken();

    this.loadNotifications();

    window.addEventListener('resize', this.onResize);
  }
  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.showDetail.set(false);
  };

  isOver(): boolean {
    return window.innerWidth < 1199;
  }

  loadNotifications(): void {
    const id = this.userInfo?.id;

    if (!id) {
      console.error('No user id found in token', this.userInfo);
      return;
    }

    this.notification.getNotifications(id).subscribe({
      next: (res: AppNotification[]) => {


        this.notifications.set(res);

        if (res.length > 0) {
          this.notificationSelected(res[0]);
        }
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
      },
    });
  }



  notificationSelected(item: AppNotification): void {
    this.selectedNotification.set(item);
    this.selectedIndex.set(item.id);

    if (!item.isRead) {
      this.markAsRead(item);
    }

    if (this.isOver()) {
      this.showDetail.set(true);
    }
  }

  markAsRead(item: AppNotification): void {
    const previous = this.notifications();

    const updated = previous.map((current) => {
      if (current.id === item.id) {
        return {
          ...current,
          isRead: true,
          readAt: new Date().toISOString(),
        };
      }

      return current;
    });

    this.notifications.set(updated);

    const selected = updated.find((x) => x.id === item.id);

    if (selected) {
      this.selectedNotification.set(selected);
    }

    this.notification.markRead(item).subscribe({
      next: () => {
        console.log('Notification marked as read:', item.id);
      },
      error: (err) => {
        console.error(err);

        this.notifications.set(previous);
      },
    });
  }

  markAsUnread(id: number): void {
    const updated = this.notifications().map((item) => {
      if (item.id === id) {
        return {
          ...item,
          isRead: false,
          readAt: null,
        };
      }

      return item;
    });

    this.notifications.set(updated);

    const selected = updated.find((x) => x.id === id);
    if (selected) {
      this.selectedNotification.set(selected);
    }
  }

  openNotification(item: AppNotification | null): void {
    if (!item?.url) return;

    this.router.navigateByUrl(item.url);
  }

  deleteNotification(id: number): void {
    const updated = this.notifications().filter((item) => item.id !== id);
    this.notifications.set(updated);

    if (this.selectedIndex() === id) {
      const first = updated[0] ?? null;

      this.selectedNotification.set(first);
      this.selectedIndex.set(first?.id ?? null);
    }

    // Cuando tengas API:
    // this.notificationService.deleteNotification(id).subscribe();
  }

  getUnreadCount(): number {
    return this.notifications().filter((item) => !item.isRead).length;
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'Error':
        return 'bg-error';
      case 'Warning':
        return 'bg-warning';
      case 'Success':
        return 'bg-success';
      case 'Info':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'Error':
        return 'Critical';
      case 'Warning':
        return 'Warning';
      case 'Success':
        return 'Success';
      case 'Info':
        return 'Info';
      default:
        return type;
    }
  }

  backToList(): void {
    this.showDetail.set(false);
  }
}