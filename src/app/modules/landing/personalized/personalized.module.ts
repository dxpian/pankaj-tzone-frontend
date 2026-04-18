import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PersonalizedRoutingModule } from './personalized-routing.module';
import { SiteComponent } from './site/site.component';
import { DomainComponent } from './domain/domain.component';
import { ContactComponent } from './contact/contact.component';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FuseAlertModule } from '@kitkat/components/alert';


@NgModule({
  declarations: [
    SiteComponent,
    DomainComponent,
    ContactComponent
  ],
  imports: [
    CommonModule,
    PersonalizedRoutingModule,
    MatIconModule,
    FormsModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatDialogModule,
    MatCheckboxModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FuseAlertModule
  ]
})
export class PersonalizedModule { }
