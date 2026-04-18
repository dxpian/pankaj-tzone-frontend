import { NgModule } from '@angular/core';
import { FuseFindByKeyPipe } from '@kitkat/pipes/find-by-key/find-by-key.pipe';
import { ChangeColorBasedOnTimeDirective } from './changeColorBasedonTime';
import { DatePipe } from '@angular/common';
import { TruncatePipe } from './truncate.pipe';

@NgModule({
    declarations: [
        FuseFindByKeyPipe,
        ChangeColorBasedOnTimeDirective,
        TruncatePipe
    ],
    exports     : [
        FuseFindByKeyPipe,
        ChangeColorBasedOnTimeDirective,
        TruncatePipe
    ], 
    providers : [
        DatePipe
    ]
})
export class FuseFindByKeyPipeModule
{
}
