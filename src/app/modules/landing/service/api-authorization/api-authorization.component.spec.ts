import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiAuthorizationComponent } from './api-authorization.component';

describe('ApiAuthorizationComponent', () => {
  let component: ApiAuthorizationComponent;
  let fixture: ComponentFixture<ApiAuthorizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApiAuthorizationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApiAuthorizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
