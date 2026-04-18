import { Component, ElementRef, EventEmitter, Input, NgZone, OnInit, Output, ViewChild } from '@angular/core';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { MatTableDataSource } from '@angular/material/table';
import { HttpErrorResponse } from '@angular/common/http';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

import * as $ from 'jquery';
import { overviewService } from '../../overview/overview-service';
import * as Highcharts from "highcharts/highstock";
import moment from 'moment';
declare var jQuery: any;

// typings.d.ts or jquery.d.ts


@Component({
  selector: 'app-big-screen-monitoring',
  templateUrl: './big-screen-monitoring.component.html',
  styleUrls: ['./big-screen-monitoring.component.scss']
})
export class BigScreenMonitoringComponent implements OnInit {

  @ViewChild('worldMap', { static: true }) worldMap: ElementRef;

  endDate = moment(); // current date and time
  startDate = moment().subtract(7, 'days'); // a 
  temperatureHumdity = [];
  @Input() dataProps: any
  @Output() readonly sendQuery: EventEmitter<any> = new EventEmitter<any>

  temperatureArray: any = [];

  currentTime: any;
  currentTime2: any;

  Highcharts: typeof Highcharts = Highcharts;

  chartOptions: Highcharts.Options;
  chartOptionsForLight: Highcharts.Options;
  chartOptionsForVibration: Highcharts.Options;
  chartOptionsForRSSI: Highcharts.Options;
  chartOptionsForVoltageAndBattery: Highcharts.Options;
  displayedColumns: string[] = ['id', 'name', 'serial', 'cond'];
  public dataSource = new MatTableDataSource<any>()
  tableData = [];
  totalRecords: number;
  showData = false;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  isSearch: boolean;
  isNoRecord: boolean = false;
  userInfo: any;
  width: number;
  height: number;
  overViewDetails: any;
  gpsData: any;
  deviceNames: any = [];
  realcurrentTime: string = '';
  constructor(
    private _deviceManagementService: DeviceManagementService,
    private _overviewService: overviewService,
    private elRef: ElementRef,
    private zone: NgZone
  ) {

  }
  ngOnInit(): void {
    let data = [
      {
        servertime: '2024-01-29 07:36:24',
        temperature: 30,
        name: 'device1'
      },
      {
        servertime: '2024-01-29 07:37:24',
        temperature: 25,
        name: 'device2'
      },
      {
        servertime: '2024-01-29 07:40:24',
        temperature: 35,
        name: 'device1'
      },
      {
        servertime: '2024-01-29 07:41:24',
        temperature: 32,
        name: 'device3'
      },
      {
        servertime: '2024-01-29 07:44:24',
        temperature: 37,
        name: 'device1'
      },
      {
        servertime: '2024-01-29 07:47:24',
        temperature: 28,
        name: 'device2'
      },
      {
        servertime: '2024-01-29 07:49:24',
        temperature: 34,
        name: 'device4'
      },
      {
        servertime: '2024-01-29 07:50:24',
        temperature: 30,
        name: 'device1'
      },
      {
        servertime: '2024-01-29 07:51:24',
        temperature: 31,
        name: 'device2'
      },
      {
        servertime: '2024-01-29 07:52:24',
        temperature: 38,
        name: 'device1'
      },
      {
        servertime: '2024-01-29 07:55:24',
        temperature: 30,
        name: 'device2'
      },
      {
        servertime: '2024-01-29 07:57:24',
        temperature: 27,
        name: 'device3'
      },
      {
        servertime: '2024-01-29 07:58:24',
        temperature: 30,
        name: 'device4'
      },
    ]
    this.width = 400;
    this.height = 300;
    this.currentTime = new Date(); 
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    this.getDevices(this.userInfo?.id);
    this.getOverViewDetails()
    this.createMap();
    this.mapAllChart(data);
    // $('#world-map').vectorMap();

  }
  updateTime(): void {
    const now = new Date();
    const hours = this.padZero(now.getHours());
    const minutes = this.padZero(now.getMinutes());
    const seconds = this.padZero(now.getSeconds());

    this.realcurrentTime = `${hours}:${minutes}:${seconds}`;
  }

