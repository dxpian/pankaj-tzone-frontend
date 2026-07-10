import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import _ from 'lodash';

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil } from 'rxjs';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { AlarmSettingService } from '../alarm-settings.service';
import { ServiceCenter } from '../../service/service.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { DB_RESULT, Device, EmailConfig, PageData, PageQuery, UseralarmConfigProperty } from '../../utils/typedef';

 export const days = [
  { name: "Monday", value: 1 },
  { name: "Tuesday", value: 2 },
  { name: "Wednesday", value: 3 },
  { name: "Thursday", value: 4 },
  { name: "Friday", value: 5 },
  { name: "Saturday", value: 6 },
  { name: "Sunday", value: 7 },
]
export const alarmTypes = [
  { name: "Temperature  Alarm", value: 0 },
  { name: "Humidity Alarm", value: 1 },
  { name: "Light Alarm", value: 2 },
  { name: "Vibration Alarm", value: 3 },
  { name: "Battery Alarm", value: 4},
  { name: "SIM Expiration Alarm", value: 5},
  { name: 'Prob Temperature Alarm', value: 6}
]

export enum AlarmType{
   Temperature = 0,
   Humidity =  1,
   Light = 2,
   Vibration = 3,
   Battery = 4,
   SIM = 5,
   ProbTemperature = 6,
}

export const alarmObjects = [
  { name: "By Account", value: 0 },
  { name: "By Group", value: 1 },
  { name: "By Device", value: 2 },
]



