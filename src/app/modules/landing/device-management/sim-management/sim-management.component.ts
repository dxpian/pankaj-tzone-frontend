import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { DeviceManagementService } from '../device-management.service';
import { SharedService } from '../../../../services/shared.service';
import {
    DB_RESULT,
    Device,
    DeviceFilterType,
    ExpiredDevicePageQuery,
    PageData,
    SetExpireDateOfLoggersResult,
    isWebAdminPermission,
    PERMISSION,
} from '../../utils/typedef';
import { GroupConfig } from '../../account/account.typedef';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import {
    readSimManagementState,
    writeSimManagementState,
} from '../../utils/sim-management-state.storage';

interface SimRenewRow {
    index: number;
    serial: string;
    end_date: Date;
    description?: string;
}

@Component({
    selector: 'app-sim-management',
    templateUrl: './sim-management.component.html',
    styleUrls: ['./sim-management.component.scss'],
})
export class SimManagementComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild('renewFileInput') renewFileInput: ElementRef<HTMLInputElement>;

    FilterType = DeviceFilterType;
    displayedColumns: string[] = ['select', 'id', 'name', 'serial', 'model', 'groups', 'time', 'cond', 'SIM', 'Actions'];
    dataSource = new MatTableDataSource<Device>([]);
    groups: GroupConfig[] = [];

    searchInputControl = new FormControl('');
    expireBeforeDate: Date = new Date();
    includeUnknownEndDate = false;
    loading = false;
    applying = false;
    exporting = false;

    /** Serials explicitly unchecked by the user (default is checked). */
    uncheckedSerials = new Set<string>();
    /** Device rows seen in the current query — used for status and export. */
    private deviceCache = new Map<string, Device>();

    statusTotal = 0;
    statusSelected = 0;
    statusOnline = 0;
    statusOffline = 0;

    parsedRenewRows: SimRenewRow[] = [];
    parseErrors: string[] = [];
    applyResultText = '';
    uploadedFileName = '';

    userInfo: any;
    private _unsubscribeAll = new Subject<void>();
    private _stateRestored = false;

    _pageQuery: ExpiredDevicePageQuery = {
        page: 0,
        pagesize: 20,
        keyword: '',
        cursor: null,
        total: 0,
        keyChanged: true,
        filter: DeviceFilterType.All,
        value1: '',
        value2: '0',
    };

    constructor(
        private _serviceDevice: DeviceManagementService,
        private _serviceShared: SharedService,
        private _snackBar: MatSnackBar,
        private _route: Router,
        private _cdr: ChangeDetectorRef,
        public dialog: MatDialog,
    ) {
        const defaultExpire = new Date();
        defaultExpire.setDate(defaultExpire.getDate() + 30);
        this.expireBeforeDate = defaultExpire;
    }

    ngOnInit(): void {
        this.userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        this.restoreBrowseState();
        this._pageQuery.value1 = this.toApiDate(this.expireBeforeDate);

        if (!this.isAdmin()) {
            return;
        }

        this.getGroups();

        setTimeout(() => {
            this.searchInputControl.valueChanges
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    debounceTime(300),
                    switchMap((query) => {
                        this._pageQuery.keyword = (query ?? '').toString().trim();
                        this._pageQuery.keyChanged = true;
                        if (this.paginator) {
                            this.paginator.pageIndex = 0;
                        }
                        this.resetDeviceCacheForNewQuery();
                        return this.fetchPage(
                            0,
                            this.paginator?.pageSize ?? this._pageQuery.pagesize,
                            this._pageQuery.keyword,
                            true,
                            this._pageQuery.total,
                        );
                    }),
                )
                .subscribe({
                    next: (response) => this.updateDataSource(response as DB_RESULT),
                    error: (err) => this.handleLoadError(err),
                });
        });
    }

    ngAfterViewInit(): void {
        if (!this.isAdmin()) {
            return;
        }
        const saved = readSimManagementState();
        if (saved && this.paginator) {
            this.paginator.pageIndex = Math.max(0, saved.pageIndex);
            this.paginator.pageSize = saved.pageSize;
            this._pageQuery.pagesize = saved.pageSize;
        } else {
            this._pageQuery.pagesize = this.paginator?.pageSize ?? 20;
        }
        this._pageQuery.keyChanged = true;
        this.reloadTable();
    }

    ngOnDestroy(): void {
        this.persistBrowseState();
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    isAdmin(): boolean {
        const p = this._serviceShared.getPermission();
        return isWebAdminPermission(p) || p >= PERMISSION.DEVELOPER;
    }

    isRowChecked(device: Device): boolean {
        const serial = this.serialKey(device);
        return !!serial && !this.uncheckedSerials.has(serial);
    }

    isAllPageSelected(): boolean {
        const rows = this.dataSource.data;
        return rows.length > 0 && rows.every((row) => this.isRowChecked(row));
    }

    isSomePageSelected(): boolean {
        const rows = this.dataSource.data;
        const checked = rows.filter((row) => this.isRowChecked(row)).length;
        return checked > 0 && checked < rows.length;
    }

    toggleRow(device: Device, checked: boolean): void {
        const serial = this.serialKey(device);
        if (!serial) {
            return;
        }
        if (checked) {
            this.uncheckedSerials.delete(serial);
        } else {
            this.uncheckedSerials.add(serial);
        }
        this.cacheDevice(device);
        this.updateStatusCounts();
        this.persistBrowseState();
    }

    private serialKey(device: Device): string {
        return device?.serial ? String(device.serial) : '';
    }

    private cacheDevice(device: Device): void {
        const serial = this.serialKey(device);
        if (serial) {
            this.deviceCache.set(serial, device);
        }
    }

    checkAllOnPage(): void {
        for (const row of this.dataSource.data) {
            const serial = this.serialKey(row);
            if (serial) {
                this.uncheckedSerials.delete(serial);
                this.cacheDevice(row);
            }
        }
        this.updateStatusCounts();
        this.persistBrowseState();
    }

    uncheckAllOnPage(): void {
        for (const row of this.dataSource.data) {
            const serial = this.serialKey(row);
            if (serial) {
                this.uncheckedSerials.add(serial);
                this.cacheDevice(row);
            }
        }
        this.updateStatusCounts();
        this.persistBrowseState();
    }

    checkAllInResult(): void {
        this.uncheckedSerials.clear();
        this.updateStatusCounts();
        this.persistBrowseState();
    }

    uncheckAllInResult(): void {
        for (const serial of this.deviceCache.keys()) {
            this.uncheckedSerials.add(serial);
        }
        for (const row of this.dataSource.data) {
            const serial = this.serialKey(row);
            if (serial) {
                this.uncheckedSerials.add(serial);
            }
        }
        this.updateStatusCounts();
        this.persistBrowseState();
    }

    isAllResultSelected(): boolean {
        return this.statusTotal > 0 && this.statusSelected >= this.statusTotal;
    }

    isNoneResultSelected(): boolean {
        return this.statusSelected === 0;
    }

    isPartialResultSelected(): boolean {
        return this.statusSelected > 0 && this.statusSelected < this.statusTotal;
    }

    get statusDownloadTooltip(): string {
        if (this.statusSelected > 0) {
            return `Download ${this.statusSelected} selected logger(s) as renewal Excel`;
        }
        return 'Download blank renewal Excel template';
    }

    onStatusPanelDownload(): void {
        if (this.statusSelected > 0) {
            void this.downloadCheckedLoggers();
            return;
        }
        this.downloadRenewTemplate();
    }

    private restoreBrowseState(): void {
        const saved = readSimManagementState();
        if (!saved) {
            return;
        }
        this._stateRestored = true;
        this._pageQuery.keyword = saved.keyword;
        this.searchInputControl.setValue(saved.keyword, { emitEvent: false });
        this.expireBeforeDate = new Date(saved.expireBeforeDate);
        if (isNaN(this.expireBeforeDate.getTime())) {
            const fallback = new Date();
            fallback.setDate(fallback.getDate() + 30);
            this.expireBeforeDate = fallback;
        }
        this.includeUnknownEndDate = saved.includeUnknownEndDate;
        this._pageQuery.pagesize = saved.pageSize;
        this.uncheckedSerials = new Set(saved.uncheckedSerials);
        this.applyResultText = saved.applyResultText ?? '';
        this._pageQuery.pagesize = saved.pageSize;
    }

    persistBrowseState(): void {
        writeSimManagementState({
            keyword: this._pageQuery.keyword,
            expireBeforeDate: this.expireBeforeDate.toISOString(),
            includeUnknownEndDate: this.includeUnknownEndDate,
            pageIndex: this.paginator?.pageIndex ?? 0,
            pageSize: this.paginator?.pageSize ?? this._pageQuery.pagesize,
            uncheckedSerials: [...this.uncheckedSerials],
            applyResultText: this.applyResultText,
        });
    }

    private resetDeviceCacheForNewQuery(): void {
        this.deviceCache.clear();
        this.statusTotal = 0;
        this.statusSelected = 0;
        this.statusOnline = 0;
        this.statusOffline = 0;
    }

    private cacheDevices(devices: Device[]): void {
        for (const device of devices) {
            this.cacheDevice(device);
        }
    }

    private updateStatusCounts(): void {
        this.statusTotal = this._pageQuery.total;

        let uncheckedInResult = 0;
        for (const serial of this.uncheckedSerials) {
            if (this.deviceCache.has(serial)) {
                uncheckedInResult++;
            }
        }
        this.statusSelected = Math.max(0, this.statusTotal - uncheckedInResult);

        let online = 0;
        let offline = 0;
        for (const [serial, device] of this.deviceCache) {
            if (this.uncheckedSerials.has(serial)) {
                continue;
            }
            if (this.isOnlineLike(device)) {
                online++;
            } else {
                offline++;
            }
        }
        this.statusOnline = online;
        this.statusOffline = offline;
        this._cdr.markForCheck();
    }

    private isOnlineLike(device: Device): boolean {
        const s = device.status;
        return s === DeviceFilterType.Online
            || s === DeviceFilterType.UserAlarm
            || s === DeviceFilterType.BatteryLow
            || s === DeviceFilterType.Flight;
    }

    private handleLoadError(err: unknown): void {
        console.error('SIM management load failed:', err);
        const message = (err as { error?: string; message?: string })?.error
            || (err as { message?: string })?.message
            || 'Failed to load SIM expiry data';
        this._snackBar.open(message, '', snackBarConfigWarn);
        this.dataSource.data = [];
        this._pageQuery.total = 0;
        this.updateStatusCounts();
        this._cdr.detectChanges();
    }

    private toApiDate(date: Date): string {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
    }

    onExpireDateChange(): void {
        this._pageQuery.value1 = this.toApiDate(this.expireBeforeDate);
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.resetDeviceCacheForNewQuery();
        this.persistBrowseState();
        this.reloadTable();
    }

    onUnknownEndDateChange(): void {
        this._pageQuery.value2 = this.includeUnknownEndDate ? '1' : '0';
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.resetDeviceCacheForNewQuery();
        this.persistBrowseState();
        this.reloadTable();
    }

    refresh(): void {
        this.resetDeviceCacheForNewQuery();
        this._pageQuery.keyChanged = true;
        this._pageQuery.total = 0;
        this.reloadTable();
    }

    /** Reload from page 1 after data changes (e.g. renewal applied). */
    private reloadTableFromStart(): void {
        if (!this.isAdmin()) {
            return;
        }
        this.resetDeviceCacheForNewQuery();
        this._pageQuery.keyChanged = true;
        this._pageQuery.total = 0;
        this._pageQuery.cursor = null;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.reloadTable();
    }

    private pruneUncheckedSerials(validSerials: Iterable<string>): void {
        const valid = new Set(validSerials);
        for (const serial of [...this.uncheckedSerials]) {
            if (!valid.has(serial)) {
                this.uncheckedSerials.delete(serial);
            }
        }
    }

    onPageChange(event: { pageIndex: number; pageSize: number }): void {
        this._pageQuery.cursor = null;
        this.persistBrowseState();
        this.fetchPage(event.pageIndex, event.pageSize, this._pageQuery.keyword, this._pageQuery.keyChanged, this._pageQuery.total)
            .then((response) => this.updateDataSource(response as DB_RESULT))
            .catch((err) => this.handleLoadError(err));
    }

    fetchPage(pageIndex: number, pageSize: number, keyword: string, keyChanged: boolean, total: number, silent = false) {
        const query: ExpiredDevicePageQuery = {
            page: pageIndex + 1,
            pagesize: pageSize,
            keyword: keyword || '',
            keyChanged: keyChanged !== undefined ? keyChanged : true,
            total: total || 0,
            filter: DeviceFilterType.All,
            value1: this.toApiDate(this.expireBeforeDate),
            value2: this.includeUnknownEndDate ? '1' : '0',
        };
        if (!silent) {
            this.loading = true;
        }
        return this._serviceDevice.getExpiredDeviceWithPagination(query).finally(() => {
            if (!silent) {
                this.loading = false;
            }
            this._cdr.detectChanges();
        });
    }

    reloadTable(): void {
        if (!this.isAdmin()) {
            return;
        }
        this.fetchPage(
            this.paginator?.pageIndex ?? 0,
            this.paginator?.pageSize ?? this._pageQuery.pagesize,
            this._pageQuery.keyword,
            true,
            this._pageQuery.total,
        )
            .then((response) => this.updateDataSource(response as DB_RESULT))
            .catch((err) => this.handleLoadError(err));
    }

    updateDataSource(response: DB_RESULT): void {
        if (response && !response.error_code) {
            const pageData = response.object as PageData;
            this.dataSource.data = (pageData.data || []) as Device[];
            this._pageQuery.total = pageData.total;
            this._pageQuery.cursor = pageData.cursor;
            this._pageQuery.keyChanged = false;
            this.cacheDevices(this.dataSource.data);
            this.syncDeviceCacheInBackground();
        } else {
            this.dataSource.data = [];
            this._pageQuery.total = 0;
            if (response?.meta) {
                this._snackBar.open(response.meta, '', snackBarConfigWarn);
            }
        }
        this.updateStatusCounts();
        this.persistBrowseState();
        this._cdr.detectChanges();
    }

    /** Load remaining pages into cache so status counts and export reflect the full result set. */
    private syncDeviceCacheInBackground(): void {
        const pageSize = this.paginator?.pageSize ?? this._pageQuery.pagesize;
        const totalPages = Math.ceil(this._pageQuery.total / pageSize);
        if (totalPages <= 1) {
            this.pruneUncheckedSerials(this.deviceCache.keys());
            this.updateStatusCounts();
            return;
        }
        const currentPage = this.paginator?.pageIndex ?? 0;
        const loadNext = (pageIndex: number) => {
            if (pageIndex >= totalPages) {
                this.pruneUncheckedSerials(this.deviceCache.keys());
                this.updateStatusCounts();
                return;
            }
            if (pageIndex === currentPage) {
                loadNext(pageIndex + 1);
                return;
            }
            this.fetchPage(pageIndex, pageSize, this._pageQuery.keyword, false, this._pageQuery.total, true)
                .then((res: DB_RESULT) => {
                    if (res && !res.error_code) {
                        const data = ((res.object as PageData)?.data || []) as Device[];
                        this.cacheDevices(data);
                        this.updateStatusCounts();
                    }
                    loadNext(pageIndex + 1);
                })
                .catch(() => loadNext(pageIndex + 1));
        };
        loadNext(0);
    }

    async downloadCheckedLoggers(): Promise<void> {
        if (this.exporting) {
            return;
        }
        this.exporting = true;
        try {
            const devices = await this.fetchAllDevicesForCurrentQuery();
            const checked = devices.filter((d) => d.serial && !this.uncheckedSerials.has(String(d.serial)));
            if (checked.length === 0) {
                this._snackBar.open('No loggers selected for download', '', snackBarConfigWarn);
                return;
            }

            const rows: (string | number)[][] = [['index', 'serial', 'end_date', 'description']];
            checked.forEach((device, idx) => {
                const simexpire = (device as Device & { simexpire?: string }).simexpire;
                const endDate = simexpire
                    ? this.formatDate(new Date(simexpire))
                    : '';
                rows.push([
                    idx + 1,
                    String(device.serial),
                    endDate,
                    String(device.name || ''),
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'SIM Renew');
            const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const stamp = new Date().toISOString().slice(0, 10);
            saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `sim_renew_selected_${stamp}.xlsx`);
            this._snackBar.open(`Downloaded ${checked.length} logger(s)`, '', snackBarConfig);
        } catch (err) {
            console.error('Export failed:', err);
            this._snackBar.open('Failed to download selected loggers', '', snackBarConfigWarn);
        } finally {
            this.exporting = false;
            this._cdr.detectChanges();
        }
    }

    private async fetchAllDevicesForCurrentQuery(): Promise<Device[]> {
        const pageSize = 200;
        const all: Device[] = [];
        let pageIndex = 0;
        let total = 0;

        while (true) {
            const res = await this.fetchPage(pageIndex, pageSize, this._pageQuery.keyword, pageIndex === 0, total, true) as DB_RESULT;
            if (!res || res.error_code) {
                break;
            }
            const pageData = res.object as PageData;
            const chunk = (pageData.data || []) as Device[];
            all.push(...chunk);
            total = pageData.total;
            if (!pageData.has_next || chunk.length === 0) {
                break;
            }
            pageIndex++;
        }
        return all;
    }

    getGroups(): void {
        this._serviceDevice.getDeviceGroups().then((res: DB_RESULT) => {
            if (res && !res.error_code) {
                this.groups = res.object || [];
            }
        });
    }

    getGroupName(groupid: string): string {
        if (!groupid) {
            return 'Default';
        }
        const group = this.groups.find((g) => g.id === groupid);
        return group ? group.groupname : 'Default';
    }

    getDeviceStatusLabel(device: Device): string {
        if (device.status === DeviceFilterType.Online) return 'Online';
        if (device.status === DeviceFilterType.BatteryDead) return 'Battery dead';
        if (device.status === DeviceFilterType.BatteryLow) return 'Low battery';
        if (device.status === DeviceFilterType.Offline) return 'Offline';
        if (device.status === DeviceFilterType.Flight) return 'Sleep';
        if (device.status === DeviceFilterType.UserAlarm) return 'Alarm';
        if (device.status === DeviceFilterType.SimExpire) return 'SIM expired';
        return 'Unknown';
    }

    hasHeartBit(item: Device): boolean {
        return !!item.time_heart;
    }

    getHeartBitColor(item: Device): string {
        if (!item.time_heart) return 'black';
        const diffHours = (Date.now() - new Date(item.time_heart).getTime()) / (1000 * 60 * 60);
        return diffHours <= 24 ? 'blue' : 'black';
    }

    viewDevice(item: Device): void {
        this.persistBrowseState();
        this._route.navigate([`device/${item.id}`], { queryParams: { data: JSON.stringify(item) } });
    }

    downloadRenewTemplate(): void {
        const headers = [['index', 'serial', 'end_date', 'description']];
        const sample = [['1', '123456789012345', '2026-12-31', 'Renewal plan example']];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'SIM Renew');
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'sim_renew_template.xlsx');
        this._snackBar.open('Template downloaded', '', snackBarConfig);
    }

    triggerUpload(): void {
        this.renewFileInput?.nativeElement?.click();
    }

    onRenewFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        this.parsedRenewRows = [];
        this.parseErrors = [];
        this.uploadedFileName = '';
        if (!file) {
            return;
        }
        this.uploadedFileName = file.name;
        this.parseRenewExcel(file)
            .then((rows) => {
                this.parsedRenewRows = rows;
                this.parseErrors = [];
                this.applyResultText = this.formatParsedPreview(rows);
                this.persistBrowseState();
                this._snackBar.open(`${rows.length} row(s) ready to apply`, '', snackBarConfig);
            })
            .catch((err) => {
                this.parsedRenewRows = [];
                const messages = Array.isArray(err)
                    ? err
                    : [typeof err === 'string' ? err : 'Failed to parse Excel file'];
                this.parseErrors = messages;
                this.applyResultText = `Parse error(s):\n${messages.join('\n')}`;
                this.persistBrowseState();
                this._snackBar.open(messages[0], '', snackBarConfigWarn);
            })
            .finally(() => {
                input.value = '';
            });
    }

    private normalizeRenewalSerial(raw: unknown): string {
        if (raw === null || raw === undefined) {
            return '';
        }
        if (typeof raw === 'number') {
            if (!Number.isFinite(raw)) {
                return '';
            }
            return String(Math.trunc(raw));
        }
        let serial = String(raw).trim();
        if (/^\d+\.0+$/.test(serial)) {
            serial = serial.replace(/\.0+$/, '');
        }
        return serial;
    }

    private parseRenewExcel(file: File): Promise<SimRenewRow[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                try {
                    const binaryStr = e.target?.result as string;
                    const workbook = XLSX.read(binaryStr, { type: 'binary' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
                    const result: SimRenewRow[] = [];
                    const errors: string[] = [];
                    const serialRowMap = new Map<string, number[]>();

                    for (let i = 0; i < rawData.length; i++) {
                        const row = rawData[i];
                        const rowNum = i + 2;
                        const serial = this.normalizeRenewalSerial(row['serial']);
                        const endDateRaw = row['end_date'];
                        const description = String(row['description'] ?? '').trim();
                        const indexVal = parseInt(String(row['index'] ?? i + 1), 10);
                        const indexRaw = row['index'];

                        if (!serial && !endDateRaw && !description && (indexRaw === '' || indexRaw === undefined || indexRaw === null)) {
                            continue;
                        }

                        if (!serial) {
                            errors.push(`Row ${rowNum}: Missing serial number`);
                            continue;
                        }
                        if (!/^[1-9]\d{14}$/.test(serial)) {
                            errors.push(`Row ${rowNum}: Invalid serial (must be 15 digits, cannot start with 0): "${serial}"`);
                            continue;
                        }

                        const serialRows = serialRowMap.get(serial) ?? [];
                        serialRows.push(rowNum);
                        serialRowMap.set(serial, serialRows);

                        const endDate = new Date(String(endDateRaw));
                        if (isNaN(endDate.getTime())) {
                            errors.push(`Row ${rowNum}: Invalid end_date: "${endDateRaw}"`);
                            continue;
                        }
                        endDate.setHours(23, 59, 59, 999);
                        if (endDate.getTime() <= Date.now()) {
                            errors.push(`Row ${rowNum}: end_date must be a future date: "${endDateRaw}"`);
                            continue;
                        }

                        result.push({
                            index: isNaN(indexVal) ? i + 1 : indexVal,
                            serial,
                            end_date: endDate,
                            description: description || undefined,
                        });
                    }

                    for (const [serial, rows] of serialRowMap) {
                        if (rows.length > 1) {
                            errors.push(`Duplicate serial "${serial}" in rows: ${rows.join(', ')}`);
                        }
                    }

                    if (errors.length > 0) {
                        reject(errors);
                        return;
                    }
                    if (result.length === 0) {
                        reject(['No valid rows found in the uploaded file.']);
                        return;
                    }
                    resolve(result);
                } catch (err) {
                    reject([typeof err === 'string' ? err : 'Failed to parse Excel file']);
                }
            };
            reader.onerror = () => reject(['Failed to read the file.']);
            reader.readAsBinaryString(file);
        });
    }

    private formatParsedPreview(rows: SimRenewRow[]): string {
        const lines = [
            `Parsed ${rows.length} renewal row(s)${this.uploadedFileName ? ` from "${this.uploadedFileName}"` : ''}.`,
            '',
            'Preview (first 10 rows):',
            ...rows.slice(0, 10).map((r) =>
                `#${r.index}  ${r.serial}  →  ${this.formatDate(r.end_date)}${r.description ? `  (${r.description})` : ''}`,
            ),
        ];
        if (rows.length > 10) {
            lines.push(`... and ${rows.length - 10} more row(s)`);
        }
        lines.push('', 'Click Apply to update SIM expiration dates.');
        return lines.join('\n');
    }

    applyRenewPlan(): void {
        if (this.parseErrors.length > 0) {
            this._snackBar.open('Fix parse errors before applying', '', snackBarConfigWarn);
            return;
        }
        if (this.parsedRenewRows.length === 0) {
            this._snackBar.open('Upload a renewal plan file first', '', snackBarConfigWarn);
            return;
        }

        this.applying = true;
        this.applyResultText = 'Applying renewal plan...';
        this.persistBrowseState();

        const loggers = this.parsedRenewRows.map((r) => ({
            serial: r.serial,
            expire: r.end_date.toISOString(),
        }));

        this._serviceDevice.setExpireDateOfLoggers({ loggers })
            .then((res) => {
                this.applyResultText = this.formatApplyResult(res);
                this.persistBrowseState();
                if (res && res.error_code === 0) {
                    for (const row of loggers) {
                        this.uncheckedSerials.delete(row.serial);
                    }
                    this.showSuccessDialog(res.object);
                    this.parsedRenewRows = [];
                    this.uploadedFileName = '';
                    this.reloadTableFromStart();
                } else {
                    this._snackBar.open(res?.meta || 'Failed to apply renewal plan', '', snackBarConfigWarn);
                }
            })
            .catch((err) => {
                const msg = err?.message || 'Request failed';
                this.applyResultText = `Error:\n${msg}`;
                this.persistBrowseState();
                this._snackBar.open(msg, '', snackBarConfigWarn);
            })
            .finally(() => {
                this.applying = false;
            });
    }

    private formatApplyResult(res: { error_code: number; meta?: string; object?: SetExpireDateOfLoggersResult }): string {
        const lines: string[] = [];
        const ts = new Date().toLocaleString();
        lines.push(`SIM renewal result — ${ts}`);
        lines.push(res.error_code === 0 ? 'Status: Success' : `Status: Failed (${res.meta || 'unknown error'})`);
        lines.push('');

        const obj = res.object;
        if (obj) {
            lines.push(`Updated: ${obj.updated}`);
            if (obj.not_found?.length) {
                lines.push('', `Not found (${obj.not_found.length}):`, ...obj.not_found.map((s) => `  • ${s}`));
            }
            if (obj.invalid?.length) {
                lines.push('', `Invalid (${obj.invalid.length}):`, ...obj.invalid.map((s) => `  • ${s}`));
            }
            if (obj.missing_expire?.length) {
                lines.push('', `Missing expire date (${obj.missing_expire.length}):`, ...obj.missing_expire.map((s) => `  • ${s}`));
            }
        } else if (res.meta) {
            lines.push(res.meta);
        }
        return lines.join('\n');
    }

    private showSuccessDialog(result?: SetExpireDateOfLoggersResult): void {
        const summary = result
            ? `Successfully updated ${result.updated} logger(s).`
            : 'Renewal plan applied successfully.';
        const dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '480px', panelClass: 'custom-modalbox' });
        dialogRef.componentInstance.data = {
            title: 'SIM Renewal Complete',
            message: summary,
        };
    }

    copyApplyResult(): void {
        if (!this.applyResultText) {
            return;
        }
        navigator.clipboard?.writeText(this.applyResultText).then(() => {
            this._snackBar.open('Result copied to clipboard', '', snackBarConfig);
        }).catch(() => {
            this._snackBar.open('Could not copy to clipboard', '', snackBarConfigWarn);
        });
    }

    private formatDate(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}
