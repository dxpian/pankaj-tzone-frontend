import { SelectionModel } from '@angular/cdk/collections';
import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { DeviceManagementService } from '../../device-management.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { SocketCommandService } from 'app/services/socketCommand.service';
import { DownlinkCommand, isWebAdminPermission, PERMISSION } from 'app/modules/landing/utils/typedef';
import { Language } from 'app/modules/landing/service/message-push-service/email/email.component';
import { SharedService } from 'app/services/shared.service';



@Component({
  selector: 'app-set-up',
  templateUrl: './set-up.component.html',
  styleUrls: ['./set-up.component.scss']
})
export class SetUpComponent implements OnInit, OnChanges {

    @Input() deviceId
    @Input() deviceSerial

    public selection = new SelectionModel<any>(true, []);
    displayedColumns: string[] = ['id', 'command', 'description', 'created', 'condition','reply', 'response', 'operate'];
    public dataSource = new MatTableDataSource<DownlinkCommand>()
    tableData = [];
    totalRecords: number;
    showData = false;
    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    public dialogRef: any;
    searchkeyword = ''
    searchInputControl = new FormControl();
    public search: any = {
        "pageNumber": 1,
        "displayCount": 5,
        name: undefined,
        statusType: 0
    };
    isSearch: boolean;
    isNoRecord: boolean = false;
    templates: any = [];
    searchVal = ''
    public searchValue = new Subject<number>();
    public searchValueSubscriber: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    deviceForm: FormGroup
    editState: boolean = false;
    setupIntervalForm: FormGroup
    setGPSForm: FormGroup;
    setAirplaneModeForm: FormGroup;
    setCommandForm: FormGroup
    enableCommand = true
    permission = PERMISSION.NORMAL

    maxAirplaneMinutes = 65535;
    year_options_enter: number[] = [];
    month_options_enter: number[] = [];
    day_options_enter: number[] = [];
    year_options_exit: number[] = [];
    month_options_exit: number[] = [];
    day_options_exit: number[] = [];
    hour_options: number[] = [];
    minutes_options: number[] = []

    air_year_min = 0;
    air_year_max = 0;
    air_mon_min = 0;
    air_mon_max = 0;
    air_day_min = 0;
    air_day_max = 0;

    air_times = [0,0,0,0,0,0,0,0,0,0]
    private lng = Language.ENG

    TIME_TYPE = {
        ENT_YEAR: 0,
        ENT_MON: 1,
        ENT_DAY: 2,
        ENT_HOUR: 3,
        ENT_MIN: 4,
        EXT_YEAR: 5,
        EXT_MON: 6,
        EXT_DAY: 7,
        EXT_HOUR: 8,
        EXT_MIN: 9
    }

    getMaxDay(year: number, month: number){
        var date = new Date(year, month, 0);
        return date.getDate();
    }

