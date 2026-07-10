import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';
import { PageQuery } from '../utils/typedef';

@Injectable({
    providedIn: 'root'
  })
export class AlarmSettingService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

  // add alarm to for user's devices
  addAlarm(object: any): any {
    const url = `${environment.apiURL}/v1/useralarm/add`;
    return this.post(url, object);// {withCredentials: true}
  }

  // edit alarm property
  editAlarm(object: any): any {
    const url = `${environment.apiURL}/v1/useralarm/update/${object.id}`;
    return this.post(url, object);
  }



  // get one Alarm by id
  getAlarm(): any {
    const url = `${environment.apiURL}/v1/useralarm/get`;
    return this.post(url);
  }

  getAlarmWithPage(pageQuery: PageQuery): any {
    const url = `${environment.apiURL}/v1/useralarm/getWithPage`;
    return this.post(url, pageQuery);
  }


   // delete one Alarm
   deleteUserAlarm(id): any {
    const url = `${environment.apiURL}/v1/useralarm/delete/${id}`;
    return this.delete(url);
  }

}

