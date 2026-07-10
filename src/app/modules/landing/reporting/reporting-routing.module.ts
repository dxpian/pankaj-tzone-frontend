import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportsComponent } from './reports/reports.component';
import { ReportingViewComponent } from './reporting-view/reporting-view.component';

const routes: Routes = [
  {
    path: '',
    component: ReportsComponent,
    pathMatch: 'full' 
  },
  {
    path: 'reports-view/:id',
    component: ReportingViewComponent,
    data: {
      layout: 'empty'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportingRoutingModule { }
