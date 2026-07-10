import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DevicesComponent } from './devices/devices.component';
import { ViewDevicesComponent } from './view-devices/view-devices.component';
import { ReportingViewComponent } from '../reporting/reporting-view/reporting-view.component';
import { SimManagementComponent } from './sim-management/sim-management.component';
import { RegisterFromFileComponent } from './register-from-file/register-from-file.component';

const routes: Routes = [ 
{
  path: '',
  component: DevicesComponent,
  pathMatch: 'full' 
},
{
  path: 'sim',
  component: SimManagementComponent,
},
{
  path: 'register',
  component: RegisterFromFileComponent,
},
{
  path: 'reports-view/:id',
  component: ReportingViewComponent,
  data: {
    layout: 'empty'
  }
},
{
  path: ':id',
  component: ViewDevicesComponent, 
},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeviceManagementRoutingModule { }
