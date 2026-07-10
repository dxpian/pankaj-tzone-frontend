import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportingViewComponent } from './reporting-view.component';

describe('ReportingViewComponent', () => {
  let component: ReportingViewComponent;
  let fixture: ComponentFixture<ReportingViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportingViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
