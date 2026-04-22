import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';
import { Observable, of } from 'rxjs';
import { PERMISSION } from '../../utils/typedef';

@Injectable({
    providedIn: 'root'
})
export class MobileAlarmService extends BaseService {

    constructor(_http: HttpClient) {
        super(_http);
    }

    // get all web admin users
    createMobileAlarm(data: any){
        const url = `${environment.apiURL}/v1/mobile/alarm/create-alarm`;
        return this.post(url,data);
    }

    updateMobileAlarm(data: any, alarm_id: string){
        const url = `${environment.apiURL}/v1/mobile/alarm/update-alarm/${alarm_id}`;
        return this.post(url,data);
    }

    getMobileAlarm(alarm_id: string){
        const url = `${environment.apiURL}/v1/mobile/alarm/get-alarms-of-user/${alarm_id}`;
        return this.post(url,{});
    }

    getMobileAlarmPage(page: any){
        const url = `${environment.apiURL}/v1/mobile/alarm/get-alarms-of-user-page`;
        return this.post(url,page);
    }

    deleteMobileAlarm(alarm_id: string){
        const url = `${environment.apiURL}/v1/mobile/alarm/delete-alarm/${alarm_id}`;
        return this.delete(url);
    }

    // attach mobile user to alarm
    attachMobileUserToAlarm(alarm_id: string, users: string[]){
        const url = `${environment.apiURL}/v1/mobile/alarm/bind-users-to-alarm/${alarm_id}`;
        return this.post(url,{users});
    }

    // get connected mobile users to alarm
    getConnectedMobileUsersToAlarm(alarm_id: string){
        const url = `${environment.apiURL}/v1/mobile/alarm/get-connected-users-of-alarm/${alarm_id}`;
        return this.post(url,{});
    }
}

