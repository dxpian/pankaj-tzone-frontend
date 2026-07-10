import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Timezone, countries, snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { AccountService } from '../account.service';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';
import { CountryISO, PhoneNumberFormat, SearchCountryField } from 'ngx-intl-tel-input';
  
@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit {
  timeZone = Timezone
  separateDialCode = true;
	SearchCountryField = SearchCountryField;
	CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  originalSelectedCountry: string = '';
  showModifiedValue: boolean = false;
  settingForm: FormGroup;
  selectedCountry = ''
  userProfile: any;
  userForm: FormGroup;
  dialogRef: any;
  countries = countries;
  constructor(
    private _fb: FormBuilder,
    private _accountService: AccountService,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private _router:Router
  ) { }
  ngOnInit(): void {
  
    this.createSettingForm();
    this.createUserForm();
    this.getUserProfiles(); 
  }
  
  getUserProfiles() {
    this._accountService.getUserProfiles().then((res: any) => {
      if (res && !res.error_code) {
        this.userProfile = res?.object;
        this.userForm.patchValue(this.userProfile);
      }
    })
  }

  onCountryChange() {
    console.log('Selected Country:', this.selectedCountry);
    // Add your logic here based on the selected country
  }

  onDropdownOpened() {
    // Save the original selected value when the dropdown is opened
    this.originalSelectedCountry = this.selectedCountry;
  }

  modifyDisplay(value: string): string {
    // Modify the display value only while the dropdown is open
    if (this.originalSelectedCountry === value) {
      // Example modification: Add or subtract something
      return `Modified: ${value}`;
    } else {
      return value;
    }
  }
 
  createSettingForm() {
    this.settingForm = this._fb.group({
      newPassword: [''],
      oldPassword: [''],
    })
  }
  createUserForm() {
    this.userForm = this._fb.group({
      email: [''],
      id: [''],
      ip: [''],
      language: [''],
      login_time: [''],
      name: [''],
      phone: [null],
      role: [''],
      session: [''],
      timezone: [''],
      emaillanguage: ['']
    });
  }
  // Save ---> Password, Email, Timzone
  saveProfile(value) {
    if(value == 'emaillanguage'){
      let object = {
        language: this.userForm.value.emaillanguage,
      }
      this._accountService.updateEmailLanguage(object).then((res:any) => {
        if(res && !res.error_code) {
          this._snackBar.open(`Successfully update email language!`, '', snackBarConfig);
        } else {
          this._snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Tzone. Please contact your admin'}`, '', snackBarConfigWarn);
        }
      })
    }
    if(value == 'timezone') {
      let object = {
        language: this.userForm.value.language,
        timezone: this.userForm.value.timezone
      }
      this._accountService.updateLanguageAndTimezone(object).then((res:any) => {
        if(res && !res.error_code) {
          this._snackBar.open(`Saved Successfully!`, '', snackBarConfig);
        } else {
          this._snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Tzone. Please contact your admin'}`, '', snackBarConfigWarn);
        }
      })
    }

    if(value == 'email'){
      const email = this.userForm.value.email; 
      const phone = this.formatPhoneNumberWithDialCode(this.userForm.value.phone); 
      if(!email){
          this._snackBar.open(`Please input valid email`, '', snackBarConfigWarn);
          return; 
      }
      if(!phone){
        this._snackBar.open(`Please input valid phone number`, '', snackBarConfigWarn);
        return; 
      }
      let object = {
        email: email,
        phone: phone
      }
      this._accountService.updateEmailAndPhone(object).then((res:any) => {
        if(res && !res.error_code) {
          this._snackBar.open(`Saved Successfully!`, '', snackBarConfig);
        } else {
          this._snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Tzone. Please contact your admin'}`, '', snackBarConfigWarn);
        }
      })
    }
    if(value == 'password') {
      // check password validity
      const oldPass = this.settingForm.value.oldPassword; 
      const newPass = this.settingForm.value.newPassword; 
      if(!oldPass || !newPass){
          this._snackBar.open(`Invalid password`, '', snackBarConfigWarn);
          return; 
      }
      let object = {
        old: oldPass,
        new: newPass
      }
      this._accountService.changePassword(object).then((res:any) => {
        if(res && !res.error_code) {
          this._snackBar.open(`Password Changed Successfully!`, '', snackBarConfig);
        } else {
          this._snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Tzone. Please contact your admin'}`, '', snackBarConfigWarn);
        }
      })
    } 
  }
   formatPhoneNumberWithDialCode(phone: any): string {
    const formattedNumber = `${phone.dialCode}-${phone.number.replace(/\D/g, '')}`;
    return formattedNumber;
  }
  // delete Profile 
  deleteProfile() {
    this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
    this.dialogRef.componentInstance.data = {
      title: "Delete Profile?",
      message: "Are you sure you want to delete this profile?"
    }
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.confirmDeleteProfile()
      }
    })
   }
   confirmDeleteProfile() {
      this._accountService.deleteProfile().then((res:any) => {
        if(res && !res.error_code) {
          // this._snackBar.open(`Key Deleted Successfully!`, '', snackBarConfig);
          localStorage.removeItem('userInfo');
          this._router.navigate(['/sign-in']);
        }
      })
   }
}
