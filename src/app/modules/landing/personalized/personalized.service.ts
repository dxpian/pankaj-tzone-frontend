import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';

@Injectable({
    providedIn: 'root'
})
export class personalizedService extends BaseService {

    constructor(_http: HttpClient) {
        super(_http);
    }
    // site setting //
    uploadLogo(formData: FormData) {
        const headers = new HttpHeaders();
        headers.append('Content-Type', 'multipart/form-data');
        const url = `${environment.apiURL}/v1/personalize/uploadlogo1Image`;
        return this.post(url, formData, { headers });
    }

    uploadLogo2(formData: FormData) {
        const headers = new HttpHeaders();
        headers.append('Content-Type', 'multipart/form-data');
        const url = `${environment.apiURL}/v1/personalize/uploadlogo2Image`;
        return this.post(url, formData, { headers });
    }
    uploadLogo3(formData: FormData) {
        const headers = new HttpHeaders();
        headers.append('Content-Type', 'multipart/form-data');
        const url = `${environment.apiURL}/v1/personalize/UploadBackground`;
        return this.post(url, formData, { headers });
    }
    getSiteConfiguarations() {
        const url = `${environment.apiURL}/v1/personalize/getsiteconfiguration`;
        return this.post(url, {});
    }
    SaveSiteConfiguarations(object): any {
        const url = `${environment.apiURL}/v1/personalize/savesiteconfiguration`;
        return this.post(url, object);
    }

    // end //

    // Domain Setting //

    getDomainSettings() {
        const url = `${environment.apiURL}/v1/personalize/GetDomain`;
        return this.post(url, {});
    }
    SaveDomainSettings(object): any {
        const url = `${environment.apiURL}/v1/personalize/SaveDomain`;
        return this.post(url, object);
    }

    // end //

    // contact //
    getContacts() {
        const url = `${environment.apiURL}/v1/personalize/GetContract`;
        return this.post(url, {});
    }
    SaveContacts(object): any {
        const url = `${environment.apiURL}/v1/personalize/SaveContract`;
        return this.post(url, object);
    }
}
