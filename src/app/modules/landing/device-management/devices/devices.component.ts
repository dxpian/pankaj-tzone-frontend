import { SelectionModel } from '@angular/cdk/collections';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, Subscription, debounceTime, switchMap, takeUntil} from 'rxjs';
 import { DeviceManagementService } from '../device-management.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { snackBarConfig, snackBarConfigWarn, resolveRequestError } from 'app/constants/globalFunctions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../../../../services/socket.service';
import { DB_RESULT, PageData, PageQuery, Device, DeviceFilterType, isWebAdminPermission, PERMISSION, DownloadDeviceListItem, DeviceStatusOverview, LoggerStatusFilterItem, DeviceRealTime } from '../../utils/typedef';
import { saveAs } from 'file-saver';
import { identity } from 'lodash';
import { GroupConfig, USER_ROLE } from '../../account/account.typedef';
import { SharedService } from '../../../../services/shared.service';
import { Language } from '../../service/message-push-service/email/email.component';
import { normalizeString } from '../../service/alfresa/alfresa.util';
import { GoogleMap } from '@angular/google-maps';
import { environment } from '../../../../enviroment/enviroment';
import { AlarmType } from '../../alarm-settings/alarm-listing/alarm-listing.component';
import {
    LIST_BROWSE_DEVICE_MANAGEMENT_KEY,
    LoggerViewMode,
    readListBrowseState,
    writeListBrowseState
} from '../../utils/list-browse-state.storage';

@Component({
  selector: 'app-devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss']
})
export class DevicesComponent implements OnInit {
    messages: any[] = [];
    // private messageSubscription: Subscription;
    @ViewChild('addDevice') AddDevice: any;
    @ViewChild(GoogleMap) map!: GoogleMap;

    public selection = new SelectionModel<any>(true, []);
    displayedColumns: string[] = ['id', 'name', 'serial', 'model', 'groups', 'time', 'cond', 'SIM', 'Actions'];
    public dataSource = new MatTableDataSource<any>()
    tableData = [];
    //totalRecords: number;
    showData = false;

    FilterType = DeviceFilterType
    filter: DeviceFilterType = DeviceFilterType.All
    //pageSize = 10
    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    public dialogRef: any;

    deviceSelected: Device;
    mapOptions: google.maps.MapOptions = {
        mapTypeControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    center: google.maps.LatLngLiteral = {lat: 35.778042336472616, lng: 139.6493180124624};


    _pageQuery: PageQuery = {
        page: 0,
        pagesize: 20,
        keyword: '',
        cursor:null,
        total: 0,
        keyChanged: true,
        filter: this.filter
    }

    searchInputControl = new FormControl();
    templates: any = [];
    searchVal = ''
    public searchValue = new Subject<number>();
    public searchValueSubscriber: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    deviceForm: FormGroup
    userInfo: any;
    currentTime: Date;
    editState: boolean = false;
    groups: GroupConfig[] = [];
    intervalId: any;
    USER_ROLE = USER_ROLE
    lng = Language.ENG
    downloadingLoggers = false;
    viewMode: LoggerViewMode = 'list';
    deviceCardData: DeviceRealTime[] = [];
    showSim = environment.showSimExpire;
    offset = 0;
    readonly listPageSizeOptions = [20, 50, 100, 200];
    readonly cardPageSizeOptions = [20, 40, 60, 80, 100];
    statusOverview: DeviceStatusOverview = {
        total: 0,
        online: 0,
        offline: 0,
        userAlarm: 0,
        batteryLow: 0,
        batteryDead: 0,
        airplane: 0,
        simExpire: 0,
    };

    readonly statusFilterItems: LoggerStatusFilterItem[] = [
        { filter: DeviceFilterType.All, label: 'All', countKey: 'total', color: '#1e3a5f', tooltip: 'All loggers matching the keyword' },
        { filter: DeviceFilterType.Online, label: 'Online', countKey: 'online', color: '#22c55e', tooltip: 'Loggers currently online' },
        { filter: DeviceFilterType.UserAlarm, label: 'Alarm', countKey: 'userAlarm', color: '#dc2626', tooltip: 'Loggers with active user alarms' },
        { filter: DeviceFilterType.BatteryLow, label: 'Low Battery', countKey: 'batteryLow', color: '#ef4444', tooltip: 'Loggers with low battery' },
        { filter: DeviceFilterType.BatteryDead, label: 'Battery Dead', countKey: 'batteryDead', color: '#383838', tooltip: 'Loggers with dead battery' },
        { filter: DeviceFilterType.Flight, label: 'Flight', countKey: 'airplane', color: '#eab308', tooltip: 'Loggers in flight / sleep mode' },
        { filter: DeviceFilterType.Offline, label: 'Offline', countKey: 'offline', color: '#000000', tooltip: 'Loggers currently offline' },
        { filter: DeviceFilterType.SimExpire, label: 'SIM Expired', countKey: 'simExpire', color: '#b80808', tooltip: 'Loggers with expired SIM cards' },
    ];

    constructor(private _serviceDevice: DeviceManagementService, public dialog: MatDialog,
        private _formBuilder:FormBuilder,
        private _snackBar: MatSnackBar,
        private _route:Router,
        private _activatedRoute: ActivatedRoute,
        private _cdr:ChangeDetectorRef,
        private _serviceShared: SharedService,
        ) {
    }

    ngOnInit(): void {
        this.currentTime = new Date();

        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))

