import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { DatePipe } from '@angular/common';
import { environment } from 'app/enviroment/enviroment';

@Directive({
  selector: '[appChangeColorBasedOnTime]'
})
export class ChangeColorBasedOnTimeDirective {
  @Input() set appChangeColorBasedOnTime(data: { lastTime: string, alarmTime: string | undefined }) {

    // 1. read timezone from localstorage
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const timezone = userInfo.timezone;

    // 2. convert current time into the device timezone
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

    // 3. calculate the time difference
    const lastModifiedTime = new Date(data.lastTime);
    const timeDifference = currentTime.getTime() - lastModifiedTime.getTime();
    const hoursDifference = timeDifference / (1000 * 3600);

    var alarm = false
    if(data.alarmTime){
        const lastAlarmTime = new Date(data.alarmTime);
        if(!isNaN(lastAlarmTime.getTime())){
            const timeDiffAlarm = currentTime.getTime() - lastAlarmTime.getTime();
            const hoursDiffAlarm = timeDiffAlarm / (1000 * 3600);
            if(hoursDiffAlarm < environment.activeAlarmHours)
                alarm = true
        }
    }


    if (hoursDifference < 24) {
        if(alarm)
            this.renderer.setStyle(this.el.nativeElement, 'background-color', 'rgb(255, 38, 0)');
        else
            this.renderer.setStyle(this.el.nativeElement, 'background-color', ' #17A00E');


    } else {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', ' #6C757D');
    }
  }
  constructor(private el: ElementRef, private renderer: Renderer2, private datePipe: DatePipe) {}

}
