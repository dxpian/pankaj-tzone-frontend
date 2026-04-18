import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlfresaCenterComponent } from './alfresa.center.component';

describe('AlfresaCenterComponent', () => {
  let component: AlfresaCenterComponent;
  let fixture: ComponentFixture<AlfresaCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlfresaCenterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlfresaCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
