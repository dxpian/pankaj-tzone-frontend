import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BigScreenMonitoringSettingsComponent } from './big-screen-monitoring-settings.component';

describe('BigScreenMonitoringSettingsComponent', () => {
  let component: BigScreenMonitoringSettingsComponent;
  let fixture: ComponentFixture<BigScreenMonitoringSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BigScreenMonitoringSettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BigScreenMonitoringSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
