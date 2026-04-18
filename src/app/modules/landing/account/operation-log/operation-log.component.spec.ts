import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationLogComponent } from './operation-log.component';

describe('OperationLogComponent', () => {
  let component: OperationLogComponent;
  let fixture: ComponentFixture<OperationLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationLogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
