import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn, validateAllFormFields, validator } from 'app/constants/globalFunctions';
import { SocketService } from 'app/services/socket.service';
import { Subscription, Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { AccountService } from '../account.service';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from 'ngx-intl-tel-input';
import { Account, GroupConfig, USER_ROLE } from '../account.typedef';
import { Language } from '../../service/message-push-service/email/email.component';
import { isValidEmail } from '../../service/alfresa/alfresa.util';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})

export class UserManagementComponent implements OnInit {
    phoneNumber = ''
    messages: any[] = [];
    separateDialCode = true;
        SearchCountryField = SearchCountryField;
        CountryISO = CountryISO;
    PhoneNumberFormat = PhoneNumberFormat;
    originalSelectedCountry: string = '';
    showModifiedValue: boolean = false;
    private messageSubscription: Subscription;
    @ViewChild('subaccount') childSubAccount: any;
    public selection = new SelectionModel<any>(true, []);

    displayedColumns: string[] = ['id', 'name',  'role', 'email', 'available_groups', 'time', 'Actions'];
    public dataSource = new MatTableDataSource<Account>()
    tableData = [];
    private accounts: Account[] = []
    private accountSelected: Account = undefined


    displayedGroupColumns: string[] = ['select', 'name',  'description'];
    private groups : GroupConfig[] = []
    public dataSourceGroup = new MatTableDataSource<GroupConfig>()
    public groupSelector = new SelectionModel<GroupConfig>(true, [])



    USER_ROLE = USER_ROLE

    totalRecords: number;
    showData = false;
    lng = Language.ENG

    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    public dialogRef: any;
    searchkeyword = ''
    searchInputControl = new FormControl();
    public search: any = {
        "pageNumber": 1,
        "displayCount": 5,
        name: undefined,
        statusType: 0
    };
    isSearch: boolean;
    isNoRecord: boolean = false;
    templates: any = [];
    searchVal = ''
    public searchValue = new Subject<number>();
    public searchValueSubscriber: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    accountForm: FormGroup
    userInfo: any;
    currentTime: Date;
    editState: boolean = false;


    constructor(private _accountService: AccountService, public dialog: MatDialog,
        private _formBuilder:FormBuilder,
        private _snackBar: MatSnackBar,
        private _route:Router,
        private _cdr:ChangeDetectorRef,
        private _cdrEmail: ChangeDetectorRef,

        ) {

    }

