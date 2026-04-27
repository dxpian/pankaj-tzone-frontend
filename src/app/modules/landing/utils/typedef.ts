

export enum DeviceFilterType{
  Online = 0,           // fileter online device
  BatteryDead = 1,
  BatteryLow = 2,
  Flight = 3,
  Offline = 4,
  SimExpire = 5,
  UserAlarm = 6,        // user alarm occured
  All = 7,              // find all device
};


export interface PageQuery{
    page: number;
    pagesize: number;
    keyword: string;
    cursor?:string;
    total: number;
    keyChanged?: boolean;
    filter?: number;     // DeviceFilterType
}


export interface PageRangeQuery{
    page: number;
    pagesize: number;
    keyword: string;
    total:number;        // total number of records of previous query
    from: string;         // search ragne
    to: string;
}


export interface PageData{
    data: any;
    total: number;
    has_next: number;
    has_previous: number;
    cursor?: string;
}

export interface Device{
  id?:     String,
  name? :     String,
  serial? :   String,
  model?  :   String,
  groups?  :  String,
  time ?  :   string,
  status: number;
  gps_enabled?: boolean;
  gps_interval?: number;
}



export interface DeviceState{
    temperature?: string,
    tempexternal?: string,
    humidity?: string,
    light?: number,
    battery?: number,
    vibration?: number,
    wifi?: string,
    address?: string,
    city?: string,
    time?: string,
    alarmType?:  number;        // alarm type
    alarmTime?: string,         // alarm occured last
    isRecentAlarm?:Boolean;

    alarm?:     string;         // last log alarm    
    terminal?:  string;         // last log terminal information
    netstatus?: string;         // last log network status
}

export interface DeviceRealTime{
    id?:     String,
    name? :     String,
    serial? :   String,
    model?  :   String,
    groups?  :  String,
    time ?  :   string,
    simexpire?: string,
    state ? : DeviceState,
    cluster?:   string; // cluster 
}

export interface DB_RESULT{
    error_code: number,
    meta?: string,
    object?: any, //UserModel[] | DeviceModel[] | LogModel[] | LogModel
    accesstoken?: string,
    refreshtoken?: string
}


export interface CellInfo{
    bst?: string,  // 0: 2G, 2: NB, 4: CATM1, 6: LTE
    mcc?: number,                // mobile country code
    mnc?: number,                // mobile network code
    lac?: number,                // location area code
    cellid?: number,             // cell id
}
// wifi access point information
export interface Wifi {
    mac: string,
    rssi: number
}


// log record model
export interface LogModel {
    id? : number,             // history id
    user?: string,                // user id of this device
    device?: string,             // device id
    serial?: string,                 // imei string
    rtctime?: Date,                // rtc time
    utctime?: Date,               // utc time
    temperature?: number,            // device temperature measure value
    tempAbnormal?:number,            // 1: built in sensor is abnormal. 0: normal
    humidity?: number,               // device humidity measure value
    humiAbnormal?: number,           // 1: built in humidity sensor is abnormal. 1: normal
    light?: number,                  // light measure value
    vibration?: number,              // vibration value
    battery?: number                 // battery value in percent
    // add new parameters
    protocol?:string,               // protocol number
    hardware?:string,               // hardware type
    firmware?:string,               // firmware version
    gps?:string,                    // gps data
    gps_lat?: number,               // gps latitude
    gps_lng?:number,                // gps longitude
    direction?: number,             // direction(int)
    speed?:number,                  // speed (float, knotes)
    lbslen?:number,                // lbs data len
    lbsnum?:number,                 // lbs number
    lbsbaseStationType?:string,              // lbs base station type
    lbssignalLength?: number        // length of lbs singal
    mobileccode?: number,             // mobile country code
    mobilencode?: number,              // mobile network code
    locationcode?:number,               // location area code
    cellid?:number,                     // cell id
    alarm?:string,                      // alarm type
    terminal?:string,                   // terminal info
    gmscsq?:number,                     // gms csq value
    gsmstatus?:string,                  // gsm status
    tempexternal?: number,             // external temperature
    tempextAbnormal?:number,            // 1: external temp sensor is abnormal. 0: normal
    humiexternal?: number,              // extenral humidity
    humiextAbnormal?:number,
    wifi?:string,                         // wifi (max-rssi), seprated by,
    cellInfos?: CellInfo[]
    wifiInfos?: Wifi[]
    servertime?: string | Date,
    city?:string;                       // city name of current location
    address?:string;                    // format address string of current location
    gps_enable?: Boolean,
    lastgps?: number,
    gpsreportmin?: number,
}


