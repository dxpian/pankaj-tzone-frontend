import { AfterViewInit, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
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
import { MobileUserService } from '../service/mobile.service';
import { SharedService } from '../../../../services/shared.service';
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



export class MobileManagementComponent implements AfterViewInit {
  @ViewChild('add', { static: true }) add: any;
  @ViewChild('add_sub', { static: true }) add_sub: any;    // add/edit apk


  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild('adminSort') adminSort!: MatSort;
  @ViewChild('userSort') userSort!: MatSort;
 
  adminForm!: FormGroup;
  userForm!: FormGroup
  private dialogRef: any;
  
  displayedColumns: string[] = ['id', 'name', 'email', 'users', 'clusters', 'created', 'action'];

  displayedSubColumns: string[] = ['id', 'name', 'email', 'cluster',  'created',  'action'];

  clsUnknown = '--'
  totalRecords: number;
  totalSubRecords: number; 
  
  public usersMap: Map<string, MobileUser[]> = new Map()  // admin_id =>user
  public adminClusterCountMap: Map<string, number> = new Map()
  showUserDialogClusters = false
  public usersAdmin: MobileAdmin[] = []   // web-mobile admin
  public clusters: MobileCluster[] = []
  adminDialogClusters: MobileCluster[] = []
  userDialogClusters: MobileCluster[] = []

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
  adminClusterSearch = ''
  userClusterSearch = ''

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

  ngAfterViewInit(): void {
    this.configureAdminDataSource(this.dataSourceAdmin)
    this.configureUserDataSource(this.dataSourceUser)
  }

  private configureAdminDataSource(dataSource: MatTableDataSource<MobileAdmin>): void {
    dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'users':
          return this.getUsercntOfAdmin(item)
        case 'clusters':
          return this.getClusterCountOfAdmin(item)
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
        case 'cluster':
          return this.getClusterCountOfUser(item)
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
    this.dataSourceUser = new MatTableDataSource<MobileAdmin>();
    this._mobileService.getSubUsersOfSelf().then((response: DB_RESULT)=>{
        if(response && response.error_code == 0){
            this.usersAdmin= response.object as MobileAdmin[]
            this.dataSourceAdmin.data = this.usersAdmin;
            this.configureAdminDataSource(this.dataSourceAdmin)
            this.loadAdminClusterCounts()
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
    this._mobileService.getClusters().then((response: DB_RESULT)=>{
        if(response && response.error_code == 0){
            this.clusters = response.object as MobileCluster[]
        }
        else{
          console.log(`Failed to load cluster information`)
        }
    })
    
  }

  resetAdminFormdata(selectedClusterIds: string[] = []){
    this.adminForm = this.fb.group({
        name: ['', Validators.required],
        email:['', Validators.required],
        clusters: [selectedClusterIds],
        update_password: [false],
        permission: [PERMISSION.WEB_MOB_ADMIN],
        password: ['', [Validators.required, Validators.minLength(6)]],
        password_confirm: ['', [Validators.required, Validators.minLength(6)]],
        created: [null]
    })
    this.updatePwd = false
  }

  resetUserFormdata(){
    let clss: string[] = []
    if (this.editMode && this.userTemp?.clusters) {
      clss = [...this.userTemp.clusters]
    }
    this.userForm = this.fb.group({
        name: ['', Validators.required],
        email:['', Validators.required],
        clusters: [clss],
        
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

  private getSelectableClusters(list: MobileCluster[]): MobileCluster[] {
    return list.filter((c) => !!c.id)
  }

  private normalizeClusterList(payload: unknown): MobileCluster[] {
    if (Array.isArray(payload)) {
      return payload as MobileCluster[]
    }
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      if (Array.isArray(obj.clusters)) {
        return obj.clusters as MobileCluster[]
      }
      if (Array.isArray(obj.list)) {
        return obj.list as MobileCluster[]
      }
      if (Array.isArray(obj.data)) {
        return obj.data as MobileCluster[]
      }
    }
    return []
  }

  private loadClustersOfUser(userId: string): Promise<MobileCluster[]> {
    return this._mobileService.getClustersOfSubUser(userId).then((response: DB_RESULT) => {
      if (response && response.error_code === 0) {
        return this.getSelectableClusters(this.normalizeClusterList(response.object))
      }
      this.warning('Failed to load cluster information')
      return []
    })
  }

  /** Cluster ids bound to a mobile admin (matches cluster-area: permission > 0). */
  private assignedClusterIds(clusters: MobileCluster[]): string[] {
    const list = this.getSelectableClusters(clusters)
    if (list.length === 0) {
      return []
    }
    const granted = list.filter((c) => Number(c.permission) > 0)
    if (granted.length > 0) {
      return granted.map((c) => c.id as string)
    }
    // get-cluster-of-mobile returns only clusters allocated to this admin
    return list.map((c) => c.id as string)
  }

  private countBoundClusters(clusters: MobileCluster[]): number {
    return this.assignedClusterIds(clusters).length
  }

  private loadAdminClusterCounts(): void {
    const admins = this.usersAdmin.filter((admin) => !!admin.id)
    if (admins.length === 0) {
      return
    }
    for (const admin of admins) {
      if (Array.isArray(admin.clusters)) {
        this.adminClusterCountMap.set(admin.id!, admin.clusters.length)
      }
    }
    Promise.all(
      admins.map((admin) =>
        this.loadClustersOfUser(admin.id!).then((list) => {
          const count = this.countBoundClusters(list)
          const fromAdmin = Array.isArray(admin.clusters) ? admin.clusters.length : 0
          this.adminClusterCountMap.set(admin.id!, Math.max(count, fromAdmin))
        })
      )
    ).then(() => {
      this.onUpdateAdminData()
      this._cdr.detectChanges()
    })
  }

  private refreshAdminClusterCount(adminId: string, fallbackCount?: number): void {
    this.loadClustersOfUser(adminId).then((list) => {
      const count = Math.max(this.countBoundClusters(list), fallbackCount ?? 0)
      this.adminClusterCountMap.set(adminId, count)
      this.onUpdateAdminData()
      this._cdr.detectChanges()
    })
  }

  private prepareAdminDialogClusters(): void {
    this.adminDialogClusters = this.getSelectableClusters(this.clusters)
  }

  isAdminClusterSelected(clusterId: string): boolean {
    const selected: string[] = this.adminForm?.get('clusters')?.value ?? []
    return selected.includes(clusterId)
  }

  onAdminClusterSelectionChange(clusterId: string, event: MatCheckboxChange): void {
    this.updateFormClusterSelection(this.adminForm, clusterId, event)
    this._cdr.detectChanges()
  }

  isUserClusterSelected(clusterId: string): boolean {
    const selected: string[] = this.userForm?.get('clusters')?.value ?? []
    return selected.includes(clusterId)
  }

  onUserClusterSelectionChange(clusterId: string, event: MatCheckboxChange): void {
    this.updateFormClusterSelection(this.userForm, clusterId, event)
    this._cdr.detectChanges()
  }

  private resetClusterDialogSearch(): void {
    this.adminClusterSearch = ''
    this.userClusterSearch = ''
  }

  private getSelectedClusterCount(form: FormGroup | undefined): number {
    if (!form) {
      return 0
    }
    const selected: string[] = form.get('clusters')?.value ?? []
    return selected.length
  }

  getAdminClusterDialogLabel(): string {
    return `clusters(${this.getSelectedClusterCount(this.adminForm)})`
  }

  getUserClusterDialogLabel(): string {
    return `clusters(${this.getSelectedClusterCount(this.userForm)})`
  }

  private filterDialogClusters(
    clusters: MobileCluster[],
    search: string
  ): MobileCluster[] {
    const q = search.trim().toLowerCase()
    if (!q) {
      return clusters
    }
    return clusters.filter((c) => (c.name ?? '').toLowerCase().includes(q))
  }

  getVisibleAdminDialogClusters(): MobileCluster[] {
    return this.filterDialogClusters(this.adminDialogClusters, this.adminClusterSearch)
  }

  getVisibleUserDialogClusters(): MobileCluster[] {
    return this.filterDialogClusters(this.userDialogClusters, this.userClusterSearch)
  }

  onAdminClusterSearchInput(event: Event): void {
    this.adminClusterSearch = (event.target as HTMLInputElement).value
    this._cdr.markForCheck()
  }

  onUserClusterSearchInput(event: Event): void {
    this.userClusterSearch = (event.target as HTMLInputElement).value
    this._cdr.markForCheck()
  }

  getAdminSelectAllLabel(): string {
    return this.areAllVisibleAdminClustersSelected() ? 'Deselect all' : 'Select all'
  }

  getUserSelectAllLabel(): string {
    return this.areAllVisibleUserClustersSelected() ? 'Deselect all' : 'Select all'
  }

  areAllVisibleAdminClustersSelected(): boolean {
    const visible = this.getVisibleAdminDialogClusters()
    if (visible.length === 0) {
      return false
    }
    return visible.every((c) => c.id && this.isAdminClusterSelected(c.id))
  }

  isSomeVisibleAdminClustersSelected(): boolean {
    const visible = this.getVisibleAdminDialogClusters()
    const selected = visible.filter((c) => c.id && this.isAdminClusterSelected(c.id)).length
    return selected > 0 && selected < visible.length
  }

  areAllVisibleUserClustersSelected(): boolean {
    const visible = this.getVisibleUserDialogClusters()
    if (visible.length === 0) {
      return false
    }
    return visible.every((c) => c.id && this.isUserClusterSelected(c.id))
  }

  isSomeVisibleUserClustersSelected(): boolean {
    const visible = this.getVisibleUserDialogClusters()
    const selected = visible.filter((c) => c.id && this.isUserClusterSelected(c.id)).length
    return selected > 0 && selected < visible.length
  }

  onAdminSelectAllChange(event: MatCheckboxChange): void {
    this.setVisibleClusterSelection(
      this.adminForm,
      this.getVisibleAdminDialogClusters(),
      event.checked
    )
    this._cdr.detectChanges()
  }

  onUserSelectAllChange(event: MatCheckboxChange): void {
    this.setVisibleClusterSelection(
      this.userForm,
      this.getVisibleUserDialogClusters(),
      event.checked
    )
    this._cdr.detectChanges()
  }

  private setVisibleClusterSelection(
    form: FormGroup,
    visible: MobileCluster[],
    select: boolean
  ): void {
    const control = form.get('clusters')
    const visibleIds = visible
      .map((c) => c.id)
      .filter((id): id is string => !!id)
    let selected: string[] = [...(control?.value ?? [])]
    if (select) {
      for (const id of visibleIds) {
        if (!selected.includes(id)) {
          selected.push(id)
        }
      }
    } else {
      const visibleSet = new Set(visibleIds)
      selected = selected.filter((id) => !visibleSet.has(id))
    }
    control?.setValue(selected)
    control?.markAsDirty()
  }

  private updateFormClusterSelection(
    form: FormGroup,
    clusterId: string,
    event: MatCheckboxChange
  ): void {
    const control = form.get('clusters')
    let selected: string[] = [...(control?.value ?? [])]
    if (event.checked) {
      if (!selected.includes(clusterId)) {
        selected.push(clusterId)
      }
    } else {
      selected = selected.filter((id) => id !== clusterId)
    }
    control?.setValue(selected)
    control?.markAsDirty()
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
        case 'add': // create new apk
            this.editMode = false
            this.resetClusterDialogSearch()
            this.prepareAdminDialogClusters()
            this.resetAdminFormdata()
            this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
            break;

        case 'edit':  // edit apk version property
          this.editMode = true
          this.adminTemp = data
          this.resetClusterDialogSearch()
          this.prepareAdminDialogClusters()
          const adminId = this.adminTemp?.id
          const loadAdminClusters = adminId
            ? this.loadClustersOfUser(adminId).then((list) => this.assignedClusterIds(list))
            : Promise.resolve([] as string[])
          loadAdminClusters.then((selectedIds) => {
            this.resetAdminFormdata(selectedIds)
            if (this.adminTemp) {
              this.adminForm.patchValue(this.adminTemp)
              this.adminForm.patchValue({ clusters: selectedIds })
            }
            this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true })
            this._cdr.detectChanges()
          })
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
    const clusters: string[] = this.adminForm.value.clusters ?? []

    var formdata : MobileAdmin = {
      name: this.adminForm.value.name,
      email: this.adminForm.value.email,
      permission: (this.isDevelopermode())? PERMISSION.WEB_MOB_ADMIN: PERMISSION.MOB_ADMIN,
      clusters
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
          if (newUser.id) {
            this.refreshAdminClusterCount(newUser.id, clusters.length)
          }
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
          if (this.adminTemp.id) {
            this.refreshAdminClusterCount(this.adminTemp.id, clusters.length)
          }
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
        if (deleted) {
          this.adminClusterCountMap.delete(deleted)
        }
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
          if (!this.adminSelected?.id) {
            this.warning('Please select a mobile admin first')
            return
          }
          this.editMode = false
          this.resetClusterDialogSearch()
          this.loadClustersOfUser(this.adminSelected.id).then((list) => {
            this.userDialogClusters = list
            this.showUserDialogClusters = list.length > 0
            this.resetUserFormdata()
            this.dialog.open(this.add_sub, { width: '800px', panelClass: 'custom-modalbox', disableClose: true })
            this._cdr.detectChanges()
          })
          break;

      case 'edit':  // edit apk version property
        if (!this.adminSelected?.id) {
          this.warning('Please select a mobile admin first')
          return
        }
        this.editMode = true
        this.userTemp = data
        this.resetClusterDialogSearch()
        this.loadClustersOfUser(this.adminSelected.id).then((list) => {
          this.userDialogClusters = list
          this.showUserDialogClusters = list.length > 0
          this.resetUserFormdata()
          if (this.userTemp) {
            this.userForm.patchValue(this.userTemp)
          }
          this.dialog.open(this.add_sub, { width: '800px', panelClass: 'custom-modalbox', disableClose: true })
          this._cdr.detectChanges()
        })
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

      const clusters: string[] = this.showUserDialogClusters
        ? (this.userForm.value.clusters ?? [])
        : []

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
      clusters
    }

    if(passwordRes){
      formdata.password = passwordRes
    }

    console.log(`create/update user data: ${JSON.stringify(formdata)}`)
    if(!this.editMode){ // create new user
      const parentId = this.adminSelected.id
      this._mobileService.createAcccount(formdata, parentId, formdata.permission).then((res: DB_RESULT)=>{
        if(res && res.error_code == 0){
          const newUser: MobileUser = {
            ...(res.object as MobileUser),
            clusters: formdata.clusters ?? [],
          }
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
          Object.assign(this.userTemp, newUser, { clusters: formdata.clusters ?? [] })
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
      this.showUserDialogClusters = false;
      this.resetClusterDialogSearch();
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

  getClusterCountOfAdmin(admin: MobileAdmin): number {
    if (admin.id && this.adminClusterCountMap.has(admin.id)) {
      return this.adminClusterCountMap.get(admin.id) ?? 0
    }
    if (Array.isArray(admin.clusters)) {
      return admin.clusters.length
    }
    return 0
  }

  getClusterCountOfUser(user: MobileUser): number {
    if (Array.isArray(user.clusters)) {
      return user.clusters.length
    }
    const legacy = (user as MobileUser & { cluster?: string }).cluster
    return legacy ? 1 : 0
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
