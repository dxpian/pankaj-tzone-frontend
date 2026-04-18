import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SocketService } from 'app/services/socket.service';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from 'ngx-intl-tel-input';
import { Subscription, Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { AccountService } from '../account.service';
import { DB_RESULT, PageData, PageRangeQuery } from '../../utils/typedef';

@Component({
  selector: 'app-operation-log',
  templateUrl: './operation-log.component.html',
  styleUrls: ['./operation-log.component.scss']
})
export class OperationLogComponent implements OnInit {
  phoneNumber = ''
  messages: any[] = [];
  separateDialCode = true;
	SearchCountryField = SearchCountryField;
	CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
    public selection = new SelectionModel<any>(true, []);
  displayedColumns: string[] = ['id', 'type',  'content', 'time'];
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
  currentTime2: Date;
  editState: boolean = false;

  _pageQuery: PageRangeQuery = {
      page: 0,
      pagesize: 20,
      keyword: '',
      total: 0,
      from: '',
      to: ''
    }



  constructor(private _accountService: AccountService, public dialog: MatDialog,
    private _formBuilder:FormBuilder,
    private _snackBar: MatSnackBar,
    private _route:Router,
    private _cdr:ChangeDetectorRef
     ) {

  }

  ngOnInit(): void {
    this.currentTime2 = new Date();
    this.currentTime = new Date(this.currentTime2.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    this._pageQuery.from = this.currentTime.toISOString()
    this._pageQuery.to = this.currentTime2.toISOString()
    // this.getOperationLog();
     // Subscribe to search input field value changes
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
            this._pageQuery.keyword = query
            this.paginator.pageIndex = 0;
            return this.fetchPage(0, this.paginator.pageSize, this._pageQuery.keyword)
        })
      )
      .subscribe({
        next: (response) => {
            this.updateDataSource(response); // Handle the API response
        },
        error: (err: HttpErrorResponse) => {console.error(err); // Handle errors
        }
      });
    }

    ngAfterViewInit(): void {
        this._pageQuery.pagesize = this.paginator.pageSize;
        this.getOperationLog();
    }



    fetchPage(pageIndex: number, pageSize: number, keyword: string,) {
        this._pageQuery.page = pageIndex + 1
        this._pageQuery.pagesize = pageSize
        this._pageQuery.keyword = keyword
        return this._accountService.OperationLogRange(this._pageQuery);
    }

    // data sources is updated
    updateDataSource(response: any): void {
        const res = response as DB_RESULT
        if(res && !res.error_code){
            const pageData = res.object as PageData
            this.dataSource.data = pageData.data
            this._pageQuery.total = pageData.total
        }
        else{
            this.dataSource.data = []
            this._pageQuery.total = 0
        }
        this._cdr.detectChanges()
    }

    onPageChange(event: any): void {
        this._pageQuery.pagesize = event.pageSize
        this.fetchPage(event.pageIndex, event.pageSize, this._pageQuery.keyword)
            .then((response: any) => {
            this.updateDataSource(response);})
            .catch((err: HttpErrorResponse) => (console.log));
    }

    getOperationLog() {
        this._pageQuery.from =this.currentTime.toISOString()
        this._pageQuery.to = this.currentTime2.toISOString()

        this.fetchPage(this.paginator.pageIndex, this._pageQuery.pagesize,this._pageQuery.keyword).then((response: any) => {
            this.updateDataSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
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
