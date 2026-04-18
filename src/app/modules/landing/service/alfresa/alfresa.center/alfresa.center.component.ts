import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SharedService } from 'app/services/shared.service';
import { AlfresaCenterService } from '../service.center';
import { AlfresaBranch, AlfresaCenter } from '../alfresa.type';
import { DB_RESULT, PageData, PageQuery, PERMISSION } from 'app/modules/landing/utils/typedef';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { Language } from '../../message-push-service/email/email.component';
import { MSG } from 'app/modules/landing/utils/message.def';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { isValidAlfCode, isValidEmail, normalizeString, normalizeWhitespace } from '../alfresa.util';
import { environment } from 'app/enviroment/enviroment';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';



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

    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    public dialogRef: any;

    public dataSource = new MatTableDataSource<AlfresaCenter>()           // center source
    public dataSourceBranch = new MatTableDataSource<AlfresaBranch>()
    public selection = new SelectionModel<AlfresaCenter>(false, []);
    public selectionBranch = new SelectionModel<AlfresaBranch>(true, []);
    displayedColumns: string[] = ['id', 'code', 'name', 'email_1', 'email_2', 'time', 'actions'];
    displayedBranchColumns: string[] = ['id', 'code', 'name', 'email', 'time', 'actions'];

    centerForm: FormGroup
    branchForm: FormGroup

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
        private _serivceShared: SharedService,
        private _snackBar: MatSnackBar,
        private _route: Router,
        private _cdr: ChangeDetectorRef,
        public dialog: MatDialog,
        private _formBuilder:FormBuilder,

    ){

    }

    ngOnInit(): void {
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
            this.centerSelected = this.centers[0]
            this.selection.select(this.centerSelected)
          }
        }
        else{
          console.log(`failed to get api response: ${res}`)
          this.dataSource.data = []
          this._pageQuery.total = 0
        }
        this.refreshVisbleBranch()
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
                }else{
                    const message = (res.meta.length < 256 )? res.meta: MSG.OPERATION_FAILED[this.lng]
                    this.notifyDialog(message, false)
                }
                this.close();
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
        if(!this.editState){ // create new center
            this._centerService.createBranch(data).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    const newBranch = res.object as AlfresaBranch
                    this.notify(MSG.OPERATION_SUCCESS)
                    this.branches.push(newBranch)
                    this.refreshVisbleBranch()
                }else{
                    const message = (res.meta.length < 256 )? res.meta: MSG.OPERATION_FAILED[this.lng]
                    this.notifyDialog(message, false)
                }
                this.close();
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
                    const message = (res.meta.length < 256 )? res.meta: MSG.OPERATION_FAILED[this.lng]
                    this.notifyDialog(message, false)
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
        return this._serivceShared.getPermission() == PERMISSION.ADMIN
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
