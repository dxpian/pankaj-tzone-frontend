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
import { validator, snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { AccountService } from 'app/modules/landing/account/account.service';
import { SocketService } from 'app/services/socket.service';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from 'ngx-intl-tel-input';
import { Subscription, Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { ServiceCenter } from '../../service.service';
import { EmailConfig } from 'app/modules/landing/utils/typedef';


export enum Language{
    ENG = 0,
    JPN =  1
 }

@Component({
  selector: 'app-email',
  templateUrl: './email.component.html',
  styleUrls: ['./email.component.scss']
})
export class EmailComponent implements OnInit {
    //@ViewChild('testEmail') testEmail: any;
    @ViewChild('addEmailPush') emailPush: any;
    public selection = new SelectionModel<any>(true, []);
    //displayedColumns: string[] = ['id', 'email', 'server', 'port', 'created', 'operate'];
    displayedColumns: string[] = ['id', 'email', 'description', 'created',  'language', 'operate'];
    public dataSource = new MatTableDataSource<EmailConfig>()
    tableData: EmailConfig[] = [];
    totalRecords: number;
    showData = false;
    emails: EmailConfig[] = []
    emailSelected: EmailConfig

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
    EmailPushForm: FormGroup
    sendEmailForm: FormGroup
    userInfo: any;
    senderEmail = ''
    currentTime: Date;
    editState: boolean = false;
    selectedItem: any;
    Language=Language
    lng = Language.ENG

    constructor(private _serviceCenter: ServiceCenter,
        public dialog: MatDialog,
        private _formBuilder: FormBuilder,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef
    ) {

    }

    ngOnInit(): void {
        this.currentTime = new Date();
        this.createEmailPushForm();
        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
        this.getMsg();
        // Subscribe to search input field value changes
        this.searchInputControl.valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {
            query = query.trim()
            if (query !== '') {
                let filterData = this.tableData.filter(x => x.email.toLowerCase().includes(query.toLowerCase()) || x.description.toString().includes(query));
                this.dataSource.data = filterData
                return this.dataSource.data
            } else {
                this.dataSource.data = this.tableData
                return this.dataSource.data;
            }
            })
        )
        .subscribe();
    }

    createEmailPushForm() {
        this.EmailPushForm = this._formBuilder.group({
        "id": [''],
        "email": ['', Validators.pattern(validator.emailPattern)],
        "description": [''],
        "language": [Language.ENG]
        });
    }

    getMsg() {
        this._serviceCenter.getMsgConfigurations().then((res: any) => {
        console.log(res);
        if (res && !res.error_code) {
                this.showData = true
                this.tableData = res?.object;
                this.totalRecords = res?.object?.length
                // this.cdr.detectChanges();
                if (res?.object?.length) {
                this.isNoRecord = false;
                this.dataSource = new MatTableDataSource<any>();
                this.dataSource.data = res?.object;
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
            }
            else {
                this.isNoRecord = true;
                this.isSearch = true;
            }
            this.dialogRef.close();
        } else {
            // this.snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Optimus. Please contact your admin'}`, '', snackBarConfigWarn);
            this.isNoRecord = true;
            this.isSearch = true;
        }
        }).catch((err: HttpErrorResponse) => (console.log))
    }

    EmailPush() {
        if (!this.editState) {
            this.EmailPushForm.value.id = '';
            this.EmailPushForm.value.description = '';
            this.EmailPushForm.value.email = '';
            this.EmailPushForm.controls['id'].setValue('')
            this.EmailPushForm.controls['description'].setValue('')
            this.EmailPushForm.controls['email'].setValue('')
            this.EmailPushForm.controls['language'].setValue(Language.ENG)
            this._cdr.detectChanges()
            const dialogRef = this.dialog.open(this.emailPush, { width: '600px', height: '500px', panelClass: 'custom-modalbox', disableClose: true });
            this._cdr.detectChanges()
        }
        else {
        const dialogRef = this.dialog.open(this.emailPush, { width: '600px', height: '500px', panelClass: 'custom-modalbox', disableClose: true });
        }
    }

    // CreateSubAccount
    saveEmailPush() {
        if (this.EmailPushForm.valid) {
            if (!this.editState) {
                this._serviceCenter.createmessagepush(this.EmailPushForm.value).then((res:any) => {
                if(res && !res.error_code) {
                    this._snackBar.open('Message Added Successfully', '', snackBarConfig);
                    this.getMsg();
                    this.cancel();
                } else {
                    this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
                    }
                })
            } else {
                this._serviceCenter.editEmailPush(this.EmailPushForm.value, this.EmailPushForm.value.id).then((res: any) => {
                if (res && !res.error_code) {
                    this._snackBar.open('Updated Successfully', '', snackBarConfig);
                    this.getMsg();
                    this.cancel();
                } else {
                    this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
                }
                })
            }
        } else {
            this._snackBar.open(`Invalid parameters`, '', snackBarConfigWarn)
            return
        }
    }

    getLanguageLable(lngCode: number): String{
        if(lngCode == Language.ENG)
            return 'English'
        return '日本語'
    }

    deleteEmailPush(value) {
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
        this.dialogRef.componentInstance.data = {
        title: "Delete Email Config?",
        message: "Are you sure you want to delete this email account ?"
        }
        this.dialogRef.afterClosed().subscribe((result) => {
        if (result) {
            this.ConfirmdeleteEmailPush(value)
        }
        })
    }




    editEmailPush(item) {
        this.EmailPushForm.patchValue(item);
        this.editState = true;
        this.EmailPush();
        // let editDeviceData = this.tableData.filter(x => x.id == item.id);
        // if(editDeviceData) {
        //   this.EmailPushForm.patchValue(editDeviceData[0]);
        //   this.addEmailPush();
        // }
    }

    ConfirmdeleteEmailPush(item) {
        this._serviceCenter.deleteEmailPush(item?.id).then((res: any) => {
        if (res && !res.error_code) {
            this._snackBar.open('Deleted Successfully', '', snackBarConfig);
            this.getMsg();
            this.cancel()
        }
        })
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