    ngOnInit(): void {
        this.currentTime = new Date();
        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))

        // read all sub user account information
        this.getUsersAccount();

        // read all group list
        this.getGroupConfigs()

        // Subscribe to search input field value changes
        this.searchInputControl.valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {
            if (query !== '') {
                let filterData = this.tableData.filter(x => x.name.toLowerCase().includes(query.toLowerCase()) || x.serial.toString().includes(query));
                this.dataSource.data = filterData
                return this.dataSource.data
            } else {
                this.dataSource.data = this.tableData
                return this.dataSource.data;
            }
            })
        )
        .subscribe();
        this.createUserRoleReviceForm();

    }

    createUserRoleReviceForm() {
        this.accountForm = this._formBuilder.group({
            "id":[''],
            "name": ['Subuser'],
            "phone": [''],
            "updatePwd": false,
            "password": ['',[Validators.required]],
            'confirmpassword':['',[Validators.required]],
            "email": ['',],
            "role": USER_ROLE.SUB,
            "groups":[]
        });
    }

    getUsersAccount() {
        this.accounts = []
        this._accountService.getAllUserAccounts().then((res: any) => {
            if (res && res.error_code == 0) {
                this.showData = true
                this.tableData = res?.object;
                this.totalRecords = res?.object?.length
                // this.cdr.detectChanges();
                this.isNoRecord = false;
                this.accounts = res.object as Account[]
                this.dataSource = new MatTableDataSource<any>();
                this.dataSource.data = this.accounts
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
                this._cdr.detectChanges()
            } else {
                // this.snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Optimus. Please contact your admin'}`, '', snackBarConfigWarn);
                this.isNoRecord = true;
                this.isSearch = true;
            }
        }).catch((err: HttpErrorResponse) => (console.log))
    }

    getGroupConfigs(){
        this.groups = []
        this._accountService.getGroupConfigs().then((res: any)=>{
            if(res && res.error_code == 0){
                this.groups = res.object as GroupConfig[]
                this.dataSourceGroup.data = res?.object;
                this.dataSourceGroup.paginator = this.paginator;
                this.dataSourceGroup.sort = this.sort;
            }
            else{
                console.error(`Failed to load group information: ${res.meta}`)
            }
        })
    }

    groupSelectionToggle() {
        this._cdrEmail.detectChanges()
        this.isAllGroupSelected() ?
        this.groupSelector.clear() :
        this.dataSourceGroup.data.forEach((row) => {
            if (row) {
                this.groupSelector.select(row)
            } else {
                this.groupSelector.deselect(row);
                this._cdrEmail.detectChanges();
            }
        });
    }

    isAllGroupSelected(){
        const numSelected = this.groupSelector.selected.length;
        return numSelected;
    }

    isEditMode(): boolean{
        return this.editState
    }

    showPasswordField(): boolean{
        if(!this.editState) // creating mode
            return true;
        // edit mode
        return (this.accountForm.get('updatePwd').value)?true: false
    }

    getUserRole(role): string {
        var roleName = 'Unknown'
        switch(role){
            case USER_ROLE.STD:
                roleName = 'Standard'
                break
            case USER_ROLE.SUB:
                roleName = 'Sub account'
                break
            case USER_ROLE.SUB_QUERY:
                roleName = 'Sub account with query only'
                break
        }
        return roleName
    }

    getGroupName(group_id): string{
        const group = this.groups.find(g=>g.id == group_id)
        return group?.groupname || '';
    }

    formatPhoneNumberWithDialCode(phone: any): string {
        const formattedNumber = `${phone?.dialCode}-${phone?.number.replace(/\D/g, '')}`;
        return formattedNumber;
    }

    private patchAccount(){
        this.accountForm.patchValue(this.accountSelected)

        // check/uncheck emails
        const groups: string[] = this.accountSelected.groups || []
        this.dataSourceGroup.data.forEach((row)=>{
            if(groups.includes(row.id)){
                this.groupSelector.select(row)
            }
            else{
                this.groupSelector.deselect(row)
            }
        })

    }

    openDialog(action, data?){
        switch(action){
            case 'add_user':
                this.accountSelected = undefined
                this.editState = false
                this.dialog.open(this.childSubAccount, { width: '720px', height:'720px', panelClass: 'custom-modalbox', disableClose: true });
                break

            case 'edit_user':
                this.editState = true
                this.accountSelected = data
                this.patchAccount()
                this.dialog.open(this.childSubAccount, { width: '720px', height:'720px', panelClass: 'custom-modalbox', disableClose: true });
                break

            case 'delete_user':
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
                this.dialogRef.componentInstance.data = {
                    title: "Delete User?",
                    message: "Are you sure you want to delete this User?"
                }
                this.dialogRef.afterClosed().subscribe((result) => {
                    if (!result)
                        return
                    this._accountService.deleteReviseRole(data.id).then((res:any) => {
                        if(res && !res.error_code) {
                            this._snackBar.open('User Deleted Successfully', '', snackBarConfig);
                            this.accounts = this.accounts.filter(account=>account.id != data.id)
                            this.dataSource.data = [...this.accounts]
                            this.cancel()
                        }
                    })
                })
                break
            default:
                break
        }

    }

    viewReviseRoles(item) {
        this._route.navigate([`device/${item.id}`]);
    }

    // CreateSubAccount
    saveReviseRoles() {
        const name = this.accountForm.value.name.trim()
        if(name.length < 4 && name.length > 18){
            return this.warning(`Invalid user name`)
        }

        // check password
        var pwd = ''
        var pwdCnf = ''
        const updatePwd = this.accountForm.get('updatePwd').value
        if(!this.isEditMode() || updatePwd){ // check password validity
            pwd = this.accountForm.value.password.trim()
            pwdCnf = this.accountForm.value.confirmpassword.trim()
            if(pwd != pwdCnf){
                return this.warning(`Password is unmatched`)
            }
            if(pwd.length < 6){
                return this.warning('Password must be at least 6 characters long.')
            }
        }

        // check email address
        const email = this.accountForm.value.email.trim()
        if(!isValidEmail(email)){
            return this.warning(`Invalid email address`)
        }

        // check role
        const role = this.accountForm.value.role
        if(role != USER_ROLE.SUB && role != USER_ROLE.SUB_QUERY){
            return this.warning(`Invalid user role`)
        }

        const selectedGroups: string[] = this.groupSelector.selected.map(item=>item.id);
        if(selectedGroups.length <= 0){
            return this.warning(`At least one group must be enabled for the subuser.`)
        }

        const data =  {
            name: name,
            email: email,
            password: pwd,
            role: role,
            groups: selectedGroups,
        }

        if(!this.editState) {
            // this.reviseRoleForm.value.phone = this.formatPhoneNumberWithDialCode(this.reviseRoleForm.value.phone)
            this._accountService.createSubAccount(data).then((res:any) => {
                if(res && !res.error_code) {
                    this.notify('Sub account is created successfully');
                    const newAcc = res.object as Account
                    this.accounts.push(newAcc)
                    this.dataSource.data = [...this.accounts]
                    this.cancel();
                } else {
                    const message = (res.meta.length <=128)? res.meta: 'Operation failed'
                    this.notifyDialog(message, false)
                }
            })
        }
        else {
            // this.reviseRoleForm.value.phone = this.formatPhoneNumberWithDialCode(this.reviseRoleForm.value.phone)
            this._accountService.editSubaccount(data, this.accountSelected.id).then((res:any) => {
                if(res && !res.error_code) {
                    this.notify('Sub account is created successfully');
                    const account = res.object as Account
                    Object.assign(this.accountSelected, account)
                    this.cancel();
                } else {
                    const message = (res.meta.length <=128)? res.meta: 'Operation failed'
                    this.notifyDialog(message, false)
                }
            })
        }
    }

    cancel() {
        this.editState = false;
        this.dialog.closeAll();
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

    getDialogName(){
        return (this.editState)? "Edit Sub Account": "Create Sub Account"
    }

    private notifyDialog(message: string, closeDialog = true){
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
        this.dialogRef.componentInstance.data = {
            title: "Notification",
            message: message
        }
        this.dialogRef.afterClosed().subscribe((result) => {
            if(closeDialog)
                this.cancel()
        })
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

