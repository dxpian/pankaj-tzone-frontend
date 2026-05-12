import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// import Highcharts, { seriesType } from 'highcharts';
import * as Highcharts from "highcharts/highstock";


import * as moment from 'moment';
import { Subject } from 'rxjs';
import { DeviceManagementService } from '../../device-management.service';
import { HighchartsChartComponent } from 'highcharts-angular';
import { TabServiceService } from '../../view-devices/tab-service.service';
import { LogModel } from 'app/modules/landing/utils/typedef';

export enum ChartType  {
    Temp = 0,
    TempProp = 1,
    Humi = 2,
    Light = 3,
    Vibration = 4,
    Rssi = 5,
    Battery = 6,
    ChartCnt = 7
}

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit, OnChanges {
    private readonly LOG_PAGE_SIZE = 2 * 12 * 24;
    endDate = moment(); // current date and time
    startDate = moment().subtract(7, 'days'); // a
    temperatureHumdity = [];
    dataProps: LogModel[] = []
    @Input() deviceId: string = ''


    private chartInstance: boolean[] = [];


    Light = [];
    Vibration = [];
    RSSI = [];
    // Voltage = [];
    Battery = [];
    humidityArray: any[] = [];
    temperatureArray: any[] = [];
    temperatureProbArray: any[] = [];

    initialized = false
    currentTime: any;
    currentTime2: any;
    strtimeStart: string;
    strtimeEnd: string;

    Highcharts: typeof Highcharts = Highcharts;

    chartOptions: Highcharts.Options;
    chartOptionsForHumidity: Highcharts.Options;
    chartOptionsForTemperature: Highcharts.Options;
    chartOptionsForTemperatureProb: Highcharts.Options;
    chartOptionsForLight: Highcharts.Options;
    chartOptionsForVibration: Highcharts.Options;
    chartOptionsForRSSI: Highcharts.Options;
    chartOptionsForVoltageAndBattery: Highcharts.Options;
    timeRange: number;
    tickInterval: number;

    tempMin = -20
    tempMax = 40
    ChartType =  ChartType
    constructor(private _deviceServices: DeviceManagementService,
        private _tabService: TabServiceService,
        private _route: ActivatedRoute,
        private zone:NgZone,
        private _cdr:ChangeDetectorRef
        ) {
        for(let i = 0; i < ChartType.ChartCnt; i ++){
            this.chartInstance.push( false)
        }

        this.currentTime2 = new Date(); // current date and time
        this.currentTime = new Date(this.currentTime2.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days
    }

    ngOnInit(): void {
        this.currentTime2 = new Date(); // current date and time
        this.currentTime = new Date(this.currentTime2.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days
        this.strtimeStart = this.convertDateFormat(this.currentTime)
        this.strtimeEnd = this.convertDateFormat(this.currentTime2)

        console.log(`Chat tab is initialized`)
        this.fetchLoggers()
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['deviceId']) {
            console.log(`Chart component received device change event : ${this.deviceId}`)
            if(!this.deviceId){
                this.dataProps = []
                return this.mapAllChart()
            }
            // this.addDownloadTask(this.deviceId)
            this.fetchLoggers()
        }
    }

    ngAfterViewInit() {
        // start fetching
        this._tabService.startChartdataFetching()

        // subscribe to subject
        this._tabService.chartData$.subscribe(response=>{
            if(response.device != this.deviceId ){ // serial is changed already. Ignore this data
                return
            }
            this.dataProps = response.data
            this.mapAllChart()
        })
    }


    private addDownloadTask(deviceid: string){
        let params = {
            from: moment(this.currentTime).format(),
            to: moment(this.currentTime2).format()
        }
        this._tabService.addChartdataTask(deviceid, params)
    }


    convertDateFormat(inputDate) {
        // Create a Date object from the input string
        const dateObject = new Date(inputDate);

        // Extract the components of the date
        const year = dateObject.getFullYear();
        const month = (dateObject.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
        const day = dateObject.getDate().toString().padStart(2, '0');
        const hours = dateObject.getHours().toString().padStart(2, '0');
        const minutes = dateObject.getMinutes().toString().padStart(2, '0');
        const seconds = dateObject.getSeconds().toString().padStart(2, '0')

        // Create the formatted date string
        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        return formattedDate;
    }

    mapAllChart() {
        console.log(`redraw all chat data`)
        this.clearAllData()
        if (this.dataProps && this.dataProps.length > 0) {
            this.dataProps.forEach(entry => {
                // const timestamp = new Date(entry.servertime)

                // const timeStr = "2025/04/17 16:39:48";
                const [datePart, timePart] = (entry.servertime as string).split(' ');
                const [year, month, day] = datePart.split('/').map(Number);
                const [hours, minutes, seconds] = timePart.split(':').map(Number);

                // JS Date constructor interprets this as local time
                const timestamp = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

                this.temperatureArray.push([timestamp, entry.temperature]);

                this.temperatureProbArray.push([timestamp, entry.tempexternal]);

                // Push values to humidity array
                this.humidityArray.push([timestamp, entry.humidity]);

                // push value to light array
                this.Light.push([timestamp, Math.min(entry.light, 400)]);

                // push value to vibration
                this.Vibration.push([timestamp, Math.min(entry.vibration, 400)]);

                // push values to RSSI
                if (entry.wifi)
                    this.RSSI.push([timestamp, parseFloat(entry.wifi)]);

                // push values to battery
                this.Battery.push([timestamp, entry.battery]);

            });
        }
        this.timeRange = this.currentTime2 - this.currentTime;

        // Determine an appropriate tick interval based on the time range
        this.tickInterval = this.tickInterval; // Default to one day interval

        if (this.timeRange < 2 * 3600 * 1000) { // Less than 2 hours
            this.tickInterval = 60 * 1000; // One minute interval
        } else if (this.timeRange < 2 * this.tickInterval) { // Less than 2 days
            this.tickInterval = 6 * 3600 * 1000; // Six hours interval
        } else if (this.timeRange < 30 * this.tickInterval) { // Less than 30 days
            this.tickInterval = this.tickInterval; // One day interval
        }

        this.createChartForHumidity();
        this.createChartForTemperature();
        this.createChartForTemperatureProb();
        this.createChartForLight();
        this.createChartForRSSI();
        this.createChartForVibration();
        this.createChartForVoltageBattery()

        this.changeChartVisibility()
        // Trigger change detection
        this._cdr.detectChanges();
    }

    private getLogTime(log: LogModel): Date{
        const [datePart, timePart] = (log.servertime as string).split(' ');
        const [year, month, day] = datePart.split('/').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        // JS Date constructor interprets this as local time
        return new Date(year, month - 1, day, hours, minutes, seconds);

    }

    private fetchLoggers() {
        console.log(`fetch the chat data. current device ID: ${this.deviceId}/${this.deviceId.length}`)
        this.dataProps = []
        if(!this.deviceId)
        {
            console.log(`Invalid device id. clear graph`)
            this.mapAllChart()
            return
        }

        const from = new Date(this.currentTime)
        const to = new Date(this.currentTime2)

        this.addLogWithPageUnit(from, to)
    }

    /**
     * Loads chart logs via NDJSON stream POST .../v1/log/device/:did/allFrontStream
     * (first line envelope, then one log row per line). Same date range / page body as pagelimit API.
     */
    private addLogWithPageUnit2(from: Date, to: Date, page: number = 1): void {
        if (!this.deviceId) {
            console.log(`Invalid device id. clear graph`);
            this.mapAllChart();
            return;
        }
        const body = {
            from: moment(from).format('YYYY-MM-DD HH:mm:ss'),
            to: moment(to).format('YYYY-MM-DD HH:mm:ss')
        };
        this._deviceServices
            .streamAllFrontLogs(this.deviceId, body, {
                onRow: (row) => {
                    this.dataProps.push(row);
                },
            })
            .then(() => {
                this.zone.run(() => this.mapAllChart());
            })
            .catch((err) => {
                console.error('allFrontStream:', err);
                this.zone.run(() => this.mapAllChart());
            });
    }


    private addLogWithPageUnit(from: Date, to: Date, page: number = 1){
        console.log(`fetch the chat data. current device ID: ${this.deviceId}/${this.deviceId.length}`)

        if(!this.deviceId)
        {
            console.log(`Invalid device id. clear graph`)
            this.mapAllChart()
            return
        }
        let params = {
            from: moment(from).format('YYYY-MM-DD HH:mm:ss'),
            to: moment(to).format('YYYY-MM-DD HH:mm:ss'),
            page: page,
            pageSize: this.LOG_PAGE_SIZE
        }
        this._deviceServices.getAllLoggersByLimit(params, this.deviceId).then((res: any) => {
            if(res && res.error_code == 0) {
                console.log(`Success to fetch chat data log of device: ${this.deviceId}`)
                const pageData = Array.isArray(res?.object) ? res.object : (res?.object?.list || []) as LogModel[]
                this.dataProps.push(...pageData)
                if(pageData.length === this.LOG_PAGE_SIZE){
                    this.addLogWithPageUnit(from, to, page + 1)
                    return
                }

            }
            this.mapAllChart()
        })
    }



    private clearAllData(){
        console.log(`Clear all chat data`)

        this.temperatureArray = []
        this.temperatureProbArray = []
        this.humidityArray = [];
        this.Light = [];
        this.Vibration = [];
        this.RSSI = [];
        this.Battery = []
    }

    getAllQueries() {
       console.log(`time range is changed. fetch all loggers for chart`)
       this.fetchLoggers()
    }

    gotoCalibration() {

    }


    createChartForHumidity() {
        console.log(`draw humidity curve: data length = ${this.humidityArray.length}`)
        if(this.humidityArray.length <= 0){
            return
        }
        const series: any = [
            {
                data: this.humidityArray,
                name: "Humidity",
            },
        ]

        const minY = 20;
        const maxY = 85;

        this.chartOptionsForHumidity = {
            title: {
                text: 'Humidity',
                align: 'center'
            },

            subtitle: {
                text: `${this.strtimeStart}~${this.strtimeEnd}`,
                align: 'center'
            },

            rangeSelector: {
                // selected: 1,
                // inputEnabled: false, // Disable input box
                enabled: false, // Ensure range selector is enabled
            },
            xAxis: {
                type: 'datetime',
              labels: {
                    formatter: function (this: any) {
                        let timestamp;

                        // Check if this.value is a string
                        if (typeof this.value === 'string') {
                            timestamp = new Date(this.value.replace(/\//g, ' ')).getTime();
                        } else if (typeof this.value === 'number') {
                            timestamp = this.value;
                        } else {
                            // Handle other cases or throw an error
                            console.error('Unexpected data type for timestamp:', this.value);
                            return '';
                        }

                        // Format timestamp for Highcharts "2022-01-31 14:30:00"
                        const formattedDate = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', timestamp);

                        return formattedDate;
                    },
                },
                dateTimeLabelFormats: {
                    hour: '%d-%m %H:%M:%S',
                    day: '%d-%m %H:%M:%S',
                    week: '%d-%m %H:%M:%S',
                    month: '%d-%m %H:%M:%S',
                    year: '%d-%m %H:%M:%S',
                },
                tickInterval: this.tickInterval, // One second interval
            },
            yAxis: {
                min: minY,
                max: maxY + 10,
            },

            plotOptions: {
                series: {
                    // compare: 'percent',
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
                    },
                },
            },

            tooltip: {
                split: true,
            },
            series: series.map(data => ({
                data: data.data.map(([x, y]) => [new Date(x).getTime(), y]),
                name: data.name,
            })),
        };
    }

    createChartForTemperature() {
        console.log(`draw temperature curve. data length: ${this.temperatureArray.length}`)
        if(!this.temperatureArray?.length){
            return
        }
        this.temperatureArray = this.temperatureArray.filter(data=>data[1]!=null)

        const series: any = [
            {
                data: this.temperatureArray,
                name: `Temperature: ${this.deviceId}`,
            },
        ]
        var minY = this.tempMin
        var maxY = this.tempMax
        if(this.temperatureArray.length > 2){
            const tempMin = Math.min(...this.temperatureArray.map(data=>data[1]));
            const tempMax = Math.max(...this.temperatureArray.map(data=>data[1]));

            const offset = Math.max(Math.min((tempMax - tempMin) * 0.1, 2), 0.1)

            minY = tempMin + offset
            maxY = tempMax + offset
        }

        this.chartOptionsForTemperature = {

            title: {
                text: 'Temperature',
                align: 'center'
            },

            subtitle: {
                text: `${this.strtimeStart}~${this.strtimeEnd}`,
                align: 'center'
            },

            rangeSelector: {
                // selected: 1,
                // inputEnabled: false, // Disable input box
                enabled: true, // Ensure range selector is enabled
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function (this: any) {
                        let timestamp;

                        // Check if this.value is a string
                        if (typeof this.value === 'string') {
                            timestamp = new Date(this.value);
                        } else if (typeof this.value === 'number') {
                            timestamp = this.value;
                        }
                        else {
                            // Handle other cases or throw an error
                            console.error('Unexpected data type for timestamp:', this.value);
                            return '';
                        }

                        // Format timestamp for Highcharts "2022-01-31 14:30:00"
                        const formattedDate = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', timestamp);

                        return formattedDate;
                    },
                },
                dateTimeLabelFormats: {
                    hour: '%d-%m %H:%M:%S',
                    day: '%d-%m %H:%M:%S',
                    week: '%d-%m %H:%M:%S',
                    month: '%d-%m %H:%M:%S',
                    year: '%d-%m %H:%M:%S',
                },
                tickInterval: this.tickInterval, // One second interval
            },
            yAxis: {
                min: minY,
                max: maxY,
            },

            plotOptions: {
                series: {
                    // compare: 'percent',
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
                    },
                },
            },

            tooltip: {
                split: true,
            },
            series: series.map(data => ({
                data: data.data.map(([x, y]) => [new Date(x).getTime(), y]),
                name: data.name,
            })),
        };

    }

    createChartForTemperatureProb() {

        if (!this.temperatureProbArray?.length) return;
        this.temperatureProbArray = this.temperatureProbArray.filter(data => data[1] != null);
        const series: any = [
            {
                data: this.temperatureProbArray,
                name: "Temperature",
            },
        ]

        var minY = this.tempMin
        var maxY = this.tempMax
        if(this.temperatureProbArray.length > 2){
            const tempMin = Math.min(...this.temperatureProbArray.map(data=>data[1]));
            const tempMax = Math.max(...this.temperatureProbArray.map(data=>data[1]));

            const offset = Math.max(Math.min((tempMax - tempMin) * 0.1, 2), 0.1)

            minY = tempMin + offset
            maxY = tempMax + offset
        }

        this.chartOptionsForTemperatureProb = {
            title: {
                text: 'External Temperature',
                align: 'center'
            },

            subtitle: {
                text: `${this.strtimeStart}~${this.strtimeEnd}`,
                align: 'center'
            },

            rangeSelector: {
                // selected: 1,
                // inputEnabled: false, // Disable input box
                enabled: true, // Ensure range selector is enabled
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function (this: any) {
                        let timestamp;

                        // Check if this.value is a string
                        if (typeof this.value === 'string') {
                            timestamp = new Date(this.value);
                        } else if (typeof this.value === 'number') {
                            timestamp = this.value;
                        } else {
                            // Handle other cases or throw an error
                            console.error('Unexpected data type for timestamp:', this.value);
                            return '';
                        }

                        // Format timestamp for Highcharts "2022-01-31 14:30:00"
                        const formattedDate = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', timestamp);

                        return formattedDate;
                    },
                },
                dateTimeLabelFormats: {
                    hour: '%d-%m %H:%M:%S',
                    day: '%d-%m %H:%M:%S',
                    week: '%d-%m %H:%M:%S',
                    month: '%d-%m %H:%M:%S',
                    year: '%d-%m %H:%M:%S',
                },
                tickInterval: this.tickInterval, // One second interval
            },
            yAxis: {
                min: minY,
                max: maxY,
            },

            plotOptions: {
                series: {
                    // compare: 'percent',
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
                    },
                },
            },

            tooltip: {
                split: true,
            },
            series: series.map(data => ({
                data: data.data.map(([x, y]) => [new Date(x).getTime(), y]),
                name: data.name,
            })),
        };
    }

    createChartForLight() {
        console.log(`draw light curve`)
        if(!this.Light || this.Light.length <= 0){
            return
        }
        const series: any = [
            {
                data: this.Light,
                name: "Light",
            },
        ]

        // const minY = Math.min(...this.Light.map((entry: any) => entry[1]));
        // const maxY = Math.max(...this.Light.map((entry: any) => entry[1]));
        const minY = 0;
        const maxY = 300;

        this.chartOptionsForLight = {
            title: {
                text: 'Light',
                align: 'center'
            },

            subtitle: {
                text: `${this.strtimeStart}~${this.strtimeEnd}`,
                align: 'center'
            },

            rangeSelector: {
                // selected: 1,
                // inputEnabled: false, // Disable input box
                enabled: false, // Ensure range selector is enabled
            },
            xAxis: {
                type: 'datetime',
              labels: {
                    formatter: function (this: any) {
                        let timestamp;

                        // Check if this.value is a string
                        if (typeof this.value === 'string') {
                            timestamp = new Date(this.value.replace(/\//g, ' ')).getTime();
                        } else if (typeof this.value === 'number') {
                            timestamp = this.value;
                        } else {
                            // Handle other cases or throw an error
                            console.error('Unexpected data type for timestamp:', this.value);
                            return '';
                        }

                        // Format timestamp for Highcharts "2022-01-31 14:30:00"
                        const formattedDate = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', timestamp);

                        return formattedDate;
                    },
                },
                dateTimeLabelFormats: {
                    hour: '%d-%m %H:%M:%S',
                    day: '%d-%m %H:%M:%S',
                    week: '%d-%m %H:%M:%S',
                    month: '%d-%m %H:%M:%S',
                    year: '%d-%m %H:%M:%S',
                },
                tickInterval: this.tickInterval, // One second interval
            },
            yAxis: {
                min: minY,
                max: maxY + 10,
            },

            plotOptions: {
                series: {
                    // compare: 'percent',
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
                    },
                },
            },

            tooltip: {
                split: true,
            },
            series: series.map(data => ({
                data: data.data.map(([x, y]) => [new Date(x).getTime(), y]),
                name: data.name,
            })),
        };
    }

    createChartForRSSI() {
        console.log(`draw rssi curve`)
        if(!this.RSSI || this.RSSI.length <= 0){
            return
        }
        const series: any = [{
            data: this.RSSI,
            name: "RSSI",
        }]
        // const minY = Math.min(...this.RSSI.map((entry: any) => entry[1]));
        // const maxY = Math.max(...this.RSSI.map((entry: any) => entry[1]));
        const minY = -125;
        const maxY = 0;

        this.chartOptionsForRSSI = {
            title: {
                text: 'RSSI',
                align: 'center'
            },
            subtitle: {
                text: `${this.strtimeStart}~${this.strtimeEnd}`,
                align: 'center'
            },
            rangeSelector: {
                // selected: 1,
                enabled: false
            },
            xAxis: {
                type: 'datetime',
              labels: {
                    formatter: function (this: any) {
                        let timestamp;

                        // Check if this.value is a string
                        if (typeof this.value === 'string') {
                            timestamp = new Date(this.value.replace(/\//g, ' ')).getTime();
                        } else if (typeof this.value === 'number') {
                            timestamp = this.value;
                        } else {
                            // Handle other cases or throw an error
                            console.error('Unexpected data type for timestamp:', this.value);
                            return '';
                        }

                        // Format timestamp for Highcharts "2022-01-31 14:30:00"
                        const formattedDate = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', timestamp);

                        return formattedDate;
                    },
                },
                dateTimeLabelFormats: {
                    hour: '%d-%m %H:%M:%S',
                    day: '%d-%m %H:%M:%S',
                    week: '%d-%m %H:%M:%S',
                    month: '%d-%m %H:%M:%S',
                    year: '%d-%m %H:%M:%S',
                },
                tickInterval: this.tickInterval, // One second interval
            },

            yAxis: {
                min: minY,
                max: maxY,
            },
            plotOptions: {
                series: {
                    // compare: 'percent',
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
                    },
                },
            },
            tooltip: {
                split: true,
            },
            series: series.map(data => ({
                data: data.data.map(([x, y]) => [new Date(x).getTime(), y]),
                name: data.name,
            })),
        };
    }

    createChartForVibration() {

        console.log(`draw vibration curve`)
        if(!this.Vibration || this.Vibration.length <= 0){
            return
        }
        const series: any = [{
            data: this.Vibration,
            name: "Vibration",
        }]
        // const minY = Math.min(...this.Vibration.map((entry: any) => entry[1]));
        // const maxY = Math.max(...this.Vibration.map((entry: any) => entry[1]));
        const minY = 0;
        const maxY = 400;

        this.chartOptionsForVibration = {

            title: {
                text: 'Vibration',
                align: 'center'
            },
            subtitle: {
                text: `${this.strtimeStart}~${this.strtimeEnd}`,
                align: 'center'
            },
            rangeSelector: {
                // selected: 1,
                // inputEnabled: false, // Disable input box
                enabled: false, // Ensure range selector is enabled
            },
            xAxis: {
                type: 'datetime',
              labels: {
                    formatter: function (this: any) {
                        let timestamp;

                        // Check if this.value is a string
                        if (typeof this.value === 'string') {
                            timestamp = new Date(this.value.replace(/\//g, ' ')).getTime();
                        } else if (typeof this.value === 'number') {
                            timestamp = this.value;
                        } else {
                            // Handle other cases or throw an error
                            console.error('Unexpected data type for timestamp:', this.value);
                            return '';
                        }

                        // Format timestamp for Highcharts "2022-01-31 14:30:00"
                        const formattedDate = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', timestamp);

                        return formattedDate;
                    },
                },
                dateTimeLabelFormats: {
                    hour: '%d-%m %H:%M:%S',
                    day: '%d-%m %H:%M:%S',
                    week: '%d-%m %H:%M:%S',
                    month: '%d-%m %H:%M:%S',
                    year: '%d-%m %H:%M:%S',
                },
                tickInterval: this.tickInterval, // One second interval
            },
            yAxis: {
                min: minY,
                max: maxY,
            },

            plotOptions: {
                series: {
                    // compare: 'percent',
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
                    },
                },
            },

            tooltip: {
                split: true,
            },
            series: series.map(data => ({
                data: data.data.map(([x, y]) => [new Date(x).getTime(), y]),
                name: data.name,
            })),
        };
    }

    createChartForVoltageBattery() {
        console.log(`draw battery voltage curve`)
        if(!this.Battery || this.Battery.length <= 0){
            return
        }
        const series: any = [
            {
                data: this.Battery,
                name: "Battery",
            }
        ]

        // const minY = Math.min(...this.Voltage.map((entry: any) => entry[1]), ...this.Battery.map((entry: any) => entry[1]));
        // const maxY = Math.max(...this.Voltage.map((entry: any) => entry[1]), ...this.Battery.map((entry: any) => entry[1]));
        const minY = 0;
        const maxY = 100;

        // Calculate the time range in milliseconds
        const timeRange = this.currentTime2 - this.currentTime;

        // Determine an appropriate tick interval based on the time range
        let tickInterval;
        if (timeRange > 30 * this.tickInterval) { // more than 30 days
            tickInterval = this.tickInterval; // One day interval
        } else if (timeRange > 2 * this.tickInterval) { // more than 2 days
            tickInterval = 6 * 3600 * 1000; // Six hours interval
        } else if (timeRange > 2 * 3600 * 1000) { // more than 2 hours
            tickInterval = 15 * 60 * 1000; // Fifteen minutes interval
        } else {
            tickInterval = 60 * 1000; // One minute interval
        }

        this.chartOptionsForVoltageAndBattery = {
            title: {
                text: 'Battery',
                align: 'center'
            },

            subtitle: {
                text: `${this.strtimeStart}~${this.strtimeEnd}`,
                align: 'center'
            },

            rangeSelector: {
                // selected: 2,
                // inputEnabled: false, // Disable input box
                enabled: false, // Ensure range selector is enabled
            },
            xAxis: {
                type: 'datetime',
              labels: {
                    formatter: function (this: any) {
                        let timestamp;

                        // Check if this.value is a string
                        if (typeof this.value === 'string') {
                            timestamp = new Date(this.value.replace(/\//g, ' ')).getTime();
                        } else if (typeof this.value === 'number') {
                            timestamp = this.value;
                        } else {
                            // Handle other cases or throw an error
                            console.error('Unexpected data type for timestamp:', this.value);
                            return '';
                        }

                        // Format timestamp for Highcharts "2022-01-31 14:30:00"
                        const formattedDate = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', timestamp);

                        return formattedDate;
                    },
                },
                dateTimeLabelFormats: {
                    hour: '%d-%m %H:%M:%S',
                    day: '%d-%m %H:%M:%S',
                    week: '%d-%m %H:%M:%S',
                    month: '%d-%m %H:%M:%S',
                    year: '%d-%m %H:%M:%S',
                },
                tickInterval: tickInterval, // One second interval
            },

            yAxis: {
                min: minY ,
                max: maxY + 5,
            },

            plotOptions: {
                series: {
                    // compare: 'percent',
                    showInNavigator: true,
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b><br/>',
                    },
                },
            },
            tooltip: {
                split: true,
            },
            series: series.map(data => ({
                data: data.data.map(([x, y]) => [new Date(x).getTime(), y]),
                name: data.name,
            })),
        };
    }

    showChart(chartType: number): boolean{
        if(chartType < 0 || chartType >= ChartType.ChartCnt)
            return false
        return this.chartInstance[chartType]
    }

    private changeChartVisibility(){
        this.chartInstance[ChartType.Temp] = (this.temperatureArray.length > 0)
        this.chartInstance[ChartType.TempProp] = (this.temperatureProbArray.length > 0)
        this.chartInstance[ChartType.Humi] = (this.humidityArray.length > 0)
        this.chartInstance[ChartType.Light] = (this.Light.length > 0)
        this.chartInstance[ChartType.Vibration] = (this.Vibration.length > 0)
        this.chartInstance[ChartType.Rssi] = (this.RSSI.length > 0)
        this.chartInstance[ChartType.Battery] = (this.Battery.length > 0)
        console.log(`Check the visibility of chart graph: ${JSON.stringify(this.chartInstance)}`)
    }

}





