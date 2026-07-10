import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlarmDataComponent } from './alarm-data.component';

describe('AlarmDataComponent', () => {
  let component: AlarmDataComponent;
  let fixture: ComponentFixture<AlarmDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlarmDataComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlarmDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
