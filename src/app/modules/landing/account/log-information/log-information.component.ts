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
import { SocketService } from 'app/services/socket.service';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from 'ngx-intl-tel-input';
import { Subscription, Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { AccountService } from '../account.service';

@Component({
  selector: 'app-log-information',
  templateUrl: './log-information.component.html',
  styleUrls: ['./log-information.component.scss']
})
export class LogInformationComponent implements OnInit {
  phoneNumber = ''
  messages: any[] = [];
  separateDialCode = true;
	SearchCountryField = SearchCountryField;
	CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  private messageSubscription: Subscription;
  @ViewChild('addReviseUserRoles') addReviseRoles: any;
  public selection = new SelectionModel<any>(true, []);
  displayedColumns: string[] = ['id', 'system',  'browser', 'loginsystem', 'time'];
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
  isSearch: boolean;
  isNoRecord: boolean = false;
  templates: any = [];
  searchVal = ''
  public searchValue = new Subject<number>();
  public searchValueSubscriber: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  reviseRoleForm: FormGroup
  userInfo: any;
  currentTime: Date;
  editState: boolean = false;
  constructor(private _accountService: AccountService, public dialog: MatDialog,
    private _formBuilder:FormBuilder,
    private _snackBar: MatSnackBar,
    private _route:Router,
    // private WebsocketService: SocketService,
    private _cdr:ChangeDetectorRef
     ) {

  }

  ngOnInit(): void {
    this.currentTime = new Date();
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    this.getLogInformation(this.userInfo?.id);
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
    }




  getLogInformation(id) {
    this._accountService.getLogInformation().then((res: any) => {
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
        } else {
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
}
