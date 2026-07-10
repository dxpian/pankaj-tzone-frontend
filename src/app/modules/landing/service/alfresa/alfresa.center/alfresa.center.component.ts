import { ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { SharedService } from 'app/services/shared.service';
import { AlfresaCenterService } from '../service.center';
import { ALFLOC, ALF_SHIFT_STATUS, ALF_SHIFT_TYPE, AlfresaBranch, AlfresaCenter, AlfresaShiftConfig, AlfresaShiftTableResult, AlfresaShiftTableWorkerRow, AlfresaShiftWorkerBind, getAlfShiftTypeLabel, isAlfShiftCenterType, isAlfShiftNightType } from '../alfresa.type';
import { DB_RESULT, MobileAdmin, MobileUser, PageData, PageQuery, isWebAdminPermission } from 'app/modules/landing/utils/typedef';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { Language } from '../../message-push-service/email/email.component';
import { MSG } from 'app/modules/landing/utils/message.def';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, filter, Subject, switchMap, takeUntil } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { isValidAlfCode, isValidEmail, normalizeString, normalizeWhitespace } from '../alfresa.util';
import { environment } from 'app/enviroment/enviroment';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { AlfresaShiftService } from '../service.shift';
import { MobileUserService } from '../../../mobile/service/mobile.service';

interface CenterWorkerEntry {
    scheduleId: string;
    userId: string;
    adminId: string | null;
    name: string;
    email: string;
    shiftType: number | null;
    shiftLabel: string;
    active: boolean;
    validFrom: string | null;
    validTo: string | null;
    scheduleState: 'active' | 'inactive' | 'expired';
}

interface PendingSiteNavigation {
    centerId: string;
    branchId?: string;
}

interface CenterBindingState {
    workers: CenterWorkerEntry[];
}



@Component({
  selector: 'app-alfresa.center',
  templateUrl: './alfresa.center.component.html',
  styleUrls: ['./alfresa.center.component.scss']
})
export class AlfresaCenterComponent implements OnInit{

    private centerNames: AlfresaCenter[] = []   // keep only center name and ID
    private centerSelected: AlfresaCenter
    private branchSelected: AlfresaBranch
    private centers: AlfresaCenter[] = []
    private branches: AlfresaBranch[] = []
    private lng = Language.ENG

    @ViewChild('addCenter') AddCenter: any;
    @ViewChild('addBranch') AddBranch: any;
    @ViewChild('bindWorkerDialog', { static: true }) bindWorkerDialog!: TemplateRef<unknown>;

    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    public dialogRef: any;

    public dataSource = new MatTableDataSource<AlfresaCenter>()           // center source
    public dataSourceBranch = new MatTableDataSource<AlfresaBranch>()
    public selection = new SelectionModel<AlfresaCenter>(false, []);
    public selectionBranch = new SelectionModel<AlfresaBranch>(true, []);
    displayedColumns: string[] = ['id', 'code', 'name', 'email_1', 'email_2', 'admin', 'workers', 'time', 'actions'];
    displayedBranchColumns: string[] = ['id', 'code', 'name', 'email', 'admin', 'time', 'actions'];

    centerForm: FormGroup
    branchForm: FormGroup
    workerBindForm!: FormGroup

    private mobileAdmins: MobileAdmin[] = [];
    private usersByAdminId = new Map<string, MobileUser[]>();
    private userNameMap = new Map<string, string>();
    private userEmailMap = new Map<string, string>();
    private centerBindings = new Map<string, CenterBindingState>();
    private shifts: AlfresaShiftConfig[] = [];
    shiftOptions: { shift_type: number; label: string }[] = [];
    workerUserOptions: { id: string; label: string }[] = [];
    workerBindDialogTitle = 'Bind shift worker';
    workerBindEditMode = false;
    private activeBindCenter?: AlfresaCenter;
    private activeEditScheduleId: string | null = null;
    private pendingSiteNavigation: PendingSiteNavigation | null = null;

    public  editState = false

    searchInputControl = new FormControl();

    public searchValue = new Subject<number>();
    public searchValueSubscriber: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    _pageQuery: PageQuery = {
        page: 0,
        pagesize: 10,
        keyword: '',
        cursor:null,
        total: 0,
        keyChanged: true

    }

    emailInputControl = new FormControl('');
    emailInputControlWhs = new FormControl('');
    maxEmpEmail = 5
    maxWhsEmail = 5

    constructor(
        private _centerService: AlfresaCenterService,
        private _shiftService: AlfresaShiftService,
        private _mobileService: MobileUserService,
        private _serivceShared: SharedService,
        private _snackBar: MatSnackBar,
        private _route: Router,
        private _activatedRoute: ActivatedRoute,
        private _cdr: ChangeDetectorRef,
        public dialog: MatDialog,
        private _formBuilder:FormBuilder,

    ){

    }

