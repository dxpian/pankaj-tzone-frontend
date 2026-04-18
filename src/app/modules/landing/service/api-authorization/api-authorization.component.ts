import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SocketService } from 'app/services/socket.service';
import { Subscription, Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { messageCenterInformationService } from '../../message-center/message-center-service';
import { ServiceCenter } from '../service.service';
import { snackBarConfig, snackBarConfigWarn, validator } from 'app/constants/globalFunctions';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-api-authorization',
  templateUrl: './api-authorization.component.html',
  styleUrls: ['./api-authorization.component.scss']
})
export class ApiAuthorizationComponent implements OnInit {
  messages: any[] = [];
  @ViewChild('editAuthourization') reviseComment: any;
  private messageSubscription: Subscription;
  public selection = new SelectionModel<any>(true, []);
  displayedColumns: string[] = ['no','id', 'key', 'comment', 'created','operate'];
  public dataSource = new MatTableDataSource<any>()
  tableData = [];
  totalRecords: number;
  showData = false;
  apiAuthorizeForm: FormGroup
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
  constructor(private _ServiceCenter: ServiceCenter, public dialog: MatDialog,
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
    this.getApiKey();
    this.createApiAuthorizeForm();
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

  createApiAuthorizeForm() {
    this.apiAuthorizeForm =  this._formBuilder.group({
      key: [],
      id:[],
      comment:['', [Validators.required]],
      expired:[],
      created:[]
    })
  }
  onclick() {
    this._snackBar.open('Copied', '', snackBarConfig);
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
  addKey() {
    this._ServiceCenter.addKey().then((res: any) => {
      console.log(res);
      if (res && !res.error_code) {
       this._snackBar.open(`Key Added Successfully!`, '', snackBarConfig);
        this.getApiKey();
        // this.dialogRef.close();
      } else {
        this._snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Optimus. Please contact your admin'}`, '', snackBarConfigWarn);
        this.isNoRecord = true;
        this.isSearch = true;
      }
    }).catch((err: HttpErrorResponse) => (console.log))

  }

  getApiKey() {
    this._ServiceCenter.getApiKey().then((res: any) => {
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
          this.tableData = [];
          this.dataSource.data = res?.object;
          this.totalRecords = 0
          this.isNoRecord = true;
          this.isSearch = true;
        }

        // this.dialogRef.close();
      } else {
        this.tableData = [];
        this.totalRecords = 0
        // this.snackBar.open(`${(res.meta != '') ? res.meta : 'It appears that accounting software has lost connection with Optimus. Please contact your admin'}`, '', snackBarConfigWarn);
        this.isNoRecord = true;
        this.isSearch = true;
      }
    }).catch((err: HttpErrorResponse) => (console.log))

  }

 editkey(item) {
  this.apiAuthorizeForm.patchValue(item);
  const dialogRef = this.dialog.open(this.reviseComment, { width: '600px', panelClass: 'custom-modalbox', disableClose: true });

 }
 saveEditKey() {
    if(this.apiAuthorizeForm.valid) {
      let object = {
        comment: this.apiAuthorizeForm.value.comment
      }
      this._ServiceCenter.editKey(object, this.apiAuthorizeForm.value.id).then((res:any) => {
        if(res && !res.error_code) {
          this._snackBar.open(`Key Updated Successfully!`, '', snackBarConfig);
          this.dialog.closeAll();
          this.apiAuthorizeForm.reset();
          this.getApiKey();
        }
      })
    }
 }
 deletekey(id:any) {
  this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
  this.dialogRef.componentInstance.data = {
    title: "Delete Key?",
    message: "Are you sure you want to delete this key?"
  }
  this.dialogRef.afterClosed().subscribe((result) => {
    if (result) {
      this.confirmDeleteKey(id)
    }
  })
 }
 confirmDeleteKey(id) {
    this._ServiceCenter.deleteKey(id).then((res:any) => {
      if(res && !res.error_code) {
        this._snackBar.open(`Key Deleted Successfully!`, '', snackBarConfig);
        this.getApiKey();
      }
    })
 }


  cancel() {
    this.editState = false;
    this.apiAuthorizeForm.reset();
    this.dialog.closeAll();
  }
}
