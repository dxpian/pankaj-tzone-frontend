import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MobileAdminManagementComponent } from './mobile-admin-management/mobile-admin-management.component';
import { MobileManagementComponent } from './mobile-management/mobile-management.component';
import { ClusterAreaComponent } from './cluster-area/cluster-area.component';
import { ManageClusterComponent } from './manage-cluster/manage-cluster.component';
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
    component: MobileManagementComponent
  },
  {
    path: 'cluster-area', 
    component: ClusterAreaComponent
  },{
    path: 'manage-cluster',
    component: ManageClusterComponent
  }
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MobileRoutingModule { }
