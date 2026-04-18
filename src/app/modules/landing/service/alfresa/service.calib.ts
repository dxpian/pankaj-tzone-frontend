import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';
import { AlfresaCalibrationConfig, CalibrationSchedule } from './alfresa.type';
import { Observable } from 'rxjs';
import { DB_RESULT } from '../../utils/typedef';


@Injectable({
    providedIn: 'root'
  })
export class AlfresaCalibService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

  // add one device to user
  createCalibration(object: AlfresaCalibrationConfig): any {
    const url = `${environment.apiURL}/v1/service/alfresa/create_calibration`;
    return this.post(url, object);
  }

  // edit device property
  updateCalibration(object: AlfresaCalibrationConfig, calib_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/edit_calibration/${calib_id}`;
    return this.post(url, object);
  }


  getCalibrationPage(page: any){
    const url = `${environment.apiURL}/v1/service/alfresa/get_calibration_page`;
    return this.post(url, page);
  }

  // delete one device by id
  deletCalibration(calib_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/delete_calibration/${calib_id}`;
    return this.delete(url);
  }


  refreshCalibSchedule(calib_id: string): any{
    const url = `${environment.apiURL}/v1/service/alfresa/refresh_calibration_schedule/${calib_id}`;
    return this.post(url);
  }


  downloadCalibFileTempate(): any{
    const url = `${environment.apiURL}/v1/service/alfresa/download_schedule_template`;
    return this.post(url,{}, { responseType: 'blob' });
  }

  // read the calibration temperature pair around start/end time
  getTemperaturePair(calib_id: string, query): any{
    const url = `${environment.apiURL}/v1/service/alfresa/get_temperature_pair/${calib_id}`;
    return this.post(url, query);
  }

  // change the actual start/end time of calibratin
  controlCalibrationTime(calib_id: string, query): any{
    const url = `${environment.apiURL}/v1/service/alfresa/control_calibtime/${calib_id}`;
    return this.post(url, query);
  }

}

