import { FlatTreeControl, NestedTreeControl } from '@angular/cdk/tree';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeNestedDataSource } from '@angular/material/tree';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { Router } from '@angular/router';
import { environment } from '../../../../enviroment/enviroment';

import { forkJoin, map, catchError, of, retry, takeUntil, debounceTime, switchMap, Subject } from 'rxjs';
import { SocketRealTimeDataService } from '../../../../services/socketRealtimeData.service';
import { FormControl } from '@angular/forms';
import { DB_RESULT, DeviceFilterType, DeviceRealTime, DeviceState, PageData, PageQuery } from '../../utils/typedef';
import { AlarmType } from '../../alarm-settings/alarm-listing/alarm-listing.component';



/**
 * Food data with nested structure.
 * Each node has a name and an optional list of children.
 */

interface Device {
  id: string;
  name: string;
  group: string;
}

interface Group {
  group: string;
  devices: Device[];
}

interface DeviceNode {
  name: string;
  id?: string;
  children?: DeviceNode[];
}
@Component({
  selector: 'app-real-time-monitoring-dashboard',
  templateUrl: './real-time-monitoring-dashboard.component.html',
  styleUrls: ['./real-time-monitoring-dashboard.component.scss']
})


export class RealTimeMonitoringDashboardComponent implements OnInit {
  treeControl = new NestedTreeControl<DeviceNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<DeviceNode>();
  showSim =  environment.showSimExpire
  TREE_DATA: DeviceNode[]
  userInfo: any;
  offset: number = 0;


  deviceData: DeviceRealTime[] = [];
  public dataSource1 = new MatTableDataSource<any>()
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

  deviceLogsLatest: any = [];
  highestSignalStrength: any;
  batteryPercentage: number = 100;
  groups: any;

  filter = DeviceFilterType.All
  FilterType = DeviceFilterType
  // keyword = ''
  // pageSize = 20
  // totalRecords = 0
  _pageQuery: PageQuery = {
    page: 0,
    pagesize: 20,
    keyword: '',
    cursor:null,
    total: 0,
    keyChanged: true,
  }
  searchInputControl = new FormControl();
  private intervalId : any;
  selectedGroup = "Real-time Monitoring";
  group_all = "All";
  constructor(
    private _deviceManagementService: DeviceManagementService,
    // private _webSocket: SocketRealTimeDataService,
    private _route: Router,
    private _cdr: ChangeDetectorRef) {

     }

  hasChild = (_: number, node: DeviceNode) => !!node.children && node.children.length > 0;

