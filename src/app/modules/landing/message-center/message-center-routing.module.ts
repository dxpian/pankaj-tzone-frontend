import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlarmMessageComponent } from './alarm-message/alarm-message.component';
import { ExceptionInformationComponent } from './exception-information/exception-information.component';
import { NotificationMessageComponent } from './notification-message/notification-message.component';

const routes: Routes = [
  {
    path: '',
    component: ExceptionInformationComponent,
    pathMatch: 'full'
  },
//   {
//     path: 'alarm',
//     component: AlarmMessageComponent,
//    },
  {
    path: 'exception-info',
    component: ExceptionInformationComponent,
  },
  {
    path: 'notification',
    component: NotificationMessageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MessageCenterRoutingModule { }
