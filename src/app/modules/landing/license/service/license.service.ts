import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';

@Injectable({
    providedIn: 'root',
})
export class LicenseService extends BaseService {
    constructor(_http: HttpClient) {
        super(_http);
    }

    getFeatures() {
        return this.post(`${environment.apiURL}/v1/license/feature/get-feature`, {});
    }

    getLicenseStats() {
        return this.post(`${environment.apiURL}/v1/license/mng/read-license-stats`, {});
    }

    getLicenses() {
        return this.post(`${environment.apiURL}/v1/license/mng/read-license`, {});
    }

    createLicense(payload: { license: any; features: any[] }) {
        return this.post(`${environment.apiURL}/v1/license/mng/create-license`, payload);
    }

    updateLicense(id: string, payload: { features: string[] }) {
        return this.post(`${environment.apiURL}/v1/license/mng/update-license/${id}`, payload);
    }

    deleteLicense(id: string) {
        return this.post(`${environment.apiURL}/v1/license/mng/delete-license/${id}`, {});
    }

    readEligibleUsers() {
        return this.post(`${environment.apiURL}/v1/license/user/read-eligible-users`, {});
    }

    readLicenseStatus() {
        return this.post(`${environment.apiURL}/v1/license/user/read-license-status`, {});
    }

    getOverride(userId: string) {
        return this.post(`${environment.apiURL}/v1/license/override/get-override/${userId}`, {});
    }

    updateOverride(userId: string, features: { feature: string; status: number }[]) {
        return this.post(`${environment.apiURL}/v1/license/override/update-override/${userId}`, { features });
    }

    assignLicense(userId: string, licenseId: string) {
        return this.post(`${environment.apiURL}/v1/license/user/assign-license/${userId}/${licenseId}`, {});
    }

    unassignLicense(userId: string, licenseId: string) {
        return this.post(`${environment.apiURL}/v1/license/user/unassign-license/${userId}/${licenseId}`, {});
    }

    setExpireDate(userId: string, licenseId: string, endDate: string | null) {
        return this.post(`${environment.apiURL}/v1/license/user/set-expire-date/${userId}/${licenseId}`, { endDate });
    }
}
