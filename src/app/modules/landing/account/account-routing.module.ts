import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyAccountComponent } from './my-account/my-account.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { GroupingAndPermissionComponent } from './grouping-and-permission/grouping-and-permission.component';
import { SecurityAndPrivacySettingsComponent } from './security-and-privacy-settings/security-and-privacy-settings.component';
import { LogInformationComponent } from './log-information/log-information.component';
import { OperationLogComponent } from './operation-log/operation-log.component';
import { AdminUserManagementComponent } from './admin-user-management/admin-user-management.component';


const routes: Routes = [
  {
    path: '',
    component: MyAccountComponent,
    pathMatch: 'full'
  },
  {
    path: 'my-account',
    component: MyAccountComponent
  },
  {
    path: 'user',
    component: UserManagementComponent
  },
  {
    path: 'group',
    component: GroupingAndPermissionComponent
  },
  {
    path: 'log-info',
    component: LogInformationComponent
  },
  {
    path: 'operation-log',
    component: OperationLogComponent
  },
  {
    path: 'settings',
    component: SecurityAndPrivacySettingsComponent
  },
  {
    path: 'admin-user-management',
    component: AdminUserManagementComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule { }
