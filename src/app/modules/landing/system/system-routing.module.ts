import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BigScreenMonitoringComponent } from './big-screen-monitoring/big-screen-monitoring.component';
import { BigScreenMonitoringSettingsComponent } from './big-screen-monitoring-settings/big-screen-monitoring-settings.component';
import { AboutComponent } from './about/about.component';

const routes: Routes = [
  {
    path: '',
    component: BigScreenMonitoringSettingsComponent,
    pathMatch: 'full' 
  }, 
  {
    path: 'big-sceen-settings',
    component: BigScreenMonitoringSettingsComponent,
     
  }, 
  {
    path: 'bigscreen',
    component: BigScreenMonitoringComponent,
    data: {
      layout: 'empty'
    }
    
  }, 
  {
    path: 'about',
    component: AboutComponent,
    
  }, 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SystemRoutingModule { }
