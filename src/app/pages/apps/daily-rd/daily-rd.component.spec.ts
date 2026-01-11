import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyRDComponent } from './daily-rd.component';

describe('DailyRDComponent', () => {
  let component: DailyRDComponent;
  let fixture: ComponentFixture<DailyRDComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyRDComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyRDComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
