import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileAdminManagementComponent } from './mobile-admin-management.component';

describe('MobileAdminManagementComponent', () => {
  let component: MobileAdminManagementComponent;
  let fixture: ComponentFixture<MobileAdminManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobileAdminManagementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileAdminManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