    initialize_airplane_mode_options(){
        const now = new Date();
        this.air_year_min = now.getFullYear();
        this.air_year_max = this.air_year_min + 50; // this.getMaxYearAfterMinutes(now, this.maxAirplaneMinutes)
        this.air_mon_min= now.getMonth() + 1;
        this.air_mon_max = 12; //this.getMaxMonthAfterMinutes(now, this.maxAirplaneMinutes);
        this.air_day_min = now.getDate();
        this.air_day_max = this.getMaxDateAfterMinutes(now, this.maxAirplaneMinutes)

        // set year:
        this.year_options_enter.length = 0;
        this.year_options_exit.length = 0;
        this.month_options_enter.length = 0;
        this.month_options_exit.length = 0;
        this.day_options_enter.length = 0;
        this.day_options_exit.length = 0;
        this.hour_options.length = 0;
        this.minutes_options.length = 0;
        for(let i = this.air_year_min; i <= this.air_year_max; i ++){
            this.year_options_enter.push(i);
            this.year_options_exit.push(i);
        }
        for(let i = this.air_mon_min; i <= this.air_mon_max; i ++ )
        {
            this.month_options_enter.push(i);
            this.month_options_exit.push(i);
        }
        // day
        const maxDays = this.getMaxDay(this.air_year_min, this.air_mon_min);

        for(let i = 1; i <= maxDays; i ++){
            this.day_options_enter.push(i);
            this.day_options_exit.push(i);
        }

        for(let i = 0; i <= 23; i ++ ){
            this.hour_options.push(i);
        }
        for(let i = 0; i <= 59; i ++){
            this.minutes_options.push(i)
        }
        this.air_times[this.TIME_TYPE.ENT_YEAR] = this.getMaxYearAfterMinutes(now, 60 * 24);
        this.air_times[this.TIME_TYPE.EXT_YEAR] = this.getMaxYearAfterMinutes(now, 60 * 24 * 2);
        this.air_times[this.TIME_TYPE.ENT_MON] = this.getMaxMonthAfterMinutes(now, 60 * 24);
        this.air_times[this.TIME_TYPE.EXT_MON] = this.getMaxMonthAfterMinutes(now, 60 * 24 * 2);
        this.air_times[this.TIME_TYPE.ENT_DAY] = this.getMaxDateAfterMinutes(now, 60 * 24);
        this.air_times[this.TIME_TYPE.EXT_DAY] = this.getMaxDateAfterMinutes(now, 60 * 24 * 2);
        this.air_times[this.TIME_TYPE.ENT_HOUR] = 12;
        this.air_times[this.TIME_TYPE.EXT_HOUR] = 12;
        this.air_times[this.TIME_TYPE.ENT_MIN] = 30;
        this.air_times[this.TIME_TYPE.EXT_MIN] = 30;


    }

