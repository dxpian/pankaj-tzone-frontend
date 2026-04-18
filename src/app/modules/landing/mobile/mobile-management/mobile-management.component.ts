import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { DB_RESULT,  MobileAdmin,  MobileCluster,  MobileUser,  PERMISSION } from '../../utils/typedef';
import { Language } from '../../service/message-push-service/email/email.component';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountService } from '../../account/account.service';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MobileUserService } from '../mobile.service';
import { SharedService } from 'app/services/shared.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MatCheckboxChange } from '@angular/material/checkbox';
@Component({
  selector: 'app-mobile-management',
  templateUrl: './mobile-management.component.html',
  styleUrls: ['./mobile-management.component.scss']
})



export class MobileManagementComponent {
  @ViewChild('add', { static: true }) add: any;
  @ViewChild('add_sub', { static: true }) add_sub: any;    // add/edit apk


  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
 
  adminForm!: FormGroup;
  userForm!: FormGroup
  private dialogRef: any;
  
  displayedColumns: string[] = ['id', 'name', 'email', 'users',  'created',  'action'];

  displayedSubColumns: string[] = ['id', 'name', 'email', 'cluster',  'created',  'action'];

  clsUnknown = '--'
  totalRecords: number;
  totalSubRecords: number; 
  
  public usersMap: Map<string, MobileUser[]> = new Map()  // admin_id =>user
  public usersAdmin: MobileAdmin[] = []   // web-mobile admin
  public clusters: MobileCluster[] = []

  public dataSourceAdmin = new MatTableDataSource<MobileAdmin>()
  public dataSourceUser = new MatTableDataSource<MobileUser>()

  public selectionAdmin = new SelectionModel<MobileAdmin>(false, []);
  public selectionUser = new SelectionModel<MobileUser>(false, []);


  public adminSelected: MobileAdmin
  private lng = Language.ENG
  private editMode = false
  private updatePwd = false
  private adminTemp! : MobileAdmin;
  private userTemp!: MobileUser; 
  searchAdminKey = ''
  searchUserKey = ''
  searchInputControl = new FormControl();
  searchSubInputControl = new FormControl();

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  public PERMISSION =  PERMISSION
  permission: number; 
  constructor(
      public dialog: MatDialog,
      private fb: FormBuilder,
      private _snackBar: MatSnackBar,
      private _mobileService: MobileUserService,
      private _sharedService : SharedService,
      private _cdr: ChangeDetectorRef
  ){
    this.permission = this._sharedService.getPermission()
    console.log(`Current permission: ${this.permission}`)
  }
  
