import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyLoanComponent } from './my-loan.component';

describe('MyLoanComponent', () => {
  let component: MyLoanComponent;
  let fixture: ComponentFixture<MyLoanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyLoanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyLoanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
