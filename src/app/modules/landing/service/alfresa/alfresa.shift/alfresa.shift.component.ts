import { AfterViewInit, ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MSG } from 'app/modules/landing/utils/message.def';
import { DB_RESULT, isWebAdminPermission } from 'app/modules/landing/utils/typedef';
import { SharedService } from 'app/services/shared.service';
import { Language } from '../../message-push-service/email/email.component';
import { ALF_SHIFT_TYPE, ALL_ALF_SHIFT_TYPES, AlfresaShiftConfig, getAlfShiftTypeLabel, isAlfShiftNightType } from '../alfresa.type';
import { AlfresaShiftService } from '../service.shift';
const FLEX_TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

interface ShiftTypeOption {
    value: number;
    label: string;
}

@Component({
    selector: 'app-alfresa-shift',
    templateUrl: './alfresa.shift.component.html',
    styleUrls: ['./alfresa.shift.component.scss'],
})
export class AlfresaShiftComponent implements OnInit, AfterViewInit {
    @ViewChild('shiftDialog', { static: true }) shiftDialog!: TemplateRef<unknown>;
    @ViewChild(MatSort) sort!: MatSort;
    shiftForm!: FormGroup;
    private dialogRef: any;
    private editState = false;
    private shiftSelected?: AlfresaShiftConfig;
    private lng = Language.ENG;

    shifts: AlfresaShiftConfig[] = [];
    dataSource = new MatTableDataSource<AlfresaShiftConfig>();
    displayedColumns: string[] = [
        'id',
        'shift_type',
        'name',
        'start_time',
        'end_time',
        'enabled',
        'des',
        'updated',
        'actions',
    ];

    readonly ALF_SHIFT_TYPE = ALF_SHIFT_TYPE;
    readonly isAdminUser: boolean;

    dialogTitle = 'Create shift';
    shiftTypeOptions: ShiftTypeOption[] = [];
    crossMidnightPreview = false;

    constructor(
        private _shiftService: AlfresaShiftService,
        private _sharedService: SharedService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        public dialog: MatDialog,
        private _formBuilder: FormBuilder,
    ) {
        this.isAdminUser = isWebAdminPermission(this._sharedService.getPermission());
    }

    ngOnInit(): void {
        this.createShiftForm();
        this.refreshShifts();
    }

    ngAfterViewInit(): void {
        this.configureSort();
    }

    canCreateShift(): boolean {
        const types = new Set(this.shifts.map((s) => s.shift_type));
        return types.size < ALL_ALF_SHIFT_TYPES.length;
    }

    getShiftTypeLabel(shiftType: number): string {
        return getAlfShiftTypeLabel(shiftType);
    }

    isNightShiftType(shiftType: number): boolean {
        return isAlfShiftNightType(shiftType);
    }

    isShiftEnabled(item: AlfresaShiftConfig): boolean {
        return item.enabled !== false;
    }

