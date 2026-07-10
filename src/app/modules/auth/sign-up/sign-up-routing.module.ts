import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignUpComponent } from './sign-up.component';

const SignupRoutes: Routes = [
  {
    path     : '',
    component: SignUpComponent
}
];

@NgModule({
  imports: [RouterModule.forChild(SignupRoutes)],
  exports: [RouterModule]
})
export class SignUpRoutingModule { }