    ngOnInit(): void {
        this.workerBindForm = this._formBuilder.group({
            user: ['', Validators.required],
            shift: ['', Validators.required],
            valid_from: [new Date(), Validators.required],
            valid_to: [null],
            status: [true],
        });
        this.loadMobileAdminsAndShifts();
        this.captureSiteNavigationFromRoute(this._activatedRoute.snapshot.queryParamMap);
        this._activatedRoute.queryParamMap.pipe(
            takeUntil(this._unsubscribeAll),
        ).subscribe((params) => {
            this.captureSiteNavigationFromRoute(params);
            if (this.pendingSiteNavigation && this.centers.length > 0) {
                this.applyPendingSiteNavigation();
            }
        });
        this._route.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntil(this._unsubscribeAll),
        ).subscribe((event) => {
            if (event.urlAfterRedirects.includes('/service/alfresa-center')) {
                this.invalidateWorkerCaches();
                if (this.centers.length > 0) {
                    this.loadCenterBindings(this.centers);
                }
            }
        });
        setTimeout(() => {
            this.searchInputControl.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(300),
                switchMap((query) => {
                this._pageQuery.keyword = query.toString().trim();
                this._pageQuery.keyChanged = true;
                this.paginator.pageIndex = 0;
                return this.fetchCenterPage(0, this.paginator.pageSize, this._pageQuery.keyword, true,
                    this._pageQuery.total
                );
                })
            )
            .subscribe({
                next: (response) => this.updateCenterSource(response),
                error: (err) => console.error(err),
            });
        });
    }

    ngAfterViewInit(): void {
        this._pageQuery.pagesize = this.paginator.pageSize;
        this._pageQuery.keyChanged = true
        this.refreshCenters();
        this.updateBranchSource()
        this.LoadCenterNames()
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }


    // read Center in page unit
     fetchCenterPage(pageIndex: number, pageSize: number, keyword: string, keyChanged: boolean, total: number) {
        console.log(`original page query item: ${JSON.stringify(this._pageQuery)}`)
        const query: PageQuery = {
            page: pageIndex + 1,
            pagesize: pageSize,
            keyword: keyword || '',
            keyChanged: keyChanged !== undefined ? keyChanged : true,
            total: total || 0,
        }
        return this._centerService.getCenterPage( query);
    }

     // data sources is updated
    updateCenterSource(response: any): void {
        const res = response as DB_RESULT
        if(res && !res.error_code){
          const pageData = res.object as PageData
          this.centers = pageData.data as AlfresaCenter[]
          this.dataSource.data = this.centers
          this._pageQuery.total = pageData.total
          this._pageQuery.cursor = pageData.cursor
          this._pageQuery.keyChanged = false

          if(this.centers.length > 0){
            if (this.pendingSiteNavigation) {
                this.applyPendingSiteNavigation();
            } else if (!this.centerSelected || !this.centers.some((c) => c.id === this.centerSelected?.id)) {
                this.centerSelected = this.centers[0];
                this.selection.select(this.centerSelected);
            }
          }
        }
        else{
          console.log(`failed to get api response: ${res}`)
          this.dataSource.data = []
          this._pageQuery.total = 0
        }
        this.refreshVisbleBranch()
        this.loadCenterBindings(this.centers)
        this._cdr.detectChanges()
    }

    updateBranchSource(){
        console.log(`Update alfresa branches`)
        this.branches = []
        this._centerService.getBranchs().then((res:DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.branches = res.object as AlfresaBranch[]
                console.log(`Success to load branches: ${this.branches.length}`)
            }else{
                this.warning(res.meta)
            }
            this.refreshVisbleBranch()
            if (this.pendingSiteNavigation) {
                this.applyPendingSiteNavigation();
            }
            this.loadCenterBindings(this.centers)
            this._cdr.detectChanges()
        })
    }

    LoadCenterNames(){
        this.centerNames = []
        this._centerService.getAllCenterNames().then((res: DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.centerNames = res.object as AlfresaCenter[]
            }
            else{
                console.error(`Failed to load center names`)
            }
            this._cdr.detectChanges
        })
    }

    onPageChange(event: any): void {
        // this._pageQuery.pagesize = event.pageSize
        this._pageQuery.cursor = null;
        this.fetchCenterPage(event.pageIndex, event.pageSize,
          this._pageQuery.keyword, this._pageQuery.keyChanged,
          this._pageQuery.total
        ).then((response: any) => {
          this.updateCenterSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    refreshCenters(){
        this.fetchCenterPage(this.paginator.pageIndex, this._pageQuery.pagesize,
        this._pageQuery.keyword, this._pageQuery.keyChanged,
        this._pageQuery.total).then((response: any) => {
            this.updateCenterSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    refreshVisbleBranch(){
        if(!this.centerSelected){
            this.dataSourceBranch.data = []
        }else{
            this.dataSourceBranch.data = this.branches.filter(branch=>branch.center == this.centerSelected.id)
        }
        this._cdr.detectChanges()

    }

    getSelectedCenterName(): string{
        if(!this.centerSelected)
            return ''
        return this.centerSelected.name || ''
    }

    onSingleSelect(row: AlfresaCenter) {
        if (!this.selection.isSelected(row)) {
            this.selection.select(row);
            this.centerSelected = row
            this.refreshVisbleBranch()
            this._cdr.detectChanges()
            console.log(`Change to the selected center: ${this.centerSelected.name}`)
        }
    }

    // initialize for to add/edit center property
    createCenterform() {
       this.centerForm = this._formBuilder.group({
          "id":[''],
          "name": ['', Validators.required],
          "code": ['', Validators.required],
          "email_emp": [[]],
          "email_whs": [[]],
          "parent_exist": [false],
          "code_parent": ['']
        });
        this.emailInputControl.setValue('');
        this.emailInputControlWhs.setValue('')
    }

    patchCenterForm(){
        this.createCenterform()
        this.centerForm.patchValue(this.centerSelected)

        if (this.centerSelected.code_parent && this.centerSelected.code_parent.trim() !== '') {
            this.centerForm.get('parent_exist')?.setValue(true);
        }

        const email_emp = this.centerSelected.email_emp || []
        const email_whs = this.centerSelected.email_whs || []
        this.centerForm.get(`email_emp`).setValue([...email_emp])
        this.centerForm.get(`email_whs`).setValue([...email_whs])
    }

    // initialize form to add/edit branch
    createBranchForm() {
        this.branchForm = this._formBuilder.group({
          "id":[''],
          "name": ['', Validators.required],
          "code": ['', Validators.required],
          "emails": [[]],
          "center": ['']
        });
        this.emailInputControl.setValue('');

        if(this.centerNames.length > 0){
            this.branchForm.get('center')?.setValue(this.centerNames[0].id)
        }
        if(this.centerSelected){
            this.branchForm.get(`center`)?.setValue(this.centerSelected.id)
        }
    }

    patchBranchForm(){
        this.createBranchForm()
        const emails = this.branchSelected.emails || []
        this.branchForm.patchValue(this.branchSelected)
        this.branchForm.get('emails').setValue([...emails])

        if(this.centerSelected){
            this.branchForm.get(`center`)?.setValue(this.centerSelected.id)
        }
    }

    // add employ email to center form
    addEmail() {
        const email = this.emailInputControl.value?.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailList = this.centerForm.value.email_emp as string[]
        console.log(`Add employee email: ${email}`)

        if(!email)
        {
            console.log(`Invalid email`)
            return
        }
        if(!emailRegex.test(email)){
            this.warning(`Invalid email address`)
            return
        }
        if(emailList.includes(email)){
            this.warning(`duplicated eamil address`)
            return
        }
        if(emailList.length >= this.maxEmpEmail){
            console.error(`Maxumum emails area already registered`)
            return
        }
        emailList.push(email);
        this.centerForm.get('email_emp')?.setValue(emailList);
        this.emailInputControl.setValue('');
        this._cdr.detectChanges()
        console.log(`Add email successfully`)

    }

    // check if employ email could be added to center
    employEmailAddable(): boolean{
        const emails = this.centerForm.value.email_emp as string[]
        return (emails.length < this.maxEmpEmail)? true: false
    }

    // remove email from center employ email list
    removeEmail(index: number) {
        var emailList = this.centerForm.value.email_emp as string[]
        emailList.splice(index, 1);
        this.centerForm.get('email_emp')?.setValue(emailList);
        console.log(`remove email, current size: ${emailList.length}`)
        this._cdr.detectChanges()
    }

    // add wharehouse email to center
    addEmailWhs() {
        console.log(`Add email address to warehouse email list`)
        const email = this.emailInputControlWhs.value?.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailList = this.centerForm.value.email_whs as string[]
        if(!email){
            this.warning(`Invalid email address`)
            return
        }
        if(!emailRegex.test(email)){
            this.warning(`Invalid email address`)
            return
        }
        if(emailList.includes(email)){
            this.warning(`Duplicated email address`)
            return
        }
        if(emailList.length >= this.maxWhsEmail){
            this.warning(`Maxumum emails area already registered`)
            return
        }
        emailList.push(email);
        this.centerForm.get('email_whs')?.setValue(emailList);
        this.emailInputControlWhs.setValue('');
        this._cdr.detectChanges()
    }

    // check if new email could be added to warehouse email list of center
    houseEmailAddable(): boolean{
        const emails = this.centerForm.value.email_whs as string[]
        return (emails.length < this.maxWhsEmail)? true: false
    }

    // remove email from warehouse email list of center
    removeEmailWhs(index: number) {
        var emailList = this.centerForm.value.email_whs as string[]
        emailList.splice(index, 1);
        this.centerForm.patchValue({ email_whs: emailList });
    }

    // add employ email to branch email
    addEmailToBranch() {
        console.log(`Add email to branch employ email list`)
        const email = this.emailInputControl.value?.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailList = this.branchForm.value.emails as string[]

        if(!email){
            return
        }
        if(!emailRegex.test(email)){
            this.warning(`Invalid email address`)
            return
        }
        if(emailList.includes(email)){
            this.warning(`duplicated eamil address`)
            return
        }
        if(emailList.length >= this.maxEmpEmail){
            console.error(`Maxumum emails area already registered`)
            return
        }
        emailList.push(email);
        this.branchForm.get('emails')?.setValue(emailList);
        this.emailInputControl.setValue('');
        this._cdr.detectChanges()
        console.log(`Success to add branch employee email`)
    }

    // check if new email could be added to branch email list
    branchEmailAddable(): boolean{
        const emails = this.branchForm.value.emails as string[]
        return (emails.length < this.maxEmpEmail)? true: false
    }

    // remove email from center employ email list
    removeBrachEmail(index: number) {
        var emailList = this.branchForm.value.emails as string[]
        emailList.splice(index, 1);
        this.branchForm.get('emails')?.setValue(emailList);
        this._cdr.detectChanges()
    }



    openDialoag(action: string, item?) {
        switch(action){
            case 'add_center':
                this.createCenterform()
                this.editState = false;
                this.dialog.open(this.AddCenter, { width: '800px', height: '650px',  panelClass: 'custom-modalbox', disableClose: true });
                break;
            case 'edit_center':
                this.editState = true
                this.centerSelected = item
                this.patchCenterForm()
                this.dialog.open(this.AddCenter, { width: '800px', height: '650px',  panelClass: 'custom-modalbox', disableClose: true });
                break
            case 'delete_center':
                const center_id = item.id as string
                console.log(`delete alfresa center: ${center_id}`)
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
                    this.dialogRef.componentInstance.data = {
                        title: "Delete center",
                        message: "Are you sure you want to delete this alfresa center?"
                    }
                    this.dialogRef.afterClosed().subscribe((result) => {
                        if (result) {
                            this._centerService.deleteCenter(center_id).then((res:DB_RESULT)=>{
                                if(res && res.error_code == 0){ // refresh center
                                    // update branch
                                    this.branches = this.branches.filter(b=>b.center != center_id)
                                    this.centerNames = this.centerNames.filter(c=>c.id != center_id)
                                    this.refreshCenters()
                                }
                                else{
                                    this.warning(MSG.OPERATION_FAILED)
                                }
                            })
                        }
                })
                break
            case 'add_branch':
                this.createBranchForm()
                this.editState = false;
                this.dialog.open(this.AddBranch, { width: '800px', height: '650px',  panelClass: 'custom-modalbox', disableClose: true });
                break;
            case 'edit_branch':
                this.editState = true
                this.branchSelected = item
                this.patchBranchForm()
                this.dialog.open(this.AddBranch, { width: '800px', height: '650px',  panelClass: 'custom-modalbox', disableClose: true });
                break
            case 'delete_branch':
                const branch_id = item.id as string
                console.log(`delete alfresa branch: ${branch_id}`)
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
                    this.dialogRef.componentInstance.data = {
                        title: "Delete branch",
                        message: "Are you sure you want to delete this alfresa branch?"
                    }
                    this.dialogRef.afterClosed().subscribe((result) => {
                        if (result) {
                            this._centerService.deleteBranch(branch_id).then((res:DB_RESULT)=>{
                                if(res && res.error_code == 0){ // refresh center
                                    // delete branch
                                    this.branches = this.branches.filter(b=>b.id != branch_id)
                                    // update branch
                                    this.refreshVisbleBranch()
                                }
                                else{
                                    this.warning(MSG.OPERATION_FAILED)
                                }
                            })
                        }
                })

                break

            default:
                break;
        }
    }

    private normalizeEmailList(emails: string[]){
        for (let i = 0; i < emails.length; i++) {
            emails[i] = normalizeString(emails[i]);
        }
    }


    saveCenter(){
        const name = normalizeString(this.centerForm.value.name as string);
        const code = normalizeString(this.centerForm.value.code as string).toUpperCase();
        var email_emp = this.centerForm.value.email_emp as string[]
        var email_whs = this.centerForm.value.email_whs as string[]
        this.normalizeEmailList(email_emp)
        this.normalizeEmailList(email_whs)

        for(let m of email_emp){
            m = normalizeString(m)
        }

        const parent_exits = this.centerForm.value.parent_exist as boolean
        var code_parent = normalizeString(this.centerForm.value.code_parent).toUpperCase()
        if(!name ){
            this.warning('Invalid center name')
            return;
        }
        const codeMin = environment.alfresaCodeMin
        const codeMax = environment.alfresaCodeMax
        if(!isValidAlfCode(code)){
            this.warning(`Code must be ${codeMin} to ${codeMax} characters long and contain only uppercase letters (A–Z) and digits (0–9).`)
            return
        }
        // check email address
        // if(email_emp.length <= 0 && email_whs.length <= 0){
        //     this.warning(`At least one email is required for either the employee or warehouse contractor.`)
        //     return
        // }

        if(!parent_exits){
            code_parent = ''
        }
        else{ // check if parent parent
            if(!isValidAlfCode(code_parent)){
                this.warning(`Code must be ${codeMin} to ${codeMax} characters long and contain only uppercase letters (A–Z) and digits (0–9).`)
                return
            }
        }
        const data: AlfresaCenter = {
            name: name,
            code: code,
            code_parent: code_parent,
            email_emp: email_emp,
            email_whs: email_whs,

        }
        if(!this.editState){ // create new center
            this._centerService.createCenter(data).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    const newCenter = res.object as AlfresaCenter
                    this.centerNames.push(newCenter)
                    this.notify(MSG.OPERATION_SUCCESS)
                    this.refreshCenters()
                    this.close();
                }else{
                    this.warning(this.resolveSaveErrorMessage(res))
                }
            })
        }
        else{ // update center
           
            this._centerService.updateCenter(data, this.centerForm.value.id).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    this.notify(MSG.OPERATION_SUCCESS)
                    const newCenter = res.object as AlfresaCenter
                    // update center in center list
                    Object.assign(this.centerSelected, newCenter)
                    // update center in name list
                    const id = this.centerNames.findIndex(center=>center.id == newCenter.id)
                    if(id >= 0){
                        Object.assign(this.centerNames[id], newCenter)
                    }
                    this._cdr.detectChanges()
                }else{
                    var msg = res.meta || MSG.OPERATION_FAILED[this.lng]
                    if(msg.length > 128)
                        msg = MSG.OPERATION_FAILED[this.lng]
                    this.warning(msg)
                }
                this.close();
            })
        }
    }

    saveBranch(){
        const name = normalizeString(this.branchForm.value.name as string);
        const code = normalizeString(this.branchForm.value.code as string).toUpperCase();
        var emails = this.branchForm.value.emails as string[];
        this.normalizeEmailList(emails)

        var     center = this.branchForm.value.center
        if(!name ){
            this.warning('Invalid branch name')
            return;
        }

        // if(emails.length <= 0){
        //     this.warning('At least one employee email is required')
        //     return
        // }

        const codeMin = environment.alfresaCodeMin
        const codeMax = environment.alfresaCodeMax
        if(!isValidAlfCode(code)){
            this.warning(`Code must be ${codeMin} to ${codeMax} characters long and contain only uppercase letters (A–Z) and digits (0–9).`)
            return
        }

        if(!center){
            this.warning(``)
            return
        }
        const data: AlfresaBranch = {
            name: name,
            code: code,
            center: center,
            emails: emails
        }
        if(!this.editState){ // create new branch
            this._centerService.createBranch(data).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    const newBranch = res.object as AlfresaBranch
                    this.notify(MSG.OPERATION_SUCCESS)
                    this.branches.push(newBranch)
                    this.refreshVisbleBranch()
                    this.close();
                }else{
                    this.warning(this.resolveSaveErrorMessage(res))
                }
            })
        }
        else{ // update center

            this._centerService.updateBranch(data, this.branchForm.value.id).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    this.notify(MSG.OPERATION_SUCCESS)
                    const newBranch = res.object as AlfresaBranch
                    // update center in center list
                    Object.assign(this.branchSelected, newBranch)
                    this._cdr.detectChanges()
                    this.notify(MSG.OPERATION_SUCCESS)
                }else{
                    this.warning(this.resolveSaveErrorMessage(res))
                }
                this.close();
            })
        }
    }


    close() {
        this.editState = false;
        this.dialog.closeAll();
    }

    isAdmin(){
        return isWebAdminPermission(this._serivceShared.getPermission())
    }

    getCenterAdmin(center: AlfresaCenter): MobileAdmin | undefined {
        if (!center?.id) {
            return undefined;
        }
        return this.findMobileAdminForCenter(center.id);
    }

    getCenterWorkers(center: AlfresaCenter): CenterWorkerEntry[] {
        if (!center?.id) {
            return [];
        }
        const workers = [...(this.centerBindings.get(center.id)?.workers ?? [])];
        return workers.sort((a, b) => this.compareWorkerShiftOrder(a, b));
    }

    navigateToMobileUserAdmin(admin: MobileAdmin, event?: Event): void {
        event?.stopPropagation();
        if (!admin?.id) {
            return;
        }
        this._route.navigate(['/mobile/mobile-user-management'], {
            queryParams: { adminId: admin.id },
        });
    }

    navigateToMobileUserWorker(center: AlfresaCenter, worker: CenterWorkerEntry, event?: Event): void {
        event?.stopPropagation();
        const adminId = worker.adminId ?? this.resolveAdminIdForUser(worker.userId);
        if (!adminId) {
            this.warning('Unable to find the mobile admin for this worker');
            return;
        }
        this._route.navigate(['/mobile/mobile-user-management'], {
            queryParams: { adminId, userId: worker.userId },
        });
    }

    private captureSiteNavigationFromRoute(params: { get: (name: string) => string | null }): void {
        const centerId = params.get('centerId');
        if (!centerId) {
            return;
        }
        this.pendingSiteNavigation = {
            centerId,
            branchId: params.get('branchId') ?? undefined,
        };
    }

    private applyPendingSiteNavigation(): void {
        if (!this.pendingSiteNavigation) {
            return;
        }
        const { centerId, branchId } = this.pendingSiteNavigation;
        let center = this.centers.find((c) => c.id === centerId);
        if (!center) {
            const known = this.centerNames.find((c) => c.id === centerId);
            if (known && (known.code || known.name)) {
                this.searchInputControl.setValue(known.code || known.name || '', { emitEvent: true });
                return;
            }
            this.pendingSiteNavigation = null;
            return;
        }

        this.selection.clear();
        this.selection.select(center);
        this.centerSelected = center;
        this.refreshVisbleBranch();

        if (branchId) {
            const branch = this.branches.find((b) => b.id === branchId);
            if (branch) {
                this.selectionBranch.clear();
                this.selectionBranch.select(branch);
                this.branchSelected = branch;
            }
        }

        this.pendingSiteNavigation = null;
        this._cdr.markForCheck();
    }

    private resolveAdminIdForUser(userId: string): string | null {
        for (const [adminId, users] of this.usersByAdminId.entries()) {
            if (users.some((user) => user.id === userId)) {
                return adminId;
            }
        }
        return null;
    }

    getAdminTooltip(admin: MobileAdmin): string {
        const parts = [admin.name];
        if (admin.email) {
            parts.push(admin.email);
        }
        parts.push('Mobile admin');
        return parts.join(' · ');
    }

    getBranchAdmin(branch: AlfresaBranch): MobileAdmin | undefined {
        if (!branch?.id) {
            return undefined;
        }
        return this.findMobileAdminForBranch(branch.id);
    }

    getWorkerShiftClass(worker: CenterWorkerEntry): string {
        if (worker.scheduleState !== 'active') {
            return 'alfresa-worker-chip--inactive';
        }
        if (isAlfShiftNightType(worker.shiftType)) {
            return 'alfresa-worker-chip--night';
        }
        if (worker.shiftType != null) {
            return 'alfresa-worker-chip--day';
        }
        return 'alfresa-worker-chip--unknown';
    }

    getWorkerShiftTooltip(worker: CenterWorkerEntry): string {
        const parts: string[] = [worker.name];
        if (worker.shiftLabel) {
            parts.push(`${worker.shiftLabel} shift`);
        } else {
            parts.push('No shift assigned');
        }
        if (worker.email) {
            parts.push(worker.email);
        }
        if (worker.scheduleState === 'expired') {
            parts.push('Schedule expired');
        } else if (worker.scheduleState === 'inactive') {
            parts.push('Schedule inactive');
        }
        return parts.join(' · ');
    }

    canBindWorker(center: AlfresaCenter): boolean {
        if (!this.isAdmin() || !center?.id) {
            return false;
        }
        if (this.getAdminIdsForCenter(center.id).length === 0) {
            return false;
        }
        return this.countAvailableWorkersForCenter(center.id) > 0;
    }

    promptBindAdmin(center: AlfresaCenter, event?: Event): void {
        event?.stopPropagation();
        if (!this.isAdmin()) {
            return;
        }
        this.openBindAdminPrompt(`Would you like to create a mobile admin for ${center.name}?`);
    }

    promptBindBranchAdmin(branch: AlfresaBranch, event?: Event): void {
        event?.stopPropagation();
        if (!this.isAdmin()) {
            return;
        }
        this.openBindAdminPrompt(`Would you like to create a mobile admin for ${branch.name}?`);
    }

    copyBranchAdminEmail(branch: AlfresaBranch, event?: Event): void {
        event?.stopPropagation();
        this.copyTextToClipboard(this.getBranchAdmin(branch)?.email, 'No email to copy');
    }

    private openBindAdminPrompt(message: string): void {
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, {
            width: '500px',
            panelClass: 'custom-modalbox',
        });
        this.dialogRef.componentInstance.data = {
            title: 'Bind mobile admin',
            message,
        };
        this.dialogRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                this._route.navigate(['/mobile/mobile-user-management']);
            }
        });
    }

    copyAdminEmail(center: AlfresaCenter, event?: Event): void {
        event?.stopPropagation();
        this.copyTextToClipboard(this.getCenterAdmin(center)?.email, 'No email to copy');
    }

    copyWorkerEmail(worker: CenterWorkerEntry, event?: Event): void {
        event?.stopPropagation();
        this.copyTextToClipboard(worker.email, 'No email to copy');
    }

    private copyTextToClipboard(text: string | undefined, emptyMessage: string): void {
        if (!text) {
            this.warning(emptyMessage);
            return;
        }
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.notify('Email copied');
            });
            return;
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.notify('Email copied');
    }

    async openBindWorkerDialog(center: AlfresaCenter, event?: Event): Promise<void> {
        event?.stopPropagation();
        if (!this.isAdmin() || !center.id) {
            return;
        }
        const admin = this.findMobileAdminForCenter(center.id);
        if (!admin?.id && this.getAdminIdsForCenter(center.id).length === 0) {
            this.warning('No mobile admin is bound to this center');
            return;
        }

        const availableUsers = await this.getAvailableWorkersForCenter(center);
        if (availableUsers.length === 0) {
            this.warning('No mobile users registered to this site');
            return;
        }

        if (this.shiftOptions.length === 0) {
            this.warning('No shift presets configured');
            return;
        }

        this.activeBindCenter = center;
        this.workerBindEditMode = false;
        this.activeEditScheduleId = null;
        this.workerBindDialogTitle = 'Bind shift worker';
        this.workerUserOptions = availableUsers;
        this.workerBindForm.reset({
            user: availableUsers[0]?.id ?? '',
            shift: this.shiftOptions[0]?.shift_type ?? ALF_SHIFT_TYPE.CENTER_DAY,
            valid_from: new Date(),
            valid_to: null,
            status: true,
        });
        this.workerBindForm.get('user')?.enable();
        this.openWorkerBindDialog();
    }

    openEditWorkerDialog(center: AlfresaCenter, worker: CenterWorkerEntry, event?: Event): void {
        event?.stopPropagation();
        if (!this.isAdmin() || !center.id) {
            return;
        }
        if (this.shiftOptions.length === 0) {
            this.warning('No shift presets configured');
            return;
        }

        this.activeBindCenter = center;
        this.workerBindEditMode = true;
        this.activeEditScheduleId = worker.scheduleId;
        this.workerBindDialogTitle = 'Edit shift schedule';
        this.workerUserOptions = [{
            id: worker.userId,
            label: worker.email ? `${worker.name} (${worker.email})` : worker.name,
        }];
        this.workerBindForm.reset({
            user: worker.userId,
            shift: worker.shiftType ?? this.shiftOptions[0]?.shift_type ?? ALF_SHIFT_TYPE.CENTER_DAY,
            valid_from: this.parseScheduleDate(worker.validFrom) ?? new Date(),
            valid_to: this.parseScheduleDate(worker.validTo),
            status: worker.active,
        });
        this.workerBindForm.get('user')?.disable();
        this.openWorkerBindDialog();
    }

    private openWorkerBindDialog(): void {
        this.dialogRef = this.dialog.open(this.bindWorkerDialog, {
            width: '560px',
            panelClass: 'custom-modalbox',
            disableClose: true,
            autoFocus: false,
        });
    }

    saveWorkerBind(): void {
        if (!this.activeBindCenter?.id || this.workerBindForm.invalid) {
            this.warning('Please complete all required fields');
            return;
        }
        const raw = this.workerBindForm.getRawValue();
        const rangeError = this.validateWorkerScheduleRange(raw.valid_from, raw.valid_to);
        if (rangeError) {
            this.warning(rangeError);
            return;
        }
        const validFrom = this.toIsoTimestamp(raw.valid_from);
        if (!validFrom) {
            this.warning('Invalid valid from date');
            return;
        }
        const payload: AlfresaShiftWorkerBind = {
            user: raw.user,
            site_type: ALFLOC.CENTER,
            site_id: this.activeBindCenter.id,
            shift_type: Number(raw.shift),
            valid_from: validFrom,
            valid_to: this.toIsoTimestamp(raw.valid_to),
            status: raw.status ? ALF_SHIFT_STATUS.ACTIVE : ALF_SHIFT_STATUS.INACTIVE,
        };
        const request = this.workerBindEditMode && this.activeEditScheduleId
            ? this._shiftService.updateShiftWorker(this.activeEditScheduleId, payload)
            : this._shiftService.bindShiftWorker(payload);

        request.then((res: DB_RESULT) => {
            if (res && res.error_code === 0) {
                this.notify(MSG.OPERATION_SUCCESS);
                const centerId = this.activeBindCenter!.id!;
                this.closeWorkerBindDialog();
                this.invalidateWorkerCaches();
                this.loadBindingForCenter(centerId).then(() => this._cdr.markForCheck());
            } else {
                this.warning(res?.meta || MSG.OPERATION_FAILED[this.lng]);
            }
        });
    }

    closeWorkerBindDialog(): void {
        this.activeBindCenter = undefined;
        this.workerBindEditMode = false;
        this.activeEditScheduleId = null;
        this.workerBindForm.get('user')?.enable();
        this.dialog.closeAll();
    }

    confirmUnbindWorker(center: AlfresaCenter, worker: CenterWorkerEntry, event?: Event): void {
        event?.stopPropagation();
        if (!this.isAdmin()) {
            return;
        }
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, {
            width: '500px',
            panelClass: 'custom-modalbox',
        });
        this.dialogRef.componentInstance.data = {
            title: 'Remove worker',
            message: `Remove ${worker.name} from ${center.name}?`,
        };
        this.dialogRef.afterClosed().subscribe((confirmed: boolean) => {
            if (!confirmed) {
                return;
            }
            this._shiftService.unbindShiftWorker(worker.scheduleId).then((res: DB_RESULT) => {
                if (res && res.error_code === 0) {
                    this.notify(MSG.OPERATION_SUCCESS);
                    if (center.id) {
                        this.invalidateWorkerCaches();
                        this.loadBindingForCenter(center.id).then(() => this._cdr.markForCheck());
                    }
                } else {
                    this.warning(res?.meta || MSG.OPERATION_FAILED[this.lng]);
                }
            });
        });
    }

    private loadMobileAdminsAndShifts(): void {
        Promise.all([
            this._mobileService.getSubUsersOfSelf(),
            this._shiftService.getAllShifts(),
        ]).then(([adminRes, shiftRes]) => {
            this.mobileAdmins = this.readArray<MobileAdmin>(adminRes);
            this.mobileAdmins.forEach((admin) => {
                if (admin.id) {
                    this.userNameMap.set(admin.id, admin.name);
                }
            });
            this.shifts = this.readArray<AlfresaShiftConfig>(shiftRes);
            this.shiftOptions = this.shifts
                .filter((s) => isAlfShiftCenterType(s.shift_type))
                .map((s) => ({
                    shift_type: s.shift_type,
                    label: `${s.name} (${getAlfShiftTypeLabel(s.shift_type)})`,
                }));
            this._cdr.markForCheck();
        }).catch((err) => console.error('Failed to load mobile admins or shifts', err));
    }

    private loadCenterBindings(centers: AlfresaCenter[]): void {
        const ids = centers.map((c) => c.id).filter((id): id is string => !!id);
        this._mobileService.getSubUsersOfSelf().then((adminRes) => {
            this.mobileAdmins = this.readArray<MobileAdmin>(adminRes);
            this.mobileAdmins.forEach((admin) => {
                if (admin.id) {
                    this.userNameMap.set(admin.id, admin.name);
                }
            });
            this.invalidateWorkerCaches();
            const allAdminIds = this.mobileAdmins
                .map((admin) => admin.id)
                .filter((id): id is string => !!id);
            const preloadAdmins = allAdminIds.length > 0
                ? Promise.all(allAdminIds.map((adminId) => this.ensureSubUsersLoaded(adminId, true)))
                : Promise.resolve();
            preloadAdmins.then(() =>
                Promise.all(ids.map((id) => this.loadBindingForCenter(id)))
            ).then(() => {
                this._cdr.markForCheck();
            });
        });
    }

    private loadBindingForCenter(centerId: string): Promise<void> {
        const adminIds = this.getAdminIdsForCenter(centerId);
        const loadUsers = adminIds.length > 0
            ? Promise.all(adminIds.map((adminId) => this.ensureSubUsersLoaded(adminId, true)))
            : Promise.resolve();

        return loadUsers.then(() =>
            this._shiftService.queryShiftTable({
                site_type: ALFLOC.CENTER,
                site_id: centerId,
            }).then((res: DB_RESULT) => {
                if (res && res.error_code === 0) {
                    const table = res.object as AlfresaShiftTableResult;
                    const workers = table.users.map((row) => ({
                        scheduleId: row.id,
                        userId: row.user,
                        adminId: this.resolveAdminIdForUser(row.user),
                        name: this.resolveUserName(row.user),
                        email: this.resolveUserEmail(row.user),
                        shiftType: row.shift_type,
                        shiftLabel: this.resolveShiftLabel(row.shift_type),
                        active: row.status,
                        validFrom: row.valid_from ?? null,
                        validTo: row.valid_to ?? null,
                        scheduleState: this.resolveWorkerScheduleState(row),
                    }));
                    this.centerBindings.set(centerId, { workers });
                }
            })
        );
    }

    private countAvailableWorkersForCenter(centerId: string): number {
        const adminIds = this.getAdminIdsForCenter(centerId);
        if (adminIds.length === 0) {
            return 0;
        }
        const boundIds = new Set(
            (this.centerBindings.get(centerId)?.workers ?? []).map((worker) => worker.userId),
        );
        const seen = new Set<string>();
        let count = 0;
        for (const adminId of adminIds) {
            for (const user of this.usersByAdminId.get(adminId) ?? []) {
                if (!user.id || boundIds.has(user.id) || seen.has(user.id)) {
                    continue;
                }
                seen.add(user.id);
                count++;
            }
        }
        return count;
    }

    private invalidateWorkerCaches(): void {
        this.usersByAdminId.clear();
    }

    private ensureSubUsersLoaded(adminId: string, force = false): Promise<void> {
        if (!force && this.usersByAdminId.has(adminId)) {
            return Promise.resolve();
        }
        return this._mobileService.getSubUsers(adminId).then((res: DB_RESULT) => {
            const users = (res && res.error_code === 0 && Array.isArray(res.object))
                ? res.object as MobileUser[]
                : [];
            this.usersByAdminId.set(adminId, users);
            users.forEach((u) => {
                if (u.id) {
                    this.userNameMap.set(u.id, u.name);
                    if (u.email) {
                        this.userEmailMap.set(u.id, u.email);
                    }
                }
            });
        });
    }

    private getAdminIdsForCenter(centerId: string): string[] {
        const branchIds = new Set(
            this.branches
                .filter((branch) => branch.center === centerId && !!branch.id)
                .map((branch) => branch.id as string)
        );
        const ids = new Set<string>();
        for (const admin of this.mobileAdmins) {
            if (!admin.id) {
                continue;
            }
            if (
                admin.center === centerId
                || (admin.site_type === ALFLOC.CENTER && admin.site === centerId)
            ) {
                ids.add(admin.id);
            } else if (
                (admin.branch && branchIds.has(admin.branch))
                || (admin.site_type === ALFLOC.BRANCH && admin.site && branchIds.has(admin.site))
            ) {
                ids.add(admin.id);
            }
        }
        return [...ids];
    }

    private resolveWorkerScheduleState(row: AlfresaShiftTableWorkerRow): CenterWorkerEntry['scheduleState'] {
        if (!row.status) {
            return 'inactive';
        }
        if (row.valid_to) {
            const validTo = new Date(row.valid_to);
            if (!Number.isNaN(validTo.getTime()) && validTo.getTime() < Date.now()) {
                return 'expired';
            }
        }
        return 'active';
    }

    private compareWorkerShiftOrder(a: CenterWorkerEntry, b: CenterWorkerEntry): number {
        const stateOrder = (worker: CenterWorkerEntry): number =>
            worker.scheduleState === 'active' ? 0 : 1;
        const byState = stateOrder(a) - stateOrder(b);
        if (byState !== 0) {
            return byState;
        }
        const order = (shiftType: number | null): number => shiftType ?? 99;
        const byShift = order(a.shiftType) - order(b.shiftType);
        if (byShift !== 0) {
            return byShift;
        }
        return a.name.localeCompare(b.name);
    }

    private findMobileAdminForCenter(centerId: string): MobileAdmin | undefined {
        return this.mobileAdmins.find((admin) =>
            admin.center === centerId
            || (admin.site_type === ALFLOC.CENTER && admin.site === centerId)
        );
    }

    private findMobileAdminForBranch(branchId: string): MobileAdmin | undefined {
        return this.mobileAdmins.find((admin) =>
            admin.branch === branchId
            || (admin.site_type === ALFLOC.BRANCH && admin.site === branchId)
        );
    }

    private resolveShiftLabel(shiftType: number | null): string {
        if (shiftType == null) {
            return '';
        }
        const shift = this.shifts.find((s) => s.shift_type === shiftType);
        if (shift) {
            return `${shift.name} (${getAlfShiftTypeLabel(shiftType)})`;
        }
        return getAlfShiftTypeLabel(shiftType);
    }

    private async getAvailableWorkersForCenter(center: AlfresaCenter): Promise<{ id: string; label: string }[]> {
        if (!center.id) {
            return [];
        }
        const adminIds = this.getAdminIdsForCenter(center.id);
        if (adminIds.length === 0) {
            return [];
        }
        await Promise.all(adminIds.map((adminId) => this.ensureSubUsersLoaded(adminId, true)));
        const boundIds = new Set((this.centerBindings.get(center.id)?.workers ?? []).map((w) => w.userId));
        const seen = new Set<string>();
        const options: { id: string; label: string }[] = [];
        for (const adminId of adminIds) {
            for (const user of this.usersByAdminId.get(adminId) ?? []) {
                if (!user.id || boundIds.has(user.id) || seen.has(user.id)) {
                    continue;
                }
                seen.add(user.id);
                options.push({ id: user.id, label: `${user.name} (${user.email})` });
            }
        }
        return options;
    }

    private resolveUserName(userId: string): string {
        return this.userNameMap.get(userId) ?? userId;
    }

    private resolveUserEmail(userId: string): string {
        return this.userEmailMap.get(userId) ?? '';
    }

    private parseScheduleDate(value: string | null | undefined): Date | null {
        if (!value) {
            return null;
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    private validateWorkerScheduleRange(validFrom: Date | string | null, validTo: Date | string | null): string | null {
        if (!validTo) {
            return null;
        }
        const from = validFrom instanceof Date ? validFrom : new Date(validFrom as string);
        const to = validTo instanceof Date ? validTo : new Date(validTo as string);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            return 'Invalid schedule date range';
        }
        if (from.getTime() >= to.getTime()) {
            return 'Valid to must be after valid from';
        }
        return null;
    }

    private toIsoTimestamp(value: Date | string | null | undefined): string | null {
        if (!value) {
            return null;
        }
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date.toISOString();
    }

    private readArray<T>(res: unknown): T[] {
        const db = res as DB_RESULT;
        if (db && db.error_code === 0 && Array.isArray(db.object)) {
            return db.object as T[];
        }
        return [];
    }



    private resolveSaveErrorMessage(res: DB_RESULT | null | undefined): string {
        let msg = res?.meta || MSG.OPERATION_FAILED[this.lng];
        if (typeof msg !== 'string' || msg.length > 128) {
            msg = MSG.OPERATION_FAILED[this.lng];
        }
        return msg;
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

    private notifyDialog(message: string, closeDialog = true){
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
        this.dialogRef.componentInstance.data = {
            title: "Notification",
            message: message
        }
        this.dialogRef.afterClosed().subscribe((result) => {
            if(closeDialog)
                this.close()
        })
    }



}
