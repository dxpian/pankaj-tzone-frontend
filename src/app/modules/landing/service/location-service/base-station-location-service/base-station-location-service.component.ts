import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { ServiceCenter } from '../../service.service';

@Component({
  selector: 'app-base-station-location-service',
  templateUrl: './base-station-location-service.component.html',
  styleUrls: ['./base-station-location-service.component.scss']
}) 
export class BaseStationLocationServiceComponent implements OnInit {
   @ViewChild('addLocationPush') addLocationPush: any;
  public selection = new SelectionModel<any>(true, []);
  displayedColumns: string[] = ['id', 'service', 'appid','time', 'operate'];
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
  locationForm: FormGroup
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
    this.createLocationForm();
     this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    this.getLocation();
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


  createLocationForm() {
    this.locationForm = this._formBuilder.group({
      "id": [''],
      "service": [''],
      "appid": [''],
      "appsecrete": [''],
     
    });
  }
 

  getLocation() {
    this._serviceCenter.getLocationConfigurations().then((res: any) => {
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

  LocationPush() {
    if (!this.editState) {
      this.locationForm.value.id = '';
      this.locationForm.value.service = '';
      this.locationForm.value.appid = ''; 
      this.locationForm.value.appsecrete = ''; 
      this.locationForm.controls['id'].setValue('')
      this.locationForm.controls['service'].setValue('')
      this.locationForm.controls['appid'].setValue('')
      this.locationForm.controls['appsecrete'].setValue('') 
      this._cdr.detectChanges()
      const dialogRef = this.dialog.open(this.addLocationPush, { width: '650px', height: '650px', panelClass: 'custom-modalbox', disableClose: true });
      this._cdr.detectChanges()
    } else {
      const dialogRef = this.dialog.open(this.addLocationPush, { width: '650px', height: '650px', panelClass: 'custom-modalbox', disableClose: true });

    }

  }
 

 
  // CreateSubAccount 
  saveLocationPush() {
    if (this.locationForm.valid) {
      if (!this.editState) {
        this._serviceCenter.createLocationpush(this.locationForm.value).then((res:any) => {
          if(res && !res.error_code) {
            this._snackBar.open('Location Added Successfully', '', snackBarConfig);
            this.getLocation();
            this.cancel();
           } else {
            this._snackBar.open(`${res.meta}`, '', snackBarConfigWarn)
            }
        })
      } else {
        this._serviceCenter.editLocationPush(this.locationForm.value, this.locationForm.value.id).then((res: any) => {
          if (res && !res.error_code) {
            this._snackBar.open('Updated Successfully', '', snackBarConfig);
            this.getLocation();
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
  deleteLocation(value) {
    this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
    this.dialogRef.componentInstance.data = {
      title: "Delete Location",
      message: "Are you sure you want to delete this Location Service Center? "
    }
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ConfirmdeleteLocationPush(value)
      }
    })
  }
  editLocationPush(item) {
    this.locationForm.patchValue(item);
    this.editState = true;
    this.LocationPush();
    // let editDeviceData = this.tableData.filter(x => x.id == item.id);
    // if(editDeviceData) {
    //   this.smsForm.patchValue(editDeviceData[0]);
    //   this.addEmailPush();
    // }

  }
  ConfirmdeleteLocationPush(item) {
    this._serviceCenter.deleteLocationPush(item?.id).then((res: any) => {
      if (res && !res.error_code) {
        this._snackBar.open('Deleted Successfully', '', snackBarConfig);
        this.getLocation();
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