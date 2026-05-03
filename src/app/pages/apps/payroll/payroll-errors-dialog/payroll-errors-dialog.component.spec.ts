import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrollErrorsDialogComponent } from './payroll-errors-dialog.component';

describe('PayrollErrorsDialogComponent', () => {
  let component: PayrollErrorsDialogComponent;
  let fixture: ComponentFixture<PayrollErrorsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollErrorsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayrollErrorsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
