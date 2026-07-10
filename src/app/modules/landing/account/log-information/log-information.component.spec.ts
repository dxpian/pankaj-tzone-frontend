import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogInformationComponent } from './log-information.component';

describe('LogInformationComponent', () => {
  let component: LogInformationComponent;
  let fixture: ComponentFixture<LogInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LogInformationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
