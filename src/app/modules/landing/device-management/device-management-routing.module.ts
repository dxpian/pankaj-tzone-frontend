import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DevicesComponent } from './devices/devices.component';
import { ViewDevicesComponent } from './view-devices/view-devices.component';
import { ReportingViewComponent } from '../reporting/reporting-view/reporting-view.component';

const routes: Routes = [ 
{
  path: '',
  component: DevicesComponent,
  pathMatch: 'full' 
},
{
  path: ':id',
  component: ViewDevicesComponent, 
},
{
  path: 'reports-view/:id',
  component: ReportingViewComponent,
  data: {
    layout: 'empty'
  }
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeviceManagementRoutingModule { }
