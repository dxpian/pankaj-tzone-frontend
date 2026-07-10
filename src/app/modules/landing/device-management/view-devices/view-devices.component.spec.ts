import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewDevicesComponent } from './view-devices.component';

describe('ViewDevicesComponent', () => {
  let component: ViewDevicesComponent;
  let fixture: ComponentFixture<ViewDevicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewDevicesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewDevicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
