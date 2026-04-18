import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecurityAndPrivacySettingsComponent } from './security-and-privacy-settings.component';

describe('SecurityAndPrivacySettingsComponent', () => {
  let component: SecurityAndPrivacySettingsComponent;
  let fixture: ComponentFixture<SecurityAndPrivacySettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SecurityAndPrivacySettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecurityAndPrivacySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
