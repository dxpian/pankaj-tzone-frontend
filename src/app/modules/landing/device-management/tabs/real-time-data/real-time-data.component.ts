import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DeviceState, isWebAdminPermission, PERMISSION } from '../../../../../modules/landing/utils/typedef';
import { isNumber } from 'lodash';
import { SharedService } from '../../../../../services/shared.service';

interface DeviceStateDetail {
    label: string;
    value: string;
    status: 'error' | 'warning' | 'info';
    icon: 'info' | 'error';
}

@Component({
  selector: 'app-real-time-data',
  templateUrl: './real-time-data.component.html',
  styleUrls: ['./real-time-data.component.scss']
})
export class RealTimeDataComponent implements OnInit, OnChanges{
    @Input() realTimeData:DeviceState = {};
    public showStateDetails = false;
    public stateDetails: DeviceStateDetail[] = [];
    public hasStateDetails = false;
    public isAdminUser = false;

    constructor(private _serviceShared: SharedService) {}

    ngOnInit(): void {
        const p = this._serviceShared.getPermission();
        this.isAdminUser = isWebAdminPermission(p) || p >= PERMISSION.DEVELOPER;
        console.log(`input realtime data of tab: ${this.realTimeData}`)
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.realTimeData) {
            this.buildStateDetails();
        }
    }

    toggleStateDetails(): void {
        this.showStateDetails = !this.showStateDetails;
    }

    private buildStateDetails(): void {
        const details: DeviceStateDetail[] = [];

        if (this.realTimeData?.alarm) {
            details.push(this.parseAlarmDetail(this.realTimeData.alarm));
        }

        if (this.realTimeData?.terminal) {
            details.push(...this.parseTerminalDetails(this.realTimeData.terminal));
        }

        if (this.realTimeData?.netstatus) {
            details.push(...this.parseNetstatusDetails(this.realTimeData.netstatus));
        }

        this.stateDetails = details;
        this.hasStateDetails = details.length > 0;

        if (!this.hasStateDetails) {
            this.showStateDetails = false;
        }
    }

    private parseAlarmDetail(value: string): DeviceStateDetail {
        const code = value.trim().toUpperCase();
        let description = 'Unknown alarm code';
        let status: DeviceStateDetail['status'] = 'info';
        let icon: DeviceStateDetail['icon'] = 'info';

        switch (code) {
            case 'AA':
                description = 'Interval GPRS data';
                status = 'info';
                icon = 'info';
                break;

            case '10':
                description = 'Low battery alarm';
                status = 'error';
                icon = 'error';
                break;
            case 'A0':
                description = 'Temperature/Humidity over threshold alarm';
                status = 'error';
                icon = 'error';
                break;
            case 'A1':
                description = 'Temperature/Humidity sensor abnormal alarm';
                status = 'error';
                icon = 'error';
                break;
            case 'A2':
                description = 'Light sensor bright and dark changes';
                status = 'warning';
                icon = 'info';
                break;
            case 'A3':
                description = 'Shock alarm';
                status = 'error';
                icon = 'error';
                break;
            case 'B0':
                description = 'Turned on the device';
                break;
            case 'B1':
                description = 'Turned off the device';
                break;
            case 'C0':
                description = 'Machine enters flight mode';
                status = 'warning';
                icon = 'info';
                break;
            case 'C1':
                description = 'Machine exits flight mode';
                break;
            default:
                description = 'Unknown alarm code';
                status = 'info';
                icon = 'info';
                break;
        }

        return {
            label: 'Alarm',
            value: `${code} — ${description}`,
            status,
            icon
        };
    }

    private parseTerminalDetails(value: string): DeviceStateDetail[] {
        const binary = this.normalizeBinaryString(value);
        const bits = binary.split('');
        const workModeValue = `${bits[0] || '0'}${bits[1] || '0'}`;
        const buttonPressed = bits[3] === '1';
        const sensorAbnormal = bits[4] === '1';
        const batteryLow = bits[6] === '1';
        const charging = bits[7] === '1';

        const workModeLabel = (() => {
            switch (workModeValue) {
                case '00':
                    return { text: 'Normal work mode', status: 'info' as const };
                case '01':
                    return { text: 'Flight mode', status: 'warning' as const };
                default:
                    return { text: `Reserved / unknown (${workModeValue})`, status: 'info' as const };
            }
        })();

        return [
            {
                label: 'Terminal work mode',
                value: workModeLabel.text,
                status: workModeLabel.status,
                icon: workModeLabel.status === 'warning' ? 'error' : 'info'
            },
            {
                label: 'Button press',
                value: buttonPressed ? 'Button pressed' : 'Not pressed',
                status: 'info',
                icon: 'info'
            },
            {
                label: 'Sensor status',
                value: sensorAbnormal ? 'Temperature/Humidity sensor abnormal' : 'Temperature/Humidity sensor normal',
                status: sensorAbnormal ? 'error' : 'info',
                icon: sensorAbnormal ? 'error' : 'info'
            },
            {
                label: 'Battery status',
                value: batteryLow ? 'Battery low voltage' : 'Battery normal',
                status: batteryLow ? 'error' : 'info',
                icon: batteryLow ? 'error' : 'info'
            },
            {
                label: 'Charging status',
                value: charging ? 'Machine is charging' : 'Machine is not charging',
                status: charging ? 'warning' : 'info',
                icon: charging ? 'info' : 'info'
            }
        ];
    }

    private parseNetstatusDetails(value: string): DeviceStateDetail[] {
        const binary = this.normalizeBinaryString(value);
        const bits = binary.split('');
        const internet = bits[2] === '1';
        const gprs = bits[3] === '1';
        const roaming = bits[4] === '1';
        const gsmRegistered = bits[5] === '1';
        const simDetected = bits[6] === '1';
        const gsmStarted = bits[7] === '1';

        return [
            {
                label: 'Internet connection',
                value: internet ? 'Connected' : 'Not connected',
                status: internet ? 'info' : 'error',
                icon: internet ? 'info' : 'error'
            },
            {
                label: 'GPRS registration',
                value: gprs ? 'Registered successfully' : 'Not registered',
                status: gprs ? 'info' : 'warning',
                icon: gprs ? 'info' : 'error'
            },
            {
                label: 'GSM roaming',
                value: roaming ? 'Roaming mode' : 'Home network mode',
                status: roaming ? 'warning' : 'info',
                icon: roaming ? 'info' : 'info'
            },
            {
                label: 'GSM registration',
                value: gsmRegistered ? 'Registered successfully' : 'Not registered',
                status: gsmRegistered ? 'info' : 'error',
                icon: gsmRegistered ? 'info' : 'error'
            },
            {
                label: 'SIM card',
                value: simDetected ? 'Detected' : 'Not detected',
                status: simDetected ? 'info' : 'error',
                icon: simDetected ? 'info' : 'error'
            },
            {
                label: 'GSM module',
                value: gsmStarted ? 'Started' : 'Not started',
                status: gsmStarted ? 'info' : 'error',
                icon: gsmStarted ? 'info' : 'error'
            }
        ];
    }

    private normalizeBinaryString(value: string): string {
        const trimmed = value?.trim();
        if (!trimmed) {
            return '00000000';
        }
        if (/^[01]+$/.test(trimmed)) {
            return trimmed.padStart(8, '0');
        }
        const hexValue = trimmed.replace(/^0x/i, '');
        const parsed = parseInt(hexValue, 16);
        if (!isNaN(parsed)) {
            return parsed.toString(2).padStart(8, '0');
        }
        const numeric = Number(trimmed);
        if (!isNaN(numeric)) {
            return numeric.toString(2).padStart(8, '0');
        }
        return '00000000';
    }

    getData(value: string): string {
    
        if(value == 'humidity') {
            if(this.realTimeData?.humidity != null)
                return this.realTimeData?.humidity + '%'
            return '-- %'
        }
        else if(value == 'temperature') {
            const tempInternal =  (this.realTimeData?.temperature != null)?  this.realTimeData?.temperature + '℃' :  '--℃'
            const tempExternal = (this.realTimeData?.tempexternal!= null)?  this.realTimeData?.tempexternal + '℃' :  '--℃'
            return tempInternal + ' / ' + tempExternal; 

        }
        else if(value == 'light') {
            if(this.realTimeData?.light != null)
                return this.realTimeData?.light + 'Lux'
            return  '-- Lux'
        }
        else if(value == 'vibration') {
            if(this.realTimeData?.vibration != null)
             return  this.realTimeData?.vibration + 'mg'; 
            return   '-- mg'; 
        }
        else if(value == 'wifi') {
            if(this.realTimeData?.wifi) {
                return (this.findHighestDBValue(this.realTimeData?.wifi) || '') + 'dBm'
            }
            return '-- dBm'
        }
        else if(value == 'battery') {
            if(this.realTimeData?.battery != null)
                return this.realTimeData?.battery +'%'
            return  '--%'
        }
        else if(value == 'location'){
            if(this.realTimeData?.city)
                return this.realTimeData?.city as string; 
            return '--'
        }


        return '--'
    }

    getFullAddress(){
        return this.realTimeData?.address;
    }

    isNumber(value: string): boolean {
        return !isNaN(Number(value));
    }

    findHighestDBValue(singal: string): number | string | undefined {
        if(singal) {
            const entries = singal.split(',');
            let highestDB = -Infinity;

            entries.forEach((entry: string) => {
            const [, dBValue] = entry.split(' ');

            const dB = parseInt(dBValue, 10);

            if (dB > highestDB) {
                highestDB = dB;
            }});

            if(highestDB != -Infinity) {
                return  highestDB;
            } else {
                return '--'
            }
        }
    }
}
