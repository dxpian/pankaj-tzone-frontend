import { ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import * as Highcharts from "highcharts/highstock";
import { DatePipe } from '@angular/common';

 import { saveAs } from 'file-saver';
import { SharedService } from 'app/services/shared.service';
import { AlfresaCenterService } from '../service.center';
import { ALFALARM_STATUS, AlfCalibResult, ALFLOC, AlfresaAlarms, AlfresaBranch, AlfresaCalibrationConfig, AlfresaCenter, CALIB_STATUS, CalibrationSchedule } from '../alfresa.type';
import { DB_RESULT, PageData, PageQuery, isWebAdminPermission } from 'app/modules/landing/utils/typedef';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { Language } from '../../message-push-service/email/email.component';
import { MSG } from 'app/modules/landing/utils/message.def';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { concatMap, debounceTime, finalize, from, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { dateAfterXDays, getFileExtension, isValidAlfCode, isValidEmail, isValidSerial, normalizeString, normalizeWhitespace, parseCalibrationXlsx } from '../alfresa.util';
import { environment } from 'app/enviroment/enviroment';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { AlfresaAlarmService } from '../service.alarm';
import { MatRadioChange } from '@angular/material/radio';
import { AlfresaCalibService } from '../service.calib';
import { AlarmType } from 'app/modules/landing/alarm-settings/alarm-listing/alarm-listing.component';
import { MatTabChangeEvent } from '@angular/material/tabs';

// point for temperature curve
interface Value{
    time: Date,
    temp: number,
    temp_ext?: number
}

// temperature pair for calibration control
interface ValuePairs{
    calibs: Value[]
    cands: Value[]
}


@Component({
  selector: 'app-alfresa.alarm',
  templateUrl: './alfresa.alarm.component.html',
  styleUrls: ['./alfresa.alarm.component.scss']
})
export class AlfresaAlarmComponent {

    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;


    @ViewChild(MatPaginator, { static: true }) paginatorCalib: MatPaginator;
    @ViewChild(MatSort, { static: true }) sortCalib: MatSort;

    @ViewChild('addAlarm') AddAlarm: any;
    @ViewChild('addCalib') AddCalib: any;
    @ViewChild('controlCalibTime') ControlCalib: TemplateRef<any>;

    public dialogRef: any;
    private lng = Language.ENG
    private  editState = false
    private CALIB_TOGGLE_TIME = 16

    alarmForm: FormGroup
    public dataSource = new MatTableDataSource<AlfresaAlarms>() // alarm source
    public selection = new SelectionModel<AlfresaAlarms>(false, []);
    displayedColumns: string[] = ['id', 'serial', 'enable', 'location', 'alarm_range', 'alarm_type', 'calib_status', 'actions'];
    searchInputControl = new FormControl();
    _pageQuery: PageQuery = {
        page: 0,
        pagesize: 20,
        keyword: '',
        cursor:null,
        total: 0,
        keyChanged: true
    }


    calibForm: FormGroup

    public dataSourceCalib = new MatTableDataSource<AlfresaCalibrationConfig>() // alarm source
    public selectionCalib = new SelectionModel<AlfresaCalibrationConfig>(false, []);
    displayedColumnsCalib: string[] = ['id', 'serial', 'calib_start', 'calib_stop', 'candidate_serial',
        'description', 'status', 'actions'];
    searchInputControlCalib = new FormControl();

    Highcharts: typeof Highcharts = Highcharts;
    chartOptions: Highcharts.Options[] = [{}, {}]; // chart options for start temperature pair
    controlForm: FormGroup
    tempMin = -20
    tempMax = 40
    tickInterval = 1000 * 60 * 60 ;// interval is 5 hours
    chartRefs: Highcharts.Chart[] = [];

    updateFlag = false;
    calibDataStart: ValuePairs = {calibs: [],cands: []};
    calibDataEnd: ValuePairs = {calibs: [],cands: []};



    _pageQueryCalib: PageQuery = {
        page: 0,
        pagesize: 20,
        keyword: '',
        cursor:null,
        total: 0,
        keyChanged: true
    }

    calibSchedules: CalibrationSchedule[] = []

    public searchValue = new Subject<number>();
    public searchValueSubscriber: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private alarms: AlfresaAlarms[] = []
    private alarmSelected: AlfresaAlarms
    private centerNames: AlfresaCenter[] = []
    private branchNames: AlfresaBranch[] = []
    private branchVisibles: AlfresaBranch[] = []
    private calibs: AlfresaCalibrationConfig[] = []
    private calibSelected: AlfresaCalibrationConfig
    AlarmType =  AlarmType
    CALIB_STATUS = CALIB_STATUS
    filterCalib = CALIB_STATUS.ALL
    constructor(
        private _alarmService: AlfresaAlarmService,
        private _centerService: AlfresaCenterService,
        private _calibService: AlfresaCalibService,
        private _serivceShared: SharedService,
        private _snackBar: MatSnackBar,
        private _route: Router,
        private datePipe: DatePipe,
        private _cdr: ChangeDetectorRef,
        public dialog: MatDialog,
        private _formBuilder:FormBuilder,

    ){

    }

    ngOnInit(): void {
        setTimeout(() => {
            this.searchInputControl.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(300),
                switchMap((query) => {
                this._pageQuery.keyword = query.toString().trim();
                this._pageQuery.keyChanged = true;
                this.paginator.pageIndex = 0;
                return this.fetchPage(0, this.paginator.pageSize, this._pageQuery.keyword, true,
                    this._pageQuery.total
                );
                })
            )
            .subscribe({
                next: (response) => this.updateSource(response),
                error: (err) => console.error(err),
            });
        });

        setTimeout(() => {
            this.searchInputControlCalib.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(300),
                switchMap((query) => {
                this._pageQueryCalib.keyword = query.toString().trim();
                this._pageQueryCalib.keyChanged = true;
                this.paginatorCalib.pageIndex = 0;
                return this.fetchCalibPage(0, this.paginatorCalib.pageSize, this._pageQueryCalib.keyword, true,
                    this._pageQueryCalib.total
                );
                })
            )
            .subscribe({
                next: (response) => this.updateCalibSource(response),
                error: (err) => console.error(err),
            });
        });

        this.createAlarmDialog()
        this.createaCalibDialog()


        this.alarmForm.get('center')?.valueChanges.subscribe(centerId => {
            console.log(`Alfresa alarm center is changed. center =${centerId}`)
            if (centerId) {
                this.branchVisibles = this.branchNames.filter(b=>b.center == centerId)
                if(this.branchVisibles.length > 0){ // select first branch as default
                    this.alarmForm.get('branch').setValue(this.branchVisibles[0].id)
                }
            } else {
                this.branchVisibles = [];
            }
            this._cdr.detectChanges()
        });
    }

    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort
        this.dataSourceCalib.sort = this.sortCalib
        this._pageQuery.pagesize = this.paginator.pageSize;
        this._pageQuery.keyChanged = true
        this.refreshAlarms();
        this.refreshCalibs();
        this.loadLocationInformations()
        // add sort rule
        // Custom accessor to map column names -> actual values
        this.dataSource.sortingDataAccessor = (item, property) => {
            switch (property) {
                case 'enable': // our column name
                    return item.alarm_status ? 1 : 0; // true > false
                case 'alarm_type':
                    return item.alarm_type
                case 'calib_status':
                    return item.calib_status
                default:
                    return (item as any)[property];
            }
        };


          // Custom accessor to map column names -> actual values
        this.dataSourceCalib.sortingDataAccessor = (item, property) => {
            switch (property) {
                case 'serial': // our column name
                    return item.serial_calib
                case 'calib_start':
                    return item.calib_start
                case 'calib_stop':
                    return item.calib_end
                case 'candidate_serial':
                    return item.serial_opt
                case 'status':
                    return item.calib_status
                default:
                    return (item as any)[property];
            }
        };
    }


    // read Center in page unit
    private fetchPage(pageIndex: number, pageSize: number, keyword: string, keyChanged: boolean, total: number) {
        console.log(`original page query item: ${JSON.stringify(this._pageQuery)}`)
        const query: PageQuery = {
            page: pageIndex + 1,
            pagesize: pageSize,
            keyword: keyword || '',
            keyChanged: keyChanged !== undefined ? keyChanged : true,
            total: total || 0,
        }
        return this._alarmService.getAlfAlarmPage(query);
    }

     // data sources is updated
    private updateSource(response: any): void {
        const res = response as DB_RESULT
        if(res && !res.error_code){
          const pageData = res.object as PageData
          this.alarms = pageData.data as AlfresaAlarms[]
          this.dataSource.data = this.alarms
          this._pageQuery.total = pageData.total
          this._pageQuery.cursor = pageData.cursor
          this._pageQuery.keyChanged = false
        }
        else{
          console.log(`failed to get api response: ${res}`)
          this.dataSource.data = []
          this._pageQuery.total = 0
        }
        this._cdr.detectChanges()
    }

    onPageChange(event: any): void {
        // this._pageQuery.pagesize = event.pageSize
        this._pageQuery.cursor = null;
        this.fetchPage(event.pageIndex, event.pageSize,
          this._pageQuery.keyword, this._pageQuery.keyChanged,
          this._pageQuery.total
        ).then((response: any) => {
          this.updateSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    private refreshAlarms(){
        this.fetchPage(this.paginator.pageIndex, this._pageQuery.pagesize,
        this._pageQuery.keyword, this._pageQuery.keyChanged,
        this._pageQuery.total).then((response: any) => {
            this.updateSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    // read Center in page unit
    private fetchCalibPage(pageIndex: number, pageSize: number, keyword: string,
         keyChanged: boolean, total: number) {
        console.log(`original page query item: ${JSON.stringify(this._pageQuery)}`)
        const query: PageQuery = {
            page: pageIndex + 1,
            pagesize: pageSize,
            keyword: keyword || '',
            keyChanged: keyChanged !== undefined ? keyChanged : true,
            total: total || 0,
            filter: this.filterCalib,
        }
        return this._calibService.getCalibrationPage(query);
    }

    onCalibFilterChanged(event: any): void{
        this.paginatorCalib.pageIndex = 0;
        this.fetchCalibPage(this.paginatorCalib.pageIndex, this.paginatorCalib.pageSize,
         this._pageQueryCalib.keyword, this._pageQueryCalib.keyChanged,
          this._pageQueryCalib.total).then((response: any) => {
        this.updateCalibSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }


     // data sources is updated
    private updateCalibSource(response: any): void {
        const res = response as DB_RESULT
        if(res && !res.error_code){
          const pageData = res.object as PageData
          this.calibs = pageData.data as AlfresaCalibrationConfig[]
          this.dataSourceCalib.data = this.calibs
          this._pageQueryCalib.total = pageData.total
          this._pageQueryCalib.cursor = pageData.cursor
          this._pageQueryCalib.keyChanged = false
        }
        else{
          console.log(`failed to get api response: ${res}`)
          this.dataSourceCalib.data = []
          this._pageQueryCalib.total = 0
        }
        this._cdr.detectChanges()
    }

    onCalibPageChange(event: any): void {
        // this._pageQuery.pagesize = event.pageSize
        this._pageQueryCalib.cursor = null;
        this.fetchCalibPage(event.pageIndex, event.pageSize,
          this._pageQueryCalib.keyword, this._pageQueryCalib.keyChanged,
          this._pageQueryCalib.total
        ).then((response: any) => {
          this.updateCalibSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    private refreshCalibs(){
        this.fetchCalibPage(this.paginatorCalib.pageIndex, this._pageQueryCalib.pagesize,
        this._pageQueryCalib.keyword, this._pageQueryCalib.keyChanged,
        this._pageQueryCalib.total).then((response: any) => {
            this.updateCalibSource(response);
        }).catch((err: HttpErrorResponse) => (console.log));
    }

    // refresh the calibration status
    private refreshCalibSchedule(calib: AlfresaCalibrationConfig){
        this._calibService.refreshCalibSchedule(calib.id).then((res: DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.notify(MSG.OPERATION_SUCCESS)
                const calibResult = res.object as AlfCalibResult
                if(calibResult.calib){
                    const calib = this.calibs.find(c=>c.id == calibResult.calib.id)
                    if(calib){
                        Object.assign(calib, calibResult.calib)
                        console.log(`Success to replace calib schedule`)
                    }
                }
                if(calibResult.alarm_calib){
                    const alarm = this.alarms.find(a=>a.id == calibResult.alarm_calib.id)
                    if(alarm){
                        Object.assign(alarm, calibResult.alarm_calib)
                        console.log(`Success to replace source alarm`)
                    }
                }
                if(calibResult.alarm_opt){
                    const alarm = this.alarms.find(a=>a.id == calibResult.alarm_opt.id)
                    if(alarm){
                        Object.assign(alarm, calibResult.alarm_opt)
                        console.log(`Success to replace target alarm`)
                    }
                }
                this._cdr.detectChanges()
            }
            else{
                this.warning(res.meta || MSG.OPERATION_FAILED)
            }
        })
    }

    // download the template excel file from server for calibration schedule.
    private downloadScheduleTemplate(){
        console.log(`Download an template excel file to create calibration schedule from excel file`)
        this._calibService.downloadCalibFileTempate().then((res: Blob)=>{
            if (res.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    const errorText = reader.result as string;
                    try {
                        const errorJson = JSON.parse(errorText);
                        console.error('Server returned error:', errorJson);
                        // Show the error to user
                        this.warning('Failed to download template');
                    } catch (e) {
                        console.error('Unknown error format:', errorText);
                        this.warning('Unknown error occurred while downloading template');
                    }
                };
                reader.readAsText(res);
            } else {
                // Valid Excel file - save it
                saveAs(res, `schedule_template.xlsx`);
                this.notify('Success to download shcedule template file')
            }
        })
    }


    private createCalibScheduleBatch(){
        console.log(`Create schedules from excel file: ${this.calibSchedules.length}`)
        if(this.calibSchedules.length <= 0){
            this.warning(`No schedules to upload`)
            return
        }
        var errors: string[] = []
        from(this.calibSchedules).pipe(
            concatMap((schedule, index) =>{
                const cfg: AlfresaCalibrationConfig =
                {
                    serial_calib: schedule.calibrated_logger,       // ser ial of calibrated device
                    serial_opt: schedule.candidate_logger,         // serial of candidate
                    calib_start: this.changeHour(schedule.calibration_start).toISOString(),          // time when calibration starting
                    calib_end: this.changeHour(schedule.calibration_end).toISOString(),            // time when calibration completed
                    // opt_start: this.changeHour(schedule.candidate_start).toISOString(),           // time when the candidate starts working
                    description: ''
                }
                return this._calibService.createCalibration(cfg).then((response: DB_RESULT)=>{
                    if(response && response.error_code == 0){
                        const calibResult = response.object as AlfCalibResult
                        if(calibResult.calib){
                            this.calibs.push(calibResult.calib)
                            this.dataSourceCalib.data = [...this.calibs];
                        }

                        // update source alarm
                        if(calibResult.alarm_calib){
                            const alarm = this.alarms.find(a=>a.id == calibResult.alarm_calib.id)
                            if(alarm){
                                Object.assign(alarm, calibResult.alarm_calib)
                                console.log(`Success to replace source alarm`)
                            }
                        }

                        // update target alarm
                        if(calibResult.alarm_opt){
                            const alarm = this.alarms.find(a=>a.id == calibResult.alarm_opt.id)
                            if(alarm){
                                Object.assign(alarm, calibResult.alarm_opt)
                                console.log(`Success to replace target alarm`)
                            }
                        }
                    }else{
                        console.log(`Failed to create schedule: ${response.meta}`)
                        if(response.meta.length <= 128)
                            errors.push(response.meta)
                    }
                })}
            ),
            finalize(() => {
                // console.log('✅ All schedules processed');
                if(errors.length > 0){
                    const message = `Error occured in processing ${errors.length} schedules`
                    this.notifyDialog(message)

                }
                else{
                    this.notifyDialog(`All schedules are processed`)

                }
                this.calibSchedules = []
            })
        )
        .subscribe({
            error: (err) => {
                console.log('❌ Error occurred during batch processing', err);
            }
        });
    }


    // load location information
    private loadLocationInformations(){
        this._centerService.getAllCenterNames().then((res: DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.centerNames = res.object as AlfresaCenter[]
                console.log(`Success to load centers: ${this.centerNames.length}`)
            }
            else{
                console.error(`Failed to load centers: ${res.meta}`)
            }
        })
        this._centerService.getAllBranchNames().then((res:DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.branchNames = res.object as AlfresaBranch[]

            }
            else{
                console.error(`Failed to load bnraches: ${res.meta}`)
            }
        })
    }

    onTabChange(event: MatTabChangeEvent) {
        // Notify Highcharts to re-render
        setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        this.updateFlag = true; // triggers chart update
        }, 0);
    }

    // load the temperature pair of calibration to control its start/end time
    private loadCalibTemperaturePair(){

        if(!this.calibSelected.id){
            console.log(`Invalid calibration is selected`)
            return
        }
        const status = this.calibSelected.calib_status
        if(status < CALIB_STATUS.PROG){
            console.log(`Cann't get temp pair information unless calibration is started`)
            return
        }
        // query temperature pair for start
        var query: any = {
            start: 1,
            range: 3
        }
        // clear chart graph first

        this._calibService.getTemperaturePair(this.calibSelected.id, query).then((res: DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.calibDataStart = res.object as ValuePairs
                console.log(`Load temperature pair in starting: ${this.calibDataStart.calibs.length}/${this.calibDataStart.cands.length}`)
                this.buildChartGraph(true)
            }
            else{
                console.error(`Failed to load temperature pair in starting`)
            }
        })

        if(status == CALIB_STATUS.COMPLETED){ // calibration is completed. query the temperature pair for end point
            query.start = 0
            this._calibService.getTemperaturePair(this.calibSelected.id, query).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    this.calibDataEnd = res.object as ValuePairs
                    console.log(`Load temperature pair in ending: ${this.calibDataEnd.calibs.length}/${this.calibDataEnd.cands.length}`)
                    this.buildChartGraph( false)
                }
                else{
                    console.error(`Failed to load temperature pair in starting`)
                }
            })
        }
    }


    // build the chart options by temperature pair
    private buildChartGraph(start: boolean){

        const pairs = (start)? this.calibDataStart: this.calibDataEnd

        const dataCalib: Value[] = pairs.calibs.filter(data=>data.temp != null)
        const dataCalibProb: Value[] = pairs.calibs.filter(data=>data.temp_ext != null)
        const dataCandi: Value[] = pairs.cands.filter(data=>data.temp != null)
        const dataCandiProb: Value[] = pairs.cands.filter(data=>data.temp_ext!= null)


        const colorActivate = '#00ff2ac4'
        const colorDeactivate = '#777777a6'


        const series: any = [
            {
                data: dataCalib.map(d => [new Date(d.time).getTime(), d.temp]),
                name: `Main`,
                color: (start)? colorActivate: colorDeactivate
            },
            {
                data: dataCalibProb.map(d => [new Date(d.time).getTime(), d.temp_ext]),
                name: `Main Prob`,
                color: (start)? colorActivate: colorDeactivate
            },
            {
                data: dataCandi.map(d => [new Date(d.time).getTime(), d.temp]),
                name: `Secondary`,
                color: (start)? colorDeactivate: colorActivate
            },
            {
                data: dataCandiProb.map(d => [new Date(d.time).getTime(), d.temp_ext]),
                name: `Secondary Prob`,
                color: (start)? colorDeactivate: colorActivate
            },
        ]

        var minX = new Date(this.calibSelected.calib_start).getTime()
        var maxX = new Date(this.calibSelected.calib_end).getTime()
        if(pairs.calibs.length > 0){
            const l = pairs.calibs.length
            minX = new Date(pairs.calibs[0].time).getTime()
            maxX = new Date(pairs.calibs[l - 1].time).getTime()
        }
        if(pairs.cands.length > 0){
            const l = pairs.cands.length
            minX = Math.min(minX, new Date(pairs.cands[0].time).getTime())
            maxX = Math.max(maxX, new Date(pairs.cands[l - 1].time).getTime())
        }


        var minY = this.tempMin
        var maxY = this.tempMax
        if(dataCalib.length > 2){
            const tempMin = Math.min(...dataCalib.map(data=>data.temp));
            const tempMax = Math.max(...dataCalib.map(data=>data.temp));
            const offset = Math.max(Math.min((tempMax - tempMin) * 0.1, 2), 0.1)

            minY = tempMin + offset
            maxY = tempMax + offset
        }

        if(dataCandi.length > 2){
            const tempMin = Math.min(...dataCandi.map(data=>data.temp));
            const tempMax = Math.max(...dataCandi.map(data=>data.temp));
            const offset = Math.max(Math.min((tempMax - tempMin) * 0.1, 2), 0.1)

            minY =  Math.min(tempMin + offset, minY)
            maxY = Math.max(tempMax + offset, maxY)
        }

        console.log(`build chart graph temperature range: ${minY}~${maxY}`)
        const id = (start)? 0: 1
        this.chartOptions[id] =  {
            title: {
                text: (start)?  'Temperature pair at calibration start': `Temperature pair at calibration end`,
                align: 'center'
            },
            rangeSelector: {
                enabled: true, // Ensure range selector is enabled
                selected: 0
            },
            xAxis: {
                type: 'datetime',
                min: minX,
                max: maxX,
                labels: {
                    formatter: function (this: any) {
                        return Highcharts.dateFormat('%m-%d %H:%M', this.value as number);

                    },
                },
                tickInterval: this.tickInterval,
            },
            yAxis: {
                min: minY,
                max: maxY,
            },
            chart: {
                events: {
                    click: (e: any) => {
                        const ts = e.xAxis[0].value;
                        const formatted = this.datePipe.transform(ts, 'yyyy-MM-dd HH:mm:ss');
                        if(start){
                            this.controlForm.patchValue({ time_start: formatted });
                        }
                        else{
                            this.controlForm.patchValue({ time_end: formatted });
                        }
                    }
                }
            },

            plotOptions: {
                series: {
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.1f}°C</b><br/>',
                    },
                    point: {
                        events: {
                            click: (event: any) => {
                                const ts = event.point.x; // timestamp in ms
                                // format using Angular DatePipe
                                const formatted = this.datePipe.transform(ts, 'yyyy/MM/dd HH:mm:ss');
                                if(start){
                                    this.controlForm.patchValue({ time_start: formatted });
                                    // this.updateChartColors(0, ts)
                                }
                                else{
                                    this.controlForm.patchValue({ time_end: formatted });
                                    // this.updateChartColors(1, ts)
                                }
                            }
                        }
                    }
                },
            },

            tooltip: {
                split: true,
            },
            time: {
                useUTC: false
            },
            series: series
        };

    }

    updateChartColors(chartIndex: number, selectedTime: number) {
        const grayColor = '#858484ff';
        const activeColor = '#4eff09ff'

        const chart = this.chartRefs[chartIndex];

        const chartData = (chartIndex == 0)? this.calibDataStart:  this.calibDataEnd;

        // Split data according to selectedTime
        const splitData = (data: Value[], colorBefore: string, colorAfter: string) => {
            const before = data.filter(d => d.time.getTime() <= selectedTime)
                            .map(d => [d.time.getTime(), d.temp]);
            const after = data.filter(d => d.time.getTime() >= selectedTime)
                            .map(d => [d.time.getTime(), d.temp]);
            return [
                { type: 'line', data: before, color: colorBefore, enableMouseTracking: false, showInLegend: false },
                { type: 'line', data: after, color: colorAfter, enableMouseTracking: false, showInLegend: false }
            ];
        };

        const series1 = splitData(
            chartData.calibs,
            chartIndex === 0 ? activeColor : grayColor,
            chartIndex === 0 ? grayColor : activeColor
        );

        // 2nd temperature graph
        const series2 = splitData(
            chartData.cands,
            chartIndex === 0 ? grayColor : activeColor,
            chartIndex === 0 ? activeColor : grayColor
        );

        chart.update({ series: [...series1, ...series2] as Highcharts.SeriesOptionsType[]} , true, true);

    }

    createAlarmDialog(){
        this.alarmForm = this._formBuilder.group({
          "id":[''],
          "serial": ['',],
          "alarm_status": true,  // enable or disable
          "alarm_l": ['2.5'],
          "alarm_h": ['7.5'],
          "warn_l": ['3.0'],
          "warn_h": ['7.0'],
          'alarm_type': AlarmType.Temperature,        // alarm type
          "location": false,      // 0: center, true: branch
          "center": ['',],          // center id selected
          "branch": [''],           // branch id selected
        });
    }

    createaCalibDialog(){
        const now = new Date()
        this.calibForm = this._formBuilder.group({
          "id":[''],
          "serial_calib": [''],                     // serial ID of source device
          'calib_start': [dateAfterXDays(now, 7)],  // start time of calibration
          'calib_end': [dateAfterXDays(now, 30)],   // edn time of calibration
          'serial_opt': [''],                       // serial ID of target device
          // 'opt_start': [dateAfterXDays(now, 3)],    // start time of target device start operation
          'description': ['']                       // description
        });
    }

    createControlForm(){
        this.controlForm = this._formBuilder.group({
            selectedChart: ['0'],
            time_start: [this.calibSelected?.calib_start],
            time_end: [this.calibSelected?.calib_end]
        })
        this.calibDataStart = {calibs: [],cands: []};
        this.calibDataEnd = {calibs: [],cands: []};
        this.buildChartGraph(true);
        this.buildChartGraph(false);

    }
    resetAlarmDialog(){
        this.alarmForm.get('serial')?.enable();
        this.alarmForm.reset({
          "id":[''],
          "serial": ['',],
          "alarm_status": true,  // enable or disable
          "alarm_l": ['2.5'],
          "alarm_h": ['7.5'],
          "warn_l": ['3.0'],
          "warn_h": ['7.0'],
          "location": false,      // 0: center, true: branch
          "center": ['',],          // center id selected
          "branch": [''],           // branch id selected
          "alarm_type": AlarmType.Temperature,
        });
        if(this.centerNames.length > 0){
            this.alarmForm.get('center').setValue(this.centerNames[0].id)
        }
    }

    onLocationChange(event: MatRadioChange) {
        const selected = event.value;
    }

    patchAlarmConfig(){
        this.alarmForm.reset()
        this.alarmForm.patchValue(this.alarmSelected)
        const enabled = (this.alarmSelected.alarm_status == ALFALARM_STATUS.ENABLE)?true:false
        this.alarmForm.get('alarm_status')?.setValue(enabled);
        this.alarmForm.get('serial')?.enable();
        var centerId = ''
        if(this.alarmSelected.center){
            this.alarmForm.get('location').setValue(false)
            centerId = this.alarmSelected.center
        }
        else if(this.alarmSelected.branch){
            const branch_id = this.alarmSelected.branch
            this.alarmForm.get('location').setValue(true)
            // find parent center
            const branches = this.branchNames.filter(b=>b.id == branch_id)
            if(branches.length > 0){
                centerId = branches[0].center
                this.alarmForm.get('center').setValue(centerId)
                this.alarmForm.get('branch').setValue(centerId)
            }
        }
        if (centerId) {
            this.branchVisibles = this.branchNames.filter(b=>b.center == centerId)
            if(this.branchVisibles.length > 0){ // select first branch as default
                this.alarmForm.get('branch').setValue(this.branchVisibles[0].id)
            }
        } else {
            this.branchVisibles = [];
        }

    }

    patchCalibconfigDialog(){
        // this.calibForm.reset()
        this.calibForm.patchValue(this.calibSelected)
        this.calibForm.get('calib_start').setValue(new Date(this.calibSelected.calib_start))
        this.calibForm.get('calib_end').setValue(new Date(this.calibSelected.calib_end))

        if(this.isProgressCalib(this.calibSelected)){
            this.calibForm.get('serial_calib').disable()
            this.calibForm.get('serial_opt').disable()
            this.calibForm.get('calib_start').disable()
            console.log(`Disable datetime picker in progress mode`)
        }
    }

    isLocationReady(): boolean{
        if(this.centerNames.length <= 0 || this.branchNames.length <= 0)
        return false;
        return true
    }

    openDialog(action: string, item? ){
        switch(action){
            case 'add_alarm':
                if(!this.isLocationReady()){
                    this.warning(`Alfresa center name isn't loaded`)
                    return
                }
                this.alarmSelected = undefined
                this.resetAlarmDialog()
                this.editState = false;
                this.dialog.open(this.AddAlarm, { width: '800px', height: '650px',  panelClass: 'custom-modalbox', disableClose: true });
                break;
            case 'edit_alarm':
                if(!this.isLocationReady()){
                    this.warning(`Alfresa centers have not been initialized.`)
                    return
                }

                this.editState = true
                this.alarmSelected = item
                this.resetAlarmDialog()
                this.patchAlarmConfig()

                this.dialog.open(this.AddAlarm, { width: '800px', height: '650px',  panelClass: 'custom-modalbox', disableClose: true });
                break
            case 'delete_alarm':
                if(item.calib_status == CALIB_STATUS.PROG){
                    this.notifyDialog(`Alarm settings cannot be deleted while the logger is undergoing calibration.`)
                    return
                }
                const alarm_id = item.id as string
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
                    this.dialogRef.componentInstance.data = {
                        title: "Delete Alarm",
                        message: "Are you sure you want to delete this alfresa alarm?"
                    }
                    this.dialogRef.afterClosed().subscribe((result) => {
                        if (result) {
                            this._alarmService.deletAlfAlarm(alarm_id).then((res:DB_RESULT)=>{
                                if(res && res.error_code == 0){ // refresh center
                                    this.notify(MSG.OPERATION_SUCCESS)
                                    this.refreshAlarms()
                                }
                                else{
                                    this.warning(res.meta ||  MSG.OPERATION_FAILED)
                                }
                            })
                        }
                    })
                break
            case 'add_calib':
                this.createaCalibDialog()
                this.editState = false;
                this.dialog.open(this.AddCalib, { width: '800px', height: '510px',  panelClass: 'custom-modalbox', disableClose: true });
                break
            case 'edit_calib':
                this.createaCalibDialog()
                this.editState = true
                this.calibSelected = item
                this.patchCalibconfigDialog()
                this.dialog.open(this.AddCalib, { width: '800px', height: '510px',  panelClass: 'custom-modalbox', disableClose: true });
                break
            case 'control_calib':
                this.calibSelected = item
                this.createControlForm()
                this.loadCalibTemperaturePair()
                this.dialog.open(this.ControlCalib, { width: '800px',  panelClass: 'custom-modalbox', disableClose: true })
                break

            case 'delete_calib':
                const calib_id = item.id as string
                this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
                this.dialogRef.componentInstance.data = {
                    title: "Delete Alarm",
                    message: "Are you sure you want to delete this calibration plan?"
                }
                this.dialogRef.afterClosed().subscribe((result) => {
                    if (result) {
                        this._calibService.deletCalibration(calib_id).then((res:DB_RESULT)=>{
                            if(res && res.error_code == 0){ // refresh center
                                this.notify(MSG.OPERATION_SUCCESS)
                                this.refreshCalibs()
                            }
                            else{
                                this.warning(res.meta ||  MSG.OPERATION_FAILED)
                            }
                        })
                    }
                })
                break

            case 'refresh_calib':
                this.refreshCalibSchedule(item)
                break
            case `download_calib_template`:
                this.downloadScheduleTemplate()
                break
            case   `add_calib_batch`:
                this.createCalibScheduleBatch()
                break

            default:
                break;
        }
    }

    isEditState(): boolean{
        return this.editState
    }

    onWheelScroll(event: WheelEvent) {
        if (this.editState) {
            event.preventDefault();
            return;
        }
        const input = event.target as HTMLInputElement;

        if (document.activeElement !== input) return; // Avoid accidental scroll
            event.preventDefault();

        let value = Number(input.value) || 0;
        const step = 1; // You can customize the step

        if (event.deltaY < 0) {
            value += step;
        } else {
            value -= step;
        }

        // Update the FormControl
        this.alarmForm.get('serial')?.setValue(value);
    }

    saveAlarm(){
        const serialRaw = this.alarmForm.get('serial')?.value;
        const serial = normalizeString(serialRaw != null && serialRaw !== '' ? String(serialRaw) : '')
        const al = parseFloat(this.alarmForm.value.alarm_l.toString())
        const ah = parseFloat(this.alarmForm.value.alarm_h.toString())
        const wl = parseFloat(this.alarmForm.value.warn_l.toString())
        const wh = parseFloat(this.alarmForm.value.warn_h.toString())
        const status = (this.alarmForm.value.alarm_status)?1:0
        const alarm_type =  this.alarmForm.value.alarm_type
        if(!isValidSerial(serial)){
            this.warning('Invalid serial number')
            return
        }
        if(isNaN(al) ||isNaN(ah) ||isNaN(wl) ||isNaN(wh)
            || al >= ah || wl >= wh || al >= wl || ah <= wh)
        {
            return this.notifyDialog('Invalid temperature values')
        }
        if(alarm_type != AlarmType.Temperature  && alarm_type != AlarmType.ProbTemperature){
            return this.notifyDialog(`Invalid alarm type`)
        }

        // cannot enable alarm while it is undergoing calibration
        if(this.editState && this.alarmSelected.calib_status == CALIB_STATUS.PROG && status){
            return this.notifyDialog('Alarm settings shouldn\'t be enable while the logger is undergoing calibration.')
        }

        const loc = this.alarmForm.value.location
        var center_id = ''
        var branch_id = ''
        if(loc){
            console.log(`branch is selected`)
            branch_id = this.alarmForm.value.branch as string
            if(!branch_id){
                this.warning('Please select a branch')
                return
            }
        }
        else{
            console.log(`center is selected`)
            center_id = this.alarmForm.value.center as string
            if(!center_id){
                this.warning('Please select a valid center')
                return
            }
        }

        var config: AlfresaAlarms = {
            serial: serial,         // device serial
            center: center_id,       // location type. ALFLOC
            branch:branch_id,     // location id
            alarm_l: al,        // alarm low temeprature
            alarm_h: ah,        // alarm high temeprature
            warn_l: wl,         // warning low temeprature
            warn_h: wh,         // warning high temeprature
            alarm_status: status,        // reserved
            alarm_type:alarm_type,
        }
        if(!this.editState){ // create alarm
            this._alarmService.createAlfAlarm(config).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    this.notify(MSG.OPERATION_SUCCESS)
                    this.refreshAlarms()
                    this._cdr.detectChanges()
                    this.close()
                }else{
                    const message = (res.meta.length <256)? res.meta: MSG.OPERATION_FAILED[this.lng]
                    this.notifyDialog(message, false)
                    return
                }

            })
        }else{ // update alarm
            this._alarmService.updateAlfAlarm(config, this.alarmSelected.id).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    const newAlarm = res.object as AlfresaAlarms
                    Object.assign(this.alarmSelected, newAlarm)
                    this.notify(MSG.OPERATION_SUCCESS)
                    this._cdr.detectChanges()
                    this.close()
                }
                else{
                    const message = (res.meta.length < 256 )? res.meta: MSG.OPERATION_FAILED[this.lng]
                    this.notifyDialog(message, false)
                    return
                }
            })
        }
    }

    saveCalibration(){
        const calib_serial = this.calibForm.getRawValue().serial_calib || ''
        const calib_start = this.calibForm.getRawValue().calib_start
        const calib_end = this.calibForm.getRawValue().calib_end
        const serial_opt = this.calibForm.getRawValue().serial_opt || ''
        // var opt_start = this.calibForm.getRawValue().opt_start

        // check source params are valid
        if(!calib_serial){
            console.log(`calibrated device serial: ${calib_serial}`)
            return this.warning('Serial of calibratged number is invalid')
        }
        console.log(`ccalib_start and end time: ${calib_start}/${calib_end}/${calib_serial}/${serial_opt}`)

        if(!calib_start || !calib_end ){
            return this.warning('Calibration time range is invalid')
        }
        else if(calib_start >= calib_end){
            return this.warning('The calibration end time must be later than the start time.')
        }
        if(!serial_opt){
            return this.warning(`Candidate device isn't defined`)
        }


        const data: AlfresaCalibrationConfig = {
            serial_calib: calib_serial.toString(),       // serial of calibrated device
            serial_opt: serial_opt.toString(),         // serial of candidate
            calib_start: this.changeHour(calib_start).toISOString(),          // time when calibration starting
            calib_end: this.changeHour(calib_end).toISOString(),            // time when calibration completed
            description: this.calibForm.getRawValue().description || ''
        }
        if(!this.editState){ // create calibration
            this._calibService.createCalibration(data).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    this.notify(MSG.OPERATION_SUCCESS)
                    const calibResult = res.object as AlfCalibResult
                    // update calibration
                    if(calibResult.calib){
                        this.calibs =[calibResult.calib, ...this.calibs]
                        this.dataSourceCalib.data = [...this.calibs];
                    }

                    // update source alarm
                    if(calibResult.alarm_calib){
                        const alarm = this.alarms.find(a=>a.id == calibResult.alarm_calib.id)
                        if(alarm){
                            Object.assign(alarm, calibResult.alarm_calib)
                            console.log(`Success to replace source alarm`)
                        }
                    }

                    // update target alarm
                    if(calibResult.alarm_opt){
                        const alarm = this.alarms.find(a=>a.id == calibResult.alarm_opt.id)
                        if(alarm){
                            Object.assign(alarm, calibResult.alarm_opt)
                            console.log(`Success to replace target alarm`)
                        }
                    }
                    this.close()
                    this._cdr.detectChanges()
                }
                else {
                    const message = (res.meta.length < 256)? res.meta: MSG.OPERATION_FAILED[this.lng]
                    console.log(`response for create calibration plan: ${res.meta}: ${res.meta.length}: ${message}`)
                    this.notifyDialog(message, false)
                    return
                }
            })
        }
        else { // update calibration setting
            this._calibService.updateCalibration(data,  this.calibSelected.id).then((res: DB_RESULT)=>{
                if(res && res.error_code == 0){
                    this.notify(MSG.OPERATION_SUCCESS)

                    const calibResult = res.object as AlfCalibResult
                    if(calibResult.calib){
                        const calib = this.calibs.find(c=>c.id == calibResult.calib.id)
                        if(calib){
                            Object.assign(calib, calibResult.calib)
                            console.log(`Success to replace calib schedule`)
                        }
                    }
                    if(calibResult.alarm_calib){
                        const alarm = this.alarms.find(a=>a.id == calibResult.alarm_calib.id)
                        if(alarm){
                            Object.assign(alarm, calibResult.alarm_calib)
                            console.log(`Success to replace source alarm`)
                        }
                    }
                    if(calibResult.alarm_opt){
                        const alarm = this.alarms.find(a=>a.id == calibResult.alarm_opt.id)
                        if(alarm){
                            Object.assign(alarm, calibResult.alarm_opt)
                            console.log(`Success to replace target alarm`)
                        }
                    }
                    this._cdr.detectChanges()
                    this.close()
                }
                else {
                    const message = (res.meta.length <256)? res.meta: MSG.OPERATION_FAILED[this.lng]
                    this.notifyDialog(message, false)
                    return
                }

            })
        }
    }

    close() {
        this.editState = false;
        this.dialog.closeAll();
    }

    saveCalibtimeControl(){
        console.log(`update the calibration activate/deactivate time`)
        const strStart = this.controlForm.value.time_start
        const strEnd = this.controlForm.value.time_end
        const timeStart = new Date(strStart)
        const timeEnd = new Date(strEnd)
        const query = {
            start: timeStart,
            end: timeEnd
        }
        this._calibService.controlCalibrationTime(this.calibSelected.id, query).then((res: DB_RESULT)=>{
            if(res && res.error_code == 0){
                this.notify(`Success to update notification time`)
            }
            else{
                this.warning(`Failed to update calibration time`)
            }
        })
        this.close()
    }

    isAdmin(): boolean{
        return isWebAdminPermission(this._serivceShared.getPermission());
    }

    onSelectSchduleFile(event){
        const file: File = event.target.files[0];
        this.calibSchedules = []
        if (!file) return;
        parseCalibrationXlsx(file)
            .then((schedules: CalibrationSchedule[]) => {
            this.calibSchedules = [...schedules]
            console.log(`Success to parse excel file: ${schedules.length}`)
            const message = `${schedules.length} schedules are ready to be used for batch calibration schedule creation.`
            this.notifyDialog(message)

        })
        .catch((err) => {
            console.error('Parsing error:', err);
            this.notifyDialog(`Error in Excel file: ${err}`);
        });
    }


    onlyAllowDigits(event: KeyboardEvent) {
        const char = event.key;
        if (!/^\d$/.test(char)) {
            event.preventDefault();
        }
    }

    blockNonDigitsPaste(event: ClipboardEvent) {
        const pasted = event.clipboardData?.getData('text') ?? '';
        if (!/^\d+$/.test(pasted)) {
            event.preventDefault();
        }
    }

    onWheel(event: WheelEvent) {
        const target = event.target as HTMLInputElement;
        if (document.activeElement !== target) {
            event.preventDefault();
        }
    }

    getSerialMaxLen(){
        return environment.serialMaxLen
    }

    getDeviceStatusLabel(alarm: AlfresaAlarms){
        return ''
    }

    getLocationNameOfLogger(alarm: AlfresaAlarms): string{
        if(alarm.center){ // log is in center
            const filtered = this.centerNames.filter(center=>center.id == alarm.center)
            if(filtered && filtered.length > 0 )
                return filtered[0].name
        }
        else if(alarm.branch){
            const filtered = this.branchNames.filter(branch=>branch.id == alarm.branch)
            if(filtered && filtered.length > 0 )
                return filtered[0].name
        }
        return '---'
    }

    getAlarmTypeLabel(item: AlfresaAlarms): string{
        if(item.alarm_type == AlarmType.Temperature){
            return 'Temperature'
        }
        else if(item.alarm_type == AlarmType.ProbTemperature)
            return 'Prob Temperature'
        return 'Unknown'
    }

    getCalibStatusLabelOfAlarm(item: AlfresaAlarms): string{
        var label = ''
        const status = item.calib_status
        if(status == CALIB_STATUS.PROG){
            label = 'Calibrating'
        }
        if(status == CALIB_STATUS.COMPLETED){
            if(item.alarm_status  != ALFALARM_STATUS.ENABLE)
                label = 'Completed'
        }
        return label
    }

    getCalibStatusLabel(item:AlfresaCalibrationConfig): string{
        var label = 'Unknown'
        switch(item.calib_status){
            case CALIB_STATUS.PLANNED:
                label = 'Scheduled'
                break
            case CALIB_STATUS.PROG:
                label = 'In Progress'
                break
            case CALIB_STATUS.COMPLETED:
                label = 'Completed'
                break
            default:
                break
        }
        return label
    }

    // return the calib status of selected calibration config
    getSelectedCalibStatus(): number{
        return this.calibSelected.calib_status
    }

    isDeleteableCalib(item: AlfresaCalibrationConfig): boolean{
        return (item.calib_status != CALIB_STATUS.PROG)? true: false
    }

    isProgressCalib(item: AlfresaCalibrationConfig): boolean{
        if(!this.editState || !item){
            return false
        }
        return (item.calib_status == CALIB_STATUS.PROG)? true: false
    }

    isRefreshable(item: AlfresaCalibrationConfig): boolean{
        return (item.calib_status != CALIB_STATUS.COMPLETED)? true: false
    }

    isCompletedCalib(item: AlfresaCalibrationConfig): boolean{
        return (item.calib_status == CALIB_STATUS.COMPLETED)? true: false
    }

    isProgOrCompleted(item: AlfresaCalibrationConfig): boolean{
        return (item.calib_status ==CALIB_STATUS.PROG || item.calib_status == CALIB_STATUS.COMPLETED)? true: false
    }


    private notifyDialog(message: string, closeDialog = true){
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
        this.dialogRef.componentInstance.data = {
            title: "Notification",
            message: message
        }
        this.dialogRef.afterClosed().subscribe((result) => {
            if(closeDialog)
                this.close()
        })
    }

    // change the hour of date
    private changeHour(date: Date): Date {
        var updated = new Date(date);
        const today = new Date();

        // Remove time part for comparison
        console.log(`input date: ${date.toISOString()}: ---${updated.getHours()}`)
        console.log(`now: ${today.toISOString()}`)
        updated.setHours(this.CALIB_TOGGLE_TIME, 0, 0, 0);
        return updated;
    }

    getSelectedCalibSerial(): string{
        const s1 =  this.calibSelected.serial_calib
        const s2 = this.calibSelected.serial_opt
        return `Main(${s1})=>Seconday(${s2})`
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
