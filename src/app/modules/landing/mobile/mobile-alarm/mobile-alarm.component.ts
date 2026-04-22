import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { DB_RESULT, Device, MobileAdmin, MobileAlarmConfig, PageData, PageQuery, PERMISSION } from '../../utils/typedef';
import { MobileAlarmService } from '../service/mobile.alarm.service';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { SharedService } from 'app/services/shared.service';
import { MobileUserService } from '../service/mobile.service';

export enum MobileAlarmType {
  Temperature = 0,
  Battery = 4,
  ProbTemperature = 6,
}

const mobileAlarmTypes = [
  { name: 'Temperature Alarm', value: MobileAlarmType.Temperature },
  { name: 'Prob Temperature Alarm', value: MobileAlarmType.ProbTemperature },
  { name: 'Battery Alarm', value: MobileAlarmType.Battery },
];

const days = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
];

@Component({
  selector: 'app-mobile-alarm',
  templateUrl: './mobile-alarm.component.html',
  styleUrls: ['./mobile-alarm.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAlarmComponent implements OnInit, OnDestroy {
  @ViewChild('alarmDialog', { static: true }) alarmDialog: TemplateRef<any>;
  @ViewChild('alarmPaginator', { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('deviceSelect') deviceSelect?: MatSelect;

  displayedColumns: string[] = [
    'index',
    'alarm_name',
    'alarm_type',
    'alarm_interval',
    'intervalWarn',
    'intervalAlarm',
    'devices',
    'status',
    'operation',
  ];

  public dataSourceAlarm = new MatTableDataSource<MobileAlarmConfig>();
  public alarms: MobileAlarmConfig[] = [];
  public userDevices: Device[] = [];
  public totalRecords = 0;
  public pageSize = 10;
  public keyword = '';
  public editState = false;
  public selectedAlarm?: MobileAlarmConfig;
  public searchInputControl = new FormControl('');
  public deviceSearchControl = new FormControl('');
  public mobileAlarmForm: FormGroup;
  public MobileAlarmType = MobileAlarmType;
  public alarmTypes = mobileAlarmTypes;
  public dayOptions = days;
  public filteredDevices: Device[] = [];
  public mobileAdmins: MobileAdmin[] = [];

  private _unsubscribeAll = new Subject<void>();
  private currentUserId = '';

  constructor(
    private _mobileAlarmService: MobileAlarmService,
    private _deviceService: DeviceManagementService,
    private _formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private _cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    private _sharedService: SharedService,
    private _mobileUserService: MobileUserService
  ) {
    this.mobileAlarmForm = this._formBuilder.group({
      id: [null],
      user: ['', Validators.required],
      name: ['mobile alarm', [Validators.required, Validators.minLength(3), Validators.maxLength(64)]],
      alarm_type: [MobileAlarmType.Temperature, Validators.required],
      alarm_target: [[], Validators.required],
      status: [1, [Validators.required, Validators.min(0), Validators.max(1)]],
      repeat: [[1, 2, 3, 4, 5], Validators.required],
      intervalWarn: [5, [Validators.required, Validators.min(5), Validators.max(60 * 24)]],
      intervalAlarm: [10, [Validators.required, Validators.min(5), Validators.max(60 * 24)]],
      time_from: ['8:00 AM'],
      time_to: ['20:00'],
      warningLow: [5, Validators.required],
      warningHigh: [30],
      alarmLow: [0, Validators.required],
      alarmHigh: [35],
    });
  }

  ngOnInit(): void {
    this.currentUserId = this._sharedService.getId() || JSON.parse(localStorage.getItem('userInfo') || '{}')?.id || '';
    this.dataSourceAlarm.paginator = this.paginator;
    this.dataSourceAlarm.sort = this.sort;
    this.getDevices(this.currentUserId);
    this.getMobileAdmins();
    this.getMobileAlarms();

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.keyword = (query || '').trim();
          this.paginator.pageIndex = 0;
          return this.fetchPage(0, this.paginator.pageSize || this.pageSize, this.keyword);
        })
      )
      .subscribe({
        next: (response) => this.updateDataSource(response),
        error: (err: HttpErrorResponse) => console.error(err),
      });

    this.deviceSearchControl.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((query) => {
      const keyword = (query || '').toString();
      this.updateFilteredDevices(keyword);
      const normalized = keyword.trim();
      if (normalized.length > 0) {
        this.openDeviceSelectPanel();
      } else if (this.deviceSelect?.panelOpen) {
        this.deviceSelect.close();
      }
    });

    this.mobileAlarmForm.get('alarm_type')?.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((type) => {
      this.applyAlarmTypeDefaults(type);
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.fetchPage(event.pageIndex, event.pageSize, this.keyword)
      .then((response: any) => this.updateDataSource(response))
      .catch((err: HttpErrorResponse) => console.error(err));
  }

  fetchPage(pageIndex: number, pageSize: number, keyword: string) {
    const pageQuery: PageQuery = {
      page: pageIndex + 1,
      pagesize: pageSize,
      keyword,
      total: 0,
      keyChanged: true,
    };
    return this._mobileAlarmService.getMobileAlarmPage(pageQuery);
  }

  updateDataSource(response: any): void {
    const res = response as DB_RESULT;
    if (res && !res.error_code) {
      const pageData = res.object as PageData;
      this.alarms = (pageData?.data || []) as MobileAlarmConfig[];
      this.dataSourceAlarm.data = this.alarms;
      this.totalRecords = pageData?.total || 0;
    } else {
      this.alarms = [];
      this.dataSourceAlarm.data = [];
      this.totalRecords = 0;
    }
    this._cdr.markForCheck();
  }

  getMobileAlarms(): void {
    this.fetchPage(this.paginator.pageIndex, this.pageSize, this.keyword)
      .then((response: any) => this.updateDataSource(response))
      .catch((err: HttpErrorResponse) => console.error(err));
  }

  getMobileAdmins(): void {
    this._mobileUserService.getSubUsersOfSelf().then((response: DB_RESULT) => {
      if (response && response.error_code === 0 && Array.isArray(response.object)) {
        const allUsers = response.object as MobileAdmin[];
        const mobAdmins = allUsers.filter((user) => Number(user.permission) === PERMISSION.MOB_ADMIN);
        // Some API responses may omit permission; keep usable users so device lookup still works.
        this.mobileAdmins = mobAdmins.length > 0 ? mobAdmins : allUsers.filter((user) => !!user.id);
      } else {
        this.mobileAdmins = [];
      }

      if (this.mobileAdmins.length === 0 && this.currentUserId) {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        this.mobileAdmins = [
          {
            id: this.currentUserId,
            name: userInfo?.name || 'Current User',
            email: userInfo?.email || '',
            permission: PERMISSION.MOB_ADMIN,
          },
        ];
      }

      const selectedUser = this.mobileAlarmForm.value.user;
      const hasSelectedUser = this.mobileAdmins.some((user) => user.id === selectedUser);
      if (!hasSelectedUser) {
        this.mobileAlarmForm.patchValue({ user: this.getDefaultMobileAdminId() }, { emitEvent: true });
      }
      this._cdr.markForCheck();
    });
  }

  getDevices(ownerId?: string): void {
    const userId = ownerId || this.mobileAlarmForm.value.user || this.currentUserId;
    if (!userId) {
      return;
    }
    this._deviceService
      .getuserDeviceSummarize(userId)
      .then((res: any) => {
        if (res && !res.error_code && Array.isArray(res.object)) {
          this.userDevices = res.object;
        } else {
          this.userDevices = [];
        }
        this.updateFilteredDevices(this.deviceSearchControl.value || '');
        this._cdr.markForCheck();
      })
      .catch((err: HttpErrorResponse) => console.error(err));
  }

  openCreateDialog(): void {
    this.editState = false;
    this.selectedAlarm = undefined;
    this.resetForm();
    this.deviceSearchControl.setValue('', { emitEvent: false });
    this.updateFilteredDevices('');
    this.dialog.open(this.alarmDialog, { width: '760px', panelClass: 'custom-modalbox', disableClose: false });
  }

  openEditDialog(item: MobileAlarmConfig): void {
    this.editState = true;
    this.selectedAlarm = item;
    this.patchForm(item);
    this.deviceSearchControl.setValue('', { emitEvent: false });
    this.updateFilteredDevices('');
    this.dialog.open(this.alarmDialog, { width: '760px', panelClass: 'custom-modalbox', disableClose: false });
  }

  closeDialog(): void {
    this.dialog.closeAll();
  }

  getDialogTitle(): string {
    return this.editState ? 'Edit Mobile Alarm' : 'Create Mobile Alarm';
  }

  saveMobileAlarm(): void {
    const userId = this.mobileAlarmForm.value.user;
    if (!userId) {
      this._snackBar.open('Select mobile admin user', '', snackBarConfigWarn);
      return;
    }

    const alarmName = (this.mobileAlarmForm.value.name || '').trim();
    if (!alarmName || alarmName.length < 3 || alarmName.length > 64) {
      this._snackBar.open('Alarm name length must be 3 to 64 characters', '', snackBarConfigWarn);
      return;
    }

    const targets = this.mobileAlarmForm.value.alarm_target as string[];
    if (!targets || targets.length === 0) {
      this._snackBar.open('Select target devices', '', snackBarConfigWarn);
      return;
    }

    const repeat = this.mobileAlarmForm.value.repeat as number[];
    if (!repeat || repeat.length === 0) {
      this._snackBar.open('Select repeat days', '', snackBarConfigWarn);
      return;
    }

    const repeatString = repeat.map((day) => `${day}`).join(',');
    if (repeatString.length < 1 || repeatString.length > 20) {
      this._snackBar.open('Repeat value is invalid', '', snackBarConfigWarn);
      return;
    }

    const intervalWarn = Number(this.mobileAlarmForm.value.intervalWarn);
    const intervalAlarm = Number(this.mobileAlarmForm.value.intervalAlarm);
    if (intervalWarn < 5 || intervalWarn > 60 * 24) {
      this._snackBar.open('intervalWarn must be in range 5~1440 minutes', '', snackBarConfigWarn);
      return;
    }
    if (intervalAlarm < 5 || intervalAlarm > 60 * 24) {
      this._snackBar.open('intervalAlarm must be in range 5~1440 minutes', '', snackBarConfigWarn);
      return;
    }

    const value = this.buildAlarmValue();
    if (!value) {
      this._snackBar.open('Invalid alarm value setting', '', snackBarConfigWarn);
      return;
    }

    const payload: MobileAlarmConfig = {
      user: userId,
      name: alarmName,
      alarm_type: Number(this.mobileAlarmForm.value.alarm_type),
      alarm_target: targets.join(','),
      value,
      status: Number(this.mobileAlarmForm.value.status),
      time_from: this.mobileAlarmForm.value.time_from || '',
      time_to: this.mobileAlarmForm.value.time_to || '',
      repeat: repeatString,
      intervalWarn,
      intervalAlarm,
    };

    if (!this.editState) {
      this._mobileAlarmService.createMobileAlarm(payload).then((res: DB_RESULT) => {
        if (res && !res.error_code) {
          this._snackBar.open('Success to create mobile alarm', '', snackBarConfig);
          this.closeDialog();
          this.getMobileAlarms();
        } else {
          this._snackBar.open(res?.meta || 'Failed to create mobile alarm', '', snackBarConfigWarn);
        }
      });
      return;
    }

    const alarmId = this.selectedAlarm?.id || this.mobileAlarmForm.value.id;
    if (!alarmId) {
      this._snackBar.open('Invalid mobile alarm selected', '', snackBarConfigWarn);
      return;
    }
    this._mobileAlarmService.updateMobileAlarm(payload, alarmId).then((res: DB_RESULT) => {
      if (res && !res.error_code) {
        this._snackBar.open('Success to update mobile alarm', '', snackBarConfig);
        this.closeDialog();
        this.getMobileAlarms();
      } else {
        this._snackBar.open(res?.meta || 'Failed to update mobile alarm', '', snackBarConfigWarn);
      }
    });
  }

  deleteAlarm(item: MobileAlarmConfig): void {
    const dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
    dialogRef.componentInstance.data = {
      title: 'Delete Mobile Alarm?',
      message: 'Are you sure you want to delete this mobile alarm?',
    };
    dialogRef.afterClosed().subscribe((result) => {
      if (!result || !item.id) {
        return;
      }
      this._mobileAlarmService.deleteMobileAlarm(item.id).then((res: DB_RESULT) => {
        if (res && !res.error_code) {
          this._snackBar.open('Mobile alarm deleted successfully', '', snackBarConfig);
          this.getMobileAlarms();
        } else {
          this._snackBar.open(res?.meta || 'Failed to delete mobile alarm', '', snackBarConfigWarn);
        }
      });
    });
  }

  getAlarmTypeName(type: number): string {
    return this.alarmTypes.find((item) => item.value === Number(type))?.name || '--';
  }

  getDeviceNames(target?: string): string {
    if (!target) {
      return '--';
    }
    const ids = target.split(',').map((id) => id.trim());
    const matched = this.userDevices.filter((device) => ids.includes(String(device.id)));
    return matched.length > 0 ? matched.map((device) => device.name).join(', ') : '--';
  }

  getRepeatDayNames(repeat?: string): string {
    if (!repeat) {
      return '--';
    }
    const selected = repeat.split(',').map((day) => Number(day));
    return this.dayOptions
      .filter((day) => selected.includes(day.value))
      .map((day) => day.name)
      .join(', ');
  }

  getStatusName(status: number): string {
    return Number(status) === 1 ? 'Enable' : 'Disable';
  }

  getSelectedDeviceCount(): number {
    const selected = this.mobileAlarmForm.value.alarm_target as string[];
    return selected?.length || 0;
  }

  getRowIndex(index: number): number {
    return this.paginator.pageIndex * this.paginator.pageSize + index + 1;
  }

  getAlarmIntervalText(item: MobileAlarmConfig): string {
    const values = (item.value || '').split(',');
    const alarmType = Number(item.alarm_type);
    if (alarmType === MobileAlarmType.Battery) {
      return `Warn<=${values[0] || '--'}%, Alarm<=${values[1] || '--'}%`;
    }
    return `Warn:${values[0] || '--'}~${values[1] || '--'}, Alarm:${values[2] || '--'}~${values[3] || '--'}`;
  }

  isBatteryAlarm(): boolean {
    return Number(this.mobileAlarmForm.value.alarm_type) === MobileAlarmType.Battery;
  }

  private resetForm(): void {
    this.mobileAlarmForm.reset({
      id: null,
      user: this.getDefaultMobileAdminId(),
      name: 'mobile alarm',
      alarm_type: MobileAlarmType.Temperature,
      alarm_target: [],
      status: 1,
      repeat: [1, 2, 3, 4, 5],
      intervalWarn: 5,
      intervalAlarm: 10,
      time_from: '8:00 AM',
      time_to: '20:00',
      warningLow: 5,
      warningHigh: 30,
      alarmLow: 0,
      alarmHigh: 35,
    });
  }

  private patchForm(item: MobileAlarmConfig): void {
    const targetIds = (item.alarm_target || '').split(',').filter((v) => !!v);
    const repeats = (item.repeat || '')
      .split(',')
      .filter((v) => v !== '')
      .map((v) => Number(v));

    this.mobileAlarmForm.patchValue({
      id: item.id || null,
      user: item.user || this.getDefaultMobileAdminId(),
      name: item.name || '',
      alarm_type: Number(item.alarm_type),
      alarm_target: targetIds,
      status: Number(item.status) === 1 ? 1 : 0,
      repeat: repeats.length > 0 ? repeats : [1, 2, 3, 4, 5],
      intervalWarn: item.intervalWarn || 5,
      intervalAlarm: item.intervalAlarm || 10,
      time_from: item.time_from || '',
      time_to: item.time_to || '',
    });

    const values = (item.value || '').split(',').map((v) => Number(v));
    if (Number(item.alarm_type) === MobileAlarmType.Battery) {
      this.mobileAlarmForm.patchValue({
        warningLow: Number.isFinite(values[0]) ? values[0] : 20,
        alarmLow: Number.isFinite(values[1]) ? values[1] : 10,
      });
      return;
    }

    this.mobileAlarmForm.patchValue({
      warningLow: Number.isFinite(values[0]) ? values[0] : 5,
      warningHigh: Number.isFinite(values[1]) ? values[1] : 30,
      alarmLow: Number.isFinite(values[2]) ? values[2] : 0,
      alarmHigh: Number.isFinite(values[3]) ? values[3] : 35,
    });
  }

  private applyAlarmTypeDefaults(type: number): void {
    if (Number(type) === MobileAlarmType.Battery) {
      this.mobileAlarmForm.patchValue({
        warningLow: 20,
        alarmLow: 10,
        warningHigh: null,
        alarmHigh: null,
      });
      return;
    }
    this.mobileAlarmForm.patchValue({
      warningLow: 5,
      warningHigh: 30,
      alarmLow: 0,
      alarmHigh: 35,
    });
  }

  private updateFilteredDevices(keyword: string): void {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      this.filteredDevices = [...this.userDevices];
      return;
    }

    this.filteredDevices = this.userDevices.filter((device) => {
      const name = (device.name || '').toString().toLowerCase();
      const serial = (device.serial || '').toString().toLowerCase();
      return name.includes(normalized) || serial.includes(normalized);
    });
  }

  private getDefaultMobileAdminId(): string {
    if (this.mobileAdmins.length > 0 && this.mobileAdmins[0]?.id) {
      return this.mobileAdmins[0].id;
    }
    return this.currentUserId || '';
  }

  private openDeviceSelectPanel(): void {
    setTimeout(() => {
      if (!this.deviceSelect) {
        return;
      }
      if (!this.deviceSelect.panelOpen) {
        this.deviceSelect.open();
      }
    }, 0);
  }

  private buildAlarmValue(): string {
    const warningLow = Number(this.mobileAlarmForm.value.warningLow);
    const warningHigh = Number(this.mobileAlarmForm.value.warningHigh);
    const alarmLow = Number(this.mobileAlarmForm.value.alarmLow);
    const alarmHigh = Number(this.mobileAlarmForm.value.alarmHigh);

    if (this.isBatteryAlarm()) {
      if (!Number.isFinite(warningLow) || !Number.isFinite(alarmLow) || warningLow < alarmLow) {
        return '';
      }
      return `${warningLow},${alarmLow}`;
    }

    if (
      !Number.isFinite(warningLow) ||
      !Number.isFinite(warningHigh) ||
      !Number.isFinite(alarmLow) ||
      !Number.isFinite(alarmHigh) ||
      warningLow > warningHigh ||
      alarmLow > alarmHigh ||
      warningLow < alarmLow ||
      warningHigh > alarmHigh
    ) {
      return '';
    }
    return `${warningLow},${warningHigh},${alarmLow},${alarmHigh}`;
  }
}
