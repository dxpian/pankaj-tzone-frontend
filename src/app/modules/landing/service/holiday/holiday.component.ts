import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { HolidayConfig, PERMISSION } from '../../utils/typedef';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ServiceCenter } from '../service.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { SelectionModel } from '@angular/cdk/collections';
import { SharedService } from 'app/services/shared.service';

@Component({
  selector: 'app-holiday',
  templateUrl: './holiday.component.html',
  styleUrls: ['./holiday.component.scss']
})
export class HolidayComponent {
    @ViewChild(`add`) addDlg   : any

    public selection = new SelectionModel<any>(true, []);

    displayedColumns: string[] = ['id', 'holiday', 'description', 'created',  'operate'];
    public dataSource = new MatTableDataSource<HolidayConfig>()
    tableData: HolidayConfig[] = [];
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
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    holidayForm: FormGroup
    userInfo: any;
    senderEmail = ''
    currentTime: Date;
    editState: boolean = false;
    selectedItem: any;
    permission = PERMISSION.NORMAL


    constructor(private _serviceCenter: ServiceCenter,
        public dialog: MatDialog,
        private _formBuilder: FormBuilder,
        private _snackBar: MatSnackBar,
        private _serviceShared: SharedService,
        private _cdr: ChangeDetectorRef
    ) {
        this.permission = this._serviceShared.getPermission()

    }

    ngOnInit(): void {
        this.currentTime = new Date();
        this.resetEmailPushForm();
        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
        this.getHolidayConig();
        // Subscribe to search input field value changes
        this.searchInputControl.valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {
            query = query.trim()
            if (query !== '') {
                let filterData = this.tableData.filter(x => (x.description || '').toLowerCase().includes(query.toLowerCase()) || x.description.toString().includes(query));
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

    resetEmailPushForm() {
        this.holidayForm = this._formBuilder.group({
            "id": [''],
            "holiday": ['', Validators.required ],
            "description": ['']
        });
    }

    getHolidayConig() {
        this.tableData = [];
        this.dataSource = new MatTableDataSource<HolidayConfig>();
        this.totalRecords = 0
        this._serviceCenter.getHolidayConfigurations().then((res: any) => {
            console.log(res);
            if (res && res.error_code== 0) {
                this.showData = true
                this.tableData = res?.object;
                this.totalRecords = res?.object?.length
                // this.cdr.detectChanges();
                if (res?.object?.length) {
                    this.isNoRecord = false;
                    this.dataSource.data = res?.object;
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                    console.log(`currne data = ${this.tableData.length}`)
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


    openDialog(item?: any) {
        this.resetEmailPushForm()
        if(item)
        {
            const holidayDate = new Date(item.holiday);
            this.holidayForm.patchValue({
                ...item,
                holiday: holidayDate
              });
            this.editState = true;
        }
        this.dialogRef = this.dialog.open(this.addDlg, { width: '600px',  panelClass: 'custom-modalbox', disableClose: true });
    }

    deleteHoliday(value) {
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
        this.dialogRef.componentInstance.data = {
        title: "Delete Email Config?",
        message: "Are you sure you want to remove this holiday configuration?"
        }
        this.dialogRef.afterClosed().subscribe((result) => {
        if (result) {
            this.confirmHolidayConfig(value)
        }
        })
    }


    saveHolidayConfig() {
        console.log(`save holiday configurations`)
        if (this.holidayForm.valid) {
            if (!this.editState) {
                console.log(`Create new holiday`)
                this._serviceCenter.createHolidayConfiguraiton(this.holidayForm.value).then((res:any) => {
                if(res && !res.error_code) {
                    this._snackBar.open('Successfully created holiday configuration', '', snackBarConfig);
                    this.getHolidayConig();
                    this.closeDialog();
                } else {
                    this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
                    }
                })
            } else {
                console.log(`update an existing holiday: ${JSON.stringify(this.holidayForm.value)}`)
                this._serviceCenter.editHolidayConfiguration(this.holidayForm.value, this.holidayForm.value.id).then((res: any) => {
                if (res && !res.error_code) {
                    this._snackBar.open('Updated Successfully', '', snackBarConfig);
                    this.getHolidayConig();
                    this.closeDialog();
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

    confirmHolidayConfig(item) {
        console.log(`delete holiday. id: ${JSON.stringify(item)}`)
        this._serviceCenter.deleteHolidayConfiguration(item?.id).then((res: any) => {
            if (res && res.error_code == 0) {
                this._snackBar.open('Deleted Successfully', '', snackBarConfig);
                this.getHolidayConig()
                this.closeDialog()
            }
            this._cdr.detectChanges()

        })
    }

    removeTime(date: string): string{
        return date.substring(0, 11)
    }


    closeDialog() {
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

    hasAdminPermission(): boolean{
        return (this.permission == PERMISSION.ADMIN || this.permission == PERMISSION.DEVELOPER)? true: false
    }

}
