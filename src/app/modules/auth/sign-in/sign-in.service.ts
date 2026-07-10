import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';

@Injectable({
    providedIn: 'root'
  })
export class SignInService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

  getUsers(): any {
    const url = `${environment.apiURL}/user`;
    return this.get(url);
  }
  login(obj):any {
    const url = `${environment.apiURL}/v1/auth/login`;
    return this.post(url, obj);
  }

  createUser(obj):any {
    const url = `${environment.apiURL}/v1/auth/signup`;
    return this.post(url, obj);
  }

  sendPasswordResetRequest(obj): any{
    const url = `${environment.apiURL}/v1/password/forgot-password`;
    return this.post(url, obj);
  }


  

}

