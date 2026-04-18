import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { USER_ROLE } from 'app/modules/landing/account/account.typedef';
import { ACCOUNT_TYPE, PERMISSION } from 'app/modules/landing/utils/typedef';

import {jwtDecode} from 'jwt-decode';
import { BehaviorSubject, Observable } from 'rxjs';


// service to share variables between components
@Injectable({
  providedIn: 'root'
})
export class SharedService {
    private accesstoken: string = ''
    private permission = PERMISSION.NORMAL
    private type = ACCOUNT_TYPE.NORMAL
    private role = USER_ROLE.SUB_QUERY
    private id = ''
    constructor() {}

    // set accesstoken
    setAccesstoken(accesstoken: string){
        const token:string = localStorage.getItem('accesstoken')||'';
        if(!token){
            console.log(`Invalid token`)
            return PERMISSION.INVALID
        }
        // deserailize token
        const decodedToken = jwtDecode<{ id: string, permission: string, type: string, role: string}>(token);

        // parse permission
        this.permission = parseInt(decodedToken.permission)
        if(isNaN(this.permission))
            this.permission = PERMISSION.NORMAL

        // parse account type
        this.type = parseInt(decodedToken.type)
        if(isNaN(this.type))
            this.type = ACCOUNT_TYPE.NORMAL

        this.role = parseInt(decodedToken.role)
        if(isNaN(this.role))
            this.role = USER_ROLE.SUB_QUERY

        this.id = decodedToken.id
        console.log(`User role type: ${this.role}`)

    }

    getId(): string{
        return this.id
    }
    getPermission(): number{
        return this.permission
    }

    getAccountType(): number{ // ACCOUNT_TYPE
        return this.type
    }

    getAccountRole(): number{
        return this.role
    }


    /*getPermission() {
        const token:string = localStorage.getItem('accesstoken')||'';
        if(!token){
        console.log(`Invalid token`)
        return PERMISSION.INVALID
        }
        // deserailize token
        const decodedToken = jwtDecode<{ permission: string }>(token);
        console.log(`decode the accesstoken: ${decodedToken.permission}`); // "admin"
        const permission = parseInt(decodedToken.permission || '0')
        if(isNaN(permission))
            return PERMISSION.INVALID
        if(permission >= PERMISSION.NORMAL && permission <= PERMISSION.DEVELOPER )
            return permission
        return PERMISSION.INVALID
    }*/


}