    openDialog(action: string, item?: AlfresaShiftConfig): void {
        switch (action) {
            case 'add':
                if (!this.canCreateShift()) {
                    this.warning('All shift types are already configured');
                    return;
                }
                this.prepareAddDialog();
                this.openShiftDialog();
                break;
            case 'edit':
                if (!item) {
                    return;
                }
                this.prepareEditDialog(item);
                this.openShiftDialog();
                break;
            case 'delete':
                this.shiftSelected = item;
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, {
                    width: '500px',
                    panelClass: 'custom-modalbox',
                });
                this.dialogRef.componentInstance.data = {
                    title: 'Delete Shift',
                    message: `Are you sure you want to delete the ${this.getShiftTypeLabel(item!.shift_type)} shift "${item!.name}"?`,
                };
                this.dialogRef.afterClosed().subscribe((result: boolean) => {
                    if (result) {
                        this.deleteShift();
                    }
                });
                break;
            default:
                break;
        }
    }

    saveShift(): void {
        const payload = this.buildPayload();
        if (!payload) {
            return;
        }

        if (!this.editState) {
            this._shiftService.createShift(payload).then((res: DB_RESULT) => {
                if (res && res.error_code === 0) {
                    this.notify(MSG.OPERATION_SUCCESS);
                    this.close();
                    this.refreshShifts();
                } else {
                    this.warning(res?.meta || MSG.OPERATION_FAILED[this.lng]);
                }
            });
            return;
        }

        if (!this.shiftSelected?.id) {
            return;
        }

        this._shiftService.updateShift(payload, this.shiftSelected.id).then((res: DB_RESULT) => {
            if (res && res.error_code === 0) {
                this.notify(MSG.OPERATION_SUCCESS);
                this.close();
                this.refreshShifts();
            } else {
                this.warning(res?.meta || MSG.OPERATION_FAILED[this.lng]);
            }
        });
    }

    close(): void {
        this.editState = false;
        this.dialog.closeAll();
    }

    private openShiftDialog(): void {
        if (!this.shiftDialog) {
            this.warning('Unable to open shift dialog');
            return;
        }
        this.dialogRef = this.dialog.open(this.shiftDialog, {
            width: '640px',
            panelClass: 'custom-modalbox',
            disableClose: true,
            autoFocus: false,
        });
    }

    private prepareAddDialog(): void {
        this.editState = false;
        this.shiftSelected = undefined;
        this.dialogTitle = 'Create shift';
        this.updateShiftTypeOptions();
        this.resetShiftForm();
    }

    private prepareEditDialog(item: AlfresaShiftConfig): void {
        this.editState = true;
        this.shiftSelected = item;
        this.dialogTitle = 'Edit shift';
        this.updateShiftTypeOptions();
        this.resetShiftForm();
        this.patchShiftForm(item);
    }

    private updateShiftTypeOptions(): void {
        const used = new Set(this.shifts.map((s) => s.shift_type));
        if (this.editState && this.shiftSelected) {
            used.delete(this.shiftSelected.shift_type);
        }
        const allOptions: ShiftTypeOption[] = ALL_ALF_SHIFT_TYPES.map((value) => ({
            value,
            label: getAlfShiftTypeLabel(value),
        }));
        this.shiftTypeOptions = allOptions.filter((opt) => !used.has(opt.value));
    }

    private deleteShift(): void {
        if (!this.shiftSelected?.id) {
            return;
        }
        this._shiftService.deleteShift(this.shiftSelected.id).then((res: DB_RESULT) => {
            if (res && res.error_code === 0) {
                this.notify(MSG.OPERATION_SUCCESS);
                this.refreshShifts();
            } else {
                this.warning(res?.meta || MSG.OPERATION_FAILED[this.lng]);
            }
        });
    }

    private refreshShifts(): void {
        this._shiftService.getAllShifts().then((res: DB_RESULT) => {
            if (res && res.error_code === 0) {
                this.shifts = Array.isArray(res.object) ? (res.object as AlfresaShiftConfig[]) : [];
                this.dataSource.data = [...this.shifts];
                this.configureSort();
            } else {
                this.shifts = [];
                this.dataSource.data = [];
                if (res?.meta) {
                    this.warning(res.meta);
                }
            }
            this._cdr.markForCheck();
        });
    }

    private configureSort(): void {
        this.dataSource.sortingDataAccessor = (item, property) => {
            switch (property) {
                case 'shift_type':
                    return item.shift_type;
                case 'enabled':
                    return item.enabled === false ? 0 : 1;
                case 'updated':
                    return item.updated ? new Date(item.updated).getTime() : 0;
                default:
                    return String((item as unknown as Record<string, unknown>)[property] ?? '');
            }
        };
        if (this.sort) {
            this.dataSource.sort = this.sort;
        }
    }

    private createShiftForm(): void {
        this.shiftForm = this._formBuilder.group({
            shift_type: [ALF_SHIFT_TYPE.BRANCH_DAY, Validators.required],
            name: ['', Validators.required],
            start_time: ['08:00', Validators.required],
            end_time: ['20:00', Validators.required],
            des: [''],
            enabled: [true],
        });
        this.shiftForm.get('start_time')?.valueChanges.subscribe(() => this.updateCrossMidnightPreview());
        this.shiftForm.get('end_time')?.valueChanges.subscribe(() => this.updateCrossMidnightPreview());
    }

    private resetShiftForm(): void {
        const defaultType = this.shiftTypeOptions[0]?.value ?? ALF_SHIFT_TYPE.BRANCH_DAY;
        this.shiftForm.reset({
            shift_type: defaultType,
            name: '',
            start_time: '08:00',
            end_time: '20:00',
            des: '',
            enabled: true,
        });
        this.shiftForm.markAsPristine();
        this.shiftForm.markAsUntouched();
        this.updateCrossMidnightPreview();
    }

    private patchShiftForm(item: AlfresaShiftConfig): void {
        this.shiftForm.patchValue({
            shift_type: item.shift_type,
            name: item.name,
            start_time: item.start_time,
            end_time: item.end_time,
            des: item.des ?? '',
            enabled: item.enabled !== false,
        });
        this.updateCrossMidnightPreview();
    }

    private updateCrossMidnightPreview(): void {
        const start = this.normalizeShiftTime(this.shiftForm?.get('start_time')?.value ?? '');
        const end = this.normalizeShiftTime(this.shiftForm?.get('end_time')?.value ?? '');
        this.crossMidnightPreview = !!(start && end && this.computeCrossMidnight(start, end));
    }

    private normalizeShiftTime(value: string): string | null {
        const trimmed = (value ?? '').trim();
        const match = trimmed.match(FLEX_TIME_PATTERN);
        if (!match) {
            return null;
        }
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    private timeToMinutes(normalizedTime: string): number {
        const [hour, minute] = normalizedTime.split(':').map(Number);
        return hour * 60 + minute;
    }

    private computeCrossMidnight(start: string, end: string): boolean {
        return this.timeToMinutes(end) < this.timeToMinutes(start);
    }

    private buildPayload(): AlfresaShiftConfig | null {
        if (this.shiftForm.invalid) {
            this.warning('Please fill in all required fields correctly');
            return null;
        }

        const raw = this.shiftForm.getRawValue();
        const name = (raw.name ?? '').trim();
        const start_time = this.normalizeShiftTime(raw.start_time ?? '');
        const end_time = this.normalizeShiftTime(raw.end_time ?? '');

        if (!name) {
            this.warning('Shift name is required');
            return null;
        }
        if (!start_time || !end_time) {
            this.warning('Start and end time must be valid (e.g. 8:00 or 08:00)');
            return null;
        }

        return {
            shift_type: Number(raw.shift_type),
            name,
            start_time,
            end_time,
            cross_midnight: this.computeCrossMidnight(start_time, end_time),
            des: (raw.des ?? '').trim() || undefined,
            enabled: !!raw.enabled,
        };
    }

    private warning(message: string[] | string): void {
        const text = typeof message === 'string' ? message : message[this.lng];
        this._snackBar.open(text, '', snackBarConfigWarn);
    }

    private notify(message: string[] | string): void {
        const text = typeof message === 'string' ? message : message[this.lng];
        this._snackBar.open(text, '', snackBarConfig);
    }
}
