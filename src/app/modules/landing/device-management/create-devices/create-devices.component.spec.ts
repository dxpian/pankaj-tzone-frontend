import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDevicesComponent } from './create-devices.component';

describe('CreateDevicesComponent', () => {
  let component: CreateDevicesComponent;
  let fixture: ComponentFixture<CreateDevicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateDevicesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateDevicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
