import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignatureCalibratorComponent } from './signature-calibrator.component';

describe('SignatureCalibratorComponent', () => {
  let component: SignatureCalibratorComponent;
  let fixture: ComponentFixture<SignatureCalibratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignatureCalibratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignatureCalibratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
