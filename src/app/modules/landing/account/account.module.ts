import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AccountRoutingModule } from './account-routing.module';
import { MyAccountComponent } from './my-account/my-account.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { GroupingAndPermissionComponent } from './grouping-and-permission/grouping-and-permission.component';
import { SecurityAndPrivacySettingsComponent } from './security-and-privacy-settings/security-and-privacy-settings.component';
import { LogInformationComponent } from './log-information/log-information.component';
import { OperationLogComponent } from './operation-log/operation-log.component';
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
import { AdminUserManagementComponent } from './admin-user-management/admin-user-management.component';



@NgModule({
  declarations: [
    MyAccountComponent,
    UserManagementComponent,
    GroupingAndPermissionComponent,
    SecurityAndPrivacySettingsComponent,
    LogInformationComponent,
    OperationLogComponent,
    AdminUserManagementComponent
  ],
  imports: [
    CommonModule,
    AccountRoutingModule,
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
export class AccountModule { }
