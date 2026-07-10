import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DB_RESULT, MobileAdmin, MobileUser, MobileUserSignUpCredentials, PERMISSION } from '../../utils/typedef';
import { Language } from '../../service/message-push-service/email/email.component';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MobileUserService } from '../service/mobile.service';
import { SharedService } from '../../../../services/shared.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { AlfresaCenterService } from '../../service/alfresa/service.center';
import { AlfresaBranch, AlfresaCenter, ALFLOC } from '../../service/alfresa/alfresa.type';
import {
  AlfresaSiteOption,
  buildAlfresaSiteOptions,
  decodeSiteSelection,
  encodeSiteSelection,
  filterAlfresaSiteOptions,
  findAlfresaSiteOption,
  resolveSiteFromMobileUser,
} from '../alfresa-site.util';

interface PendingMobileNavigation {
  adminId: string;
  userId?: string;
}

@Component({
  selector: 'app-alfresa-mobile-management',
  templateUrl: './alfresa-mobile-management.component.html',
  styleUrls: ['./alfresa-mobile-management.component.scss']
})
export class AlfresaMobileManagementComponent implements AfterViewInit, OnDestroy {
  @ViewChild('add', { static: true }) add: any;
  @ViewChild('add_sub', { static: true }) add_sub: any;    // add/edit apk


  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild('adminSort') adminSort!: MatSort;
  @ViewChild('userSort') userSort!: MatSort;
 
  adminForm!: FormGroup;
  userForm!: FormGroup
  private dialogRef: any;
  
  displayedColumns: string[] = ['id', 'name', 'email', 'users', 'site', 'created', 'action'];

  displayedSubColumns: string[] = ['id', 'name', 'email', 'site', 'created', 'action'];

  totalRecords: number;
  totalSubRecords: number; 
  
  public usersMap: Map<string, MobileUser[]> = new Map()
  public usersAdmin: MobileAdmin[] = []
  siteOptions: AlfresaSiteOption[] = []
  siteFilterControl = new FormControl('');

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

  private pendingMobileNavigation: PendingMobileNavigation | null = null;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  public PERMISSION =  PERMISSION
  permission: number; 
  constructor(
      public dialog: MatDialog,
      private fb: FormBuilder,
      private _snackBar: MatSnackBar,
      private _mobileService: MobileUserService,
      private _centerService: AlfresaCenterService,
      private _sharedService : SharedService,
      private _cdr: ChangeDetectorRef,
      private _router: Router,
      private _activatedRoute: ActivatedRoute,
  ){
    this.permission = this._sharedService.getPermission()
    console.log(`Current permission: ${this.permission}`)
  }
  
  ngOnInit(){
    this.captureMobileNavigationFromRoute(this._activatedRoute.snapshot.queryParamMap);
    this._activatedRoute.queryParamMap.pipe(
      takeUntil(this._unsubscribeAll),
    ).subscribe((params) => {
      this.captureMobileNavigationFromRoute(params);
      if (this.pendingMobileNavigation && this.usersAdmin.length > 0) {
        this.applyPendingMobileNavigation();
      }
    });
    this.loadAdminAndUser()
    this.loadAlfresaSites()
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

  ngAfterViewInit(): void {
    this.configureAdminDataSource(this.dataSourceAdmin)
    this.configureUserDataSource(this.dataSourceUser)
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  private configureAdminDataSource(dataSource: MatTableDataSource<MobileAdmin>): void {
    dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'users':
          return this.getUsercntOfAdmin(item)
        case 'site':
          return this.hasSiteBound(item) ? this.getSiteLabel(item).toLowerCase() : 'uninitialized'
        case 'created':
          return item.created ? new Date(item.created).getTime() : 0
        case 'name':
          return (item.name ?? '').toLowerCase()
        case 'email':
          return (item.email ?? '').toLowerCase()
        default:
          return ''
      }
    }
    if (this.adminSort) {
      dataSource.sort = this.adminSort
    }
    if (this.paginator) {
      dataSource.paginator = this.paginator
    }
  }

