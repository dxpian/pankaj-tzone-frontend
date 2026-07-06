import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgForm, FormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseAlertType } from '@kitkat/components/alert';
import { FuseLoadingService } from '@kitkat/services/loading';
import { snackBarConfig, snackBarConfigWarn, resolveRequestError } from 'app/constants/globalFunctions';
import { AuthService } from 'app/core/auth/auth.service';
import { SignInService } from '../sign-in/sign-in.service';
import { fuseAnimations } from '@kitkat/animations'; 
import * as globalConfig from '../../../constants/globalFunctions'
import { MatDialog } from '@angular/material/dialog';
import { catchError } from 'rxjs/operators';
@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: fuseAnimations
})
export class SignUpComponent implements OnInit {
  @ViewChild('signInNgForm') signInNgForm: NgForm;

  alert: { type: FuseAlertType; message: string } = {
    type: 'success',
    message: ''
  };
  signInForm: FormGroup;
  showAlert: boolean = false;
  btnSubmit: boolean = false;

  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _authService: AuthService,
    private _signInService: SignInService,
    private _formBuilder: UntypedFormBuilder,
    private _router: Router,
    private _snackBar: MatSnackBar,
    private _fuseLoadingService: FuseLoadingService,

  ) {
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Create the form
    this.signInForm = this._formBuilder.group({
      username: [''],
      email: ['', [Validators.required, Validators.email, Validators.pattern(globalConfig.validator.emailPattern)]],
      password: ['', Validators.required],
    });
  }


  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Sign in
   */
  signIn(): void {
    // Return if the form is invalid
    if (this.signInForm.invalid) {
      return;
    }

    // Disable the form
    this.signInForm.disable();

    // Hide the alert
    this.showAlert = false;

    // Sign in
    this._authService.signIn(this.signInForm.value)
      .subscribe(
        () => {

          const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/signed-in-redirect';

          // Navigate to the redirect url
          this._router.navigateByUrl(redirectURL);

        },
        (response) => {

          // Re-enable the form
          this.signInForm.enable();

          // Reset the form
          this.signInNgForm.resetForm();

          // Set the alert
          this.alert = {
            type: 'error',
            message: resolveRequestError(response, 'Wrong email or password')
          };

          // Show the alert
          this.showAlert = true;
        }
      );
  }
  signUp() {
    this.signInForm.disable();
    this._fuseLoadingService.show()
    if (!this.signInForm.invalid) {
      this._signInService.createUser(this.signInForm.value).then((res: any) => {
        if (res && !res.error_code) {
        this._fuseLoadingService.hide();
          // Disable the form
          this.signInForm.enable();
          this._snackBar.open('Account Created Successfully!', '', snackBarConfig);
          this._router.navigate(["/sign-in"]);
        }
        else{
          console.log(res.meta); 
          this._snackBar.open(res.meta, '', snackBarConfigWarn); 
          this.signInForm.enable(); 
          this._fuseLoadingService.hide(); 
          this.signInForm.reset();    
        }
      })
      .catch(error => {
          const message = resolveRequestError(error, 'Unable to create account');
          this._snackBar.open(message, '', snackBarConfigWarn);
          this.signInForm.enable();
          this._fuseLoadingService.hide();
          this.signInForm.reset();
      })
      
    }
  }
}

