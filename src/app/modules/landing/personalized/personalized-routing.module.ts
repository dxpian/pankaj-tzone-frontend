import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SiteComponent } from './site/site.component';
import { ContactComponent } from './contact/contact.component';
import { DomainComponent } from './domain/domain.component';

const routes: Routes = [
  {
    path: '',
    component: SiteComponent,
    pathMatch: 'full' 
  }, 
  {
    path: 'site',
    component: SiteComponent, 
  }, 
  {
    path: 'contact',
    component: ContactComponent, 
  }, 
  {
    path: 'domain',
    component: DomainComponent, 
  }, 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PersonalizedRoutingModule { }
