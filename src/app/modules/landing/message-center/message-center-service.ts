import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';

@Injectable({
    providedIn: 'root'
  })
export class messageCenterInformationService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

   getAlarmMessagePagination(range: any): any {
    const url = `${environment.apiURL}/v1/message/alarmRange`;
    return this.post(url,range);
  }
   getExceptionInfo(): any {
    const url = `${environment.apiURL}/v1/message/exception`;
    return this.post(url,{});
  }
   getNotificationMessage(): any {
    const url = `${environment.apiURL}/v1/message/notification`;
    return this.post(url,{});
  }


}

