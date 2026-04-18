import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DeviceState } from 'app/modules/landing/utils/typedef';
import { isNumber } from 'lodash';

@Component({
  selector: 'app-real-time-data',
  templateUrl: './real-time-data.component.html',
  styleUrls: ['./real-time-data.component.scss']
})
export class RealTimeDataComponent implements OnInit, OnChanges{
    @Input() realTimeData:DeviceState

    ngOnInit(): void {
    
    }
    ngOnChanges(changes: SimpleChanges): void {
        if(this.realTimeData) {
        console.log('changes on rtm', this.realTimeData) 
        }
    }
    getData(value): String {
    
        if(value == 'humidity') {
            if(this.realTimeData?.humidity != null)
                return this.realTimeData?.humidity + '%'
            return '-- %'
        }
        else if(value == 'temperature') {
            const tempInternal =  (this.realTimeData?.temperature != null)?  this.realTimeData?.temperature + '℃' :  '--℃'
            const tempExternal = (this.realTimeData?.tempexternal!= null)?  this.realTimeData?.tempexternal + '℃' :  '--℃'
            return tempInternal + ' / ' + tempExternal; 

        }
        else if(value == 'light') {
            if(this.realTimeData?.light != null)
                return this.realTimeData?.light + 'Lux'
            return  '-- Lux'
        }
        else if(value == 'vibration') {
            if(this.realTimeData?.vibration != null)
             return  this.realTimeData?.vibration + 'mg'; 
            return   '-- mg'; 
        }
        else if(value == 'wifi') {
            if(this.realTimeData?.wifi) {
                return (this.findHighestDBValue(this.realTimeData?.wifi) || '') + 'dBm'
            }
            return '-- dBm'
        }
        else if(value == 'battery') {
            if(this.realTimeData?.battery != null)
                return this.realTimeData?.battery +'%'
            return  '--%'
        }
        else if(value == 'location'){
            if(this.realTimeData?.city)
                return this.realTimeData?.city; 
            return '--'
        }
        return '--'
    }

    getFullAddress(){
        return this.realTimeData?.address;
    }

    isNumber(value: string): boolean {
        return !isNaN(Number(value));
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
            }});

            if(highestDB != -Infinity) {
                return  highestDB;
            } else {
                return '--'
            }
        }
    }
}
