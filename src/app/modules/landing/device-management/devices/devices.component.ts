import { SelectionModel } from '@angular/cdk/collections';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, Subscription, debounceTime, switchMap, takeUntil,from, concatMap, finalize} from 'rxjs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
 import { DeviceManagementService } from '../device-management.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';
import { SocketService } from 'app/services/socket.service';
import { DB_RESULT, PageData, PageQuery, Device, DeviceFilterType, PERMISSION } from '../../utils/typedef';
import { identity } from 'lodash';
import { GroupConfig, USER_ROLE } from '../../account/account.typedef';
import { SharedService } from 'app/services/shared.service';
import { Language } from '../../service/message-push-service/email/email.component';
import { normalizeString } from '../../service/alfresa/alfresa.util';
import { GoogleMap } from '@angular/google-maps';

interface DeviceExcel{
    name: string;
    serial: string;
    enable_gps: boolean;
    group: string;
    sim_expire: Date;
}

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

    ////////////////////////////
    devicesExcel: DeviceExcel[] = []

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
        }, 60* 1000 * 5);
    }

    ngAfterViewInit(): void {
        this._pageQuery.pagesize = this.paginator.pageSize;
        this._pageQuery.keyChanged = true
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
        this._route.navigate([`device/${item.id}`], { queryParams: { data: JSON.stringify(item) } });
    }

    isAdmin(): boolean{
            return (this._serviceShared.getPermission() >= PERMISSION.ADMIN)? true: false
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
            case 'register_batch':
                console.log(`Register multiple loggers `)
                this.registerLoggersUploaded()
                break
            case 'download_template':
                this.downloadScheduleTemplate()
                break
            default:
                break;
        }
    }

    // upload multiple loggers uploaded from excel file
    private registerLoggersUploaded(){
        console.log(`register multiple loggers: ${this.devicesExcel.length}`)
        if(this.devicesExcel.length <= 0){
            this.warning(`No loggers upload`)
            return
        }
        var errors: string[] = []
        from(this.devicesExcel).pipe(
            concatMap((data, index) =>{
                const cfg=
                {
                    user: this.userInfo?.id,
                    name: data.name,
                    serial: data.serial,
                    groups: data.group,
                    model: 'TT19',
                    simexpire: data.sim_expire,
                    time: this.currentTime,
                    cond: 1,
                    gps_enabled: data.enable_gps,   // gps enabled?
                    gps_interval: 360,      // gps interval time
                }
                return this._serviceDevice.saveDevices(cfg).then((response: DB_RESULT)=>{
                    if(response && response.error_code == 0){
                        const devNew = response.object as Device
                        console.log(`Success to add new device: ${data.serial}`)
                    }else{
                        console.log(`Failed to create schedule: ${response.meta}`)
                        if(response.meta.length <= 128)
                            errors.push(response.meta)
                    }
                })}
            ),
            finalize(() => {
                // console.log('✅ All schedules processed');
                if(errors.length > 0){
                    const message = `Error occured in processing ${errors.length} loggers`
                    this.notifyDialog(message)
                }
                else{
                    this.notifyDialog(`All schedules are processed`)
                }
                this.devicesExcel = []
            })
        )
        .subscribe({
            error: (err) => {
                console.log('❌ Error occurred during batch processing', err);
            }
        });
    }

    private downloadScheduleTemplate(){
        console.log(`Download an template excel file to create calibration schedule from excel file`)
        this._serviceDevice.downloadRegisterTemplateFile().then((res: Blob)=>{
            if (res.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    const errorText = reader.result as string;
                    try {
                        const errorJson = JSON.parse(errorText);
                        console.error('Server returned error:', errorJson);
                        // Show the error to user
                        this.warning('Failed to download template');
                    } catch (e) {
                        console.error('Unknown error format:', errorText);
                        this.warning('Unknown error occurred while downloading template');
                    }
                };
                reader.readAsText(res);
            } else {
                // Valid Excel file - save it
                saveAs(res, `schedule_template.xlsx`);
                this.notify('Success to download shcedule template file')
            }
        })
    }


    private parseLoggerExcelfile(file: File): Promise<DeviceExcel[]> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const binaryStr: string = e.target.result;
            const workbook: XLSX.WorkBook = XLSX.read(binaryStr, { type: 'binary' });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

            const result: DeviceExcel[] = [];

            for (let i = 0; i < rawData.length; i++) {
              const row = rawData[i];
              const rowNum = i + 2; // +2 to reflect real Excel row (header is row 1)

              // Validate and parse each field
              const name = String(row['logger_name']).trim()
              const serial = String(row['serial']).trim();
              const enable_gps = String(row['enable_gps']).trim()
              const group = String(row['group_name']).trim()
              const dateExpire = new Date(row['sim_expired']);


              // Validation
              if (!/^.+$/.test(name)) {
                throw `Row ${rowNum}: Invalid logger name: ${name}`;
              }
              if (!/^\d{15}$/.test(serial)) {
                throw `Row ${rowNum}: Invalid serial number: ${serial}`;
              }
              if (!/^[01]$/.test(enable_gps)) {
                throw `Row ${rowNum}: Invalid value for enable gps status: ${enable_gps}`;
              }

              if (isNaN(dateExpire.getTime())) {
                throw `Row ${rowNum}: Invalid sim-expiration date: ${row['sim_expired']}`;
              }
              if (!/^.+$/.test(group)) {
                throw `Row ${rowNum}: Invalid group name: ${group}`;
              }

              console.log(`valid groups: ${JSON.stringify(this.groups)}`)

              // check if this group name exists
              const foundGroup = this.groups.find(
                g => g.groupname?.toLowerCase() === group.toLowerCase()
              );


              result.push({
                name: name,
                serial: serial,
                enable_gps: parseInt(enable_gps) > 0? true: false,
                group: foundGroup?.id || '',
                sim_expire: dateExpire
              });
            }
            resolve(result);
          } catch (err) {
            reject(err);
          }
        };

        reader.onerror = () => {
          reject('Failed to read the file.');
        };

        reader.readAsBinaryString(file);
      });
    }

    onSelectSchduleFile(event){
        const file: File = event.target.files[0];
        this.devicesExcel = []
        if (!file) return;
        this.parseLoggerExcelfile(file)
            .then((data: DeviceExcel[]) => {
            this.devicesExcel = [...data]
            console.log(`Success to parse excel file: ${data.length}`)
            const message = `${data.length} loggers detected for registration from this file.`
            this.notifyDialog(message)

        })
        .catch((err) => {
            console.error('Parsing error:', err);
            this.notifyDialog(`Error in Excel file: ${err}`);
        });
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
