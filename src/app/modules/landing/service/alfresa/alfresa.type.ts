

export interface AlfresaCenter{
    id?: string;
    name: string;
    code?: string;
    code_parent?: string;
    email_emp?: string[];        // email list of employee contractor
    email_whs?: string[];        // email list of warehouse contractor
    created?: string;
}

export interface AlfresaBranch{
    id?: string
    name: string;
    code?: string;
    center?: string; // center id
    emails?: string[];
    created?: string;
}


export const ALFLOC = {
    CENTER: 0,          // center
    BRANCH: 1           // branch
}

/** AlfresaShiftType — branch/center day and night presets */
export const ALF_SHIFT_TYPE = {
    BRANCH_DAY: 0,
    BRANCH_NIGHT: 1,
    CENTER_DAY: 2,
    CENTER_NIGHT: 3,
} as const;

export const ALL_ALF_SHIFT_TYPES = [
    ALF_SHIFT_TYPE.BRANCH_DAY,
    ALF_SHIFT_TYPE.BRANCH_NIGHT,
    ALF_SHIFT_TYPE.CENTER_DAY,
    ALF_SHIFT_TYPE.CENTER_NIGHT,
] as const;

export function getAlfShiftTypeLabel(shiftType: number): string {
    switch (shiftType) {
        case ALF_SHIFT_TYPE.BRANCH_DAY:
            return 'Branch day';
        case ALF_SHIFT_TYPE.BRANCH_NIGHT:
            return 'Branch night';
        case ALF_SHIFT_TYPE.CENTER_DAY:
            return 'Center day';
        case ALF_SHIFT_TYPE.CENTER_NIGHT:
            return 'Center night';
        default:
            return 'Unknown';
    }
}

export function isAlfShiftNightType(shiftType: number | null | undefined): boolean {
    return shiftType === ALF_SHIFT_TYPE.BRANCH_NIGHT || shiftType === ALF_SHIFT_TYPE.CENTER_NIGHT;
}

export function isAlfShiftCenterType(shiftType: number): boolean {
    return shiftType === ALF_SHIFT_TYPE.CENTER_DAY || shiftType === ALF_SHIFT_TYPE.CENTER_NIGHT;
}

export function isAlfShiftBranchType(shiftType: number): boolean {
    return shiftType === ALF_SHIFT_TYPE.BRANCH_DAY || shiftType === ALF_SHIFT_TYPE.BRANCH_NIGHT;
}

export interface AlfresaShiftConfig {
    id?: string;
    shift_type: number;
    name: string;
    start_time: string;
    end_time: string;
    cross_midnight?: boolean;
    timezone?: string;
    des?: string;
    enabled?: boolean;
    created?: string;
    updated?: string;
}

export interface AlfresaShiftWorkerBind {
    user: string;
    site_type: number;
    site_id: string;
    shift_type: number;
    valid_from?: string;
    valid_to?: string | null;
    status?: number;
}

/** AlfShiftStatus — 0=inactive, 1=active */
export const ALF_SHIFT_STATUS = {
    INACTIVE: 0,
    ACTIVE: 1,
} as const;

export interface AlfresaShiftWorkerQuery {
    site_type: number;
    site_id: string;
}

export interface AlfresaShiftTableWorkerRow {
    id: string;
    user: string;
    shift_type: number | null;
    status: boolean;
    valid_from?: string;
    valid_to?: string | null;
    start_time: string;
    end_time: string;
    cross_midnight: boolean;
    timezone: string;
}

export interface AlfresaShiftTableResult {
    admin: {
        id: string | null;
        user: string | null;
        status: boolean;
    };
    users: AlfresaShiftTableWorkerRow[];
}

export interface AlfresaShiftWorkerControl {
    enabled: boolean;
}

export interface AlfresaShiftScheduleSiteView {
    siteType: number;
    siteId: string;
    label: string;
    isBranch: boolean;
    allowWorkers: boolean;
}

export interface AlfresaShiftScheduleRow {
    scheduleId: string | null;
    userId: string | null;
    userName: string;
    role: 'admin' | 'worker';
    shiftType: number | null;
    shiftLabel: string;
    startTime: string;
    endTime: string;
    crossMidnight: boolean;
    status: boolean;
    editable: boolean;
}

export const CALIB_STATUS = {
    PLANNED: 0,  // calib isn't started
    PROG: 1,
    COMPLETED:2, // calib time is passed
    ALL:3,      // all of status
}

// alfresa alarm status
export const ALFALARM_STATUS = {
    INVALID: -1,
    DISABLE: 0,
    ENABLE: 1,
    CNT: 2
}

export interface AlfresaAlarms{
    id?: string             // id of AlfresaAlarms
    serial?: string,        // device serial
    center?: string,        // parent center ID
    branch?: string,        // parent branch ID
    location?:string,       // location
    calib_start?: String,   // start time of calibration

    calib_status?: number,  // CALIB_STATUS, current calib status

    alarm_type: number,     // UserAlarmType
    alarm_l: number,        // alarm low temeprature
    alarm_h: number,        // alarm high temeprature
    warn_l: number,         // warning low temeprature
    warn_h: number,         // warning high temeprature
    created?: string,       // alarm created time

    alarm_status: number,   // alarm status
    status?: number,        // reserved
    flag?: number,          // reserved
}


export interface AlfresaCalibrationConfig{
    id?: string;
    device_calib?: string;       // device id of calibrated
    serial_calib: string;       // serial of calibrated device
    device_opt?: string;         // device ID of candidate
    serial_opt?: string;         // serial of candidate
    calib_start: string;          // time when calibration starting
    calib_end: string;            // time when calibration completed
    // opt_start?: string;           // time when the candidate starts working

    description?: string;
    calib_status?: number;
    flag?: number;
    created?: string;           // time of created time
}


export interface AlfCalibResult {
    calib?: AlfresaCalibrationConfig,            // calibration result
    alarm_calib?: AlfresaAlarms,              // calibrated alarm configuration after calibration
    alarm_opt?: AlfresaAlarms,                // candidate alarm configuration after calibration
}


export interface CalibrationSchedule {
    calibrated_logger: string;           // Expected to be a string of digits
    calibration_start: Date;
    calibration_end: Date;
    candidate_logger: string;
    candidate_start: Date;
}
