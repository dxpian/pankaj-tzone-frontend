import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlarmListingComponent } from './alarm-listing.component';

describe('AlarmListingComponent', () => {
  let component: AlarmListingComponent;
  let fixture: ComponentFixture<AlarmListingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlarmListingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlarmListingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
