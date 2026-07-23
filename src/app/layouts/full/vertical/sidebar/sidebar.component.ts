
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { BrandingComponent } from './branding.component';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { navItems } from 'src/app/layouts/full/vertical/sidebar/sidebar-data';
import { CoreService } from 'src/app/services/core.service';
import { NavItem } from 'src/app/layouts/full/vertical/sidebar/nav-item/nav-item';
import { CommonModule } from '@angular/common';


@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule,BrandingComponent, TablerIconsModule, MaterialModule],
    templateUrl: './sidebar.component.html',
    styleUrls:['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  navItems: NavItem[] = [];

  constructor(private core: CoreService) { }

  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  ngOnInit(): void {
    
  }
}
