import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';

@Injectable({
    providedIn: 'root'
  })
export class ServiceCenter extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

   getApiKey(): any {
    const url = `${environment.apiURL}/v1/service/getapi`;
    return this.post(url,{});
  }
   addKey(): any {
    const url = `${environment.apiURL}/v1/service/createapi`;
    return this.post(url,{});
  }
   editKey(object, id): any {
    const url = `${environment.apiURL}/v1/service/editapi/${id}`;
    return this.post(url,object);
  }
   deleteKey(id): any {
    const url = `${environment.apiURL}/v1/service/deleteapi/${id}`;
    return this.delete(url);
  }
   getNotificationMessage(): any {
    const url = `${environment.apiURL}/v1/message/notification`;
    return this.post(url,{});
  }

  // message push //
  getMsgConfigurations(): any {
    const url = `${environment.apiURL}/v1/service/getmessagepush`;
    return this.post(url,{});
  }
   sendTestMessage(object, id): any {
    const url = `${environment.apiURL}/v1/service/testmessage/${id}`;
    return this.post(url,object);
  }
  createmessagepush(object):any {
    const url = `${environment.apiURL}/v1/service/createmessagepush`;
    return this.post(url,object);
  }
  editEmailPush(object, id):any {
    const url = `${environment.apiURL}/v1/service/editmessagepush/${id}`;
    return this.post(url,object);
  }
  deleteEmailPush(id): any {
    const url = `${environment.apiURL}/v1/service/delete/${id}`;
    return this.delete(url);
  }

  // sms push //
  getSmsConfigurations(): any {
    const url = `${environment.apiURL}/v1/service/getsms`;
    return this.post(url,{});
  }
   sendTestSms(object, id): any {
    const url = `${environment.apiURL}/v1/service/testsms/${id}`;
    return this.post(url,object);
  }
  createsmspush(object):any {
    const url = `${environment.apiURL}/v1/service/createsms`;
    return this.post(url,object);
  }
  editSmsPush(object, id):any {
    const url = `${environment.apiURL}/v1/service/editsms/${id}`;
    return this.post(url,object);
  }
  deleteSmsPush(id): any {
    const url = `${environment.apiURL}/v1/service/delete/${id}`;
    return this.delete(url);
  }

    // Location service
    getLocationConfigurations(): any {
      const url = `${environment.apiURL}/v1/service/getlocationservice`;
      return this.post(url,{});
    }
    createLocationpush(object):any {
      const url = `${environment.apiURL}/v1/service/createlocationservice`;
      return this.post(url,object);
    }
    editLocationPush(object, id):any {
      const url = `${environment.apiURL}/v1/service/editlocationservice/${id}`;
      return this.post(url,object);
    }
    deleteLocationPush(id): any {
      const url = `${environment.apiURL}/v1/service/delete/${id}`;
      return this.delete(url);
    }


    // holiday configuration
    getHolidayConfigurations(): any {
        const url = `${environment.apiURL}/v1/service/getholidays`;
        return this.post(url,{});
    }
    createHolidayConfiguraiton(object):any {
        const url = `${environment.apiURL}/v1/service/createholiday`;
        return this.post(url,object);
    }
    editHolidayConfiguration(object, id):any {
        const url = `${environment.apiURL}/v1/service/updateholiday/${id}`;
        return this.post(url,object);
    }
    deleteHolidayConfiguration(id): any {
        const url = `${environment.apiURL}/v1/service/deleteHoliday/${id}`;
        return this.delete(url);
    }



}

