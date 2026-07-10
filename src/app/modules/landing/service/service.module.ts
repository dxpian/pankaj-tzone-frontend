import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ServiceRoutingModule } from './service-routing.module';
import { ApiAuthorizationComponent } from './api-authorization/api-authorization.component';
import { EmailComponent } from './message-push-service/email/email.component';
import { SmsComponent } from './message-push-service/sms/sms.component';
import { BaseStationLocationServiceComponent } from './location-service/base-station-location-service/base-station-location-service.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseAlertModule } from '@kitkat/components/alert';
import { FuseConfirmDialogModule } from '@kitkat/components/confirm-dialog/confirm-dialog.module';
import { SharedModule } from 'app/shared/shared.module';
import { NgxBarcodeModule } from 'ngx-barcode';
import { FuseFindByKeyPipeModule } from '@kitkat/pipes/find-by-key';
import {ClipboardModule} from '@angular/cdk/clipboard';
import { HolidayComponent } from './holiday/holiday.component';
import { AlfresaCenterComponent } from './alfresa/alfresa.center/alfresa.center.component';
import { AlfresaAlarmComponent } from './alfresa/alfresa.alarm/alfresa.alarm.component';
import { AlfresaShiftComponent } from './alfresa/alfresa.shift/alfresa.shift.component';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { HighchartsChartModule } from 'highcharts-angular';

@NgModule({
  declarations: [
    ApiAuthorizationComponent,
    EmailComponent,
    SmsComponent,
    BaseStationLocationServiceComponent,
    HolidayComponent,
    AlfresaCenterComponent,
    AlfresaAlarmComponent,
    AlfresaShiftComponent
  ],
  imports: [
    CommonModule,
    ServiceRoutingModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatToolbarModule,
    MatTooltipModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatRadioModule,
    MatExpansionModule,
    SharedModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatDialogModule,
    MatCheckboxModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    HighchartsChartModule,
    MatOptionModule,
    FuseAlertModule,
    FuseConfirmDialogModule,
    NgxBarcodeModule.forRoot(),
    FuseFindByKeyPipeModule,
    ClipboardModule
  ]
})
export class ServiceModule { }
