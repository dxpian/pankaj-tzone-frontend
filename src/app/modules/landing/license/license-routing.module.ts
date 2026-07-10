import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LicenseModelsComponent } from './license-models/license-models.component';
import { LicenseAllocationComponent } from './license-allocation/license-allocation.component';

const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'models' },
    { path: 'models', component: LicenseModelsComponent },
    { path: 'allocation', component: LicenseAllocationComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class LicenseRoutingModule {}