    AirplaneTimeChange(time_type: number, event: any){
        console.log(`optoin changed: ${time_type}: ${event.value}`)
        const value = event.value;
        if(time_type === this.TIME_TYPE.ENT_YEAR){ // go to next year.
            if(value > this.air_year_min) // go to next year. set month from January
            {
                this.month_options_enter.length = 0;
                for(let i  = 1; i <= this.air_mon_max; i ++){
                    this.month_options_enter.push(i);
                }
                const maxDays = this.getMaxDay(value, this.air_times[this.TIME_TYPE.ENT_MON]);
                this.air_times[this.TIME_TYPE.ENT_DAY] = Math.min(this.air_times[this.TIME_TYPE.ENT_DAY], maxDays)
                this.day_options_enter.length = 0;
                for(let i = 1; i <= maxDays; i ++){
                    this.day_options_enter.push(i);
                }
            }
            else { // go to previous year.
                this.month_options_enter.length = 0;
                this.air_times[this.TIME_TYPE.ENT_MON] = Math.max(this.air_times[this.TIME_TYPE.ENT_MON], this.air_mon_min);
                const maxDays = this.getMaxDay(this.air_times[this.TIME_TYPE.ENT_YEAR], this.air_times[this.TIME_TYPE.ENT_MON])


                for(let i = this.air_mon_min; i <= 12; i ++){
                    this.month_options_enter.push(i);
                }

                this.day_options_enter.length = 0;

                if(this.air_times[this.TIME_TYPE.ENT_MON] === this.air_mon_min){
                    for(let i = this.air_day_min; i <= maxDays; i ++){
                        this.day_options_enter.push(i);
                    }
                    this.air_times[this.TIME_TYPE.ENT_DAY] = Math.max(Math.min(this.air_times[this.TIME_TYPE.ENT_DAY], maxDays), this.air_day_min);
                }
                else{
                    for(let i = 1; i <= maxDays; i ++){
                        this.day_options_enter.push(i);
                    }
                    this.air_times[this.TIME_TYPE.ENT_DAY] = Math.min(this.air_times[this.TIME_TYPE.ENT_DAY], maxDays);
                }
            }
        }
        else if (time_type ===  this.TIME_TYPE.EXT_YEAR){
            if(value > this.air_year_min) // go to next year. set month from January
            {
                this.month_options_exit.length = 0;
                const maxDays = this.getMaxDay(this.air_times[this.TIME_TYPE.EXT_YEAR], this.air_times[this.TIME_TYPE.EXT_MON])
                this.air_times[this.TIME_TYPE.EXT_DAY] = Math.min(this.air_times[this.TIME_TYPE.EXT_DAY], maxDays);

                for(let i  = 1; i <= this.air_mon_max; i ++){
                    this.month_options_exit.push(i);
                }
                this.day_options_exit.length = 0;
                for(let i = 1;  i <= 31; i ++){
                    this.day_options_exit.push(i);
                }
            }
            else{ // go to previous year.
                this.month_options_exit.length = 0;
                this.air_times[this.TIME_TYPE.EXT_MON] = Math.max(this.air_times[this.TIME_TYPE.EXT_MON], this.air_mon_min);
                const maxDays = this.getMaxDay(this.air_times[this.TIME_TYPE.EXT_YEAR], this.air_times[this.TIME_TYPE.EXT_MON])

                for(let i = this.air_mon_min; i <= 12; i ++){
                    this.month_options_exit.push(i);
                }
                this.day_options_exit.length = 0;
                if(this.air_times[this.TIME_TYPE.EXT_MON] === this.air_mon_min){
                    for(let i = this.air_day_min; i <= maxDays; i ++){
                        this.day_options_exit.push(i);
                    }
                    this.air_times[this.TIME_TYPE.EXT_DAY] =  Math.max(this.air_day_min, Math.min(maxDays, this.air_times[this.TIME_TYPE.EXT_DAY]))
                }
                else{
                    for(let i = 1; i <= maxDays; i ++){
                        this.day_options_exit.push(i);
                    }
                    this.air_times[this.TIME_TYPE.EXT_DAY] =  Math.min(maxDays, this.air_times[this.TIME_TYPE.EXT_DAY])
                }

            }
        }
        else if(time_type == this.TIME_TYPE.ENT_MON){
            const maxDay = this.getMaxDay(this.air_times[this.TIME_TYPE.ENT_YEAR], value);
            this.day_options_enter.length = 0;
            for(let i = 1; i <= maxDay; i ++)
                this.day_options_enter.push(i)
            this.air_times[this.TIME_TYPE.EXT_DAY] = Math.min(this.air_times[this.TIME_TYPE.EXT_DAY], maxDay);
        }
        else if(time_type == this.TIME_TYPE.EXT_MON){
            const maxDay = this.getMaxDay(this.air_times[this.TIME_TYPE.EXT_YEAR], value);
            this.day_options_exit.length = 0;
            for(let i = 1; i <= maxDay; i ++)
                this.day_options_exit.push(i)
            this.air_times[this.TIME_TYPE.ENT_DAY] = Math.min(this.air_times[this.TIME_TYPE.ENT_DAY], maxDay);
        }
    }

    constructor(
        private _formbuilder: FormBuilder,
        private _deviceService: DeviceManagementService,
        private _sharedService: SharedService,
        private _snackBar:MatSnackBar,
        private _cdr: ChangeDetectorRef,
        ) {
        this.initialize_airplane_mode_options()
        this.permission = this._sharedService.getPermission()
    }

    ngOnChanges(): void {
        if (this.deviceId) {
            this.enableCommand = true
            this.getDownlinkCommandList(this.deviceId)
        }else{
            this.enableCommand = false
            this.clearData()
        }
        this._cdr.detectChanges()
    }

