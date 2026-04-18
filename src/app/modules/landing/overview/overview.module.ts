import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OverviewRoutingModule } from './overview-routing.module';
import { HomeComponent } from './home/home.component';
import { MatIconModule } from '@angular/material/icon';
import { GoogleMapsModule } from '@angular/google-maps';


@NgModule({
  declarations: [
    HomeComponent
  ],
  imports: [
    CommonModule,
    GoogleMapsModule,
    OverviewRoutingModule,
    MatIconModule,

  ]
})
export class OverviewModule { }
