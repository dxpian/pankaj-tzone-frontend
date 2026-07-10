import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';
import { Observable, of } from 'rxjs';
import { PERMISSION } from '../../utils/typedef';

@Injectable({
    providedIn: 'root'
})
export class MobileUserService extends BaseService {

    constructor(_http: HttpClient) {
        super(_http);
    }

    // get all web admin users
    getWebAdminUsers(){
        const url = `${environment.apiURL}/v1/mobile/user-management/get-web-admin`;
        return this.post(url,{});
    }

    // get all sub-users of self
    getSubUsersOfSelf() {
        const url = `${environment.apiURL}/v1/mobile/user-management/get-sub-users`;
        return this.post(url,{});
    }
    // get all sub users of query
    getSubUsers(user_id: string){
        const url = `${environment.apiURL}/v1/mobile/user-management/get-owned-users/${user_id}`;
        return this.post(url,{});
    }

    /**
     * @description: Create new user with a different permission
     * @param data : formdata
     * @param parent_id : user ID of parent user
     * @param permission : permission of parent user
     * @returns 
     */
    createAcccount(data: any, parent_id: string,  permission: number){
        var url = ''
        if(permission == PERMISSION.WEB_MOB_ADMIN){
            url = `${environment.apiURL}/v1/mobile/user-management/create-web-admin`;
        }else if(permission == PERMISSION.MOB_ADMIN){
            url = `${environment.apiURL}/v1/mobile/user-management/create-admin/${parent_id}`;
        }
        else if(permission == PERMISSION.MOB_USER){
            url = `${environment.apiURL}/v1/mobile/user-management/create-user/${parent_id}`;
        }else{
            return of(null)
        }
        return this.post(url,data);
    }

    editAcccount(user_id: string, data: any, permission: number){
        var url = ''
        if(permission == PERMISSION.WEB_MOB_ADMIN){
            url = `${environment.apiURL}/v1/mobile/user-management/update-web-admin/${user_id}`;
        }else if(permission == PERMISSION.MOB_ADMIN){
            url = `${environment.apiURL}/v1/mobile/user-management/update-admin/${user_id}`;
        }else if(permission == PERMISSION.MOB_USER){
            url = `${environment.apiURL}/v1/mobile/user-management/update-user/${user_id}`;
        }else{
            return of(null)
        }
        return this.post(url,data);
    }
    
    deleteAccount(user_id: string, permission: number){
        var url = ''
        if(permission == PERMISSION.WEB_MOB_ADMIN)
            url = `${environment.apiURL}/v1/mobile/user-management/delete-web-admin/${user_id}`;
        else if(permission == PERMISSION.MOB_ADMIN)
            url = `${environment.apiURL}/v1/mobile/user-management/delete-admin/${user_id}`;
        else if(permission == PERMISSION.MOB_USER)
            url = `${environment.apiURL}/v1/mobile/user-management/delete-user/${user_id}`;
        else{
            console.error(`Invalid permission`)
            return of(null)
        }
        return this.delete(url);
    }

    createArea(data: any){
        const url = `${environment.apiURL}/v1/mobile/area/create-area`;
        return this.post(url,data);
    }

    updateArea(data: any, area_id: string){
        const url = `${environment.apiURL}/v1/mobile/area/update-area/${area_id}`;
        return this.post(url,data);
    }

    deleteArea(area_id: string){
        const url = `${environment.apiURL}/v1/mobile/area/delete-area/${area_id}`;
        return this.delete(url);
    }

    // read all areas
    getAllAreas(user_id: string){
        const url = `${environment.apiURL}/v1/mobile/area/get-user-areas/${user_id}`;
        return this.post(url,{});
    }


    createCluster(data: any){
        const url = `${environment.apiURL}/v1/mobile/cluster/create-cluster`;
        return this.post(url, data)
    }

    updateCluster(data: any, cluster_id: string){
        const url = `${environment.apiURL}/v1/mobile/cluster/update-cluster/${cluster_id}`;
        return this.post(url, data)
    }

    deleteCluster(cluster_id){
        const url = `${environment.apiURL}/v1/mobile/cluster/delete-cluster/${cluster_id}`;
        return this.delete(url)
    }

    getClusters(){
        const url = `${environment.apiURL}/v1/mobile/cluster/get-clusters-web-admin`;
        return this.post(url, {})
    }

    getClustersOfSubUser(user_id: string){
        const url = `${environment.apiURL}/v1/mobile/cluster/get-cluster-of-mobile/${user_id}`;
        return this.post(url, {})
    }



    getAllClustersBySuper(user_id: string){
        const url = `${environment.apiURL}/v1/mobile/cluster/get-cluster-of-superadmin`;
        return this.post(url, {})
    }

    

    control_cluster_permission(user_id: string, cluster_id: string, permissoin: number){
        var data = {
            user: user_id,
            cluster: cluster_id,
            permission: permissoin
        }
        const url = `${environment.apiURL}/v1/mobile/cluster/control-cluster-permission`;
        return this.post(url, data)
    }

    query_cluster_permission(user_id: string, cluster_id: string){
        var data = {
            user: user_id,
            cluster: cluster_id
        }
        const url = `${environment.apiURL}/v1/mobile/cluster/query-cluster-permission`;
        return this.post(url, data)
    }

 }