    ngOnInit(): void {
        this.setupIntervalForm = this._formbuilder.group({
        // value: [5,[Validators.required, Validators.min(5), Validators.max(1440)]],
        value: [5,[Validators.required]],
        })
        this.setGPSForm = this._formbuilder.group({
            // value: [0,[Validators.required, Validators.min(0), Validators.max(300)]],
            value: [1,[Validators.required]],
            enable: [1]
        })
        this.setAirplaneModeForm = this._formbuilder.group({
            enter_year: [this.air_times[this.TIME_TYPE.ENT_YEAR]],
            enter_month: [this.air_times[this.TIME_TYPE.ENT_MON]],
            enter_day: [this.air_times[this.TIME_TYPE.ENT_DAY]],
            enter_hour: [this.air_times[this.TIME_TYPE.ENT_HOUR]],
            enter_minute: [this.air_times[this.TIME_TYPE.ENT_MIN]],
            exit_year: [this.air_times[this.TIME_TYPE.EXT_YEAR]],
            exit_month: [this.air_times[this.TIME_TYPE.EXT_MON]],
            exit_day: [this.air_times[this.TIME_TYPE.EXT_DAY]],
            exit_hour: [this.air_times[this.TIME_TYPE.EXT_HOUR]],
            exit_minute: [this.air_times[this.TIME_TYPE.EXT_MIN]],
            enable: [1]
        })
        this.setCommandForm = this._formbuilder.group({
        value: ['',[Validators.required]],
        });
        // this.establishedSocketConnection();

    }

    // initialize websocket connection
    /*
    establishedSocketConnection() {
        // Initialize the WebSocket connection when the component is created
        console.log(`subscribe  to socket-io ${this.DeviceSerial}`)

        this._webSocket.connect(this.DeviceSerial);
        this._webSocket.getMessages().subscribe((message) => { // command is updated
            console.log(`Success to receive the downlink command updated message`);
            this.getDownlinkCommandList(this.DeviceID);
        });
    }*/

    gpsEnabled(val) {
        if(val) {
            this.setGPSForm.value.enable = 1
            this.setGPSForm.controls['enable'].setValue(1);
            this.setGPSForm.get('value').setValidators([Validators.required,Validators.min(0),Validators.max(300)]);
            this.setGPSForm.get('value').updateValueAndValidity();
        } else {
            this.setGPSForm.value.enable = 0
            this.setGPSForm.controls['enable'].setValue(0)
            this.setGPSForm.controls['value'].clearValidators();
            this.setGPSForm.controls['value'].updateValueAndValidity();
        }
    }

    getMaxYearAfterMinutes(from: Date,  minutes): number{
        const currentTimeInMinutes = from.getTime() / 60000; // current time in minutes
        const minutesLater = currentTimeInMinutes + minutes;
        const dateAfterMinutes = new Date(minutesLater * 60000); // convert back to milliseconds
        return dateAfterMinutes.getFullYear();
    }

    getMaxMonthAfterMinutes(from: Date, minutes): number {
        const currentTimeInMinutes = from.getTime() / 60000; // current time in minutes
        const minutesLater = currentTimeInMinutes + minutes;
        const dateAfterMinutes = new Date(minutesLater * 60000); // convert back to milliseconds
        return dateAfterMinutes.getMonth() + 1;
    }

    getMaxDateAfterMinutes(from: Date, minutes): number {
        const currentTimeInMinutes = from.getTime() / 60000; // current time in minutes
        const minutesLater = currentTimeInMinutes + minutes;
        const dateAfterMinutes = new Date(minutesLater * 60000); // convert back to milliseconds
        return dateAfterMinutes.getDate();
    }

