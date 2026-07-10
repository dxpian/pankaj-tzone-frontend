import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, debounceTime, switchMap, takeUntil } from 'rxjs';
 import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { snackBarConfig, snackBarConfigWarn, validator } from 'app/constants/globalFunctions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';
import { SocketService } from 'app/services/socket.service';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { DB_RESULT, Device, PageData, PageQuery } from '../../utils/typedef';
import { GroupConfig } from '../../account/account.typedef';
import { Language } from '../../service/message-push-service/email/email.component';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})

export class ReportsComponent implements OnInit, AfterViewInit {

    @ViewChild('addDevice') AddDevice: any;
    public selection = new SelectionModel<any>(true, []);
    displayedColumns: string[] = ['id', 'name', 'serial', 'model', 'groups', 'time', 'cond', 'Actions'];
    public dataSource = new MatTableDataSource<any>()
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
    pageSize = 10
    keyword = ''
    isSearch: boolean;
    isNoRecord: boolean = false;
    templates: any = [];
    searchVal = ''
    public searchValue = new Subject<number>();
    public searchValueSubscriber: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    deviceForm: FormGroup
    userInfo: any;
    currentTime: Date;
    editState: boolean = false;
    groups: GroupConfig[] = []
    lng = Language.ENG

    constructor(private _deviceManagementService: DeviceManagementService, public dialog: MatDialog,
        private _formBuilder:FormBuilder,
        private _snackBar: MatSnackBar,
        private _route:Router
        ) {

    }

    ngOnInit(): void {
        this.currentTime = new Date();
        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
        this.loadGroup()
        // this.establishedSocketConnection()
        // Subscribe to search input field value changes
        this.searchInputControl.valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {
                this.keyword = query
                this.paginator.pageIndex = 0;
                return this.fetchPage(0, this.paginator.pageSize, this.keyword)
            })
        )
        .subscribe({
            next: (response) => {
                this.updateDataSource(response); // Handle the API response
            },
            error: (err: HttpErrorResponse) => {
                console.error(err); // Handle errors
            }
        });
    }

    ngAfterViewInit(): void {
        this.pageSize = this.paginator.pageSize;
        this.getDevices(this.userInfo?.id);
    }

    ngOnDestroy(): void {

    }

    onPageChange(event: any): void {
        this.pageSize = event.pageSize
        this.fetchPage(event.pageIndex, event.pageSize, this.keyword).then((response: any) => {
        this.updateDataSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    fetchPage(pageIndex: number, pageSize: number, keyword: string) {
        const pageQuery: PageQuery = {
            page: pageIndex + 1, // Backend expects 1-based index
            pagesize: pageSize,
            keyword: keyword,
            total: 0,
            keyChanged: true,
        };
        return this._deviceManagementService.getUserDeviceWithPage(this.userInfo.id, pageQuery);
    }

    // data sources is updated
    updateDataSource(response: any): void {
        const res = response as DB_RESULT
        if(res && !res.error_code){
            const pageData = res.object as PageData
            this.dataSource.data = pageData.data as Device[]
            this.totalRecords = pageData.total
        }
        else{
            // console.log(`failed to get api response: ${res}`)
            this.dataSource.data = []
            this.totalRecords = 0
        }
        this.dialogRef.close();
    }

    getDevices(id){
        this.fetchPage(this.paginator.pageIndex, this.pageSize, this.keyword).then((response: any) => {
            this.updateDataSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }


    // load all group name information
    loadGroup(){
        this._deviceManagementService.getDeviceGroups().then((res: DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.groups = res.object as GroupConfig[]
            }
            else{
                console.log(`Failed to load group information`)
            }
        })
    }



    getGroupName(grpId): string {
        if(!grpId)
            return 'Default'
        const grp = this.groups.find(g=>g.id == grpId)
        return (grp)? grp.groupname: "Default"
    }


    viewDevice(item) {
        this._route.navigate([`device/${item.id}`]);
    }



    reportingView(data) {
        localStorage.setItem('deviceId', JSON.stringify(data.id));
        window.open(`${window.origin}/reports/reports-view/${data.serial}`, '_blank')
    }

    cancel() {
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
