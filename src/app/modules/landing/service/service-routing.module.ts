import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ApiAuthorizationComponent } from './api-authorization/api-authorization.component';
import { BaseStationLocationServiceComponent } from './location-service/base-station-location-service/base-station-location-service.component';
import { SmsComponent } from './message-push-service/sms/sms.component';
import { EmailComponent } from './message-push-service/email/email.component';
import { HolidayComponent } from './holiday/holiday.component';
import { AlfresaCenterComponent } from './alfresa/alfresa.center/alfresa.center.component';
import { AlfresaAlarmComponent } from './alfresa/alfresa.alarm/alfresa.alarm.component';
import { AlfresaShiftComponent } from './alfresa/alfresa.shift/alfresa.shift.component';

const routes: Routes = [
  {
    path: '',
    component: ApiAuthorizationComponent,
    pathMatch: 'full'
  },
  {
    path: 'api-authorization',
    component: ApiAuthorizationComponent,
   },
  {
    path: 'location-service',
    component: BaseStationLocationServiceComponent,
  },
  {
    path: 'sms',
    component: SmsComponent,
  },
  {
    path: 'email',
    component: EmailComponent,
  },
  {
    path: 'holiday',
    component: HolidayComponent,
  },
  {
    path: 'alfresa-center',
    component: AlfresaCenterComponent,
  },
  {
    path: 'alfresa-alarms',
    component: AlfresaAlarmComponent,
  },
  {
    path: 'alfresa-shifts',
    component: AlfresaShiftComponent,
  },

  {
    path: 'location',
    component: BaseStationLocationServiceComponent,
  },
  // {
  //   path: 'notification',
  //   component: NotificationMessageComponent
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ServiceRoutingModule { }
