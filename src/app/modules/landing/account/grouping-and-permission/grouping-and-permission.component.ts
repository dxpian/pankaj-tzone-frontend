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
import { Subscription, Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { messageCenterInformationService } from '../../message-center/message-center-service';
import { AccountService } from '../account.service';
import { snackBarConfig, snackBarConfigWarn, validateAllFormFields } from 'app/constants/globalFunctions';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { GroupConfig } from '../account.typedef';
import { Language } from '../../service/message-push-service/email/email.component';
import { MSG } from '../../utils/message.def';

@Component({
  selector: 'app-grouping-and-permission',
  templateUrl: './grouping-and-permission.component.html',
  styleUrls: ['./grouping-and-permission.component.scss']
})
export class GroupingAndPermissionComponent implements OnInit {
    @ViewChild('grpForm') grpForm: any;
    @ViewChild('permissionBox') permissionBox: any;

    messages: any[] = [];
    private messageSubscription: Subscription;
    public selection = new SelectionModel<any>(true, []);
    displayedColumns: string[] = ['id', 'groupname', 'sort', 'remark', 'operate'];
    public dataSource = new MatTableDataSource<GroupConfig>()
    private groups: GroupConfig[] = []
    private groupSelected: GroupConfig

    tableData = [];
    totalRecords: number;
    showData = false;
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
    userInfo: any;
    currentTime: Date;
    currentTime2: Date;
    editState: boolean = false;
    searchForm: FormGroup
    groupForm: FormGroup
    users = [];
    selectedItems: any;

    private lng = Language.ENG

    constructor(private _accountService: AccountService, public dialog: MatDialog,
        private _formBuilder:FormBuilder,
        private _snackBar: MatSnackBar,
        private _route:Router,
        private _cdr:ChangeDetectorRef,
        private _deviceManagementService:DeviceManagementService
        ) {

    }

    ngOnInit(): void {
        this.currentTime = new Date();
        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
        this.getAllGroup();
        this.createSearchForm();
        this.createGroupForm();
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
        ).subscribe();
    }

    createSearchForm() {
        this.searchForm = this._formBuilder.group({
            startTime: [''],
            endTime: [''],
            keyWord: ['']
        })
    }

    createGroupForm() {
        this.groupForm = this._formBuilder.group({
        groupname: ['', Validators.required],
        id: [''],
        remark: [''],
        sort: [1],
        superior: ['Default']
        })
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


    getAllGroup() {
        this._accountService.getGroupConfigs().then((res: any) => {
            console.log(res);
            if (res && !res.error_code) {
                this.showData = true
                this.tableData = res?.object;
                this.totalRecords = res?.object?.length
                // this.cdr.detectChanges();
                if (res?.object?.length) {
                    this.isNoRecord = false;
                    this.groups = res.object as GroupConfig[]
                    this.dataSource = new MatTableDataSource<GroupConfig>();
                    this.dataSource.data = this.groups;
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                } else {
                    this.isNoRecord = true;
                    this.isSearch = true;
                }
                this._cdr.detectChanges()
            } else {
                this.isNoRecord = true;
                this.isSearch = true;
            }
        }).catch((err: HttpErrorResponse) => (console.log))
    }


    setPermissions(item) {
        this.selectedItems = item.id
        this._accountService.getAssignedUsers(item.id).then((res:any) => {
        if(res && !res.error_code ) {
            this.users = res.object
            const dialogRef = this.dialog.open(this.permissionBox, { width: '650px', height:'375px', panelClass: 'custom-modalbox', disableClose: true });

        }
        })
    }

    saveGroupsPermissions() {
        console.log('user', this.users)
        let object = {
        selected:this.users}
        this._accountService.saveGroupsPermission(object, this.selectedItems).then((res:any) => {
            if(res && !res.error_code) {
                this.notify('Permissions Added Successfully');
                // const newGroup = res.object as GroupConfig
                // this.groups.push(newGroup)
                // this.dataSource.data = [...this.groups]
                this.cancel();
            }else {
                this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
            }
        })
    }

    onCheckboxChange(value,i) {
        this.users[i].selected = value
    }

    saveGroups() {
        if(this.groupForm.valid) {
        if(!this.editState) {
            this._accountService.createGroup(this.groupForm.value).then((res:any) => {
                if(res && !res.error_code) {
                    this.notify('Group Added Successfully');
                    const newGroup = res.object as GroupConfig
                    this.groups.push(newGroup)
                    this.dataSource.data = [...this.groups]
                    this.cancel();
                    this._cdr.detectChanges()
                } else {
                    this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
                }
            })
        }
        else {
            this._accountService.editGroup(this.groupForm.value, this.groupForm.value.id).then((res:any) => {
                if(res && !res.error_code) {
                    this.notify('Group Updated Successfully');
                    const acc = res.object as GroupConfig
                    Object.assign(this.groupSelected, acc)
                    this.cancel();
                    this._cdr.detectChanges()
                } else {
                    this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
                    }
                })
            }
        } else  {
            validateAllFormFields(this.groupForm)
            this.groupForm.markAsDirty();
            return
        }
    }


    private resetGroupForm(){
        this.groupForm.value.groupname = '';
        this.groupForm.value.sort = '';
        this.groupForm.value.remark = '';
        this.groupForm.controls['groupname'].setValue('')
        this.groupForm.controls['sort'].setValue(1)
        this.groupForm.controls['superior'].setValue('Default')
        this.groupForm.controls['remark'].setValue('')
        this._cdr.detectChanges()
    }

    openDialog(action: string, data?){

        switch(action){
            case 'add_group':
                this.resetGroupForm()
                this.groupSelected = undefined
                this.editState = false
                this.dialog.open(this.grpForm, { width: '600px', height:'540px', panelClass: 'custom-modalbox', disableClose: true });
                break;

            case 'edit_group':
                this.resetGroupForm()
                this.groupForm.patchValue(data);
                this.groupSelected = data
                this.editState = true;
                this.dialog.open(this.grpForm, { width: '600px', height:'540px', panelClass: 'custom-modalbox', disableClose: true });
                break;

            case 'delete_group':
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
                this.dialogRef.componentInstance.data = {
                    title: "Delete Group?",
                    message: "Are you sure you want to delete this Group?"
                }
                this.dialogRef.afterClosed().subscribe((result) => {
                    if (!result) { // cancelled
                        return
                    }
                    this._accountService.deleteGroupPermission(data.id).then((res:any) => {
                        if(res && !res.error_code) {
                            this.notify('Group Permission Deleted Successfully');
                            // refresh group model
                            this.groups = this.groups.filter(group=>group.id != data.id)
                            this.dataSource.data = [...this.groups]
                            this._cdr.detectChanges()
                        }
                        else{
                            this.warning(MSG.OPERATION_FAILED)
                        }
                        this.cancel()
                    })
                })
                break;

            default:
                break;
        }
    }

    getGroupDlgName(): string{
        if(this.editState)
            return 'Edit group'
        else
            return 'Create group'

    }

    cancel() {
        this.editState = false;
        this.dialog.closeAll();
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

