import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountService } from '../account.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';

@Component({
  selector: 'app-security-and-privacy-settings',
  templateUrl: './security-and-privacy-settings.component.html',
  styleUrls: ['./security-and-privacy-settings.component.scss']
})
export class SecurityAndPrivacySettingsComponent implements OnInit {
  securityForm: FormGroup
  constructor(private _fb:FormBuilder, private _accountService:AccountService, private _snackBar:MatSnackBar ) {

  }
  ngOnInit(): void {
    
    this.getSecurityEnabledList()
    this.securityForm = this._fb.group({
      enable: false
    })
  }
  saveSecurity() {
    let object = {
      enable:this.securityForm.value.enable
    }

     this._accountService.saveSecurityService(object).then((res:any) => {
      if(res && !res.error_code) {
        this._snackBar.open('Security Updated Successfully', '', snackBarConfig);
      }else {
        this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
        }
     })
  }
  getSecurityEnabledList() {
    console.log("checking security enabled state")
     this._accountService.getSecurityService().then((res:any) => {
      if(res && !res.error_code ) {
          this.securityForm.patchValue(res.object[0])
      }
      
     })
  }
}
