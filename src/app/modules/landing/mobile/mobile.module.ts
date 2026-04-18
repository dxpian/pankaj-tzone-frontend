import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FuseCardModule } from '@kitkat/components/card';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTreeModule } from '@angular/material/tree';
import { FuseAlertModule } from '@kitkat/components/alert';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseConfirmDialogModule } from '@kitkat/components/confirm-dialog/confirm-dialog.module';
import { SharedModule } from 'app/shared/shared.module';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { NgxIntlTelInputModule } from 'ngx-intl-tel-input';

import { MobileRoutingModule } from './mobile-routing.module';
import { MobileAdminManagementComponent } from '../mobile/mobile-admin-management/mobile-admin-management.component';
import { MobileManagementComponent } from '../mobile/mobile-management/mobile-management.component';
import { ClusterAreaComponent } from './cluster-area/cluster-area.component';
import { ManageClusterComponent } from './manage-cluster/manage-cluster.component';

@NgModule({
  declarations: [
    MobileAdminManagementComponent,
    MobileManagementComponent,
    ClusterAreaComponent,
    ManageClusterComponent,
  ],
  imports: [
    CommonModule,
    MobileRoutingModule,
    FuseCardModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTreeModule,
    FuseAlertModule,
    MatButtonModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatToolbarModule,
    MatTooltipModule,
    SharedModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatDialogModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatOptionModule,
    FuseConfirmDialogModule,
    NgxMaskDirective,
    NgxMaskPipe,  
    NgxIntlTelInputModule,
  ]
})
export class MobileModule { }
