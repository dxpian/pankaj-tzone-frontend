import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlarmMessageComponent } from './alarm-message.component';

describe('AlarmMessageComponent', () => {
  let component: AlarmMessageComponent;
  let fixture: ComponentFixture<AlarmMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlarmMessageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlarmMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
