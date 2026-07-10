import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SocketService } from 'app/services/socket.service';
import { Subscription, Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { messageCenterInformationService } from '../message-center-service';

@Component({
  selector: 'app-notification-message',
  templateUrl: './notification-message.component.html',
  styleUrls: ['./notification-message.component.scss']
}) 
export class NotificationMessageComponent implements OnInit {
  messages: any[] = [];
  private messageSubscription: Subscription;
  public selection = new SelectionModel<any>(true, []);
  displayedColumns: string[] = ['id', 'device', 'message', 'time',];
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
  searchForm: FormGroup
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
  constructor(private _messageService: messageCenterInformationService, public dialog: MatDialog,
    private _formBuilder:FormBuilder,
    private _snackBar: MatSnackBar,
    private _route:Router,
    
    private _cdr:ChangeDetectorRef
     ) {

  }
 
  ngOnInit(): void {
    this.currentTime2 = new Date(); // current date and time
    this.currentTime = new Date(this.currentTime2.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    this.getNotification();
    this.createSearchForm();
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
   createSearchForm() {
    this.searchForm = this._formBuilder.group({
      startTime: [''],
      endTime: [''],
      keyWord: ['']
    })
   }
   
  getAllQueries() {

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
 
  getNotification() { 
    this._messageService.getNotificationMessage().then((res: any) => {
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

        // this.dialogRef.close();
      } else {
        // this.snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Optimus. Please contact your admin'}`, '', snackBarConfigWarn);
        this.isNoRecord = true;
        this.isSearch = true;
      }
    }).catch((err: HttpErrorResponse) => (console.log))

  }

 
  
  
  cancel() {
    this.editState = false;
    this.dialog.closeAll();
  }
}