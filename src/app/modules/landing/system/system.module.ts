import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SystemRoutingModule } from './system-routing.module';
import { BigScreenMonitoringSettingsComponent } from './big-screen-monitoring-settings/big-screen-monitoring-settings.component';
import { BigScreenMonitoringComponent } from './big-screen-monitoring/big-screen-monitoring.component';
import { AboutComponent } from './about/about.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HighchartsChartModule } from 'highcharts-angular';


@NgModule({
  declarations: [
    BigScreenMonitoringSettingsComponent,
    BigScreenMonitoringComponent,
    AboutComponent
  ],
  imports: [
    CommonModule,
    SystemRoutingModule,
    MatIconModule,
    MatTreeModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatToolbarModule,
    MatTooltipModule,
    HighchartsChartModule,
    MatIconModule
  ]
})
export class SystemModule { }
