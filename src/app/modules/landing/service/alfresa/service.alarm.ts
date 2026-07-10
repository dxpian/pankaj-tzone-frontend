import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';
import { AlfresaAlarms } from './alfresa.type';


@Injectable({
    providedIn: 'root'
  })
export class AlfresaAlarmService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

  // add one device to user
  createAlfAlarm(object: AlfresaAlarms): any {
    const url = `${environment.apiURL}/v1/service/alfresa/create_alarm`;
    return this.post(url, object);
  }

  // edit device property
  updateAlfAlarm(object: AlfresaAlarms, alarm_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/update_alarm/${alarm_id}`;
    return this.post(url, object);
  }


  getAlfAlarmPage(page: any){
    const url = `${environment.apiURL}/v1/service/alfresa/read_alarm_page`;
    return this.post(url, page);
  }

  // delete one device by id
  deletAlfAlarm(alarm_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/delete_alarm/${alarm_id}`;
    return this.delete(url);
  }




}

