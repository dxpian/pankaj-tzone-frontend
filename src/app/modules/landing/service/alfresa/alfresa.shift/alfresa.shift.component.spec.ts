import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlfresaShiftComponent } from './alfresa.shift.component';

describe('AlfresaShiftComponent', () => {
    let component: AlfresaShiftComponent;
    let fixture: ComponentFixture<AlfresaShiftComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AlfresaShiftComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AlfresaShiftComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
