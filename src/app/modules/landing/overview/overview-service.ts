import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';

@Injectable({
    providedIn: 'root'
})
export class overviewService extends BaseService {

    constructor(_http: HttpClient) {
        super(_http);
    }

    // user profiles related api
    getOverView() {
        const url = `${environment.apiURL}/v1/overview/GetOverview`;
        return this.post(url,{});
    }
 }

