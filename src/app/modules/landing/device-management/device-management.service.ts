import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';
import { PageQuery } from '../utils/typedef';

@Injectable({
    providedIn: 'root'
  })
export class DeviceManagementService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

  // addDevices(object: any): any {
  //   const url = `${environment.apiURL}Company/Create`;
  //   return this.post(url, object);
  // }

  // add one device to user
  saveDevices(object: any): any {
    const url = `${environment.apiURL}/v1/device/add`;
    return this.post(url, object);// {withCredentials: true}
  }

  // edit device property
  editDevices(object: any): any {
    const url = `${environment.apiURL}/v1/device/update/${object.id}`;
    return this.post(url, object);
  }

  // get one device by id
  getDeviceById(id: any): any {
    const url = `${environment.apiURL}/v1/device/device/${id}`;
    return this.post(url,{});
  }

  getLastTimeofDevice(id: any): any{
    const url = `${environment.apiURL}/v1/device/device/${id}/lasttime`;
    return this.post(url,{});
  }

  getTimezoneofDevice(id: any): any{
    const url = `${environment.apiURL}/v1/device/device/${id}/timezone`;
    return this.post(url,{});
  }

  // getDevices(): any {
  //   const url = `${environment.apiURL}/Device`;
  //   return this.get(url);
  // }
  // delete one device by id
  deleteDevicebyId(id): any {
    const url = `${environment.apiURL}/v1/device/device/${id}`;
    return this.delete(url);
  }

  // delete all device of one user
  deleteUserDevices(id): any {
    const url = `${environment.apiURL}/v1/device/user/${id}`;
    return this.delete(url);
  }
  // get all devices of one user
  getuserDevice(id): any {
    const url = `${environment.apiURL}/v1/device/user/${id}`;
    return this.post(url,{});
  }

  getuserDeviceSummarize(id): any {
    const url = `${environment.apiURL}/v1/device/userDeviceSummarize/${id}`;
    return this.post(url,{});
  }


  getUserDeviceWithPage(id, pageRequest: PageQuery): any{
    const url = `${environment.apiURL}/v1/device/userpagination/${id}`;
    return this.post(url, pageRequest);
  }

  getUserDeviceDetailsWithPage(id, pageRequest: PageQuery): any{
    const url = `${environment.apiURL}/v1/device/userDeviceDetailsWithPage/${id}`;
    return this.post(url, pageRequest);
  }


  getLastState(did): any{
    const url = `${environment.apiURL}/v1/log/device/${did}/lastState`;
    return this.post(url,{});
  }

  // get All loggers
  getAllLoggers(object, did):any {
    const url = `${environment.apiURL}/v1/log/device/${did}/allFront`;
    return this.post(url,object);
  }

  // get All loggers
  getAllLoggersByLimit(object, did):any {
    const url = `${environment.apiURL}/v1/log/device/${did}/allFrontPagelimit`;
    return this.post(url,object);
  }


  getDeviceDetailData(serial: string): any{
    const url = `${environment.apiURL}/v1/device/userDeviceDetailsWithSerial/${serial}`;
    return this.post(url, {});
  }

  // get All loggers
  getLoggers(object, did):any {
    const url = `${environment.apiURL}/v1/log/device/${did}/all`;
    return this.post(url,object);
  }
  // get last humidity
  getHumidity(object): any {
    const url = `${environment.apiURL}/v1/log/device/${object.did}/humidity`;
    return this.post(url,object);
  }
  // get last humidity
  getHumidityRange(object, did): any {
    const url = `${environment.apiURL}/v1/log/range/${did}/humidity`;
    return this.post(url,object);
  }
  // get last light
  getLight(object): any {
    const url = `${environment.apiURL}/v1/log/device/${object.did}/light`;
    return this.post(url,object);
  }
  // get last wifi
  getWifi(object): any {
    const url = `${environment.apiURL}/v1/log/device/${object.did}/wifi`;
    return this.post(url,object);
  }
  // get last temperature
  getTemperature(object): any {
    const url = `${environment.apiURL}/v1/log/device/${object.did}/temperature`;
    return this.post(url,object);
  }


  // get last vibration value
  getVibration(object): any {
    const url = `${environment.apiURL}/v1/log/device/${object.did}/vibration`;
    return this.post(url,object);
  }
  // get last battery value
  getbattery(object): any {
    const url = `${environment.apiURL}/v1/log/device/${object.did}/battery`;
    return this.post(url,object);
  }

  getAlarm(object): any{
    const url = `${environment.apiURL}/v1/log/device/${object.did}/alarm`;
    return this.post(url,object);
  }

  getDeviceLogs(id): any {
    const url = `${environment.apiURL}/log/${id}`;
    return this.get(url);
  }
  getLogsOneDevice(object:any, id:any): any {
      const url = `${environment.apiURL}/v1/log/device/${id}/all`;
      return this.post(url,object);
  }
  getAlarmsOneDevice(object:any, id:any): any {
    const url = `${environment.apiURL}/v1/log/range/${id}/alarm`;
    return this.post(url,object);
  }
  getGpshistory(object:any, id:any): any {
    const url = `${environment.apiURL}/v1/log/range/${id}/gps`;
    return this.post(url,object);
  }
  createPdfExcelReport(object:any, id:any): any {
    const url = `${environment.apiURL}/v1/log/print/${id}`;
    return this.post(url,object);
  }

  // create report with the batch loggers
  createBatchPdfExcelReport(object:any): any {
    const url = `${environment.apiURL}/v1/log/printBatch`;
    return this.post(url,object);
  }


  // create report with the batch loggers
  createBatchPdfExcelReportAsync(object:any): any {
    const url = `${environment.apiURL}/v1/log/printBatchAsync`;
    return this.post(url,object);
  }

  pullBatchPrintTaskStatus(taskId: string): any {
    const url = `${environment.apiURL}/v1/log/pullPrintstatus/${taskId}`;
    return this.post(url, {});
  }

  clearBatchPrintTask(taskId: string){
        const url = `${environment.apiURL}/v1/log/clearPrintTask/${taskId}`;
        return this.post(url, {});
  }

  getFiles(object:any):any {
     const url = `${environment.apiURL}/v1/log/search/${object}`;
    return this.post(url);
  }
  deletReport(object:any):any {
     const url = `${environment.apiURL}/v1/log/report/${object.did}/${object.rid}`;
    return this.delete(url);
  }

  deletReportsMultiple(ids: any):any {
    const url = `${environment.apiURL}/v1/log/report/deleteMultiple`;
    return this.post(url, ids);
  }

  downloadReport(object:any):any {
     const url = `${environment.apiURL}/v1/log/download/${object.did}/${object.rid}`;
    return this.post(url,{}, { responseType: 'blob' });
  }

  getDeviceGroups():any {
    const url = `${environment.apiURL}/v1/account/GetGroupReviseConfiguration`;
    return this.post(url, {});
  }

  getDeviceGroupNames():any {
    const url = `${environment.apiURL}/v1/account/GetAllGroupNames`;
    return this.post(url, {});
  }

  // setupApis
   getDownlinkCommand(id):any {
    const url = `${environment.apiURL}/v1/command/ReadDownlinkCommands/${id}`;
    return this.post(url,{});
   }

   deleteDonwlinkCommand(cid): any{
    const url = `${environment.apiURL}/v1/command/deleteDownlinkCommand/${cid}`;
    return this.delete(url);
   }
   setDataInterval(object,id):any {
    const url = `${environment.apiURL}/v1/command/SetDataInterval/${id}`;
    return this.post(url,object);
   }
   setGPS(object,id):any {
    const url = `${environment.apiURL}/v1/command/SetGpsOntime/${id}`;
    return this.post(url,object);
   }
   setCommand(object,id):any {
    const url = `${environment.apiURL}/v1/command/SetCustomeCommand/${id}`;
    return this.post(url,object);
   }
   setAirplanMode(object,id):any {
    const url = `${environment.apiURL}/v1/command/SetAirPlaneMode/${id}`;
    return this.post(url,object);
   }

    downloadRegisterTemplateFile(): any{
        const url = `${environment.apiURL}/v1/device/download_register_template`;
        return this.post(url,{}, { responseType: 'blob' });
    }
}

