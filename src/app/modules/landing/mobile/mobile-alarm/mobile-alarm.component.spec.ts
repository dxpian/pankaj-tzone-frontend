import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileAlarmComponent } from './mobile-alarm.component';

describe('MobileAlarmComponent', () => {
  let component: MobileAlarmComponent;
  let fixture: ComponentFixture<MobileAlarmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobileAlarmComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileAlarmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
