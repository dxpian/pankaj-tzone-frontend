import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { personalizedService } from '../personalized.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';

@Component({
  selector: 'app-site',
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss']
})
export class SiteComponent implements OnInit {
  logo1 = ''
  logo2 = ''
  background = ''
  siteForm: FormGroup;
  logoImage: any;
  siteInformations: any = [];
  constructor(private _fb: FormBuilder,
    private _personalizedService: personalizedService,
    private _snackBar: MatSnackBar
  ) { }
  ngOnInit(): void {
    this.getSiteConfigurations()
    this.siteForm = this._fb.group({
      title: ['', [Validators.required]],
      subtitle: [''],
      description: ['']
    })
  }
  uploadLogo(type, file) {
    this.logoImage = file[0];
    const files: File = file[0];
    const formData = new FormData();
    formData.append('file', files);
    if (type == 1) {
      this._personalizedService.uploadLogo(formData).then((res) => {
        if (res && !res.error_code) {
          this._snackBar.open('Logo saved successfully', '', snackBarConfig);
        } else {
          this._snackBar.open(`${res.statusmessage}`, '', snackBarConfigWarn)
        }
        // console.log('file response', data)
      })
    }
    if (type == 2) {
      this._personalizedService.uploadLogo2(formData).then((res) => {
        if (res && !res.error_code) {
          this._snackBar.open('Logo saved successfully', '', snackBarConfig);
        } else {
          this._snackBar.open(`${res.statusmessage}`, '', snackBarConfigWarn)
        }
        // console.log('file response', data)
      })
    }
    if (type == 3) {
      this._personalizedService.uploadLogo3(formData).then((res) => {
        if (res && !res.error_code) {
          this._snackBar.open('Logo saved successfully', '', snackBarConfig);
        } else {
          this._snackBar.open(`${res.statusmessage}`, '', snackBarConfigWarn)
        }
        // console.log('file response', data)
      })
    }
  }
  saveSettings() {
     if(this.siteForm.valid) {
      this._personalizedService.SaveSiteConfiguarations(this.siteForm.value).then((res:any) => {
        if(res && !res.error_code) {
          this._snackBar.open('Settings Saved Successfully', '', snackBarConfig);
        }
      })
     }
  }
  getSiteConfigurations() {
    this._personalizedService.getSiteConfiguarations().then((res: any) => {
      if (res && !res.error_code) {
        this.siteInformations = res?.object[0];
        this.siteForm.patchValue(this.siteInformations);
      }
    })
  }

}
