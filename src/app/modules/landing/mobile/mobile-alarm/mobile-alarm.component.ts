import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MobileAlarmConfig } from '../../utils/typedef';
import { MobileAlarmService } from '../service/mobile.alarm.service';

@Component({
  selector: 'app-mobile-alarm',
  templateUrl: './mobile-alarm.component.html',
  styleUrls: ['./mobile-alarm.component.scss']
})
export class MobileAlarmComponent {
  
  public dataSourceAlarm = new MatTableDataSource<MobileAlarmConfig>()


  constructor(private _mobileAlarmService: MobileAlarmService){

  }

  


}
