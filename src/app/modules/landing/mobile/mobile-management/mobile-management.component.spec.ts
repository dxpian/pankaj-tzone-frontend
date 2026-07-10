import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileManagementComponent } from './mobile-management.component';

describe('MobileManagementComponent', () => {
  let component: MobileManagementComponent;
  let fixture: ComponentFixture<MobileManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobileManagementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
