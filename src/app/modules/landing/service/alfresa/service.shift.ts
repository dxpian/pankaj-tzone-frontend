import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@kitkat/services/utils/base';
import { environment } from '../../../../enviroment/enviroment';
import {
    AlfresaShiftConfig,
    AlfresaShiftTableResult,
    AlfresaShiftWorkerBind,
    AlfresaShiftWorkerControl,
    AlfresaShiftWorkerQuery,
} from './alfresa.type';

@Injectable({
    providedIn: 'root',
})
export class AlfresaShiftService extends BaseService {
    private readonly baseUrl = `${environment.apiURL}/v1/service/alfresa-shift`;

    constructor(_http: HttpClient) {
        super(_http);
    }

    getAllShifts(): Promise<unknown> {
        return this.post(`${this.baseUrl}/shift-getAll`, {});
    }

    createShift(config: AlfresaShiftConfig): Promise<unknown> {
        return this.post(`${this.baseUrl}/create-shift`, config);
    }

    updateShift(config: AlfresaShiftConfig, shiftId: string): Promise<unknown> {
        return this.post(`${this.baseUrl}/update-shift/${shiftId}`, config);
    }

    deleteShift(shiftId: string): Promise<unknown> {
        return this.delete(`${this.baseUrl}/delete-shift/${shiftId}`);
    }

    queryShiftTable(query: AlfresaShiftWorkerQuery): Promise<unknown> {
        return this.post(`${this.baseUrl}/query-shifts`, query);
    }

    bindShiftWorker(payload: AlfresaShiftWorkerBind): Promise<unknown> {
        return this.post(`${this.baseUrl}/create-shift-worker`, payload);
    }

    updateShiftWorker(scheduleId: string, payload: AlfresaShiftWorkerBind): Promise<unknown> {
        return this.post(`${this.baseUrl}/update-shift-worker/${scheduleId}`, payload);
    }

    unbindShiftWorker(scheduleId: string): Promise<unknown> {
        return this.post(`${this.baseUrl}/unbind-shift-worker/${scheduleId}`, {});
    }

    controlShiftWorker(scheduleId: string, payload: AlfresaShiftWorkerControl): Promise<unknown> {
        return this.post(`${this.baseUrl}/control-shift-worker/${scheduleId}`, payload);
    }
}