  ngOnInit(){
    this.loadAdminAndUser()
    this.loadClusters()
    this.totalRecords = 0
    this.totalSubRecords = 0
    this.searchInputControl.valueChanges
        .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
        this.searchAdminKey = query.trim().toLowerCase()
        if (this.searchAdminKey !== '') {
            let filterData = this.usersAdmin.filter(x => (x.name).toLowerCase().includes(this.searchAdminKey) || x.email.toLowerCase().includes(this.searchAdminKey));
            this.dataSourceAdmin.data = filterData
            return this.dataSourceAdmin.data
        } else {
            this.dataSourceAdmin.data = this.usersAdmin
            return this.dataSourceAdmin.data;
        }
        })
    )
    .subscribe();

    this.searchSubInputControl.valueChanges
        .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
        this.searchUserKey = query.trim().toLowerCase()
        if (this.searchUserKey !== '') {
            if(this.adminSelected && this.usersMap.has(this.adminSelected.id)){
              const users = this.usersMap.get(this.adminSelected.id)
              let filterData = users.filter(x => (x.name).toLowerCase().includes(this.searchUserKey) || x.email.toLowerCase().includes(this.searchUserKey));
              this.dataSourceUser.data = filterData
            }
            return this.dataSourceUser.data
        } else {
            if(this.adminSelected && this.usersMap.has(this.adminSelected.id)){
              this.dataSourceUser.data =  this.usersMap.get(this.adminSelected.id)
            }else{
              this.dataSourceUser.data = []
            }
            return this.dataSourceUser.data;
        }
        })    )
    .subscribe();   
  }



  loadAdminAndUser(){
    this.usersMap = new Map()
    this.usersAdmin = []
    this.dataSourceAdmin = new MatTableDataSource<MobileAdmin>();
    this.dataSourceUser = new MatTableDataSource<MobileAdmin>();
    this._mobileService.getSubUsersOfSelf().then((response: DB_RESULT)=>{
        if(response && response.error_code == 0){
            this.usersAdmin= response.object as MobileAdmin[]
            this.dataSourceAdmin.data = this.usersAdmin;
            this.dataSourceAdmin.paginator = this.paginator;
            this.dataSourceAdmin.sort = this.sort;
            // load the sub users of sub users
            for(let i = 0; i < this.usersAdmin.length; i ++){
              const user =  this.usersAdmin[i]
              this._mobileService.getSubUsers(user.id).then((response: DB_RESULT)=>{
                if(response && response.error_code == 0){
                  const newGroup = response.object as MobileUser[]
                  if(Array.isArray(newGroup))
                    this.usersMap.set(user.id, newGroup)
                }else{
                  console.log(`Failed to load the sub user of ${user.name}-${user.email}`)
                } 
                if(i == 0)
                  this.onSingleSelectAdmin(user)               
              })

            }
        }
        else{
          console.log(`Failed to read users`)
        }
    })
  }

  loadClusters(){
    console.log(`Loading cluster data`)
    const userId = this._sharedService.getId()
    this._mobileService.getClusters(userId).then((response: DB_RESULT)=>{
        if(response && response.error_code == 0){
            this.clusters = response.object as MobileCluster[]
            const clusterInvalid: MobileCluster = {
            id: '', 
            name: 'Clear cluster', 
            area: ''
          }
          this.clusters.push(clusterInvalid)
        }
        else{
          console.log(`Failed to load cluster information`)
        }
    })
    
  }

  resetAdminFormdata(){
    this.adminForm = this.fb.group({
        name: ['', Validators.required],
        email:['', Validators.required],
        update_password: [false],
        permission: [PERMISSION.WEB_MOB_ADMIN],
        password: ['', [Validators.required, Validators.minLength(6)]],
        password_confirm: ['', [Validators.required, Validators.minLength(6)]],
        created: [null]
    })
    this.updatePwd = false
  }

  resetUserFormdata(){
    var cls = ''
    if(this.userTemp){
      cls = this.userTemp.cluster
    }
    this.userForm = this.fb.group({
        name: ['', Validators.required],
        email:['', Validators.required],
        cluster: [cls, Validators.required],
        update_password: [false],
        permission: [PERMISSION.WEB_MOB_ADMIN],
        password: ['', [Validators.required, Validators.minLength(6)]],
        password_confirm: ['', [Validators.required, Validators.minLength(6)]],
        created: [null]
    })
    this.updatePwd = false
  }


  passwordRequired(): boolean{
    return (this.editMode)? false: true
  }

  onUpdateUserPassword(event: MatCheckboxChange){
      this.updatePwd = event.checked;
      console.log(`update password value is changed: ${this.updatePwd}`)
      this._cdr.detectChanges()
  }

  showPasswordField(){
    if(this.passwordRequired())
        return true;
    return this.updatePwd
  }
  
  getCreateButtonLabel(admin: boolean): string{
    if(admin){
      if(this.isDevelopermode())
        return 'Create Web-Admin'
      else
        return 'Create Mobile Admin'
    }else{
      if(this.isDevelopermode())
        return 'Create Mobile Admin'
      else
        return 'Create Mobile user'
    }
  }

  getDialogTitle(): string{
    if(!this.editMode){
      if(this.isDevelopermode())
        return 'Create web admin account'; 
      else  
        return 'Create mobile admin account'; 
    }else{
      if(this.isDevelopermode())
        return 'Edit web admin account'; 
      else  
        return 'Edit mobile admin account'; 
    }
  }

  getSubDialogTitle(): string{
    if(!this.editMode){
      if(this.isDevelopermode())
        return 'Create mobile admin account'; 
      else  
        return 'Create mobile user account'; 
    }else{
      if(this.isDevelopermode())
        return 'Edit mobile admin account'; 
      else  
        return 'Edit mobile user account'; 
    }
  }

  
  openAdminModal(action: string, data?: any){
      switch (action) {
        case 'add': // create new apk
            this.editMode = false
            this.resetAdminFormdata()
            this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
            break;

        case 'edit':  // edit apk version property
          this.editMode = true
          this.adminTemp = data
          this.resetAdminFormdata()
          if (this.adminTemp){
            this.adminForm.patchValue(this.adminTemp);
          }
          this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
          break;

        
        case 'delete':  // delete apk
          this.adminTemp = data
          this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
            this.dialogRef.componentInstance.data = {
            title: "Delete Account",
            message: "Are you sure you want to delete this account?"
            }
            this.dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.onDeleteAdminData()
            }
          })
          break
        default:
          break;
      }
  }

  onSubmitAdmindata(){
      console.log(`check the user validity of input form fields`)
      if(!this.adminForm.value.name){
        this.warning('Invalid user name')
        return;
      }

      const email = this.adminForm.value.email
      if(!email || !this.validateEmail(email)){
        this.warning('Invalid email address')
        return
      }

      var  passwordRes = '' // empty if password isn't updated
      var password = this.adminForm.value.password
      const password_confirm = this.adminForm.value.password_confirm
      console.log(`checking the password input: ${password}/${password_confirm}`)
      if(this.updatePwd || password){        
        if(!password){
          this.warning('Invalid password')
          return
        }
        if(password?.length < 4){
          this.warning('Password should be more than 4 characters')
          return
        }
        if(password != password_confirm){ // password isn't matched
          this.warning('Unmatched password')
          return
        }
        passwordRes = password
    }
    var formdata : MobileAdmin = {
      name: this.adminForm.value.name,
      email: this.adminForm.value.email,
      permission: (this.isDevelopermode())? PERMISSION.WEB_MOB_ADMIN: PERMISSION.MOB_ADMIN,
    }

    if(passwordRes){
      formdata.password = passwordRes
    }

    console.log(`create/update user data: ${JSON.stringify(formdata)}`)
    if(!this.editMode){ // create new user
      const parentId = this.isDevelopermode()? '': this._sharedService.getId()
      this._mobileService.createAcccount(formdata, parentId, formdata.permission).then((res: DB_RESULT)=>{
        if(res && res.error_code == 0){
          const newUser: MobileAdmin = res.object as MobileAdmin
          this.usersAdmin.push(newUser)
          this.usersMap.set(newUser.id, [])
          this.onUpdateAdminData()
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
      if(!this.adminTemp.id){ // invalid user selected
        return
      }
      this._mobileService.editAcccount(this.adminTemp.id, formdata, formdata.permission).then((res: DB_RESULT)=>{
        if(res && res.error_code== 0){
          const newUser = res.object as MobileAdmin
          Object.assign(this.adminTemp, newUser)
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

  onDeleteAdminData(){
    console.log(`delete user data`)
    if(!this.adminTemp.id){
      console.log(`Invalid user selected`)
      return
    }
    const selected = this.adminSelected?.id
    const deleted = this.adminTemp.id
    this._mobileService.deleteAccount(this.adminTemp.id, this.adminTemp.permission).then((res:DB_RESULT)=>{
      if(res && res.error_code == 0){ // success to delete user
        this.notify('Success to delete user account')
        this.usersAdmin = this.usersAdmin.filter(user=>user.id != this.adminTemp.id)
        this.closeDialog()
        this.onUpdateAdminData()
        if(deleted == selected && this.usersAdmin.length > 0){// selected ID is updated
          this.onSingleSelectAdmin(this.usersAdmin[0])
          this.onUpdateUserData()
        }
        this._cdr.detectChanges()
      }else{
        this.warning(res.meta)
      }
    })
  }

  openUserModal(action: string, data?: any){
    switch (action) {
      case 'add': // create new apk
          this.editMode = false
          this.resetUserFormdata()
          this.dialog.open(this.add_sub, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
          break;

      case 'edit':  // edit apk version property
        this.editMode = true
        this.userTemp = data
        this.resetUserFormdata()
        if (this.userTemp){
          this.userForm.patchValue(this.userTemp);
        }
        this.dialog.open(this.add_sub, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
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
      if(!this.userForm.value.name){
        this.warning('Invalid user name')
        return;
      }

      const email = this.userForm.value.email
      if(!email || !this.validateEmail(email)){
        this.warning('Invalid email address')
        return
      }

      const cluster = this.userForm.value.cluster
      
      var  passwordRes = '' // empty if password isn't updated
      var password = this.userForm.value.password
      const password_confirm = this.userForm.value.password_confirm
      console.log(`checking the password input: ${password}/${password_confirm}`)
      if(this.updatePwd || password){
        if(!password){
          this.warning('Invalid password')
          return
        }
        if(password?.length < 4){
          this.warning('Password should be more than 4 characters')
          return
        }
        if(password != password_confirm){ // password isn't matched
          this.warning('Unmatched password')
          return
        }
        passwordRes = password
    }
    var formdata : MobileUser = {
      name: this.userForm.value.name,
      email: this.userForm.value.email,
      permission: (this.isDevelopermode())? PERMISSION.MOB_ADMIN: PERMISSION.MOB_USER,
      cluster: cluster
    }

    if(passwordRes){
      formdata.password = passwordRes
    }

    console.log(`create/update user data: ${JSON.stringify(formdata)}`)
    if(!this.editMode){ // create new user
      const parentId = this.adminSelected.id
      this._mobileService.createAcccount(formdata, parentId, formdata.permission).then((res: DB_RESULT)=>{
        if(res && res.error_code == 0){
          const newUser: MobileUser = res.object as MobileUser
          if(this.adminSelected && this.usersMap.has(this.adminSelected.id)){
            const users = this.usersMap.get(this.adminSelected.id)
            users.push(newUser)
            this.usersMap.set(this.adminSelected.id, users)
            this.onUpdateUserData()
          }
          this.notify('Success to create new users account')
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
      this._mobileService.editAcccount(this.userTemp.id, formdata, formdata.permission).then((res: DB_RESULT)=>{
        if(res && res.error_code== 0){
          const newUser = res.object as MobileUser
          Object.assign(this.userTemp, newUser)
          this.notify('Success to save changes')
          this.closeDialog()
          this.onUpdateUserData()
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
      this._mobileService.deleteAccount(this.userTemp.id, this.userTemp.permission).then((res:DB_RESULT)=>{
        if(res && res.error_code == 0){ // success to delete user
          this.notify('Success to delete user account')
          if(this.adminSelected.id && this.usersMap.has(this.adminSelected.id)){
            var users = this.usersMap.get(this.adminSelected.id)
            users = users.filter(u=>u.id != this.userTemp.id)
            this.usersMap.set(this.adminSelected.id, users)
          }
          this.closeDialog()
          this.onUpdateUserData()
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

  onUpdateAdminData(){
      this.dataSourceAdmin = new MatTableDataSource<MobileAdmin>();
      if(!this.searchAdminKey){
          let filterData = this.usersAdmin.filter(x => (x.name).toLowerCase().includes(this.searchAdminKey) || x.email.toLowerCase().includes(this.searchAdminKey));
          this.dataSourceAdmin.data = filterData
      }else{
          this.dataSourceAdmin.data = this.usersAdmin;
          this.dataSourceAdmin.paginator = this.paginator;
          this.dataSourceAdmin.sort = this.sort;
      }
      this.totalRecords = this.usersAdmin.length
  }

  onUpdateUserData(){
      this.dataSourceUser = new MatTableDataSource<MobileUser>();
      var users = []
      if(this.adminSelected && this.usersMap.has(this.adminSelected.id)){
            users = this.usersMap.get(this.adminSelected.id)
      if(!this.searchUserKey){
            let filterData = users.filter(x => (x.name).toLowerCase().includes(this.searchUserKey) || x.email.toLowerCase().includes(this.searchUserKey));
            this.dataSourceUser.data = filterData
          }
      }else{
          this.dataSourceUser.data = users
      }
      this.dataSourceUser.paginator = this.paginator;
      this.dataSourceUser.sort = this.sort;
      this.totalSubRecords = users.length
  }


  getPermissionName(permission: number): string{
      if(permission == PERMISSION.WEB_MOB_ADMIN)
        return 'Web Admin'
      else if(permission == PERMISSION.MOB_ADMIN)
        return 'Mobile Admin'
      else if(permission == PERMISSION.MOB_USER)
        return 'Mobile User'
      return 'Invalid'
  }

  getUsercntOfAdmin(admin: MobileAdmin){
    if(!this.usersMap.has(admin.id))
        return 0
    return this.usersMap.get(admin.id).length
  }


  getClusterName(clusterId?: string): string{
    if(!clusterId){
      return this.clsUnknown
    }
    const cls = this.clusters.find(f=>f.id == clusterId)
    return (cls)?cls.name: this.clsUnknown

  }

  onSingleSelectAdmin(row: MobileAdmin) {
      if (!this.selectionAdmin.isSelected(row)) {
          this.selectionAdmin.select(row);
          this.adminSelected = row
          this.onUpdateUserData()
          this._cdr.detectChanges()
          console.log(`Refresh mobile admin of user: ${this.adminSelected.name}`)
      }
  }

  onSingleSelectUser(row: MobileUser) {
      if (!this.selectionUser.isSelected(row)) {
          this.selectionUser.select(row);
          this.onUpdateUserData()
          this._cdr.detectChanges()
      }
  }


  getSelectedWebAdminName(): string{
      if(!this.adminSelected)
          return ''
      return this.adminSelected.name || ''
  }


  isAllSelected() {
      const numSelected = this.selectionAdmin.selected.length;
      return numSelected;
  }

  removeTime(date: string): string{
      return date.substring(0, 10)
  }

  public isDevelopermode(): boolean{
    return this.permission == PERMISSION.DEVELOPER
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
