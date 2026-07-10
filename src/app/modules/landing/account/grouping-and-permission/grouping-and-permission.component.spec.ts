import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupingAndPermissionComponent } from './grouping-and-permission.component';

describe('GroupingAndPermissionComponent', () => {
  let component: GroupingAndPermissionComponent;
  let fixture: ComponentFixture<GroupingAndPermissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupingAndPermissionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupingAndPermissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
