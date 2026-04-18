import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExceptionInformationComponent } from './exception-information.component';

describe('ExceptionInformationComponent', () => {
  let component: ExceptionInformationComponent;
  let fixture: ComponentFixture<ExceptionInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExceptionInformationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExceptionInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
