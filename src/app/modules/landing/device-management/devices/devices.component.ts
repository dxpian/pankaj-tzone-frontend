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
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';
import { SocketService } from '../../../../services/socket.service';
import { DB_RESULT, PageData, PageQuery, Device, DeviceFilterType, isWebAdminPermission, PERMISSION } from '../../utils/typedef';
import { identity } from 'lodash';
import { GroupConfig, USER_ROLE } from '../../account/account.typedef';
import { SharedService } from '../../../../services/shared.service';
import { Language } from '../../service/message-push-service/email/email.component';
import { normalizeString } from '../../service/alfresa/alfresa.util';
import { GoogleMap } from '@angular/google-maps';
import {
    LIST_BROWSE_DEVICE_MANAGEMENT_KEY,
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

    constructor(private _serviceDevice: DeviceManagementService, public dialog: MatDialog,
        private _formBuilder:FormBuilder,
        private _snackBar: MatSnackBar,
        private _route:Router,
        private _cdr:ChangeDetectorRef,
        private _serviceShared: SharedService,
        ) {
    }

    ngOnInit(): void {
        this.currentTime = new Date();

        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))

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
            next: (response) => this.updateDataSource(response),
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
            const allowedSizes = [20, 50, 100, 200];
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

    onFilterChange(event: any): void{
        console.log('Filter value is changed:', event.value);
        this.filter = event.value
        this.paginator.pageIndex = 0;
        this.fetchPage(this.paginator.pageIndex, this.paginator.pageSize,
        this._pageQuery.keyword, this._pageQuery.keyChanged,
        this._pageQuery.total
        ).then((response: any) => {
        this.updateDataSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));

    }

    fetchPage(pageIndex: number, pageSize: number, keyword: string, keyChanged: boolean, total: number) {
        console.log(`original page query item: ${JSON.stringify(this._pageQuery)}`)
        const query: PageQuery = {
            page: pageIndex + 1,
            pagesize: pageSize,
            keyword: keyword || '',
            keyChanged: keyChanged !== undefined ? keyChanged : true,
            total: total || 0, // Ensure `total` is always defined
            filter: this.filter,
        }
        return this._serviceDevice.getUserDeviceWithPage(this.userInfo.id, query);
    }

    // data sources is updated
    updateDataSource(response: any): void {
        const res = response as DB_RESULT

        if(res && !res.error_code){
            const pageData = res.object as PageData
            this.dataSource.data = pageData.data as Device[]
            this._pageQuery.total = pageData.total
            this._pageQuery.cursor = pageData.cursor
            this._pageQuery.keyChanged = false
        }
        else{
            console.log(`failed to get api response: ${res}`)
            this.dataSource.data = []
            this._pageQuery.total = 0
        }
    }

    getDevices(id){
        this.fetchPage(this.paginator.pageIndex, this._pageQuery.pagesize,
        this._pageQuery.keyword, this._pageQuery.keyChanged,
        this._pageQuery.total).then((response: any) => {
        this.updateDataSource(response);
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
        const keyword = (this.searchInputControl.value ?? '').toString().trim()
            || (this._pageQuery.keyword || '');
        writeListBrowseState(LIST_BROWSE_DEVICE_MANAGEMENT_KEY, {
            filter: this.filter,
            keyword,
            pageIndex: this.paginator?.pageIndex ?? 0,
            pageSize: this.paginator?.pageSize ?? this._pageQuery.pagesize,
        });
        this._route.navigate([`device/${item.id}`], { queryParams: { data: JSON.stringify(item) } });
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

    getHeartBitColor(item: Device): string {
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


}
