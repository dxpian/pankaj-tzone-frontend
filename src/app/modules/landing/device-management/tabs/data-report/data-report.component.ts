import { DialogRef } from '@angular/cdk/dialog';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { DeviceManagementService } from '../../device-management.service';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
 import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
 import { saveAs } from 'file-saver';
import { LoadingOverlayService } from '../overlay/loading-overlay.service';

const PRINT_STATUS = {
    PENDING: 1,     // pending
    PROG: 2,        // progressing
    COMPLETED: 3,   // completed
    ERROR: 4,       // error
}
interface ReportDoc{
    id: string,
    start: string,
    end:  string,
    file: string,
    time: string,
}

interface PrintJob {
  id: string;           // print task ID
  status: number;       // PRINT status
  progress: number;     // 0 - 100
  error?: string;       // error string
}



@Component({
  selector: 'app-data-report',
  templateUrl: './data-report.component.html',
  styleUrls: ['./data-report.component.scss']
})
export class DataReportComponent implements OnInit {
  searchInputControl = new FormControl();
  @ViewChild('addNewFile') addFile: any;
  FileForm: FormGroup;
  endDate: any;
  startDate: any;
  @Input() deviceId
  @Input() deviceSerial

  // table things
  public selection = new SelectionModel<ReportDoc>(true, []);
  displayedColumns: string[] = ['select', 'id', 'start', 'end', 'time', 'file', 'Actions'];
  public dataSource = new MatTableDataSource<ReportDoc>()
  tableData = [];
  totalRecords: number;
  showData = false;

  displayedColumnsLogger: string[] = ['index', 'serialNumber', 'actions'];
  dataSourceLogger = new MatTableDataSource<{ serialNumber: string }>();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  public dialogRef: any;
  searchkeyword = ''

  isSearch: boolean;
  isNoRecord: boolean = false;
  templates: any = [];
  searchVal = ''
  public searchValue = new Subject<number>();
  public searchValueSubscriber: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  files: any;

  constructor(private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private _formBuilder: FormBuilder,
    private _deviceManagementService: DeviceManagementService,
    private overlayService: LoadingOverlayService) {

  }
  ngOnInit(): void {
    this.endDate = new Date(); // current date and time
    this.startDate = new Date(this.endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days

    this.getReports()
    this.resetFormdata()
  }
  cancel() {
    this.FileForm.reset();
    this.dialog.closeAll();
  }


  resetFormdata(){
    // file Form
    this.FileForm = this._formBuilder.group({
      "name": [this.getReportfileName(), Validators.required],
      "from": [this.startDate, Validators.required],
      "to": [this.endDate, Validators.required],
      "addMultiple": false,
    });
    this.dataSourceLogger.data = []
  }

  ngOnChanges(){
    if(!this.deviceId){ // device id
        this.clearData()
    }
    else{
        this.getReports()
    }
}

  private getReportfileName(): string{
    const datePipe = new DatePipe('en-US');
    const formatted = datePipe.transform(this.startDate, 'yyyy-MM-dd HH_mm_ss');
    return `No.${this.deviceSerial}.${formatted}`
  }

  // select file to load multiple data
   onLoggerFileSelected(event: any) {
    // clear data source
    const file: File = event.target.files[0];
    if (file) {// file selected
        this.dataSourceLogger.data = [{serialNumber: this.deviceSerial}];
        const reader = new FileReader();

        reader.onload = (e: any) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

            const seen = new Set<string>();
            const newRows: { serialNumber: string }[] = [];

            for (const line of lines) {
                const parts = line.split(/[,\s]+/).filter(p => p.trim() !== '');
                if (parts.length >= 1) {
                    for(let part of parts){
                        // ✅ Check length, digits, and duplication
                        const sn = part.trim();
                        if (/^\d{15}$/.test(sn) && !seen.has(sn)) {
                            seen.add(sn); // Track seen serial numbers
                            newRows.push({ serialNumber: sn });
                            break
                        }
                    }
                }
            }
            console.log('Parsed serials:', newRows);
            this.dataSourceLogger.data = newRows;
        };
        reader.readAsText(file);
    }
  }

  deleteLoggerRow(index: number) {
    const data = this.dataSourceLogger.data;
    data.splice(index, 1);
    this.dataSourceLogger.data = [...data];
  }


