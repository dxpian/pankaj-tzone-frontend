import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';
import { AlfresaBranch, AlfresaCenter } from './alfresa.type';


@Injectable({
    providedIn: 'root'
  })
export class AlfresaCenterService extends BaseService {

  constructor(_http: HttpClient) {
    super(_http);
  }

  // add one device to user
  createCenter(object: AlfresaCenter): any {
    const url = `${environment.apiURL}/v1/service/alfresa/center-create`;
    return this.post(url, object);
  }

  // edit device property
  updateCenter(object: AlfresaCenter, center_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/center-update/${center_id}`;
    return this.post(url, object);
  }

  // get one device by id
  getCenters(): any {
    const url = `${environment.apiURL}/v1/service/alfresa/center-getAll`;
    return this.post(url,{});
  }

  getCenterPage(page: any){
    const url = `${environment.apiURL}/v1/service/alfresa/center-getpage`;
    return this.post(url, page);
  }

  getAllCenterNames(): any{
    const url = `${environment.apiURL}/v1/service/alfresa/center-getNames`;
    return this.post(url,{});
  }

  // delete one device by id
  deleteCenter(center_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/center-delete/${center_id}`;
    return this.delete(url);
  }


  // add one device to user
  createBranch(object: AlfresaBranch): any {
    const url = `${environment.apiURL}/v1/service/alfresa/branch-create`;
    return this.post(url, object);
  }

  // edit device property
  updateBranch(object: AlfresaBranch, center_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/branch-update/${center_id}`;
    return this.post(url, object);
  }

  // get one device by id
  getBranchs(): any {
    const url = `${environment.apiURL}/v1/service/alfresa/branch-getAll`;
    return this.post(url,{});
  }

  // get one device by id
  getBranchOfCenter(center_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/get-branchOfCenter/${center_id}`;
    return this.post(url,{});
  }


  getAllBranchNames(): any{
    const url = `${environment.apiURL}/v1/service/alfresa/branch-getNames`;
    return this.post(url,{});
  }

  // delete one device by id
  deleteBranch(brnach_id: string): any {
    const url = `${environment.apiURL}/v1/service/alfresa/branch-delete/${brnach_id}`;
    return this.delete(url);
  }



}

