import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { DeviceManagementService } from '../../device-management.service';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import moment from 'moment';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
    currentTime: Date;
    currentTime2: Date;
    userInfo: any;

    public selection = new SelectionModel<any>(true, []);
    displayedColumns: string[] = ['id', 'temperature', 'humidity', 'light', 'vibration', 'time'];
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
    deviceForm: FormGroup
    editState: boolean = false;
    @Input() deviceId: string = '';

    constructor(private _deviceManagementService: DeviceManagementService,
        private _route: ActivatedRoute) {

    }
    ngOnInit(): void {
        // this.currentTime = new Date();
        this.currentTime2 = new Date();
        this.currentTime = new Date(this.currentTime2.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days
        this.userInfo = JSON.parse(localStorage.getItem('userInfo'))
        // Access route parameters using ActivatedRoute
        this._route.paramMap.subscribe((params) => {
            // Get the 'id' parameter value
            this.deviceId = params.get('id');
        });
        this.getDeviceLogs();
    }

    ngOnChanges(){
        if(!this.deviceId){ // device id
            this.clearDataSource()
        }
        else{
            this.getDeviceLogs()
        }
    }

    getDeviceLogs() {
        if(!this.deviceId){
            return this.clearDataSource()
        }
        let object = {
            from: this.currentTime,
            to: this.currentTime2,
        }

        this._deviceManagementService.getLogsOneDevice(object, this.deviceId).then((res: any) => {
            if (res && !res.error_code && res?.object?.length) {
                this.isNoRecord = false;
                this.dataSource = new MatTableDataSource<any>();
                this.dataSource.data = res?.object;
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
            } else {
                this.clearDataSource()
            }
        })
    }

    private clearDataSource(){
        this.dataSource = new MatTableDataSource<any>();
        this.isNoRecord = true;
        this.isSearch = true;
    }
}
