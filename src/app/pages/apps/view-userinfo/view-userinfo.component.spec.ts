import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewUserinfoComponent } from './view-userinfo.component';

describe('ViewUserinfoComponent', () => {
  let component: ViewUserinfoComponent;
  let fixture: ComponentFixture<ViewUserinfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewUserinfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewUserinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
