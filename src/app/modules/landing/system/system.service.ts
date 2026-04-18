import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';

@Injectable({
  providedIn: 'root'
})
export class SystemService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

  getDeviceListBigScreen(): any {
    const url = `${environment.apiURL}/v1/bigscreen/GetAllDeviceList`;
    return this.post(url, {});
  }
  getGetSelectedDevicesBigScreen(): any {
    const url = `${environment.apiURL}/v1/bigscreen/GetSelectedDevices`;
    return this.post(url, {});
  }
  addSelectedDevicesBigScreen(id): any {
    const url = `${environment.apiURL}/v1/bigscreen/AddSelectedDevice/${id}`;
    return this.post(url, {});
  }

  removeSelectedDevicesBigScreen(id): any {
    const url = `${environment.apiURL}/v1/bigscreen/RemoveSelectedDevice/${id}`;
    return this.post(url, {});
  }
  getNotificationMessage(): any {
    const url = `${environment.apiURL}/v1/message/notification`;
    return this.post(url, {});
  }

}

