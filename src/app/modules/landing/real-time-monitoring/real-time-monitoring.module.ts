import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { RealTimeMonitoringRoutingModule } from './real-time-monitoring-routing.module';
import { RealTimeMonitoringDashboardComponent } from './real-time-monitoring-dashboard/real-time-monitoring-dashboard.component';
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
import { DeviceManagementRoutingModule } from '../device-management/device-management-routing.module';
import {MatTreeModule} from '@angular/material/tree';
import { FuseFindByKeyPipeModule } from '@kitkat/pipes/find-by-key';


@NgModule({
  declarations: [
    RealTimeMonitoringDashboardComponent
  ],
  imports: [
    CommonModule,
    RealTimeMonitoringRoutingModule,
    MatIconModule,
    DeviceManagementRoutingModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatToolbarModule,
    MatTooltipModule,
    MatSelectModule,
     SharedModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatSlideToggleModule,
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
     MatTreeModule,
    FuseFindByKeyPipeModule,
   ]
})
export class RealTimeMonitoringModule { }
