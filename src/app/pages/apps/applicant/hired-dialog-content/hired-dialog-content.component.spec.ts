import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HiredDialogContentComponent } from './hired-dialog-content.component';

describe('HiredDialogContentComponent', () => {
  let component: HiredDialogContentComponent;
  let fixture: ComponentFixture<HiredDialogContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HiredDialogContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HiredDialogContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