    airplaneModeEnabled(val) {
        if(val) {
            this.setAirplaneModeForm.value.enable = 1
            this.setAirplaneModeForm.get('enter_year').enable()
            this.setAirplaneModeForm.get('enter_month').enable()
            this.setAirplaneModeForm.get('enter_day').enable()
            this.setAirplaneModeForm.get('enter_hour').enable()
            this.setAirplaneModeForm.get('enter_minute').enable()

            this.setAirplaneModeForm.get('exit_year').enable()
            this.setAirplaneModeForm.get('exit_month').enable()
            this.setAirplaneModeForm.get('exit_day').enable()
            this.setAirplaneModeForm.get('exit_hour').enable()
            this.setAirplaneModeForm.get('exit_minute').enable()

        } else {
            this.setAirplaneModeForm.value.enable = 0

            this.setAirplaneModeForm.get('enter_year').disable()
            this.setAirplaneModeForm.get('enter_month').disable()
            this.setAirplaneModeForm.get('enter_day').disable()
            this.setAirplaneModeForm.get('enter_hour').disable()
            this.setAirplaneModeForm.get('enter_minute').disable()

            this.setAirplaneModeForm.get('exit_year').disable()
            this.setAirplaneModeForm.get('exit_month').disable()
            this.setAirplaneModeForm.get('exit_day').disable()
            this.setAirplaneModeForm.get('exit_hour').disable()
            this.setAirplaneModeForm.get('exit_minute').disable()
        }
    }

    sendInterval() {
        if(this.setupIntervalForm.valid) {
            const value = this.setupIntervalForm.value.value;
            console.log(`setup interval time: ${value}`)
            if(value < 5 || value > 1440){// check parameter range manually to show error message explicityly
                this._snackBar.open('Parameter range is [5:1440]', '', snackBarConfigWarn);
                return;
        }
        this._deviceService.setDataInterval(this.setupIntervalForm.value, this.deviceId).then((res:any)=> {
            if(res && !res.error_code) {
                this._snackBar.open('Submitted queue', '', snackBarConfig);
                this.getDownlinkCommandList(this.deviceId);
            }
            else{
                this._snackBar.open('Failed to submit to queue', '', snackBarConfigWarn);
            }
        })
        }
        else{
            this._snackBar.open('Parameter is empty', '', snackBarConfigWarn);
            return;
        }
    }

    sendGPS() {
        if(this.setGPSForm.valid) {
        const value = this.setGPSForm.value.value;
        if(value < 0 || value > 5){ // // check parameter range manually to show error message explicityly
            this._snackBar.open('Parameter range is [0:5] minute', '', snackBarConfigWarn);
            return;
        }
        this._deviceService.setGPS(this.setGPSForm.value, this.deviceId).then((res:any)=> {
            if(res && !res.error_code) {
                this._snackBar.open('Submitted queue', '', snackBarConfig);
                this.getDownlinkCommandList(this.deviceId);
            }
            else{
                this._snackBar.open('Failed to submit to queue', '', snackBarConfigWarn);
            }
            });
        }
        else{
            this._snackBar.open('Invalid parameter', '', snackBarConfigWarn);
        }
    }

    sendCustomCommand() {
        if(this.setCommandForm.valid) {
            const value = this.setCommandForm.value.value;
            if(!value){
                this._snackBar.open('Empty command', '', snackBarConfigWarn);
            }
            this._deviceService.setCommand(this.setCommandForm.value, this.deviceId).then((res:any)=> {
                if(res && !res.error_code) {
                    this._snackBar.open('Submitted queue', '', snackBarConfig);
                    this.getDownlinkCommandList(this.deviceId);
                }
                else{
                    this._snackBar.open('Failed to submit to queue', '', snackBarConfigWarn);
                }
            });
        }
        else{
            this._snackBar.open('Invalid parameter', '', snackBarConfigWarn);
        }
    }

