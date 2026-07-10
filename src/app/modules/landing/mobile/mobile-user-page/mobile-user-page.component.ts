import { Component } from '@angular/core';
import { SharedService } from 'app/services/shared.service';
import { ACCOUNT_TYPE, isWebAdminPermission } from '../../utils/typedef';

@Component({
  selector: 'app-mobile-user-page',
  template: `
    <div class="mobile-user-page-shell">
      <app-alfresa-mobile-management *ngIf="isAlfresaWebAdmin"></app-alfresa-mobile-management>
      <app-mobile-management *ngIf="!isAlfresaWebAdmin"></app-mobile-management>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
    }
    .mobile-user-page-shell {
      display: block;
      width: 100%;
      max-width: 100%;
    }
  `],
})
export class MobileUserPageComponent {
  readonly isAlfresaWebAdmin: boolean;

  constructor(private _sharedService: SharedService) {
    const type = this._sharedService.getAccountType();
    const permission = this._sharedService.getPermission();
    this.isAlfresaWebAdmin = type === ACCOUNT_TYPE.ALFRESA && isWebAdminPermission(permission);
  }
}
