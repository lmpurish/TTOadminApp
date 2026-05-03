import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RentalVehicleComponent } from './rental-vehicle.component';

describe('RentalVehicleComponent', () => {
  let component: RentalVehicleComponent;
  let fixture: ComponentFixture<RentalVehicleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RentalVehicleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RentalVehicleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
