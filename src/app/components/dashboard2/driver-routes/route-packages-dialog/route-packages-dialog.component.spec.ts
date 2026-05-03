import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoutePackagesDialogComponent } from './route-packages-dialog.component';

describe('RoutePackagesDialogComponent', () => {
  let component: RoutePackagesDialogComponent;
  let fixture: ComponentFixture<RoutePackagesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoutePackagesDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoutePackagesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