export interface UseralarmConfigProperty{
    id: string,
    name: string,
    alarm_type: Number,
    alarm_object: Number,
    alarm_target: string,
    effect_date_from: String,
    effect_date_to: String,
    effect_time_from: String,
    effect_time_to: String,
    repeat: String,
    channel: Number,
    time: String,
    timeUpdate: String,
    interval: Number,
    // temp/humidity property
    warning_low_temperature?: Number,
    warning_low_humidity?: Number,
    warning_high_temperature?: Number,
    warning_high_humidity?: Number,
    low_temperature?: Number,
    low_humidity?: Number,
    high_temperature?: Number,
    high_humidity?: Number,
    // light and vibration
    warning_low?: Number,
    warning_high?: Number,
    low?: Number,
    high?: Number,
    connectedEmails?:String,
    creator?: string;     // user email to create this alarm
}


export interface EmailConfig{
    id?: string;
    email?: string;
    description?: string,
    // alerts?: string,
    language?: number,
    created?: string
}


export interface HolidayConfig{
    id?: string;            // id of holiday
    holiday: string;        // date time
    description?:string;    // description of holiday
    created: string;        // when created this configuration
  }


export const PERMISSION = {
  INVALID : -1,
  NORMAL: 0,
  ADMIN: 1,
  DEVELOPER: 2,
  WEB_MOB_ADMIN: 3,       // web admin to manage the mobile admin
  MOB_ADMIN: 4,           // mobile admin to manage the normal mobile user
  MOB_USER: 5,            // normal mobile user
  PMS_CNT: 6,             // total count for permission
}

export const ACCOUNT_TYPE = {
  NORMAL: 0,
  ALFRESA: 1,

}


export interface UserDetails{
  id?: string;
  name: string;
  email: string;
  password?:string;
  permission: number;
  description?: string;
  devices?: number;     // number of devices
  nameParent?:string;   // parent user name. used for sub-account
}

// mobile user parent
export interface MobileAdmin{
    id?: string; 
    name: string; 
    email: string; 
    permission: number; 
    password?:string; 
    created?: string; 
}


// mobile user parent
export interface MobileUser{
    id?: string; 
    name: string; 
    email: string; 
    cluster?: string; // cluster name. not cluster-id
    permission: number;
    password?:string; 
    created?: string; 
}


export interface MobileArea{
    id?: string; 
    owner_id?: string; 
    owner?: string; 
    name: string; 
    clusters?: number; 
    created?: Date; 
}

export interface MobileCluster{
    id?: string;            // cluster id
    area: string;           // area id    
    name: string;           // cluster name
    owner?: string;         // owner display name (when provided by API)
    owner_id?: string;      // owner id
    permission?: number;     // non positive if user has permission on it
    users?: number;          // how many mobile user can access to this cluster
    devices?: number;        // how many devices are registered under this cluster
    created?: Date;           
}

export interface DownlinkCommand{
  id?: string,            // command id
  command: string,        // command
  description?: string,   // command description
  condition: string,  // command status
  created?: string,   // created time
  reply?: string,     // response time
  response: string,   // response data
}


export type MobileAlarmConfig = {
    id?:          string;       // id of mobileAlarmSetting
    user:        string;        // owner user id of this mobile alarm
    name:         string;
    alarm_type:   number;       // AlarmType
    alarm_target: string;       // comma separated string of device ids
    value:        string;       // alarm configuration value, comma separated
    status?:       number;       // status of alarm. 0: disable, 1: enable
    time_from?:     string;     // start time of alarm
    time_to?:       string;     // end time of alarm,   
    repeat:         string;     // command separated list for alarm day. 0~6
    intervalWarn:   number;     // interval minutes for warning message
    intervalAlarm:  number;     // interval minutes for alarm message
}