  private configureUserDataSource(dataSource: MatTableDataSource<MobileUser>): void {
    dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'site':
          return this.hasSiteBound(item) ? this.getSiteLabel(item).toLowerCase() : 'uninitialized'
        case 'created':
          return item.created ? new Date(item.created).getTime() : 0
        case 'name':
          return (item.name ?? '').toLowerCase()
        case 'email':
          return (item.email ?? '').toLowerCase()
        default:
          return ''
      }
    }
    if (this.userSort) {
      dataSource.sort = this.userSort
    }
    if (this.paginator) {
      dataSource.paginator = this.paginator
    }
  }

  loadAdminAndUser(){
    this.usersMap = new Map()
    this.usersAdmin = []
    this.dataSourceAdmin = new MatTableDataSource<MobileAdmin>();
    this.dataSourceUser = new MatTableDataSource<MobileUser>();
    this._mobileService.getSubUsersOfSelf().then((response: DB_RESULT)=>{
        if(response && response.error_code == 0){
            this.usersAdmin= response.object as MobileAdmin[]
            this.dataSourceAdmin.data = this.usersAdmin;
            this.configureAdminDataSource(this.dataSourceAdmin)
            const loadUsers = this.usersAdmin
              .filter((admin) => !!admin.id)
              .map((admin) => this._mobileService.getSubUsers(admin.id!).then((subRes: DB_RESULT) => {
                if (subRes && subRes.error_code == 0) {
                  const newGroup = subRes.object as MobileUser[]
                  if (Array.isArray(newGroup)) {
                    this.usersMap.set(admin.id!, newGroup)
                  }
                } else {
                  console.log(`Failed to load the sub user of ${admin.name}-${admin.email}`)
                }
              }));
            Promise.all(loadUsers).then(() => {
              this.onUpdateAdminData();
              if (this.pendingMobileNavigation) {
                this.applyPendingMobileNavigation();
              } else if (this.usersAdmin.length > 0) {
                this.onSingleSelectAdmin(this.usersAdmin[0]);
              }
              this._cdr.markForCheck();
            });
        }
        else{
          console.log(`Failed to read users`)
        }
    })
  }

  loadAlfresaSites(): void {
    Promise.all([
      this._centerService.getAllCenterNames(),
      this._centerService.getAllBranchNames(),
    ]).then(([centerRes, branchRes]) => {
      const centers = (centerRes && !centerRes.error_code ? centerRes.object : []) as AlfresaCenter[];
      const branches = (branchRes && !branchRes.error_code ? branchRes.object : []) as AlfresaBranch[];
      this.siteOptions = buildAlfresaSiteOptions(centers, branches);
      this._cdr.detectChanges();
    }).catch((err) => console.error('Failed to load Alfresa sites', err));
  }

  resetAdminFormdata(siteSelection = ''): void {
    this.siteFilterControl.setValue('', { emitEvent: false });
    this.adminForm = this.fb.group({
        name: ['', Validators.required],
        email:['', Validators.required],
        siteSelection: [siteSelection, Validators.required],
        update_password: [false],
        permission: [PERMISSION.MOB_ADMIN],
        password: ['', [Validators.required, Validators.minLength(6)]],
        password_confirm: ['', [Validators.required, Validators.minLength(6)]],
        created: [null]
    })
    this.updatePwd = false
  }

  resetUserFormdata(){
    this.userForm = this.fb.group({
        name: ['', Validators.required],
        email:['', Validators.required],
        update_password: [false],
        permission: [PERMISSION.MOB_USER],
        password: ['', [Validators.required, Validators.minLength(6)]],
        password_confirm: ['', [Validators.required, Validators.minLength(6)]],
        created: [null]
    })
    this.updatePwd = false
  }

  getFilteredSiteOptions(): AlfresaSiteOption[] {
    return filterAlfresaSiteOptions(this.siteOptions, this.siteFilterControl.value ?? '');
  }

  onSiteFilterInput(event: Event): void {
    this.siteFilterControl.setValue((event.target as HTMLInputElement).value);
    this._cdr.markForCheck();
  }

  getSiteLabel(user: MobileAdmin | MobileUser): string {
    if (!this.hasSiteBound(user)) {
      return '';
    }
    const option = findAlfresaSiteOption(this.siteOptions, user);
    return option?.label ?? '';
  }

  getSiteName(user: MobileAdmin | MobileUser): string {
    const option = findAlfresaSiteOption(this.siteOptions, user);
    return option?.name?.trim() ?? '';
  }

  navigateToCenterSite(user: MobileAdmin | MobileUser, event?: Event): void {
    event?.stopPropagation();
    const resolved = resolveSiteFromMobileUser(user);
    if (!resolved) {
      return;
    }
    const queryParams: { centerId: string; branchId?: string } = {
      centerId: resolved.siteId,
    };
    if (resolved.siteType === ALFLOC.BRANCH) {
      queryParams.branchId = resolved.siteId;
      const option = findAlfresaSiteOption(this.siteOptions, user);
      if (option?.centerId) {
        queryParams.centerId = option.centerId;
      }
    }
    this._router.navigate(['/service/alfresa-center'], { queryParams });
  }

  private captureMobileNavigationFromRoute(params: { get: (name: string) => string | null }): void {
    const adminId = params.get('adminId');
    if (!adminId) {
      return;
    }
    this.pendingMobileNavigation = {
      adminId,
      userId: params.get('userId') ?? undefined,
    };
  }

  private applyPendingMobileNavigation(): void {
    if (!this.pendingMobileNavigation) {
      return;
    }
    const { adminId, userId } = this.pendingMobileNavigation;
    const admin = this.usersAdmin.find((item) => item.id === adminId);
    if (!admin) {
      this.pendingMobileNavigation = null;
      return;
    }

    this.selectionAdmin.clear();
    this.selectionAdmin.select(admin);
    this.adminSelected = admin;
    this.onUpdateUserData();

    if (userId) {
      const users = this.usersMap.get(adminId) ?? [];
      const user = users.find((item) => item.id === userId);
      if (user) {
        this.selectionUser.clear();
        this.selectionUser.select(user);
      }
    }

    this.pendingMobileNavigation = null;
    this._cdr.markForCheck();
  }

  hasSiteBound(user: MobileAdmin | MobileUser): boolean {
    return !!resolveSiteFromMobileUser(user);
  }

  isBranchSite(user: MobileAdmin | MobileUser): boolean {
    if (!this.hasSiteBound(user)) {
      return false;
    }
    const resolved = resolveSiteFromMobileUser(user);
    return resolved?.siteType === ALFLOC.BRANCH;
  }

  getSiteTooltip(user: MobileAdmin | MobileUser): string {
    if (!this.hasSiteBound(user)) {
      return 'Not bound to any site yet';
    }
    return this.isBranchSite(user) ? 'Branch' : 'Center';
  }

  getSiteIcon(user: MobileAdmin | MobileUser): string {
    if (!this.hasSiteBound(user)) {
      return 'heroicons_outline:exclamation-circle';
    }
    return this.isBranchSite(user)
      ? 'heroicons_outline:location-marker'
      : 'heroicons_outline:office-building';
  }

  getSiteCode(user: MobileAdmin | MobileUser): string | undefined {
    const option = findAlfresaSiteOption(this.siteOptions, user);
    return option?.code?.trim() || undefined;
  }

  copyEmail(user: MobileAdmin | MobileUser, event?: Event): void {
    event?.stopPropagation();
    this.copyTextToClipboard(user.email, 'No email to copy', 'Email copied');
  }

  copyAdminSiteCode(admin: MobileAdmin, event?: Event): void {
    event?.stopPropagation();
    this.copyTextToClipboard(this.getSiteCode(admin), 'No site code to copy', 'Site code copied');
  }

  private copyTextToClipboard(
    text: string | undefined,
    emptyMessage: string,
    successMessage: string
  ): void {
    if (!text) {
      this.warning(emptyMessage);
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.notify(successMessage);
      });
      return;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    this.notify(successMessage);
  }

  private buildAdminPayload(): MobileUserSignUpCredentials | null {
    const decoded = decodeSiteSelection(this.adminForm.value.siteSelection);
    if (!decoded) {
      this.warning('Please select a site');
      return null;
    }
    return {
      name: this.adminForm.value.name,
      email: this.adminForm.value.email,
      site_type: decoded.siteType,
      site: decoded.siteId,
    };
  }

  private siteSelectionForUser(user: MobileAdmin | MobileUser): string {
    const resolved = resolveSiteFromMobileUser(user);
    return resolved ? encodeSiteSelection(resolved.siteType, resolved.siteId) : '';
  }

  private syncSubUsersSiteForAdmin(adminId: string, admin: MobileAdmin): void {
    if (!this.usersMap.has(adminId)) {
      return;
    }
    const resolved = resolveSiteFromMobileUser(admin);
    const users = this.usersMap.get(adminId) ?? [];
    users.forEach((user) => {
      if (!resolved) {
        user.site_type = undefined;
        user.site = undefined;
        user.center = undefined;
        user.branch = undefined;
        return;
      }
      user.site_type = resolved.siteType;
      user.site = resolved.siteId;
      if (resolved.siteType === ALFLOC.CENTER) {
        user.center = resolved.siteId;
        user.branch = undefined;
      } else {
        user.branch = resolved.siteId;
        user.center = undefined;
      }
    });
    this.usersMap.set(adminId, users);
    if (this.adminSelected?.id === adminId) {
      this.onUpdateUserData();
    }
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
  
  getCreateButtonLabel(admin: boolean): string {
    return admin ? '+ Admin' : '+ User';
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
    const adminName = this.getSelectedWebAdminName()
    const adminPart = adminName ? ` — ${adminName}` : ''
    if(!this.editMode){
      if(this.isDevelopermode())
        return `Create mobile admin account${adminPart}`
      else  
        return `Create mobile user account${adminPart}`
    }else{
      if(this.isDevelopermode())
        return `Edit mobile admin account${adminPart}`
      else  
        return `Edit mobile user account${adminPart}`
    }
  }

  
  openAdminModal(action: string, data?: any){
      switch (action) {
        case 'add':
            this.editMode = false
            this.resetAdminFormdata()
            this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
            break;

        case 'edit':
          this.editMode = true
          this.adminTemp = data
          this.resetAdminFormdata(this.siteSelectionForUser(this.adminTemp))
          if (this.adminTemp) {
            this.adminForm.patchValue(this.adminTemp)
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
    const payload = this.buildAdminPayload()
    if (!payload) {
      return
    }

    var formdata : MobileAdmin = {
      ...payload,
      permission: PERMISSION.MOB_ADMIN,
    }

    if(passwordRes){
      formdata.password = passwordRes
    }

    console.log(`create/update user data: ${JSON.stringify(formdata)}`)
    if(!this.editMode){ // create new user
      const parentId = this._sharedService.getId()
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
          this.syncSubUsersSiteForAdmin(this.adminTemp.id, this.adminTemp)
          this.notify('Success to save changes')
          this.closeDialog()
          this.onUpdateAdminData()
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
      case 'add':
          if (!this.adminSelected?.id) {
            this.warning('Please select a mobile admin first')
            return
          }
          this.editMode = false
          this.resetUserFormdata()
          this.dialog.open(this.add_sub, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
          break;

      case 'edit':
        if (!this.adminSelected?.id) {
          this.warning('Please select a mobile admin first')
          return
        }
        this.editMode = true
        this.userTemp = data
        this.resetUserFormdata()
        if (this.userTemp) {
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
      permission: PERMISSION.MOB_USER,
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
      this.siteFilterControl.setValue('', { emitEvent: false });
      this.dialog.closeAll();
  }

  onUpdateAdminData(){
      const dataSource = new MatTableDataSource<MobileAdmin>();
      if (this.searchAdminKey) {
          dataSource.data = this.usersAdmin.filter(
            (x) =>
              (x.name).toLowerCase().includes(this.searchAdminKey) ||
              x.email.toLowerCase().includes(this.searchAdminKey)
          )
      } else {
          dataSource.data = this.usersAdmin
      }
      this.dataSourceAdmin = dataSource
      this.configureAdminDataSource(this.dataSourceAdmin)
      this.totalRecords = this.usersAdmin.length
  }

  onUpdateUserData(){
      const dataSource = new MatTableDataSource<MobileUser>();
      let users: MobileUser[] = []
      if (this.adminSelected && this.usersMap.has(this.adminSelected.id)) {
        users = this.usersMap.get(this.adminSelected.id) ?? []
      }
      if (this.searchUserKey) {
        dataSource.data = users.filter(
          (x) =>
            (x.name).toLowerCase().includes(this.searchUserKey) ||
            x.email.toLowerCase().includes(this.searchUserKey)
        )
      } else {
        dataSource.data = users
      }
      this.dataSourceUser = dataSource
      this.configureUserDataSource(this.dataSourceUser)
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
