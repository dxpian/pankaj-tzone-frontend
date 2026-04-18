import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlarmListingComponent } from './alarm-listing/alarm-listing.component';

const routes: Routes = [
  {
    path: '',
    component: AlarmListingComponent,
    pathMatch: 'full' 
  }, 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AlarmSettingsRoutingModule { }
