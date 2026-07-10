import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlfresaAlarmComponent } from './alfresa.alarm.component';

describe('AlfresaAlarmComponent', () => {
  let component: AlfresaAlarmComponent;
  let fixture: ComponentFixture<AlfresaAlarmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlfresaAlarmComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlfresaAlarmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
