import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlfresaShiftScheduleComponent } from './alfresa.shift-schedule.component';

describe('AlfresaShiftScheduleComponent', () => {
    let component: AlfresaShiftScheduleComponent;
    let fixture: ComponentFixture<AlfresaShiftScheduleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AlfresaShiftScheduleComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AlfresaShiftScheduleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