  padZero(value: number): string {
    return value.toString().padStart(2, '0');
  }
  mapAllChart(data) {
    // this.currentTime = moment();
    // this.currentTime2 = moment().subtract(7, 'days');
    if (data && data.length > 0) {
      data.forEach(entry => {
        // Convert DateTime to timestamp
        // const timestamp = new Date(entry.servertime).getTime();
        const timestamp = entry.servertime
        console.log(`server times: ${entry.servertime}`);
        // const timestamp = Date.parse(entry.servertime);
        console.log(`server times: ${timestamp}`);
        // Push values to temperature array
        this.temperatureArray.push([timestamp, entry.temperature]);

        this.deviceNames.push(entry.name);
      });
    }

    this.createChartForTemperatureAndHumidity();

  }
  createChartForTemperatureAndHumidity() {
    const series: any = [
      {
        data:  this.temperatureArray,
          name: 'this.deviceNames[index],' 
       
      },
    ];
    let minY = -50, maxY = 100;
    // if(this.temperatureArray && this.humidityArray) {
    //     minY = Math.min(...this.temperatureArray.map((entry: any) => entry[1]), ...this.humidityArray.map((entry: any) => entry[1]));
    //     maxY = Math.max(...this.temperatureArray.map((entry: any) => entry[1]), ...this.humidityArray.map((entry: any) => entry[1]));
    // }
    // minY = -50; 
    // maxY = 100; 


    this.chartOptions = {
      title: {
        text: 'Temperature',
        align: 'center'
      },
      // subtitle: {
      //   text: `${this.currentTime}~${this.currentTime2}`,
      //   align: 'center'
      // },
      rangeSelector: {
        selected: 2,
      },
      xAxis: {
        type: 'datetime',
        labels: {
          format: '{value:%d-%m %H:%M:%S}',
        },
        tickInterval: 24 * 3600 * 1000, // One day interval
      },
      yAxis: {
        min: minY,
        max: maxY,
      },
      navigator : {
        enabled:false
      },
      plotOptions: {
        series: {
          // compare: 'percent',
          showInNavigator: false,
          tooltip: {
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
          },
        },
      },
      tooltip: {
        split: true,
        formatter: function () {
          let timestamp = typeof this.x === 'string' ? Date.parse(this.x) : this.x;
          let formattedDate = Highcharts.dateFormat('%d-%m %H:%M:%S', timestamp);
      
          let tooltip = '<b>' + formattedDate + '</b>';
          
          this.points.forEach(point => {
              tooltip += '<br/><span style="color:' + point.color + '">' + point.series.name +
                  '</span>: <b>' + point.y + '</b> (' + point.point.name + ')';
          });
      
          return tooltip;
      },
      },
      series: series.map(data => ({
        data: data.data.map(([x, y]) => [x, y]),
        name: 'temperature',
      })),
    };
    console.log('series', this.chartOptions.series);
  }
  getDevices(id) {
    this._deviceManagementService.getuserDevice(id).then((res: any) => {
      console.log(res);
      if (res && !res.error_code) {
        this.showData = true
        this.tableData = res?.object;
        this.totalRecords = res?.object?.length
        // this.cdr.detectChanges();
        if (res?.object?.length) {
          this.isNoRecord = false;
          this.dataSource = new MatTableDataSource<any>();
          this.dataSource.data = res?.object;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        } else {
          this.isNoRecord = true;
          this.isSearch = true;
        }

      } else {
        // this.snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Optimus. Please contact your admin'}`, '', snackBarConfigWarn);
        this.isNoRecord = true;
        this.isSearch = true;
      }
    }).catch((err: HttpErrorResponse) => (console.log))

  }
  // Add a method to check online/offline state based on the last log time
  isOnline(item: any): boolean {
    if (item.time) {
      const lastLogTime: Date = new Date(item.time);

      // Calculate the time difference in milliseconds
      const timeDifference = this.currentTime.getTime() - lastLogTime.getTime();

      // Check if the last log is within the last 24 hours (86400000 milliseconds)
      return timeDifference <= 86400000;
    }

    return false;
  }
  getOverViewDetails() {
    this._overviewService.getOverView().then((res: any) => {
      if (res && !res.error_code) {
        this.overViewDetails = res.object[0];
        this.gpsData = this.overViewDetails.devices;
      }
    })
  }
  createMap() {
    setTimeout(() => {
      jQuery('#vmap').vectorMap({
        map: 'world_en',  // Specify the map you want to use (e.g., world_en for world map)
        backgroundColor: 'transparent',
        borderColor: '#000000',
        borderOpacity: 0.5,
        borderWidth: 1,
        color: '#522F97',
        enableZoom: true,
        hoverColor: '#999999',
        hoverOpacity: 0.7,
        selectedColor: '#666666',
        showTooltip: true,
        onRegionClick: (event, code, region) => {
          console.log(`Clicked on ${region} with code ${code}`);
        }
      });
    }, 1000);



    // this.zone.runOutsideAngular(() => {
    //   $(this.worldMap.nativeElement).vectorMap({
    //     map: 'world_mill',
    //     backgroundColor: '#ffffff',
    //     zoomOnScroll: false,
    //     regionStyle: {
    //       initial: {
    //         fill: '#e0e0e0',
    //         'fill-opacity': 1,
    //         stroke: 'none',
    //         'stroke-width': 0,
    //         'stroke-opacity': 1
    //       },
    //       hover: {
    //         fill: '#bcbcbc',
    //         'fill-opacity': 0.8
    //       },
    //       selected: {
    //         fill: '#ffcc00' // Color for selected regions
    //       },
    //       selectedHover: {}
    //     },
    //     series: {
    //       regions: [{
    //         values: {
    //           'US': '#3498db', // Color for the United States
    //           'CA': '#2ecc71', // Color for Canada
    //           'BR': '#e74c3c', // Color for Brazil
    //           // Add values for other regions as needed
    //         },
    //         attribute: 'fill'
    //       }]
    //     },
    //     onRegionClick: function (event, code) {
    //       // Handle region click event if needed
    //       console.log('Clicked on region:', code);
    //     },
    //     onRegionTipShow: function (event, tip, code) {
    //       // Customize tooltip content if needed
    //       tip.html('Region: ' + code);
    //     },
    //     // Add more options as needed...
    //   });
    // });
  }
}
