import { Component, OnInit } from '@angular/core';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';

@Component({
  selector: 'app-reporting-view',
  templateUrl: './reporting-view.component.html',
  styleUrls: ['./reporting-view.component.scss']
})
export class ReportingViewComponent implements OnInit {
  realTimeData: any
  serialId: string;
  dataForChart :any
  constructor(private _deviceServices:DeviceManagementService,  private _route:ActivatedRoute,) {}
  ngOnInit(): void {
 // Access route parameters using ActivatedRoute
 this._route.paramMap.subscribe((params) => {
  // Get the 'id' parameter value
  this.serialId = params.get('id');
   this.getRealTimeData(this.serialId);
   let id  =JSON.parse(localStorage.getItem('deviceId'));
   this.getAllDeviceLoggers(id);
 });  }
  getRealTimeData(serial) {
    let object = {
      did: serial
    }
    forkJoin([
      this._deviceServices.getHumidity(object),
      this._deviceServices.getTemperature(object),
      this._deviceServices.getVibration(object),
      this._deviceServices.getLight(object),
      this._deviceServices.getWifi(object),
      this._deviceServices.getbattery(object),
    ]).pipe(
      map(([humidity, temperature, vibration, light, wifi, battery]: any) => ({
        humidity: [humidity],
        temperature: [temperature],
        vibration: [vibration],
        light: [light],
        wifi: [wifi],
        battery: [battery]
      })),
      catchError((error) => of({ error }))
    )
      .subscribe((res: any) => {
        if (res) {
          this.realTimeData = res;
          
        }
      })

  }
  getAllDeviceLoggers(serial) {
    let endDate = moment(); // current date and time
    let startDate = moment().subtract(7, 'days'); // a  
    let object = {
        from: startDate,
        to: endDate,
    }
    this._deviceServices.getAllLoggers(object, serial).then((res: any) => {
        if(res && !res.error_code) {
        console.log('loggers', res)
        this.dataForChart = res?.object
        }
    })
    }
  getData(value) {
    if(value == 'humidity') {
      if(this.realTimeData?.humidity && !this.realTimeData?.humidity[0].error_code) {
        return this.realTimeData?.humidity[0].object.humidity+'%' || ''
       }
     }
    if(value == 'temperature') {
      if(this.realTimeData?.temperature && !this.realTimeData?.temperature[0].error_code) {
        return this.realTimeData?.temperature[0].object.temperature+'℃' || ''
       }
    }
    if(value == 'light') {
      if(this.realTimeData?.light && !this.realTimeData?.light[0].error_code) {
        return this.realTimeData?.light[0].object.light+'Lux' || ''
       }
    }
    if(value == 'vibration') {
      if(this.realTimeData?.vibration && !this.realTimeData?.vibration[0].error_code) {
        return this.realTimeData?.vibration[0].object.vibration
       }
    }
    if(value == 'wifi') {
      if(this.realTimeData?.wifi && !this.realTimeData?.wifi[0].error_code) {
  
        return this.findHighestDBValue(this.realTimeData?.wifi[0].object.wifi)+'dBm' || ''
       }
    }
    if(value == 'battery') {
      if(this.realTimeData?.battery && !this.realTimeData?.battery[0].error_code) {
        return this.realTimeData?.battery[0].object.battery+'%' || ''
       }
    }
   }
   findHighestDBValue(singal) {
    if(singal) {
      const entries = singal.split(',');
      let highestDB = -Infinity;
  
      entries.forEach(entry => {
        const [, dBValue] = entry.split(' ');
  
        const dB = parseInt(dBValue, 10);
  
        if (dB > highestDB) {
          highestDB = dB;
        }
      });
  
        if(highestDB != -Infinity) {
          return  highestDB;
        } else {
          return '--'
        }
     }
    }
}
