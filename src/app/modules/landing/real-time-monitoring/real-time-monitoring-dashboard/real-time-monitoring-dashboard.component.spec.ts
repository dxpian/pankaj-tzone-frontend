import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RealTimeMonitoringDashboardComponent } from './real-time-monitoring-dashboard.component';

describe('RealTimeMonitoringDashboardComponent', () => {
  let component: RealTimeMonitoringDashboardComponent;
  let fixture: ComponentFixture<RealTimeMonitoringDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RealTimeMonitoringDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RealTimeMonitoringDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
