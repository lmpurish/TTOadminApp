import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrollDriversComponent } from './payroll-drivers.component';

describe('PayrollDriversComponent', () => {
  let component: PayrollDriversComponent;
  let fixture: ComponentFixture<PayrollDriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollDriversComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayrollDriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
