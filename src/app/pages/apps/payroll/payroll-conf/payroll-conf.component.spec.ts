import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrollConfComponent } from './payroll-conf.component';

describe('PayrollConfComponent', () => {
  let component: PayrollConfComponent;
  let fixture: ComponentFixture<PayrollConfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollConfComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayrollConfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
