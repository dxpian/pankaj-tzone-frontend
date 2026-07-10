import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceManagementRoutingModule } from './device-management-routing.module';
import { ViewDevicesComponent } from './view-devices/view-devices.component';
import { DevicesComponent } from './devices/devices.component';
import { CreateDevicesComponent } from './create-devices/create-devices.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { SharedModule } from 'app/shared/shared.module';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FuseAlertModule } from '@kitkat/components/alert';
import { FuseConfirmDialogModule } from '@kitkat/components/confirm-dialog/confirm-dialog.module';
import { NgxBarcodeModule } from 'ngx-barcode';
import { GoogleMapsModule } from '@angular/google-maps';

import { RealTimeDataComponent } from './tabs/real-time-data/real-time-data.component';
import { ChartComponent } from './tabs/chart/chart.component';
import { ListComponent } from './tabs/list/list.component';
import { HighchartsChartModule } from 'highcharts-angular';
import { AlarmDataComponent } from './tabs/alarm-data/alarm-data.component';
import { MapComponent } from './tabs/map/map.component';
import { DataReportComponent } from './tabs/data-report/data-report.component';
import { SetUpComponent } from './tabs/set-up/set-up.component';
import { AlarmSettingsModule } from '../alarm-settings/alarm-settings.module';
import { LoadingOverlayComponent } from './tabs/overlay/loading-overlay.component';
import { SimManagementComponent } from './sim-management/sim-management.component';
import { RegisterFromFileComponent } from './register-from-file/register-from-file.component';
@NgModule({
  declarations: [
    ViewDevicesComponent,
    DevicesComponent,
    CreateDevicesComponent,
    SimManagementComponent,
    RegisterFromFileComponent,
    RealTimeDataComponent,
    ChartComponent,
    ListComponent,
    AlarmDataComponent,
    MapComponent,
    DataReportComponent,
    SetUpComponent,
    LoadingOverlayComponent,
  ],
  imports: [
    CommonModule,
    MatIconModule,
    DeviceManagementRoutingModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatToolbarModule,
    MatTooltipModule,
    MatSelectModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    GoogleMapsModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatDialogModule,
    MatCheckboxModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatOptionModule,
    FuseAlertModule,
    FuseConfirmDialogModule,
    NgxBarcodeModule.forRoot(),
    MatTabsModule,
    HighchartsChartModule,
    AlarmSettingsModule
      ],
  exports: [
    RealTimeDataComponent,
    ChartComponent,
    ListComponent,
    MapComponent
  ]
})
export class DeviceManagementModule { }
