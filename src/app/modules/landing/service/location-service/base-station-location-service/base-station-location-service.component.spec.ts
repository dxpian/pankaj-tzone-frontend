import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseStationLocationServiceComponent } from './base-station-location-service.component';

describe('BaseStationLocationServiceComponent', () => {
  let component: BaseStationLocationServiceComponent;
  let fixture: ComponentFixture<BaseStationLocationServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseStationLocationServiceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseStationLocationServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
