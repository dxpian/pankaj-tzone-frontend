import { Component, HostListener  } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector   : 'app-root',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss']
})
export class AppComponent
{
    /**
     * Constructor
     */
    constructor(
        private _matIconRegistry: MatIconRegistry,
        private _domSanitizer: DomSanitizer,
    )
    {
        this._matIconRegistry
            .addSvgIcon(
                'hard-drive',
                this._domSanitizer.bypassSecurityTrustResourceUrl('assets/images/device/hard-drive-disk.svg')
            )
            .addSvgIcon(
                'pulse',
                this._domSanitizer.bypassSecurityTrustResourceUrl('assets/images/device/pulse.svg')
            )
            .addSvgIcon(
                'bell',
                this._domSanitizer.bypassSecurityTrustResourceUrl('assets/images/device/bell.svg')
            )
            .addSvgIcon(
                'unlink',
                this._domSanitizer.bypassSecurityTrustResourceUrl('assets/images/device/unlink.svg')
            )
    }

    @HostListener("window:beforeunload",["$event"])
    clearLocalStorage(event){
        localStorage.clear();
    }

}
