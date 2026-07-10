import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { DeviceManagementService } from '../../device-management.service';

@Component({
    selector: 'app-alarm-data',
    templateUrl: './alarm-data.component.html',
    styleUrls: ['./alarm-data.component.scss']
})

export class AlarmDataComponent implements OnInit {
    currentTime: Date;
    currentTime2: Date;
    userInfo: any;
    @Input() devicesInfo: any
    @Input() deviceId: string;

    public selection = new SelectionModel<any>(true, []);
    displayedColumns: string[] = ['id', 'Name', 'AlarmType', 'Object', 'Event', 'effectiveTime', 'createTime', 'Operate'];
    alarmColumns: string[] = ['id', 'temperature', 'humidity', 'light', 'vibration', 'battery', 'rtctime', 'servertime', 'alarm'];

    public dataSource = new MatTableDataSource<any>()
    public dataSourceAlarm = new MatTableDataSource<any>()
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

    alarms = [];
    filteredAlarms: any[];

    constructor(private _deviceManagementService: DeviceManagementService,
        private _route: ActivatedRoute) {

    }
    ngOnInit(): void {
        this.currentTime2 = new Date();
        this.currentTime = new Date(this.currentTime2.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days
        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))

        // Access route parameters using ActivatedRoute
        this._route.paramMap.subscribe((params) => {
            // Get the 'id' parameter value
            this.deviceId = params.get('id');
        });
        this.getDeviceAlarmLogs();
    }

    ngOnChanges(){
        if(!this.deviceId){ // device id
            this.clearData()
        }
        else{
            this.getDeviceAlarmLogs()
        }
    }


    alarmData(data) {
        if(data){
            console.log('alarm data', data);
            this.alarms = data;
            console.log('device detail', this.devicesInfo)
            // Filter alarms based on deviceDetails
                this.filteredAlarms = this.alarms.filter(alarm => {
                const alarmTargets = alarm.alarm_target.split(',').map(target => target.trim());
                // Check if deviceDetails.id or deviceDetails.groups is included in alarmTargets
                return alarmTargets.includes(this.devicesInfo.id) || alarmTargets.includes(this.devicesInfo.groups);
            });
            console.log('filtered', this.filteredAlarms)
        }
    }

    getDeviceAlarmLogs() {
        if(!this.deviceId){
            return this.clearData()
        }
        let object = {
            from: this.currentTime,
            to: this.currentTime2,
            // did: this.deviceId
        }
        this._deviceManagementService.getAlarmsOneDevice(object, this.deviceId).then((res: any) => {
            if (res && !res.error_code && res?.object?.length) {
                this.isNoRecord = false;
                this.dataSourceAlarm = new MatTableDataSource<any>();
                this.dataSourceAlarm.data = res?.object;
                this.dataSourceAlarm.paginator = this.paginator;
                this.dataSourceAlarm.sort = this.sort;
            } else { // remove previous one
                this.clearData()
            }
        })
    }

    private clearData(){
        this.dataSourceAlarm = new MatTableDataSource<any>();
        this.isNoRecord = true;
        this.isSearch = true;
    }


// change colors on listing
    checkValue(item, entity) {

        if(!this.filteredAlarms){
            return '';
        }
        if (entity === 'temperature') {
            // Check all filtered alarms for temperature conditions

            for (const alarm of this.filteredAlarms) {
                if(alarm.alarm_type == 0) {
                    if (item.temperature < alarm.low_temperature || item.temperature > alarm.high_temperature) {
                        return 'alarm';
                      } else if (item.temperature < alarm.warning_low_temperature || item.temperature > alarm.warning_high_temperature) {
                        return 'warning';
                      }
                }
            }
          } else if (entity === 'humidity') {
            // Check all filtered alarms for humidity conditions
            for (const alarm of this.filteredAlarms) {
                if(alarm.alarm_type == 0) {
                    if (item.humidity < alarm.low_humidity || item.humidity > alarm.high_humidity) {
                        return 'alarm';
                      } else if (item.humidity < alarm.warning_low_humidity || item.humidity > alarm.warning_high_humidity) {
                        return 'warning';
                      }
                }
            }
          }
          else if (entity == 'light') {
            // Check all filtered alarms for humidity conditions
            for (const alarm of this.filteredAlarms) {
                    if(alarm.alarm_type == 1) {
                        if (item.light < alarm.low || item.light > alarm.high) {
                            return 'alarm';
                          } else if (item.light < alarm.warning_low || item.light > alarm.warning_high) {
                            return 'warning';
                          }
                    }
            }
          }
          else if (entity == 'vibration') {
            // Check all filtered alarms for humidity conditions
            for (const alarm of this.filteredAlarms) {
                    if(alarm.alarm_type == 2) {
                        if (item.vibration > alarm.high) {
                            return 'alarm';
                          } else if (item.vibration > alarm.warning_high) {
                            return 'warning';
                          }
                    }
            }
          }

          return ''; // Default case if no alarm or warning condition is met
    }
}
