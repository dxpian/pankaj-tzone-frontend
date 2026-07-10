import { MatIconModule } from '@angular/material/icon';
import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ACCOUNT_TYPE, DB_RESULT, PERMISSION, UserDetails } from '../../utils/typedef';
import { Language } from '../../service/message-push-service/email/email.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AccountService } from '../account.service';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-admin-user-management',
  templateUrl: './admin-user-management.component.html',
  styleUrls: ['./admin-user-management.component.scss']
})
export class AdminUserManagementComponent {

    @ViewChild('add', { static: true }) add: any;    // add/edit apk
    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;


    apkForm!: FormGroup;
    private dialogRef: any;

    displayedColumns: string[] = ['id', 'name', 'email', 'permission', 'account_type', 'devices', 'description', 'created', 'parent_account', 'action'];
    public apkSources: UserDetails[] = []
    totalRecords: number;


    public dataSource = new MatTableDataSource<UserDetails>()
    public selection = new SelectionModel<any>(true, []);

    private lng = Language.ENG
    private editMode = false
    private updatePwd = false
    private userTemp! : UserDetails;

    searchkeyword = ''
    searchInputControl = new FormControl();
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    public PERMISSION = PERMISSION
    public ACCOUNT_TYPE = ACCOUNT_TYPE
    readonly accountTypeOptions = [
      { value: ACCOUNT_TYPE.NORMAL, label: 'Normal' },
      { value: ACCOUNT_TYPE.ALFRESA, label: 'Alfresa' },
    ]
    constructor(
        public dialog: MatDialog,
        private fb: FormBuilder,
        private _snackBar: MatSnackBar,
        private _serviceAuth: AccountService,
        private _cdr: ChangeDetectorRef
      ){

      }

