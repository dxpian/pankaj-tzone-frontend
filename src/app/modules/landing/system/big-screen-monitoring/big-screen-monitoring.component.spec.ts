import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BigScreenMonitoringComponent } from './big-screen-monitoring.component';

describe('BigScreenMonitoringComponent', () => {
  let component: BigScreenMonitoringComponent;
  let fixture: ComponentFixture<BigScreenMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BigScreenMonitoringComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BigScreenMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
