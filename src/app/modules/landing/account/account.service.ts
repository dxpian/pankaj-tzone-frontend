import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../enviroment/enviroment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AccountService extends BaseService {

    constructor(_http: HttpClient) {
        super(_http);
    }

    // user profiles related api
    getUserProfiles() {
        const url = `${environment.apiURL}/v1/account/getprofile`;
        return this.post(url,{});
    }
    saveUserProfile(object) {
        const url = `${environment.apiURL}/v1/account/getprofile`;
        return this.post(url,object);
    }
    updateEmailAndPhone(object) {
        const url = `${environment.apiURL}/v1/account/ChangeEmailPhone`;
        return this.post(url,object);
    }
    updateLanguageAndTimezone(object) {
        const url = `${environment.apiURL}/v1/account/ChangeLanguageTimezone`;
        return this.post(url,object);
    }

    updateEmailLanguage(object) {
        const url = `${environment.apiURL}/v1/account/ChangeEmailLanguage`;
        return this.post(url,object);
    }

    changePassword(object) {
        const url = `${environment.apiURL}/v1/account/changePassword`;
        return this.post(url,object);
    }
    deleteProfile() {
        const url = `${environment.apiURL}/v1/account/DeleteAccount`;
        return this.delete(url);
    }


    // user management endpoints

    getAllUserAccounts() {
        const url = `${environment.apiURL}/v1/account/GetSubAccounts`;
        return this.post(url,{});
    }
    createSubAccount(object): any {
        const url = `${environment.apiURL}/v1/account/CreateSubAccount`;
        return this.post(url,object);
    }
    createGroup(object): any {
        const url = `${environment.apiURL}/v1/account/CreateGroupRevise`;
        return this.post(url,object);
    }
     editGroup(object,id): any {
        const url = `${environment.apiURL}/v1/account/EditGroupRevise/${id}`;
        return this.post(url,object);
    }
     editSubaccount(object,id): any {
        const url = `${environment.apiURL}/v1/account/EditSubaccount/${id}`;
        return this.post(url,object);
    }
    getSubRoles():any {
        const url = `${environment.apiURL}/v1/account/GetSubAccounts`;
        return this.post(url,{});
    }
    editReviseRole(object, id): any {
        const url = `${environment.apiURL}/v1/service/editapi/${id}`;
        return this.post(url, object);
    }
    getAssignedUsers(id):any {
        const url = `${environment.apiURL}/v1/account/GetUserstateofPermission/${id}`;
        return this.post(url,{});
    }
    deleteGroupPermission(id): any {
        const url = `${environment.apiURL}/v1/account/DeleteGroupPermission/${id}`;
        return this.delete(url);
    }
    deleteReviseRole(id): any {
        const url = `${environment.apiURL}/v1/account/DeleteSubaccount/${id}`;
        return this.delete(url);
    }

    // api for groups permissions
    getGroupConfigs() {
        const url = `${environment.apiURL}/v1/account/GetGroupReviseConfiguration`;
        return this.post(url,{});
    }

    saveGroupsPermission(object,id): any {
        const url = `${environment.apiURL}/v1/account/EditGroupPermission/${id}`;
        return this.post(url,object);
    }


    // log information
    getLogInformation() {
        const url = `${environment.apiURL}/v1/account/GetLoginInformation`;
        return this.post(url,{});
    }
    OperationLog() {
        const url = `${environment.apiURL}/v1/account/GetOperationLog`;
        return this.post(url,{});
    }

    OperationLogRange(range: any) {
        const url = `${environment.apiURL}/v1/account/GetOperationLogRange`;
        return this.post(url, range);
    }


    // Security Service and policies
    getSecurityService() {
        const url = `${environment.apiURL}/v1/account/GetSecurityEnableState`;
        return this.post(url,{});
    }
    saveSecurityService(object): any {
        const url = `${environment.apiURL}/v1/account/SaveSecurityEnableState`;
        return this.post(url,object);
    }

    // admin user account management
     // create user details with admin
    createUserDetials(params: any): any {
        return this.post(`${environment.apiURL}/v1/auth/createUserWithDetails`, params);
    }

    // update user details with admin account
    updateUserDetials(id: string, params: any): any {
        return this.post(`${environment.apiURL}/v1/auth/updateUserDetails/${id}`, params);
    }

    // delete account by id
    deleteAccount(userid: string): any {
        return this.post(`${environment.apiURL}/v1/auth/deleteAccount/${userid}`, {});
    }

    // update user details with admin account
    getUserDetials(): any {
        return this.post(`${environment.apiURL}/v1/auth/getAllUsers`, {});
    }
 }