    setAirplaneMode() {
        if(this.setAirplaneModeForm.valid) {
            const enabled = this.setAirplaneModeForm.value.enable?1:0;

            var date_enter = new Date()
            var date_exit =  new Date()

            if(enabled){
                const e_y = this.setAirplaneModeForm.get('enter_year').value;
                const e_m = this.setAirplaneModeForm.get('enter_month').value;
                const e_d = this.setAirplaneModeForm.get('enter_day').value;
                const e_h = this.setAirplaneModeForm.get('enter_hour').value;
                const e_M = this.setAirplaneModeForm.get('enter_minute').value;

                const ex_y = this.setAirplaneModeForm.get('exit_year').value;
                const ex_m = this.setAirplaneModeForm.get('exit_month').value;
                const ex_d = this.setAirplaneModeForm.get('exit_day').value;
                const ex_h = this.setAirplaneModeForm.get('exit_hour').value;
                const ex_M = this.setAirplaneModeForm.get('exit_minute').value;
                console.log(`${e_y}: ${e_m}: ${e_d}:${e_h}:${e_M}`)
                const now = new Date();
                date_enter = new Date(e_y, e_m - 1, e_d, e_h, e_M, 0)
                date_exit =  new Date(ex_y, ex_m - 1, ex_d, ex_h, ex_M, 0)
                if(date_enter < now){
                    this._snackBar.open('Invalid flight enter time', '', snackBarConfigWarn);
                    return;
                }
                if(date_exit < now){
                    this._snackBar.open('Invalid flight exit time', '', snackBarConfigWarn);
                    return;
                }
                if (date_enter >= date_exit){
                    this._snackBar.open('Enter time should be ealier than to exit time', '', snackBarConfigWarn);
                    return;
                }
                const time_diff_min = (date_exit.getTime() - date_enter.getTime()) / (1000 * 60);
                if(time_diff_min >= 65535){
                    this._snackBar.open('Time difference mush be within 45 day', '', snackBarConfigWarn);
                }
            }
            
            var object = {
                enable: enabled,
                enter: date_enter,
                exit: date_exit,
            }

            this._deviceService.setAirplanMode(object, this.deviceId).then((res:any)=> {
                if(res && !res.error_code) {
                    this._snackBar.open('Submitted queue', '', snackBarConfig);
                    this.getDownlinkCommandList(this.deviceId);
                }
                else{
                    this._snackBar.open('Failed to submit to queue', '', snackBarConfigWarn);
                }
            })
            return
        }
        else{
            this._snackBar.open('Invalid parameter', '', snackBarConfigWarn);
        }
    }

    dateToString(dateObject: Date): string {
        return dateObject.getFullYear() +
          "/" +
          (dateObject.getMonth() + 1) +
          "/" +
          dateObject.getDate() +
          " " +
          dateObject.getHours() +
          ":" +
          dateObject.getMinutes() +
          ":00";
      }

    // update downlink commands
    getDownlinkCommandList(id) {
        this.dataSource = new MatTableDataSource<any>();
        if(!id){
            return this.clearData()
        }
        this._deviceService.getDownlinkCommand(id).then((res:any) => {
            if (res && !res.error_code && res?.object?.length) {
                this.isNoRecord = false;

                this.dataSource.data = res?.object;
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
            }else { // remove previous one
                this.clearData()
            }
        })
    }

    private clearData(){
        this.dataSource = new MatTableDataSource<any>();
        this.isNoRecord = true;
        this.isSearch = true;
    }

    deleteDownlinkCommand(item){
        const command_id = item?.id;
        this._deviceService.deleteDonwlinkCommand(command_id).then((res:any)=>{
            if(res&& !res.error_code){
                this.getDownlinkCommandList(this.deviceId);
            }
            else{
                this._snackBar.open('Failed to delete command', '', snackBarConfigWarn);
            }
        })
    }

    copyAvailable(response?: string): Boolean{
        if(!response)
            return false;
        if(isWebAdminPermission(this.permission) || this.permission == PERMISSION.DEVELOPER)
            return true;
        return false

    }

    copyToClipboard(text?: string): void {
        if (!text) {
            this.notify(`No reponse data`)
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            this.notify(`copied response successfully`)

        }).catch(err => {
            this.warning(`Failed to copy response`)
        });
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