  /////////////////////////////////////////
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
     if (this.isAllSelected()) {
        this.selection.clear();   // unselect all
    } else {
        this.selection.select(...this.dataSource.data); // select all
    }
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: ReportDoc): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
  }

  // check if print task will be done by asyn. do it if it will take more than 30 seconds to avoid timeout error
  private shouldPrintAsnyc(serials: string[], from: Date, to: Date): Boolean{
    const nSerials = serials.length
    const diffTime = Math.abs(from.getTime() - to.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if(nSerials > 10)
        return true
    if(diffDays >= 30 && nSerials > 5)
        return true
    return false;
  }

   //////////////////////////////////////////
  saveFile() {
    if (this.FileForm.valid) {
        const datePipe = new DatePipe('en-US');

        var from = this.FileForm.value.from as Date
        var to = this.FileForm.value.to as Date
        from = this.changeTime(from, 0,0,0)
        to = this.changeTime(to, 23, 59, 59)
        const batch = this.FileForm.value.addMultiple
        const serialNumbers = (batch)? this.dataSourceLogger.data.map(row => row.serialNumber): [this.deviceSerial];

        if(serialNumbers.length > 1){// batch report
            if(!serialNumbers.includes(this.deviceSerial))
                serialNumbers.push(this.deviceSerial)
            let object = {
                from: from,
                to: to,
                name: this.FileForm.value.name,
                serials: serialNumbers
            }
            if(this.shouldPrintAsnyc(serialNumbers, from, to)){

                this._deviceManagementService.createBatchPdfExcelReportAsync(object).then((res: any) => {
                    if (res && res.error_code == 0) {
                        const jobId = res.object as string
                        if(!jobId){
                            this._snackBar.open('Failed to create print', '', snackBarConfigWarn)
                        }else{
                            this.overlayService.show()
                            this.overlayService.setProgress(0)
                            this.pollPrintingStatus(jobId)
                        }
                        this.cancel();
                    }else{
                        this._snackBar.open('Failed to create print', '', snackBarConfigWarn)
                    }
                }).catch((err: HttpErrorResponse) => { });
            }
            else{
                this._deviceManagementService.createBatchPdfExcelReport(object).then((res: any) => {
                    if (res && !res.error_code) {
                        console.log('changes', res);
                        this._snackBar.open('File Created Successfully', '', snackBarConfig);
                        this.cancel();
                        this.getReports();
                    }
                }).catch((err: HttpErrorResponse) => { });
            }
        }
        else{
            let object = {
                from: from,
                to: to,
                name: this.FileForm.value.name
            }
            this._deviceManagementService.createPdfExcelReport(object, this.deviceId).then((res: any) => {
                if (res && !res.error_code) {
                    console.log('changes', res);
                    this._snackBar.open('File Created Successfully', '', snackBarConfig);
                    this.cancel();
                    this.getReports();
                }
            }).catch((err: HttpErrorResponse) => { });

        }
    }
  }

  pollPrintingStatus(jobId: string) {
    const interval = setInterval(() => {
      this._deviceManagementService.pullBatchPrintTaskStatus(jobId).then((res: any) => {

        if(res && res.error_code == 0){
            var data = res.object as PrintJob
            if(data.status == PRINT_STATUS.PROG){
                this.overlayService.setProgress(data.progress)
            }
            else if (data.status == PRINT_STATUS.COMPLETED) {
                this.overlayService.hide()
                this.cancel();
                clearInterval(interval);
                this._deviceManagementService.clearBatchPrintTask(jobId)
                this._snackBar.open('File Created Successfully', '', snackBarConfig);
                this.getReports();
            }
            else if(data.status == PRINT_STATUS.ERROR){
                this.overlayService.hide()

                this._snackBar.open(`Failed to print report`, '', snackBarConfigWarn)
                this._deviceManagementService.clearBatchPrintTask(jobId)
                clearInterval(interval);
            }
        }

      });
    }, 3000); // poll every 3 seconds

    setTimeout(() => { // timeout in 10 minutes
        clearInterval(interval);
        this._snackBar.open('failed to print report-timeout');
    }, 1000 * 60 * 10);

  }

  getFileIconClass(fileName: string): string {
    const fileExtension = this.getFileExtension(fileName);

    // Return the corresponding icon class based on the file extension
    return fileExtension === 'pdf' ? 'PDF' : fileExtension === 'xlsx' ? 'XLSX' : '';
  }

  getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
  search() { }

  addNew() {
    this.resetFormdata()
    this.dialog.open(this.addFile, { width: '450px', panelClass: 'custom-modalbox', disableClose: true });

  }

  deleteReport() {
    const idsToDelete = this.selection.selected.map(item => item.id);
    console.log('Deleting IDs:', idsToDelete);

    this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
    var message = "Are you sure you want to delete this report ?"
    if(idsToDelete.length > 1)
        message = `Are you sure you want to delete ${idsToDelete.length} report ?`
    this.dialogRef.componentInstance.data = {
      title: "Delete Report?",
      message: message
    }
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ConfirmdeleteReport(idsToDelete)
      }
    })
  }

  ConfirmdeleteReport(idsToDelete) {
    let object = {
      ids: idsToDelete,
    }
    console.log(`ids to delete: ${idsToDelete}: ${idsToDelete.length}`)
    this._deviceManagementService.deletReportsMultiple(object).then((res:any) => {
      if(res && !res.error_code) {
        this._snackBar.open('Report Deleted Successfully', '', snackBarConfig);
        this.cancel();
        this.getReports();
      }
    })
  }
  // getReports
  getReports() {
    if(!this.deviceId){
        return this.clearData()
    }
    this.dataSource = new MatTableDataSource<ReportDoc>();
    this._deviceManagementService.getFiles(this.deviceId).then((res: any) => {
      if (res && !res.error_code) {
        this.files = res?.object;
        this.isNoRecord = false;
        this.dataSource.data = res?.object;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      } else  {
        this.clearData()
      }
    }).catch((err: HttpErrorResponse) => (console.log))
  }

  private clearData(){
    this.isNoRecord = true;
    this.isSearch = true;
  }

  private changeTime(date: Date, H: number, M: number, S: number): Date{
    var result = new Date(date)
    result.setHours(H);
    result.setMinutes(M);
    result.setSeconds(S);
    return result

  }

  downloadReport(item, fileType) {
    let object = {
      did: this.deviceId,
      rid: item.id
    }
    const filename = item.file
    this._deviceManagementService.downloadReport(object).then(
      (res:Blob) => {
          // Handle the Blob response as needed
          if(this.getFileExtension(filename) === 'pdf') {
            const blob = new Blob([res], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url); // Open the PDF in a new tab
          }
          else if (this.getFileExtension(item?.file) === 'xlsx') {
            // Save XLSX file using FileSaver.js
            saveAs(res, filename);
          } else {
            console.error('Unsupported file type:', fileType);
          }
        },
    )
  }
}
