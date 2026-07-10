import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MobileAdminManagementComponent } from './mobile-admin-management/mobile-admin-management.component';
import { MobileUserPageComponent } from './mobile-user-page/mobile-user-page.component';
import { ClusterAreaComponent } from './cluster-area/cluster-area.component';
import { ManageClusterComponent } from './manage-cluster/manage-cluster.component';
import { MobileAlarmComponent } from './mobile-alarm/mobile-alarm.component';
const routes: Routes = [
  {
    path: '',
    component: MobileAdminManagementComponent
  },
  {
    path: 'mobile-admin-user-management',
    component: MobileAdminManagementComponent
  },
  {
    path: 'mobile-user-management',
    component: MobileUserPageComponent
  },
  {
    path: 'cluster-area', 
    component: ClusterAreaComponent
  },{
    path: 'manage-cluster',
    component: ManageClusterComponent
  }, {
    path: 'mobile-alarm', 
    component: MobileAlarmComponent
  }
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MobileRoutingModule { }
