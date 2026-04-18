import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, NgForm, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@kitkat/animations';
import { FuseAlertType } from '@kitkat/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { SignInService } from './sign-in.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { FuseLoadingService } from '@kitkat/services/loading';
import { CookieService } from 'ngx-cookie-service';
import { SharedService } from 'app/services/shared.service';


@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations
})
export class AuthSignInComponent implements OnInit {
    @ViewChild('signInNgForm') signInNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: ''
    };
    signInForm: FormGroup;
    showAlert: boolean = false;
    users: any = [];
    btnSubmit: boolean = false;

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _sharedService: SharedService,
        private _signInService: SignInService,
        private _formBuilder: UntypedFormBuilder,
        private _router: Router,
        private _snackBar: MatSnackBar,
        private _fuseLoadingService: FuseLoadingService,
        private _cookieService: CookieService
    ) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // this.getUsers()
        // Create the form
        this.signInForm = this._formBuilder.group({
            email: ['', Validators.required],
            password: ['', Validators.required],
            rememberMe: ['']
        });
    }
    getUsers() {
        this._signInService.getUsers().then((res: any) => {
            if (res && !res.error_code) {
                this.users = res?.object;
            }
        })
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
                        message: 'Wrong email or password'
                    };

                    // Show the alert
                    this.showAlert = true;
                }
            );
    }
    Login() {
        // Disable the form
        this.signInForm.disable();
        this._fuseLoadingService.show()
        if (!this.signInForm.invalid) {
            //   see user present in users
             let obj =  {
                email: this.signInForm.value.email,
                password: this.signInForm.value.password
             }
            this._signInService.login(obj).then((res:any) => {
                if(res && res.error_code == 0) {
                    this._fuseLoadingService.hide();
                    // Disable the form
                    this.signInForm.enable();
                    this._snackBar.open('Logged In.', '', snackBarConfig)
                    if(res.accesstoken){
                        localStorage.setItem('accesstoken', res.accesstoken );
                        this._cookieService.set('accesstoken', res.accesstoken, 1);
                        this._sharedService.setAccesstoken(res.accesstoken)
                    }
                    if(res.refreshtoken){
                        localStorage.setItem('refreshtoken', res.refreshtoken );
                    }
                    if(res.object.length > 0){
                        console.log(`user information: ${res.object}`)
                        localStorage.setItem('userInfo', JSON.stringify(res.object[0]))
                    }
                    this._router.navigate(["/device"])
                    // this._router.navigate(["/real-time-monitoring"])
                } else {
                    this._snackBar.open("Invalid email or password", '', snackBarConfigWarn)
                    this.signInForm.enable();
                    this._fuseLoadingService.hide();
                }
            }).catch(err => {
                this.signInForm.enable();
            })
            /*
            let isUser = this.users.filter(x => x.name == this.signInForm.value.email || x.email == this.signInForm.value.email)
            if (isUser && isUser.length > 0) {
                console.log('user details', isUser);
                this._fuseLoadingService.hide();
                // Disable the form
                this.signInForm.enable();
                this._snackBar.open('Logged In.', '', snackBarConfig)
                localStorage.setItem('userInfo', JSON.stringify(isUser[0]))
                this._router.navigate(["/device"])

            } else {
                this._snackBar.open('Invalid username or password', '', snackBarConfigWarn)
                this.signInForm.enable();
                this._fuseLoadingService.hide();
            }
            */
        }
    }
}
