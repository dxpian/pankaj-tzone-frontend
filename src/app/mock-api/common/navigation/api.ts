import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash-es';
import { FuseNavigationItem } from '@kitkat/components/navigation';
import { FuseMockApiService } from '@kitkat/lib/mock-api';
import { defaultNavigation} from 'app/mock-api/common/navigation/data';
import { SharedService } from 'app/services/shared.service';
import { ACCOUNT_TYPE, isWebAdminPermission, PERMISSION } from 'app/modules/landing/utils/typedef';
import { USER_ROLE } from 'app/modules/landing/account/account.typedef';

@Injectable({
    providedIn: 'root'
})
export class NavigationMockApi
{
    private readonly _defaultNavigation: FuseNavigationItem[] = defaultNavigation;


    /**
     * Constructor
     */
    constructor(
        private _fuseMockApiService: FuseMockApiService,
        private _sharedService: SharedService,
    )
    {
        // Register Mock API handlers
        this.registerHandlers();

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register Mock API handlers
     */
    registerHandlers(): void
    {
            this._fuseMockApiService
            .onGet('api/common/navigation')
            .reply(() => {
                const userRole = this._sharedService.getPermission();
                const type = this._sharedService.getAccountType();
                const role = this._sharedService.getAccountRole(); 
                const filteredNav = this._filterNavigationBasedOnRole(userRole, type, role);

                return [200, { default: filteredNav }];
            });
    }

    private _filterNavigationBasedOnRole(permission: number, type: number, role: number): FuseNavigationItem[] {
        const nav = cloneDeep(this._defaultNavigation);

        const filterRecursive = (items: FuseNavigationItem[]): FuseNavigationItem[] => {
            return items
                .map(item => {
                    const isDeveloper = permission === PERMISSION.DEVELOPER;
                    const isWebMobAdmin = permission === PERMISSION.WEB_MOB_ADMIN;
                    const isAdmin = permission === PERMISSION.ADMIN
                    const isNormalUser = permission === PERMISSION.NORMAL;
                    const isAlfres = type === ACCOUNT_TYPE.ALFRESA

                    // Filter children recursively if they exist
                    if (item.children) {
                        item.children = filterRecursive(item.children);
                    }                   
                  

                    if(isDeveloper){
                        if(item.id === 'Mobile')    // show service for developer
                            return null; 

                        if(item.id === 'Service')    // show service for developer
                            return null; 
                        if(item.id == 'User Management')
                            return null;
                        if(item.id == 'Grouping and permissions')
                            return null;
                        if(item.id == 'Security and Privacy Settings')
                            return null; 
                        if(item.id == 'Log Information')
                            return null; 
                        if(item.id == 'Operation Log')
                            return null; 
                        
                        if (
                            item.id === 'MobileAdminUser' ||
                            item.id === 'MobileUser' ||
                            item.id === 'AreaCluster' ||
                            item.id === 'MobileAlarm'
                        ) {
                            return null;
                        }     
                    }
                    else if(isAdmin || isWebMobAdmin){ // show mobile option (keep Mobile children; do not strip ManageCluster)
                        if (item.id === 'AdminUser' ) {
                            return null;
                        }
                        if(item.id == 'MobileAdminUser')
                            return null;

                        if(item.id == 'ManageCluster')
                            return null;
                        if(isAlfres && (item.id == 'MobileAlarm' || item.id == 'AreaCluster')) // show mobile alarm for Alfresa account
                            return null;
                    }
                    else if(isNormalUser){  // hide mobile option
                       if( item.id === 'Mobile') 
                            return null; 
                    }

                    if (item.id === 'License' && !isDeveloper) {
                        return null;
                    }

                    // Filter based on your permission logic
                    if (item.id === 'Holiday' && !isAlfres) { // hide holiday for non-Alfresa account
                        return null;
                    }

                    if(item.id == 'Alfresa-Center' && !isAlfres){ // hide alfresa center page for non-Alfresa account
                        return null;
                    }
                    if(item.id == 'Alfresa-Alarm' && !isAlfres){ // hide alfresa alarm page for non-Alfresa ccount
                        return null
                    }
                    
                    if(role != USER_ROLE.STD){
                        if(item.id == 'Personalized' || item.id == 'System'
                            || item.id=='User Management' || item.id == 'Grouping and permissions' || item.id == 'Security and Privacy Settings')
                            return null
                    }

                    return item;
                })
                .filter((item): item is FuseNavigationItem => item !== null);
        };
        return filterRecursive(nav);
    }


}
