import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageClusterComponent } from './manage-cluster.component';

describe('ManageClusterComponent', () => {
  let component: ManageClusterComponent;
  let fixture: ComponentFixture<ManageClusterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageClusterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageClusterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
