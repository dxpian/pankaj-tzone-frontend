import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RealTimeDataComponent } from '../device-management/tabs/real-time-data/real-time-data.component';
import { RealTimeMonitoringDashboardComponent } from './real-time-monitoring-dashboard/real-time-monitoring-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: RealTimeMonitoringDashboardComponent,
    pathMatch: 'full' 
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RealTimeMonitoringRoutingModule { }