  ngOnInit(): void {
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'))

    const timezone = this.userInfo.timezone;
    var offset = 0;
    try {
        offset = parseFloat(timezone);
        if(isNaN(offset)){
            offset = 0;
        }
    } catch (e) {
        console.error(`UTC timezone: ${e.message}`);
    }

    this.getDevices(this.userInfo?.id);
    this.getAllGroupsNames();
    this.searchInputControl.valueChanges
    .pipe(
      takeUntil(this._unsubscribeAll),
      debounceTime(300),
      switchMap((query) => {
        this._pageQuery.keyword = query.toString().trim()
        this._pageQuery.keyChanged = true
        this.paginator.pageIndex = 0;
        return this.fetchPage(0, this.paginator.pageSize, this._pageQuery.keyword, true)
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

    this.intervalId = setInterval(() => {
        this.refreshPageContent();
    }, 60 * 1000 * 5);
  }

  ngAfterViewInit(): void {
    this._pageQuery.pagesize = this.paginator.pageSize;
    this._pageQuery.keyChanged = true
    this.getDevices(this.userInfo?.id);
  }

  ngOnDestroy(): void {

  }

  onPageChange(event: any): void {
    this._pageQuery.pagesize = event.pageSize
    this._pageQuery.cursor = null;
    this.fetchPage(event.pageIndex, event.pageSize, this._pageQuery.keyword,
      this._pageQuery.keyChanged)
      .then((response: any) => {
      this.updateDataSource(response);})
      .catch((err: HttpErrorResponse) => (console.log));
  }


  refreshPageContent(){
    const page = this._pageQuery.page - 1
    this.fetchPage(page, this._pageQuery.pagesize, this._pageQuery.keyword,
        this._pageQuery.keyChanged)
        .then((response: any) => {
        this.updateDataSource(response);})
        .catch((err: HttpErrorResponse) => (console.log));
  }

  fetchPage(pageIndex: number, pageSize: number, keyword: string, keyChanged: boolean) {
    this._pageQuery.page = pageIndex + 1
    this._pageQuery.pagesize = pageSize
    this._pageQuery.keyword = keyword
    this._pageQuery.keyChanged = keyChanged
    this._pageQuery.filter = this.filter
    return this._deviceManagementService.getUserDeviceDetailsWithPage(this.userInfo.id, this._pageQuery);
  }

  onFilterChange(event: any): void{
    this.paginator.pageIndex = 0;
    this.fetchPage(this.paginator.pageIndex, this.paginator.pageSize,
      this._pageQuery.keyword, this._pageQuery.keyChanged).then((response: any) => {
      this.updateDataSource(response);
    }).catch((err: HttpErrorResponse) => (console.log));
  }

  // data sources is updated
  updateDataSource(response: any): void {
    const res = response as DB_RESULT
    if(res && !res.error_code){
      const pageData = res.object as PageData
      this.deviceData = pageData.data
      this.deviceData.forEach(data=>{
        if(data?.state)
            data.state.isRecentAlarm = this.isRecentAlarm(data)
      })
      this._pageQuery.total = pageData.total
      this._pageQuery.keyChanged = false
      this._pageQuery.cursor = pageData.cursor

    }
    else{
      this.dataSource.data = []
      this._pageQuery.total = 0
    }
    this._cdr.detectChanges()
  }

  getDevices(id){
    this.fetchPage(this.paginator.pageIndex, this._pageQuery.pagesize,
      this._pageQuery.keyword, this._pageQuery.keyChanged).then((response: any) => {
      this.updateDataSource(response);
    }).catch((err: HttpErrorResponse) => (console.log));
  }

  getAllGroupsNames() {
    this._deviceManagementService.getDeviceGroupNames().then((res:any) => {
      if(res && !res.error_code) {
        this.groups = res.object;
        this.TREE_DATA = this.mapGroupArrayToTree(this.groups);
        this.dataSource.data = this.TREE_DATA;
        // console.log('tree', this.TREE_DATA)
      }
    })
  }

  // update the data by device serial
  async update_device_contents(items, serial: string){
      for(var i = 0; i < this.deviceData.length; i ++){
        var item
        if(items[i].serial !== serial){
          continue;
        }
        console.log(`success to find the matched device:${i}: ${JSON.stringify(items[i])}`)
        const res = await this._deviceManagementService.getLastState(items[i].id);
          if(res && !res.error_code ){
            const object = res.object;
            if(object){
              console.log(JSON.stringify(items[i]));
              items[i].temperature = object.temperature != undefined? object.temperature : '--';
              items[i].tempexternal = object.tempexternal != undefined ? object.tempexternal : '--';
              items[i].humidity =  object.humidity  != undefined ? object.humidity : '--';
              items[i].light = object.light != undefined? object.light : '--';
              items[i].battery = object.battery != undefined ? object.battery : '--';
              items[i].vibration = object.vibration != undefined ? object.vibration : '--';
              items[i].wifi = object.wif != undefined? object.wifi : '--';
              items[i].city = object.city ? object.city : '--';
              items[i].address = object.address ? object.address : '--';
              items[i].time = object.time?object.time: '--';
              console.log('Success to read device last state')
            }
          }else{
            console.error('Invalid object of api');
          }
      }
  }

    mapGroupArrayToTree(groups: Group[]): DeviceNode[] {
    const tree: DeviceNode[] = [];

    const default_group : DeviceNode = {
      name: this.group_all,
      children: []
    }
    tree.push(default_group);

    groups.forEach((group:any) => {
      const groupNode: DeviceNode = {
        name: group,
        children: [],
      };

      tree.push(groupNode);
    });
    return tree;
  }


  navigateToDetail(item) {
    this._route.navigate([`device/${item.id}`], { queryParams: { data: JSON.stringify(item) } });
  }


  gotoFetchData(items) {
    console.log('item are', items)
    for (let i = 0; i < items.length; i++) {
     this._deviceManagementService.getLastState(items[i].id).then((res)=>{
        items[i].temperature = '--';
        items[i].tempexternal =  '--';
        items[i].humidity =  '--';
        items[i].light =  '--';
        items[i].battery =  '--';
        items[i].vibration = '--';
        items[i].address = '--';
        items[i].city = '--';
        if(res && !res.error_code ){
          const object = res.object;
          if(object){
            items[i].temperature = object.temperature != undefined? object.temperature : '--';
            items[i].tempexternal = object.tempexternal != undefined ? object.tempexternal : '--';
            items[i].humidity =  object.humidity  != undefined ? object.humidity : '--';
            items[i].light = object.light != undefined? object.light : '--';
            items[i].battery = object.battery != undefined ? object.battery : '--';
            items[i].vibration = object.vibration != undefined ? object.vibration : '--';
            items[i].wifi = object.wifi != undefined? object.wifi : '--';
            items[i].city = object.city ? object.city : '--';
            items[i].address = object.address ? object.address : '--';
            items[i].time = object.time?object.time: '--';
          }
        }else{
          console.error('Failed to get last state of device');
        }
     }).catch((err)=>{
        console.error('Exception in reading last device state ');
     });
    }
    console.log('ovrall res', this.deviceData)
  }

  getBatteryImg(item) {

     if(item >= 90) {
      return 'assets/images/device/battery_100.png'
     }
     if(item < 90 && item >= 70) {
      return 'assets/images/device/battery_80.png'
     }
     if(item < 70 && item >= 50) {
      return 'assets/images/device/battery_60.png'
     }
     if(item < 50 && item >= 30) {
      return 'assets/images/device/battery_40.png'
     }
     if(item < 30 && item >= 10) {
      return 'assets/images/device/battery_20.png'
     }
     return 'assets/images/device/battery_0.png'
  }

  getItemExpression(item: DeviceRealTime | null, itemtype: string): String{

      if(itemtype == 'temperature') {
        return  (item?.state?.temperature != null)?  item?.state?.temperature + '℃' :  '--℃'
      }
      else if(itemtype == 'ext_temperature') {
        return  (item?.state?.tempexternal != null)?  item?.state?.tempexternal + '℃' :  '--℃'
      }
      else if(itemtype == 'humidity') {
        return (item?.state?.humidity != null)?item?.state?.humidity + '%':  '--%'
      }
      else if(itemtype == 'light') {
          return (item?.state?.light != null) ? item?.state?.light + 'Lux': '--Lux'
      }
      else if(itemtype == 'vibration') {
          return (item?.state?.vibration != null) ?item?.state?.vibration + 'mg' : '--mg';
      }
      else if(itemtype == 'location'){
          return (item?.state?.city)?  item?.state?.city: '--'
      }
      else if(itemtype == 'sim'){
        return (item?.simexpire)?  item?.simexpire.slice(0,10): '--'
      }
      else if(itemtype == 'alarm'){
        return (item?.state?.alarmTime)?  item?.state?.alarmTime.slice(0, 16): '--'
      }
      return '--'
  }


  hasHeartBitTime(item: DeviceRealTime ): boolean{
    return item.time_heart ? true: false
  }

  getHeartBitColor(item: DeviceRealTime): string {
    if (!item.time_heart) return 'black';
    const heartBitTime = new Date(item.time_heart);
    const now = new Date();
    const diffMs = now.getTime() - heartBitTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= 24 ? 'blue' : 'white';
  }

  // check if last laarm is occured in recent one day
  isRecentAlarm(item: DeviceRealTime): Boolean{
    console.log(`Calcuate the recent alarm: ${item.state.alarmTime}`)
    if(!item.state.alarmTime)
        return false;


    const currentTime = new Date();

    const offsetMinutes = -currentTime.getTimezoneOffset();
    const newOffsetMinutes = this.offset * 60;
    // Calculate the difference between the new and old offsets
    const diffMinutes = newOffsetMinutes - offsetMinutes;
    // Add the difference to the date
    currentTime.setTime(currentTime.getTime() + diffMinutes * 60 * 1000 );

    // 3. calculate the time difference
    const lastModifiedTime = new Date(item.state.alarmTime.toString());
    const timeDifference = currentTime.getTime() - lastModifiedTime.getTime();
    const hoursDifference = timeDifference / (1000 * 3600);
    console.log(`last alamr time time difference: ${hoursDifference}`)
    return (hoursDifference < environment.activeAlarmHours)?true: false

  }

  getAlarmType(item): string{
    if(item?.state?.alarmType==undefined)
        return ''
    const alarmType = item?.state?.alarmType
    var alarmDesc = ''
    switch(alarmType){
        case AlarmType.Temperature:
            alarmDesc = 'Temperature alarm';
            break;
        case AlarmType.Humidity:
            alarmDesc = 'Humidity alarm';
            break;
        case AlarmType.Light:
            alarmDesc = 'Light alarm';
            break;
        case AlarmType.Vibration:
            alarmDesc = 'Vibration alarm';
            break;
        case AlarmType.Battery:
            alarmDesc = 'Battery alarm';
            break;
        case AlarmType.SIM:
            alarmDesc = 'SIM card expiration alarm';
            break;
        case AlarmType.ProbTemperature:
            alarmDesc = 'Prob temperature alarm';
            break;
        default:
            break;
    }
    return alarmDesc

  }
}