        const timezone = this.userInfo?.timezone;
        try {
            this.offset = parseFloat(timezone);
            if (isNaN(this.offset)) {
                this.offset = 0;
            }
        } catch {
            this.offset = 0;
        }

        const queryView = this._activatedRoute.snapshot.queryParamMap.get('view');
        if (queryView === 'card' || queryView === 'list') {
            this.viewMode = queryView;
        }

        this.getGroups();

        setTimeout(() => {
        this.searchInputControl.valueChanges
            .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {
                this._pageQuery.keyword = query.toString().trim();
                this._pageQuery.keyChanged = true;
                this.paginator.pageIndex = 0;
                return this.fetchPage(0, this.paginator.pageSize, this._pageQuery.keyword, true,
                this._pageQuery.total
                );
            })
            )
            .subscribe({
            next: (response) => {
                this.updateDataSource(response);
                this.loadStatusOverview();
            },
            error: (err) => console.error(err),
            });
        });
        this.createDeviceForm();

        this.intervalId = setInterval(() => {
            this.refreshPageContent();
        }, 60* 1000);
    }

    ngAfterViewInit(): void {
        const saved = readListBrowseState(LIST_BROWSE_DEVICE_MANAGEMENT_KEY);
        this._pageQuery.pagesize = this.paginator.pageSize;
        if (saved) {
            this.filter = saved.filter as DeviceFilterType;
            this._pageQuery.keyword = saved.keyword;
            this.searchInputControl.setValue(saved.keyword, { emitEvent: false });
            if (saved.viewMode === 'card' || saved.viewMode === 'list') {
                this.viewMode = saved.viewMode;
            }
            const allowedSizes = this.getPageSizeOptions();
            const pageSize = allowedSizes.includes(saved.pageSize) ? saved.pageSize : this.paginator.pageSize;
            this.paginator.pageSize = pageSize;
            this._pageQuery.pagesize = pageSize;
            this.paginator.pageIndex = Math.max(0, saved.pageIndex);
            this._pageQuery.keyChanged = true;
        } else {
            this._pageQuery.keyChanged = true;
        }
        this.getDevices(this.userInfo?.id);
    }

    get pageSizeOptions(): number[] {
        return this.getPageSizeOptions();
    }

    private getPageSizeOptions(): number[] {
        return this.viewMode === 'card' ? this.cardPageSizeOptions : this.listPageSizeOptions;
    }

    setViewMode(mode: LoggerViewMode): void {
        if (this.viewMode === mode) {
            return;
        }
        this.viewMode = mode;
        this.paginator.pageIndex = 0;
        this._pageQuery.keyChanged = true;
        const allowedSizes = this.getPageSizeOptions();
        if (!allowedSizes.includes(this.paginator.pageSize)) {
            this.paginator.pageSize = allowedSizes[0];
            this._pageQuery.pagesize = allowedSizes[0];
        }
        this.fetchPage(this.paginator.pageIndex, this.paginator.pageSize,
            this._pageQuery.keyword, true,
            this._pageQuery.total
        ).then((response: any) => {
            this.updateDataSource(response);
            this.loadStatusOverview();
        }).catch((err: HttpErrorResponse) => console.log(err));
    }

    private persistBrowseState(): void {
        const keyword = (this.searchInputControl.value ?? '').toString().trim()
            || (this._pageQuery.keyword || '');
        writeListBrowseState(LIST_BROWSE_DEVICE_MANAGEMENT_KEY, {
            filter: this.filter,
            keyword,
            pageIndex: this.paginator?.pageIndex ?? 0,
            pageSize: this.paginator?.pageSize ?? this._pageQuery.pagesize,
            viewMode: this.viewMode,
        });
    }

    ngOnDestroy(): void {

    }

    private refreshPageContent(){
        const page = this._pageQuery.page - 1
        this.fetchPage(page, this._pageQuery.pagesize,
            this._pageQuery.keyword, this._pageQuery.keyChanged,
            this._pageQuery.total
        ).then((response: any) => {
            this.updateDataSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
        this.loadStatusOverview();
    }

    onPageChange(event: any): void {
        // this._pageQuery.pagesize = event.pageSize
        this._pageQuery.cursor = null;
        this.fetchPage(event.pageIndex, event.pageSize,
        this._pageQuery.keyword, this._pageQuery.keyChanged,
        this._pageQuery.total
        ).then((response: any) => {
        this.updateDataSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    selectFilter(filterType: DeviceFilterType): void {
        this.filter = filterType;
        this._pageQuery.filter = filterType;
        this.paginator.pageIndex = 0;
        this.fetchPage(this.paginator.pageIndex, this.paginator.pageSize,
            this._pageQuery.keyword, true,
            this._pageQuery.total
        ).then((response: any) => {
            this.updateDataSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    getStatusCount(item: LoggerStatusFilterItem): number {
        return this.statusOverview[item.countKey] ?? 0;
    }

    loadStatusOverview(): void {
        const keyword = (this.searchInputControl.value ?? this._pageQuery.keyword ?? '').toString().trim();
        this._serviceDevice.getOverviewDeviceLists({ keyword })
            .then((res: DB_RESULT) => {
                if (res && !res.error_code && res.object) {
                    this.statusOverview = { ...this.statusOverview, ...(res.object as DeviceStatusOverview) };
                    this._cdr.detectChanges();
                }
            })
            .catch((err) => console.error('Failed to load logger status overview:', err));
    }

    fetchPage(pageIndex: number, pageSize: number, keyword: string, keyChanged: boolean, total: number) {
        console.log(`original page query item: ${JSON.stringify(this._pageQuery)}`)
        const query: PageQuery = {
            page: pageIndex + 1,
            pagesize: pageSize,
            keyword: keyword || '',
            keyChanged: keyChanged !== undefined ? keyChanged : true,
            total: total || 0,
            filter: this.filter,
        }
        if (this.viewMode === 'card') {
            return this._serviceDevice.getUserDeviceDetailsWithPage(this.userInfo.id, query);
        }
        return this._serviceDevice.getUserDeviceWithPage(this.userInfo.id, query);
    }

    // data sources is updated
    updateDataSource(response: any): void {
        const res = response as DB_RESULT

        if(res && !res.error_code){
            const pageData = res.object as PageData
            if (this.viewMode === 'card') {
                this.deviceCardData = (pageData.data || []) as DeviceRealTime[];
                this.deviceCardData.forEach(data => {
                    if (data?.state) {
                        data.state.isRecentAlarm = this.isRecentAlarm(data);
                    }
                });
            } else {
                this.dataSource.data = pageData.data as Device[]
            }
            this._pageQuery.total = pageData.total
            this._pageQuery.cursor = pageData.cursor
            this._pageQuery.keyChanged = false
        }
        else{
            console.log(`failed to get api response: ${res}`)
            if (this.viewMode === 'card') {
                this.deviceCardData = [];
            } else {
                this.dataSource.data = []
            }
            this._pageQuery.total = 0
        }
    }

    getDevices(id){
        this.fetchPage(this.paginator.pageIndex, this._pageQuery.pagesize,
        this._pageQuery.keyword, this._pageQuery.keyChanged,
        this._pageQuery.total).then((response: any) => {
        this.updateDataSource(response);
        this.loadStatusOverview();
        }).catch((err: HttpErrorResponse) => (console.log));
    }


    getGroups() {
        this._serviceDevice.getDeviceGroups().then((res:any) => {
        if(res && !res.error_code) {
            this.groups = res.object;
        }
        })
    }


    createDeviceForm() {
        this.deviceForm = this._formBuilder.group({
            "id":[''],
            "user": [this.userInfo?.id],
            "name": ['', Validators.required],
            "serial": ['', Validators.required],
            "groups": [''],
            "model": ['TT19', Validators.required],
            "simstart": [''],
            "simexpire": [''],
            "time": [this.currentTime],
            "cond": [1],
            "gps_enabled": [false],   // gps enabled?
            "gps_interval": [360],      // gps interval time
        });

        if(!this.isStdUser()){ // not standard user. change defualt group
            if(this.groups.length > 0){
                const grpId = this.groups[0].id
                this.deviceForm.get('groups').setValue(grpId)
            }
        }
    }

    patchDeviceForm(){
        this.editState = true
        this.createDeviceForm()
        this.deviceForm.patchValue(this.deviceSelected);
        if(this.deviceSelected.groups==null)
            this.deviceForm.get('groups').setValue('')
    }


    // Add a method to check online/offline state based on the last log time
    getDeviceStatusLabel(device: Device){
        if(device.status == DeviceFilterType.Online)
            return "Online"
        if(device.status == DeviceFilterType.BatteryDead)
            return "Battery dead"
        if(device.status == DeviceFilterType.BatteryLow)
            return "Low battery"
        if(device.status == DeviceFilterType.Offline)
            return "Offline"
        if(device.status == DeviceFilterType.Flight)
            return "Sleep"
        if(device.status == DeviceFilterType.UserAlarm)
            return "Alarm"
        if(device.status == DeviceFilterType.SimExpire)
            return "SIM expired"
        return "Unknown"
    }

    viewDevice(item) {
        this.persistBrowseState();
        this._route.navigate([`device/${item.id}`], { queryParams: { data: JSON.stringify(item) } });
    }

    copyDeviceSerial(serial: unknown, event?: Event): void {
        event?.stopPropagation();
        const text = String(serial ?? '').trim();
        if (!text) {
            return;
        }
        navigator.clipboard?.writeText(text).then(() => {
            this._snackBar.open('Serial number copied', '', snackBarConfig);
        }).catch(() => {
            this._snackBar.open('Could not copy serial number', '', snackBarConfigWarn);
        });
    }

    isAdmin(): boolean{
            const p = this._serviceShared.getPermission();
            return isWebAdminPermission(p) || p >= PERMISSION.DEVELOPER;
    }


    isStdUser(): boolean{
        return (this._serviceShared.getAccountRole() == USER_ROLE.STD)? true: false
    }

    getGroupName(groupid): string{
        if(!groupid)
            return 'Default'
        const group = this.groups.find(g=>g.id == groupid)
        return (group)? group.groupname: 'Default'
    }

    hasHeartBit(item: Device): boolean{
        return (item.time_heart)? true: false
    }

    getHeartBitColor(item: { time_heart?: string }): string {
        if (!item.time_heart) return 'black';
        const heartBitTime = new Date(item.time_heart);
        const now = new Date();
        const diffMs = now.getTime() - heartBitTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours <= 24 ? 'blue' : 'black';
    }

    saveDeviceDetails() {
        const name = normalizeString(this.deviceForm.value.name as string);
        const serial = normalizeString(this.deviceForm.value.serial as string);
        const model = this.deviceForm.value.model as string;
        const group = this.deviceForm.value.groups as string;

        if(!name || name.length <= 2){
            this._snackBar.open(`Invalid device name`, '', snackBarConfigWarn)
            return;
        }

        const valid_serial = /^\d{15}$/.test(serial);
        if(!valid_serial){
            this._snackBar.open(`Invalid device serial ID`, '', snackBarConfigWarn)
            return;
        }

        if(!group){
            if(!this.isStdUser()){ // sub user cant' addd device as default grup
                this._snackBar.open(`Invalid device group`, '', snackBarConfigWarn)
                return;
            }
        }

        if(!model){
            this._snackBar.open(`Invalid device model`, '', snackBarConfigWarn)
            return;
        }

        // check start/expire date
        const sim_start = this.deviceForm.value.simstart
        const sim_expire = this.deviceForm.value.simexpire
        if(sim_start && sim_expire && sim_start > sim_expire){
            this._snackBar.open(`Invalid SIM card expiration time`, '', snackBarConfigWarn)
            return
        }

        if(!this.editState) {
            this._serviceDevice.saveDevices(this.deviceForm.value).then((res:any) => {
                if(res && !res.error_code) {
                    this._snackBar.open('Device Added Successfully', '', snackBarConfig);
                    this.getDevices(this.userInfo.id);
                    this.cancel();
                } else {
                    this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
                }
            })
        }
        else {
            this._serviceDevice.editDevices(this.deviceForm.value).then((res:any) => {
            if(res && !res.error_code) {
                this._snackBar.open('Device Updated Successfully', '', snackBarConfig);
                this.getDevices(this.userInfo.id);
                this.cancel();
            } else {
                this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
                }
            })
        }
    }



    openDialog(action: string, item?) {
        switch(action){
            case 'add':
                this.createDeviceForm()
                this.editState = false;
                this.dialog.open(this.AddDevice, { width: '800px', height: '800px',  panelClass: 'custom-modalbox', disableClose: true });
                //this.loadMap();
                break;
            case 'edit':

                this.deviceSelected = item
                this.patchDeviceForm()
                this.dialog.open(this.AddDevice, { width: '800px', height: '800px', panelClass: 'custom-modalbox', disableClose: true });

                break;
            case 'delete':
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
                this.dialogRef.componentInstance.data = {
                    title: "Delete Device?",
                    message: "Are you sure you want to delete this device?"
                }
                this.dialogRef.afterClosed().subscribe((result) => {
                    if (result) {
                        this.ConfirmdeleteDevice(item)
                    }
                })
                break;
            default:
                break;
        }
    }

    ConfirmdeleteDevice(item) {
        this._serviceDevice.deleteDevicebyId(item.id).then((res:any) => {
        if(res && !res.error_code) {
            this._snackBar.open('Device Deleted Successfully', '', snackBarConfig);
            this.getDevices(this.userInfo.id);
        }
        })
    }

    cancel() {
        this.editState = false;
        this.dialog.closeAll();
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


    private notifyDialog(message: string, closeDialog = true){
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
        this.dialogRef.componentInstance.data = {
            title: "Notification",
            message: message
        }
        this.dialogRef.afterClosed().subscribe((result) => {
            if(closeDialog)
                this.cancel()
        })
    }

    private warning(message: string[] | string) {
        if(typeof message == 'string')
           this._snackBar.open(message, '', snackBarConfigWarn)
        else
            this._snackBar.open(message[this.lng], '', snackBarConfigWarn)
    }

    private notify(message: string[] | string ) {
        if(typeof message == 'string')
            this._snackBar.open(message, '', snackBarConfig)
        else
            this._snackBar.open(message[this.lng], '', snackBarConfig)
    }

    async downloadLoggersCsv(): Promise<void> {
        if (this.downloadingLoggers) {
            return;
        }
        this.downloadingLoggers = true;
        try {
            const res = await this._serviceDevice.downloadDeviceLists({
                keyword: (this.searchInputControl.value ?? this._pageQuery.keyword ?? '').toString().trim(),
                filter: this.filter,
            }) as DB_RESULT;

            if (!res || res.error_code) {
                this.warning(res?.meta || 'Unable to download logger list');
                return;
            }

            const devices = (res.object || []) as DownloadDeviceListItem[];
            if (devices.length === 0) {
                this.warning('No loggers found for the current keyword and filter');
                return;
            }

            const csv = this.buildLoggerCsv(devices);
            const stamp = new Date().toISOString().slice(0, 10);
            saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `loggers_${stamp}.csv`);
            this.notify(`Downloaded ${devices.length} logger(s)`);
        } catch (err) {
            console.error('Logger CSV download failed:', err);
            this.warning(resolveRequestError(err, 'Unable to download logger list'));
        } finally {
            this.downloadingLoggers = false;
            this._cdr.detectChanges();
        }
    }

    private buildLoggerCsv(devices: DownloadDeviceListItem[]): string {
        const header = ['index', 'name', 'serial'];
        const lines = [header.join(',')];
        devices.forEach((device, index) => {
            lines.push([
                index + 1,
                this.escapeCsvField(device.name),
                this.escapeCsvField(device.serial),
            ].join(','));
        });
        return lines.join('\r\n');
    }

    private escapeCsvField(value: unknown): string {
        const text = String(value ?? '');
        if (/[",\n\r]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }

    getBatteryImg(battery: number): string {
        if (battery >= 90) {
            return 'assets/images/device/battery_100.png';
        }
        if (battery < 90 && battery >= 70) {
            return 'assets/images/device/battery_80.png';
        }
        if (battery < 70 && battery >= 50) {
            return 'assets/images/device/battery_60.png';
        }
        if (battery < 50 && battery >= 30) {
            return 'assets/images/device/battery_40.png';
        }
        if (battery < 30 && battery >= 10) {
            return 'assets/images/device/battery_20.png';
        }
        return 'assets/images/device/battery_0.png';
    }

    getItemExpression(item: DeviceRealTime | null, itemtype: string): string {
        if (itemtype === 'temperature') {
            return (item?.state?.temperature != null) ? item.state.temperature + '℃' : '--℃';
        }
        if (itemtype === 'ext_temperature') {
            return (item?.state?.tempexternal != null) ? item.state.tempexternal + '℃' : '--℃';
        }
        if (itemtype === 'humidity') {
            return (item?.state?.humidity != null) ? item.state.humidity + '%' : '--%';
        }
        if (itemtype === 'light') {
            return (item?.state?.light != null) ? item.state.light + 'Lux' : '--Lux';
        }
        if (itemtype === 'vibration') {
            return (item?.state?.vibration != null) ? item.state.vibration + 'mg' : '--mg';
        }
        if (itemtype === 'location') {
            return (item?.state?.city) ? item.state.city : '--';
        }
        if (itemtype === 'sim') {
            return (item?.simexpire) ? item.simexpire.slice(0, 10) : '--';
        }
        if (itemtype === 'alarm') {
            return (item?.state?.alarmTime) ? item.state.alarmTime.slice(0, 16) : '--';
        }
        return '--';
    }

    hasHeartBitTime(item: DeviceRealTime): boolean {
        return !!item.time_heart;
    }

    isRecentAlarm(item: DeviceRealTime): boolean {
        if (!item.state?.alarmTime) {
            return false;
        }

        const currentTime = new Date();
        const offsetMinutes = -currentTime.getTimezoneOffset();
        const newOffsetMinutes = this.offset * 60;
        const diffMinutes = newOffsetMinutes - offsetMinutes;
        currentTime.setTime(currentTime.getTime() + diffMinutes * 60 * 1000);

        const lastModifiedTime = new Date(item.state.alarmTime.toString());
        const timeDifference = currentTime.getTime() - lastModifiedTime.getTime();
        const hoursDifference = timeDifference / (1000 * 3600);
        return hoursDifference < environment.activeAlarmHours;
    }

    getAlarmType(item: DeviceRealTime): string {
        if (item?.state?.alarmType == undefined) {
            return '';
        }
        const alarmType = item.state.alarmType;
        switch (alarmType) {
            case AlarmType.Temperature:
                return 'Temperature alarm';
            case AlarmType.Humidity:
                return 'Humidity alarm';
            case AlarmType.Light:
                return 'Light alarm';
            case AlarmType.Vibration:
                return 'Vibration alarm';
            case AlarmType.Battery:
                return 'Battery alarm';
            case AlarmType.SIM:
                return 'SIM card expiration alarm';
            case AlarmType.ProbTemperature:
                return 'Prob temperature alarm';
            default:
                return '';
        }
    }

}
