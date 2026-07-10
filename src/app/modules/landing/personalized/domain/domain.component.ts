import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { personalizedService } from '../personalized.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig } from 'app/constants/globalFunctions';

@Component({
  selector: 'app-domain',
  templateUrl: './domain.component.html',
  styleUrls: ['./domain.component.scss']
})
export class DomainComponent implements OnInit{ 
  domainForm:FormGroup;
  domainSettings: any;
  constructor(private _fb:FormBuilder , private _personalizedService:personalizedService, private _snackbar:MatSnackBar) {}
  ngOnInit(): void {
    this.getDomain()
     this.domainForm = this._fb.group({
      customdomain: [''],
      type:[''],
      value:['']
     })
  } 
  saveSettings() {
    if(this.domainForm.valid) {
      this._personalizedService.SaveDomainSettings(this.domainForm.value).then((res:any) => {
        if(res && !res.error_code) {
          this._snackbar.open('Saved Successfully', '', snackBarConfig);
        }
      })
     }
  }
  getDomain() {
    this._personalizedService.getDomainSettings().then((res:any) => {
     if(res && !res.error_code) {
      this.domainSettings = res.object[0];
      this.domainForm.patchValue(this.domainSettings);
     }
    })
  }
}
