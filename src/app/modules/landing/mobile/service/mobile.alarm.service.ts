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
        const url = `${environment.apiURL}/v1/mobile/user-management/get-web-admin`;
        return this.post(url,{});
    }
 }

