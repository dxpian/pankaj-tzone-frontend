import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';
import { DB_RESULT, DeviceRealTime } from '../../utils/typedef';
import { BehaviorSubject, forkJoin, Observable, of, Subject } from 'rxjs';
import { switchMap, shareReplay, take, filter, map } from 'rxjs/operators';


export interface RealTimeCacheEntry{
    serial: string;
    time: Date;
    realtime: DeviceRealTime;
}


export interface ChartChacheEntry{
    device: string;     // device id
    data: any[];
}

@Injectable({
  providedIn: 'root'
})
export class TabServiceService {

    private expiredTimeSec = 60 * 5     // expired time data
    private realtimeCacheEntry: RealTimeCacheEntry[] = []
    public  realTimeData$ = new Subject<RealTimeCacheEntry>();
    private serialTasks$ = new BehaviorSubject<Array<{ serial: string;}>>([]); // Array to hold task
    private MAX_CAHCE = 10


    public  chartData$ = new Subject<ChartChacheEntry>();
    private chartTasks$ = new BehaviorSubject<Array<{ device: string; params: any}>>([]); // Array to hold task

    constructor(private _http: HttpClient) {

    }


    private fetchRealtimeData(serial: string):  Observable<DB_RESULT> {
        const url = `${environment.apiURL}/v1/device/userDeviceDetailsWithSerial/${serial}`;
        return this._http.post<DB_RESULT>(url, {}).pipe(shareReplay(1));

    }

    private fetchChartData(deviceId: string, params):  Observable<DB_RESULT> {
        const url = `${environment.apiURL}/v1/log/device/${deviceId}/allFront`;
        return this._http.post<DB_RESULT>(url, params).pipe(shareReplay(1));

    }

    addRealtimedataTask(serial){
        console.log(`add new realtime data fetching task: ${serial}`)
        const task = this.serialTasks$.value
        task.push({serial})
        this.serialTasks$.next(task)
    }

    private getRealtimeCachedData(serial): RealTimeCacheEntry | null{
        const result = this.realtimeCacheEntry.find(entry=>
            entry.serial == serial
        )
        if(!result)
            return null
        // check if when this data is fetched
        const elapsed = this.getElapsedTimeSeconds(result.time, new Date())
        if(elapsed < this.expiredTimeSec){// time is in 5 minutes
            return result
        }
        return null
    }



    startRealtimeDataFetching(){
        this.serialTasks$.pipe(
            filter(tasks => tasks.length > 0),
            switchMap(tasks=>{
                if (tasks.length === 0) {
                    return of({ results: [], processedTasks: [] }); // <-- return same structure
                }
                const results = tasks.map(({serial})=>{
                    if(!serial){
                        console.log(`Invalid serial ID`)
                        const r: RealTimeCacheEntry = {
                            serial: serial,
                            time: new Date(),
                            realtime: {}
                        }
                        return of(r)
                    }
                    var cachedData = this.getRealtimeCachedData(serial);
                    if (cachedData) { // If fully cached, return from cache
                        console.log(`found cached data of serial: ${serial}`)
                        return of(cachedData);
                    }
                    // fetch data from server
                    console.log(`fetch real time data by api: ${serial}`)
                    const request = this.fetchRealtimeData(serial);

                    return request.pipe(
                      take(1),
                      map(apiRes => {

                        var realtime: DeviceRealTime = {}
                        if(apiRes && apiRes.error_code == 0)
                            realtime = apiRes.object
                        let newCachedData: RealTimeCacheEntry =
                        { serial: serial,  time: new Date(), realtime: realtime };
                        if(this.realtimeCacheEntry.length >= this.MAX_CAHCE){
                            this.realtimeCacheEntry.shift()
                        }
                        this.realtimeCacheEntry.push(newCachedData);
                        console.log(`new realtime data entry: ${JSON.stringify(newCachedData)}`)
                        return newCachedData;
                      })
                    )
                })
                return forkJoin(results).pipe(
                    map(results => ({ results, processedTasks: tasks })) // Pass processed tasks info
                );
            })

        )
        .subscribe(({results, processedTasks }) => {
            results.forEach(result=>{
                console.log(`received api result: ${JSON.stringify(result)}`)
                this.realTimeData$.next(result)
            })

            const currentTasks = this.serialTasks$.value;
            const remainingTasks = currentTasks.filter(task =>
                !processedTasks.some(processed => processed.serial === task.serial)
            );

            this.serialTasks$.next(remainingTasks);
            console.log(`Cleared processed tasks, remaining ${remainingTasks.length} tasks.`);
        }
        );
    }


    private getElapsedTimeSeconds(from: Date, to: Date): number{
        // Get time difference in milliseconds
        const diffMs = to.getTime() - from.getTime();
        // Convert milliseconds to units you want:
        return Math.floor(diffMs / 1000);

    }

    addChartdataTask(deviceId, params){
        if(!deviceId)
        {
            console.log(`Invalid device id for chart data`)
            return
        }
        const task = this.chartTasks$.value
        task.push({device: deviceId, params: params})
        this.chartTasks$.next(task)
    }

    startChartdataFetching() {
        this.chartTasks$.pipe(
            filter(tasks => tasks.length > 0),
            switchMap(tasksSnapshot => {
                if (tasksSnapshot.length === 0) {
                    return of({ results: [], processedTasks: [] }); // <-- return same structure
                }

                const requests = tasksSnapshot.map(({ device, params }) => {
                    console.log(`fetch chart data by api: ${device}`);
                    return this.fetchChartData(device, params).pipe(
                        take(1),
                        map(apiRes => {
                            let data = [];
                            if (apiRes && apiRes.error_code === 0) {
                                data = apiRes.object;
                            }
                            const newCachedData: ChartChacheEntry = { device: device, data: data };
                            return newCachedData;
                        })
                    );
                });

                return forkJoin(requests).pipe(
                    map(results => ({ results, processedTasks: tasksSnapshot })) // Pass processed tasks info
                );
            })
        )
        .subscribe(({ results, processedTasks }) => {
            results.forEach(result => {
                console.log(`result of chart api reqeust: ${result.data.length}`)
                this.chartData$.next(result);
            });

            // Now remove only the processed tasks from chartTasks$
            const currentTasks = this.chartTasks$.value;
            const remainingTasks = currentTasks.filter(task =>
                !processedTasks.some(processed => processed.device === task.device)
            );

            this.chartTasks$.next(remainingTasks);
            console.log(`Cleared processed tasks, remaining ${remainingTasks.length} tasks.`);
        });
    }


}
