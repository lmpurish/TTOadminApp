import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessangeContactComponent } from './messange-contact.component';

describe('MessangeContactComponent', () => {
  let component: MessangeContactComponent;
  let fixture: ComponentFixture<MessangeContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessangeContactComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessangeContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
