import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DeviceManagementService } from '../device-management.service';
import { ActivatedRoute } from '@angular/router';
import { Subject, catchError, debounceTime, forkJoin, from, map, of, switchMap, takeUntil, tap } from 'rxjs';
import moment from 'moment';
// import {DeviceData} from './view-device-type'
import { DB_RESULT, DeviceRealTime } from '../../utils/typedef';
import { FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RealTimeCacheEntry, TabServiceService } from './tab-service.service';
import { GroupConfig } from '../../account/account.typedef';


@Component({
  selector: 'app-view-devices',
  templateUrl: './view-devices.component.html',
  styleUrls: ['./view-devices.component.scss']
})



export class ViewDevicesComponent implements OnInit {
    private _unsubscribeAll: Subject<any>;
    timezone: 'UTC';
    deviceId: any;

    serialId: String = '';
    // deviceDetails: any;
    devicelogsDetails: any;
    groups: GroupConfig[] = [];


    realTimeData:DeviceRealTime = {};
    lastAlarm: any;
    isActive: boolean;
    lasttime: Date| undefined;

    currentTime2: Date;
    currentTime: Date;
    searchInputControl = new FormControl('', [
        Validators.maxLength(15),
        Validators.pattern('^[0-9]*$') // Only digits allowed
      ]);

