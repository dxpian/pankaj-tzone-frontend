import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { validator, snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { ServiceCenter } from '../../service.service';

@Component({
  selector: 'app-sms',
  templateUrl: './sms.component.html',
  styleUrls: ['./sms.component.scss']
}) 
export class SmsComponent implements OnInit {
  @ViewChild('testSms') testSms: any;
  @ViewChild('addSmsPush') smsPush: any;
  public selection = new SelectionModel<any>(true, []);
  displayedColumns: string[] = ['id', 'service', 'body','time', 'operate'];
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
  smsForm: FormGroup
  sendSmsForm: FormGroup
  userInfo: any;
  senderEmail = ''
  currentTime: Date;
  editState: boolean = false;
  selectedItem: any;
  constructor(private _serviceCenter: ServiceCenter,
    public dialog: MatDialog,
    private _formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private _cdr: ChangeDetectorRef
  ) {

  }

  ngOnInit(): void {
    this.currentTime = new Date();
    this.createSmsForm();
    this.createTestSmsForm()
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    this.getSms();
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


  createSmsForm() {
    this.smsForm = this._formBuilder.group({
      "id": [''],
      "service": [''],
      "body": [''],
     
    });
  }
  createTestSmsForm() {
    this.sendSmsForm = this._formBuilder.group({
      "recipient": [''],
      "content": ['']
    });
  }

  getSms() {
    this._serviceCenter.getSmsConfigurations().then((res: any) => {
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

  SmsPush() {
    if (!this.editState) {
      this.smsForm.value.id = '';
      this.smsForm.value.service = '';
      this.smsForm.value.body = ''; 
      this.smsForm.controls['id'].setValue('')
      this.smsForm.controls['service'].setValue('')
      this.smsForm.controls['body'].setValue('') 
      this._cdr.detectChanges()
      const dialogRef = this.dialog.open(this.smsPush, { width: '600px', height: '600px', panelClass: 'custom-modalbox', disableClose: true });
      this._cdr.detectChanges()
    } else {
      const dialogRef = this.dialog.open(this.smsPush, { width: '600px', height: '600px', panelClass: 'custom-modalbox', disableClose: true });

    }

  }
  openSendSmsDialog(item) {
    this.selectedItem = item.id;
     const dialogRef = this.dialog.open(this.testSms, { width: '600px', height: '500px', panelClass: 'custom-modalbox', disableClose: true });

  }

  sendTestSms() {
    if (this.sendSmsForm.valid) {
      this._serviceCenter.sendTestSms(this.sendSmsForm.value, this.selectedItem).then((res: any) => {
        if (res && !res.error_code) {
          this._snackBar.open('Sms Send Successfully', '', snackBarConfig);
          this.sendSmsForm.reset()
          this.cancel();

        }
      })
    }
  }
  // CreateSubAccount 
  saveSmsPush() {
    if (this.smsForm.valid) {
      if (!this.editState) {
        this._serviceCenter.createsmspush(this.smsForm.value).then((res:any) => {
          if(res && !res.error_code) {
            this._snackBar.open('text Message Added Successfully', '', snackBarConfig);
            this.getSms();
            this.cancel();
           } else {
            this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
            }
        })
      } else {
        this._serviceCenter.editSmsPush(this.smsForm.value, this.smsForm.value.id).then((res: any) => {
          if (res && !res.error_code) {
            this._snackBar.open('Updated Successfully', '', snackBarConfig);
            this.getSms();
            this.cancel();
          } else {
            this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
          }
        })
      }

    } else {
      return
    }

  }
  deleteSmsPush(value) {
    this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
    this.dialogRef.componentInstance.data = {
      title: "Delete Text Message?",
      message: "Are you sure you want to delete this sms ?"
    }
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ConfirmdeleteSmsPush(value)
      }
    })
  }
  editSmsPush(item) {
    this.smsForm.patchValue(item);
    this.editState = true;
    this.SmsPush();
    // let editDeviceData = this.tableData.filter(x => x.id == item.id);
    // if(editDeviceData) {
    //   this.smsForm.patchValue(editDeviceData[0]);
    //   this.addEmailPush();
    // }

  }
  ConfirmdeleteSmsPush(item) {
    this._serviceCenter.deleteSmsPush(item?.id).then((res: any) => {
      if (res && !res.error_code) {
        this._snackBar.open('Deleted Successfully', '', snackBarConfig);
        this.getSms();
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
}
