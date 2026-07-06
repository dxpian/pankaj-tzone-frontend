import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { DeviceManagementService } from '../device-management.service';
import { SharedService } from '../../../../services/shared.service';
import {
    AddDeviceBatchResult,
    DB_RESULT,
    DeviceBatchExportPayload,
    isWebAdminPermission,
    PERMISSION,
} from '../../utils/typedef';
import { GroupConfig } from '../../account/account.typedef';
import { snackBarConfig, snackBarConfigWarn, resolveRequestError } from 'app/constants/globalFunctions';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { normalizeString } from '../../service/alfresa/alfresa.util';

interface DeviceExcel {
    name: string;
    serial: string;
    enable_gps: boolean;
    /** Group id; empty string means Default (no group). */
    group: string;
    groupLabel: string;
    sim_expire: Date;
}

@Component({
    selector: 'app-register-from-file',
    templateUrl: './register-from-file.component.html',
    styleUrls: ['./register-from-file.component.scss'],
})
export class RegisterFromFileComponent implements OnInit {
    private static readonly BATCH_SIZE = 100;

    @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

    devicesExcel: DeviceExcel[] = [];
    groups: GroupConfig[] = [];
    userInfo: any;
    registering = false;
    selectedFileName = '';
    parseErrors: string[] = [];
    resultText = '';
    registerBatchCurrent = 0;
    registerBatchTotal = 0;
    registerProgressPercent = 0;

    constructor(
        private _serviceDevice: DeviceManagementService,
        private _serviceShared: SharedService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        public dialog: MatDialog,
    ) {}

    ngOnInit(): void {
        this.userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        this.getGroups();
    }

    isAdmin(): boolean {
        const p = this._serviceShared.getPermission();
        return isWebAdminPermission(p) || p >= PERMISSION.DEVELOPER;
    }

    triggerUpload(): void {
        this.fileInput?.nativeElement?.click();
    }

    getGroups(): void {
        this._serviceDevice.getDeviceGroups().then((res: DB_RESULT) => {
            if (res && !res.error_code) {
                this.groups = res.object || [];
            }
        });
    }

    onSelectScheduleFile(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        this.devicesExcel = [];
        this.parseErrors = [];
        this.selectedFileName = '';
        if (!file) {
            return;
        }
        this.selectedFileName = file.name;
        this.parseLoggerExcelFile(file)
            .then((data) => {
                this.devicesExcel = [...data];
                this.parseErrors = [];
                this.resultText = this.formatParsedPreview(data, file.name);
                this._snackBar.open(`${data.length} row(s) ready to register`, '', snackBarConfig);
            })
            .catch((err) => {
                this.devicesExcel = [];
                const messages = Array.isArray(err)
                    ? err
                    : [resolveRequestError(err, 'Failed to parse Excel file')];
                this.parseErrors = messages;
                this.resultText = `Parse error(s):\n${messages.join('\n')}`;
                this._snackBar.open(messages[0], '', snackBarConfigWarn);
            })
            .finally(() => {
                input.value = '';
            });
    }

    openRegisterDialog(): void {
        if (this.devicesExcel.length <= 0) {
            this._snackBar.open('Upload an Excel file first', '', snackBarConfigWarn);
            return;
        }
        const batches = Math.ceil(this.devicesExcel.length / RegisterFromFileComponent.BATCH_SIZE);
        const batchNote = batches > 1 ? ` (${batches} batches of up to ${RegisterFromFileComponent.BATCH_SIZE})` : '';
        const dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
        dialogRef.componentInstance.data = {
            title: 'Register from XLSX',
            message: `Register ${this.devicesExcel.length} logger(s) from the uploaded file${batchNote}?`,
        };
        dialogRef.afterClosed().subscribe((confirmed) => {
            if (confirmed) {
                void this.registerLoggersUploaded();
            }
        });
    }

