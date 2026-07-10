import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { personalizedService } from '../personalized.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig } from 'app/constants/globalFunctions';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  contact: any;
  constructor(
    private _fb: FormBuilder,
    private _personalizedService: personalizedService,
    private _snackbar: MatSnackBar
  ) { }
  ngOnInit(): void {
    this.getContact()
    this.contactForm = this._fb.group({
      name: [''],
      address: [''],
      phone: [''],
      website: [''],
      copyright: ['']
    })
  }

  saveSettings() {
    if (this.contactForm.valid) {
      this._personalizedService.SaveContacts(this.contactForm.value).then((res: any) => {
        if (res && !res.error_code) {
          this._snackbar.open('Saved Successfully', '', snackBarConfig);
        }
      })
    }
  }
  getContact() {
    this._personalizedService.getContacts().then((res: any) => {
      if (res && !res.error_code) {
        this.contact = res.object[0];
        this.contactForm.patchValue(this.contact);
      }
    })
  }
}