    ngOnInit(){
      this.updateUsers()
      this.searchInputControl.valueChanges
        .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
        this.searchkeyword = query.trim().toLowerCase()
        if (this.searchkeyword !== '') {
            let filterData = this.apkSources.filter(x => (x.name).toLowerCase().includes(this.searchkeyword) || x.email.toLowerCase().includes(this.searchkeyword));
            this.dataSource.data = filterData
            return this.dataSource.data
        } else {
            this.dataSource.data = this.apkSources
            return this.dataSource.data;
        }
        })
    )
    .subscribe();
    }

    updateUsers(){
        this.apkSources = []
        this.dataSource = new MatTableDataSource<UserDetails>();
        this.totalRecords = 0
        this._serviceAuth.getUserDetials().then((response: DB_RESULT)=>{
            if(response && response.error_code == 0){
                this.apkSources= response.object as UserDetails[]
                this.dataSource.data = this.apkSources;
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;

            }
            else{
            console.log(`Failed to read API version information`)
            }
        })
    }

    onUpdateVisibeData(){
        this.dataSource = new MatTableDataSource<UserDetails>();
        if(!this.searchkeyword){
            let filterData = this.apkSources.filter(x => (x.name).toLowerCase().includes(this.searchkeyword) || x.email.toLowerCase().includes(this.searchkeyword));
            this.dataSource.data = filterData
        }else{
            this.dataSource.data = this.apkSources;
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
        }
        this.totalRecords = this.apkSources.length
    }

    getPermissionName(permission: number): string{
        if(permission == PERMISSION.NORMAL)
          return 'Normal'
        else if(permission == PERMISSION.ADMIN)
          return 'Admin'
        else if(permission == PERMISSION.DEVELOPER)
          return 'Developer'
        else if(permission == PERMISSION.WEB_MOB_ADMIN)
          return 'Web-Mobile Admin'
        return 'Invalid'
    }

    getAccountTypeName(user: UserDetails): string {
      if (!this.isAdminOrWebMobAdminPermission(user.permission)) {
        return '--'
      }
      const type = this.resolveAccountType(user)
      const option = this.accountTypeOptions.find((o) => o.value === type)
      return option?.label ?? 'Invalid'
    }

    resetFormdata(){
      this.apkForm = this.fb.group({
          name: ['user-name', Validators.required],
          email:['sample.user@example.com', Validators.required],
          update_password: [false],
          permission: [PERMISSION.NORMAL],
          account_type: [ACCOUNT_TYPE.NORMAL],
          password: ['', [Validators.required, Validators.minLength(6)]],
          password_confirm: ['', [Validators.required, Validators.minLength(6)]],
          description: ['',],
          created: [null]
        })
    }

    isAdminOrWebMobAdminPermission(permission: number): boolean {
      return permission === PERMISSION.ADMIN || permission === PERMISSION.WEB_MOB_ADMIN
    }

    showAccountTypeField(): boolean {
      const permission = this.apkForm?.get('permission')?.value
      return this.isAdminOrWebMobAdminPermission(permission)
    }

    onPermissionChange(): void {
      if (!this.showAccountTypeField()) {
        this.apkForm.patchValue({ account_type: ACCOUNT_TYPE.NORMAL }, { emitEvent: false })
      }
      this._cdr.detectChanges()
    }

    private resolveAccountType(user?: UserDetails): number {
      if (!user) {
        return ACCOUNT_TYPE.NORMAL
      }
      if (user.account_type != null && !isNaN(user.account_type)) {
        return user.account_type
      }
      if (user.type != null && !isNaN(user.type)) {
        return user.type
      }
      return ACCOUNT_TYPE.NORMAL
    }

    openUserModal(action: string, data?: any){

      switch (action) {
        case 'add': // create new apk
            this.editMode = false
            this.resetFormdata()
            this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
            break;

        case 'edit':  // edit apk version property
          this.editMode = true
          this.userTemp = data
          this.resetFormdata()
          if (this.userTemp){
            this.apkForm.patchValue({
              ...this.userTemp,
              account_type: this.resolveAccountType(this.userTemp),
            })
          }
          this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
          break;

        case 'delete':  // delete apk
          this.userTemp = data
          this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
            this.dialogRef.componentInstance.data = {
            title: "Delete Account",
            message: "Are you sure you want to delete this account?"
            }
            this.dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.onDeleteUserData()
            }
            })
          break
        default:
          break;
      }
    }



    onSubmitUserdata(){
        console.log(`check the user validity of input form fields`)
        if(!this.apkForm.value.name){
          this.warning('Invalid user name')
          return;
        }

        const email = this.apkForm.value.email
        if(!email || !this.validateEmail(email)){
          this.warning('Invalid email address')
          return
        }

        var  passwordRes = '' // empty if password isn't updated
        var password = this.apkForm.value.password
        if(this.updatePwd || password){

          const password_confirm = this.apkForm.value.password_confirm
          if(!password){
            this.warning('Invalid password')
            return
          }
          if(password?.length < 6){
            this.warning('Invalid password')
            return
          }
          if(password != password_confirm){ // password isn't matched
            this.warning('Unmatched password')
            return
          }
          passwordRes = password
      }
      const formdata : UserDetails = {
        name: this.apkForm.value.name,
        email: this.apkForm.value.email,
        permission: this.apkForm.value.permission,
        description: this.apkForm.value.description,
      }
      if (this.isAdminOrWebMobAdminPermission(formdata.permission)) {
        formdata.account_type = this.apkForm.value.account_type ?? ACCOUNT_TYPE.NORMAL
      }
      if(passwordRes){
        formdata.password = passwordRes
      }

      console.log(`create/update user data: ${JSON.stringify(formdata)}`)
      if(!this.editMode){ // create new user
        this._serviceAuth.createUserDetials(formdata).then((res: DB_RESULT)=>{
          if(res && res.error_code == 0){
            const newUser: UserDetails = {
              ...(res.object as UserDetails),
              account_type: formdata.account_type,
            }
            this.apkSources.push(newUser)
            this.onUpdateVisibeData()
            this.notify('Usccess to save changes')
            this.closeDialog()
            this._cdr.detectChanges()
          }
          else{
            this.warning(res.meta || 'Faled to create new user account')
          }
        })
      }
      else{ // update user property
        if(!this.userTemp.id){ // invalid user selected
          return
        }
        this._serviceAuth.updateUserDetials(this.userTemp.id, formdata).then((res: DB_RESULT)=>{
          if(res && res.error_code== 0){
            const newUser = res.object as UserDetails
            Object.assign(this.userTemp, newUser, {
              account_type: formdata.account_type ?? this.resolveAccountType(this.userTemp),
            })
            this.onUpdateVisibeData()
            this.notify('Success to save changes')
            this.closeDialog()
            this._cdr.detectChanges()
          }else{
            this.warning(res.meta || 'Failed to update user information')
          }
        }
        )
      }
    }

    onDeleteUserData(){
      console.log(`delete user data`)
      if(!this.userTemp.id){
        console.log(`Invalid user selected`)
        return
      }
      this._serviceAuth.deleteAccount(this.userTemp.id).then((res:DB_RESULT)=>{
        if(res && res.error_code == 0){ // success to delete user
          this.notify('Success to delete user account')
          this.apkSources = this.apkSources.filter(user=>user.id != this.userTemp.id)
          this.closeDialog()
          this.onUpdateVisibeData()
          this._cdr.detectChanges()
        }else{
          this.warning(res.meta)
        }
      })
    }

    closeDialog(){
        this.editMode = false;
        this.dialog.closeAll();
    }

    getDialogTitle(): string{
      return (this.editMode)? 'Edit an User Account': 'Create a User Account'
    }

    onUpdateUserPassword(event: MatCheckboxChange){
      this.updatePwd = event.checked;
      console.log(`update password value is changed: ${this.updatePwd}`)
      this._cdr.detectChanges()
    }

    passwordRequired(): boolean{
      return (this.editMode)? false: true
    }

    showPasswordField(){
      if(this.passwordRequired())
          return true;
      return this.updatePwd
    }

    masterToggle() {
        this._cdr.detectChanges()
        this.isAllSelected() ?
        this.selection.clear() :
        this.dataSource.data.forEach((row) => {
            if (row) {
            this.selection.select(row)
            } else {
            this.selection.deselect(row);
            this._cdr.detectChanges();
            }
        });
    }
    isAllSelected() {
        const numSelected = this.selection.selected.length;
        return numSelected;
    }

    removeTime(date: string): string{
        return date.substring(0, 11)
    }


    private validateEmail(email: string): boolean {
        // Regex pattern for a valid email address
        const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

        return emailRegex.test(email);
    }



    private warning(message: string[] | string) {
      if(typeof message == 'string')
        this._snackBar.open(message, '', snackBarConfigWarn)
      else
        this._snackBar.open(message[this.lng], '', snackBarConfigWarn)
    }

    private notify(message: string[] | string ) {
      if(typeof message == 'string')
        this._snackBar.open(message, '', snackBarConfig)
      else
        this._snackBar.open(message[this.lng], '', snackBarConfig)
    }
}
