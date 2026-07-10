import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClusterAreaComponent } from './cluster-area.component';

describe('ClusterAreaComponent', () => {
  let component: ClusterAreaComponent;
  let fixture: ComponentFixture<ClusterAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClusterAreaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClusterAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