@Component({
  selector: 'app-alarm-listing',
  templateUrl: './alarm-listing.component.html',
  styleUrls: ['./alarm-listing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})


export class AlarmListingComponent implements OnInit, OnChanges {

  @ViewChild('addNewAlarm') AddAlarm: any;
  @Output() readonly alarm: EventEmitter<any> = new EventEmitter<any>;
  @Input() filteredAlarmList: any;
  currentTime: Date;
  groupsValue = ''
  currentTime2: Date;
  userInfo: any;
  public selection = new SelectionModel<any>(true, []);
  public selectionEmail = new SelectionModel<any>(true, [])
  displayedColumns: string[] = ['id', 'name', 'alarm_type', 'alarm_object', 'Event', 'effectiveTime',
    'createTime', 'lastUpdate', 'interval', 'created_by', 'Operate',];
  public dataSource = new MatTableDataSource<UseralarmConfigProperty>()
  public emailSource = new MatTableDataSource<EmailConfig>()
  public selectedAlarm?: UseralarmConfigProperty = undefined
  //public selectedAlarmID = ''   // id of selected alarm. used in edit state
  public copiedAlarm? : UseralarmConfigProperty = undefined     // id of alarm copied
  tableData = [];
  totalRecords: number = 0;
  showData = false;
  @ViewChild('alarmPaginator', { static: true }) paginator: MatPaginator;
  @ViewChild('emailPaginator', { static: true }) paginatorEmail: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  public dialogRef: any;
  searchkeyword = ''
  searchInputControl = new FormControl();
  isNoRecord = false;
  isSearch: boolean;
  templates: any = [];
  searchVal = ''
  pageSize = 10
  keyword = ''
  public searchValue = new Subject<number>();
  public searchValueSubscriber: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  deviceForm: FormGroup
  editState: boolean = false;
  deviceId: string;
  endDate: any;
  startDate: any;
  alarmForm: FormGroup;
  userDevices = [];
  checked = ''
  isDevices: boolean = false;
  startAt: Date = new Date();
  selectedDate: Date;
  alarms: UseralarmConfigProperty[] = [];
  displayedGroups = []
  displayedColumnsEmail: string[] = ['select', 'email', 'description'];
  AlarmType =  AlarmType

  constructor(private _deviceManagementService: DeviceManagementService,
    private _alarmSettingsService: AlarmSettingService,
    private _serviceCenter: ServiceCenter,
    private _route: ActivatedRoute,
    public dialog: MatDialog,
    private _formBuilder: FormBuilder,
    private _snackbar: MatSnackBar,
    private _cdr: ChangeDetectorRef,
    private _cdrEmail: ChangeDetectorRef,
    public _router: Router,
  ) {

  }
  ngOnChanges(): void {

    if (this.filteredAlarmList && this.filteredAlarmList.length > 0) {
      this.isNoRecord = false;
      this.dataSource = new MatTableDataSource<any>();
      this.dataSource.data = this.filteredAlarmList;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.totalRecords = this.filteredAlarmList.length

    }
    if (this.filteredAlarmList && this.filteredAlarmList.length == 0) {
      this.dataSource = new MatTableDataSource<any>();
      this.dataSource.data = [];
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.totalRecords = 0

    }
  }
  ngOnInit(): void {
    this.displayedGroups = []
    this.currentTime = new Date();
    this.currentTime2 = new Date();
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    this.getAlarms()
    // Access route parameters using ActivatedRoute
    this._route.paramMap.subscribe((params) => {
      this.deviceId = params.get('id');
    });

    this.dataSource.filterPredicate = (data: any, filter: string) => {
      try
      {
        const searchText = String(filter).trim().toLowerCase();
        // filter by alarm name
        if(data.name.toLowerCase().includes(searchText))
          return true;

        // filter by device name
        if (data.alarm_object == 2) { // target is device ID
          const repeatArray = data.alarm_target.split(',').map(String);
          var selectedDevices = this.userDevices.filter(device =>
            repeatArray.includes(device.id) && (
              device.name.trim().toLowerCase().includes(searchText)
              || String(device.serial).includes(searchText)
            )
          );
          if(selectedDevices.length > 0)
              return true;
        }
        return false;
      }
      catch(error){

        return false;
      }
    };

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.keyword = query
          this.paginator.pageIndex = 0;
          return this.fetchPage(0, this.paginator.pageSize, this.keyword)
        })
      )
      .subscribe({
        next: (response) => {
          this.updateDataSource(response); // Handle the API response
        },
        error: (err: HttpErrorResponse) => {
          console.error(err); // Handle errors
        }
      });


    this.startDate = new Date(); // a
    this.endDate = new Date(this.currentTime2.getTime() + (31 * 24 * 60 * 60 * 1000)); // current date and time

    this.alarmForm = this._formBuilder.group({
      "id": [],
      "name": ['alarm', Validators.required],
      "alarm_type": [0, Validators.required],
      "alarm_object": [2, Validators.required],
      'alarm_target': this._formBuilder.array([]),
      "effect_time_from": ['12:00 AM'],
      "effect_time_to": ['11:59 PM'],
      "effect_date_from": [this.startDate],
      "effect_date_to": [this.endDate],
      "channel": [1],
      "warning_low_temperature": [5],
      "warning_high_temperature": [30],
      "low_temperature": [0],
      "high_temperature": [35],
      "warning_low_humidity": [20],
      "warning_high_humidity": [50],
      'low_humidity': [15],
      'high_humidity': [60],
      'warning_low': [''],
      'warning_high': [''],
      'low': [''],
      'high': [''],
      "repeat": this._formBuilder.array([]),
      "connectedEmails": '',
      "interval": [5, [Validators.min(1), Validators.max(60 * 24)]],
    });
    this.createFields()
    this.getDevices();
    this.getEmails();
  }

  ngAfterViewInit(): void {
      this.pageSize = this.paginator.pageSize;
      this.getAlarms();
    }

    ngOnDestroy(): void {

    }

    onPageChange(event: any): void {
      this.pageSize = event.pageSize
      this.fetchPage(event.pageIndex, event.pageSize, this.keyword).then((response: any) => {
        this.updateDataSource(response);
      }).catch((err: HttpErrorResponse) => (console.log));
    }

    fetchPage(pageIndex: number, pageSize: number, keyword: string) {
      const pageQuery: PageQuery = {
        page: pageIndex + 1, // Backend expects 1-based index
        pagesize: pageSize,
        keyword: keyword,
        total: 0,
        keyChanged: true,
      };
      return this._alarmSettingsService.getAlarmWithPage(pageQuery);
    }

    // data sources is updated
    updateDataSource(response: any): void {
      const res = response as DB_RESULT
      if(res && !res.error_code){
        const pageData = res.object as PageData

        this.alarms = pageData.data as UseralarmConfigProperty[];
        this.dataSource.data = pageData.data as UseralarmConfigProperty[]
        this.totalRecords = pageData.total
      }
      else{
        console.log(`failed to get api response: ${res}`)
        this.dataSource.data = []
        this.totalRecords = 0
      }
    }


  getAlarms() {
    this.fetchPage(this.paginator.pageIndex, this.pageSize, this.keyword).then((response: any) => {
      this.updateDataSource(response);
    }).catch((err: HttpErrorResponse) => (console.log));
  }



  masterToggle() {
    this._cdr.detectChanges()
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach((row) => {
        if (row) {
          this.selection.select(row)
        } else {
          this.selection.deselect(row);
          this._cdr.detectChanges();
        }
      });
  }
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    return numSelected;
  }

  emailSelectionToggle() {
    this._cdrEmail.detectChanges()
    this.isEmailAllSelected() ?
      this.selectionEmail.clear() :
      this.emailSource.data.forEach((row) => {
        if (row) {
          this.selectionEmail.select(row)
        } else {
          this.selectionEmail.deselect(row);
          this._cdrEmail.detectChanges();
        }
      });
  }

  isEmailAllSelected(){
      const numSelected = this.selectionEmail.selected.length;
      return numSelected;
  }

  getDeviceValues(item, value) {
    if (value == 2) {
      return item?.value?.name
    }
  }

  getGridTemplateColumns(): string {
    // return this.alarmForm.value.alarm_type === AlarmType.SIM ? 'repeat(8, 1fr)' : 'repeat(4, 1fr)';
    return 'repeat(10, 1fr)'
  }

  isAllChecked(): boolean {
    const controls = this.alarmForm.get('alarm_target')['controls'];
    return controls.every(control => control.get('value').value);
  }

  // Toggle all checkboxes
  toggleAllCheckboxes(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const controls = this.alarmForm.get('alarm_target')['controls'];
    controls.forEach(control => control.get('value').setValue(isChecked));
  }

  getGroupsValues(item,i) {
     if(this.displayedGroups.length !== this.userDevices.length) {
      const group = item?.value?.groups;
      if (group && !this.displayedGroups.includes(group)) {
        this.displayedGroups.push(group);
        this.groupsValue = group;
        this._cdr.detectChanges();
        return this.displayedGroups.length
      } else {
        this.groupsValue = ''; // Return an empty string to hide duplicate groups
        this.displayedGroups.push('');
        this._cdr.detectChanges();
        return this.displayedGroups.length
      }
    } else {
      return this.displayedGroups.length
    }

  }

  isChecked(deviceId: string): boolean {
    const alarmTargetArray = this.alarmForm.get('alarm_target') as FormArray;
    const currentControl = alarmTargetArray.at(0) as FormControl; // Assuming there is only one control in alarm_target
    const currentValue = currentControl.value || '';
    return currentValue.includes(deviceId);
  }

  getDevices(id?) {
    this.userDevices = [];
    this._deviceManagementService.getuserDeviceSummarize(this.userInfo.id).then((res: any) => {

      if (res && !res.error_code) {
        if (res?.object?.length) {
          this.userDevices = res.object;
          this.initializeAlarmTarget();
          this._cdr.detectChanges();
        } else {

        }

        this.dialogRef.close();
      } else {
      }
    }).catch((err: HttpErrorResponse) => (console.log))

  }

  getEmails(){
    this._serviceCenter.getMsgConfigurations().then((res: any) => {
      this.emailSource = new MatTableDataSource<EmailConfig>();
      if (res && !res.error_code) {
        if (res?.object?.length) {
            const emails = res.object as EmailConfig[]

            emails.sort((a, b) => {
                const emailA = a.email?.toLowerCase() || '';
                const emailB = b.email?.toLowerCase() || '';
                return emailA.localeCompare(emailB);
            });

            console.log(`download the total emails: ${emails.length}`)

            this.emailSource.data = emails;
            this.emailSource.paginator = this.paginatorEmail;
            this.emailSource.sort = this.sort;
        }
      } else {
        console.log(`Failed to load email configuration`)
      }
    }).catch((err: HttpErrorResponse) => (console.log))
  }

  getName(value) {
    for (let i = 0; i < days.length; i++) {
      if (days[i].value == value) {
        return days[i].name;
      }
    }
  }

  getAlarmType(value) {
    for (let i = 0; i < alarmTypes.length; i++) {
      if (alarmTypes[i].value == value) {
        return alarmTypes[i].name;
      }
    }
  }

  getGroups(value) {
    for (let i = 0; i < alarmObjects.length; i++) {
      if (alarmObjects[i].value == value) {
        return alarmObjects[i].name + ':';
      }
    }
  }

  getEvents(item) {
    if (item.alarm_type == AlarmType.Temperature) {  // temperature and humidity
      return `Internal temperature
      Warn:${item?.warning_low_temperature}℃~${item?.warning_high_temperature}℃  Alarm:${item.low_temperature}℃~${item?.high_temperature}℃`
    }
    if(item.alarm_type== AlarmType.Humidity){
      return `Channel:${item.channel}
      Warn:${item?.warning_low_humidity}%~${item?.warning_high_humidity}% Alarm:${item?.low_humidity}%~${item?.high_humidity}%`
    }
    if (item.alarm_type == AlarmType.Light) {   // light
      return `Warn:${item?.warning_low}lux~${item?.warning_high}lux  Alarm:${item.low}lux~${item?.high}lux`
    }
    if (item.alarm_type == AlarmType.Vibration) { // vibration
      return `Warn:${item?.warning_high}mg Alarm:${item.high}mg`
    }
    if(item.alarm_type == AlarmType.Battery){
      return `Warn:${item?.warning_low}% Alarm:${item?.low}%`
    }
    if (item.alarm_type == AlarmType.ProbTemperature) {  // temperature and humidity
      return `Prob temperature
      Warn:${item?.warning_low_temperature}℃~${item?.warning_high_temperature}℃ Alarm:${item.low_temperature}℃~${item?.high_temperature}℃`
    }
    if (item.alarm_type == AlarmType.SIM) {  // temperature and humidity
      return `Send an alarm mail 1 month in advance`
    }
  }

  getDayNames(repeatValues: string): string {
    const repeatArray = repeatValues.split(',').map(Number);
    const selectedDays = days.filter(day => repeatArray.includes(day.value));
    return selectedDays.map(day => day.name).join(', ');
  }

  getDeviceName(value, items) {
    if (value) {
      const repeatArray = value.split(',').map(String);
      if (items.alarm_object == 2) { // device id
        const selectedDevices = this.userDevices.filter(device => repeatArray.includes(device.id));
        return selectedDevices.map(device => device.name).join(', ');
      }
      if (items.alarm_object == 1) {
        const uniqueGroups = new Set<string>();

        const selectedDevices = this.userDevices.filter(device => {
          if (!uniqueGroups.has(device.groups)) {
            uniqueGroups.add(device.groups);
            return true;
          }
          return false;
        });
        return selectedDevices.map(device => device.groups).join(', ');
      }
    }
  }

  createFields(value?, editstate?) {
    const sched = this.alarmForm.controls.repeat as FormArray;
    sched.clear();
    for (let i = 1; i <= 7; i++) {
      let isChecked = true;

      if (editstate && value) {
        isChecked = value.includes(i.toString());
      }

      const object = {
        checked: new FormControl(isChecked)
      };

      const formGroup = this._formBuilder.group(object);
      sched.push(formGroup);
    }
    return sched;
  }

  initializeAlarmTarget() {
    const alarmTargetArray = this.alarmForm.controls.alarm_target as FormArray;
    alarmTargetArray.clear();
    // Assuming userDevices is an array of devices
    for (let i = 0; i < this.userDevices.length; i++) {
      const object = {
        id: new FormControl(this.userDevices[i].id),
        value: new FormControl(false),
        name: new FormControl(this.userDevices[i]?.name),
        groups: new FormControl(this.userDevices[i]?.groups),

      };
      const control = this._formBuilder.group(object);
      alarmTargetArray.push(control);
    }
    return alarmTargetArray
  }

  addAlarm() {
    this.selectionEmail.clear();
    if(this.editState){// select emails connected to current alert
        const emails = this.selectedAlarm.connectedEmails?this.selectedAlarm.connectedEmails.split(','):[]

        this.emailSource.data.forEach((row) => {
            if(emails.includes(row.id)){
                this.selectionEmail.select(row)
            }
        });
    }
    else if(this.copiedAlarm){ // there is alarm copied
      this.patchAlarmSetting(this.copiedAlarm, true)
        const emails = this.copiedAlarm.connectedEmails?this.copiedAlarm.connectedEmails.split(','):[]
        this.emailSource.data.forEach((row) => {
            if(emails.includes(row.id)){
                this.selectionEmail.select(row)
            }
        });
    }
    this.dialogRef = this.dialog.open(
        this.AddAlarm,
        {
            width: '990px', height: '720px', panelClass: 'custom-modalbox', disableClose: false
        }
    );
  }

  getAlarmDialogName():string{
    if(this.editState)
      return 'Edit alarm'
    return 'Create new alarm'
  }

  alarmTypeChange(event) {
    const alarmType = event.value

    if(alarmType == AlarmType.SIM){
      this.alarmForm.patchValue({
        alarm_object: 2
      });
      this.onAlarmObejctChanged(2)

    }
  }

  onAlarmObejctChanged(value) {
    if (value == 2) {
      this.isDevices = true;
    }
    if (value == 1) {
      this.displayedGroups = [];
      this.isDevices = true;
    }
    if (value == 0) {
      this.isDevices = false;
    }
  }

  cancel(value?) {
    this.displayedGroups = []
    this.editState = false
    this.dialog.closeAll();
    if (value != 'reset') {
      this.isDevices = false;
      this.setFormInitialValues();
    }
  }



  saveAlarm() {
    const selectedEmails: string[] = this.selectionEmail.selected.map(item=>item.id);
    const connected_emails = selectedEmails.join(',')

    // check email to connect
    if(selectedEmails.length <= 0)
    {
      this._snackbar.open('Select email to send alarm email', '', snackBarConfigWarn);
      return;
    }

    let repeated = [];
    let devices = []
    for (let i = 0; i < this.alarmForm.value.repeat.length; i++) {
      if (this.alarmForm.value.repeat[i].checked == true) {
        repeated.push(`${i + 1}`)
      }
    }
    // check device name
    if (!this.alarmForm.value.name) {
      this._snackbar.open('Invalid alarm name', '', snackBarConfigWarn);
      return;
    }
    if (this.alarmForm.value.alarm_type == null) {
      this._snackbar.open('Invalid alarm type', '', snackBarConfigWarn);
      return;
    }

    if (this.alarmForm.value.alarm_object == null) {
      this._snackbar.open('Invalid alarm object', '', snackBarConfigWarn);
      return;
    }
    // check parameters
    const alarmType = this.alarmForm.value.alarm_type
    if (alarmType == AlarmType.Temperature || alarmType == AlarmType.ProbTemperature) { // check temperature and humidity value
      if (this.alarmForm.value.channel == null) {
        this._snackbar.open('Invalid channel is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.warning_low_temperature == null) {
        this._snackbar.open('A warning low temperature value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.warning_high_temperature == null) {
        this._snackbar.open('A warning high temperature value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.low_temperature == null) {
        this._snackbar.open('A low Temperature value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.high_temperature == null) {
        this._snackbar.open('A high Temperature value is invalid', '', snackBarConfigWarn);
        return;
      }
      if(this.alarmForm.value.warning_low_temperature < this.alarmForm.value.low_temperature
        || this.alarmForm.value.warning_high_temperature > this.alarmForm.value.high_temperature
        || this.alarmForm.value.warning_low_temperature > this.alarmForm.value.warning_high_temperature)
      {
        this._snackbar.open('Invalid value setting', '', snackBarConfigWarn);
        return;
      }
    }
    else if(this.alarmForm.value.alarm_type == AlarmType.Humidity){ // humidity alarm
      if (this.alarmForm.value.channel == null) {
        this._snackbar.open('Invalid channel is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.warning_low_humidity == null) {
        this._snackbar.open('A low humidity warning value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.warning_high_humidity == null) {
        this._snackbar.open('A high humidity warning value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.low_humidity == null) {
        this._snackbar.open('A low humidity value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.high_humidity == null) {
        this._snackbar.open('A high humidity value is invalid', '', snackBarConfigWarn);
        return;
      }
      if(this.alarmForm.value.warning_low_humidity < this.alarmForm.value.low_humidity){
        this._snackbar.open('Warning low humidity is less than alert value', '', snackBarConfigWarn);
        return;
      }
      if(this.alarmForm.value.warning_high_humidity > this.alarmForm.value.high_humidity){
        this._snackbar.open('Warning high humidity is higher than alert value', '', snackBarConfigWarn);
        return;
      }
      if(this.alarmForm.value.warning_low_humidity > this.alarmForm.value.warning_high_humidity){
        this._snackbar.open('Invalid value setting', '', snackBarConfigWarn);
        return;
      }

    }
    else if(this.alarmForm.value.alarm_type == AlarmType.Light) { // check light value
      if (this.alarmForm.value.warning_low == null) {
        this._snackbar.open('A low light warning value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.warning_high == null) {
        this._snackbar.open('A high light warning value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.low == null) {
        this._snackbar.open('A low light value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.high == null) {
        this._snackbar.open('A high light value is invalid', '', snackBarConfigWarn);
        return;
      }
      if(this.alarmForm.value.warning_low < this.alarmForm.value.low
        || this.alarmForm.value.warning_high > this.alarmForm.value.high
        || this.alarmForm.value.warning_low > this.alarmForm.value.warning_high
      ){
        this._snackbar.open('Invalid value setting', '', snackBarConfigWarn);
        return;
      }
    }
    else if (this.alarmForm.value.alarm_type == AlarmType.Vibration) { // check vibration value
      if (this.alarmForm.value.warning_high == null) {
        this._snackbar.open('A high vibration warning value is invalid', '', snackBarConfigWarn);
        return;
      }
      if (this.alarmForm.value.high == null) {
        this._snackbar.open('A high vibration value is invalid', '', snackBarConfigWarn);
        return;
      }
      if(this.alarmForm.value.warning_high > this.alarmForm.value.high){
        this._snackbar.open('Invalid value setting', '', snackBarConfigWarn);
        return;
      }
    }
    else if(this.alarmForm.value.alarm_type == AlarmType.Battery){// check battery value
        if(this.alarmForm.value.warning_low == null){
            this._snackbar.open('A low battery warning value is invalid', '', snackBarConfigWarn);
            return;
        }
        if(this.alarmForm.value.low == null){
            this._snackbar.open('A low battery alarm value is invalid', '', snackBarConfigWarn);
            return;
        }
        if(this.alarmForm.value.warning_low < this.alarmForm.value.low){
          this._snackbar.open('Invalid value setting', '', snackBarConfigWarn);
          return;
        }
    }
    // check interval time
    if(alarmType != AlarmType.SIM){
      if( this.alarmForm.value.interval < 1 || this.alarmForm.value.interval > 24 * 60){
        this._snackbar.open(`Invalid alarm interval time value. It should be in [1~${64 * 24}] minutes range`, snackBarConfigWarn)
        return;
      }

      // check time value
      if (this.alarmForm.value.effect_time_from == null
        || this.alarmForm.value.effect_time_to == null
        || this.alarmForm.value.effect_date_from == null
        || this.alarmForm.value.effect_date_to == null) {
        this._snackbar.open('Invalid date and time setting', '', snackBarConfigWarn);
        return;
      }
    }

    // Convert the array to a comma-separated string
    const repeatedString = repeated.join(',');
    for (let i = 0; i < this.alarmForm.value.alarm_target.length; i++) {
      if (this.alarmForm.value.alarm_target[i].value == true && this.alarmForm.value.alarm_object == 2) {
        devices.push(`${this.alarmForm.value?.alarm_target[i]?.id}`)
      }
      if (this.alarmForm.value.alarm_target[i].value == true && this.alarmForm.value.alarm_object == 1) {
        devices.push(`${this.alarmForm.value?.alarm_target[i]?.groups}`)
      }
    }
    // check if valid devices are selected
    if (this.alarmForm.value.alarm_object == 1 && devices.length <= 0) { // no group is selected
      this._snackbar.open('No group selected', '', snackBarConfigWarn);
      return;
    }
    else if (this.alarmForm.value.alarm_object == 2 && devices.length <= 0) { // no device is selected
      this._snackbar.open('No device selected', '', snackBarConfigWarn);
      return;
    }
    else if(alarmType == AlarmType.SIM && devices.length <= 0){
      this._snackbar.open('No device selected', '', snackBarConfigWarn);
      return;
    }

    // Convert the array to a comma-separated string
    const devicesIDs = devices.join(',');

    this.alarmForm.value.repeat = repeatedString;
    this.alarmForm.value.alarm_target = devicesIDs;
    this.alarmForm.value.connectedEmails = connected_emails;
    if (!this.editState) {

      this._alarmSettingsService.addAlarm(this.alarmForm.value).then((res: any) => {
        if (res && !res.error_code) {
          this._snackbar.open('Success to create new alarm setting', '', snackBarConfig);
          this.resetForm();
          this.getEmails();
        } else {
          this._snackbar.open(`Failed to add new alarm setting`, '', snackBarConfigWarn);
          this.getEmails();
        }
      })
    }
    else {
      this._alarmSettingsService.editAlarm(this.alarmForm.value).then((res: any) => {
        if (res && !res.error_code) {
          this._snackbar.open('Alarm Edit Successfully', '', snackBarConfig);
          this.resetForm();
          this.getEmails();
        } else {
          this._snackbar.open(res.meta, '', snackBarConfigWarn);
          this.getEmails();
        }
      })
    }
  }

  deleteAlarm(id) {
    this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
    this.dialogRef.componentInstance.data = {
      title: "Delete Alarm?",
      message: "Are you sure you want to delete this Alarm?"
    }
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ConfirmdeleteDevice(id)
      }
    })
  }
  ConfirmdeleteDevice(id) {
    this._alarmSettingsService.deleteUserAlarm(id).then((res: any) => {
      if (res && !res.error_code) {
        this._snackbar.open('Alarm Deleted Successfully', '', snackBarConfig);
        this.getAlarms();
      }
    })
  }
  editAlarm(item, copy = false) {
    this.editState = true;
    // Check if item.repeat is a non-empty string
    this.patchAlarmSetting(item)
    this.selectedAlarm = item
    // this.selectedAlarmID = item.id
    this.addAlarm();
  }

  copyAlarm(item){
    this.copiedAlarm = _.cloneDeep(item)
    this._snackbar.open('Alarm copied', '', snackBarConfig);
  }

  private patchAlarmSetting(item, copy = false){

    if (typeof item.repeat === 'string' && item.repeat.trim() !== '') {
      // Split the string into an array of strings
      const repeatArray = item.repeat.split(',');
      if (this.alarmForm.get('repeat') instanceof FormArray) {
        // Iterate over the FormArray controls and update the 'checked' value
        const repeatFormArray = this.alarmForm.get('repeat') as FormArray;
        repeatFormArray.controls.forEach((control, index) => {
          const isChecked = repeatArray.includes((index + 1).toString());
          control.get('checked')?.patchValue(isChecked);
        });
      }
    }

    // Check if alarm_object is 2
    if (item.alarm_object === 2 || item.alarm_object === 1) {
      this.isDevices = true;

      // Check if item.repeat is a non-empty string
      if (typeof item.alarm_target === 'string' && item.alarm_target.trim() !== '') {
        // Split the string into an array of strings
        const deviceArray = item.alarm_target.split(',');

        // Ensure that 'repeat' property is an array with checkboxes
        if (this.alarmForm.get('alarm_target') instanceof FormArray) {
          // Iterate over the FormArray controls and update the 'checked' value
          const DeviceFormArray = this.alarmForm.get('alarm_target') as FormArray;
          DeviceFormArray.controls.forEach((control, index) => {
            const isChecked = deviceArray.includes((item.alarm_object == 2 ? control.value.id : control.value.groups));
            control.get('value')?.patchValue(isChecked);
          });
        }
      }
    } else {
      this.isDevices = false;
    }
    this.alarmForm.patchValue({
      id: item.id ?? null,
      name: item.name ?? null,
      alarm_type: item.alarm_type ?? null,
      alarm_object: item.alarm_object ?? null,
      effect_time_from: item.effect_time_from ?? null,
      effect_time_to: item.effect_time_to ?? null,
      effect_date_from: new Date(item.effect_date_from) ?? this.startDate,
      effect_date_to: new Date(item.effect_date_to) ?? this.endDate,
      channel: item.channel ?? null,
      warning_low_temperature: item.warning_low_temperature ?? null,
      warning_high_temperature: item.warning_high_temperature ?? null,
      low_temperature: item.low_temperature ?? null,
      high_temperature: item.high_temperature ?? null,
      warning_low_humidity: item.warning_low_humidity ?? null,
      warning_high_humidity: item.warning_high_humidity ?? null,
      low_humidity: item.low_humidity ?? null,
      high_humidity: item.high_humidity ?? null,
      warning_low: item.warning_low ?? null,
      warning_high: item.warning_high ?? null,
      low: item.low ?? null,
      high: item.high ?? null,
      interval: item.interval ?? 5,
    });
  }

  resetForm() {
    this.displayedGroups = []
    this.editState = false;
    this.cancel('reset');
    this.isDevices = false;
    this.alarmForm.reset();
    this.alarmForm.value.alarm_type = 2;
    this.alarmForm.get('alarm_type').setValue(2);
    this.setFormInitialValues();
    this.getAlarms();

  }

  setFormInitialValues() {
    this.alarmForm.patchValue({
      id: null,
      name: 'alarm',
      alarm_type: 0,
      alarm_object: 0,
      effect_time_from: '12:00 AM',
      effect_time_to: '11:59 PM',
      effect_date_from: this.startDate,
      effect_date_to: this.endDate,
      channel: 1,
      warning_low_temperature: 5,
      warning_high_temperature: 30,
      low_temperature: 0,
      high_temperature: 35,
      warning_low_humidity: 20,
      warning_high_humidity: 50,
      low_humidity: 15,
      high_humidity: 60,
      warning_low: '',
      warning_high: '',
      low: '',
      high: '',
      interval: 5,
    });
    this.createFields();
    this.initializeAlarmTarget();
  }

  checkForRoute() {
    if (this._router.url.includes('alarm')) {
      return true
    } else {
      return false;
    }
  }
  //   Op: GetChart
  // did: 58112
  // begin: 2022-04-01%2019:16
  // end: 2023-11-25%2019:16

}