    constructor(
        private _deviceServices: DeviceManagementService,
        private _tabService: TabServiceService,
        private _route: ActivatedRoute,
        private _cdr: ChangeDetectorRef) {
        this._unsubscribeAll = new Subject();
    }
    ngOnInit(): void {
        this.currentTime2 = new Date();
        this.currentTime = new Date(this.currentTime2.getTime() - (7 * 24 * 60 * 60 * 1000));
        this.isActive = false;
        this.getGroups()
        this._route.queryParams.subscribe(params => {
            if (params['data']) {
              this.realTimeData = JSON.parse(params['data']);
              this.serialId = this.realTimeData.serial
            }
          });
        // Access route parameters using ActivatedRoute
        this._route.paramMap.subscribe((params) => {
            this.deviceId = this.realTimeData.id            
        });

        this.searchInputControl.setValue(this.serialId.toString())

        console.log(`Current device status: ${JSON.stringify(this.realTimeData)}`)

        this.searchInputControl.valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {
                return this.fetchData(query as string)
            })
        ).subscribe((data) => {
            console.log('Fetched data:', data);
        });
    }

    ngAfterViewInit() {
        // start fetching
        this._tabService.startRealtimeDataFetching()
        // add intial serial task
        this._tabService.addRealtimedataTask(this.serialId)
        // subscribe to subject
        this._tabService.realTimeData$.subscribe(data=>{
            if(data.serial != data.serial ){ // serial is changed already. Ignore this data
                console.log(`Received the realtime data of invalid device: ${data.serial}`)
                return
            }
            console.log(`Chart componet: serial is changed ${data.serial}`)

            this.realTimeData = data.realtime
            this.serialId = this.realTimeData.serial || ''
            this.deviceId = this.realTimeData.id || ''
            console.log(`device ID is updated. serial number = ${this.serialId}/${this.deviceId}`)
            if(this.realTimeData.id){
                if(this.realTimeData?.time){
                    this.lasttime = new Date(this.realTimeData.time)
                    this.checkOnlineState()
                }
            }
            else{
                this.lastAlarm = undefined
                // this.serialId = ''
                this.lasttime = undefined
                this.isActive = false
            }
            this._cdr.detectChanges()
        })

    }

    getGroups() {
        this._deviceServices.getDeviceGroups().then((res:any) => {
        if(res && !res.error_code) {
            this.groups = res.object;
        }
        })
    }

     getGroupName(groupid): string{
        if(!groupid)
            return 'Default'
        const group = this.groups.find(g=>g.id == groupid)
        return (group)? group.groupname: 'Default'

    }


    fetchData(serial: string): any{
        console.log(`serial is changed: ${serial}`)
        this.serialId = serial
        this._tabService.addRealtimedataTask(serial)
        return of(null)
    }


    getdevicelogs(id) {
        this._deviceServices.getDeviceLogs(id).then((res: any) => {
            if (res && !res.error_code) {
            console.log('changes', res);
            }
        })
    }

    getAlarm(id) {
        let object = {
            did: id
        }
        this._deviceServices.getAlarm(object).then((res: any) => {
            if (res && !res.error_code && res?.object) {
                console.log('changes', res);
                this.lastAlarm = res?.object
            }
            this._cdr.detectChanges()
        })
    }

    getAlarmCode() {
    if (this.lastAlarm && this.lastAlarm != null && this.lastAlarm !=undefined) {
        switch (this.lastAlarm.alarm) {
            case 'AA':
                return 'Interval GPRS data';
            case '10':
                return 'Low battery Alarm';
            case 'A0':
                return 'Temperature/Humidity over threshold alarm';
            case 'A1':
                return 'Temperature/Humidity sensor abnormal alarm';
            case 'A2':
                return 'Light sensor bright and dark changes';
            case 'A3':
                return 'Shock alarm';
            case 'B0':
                return 'Turn on the device';
            case 'B1':
                return 'Turn off the device';
            default:
                return 'No alarm occurrence';
        }
    } else {
        return 'No alarm occurrence';
    }
    }

    checkForActiveDevice(time) {
        console.log("check the online/offline state of device")
        // should check the timezone of timezone of this device
        this._deviceServices.getTimezoneofDevice(this.realTimeData.id).then((res: any)=>{
            if(res && !res.error_code && res.object){
                console.log(`device timezone: ${res.object}`)
                const timezone = res.object;
                const deviceDateTime = new Date(time);

                // convert the current time into device timezone
                const currentTime = new Date();
                var offset = 0;
                try {
                    offset = parseFloat(timezone);
                    if(isNaN(offset)){
                        offset = 0;
                    }
                } catch (e) {
                    console.error(`UTC timezone: ${e.message}`);
                }
                const offsetMinutes = -currentTime.getTimezoneOffset();
                const newOffsetMinutes = offset * 60;
                // Calculate the difference between the new and old offsets
                const diffMinutes = newOffsetMinutes - offsetMinutes;
                // Add the difference to the date
                currentTime.setTime(currentTime.getTime() + diffMinutes * 60 * 1000 );


                // Calculate the time difference in milliseconds
                const timeDifference = currentTime.getTime() - deviceDateTime.getTime();
                // Convert the time difference to minutes
                const timeDifferenceInMinutes = timeDifference / (1000 * 60);
                // Check if the device is active (less than 30 minutes difference)
                this.isActive = timeDifferenceInMinutes <= 24 * 60;
            }
            else{
                console.log('Invalid timezone')
            }
        });
    }



    checkOnlineState(){
        const timeDifference = new Date().getTime() - this.lasttime.getTime();
        // Convert the time difference to minutes
        const timeDifferenceInMinutes = timeDifference / (1000 * 60);
        // Check if the device is active (less than 30 minutes difference)
        this.isActive = (timeDifferenceInMinutes <= 24 * 60)?true: false;
    }

    getLastActiveTimeString(){
        return this.realTimeData.time || '--'
    }

    getLastHeartBitTime(): string{
        return this.realTimeData.state.timeHeartBit || '--'
    }

    hasHeartBitTime(): boolean{
        return (this.realTimeData.state?.timeHeartBit)? true: false
    }

    // read sensor values
    getRealTimeData(dev_id) {
            if(this.realTimeData?.state){
                console.log(`Deivce state is already prepared`)
                return
            }
            this._deviceServices.getLastState(dev_id).then((res)=>{
                if(res && !res.error_code ){
                  const object = res.object;
                  if(object){
                    this.realTimeData.state = {}
                    this.realTimeData.state.temperature = object.temperature;
                    this.realTimeData.state.tempexternal = object.tempexternal;
                    this.realTimeData.state.humidity =  object.humidity;
                    this.realTimeData.state.light = object.light;
                    this.realTimeData.state.battery = object.battery;
                    this.realTimeData.state.vibration = object.vibration;
                    this.realTimeData.state.wifi = object.wif;
                    this.realTimeData.state.city = object.city;
                    this.realTimeData.state.address = object.address;
                  }
                }
                this._cdr.detectChanges()
             }).catch(err=>{
                this._cdr.detectChanges()
             });
    }


    preventNonNumeric(event: KeyboardEvent) {
        if (['e', 'E', '+', '-'].includes(event.key)) {
          event.preventDefault();
        }
      }

}