    downloadScheduleTemplate(): void {
        this._serviceDevice.downloadRegisterTemplateFile().then((res: Blob) => {
            if (res.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    this._snackBar.open('Failed to download template', '', snackBarConfigWarn);
                };
                reader.readAsText(res);
            } else {
                saveAs(res, 'register_logger_template.xlsx');
                this._snackBar.open('Template downloaded', '', snackBarConfig);
            }
        });
    }

    copyResult(): void {
        if (!this.resultText) {
            return;
        }
        navigator.clipboard?.writeText(this.resultText).then(() => {
            this._snackBar.open('Result copied to clipboard', '', snackBarConfig);
        }).catch(() => {
            this._snackBar.open('Could not copy to clipboard', '', snackBarConfigWarn);
        });
    }

    private async registerLoggersUploaded(): Promise<void> {
        if (this.devicesExcel.length <= 0) {
            this._snackBar.open('No loggers to register', '', snackBarConfigWarn);
            return;
        }

        const total = this.devicesExcel.length;
        const batches = this.chunkArray(this.devicesExcel, RegisterFromFileComponent.BATCH_SIZE);
        this.registering = true;
        this.registerBatchTotal = batches.length;
        this.registerBatchCurrent = 0;
        this.registerProgressPercent = 0;

        let totalCreated = 0;
        let totalSkipped = 0;

        this.resultText = [
            `Registering ${total} logger(s) via /v1/device/add-batch`,
            `Batch size: ${RegisterFromFileComponent.BATCH_SIZE}`,
            `Total batches: ${batches.length}`,
            '',
        ].join('\n');
        this._cdr.detectChanges();

        try {
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                this.registerBatchCurrent = i + 1;
                this.registerProgressPercent = Math.round((i / batches.length) * 100);
                this.appendResultLine(`Batch ${i + 1}/${batches.length} — submitting ${batch.length} logger(s)...`);
                this._cdr.detectChanges();

                const payload = batch.map((row) => this.toBatchPayload(row));
                let response: DB_RESULT;

                try {
                    response = await this._serviceDevice.addDevicesBatch(payload) as DB_RESULT;
                } catch (err) {
                    const msg = resolveRequestError(err, 'Unable to register loggers');
                    this.appendResultLine(`  Status: FAILED — ${msg}`);
                    totalSkipped += batch.length;
                    continue;
                }

                const detail = this.formatBatchResult(i + 1, batches.length, batch.length, response);
                this.appendResultLine(detail);

                if (response?.object) {
                    const obj = response.object as AddDeviceBatchResult;
                    totalCreated += obj.created?.length ?? 0;
                    totalSkipped += this.countBatchSkipped(obj);
                } else if (response?.error_code !== 0) {
                    totalSkipped += batch.length;
                }

                this.registerProgressPercent = Math.round(((i + 1) / batches.length) * 100);
                this._cdr.detectChanges();
            }

            const ts = new Date().toLocaleString();
            this.appendResultLine([
                '',
                `Registration finished — ${ts}`,
                `Created: ${totalCreated}`,
                `Skipped / failed: ${totalSkipped}`,
            ].join('\n'));

            if (totalCreated > 0 && totalSkipped === 0) {
                this._snackBar.open(`All ${totalCreated} logger(s) registered successfully`, '', snackBarConfig);
            } else if (totalCreated > 0) {
                this._snackBar.open(`Registered ${totalCreated} logger(s); ${totalSkipped} skipped or failed`, '', snackBarConfigWarn);
            } else {
                this._snackBar.open('No loggers were registered', '', snackBarConfigWarn);
            }

            this.devicesExcel = [];
            this.selectedFileName = '';
        } catch (err) {
            console.error('Batch registration error', err);
            this.appendResultLine(`\nUnexpected error: ${resolveRequestError(err, 'Unable to complete registration')}`);
            this._snackBar.open('Registration failed unexpectedly', '', snackBarConfigWarn);
        } finally {
            this.registering = false;
            this.registerBatchCurrent = 0;
            this.registerBatchTotal = 0;
            this.registerProgressPercent = 0;
            this._cdr.detectChanges();
        }
    }

    private toBatchPayload(row: DeviceExcel): DeviceBatchExportPayload {
        return {
            name: row.name,
            serial: row.serial,
            model: 'TT19',
            groups: row.group,
            simexpire: row.sim_expire.toISOString(),
            gps_enabled: row.enable_gps,
            gps_interval: 360,
        };
    }

    private countBatchSkipped(result: AddDeviceBatchResult): number {
        return (result.duplicate_serial?.length ?? 0)
            + (result.existing_serial?.length ?? 0)
            + (result.duplicate_alfresa_id?.length ?? 0)
            + (result.invalid?.length ?? 0)
            + (result.invalid_group?.length ?? 0);
    }

    private formatBatchResult(batchIndex: number, batchTotal: number, submitted: number, res: DB_RESULT): string {
        const lines: string[] = [`  Batch ${batchIndex}/${batchTotal} result (${submitted} submitted):`];

        if (!res) {
            lines.push('  Status: FAILED — empty response');
            return lines.join('\n');
        }

        if (!res.object) {
            lines.push(`  Status: FAILED — ${res.meta || 'unknown error'}`);
            return lines.join('\n');
        }

        const obj = res.object as AddDeviceBatchResult;
        lines.push(`  Status: ${res.error_code === 0 ? 'Success' : 'Partial / failed'}`);
        lines.push(`  Created: ${obj.created?.length ?? 0}`);

        if (obj.duplicate_serial?.length) {
            lines.push(`  Duplicate serial (in batch): ${obj.duplicate_serial.join(', ')}`);
        }
        if (obj.existing_serial?.length) {
            lines.push(`  Already registered: ${obj.existing_serial.join(', ')}`);
        }
        if (obj.invalid?.length) {
            lines.push(`  Invalid entries: ${obj.invalid.join(', ')}`);
        }
        if (obj.invalid_group?.length) {
            lines.push(`  Invalid group: ${obj.invalid_group.join(', ')}`);
        }
        if (obj.duplicate_alfresa_id?.length) {
            lines.push(`  Duplicate Alfresa ID: ${obj.duplicate_alfresa_id.join(', ')}`);
        }

        return lines.join('\n');
    }

    private resolveGroupId(groupName: string): { id: string; label: string } | null {
        const normalized = groupName.trim();
        if (!normalized || normalized.toLowerCase() === 'default') {
            return { id: '', label: 'Default' };
        }
        const foundGroup = this.groups.find(
            (g) => g.groupname?.toLowerCase() === normalized.toLowerCase(),
        );
        if (!foundGroup) {
            return null;
        }
        return { id: foundGroup.id, label: foundGroup.groupname };
    }

    private chunkArray<T>(items: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    }

    private appendResultLine(line: string): void {
        this.resultText = `${this.resultText}${this.resultText.endsWith('\n') || !this.resultText ? '' : '\n'}${line}`;
    }

    private formatParsedPreview(rows: DeviceExcel[], fileName: string): string {
        const lines = [
            `Parsed ${rows.length} logger row(s) from "${fileName}".`,
            '',
            'Preview (first 10 rows):',
            ...rows.slice(0, 10).map((r, i) =>
                `#${i + 1}  ${r.serial}  ${r.name}  group:${r.groupLabel}  GPS:${r.enable_gps ? '1' : '0'}  SIM:${this.formatDate(r.sim_expire)}`,
            ),
        ];
        if (rows.length > 10) {
            lines.push(`... and ${rows.length - 10} more row(s)`);
        }
        const batches = Math.ceil(rows.length / RegisterFromFileComponent.BATCH_SIZE);
        if (batches > 1) {
            lines.push('', `Registration will run in ${batches} batch(es) of up to ${RegisterFromFileComponent.BATCH_SIZE}.`);
        }
        lines.push('', 'Click Register to create loggers from this file.');
        return lines.join('\n');
    }

    private normalizeSerial(raw: unknown): string {
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

    private parseLoggerExcelFile(file: File): Promise<DeviceExcel[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                try {
                    const binaryStr = e.target?.result as string;
                    const workbook = XLSX.read(binaryStr, { type: 'binary' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
                    const result: DeviceExcel[] = [];
                    const errors: string[] = [];
                    const serialRowMap = new Map<string, number[]>();

                    for (let i = 0; i < rawData.length; i++) {
                        const row = rawData[i];
                        const rowNum = i + 2;
                        const name = normalizeString(String(row['logger_name'] ?? ''));
                        const serial = this.normalizeSerial(row['serial']);
                        const enable_gps = String(row['enable_gps'] ?? '').trim();
                        const group = String(row['group_name'] ?? '').trim();
                        const dateExpireRaw = row['sim_expired'];

                        if (!name && !serial && !enable_gps && !group && !dateExpireRaw) {
                            continue;
                        }

                        if (!name || name.length <= 2) {
                            errors.push(`Row ${rowNum}: Invalid logger name: "${name}"`);
                            continue;
                        }
                        if (!serial) {
                            errors.push(`Row ${rowNum}: Missing serial number`);
                            continue;
                        }
                        if (!/^\d{15}$/.test(serial)) {
                            errors.push(`Row ${rowNum}: Invalid serial number: "${serial}"`);
                            continue;
                        }

                        const serialRows = serialRowMap.get(serial) ?? [];
                        serialRows.push(rowNum);
                        serialRowMap.set(serial, serialRows);

                        if (!/^[01]$/.test(enable_gps)) {
                            errors.push(`Row ${rowNum}: Invalid enable_gps (0 or 1): "${enable_gps}"`);
                            continue;
                        }
                        const dateExpire = new Date(String(dateExpireRaw));
                        if (isNaN(dateExpire.getTime())) {
                            errors.push(`Row ${rowNum}: Invalid sim_expired date: "${dateExpireRaw}"`);
                            continue;
                        }

                        const resolvedGroup = this.resolveGroupId(group);
                        if (!resolvedGroup) {
                            errors.push(`Row ${rowNum}: Group not found: "${group}"`);
                            continue;
                        }

                        result.push({
                            name,
                            serial,
                            enable_gps: parseInt(enable_gps, 10) > 0,
                            group: resolvedGroup.id,
                            groupLabel: resolvedGroup.label,
                            sim_expire: dateExpire,
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

    private formatDate(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}
